var MongoClient = require('mongodb').MongoClient
var ObjectId = require('mongodb').ObjectId;
var fs = require('fs-extra');
var urlMessages = 'mongodb://localhost:27017/messages';
var urlUsers = 'mongodb://localhost:27017/users';

module.exports = {
    users: {
        getinfo: function(id,callback) { // returns user info
            MongoClient.connect(urlUsers, function(err,db) {
                db.collection("users").findOne(ObjectId(id), function(err,result) {
                    db.close();
                    if (err) throw err;
                    return callback(result);
                })
            })
        }
    },
    account: {
        removeAccount: function(username,callback) {
                MongoClient.connect(urlUsers, function(err,db) {
                    let i,j,k;
                    db.collection('users').findOne({username:username}, function(err,result) {
                        if(err) throw err;
                        var user = result;
                        for(i=0;i<user.friends.length;i++) {
                            db.collection('users').update({username:user.friends[i]}, {$pull: {friends: username}});
                        }
                        for(j=0;j<user.ifr.length;j++) {
                            db.collection('users').update({username:user.ifr[j]}, {$pull: {sfr: username}});
                        }
                        for(k=0;k<user.sfr.length;k++) {
                            db.collection('users').update({username:user.sfr[k]}, {$pull: {ifr: username}});
                        }
                        db.collection('users').remove({username: username});
                        fs.remove('views/pub_files/' + username, function() {
                            //callback();
                        })
                    })
                })
        },
        uploadProfilePic: function(picture,username,callback) { // saves profile_pictures and sets current
            MongoClient.connect(urlUsers, function(err,db) {
                db.collection("users").update({username: username}, {$push: {profile_pictures: picture.name}}, function() {
                    db.collection("users").findOne({username:username}, function(err,result) {
                        db.collection('users').update({username:username},{$set: {profile_picture_index:result.profile_pictures.length-1}}, function() {
                            callback();
                        })
                    })
                });
            })
        },
        getProfilePicture: function(username,callback) { // returns url to profile picture
            MongoClient.connect(urlUsers, function(err,db) {
                db.collection("users").findOne({username:username}, function(err,result) {
                    if(result.profile_picture_index == 0) {
                        callback("/views/pub_files/profile_pictures/default.png");
                    } else {
                        callback("/views/pub_files/"+username+"/profile_pictures/" + result.profile_pictures[result.profile_picture_index]);
                    }
                })
            })
        },
        deleteProfilePicture: function(username,picture,callback) { // deletes profile picture if possible
            MongoClient.connect(urlUsers, function(err,db) {
                db.collection('users').findOne({username:username}, function(err,result) {
                    var pIndex = result.profile_pictures.indexOf(picture);
                    var ppIndex = result.profile_picture_index;
                    if(pIndex == -1) { // if the pictures name does not exist in the database
                        return callback(false,0,'You cant delete this picture because it does not exist!');
                    } else if(ppIndex == pIndex) { // if the picture is the current profile picture
                        callback(false,0,'You cant delete your profile picture!');
                    } else if(ppIndex == 0) { // if the picture is the default picture
                        callback(false,0, 'You cant delete the default profile picture!');
                    } else {
                        if(pIndex < ppIndex) {
                            db.collection('users').update({username:username},{$inc:{profile_picture_index:-1}});
                        }
                        db.collection('users').update({username:username},{$pull:{profile_pictures:picture}}, function() {
                            callback(true,pIndex);
                        })
                    }
                })
            })
        }
    },
    cfr: function(user,friend,callback) { // cancels friend request
        MongoClient.connect(urlUsers, function(err,db) {
            db.collection("users").update({username:user},{$pull: {sfr: friend}});
            db.collection("users").update({username:friend},{$pull: {ifr: user}});
            return callback();
        })
    },
    newMessage: function(sender,room,message,time,callback) { // inserts a new message
        var o = {sender:sender,room:room,message:message,time:time};
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
            db.collection("messages").find({room:room}).toArray(function(err,result) {
                if(err) throw err;
                callback(result);
                db.close();
            })
        });
    },
    sfr: function(user,friend,callback) { //sends friend requests
        MongoClient.connect(urlUsers, function(err,db) {
            let j,i;
            db.collection("users").findOne({username: friend}, function(err,result) {
                if(err) throw err;
                if(!result) {
                    return callback(false, "user does not exist");
                }
                var fre = false // friend request exists
                for(i = 0; i < result.friends.length; i++) {
                    if(result.friends[i] == friend) {
                        return callback(false, "already friends"); // if friend exists
                    }
                }
                for(j = 0;j<result.ifr.length;j++) {
                    if(result.ifr[j] == friend) {
                        return callback(false, "friend request already sent"); //if request already sent
                    }
                }
                db.collection("users").update({username: user},{$push: {sfr:friend}});
                db.collection("users").update({username: friend},{$push: {ifr:user}, $set: {noticed_friend_requests: false}});
                return callback(true)
            })
        })
    },
    afr: function(user,friend,rndhex,callback) { // accepts friend request
        MongoClient.connect(urlUsers, function(err,db) {
            db.collection("users").findOne({username:friend}, function(err,result) {
                if(err) throw err;
                db.collection("users").update({username: user},{$push: {friends: {name:friend,id:rndhex,anm:0,nm:true}},$pull: {ifr:friend}});
                db.collection("users").update({username: friend},{$push: {friends: {name:user,id:rndhex,anm:0,nm:true}},$pull: {sfr:user}});
                return callback(true)
            })
        })
    }

}
