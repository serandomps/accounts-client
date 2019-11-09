var dust = require('dust')();
var serand = require('serand');
var utils = require('utils');

var redirect = serand.redirect;

dust.loadSource(dust.compile(require('./template'), 'accounts-authorize'));

var authorize = function (client, location, done) {
    $.ajax({
        url: utils.resolve('accounts:///apis/v/grants'),
        type: 'POST',
        dataType: 'json',
        contentType: 'application/json',
        data: JSON.stringify({
            client: client,
            location: location
        }),
        success: function (data) {
            done(null, true);
        },
        error: function (xhr, status, err) {
            done(err || status || xhr);
        }
    });
};

var findClient = function (id, done) {
    $.ajax({
        method: 'GET',
        url: utils.resolve('accounts:///apis/v/clients/' + id),
        dataType: 'json',
        success: function (data) {
            done(null, data);
        },
        error: function (xhr, status, err) {
            done(err || status || xhr);
        }
    });
};

var findGrant = function (client, user, done) {
    var options = {
        query: {
            client: client,
            user: user
        },
        count: 1
    };
    $.ajax({
        method: 'GET',
        url: utils.resolve('accounts:///apis/v/grants' + utils.toData(options)),
        dataType: 'json',
        success: function (data) {
            done(null, data.length ? data[0] : null);
        },
        error: function (xhr, status, err) {
            done(err || status || xhr);
        }
    });
};

module.exports = function (ctx, container, options, done) {
    var sandbox = container.sandbox;
    var o = options.options;
    var location = o.location;
    findClient(o.client, function (err, client) {
        if (err) {
            return done(err);
        }
        var to = client.to;
        var origin = utils.origin(location);
        var loc = _.find(to, function (loc) {
            return loc.indexOf(origin) === 0;
        });
        if (!loc) {
            return redirect('/unauthorized', null, {
                origin: origin
            });
        }
        findGrant(o.client, ctx.user.id, function (err, grant) {
            if (err) {
                return done(err);
            }
            if (grant) {
                return redirect('/authorized', null, options);
            }
            utils.client('serandives', function (err, cid) {
                if (err) {
                    return done(err);
                }
                if (o.client === cid) {
                    authorize(o.client, location, function (err) {
                        if (err) {
                            return console.error(err);
                        }
                        redirect('/authorized', null, options);
                    });
                    return;
                }
                var scopes = 'email address';
                dust.render('accounts-authorize', serand.pack({
                    name: client.name,
                    scopes: scopes
                }, container), function (err, out) {
                    if (err) {
                        return done(err);
                    }
                    sandbox.append(out);
                    sandbox.on('click', '.accounts-authorize .allow', function (e) {
                        authorize(o.client, location, function (err) {
                            if (err) {
                                return console.error(err);
                            }
                            redirect('/authorized', null, options);
                        });
                    });
                    done(null, function () {
                        $('.accounts-authorize', sandbox).remove();
                    });
                });
            });
        });
    });
};
