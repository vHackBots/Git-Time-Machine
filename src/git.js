const simpleGit = require("simple-git");

async function getRepoData() {
  const git = simpleGit();

  // First fetch from all remotes to ensure we have latest data
  try {
    await git.fetch(["--all"]);
  } catch (error) {
    console.warn("Failed to fetch from remote:", error.message);
  }

  const [log, branches, tags, remotes] = await Promise.all([
    git.log(["--all"]),
    git.branch(["-a"]),
    git.tags(),
    git.getRemotes(true), // true to get additional details
  ]);

  // Get local branches
  const localBranches = branches.all.filter(
    (branch) => !branch.includes("remotes/")
  );

  // Get remote branches but exclude those that exist locally
  const remoteBranches = branches.all
    .filter((branch) => branch.startsWith("remotes/"))
    .map((branch) => ({
      name: branch.replace(/^remotes\//, ""),
      fullName: branch,
      remote: branch.split("/")[1],
      shortName: branch.split("/").slice(2).join("/"),
    }))
    .filter(
      (branch) =>
        !branch.name.endsWith("/HEAD") &&
        !localBranches.includes(branch.shortName) // Filter out remotes that exist locally
    );

  // Combine commit data with reference information
  const commits = log.all.map((commit) => ({
    ...commit,
    fullRefs: commit.refs
      .split(",")
      .map((ref) => ref.trim())
      .filter(Boolean),
    // Include remote references in the refs check
    refs: commit.refs
      .split(",")
      .map((ref) => ref.trim())
      .filter((ref) => ref && !ref.includes("tag:"))
      .map((ref) => ref.replace("origin/", "")),
  }));

  return {
    commits,
    branches: localBranches,
    remoteBranches,
    current: branches.current,
    tags: tags.all,
    remotes: remotes,
  };
}

async function compareCommits(commit1, commit2) {
  const git = simpleGit();

  // Handle remote references properly
  const resolveRef = async (ref) => {
    if (ref.includes("origin/")) {
      try {
        const hash = await git.revparse([ref]);
        return hash;
      } catch (error) {
        return ref;
      }
    }
    return ref;
  };

  const [resolvedCommit1, resolvedCommit2] = await Promise.all([
    resolveRef(commit1),
    resolveRef(commit2),
  ]);

  const diff = await git.diff([resolvedCommit1, resolvedCommit2]);
  return diff;
}

async function checkoutRemoteBranch(branchName) {
  const git = simpleGit();
  try {
    // Create and checkout the new branch tracking the remote one
    await git.checkout([
      "-b",
      branchName.split("/").slice(2).join("/"),
      "--track",
      branchName,
    ]);
    return true;
  } catch (error) {
    console.error("Failed to checkout branch:", error.message);
    return false;
  }
}

module.exports = {
  getRepoData,
  compareCommits,
  checkoutRemoteBranch,
};
