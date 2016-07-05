var assert = require('assert');
var injection = require('../services/injection.js');

exports.gutter = function (test) {
    injection.resetInjection();
    injection.bindFactory('entityDescriptionCompilers', []);
    injection.bindFactory('passwordFieldName', function () { return 'passwordHash' });
    injection.bindFactory('ValidationError', require('../services/validation-error'));
    var layoutService = injection.inject('layoutService');
    var compiled = layoutService.compileLayout({
        H: [
            { V: ['foo', 'bar'] },
            { V: ['foo1', 'bar2'] }
        ]
    });
    assert.deepEqual(compiled, layoutService.container('H', [
        layoutService.container('V', [layoutService.fieldContainer('foo'), layoutService.fieldContainer('bar')]),
        layoutService.container('V', [layoutService.fieldContainer('foo1'), layoutService.fieldContainer('bar2')])
    ]));
    test.done();
};