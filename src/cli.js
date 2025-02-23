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
import { promisify } from "util";

const figletPromise = promisify(figlet);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_PORT = 7890;
const GIT_ORANGE = "#e84d31";
const WHITE = "#ffffff";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function displayBanner() {
  const banner = await figletPromise("Git Time Machine", {
    font: "Standard",
    horizontalLayout: "default",
    verticalLayout: "default",
    width: 80,
    whitespaceBreak: true,
  });

  console.log(banner);
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
  await displayBanner();
  console.log(chalk.yellow(`⚠️  Error: ${errorMessage}\n`));
  console.log(helpText + "\n");
  console.log(chalk.red("Exiting...\n"));
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
      `Not a git repository: ${chalk.blue(
        fullPath
      )}\nMake sure the directory contains a .git folder`
    );
  }

  spinner.succeed(chalk.green("Repository validated successfully"));
  return fullPath;
}

const helpText = [
  chalk.bold("Usage:"),
  `  $ ${chalk.hex(GIT_ORANGE)("git-tm")} ${chalk.cyan(
    "<repository-path>"
  )} [options]`,
  "",
  chalk.bold("Examples:"),
  `  $ ${chalk.hex(GIT_ORANGE)("git-tm .")}                  ${chalk.dim(
    "Start with current directory"
  )}`,
  `  $ ${chalk.hex(GIT_ORANGE)("git-tm ./my-project")}       ${chalk.dim(
    "Start with specific repository"
  )}`,
  `  $ ${chalk.hex(GIT_ORANGE)("git-tm -p 8000 ./repo")}     ${chalk.dim(
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
  `  ${chalk.blue("https://github.com/vHackBots/Git-Time-Machine")}`,
].join("\n");

function createBox(content, options = {}) {
  const terminalWidth = process.stdout.columns || 80;
  const boxWidth = Math.min(70, terminalWidth - 4);

  return boxen(content, {
    padding: 1,
    margin: {
      top: 1,
      bottom: 1,
      left: Math.floor((terminalWidth - boxWidth) / 2),
      right: 0,
    },
    borderStyle: "round",
    borderColor: "cyan",
    width: boxWidth,
    textAlignment: "center",
    float: "center",
    ...options,
  });
}

program
  .name("git-tm")
  .description("Interactive Git repository visualization tool")
  .argument("<repo-path>", "path to git repository")
  .option(
    "-p, --port <number>",
    "port to run the server on",
    DEFAULT_PORT.toString()
  )
  .addHelpText("after", "\n" + helpText + "\n")
  .showHelpAfterError(true)
  .action(async (repoPath, options) => {
    await displayBanner();
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
            chalk.cyan("🎉 Ready to explore your Git history!"),
            "",
            chalk.dim("Press Ctrl+C to stop the server"),
          ]
            .map((line) => centerAlign(line, { columns: 60 }))
            .join("\n")
        )
      );

      const centerMessage = (msg) =>
        console.log(centerAlign(msg, { columns: process.stdout.columns }));

      centerMessage(chalk.dim("Launching browser in 2 seconds..."));
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
      await displayBanner();
      console.log(helpText + "\n");
      process.exit(1);
    }
    throw err;
  });

program.parse(process.argv);
