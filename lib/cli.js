#! /usr/bin/env node

// define used modules
var _ = require('underscore');
var path = require('path');
var fs = require('fs');
var moment = require('moment');
var oxutil = require('./util');
var DotNetError = require('../errors/dotnet');
var OxError = require('../errors/oxerror');
var Launcher = require('./launcher');
const STATUS = require('../model/status.js');

// parse command line arguments
var argv = require('minimist')(process.argv.slice(2));

// make sure that either script or test suite file is specified
if (typeof(argv._[0]) === 'undefined') {
    console.error('You must specify either script or test suite file as the first argument');
    process.exit(1);
}
var srcFile = argv._[0];
var fileNameNoExt = oxutil.getFileNameWithoutExt(srcFile);
var fileExt = path.extname(srcFile);

var startup = {
    mode : argv.m || argv.mode || 'web',
	browserName : argv.b || argv.browser || 'chrome',
    seleniumUrl : argv.s || argv.server || 'http://localhost:4444/wd/hub',
	host: argv.host || 'localhost',
	port: argv.port || 4444,
    proxyUrl : argv.proxy || '',
    initDriver : argv.init ? argv.init === 'true' : true,
    testName : argv.name || fileNameNoExt,
    testId : argv.id || null,
    iterations : argv.i ? parseInt(argv.i) : null,
    ext: {
        browserStack: {
            user: argv.bsUser || null,
            key: argv.bsKey || null,
            project: argv.bsProject || null,
            build: argv.bsBuild || null,
            browserName: argv.bsBrowser || null,
            browserVer: argv.bsBrowserVer || null,
            osName: argv.bsOS || null,
            osVer: argv.bsOSVer || null,
            resolution: argv.bsRes || null,
            platform: argv.bsPlatform || null,
            device: argv.bsDevice || null
        }
    },
    parameters : {
        file: argv.p || argv.param || null,
        mode: argv.pm || 'seq'
    }
};

// adjust port for Appium if in mobile mode
if (startup.mode === 'mob') {
    startup.port = 4723;
}

var ts = null;  // test suite
var lastError;

if (fileExt === '.js') {
    var tc = oxutil.generateTestCaseFromJSFile(srcFile, startup.parameters.file, startup.parameters.mode);
    ts = oxutil.generateTestSuiteForSingleTestCase(tc);
} else if (fileExt === '.xml') {
    ts = oxutil.generateTestSuiteFromXmlFile(srcFile);
} else if (fileExt === '.json') {
    ts = oxutil.generateTestSuiteFromJsonFile(srcFile, startup.parameters.file, startup.parameters.mode, startup);
} else {
    console.error('Unsupported file format: ' + fileExt);
    process.exit(1);
}
// assigned file name as the test name if nothing else was assigned
if (!ts.name) {
    ts.name = startup.testName;
}

// if iteration count was passed in arguments, override the test suite value
if (startup.iterations) {
    ts.iterationCount = startup.iterations;
}

var args = [];
// set web module init parameters and pass them as arguments to the child process
addBrowserStackCapabilities(args, startup);
args.push('--web@seleniumUrl=' + startup.seleniumUrl);
args.push('--web@browserName=' + startup.browserName);
args.push('--web@proxyUrl=' + startup.proxyUrl);
args.push('--web@initDriver=' + startup.initDriver);

// extract capabilities to a separate variable and remove it from test suites
var caps = ts.capabilities;
ts.capabilities = null;
var launcher = new Launcher(ts, startup, args);
console.log('Test started...');
launcher
	.run(caps)
	.then(function(results) {
		saveTestResults(results);
	})
	.catch(function(err) {
		console.log('Fatal error: ' + err.message);
	});

function addBrowserStackCapabilities(args, opt) {
    if (!opt) return;
    if (!opt.ext || !opt.ext.browserStack) return;
    var bs = opt.ext.browserStack;
    if (!bs.user || !bs.key) return;
    // change default selenium URL
    opt.seleniumUrl = 'http://hub.browserstack.com/wd/hub/';
    
    if (bs.user)
        args.push('--web@cap:browserstack.user=' + bs.user);
    if (bs.key)
        args.push('--web@cap:browserstack.key=' + bs.key);
    if (bs.browserName) {
        args.push('--web@cap:browser=' + bs.browserName);
        args.push('--web@cap:browserName=' + bs.browserName);
    }
    if (bs.browserVer)
        args.push('--web@cap:browser_version=' + bs.browserVer);
    if (bs.osName)
        args.push('--web@cap:os=' + bs.osName);
    if (bs.osVer)
        args.push('--web@cap:os_version=' + bs.osVer);
    if (bs.resolution)
        args.push('--web@cap:resolution=' + bs.resolution);
    if (bs.platform)
        args.push('--web@cap:platform=' + bs.platform);
    if (bs.device)
        args.push('--web@cap:device=' + bs.device);
}

function saveTestResults(results) {
    // create results folder if not exists
    var mainFolderPath = createMainResultsFolderIfNotExists();
    var fileName = moment().format('YYYY-MM-DD HHmmss');
    var resultFolderPath = createResultSubFolderIfNotExists(mainFolderPath, fileName);
    var resultFilePath = path.join(resultFolderPath, fileName + '.xml');
    var EasyXml = require('easyxml');
    var serializer = new EasyXml({
        singularize: true,
        rootElement: 'test-results',
		rootArray: 'test-results',
        dateFormat: 'ISO',
        manifest: true,
		unwrapArrays: true,
        filterNulls: true
    });
	
	
    /*if (lastError) {
        var failure = new require('../model/stepfailure')();
        failure._message = lastError.message;
        failure._type = lastError.type;
        failure._details = lastError.line ? 'at line ' + lastError.line : null;
        tr.summary._status = STATUS.FAILED;
		tr.summary.failure = failure;
        var msg = lastError.message;
        if (lastError.line) msg += ' at line ' + lastError.line;

        console.log('Test finished with error: ' + msg);
    }
    else
        console.log('Test finished');*/
	// save all screenshots to files and replace screenshot content with file path in the result JSON before serialization
	// also check if one of the results has failed
	var lastFailure = null;
	_.each(results, function(tr) {
		replaceScreenshotsWithFiles(tr, resultFolderPath);
		if (tr.summary && tr.summary.failure) {
			lastFailure = tr.summary.failure;
		}
		
	});
	// report test status
	if (lastFailure) {
		var failureMessage = lastFailure._message;
		if (lastFailure._type) {
			failureMessage = '[' + lastFailure._type + '] ' + failureMessage;
		}
		if (lastFailure._details) {
			failureMessage += ' ' + lastFailure._details;
		}
		console.log('Test finished with error: ' + failureMessage);
	}
	else {
		console.log('Test finished');
	}
    // serialize test results to XML and save to file
	try {
		var xml = serializer.render(results);
		fs.writeFileSync(resultFilePath, xml);

		console.log('Results saved to: ' + resultFilePath);	
	}
	catch (err) {
		console.log("Can't save results to file: " + err.message);
	}
	
}

function replaceScreenshotsWithFiles(tr, folderPath) {
	var stepsWithScreenshot = [];
	// map steps with non empty screenshot attribute
	_.each(tr.iterations, function(outerIt) {
		_.each(outerIt.testcases, function(testcase) {
			_.each(testcase.iterations, function(innerIt) {
				_.each(innerIt.steps, function(step) {
					if (step.screenshot) {
						stepsWithScreenshot.push(step);
					}
				});
			});
		});
	});
	const screenshotFilePrefix = "screenshot-";
	const screenshotFileSuffix = ".png";
	for (var i = 0; i<stepsWithScreenshot.length; i++) {
		var filename = screenshotFilePrefix + i + screenshotFileSuffix;
		var filepath = path.join(folderPath, filename);
		var step = stepsWithScreenshot[i];
		fs.writeFileSync(filepath, step.screenshot, 'base64');
		step._screenshotFile = filename;
		step.screenshot = null;	// don't save base64 screenshot date to the file
	}
}

function createMainResultsFolderIfNotExists() {
    var fs = require('fs');
    var baseDir = path.dirname(srcFile);
    var fileNameNoExt = oxutil.getFileNameWithoutExt(srcFile);
    var resultsFolder = path.join(baseDir, fileNameNoExt);
    
    try {
        fs.mkdirSync(resultsFolder);
    } catch(e) {
        if ( e.code != 'EEXIST' ) throw e;
    }
    return resultsFolder;
}

function createResultSubFolderIfNotExists(mainFolderPath, resultName) {
    var fs = require('fs');
    var folerPath = path.join(mainFolderPath, resultName);
    
    try {
        fs.mkdirSync(folerPath);
    } catch(e) {
        if ( e.code != 'EEXIST' ) throw e;
    }
    return folerPath;
}

