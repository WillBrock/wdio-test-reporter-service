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
	reporterOutputDir : `./testreporter`,      // This must match the outputDir from the wdio-test-reporter
	username          : `jenkins@foobar.com`,  // console.testreporter.io username
	apiToken          : `12345`,               // Found in the console.testreporter.io under your proifle section
	projectId         : 123,                   // Only needed if using more than one project
	codeVersion       : `2.8.10`,              // The code version can also be set here
}]],
```

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

* `RUN_TITLE`    - Title of the test run. This might be somthing like a Jira issue key. Defaults to a timestamp if not specified
* `RUN_UUID`     - UUID which can be used to directly link to the test run results. e.g. https://console.testreporter.io/runs/<uuid>
* `CODE_VERSION` - Set the version of code this test run ran against
