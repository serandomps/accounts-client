var dust = require('dust')();
var serand = require('serand');
var utils = require('utils');
var user = require('user');
var form = require('form');

dust.loadSource(dust.compile(require('./template'), 'accounts-password'));

var configs = {
    otp: {
        find: function (context, source, done) {
            done(null, $('input', source).val());
        },
        validate: function (context, data, value, done) {
            if (data.password && !value) {
                return done(null, 'Please enter your current password.');
            }
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            $('input', source).val(value);
            done()
        },
        create: function (context, data, value, done) {
            if (!value) {
                return done();
            }
            $.ajax({
                primary: true,
                method: 'POST',
                url: utils.resolve('accounts:///apis/v/otps'),
                dataType: 'json',
                contentType: 'application/json',
                data: JSON.stringify({
                    name: 'accounts-update',
                    password: value
                }),
                success: function (data) {
                    done(null, null, data);
                },
                error: function (xhr, status, err) {
                    if (xhr.status === 401) {
                        return done(null, 'Old password you entered is incorrect.');
                    }
                    done(err);
                }
            });
        }
    },
    password: {
        find: function (context, source, done) {
            done(null, $('input', source).val());
        },
        validate: function (context, data, value, done) {
            if (data.otp && !value) {
                return done(null, 'Please enter your new password.');
            }

            if (value.length < 6) {
                return done(null, 'Password should at least be 6 characters.');
            }
            var pass = value.toLowerCase();
            var name;
            var blocked = {
                email: context.email
            };
            for (name in blocked) {
                if (!blocked.hasOwnProperty(name)) {
                    continue;
                }
                if (pass !== blocked[name].toLowerCase()) {
                    continue;
                }
                return done(null, 'Password should not be equivalent to the ' + name + '.');
            }
            if (!/[0-9]/.test(value)) {
                return done(null, 'Password should contain at least one number.');
            }
            if (!/[a-z]/.test(value)) {
                return done(null, 'Password should contain at one lower case letter.');
            }
            if (!/[A-Z]/.test(value)) {
                return done(null, 'Password should contain at one upper case letter.');
            }
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            $('input', source).val(value);
            done();
        },
        render: function (ctx, vform, data, value, done) {
            done(null, {
                email: ctx.user.email
            });
        }
    }
};

module.exports = function (ctx, container, options, done) {
    var sandbox = container.sandbox;
    options = options || {};
    user.findOne(ctx.token.user.id, function (err, usr) {
        if (err) {
            return done(err);
        }
        dust.render('accounts-password', serand.pack({
            user: usr
        }, container), function (err, out) {
            if (err) {
                return done(err);
            }
            var elem = sandbox.append(out);
            var frm = form.create(container.id, elem, configs);
            frm.render(ctx, usr, function (err) {
                if (err) {
                    return done(err);
                }
                var update = $('.update', elem);
                sandbox.on('click', '.update', function (e) {
                    frm.find(function (err, data) {
                        if (err) {
                            return console.error(err);
                        }
                        frm.validate(data, function (err, errors, data) {
                            if (err) {
                                return console.error(err);
                            }
                            if (errors) {
                                frm.update(errors, data, function (err) {
                                    if (err) {
                                        return console.error(err);
                                    }
                                    update.removeAttr('disabled');
                                });
                                return;
                            }
                            frm.update(errors, data, function (err) {
                                if (err) {
                                    return console.error(err);
                                }
                                frm.create(data, function (err, errors, data) {
                                    if (err) {
                                        return console.error(err);
                                    }
                                    if (errors) {
                                        frm.update(errors, data, function (err) {
                                            if (err) {
                                                return console.error(err);
                                            }
                                            update.removeAttr('disabled');
                                        });
                                        return;
                                    }
                                    utils.loading();
                                    user.update(usr, data, function (err) {
                                        utils.loaded();
                                        if (err) {
                                            return console.error(err);
                                        }
                                        serand.redirect('/users/me');
                                    });
                                });
                            });
                        });
                    });
                    return false;
                });
                sandbox.on('click', '.cancel', function (e) {
                    serand.redirect('/users/me');
                });
                done(null, function () {
                    sandbox.remove();
                });
            });
        });
    });
};
