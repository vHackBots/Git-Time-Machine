#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { startServer } = require('./server');

const DEFAULT_PORT = 7890;

const banner = `
${chalk.cyan('┌─────────────────────────────────┐')}
${chalk.cyan('│')}      ${chalk.hex("#e84d31")('Git')} Time Machine           ${chalk.cyan('│')}
${chalk.cyan('└─────────────────────────────────┘')}`;

const helpText = `
Usage:
  $ ${chalk.green('git-tm')} ${chalk.cyan('<repository-path>')} [options]

Examples:
  $ ${chalk.green('git-tm .')}                  Start with current directory
  $ ${chalk.green('git-tm ./my-project')}       Start with specific repository
  $ ${chalk.green('git-tm -p 8000 ./repo')}     Start with custom port

Options:
  ${chalk.cyan('-p, --port')} <number>    Port to run the server (default: ${DEFAULT_PORT})
  ${chalk.cyan('-h, --help')}             Display this help message
  ${chalk.cyan('-V, --version')}          Output the version number

For more information: ${chalk.blue('https://github.com/vHackBots/Git-Time-Machine')}`;

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
    .addHelpText('after', helpText)
    .showHelpAfterError(false)
    .action(async (repoPath, options) => {
        console.log(banner);
        
        const fullPath = validateGitRepo(repoPath);
        process.chdir(fullPath);

        try {
            const port = await startServer(parseInt(options.port));
            console.log('\n' + chalk.cyan('📂 Repository Information'));
            console.log(chalk.white('  Path:'), chalk.yellow(fullPath));
            
            console.log('\n' + chalk.cyan('🚀 Server Information'));
            console.log(chalk.white('  URL: '), chalk.green(`http://localhost:${port}`));
            console.log(chalk.white('  Port:'), chalk.green(port));
            
            console.log('\n' + chalk.dim('Press Ctrl+C to stop the server\n'));
        } catch (error) {
            console.error(chalk.red('\n✘ Error:'), error.message);
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
if (require.main === module) {
    program.parse(process.argv);
}
