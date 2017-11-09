module.exports = {
    users: [],
    rooms: [],
    addUser: function(newUser,id,callback) {
        var user = {
            username: newUser.username,
            id: id,
            newRooms: [],
            friends: newUser.friends,
            displayName: newUser.displayName,
            rooms: newUser.rooms,
            sfr: newUser.sfr,
            ifr: newUser.ifr,
            nfr: newUser.nfr,
            reg_date: newUser.reg_date,
            isMuted: newUser.isMuted,
            profile_picture_index: newUser.profile_picture_index,
            profile_pictures: newUser.profile_pictures[newUser.profile_picture_index],
        }
        for(var roomIndex in user.rooms) {
            user.rooms[roomIndex].usersOnline = 1;
        }
        for(var friendIndex in user.friends) {
            user.friends[friendIndex].dropDownToggled = false;
            user.friends[friendIndex].isOnline = -1;
        }
        this.users.push(user);
        this.joinRooms(newUser.username,newUser.rooms,function(room) {
            callback(room);
        });
        for(var key in newUser.friends) {
            callback(user.friends[key].id);
        }
    },
    getUser: function(username) {
        for(var userIndex in this.users) {
            if(this.users[userIndex].username == username) return this.users[userIndex];
        }
    },
    getUserFromId: function(id) {
        for(var userIndex in this.users) {
            if(this.users[userIndex].id == id) return this.users[userIndex];
        }
    },
    getUsersOnline: function(username,room) {
        var roomIndex = this.isInRoom(username,room);
        if(roomIndex == -1) return 0;
        return this.rooms[roomIndex].users.length;
    },
    isInRoom: function(username,room) {
        for(userIndex in this.users) {
            if(this.users[userIndex].username == username) {
                for(var roomIndex in this.users[userIndex].rooms) {
                    if(this.users[userIndex].rooms[roomIndex].name == room) return roomIndex;
                }
                return -1;
            }
        }
    },
    removeUser: function(id) {
        var user = this.getUserFromId(id);
        var index = this.users.findIndex(x=> x.id == id);
        this.users.splice(index,1);
        for(var roomIndex = 0;roomIndex<this.rooms.length;roomIndex++) {
            if(this.rooms[roomIndex].users.includes(user.username)) {
                this.rooms[roomIndex].users.splice(this.rooms[roomIndex].users.indexOf(user.username),1);
            }
        }
    },
    isOnline: function(username,friend) {
        for(var userIndex in this.users) {
            if(this.users[userIndex].username == friend) {
                return 1;
            }
        }
        return 0;
    },
    joinRooms: function(username,rooms,callback) {
        joinRoomLoop: for(var room in rooms) {
            for(var serverRoom in this.rooms) {
                if(rooms[room].name == this.rooms[serverRoom].name) {
                    this.rooms[serverRoom].users.push(username);
                    callback(rooms[room].name);
                    continue joinRoomLoop;
                }
            }
            callback(rooms[room].name);
            this.rooms.push({
                name: rooms[room].name,
                users: [username],
            })
        }
    },
    joinNewRooms: function(username,callback) {
        for(var userIndex in this.users) {
            if(this.users[userIndex].username == username) {
                for(var room in this.users[userIndex].newRooms) {
                    callback(this.users[userIndex].newRooms[room]);
                }
                this.users[userIndex].newRooms = [];
                break;
            }
        }
    },
    pushNewRoom: function(username,room) {
        for(var userIndex in this.users) {
            if(this.users[userIndex].username == username) {
                this.users[userIndex].newRooms.push(room);
                break;
            }
        }
    },
}
