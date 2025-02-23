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

    clearSelection();
    document.getElementById("comparison-panel").classList.add("collapsed");

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

function convertGitEmoji(message) {
  const emojiMap = {
    ":lipstick:": "💄",
    ":art:": "🎨",
    ":zap:": "⚡️",
    ":fire:": "🔥",
    ":bug:": "🐛",
    ":ambulance:": "🚑",
    ":sparkles:": "✨",
    ":memo:": "📝",
    ":rocket:": "🚀",
    ":package:": "📦",
    ":tada:": "🎉",
    ":white_check_mark:": "✅",
    ":lock:": "🔒",
    ":apple:": "🍎",
    ":penguin:": "🐧",
    ":robot:": "🤖",
    ":green_heart:": "💚",
    ":bookmark:": "🔖",
    ":rotating_light:": "🚨",
    ":construction:": "🚧",
    ":green_apple:": "🍏",
    ":arrow_down:": "⬇️",
    ":arrow_up:": "⬆️",
    ":construction_worker:": "👷",
    ":chart_with_upwards_trend:": "📈",
    ":hammer:": "🔨",
    ":heavy_minus_sign:": "➖",
    ":whale:": "🐳",
    ":heavy_plus_sign:": "➕",
    ":wrench:": "🔧",
    ":globe_with_meridians:": "🌐",
    ":pencil2:": "✏️",
    ":rewind:": "⏪",
    ":twisted_rightwards_arrows:": "🔀",
    ":package:": "📦",
    ":alien:": "👽",
    ":truck:": "🚛",
    ":page_facing_up:": "📄",
    ":boom:": "💥",
    ":bento:": "🍱",
    ":wheelchair:": "♿️",
    ":bulb:": "💡",
    ":beers:": "🍻",
    ":speech_balloon:": "💬",
    ":card_file_box:": "🗃️",
    ":loud_sound:": "🔊",
    ":mute:": "🔇",
    ":busts_in_silhouette:": "👥",
    ":children_crossing:": "🚸",
    ":building_construction:": "🏗️",
    ":iphone:": "📱",
    ":clown_face:": "🤡",
    ":egg:": "🥚",
    ":see_no_evil:": "🙈",
    ":camera_flash:": "📸",
    ":alembic:": "⚗️",
    ":mag:": "🔍",
    ":wheel_of_dharma:": "☸️",
    ":label:": "🏷️",
  };

  return message.replace(/:[a-z_]+:/g, (match) => emojiMap[match] || match);
}

async function renderCommits(commits) {
  const timeline = document.querySelector(".commits-container");

  const commitElements = await Promise.all(
    commits.map(async (commit) => {
      const avatarUrl = await getAuthorAvatar(
        commit.author_email,
        commit.author_name
      );
      const message = convertGitEmoji(commit.message); // Convert emoji shortcodes to actual emojis

      return `
      <div class="commit" data-hash="${commit.hash}">
        <div class="commit-hash">${commit.hash.slice(0, 7)}</div>
        <div class="commit-message">${sanitizeHTML(message)}</div>
        <div class="commit-info">
          <div class="commit-author-container">
            <img class="author-avatar" 
                 src="${avatarUrl}" 
                 alt="${sanitizeHTML(commit.author_name)}"
                 loading="lazy">
            <div class="author-tooltip">
              <div class="author-tooltip-content">
                <div class="author-name">${sanitizeHTML(
                  commit.author_name
                )}</div>
                <div class="author-email">${sanitizeHTML(
                  commit.author_email
                )}</div>
                <a href="https://github.com/${sanitizeHTML(
                  commit.author_name
                )}" 
                   target="_blank" 
                   class="github-link">
                   View GitHub Profile
                </a>
              </div>
            </div>
          </div>
          <span class="commit-date">${formatDate(commit.date)}</span>
        </div>
      </div>
    `;
    })
  );

  timeline.innerHTML = commitElements.join("");
}

function updateCommitSelectors(commits) {
  const baseSelect = document.getElementById("base-commit-select");
  const compareSelect = document.getElementById("compare-commit-select");

  const emptyOption = '<option value="">Select a commit</option>';

  const options = commits
    .map(
      (commit) => `
        <option value="${sanitizeHTML(commit.hash)}">
            ${sanitizeHTML(commit.hash.slice(0, 7))} - ${sanitizeHTML(
        commit.message
      )}
        </option>`
    )
    .join("");

  baseSelect.innerHTML = emptyOption + options;
  compareSelect.innerHTML = emptyOption + options;

  baseSelect.selectedIndex = 0;
  compareSelect.selectedIndex = 0;
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

  if (!baseHash || !compareHash) {
    showToast("Please select both commits to compare", "warning");
    return;
  }

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

    const panel = document.getElementById("comparison-panel");
    panel.classList.add("active");
    panel.classList.remove("collapsed");
    document.getElementById("panel-toggle").checked = true;

    showToast("Comparison loaded successfully", "success");
  } catch (error) {
    console.error("Failed to compare commits:", error);
    showToast("Failed to compare commits", "error");
  }
}

function getFileStatus(content) {
  if (content.match(/^new file mode/m)) return "A";
  if (content.match(/^deleted file mode/m)) return "D";
  if (content.match(/^rename (from|to)/m)) return "R";
  if (content.match(/^index [0-9a-f]+\.\.[0-9a-f]+/m)) return "M";
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
  let fileHeader = [];

  const lines = diff.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("diff --git")) {
      if (currentFile) {
        currentFile.content = fileHeader.join("\n") + "\n" + content.join("\n");
        files.push(currentFile);
      }

      fileHeader = [line]; // Start new file headers
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

      // Collect all header information
      let j = i + 1;
      while (
        j < lines.length &&
        (lines[j].startsWith("new file") ||
          lines[j].startsWith("deleted file") ||
          lines[j].startsWith("old mode") ||
          lines[j].startsWith("new mode") ||
          lines[j].startsWith("rename from") ||
          lines[j].startsWith("rename to") ||
          lines[j].startsWith("index"))
      ) {
        fileHeader.push(lines[j]);
        j++;
      }
      i = j - 1;
      continue;
    }

    if (currentFile && !currentFile.isBinary) {
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
    currentFile.content = fileHeader.join("\n") + "\n" + content.join("\n");
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

async function getAuthorAvatar(authorEmail, authorName) {
  const githubUrl = `https://github.com/${authorName}.png`;
  const gravatarUrl = `https://www.gravatar.com/avatar/${getMD5(
    authorEmail.trim().toLowerCase()
  )}?s=80&d=404`;

  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => resolve(githubUrl);
    img.onerror = () => {
      const fallbackImg = new Image();
      fallbackImg.onload = () => resolve(gravatarUrl);
      fallbackImg.onerror = () => {
        resolve(`https://www.gravatar.com/avatar/404?s=80&d=identicon`);
      };
      fallbackImg.src = gravatarUrl;
    };
    img.src = githubUrl;
  });
}

// MD5 Implementation from (minified) : https://css-tricks.com/snippets/javascript/javascript-md5/
/******************************************** MD5************************************************/
function getMD5(string) {
  function RotateLeft(lValue, iShiftBits) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }
  function AddUnsigned(lX, lY) {
    var lX4, lY4, lX8, lY8, lResult;
    lX8 = lX & 2147483648;
    lY8 = lY & 2147483648;
    lX4 = lX & 1073741824;
    lY4 = lY & 1073741824;
    lResult = (lX & 1073741823) + (lY & 1073741823);
    if (lX4 & lY4) return lResult ^ 2147483648 ^ lX8 ^ lY8;
    if (lX4 | lY4) {
      if (lResult & 1073741824) return lResult ^ 3221225472 ^ lX8 ^ lY8;
      else return lResult ^ 1073741824 ^ lX8 ^ lY8;
    } else return lResult ^ lX8 ^ lY8;
  }
  function F(x, y, z) {
    return (x & y) | (~x & z);
  }
  function G(x, y, z) {
    return (x & z) | (y & ~z);
  }
  function H(x, y, z) {
    return x ^ y ^ z;
  }
  function I(x, y, z) {
    return y ^ (x | ~z);
  }
  function FF(a, b, c, d, x, s, ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }
  function GG(a, b, c, d, x, s, ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }
  function HH(a, b, c, d, x, s, ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }
  function II(a, b, c, d, x, s, ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }
  function ConvertToWordArray(string) {
    var lWordCount;
    var lMessageLength = string.length;
    var lNumberOfWords_temp1 = lMessageLength + 8;
    var lNumberOfWords_temp2 =
      (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    var lWordArray = Array(lNumberOfWords - 1);
    var lBytePosition = 0;
    var lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] =
        lWordArray[lWordCount] |
        (string.charCodeAt(lByteCount) << lBytePosition);
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (128 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }
  function WordToHex(lValue) {
    var WordToHexValue = "",
      WordToHexValue_temp = "",
      lByte,
      lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      WordToHexValue_temp = "0" + lByte.toString(16);
      WordToHexValue =
        WordToHexValue +
        WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
    }
    return WordToHexValue;
  }
  function Utf8Encode(string) {
    string = string.replace(/\r\n/g, "\n");
    var utftext = "";
    for (var n = 0; n < string.length; n++) {
      var c = string.charCodeAt(n);
      if (c < 128) utftext += String.fromCharCode(c);
      else if (c > 127 && c < 2048) {
        utftext += String.fromCharCode((c >> 6) | 192);
        utftext += String.fromCharCode((c & 63) | 128);
      } else {
        utftext += String.fromCharCode((c >> 12) | 224);
        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        utftext += String.fromCharCode((c & 63) | 128);
      }
    }
    return utftext;
  }
  var x = Array();
  var k, AA, BB, CC, DD, a, b, c, d;
  var S11 = 7,
    S12 = 12,
    S13 = 17,
    S14 = 22;
  var S21 = 5,
    S22 = 9,
    S23 = 14,
    S24 = 20;
  var S31 = 4,
    S32 = 11,
    S33 = 16,
    S34 = 23;
  var S41 = 6,
    S42 = 10,
    S43 = 15,
    S44 = 21;
  string = Utf8Encode(string);
  x = ConvertToWordArray(string);
  a = 1732584193;
  b = 4023233417;
  c = 2562383102;
  d = 271733878;
  for (k = 0; k < x.length; k += 16) {
    AA = a;
    BB = b;
    CC = c;
    DD = d;
    a = FF(a, b, c, d, x[k + 0], S11, 3614090360);
    d = FF(d, a, b, c, x[k + 1], S12, 3905402710);
    c = FF(c, d, a, b, x[k + 2], S13, 606105819);
    b = FF(b, c, d, a, x[k + 3], S14, 3250441966);
    a = FF(a, b, c, d, x[k + 4], S11, 4118548399);
    d = FF(d, a, b, c, x[k + 5], S12, 1200080426);
    c = FF(c, d, a, b, x[k + 6], S13, 2821735955);
    b = FF(b, c, d, a, x[k + 7], S14, 4249261313);
    a = FF(a, b, c, d, x[k + 8], S11, 1770035416);
    d = FF(d, a, b, c, x[k + 9], S12, 2336552879);
    c = FF(c, d, a, b, x[k + 10], S13, 4294925233);
    b = FF(b, c, d, a, x[k + 11], S14, 2304563134);
    a = FF(a, b, c, d, x[k + 12], S11, 1804603682);
    d = FF(d, a, b, c, x[k + 13], S12, 4254626195);
    c = FF(c, d, a, b, x[k + 14], S13, 2792965006);
    b = FF(b, c, d, a, x[k + 15], S14, 1236535329);
    a = GG(a, b, c, d, x[k + 1], S21, 4129170786);
    d = GG(d, a, b, c, x[k + 6], S22, 3225465664);
    c = GG(c, d, a, b, x[k + 11], S23, 643717713);
    b = GG(b, c, d, a, x[k + 0], S24, 3921069994);
    a = GG(a, b, c, d, x[k + 5], S21, 3593408605);
    d = GG(d, a, b, c, x[k + 10], S22, 38016083);
    c = GG(c, d, a, b, x[k + 15], S23, 3634488961);
    b = GG(b, c, d, a, x[k + 4], S24, 3889429448);
    a = GG(a, b, c, d, x[k + 9], S21, 568446438);
    d = GG(d, a, b, c, x[k + 14], S22, 3275163606);
    c = GG(c, d, a, b, x[k + 3], S23, 4107603335);
    b = GG(b, c, d, a, x[k + 8], S24, 1163531501);
    a = GG(a, b, c, d, x[k + 13], S21, 2850285829);
    d = GG(d, a, b, c, x[k + 2], S22, 4243563512);
    c = GG(c, d, a, b, x[k + 7], S23, 1735328473);
    b = GG(b, c, d, a, x[k + 12], S24, 2368359562);
    a = HH(a, b, c, d, x[k + 5], S31, 4294588738);
    d = HH(d, a, b, c, x[k + 8], S32, 2272392833);
    c = HH(c, d, a, b, x[k + 11], S33, 1839030562);
    b = HH(b, c, d, a, x[k + 14], S34, 4259657740);
    a = HH(a, b, c, d, x[k + 1], S31, 2763975236);
    d = HH(d, a, b, c, x[k + 4], S32, 1272893353);
    c = HH(c, d, a, b, x[k + 7], S33, 4139469664);
    b = HH(b, c, d, a, x[k + 10], S34, 3200236656);
    a = HH(a, b, c, d, x[k + 13], S31, 681279174);
    d = HH(d, a, b, c, x[k + 0], S32, 3936430074);
    c = HH(c, d, a, b, x[k + 3], S33, 3572445317);
    b = HH(b, c, d, a, x[k + 6], S34, 76029189);
    a = HH(a, b, c, d, x[k + 9], S31, 3654602809);
    d = HH(d, a, b, c, x[k + 12], S32, 3873151461);
    c = HH(c, d, a, b, x[k + 15], S33, 530742520);
    b = HH(b, c, d, a, x[k + 2], S34, 3299628645);
    a = II(a, b, c, d, x[k + 0], S41, 4096336452);
    d = II(d, a, b, c, x[k + 7], S42, 1126891415);
    c = II(c, d, a, b, x[k + 14], S43, 2878612391);
    b = II(b, c, d, a, x[k + 5], S44, 4237533241);
    a = II(a, b, c, d, x[k + 12], S41, 1700485571);
    d = II(d, a, b, c, x[k + 3], S42, 2399980690);
    c = II(c, d, a, b, x[k + 10], S43, 4293915773);
    b = II(b, c, d, a, x[k + 1], S44, 2240044497);
    a = II(a, b, c, d, x[k + 8], S41, 1873313359);
    d = II(d, a, b, c, x[k + 15], S42, 4264355552);
    c = II(c, d, a, b, x[k + 6], S43, 2734768916);
    b = II(b, c, d, a, x[k + 13], S44, 1309151649);
    a = II(a, b, c, d, x[k + 4], S41, 4149444226);
    d = II(d, a, b, c, x[k + 11], S42, 3174756917);
    c = II(c, d, a, b, x[k + 2], S43, 718787259);
    b = II(b, c, d, a, x[k + 9], S44, 3951481745);
    a = AddUnsigned(a, AA);
    b = AddUnsigned(b, BB);
    c = AddUnsigned(c, CC);
    d = AddUnsigned(d, DD);
  }
  var temp = WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d);
  return temp.toLowerCase();
}
/******************************************** MD5************************************************/
