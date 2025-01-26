'use strict'
module.exports = function (grunt) {

  // Project configurations.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    replace: {
      rhel_X86_spec_file: {
        src: ['dist/rhel/s3-folder-sync-x86_64.spec'],
        overwrite: true,
        replacements: [
          {
            from: /(?<=Version:        ).*$/gm,
            to: '<%= pkg.version %>'
          }]
      },
      rhel_aarch64_spec_file: {
        src: ['dist/rhel/s3-folder-sync-aarch64.spec'],
        overwrite: true,
        replacements: [
          {
            from: /(?<=Version:        ).*$/gm,
            to: '<%= pkg.version %>'
          }]
      },
      debian_changelog: {
        src: ['dist/debian/changelog'],
        overwrite: true,
        replacements: [
          {
            from: /(?<=\().+?(?=\))/gm,
            to: '<%= pkg.version %>'
          },
          {
            from: /(?<=mozmail.com>  ).*$/gm,
            to: '<%= grunt.template.today("ddd, dd mmm yyyy HH:MM:ss o") %>'
          }]
      },
      debian_version: {
        src: ['dist/debian/version'],
        overwrite: true,
        replacements: [
          {
            from: /(?<=version=).*$/gm,
            to: '<%= pkg.version %>'
          }]
      },
    },
    concat: {
      options: {
        separator: '\n\n',
        process: function (src, filepath) {
          return '--------- ' + filepath + ' ---------\n' + src
        }
      },
      dist: {
        src: [
          's3-folder-sync.js',
          's3foldersync.conf',
          'libs/**/*.js',
          'libs/**/*.mjs',
          'dist/**/*.*',
          'package.json',
          'README.md'
        ],
        dest: 'codebase.txt'
      }
    }
  })

  // Load Plugins / Tasks
  grunt.loadNpmTasks('grunt-text-replace')
  grunt.loadNpmTasks('grunt-contrib-concat')

  // Creates a codebase.txt file to use with AI / LLM tools.
  grunt.registerTask('create-codebase', ['concat'])

  // Default task(s).
  grunt.registerTask('default',
    [
      'replace:rhel_X86_spec_file',
      'replace:rhel_aarch64_spec_file',
      'replace:debian_changelog',
      'replace:debian_version'
    ])
}
