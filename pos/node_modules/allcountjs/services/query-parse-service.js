var Parsimmon = require("parsimmon");
var regex = Parsimmon.regex;
var string = Parsimmon.string;
var optWhitespace = Parsimmon.optWhitespace;
var lazy = Parsimmon.lazy;
var seq = Parsimmon.seq;
var _ = require('underscore');

module.exports = function () {
    var service = {};

    function lexeme(p) { return p.skip(optWhitespace); }
    function sep(parser, separator) {
        return seq(parser, separator.then(parser).many()).map(function (a) { return _.union([a[0]], a[1])});
    }

    var lparen = lexeme(string('('));
    var rparen = lexeme(string(')'));

    var expr = lazy(function() { return form.or(atom) });

//    var number = lexeme(regex(/[0-9]+/).map(parseInt));
    var boolean = lexeme(string('true').or(string('false'))).map(function (x) { return x == 'true'});
    var id = lexeme(regex(/[A-Za-z_]\w*/i)).map(function (id) {return {id: id}});
    var op = lexeme(string('='));

    var atom = boolean.or(id);
    var statement = seq(atom, op, atom).map(function (m) { return {args: [m[0], m[2]], operator: m[1]} });
    var form = lparen.then(expr.many()).skip(rparen);
    var path = lexeme(sep(id, string('.'))).map(function (path) {return {path: path.map(function (id) { return id.id })}});
    var fun = lexeme(seq(lexeme(regex(/[A-Za-z_]\w*/i).skip(string('('))), path.skip(lexeme(string(')'))))).map(function (funAndPath) {return {fun: funAndPath[0], args: [funAndPath[1]]}});
    var valueExpression = fun.or(path);

    service.parseFiltering = function (expr) {
        return expr && statement.parse(expr).value || undefined;
    };

    service.parseValueExpression = function (expr) {
        return expr && valueExpression.parse(expr).value || undefined;
    };

    service.prepareQuery = function (expr) {
        var filtering = service.parseFiltering(expr);
        if (filtering) {
            var lvalue = filtering.args[0].id || filtering.args[1].id;
            var rvalue = filtering.args[0].id ? filtering.args[1] : filtering.args[0];
            var query = {};
            if (lvalue) {
                query[lvalue] = rvalue;
            }
            return { filtering: query };
        }
        return undefined;
    };

    return service;
};