var serand = require('serand');
var navigation = require('navigation');
var utils = require('utils');

var context;

var ready = false;

var render = function (id, done) {
    $.ajax({
        url: utils.resolve('accounts:///apis/v/menus/' + id),
        dataType: 'json',
        success: function (links) {
            done(null, links);
        },
        error: function (xhr, status, err) {
            done(err || status || xhr);
        }
    });
};

var filter = function (options, token, links) {
    links.fixed = true;
    links.background = 'bg-secondary';
    links.color = 'navbar-dark';
    if (token) {
        return links;
    }
    if (options.signup) {
        links.signin = {url: '/signin', title: 'Sign in'};
    }
    if (options.signin) {
        links.signup = {url: '/signup', title: 'Sign up'};
    }
    return links;
};

module.exports = function (ctx, container, options, done) {
    options = options || {};
    context = {
        ctx: ctx,
        container: container,
        options: options,
        done: done
    };
    if (!ready) {
        return;
    }
    var id = options.id || 0;
    render(id, function(err, links) {
        if (err) {
            return done(err);
        }
        navigation(ctx, container, serand.pack(filter(options, null, links), container), done);
    });
};

utils.on('user', 'ready', function (token) {
    ready = true;
    if (!context) {
        return;
    }
    render(0, function(err, links) {
        navigation(context.ctx, context.container, serand.pack(filter(context.options, token, links), context.container), context.done);
    });
});
