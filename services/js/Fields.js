var _ = require('underscore');

exports.text = function (name) {
    return new Field({
        name: name,
        fieldType: {
            id: 'text'
        }
    })
};

exports.textarea = function (name) {
    return new Field({
        name: name,
        fieldType: {
            id: 'text',
            isMultiline: true
        }
    })
};

exports.date = function (name) {
    return new Field({
        name: name,
        fieldType: {
            id: 'date'
        }
    });
};

exports.integer = function (name) {
    return new Field({
        name: name,
        fieldType: {
            id: 'integer'
        }
    });
};

exports.money = function (name) {
    return new Field({
        name: name,
        fieldType: {
            id: 'money'
        }
    });
};

exports.checkbox = function (name, storeAsArrayField) {
    return new Field({
        name: name,
        fieldType: {
            id: 'checkbox',
            storeAsArrayField: storeAsArrayField
        }
    });
};

exports.fixedReference = function (name, referenceEntityTypeId) {
    return new Field({
        name: name,
        fieldType: {
            id: 'reference',
            referenceEntityTypeId: referenceEntityTypeId,
            render: 'fixed'
        }
    });
};

exports.reference = function (name, referenceEntityTypeId) {
    return new Field({
        name: name,
        fieldType: {
            id: 'reference',
            referenceEntityTypeId: referenceEntityTypeId
        }
    });
};

exports.relation = function (name, relationEntityTypeId, backReferenceField) {
    return new Field({
        name: name,
        hideInGrid: true,
        fieldType: {
            id: 'relation',
            relationEntityTypeId: relationEntityTypeId,
            backReferenceField: backReferenceField,
            notPersisted: true,
            removeFormLabel: true
        }
    });
};

exports.password = function (name) {
    return new Field({
        name: name,
        hideInGrid: true,
        fieldType: {
            id: 'password'
        }
    });
};

exports.attachment = function (name) {
    return new Field({
        name: name,
        fieldType: {
            id: 'attachment'
        }
    });
};

function Field(config) {
    _.extend(this, config);
}

Field.prototype.computed = function (expression) {
    this.computeExpression = expression;
    return this;
};

Field.prototype.addToTotalRow = function () {
    this.totalRowFun = 'sum';
    return this;
};

Field.prototype.required = function (isRequired) {
    this.isRequired = _.isUndefined(isRequired) ? true : isRequired;
    return this;
};

Field.prototype.readOnly = function (isReadOnly) {
    this.isReadOnly = _.isUndefined(isReadOnly) ? true : isReadOnly;
    return this;
};

Field.prototype.unique = function (isUnique) {
    this.isUnique = _.isUndefined(isUnique) ? true : isUnique;
    return this;
};

Field.prototype.masked = function (mask) {
    this.fieldType.mask = mask;
    return this;
};