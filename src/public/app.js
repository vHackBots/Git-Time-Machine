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

function sanitizeHTML(str) {
  const div = document.createElement('div');
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
            <div class="commit" data-hash="${sanitizeHTML(commit.hash)}">
                <div class="commit-hash">${sanitizeHTML(commit.hash.slice(0, 7))}</div>
                <div class="commit-message">${sanitizeHTML(commit.message)}</div>
                <div class="commit-author">${sanitizeHTML(commit.author_name)}</div>
                <div class="commit-date">${sanitizeHTML(formatDate(commit.date))}</div>
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

  const localBranchesHtml = branches
    .map(
      (branch) => `
        <div class="branch-item ${
          branch === currentBranchName ? "active" : ""
        }" 
             data-branch="${sanitizeHTML(branch)}">
            ${sanitizeHTML(branch)}
        </div>
    `
    )
    .join("");

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
            <option value="${sanitizeHTML(commit.hash)}">
                ${sanitizeHTML(commit.hash.slice(0, 7))} - ${sanitizeHTML(commit.message)}
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
  } catch (error) {
    console.error("Failed to compare commits:", error);
  }
}

function formatDiff(diff) {
  const files = parseDiffToFiles(diff);
  return files.map(file => `
    <div class="diff-file collapsed">
      <div class="diff-file-header" onclick="toggleDiffContent(this)">
        <span class="diff-file-name">${file.name}</span>
        <div class="diff-stats">
          <span class="diff-added">+${file.additions}</span>
          <span class="diff-removed">-${file.deletions}</span>
        </div>
        <span class="diff-collapse-icon">▼</span>
      </div>
      <div class="diff-file-content">
        ${formatDiffContent(file.content)}
      </div>
    </div>
  `).join('');
}

function parseDiffToFiles(diff) {
  const files = [];
  let currentFile = null;
  let content = [];
  
  diff.split('\n').forEach(line => {
    if (line.startsWith('diff --git')) {
      if (currentFile) {
        currentFile.content = content.join('\n');
        files.push(currentFile);
      }
      const fileName = line.split(' b/')[1];
      currentFile = {
        name: fileName,
        content: '',
        additions: 0,
        deletions: 0
      };
      content = [];
    } else if (currentFile) {
      content.push(line);
      if (line.startsWith('+') && !line.startsWith('+++')) currentFile.additions++;
      if (line.startsWith('-') && !line.startsWith('---')) currentFile.deletions++;
    }
  });
  
  if (currentFile) {
    currentFile.content = content.join('\n');
    files.push(currentFile);
  }
  
  return files;
}

function formatDiffContent(content) {
  let lineNumber = 1;
  return content
    .split('\n')
    .map(line => {
      let className = 'diff-line';
      if (line.startsWith('+')) {
        className += ' addition';
      } else if (line.startsWith('-')) {
        className += ' deletion';
      }
      return `<div class="${className}" data-line-number="${lineNumber++}">${sanitizeHTML(line)}</div>`;
    })
    .join('');
}

function toggleDiffContent(header) {
  const fileElement = header.parentElement;
  fileElement.classList.toggle('collapsed');
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

function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  const header = document.querySelector('header');
  const themeToggle = document.createElement('button');
  themeToggle.className = 'theme-toggle';
  themeToggle.innerHTML = `
    ${savedTheme === 'light' ? 
      '<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 30 30"><path d="M 14.984375 0.98632812 A 1.0001 1.0001 0 0 0 14 2 L 14 5 A 1.0001 1.0001 0 1 0 16 5 L 16 2 A 1.0001 1.0001 0 0 0 14.984375 0.98632812 z M 5.796875 4.7988281 A 1.0001 1.0001 0 0 0 5.1015625 6.515625 L 7.2226562 8.6367188 A 1.0001 1.0001 0 1 0 8.6367188 7.2226562 L 6.515625 5.1015625 A 1.0001 1.0001 0 0 0 5.796875 4.7988281 z M 24.171875 4.7988281 A 1.0001 1.0001 0 0 0 23.484375 5.1015625 L 21.363281 7.2226562 A 1.0001 1.0001 0 1 0 22.777344 8.6367188 L 24.898438 6.515625 A 1.0001 1.0001 0 0 0 24.171875 4.7988281 z M 15 8 C 11.134 8 8 11.134 8 15 C 8 18.866 11.134 22 15 22 C 18.866 22 22 18.866 22 15 C 22 11.134 18.866 8 15 8 z M 2 14 A 1.0001 1.0001 0 1 0 2 16 L 5 16 A 1.0001 1.0001 0 1 0 5 14 L 2 14 z M 25 14 A 1.0001 1.0001 0 1 0 25 16 L 28 16 A 1.0001 1.0001 0 1 0 28 14 L 25 14 z M 7.9101562 21.060547 A 1.0001 1.0001 0 0 0 7.2226562 21.363281 L 5.1015625 23.484375 A 1.0001 1.0001 0 1 0 6.515625 24.898438 L 8.6367188 22.777344 A 1.0001 1.0001 0 0 0 7.9101562 21.060547 z M 22.060547 21.060547 A 1.0001 1.0001 0 0 0 21.363281 22.777344 L 23.484375 24.898438 A 1.0001 1.0001 0 1 0 24.898438 23.484375 L 22.777344 21.363281 A 1.0001 1.0001 0 0 0 22.060547 21.060547 z M 14.984375 23.986328 A 1.0001 1.0001 0 0 0 14 25 L 14 28 A 1.0001 1.0001 0 1 0 16 28 L 16 25 A 1.0001 1.0001 0 0 0 14.984375 23.986328 z"></path></svg>' :
      '<svg viewBox="0 0 24 24"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1-8.313-12.454z"/></svg>'
    }
    ${savedTheme === 'light' ? 'Dark' : 'Light'}
  `;
  
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    themeToggle.innerHTML = `
      ${newTheme === 'light' ? 
        '<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 30 30"><path d="M 14.984375 0.98632812 A 1.0001 1.0001 0 0 0 14 2 L 14 5 A 1.0001 1.0001 0 1 0 16 5 L 16 2 A 1.0001 1.0001 0 0 0 14.984375 0.98632812 z M 5.796875 4.7988281 A 1.0001 1.0001 0 0 0 5.1015625 6.515625 L 7.2226562 8.6367188 A 1.0001 1.0001 0 1 0 8.6367188 7.2226562 L 6.515625 5.1015625 A 1.0001 1.0001 0 0 0 5.796875 4.7988281 z M 24.171875 4.7988281 A 1.0001 1.0001 0 0 0 23.484375 5.1015625 L 21.363281 7.2226562 A 1.0001 1.0001 0 1 0 22.777344 8.6367188 L 24.898438 6.515625 A 1.0001 1.0001 0 0 0 24.171875 4.7988281 z M 15 8 C 11.134 8 8 11.134 8 15 C 8 18.866 11.134 22 15 22 C 18.866 22 22 18.866 22 15 C 22 11.134 18.866 8 15 8 z M 2 14 A 1.0001 1.0001 0 1 0 2 16 L 5 16 A 1.0001 1.0001 0 1 0 5 14 L 2 14 z M 25 14 A 1.0001 1.0001 0 1 0 25 16 L 28 16 A 1.0001 1.0001 0 1 0 28 14 L 25 14 z M 7.9101562 21.060547 A 1.0001 1.0001 0 0 0 7.2226562 21.363281 L 5.1015625 23.484375 A 1.0001 1.0001 0 1 0 6.515625 24.898438 L 8.6367188 22.777344 A 1.0001 1.0001 0 0 0 7.9101562 21.060547 z M 22.060547 21.060547 A 1.0001 1.0001 0 0 0 21.363281 22.777344 L 23.484375 24.898438 A 1.0001 1.0001 0 1 0 24.898438 23.484375 L 22.777344 21.363281 A 1.0001 1.0001 0 0 0 22.060547 21.060547 z M 14.984375 23.986328 A 1.0001 1.0001 0 0 0 14 25 L 14 28 A 1.0001 1.0001 0 1 0 16 28 L 16 25 A 1.0001 1.0001 0 0 0 14.984375 23.986328 z"></path></svg>' :
      '<svg viewBox="0 0 24 24"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1-8.313-12.454z"/></svg>'
     }
      ${newTheme === 'light' ? 'Dark' : 'Light'}
    `;
  });
  
  header.appendChild(themeToggle);
}

async function init() {
  try {
    initTheme();
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

const dropdownButton = document.createElement("button");
dropdownButton.className = "dropdown-button";
dropdownButton.setAttribute("aria-label", "Toggle comparison panel");
comparisonHeader.appendChild(dropdownButton);

dropdownButton.addEventListener("click", () => {
  comparisonPanel.classList.toggle("collapsed");
});

comparisonHeader.style.cursor = "default";

init();
