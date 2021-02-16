const fs    = require(`fs`);
const path  = require(`path`);
const fetch = require(`node-fetch`);
const btoa  = require(`btoa`);

class TestReporterLauncher {
	constructor(options) {
		this.options = options;

		if(!this.options.reporterOutputDir) {
			throw new Error(`No reporterOutputDir specified`)
		}

		if(!this.options.apiURL) {
			throw new Error(`No apiURL specified`)
		}

		if(!this.options.username) {
			throw new Error(`No username specified`)
		}

		if(!this.options.api_token) {
			throw new Error(`No api_token specified`)
		}
	}

	onPrepare() {
		this.start = new Date();
	}

	onComplete(exit_code, config) {
		const data = this.buildData(config);
		fs.writeFileSync(`/home/will/dev/wdio-project/foobar.txt`, JSON.stringify(data, null, `\t`))
		// this.post(data);
	}

	buildData(config) {
		const directory = path.resolve(this.options.reporterOutputDir);
		const files     = fs.readdirSync(directory);

		const data = {
			project_id : this.options.project_id,
			uuid       : process.env.RUN_UUID,
			title      : process.env.RUN_TITLE || this.start,
			run_date   : this.start.toISOString(),
			duration   : new Date().getTime() - this.start.getTime(),
			version    : process.env.CODE_VERSION || this.options.codeVersion,
			suites_ran : config.suites ? Object.keys(config.suites).join(`, `) : ``,
			passed     : 0,
			failed     : 0,
			suites     : [],
		};

		for(const file of files) {
			if(!file.match(/test-reporter.log/)) {
				continue;
			}

			const filepath = `${directory}/${file}`;

			const tmp      = fs.readFileSync(filepath, { encoding : `utf8` });
			const content  = JSON.parse(tmp);

			const suite_data = {
				title        : content.title,
				spec_id      : content.spec_id,
				capabilities : content.capabilities,
				start        : content.start,
				duration     : content.duration,
				retries      : content.retries,
				passed       : content.passed,
				failed       : content.failed,
				skipped      : content.skipped,
			};

			suite_data.tests = [];

			for(const test of content.tests) {
				const test_data = {
					title    : test.title,
					start    : test.start,
					duration : test.duration,
					passed   : test.passed,
					retries  : test.retries,
					failed   : test.failed,
					skipped  : test.skipped,
					errors   : test.errors,
				};

				suite_data.tests.push(test_data);
			}

			data.suites.push(suite_data);
		}

		return data;
	}

	post(data) {
		fetch(this.getApiRoute(), {
			method  : `post`,
			headers : {
				'Content-Type'  : `application/json`,
				'Authorization' : `Basic ${this.getAuthToken()}`,
			},
			body : JSON.stringify(data),
		});
	}

	getApiRoute() {
		return [
			this.options.apiURL,
			`/runs`,
		].join();
	}

	getAuthToken() {
		return btoa([
			this.options.username,
			this.options.api_token,
		].join(`:`));
	}
}

exports.default  = class TestReporterService {};
exports.launcher = TestReporterLauncher;
