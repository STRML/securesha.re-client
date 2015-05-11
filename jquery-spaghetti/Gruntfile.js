'use strict';

var _ = require('lodash');
var matchdep = require('matchdep');

module.exports = function(grunt) {

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    // The clean task ensures all files are removed from the dist/ directory so
    // that no files linger from previous builds.
    clean: {
      build: ['dist/*']
    },

    // The lint task will run the build configuration and the application
    // JavaScript through JSHint and report any errors.  You can change the
    // options for this task, by reading this:
    // https://github.com/cowboy/grunt/blob/master/docs/task_lint.md
    jshint: {
      validate: {
        src: ['app/**/*.js']
      },
      options: grunt.file.readJSON('.jshintrc')
    },

    compass: {
      secureshare: {
        options: {
          // config: "../config.rb",
          // basePath: "../",
          force: false // not necessary unless config_prod changes
        }
      }
    },


    // The jst task compiles all application templates into JavaScript
    // functions with the underscore.js template function from 1.2.4.  You can
    // change the namespace and the template options, by reading this:
    // https://github.com/gruntjs/grunt-contrib/blob/master/docs/jst.md
    //
    // The concat task depends on this file to exist, so if you decide to
    // remove this, ensure concat is updated accordingly.
    jst: {
      'dist/templates.js': [
        'app/templates/**/*.tpl'
      ],
      options: {
        processName: function(fileName) {
          return '/' + fileName; // add leading slash to fileName so layoutmanager sees it
        }
      }

    },

    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
                '<%= grunt.template.today("yyyy-mm-dd") %> */',
        sourceMap: function(dest){
          return dest + ".map";
        },
      },
      secureshare: {
        files: { // 'dest' : ['src']
          'dist/build.js' : [
            'dist/templates.js',
            'app/**/*.js'
          ]
        },
      },
    },

    md5: {
      compile: {
        files: [
          {src: 'dist/build.js', dest: 'dist/'},
          {src: 'css/style.css', dest: 'dist/'}
        ],
        //overide the paths in the index.html with the new md5 name
        options: {
          after: function(fileChanges, options) {
            var fs = require('fs');
            var files = {
              'index.html': fs.readFileSync('index.html', 'utf8')
            };
            // Iterate through files & replace contents based on md5
            Object.keys(files).forEach(function(fileName) {
              var file = files[fileName];
              fileChanges.forEach(function(fileChange) {
                // Remove webroot
                fileChange.newPath = fileChange.newPath.replace('webroot/', '');
                file = file.replace(fileChange.oldPath, fileChange.newPath);
              });
              fs.writeFileSync(fileName, file);
            });
          },
          keepExtension: true,
          keepBasename: true,
          encoding: 'utf8'
        }
      }
    },

    /**
     * Dev tasks
     */

    // Live reloading
    watch: {
      options: {
        //nospawn: true // This is faster but can cause problems over time
      },
      // This will simply refresh on a script change, nothing more. Not always the right answer.
      // Would love chrome debugger code hot swapping.
      scripts: {
        files: ['app/**/*.js'],
        tasks: [],
        options: {
          livereload: false
        },
      },
      templates: {
        files: ['app/**/*.tpl'],
        tasks: ['jst'],
        options: {
          livereload: false
        }
      },
      sass: {
        files: ['css/*.sass'],
        tasks: ['compass:dev'],
        options: {
          livereload: false // this will refresh the browser if true
        }
      },
      css: {
        files: ['css/**/*'],
        options: {
          livereload: true
        }
      },
    }

  });

  /**
   * Main tasks
   */

  _.each(matchdep.filterAll('grunt-*'), function(pkgName){
    grunt.loadNpmTasks(pkgName);
  });


  // The debug task will remove all contents inside the dist/ folder, lint
  // all your code, precompile all the underscore templates into
  // dist/debug/templates.js, compile all the application code into
  // dist/debug/require.js, and then concatenate the require/define shim
  // almond.js and dist/debug/templates.js into the require.js file.
  grunt.registerTask('debug', ['clean:build', 'jshint', 'jst', 'compass'/*, "jsdoc"*/]);

  // The release task will run the debug tasks and then minify the
  // dist/debug/require.js file and CSS files.
  grunt.registerTask('release', ['debug', 'uglify', 'md5']);

  grunt.registerTask('default', ['release']);
};
