var _ = require('lodash');

module.exports = function (appUtil, keygrip, forgotPasswordService, baseUrlService) {
    var service = {};

    service.generateToken = function (entity) {
        return keygrip.sign(entity.username) + keygrip.sign(entity.creationDate.toString());
    };

    service.compile = function (objects) {
        objects.push(new appUtil.ConfigObject({
            entities: function (Fields, Crud, Security, MailgunService) { //todo: remove direct dependency on MailgunService
                return {
                    forgotPassword: {
                        fields: {
                            username: Fields.text('User').required(),
                            token: Fields.text('Token').readOnly(),
                            creationDate: Fields.date('Creation date').readOnly()
                        },
                        layout: {
                            V: ['username']
                        },
                        permissions: {
                            create: null
                        },
                        customView: 'forgotpassword/forgot-password',
                        views: {
                            resetPassword: {
                                fields: {
                                    username: Fields.text('User').required(),
                                    token: Fields.text('Token').readOnly(),
                                    creationDate: Fields.date('Creation date').readOnly(),
                                    newPasswordHash: Fields.password('New password').required(),
                                    repeatNewPasswordHash: Fields.password('Repeat password').required()
                                },
                                layout: {
                                    V: ['newPasswordHash', 'repeatNewPasswordHash']
                                },
                                customView: 'forgotpassword/reset-password',
                                beforeUpdate: function (NewEntity, OldEntity) {
                                    if (NewEntity.newPasswordHash != NewEntity.repeatNewPasswordHash) {
                                        throw new appUtil.ValidationError({
                                            repeatNewPasswordHash: 'Passwords doesn\'t match'
                                        });
                                    } else {
                                        var userCrud = Crud.crudForEntityType('User'); //todo: what if User entity type would be overridden?
                                        return Security.asSystem(function () {
                                            return userCrud.find({filtering: {username: NewEntity.username}});
                                        }).then(function (users) {
                                            if (!_.isEmpty(users) && users.length === 1) {
                                                var user = users[0];
                                                user.passwordHash = NewEntity.newPasswordHash;
                                                return Security.asSystem(function () {
                                                    userCrud.updateEntity(user);
                                                });
                                            } else {
                                                throw new Error('Something went wrong...'); //todo: consider this case
                                            }
                                        }).then(function () {
                                            return Crud.crudForEntityType('forgotPassword').deleteEntity(OldEntity.id); //todo: What's next? Error will be thrown after this...
                                        });
                                    }
                                }
                            }
                        },
                        beforeSave: function (Entity, Dates) {
                            if (Entity.newPasswordHash) {
                                return;
                            }
                            var userCrud = Crud.crudForEntityType('User'); //todo: what if User entity type would be overridden?
                            return Security.asSystem(function () {
                                return userCrud.find({filtering: {username: Entity.username}});
                            }).then(function (users) {
                                if (!_.isEmpty(users)) {
                                    Entity.creationDate = Dates.now();
                                    Entity.token = service.generateToken(Entity);
                                    var user = users[0];
                                    var transport = forgotPasswordService.config.propertyValue('transport').evaluateProperties();
                                    return MailgunService.sendMessage({
                                        domain: transport.config.domain,
                                        key: transport.config.key,
                                        message: {
                                            from: transport.config.from,
                                            to: user.email || user.mail || user.username,
                                            subject: 'Password recovery',
                                            text: 'Someone (maybe that was you) requested password change. Follow this ' +
                                            'link to complete the action: ' +
                                            [baseUrlService.getBaseUrl(), 'entity', 'resetPassword', Entity.token].join('/') +
                                            ' Or just ignore this email if it wasn\'t you.' //todo: clean the text and implement html message
                                        }
                                    });
                                } else {
                                    throw new appUtil.ValidationError({
                                        username: 'Can\'t find user with name "' + Entity.username + '"'
                                    });
                                }
                            });

                        }
                    }
                };
            }
        }));
    };

    return service;
};