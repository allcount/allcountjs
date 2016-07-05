var util = require('util');

module.exports = function () {
    function ValidationError (fieldNameToMessage) {
        this.fieldNameToMessage = fieldNameToMessage;
        this.message = JSON.stringify(fieldNameToMessage);
        this.name = "ValidationError";
        Error.captureStackTrace(this, arguments.callee);
    }

    util.inherits(ValidationError, Error);

    return ValidationError;
};