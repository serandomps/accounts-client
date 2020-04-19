var dust = require('dust')();
var serand = require('serand');
var utils = require('utils');
var user = require('user');
var locations = require('model-locations');
var Locations = locations.service;
var contacts = require('model-contacts');
var Contacts = contacts.service;

dust.loadSource(dust.compile(require('./template'), 'accounts-profile-findone'));

module.exports = function (ctx, container, options, done) {
    var sandbox = container.sandbox;
    options = options || {};
    var id = options.id;
    id = (!id || id === 'me') ? ctx.token.user.id : id;
    user.findOne(id, function (err, usr) {
        if (err) {
            return done(err);
        }
        async.parallel({
            location: function (found) {
                if (!usr.location) {
                    return found();
                }
                Locations.findOne({id: usr.location}, function (ignored, location) {
                    if (location) {
                        location.country = Locations.findCountry(location.country);
                    }
                    found(null, location);
                });
            },
            contact: function (found) {
                if (!usr.contact) {
                    return found();
                }
                Contacts.findOne({id: usr.contact}, function (ignored, contact) {
                    found(null, contact);
                });
            }
        }, function (err, o) {
            if (err) {
                return done(err);
            }
            usr._.contact = o.contact;
            usr._.location = o.location;
            dust.render('accounts-profile-findone', serand.pack(usr, container), function (err, out) {
                if (err) {
                    return done(err);
                }
                var elem = sandbox.append(out);
                locations.findone(ctx, {
                    id: container.id,
                    sandbox: $('.location', elem),
                    parent: elem
                }, {
                    required: true,
                    label: 'Location of the vehicle',
                    location: usr._.location
                }, function (ignored, o) {
                    done(null, {
                        clean: function () {
                            $('.accounts-profile-findone', sandbox).remove();
                        }
                    });
                });
            });
        });
    });
};
