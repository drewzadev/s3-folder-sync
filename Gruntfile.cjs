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
      }
    }
  })

  // Load Plugins / Tasks
  grunt.loadNpmTasks('grunt-text-replace')

  // Default task(s).
  grunt.registerTask('default',
    [
      'replace:rhel_X86_spec_file',
      'replace:rhel_aarch64_spec_file'
    ])
}
