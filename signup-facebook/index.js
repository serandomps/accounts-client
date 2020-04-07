var dust = require('dust')();
var serand = require('serand');
var utils = require('utils');
var form = require('form');
var user = require('user');
var auth = require('auth');
var validators = require('validators');
var redirect = serand.redirect;

dust.loadSource(dust.compile(require('./template'), 'accounts-signup-facebook'));

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
                if (err) {
                    return done(null, err);
                }
                user.find({
                    query: {
                        query: {
                            username: value
                        }
                    }
                }, function (err, users) {
                    if (err) {
                        return console.error(err);
                    }
                    if (users.length) {
                        return done(null, 'The specific username already exists.');
                    }
                    done(null, null, value);
                });
            });
        },
        update: function (context, source, error, value, done) {
            $('input', source).val(value);
            done()
        },
        render: function (ctx, vform, data, value, done) {
            var el = $('.username', vform.elem);
            el.on('keyup', 'input', function (e) {
                $('.invalid-feedback', el).empty();
                $('.signup-error', vform.elem).empty();
            });
            done();
        }
    }
};

module.exports = function (ctx, container, options, done) {
    var sandbox = container.sandbox;
    var home = options.location || '/';
    var signin = '/signin';
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
    signin += suffix;
    signupEmail += suffix;

    dust.render('accounts-signup-facebook', serand.pack({
        home: home,
        signin: signin,
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
                                    });
                                    return;
                                }
                                serand.store('oauth', {
                                    type: 'facebook',
                                    client: options.client,
                                    location: options.location,
                                    username: data.username
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

                }
            });
        });
    });
};
