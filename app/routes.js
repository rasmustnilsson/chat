var pug = require("../views/pug");
var queries = require("./databaseQueries");

module.exports = function(app,passport,io) {
    function loggedIn(req,res,next) {
        if(req.isAuthenticated()) {
            next();
        } else {
            res.redirect('/');
        }
    }
    app.get('/', function(req, res) {
        if (req.isAuthenticated()) {
            res.render('index', pug.get(req.user,'index'));
        } else {
            res.render('notloggedin', pug.get());
        }
    })
    app.get('/error', function(req, res,) {
        res.redirect('/');
    })

    app.post('/login', passport.authenticate('local-login', {
        successRedirect: '/',
        failureRedirect: '/',
    }))

    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect: '/',
        failureRedirect: '/',
    }))
    app.post('/removeAccount', function(req,res) {
        queries.account.removeAccount(req.user.username);
        res.redirect('/logout');
    })
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    })
    app.get('/pub_files/profile_pictures/:username',loggedIn,function(req,res) {
        queries.account.getProfilePicture(req.params.username, function(src) {
            res.sendFile(__dirname.slice(0,__dirname.length-4) + src)
        })
    })
    app.get('/settings',loggedIn, function(req,res) {
        res.render('settings', pug.get(req.user,'settings'));
    })
    app.post('/upload',loggedIn,function(req, res) {
        let uploadedFile = req.files.profile_picture;
        var rndhex = Math.floor(Math.random()*268435455).toString(16);
        uploadedFile.name = rndhex + '_' + uploadedFile.name;
        uploadedFile.mv('views/pub_files/' + req.user.username + '/profile_pictures/' + uploadedFile.name, function(err) {
            if(err) return res.status(500).send(err);
            queries.account.uploadProfilePic(uploadedFile,req.user.username, function() {
                if(err) throw err;
                res.redirect('/settings');
            });
        })
    });
}
