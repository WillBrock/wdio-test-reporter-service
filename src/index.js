import fs   from 'fs-extra';
import path from 'path';
import btoa from 'btoa';
import { SevereServiceError } from 'webdriverio';

const api_url = `https://api.e2ereporter.com`;

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

		this.start = new Date();
	}

	async onComplete(exit_code, config) {
		const data = this.buildData(config);

		try {
			await this.post(data);
		}
		catch(e) {
			fs.writeFileSync(`${this.options.reporterOutputDir}/../trio-post-error.txt`, e.message, { encoding : `utf-8` });
			fs.writeFileSync(`${this.options.reporterOutputDir}/trio-post-error.txt`, e.message, { encoding : `utf-8` });
			fs.writeFileSync(`${this.options.reporterOutputDir}/trio-post-error.txt`, `onComplete catch`, { encoding : `utf-8` });
		}
	}

	buildData(config) {
		fs.writeFileSync(`${this.options.reporterOutputDir}/../trio-starting-build.txt`, `test`, { encoding : `utf-8` });
		fs.writeFileSync(`${this.options.reporterOutputDir}/trio-starting-build.txt`, `test`, { encoding : `utf-8` });
		const directory  = path.resolve(this.options.reporterOutputDir);
		const files      = fs.readdirSync(directory);
		const suite_data = {};
		const all_errors = {};
		const all_hooks  = {};

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
			version       : process.env.CODE_VERSION || this.options.codeVersion,
			suites_ran    : config.suite ? config.suite.join(`, `)               : (config.multiRun || config.repeat ? `RepeatRun` : ``),
			issue_user    : process.env.ISSUE_USER ?? null,
			issue_summary : process.env.ISSUE_SUMMARY ?? null,
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
				fs.writeFileSync(`${this.options.reporterOutputDir}/../trio-readfile-error.txt`, e.message, { encoding : `utf-8` });
				fs.writeFileSync(`${this.options.reporterOutputDir}/trio-readfile-error.txt`, e.message, { encoding : `utf-8` });
				fs.writeFileSync(`${this.options.reporterOutputDir}/trio-readfile-error.txt`, `From catch`, { encoding : `utf-8` });
			}
				
			const identifier = file.match(/wdio-(\d+-\d+)-/)[1];

			if(!tmp) {
				continue;
			}

			const content   = JSON.parse(tmp);
			const suite_key = btoa(`${identifier}:${content.spec_file}:${content.capabilities}:${content.title}`);

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

		data.suites = suites;

		fs.writeFileSync(`${this.options.reporterOutputDir}/../trio-ending-build.txt`, `ending`, { encoding : `utf-8` });
		fs.writeFileSync(`${this.options.reporterOutputDir}/trio-ending-build.txt`, `ending`, { encoding : `utf-8` });

		return data;
	}

	post(data) {
		fs.writeFileSync(`${this.options.reporterOutputDir}/../trio-post-data-fetch.txt`, JSON.stringify(data, null, 2), { encoding : `utf-8` });
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

export default class TestReporterService {};
export const launcher = TestReporterLauncher;
