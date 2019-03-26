var dust = require('dust')();
var serand = require('serand');

dust.loadSource(dust.compile(require('./template'), 'accounts-authorized'));

module.exports = function (ctx, container, options, done) {
    var sandbox = container.sandbox;
    var user = options.user;
    user.expires = user.expires - new Date().getTime();
    dust.render('accounts-authorized', options, function (err, out) {
        if (err) {
            return done(err);
        }
        sandbox.append(out);
        done(null, function () {
            $('.accounts-authorized', sandbox).remove();
        });
    });
};
