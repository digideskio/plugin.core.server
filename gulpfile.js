var info = require('./package.json')

var path = require('path')
var gulp = require('gulp')
var imagemin = require('gulp-imagemin')
var gutil = require('gulp-util')
var del = require('del')
var watch = require('gulp-watch')
var webpack = require('webpack')
var browserSync = require('browser-sync')
var reload = browserSync.reload
var webpackCompiler

// common config
var config = {
	jade: {
		pretty: false,
	},
	sass: {},
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

var __components_src = __dirname + '/plugin/components/'
var __assets_src = __dirname + '/plugin/assets/'
var __assets_dest = __dirname + '/static/assets/'

gulp.task('clean', function(cb) {
	del([
		'./static/*',
	], cb)
})

gulp.task('webpack', function(callback) {
	webpackCompiler.run(function(err, stats) {
		if (err) {
			throw new gutil.PluginError('webpack', err)
		}

		config.jade.locals.MAIN_CSS_FILE = 'main.' + stats.hash + '.bundle.css'
		config.jade.locals.MAIN_JS_FILE = 'main.' + stats.hash + '.bundle.js'

		gutil.log('webpack', stats.toString({
			colors: true,
		}))

		callback(err)
	})
})

gulp.task('imagemin', ['webpack'], function() {
	return gulp.src('static/assets/img/**/*')
		.pipe(imagemin())
		.pipe(gulp.dest('static/assets/img/'))
})

gulp.task('entrypoint', ['webpack', 'imagemin'])

// handle dev/prod config
gulp.task('set-env-dev', function() {
	config.ENV = 'dev'

	config.sass = {
		includePaths: [
			__assets_src + '/sass/',
		],
		indentedSyntax: 'sass',
	}
	config.jade.locals = {
		DEBUG: true,
	}
	var htmlConfig = {
		root: __assets_src,
		attrs: ['link:href', 'script:src', 'img:src'],
	}
	config.webpack = {
		cache: true,
		debug: true,
		devtool: 'source-map',
		entry: {
			main: [__components_src + '/main.js'],
		},
		output: {
			path: __assets_dest,
			filename: 'js/[name].bundle.js',
			chunkFilename: '[id].[hash].chunk.js',
			publicPath: '/static/',
		},
		plugins: [
			new webpack.BannerPlugin(info.name + '\n' + info.version + ' [development build]'),
			new webpack.DefinePlugin({
				DEBUG: true,
			}),
		],
		module: {
			loaders: [
				{ test: /\.sass/, loader: 'css?root=' + __assets_src + '!autoprefixer?browsers=last 2 version!sass?' + JSON.stringify(config.sass) },
				{ test: /\.jade$/, loader: 'html?' + JSON.stringify(htmlConfig) + '!jade-html?' + JSON.stringify(config.jade) },
				{ test: /img\/.*\.(jpg|png|gif|svg)$/, loader: 'file?name=img/[sha512:hash:base64:6].[ext]' },
				{ test: /font\/.*\.(eot|woff2?|ttf|svg)[?#]?.*$/, loader: 'file?name=font/[sha512:hash:base64:6].[ext]' },
				{ test: /\.js$/, exclude: [/node_modules/, /lib\/ext/], loader: 'babel' },
			],
		},
	}

	webpackCompiler = webpack(config.webpack)
})

gulp.task('set-env-prod', function() {
	config.ENV = 'prod'

	config.sass = {
		includePaths: [
			__assets_src + '/sass/',
		],
		indentedSyntax: 'sass',
		omitSourceMapUrl: true,
		outputStyle: 'compressed',
	}
	config.jade.locals = {
		DEBUG: false,
	}
	var htmlConfig = {
		root: __assets_src,
		attrs: ['link:href', 'script:src', 'img:src'],
	}
	config.webpack = {
		cache: false,
		debug: false,
		entry: {
			main: [__components_src + '/main.js'],
		},
		output: {
			path: __assets_dest,
			filename: 'js/[name].bundle.js',
			chunkFilename: '[id].[hash].chunk.js',
			publicPath: '/static/',
		},
		plugins: [
			new webpack.BannerPlugin(info.name + '\n' + info.version + ' [production build]'),
			new webpack.DefinePlugin({
				DEBUG: false,
			}),
			new webpack.optimize.DedupePlugin(),
			new webpack.optimize.AggressiveMergingPlugin(),
			new webpack.optimize.UglifyJsPlugin()
		],
		module: {
			loaders: [
				{ test: /\.sass/, loader: 'css?root=' + __assets_src + '!autoprefixer?browsers=last 2 version!sass?' + JSON.stringify(config.sass) },
				{ test: /\.jade$/, loader: 'html?' + JSON.stringify(htmlConfig) + '!jade-html?' + JSON.stringify(config.jade) },
				{ test: /img\/.*\.(jpg|png|gif|svg)$/, loader: 'file?name=img/[sha512:hash:base64:6].[ext]' },
				{ test: /font\/.*\.(eot|woff2?|ttf|svg)[?#]?.*$/, loader: 'file?name=font/[sha512:hash:base64:6].[ext]' },
				{ test: /\.js$/, exclude: [/node_modules/, /lib\/ext/], loader: 'babel' },
			],
		},
	}

	webpackCompiler = webpack(config.webpack)
})

// main tasks
gulp.task('development', ['set-env-dev', 'entrypoint'], function() {
	browserSync({
		notify: false,
		port: 3000,
	})

	gulp.watch('plugin/components/**/*', ['entrypoint'])

	watch('static/assets/**/*.(js|css)', function(ev) {
		reload(path.basename(ev.path))
	})
})

gulp.task('production', ['set-env-prod', 'entrypoint'])
