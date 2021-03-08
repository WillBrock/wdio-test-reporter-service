const fs      = require(`fs-extra`);
const path    = require(`path`);
const fetch   = require(`node-fetch`);
const btoa    = require(`btoa`);
const api_url = `https://api.testreporter.io`;

class TestReporterLauncher {
	constructor(options) {
		this.options = options;

		if(!this.options.reporterOutputDir) {
			throw new Error(`No reporterOutputDir specified`)
		}

		if(!this.options.username) {
			throw new Error(`No username specified`)
		}

		if(!this.options.apiToken) {
			throw new Error(`No apiToken specified`)
		}
	}

	onPrepare() {
		fs.emptyDirSync(this.options.reporterOutputDir);

		this.start = new Date();
	}

	async onComplete(exit_code, config) {
		const data = this.buildData(config);

		try {
			await this.post(data);
		}
		catch(e) {
			fs.writeFileSync(`${this.options.reporterOutputDir}/post-error.txt`, e.message, { encoding : `utf-8` });
		}
	}

	buildData(config) {
		const directory  = path.resolve(this.options.reporterOutputDir);
		const files      = fs.readdirSync(directory);
		const suite_data = {};
		const all_errors = {};

		const data = {
			project_id : this.options.projectId,
			uuid       : process.env.RUN_UUID,
			title      : process.env.RUN_TITLE || this.start,
			run_date   : this.start.toISOString(),
			duration   : new Date().getTime() - this.start.getTime(),
			version    : process.env.CODE_VERSION || this.options.codeVersion,
			suites_ran : config.suite ? config.suite.join(`, `) : ``,
			passed     : 1,
			failed     : 0,
			suites     : [],
		};

		for(const file of files) {
			if(!file.match(/test-reporter.log/)) {
				continue;
			}

			const filepath = `${directory}/${file}`;
			const tmp      = fs.readFileSync(filepath, { encoding : `utf8` });

			if(!tmp) {
				continue;
			}

			const content   = JSON.parse(tmp);
			const suite_key = btoa(`${content.spec_file}:${content.capabilities}:${content.title}`);

			suite_data[suite_key] = {
				title        : content.title,
				spec_file    : content.spec_file,
				capabilities : content.capabilities,
				duration     : content.duration,
				retries      : content.retries,
				passed       : content.passed,
				failed       : content.failed,
				skipped      : content.skipped,
				tests        : [],
			};

			for(const test of content.tests) {
				const test_key = btoa(`${content.spec_file}:${content.capabilities}:${content.title}:${test.title}`);

				if(!all_errors[test_key]) {
					all_errors[test_key] = [];
				}

				// This will make sure we have stored errors from the same test if it has retried
				all_errors[test_key] = [...all_errors[test_key], ...test.errors];

				const test_data = {
					title    : test.title,
					duration : test.duration,
					passed   : test.passed,
					retries  : test.retries,
					failed   : test.failed,
					skipped  : test.skipped,
					errors   : all_errors[test_key],
				};

				suite_data[suite_key].tests.push(test_data);
			}
		}

		const suites = Object.values(suite_data);
		for(const suite of suites) {
			if(!suite.failed) {
				continue;
			}

			data.failed = 1;
			data.passed = 0;

			break;
		}

		data.suites = suites;

		return data;
	}

	post(data) {
		return fetch(this.getApiRoute(), {
			method  : `POST`,
			headers : {
				'Content-Type'  : `application/json`,
				'Authorization' : `Basic ${this.getAuthToken()}`,
			},
			body : JSON.stringify(data),
		});
	}

	getApiRoute() {
		return [
			api_url,
			`/runs`,
		].join(``);
	}

	getAuthToken() {
		return btoa([
			this.options.username,
			this.options.apiToken,
		].join(`:`));
	}
}

exports.default  = class TestReporterService {};
exports.launcher = TestReporterLauncher;
