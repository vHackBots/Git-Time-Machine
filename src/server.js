#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const chalk = require('chalk');
const path = require('path');
const { getCommits, getBranches, compareCommits } = require('./git-utils');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/commits', async (req, res) => {
  try {
    const commits = await getCommits();
    res.json(commits);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch commits' });
  }
});

app.get('/api/branches', async (req, res) => {
  try {
    const branches = await getBranches();
    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

app.get('/api/compare', async (req, res) => {
  const { commit1, commit2 } = req.query;
  if (!commit1 || !commit2) {
    return res.status(400).json({ error: 'Two commit hashes are required' });
  }
  try {
    const diff = await compareCommits(commit1, commit2);
    res.json(diff);
  } catch (error) {
    res.status(500).json({ error: 'Failed to compare commits' });
  }
});

app.listen(PORT, () => {
  console.log(chalk.green(`GitHub Time Machine running at http://localhost:${PORT}`));
  console.log(chalk.cyan('Reading data from .git folder...'));
});