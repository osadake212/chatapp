var gulp = require('gulp');
var jslint = require('gulp-jslint');

gulp.task('watch', function (callback) {

  var path = "public/js/*.js";
  gulp.watch(path, function(e) {
    console.log("---------JSLint Task---------")
    return gulp.src(path)
            .pipe(jslint({
              browser: true,
              continue: true,
              devel: true,
              indent: 2,
              maxerr: 50,
              newcap: true,
              white: true,
              plusplus: true,
              regexp: true,
              sloppy: true,
              vars: false,
              node: true,
              reporter: "default",
              nomen: true,
              errorsOnly: false,
              unparam: true
            }))
            .on('error', function (error) {
              console.error(String(error));
            });
  });
});

