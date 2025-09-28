# WebdriverIO Test Reporter Service

WDIO service that takes results from [wdio-test-reporter](https://github.com/WillBrock/wdio-test-reporter) and uploads them to [testreporter.io](https://testreporter.io)

testreporter.io stores and tracks all test runs with extensive details about each test. This gives you a historical overivew of how your tests are running.

Setup is very simple. All you need to do is add the service and reporter to the `services` and `reporters` arrays in your wdio.conf.js file.

## Install the service

```
npm install wdio-test-reporter-service
```

## Add the service to the services array in wdio.conf.js

```
services: [['test-reporter', {
	reporterOutputDir : `./testreporter`,          // This must match the outputDir from the wdio-test-reporter
	apiUrl            : `app-api.testreporter.io`, // Defaults to app-api.testreporter.io if none is set
	username          : `jenkins@foobar.com`,      // app.testreporter.io username
	apiToken          : `12345`,                   // Found in the app.testreporter.io under your proifle section
	projectId         : 123,                       // Only needed if using more than one project
	appVersion        : `2.8.10`,                  // The code version can also be set here
	enableFlaky       : 1,                         // Will mark tests as flaky if it detects them based on previous runs
}]],
```

You will create a custom `username` and `apiToken` in the UI under Settings -> Profile -> API Keys

## Add the wdio-test-reporter to the reporters array in wdio.conf.js

```
npm install wdio-test-reporter
```

```
reporters : [[`test`, {
	outputDir : `./testreporter`
}]]
```

## Environment variables

Environment variables can be set when running tests that the server will use to add to the results

* `RUN_TITLE`    - Title of the test run. This might be something like a Jira issue key. Defaults to a timestamp if not specified
* `RUN_UUID`     - UUID which can be used to directly link to the test run results. e.g. https://app.testreporter.io/runs/c26b23d8-eb9f-4ff4-a884-5cb9f3d3aba5<uuid>
* `APP_VERSION`  - Set the version of app this test run ran against
