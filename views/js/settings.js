var socket = io('/settings');
let i;

socket.on('userinfo', function(data) {
    settings.profile_picture_index = data.profile_picture_index;
    settings.profile_pictures = [];
    for(i=0;i<data.profile_pictures.length;i++) {
        settings.profile_pictures.push(data.profile_pictures[i]);
    }

})
socket.on('ppDeleted', function(bool,index,err) {
    if(bool) {
        if(index < settings.profile_picture_index) {
            settings.profile_picture_index -= 1;
        }
        settings.profile_pictures.splice(index,1);
    } else {
        alert(err);
    }
})
socket.on('profilePictureChanged', function(index) {
    settings.profile_picture_index = index;
})
socket.on('newDisplayName', function(newName) {
    header.displayName = newName;
})
