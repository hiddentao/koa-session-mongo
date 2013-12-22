var gulp = require('gulp');
var mocha = require('gulp-mocha');

gulp.task('basicTests', function () {
  return gulp.src('tests/basic.test.js')
    .pipe(mocha({
      ui: 'bdd',
      reporter: 'spec'
    }))
});


gulp.task('allTests', ['basicTests'], function () {
  return gulp.src('tests/longRunning.test.js')
    .pipe(mocha({
      ui: 'bdd',
      reporter: 'spec'
    }))
});


gulp.task('default', ['allTests'], function() {});


gulp.task('ci', ['basicTests'], function() {});

