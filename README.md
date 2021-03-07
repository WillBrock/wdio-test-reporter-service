# WebdriverIO Test Reporter Service

WDIO service that takes results from [wdio-test-reporter](https://github.com/WillBrock/wdio-test-reporter) and uploads them to the [testreporter.io](https://testreporter.io)

testreporter.io stores and tracks all test runs with extensive details about each test. This gives you a historical overivew of how your tests are running.

## Environment variables

Environment variables can be set when running tests that the server will use to add to the results

* `RUN_TITLE`    - Title of the test run. This might be somthing like a Jira issue key
* `RUN_UUID`     - UUID which can be used to directly link to the test run results. e.g. https://console.testreporter.io/runs/<uuid>
* `CODE_VERSION` - Set the version of code this test run ran against

## Add to the services array in wdio.conf.js

```
	services: [['test-reporter', {
		reporterOutputDir : `./reports`, // This must match the outputDir from the wdio-test-reporter
		username          : `jenkins@foobar.com`,
		apiPoken          : `12345`, // Found in the console.testreporter.io site
		project_id        : 283, // Only needed if using more than one project
		codeVersion       : `10.0.1`, // code version can also be set here
	}]],
```
