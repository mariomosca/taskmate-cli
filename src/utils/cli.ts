import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { UIMessageManager } from './UIMessages.js';

export interface CLIArgs {
  resume?: boolean;
  sessionId?: string;
  debug?: boolean;
  provider?: string;
  message?: string;
  verbose?: boolean;
}

export function parseCliArgs(): CLIArgs {
  const argv = yargs(hideBin(process.argv))
    .option('resume', {
      alias: 'r',
      type: 'boolean',
      description: UIMessageManager.getMessage('resumeDescription'),
      default: false
    })
    .option('session-id', {
      alias: 's',
      type: 'string',
      description: UIMessageManager.getMessage('sessionIdDescription')
    })
    .option('debug', {
      alias: 'd',
      type: 'boolean',
      description: 'Enable debug mode',
      default: false
    })
    .option('provider', {
      alias: 'p',
      type: 'string',
      choices: ['claude', 'gemini'],
      description: 'LLM provider to use'
    })
    .option('message', {
      alias: 'm',
      type: 'string',
      description: 'Send an initial message to start the conversation'
    })
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      description: 'Show detailed CLI argument processing and debug information'
    })
    .help()
    .alias('help', 'h')
    .example('$0', UIMessageManager.getMessage('startExample'))
    .example('$0 --resume', 'Show available sessions for resuming')
    .example('$0 --resume --session-id abc123', UIMessageManager.getMessage('resumeExample'))
    .example('$0 --provider claude', 'Use Claude as LLM provider')
    .example('$0 --message "Help me organize my tasks"', 'Start with an initial message')
    .parseSync();

  return {
    resume: argv.resume,
    sessionId: argv['session-id'],
    debug: argv.debug,
    provider: argv.provider,
    message: argv.message,
    verbose: argv.verbose
  };
}

export function validateCliArgs(args: CLIArgs): { valid: boolean; error?: string } {
  // If session-id is specified, it must be used with --resume
  if (args.sessionId && !args.resume) {
    return {
      valid: false,
      error: 'The --session-id option can only be used with --resume'
    };
  }

  return { valid: true };
}