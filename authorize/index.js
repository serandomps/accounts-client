var dust = require('dust')();
var serand = require('serand');

dust.loadSource(dust.compile(require('./template'), 'accounts-authorize'));

module.exports = function (ctx, container, options, done) {
    var sandbox = container.sandbox;
    dust.render('accounts-authorize', serand.pack(options, container), function (err, out) {
        if (err) {
            return done(err);
        }
        sandbox.append(out);
        sandbox.on('click', '.accounts-authorize .allow', function (e) {
            serand.emit('user', 'authorized', options);
            return false;
        });
        done(null, function () {
            $('.accounts-authorize', sandbox).remove();
        });
    });
};
