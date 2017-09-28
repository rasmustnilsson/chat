module.exports = {
    get: function(user,page) {
        var j = {
            scripts: ["vue.min.js"],
            css: ["screen.css"],
            title: "Hey Hey Hey!",
            header:"Node js socket io chat!",
            page: 'loggedOut',
        }
        if(user) {
            j.username = user.username;
            j.displayName = user.displayName;
            if (page == 'index') {
                j.scripts.push("socket.io.js","main.js");
                j.vueScript = 'vuefile.js';
                j.page = 'index';
            }
            else if (page == "settings") {
                j.scripts.push("socket.io.js","cropper.min.js",'axios.min.js','settings.js');
                j.css.push('cropper.min.css');
                j.vueScript = 'vuesettings.js';
                j.page = 'settings';
            }
        }
        return j;
    }
}
