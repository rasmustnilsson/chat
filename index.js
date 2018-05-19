var express = require('express');
var session = require('express-session');
var expressValidator = require('express-validator');

var fileUpload = require('express-fileupload');
var pug = require('pug');
var app = express();
var path = require('path');
var mongoose = require('mongoose');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var server = app.listen(3001);
var sharedsession = require("express-socket.io-session");
var MongoStore = require('connect-mongo')(session);

var sessionStore = new MongoStore({ // opens session store
    url: 'mongodb://127.0.0.1:27017/users',
    ttl: 24 * 60 * 60 // = 1 day
});

var session = session({ // session settings
    cookie: cookieParser,
    secret: 'superlongsecretthatcanneverbecracked',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
});

var io = require('socket.io')(server); // opens socket.io server

require('./config/passport')(passport,LocalStrategy); // loads passport

app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'views')));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(expressValidator());
app.use(fileUpload());
app.use(session);

app.use(passport.initialize());
app.use(passport.session());

io.use(sharedsession(session, { // allows socket io to access session
    autosave: true
}))
io.of('/settings').use(sharedsession(session, {
    autoSave: true
}));
var socket = require("./app/socket")(app,io);
//Loads routes
require('./app/routes.js')(app,passport,io,session);

// var reg = /.*gif|jpg|jpeg|png$/;
// var link = "https://media.giphy.com/media/26n8D1ENGxehUSrEQ/giphy.jpeg";
// console.log(1,reg.test(link));
