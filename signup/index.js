var dust = require('dust')();
var serand = require('serand');
var utils = require('utils');
var captcha = require('captcha');
var form = require('form');
var user = require('user');
var validators = require('validators');
var redirect = serand.redirect;

dust.loadSource(dust.compile(require('./template'), 'accounts-signup'));

var validateUsername = function (username, done) {
    if (/^.*(\-)\1{1,}.*$/.test(username) || !/^([a-z0-9]{1}[a-z0-9\-]{0,48}[a-z0-9]{1}|[a-z0-9]){1}$/.test(username)) {
        return done('Username contains invalid characters or in an invalid format')
    }
    done();
};

var configs = {
    username: {
        find: function (context, source, done) {
            done(null, $('input', source).val());
        },
        validate: function (context, data, value, done) {
            if (!value) {
                return done(null, 'Please enter a name for your account');
            }
            validateUsername(value, function (err) {
                done(null, err, value);
            });
        },
        update: function (context, source, error, value, done) {
            $('input', source).val(value);
            done()
        },
        render: function (ctx, vform, data, value, done) {
            var el = $('.username', vform.elem);
            var context = {
                avatar: value,
                pending: false
            };
            el.on('focusout', 'input', function (e) {
                var username = $('input', el).val();
                validateUsername(username, function (err) {
                    if (err) {
                        $('.invalid-feedback', el).html(err);
                        return;
                    }
                    utils.loading();
                    user.find({
                        query: {
                            query: {
                                username: username
                            }
                        }
                    }, function (err, users) {
                        utils.loaded();
                        if (err) {
                            return console.error(err);
                        }
                        if (users.length) {
                            $('.invalid-feedback', el).html('The specific username already exists');
                            return;
                        }
                    });
                });
            });
            el.on('keyup', 'input', function (e) {
                $('.invalid-feedback', el).empty();
            });
            done(null, context);
        }
    },
    email: {
        find: function (context, source, done) {
            done(null, $('input', source).val());
        },
        validate: function (context, data, value, done) {
            if (!value) {
                return done(null, 'Please enter your email');
            }
            if (!is.email(value)) {
                return done(null, 'Please enter a valid email address');
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
            validators.password(data.email, value, function (err, error) {
                if (err) {
                    return done(err);
                }
                if (error) {
                    return done(null, error);
                }
                done(null, null, value);
            });
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
    var signup = 'accounts:///signup';
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
    signup += suffix;
    signup = utils.resolve(signup);

    var captchaId;

    dust.render('accounts-signup', serand.pack({
        home: home,
        signup: signup
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
            var signup = $('.signup', elem);
            sandbox.on('click', '.signup', function (e) {
                utils.loading();
                $('.signup-error', sandbox).text('');
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
                                signup.removeAttr('disabled');
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
                                        signup.removeAttr('disabled');
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
                                    $.ajax({
                                        url: utils.resolve('accounts:///apis/v/users'),
                                        method: 'POST',
                                        contentType: 'application/json',
                                        data: JSON.stringify(data),
                                        headers: {
                                            'X-Captcha': xcaptcha
                                        },
                                        dataType: 'json',
                                        success: function (data) {
                                            utils.loaded();
                                            serand.redirect('/registered?email=' + data.email);
                                        },
                                        error: function (xhr, status, err) {
                                            utils.loaded();
                                            captcha.reset(captchaId, function () {
                                                if (xhr.status === 409) {
                                                    $('.signup-error', sandbox).text('Email address provided already exists. Please try signing in.');
                                                    return signup.attr('disabled', 'disabled');
                                                }
                                                console.error(err || status || xhr);
                                            });
                                        }
                                    });
                                });
                            });
                        });
                    });
                });
                return false;
            });
            done(null, {
                clean: function () {

                },
                ready: function () {
                    captcha.render($('.captcha', sandbox), {
                        success: function () {
                            $('.signup', sandbox).removeAttr('disabled');
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
