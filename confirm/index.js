var dust = require('dust')();
var serand = require('serand');
var utils = require('utils');

dust.loadSource(dust.compile(require('./template'), 'accounts-confirm'));

module.exports = function (ctx, container, options, done) {
    var sandbox = container.sandbox;
    options = options || {};
    dust.render('accounts-confirm', serand.pack(container,{
        email: options.email
    }), function (err, out) {
        if (err) {
            return done(err);
        }
        sandbox.append(out);
        $.ajax({
            method: 'POST',
            url: utils.resolve('accounts:///apis/v/users/' + options.user),
            headers: {
                'X-OTP': options.otp,
                'X-Action': 'confirm'
            },
            contentType: 'application/json',
            dataType: 'json',
            success: function () {
                serand.redirect('/signin');
            },
            error: function (xhr, status, err) {
                console.error(err || status || xhr);
            }
        });
        done(null, {
            clean: function () {

            }
        });
    });
};
