const git = require('isomorphic-git');
const fs = require('fs');
const path = require('path');

const dir = process.cwd();

async function getCommits() {
  const commits = await git.log({ fs, dir });
  return commits.map(commit => ({
    hash: commit.oid,
    message: commit.commit.message,
    author: commit.commit.author.name,
    date: new Date(commit.commit.author.timestamp * 1000).toISOString(),
  }));
}

async function getBranches() {
  const branches = await git.listBranches({ fs, dir });
  const branchDetails = await Promise.all(
    branches.map(async (branch) => {
      const ref = await git.resolveRef({ fs, dir, ref: branch });
      return { name: branch, head: ref };
    })
  );
  return branchDetails;
}

async function compareCommits(commit1, commit2) {
  const diff = await git.walk({
    fs,
    dir,
    trees: [git.TREE({ fs, ref: commit1 }), git.TREE({ fs, ref: commit2 })],
    map: async (filepath, [A, B]) => {
      if (!A || !B) return { path: filepath, change: A ? 'deleted' : 'added' };
      const aContent = await A.content();
      const bContent = await B.content();
      if (aContent.toString() !== bContent.toString()) {
        return { path: filepath, change: 'modified' };
      }
      return null;
    },
  });
  return diff.filter(Boolean);
}

module.exports = { getCommits, getBranches, compareCommits };