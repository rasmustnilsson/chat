var express = require('express');
var session = require('express-session');
var pug = require('pug');
var app = express();
var path = require('path');
var mongoose = require('mongoose');
var passport = require('passport');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var server = app.listen(80);

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

var io = require('socket.io')(server);

require('./config/passport')(passport); // loads passport

app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'views')));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());app.use(cookieParser());
app.use(session);

app.use(passport.initialize());
app.use(passport.session());

io.use(sharedsession(session, { // allows socket io to access session
    autosave: true
}))
var socket = require("./app/socket")(io);
//Loads routes
require('./app/routes.js')(app,passport,io,session);
