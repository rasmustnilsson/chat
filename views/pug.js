module.exports = {
    get: function(o) {
        var j = {
            scripts: ["vue.min.js"],
            css: ["screen.css"],
            title: "Hey Hey Hey!",
            header:"Node js socket io chat!",
            page: 'loggedOut',
            createAccountError: false,
            joinRoomNotSignedIn: false,
            wrongPassOrUsername: false,
            room: o.room,
        }
        if(o.page) {
            var page = o.page;
            var user = o.user;
            j.username = user.username;
            j.displayName = user.displayName;
            if (page == 'index') {
                j.scripts.push("socket.io.js","main.js");
                j.vueScript = 'vuefile.js';
                j.page = 'index';
            } else if (page == "settings") {
                j.scripts.push("socket.io.js","cropper.min.js",'axios.min.js','settings.js');
                j.css.push('cropper.min.css');
                j.vueScript = 'vuesettings.js';
                j.page = 'settings';
            }
        } else {
            j.css.push('login.css');
            j.vueScript = 'login.js';
            if(o.errors) {
                if(o.errors.createAccountFailed) {
                    j.createAccountError = true;
                } else if(o.errors.loginFailed) {
                    j.wrongPassOrUsername = true;
                }
                if(o.errors.joinRoomFailed) {
                    j.joinRoomNotSignedIn = true;
                }
            }
        }
        return j;
    }
}
