var fs = require("fs");

if (!fs.readFiles)
fs.readFiles = function(files, encoding, batchCount, complete){
	var allData = {}
	  , settings = {}
	  , args = Array.prototype.slice.call(arguments)
	  ;
	
	//files is first argument
	files = args.shift();
	// complete is the last argument
	complete = args.pop();
	//defaults
	encoding = 'utf8';
	batchCount = 100;
	args.forEach(function(arg){
		switch(typeof arg){
			case 'string':
				encoding = arg;
				break;
			case 'number':
				batchCount = arg;
				break;
		}
	});
	//recursively handle batches of files at a time
	function nextChunk(){
		var next = files.splice(0,batchCount)
		  , len = next.length
		  ;
		if(!len){
			complete(null, allData);
			return;
		}
		next.forEach(function(file, idx){
			// read it's contents
			fs.readFile(file, encoding, function(err, data) {
				if (err){
					complete(err, null);
					return;
				}
				
				// store data
				allData[file] = data;
				
				if(idx == (len-1))
					nextChunk();
			});
		});
	}
	nextChunk();
};
