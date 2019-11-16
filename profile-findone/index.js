var dust = require('dust')();
var serand = require('serand');
var utils = require('utils');
var user = require('user');
var Locations = require('locations').service;
var contacts = require('contacts');

var BINARY_API = utils.resolve('www:///apis/v/binaries');

dust.loadSource(dust.compile(require('./template'), 'accounts-profile-findone'));

var findLocation = function (id, done) {
    if (!id) {
        return done();
    }
    Locations.findOne({
        id: id
    }, function (err, location ) {
        if (err) {
            return done(err);
        }
        done(null, location);
    });
};

module.exports = function (ctx, container, options, done) {
    var sandbox = container.sandbox;
    options = options || {};
    user.findOne(ctx.token.user.id, function (err, usr) {
        if (err) {
            return done(err);
        }
        findLocation(usr.location, function (err, location) {
            if (err) {
                return done(err);
            }
            usr._.location = location;
            dust.render('accounts-profile-findone', serand.pack(usr, container), function (err, out) {
                if (err) {
                    return done(err);
                }
                sandbox.append(out);
                done(null, {
                    clean: function () {
                        $('.accounts-profile-findone', sandbox).remove();
                    }
                });
            });
        });
    });
};
