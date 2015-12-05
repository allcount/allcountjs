module.exports = function (Q, dbSeedProviders) {
    return {
        compile: function () {
            return Q.all(dbSeedProviders.map(function (provider) {
                return provider.seedDbWithData();
            }))
        }
    }
};