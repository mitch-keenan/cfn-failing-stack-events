# cfn-failing-stacks

This is a command line tool that finds the AWS Cloudformation stack events within a given stack and time period which have 'UPDATE_FAILED' or 'CREATE_FAILED' resource statuses. This includes nested stacks; allowing you to quickly find the cause of failed stack deployments.

## Dependencies

* [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

## Usage

```
Usage: cfn-failing-stacks [options] <string>

Finds the AWS Cloudformation stack events within a given stack and time period which have 'UPDATE_FAILED' or 'CREATE_FAILED' resource statuses. This includes nested stacks; allowing you to quickly find the cause of failed stack deployments.

Arguments:
  string                    The stack name or ARN to search within

Options:
  -s, --startTime <string>  The starting time boundary to find events within. Should be a JS parsable date in your timezone (default: "Now")
  -e, --endTime <string>    The ending time boundary to find events within. Should be a JS parsable date in your timezone (default: "One hour ago")
  -h, --help                display help for command
```