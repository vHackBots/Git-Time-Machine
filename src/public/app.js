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
  const loader = document.getElementById("loader-container");
  loader.classList.add("fade-out");
  setTimeout(() => {
    loader.style.display = "none";
    document.getElementById("app").style.opacity = "1";
    loader.classList.remove("fade-out");
  }, 500);
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
                <div class="commit-hash">${sanitizeHTML(
                  commit.hash.slice(0, 7)
                )}</div>
                <div class="commit-message">${sanitizeHTML(
                  commit.message
                )}</div>
                <div class="commit-author">${sanitizeHTML(
                  commit.author_name
                )}</div>
                <div class="commit-date">${sanitizeHTML(
                  formatDate(commit.date)
                )}</div>
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

function generateBranchColor(branchName) {
  let hash = 0;
  for (let i = 0; i < branchName.length; i++) {
    hash = branchName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${hash % 360}, 70%, 65%)`;
}

function renderBranches(branches, currentBranchName, remoteBranches) {
  const branchList = document.getElementById("branch-list");

  const localBranchesHtml = branches
    .map((branch) => {
      const branchColor = generateBranchColor(branch);
      return `
          <div class="branch-item ${
            branch === currentBranchName ? "active" : ""
          }" 
               data-branch="${sanitizeHTML(branch)}"
               style="color: ${branchColor}">
              ${sanitizeHTML(branch)}
          </div>
        `;
    })
    .join("");

  const remoteBranchesHtml = remoteBranches?.length
    ? `
      <div class="branch-section">
        <h3>Remote Branches</h3>
        ${remoteBranches
          .map((branch) => {
            const branchColor = generateBranchColor(branch.shortName);
            return `
                <div class="branch-item remote" 
                     data-branch="${branch.fullName}"
                     data-remote="${branch.remote}"
                     title="${branch.fullName}"
                     style="color: ${branchColor}">
                       ${branch.remote}/${branch.shortName}
                </div>
              `;
          })
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
      `/api/branch-commits?branch=${encodeURIComponent(branchName)}`
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
          { method: "POST" }
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
                ${sanitizeHTML(commit.hash.slice(0, 7))} - ${sanitizeHTML(
        commit.message
      )}
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
    showToast("Please select different commits to compare", "warning");
    return;
  }

  try {
    const response = await fetch(
      `/api/compare?from=${baseHash}&to=${compareHash}`
    );
    const diff = await response.text();
    document.getElementById("diff-output").innerHTML = formatDiff(diff);
    document.getElementById("comparison-panel").classList.add("active");
    showToast("Comparison loaded successfully", "success");
  } catch (error) {
    console.error("Failed to compare commits:", error);
    showToast("Failed to compare commits", "error");
  }
}

function getFileStatus(diff) {
  if (diff.includes("new file mode")) return "A";
  if (diff.includes("deleted file mode")) return "D";
  if (diff.includes("rename from")) return "R";
  return "M";
}

function getStatusColor(status) {
  const colors = {
    A: "#28a745",
    D: "#dc3545",
    M: "#0366d6",
    R: "#6f42c1",
  };
  return colors[status] || "#666";
}

function formatHunkHeader(line) {
  const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@(.*)/);
  if (!match) return line;

  const [, oldStart, oldCount = 1, newStart, newCount = 1, context] = match;
  return `
    <div class="diff-hunk-header">
      <span class="hunk-range">
        Changes at lines ${oldStart}-${
    parseInt(oldStart) + parseInt(oldCount) - 1
  }
        → ${newStart}-${parseInt(newStart) + parseInt(newCount) - 1}
      </span>
      ${context ? `<span class="hunk-context">${context.trim()}</span>` : ""}
    </div>
  `;
}

function formatDiffContent(content) {
  const lines = content.split("\n");
  let currentHunk = null;
  let formattedLines = [];
  let oldLineNo = 0;
  let newLineNo = 0;

  lines.forEach((line) => {
    if (
      line.startsWith("index ") ||
      line.startsWith("new file mode") ||
      line.startsWith("deleted file mode") ||
      line.startsWith("old mode")
    ) {
      return;
    }

    if (line.startsWith("@@")) {
      currentHunk = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (currentHunk) {
        oldLineNo = parseInt(currentHunk[1]) - 1;
        newLineNo = parseInt(currentHunk[2]) - 1;
        formattedLines.push(formatHunkHeader(line));
      }
      return;
    }

    if (line.startsWith("---") || line.startsWith("+++")) {
      return;
    }

    let className = "diff-line";
    let lineNumbers = "";

    if (line.startsWith("+")) {
      newLineNo++;
      className += " addition";
      lineNumbers = `<span class="line-number old"></span><span class="line-number new">${newLineNo}</span>`;
    } else if (line.startsWith("-")) {
      oldLineNo++;
      className += " deletion";
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

  return formattedLines.join("");
}

function parseDiffToFiles(diff) {
  const files = [];
  let currentFile = null;
  let content = [];

  const lines = diff.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("diff --git")) {
      if (currentFile) {
        currentFile.content = content.join("\n");
        files.push(currentFile);
      }

      const [_, pathA, pathB] = line.match(/diff --git a\/(.*) b\/(.*)/);
      currentFile = {
        name: pathB,
        oldName: pathA,
        content: "",
        additions: 0,
        deletions: 0,
        isBinary: false,
      };
      content = [];

      let j = i + 1;
      while (j < lines.length && !lines[j].startsWith("diff --git")) {
        if (lines[j].match(/^index [0-9a-f]+\.\.[0-9a-f]+/)) {
          break;
        }
        if (
          lines[j].includes("Binary files") ||
          lines[j].includes("GIT binary patch")
        ) {
          currentFile.isBinary = true;
          const ext = pathB.split(".").pop().toLowerCase();
          currentFile.fileType = ext;
          break;
        }
        j++;
      }

      if (!currentFile.isBinary) {
        while (
          j < lines.length &&
          (lines[j].startsWith("index") ||
            lines[j].startsWith("old mode") ||
            lines[j].startsWith("new mode"))
        ) {
          j++;
        }
        i = j - 1;
      } else {
        i = j;
      }
    } else if (currentFile && !currentFile.isBinary) {
      content.push(line);
      if (line.startsWith("+") && !line.startsWith("+++")) {
        currentFile.additions++;
      }
      if (line.startsWith("-") && !line.startsWith("---")) {
        currentFile.deletions++;
      }
    }
  }

  if (currentFile) {
    currentFile.content = content.join("\n");
    files.push(currentFile);
  }

  return files;
}

function formatDiff(diff) {
  const files = parseDiffToFiles(diff);
  return files
    .map((file) => {
      const status = getFileStatus(file.content);
      const fileInfo = file.isBinary
        ? `<div class="diff-file-info">Binary file (${
            file.fileType || "unknown"
          } format)</div>`
        : `<div class="diff-stats">
         <span class="diff-added">+${file.additions}</span>
         <span class="diff-removed">-${file.deletions}</span>
       </div>`;

      return `
      <div class="diff-file collapsed">
        <div class="diff-file-header" onclick="toggleDiffContent(this)">
          <span class="file-status" style="color: ${getStatusColor(
            status
          )}">[${status}]</span>
          <span class="diff-file-name">${file.name}</span>
          ${fileInfo}
          <span class="diff-collapse-icon">▼</span>
        </div>
        <div class="diff-file-content">
          ${
            file.isBinary
              ? `<div class="binary-message">Binary file changes cannot be displayed</div>`
              : formatDiffContent(file.content)
          }
        </div>
      </div>`;
    })
    .join("");
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
    createToastContainer();
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
    showToast("Failed to load repository data", "error");
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

function createToastContainer() {
  const container = document.createElement("div");
  container.id = "toast-container";
  container.style.position = "fixed";
  container.style.top = "20px";
  container.style.right = "20px";
  container.style.zIndex = "9999";
  document.body.appendChild(container);
  return container;
}

function showToast(message, type = "info") {
  const container =
    document.getElementById("toast-container") || createToastContainer();

  const toast = document.createElement("div");
  toast.className = "card toast";

  const iconColor =
    type === "success"
      ? "#28a745"
      : type === "error"
      ? "#dc3545"
      : type === "warning"
      ? "#ffc107"
      : "#ffa30d";

  const bgColor =
    type === "success"
      ? "#28a74548"
      : type === "error"
      ? "#dc354548"
      : type === "warning"
      ? "#f2b705"
      : "#ffa30d";

  toast.innerHTML = `
    <svg class="wave" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
      <path fill="${iconColor}" d="M0,256L11.4,240C22.9,224,46,192,69,192C91.4,192,114,224,137,234.7C160,245,183,235,206,213.3C228.6,192,251,160,274,149.3C297.1,139,320,149,343,181.3C365.7,213,389,267,411,282.7C434.3,299,457,277,480,250.7C502.9,224,526,192,549,181.3C571.4,171,594,181,617,208C640,235,663,277,686,256C708.6,235,731,149,754,122.7C777.1,96,800,128,823,165.3C845.7,203,869,245,891,224C914.3,203,937,117,960,112C982.9,107,1006,181,1029,197.3C1051.4,213,1074,171,1097,144C1120,117,1143,107,1166,133.3C1188.6,160,1211,224,1234,218.7C1257.1,213,1280,139,1303,133.3C1325.7,128,1349,192,1371,192C1394.3,192,1417,128,1429,96L1440,64L1440,320L1428.6,320C1417.1,320,1394,320,1371,320C1348.6,320,1326,320,1303,320C1280,320,1257,320,1234,320C1211.4,320,1189,320,1166,320C1142.9,320,1120,320,1097,320C1074.3,320,1051,320,1029,320C1005.7,320,983,320,960,320C937.1,320,914,320,891,320C868.6,320,846,320,823,320C800,320,777,320,754,320C731.4,320,709,320,686,320C662.9,320,640,320,617,320C594.3,320,571,320,549,320C525.7,320,503,320,480,320C457.1,320,434,320,411,320C388.6,320,366,320,343,320C320,320,297,320,274,320C251.4,320,229,320,206,320C182.9,320,160,320,137,320C114.3,320,91,320,69,320C45.7,320,23,320,11,320L0,320Z" fill-opacity="0.2"></path>
    </svg>
    <div class="icon-container" style="background-color: ${bgColor}">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" class="icon" style="color: ${iconColor}">
        <path d="M236.8,188.09L149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z"></path>
      </svg>
    </div>
    <div class="message-text-container">
      <p class="message-text" style="color: ${iconColor}">${message}</p>
    </div>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 15" class="cross-icon">
      <path fill="currentColor" d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"></path>
    </svg>
  `;

  container.appendChild(toast);

  toast.querySelector(".cross-icon").addEventListener("click", () => {
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 500);
  });

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.add("hide");
      setTimeout(() => toast.remove(), 500);
    }
  }, 2000);
}
