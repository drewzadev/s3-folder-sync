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
    }
  })

  // Load Plugins / Tasks
  grunt.loadNpmTasks('grunt-text-replace')

  // Default task(s).
  grunt.registerTask('default',
    [
      'replace:rhel_X86_spec_file',
      'replace:rhel_aarch64_spec_file',
      'replace:debian_changelog',
      'replace:debian_version'
    ])
}
