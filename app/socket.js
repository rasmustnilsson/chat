
var queries = require("./databaseQueries");
let i,j;
var users = [];

module.exports = function(app,io) {

    var settingsPage = io.of('/settings');

    settingsPage.on('connection', function(socket) {
        queries.users.getinfo(socket.handshake.session.passport.user, function(user) {
            for(i=0;i<user.profile_pictures.length;i++) {
                if(i==0) {
                    user.profile_pictures[i] = '/pub_files/profile_pictures/default.png';
                } else {
                    user.profile_pictures[i] = 'pub_files/' + user.username + '/profile_pictures/' + user.profile_pictures[i];
                }
            }
            socket.emit("userinfo", { // emits initial info
                username:user.username,
                profile_pictures: user.profile_pictures,
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
            for(i=0;i<users.length;i++) {
                if(users[i].id == socket.id) {
                    users.splice(i,1);
                    i = users.length;
                }
            }
        })
        queries.users.getinfo(socket.handshake.session.passport.user, function(user) {
            users.push({
                user: user.username,
                id: socket.id,
                newRooms: []
            })
            for(i=0;i<user.rooms.length;i++) {
                socket.join(user.rooms[i][0]);
            }
            for(i=0;i<user.friends.length;i++) {
                socket.join(user.friends[i][1])
            }
            var friends = []
            for(i=0;i<user.friends.length;i++) {
                friends.push(Object.values(user.friends[i]))
                //console.log(friends)
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
            socket.on('jnR', function() {
                for(i=0;i<users.length;i++) {
                    if(users[i].user == user.username) {
                        for(j=0;j<users[i].newRooms.length;j++) {
                            socket.join(users[i].newRooms[j]);
                            //i = users[i].length;
                        }
                    }
                }
            })
            socket.on("getMessages", function(room) {
                queries.get(room, function(msgs) {
                    socket.emit("chatMessages", msgs);
                });
            })
            socket.on("addFriend", function(friend) {
                queries.sfr(user.username,friend,function(bool,err) {
                    if(bool) {
                        socket.emit("sfr",friend);
                        for(i=0;i<users.length;i++) {
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
                queries.afr(user.username,friend,rndhex,function() {
                    socket.emit("fa",[friend,rndhex,0,true]);
                    socket.join(rndhex);
                    for(i=0;i<users.length;i++) {
                        if(users[i].user == friend) {
                            users[i].newRooms.push(rndhex);
                            socket.nsp.to(users[i].id).emit('newF', [user.username,rndhex,0,true]);
                            i = users.length;
                        }
                    }
                })
            })
            socket.on("cfr", function(friend) { //cancels friend request
                queries.cfr(user.username,friend,function() {
                    socket.emit("cpfr", friend);
                });
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
