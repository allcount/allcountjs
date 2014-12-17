var util = require('util');

module.exports = function () {
    function CompileError () {
        this.message = util.format.apply(util.format, arguments);
        this.name = "CompileError";
        Error.captureStackTrace(this, arguments.callee);
    }

    util.inherits(CompileError, Error);

    return {CompileError: CompileError};
};