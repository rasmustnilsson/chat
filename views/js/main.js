var socket = io.connect('/');
let i, username,j,list,
months=["January","February","March","April","May","June","July","August","September","October","November","December"];
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
socket.on("joinRoom", function(room) {
    chatList.rooms.push({name: room, unNoticedMsgs: 0, haveNoticedMsgs: true});
})
socket.on('listOfBannedUsers',function(list) {
    membersMenu.bannedUsers = list;
})
socket.on('userUnbanned',function(user,room) {
    var index = membersMenu.bannedUsers.indexOf(user);
    membersMenu.bannedUsers.splice(index,1);
})
socket.on('userBanned',function(user) {
    if(membersMenu.bannedUsersLoaded) membersMenu.bannedUsers.push(user);
})
socket.on('newFR', function(user) {
    friendRequests.ifr.push(user);
})
socket.on('leaveRoom', function(room) {
    for(i=0;i<chatList.rooms.length;i++) {
        if(chatList.rooms[i].name == room) {
            chatList.rooms.splice(i,1);
            break;
        }
    }
})
socket.on('newF', function(user) { // when a user accepts your friend request
    for(i=0;i<friendRequests.sfr.length;i++) {
        if(friendRequests.sfr[i] == user[0]) {
            friendRequests.sfr.splice(i,1);
            break;
        }
    }
    chatList.friends.push(user);
    socket.emit('jnR'); // joins new rooms
})
socket.on("messageFromServer", function(room, sender, message) {
    var index = chatList.rooms.findIndex(x=> x.name == room);
    if(chatList.rooms[index].isMuted) return true;
    var u = (sender == username ? 'user': 'room');
    if(room == chatList.currRoom) {
        return chatMessages.addMessage({message:message,user:u,sender:sender});
    }
    chatList.addMessageNotification(room);
})
socket.on("friends", function(users) {
    for (i=0;i<users.length;i++) {
        chatList.friends.push(users[i][1]);
    }
})
socket.on('listOfMembers', function(members,isAdmin) { // loads the members of a specific room
    if(members.length == 0) return membersMenu.listEmpty = true;
    membersMenu.isAdmin = isAdmin;
    membersMenu.listEmpty = false;
    membersMenu.membersInRoom = members;
})
socket.on('emptyListOfMembers', function() {
    membersMenu.listEmpty = true;
})
socket.on('roomMuteToggeled',function(room,isMuted) {
    var index = chatList.rooms.findIndex(x=> x.name == room.name);
    chatList.rooms[index].isMuted = isMuted;
})
socket.on('removedMember', function(member) {
    if(membersMenu.membersInRoom.length == 2) {
        membersMenu.listEmpty = true;
    }
    membersMenu.membersInRoom.splice(membersMenu.membersInRoom.indexOf(member),1);
})
socket.on("sfr", function(data) { // when friend request has been sent
    friendRequests.sfr.push(data);
})
socket.on("fa", function(user) {
    chatList.friends.push(user);
    var a = friendRequests.ifr.indexOf(user);
    friendRequests.ifr.splice(a, 1);
})
socket.on("userinfo", function(data) { // initial user info
    chatList.friends = [];
    username = data.username;
    friendRequests.ifr = data.ifr;
    friendRequests.sfr = data.sfr;
    chatList.rooms = data.rooms;
    chatList.friends = data.friends;
})
socket.on("chatMessages", function(chat) { //builds chat
    chatMessages.messages = [];
    for (i = 0; i < chat.length; i++) {
        var userOrRoom = (chat[i].sender == username ? 'user':'room');
        var d = new Date(chat[i].time);
        var time = d.toDateString() + ' ' + ("0" + d.getHours()).slice(-2) + ':' + ("0" + d.getMinutes()).slice(-2);
        if(d.toDateString() === new Date().toDateString()) {
            var time = ("0" + d.getHours()).slice(-2) + ':' + ("0" + d.getMinutes()).slice(-2);
        }
        chatMessages.addMessage({message:chat[i].message,user:userOrRoom,sender:chat[i].sender,time:time});
    }
})
socket.on("alert", function(msg) {
    errorMessages.addMessage(msg);
})
socket.on('friendRemoved',function(friend) {
    for(i=0;i<chatList.friends.length;i++) {
        if(chatList.friends[i].name == friend) {
            chatList.friends.splice(i,1);
            break;
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
function friendRequest(friend) {
    socket.emit("addFriend", friend);
}
