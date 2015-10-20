'use strict';
var _ = require('lodash');
var chai = require('chai');
var should = chai.should();
var injection = require('../services/entity-referenced-service.js');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

var Q = require('q');

exports.isEntityReferencedUndefinedIfNoParameters = function (test) {
    injection({entityDescriptions: []}).isEntityReferenced().should.eventually.be.false.notify(test.done);
};

exports.isEntityReferencedFalseWhenNoOtherEntities = function (test) {
    var crud = {
        crudForEntityType: function () {
            return {
                findCount: function (query) {
                    return Q(0)
                }
            }
        }
    };
    var entityDescriptionService = {
        entityDescriptions: {
            Foo: {
                allFields: {
                    fooField: {
                        fieldType: {
                            id: 'string'
                        }
                    }
                }
            }
        }
    };
    injection(entityDescriptionService, crud).
        isEntityReferenced('fooEntityId', {entityTypeId: 'Foo'}).should.eventually.be.false.notify(test.done);
};

exports.isEntityReferencedByOneOfOne = function (test) {
    var crud = {
        strategyForCrudId: function () {
            return {
                findCount: function () {
                    return Q(1)
                }
            }
        }
    };
    var entityDescriptionService = {
        entityTypeIdCrudId: function (entityTypeId) {
            return entityTypeId;
        },
        entityDescriptions: {
            Foo: {
                allFields: {
                    fooField: {
                        fieldType: {
                            id: 'string'
                        }
                    }
                }
            },
            Bar: {
                allFields: {
                    barField: {
                        fieldType: {
                            id: 'reference',
                            referenceEntityTypeId: 'Foo'
                        }
                    }
                }
            }
        }
    };
    injection(entityDescriptionService, crud).
        isEntityReferenced('fooEntityId', {entityTypeId: 'Foo'}).should.eventually.be.true.notify(test.done);
};

exports.isEntityReferencedByOneOfTwo = function (test) {
    var crud = {
        strategyForCrudId: function (entityTypeId) {
            return {
                findCount: function () {
                    if (entityTypeId === 'Bar1') return Q(1);
                    if (entityTypeId === 'Bar2') return Q(0);
                }
            }
        }
    };
    var entityDescriptionService = {
        entityTypeIdCrudId: function (entityTypeId) {
            return entityTypeId;
        },
        entityDescriptions: {
            Foo: {
                allFields: {}
            },
            Bar1: {
                allFields: {
                    bar1Field: {
                        fieldType: {
                            id: 'reference',
                            referenceEntityTypeId: 'Foo'
                        }
                    }
                }
            },
            Bar2: {
                allFields: {
                    bar2Field: {
                        fieldType: {
                            id: 'reference',
                            referenceEntityTypeId: 'Foo'
                        }
                    }
                }
            }
        }
    };
    injection(entityDescriptionService, crud).
        isEntityReferenced('fooEntityId', {entityTypeId: 'Foo'}).should.eventually.be.true.notify(test.done);
};

exports.isEntityReferencedByZeroOfTwo = function (test) {
    var crud = {
        strategyForCrudId: function (entityTypeId) {
            return {
                findCount: function () {
                    if (entityTypeId === 'Bar1') return Q(0);
                    if (entityTypeId === 'Bar2') return Q(0);
                }
            }
        }
    };
    var entityDescriptionService = {
        entityTypeIdCrudId: function (entityTypeId) {
            return entityTypeId;
        },
        entityDescriptions: {
            Foo: {
                allFields: {}
            },
            Bar1: {
                allFields: {
                    bar1Field: {
                        fieldType: {
                            id: 'reference',
                            referenceEntityTypeId: 'Foo'
                        }
                    }
                }
            },
            Bar2: {
                allFields: {
                    bar2Field: {
                        fieldType: {
                            id: 'reference',
                            referenceEntityTypeId: 'Foo'
                        }
                    }
                }
            }
        }
    };
    injection(entityDescriptionService, crud).
        isEntityReferenced('fooEntityId', {entityTypeId: 'Foo'}).should.eventually.be.false.notify(test.done);
};

exports.isEntityReferencedButActuallyNoReferenceFields = function (test) {
    var crud = {
        strategyForCrudId: function () {
            throw Error('should not be called')
        }
    };
    var entityDescriptionService = {
        entityDescriptions: {
            Foo: {
                allFields: {}
            },
            Bar1: {
                allFields: {
                    bar1Field: {
                        fieldType: {
                            id: 'reference',
                            referenceEntityTypeId: 'some another entity type id'
                        }
                    }
                }
            },
            Bar2: {
                allFields: {
                    bar2Field: {
                        fieldType: {
                            id: 'reference',
                            referenceEntityTypeId: 'some another entity type id'
                        }
                    }
                }
            }
        }
    };
    injection(entityDescriptionService, crud).
        isEntityReferenced('fooEntityId', {entityTypeId: 'Foo'}).should.eventually.be.false.notify(test.done);
};

exports.referencingEntitiesWithFieldNamesUndefinedIfNoParameters = function (test) {
    injection({entityDescriptions: []}).referencingEntitiesWithFieldNames().should.be.eventually.eql([]).notify(test.done);
};

exports.referencingEntitiesWithFieldNamesHaveReferencingFieldsButActuallyNotReferencing = function (test) {
    var crud = {
        strategyForCrudId: function () {
            return {
                findCount: function () {
                    return Q(0)
                }
            }
        }
    };
    var entityDescriptionService = {
        entityTypeIdCrudId: function (entityTypeId) {
            return entityTypeId;
        },
        entityDescriptions: {
            Foo: {
                allFields: {
                    fooField: {
                        fieldType: {
                            id: 'string'
                        }
                    }
                }
            },
            Bar: {
                allFields: {
                    barField1: {
                        fieldType: {
                            id: 'reference',
                            referenceEntityTypeId: 'Foo'
                        }
                    },
                    barField2: {
                        fieldType: {
                            id: 'reference',
                            referenceEntityTypeId: 'Foo'
                        }
                    }
                }
            }
        }
    };
    injection(entityDescriptionService, crud).
        referencingEntitiesWithFieldNames('fooEntityId', {entityTypeId: 'Foo'}).should.eventually.
        eql([]).notify(test.done);
};

exports.referencingEntitiesWithFieldNamesOneReference = function (test) {
    var crud = {
        strategyForCrudId: function () {
            return {
                findCount: function () {
                    return Q(1)
                }
            }
        }
    };
    var entityDescriptionService = {
        entityTypeIdCrudId: function (entityTypeId) {
            return entityTypeId;
        },
        entityDescriptions: {
            Foo: {
                allFields: {
                    fooField: {
                        fieldType: {
                            id: 'string'
                        }
                    }
                }
            },
            Bar: {
                allFields: {
                    barField: {
                        fieldType: {
                            id: 'reference',
                            referenceEntityTypeId: 'Foo'
                        }
                    }
                }
            }
        }
    };
    injection(entityDescriptionService, crud).
        referencingEntitiesWithFieldNames('fooEntityId', {entityTypeId: 'Foo'}).should.eventually.
        eql([['Bar', ['barField']]]).notify(test.done);
};

exports.referencingEntitiesWithFieldNames2of3FieldsAreReferencing = function (test) {
    var crud = {
        strategyForCrudId: function () {
            return {
                findCount: function (query) {
                    if (_.keys(query.query).indexOf('field1.id') >= 0 || _.keys(query.query).indexOf('field3.id') >= 0) {
                        return Q(1);
                    } else {
                        return Q(0);
                    }
                }
            }
        }
    };
    var entityDescriptionService = {
        entityTypeIdCrudId: function (entityTypeId) {
            return entityTypeId;
        },
        entityDescriptions: {
            Foo: {
                allFields: {
                    fooField: {
                        fieldType: {
                            id: 'string'
                        }
                    }
                }
            },
            Bar: {
                allFields: {
                    field1: {
                        fieldType: {
                            id: 'reference',
                            referenceEntityTypeId: 'Foo'
                        }
                    },
                    field2: {
                        fieldType: {
                            id: 'reference',
                            referenceEntityTypeId: 'Foo'
                        }
                    },
                    field3: {
                        fieldType: {
                            id: 'reference',
                            referenceEntityTypeId: 'Foo'
                        }
                    }
                }
            }
        }
    };
    injection(entityDescriptionService, crud).
        referencingEntitiesWithFieldNames('fooEntityId', {entityTypeId: 'Foo'}).should.eventually.
        eql([['Bar', ['field1', 'field3']]]).notify(test.done);
};

exports.referencingEntitiesWithFieldNamesTwoEntityTypesAreActuallyReferencing = function (test) {
    var crud = {
        strategyForCrudId: function () {
            return {
                findCount: function () {
                    return Q(1)
                }
            }
        }
    };
    var entityDescriptionService = {
        entityTypeIdCrudId: function (entityTypeId) {
            return entityTypeId;
        },
        entityDescriptions: {
            Foo: {
                allFields: {
                    fooField: {
                        fieldType: {
                            id: 'string'
                        }
                    }
                }
            },
            Bar1: {
                allFields: {
                    barField1: {
                        fieldType: {
                            id: 'reference',
                            referenceEntityTypeId: 'Foo'
                        }
                    }
                }
            },
            Bar2: {
                allFields: {
                    barField2: {
                        fieldType: {
                            id: 'reference',
                            referenceEntityTypeId: 'Foo'
                        }
                    }
                }
            }
        }
    };
    injection(entityDescriptionService, crud).
        referencingEntitiesWithFieldNames('fooEntityId', {entityTypeId: 'Foo'}).should.eventually.
        eql([['Bar1', ['barField1']], ['Bar2', ['barField2']]]).notify(test.done);
};

exports.referencingEntitiesWithFieldNames1of2HaveNoActuallyReferencingFields = function (test) {
    var crud = {
        strategyForCrudId: function (entityTypeId) {
            return {
                findCount: function () {
                    if (entityTypeId === 'Bar2') {
                        return Q(1);
                    } else {
                        return Q(0);
                    }
                }
            }
        }
    };
    var entityDescriptionService = {
        entityTypeIdCrudId: function (entityTypeId) {
            return entityTypeId;
        },
        entityDescriptions: {
            Foo: {
                allFields: {
                    fooField: {
                        fieldType: {
                            id: 'string'
                        }
                    }
                }
            },
            Bar1: {
                allFields: {
                    barField1: {
                        fieldType: {
                            id: 'reference',
                            referenceEntityTypeId: 'Foo'
                        }
                    }
                }
            },
            Bar2: {
                allFields: {
                    barField2: {
                        fieldType: {
                            id: 'reference',
                            referenceEntityTypeId: 'Foo'
                        }
                    }
                }
            }
        }
    };
    injection(entityDescriptionService, crud).
        referencingEntitiesWithFieldNames('fooEntityId', {entityTypeId: 'Foo'}).should.eventually.
        eql([['Bar2', ['barField2']]]).notify(test.done);
};

exports.referencingEntitiesWithFieldNamesShouldOutputFieldNameNotId = function (test) {
    var crud = {
        strategyForCrudId: function () {
            return {
                findCount: function () {
                    return Q(1)
                }
            }
        }
    };
    var entityDescriptionService = {
        entityTypeIdCrudId: function (entityTypeId) {
            return entityTypeId;
        },
        entityDescriptions: {
            Foo: {
                allFields: {
                    fooField: {
                        fieldType: {
                            id: 'string'
                        }
                    }
                }
            },
            Bar: {
                allFields: {
                    barFieldId: {
                        name: 'barFieldName',
                        fieldType: {
                            id: 'reference',
                            referenceEntityTypeId: 'Foo'
                        }
                    }
                }
            }
        }
    };
    injection(entityDescriptionService, crud).
        referencingEntitiesWithFieldNames('fooEntityId', {entityTypeId: 'Foo'}).should.eventually.
        eql([['Bar', ['barFieldName']]]).notify(test.done);
};