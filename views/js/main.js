var socket = io.connect('/');
let i, username,j,list;

socket.on("incoming_friend_requests", function(data) {
    for (i = 0; i < data.length; i++) {
        friendRequests.ifr.push(data[i]);
    }
})
socket.on("cpfr", function(data) {
    var a = friendRequests.sfr.indexOf(data);
    friendRequests.sfr.splice(a, 1);
})
socket.on("friend_requests", function(data) {
    for (i = 0; i < data.length; i++) {
        friendRequests.sfr.push(data[i]);
    }
})
socket.on('newFR', function(user) {
    friendRequests.ifr.push(user);
})
socket.on('newF', function(user) { // when another user accepts your friend request
    for(i=0;i<friendRequests.sfr.length;i++) {
        if(friendRequests.sfr[i] == user[0]) {
            friendRequests.sfr.splice(i,1);
            i=friendRequests.sfr.length;
        }
    }
    chatList.friends.push(user);
    socket.emit('jnR'); // joins new rooms
})
socket.on("messageFromServer", function(room, sender, message) {
    console.log(room,sender,message)
    if(room == chatList.currRoom[0]) {
        if(sender == username) {
            chatMessages.addMessage([message,'user', sender]);
        } else {
            chatMessages.addMessage([message,'room', sender]);

        }
    } else {
        chatList.addMessageNotification(room);
    }
})
socket.on("friends", function(users) {
    for (i = 0; i < users.length; i++) {
        chatList.friends.push(users[i][1]);
    }
})
socket.on("sfr", function(data) { // when friend request has been sent
    friendRequests.sfr.push(data);
})
socket.on("fa", function(user) {
    chatList.friends.push(user);
    var a = friendRequests.ifr.indexOf(user);
    friendRequests.ifr.splice(a, 1);
})
socket.on("fr_noUser", function(user) {
    alert("username does not exist");
})
socket.on("userinfo", function(data) { // initial user info
    chatList.friends = [];
    username = data.username;
    friendRequests.ifr = data.ifr;
    friendRequests.sfr = data.sfr;
    chatList.rooms = data.rooms;
    for(i=0;i<data.friends.length;i++) {
        data.friends[i].push(false);
        chatList.friends.push(data.friends[i]);
    }
})
socket.on("chatMessages", function(data) { //builds chat
        buildChat(data);
})
socket.on("alert", function(data) {
    alertMessage(data);
})
socket.on('friendRemoved',function(friend) {
    for(i=0;i<chatList.friends.length;i++) {
        if(chatList.friends[i][0] == friend) {
            chatList.friends.splice(i,1);
            i = chatList.friends.length;
        }
    }
})
function message(room, message) {
    socket.emit("message", room, username, message);
}

function confirmFriend(friend) {
    socket.emit("confirmFriend", friend);
}
socket.on("createAccountFailed", function(data) {
    alert("Username: " + data + " already taken!");
})

function createAccount(user) {
    socket.emit("createAccount", user);
}

function alertMessage(message) { //alerts use when somethings goes wrong on server
    alert(message);
}

function buildChat(chat) {
    chatMessages.messages = [];
    for (i = 0; i < chat.length; i++) {
        var b = "room";
        if (chat[i].sender == username) {
            b = "user";
        }
        chatMessages.addMessage([chat[i].message, b, chat[i].sender]);
    }
}

function friendRequest(friend) {
    socket.emit("addFriend", friend);
}
