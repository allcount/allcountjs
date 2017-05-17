#!/usr/bin/env node

var _       = require('lodash'),
    async   = require('async'),
    fileLib = require("node-fs"),
    colors  = require('colors'),
    bower   = require('bower'),
    path    = require('path'),
    utils   = require('./lib/utils'),
    nopt    = require('nopt'),
    fs      = require('fs'),
    installer = require('./lib/installer');

var basePath = process.cwd(),
    pathSep  = '/',
    knownOpts = {
      'remove': Boolean,
      'help': Boolean,
      'keep': Boolean,
      'silent': Boolean
    },
    shortHands = {
      "r": ["--remove"],
      "h": ["--help"],
      "k": ["--keep"],
      "s": ["--silent"]
    },
    cfg;

var options = nopt(knownOpts, shortHands, process.argv, 2);

if(options.help) {
  console.log(("---------------------------------------------------------------------").blue);
  console.log(("Bower Installer").green);
  console.log(("---------------------------------------------------------------------").blue);
  console.log("Tool for installing bower dependencies that won't include entire repos."); 
  console.log("Although Bower works great as a light-weight tool to quickly install ");
  console.log("browser dependencies, it currently does not provide much functionality ");
  console.log("for installing specific \"built\" components for the client.");
  console.log(("---------------------------------------------------------------------").blue);
  console.log(("Options:").green);
  console.log("--remove [r] - Remove the bower_components directory after execution.")
  console.log("--help   [h] - Display this.");
  console.log(("---------------------------------------------------------------------").blue);
  return;
}

// Load configuration file
try {
    cfg = require(path.join(basePath,'bower.json')).install;	
} catch(e) {
    cfg = require(path.join(basePath,'component.json')).install;
}
var paths;
var installPathFiles;

if (!options.silent) {
    process.stdout.write('Setting up install paths...');
}

if(!cfg || !cfg.path) {    	
	paths = "default";
	installPathFiles = _.map(paths,basePath);		
}else{
	paths = _.isString(cfg.path) ? {all: cfg.path} : cfg.path;
	installPathFiles =  _.map( paths,
		function(path) {
			return (basePath + pathSep + path);
		});
	_.each(installPathFiles, function(file) {
	  if(!options.keep) {
		utils.deleteFolderRecursive(file);
	  }
	  if(!fs.existsSync(file)) {
		fileLib.mkdirSync(file, 0755, true);
	  }
	});		
}

if (!options.silent) {
    process.stdout.write(("Finished\r\n").green);

    process.stdout.write('Running bower install...');
}

bower.commands
.install()
.on('end', function (installed) {
  if (!options.silent) {
      process.stdout.write(("Finished\r\n").green);
  }

  bower.commands
    .list({paths: true})
    .on('end', function (data) {
      if (!options.silent) {
          console.log('Installing: ');
      }

      // The callback here will cascade downwards 
      // throughout asyncronous calls. This is necessary
      // to determine when everything has finished.
      async.each(_.map(data, function(dep, key) {
        return {
          dep: dep,
          key: key
        }
      }), function(o, callback) {
        var dep = o.dep,
            key = o.key;

          if(!cfg.ignore || (cfg.ignore && !_.contains(cfg.ignore, key)) ) {
            if(_.isArray(dep)) {
                async.each(dep, function(subDep, callback) {
                    installer.installDependency(subDep, key, cfg, paths, options.silent, callback);
                }, callback);
            } else {
               installer.installDependency(dep, key, cfg, paths, options.silent, callback);
            }
          } else {
            if (!options.silent) {
                console.log(('\tIgnoring: ' + key).yellow);
            }
          }
      }, function(err) {
          if(err) {
              if (!options.silent) {
                  console.error(('Error:').red, err);
              }
          } else {
            if(options.remove) {
              if (!options.silent) {
                  process.stdout.write('Removing bower_components dir...');
              }
              installer.removeComponentsDir(function(err) {
                if (!options.silent) {
                    if(err) {
                        process.stdout.write(("Error").red, err);
                    } else {
                        process.stdout.write(("Finished\r\n").green);
                    }
                }
              })
            } else {
              if (!options.silent) {
                  console.log(('Success').green);
              }
            }
          }
      });

    })
    .on('error', function(error) {
      if (!options.silent) {
          console.error(error);
      }
    });

})
.on('error', function(error) {
  if (!options.silent) {
      process.stdout.write(("Error\r\n").red);
      console.error(error);
  }
});
