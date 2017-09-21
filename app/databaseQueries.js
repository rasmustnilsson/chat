var MongoClient = require('mongodb').MongoClient
var ObjectId = require('mongodb').ObjectId;
var urlMessages = 'mongodb://localhost:27017/messages';
var urlUsers = 'mongodb://localhost:27017/users';
let i,j;

module.exports = {
    users: {
        getinfo: function(id,callback) { // returns user info
            MongoClient.connect(urlUsers, function(err,db) {
                db.collection("users").find(ObjectId(id)).toArray(function(err,result) {
                    db.close();
                    if (err) throw err;
                    return callback(result[0]);
                })
            })
        }
    },
    cfr: function(user,friend,callback) { // cancels friend request
        MongoClient.connect(urlUsers, function(err,db) {
            db.collection("users").update({"username":user},{$pull: {'sfr': friend}});
            db.collection("users").update({"username":friend},{$pull: {'ifr': user}});
            return callback();
        })
    },
    newMessage: function(sender,room,message,time,callback) {
        var o = {"sender":sender,"room":room,"message":message,"time":time};
        MongoClient.connect(urlMessages, function(err, db) {
            db.collection("messages").insertOne(o, function(err, res) {
                db.close();
                if (err) {
                    throw err;
                    return callback(false);
                }
                return callback(true);
            });
        });
    },
    get: function(room,callback) { //returns chat messages from specific room
        MongoClient.connect(urlMessages, function(err, db) {
            db.collection("messages").find({"room":room}).toArray(function(err,result) {
                if(err) throw err;
                callback(result);
                db.close();
            })
        });
    },
    sfr: function(user,friend,callback) { //sends friend requests
        MongoClient.connect(urlUsers, function(err,db) {
            db.collection("users").find({"username": friend}).toArray(function(err,result) {
                if(err) throw err;
                if(!result[0]) {
                    return callback(false, "user does not exist");
                }
                var fre = false // friend request exists
                for(i = 0; i < result[0].friends.length; i++) {
                    if(result[0].friends[i] == friend) {
                        return callback(false, "already friends"); // if friend exists
                    }
                }
                for(j = 0;j<result[0].ifr.length;j++) {
                    if(result[0].ifr[j] == friend) {
                        return callback(false, "friend request already sent"); //if request already sent
                    }
                }
                db.collection("users").update({"username": user},{$push: {"sfr":friend}});
                db.collection("users").update({"username": friend},{$push: {"ifr":user}, $set: {"noticed_friend_requests": false}});
                return callback(true)
            })
        })
    },
    afr: function(user,friend,rndhex,callback) { // accepts friend request
        MongoClient.connect(urlUsers, function(err,db) {
            db.collection("users").find({"username":friend}).toArray(function(err,result) {
                if(err) throw err;
                if(!result[0]) {
                    return callback(false)
                }
                db.collection("users").update({"username": user},{$push: {"friends":[friend,rndhex,0,true]},$pull: {"ifr":friend}});
                db.collection("users").update({"username": friend},{$push: {"friends":[user,rndhex,0,true]},$pull: {"sfr":user}});
                return callback(true)
            })
        })
    }

}
