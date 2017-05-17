# console-stamp

Patch Node.js console methods in order to add timestamp information by pattern.

## Usage ##

### Installing ###

	npm install console-stamp

### Patching the console ###

	// Patch console.x methods in order to add timestamp information
	require("console-stamp")(console, "HH:MM:ss.l");

	console.log("Hello World!");
	// -> [14:02:48.062] [LOG] Hello World!

	var port = 8080;
	console.log("Server running at port %d", port);
	// -> [16:02:35.325] [LOG] Server running at port 8080

### Example

	console.time( "MyTimer" );
	console.log( "LOG" );
	console.info( "INFO" );
	console.warn( "WARN" );
	console.error( "ERROR" );
	console.dir( { foo: "bar" } );
	console.trace();
	console.timeEnd( "MyTimer" );
	console.assert( count < 10, "Count is > 10" );

Result:

    [20:04:05.969] [LOG] LOG
    [20:04:05.972] [INFO] INFO
    [20:04:05.972] [WARN] WARN
    [20:04:05.972] [ERROR] ERROR
    [20:04:05.972] [DIR] { bar: 'console.dir' }
    [20:04:05.975] [ERROR] Trace
        at Object.<anonymous> (/Users/starak/code/node-console-stamp/test.js:14:9)
        at Module._compile (module.js:456:26)
        at Object.Module._extensions..js (module.js:474:10)
        at Module.load (module.js:356:32)
        at Function.Module._load (module.js:312:12)
        at Function.Module.runMain (module.js:497:10)
        at startup (node.js:119:16)
        at node.js:906:3
    [20:04:05.975] [LOG] MyTimer: 6ms
    [20:04:05.976] [ASSERT]
    AssertionError: Count is > 10
        at Console.assert (console.js:102:23)
        at Console.con.(anonymous function) [as assert] (/Users/starak/code/node-console-stamp/main.js:35:24)
        at Object.<anonymous> (/Users/starak/code/node-console-stamp/test.js:16:9)
        at Module._compile (module.js:456:26)
        at Object.Module._extensions..js (module.js:474:10)
        at Module.load (module.js:356:32)
        at Function.Module._load (module.js:312:12)
        at Function.Module.runMain (module.js:497:10)
        at startup (node.js:119:16)
        at node.js:906:3

See more about timestamp patterns at [felixges][felixge] excellent [dateformat][dateformat]

[dateformat]: https://github.com/felixge/node-dateformat
[felixge]: https://github.com/felixge
[FGRibreau]: https://github.com/FGRibreau/node-nice-console

### Adding Metadata ###

Types can be String, Object (interpreted with util.inspect), or Function. See the test-metadata.js for examples.

### String example

    require("console-stamp")(console, "HH:MM:ss.l", '[' + process.pid + ']');

    console.log('Metadata applied.');

Result:

    [18:10:30.875] [LOG] [7785] Metadata applied.

### Function example

    var util = require("util");

    require("console-stamp")(console, "HH:MM:ss.l", function(){ return '[' + (process.memoryUsage().rss) + ']'; });

    console.log('Metadata applied.');

Result:

    [18:10:30.875] [LOG] [14503936] Metadata applied.
