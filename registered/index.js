var dust = require('dust')();
var serand = require('serand');

dust.loadSource(dust.compile(require('./template'), 'accounts-registered'));

module.exports = function (ctx, container, options, done) {
    var sandbox = container.sandbox;
    options = options || {};
    dust.render('accounts-registered', serand.pack({
        email: options.email
    }, container), function (err, out) {
        if (err) {
            return done(err);
        }
        sandbox.append(out);
        done(null, {
            clean: function () {

            }
        });
    });
};
