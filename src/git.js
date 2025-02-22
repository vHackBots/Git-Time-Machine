const simpleGit = require("simple-git");

async function getRepoData() {
  const git = simpleGit();
  let isOffline = false;

  const localData = await Promise.all([
    git.branch(),
    git.log(["--all"]),
    git.tags(),
  ]).catch((err) => {
    console.error("Failed to get local repo data:", err);
    return [null, null, null];
  });

  // Try to fetch remote data only after getting local data
  try {
    await git.fetch(["--all"]);
    isOffline = false;
  } catch (error) {
    console.warn("Working in offline mode - using local data only");
    isOffline = true;
  }

  const [localBranches, log, tags] = localData;

  if (!localBranches || !log) {
    throw new Error("Failed to read local repository data");
  }

  // Get local branches first
  const localBranchList = localBranches.all.filter(
    (branch) => !branch.includes("remotes/")
  );

  // Process remote branches and filter out those that exist locally
  const remoteBranchList = isOffline
    ? []
    : localBranches.all
        .filter((branch) => branch.startsWith("remotes/"))
        .map((branch) => {
          const shortName = branch.split("/").slice(2).join("/");
          return {
            name: branch.replace(/^remotes\//, ""),
            fullName: branch,
            remote: branch.split("/")[1],
            shortName: shortName,
          };
        })
        .filter(
          (branch) =>
            // Filter conditions:
            !branch.name.endsWith("/HEAD") && // Remove HEAD references
            !localBranchList.some(
              (localBranch) =>
                // Remove if shortName matches any local branch
                localBranch === branch.shortName ||
                // Also check if the branch name matches without the remote prefix
                localBranch === branch.name.replace(/^origin\//, "")
            )
        );

  // Process commits
  const commits = log.all.map((commit) => ({
    ...commit,
    fullRefs: commit.refs
      .split(",")
      .map((ref) => ref.trim())
      .filter(Boolean),
    refs: commit.refs
      .split(",")
      .map((ref) => ref.trim())
      .filter((ref) => ref && !ref.includes("tag:")),
  }));

  return {
    commits,
    branches: localBranchList,
    remoteBranches: remoteBranchList,
    current: localBranches.current,
    tags: tags?.all || [],
    isOffline,
  };
}

async function getBranchCommits(branchName) {
  const git = simpleGit();
  try {
    // First, find the branch's merge base with main/master
    let baseBranch = "main";
    try {
      await git.show(["main"]);
    } catch {
      baseBranch = "master";
    }

    // Get branch-specific commits using rev-list to find commit range
    const revList = await git.raw([
      "rev-list",
      "--first-parent", // Follow only first parent for merge commits
      branchName, // Start from the branch head
      "^" + baseBranch, // Exclude commits reachable from main/master
      "--not", // Exclude commits from other branches
      "--all", // Consider all refs
    ]);

    // If no branch-specific commits found, get all commits for this branch
    if (!revList.trim()) {
      const log = await git.log(["--first-parent", branchName]);
      return log.all;
    }

    // Get detailed commit info for branch-specific commits
    const commits = [];
    const commitHashes = revList.split("\n").filter((hash) => hash.trim());

    for (const hash of commitHashes) {
      if (!hash) continue;

      const commitInfo = await git.show([
        "--format=%H%n%an%n%ae%n%at%n%s%n%D",
        "--no-patch",
        hash,
      ]);

      const [
        commitHash,
        authorName,
        authorEmail,
        timestamp,
        subject,
        refs = "",
      ] = commitInfo.split("\n");

      commits.push({
        hash: commitHash,
        author_name: authorName,
        author_email: authorEmail,
        date: new Date(parseInt(timestamp) * 1000).toISOString(),
        message: subject,
        refs: refs,
      });
    }

    return commits;
  } catch (error) {
    console.error("Failed to get branch commits:", error);
    throw error;
  }
}

async function compareCommits(commit1, commit2) {
  const git = simpleGit();

  try {
    const diff = await git.diff([commit1, commit2]);
    return diff;
  } catch (error) {
    console.error("Failed to compare commits:", error);
    throw new Error(`Failed to compare commits: ${error.message}`);
  }
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
  getBranchCommits,
  compareCommits,
  checkoutRemoteBranch,
};
