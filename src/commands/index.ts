import { Command } from 'commander';
import prepareFrameworkBuild from './prepareFrameworkBuild.js';

export const program = new Command();

program.command('prepareFrameworkBuild').action(prepareFrameworkBuild);
