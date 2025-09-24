import fs   from 'fs-extra';
import path from 'path';
import btoa from 'btoa';
import { SevereServiceError } from 'webdriverio';

const api_url = `https://app-api.testreporter.io`;

class TestReporterLauncher {
	constructor(options) {
		this.options = options;

		if(!this.options.reporterOutputDir) {
			throw new SevereServiceError(`No reporterOutputDir specified`)
		}

		if(!this.options.username) {
			throw new SevereServiceError(`No username specified`)
		}

		if(!this.options.apiToken) {
			throw new SevereServiceError(`No apiToken specified`)
		}
	}

	onPrepare() {
		fs.emptyDirSync(this.options.reporterOutputDir);

		fs.writeFileSync(`${this.options.reporterOutputDir}/trio-onPrepare.txt`, `onPrepare called`, { encoding : `utf-8` });

		this.start = new Date();
	}

	async onComplete(exit_code, config) {
		const data = this.buildData(config);

		try {
			const tmp = await this.post(data);
			fs.writeFileSync(`${this.options.reporterOutputDir}/trio-onComplete-post.txt`, `onComplete-post`, { encoding : `utf-8` });
		}
		catch(e) {
			fs.writeFileSync(`${this.options.reporterOutputDir}/trio-post-error.txt`, e.message, { encoding : `utf-8` });
		}
	}

	buildData(config) {
		const directory  = path.resolve(this.options.reporterOutputDir);
		const files      = fs.readdirSync(directory);
		const suite_data = {};
		const all_errors = {};
		const all_hooks  = {};


		fs.writeFileSync(`${this.options.reporterOutputDir}/trio-skip-passed.txt`, `Value of SKIP_PASSED_UPLOADS: ${process.env.SKIP_PASSED_UPLOADS}`, { encoding : `utf-8` });
		fs.writeFileSync(`${this.options.reporterOutputDir}/trio-buildData.txt`, `Starting buildData`, { encoding : `utf-8` });

		const data = {
			project_id    : this.options.projectId,
			uuid          : process.env.RUN_UUID,
			// This is a way to group runs together, for example if you're using sharding
			group_uuid    : process.env.GROUP_UUID,
			main_run      : Number(process.env.MAIN_RUN),
			title         : process.env.RUN_TITLE || this.start,
			// Site the tests were ran on
			site          : process.env.SITE,
			build_url     : process.env.BUILD_URL,
			run_date      : this.start.toISOString(),
			duration      : new Date().getTime() - this.start.getTime(),
			version       : process.env.APP_VERSION || process.env.CODE_VERSION || this.options.appVersion || `0.0.1`,
			suites_ran    : config.suite ? config.suite.join(`, `)               : (config.multiRun || config.repeat ? `RepeatRun` : ``),
			issue_user    : process.env.ISSUE_USER ?? null,
			issue_summary : process.env.ISSUE_SUMMARY ?? null,
			enable_flaky  : Number(process.env.ENABLE_FLAKY) || this.options.enableFlaky || 0,
			passed        : 1,
			failed        : 0,
			suites        : [],
		};

		for(const file of files) {
			if(!file.match(/test-reporter.log/)) {
				continue;
			}

			let tmp = false;
			try {
				const filepath = `${directory}/${file}`;
				tmp            = fs.readFileSync(filepath, { encoding : `utf8` });
			}
			catch(e) {
				fs.writeFileSync(`${this.options.reporterOutputDir}/trio-readfile-error.txt`, e.message, { encoding : `utf-8` });
			}

			const identifier = file.match(/wdio-(\d+-\d+)-/)[1];

			if(!tmp) {
				continue;
			}

			const content   = JSON.parse(tmp);
			const suite_key = btoa(`${identifier}:${content.spec_file}:${content.capabilities}:${content.title}`);

			if(content.passed && Number(process.env.SKIP_PASSED_UPLOADS) === 1) {
				continue;
			}

			suite_data[suite_key] = {
				title        : content.title,
				spec_file    : content.spec_file,
				filepath     : content.filepath,
				capabilities : content.capabilities,
				duration     : content.duration,
				retries      : content.retries || 0,
				passed       : content.passed,
				failed       : content.failed,
				skipped      : content.skipped,
				start        : content.start,
				tests        : [],
			};

			for(const test of content.tests) {
				const hook     = test.type === `hook`;
				const test_key = btoa(`${identifier}:${content.spec_file}:${content.capabilities}:${content.title}:${test.title}`);

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

				if(hook && !all_hooks[suite_key]) {
					all_hooks[suite_key] = [];
				}

				if(hook) {
					all_hooks[suite_key].push(test_data)
				}
			}

			if(all_hooks[suite_key]) {
				suite_data[suite_key].tests = [...suite_data[suite_key].tests, ...all_hooks[suite_key]];
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

		fs.writeFileSync(`${this.options.reporterOutputDir}/trio-end-buildData.txt`, `Ending buildData`, { encoding : `utf-8` });

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

	getApiUrl() {
		return `https://${this.options.apiUrl?.replace(`https://`, ``) || api_url}`;
	}

	getApiRoute() {
		return [
			this.getApiUrl(),
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

export default class TestReporterService {};
export const launcher = TestReporterLauncher;
