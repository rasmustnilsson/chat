var chatList = new Vue({
    el: "#chatList",
    data: {
        rooms: [],
        friends: [],
        currRoom: ["default",0,true],
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
        createRoom: function() {
            if(this.createRoomInput) {
                socket.emit('createRoom', this.createRoomInput);
            }
        },
        leaveRoom: function(room) {
            socket.emit('leaveRoom',room);
        },
        selectChat: function(index) {
            this.currRoom = this.rooms[index];
            Vue.set(this.rooms, index, [this.rooms[index][0],0,true]);
            socket.emit("getMessages",this.currRoom[0]);
        },
        removeFriend: function(index) {
            socket.emit('removeFriend',this.friends[index][0]);
        },
		selectDm: function(index) {
            this.currRoom[0] = this.friends[index][1];
            Vue.set(this.friends,index, this.friends[index]);
            this.friends[index][2] = 0;
            this.friends[index][3] = true;
            socket.emit("getMessages",this.currRoom[0]);
		},
        toggleMenu: function(index, boolean) { // toggles the room and menus
            if(boolean) {
                Vue.set(this.friends,index, this.friends[index]);
                this.friends[index][5] = !this.friends[index][5];
            } else {
                Vue.set(this.rooms,index,this.rooms[index]);
                if(!this.rooms[index][3]) {
                    this.rooms[index][3] = true;
                } else {
                    this.rooms[index][3] = !this.rooms[index][3];
                }
            }
        },
        getInviteLink: function(index) {}, // WIP, will copy the invite link to clipboard
        showInviteLink: function(index) {
            alert('localhost/joinRoom/' + this.rooms[index][0]);
        },
        addMessageNotification: function(room) {
            if(this.currRoom[0] != room) {
                for(i=0;i<this.friends.length;i++) {
                    if(this.friends[i][1] == room) {
                        Vue.set(this.friends, i, this.friends[i]);
                        this.friends[i][2] += 1;
                        this.friends[i][3] = false;
                        i = this.friends.length;
                        return true;
                    }
                }
                for(j=0;j<this.rooms.length;j++) {
                    if(this.rooms[j][0] == room) {
                        Vue.set(this.rooms, j, this.rooms[j]);
                        this.rooms[j][1] += 1;
                        this.rooms[j][2] = false;
                        j = this.rooms.length;
                        return true;
                    }
                }
            }
        }
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
                message(chatList.currRoom[0],this.message);
                this.message = "";
            }
        }
    }
})
