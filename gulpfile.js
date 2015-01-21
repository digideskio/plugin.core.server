var info = require('./package.json')

var fs = require('fs')
var path = require('path')
var del = require('del')
var gulp = require('gulp')
var stylus = require('gulp-stylus')
var nib = require('nib')
var jade = require('gulp-jade')
var htmlmin = require('gulp-htmlmin')
var gutil = require('gulp-util')
var inline = require('gulp-inline')
var webpack = require('webpack')
var webpackCompiler

// common config
var config = {
	htmlmin: {
		collapseBooleanAttributes: true,
		collapseWhitespace: true,
		removeAttributeQuotes: true,
		removeComments: true,
		removeEmptyAttributes: true,
		removeOptionalTags: true,
		removeRedundantAttributes: true,
		useShortDoctype: true,
		processScripts: ['text/x-template'],
	},
}

var __output_dir = './public'
var __assets_src = './assets/'
var __assets_dest = __output_dir + '/assets/'
var __views_src = './views/'
var __views_dest = __output_dir + '/views/'
var __entrypoint = 'main.js'

var globs = {
	js: __assets_src + 'js/**/*.js',
	styl: __assets_src + 'styl/*.styl',
	jade: __views_src + '**/*.jade',
}

gulp.task('webpack', ['stylus', 'jade'], function(callback) {
	webpackCompiler.run(function(err, stats) {
		if (err) {
			throw new gutil.PluginError('webpack', err)
		}

		gutil.log('webpack', stats.toString({
			colors: true,
		}))

		callback(err)
	})
})

gulp.task('stylus', function() {
	return gulp
		.src(globs.styl)
		.pipe(stylus(config.stylus))
		.pipe(gulp.dest(__assets_dest + 'css/'))
})

gulp.task('jade', function(cb) {
	return gulp
		.src(__views_src + '/plugin.jade')
		.pipe(jade(config.jade))
		.pipe(htmlmin(config.htmlmin))
		.pipe(gulp.dest(__views_dest))
})

gulp.task('clean', function(cb) {
	del([__output_dir + '/*'])
	cb()
})

gulp.task('sync', ['clean'], function() {
	return gulp
		.src(__assets_src + 'img/**')
		.pipe(gulp.dest(__assets_dest))
})

// handle dev/prod config
gulp.task('set-env-dev', ['sync'], function() {
	config.ENV = 'dev'

	config.stylus = {
			debug: true,
			compress: false,
			'include css': true,
			define: {
				DEV: true,
			},
			use: [
				nib(),
			],
			import: [
				'nib',
			],
		}
	config.jade = {
		pretty: false,
		compileDebug: true,
		locals: {
			DEBUG: true,
		},
	}
	config.webpack = {
		cache: true,
		debug: true,
		devtool: 'source-map',
		entry: {
			main: __assets_src + 'js/' + __entrypoint,
		},
		output: {
			path: __assets_dest + 'js/',
			filename: '[name].bundle.js',
			chunkFilename: '[id].chunk.js',
			publicPath: '/js/',
		},
		plugins: [
			new webpack.BannerPlugin(info.name + '\n' + info.version + ':' + Date.now() + ' [development build]'),
			new webpack.DefinePlugin({
				DEV: true,
			}),
		]
	}
	webpackCompiler = webpack(config.webpack)
})

gulp.task('set-env-prod', ['clean'], function() {
	config.ENV = 'prod'

	config.stylus = {
		debug: false,
		compress: true,
		'include css': true,
		define: {
			DEV: false,
		},
		use: [
			nib(),
		],
		import: [
			'nib',
		],
	}
	config.jade = {
		pretty: false,
		compileDebug: false,
		locals: {
			DEBUG: false,
		},
	}
	config.webpack = {
		cache: true,
		entry: {
			main: __assets_src + 'js/' + __entrypoint,
		},
		output: {
			path: __assets_dest + 'js/',
			filename: '[name].bundle.js',
			chunkFilename: '[id].chunk.js',
			publicPath: '/js/',
		},
		plugins: [
			new webpack.BannerPlugin(info.name + '\n' + info.version + ':' + Date.now() + ' [production build]'),
			new webpack.DefinePlugin({
				DEV: false,
			}),
			new webpack.optimize.DedupePlugin(),
			new webpack.optimize.AggressiveMergingPlugin(),
			new webpack.optimize.UglifyJsPlugin()
		]
	}
	webpackCompiler = webpack(config.webpack)
})

// main tasks
gulp.task('development', ['set-env-dev'], function() {
	gulp.watch(globs.js, ['webpack'])
	gulp.watch(globs.styl, ['webpack'])
	gulp.watch(globs.jade, ['webpack'])
})
gulp.task('production', ['set-env-prod', 'jade', 'sync'])
