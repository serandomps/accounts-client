var dust = require('dust')();
var serand = require('serand');
var utils = require('utils');
var token = require('token');
var user = require('user');

var redirect = serand.redirect;

dust.loadSource(dust.compile(require('./template'), 'accounts-token'));

module.exports = function (ctx, container, options, done) {
    var sandbox = container.sandbox;
    dust.render('accounts-token', serand.pack(options, container), function (err, out) {
        if (err) {
            return done(err);
        }
        var o = serand.store('oauth');
        findToken(o, options, function (err, token) {
            if (err) {
                utils.emit('user', 'login error', err);
                return console.error(err);
            }
            utils.emit('user', 'token', token, o);
            serand.store('oauth', null);
        });
        sandbox.append(out);
        done(null, function () {
            $('.accounts-token', sandbox).remove();
        });
    });
};

var findToken = function (o, options, done) {
    var data = {
        redirect_uri: o.location,
        client_id: o.client,
        grant_type: o.type,
        code: options.code
    };
    if (o.username) {
        data.username = o.username;
    }
    $.ajax({
        method: 'POST',
        url: utils.resolve('accounts:///apis/v/tokens'),
        data: data,
        contentType: 'application/x-www-form-urlencoded',
        dataType: 'json',
        success: function (tok) {
            tok.access = tok.access_token;
            tok.refresh = tok.refresh_token;
            tok.expires = tok.expires_in;
            token.findOne(tok.id, tok.access, function (err, tok) {
                if (err) {
                    return done(err);
                }
                user.findOne(tok.user, tok.access, function (err, usr) {
                    if (err) {
                        return done(err);
                    }
                    tok.username = usr.email;
                    tok.user = usr;
                    done(null, tok);
                });
            });
        },
        error: function (xhr, status, err) {
            if (xhr.status === 401) {
                return redirect('/signup-facebook', {
                    client_id: o.client,
                    redirect_uri: o.location,
                }, {
                    error: 'No registered user found for your email. Please sign up here first.'
                });
            }
            done(err || status || xhr);
        }
    });
};
