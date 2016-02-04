module.exports = function (injection, Q, allcountServerStartup) {
    return {
        init: function (onReady, reconfigure) {
            this.onReady = onReady;
            this.reconfigure = reconfigure;
        },
        reload: function () {
            var self = this;
            console.log("Reloading injection configuration...");
            injection.resetInjection();
            self.reconfigure(injection);
            return allcountServerStartup.reload();
        },
        start: function () {
            var self = this;
            return this.stop().then(function () {
                return allcountServerStartup.startup(self.onReady).then(function () {
                    self.started = true;
                });
            });
        },
        stop: function () {
            var self = this;
            if (!this.started) {
                return Q(null);
            }
            return Q.timeout(injection.inject('allcountServerStartup').stop().then(function () {
                self.started = false;
            }), 5000).catch(function (err) {
                console.error(err.stack);
                self.started = false;
            });
        }
    }
};