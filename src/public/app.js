let selectedCommits = {
  first: null,
  second: null,
};

let currentBranch = null;
let allCommits = [];

async function fetchRepoData() {
  const response = await fetch("/api/repo-data");
  const data = await response.json();
  return data;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return (
    date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }) +
    " " +
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
  );
}

function renderTimeline(commits) {
  const timeline = document.getElementById("timeline");
  timeline.innerHTML = commits
    .map(
      (commit) => `
            <div class="commit" data-hash="${commit.hash}">
                <div class="commit-hash">${commit.hash.slice(0, 7)}</div>
                <div class="commit-message">${commit.message}</div>
                <div class="commit-author">${commit.author_name}</div>
                <div class="commit-date">${formatDate(commit.date)}</div>
            </div>
        `
    )
    .join("");

  timeline.querySelectorAll(".commit").forEach((commitElement) => {
    commitElement.addEventListener("click", () =>
      handleCommitClick(commitElement)
    );
  });
}

function renderBranches(branches, currentBranchName, remoteBranches) {
  const branchList = document.getElementById("branch-list");

  // Local branches section
  const localBranchesHtml = branches
    .map(
      (branch) => `
        <div class="branch-item ${
          branch === currentBranchName ? "active" : ""
        }" 
             data-branch="${branch}">
            ${branch}
        </div>
    `
    )
    .join("");

  // Remote branches section with proper remote names
  const remoteBranchesHtml = remoteBranches?.length
    ? `
      <div class="branch-section">
        <h3>Remote Branches</h3>
        ${remoteBranches
          .map(
            (branch) => `
              <div class="branch-item remote" 
                   data-branch="${branch.fullName}"
                   data-remote="${branch.remote}"
                   title="${branch.fullName}">
                ${branch.remote}/${branch.shortName}
              </div>
            `
          )
          .join("")}
      </div>
    `
    : "";

  branchList.innerHTML = `
    <div class="branch-section">
      <h3>Local Branches</h3>
      ${localBranchesHtml}
    </div>
    ${remoteBranchesHtml}
  `;

  branchList.querySelectorAll(".branch-item").forEach((branchElement) => {
    branchElement.addEventListener("click", () =>
      handleBranchClick(branchElement)
    );
  });
}

async function handleBranchClick(branchElement) {
  const isRemote = branchElement.classList.contains("remote");
  const branchName = branchElement.dataset.branch;

  if (isRemote) {
    try {
      const response = await fetch(
        `/api/checkout-remote?branchName=${encodeURIComponent(branchName)}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to checkout branch");
      }

      const data = await response.json();
      allCommits = data.commits;

      // Re-render the UI with updated data
      renderBranches(data.branches, data.current, data.remoteBranches);
      renderCommits(data.commits);
      updateCommitSelectors(data.commits);
    } catch (error) {
      console.error("Failed to checkout remote branch:", error);
      return;
    }
  }

  document
    .querySelectorAll(".branch-item")
    .forEach((el) => el.classList.remove("active"));
  branchElement.classList.add("active");
  currentBranch = branchName;

  const branchRef = isRemote ? branchName : currentBranch;
  const branchCommits = allCommits.filter(
    (commit) =>
      commit.fullRefs && commit.fullRefs.some((ref) => ref.includes(branchRef))
  );

  renderCommits(branchCommits);
  updateCommitSelectors(allCommits);
}

function renderCommits(commits) {
  const timeline = document.querySelector(".commits-container");
  timeline.innerHTML = commits
    .map(
      (commit) => `
            <div class="commit" data-hash="${commit.hash}">
                <div class="commit-hash">${commit.hash.slice(0, 7)}</div>
                <div class="commit-message">${commit.message}</div>
                <div class="commit-date">${formatDate(commit.date)}</div>
            </div>
        `
    )
    .join("");
}

function updateCommitSelectors(commits) {
  const baseSelect = document.getElementById("base-commit-select");
  const compareSelect = document.getElementById("compare-commit-select");

  const options = commits
    .map(
      (commit) => `
            <option value="${commit.hash}">
                ${commit.hash.slice(0, 7)} - ${commit.message}
            </option>
        `
    )
    .join("");

  baseSelect.innerHTML = options;
  compareSelect.innerHTML = options;
}

function handleCommitClick(commitElement) {
  const hash = commitElement.dataset.hash;

  if (selectedCommits.first === hash || selectedCommits.second === hash) {
    return;
  }

  if (!selectedCommits.first) {
    selectedCommits.first = hash;
    commitElement.classList.add("selected-first");
    document.getElementById("first-commit").textContent = `First: ${hash.slice(
      0,
      7
    )}`;
  } else if (!selectedCommits.second) {
    selectedCommits.second = hash;
    commitElement.classList.add("selected-second");
    document.getElementById(
      "second-commit"
    ).textContent = `Second: ${hash.slice(0, 7)}`;
    document.getElementById("compare-button").disabled = false;
  }

  if (selectedCommits.first && selectedCommits.second) {
    document.getElementById("comparison-panel").classList.add("active");
  }
}

async function handleCompare() {
  const baseHash = document.getElementById("base-commit-select").value;
  const compareHash = document.getElementById("compare-commit-select").value;

  if (baseHash === compareHash) {
    alert("Please select different commits to compare");
    return;
  }

  try {
    const response = await fetch(
      `/api/compare?from=${baseHash}&to=${compareHash}`
    );
    const diff = await response.text();
    document.getElementById("diff-output").innerHTML = formatDiff(diff);
    document.getElementById("comparison-panel").classList.add("active");
    document.getElementById("comparison-panel").classList.remove("collapsed");
  } catch (error) {
    console.error("Failed to compare commits:", error);
  }
}

function formatDiff(diff) {
  let lineNumber = 1;
  return diff
    .split("\n")
    .map((line) => {
      let className = "diff-line";
      if (line.startsWith("+")) {
        className += " addition";
      } else if (line.startsWith("-")) {
        className += " deletion";
      }
      return `<div class="${className}" data-line-number="${lineNumber++}">${line}</div>`;
    })
    .join("");
}

function clearSelection() {
  document.querySelectorAll(".commit").forEach((commit) => {
    commit.classList.remove("selected-first", "selected-second");
  });

  selectedCommits = { first: null, second: null };
  document.getElementById("first-commit").textContent = "Select first commit";
  document.getElementById("second-commit").textContent = "Select second commit";
  document.getElementById("compare-button").disabled = true;
  document.getElementById("comparison-panel").classList.remove("active");
  document.getElementById("diff-output").textContent = "";
}

function clearComparison() {
  document.getElementById("comparison-panel").classList.remove("active");
  document.getElementById("diff-output").innerHTML = "";
}

async function init() {
  try {
    const data = await fetchRepoData();
    allCommits = data.commits;

    renderBranches(data.branches, data.current, data.remoteBranches);
    renderCommits(data.commits);
    updateCommitSelectors(data.commits);

    document.getElementById("repo-info").innerHTML = `
      <div>Current Branch: ${data.current}</div>
      <div>Total Branches: ${
        data.branches.length + (data.remoteBranches?.length || 0)
      }</div>
    `;

    document
      .getElementById("compare-button")
      .addEventListener("click", handleCompare);
    document
      .getElementById("clear-button")
      .addEventListener("click", clearComparison);
  } catch (error) {
    console.error("Failed to load repository data:", error);
  }
}

const comparisonPanel = document.getElementById("comparison-panel");
const comparisonHeader = document.querySelector(".comparison-header");

const dropdownButton = document.createElement("button");
dropdownButton.className = "dropdown-button";
dropdownButton.setAttribute("aria-label", "Toggle comparison panel");
comparisonHeader.appendChild(dropdownButton);

dropdownButton.addEventListener("click", () => {
  comparisonPanel.classList.toggle("collapsed");
});

comparisonHeader.style.cursor = "default";

init();
