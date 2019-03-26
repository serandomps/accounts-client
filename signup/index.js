var dust = require('dust')();
var serand = require('serand');
var utils = require('utils');
var captcha = require('captcha');
var form = require('form');
var validators = require('validators');
var redirect = serand.redirect;

dust.loadSource(dust.compile(require('./template'), 'accounts-signup'));

var configs = {
    alias: {
        find: function (context, source, done) {
            done(null, $('input', source).val());
        },
        validate: function (context, data, value, done) {
            if (!value) {
                return done(null, 'Please enter a name for your account');
            }
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            $('input', source).val(value);
            done()
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
    if (options.clientId) {
        append('client_id=' + options.clientId);
    }
    if (options.location) {
        append('redirect_uri=' + options.location);
    }
    signup += suffix;
    signup = utils.resolve(signup);

    var captchaId;

    dust.render('accounts-signup', {
        _: {
            container: container.id
        },
        home: home,
        signup: signup
    }, function (err, out) {
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
                                            serand.redirect('/signin');
                                        },
                                        error: function (xhr, status, err) {
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
