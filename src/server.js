const express = require('express');
const path = require('path');
const { getRepoData, compareCommits } = require('./git');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/repo-data', async (req, res) => {
  try {
    const data = await getRepoData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/compare', async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: 'Missing commit hashes' });
    }
    const diff = await compareCommits(from, to);
    res.send(diff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function startServer(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, async () => {
      try {
        const openModule = await import('open');
        await openModule.default(`http://localhost:${port}`);
        resolve(port);
      } catch (error) {
        console.warn('Failed to open browser automatically.');
        console.log('Please open your browser and visit:');
        resolve(port);
      }
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        const nextPort = parseInt(port) + 1;
        console.log(`\n⚠️  Port ${port} is in use.`);
        console.log(`↪️  Trying port ${nextPort}...\n`);
        startServer(nextPort).then(resolve).catch(reject);
      } else {
        reject(error);
      }
    });
  });
}

module.exports = { startServer };
