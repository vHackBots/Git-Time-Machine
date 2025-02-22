let selectedCommits = {
    first: null,
    second: null
};

let currentBranch = null;
let allCommits = [];

async function fetchRepoData() {
  const response = await fetch('/api/repo-data');
  const data = await response.json();
  return data;
}

function renderTimeline(commits) {
    const timeline = document.getElementById('timeline');
    timeline.innerHTML = commits
        .map(commit => `
            <div class="commit" data-hash="${commit.hash}">
                <div class="commit-hash">${commit.hash.slice(0, 7)}</div>
                <div class="commit-message">${commit.message}</div>
                <div class="commit-author">${commit.author_name}</div>
                <div class="commit-date">${new Date(commit.date).toLocaleDateString()}</div>
            </div>
        `)
        .join('');

    timeline.querySelectorAll('.commit').forEach(commitElement => {
        commitElement.addEventListener('click', () => handleCommitClick(commitElement));
    });
}

function renderBranches(branches, currentBranchName) {
    const branchList = document.getElementById('branch-list');
    branchList.innerHTML = branches
        .map(branch => `
            <div class="branch-item ${branch === currentBranchName ? 'active' : ''}" 
                 data-branch="${branch}">
                ${branch}
            </div>
        `)
        .join('');

    branchList.querySelectorAll('.branch-item').forEach(branchElement => {
        branchElement.addEventListener('click', () => handleBranchClick(branchElement));
    });
}

function handleBranchClick(branchElement) {
    document.querySelectorAll('.branch-item').forEach(el => el.classList.remove('active'));
    branchElement.classList.add('active');
    currentBranch = branchElement.dataset.branch;
    
    const branchCommits = allCommits.filter(commit => 
        commit.refs && commit.refs.includes(currentBranch)
    );
    renderCommits(branchCommits);
    updateCommitSelectors(allCommits);
}

function renderCommits(commits) {
    const timeline = document.querySelector('.commits-container');
    timeline.innerHTML = commits
        .map(commit => `
            <div class="commit" data-hash="${commit.hash}">
                <div class="commit-hash">${commit.hash.slice(0, 7)}</div>
                <div class="commit-message">${commit.message}</div>
                <div class="commit-date">${new Date(commit.date).toLocaleDateString()}</div>
            </div>
        `)
        .join('');
}

function updateCommitSelectors(commits) {
    const baseSelect = document.getElementById('base-commit-select');
    const compareSelect = document.getElementById('compare-commit-select');
    
    const options = commits
        .map(commit => `
            <option value="${commit.hash}">
                ${commit.hash.slice(0, 7)} - ${commit.message}
            </option>
        `)
        .join('');
        
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
        commitElement.classList.add('selected-first');
        document.getElementById('first-commit').textContent = `First: ${hash.slice(0, 7)}`;
    } else if (!selectedCommits.second) {
        selectedCommits.second = hash;
        commitElement.classList.add('selected-second');
        document.getElementById('second-commit').textContent = `Second: ${hash.slice(0, 7)}`;
        document.getElementById('compare-button').disabled = false;
    }

    if (selectedCommits.first && selectedCommits.second) {
        document.getElementById('comparison-panel').classList.add('active');
    }
}

async function handleCompare() {
    const baseHash = document.getElementById('base-commit-select').value;
    const compareHash = document.getElementById('compare-commit-select').value;
    
    if (baseHash === compareHash) {
        alert('Please select different commits to compare');
        return;
    }

    try {
        const response = await fetch(`/api/compare?from=${baseHash}&to=${compareHash}`);
        const diff = await response.text();
        document.getElementById('diff-output').innerHTML = formatDiff(diff);
        document.getElementById('comparison-panel').classList.add('active');
    } catch (error) {
        console.error('Failed to compare commits:', error);
    }
}

function formatDiff(diff) {
    return diff
        .split('\n')
        .map(line => {
            if (line.startsWith('+')) {
                return `<div class="diff-line addition">${line}</div>`;
            } else if (line.startsWith('-')) {
                return `<div class="diff-line deletion">${line}</div>`;
            }
            return `<div class="diff-line">${line}</div>`;
        })
        .join('');
}

function clearSelection() {
    document.querySelectorAll('.commit').forEach(commit => {
        commit.classList.remove('selected-first', 'selected-second');
    });
    
    selectedCommits = { first: null, second: null };
    document.getElementById('first-commit').textContent = 'Select first commit';
    document.getElementById('second-commit').textContent = 'Select second commit';
    document.getElementById('compare-button').disabled = true;
    document.getElementById('comparison-panel').classList.remove('active');
    document.getElementById('diff-output').textContent = '';
}

function clearComparison() {
    document.getElementById('comparison-panel').classList.remove('active');
    document.getElementById('diff-output').innerHTML = '';
}

async function init() {
    try {
        const data = await fetchRepoData();
        allCommits = data.commits;
        
        renderBranches(data.branches, data.current);
        renderCommits(data.commits);
        updateCommitSelectors(data.commits);
        
        document.getElementById('repo-info').innerHTML = `
            <div>Current Branch: ${data.current}</div>
            <div>Total Branches: ${data.branches.length}</div>
        `;

        document.getElementById('compare-button').addEventListener('click', handleCompare);
        document.getElementById('clear-button').addEventListener('click', clearComparison);
    } catch (error) {
        console.error('Failed to load repository data:', error);
    }
}

init();
