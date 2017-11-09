var membersMenu = new Vue({
    el: ".members-menu",
    data: {
        visible: false,
        isAdmin: false,
        listEmpty: true,
        banUserInput: '',
        bannedUsers: [],
        bannedUsersLoaded: false,
        membersInRoom: [],
        currentRoom: '',
    },
    methods: {
        toggleMenu: function(room) {
            socket.emit('getMembers',room.name);
            this.visible = !this.visible;
            this.currentRoom = room;
        },
        removeMember: function(member) {
            socket.emit('removeMember',this.currentRoom.name,member);
        },
        banUser: function() {
            socket.emit('banUser',this.currentRoom.name,this.banUserInput);
            this.banUserInput = '';
        },
        loadBannedUsers: function() {
            this.bannedUsersLoaded = true;
            socket.emit('getBannedUsers',this.currentRoom.name);
        },
        unban: function(user) {
            socket.emit('unban',user,this.currentRoom.name);
        },
    }
})
var chatList = new Vue({
    el: "#chatList",
    data: {
        rooms: [],
        friends: [],
        currRoom: "default",
        highlightedChat: 'default',
        addUserToggled: false,
        roomMenuToggled: false,
        createRoomInput: '',
        friend: '',
        usersOnlineSockets: [],
    },
    methods: {
        sendFriendRequest: function() {
            if(this.friend != "") {
                socket.emit("addFriend", this.friend);
                this.friend = "";
            }
        },
        showMembers: function(index) {
            membersMenu.toggleMenu(this.rooms[index]);
        },
        createRoom: function() {
            if(this.createRoomInput) {
                socket.emit('createRoom', this.createRoomInput);
            }
        },
        muteRoom(room) {
            socket.emit('muteRoom', room);
        },
        leaveRoom: function(room) {
            socket.emit('leaveRoom',room);
        },
        selectChat: function(index) {
            this.currRoom = this.rooms[index].name;
            Vue.set(this.rooms, index, this.rooms[index]);
            this.rooms[index].haveNoticedMsgs = true;
            this.rooms[index].unNoticedMsgs = 0;
            socket.emit("getMessages",this.currRoom);
        },
        removeFriend: function(index) {
            socket.emit('removeFriend',this.friends[index].name);
        },
		selectDm: function(index) {
            this.currRoom = this.friends[index].id;
            Vue.set(this.friends,index, this.friends[index]);
            this.friends[index].unNoticedMsgs = 0;
            this.friends[index].haveNoticedMsgs = true;
            socket.emit("getMessages",this.currRoom);
		},
        toggleMenu: function(index, isFriend) { // toggles the room and menus
            if(isFriend) {
                Vue.set(this.friends,index, this.friends[index]);
                return this.friends[index].dropDownToggled = !this.friends[index].dropDownToggled;
            }
            Vue.set(this.rooms,index,this.rooms[index]);
            if(!this.rooms[index].dropDownToggled) {
                socket.emit('getUsersOnline',this.rooms[index].name);
            }
            if(!this.usersOnlineSockets.includes(this.rooms[index].name)) {
                this.usersOnlineSockets.push(this.rooms[index].name);
                socket.on('usersOnline_' + this.rooms[index].name, function(room,numberOfUserOnline) {
                    chatList.rooms[chatList.rooms.findIndex(x=> x.name == room)].usersOnline = numberOfUserOnline;
                })
            }
            this.rooms[index].dropDownToggled = !this.rooms[index].dropDownToggled;
        },
        getInviteLink: function(room) {
            inviteLink.toggleMenu(room.name);
        },
        addMessageNotification: function(room) {
            if(this.currRoom != room) {
                for(i=0;i<this.friends.length;i++) {
                    if(this.friends[i].id == room) {
                        Vue.set(this.friends, i, this.friends[i]);
                        this.friends[i].unNoticedMsgs += 1;
                        this.friends[i].haveNoticedMsgs = false;
                        i = this.friends.length;
                        return true;
                    }
                }
                for(j=0;j<this.rooms.length;j++) {
                    if(this.rooms[j].name == room) {
                        Vue.set(this.rooms, j, this.rooms[j]);
                        this.rooms[j].unNoticedMsgs += 1;
                        this.rooms[j].haveNoticedMsgs = false;
                        j = this.rooms.length;
                        return true;
                    }
                }
            }
        }
    }
})

setInterval(function() {
    chatList.friends.forEach(function(friend) {
        socket.emit('isUserOnline', friend.name);
    })
},2000);
var errorMessages = new Vue({
    el: '#errorMsg',
    data: {
        messages: []
    },
    methods: {
        addMessage: function(message) {
            this.messages.push(message);
            this.removeMessage();
        },
        removeMessage: function() {
            setTimeout(function(){
                errorMessages.messages.splice(0,1);
            },2000);
        },
    }
})
var chatMessages = new Vue({
    el: "#chatMessages",
    data: {
        messages: []
    },
    methods: {
        scrollToBottom: function() {
            var chat = document.getElementById("chatMessages");
            chat.scrollTop = chat.scrollHeight;
        },
        addMessage: function(list) {
            this.messages.push(list);
            this.$nextTick(() => {
                var chat = document.getElementById("chatMessages");
                chat.scrollTop = chat.scrollHeight;
            })
        },
        isConsecutive: function(user,index) {
            if(index > 0 && user.sender == this.messages[index-1].sender) {
                return true;
            }
            return false;
        },
        imgSrc: function(user) {
            return '/pub_files/profile_pictures/' + user;
        }
    }
})
var friendRequests = new Vue({
    el: "#friend_requests",
    data: {
        ifr: [], // incoming friend requests
        sfr: [] //  sent friend requests
    },
    methods: {
        confirmFriendRequest: function(index) {
            confirmFriend(this.ifr[index]);
        },
        cfr: function(index) { //cancel friend request
            socket.emit("cfr", this.sfr[index]);
        },
        frh: function(d) {
            if(d.length == 0) {
                return true;
            } else {
                return false;
            }
        }
    }
})
var messageForm = new Vue({
    el: "#messageForm",
    data: {
        message: ""
    },
    methods: {
        sendMessage: function() {
            if(this.message != "") {
                message(chatList.currRoom,this.message);
                this.message = "";
            }
        }
    }
})
var inviteLink = new Vue({
    el: '.invite-link',
    data: {
        visible: false,
        url: '',
    },
    methods: {
        toggleMenu: function(room) {
            if(!this.visible) {
                socket.emit('getInviteLink',room);
            }
            this.visible = !this.visible;
        },
        hideMenu: function() {
            this.visible = false;
        },
    }
})
