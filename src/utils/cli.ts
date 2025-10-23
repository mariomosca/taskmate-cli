import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

export interface CLIArgs {
  resume?: boolean;
  sessionId?: string;
  debug?: boolean;
  provider?: string;
}

export function parseCliArgs(): CLIArgs {
  const argv = yargs(hideBin(process.argv))
    .option('resume', {
      alias: 'r',
      type: 'boolean',
      description: 'Riprendi una sessione esistente',
      default: false
    })
    .option('session-id', {
      alias: 's',
      type: 'string',
      description: 'ID della sessione da riprendere (usato con --resume)'
    })
    .option('debug', {
      alias: 'd',
      type: 'boolean',
      description: 'Abilita modalità debug',
      default: false
    })
    .option('provider', {
      alias: 'p',
      type: 'string',
      choices: ['claude', 'gemini'],
      description: 'Provider LLM da utilizzare'
    })
    .help()
    .alias('help', 'h')
    .example('$0', 'Avvia una nuova sessione chat')
    .example('$0 --resume', 'Mostra le sessioni disponibili per la ripresa')
    .example('$0 --resume --session-id abc123', 'Riprendi la sessione specifica')
    .example('$0 --provider claude', 'Usa Claude come provider LLM')
    .parseSync();

  return {
    resume: argv.resume,
    sessionId: argv['session-id'],
    debug: argv.debug,
    provider: argv.provider
  };
}

export function validateCliArgs(args: CLIArgs): { valid: boolean; error?: string } {
  // Se è specificato un session-id, deve essere usato con --resume
  if (args.sessionId && !args.resume) {
    return {
      valid: false,
      error: 'L\'opzione --session-id può essere usata solo con --resume'
    };
  }

  return { valid: true };
}