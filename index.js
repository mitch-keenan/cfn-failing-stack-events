#! /usr/bin/env node

const { program } = require("commander");
const { exec } = require("child_process");

const DESCRIPTION =
	"Finds the AWS Cloudformation stack events within a given stack and time period which have 'UPDATE_FAILED' or 'CREATE_FAILED' resource statuses. This includes nested stacks; allowing you to quickly find the cause of failed stack deployments.";
const DEFAULT_LABEL_START = "Now";
const DEFAULT_LABEL_END = "One hour ago";

program
	.name("cfn-failing-stacks")
	.description(DESCRIPTION)
	.argument("<string>", "The stack name or ARN to search within")
	.option(
		"-s, --startTime <string>",
		"The starting time boundary to find events within. Should be a JS parsable date in your timezone",
		DEFAULT_LABEL_START
	)
	.option(
		"-e, --endTime <string>",
		"The ending time boundary to find events within. Should be a JS parsable date in your timezone",
		DEFAULT_LABEL_END
	)
	.action(main);

const FAILURE_STATES = {
	["UPDATE_FAILED"]: true,
	["CREATE_FAILED"]: true,
};

const getDefaultStartDate = () => {
	// An hour ago
	return new Date(Date.now() - 1000 * 60 * 60);
};

const execPromise = (cmd) => {
	return new Promise((res, rej) => {
		exec(cmd, { maxBuffer: 1024 * 50000 }, (error, stdout, stderr) => {
			if (error) return rej({ error, stderr });
			res(stdout);
		});
	});
};

/**
 * getStackEvents finds all events for a given stack with failing statuses; then
 * calls itself recursively on the child stacks that those events refer to.
 * It returns an array of all of the events with failing statuses in the entire
 * stack within the given time period
 */
async function getStackEvents(name, start, end) {
	console.log(`\tgetting events for ${name}...`);
	const eventsStr = await execPromise(
		`aws cloudformation describe-stack-events --stack-name ${name}`
	);
	const events = JSON.parse(eventsStr).StackEvents;
	const filtered = events
		.filter((e) => FAILURE_STATES[e.ResourceStatus])
		.map((e) => ({
			...e,
			Timestamp: new Date(e.Timestamp).getTime(),
		}))
		.filter((e) => e.Timestamp > start && e.Timestamp < end)
		.map((e) => ({
			...e,
			Time: new Date(e.Timestamp),
			ResourceProperties: e.ResourceProperties
				? JSON.parse(e.ResourceProperties)
				: null,
		}));

	if (!filtered.length) return [];
	const promises = filtered.map((f) => {
		const childId = f.PhysicalResourceId;
		if (!childId || childId === f.StackId) {
			return Promise.resolve(f);
		}
		return getStackEvents(childId, start, end)
			.then((res) => [f, ...res])
			.catch((err) => {
				console.error(`Error getting stack events for ${name}`);
				console.error(err);
				throw err;
			});
	});
	const resultArrays = await Promise.all(promises);
	let results = [];
	resultArrays.forEach((ra) => (results = results.concat(ra)));
	return results;
}

async function findAndLogFailingEvents(stackName, start, end) {
	try {
		const events = await getStackEvents(stackName, start, end);
		console.log(JSON.stringify(events, null, "\t"));
	} catch (e) {
		console.error(e);
		process.abort(1);
	}
}

function main(stackName, options) {
	const startDate =
		options.startTime === DEFAULT_LABEL_START
			? getDefaultStartDate()
			: new Date(options.startTime);
	const startTimestamp = startDate.getTime();

	const endDate =
		options.endTime === DEFAULT_LABEL_END
			? new Date()
			: new Date(options.endTime);
	const endTimestamp = endDate.getTime();

	console.log(
		`Finding failing stack events between ${startDate.toISOString()} and ${endDate.toISOString()} for stack ${stackName}`
	);
	findAndLogFailingEvents(stackName, startTimestamp, endTimestamp);
}

program.parse();
