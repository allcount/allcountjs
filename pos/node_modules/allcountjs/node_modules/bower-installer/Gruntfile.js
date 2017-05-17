module.exports = function(grunt) {

// Project configuration.
grunt.initConfig({
  pkg: grunt.file.readJSON('package.json'),
  jasmine_node: {
    options: {
      forceExit: true,
      match: '.',
      matchall: false,
      extensions: 'js',
      specNameMatcher: 'spec'
    },
    all: ['./']
  }
});

grunt.loadNpmTasks('grunt-jasmine-node');

// Default task(s).
grunt.registerTask('default', ['jasmine_node']);

};

