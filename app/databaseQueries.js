var MongoClient = require('mongodb').MongoClient
var ObjectId = require('mongodb').ObjectId;
var fs = require('fs-extra');
var dbUsers;
var dbMessages;
var dbRooms;

MongoClient.connect('mongodb://localhost:27017/users', function(err,db) { dbUsers = db.collection('users'); })
MongoClient.connect('mongodb://localhost:27017/messages', function(err,db) { dbMessages = db.collection('messages'); })
MongoClient.connect('mongodb://localhost:27017/rooms', function(err,db) { dbRooms = db.collection('rooms'); })

var queries = {
    account: {
        getinfo: function(id,callback) { // returns user info
            dbUsers.findOne(ObjectId(id), function(err,result) {
                if(result.friends.length==0) {
                    return callback(result);
                }
                var d = 0;
                function loop() { // loops through all the users and adds the nickname to the array, doesn't work with a normal loop
                    dbUsers.findOne({username:result.friends[d].name},function(err,friendResult) {
                        result.friends[d].displayName = friendResult.displayName;
                        if(d==result.friends.length-1) {
                            return callback(result);
                        } else {
                            d++;
                            loop();
                        }
                    })
                }
                loop();
            })
        },
        userExists: function(username,callback) {
            dbUsers.findOne({username:username},function(err,result) {
                if(err) throw err;
                callback(result);
            })
        },
        removeAccount: function(username,callback) {
            let i,j,k;
            this.userExists(username,function(user) {
                if(!user) return false;
                for(i=0;i<user.friends.length;i++) {
                    dbUsers.update({username:user.friends[i].name}, {$pull: {friends: username}});
                }
                for(j=0;j<user.ifr.length;j++) {
                    dbUsers.update({username:user.ifr[j]}, {$pull: {sfr: username}});
                }
                for(k=0;k<user.sfr.length;k++) {
                    dbUsers.update({username:user.sfr[k]}, {$pull: {ifr: username}});
                }
                dbUsers.remove({username: username});
                fs.remove('views/pub_files/' + username);
                callback();
            })
        },
        removeFriend: function(username,friend,callback) {
                dbUsers.update({username:username},{$pull:{friends:{name:friend}}});
                dbUsers.update({username:friend},{$pull:{friends:{name:username}}});
                callback();
        },
        uploadProfilePic: function(picture,username,callback) { // saves profile_pictures and sets current
            dbUsers.update({username: username}, {$push: {profile_pictures: picture.name}}, function() {
                dbUsers.findOne({username:username}, function(err,result) {
                    dbUsers.update({username:username},{$set: {profile_picture_index:result.profile_pictures.length-1}}, function() {
                        callback();
                    })
                })
            });
        },
        getProfilePicture: function(username,callback) { // returns url to profile picture
            dbUsers.findOne({username:username}, function(err,result) {
                if(!result || result.profile_picture_index == 0) {
                    callback("/views/pub_files/profile_pictures/default.png");
                } else {
                    callback("/views/pub_files/"+username+"/profile_pictures/" + result.profile_pictures[result.profile_picture_index]);
                }
            })
        },
        deleteProfilePicture: function(username,picture,callback) { // deletes profile picture if possible
            dbUsers.findOne({username:username}, function(err,result) {
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
                        dbUsers.update({username:username},{$inc:{profile_picture_index:-1}});
                    }
                    dbUsers.update({username:username},{$pull:{profile_pictures:picture}}, function() {
                        callback(true,pIndex);
                    })
                }
            })
        },
        changeProfilePicture: function(username,index,callback) {
            dbUsers.update({username:username},{$set:{profile_picture_index:index}}, function(err) {
                if(err) throw err;
                callback();
            })
        },
        changeDisplayName: function(username,newName,callback) {
            dbUsers.update({username:username},{$set:{displayName:newName}}, function(err) {
                if(err) throw err;
                callback();
            })
        }
    },
    rooms: {
        joinRoom: function(username,room,id,callback) {
            this.roomExists(username,room,function(result) {
                if(!result) return callback(false,"The room does not exist.");
                queries.rooms.isInRoom(username,room,function(result,roomInfo) {
                    if(result) return callback(false, "You are already in this room!");
                    if(!id) {
                        dbRooms.update({name:room},{$push: {users: username}});
                        return dbUsers.update({username:username},{$push: {rooms: { name:room,unNoticedMsgs:0,haveNoticedMsgs:true,isMuted:false} }}, function(err) {
                            callback(true);
                        });
                    }
                    for(var i=0;i<roomInfo.inviteLinkIds.length;) {
                        if(roomInfo.inviteLinkIds[i].id == id && roomInfo.inviteLinkIds[i].expirationDate + 3600000 >= Date.now()) {
                            dbRooms.update({name:room},{$push: {users: username}});
                            return dbUsers.update({username:username},{$push: {rooms: { name:room,unNoticedMsgs:0,haveNoticedMsgs:true,isMuted:false} }}, function(err) {
                                callback(true);
                            });
                        } else if(roomInfo.inviteLinkIds[i].id == id) {
                            return dbRooms.update({name:room},{$pull: {inviteLinkIds: {id:id}}}, function() {
                                callback(false, 'Your link has expired!');
                            });
                        } else {
                            i++;
                        }
                    }
                    callback(false, 'Your link has expired!');
                })
            })
        },
        getMembers: function(username,room,callback) {
            this.isInRoom(username,room,function(result) {
                if(!result) return callback(false);
                queries.rooms.isAdmin(username,room,function(isAdmin) {
                    dbRooms.findOne({name:room},function(err,result) {
                        callback(true,result.users.length > 1 ? result.users:false,isAdmin);
                    })

                })
            })
        },
        isInRoom: function(username,room,callback) {
            if(room == 'default' || room == 'memes') return callback(true);
            dbRooms.findOne({name:room},function(err,result) {
                if(err) throw err;
                if(!result.users.includes(username)) return callback(false,result);
                return callback(result);
            })
        },
        removeExpiredInviteLinks: function(room) {
            dbRooms.findOne({name:room},function(err,result) {
                for(var i = 0;i<result.inviteLinkIds.length;i++) {
                    if(result.inviteLinkIds[i].expirationDate + 3600000 <= Date.now()) {
                        dbRooms.update({name:room},{$pull: {inviteLinkIds: {expirationDate:result.inviteLinkIds[i].expirationDate}}});
                    }
                }
            })
        },
        createInviteLink: function(username,room,callback) {
            this.removeExpiredInviteLinks(room);
            this.isInRoom(username,room,function(result) {
                if(!result) return callback(false, 'You are not in this room!');
                if(result.invitesAllowed) {
                    var rndhex = Math.floor(Math.random()*268435455).toString(16); // generates a random hex id
                    dbRooms.update({name:room},{$push: {inviteLinkIds: {id:rndhex,expirationDate:Date.now()}}},function() {
                        return callback(true,rndhex);
                    })
                }
            })
        },
        toggleMuteRoom: function(username,room,callback) {
                this.isInRoom(username,room,function(result) {
                    if(!result) return callback(true,false, 'You are not in this room!');
                    dbUsers.findOne({username:username},{rooms: {$elemMatch: {name: room}}}, function(err,result) {
                        if(!result.rooms[0].isMuted) {
                            dbUsers.update({username:username,rooms: {$elemMatch: {name: room}}},{$set: {'rooms.$.isMuted': true}});
                            return callback(false,true);
                        }
                        dbUsers.update({username:username,rooms: {$elemMatch: {name: room}}},{$set: {'rooms.$.isMuted': false}});
                        callback(false,false);

                    })
                });
        },
        isBanned: function(username,room,callback) {
            dbRooms.findOne({name:room}, function(err,result) {
                if(err) throw err;
                if(result.bannedUsers.includes(username)) return callback(true);
                return callback(false);
            })
        },
        isAdmin: function(username,room,callback) {
            this.roomExists(username,room, function(result) {
                if(!result) return callback(false);
                dbRooms.findOne({name:room},function(err,result) {
                    if(err) throw err;
                    if(result.admin == username) return callback(true);
                    return callback(false);
                })
            });
        },
        banUser: function(username,room,bannedUser,callback) {
            this.isAdmin(username,room,function(result) {
                if(!result) return callback(false,'You are not admin of this room!');
                queries.rooms.isBanned(bannedUser,room,function(result) {
                    if(result) return callback(false,bannedUser + ' is already banned.');
                    queries.account.userExists(bannedUser,function(user) {
                        if(!user) return callback(false, 'Can\'t find ' + bannedUser + '.');
                        dbRooms.update({name:room},{$push: {bannedUsers: bannedUser}}, function(err) {
                            callback(true);
                        })
                    })
                })
            })
        },
        getBannedUsers: function(username,room,callback) {
            this.isAdmin(username,room,function(result) {
                if(!result) return callback([]);
                dbRooms.findOne({name:room},function(err,result) {
                    if(result.bannedUsers.length == 0) return callback([]);
                    callback(result.bannedUsers);
                })
            })
        },
        unban: function(admin,user,room,callback) {
            this.isAdmin(admin,room,function(result) {
                if(!result) return callback(false, 'You are not admin of this room!');
                if(!result) return callback(false, 'Could not find user in room!');
                dbRooms.update({name:room},{$pull: {bannedUsers: user}}, function(err) {
                    if(err) throw err;
                    callback(true);
                })
            })
        },
        removeMember: function(username,room,member,callback) {
            this.roomExists(username,room,function(result) {
                if(!result) return false;
                dbRooms.update({name:room},{$pull: {users: member}});
                dbUsers.update({username:member},{$pull: {rooms: {name: room}}});
                callback();
            })
        },
        roomExists: function(username,room,callback) {
            dbRooms.findOne({name:room},function(err,result) {
                if(err) throw err;
                if(result == null) return callback(false);
                if(result.bannedUsers.length == 0) return callback('result');
                for(var i=0;i<result.bannedUsers.length;i++) {
                    if(username == result.bannedUsers[i]) return callback(false);
                    if(i==result.bannedUsers.length-1) return callback(result);
                }
            })
        },
        leaveRoom: function(username,room,callback) {
            dbRooms.update({name: room},{$pull: {users:username}});
            dbUsers.update({username:username},{$pull: {rooms: {name: room}}}, function() {
                callback();
            });
        },
        createRoom: function(admin,room,callback) { // creates a new room
            this.roomExists(admin,room,function(result) {
                if(result) return callback(false);
                dbRooms.insertOne({name:room,users:[],bannedUsers:[],admin:admin,reg_date:Date.now(),invitesAllowed:true,inviteLinkIds:[]},function(err) {
                    queries.rooms.joinRoom(admin,room,false,function() { callback(true); })
                })
            })
        }
    },
    messages: {
        new: function(sender,room,message,time,callback) { // inserts a new message
            var o = {sender:sender,room:room,message:message,time:time};
            dbMessages.insertOne(o, function(err) {
                if (err) return callback(false);
                return callback(true);
            });
        },
        get: function(room,callback) { //returns chat messages from specific room
            dbMessages.find({room:room}).toArray(function(err,result) {
                if(err) throw err;
                callback(result);
            })
        },
    },
    friends: {
        cfr: function(user,friend,callback) { // cancels friend request
            dbUsers.update({username:user},{$pull: {sfr: friend}});
            dbUsers.update({username:friend},{$pull: {ifr: user}});
            return callback();
        },
        sfr: function(user,friend,callback) { //sends friend requests
            let j,i;
            dbUsers.findOne({username: friend}, function(err,result) {
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
                dbUsers.update({username: user},{$push: {sfr:friend}});
                dbUsers.update({username: friend},{$push: {ifr:user}, $set: {noticed_friend_requests: false}});
                return callback(true);
            })
        },
        isFriends: function(username,friend,callback) {
            dbUsers.findOne({username:username},function(err,result) {
                result.friends.forEach(function(user) {
                    if(user.name == friend) return callback(true);
                })
                return callback(false);
            })
        },
        afr: function(user,friend,rndhex,callback) { // accepts friend request
            dbUsers.findOne({username:friend}, function(err,result) {
                if(err) throw err;
                dbUsers.update({username: user},{$push: {friends: {name:friend,id:rndhex,unNoticedMsgs:0,haveNoticedMsgs:true}},$pull: {ifr:friend}});
                dbUsers.update({username: friend},{$push: {friends: {name:user,id:rndhex,unNoticedMsgs:0,haveNoticedMsgs:true}},$pull: {sfr:user}});
                callback(result.displayName);
            })
        }
    },
}
module.exports = queries;
