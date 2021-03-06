var dust = require('dust')();
var serand = require('serand');
var utils = require('utils');
var watcher = require('watcher');
var captcha = require('captcha');
var form = require('form');
var auth = require('auth');
var user = require('user');
var token = require('token');
var redirect = serand.redirect;

dust.loadSource(dust.compile(require('./template'), 'accounts-signin'));

var configs = {
    username: {
        find: function (context, source, done) {
            done(null, $('input', source).val());
        },
        validate: function (context, data, value, done) {
            if (!value) {
                return done(null, 'Please enter your username.');
            }
            if (!is.email(value)) {
                return done(null, 'Please enter a valid email address.');
            }
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            $('input', source).val(value);
            done()
        }
    },
    password: {
        find: function (context, source, done) {
            done(null, $('input', source).val());
        },
        validate: function (context, data, value, done) {
            if (!value) {
                return done(null, 'Please enter your password.');
            }
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            $('input', source).val(value);
            done();
        }
    },
};

module.exports = function (ctx, container, options, done) {
    var sandbox = container.sandbox;
    var home = options.location || '/';
    var signupEmail = '/signup';
    var suffix = '';
    var append = function (suff) {
        suffix += (suffix ? '&' : '?') + suff;
    };
    if (options.client) {
        append('client_id=' + options.client);
    }
    if (options.location) {
        append('redirect_uri=' + options.location);
    }
    signupEmail += suffix;

    var captchaId;

    dust.render('accounts-signin', serand.pack({
        home: home,
        signupEmail: signupEmail,
        error: options.error
    }, container), function (err, out) {
        if (err) {
            return done(err);
        }
        var elem = sandbox.append(out);
        var lform = form.create(container.id, elem, configs);
        lform.render(ctx, {}, function (err) {
            if (err) {
                return done(err);
            }
            var signin = $('.signin', elem);
            sandbox.on('click', '.signin', function (e) {
                utils.loading();
                $('.signin-error', sandbox).text('');
                lform.find(function (err, data) {
                    if (err) {
                        return console.error(err);
                    }
                    lform.validate(data, function (err, errors, data) {
                        if (err) {
                            return console.error(err);
                        }
                        if (errors) {
                            utils.loaded();
                            lform.update(errors, data, function (err) {
                                if (err) {
                                    return console.error(err);
                                }
                                signin.removeAttr('disabled');
                            });
                            return;
                        }
                        lform.update(errors, data, function (err) {
                            if (err) {
                                return console.error(err);
                            }
                            lform.create(data, function (err, errors, data) {
                                if (err) {
                                    return console.error(err);
                                }
                                if (errors) {
                                    utils.loaded();
                                    lform.update(errors, data, function (err) {
                                        if (err) {
                                            return console.error(err);
                                        }
                                        signin.removeAttr('disabled');
                                    });
                                    return;
                                }
                                captcha.response(captchaId, function (err, xcaptcha) {
                                    if (err) {
                                        return console.error(err);
                                    }
                                    if (!xcaptcha) {
                                        utils.loaded();
                                        return;
                                    }
                                    authenticate(captcha, captchaId, xcaptcha, data.username, data.password, options, function (err) {
                                        utils.loaded();
                                        if (err) {
                                            $('.signin-error', sandbox).text('Username or the password you entered is invalid.');
                                            signin.attr('disabled', 'disabled');
                                        }
                                    });
                                });
                            });
                        });
                    });
                });
                return false;
            });
            sandbox.on('click', '.facebook', function (e) {
                utils.loading();
                serand.persist('oauth', {
                    type: 'facebook',
                    client: options.client,
                    location: options.location
                });
                auth.authenticator({
                    type: 'facebook',
                    location: utils.resolve('accounts:///auth/oauth')
                }, function (err, uri) {
                    if (err) {
                        return console.error(err);
                    }
                    utils.loaded();
                    redirect(uri);
                });
                return false;
            });
            done(null, {
                clean: function () {

                },
                ready: function () {
                    captcha.render($('.captcha', sandbox), {
                        success: function () {
                            $('.signin', sandbox).removeAttr('disabled');
                        }
                    }, function (err, id) {
                        if (err) {
                            return console.error(err);
                        }
                        captchaId = id;
                    });
                }
            });
        });
    });
};

var authenticate = function (captcha, captchaId, xcaptcha, username, password, options, done) {
    $.ajax({
        method: 'POST',
        url: utils.resolve('apis:///v/tokens'),
        data: {
            client_id: options.client,
            redirect_uri: options.location,
            grant_type: 'password',
            username: username,
            password: password,
        },
        headers: {
            'X-Captcha': xcaptcha
        },
        contentType: 'application/x-www-form-urlencoded',
        dataType: 'json',
        success: function (tok) {
            var access = tok.access_token;
            token.findOne(tok.id, access, function (err, tok) {
                if (err) {
                    watcher.emit('user', 'login error', err);
                    return done(err);
                }
                user.findOne(tok.user, access, function (err, usr) {
                    if (err) {
                        watcher.emit('user', 'login error', err);
                        return done(err);
                    }
                    tok.user = usr;
                    watcher.emit('user', 'token', tok, options);
                    done()
                });
            });
        },
        error: function (xhr, status, err) {
            captcha.reset(captchaId, function () {
                err = err || status || xhr;
                watcher.emit('user', 'login error', err);
                done(err);
            });
        }
    });
};
