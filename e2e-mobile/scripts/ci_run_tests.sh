#!/bin/bash
set -e

# Export GITHUB_PATH to current PATH so Node can be resolved in Emulator Action
if [ -f "$GITHUB_PATH" ]; then
  while IFS= read -r path_line; do
    export PATH="$path_line:$PATH"
  done < "$GITHUB_PATH"
fi

APK_PATH=$1

if [ -z "$APK_PATH" ]; then
  echo "Error: APK_PATH not provided"
  exit 1
fi

echo "Installing APK: $APK_PATH"
adb install -r "$APK_PATH"

echo "Starting Appium Server..."
npx appium --log-level warn > /tmp/appium.log 2>&1 &

# Wait for Appium
echo "Waiting for Appium..."
timeout 30 bash -c 'until curl -s http://127.0.0.1:4723/status > /dev/null; do sleep 1; done'

echo "Running WDIO tests..."
if ! npx wdio run wdio.conf.js; then
  echo "WDIO tests failed. Checking for fallback report..."
  # If fatal crash occurred, WDIO's after hook will write the fatal result to JSONL,
  # but onComplete might not run. Run a manual fallback generator if excel doesn't exist.
  if [ ! -f "Test_Results/android-report.xlsx" ]; then
      echo "Generating fallback report..."
      node -e "
        const xlsx = require('./utils/xlsxReporter.js');
        xlsx.startRun();
        xlsx.recordTest('Fatal CI Crash', 'Setup', 'FAIL', '5', 'WDIO runner crashed');
        xlsx.generateReport('Test_Results/android-report.xlsx').then(() => {
          require('./utils/generateHtmlReport.js')([{title: 'Fatal CI Crash', category: 'Setup', status: 'FAIL', duration: 5, error: 'WDIO runner crashed'}]);
        });
      "
  fi
  exit 1
fi
