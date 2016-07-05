/*globals console:false, require:false*/

require( "./main" )( console, "HH:MM:ss.l" );

var foo = { bar: "console.dir" },
    count = 11;

console.time( "MyTimer" );
console.log( "LOG" );
console.info( "INFO" );
console.warn( "WARN" );
console.error( "ERROR" );
console.dir( foo );
console.trace();
console.timeEnd( "MyTimer" );
console.assert( count < 10, "Count is > 10" );

