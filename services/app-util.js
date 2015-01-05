var util = require('util');
var _ = require('underscore');

module.exports = function () {
    function CompileError () {
        this.message = util.format.apply(util.format, arguments);
        this.name = "CompileError";
        Error.captureStackTrace(this, arguments.callee);
    }

    util.inherits(CompileError, Error);

    function ValidationError (fieldNameToMessage) {
        this.fieldNameToMessage = fieldNameToMessage;
        this.message = JSON.stringify(fieldNameToMessage);
        this.name = "ValidationError";
        Error.captureStackTrace(this, arguments.callee);
    }

    util.inherits(ValidationError, Error);

    return {
        CompileError: CompileError,
        ValidationError: ValidationError
    };
};