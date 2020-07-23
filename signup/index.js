var dust = require('dust')();
var serand = require('serand');
var utils = require('utils');
var captcha = require('captcha');
var form = require('form');
var user = require('user');
var validators = require('validators');
var redirect = serand.redirect;

dust.loadSource(dust.compile(require('./template'), 'accounts-signup'));

var configs = {
    username: {
        find: function (context, source, done) {
            done(null, $('input', source).val());
        },
        validate: function (context, data, value, done) {
            if (!value) {
                return done(null, 'Please enter a name for your account.');
            }
            validators.username(value, function (err) {
                done(null, err, value);
            });
        },
        update: function (context, source, error, value, done) {
            $('input', source).val(value);
            done()
        },
        render: function (ctx, vform, data, value, done) {
            var el = $('.username', vform.elem);
            el.on('focusout', 'input', function (e) {
                var username = $('input', el).val();
                validators.username(username, function (err, error) {
                    if (err) {
                        return console.error(err);
                    }
                    if (error) {
                        $('.invalid-feedback', el).html(error);
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
                            $('.invalid-feedback', el).html('The specific username already exists.');
                            return;
                        }
                    });
                });
            });
            el.on('keyup', 'input', function (e) {
                $('.invalid-feedback', el).empty();
            });
            done();
        }
    },
    email: {
        find: function (context, source, done) {
            done(null, $('input', source).val());
        },
        validate: function (context, data, value, done) {
            if (!value) {
                return done(null, 'Please enter your email.');
            }
            if (!is.email(value)) {
                return done(null, 'Please enter a valid email address.');
            }
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            $('input', source).val(value);
            done()
        },
        render: function (ctx, vform, data, value, done) {
            var el = $('.email', vform.elem);
            el.on('focusout', 'input', function (e) {
                var email = $('input', el).val();
                validators.email(email, function (err, error) {
                    if (err) {
                        return console.error(err);
                    }
                    if (error) {
                        $('.invalid-feedback', el).html(error);
                        return;
                    }
                });
            });
            el.on('keyup', 'input', function (e) {
                $('.invalid-feedback', el).empty();
            });
            done();
        }
    },
    password: {
        find: function (context, source, done) {
            done(null, $('input', source).val());
        },
        validate: function (context, data, value, done) {
            validators.password(data.username, data.email, value, function (err, error) {
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
        },
        render: function (ctx, vform, data, value, done) {
            var el = $('.password', vform.elem);
            el.on('focusout', 'input', function (e) {
                var password = $('input', el).val();
                var username = $('.username input', vform.elem).val();
                var email = $('.email input', vform.elem).val();
                validators.password(username, email, password, function (err, error) {
                    if (err) {
                        return console.error(err);
                    }
                    if (error) {
                        $('.invalid-feedback', el).html(error);
                        return;
                    }
                });
            });
            el.on('keyup', 'input', function (e) {
                $('.invalid-feedback', el).empty();
            });
            done();
        }
    },
};

module.exports = function (ctx, container, options, done) {
    var sandbox = container.sandbox;
    var home = options.location || '/';
    var signin = '/signin';
    var signupFacebook = '/signup-facebook';
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
    signin += suffix;
    signupFacebook += suffix;

    var captchaId;

    dust.render('accounts-signup', serand.pack({
        home: home,
        signin: signin,
        signupFacebook: signupFacebook,
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
                                        url: utils.resolve('apis:///v/users'),
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
