import simpleGit from 'simple-git';

async function getRepoData() {
  const git = simpleGit();
  let isOffline = false;

  const localData = await Promise.all([
    git.branch(),
    git.log(["--all"]),
    git.tags(),
    git.raw(["remote"]),
  ]).catch((err) => {
    console.error("Failed to get local repo data:", err);
    return [null, null, null, ""];
  });

  try {
    await git.fetch(["--all"]);
    isOffline = false;
  } catch (error) {
    console.warn("Working in offline mode - using local data only");
    isOffline = true;
  }

  const [localBranches, log, tags, remotes] = localData;

  if (!localBranches || !log) {
    throw new Error("Failed to read local repository data");
  }

  const localBranchList = localBranches.all.filter(
    (branch) => !branch.includes("remotes/")
  );

  let remoteBranchList = [];
  if (!isOffline && remotes) {
    try {
      const remoteBranches = await git.raw([
        "for-each-ref",
        "refs/remotes",
        "--format=%(refname:short)",
      ]);

      remoteBranchList = remoteBranches
        .split("\n")
        .filter(
          (branch) =>
            branch &&
            !branch.endsWith("/HEAD") &&
            branch.split("/").length > 1 &&
            !localBranchList.some((localBranch) =>
              branch.endsWith("/" + localBranch)
            )
        )
        .map((branch) => ({
          name: branch.trim(),
          fullName: "remotes/" + branch.trim(),
          remote: branch.split("/")[0],
          shortName: branch.split("/").slice(1).join("/"),
        }));
    } catch (error) {
      console.error("Failed to get remote branches:", error);
    }
  }

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
    
    const { current: currentBranch } = await git.branch();
    let baseBranch = currentBranch;

    if (currentBranch !== 'main' && currentBranch !== 'master') {
      try {
        await git.show(["main"]);
        baseBranch = "main";
      } catch {
        try {
          await git.show(["master"]);
          baseBranch = "master";
        } catch {
          baseBranch = currentBranch;
        }
      }
    }

    let targetBranch = branchName;
    if (branchName.startsWith("remotes/")) {
      if (branchName === "remotes/origin" || !branchName.includes("/")) {
        return [];
      }
      targetBranch = branchName.replace("remotes/", "refs/remotes/");
    }

    if (targetBranch === baseBranch) {
      const log = await git.log(["--first-parent", targetBranch]);
      return log.all;
    }

    const revList = await git.raw([
      "rev-list",
      "--first-parent",
      targetBranch,
      "^" + baseBranch,
      "--not",
      "--all",
    ]);

    if (!revList.trim()) {
      const log = await git.log(["--first-parent", targetBranch]);
      return log.all;
    }

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
    const diff = await git.raw([
      "diff",
      "--binary",
      "-p",
      "--no-color",
      commit1,
      commit2,
    ]);
    return diff;
  } catch (error) {
    console.error("Failed to compare commits:", error);
    throw new Error(`Failed to compare commits: ${error.message}`);
  }
}

async function checkoutRemoteBranch(branchName) {
  const git = simpleGit();
  try {
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

export {
  getRepoData,
  getBranchCommits,
  compareCommits,
  checkoutRemoteBranch,
};