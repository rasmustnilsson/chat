var pug = require("../views/pug");
var queries = require("./databaseQueries");

module.exports = function(app,passport,io) {
    function loggedIn(req,res,next) {
        if(!req.isAuthenticated()) {
            if(req.route.path.split('/')[1] == 'joinRoom') {
                req.session.errors.joinRoomFailed = true;
                req.session.save();
                res.render('login', pug.get({errors:req.session.errors,room:req.params.room}));
            } else {
                res.redirect('/');
            }
        } else {
            next();
        }
    }
    app.get('/', function(req, res) {
        if (req.isAuthenticated()) {
            res.render('index', pug.get({user:req.user,page:'index'}));
            if(req.session.errors) {
                req.session.errors = {};
                req.session.save();
            }
        } else {
            res.render('login', pug.get({errors:req.session.errors}));
        }
    })
    app.post('/login/joinRoom/:room', function(req,res,next) {
        passport.authenticate('local-login', function(err,user) {
            if(err) return res.redirect('/');
            if(!user) { return res.redirect('/joinRoom/' + req.params.room) }
            req.login(user,function(err) {
                if(err) { return res.redirect('/') };
                return res.redirect('/joinRoom/' + req.params.room);
            })
        })(req,res,next);
    })
    app.post('/login', passport.authenticate('local-login', {
        successRedirect: '/',
        failureRedirect: '/',
    }))
    app.post('/signup', function(req,res,next) {
        req.checkBody('password', 1).notEmpty(); // if password field is empty
        req.checkBody('password', 2).isLength({min: 2}); // if the password is to short
        req.checkBody('username', 2).isLength({min: 4}); // if the username is to short
        req.checkBody('password', 3).equals(req.body.confirming_password); // if the password and confirming password dont match
        if(req.validationErrors()) {
            req.session.errors.createAccountFailed = true;
            req.session.save(function() {
                res.redirect('/')
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
        queries.account.removeAccount(req.user.username, function() {
            res.redirect('/logout');
        });
    })
    app.get('/logout', function(req,res) {
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
