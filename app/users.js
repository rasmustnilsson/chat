var bcrypt = require('bcrypt-nodejs');
var mongoose = require('mongoose');
var fs = require('fs-extra');

mongoose.Promise = require('bluebird');
mongoose.connect("mongodb://localhost:27017/users",{useMongoClient:true});

var userSchema = mongoose.Schema({
        username: String,
        displayName: String,
        password: String,
        friends: [],
        sfr: [],
        ifr: [],
        profile_picture_index: {type: Number, default:0},
        profile_pictures: {type: Array, default: ['default']},
        nfr: { type: Boolean, default: true },
        reg_date: { type: Date, default: Date.now },
        rooms: {type: Array, default: [ {name: 'default', unNoticedMsgs: 0, haveNoticedMsgs: true},{name: 'memes', unNoticedMsgs: 0, haveNoticedMsgs: true} ]},
});

userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

userSchema.methods.createFolders = function(user) {
    fs.mkdir('views/pub_files/' + user, function() {
        fs.mkdir('views/pub_files/' + user + '/profile_pictures');
    });
}

module.exports = mongoose.model('User', userSchema);
