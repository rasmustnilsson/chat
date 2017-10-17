
var queries = require("./databaseQueries");
let j;
var users = [];

module.exports = function(app,io) {
    var settingsPage = io.of('/settings');
    settingsPage.on('connection', function(socket) {
        queries.account.getinfo(socket.handshake.session.passport.user, function(user) {
            for(var i=0;i<user.profile_pictures.length;i++) {
                if(i==0) {
                    user.profile_pictures[i] = '/pub_files/profile_pictures/default.png';
                } else {
                    user.profile_pictures[i] = 'pub_files/' + user.username + '/profile_pictures/' + user.profile_pictures[i];
                }
            }
            socket.on('changeProfilePicture', function(index) {
                queries.account.changeProfilePicture(user.username,index,function() {
                    socket.emit('profilePictureChanged',index);
                })
            })
            socket.on('changeDisplayName', function(newName) {
                queries.account.changeDisplayName(user.username,newName, function() {
                        socket.emit('newDisplayName', newName);
                })
            })
            socket.emit("userinfo", { // emits initial info
                username:user.username,
                profile_pictures: user.profile_pictures,
                profile_picture_index: user.profile_picture_index,
                friends: user.friends,
                rooms: user.rooms,
                sfr:user.sfr,
                ifr:user.ifr,
                nfr:user.nfr,
            });
            socket.on("deleteProfilePicture", function(picture) { // deletes picture
                queries.account.deleteProfilePicture(user.username,picture, function(bool,index,err) {
                if(bool) {
                    socket.emit('ppDeleted',true,index);
                } else {
                    socket.emit('ppDeleted',false,0,err);
                }
                })
            })
        })
    })
    io.on('connection', function (socket) {
        socket.on('disconnect', function() {
            for(var i=0;i<users.length;i++) {
                if(users[i].id == socket.id) {
                    users.splice(i,1);
                    i = users.length;
                }
            }
        })
        queries.account.getinfo(socket.handshake.session.passport.user, function(user) {
            users.push({
                user: user.username,
                id: socket.id,
                newRooms: []
            })
            for(var i=0;i<user.rooms.length;i++) {
                socket.join(user.rooms[i].name);
            }
            for(var i=0;i<user.friends.length;i++) {
                socket.join(user.friends[i].id);
            }
            var friends = []
            for(var i=0;i<user.friends.length;i++) {
                friends.push(user.friends[i]);
                friends[i].dropDownToggled = false;
            }
            socket.emit("userinfo", {
                username:user.username,
                friends: friends,
                rooms: user.rooms,
                profile_picture: user.profile_pictures[user.profile_picture_index],
                sfr:user.sfr,
                ifr:user.ifr,
                nfr:user.nfr,
            });
            queries.get("default", function(msgs) {
                socket.emit("chatMessages", msgs);
            });
            socket.on('jnR', function() { // lets user join new room
                for(var i=0;i<users.length;i++) {
                    if(users[i].user == user.username) {
                        for(j=0;j<users[i].newRooms.length;j++) {
                            socket.join(users[i].newRooms[j]);
                        }
                    }
                }
            })
            socket.on('getMembers',function(room) {
                queries.rooms.getMembers(user.username,room,function(members, isAdmin) {
                    if(members) {
                        socket.emit('listOfMembers',members,isAdmin);
                    } else {
                        socket.emit('emptyListOfMembers');
                    }
                })
            })
            socket.on('removeMember', function(room,member) {
                queries.rooms.removeMember(user.username,room,member,function() {
                    socket.emit('removedMember',member);
                })
            })
            socket.on("getMessages", function(room) { // sends messages from specific chat
                queries.get(room, function(msgs) {
                    socket.emit("chatMessages", msgs);
                });
            })
            socket.on('joinRoom', function(room) {
                queries.rooms.joinRoom(user.username,room,function(roomExists) {
                    if(roomExists) {
                        socket.emit('joinRoom', room);
                        socket.join(room);

                    } else {
                        socket.emit('alert', msg);
                    }
                });
            })
            socket.on('leaveRoom', function(room) {
                queries.rooms.leaveRoom(user.username,room,function() {
                    socket.emit('leaveRoom',room);
                })
            })
            socket.on("addFriend", function(friend) { // sends friend request
                queries.sfr(user.username,friend,function(bool,err) {
                    if(bool) {
                        socket.emit("sfr",friend);
                        for(var i=0;i<users.length;i++) {
                            if(users[i].user == friend) {
                                socket.nsp.to(users[i].id).emit('newFR',user.username);
                            }
                        }
                    } else {
                        socket.emit("alert",err); //sends error
                    }

                })
            })
            socket.on("confirmFriend", function(friend) { // confirms friend request
                var rndhex = Math.floor(Math.random()*268435455).toString(16);
                queries.afr(user.username,friend,rndhex,function(friendDisplayName) {
                    socket.emit("fa",{name:friend,id:rndhex,unNoticedMsgs:0,haveNoticedMsgs:true,displayName:friendDisplayName});
                    socket.join(rndhex);
                    for(var i=0;i<users.length;i++) {
                        if(users[i].user == friend) {
                            users[i].newRooms.push(rndhex);
                            socket.nsp.to(users[i].id).emit('newF', {name:user.username,id:rndhex,unNoticedMsgs:0,haveNoticedMsgs:true,displayName:user.displayName});
                            break;
                        }
                    }
                })
            })
            socket.on("cfr", function(friend) { // cancels friend request
                queries.cfr(user.username,friend,function() {
                    socket.emit("cpfr", friend);
                });
            })
            socket.on('removeFriend', function(friend) {
                queries.account.removeFriend(user.username,friend,function() {
                    socket.emit('friendRemoved',friend);
                    for(var i=0;i<users.length;i++) {
                        if(users[i].user == friend) {
                            socket.nsp.to(users[i].id).emit('friendRemoved', user.username);
                            i = users.length;
                        }
                    }
                })
            })
            socket.on('createRoom', function(room) {
                queries.rooms.createRoom(user.username,room,function(isCreated) {
                    if(isCreated) {
                        queries.rooms.joinRoom(user.username,room,function() {
                            socket.emit('roomCreated',room);
                        })
                    } else {
                        socket.emit('alert', 'Could not create room');
                    }
                })
            })
            socket.on("message",function(room,sender,message) {
                queries.newMessage(sender,room,message,Date.now(),function(bool) {
                    if(bool) {
                        socket.nsp.to(room).emit('messageFromServer',room,sender,message);
                    } else {
                        socket.emit("alert", "Failed to send message!");
                    }
                });
            })
        })
    })
}
