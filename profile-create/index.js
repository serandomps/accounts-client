var dust = require('dust')();
var serand = require('serand');
var utils = require('utils');
var user = require('user');
var form = require('form');
var locations = require('model-locations');
var contacts = require('model-contacts');

var BINARY_API = utils.resolve('www:///apis/v/binaries');

dust.loadSource(dust.compile(require('./template'), 'accounts-profile-create'));

var configs = {
    name: {
        find: function (context, source, done) {
            done(null, $('input', source).val());
        },
        validate: function (context, data, value, done) {
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            $('input', source).val(value);
            done();
        }
    },
    alias: {
        find: function (context, source, done) {
            done(null, $('input', source).val());
        },
        validate: function (context, data, value, done) {
            if (!value) {
                return done(null, 'Please enter an alias for your account.');
            }
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            $('input', source).val(value);
            done();
        }
    },
    phone: {
        find: function (context, source, done) {
            done(null, $('input', source).val());
        },
        validate: function (context, data, value, done) {
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            $('input', source).val(value);
            done();
        }
    },
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
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            $('input', source).val(value);
            done();
        }
    },
    location: {
        find: function (context, source, done) {
            context.find(done);
        },
        validate: function (context, data, value, done) {
            context.validate(value, done);
        },
        update: function (context, source, error, value, done) {
            context.update(error, value, done);
        },
        render: function (ctx, vform, data, value, done) {
            locations.picker(ctx, {
                id: vform.id,
                sandbox: $('.location', vform.elem)
            }, {
                label: 'Location',
                location: value
            }, function (err, o) {
                if (err) {
                    return done(err);
                }
                done(null, o);
            });
        },
        create: function (context, data, value, done) {
            if (!value) {
                return done();
            }
            context.create(value, done);
        }
    },
    contact: {
        find: function (context, source, done) {
            context.find(done);
        },
        validate: function (context, data, value, done) {
            context.validate(value, done);
        },
        update: function (context, source, error, value, done) {
            context.update(error, value, done);
        },
        render: function (ctx, vform, data, value, done) {
            contacts.picker(ctx, {
                id: vform.id,
                sandbox: $('.contact', vform.elem)
            }, {
                label: 'Contacts',
                contact: value
            }, function (err, o) {
                if (err) {
                    return done(err);
                }
                done(null, o);
            });
        },
        create: function (context, data, value, done) {
            if (!value) {
                return done();
            }
            context.create(value, done);
        }
    },
    avatar: {
        find: function (context, source, done) {
            done(null, context.avatar);
        },
        validate: function (context, data, value, done) {
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            done();
        },
        render: function (ctx, vform, data, value, done) {
            var el = $('.avatar', vform.elem);
            var context = {
                avatar: value,
                pending: false
            };
            el.on('click', '.upload', function (e) {
                $('.fileupload', el).click();
            });
            $('.fileupload', el).fileupload({
                url: BINARY_API,
                type: 'POST',
                dataType: 'json',
                formData: [{
                    name: 'data',
                    value: JSON.stringify({
                        type: 'image'
                    })
                }],
                acceptFileTypes: /(\.|\/)(gif|jpe?g|png)$/i,
                maxFileSize: 5000000, // 5 MB
                disableImageResize: /Android(?!.*Chrome)|Opera/.test(window.navigator.userAgent),
                previewMaxWidth: 180,
                previewMaxHeight: 120,
                previewCrop: true
            }).on('fileuploaddone', function (e, data) {
                var file = data.files[0];
                var err = file.error;
                if (err) {
                    utils.loaded();
                    return console.error(err);
                }
                context.avatar = data.result.id;
                context.pending = false;
                console.log('successfully uploaded %s', data.result.id);
                user.findOne(ctx.token.user.id, function (err, usr) {
                    if (err) {
                        utils.loaded();
                        return done(err);
                    }
                    user.update(usr, {avatar: context.avatar}, function (err) {
                        if (err) {
                            utils.loaded();
                            return console.error(err);
                        }
                        utils.loaded();
                        ctx.token.user.avatar = context.avatar;
                        serand.redirect('/users/me', null, {
                            _: {
                                delay: 0
                            }
                        });
                    });
                });
            }).on('fileuploadadd', function (e, data) {
                context.pending = true;
                utils.loading();
            }).on('fileuploadprocessalways', function (e, data) {
                var file = data.files[0];
                var err = file.error;
                if (err) {
                    return console.error(err);
                }
                $('.preview', el).html($(file.preview).addClass('rounded-circle'));
            }).prop('disabled', !$.support.fileInput)
                .parent().addClass($.support.fileInput ? undefined : 'disabled');
            done(null, context);
        },
        create: function (context, data, value, done) {
            if (context.pending) {
                context.create = done;
                return;
            }
            done(null, null, context.avatar);
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
        dust.render('accounts-profile-create', serand.pack({
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
                                        serand.redirect('/');
                                    });
                                });
                            });
                        });
                    });
                    return false;
                });
                sandbox.on('click', '.remove', function () {
                    user.findOne(ctx.token.user.id, function (err, usr) {
                        if (err) {
                            return console.error(err);
                        }
                        user.update(usr, {avatar: null}, function (err) {
                            if (err) {
                                return console.error(err);
                            }
                            serand.redirect('/users/me');
                        });
                    });
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
