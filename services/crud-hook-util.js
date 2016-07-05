module.exports = function (injection) {
    return {
        invokeCrudHooks: function (description, setupHookFn) {
            var prefixes = ['before', 'after'];
            var hookNames = ['Save', 'Create', 'Update', 'Delete'];
            prefixes.forEach(function (prefix) {
                hookNames.forEach(function (method) {
                    if (description.hasOwnPropertyValue(prefix + method)) {
                        setupHookFn(prefix, method, function (scope) {
                            return injection.inScope(scope, function () {
                                return description.evaluatedValue(prefix + method);
                            });
                        });
                    }
                });
            });
        }
    }
};