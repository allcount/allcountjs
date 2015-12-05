var assert = require('assert');
var injection = require('../services/injection.js');

function setupConfigFiles(content) {
    injection.bindFactory('appConfigs', []);
    injection.bindFactory('repositoryService', {
        configFiles: function (callback) {
        callback([
            {fileName: 'root.js', content: content}
        ]);
    }});
    injection.bindFactory('ValidationError', require('../services/validation-error'));
}

function ensureObjects(ensureFunc) {
    injection.bindMultiple('compileServices', ['foo']);
    injection.bindFactory('foo', function () {
        return {
            compile: ensureFunc
        }
    });
}

exports.gutter = function (test) {
    injection.resetInjection();
    setupConfigFiles('A.app({hello: "world"});');
    ensureObjects(function (objects) {
        assert.equal(objects[0].propertyValue('hello'), "world");
    });

    injection.inject('appService').compile(function () {
        test.done();
    });
};

function replaceLookup() {
    var oldLookup = injection.lookup;
    injection.lookup = function (serviceName) {
        return {service: serviceName};
    };
    return oldLookup;
}

function revertLookup(oldLookup) {
    injection.lookup = oldLookup;
}

exports.injection = function (test) {
    injection.resetInjection();
    setupConfigFiles('A.app(function (Fields) { return Fields; });');
    var oldLookup = replaceLookup();
    ensureObjects(function (objects) {
        assert.equal(objects[0].propertyValue('service'), 'Fields');
    });

    injection.inject('appService').compile(function () {
        revertLookup(oldLookup);
        test.done();
    })
};

exports.evaluateProperties = function (test) {
    injection.resetInjection();
    setupConfigFiles('A.app(function (Fields) { return {foo: {someField: function (Foo) {return [Foo];} }} });');
    var oldLookup = replaceLookup();
    ensureObjects(function (objects) {
        assert.equal(objects[0].evaluateProperties().foo.someField[0].service, 'Foo');
    });

    injection.inject('appService').compile(function () {
        revertLookup(oldLookup);
        test.done();
    })
};

exports.withParentTest = function (test) {
    injection.resetInjection();
    setupConfigFiles('A.app(function (Fields) { return {foo: Fields, view: {bar: "Hello", foo: function ($parentProperty) { $parentProperty.some = "hello"; return $parentProperty } } } });');
    var oldLookup = replaceLookup();

    ensureObjects(function (objects) {
        var wParent = objects[0].propertyValue('view').withParent(objects[0]);
        assert.equal(wParent.propertyValue('bar'), 'Hello');
        assert.equal(wParent.propertyValue('foo').propertyValue('service'), 'Fields');
        assert.equal(wParent.propertyValue('foo').propertyValue('some'), 'hello');
    });

    injection.inject('appService').compile(function (err) {
        revertLookup(oldLookup);
        test.done(err.length && new Error(err.join(',')));
    })
};