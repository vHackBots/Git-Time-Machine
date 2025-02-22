let selectedCommits = {
  first: null,
  second: null,
};

let currentBranch = null;
let allCommits = [];

function showLoader() {
  document.getElementById("loader-container").style.display = "flex";
  document.getElementById("app").style.opacity = "0.5";
}

function hideLoader() {
  document.getElementById("loader-container").style.display = "none";
  document.getElementById("app").style.opacity = "1";
}

async function fetchRepoData() {
  showLoader();
  try {
    const response = await fetch("/api/repo-data");
    const data = await response.json();
    return data;
  } finally {
    hideLoader();
  }
}

function sanitizeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
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
      hour12: true,
    })
  );
}

function renderTimeline(commits) {
  const timeline = document.getElementById("timeline");
  timeline.innerHTML = commits
    .map(
      (commit) => `
            <div class="commit" data-hash="${sanitizeHTML(commit.hash)}">
                <div class="commit-hash">${
        sanitizeHTML(
          commit.hash.slice(0, 7),
        )
      }</div>
                <div class="commit-message">${
        sanitizeHTML(
          commit.message,
        )
      }</div>
                <div class="commit-author">${
        sanitizeHTML(
          commit.author_name,
        )
      }</div>
                <div class="commit-date">${
        sanitizeHTML(
          formatDate(commit.date),
        )
      }</div>
            </div>
        `,
    )
    .join("");

  timeline.querySelectorAll(".commit").forEach((commitElement) => {
    commitElement.addEventListener(
      "click",
      () => handleCommitClick(commitElement),
    );
  });
}

function renderBranches(branches, currentBranchName, remoteBranches) {
  const branchList = document.getElementById("branch-list");

  const localBranchesHtml = branches
    .map(
      (branch) => `
        <div class="branch-item ${
        branch === currentBranchName ? "active" : ""
      }" 
             data-branch="${sanitizeHTML(branch)}">
            ${sanitizeHTML(branch)}
        </div>
    `,
    )
    .join("");

  const remoteBranchesHtml = remoteBranches?.length
    ? `
      <div class="branch-section">
        <h3>Remote Branches</h3>
        ${
      remoteBranches
        .map(
          (branch) => `
              <div class="branch-item remote" 
                   data-branch="${branch.fullName}"
                   data-remote="${branch.remote}"
                   title="${branch.fullName}">
                ${branch.remote}/${branch.shortName}
              </div>
            `,
        )
        .join("")
    }
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
    branchElement.addEventListener(
      "click",
      () => handleBranchClick(branchElement),
    );
  });
}

async function handleBranchClick(branchElement) {
  showLoader();
  try {
    const isRemote = branchElement.classList.contains("remote");
    const branchName = branchElement.dataset.branch;

    document
      .querySelectorAll(".branch-item")
      .forEach((el) => el.classList.remove("active"));
    branchElement.classList.add("active");
    currentBranch = branchName;

    const response = await fetch(
      `/api/branch-commits?branch=${encodeURIComponent(branchName)}`,
    );
    if (!response.ok) {
      throw new Error("Failed to fetch branch commits");
    }

    const branchCommits = await response.json();
    renderCommits(branchCommits);
    updateCommitSelectors(branchCommits);

    if (isRemote) {
      try {
        const checkoutResponse = await fetch(
          `/api/checkout-remote?branchName=${encodeURIComponent(branchName)}`,
          { method: "POST" },
        );

        if (!checkoutResponse.ok) {
          throw new Error("Failed to checkout branch");
        }

        const data = await checkoutResponse.json();
        renderBranches(data.branches, data.current, data.remoteBranches);
      } catch (error) {
        console.error("Failed to checkout remote branch:", error);
      }
    }
  } catch (error) {
    console.error("Failed to handle branch click:", error);
    const timeline = document.querySelector(".commits-container");
    timeline.innerHTML =
      '<div class="error">Failed to load branch commits</div>';
  } finally {
    hideLoader();
  }
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
        `,
    )
    .join("");
}

function updateCommitSelectors(commits) {
  const baseSelect = document.getElementById("base-commit-select");
  const compareSelect = document.getElementById("compare-commit-select");

  const options = commits
    .map(
      (commit) => `
            <option value="${sanitizeHTML(commit.hash)}">
                ${sanitizeHTML(commit.hash.slice(0, 7))} - ${
        sanitizeHTML(
          commit.message,
        )
      }
            </option>
        `,
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
    document.getElementById("first-commit").textContent = `First: ${
      hash.slice(
        0,
        7,
      )
    }`;
  } else if (!selectedCommits.second) {
    selectedCommits.second = hash;
    commitElement.classList.add("selected-second");
    document.getElementById(
      "second-commit",
    ).textContent = `Second: ${hash.slice(0, 7)}`;
    document.getElementById("compare-button").disabled = false;
  }

  if (selectedCommits.first && selectedCommits.second) {
    document.getElementById("comparison-panel").classList.add("active");
  }
}

async function handleCompare() {
  showLoader();
  try {
    const baseHash = document.getElementById("base-commit-select").value;
    const compareHash = document.getElementById("compare-commit-select").value;

    if (baseHash === compareHash) {
      alert("Please select different commits to compare");
      return;
    }

    try {
      const response = await fetch(
        `/api/compare?from=${baseHash}&to=${compareHash}`,
      );
      const diff = await response.text();
      document.getElementById("diff-output").innerHTML = formatDiff(diff);
      document.getElementById("comparison-panel").classList.add("active");
    } catch (error) {
      console.error("Failed to compare commits:", error);
    }
  } finally {
    hideLoader();
  }
}

function getFileStatus(diff) {
  if (diff.includes('new file mode')) return 'A';
  if (diff.includes('deleted file mode')) return 'D';
  if (diff.includes('rename from')) return 'R';
  return 'M';
}

function getStatusColor(status) {
  const colors = {
    'A': '#28a745',
    'D': '#dc3545',
    'M': '#0366d6',
    'R': '#6f42c1'
  };
  return colors[status] || '#666';
}

function formatHunkHeader(line) {
  const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@(.*)/);
  if (!match) return line;

  const [, oldStart, oldCount = 1, newStart, newCount = 1, context] = match;
  return `
    <div class="diff-hunk-header">
      <span class="hunk-range">
        Changes at lines ${oldStart}-${parseInt(oldStart) + parseInt(oldCount) - 1}
        → ${newStart}-${parseInt(newStart) + parseInt(newCount) - 1}
      </span>
      ${context ? `<span class="hunk-context">${context.trim()}</span>` : ''}
    </div>
  `;
}

function formatDiffContent(content) {
  const lines = content.split('\n');
  let currentHunk = null;
  let formattedLines = [];
  let oldLineNo = 0;
  let newLineNo = 0;

  lines.forEach(line => {
    if (line.startsWith('index ') || line.startsWith('new file mode') || 
        line.startsWith('deleted file mode') || line.startsWith('old mode')) {
      return;
    }

    if (line.startsWith('@@')) {
      currentHunk = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (currentHunk) {
        oldLineNo = parseInt(currentHunk[1]) - 1;
        newLineNo = parseInt(currentHunk[2]) - 1;
        formattedLines.push(formatHunkHeader(line));
      }
      return;
    }

    if (line.startsWith('---') || line.startsWith('+++')) {
      return;
    }

    let className = 'diff-line';
    let lineNumbers = '';

    if (line.startsWith('+')) {
      newLineNo++;
      className += ' addition';
      lineNumbers = `<span class="line-number old"></span><span class="line-number new">${newLineNo}</span>`;
    } else if (line.startsWith('-')) {
      oldLineNo++;
      className += ' deletion';
      lineNumbers = `<span class="line-number old">${oldLineNo}</span><span class="line-number new"></span>`;
    } else {
      oldLineNo++;
      newLineNo++;
      lineNumbers = `<span class="line-number old">${oldLineNo}</span><span class="line-number new">${newLineNo}</span>`;
    }

    formattedLines.push(`
      <div class="${className}">
        <div class="line-numbers">${lineNumbers}</div>
        <code>${sanitizeHTML(line)}</code>
      </div>
    `);
  });

  return formattedLines.join('');
}

function formatDiff(diff) {
  const files = parseDiffToFiles(diff);
  return files
    .map(file => {
      const status = getFileStatus(file.content);
      return `
    <div class="diff-file collapsed">
      <div class="diff-file-header" onclick="toggleDiffContent(this)">
        <span class="file-status" style="color: ${getStatusColor(status)}">[${status}]</span>
        <span class="diff-file-name">${file.name}</span>
        ${!file.isBinary ? `
          <div class="diff-stats">
            <span class="diff-added">+${file.additions}</span>
            <span class="diff-removed">-${file.deletions}</span>
          </div>
        ` : '<span class="diff-binary">Binary file</span>'}
        <span class="diff-collapse-icon">▼</span>
      </div>
      <div class="diff-file-content">
        ${file.isBinary ? 
          '<div class="binary-file-message">Binary file not shown</div>' : 
          formatDiffContent(file.content)}
      </div>
    </div>`;
    })
    .join('');
}

function parseDiffToFiles(diff) {
  const files = [];
  let currentFile = null;
  let content = [];
  let isBinary = false;

  diff.split("\n").forEach((line) => {
    if (line.startsWith("diff --git")) {
      if (currentFile) {
        currentFile.content = isBinary ? "Binary file" : content.join("\n");
        currentFile.isBinary = isBinary;
        files.push(currentFile);
      }
      const fileName = line.split(" b/")[1];
      currentFile = {
        name: fileName,
        content: "",
        additions: 0,
        deletions: 0,
        isBinary: false
      };
      content = [];
      isBinary = false;
    } else if (line.includes("Binary files") || line.includes("Files") && line.includes("differ")) {
      isBinary = true;
    } else if (currentFile && !isBinary) {
      content.push(line);
      if (line.startsWith("+") && !line.startsWith("+++")) {
        currentFile.additions++;
      }
      if (line.startsWith("-") && !line.startsWith("---")) {
        currentFile.deletions++;
      }
    }
  });

  if (currentFile) {
    currentFile.content = isBinary ? "Binary file" : content.join("\n");
    currentFile.isBinary = isBinary;
    files.push(currentFile);
  }

  return files;
}

function toggleDiffContent(header) {
  const fileElement = header.parentElement;
  fileElement.classList.toggle("collapsed");
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

    document.getElementById("comparison-panel").classList.add("collapsed");
  } catch (error) {
    console.error("Failed to load repository data:", error);
  }
}

const comparisonPanel = document.getElementById("comparison-panel");
const comparisonHeader = document.querySelector(".comparison-header");

document.getElementById("panel-toggle").addEventListener("change", (e) => {
  const panel = document.getElementById("comparison-panel");
  panel.classList.toggle("collapsed");
});

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("comparison-panel").classList.add("collapsed");
});

comparisonHeader.style.cursor = "default";

init();
