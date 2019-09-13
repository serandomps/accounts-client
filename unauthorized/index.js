var dust = require('dust')();
var serand = require('serand');

dust.loadSource(dust.compile(require('./template'), 'accounts-unauthorized'));

module.exports = function (ctx, container, options, done) {
    var sandbox = container.sandbox;
    dust.render('accounts-unauthorized', serand.pack(options, container), function (err, out) {
        if (err) {
            return done(err);
        }
        sandbox.append(out);
        done(null, function () {
            $('.accounts-unauthorized', sandbox).remove();
        });
    });
};
