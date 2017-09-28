var cropper;


var settings = new Vue({
    el: '.settings',
    data: {
        profile_pictures: [],
        image: '',
        imageName: '',
        profile_picture_index: 0,
        newDisplayName: '',
    },
    methods: {
        onFileChange: function(e) {
            var files = e.target.files || e.dataTransfer.files;
            if (!files.length) return;
            this.createImage(files[0]);
        },
        createImage(file) {
            var image = new Image();
            var reader = new FileReader();
            var vm = this;

            reader.onload = (e) => {
                vm.image = e.target.result;
            };
            reader.onloadend = (e) => {
                vm.cropImage();
                vm.imageName = file.name;
            };
            reader.readAsDataURL(file);
        },
        changeDisplayName: function() {
            if(this.newDisplayName != '') {
                socket.emit('changeDisplayName', this.newDisplayName);
                this.newDisplayName = '';
            }
        },
        changeProfilePicture: function(index) {
            socket.emit('changeProfilePicture',index);
        },
        deleteProfilePicture: function(picture) {
            var name = picture.substring(picture.lastIndexOf('/')+1);
            socket.emit("deleteProfilePicture", name);
        },
        uploadPicture: function() {
            cropper.getCroppedCanvas({width:200,height:200}).toBlob(function (blob) {
                var formData = new FormData();
                formData.append('profile_picture', blob, settings.imageName);
                axios('/upload', {
                    method: "POST",
                    data: formData,
                    processData: false,
                    contentType: false,
                }).then((response) => {
                    location.reload();
                })
            });
        },
        cropImage: function() {
            var image = document.getElementById('croppImage');
            cropper = new Cropper(image, {
                aspectRatio: 1,
                minCropBoxHeight: 100,
                minCropBoxWidth: 100,
            });
        },
        removeImage: function() {
            cropper.destroy();
            this.image = '';
        }
    }
})
var header = new Vue({
    el: '.header',
    data: {
        displayName: '',
        username: '',
    }
})
