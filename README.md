
# Environment variables

* `RUN_TITLE`    - Title of the test run. This might be somthing like a Jira issue key
* `RUN_UUID`     - UUID which can be used to directly link to the test run results. e.g. https://testreporter.io/runs/<uuid>
* `CODE_VERSION` - Set the version of code this test run ran against

```
	services: [['test-reporter', {

		reporterOutputDir : `./reports`,
		apiURL            : `https://api.testreporter.io/1.0`,
		username          : `jenkins@foobar.com`,
		api_token         : ``,
		project_id        : 283, // Only needed if using more than one project
		codeVersion       : `10.0.1`,
	}]],
```
