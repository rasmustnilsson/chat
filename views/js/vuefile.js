var membersMenu = new Vue({
    el: ".members-menu",
    data: {
        visible: false,
        listEmpty: true,
        membersInRoom: [],
        isAdmin: false,
        currentRoom: '',
    },
    methods: {
        toggleMenu: function(room) {
            socket.emit('getMembers',room.name);
            this.currentRoom = room;
            this.visible = !this.visible;
        },
        removeMember: function(member) {
            socket.emit('removeMember',this.currentRoom,member);
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
        joinRoomInput: '',
        createRoomInput: '',
        friend: '',
    },
    methods: {
        sendFriendRequest: function() {
            if(this.friend != "") {
                socket.emit("addFriend", this.friend);
                this.friend = "";
            }
        },
        joinRoom: function() {
            if(this.joinRoomInput) {
                socket.emit('joinRoom', this.joinRoomInput);
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
        toggleMenu: function(index, boolean) { // toggles the room and menus
            if(boolean) {
                Vue.set(this.friends,index, this.friends[index]);
                this.friends[index].dropDownToggled = !this.friends[index].dropDownToggled;
            } else {
                Vue.set(this.rooms,index,this.rooms[index]);
                if(!this.rooms[index].dropDownToggled) {
                    this.rooms[index].dropDownToggled = true;
                } else {
                    this.rooms[index].dropDownToggled = !this.rooms[index].dropDownToggled;
                }
            }
        },
        getInviteLink: function(index) {}, // WIP, will copy the invite link to clipboard
        showInviteLink: function(index) {
            alert('localhost/joinRoom/' + this.rooms[index].name);
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
