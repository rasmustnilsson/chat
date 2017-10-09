var pug = require("../views/pug");
var queries = require("./databaseQueries");

module.exports = function(app,passport,io) {
    function loggedIn(req,res,next) {
        if(req.isAuthenticated()) {
            next();
        } else {
            if(req.route.path.split('/')[1] == 'joinRoom') {
                res.render('login', pug.get({errors:[2],room:req.params.room}));
            } else {
                res.redirect('/');
            }
        }
    }
    app.get('/', function(req, res) {
        if (req.isAuthenticated()) {
            res.render('index', pug.get({user:req.user,page:'index'}));
            if(req.session.errors) {
                req.session.errors = [];
                req.session.save();
            }
        } else {
            if(req.session.errors) {
                res.render('login', pug.get({errors:req.session.errors}));
            } else {
                res.render('login', pug.get({errors:[]}));
            }
        }
    })
    app.get('/error', function(req, res,) {
        res.redirect('/');
    })

    app.post(['/login','/login/joinRoom/:room'],
        passport.authenticate('local-login', {
            failureRedirect: '/'
        }),
        function(req,res) {
            if(req.params.room) {
                res.redirect('/joinRoom/' + req.params.room);
            } else {
                res.redirect('/');
            }
        }
    )
    app.post('/signup', function(req,res,next) {
        req.checkBody('password', 1).notEmpty(); // if password field is empty
        req.checkBody('confirming_password', 1).notEmpty(); // is conforming password field is empty
        req.checkBody('password', 2).isLength({min: 2}); // if the password is to short
        req.checkBody('username', 2).isLength({min: 4}); // if the username is to short
        req.checkBody('password', 3).equals(req.body.confirming_password); // if the password and confirming password dont match
        var errors = req.validationErrors();
        if(errors) {
            req.session.errors = [];
            req.session.errors.push(1);
                req.session.save(function(err) {
                    if(err) throw err;
                    res.redirect('/');
                });
        } else {
            next();
        }
    })
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
        res.render('settings', pug.get({user:req.user,page:'settings'}));
    })
    app.post('/upload',loggedIn,function(req,res) {
        let uploadedFile = req.files.profile_picture;
        var rndhex = Math.floor(Math.random()*268435455).toString(16); // generates a random hex id
        uploadedFile.name = rndhex + '_' + uploadedFile.name;
        uploadedFile.mv('views/pub_files/' + req.user.username + '/profile_pictures/' + uploadedFile.name, function(err) {
            if(err) return res.status(500).send(err);
            queries.account.uploadProfilePic(uploadedFile,req.user.username, function() {
                res.send(true);
            });
        })
    });
    app.get('/joinRoom/:room',loggedIn, function(req,res) {
        queries.rooms.joinRoom(req.user.username,req.params.room,function(couldJoin,msg) {
            if(couldJoin) {
                res.redirect('/');
            } else {
                res.send(msg);
            }
        })
    })
}
