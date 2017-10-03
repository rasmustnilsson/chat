var chatList = new Vue({
    el: "#chatList",
    data: {
        rooms: [],
        friends: [],
        currRoom: ["default",0,true],
        highlightedChat: 'default',
        openedFriendMenu: [],
    },
    methods: {
        selectChat: function(index) {
            this.currRoom = this.rooms[index];
            Vue.set(this.rooms, index, [this.rooms[index][0],0,true]);
            socket.emit("getMessages",this.currRoom[0]);
        },
		selectDm: function(index) {
            this.currRoom[0] = this.friends[index][1];
            Vue.set(this.friends,index, this.friends[index]);
            this.friends[index][2] = 0;
            this.friends[index][3] = true;
            socket.emit("getMessages",this.currRoom[0]);
		},
        dropup: function(index) {
            if(this.openedFriendMenu[index]) {
                return 'dropup';
            } else {
                return '';
            }
        },
        toggleMenu: function(index, boolean) {
            if(boolean) {
                this.openedFriendMenu[index] = true;
                Vue.set(this.friends,index, this.friends[index]);
                this.friends[index][5] = !this.friends[index][5];
            } else {

            }
        },
        addMessageNotification: function(room) {
            for(i=0;i<this.friends.length;i++) {
                if(this.friends[i][1] == room) {
                    console.log(this.friends[i][0])
                    Vue.set(this.friends, i, [this.friends[i][0],this.friends[i][1],this.friends[i][2]+1,false,this.friends[i][4],this.friends[index][5]]);
                }
            }
            for(j=0;j<this.rooms.length;j++) {
                if(this.rooms[j][0] == room) {
                    Vue.set(this.rooms, j, [this.rooms[j][0],this.rooms[j][1] +1,false]);
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
var addFriend = new Vue({
    el: "#addFriendForm",
    data: {
        friend: ""
    },
    methods: {
        sendFriendRequest: function() {
            if(this.friend != "") {
                socket.emit("addFriend", this.friend);
                this.friend = "";
            }
        }
    }
})
