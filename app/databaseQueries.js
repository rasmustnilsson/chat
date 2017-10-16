var MongoClient = require('mongodb').MongoClient
var ObjectId = require('mongodb').ObjectId;
var fs = require('fs-extra');
var urlMessages = 'mongodb://localhost:27017/messages';
var urlUsers = 'mongodb://localhost:27017/users';
var urlRooms = 'mongodb://localhost:27017/rooms';
var dbUsers;
var dbMessages;
var dbRooms;

MongoClient.connect(urlUsers, function(err,db) { dbUsers = db; })
MongoClient.connect(urlMessages, function(err,db) { dbMessages = db; })
MongoClient.connect(urlRooms, function(err,db) { dbRooms = db; })

module.exports = {
    account: {
        getinfo: function(id,callback) { // returns user info
            dbUsers.collection("users").findOne(ObjectId(id), function(err,result) {
                if(result.friends.length==0) {
                    return callback(result);
                }
                var d = 0;
                function loop() { // loops through all the users and adds the nickname to the array, doesn't work with a normal loop
                    dbUsers.collection('users').findOne({username:result.friends[d].name},function(err,friendResult) {
                        result.friends[d].displayName = friendResult.displayName;
                        if(d == result.friends.length-1) {
                            d = result.friends.length;
                            callback(result);
                        } else {
                            d++;
                            loop();
                        }
                    })
                }
                loop();
            })
        },
        removeAccount: function(username,callback) {
            let i,j,k;
            dbUsers.collection('users').findOne({username:username}, function(err,result) {
                if(err) throw err;
                var user = result;
                for(i=0;i<user.friends.length;i++) {
                    dbUsers.collection('users').update({username:user.friends[i].name}, {$pull: {friends: username}});
                }
                for(j=0;j<user.ifr.length;j++) {
                    dbUsers.collection('users').update({username:user.ifr[j]}, {$pull: {sfr: username}});
                }
                for(k=0;k<user.sfr.length;k++) {
                    dbUsers.collection('users').update({username:user.sfr[k]}, {$pull: {ifr: username}});
                }
                dbUsers.collection('users').remove({username: username});
                fs.remove('views/pub_files/' + username);
                callback();
            })
        },
        removeFriend: function(username,friend,callback) {
                dbUsers.collection('users').update({username:username},{$pull:{friends:{name:friend}}});
                dbUsers.collection('users').update({username:friend},{$pull:{friends:{name:username}}});
                callback();
        },
        uploadProfilePic: function(picture,username,callback) { // saves profile_pictures and sets current
            dbUsers.collection("users").update({username: username}, {$push: {profile_pictures: picture.name}}, function() {
                dbUsers.collection("users").findOne({username:username}, function(err,result) {
                    dbUsers.collection('users').update({username:username},{$set: {profile_picture_index:result.profile_pictures.length-1}}, function() {
                        callback();
                    })
                })
            });
        },
        getProfilePicture: function(username,callback) { // returns url to profile picture
            dbUsers.collection("users").findOne({username:username}, function(err,result) {
                if(result.profile_picture_index == 0) {
                    callback("/views/pub_files/profile_pictures/default.png");
                } else {
                    callback("/views/pub_files/"+username+"/profile_pictures/" + result.profile_pictures[result.profile_picture_index]);
                }
            })
        },
        deleteProfilePicture: function(username,picture,callback) { // deletes profile picture if possible
            dbUsers.collection('users').findOne({username:username}, function(err,result) {
                var pIndex = result.profile_pictures.indexOf(picture);
                var ppIndex = result.profile_picture_index;
                if(pIndex == -1) { // if the pictures name does not exist in the database
                    return callback(false,0,'You cant delete this picture because it does not exist!');
                } else if(ppIndex == pIndex) { // if the picture is the current profile picture
                    callback(false,0,'You cant delete your profile picture!');
                } else if(pIndex == 0) { // if the picture is the default picture
                    callback(false,0, 'You cant delete the default profile picture!');
                } else {
                    if(pIndex < ppIndex) { // corrects the profile picture indexes
                        dbUsers.collection('users').update({username:username},{$inc:{profile_picture_index:-1}});
                    }
                    dbUsers.collection('users').update({username:username},{$pull:{profile_pictures:picture}}, function() {
                        callback(true,pIndex);
                    })
                }
            })
        },
        changeProfilePicture: function(username,index,callback) {
            dbUsers.collection('users').update({username:username},{$set:{profile_picture_index:index}}, function(err) {
                if(err) throw err;
                callback();
            })
        },
        changeDisplayName: function(username,newName,callback) {
            dbUsers.collection('users').update({username:username},{$set:{displayName:newName}}, function(err) {
                if(err) throw err;
                callback();
            })
        }
    },
    rooms: {
        joinRoom: function(username,room,callback) {
            this.roomExists(username,room,function(result) {
                if(result) {
                    dbRooms.collection('rooms').findOne({name:room},function(err,result) {
                        for(var i=0;i<result.users.length;i++) {
                            if(result.users[i] == username) {
                                i=result.users.length;
                                return callback(false, "You have already joined the room.");
                            }
                        }
                        dbUsers.collection('users').update({username:username},{$push: {rooms: { name:room,unNoticedMsgs:0,haveNoticedMsgs:true } }}, function(err) {
                            if (err) throw err;
                            callback(true);
                        });
                        dbRooms.collection('rooms').update({name:room},{$push: {users: username}});
                    })
                } else {
                    callback(false,"The room does not exist.");
                }
            })
        },
        roomExists: function(username,room,callback) {
            dbRooms.collection('rooms').findOne({name:room},function(err,result) {
                if(err) throw err;
                if(result == null) {
                    return callback(false);
                } else if(result.bannedUsers.length == 0) {
                    return callback(result);
                }
                for(var i=0;i<result.bannedUsers.length;i++) {
                    if(username == result.bannedUsers[i]) {
                        i = result.bannedUsers;
                        callback(false);
                    } else if(i==result.bannedUsers.length-1) {
                        callback(result);
                    }
                }
            })
        },
        leaveRoom: function(username,room,callback) {
            dbRooms.collection('rooms').update({name: room},{$pull: {users:username}});
            dbUsers.collection('users').update({username:username},{$pull: {rooms: [room,0,true]}}, function() {
                callback();
            });
        },
        createRoom: function(admin,room,callback) {
            this.roomExists(admin,room,function(doesExist) {
                if(!doesExist) {
                    dbRooms.collection('rooms').insertOne({name:room,users:[],bannedUsers:[],admin:admin,reg_date:Date.now()},function(err) {
                        callback(true);
                    })
                } else {
                    callback(false);
                }
            })
        }
    },
    cfr: function(user,friend,callback) { // cancels friend request
        dbUsers.collection("users").update({username:user},{$pull: {sfr: friend}});
        dbUsers.collection("users").update({username:friend},{$pull: {ifr: user}});
        return callback();
    },
    newMessage: function(sender,room,message,time,callback) { // inserts a new message
        var o = {sender:sender,room:room,message:message,time:time};
        dbMessages.collection("messages").insertOne(o, function(err) {
            if (err) {
                throw err;
                return callback(false);
            }
            return callback(true);
        });
    },
    get: function(room,callback) { //returns chat messages from specific room
        dbMessages.collection("messages").find({room:room}).toArray(function(err,result) {
            if(err) throw err;
            callback(result);
        })
    },
    sfr: function(user,friend,callback) { //sends friend requests
        let j,i;
        dbUsers.collection("users").findOne({username: friend}, function(err,result) {
            if(err) throw err;
            if(!result) {
                return callback(false, "user does not exist");
            }
            var fre = false // friend request exists
            for(i = 0; i < result.friends.length; i++) {
                if(result.friends[i].name == user) {
                    return callback(false, "already friends"); // if friend exists
                }
            }
            for(j = 0;j<result.ifr.length;j++) {
                if(result.ifr[j].name == user) {
                    return callback(false, "friend request already sent"); //if request already sent
                }
            }
            dbUsers.collection("users").update({username: user},{$push: {sfr:friend}});
            dbUsers.collection("users").update({username: friend},{$push: {ifr:user}, $set: {noticed_friend_requests: false}});
            return callback(true);
        })
    },
    afr: function(user,friend,rndhex,callback) { // accepts friend request
        dbUsers.collection("users").findOne({username:friend}, function(err,result) {
            if(err) throw err;
            dbUsers.collection("users").update({username: user},{$push: {friends: {name:friend,id:rndhex,unNoticedMsgs:0,haveNoticedMsgs:true}},$pull: {ifr:friend}});
            dbUsers.collection("users").update({username: friend},{$push: {friends: {name:user,id:rndhex,unNoticedMsgs:0,haveNoticedMsgs:true}},$pull: {sfr:user}});
            callback(result.displayName);
        })
    }

}
