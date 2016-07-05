#!/usr/bin/env node

'use strict';

var util = require('util');

function requireUncached(module){
   // http://stackoverflow.com/a/16060619/78428
   delete require.cache[require.resolve(module)];
   return require(module);
}

function sizefmt(input,b,c,d,e){
   // http://stackoverflow.com/a/20463021/78428
   return (b=Math,c=b.log,d=1e3,e=c(input)/c(d)|0,input/b.pow(d,e)).toFixed(2)+' '+(e?'kMGTPEZY'[--e]+'B':'Bytes');
}

sizefmt(process.memoryUsage().rss);

var metadata = {
   'pid': process.pid
};

function test(metadata) {
   var format = "HH:MM:ss.l";
   console.log('Test with metadata', metadata);
   if ( typeof metadata !== 'undefined' ) {
      require("./main")(console, format, metadata);
   } else {
      require("./main")(console, format);
   }
   console.log('Metadata applied');
   console.restoreConsole();
   console.log('Console restored', console.__ts__, console.restoreConsole);
}

function test2(){
   var fs = require('fs');
   var showMemoryUsage = (function(){
      var last = 0;
      return function(){
         var rss = process.memoryUsage().rss;
         var delta = rss - last;
         var result = util.format('(rss last: %s, curr: %s, delta: %s)', sizefmt(last), sizefmt(rss), sizefmt(delta));
         last = rss;
         return result;
      };
   })();
   var test = function(){
      require("./main")(console, "HH:MM:ss.l", showMemoryUsage);
      console.info("Reading 50MB...");
      // Read in 10MB
      var buffer = new require('buffer').Buffer(50000000);
      var fd = fs.openSync('/dev/urandom', 'r');
      fs.readSync(fd, buffer, 0, buffer.length, 0);
      fs.closeSync(fd);
      console.info("Finished reading (memory usage should be different).");
   };
   if ( fs.existsSync('/dev/urandom') ) {
      test();
   } else {
      console.error("Can't run test, /dev/urandom doesn't exist");
   }
}
// Basic test

test();
test('[' + process.pid + ']');
test({pid: process.pid});
test(function(){ return '[' + sizefmt(process.memoryUsage().rss) + ']'; });
test();

// Persistence test

test2();

