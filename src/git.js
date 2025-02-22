const simpleGit = require('simple-git');

async function getRepoData() {
  const git = simpleGit();
  
  const [log, branches, tags] = await Promise.all([
    git.log(['--all']),
    git.branch(),
    git.tags()
  ]);

  return {
    commits: log.all,
    branches: branches.all,
    current: branches.current,
    tags: tags.all
  };
}

async function compareCommits(commit1, commit2) {
  const git = simpleGit();
  const diff = await git.diff([commit1, commit2]);
  return diff;
}

module.exports = {
  getRepoData,
  compareCommits
};
