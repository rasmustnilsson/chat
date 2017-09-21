var bcrypt = require('bcrypt-nodejs');
var mongoose = require('mongoose');

mongoose.Promise = require('bluebird');
mongoose.connect("mongodb://localhost:27017/users",{useMongoClient:true});

var userSchema = mongoose.Schema({
        username: String,
        password: String,
        friends: [],
        sfr: [],
        ifr: [],
        nfr: { type: Boolean, default: true },
        reg_date: { type: Date, default: Date.now },
        rooms: {type: Array, default: [['default',0,true],['memes',0,true]]},
});

userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
