#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const { startServer } = require('./server');

const DEFAULT_PORT = 7890;

program
  .name('git-tm')
  .description('Git Time Machine - Visualize your Git repository')
  .version('0.1.0')
  .option('-p, --port <number>', 'port to run the server on', DEFAULT_PORT.toString())
  .action(async (options) => {
    const gitPath = path.join(process.cwd(), '.git');
    
    if (!fs.existsSync(gitPath)) {
      console.error('Error: Not a git repository (or any parent up to mount point)');
      process.exit(1);
    }

    try {
      const port = await startServer(parseInt(options.port));
      console.log('🎯 Git Time Machine is ready!');
      console.log(`\n\t📡 Local:   http://localhost:${port}`);
      console.log(`\t🛜  Network: http://${getLocalIP()}:${port}\n`);
    } catch (error) {
      console.error('Failed to start server:', error.message);
      process.exit(1);
    }
  });

function getLocalIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

program.parse();
