#!/usr/bin/env node

import 'dotenv/config';
import React from 'react';
import { render } from 'ink';
import { App } from './App.js';
import { parseCliArgs } from './utils/cli.js';
import { InitCommand } from './commands/InitCommand.js';

async function main() {
  // Parse CLI arguments
  const cliArgs = parseCliArgs();

  // Handle init command
  if (cliArgs.command === 'init') {
    const initCommand = new InitCommand();
    await initCommand.execute();
    process.exit(0);
  }

  // Render the main app for all other cases
  render(<App cliArgs={cliArgs} />);
}

main().catch((error) => {
  console.error('❌ Errore fatale:', error);
  process.exit(1);
});