var pug = require("../views/pug");
module.exports = function(app,passport,io) {
    app.get('/', function(req, res) {
        if (req.isAuthenticated()) {
            res.render('index', pug.get(req.user));
        } else {
            res.render('notloggedin', pug.get());
        }
    })
    app.get('/error', function(req, res,) {
        res.redirect('/');
    })

    app.post('/login', passport.authenticate('local-login', {
        successRedirect: '/',
        failureRedirect: '/error',
    }))

    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect: '/',
        failureRedirect: '/error',
    }))
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    })
}
