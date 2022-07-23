import { Command } from 'commander';
import prepareFrameworkBuild from './prepareFrameworkBuild';

export const program = new Command();

program.command('prepareFrameworkBuild').action(prepareFrameworkBuild);
