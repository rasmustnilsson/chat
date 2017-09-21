module.exports = {
    get: function(user) {
        var j = {
            scripts: ["vue.min.js"],
            css: ["screen.css"],
            title: "Hey Hey Hey!",
            header:"Node js socket io chat!"
        }
        if(user) {
            j.scripts.push("socket.io.js","siofu.js","main.js")
            j.username = user.username;
        }
        return j;
    }
}
