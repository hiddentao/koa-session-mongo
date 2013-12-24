var gulp = require('gulp');
var mocha = require('gulp-mocha');

gulp.task('basicTests', function () {
  gulp.src('tests/basic.test.js')
    .pipe(mocha({
      ui: 'bdd',
      reporter: 'spec'
    }))
});


gulp.task('longRunningTests', function () {
  gulp.src('tests/longRunning.test.js')
    .pipe(mocha({
      ui: 'bdd',
      reporter: 'spec'
    }))
});


gulp.task('default', ['basicTests'], function() {});

