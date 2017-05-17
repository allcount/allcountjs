'use strict';

/**
 * Module dependencies.
 */
var BaseCompiler = require('jade/lib/compiler');

/**
 * Inherit from base jade compiler
 */
module.exports = Compiler;
function Compiler(node, options) {
  BaseCompiler.call(this, node, options);
}

Compiler.prototype = Object.create(BaseCompiler.prototype);
Compiler.prototype.constructor = Compiler;

/**
 * Produce code handling the rendering of a mixin block visit.
 * Add the possibility for async rendering inside the block
 *
 * Identical to original jade implementation except for :
 *  - (yield* block()) <--VS--> block()
 */
Compiler.prototype.visitMixinBlock = function (block) {
  if (this.pp) this.buf.push("jade_indent.push('" + Array(this.indents + 1).join(this.pp) + "');");
  this.buf.push('block && (yield* block());');
  if (this.pp) this.buf.push("jade_indent.pop();");
};

/**
 * Produce code handling a rendering time invocation of a mixin.
 * Mixin and Block definitions become generators
 * Mixin calls are yield-delegated
 *
 * Identical to original jade implementation except:
 *  - 'yield* ' + name + '.call({  <--VS--> name + '.call'
 *  - block: function*(){ <--VS--> block: function(){
 *  - 'yield* ' + name + '(' + args + '); <--VS--> name + '(' + args + ');
 *  -  function*(' + args + '){ <--VS-->  function(' + args + '){
 */
Compiler.prototype.visitMixin = function (mixin) {
    var name = 'jade_mixins[';
    var args = mixin.args || '';
    var block = mixin.block;
    var attrs = mixin.attrs;
    var attrsBlocks = mixin.attributeBlocks.slice();
    var pp = this.pp;
    var dynamic = mixin.name[0]==='#';
    var key = mixin.name;
    if (dynamic) this.dynamicMixins = true;
    name += (dynamic ? mixin.name.substr(2,mixin.name.length-3):'"'+mixin.name+'"')+']';

    this.mixins[key] = this.mixins[key] || {used: false, instances: []};
    if (mixin.call) {
      this.mixins[key].used = true;
      if (pp) this.buf.push("jade_indent.push('" + Array(this.indents + 1).join(pp) + "');")
      if (block || attrs.length || attrsBlocks.length) {

        this.buf.push('yield* ' + name + '.call({');

        if (block) {
          this.buf.push('block: function*(){');

          // Render block with no indents, dynamically added when rendered
          this.parentIndents++;
          var _indents = this.indents;
          this.indents = 0;
          this.visit(mixin.block);
          this.indents = _indents;
          this.parentIndents--;

          if (attrs.length || attrsBlocks.length) {
            this.buf.push('},');
          } else {
            this.buf.push('}');
          }
        }

        if (attrsBlocks.length) {
          if (attrs.length) {
            var val = this.attrs(attrs);
            attrsBlocks.unshift(val);
          }
          this.buf.push('attributes: jade.merge([' + attrsBlocks.join(',') + '])');
        } else if (attrs.length) {
          var val = this.attrs(attrs);
          this.buf.push('attributes: ' + val);
        }

        if (args) {
          this.buf.push('}, ' + args + ');');
        } else {
          this.buf.push('});');
        }

      } else {
        this.buf.push('yield* ' + name + '(' + args + ');');
      }
      if (pp) this.buf.push("jade_indent.pop();")
    } else {
      var mixin_start = this.buf.length;
      args = args ? args.split(',') : [];
      var rest;
      if (args.length && /^\.\.\./.test(args[args.length - 1].trim())) {
        rest = args.pop().trim().replace(/^\.\.\./, '');
      }
      // we need use jade_interp here for v8: https://code.google.com/p/v8/issues/detail?id=4165
      // once fixed, use this: this.buf.push(name + ' = function(' + args.join(',') + '){');
      this.buf.push(name + ' = jade_interp = function*(' + args.join(',') + '){');
      this.buf.push('var block = (this && this.block), attributes = (this && this.attributes) || {};');
      if (rest) {
        this.buf.push('var ' + rest + ' = [];');
        this.buf.push('for (jade_interp = ' + args.length + '; jade_interp < arguments.length; jade_interp++) {');
        this.buf.push('  ' + rest + '.push(arguments[jade_interp]);');
        this.buf.push('}');
      }
      this.parentIndents++;
      this.visit(block);
      this.parentIndents--;
      this.buf.push('};');
      var mixin_end = this.buf.length;
      this.mixins[key].instances.push({start: mixin_start, end: mixin_end});
    } 
};

/**
 * Produces code handling the rendering of a loop
 * Loop rendering is yield-delegated
 * Rendering function for the loop becomes a generator
 *
 *
 * Identical to original jade implementation except:
 *  - yield* (function*() <--VS--> (function()
 * 
 */
Compiler.prototype.visitEach = function (each) {
    this.buf.push(''
      + '// iterate ' + each.obj + '\n'
      + ';yield* (function*(){\n'
      + '  var $$obj = ' + each.obj + ';\n'
      + '  if (\'number\' == typeof $$obj.length) {\n');

    if (each.alternative) {
      this.buf.push('  if ($$obj.length) {');
    }

    this.buf.push(''
      + '    for (var ' + each.key + ' = 0, $$l = $$obj.length; ' + each.key + ' < $$l; ' + each.key + '++) {\n'
      + '      var ' + each.val + ' = $$obj[' + each.key + '];\n');

    this.visit(each.block);

    this.buf.push('    }\n');

    if (each.alternative) {
      this.buf.push('  } else {');
      this.visit(each.alternative);
      this.buf.push('  }');
    }

    this.buf.push(''
      + '  } else {\n'
      + '    var $$l = 0;\n'
      + '    for (var ' + each.key + ' in $$obj) {\n'
      + '      $$l++;'
      + '      var ' + each.val + ' = $$obj[' + each.key + '];\n');

    this.visit(each.block);

    this.buf.push('    }\n');
    if (each.alternative) {
      this.buf.push('    if ($$l === 0) {');
      this.visit(each.alternative);
      this.buf.push('    }');
    }
    this.buf.push('  }\n}).call(this);\n');
};
