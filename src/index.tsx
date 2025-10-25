#!/usr/bin/env node

import 'dotenv/config';
import React from 'react';
import { render } from 'ink';
import { App } from './App.js';
import { parseCliArgs } from './utils/cli.js';

// Parse CLI arguments and render the app
const cliArgs = parseCliArgs();
render(<App cliArgs={cliArgs} />);