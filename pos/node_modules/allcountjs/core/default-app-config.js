module.exports = function (A, securityConfigService, passwordFieldName) {
    A.app({
        entities: {
            User: {
                referenceName: 'username',
                permissions: {
                    read: ['admin']
                },
                title: 'Users',
                fields: function (Fields) {
                    var fields = {};
                    fields.username = Fields.text('User name').unique();
                    fields[passwordFieldName] = Fields.password('Password');
                    securityConfigService.roles().forEach(function (role) {
                        fields['role_' + role] = Fields.checkbox(role, 'roles');
                    });
                    fields.isGuest = Fields.checkbox('Guest');
                    return fields;
                }
            },
            Integration: {
                referenceName: 'name',
                permissions: {
                    read: ['admin']
                },
                customView: 'integrations',
                title: 'Integrations',
                fields: function (Fields) {
                    return {
                        name: Fields.text('Name').unique().required(),
                        appId: Fields.text('Application ID').required(),
                        accessToken: Fields.text('Access Token').readOnly()
                    }
                }
            },
            migrations: {
                fields: function (Fields) {
                    return {
                        name: Fields.text("Name").unique().required()
                    }
                }
            }
        }
    })
};