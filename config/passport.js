var LocalStrategy = require('passport-local').Strategy;
var User = require('../app/users');

module.exports = function(passport,LocalStrategy) {
    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });
    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });
    passport.use('local-signup', new LocalStrategy({
        usernameField : 'username',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, username, password, done) {
        process.nextTick(function() {
            User.findOne({ 'username' :  username }, function(err, user) {
                if (err) return done(err);
                if (user) {
                    return done(null, false);
                } else {
                    var newUser = new User();
                    newUser.username = username;
                    newUser.displayName = username;
                    newUser.password = newUser.generateHash(password);
                    newUser.createFolders(username);
                    newUser.save(function(err) {
                        if (err) throw err;
                        return done(null, newUser);
                    });
                }
            })
        })
    }))
    passport.use('local-login', new LocalStrategy({
        usernameField : 'username',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, username, password, done) {
        User.findOne({'username':  username}, function(err, user) {
            if (err) return done(err);
            if (!user) { // if no user is found, return the message
                req.session.errors.loginFailed = true;
                req.session.save();
                return done(null, false);
            }
            if (!user.validPassword(password)) { // if the user is found but the password is wrong
                req.session.errors.loginFailed = true;
                req.session.save();
                return done(null, false);
            };
            return done(null, user);
        });
    }));
}
