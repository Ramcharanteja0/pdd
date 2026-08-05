const fs = require('fs');
const path = require('path');
const xlsxReporter = require('./utils/xlsxReporter');
const generateHtmlReport = require('./utils/generateHtmlReport');
const generateSummary = require('./utils/generateSummary');

const outDir = path.join(__dirname, 'Test_Results');
const resultsFile = path.join(outDir, '.wdio-results.jsonl');

exports.config = {
    runner: 'local',
    port: 4723,
    specs: [
        process.env.WDIO_CI_SPEC || './tests/**/*.test.js'
    ],
    maxInstances: 1,
    capabilities: [{
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:app': process.env.APK_PATH || path.join(__dirname, '../android/app/build/outputs/apk/debug/app-debug.apk'),
        'appium:autoGrantPermissions': true
    }],
    logLevel: 'error',
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    framework: 'mocha',
    reporters: ['spec'],
    mochaOpts: {
        ui: 'bdd',
        timeout: 100000
    },

    onPrepare: function (config, capabilities) {
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }
        if (fs.existsSync(resultsFile)) {
            fs.unlinkSync(resultsFile);
        }
        xlsxReporter.startRun();
    },

    afterTest: function (test, context, { error, result, duration, passed, retries }) {
        const res = {
            title: test.title,
            category: test.parent,
            status: passed ? 'PASS' : 'FAIL',
            duration: duration,
            error: error ? error.message : ''
        };
        fs.appendFileSync(resultsFile, JSON.stringify(res) + '\n');
    },

    after: function (result, capabilities, specs) {
        // Fallback for fatal setup crash
        if (result !== 0 && !fs.existsSync(resultsFile)) {
             fs.appendFileSync(resultsFile, JSON.stringify({
                title: 'Fatal Appium Crash',
                category: 'Setup',
                status: 'FAIL',
                duration: 5,
                error: 'Driver failed to initialize'
             }) + '\n');
        }
    },

    onComplete: async function (exitCode, config, capabilities, results) {
        if (fs.existsSync(resultsFile)) {
            const lines = fs.readFileSync(resultsFile, 'utf-8').trim().split('\n');
            const parsedResults = lines.map(l => JSON.parse(l));
            
            parsedResults.forEach(r => {
                xlsxReporter.recordTest(r.title, r.category, r.status, r.duration, r.error);
            });

            await xlsxReporter.generateReport(path.join(outDir, 'android-report.xlsx'));
            generateHtmlReport(parsedResults);
            generateSummary(parsedResults);
        }
    }
}
