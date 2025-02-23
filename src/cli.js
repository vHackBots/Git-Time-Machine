#!/usr/bin/env node

import { program } from "commander";
import path from "path";
import fs from "fs";
import chalk from "chalk";
import boxen from "boxen";
import centerAlign from "center-align";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { startServer } from "./server.js";
import ora from "ora";
import figlet from "figlet";
import gradient from "gradient-string";
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(
  await readFile(
    new URL('../package.json', import.meta.url)
  )
);

const VERSION = packageJson.version;
const DEFAULT_PORT = 7890;
const GIT_ORANGE = "#e84d31";
const WHITE = "#ffffff";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function displayBanner() {
  const banner = await new Promise((resolve, reject) => {
    figlet("Git Time Machine", {
      font: "Standard",
      horizontalLayout: "default",
      verticalLayout: "default",
      width: 80,
      whitespaceBreak: true,
    }, (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(data);
    });
  });

  const bannerGradient = gradient(GIT_ORANGE, WHITE);
  console.log(bannerGradient(banner));
}

function createSpinner(text) {
  return ora({
    text,
    color: "cyan",
    spinner: {
      frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
    },
  });
}

async function showErrorAndHelp(errorMessage, exitCode = 1) {
  console.log(chalk.yellow(`⚠️  Error: ${errorMessage}\n`));
  console.log(await getHelpText() + "\n");
  process.exit(exitCode);
}

async function validateGitRepo(repoPath) {
  const spinner = createSpinner("Validating repository...");
  spinner.start();

  const fullPath = path.resolve(process.cwd(), repoPath);
  const gitPath = path.join(fullPath, ".git");

  if (!fs.existsSync(fullPath)) {
    spinner.fail(chalk.red("Repository validation failed"));
    await showErrorAndHelp(
      `Directory does not exist: ${chalk.yellow(fullPath)}`
    );
  }

  if (!fs.existsSync(gitPath)) {
    spinner.fail(chalk.red("Repository validation failed"));
    await showErrorAndHelp(
      `Not a git repository: ${chalk.white(
        fullPath
      )}\nMake sure the directory contains a .git folder`
    );
  }

  spinner.succeed(chalk.green("Repository validated successfully"));
  return fullPath;
}

async function getHelpText() {
  return [

    chalk.bold("Usage:"),
    `  $ ${chalk.hex(GIT_ORANGE)("git-tm")} ${chalk.cyan(
      "<repository-path>"
    )} [options]`,
    "",
    chalk.bold("Examples:"),
    `  $ ${chalk.hex(GIT_ORANGE)("git-tm")} .                  ${chalk.dim(
      "Start with current directory"
    )}`,
    `  $ ${chalk.hex(GIT_ORANGE)("git-tm")} ./my-project       ${chalk.dim(
      "Start with specific repository"
    )}`,
    `  $ ${chalk.hex(GIT_ORANGE)("git-tm")} ${chalk.cyan("-p")} 8000 ./repo     ${chalk.dim(
      "Start with custom port"
    )}`,
    "",
    chalk.bold("Options:"),
    `  ${chalk.cyan("-p, --port")} <number>    ${chalk.dim(
      "Port to run the server (default: " + DEFAULT_PORT + ")"
    )}`,
    `  ${chalk.cyan("-h, --help")}             ${chalk.dim(
      "Display this help message"
    )}`,
    `  ${chalk.cyan("-V, --version")}          ${chalk.dim(
      "Output the version number"
    )}`,
    "",
    chalk.bold("More Info:"),
    `  ${chalk.yellow("https://github.com/vHackBots/Git-Time-Machine")}`,
  ].join("\n");
}

function createBox(content, options = {}) {
  const terminalWidth = process.stdout.columns || 80;
  const boxWidth = Math.min(70, terminalWidth - 4);

  return boxen(content, {
    padding: 1,
    margin: {
      top: 1,
      bottom: 1,
      left: 2,
      right: 0,
    },
    borderStyle: "round",
    borderColor: "cyan",
    width: boxWidth,
    textAlignment: "left",
    float: "left",
    ...options,
  });
}

if (process.argv.includes('-v') || process.argv.includes('--version')) {
  console.log("\n"+chalk.hex("#e84d31")("git-tm") + ` version: ${chalk.cyan(VERSION)}`);
  process.exit(0);
}

program
  .name("git-tm")
  .description("Interactive Git repository visualization tool")
  .version(VERSION, '-v, --version', 'Output the current version')
  .argument("[repo-path]", "path to git repository")
  .option(
    "-p, --port <number>",
    "port to run the server on",
    DEFAULT_PORT.toString()
  )
  .helpOption(false)
  .addOption(new program.Option("-h, --help", "display help").hideHelp())
  .action(async (repoPath, options) => {
    if (options.help) {
      console.log(await getHelpText() + "\n");
      process.exit(0);
    }
    if (!repoPath) {
      console.log(await getHelpText() + '\n');
      process.exit(0);
    }

    await displayBanner();
    console.log();
    
    const fullPath = await validateGitRepo(repoPath);
    process.chdir(fullPath);

    const startingSpinner = createSpinner("Starting server...");
    startingSpinner.start();

    try {
      const port = await startServer(parseInt(options.port));
      startingSpinner.succeed(chalk.green("Server started successfully"));

      console.log(
        createBox(
          [
            chalk.cyan.bold("📂 Repository Information"),
            `${chalk.white("Path:")} ${chalk.yellow(fullPath)}`,
            "",
            chalk.cyan.bold("🚀 Server Information"),
            `${chalk.white("URL:")}  ${chalk.green(
              `http://localhost:${port}`
            )}`,
            `${chalk.white("Port:")} ${chalk.cyan(port)}`,
            "",
            chalk.dim("Press Ctrl+C to stop the server"),
          ].join("\n") 
        )
      );

      await sleep(5000);

      process.on("SIGINT", async () => {
        console.log(
          centerAlign(chalk.cyan("\nThanks for using Git Time Machine! 👋\n"))
        );
        process.exit(0);
      });
    } catch (error) {
      startingSpinner.fail(chalk.red("Failed to start server"));
      console.log(chalk.red(`Error: ${error.message}\n`));
      process.exit(1);
    }
  })
  .exitOverride(async (err) => {
    if (err.code === "commander.missingArgument") {
      console.log(await getHelpText() + "\n");
      process.exit(1);
    }
    throw err;
  });

program.parse(process.argv);
