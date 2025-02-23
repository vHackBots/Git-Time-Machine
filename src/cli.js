#!/usr/bin/env node

import { program } from 'commander';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import boxen from 'boxen';
import centerAlign from 'center-align';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { startServer } from './server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_PORT = 7890;

const banner = boxen(
    centerAlign([
        chalk.hex("#e84d31")('Git') + ' Time Machine',
    ].join('\n'), { columns: 40 }), 
    {
        padding: 2,
        margin: 1,
        borderColor: 'cyan',
        borderStyle: 'round'
    }
);

const helpText = [
    chalk.bold('Usage:'),
    `  $ ${chalk.green('git-tm')} ${chalk.cyan('<repository-path>')} [options]`,
    '',
    chalk.bold('Examples:'),
    `  $ ${chalk.green('git-tm .')}                  Start with current directory`,
    `  $ ${chalk.green('git-tm ./my-project')}       Start with specific repository`,
    `  $ ${chalk.green('git-tm -p 8000 ./repo')}     Start with custom port`,
    '',
    chalk.bold('Options:'),
    `  ${chalk.cyan('-p, --port')} <number>    Port to run the server (default: ${DEFAULT_PORT})`,
    `  ${chalk.cyan('-h, --help')}             Display this help message`,
    `  ${chalk.cyan('-V, --version')}          Output the version number`,
    '',
    chalk.bold('More Info:'),
    `  ${chalk.blue('https://github.com/vHackBots/Git-Time-Machine')}`
].join('\n');

function validateGitRepo(repoPath) {
    const fullPath = path.resolve(process.cwd(), repoPath);
    const gitPath = path.join(fullPath, '.git');

    if (!fs.existsSync(fullPath)) {
        console.error(chalk.red('\n✘ Error: Directory does not exist:'), chalk.yellow(fullPath));
        process.exit(1);
    }

    if (!fs.existsSync(gitPath)) {
        console.error(chalk.red('\n✘ Not a git repository:'), chalk.blue(fullPath));
        console.error('\nMake sure the directory contains a .git folder');
        process.exit(1);
    }

    return fullPath;
}

program
    .name('git-tm')
    .description('Interactive Git repository visualization tool')
    .argument('<repo-path>', 'path to git repository')
    .option('-p, --port <number>', 'port to run the server on', DEFAULT_PORT.toString())
    .addHelpText('after', '\n' + helpText + '\n')
    .showHelpAfterError(false)
    .action(async (repoPath, options) => {
        console.log(banner);
        
        const fullPath = validateGitRepo(repoPath);
        process.chdir(fullPath);

        try {
            const port = await startServer(parseInt(options.port));
            console.log(boxen(
                [
                    chalk.cyan.bold('📂 Repository Information'),
                    `${chalk.white('Path:')} ${chalk.yellow(fullPath)}`,
                    '',
                    chalk.cyan.bold('🚀 Server Information'),
                    `${chalk.white('URL:')}  ${chalk.green(`http://localhost:${port}`)}`,
                    `${chalk.white('Port:')} ${chalk.green(port)}`,
                    '',
                    chalk.dim('Press Ctrl+C to stop the server')
                ].join('\n'),
                {
                    padding: 1,
                    margin: { top: 0, bottom: 1 },
                    borderColor: 'gray',
                    borderStyle: 'single',
                    dimBorder: true
                }
            ));
        } catch (error) {
            console.error(boxen(
                chalk.red('✘ Error: ') + error.message,
                {
                    padding: 1,
                    margin: { top: 1 },
                    borderColor: 'red',
                    borderStyle: 'single'
                }
            ));
            process.exit(1);
        }
    })
    .exitOverride((err) => {
        if (err.code === 'commander.missingArgument') {
            console.log(banner);
            console.log(helpText + '\n');
            process.exit(1);
        }
        throw err;
    });

program.parse(process.argv);