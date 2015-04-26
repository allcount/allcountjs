var cloudinary = require('cloudinary');
var Q = require('q');

module.exports = function () {
    return {
        compile: function (objects, errors) {
            var self = this;
            objects.forEach(function (obj) {
                var cloudName = obj.propertyValue('cloudinaryName');
                if (cloudName) {
                    self.cloudName = cloudName;
                }
                var apiKey = obj.propertyValue('cloudinaryApiKey');
                if (apiKey) {
                    self.apiKey = apiKey;
                }
                var apiSecret = obj.propertyValue('cloudinaryApiSecret');
                if (apiSecret) {
                    self.apiSecret = apiSecret;
                }
            });
        },
        cloudinaryInit: function () {
            if (this.cloudinaryInstance) {
                return this.cloudinaryInstance;
            }
            this.cloudinaryInstance = cloudinary.config({
                cloud_name: this.cloudName,
                api_key: this.apiKey,
                api_secret: this.apiSecret
            });
            return this.cloudinaryInstance;
        },
        upload: function (file, filename) {
            this.cloudinaryInit();
            var deferred = Q.defer();
            var stream = cloudinary.uploader.upload_stream(function (res) {
                if (res.error) {
                    deferred.reject(res.error);
                }
                deferred.resolve(res);
            });
            file.pipe(stream);
            return deferred.promise;
        }
    }
};