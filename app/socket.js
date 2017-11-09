var socketStorage = require('./socketStorage'),
    queries = require("./databaseQueries");
let j;

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
                queries.account.deleteProfilePicture(user.username,picture, function(isDeleted,index,err) {
                if(isDeleted) return socket.emit('ppDeleted',true,index);
                socket.emit('ppDeleted',false,0,err);
            })
            })
        })
    })
    io.on('connection', function (socket) {
        socket.on('disconnect', function() {
            socketStorage.removeUser(socket.id);
        })
        queries.account.getinfo(socket.handshake.session.passport.user, function(user) {
            socketStorage.addUser(user,socket.id,function(room) {
                socket.join(room);
            });
            socket.emit("userinfo", socketStorage.getUser(user.username));
            queries.messages.get("default", function(msgs) {
                socket.emit("chatMessages", msgs);
            });
            socket.on('jnR', function() { // lets user join new room
                socketStorage.joinNewRooms(user.username,function(room) {
                    socket.join(room);
                })
            })
            socket.on('getMembers',function(room) {
                queries.rooms.getMembers(user.username,room,function(isInRoom,members,isAdmin) {
                    if(!isInRoom) return socket.emit('alert','You are not in this room!');
                    return socket.emit('listOfMembers',members,isAdmin);
                })
            })
            socket.on('removeMember', function(room,member) {
                queries.rooms.removeMember(user.username,room,member,function() {
                    socket.emit('removedMember',member);
                })
            })
            socket.on('getUsersOnline',function(room) {
                socket.emit('usersOnline_' + room,room,socketStorage.getUsersOnline(user.username,room));
            })
            socket.on('banUser',function(room,bannedUser) { // bans a user from a specific room
                queries.rooms.banUser(user.username,room,bannedUser,function(isUserBanned,info) {
                    if(!isUserBanned) socket.emit('alert', info);
                    socket.emit('userBanned',bannedUser);
                })
            })
            socket.on('getBannedUsers',function(room) {
                queries.rooms.getBannedUsers(user.username,room,function(list) {
                    socket.emit('listOfBannedUsers',list);
                })
            })
            socket.on('unban',function(unbannedUser,room) {
                queries.rooms.unban(user.username,unbannedUser,room,function(isUnbanned,info) {
                    if(!isUnbanned) return socket.emit('alert', info);
                    socket.emit('userUnbanned',unbannedUser);

                })
            })
            socket.on("getMessages", function(room) { // sends messages from specific chat
                queries.messages.get(room, function(msgs) {
                    socket.emit("chatMessages", msgs);
                });
            })
            socket.on('joinRoom', function(room) {
                queries.rooms.joinRoom(user.username,room,false,function(roomExists,msg) {
                    if(!roomExists) return socket.emit('alert', msg);
                    socket.emit('joinRoom', room);
                    socket.join(room);
                });
            })
            socket.on('leaveRoom', function(room) {
                queries.rooms.leaveRoom(user.username,room,function() {
                    socket.emit('leaveRoom',room);
                })
            })
            socket.on('muteRoom', function(room) {
                queries.rooms.toggleMuteRoom(user.username,room.name,function(err,isMuted,info) {
                    if(!err) return socket.emit('roomMuteToggeled',room,isMuted);
                    return socket.emit('alert',info);
                })
            })
            socket.on("addFriend", function(friend) { // sends friend request
                queries.friends.sfr(user.username,friend,function(friendRequestSent,err) {
                    if(!friendRequestSent) return socket.emit("alert",err); //sends error
                    socket.emit("sfr",friend);
                    friend = socketStorage.getUser(friend);
                    return socket.nsp.to(friend.id).emit('newFR',user.username);
                })
            })
            socket.on("confirmFriend", function(friend) { // confirms friend request
                var rndhex = Math.floor(Math.random()*268435455).toString(16);
                queries.friends.afr(user.username,friend,rndhex,function(friendDisplayName) {
                    socket.emit("fa",{name:friend,id:rndhex,unNoticedMsgs:0,haveNoticedMsgs:true,displayName:friendDisplayName,isOnline:false});
                    socketStorage.joinRooms(user.username,[{name:rndhex}],function(room) {
                        socket.join(room);
                    })
                    socketStorage.pushNewRoom(friend,rndhex);
                    return socket.nsp.to(socketStorage.getUser(friend).id).emit('newF', {name:user.username,id:rndhex,unNoticedMsgs:0,haveNoticedMsgs:true,displayName:user.displayName,isOnline:false});
                })
            })
            socket.on("cfr", function(friend) { // cancels friend request
                queries.friends.cfr(user.username,friend,function() {
                    socket.emit("cpfr", friend);
                });
            })
            socket.on('removeFriend', function(friend) {
                queries.account.removeFriend(user.username,friend,function() {
                    socket.emit('friendRemoved',friend);
                    return socket.nsp.to(socketStorage.getUser(friend).id).emit('friendRemoved', user.username);
                })
            })
            socket.on('isUserOnline', function(friend) {
                if(friend == undefined) return false;
                queries.friends.isFriends(user.username,friend,function(isFriends) {
                    if(!isFriends) return false;
                    socket.emit('isOnline',friend,socketStorage.isOnline(user.username,friend));
                });
            })
            socket.on('getInviteLink', function(room) {
                queries.rooms.createInviteLink(user.username,room,function(gotLink,info) {
                    if(gotLink) return socket.emit('inviteLink','inviteLink/' + room + '/' + info);
                    return socket.emit('alert',info);
                });
            })
            socket.on('createRoom', function(room) {
                queries.rooms.createRoom(user.username,room,function(isCreated) {
                    if(!isCreated) return socket.emit('alert', 'Could not create room');
                    socket.emit('joinRoom',room);
                    socket.join(room);
                })
            })
            socket.on("message",function(room,sender,message) {
                queries.messages.new(sender,room,message,Date.now(),function(couldSend) {
                    if(!couldSend) return socket.emit("alert", "Failed to send message!");
                    socket.nsp.to(room).emit('messageFromServer',room,sender,message);
                });
            })
        })
    })
}
