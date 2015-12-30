var _ = require('lodash');
var moment = require('moment');

module.exports = function (appUtil, keygrip, forgotPasswordService, baseUrlService, A, injection) {
    var service = {};

    service.generateToken = function (entity) {
        return keygrip.sign(entity.username) + keygrip.sign(entity.creationDate.toString());
    };

    A.app({
            entities: function (Fields, Crud, Security) { //todo: remove direct dependency on MailgunService
                var MailgunService = injection.inject('MailgunService', true);
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
                                    creationDate: Fields.date('Creation date').readOnly(),
                                    newPasswordHash: Fields.password('New password').required(),
                                    repeatNewPasswordHash: Fields.password('Repeat password').required(),
                                    hasTokenBeenUsed: Fields.checkbox('Has token been used?')
                                },
                                layout: {
                                    V: ['newPasswordHash', 'repeatNewPasswordHash']
                                },
                                customView: 'forgotpassword/reset-password',
                                beforeUpdate: function (NewEntity, OldEntity) {
                                    if (OldEntity.hasTokenBeenUsed) {
                                        throw new appUtil.ValidationError({
                                            repeatNewPasswordHash: 'Token has been already used'
                                        });
                                    } else if (NewEntity.newPasswordHash != NewEntity.repeatNewPasswordHash) {
                                        throw new appUtil.ValidationError({
                                            repeatNewPasswordHash: 'Passwords doesn\'t match'
                                        });
                                    } else if (moment().subtract(15, 'minutes') > NewEntity.creationDate) {
                                        throw new appUtil.ValidationError({
                                            repeatNewPasswordHash: 'Token has expired'
                                        });
                                    } else {
                                        var userCrud = Crud.crudForEntityType('User');
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
                                                throw new Error('No users with name ' + NewEntity.username);
                                            }
                                        }).then(function () {
                                            NewEntity.hasTokenBeenUsed = true;
                                        });
                                    }
                                }
                            }
                        },
                        beforeSave: function (Entity, Dates) {
                            if (Entity.newPasswordHash || Entity.repeatNewPasswordHash) {
                                return;
                            }
                            var userCrud = Crud.crudForEntityType('User');
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
        });
};