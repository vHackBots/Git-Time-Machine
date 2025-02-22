async function fetchCommits() {
    const response = await fetch("/api/commits");
    const commits = await response.json();
    const commitList = document.getElementById("commit-list");
    commitList.innerHTML = commits
        .map((c) =>
            `<li>${
                c.hash.slice(0, 7)
            } - ${c.message} (${c.author}, ${c.date})</li>`
        )
        .join("");
}

async function fetchBranches() {
    const response = await fetch("/api/branches");
    const branches = await response.json();
    const branchList = document.getElementById("branch-list");
    branchList.innerHTML = branches
        .map((b) => `<li>${b.name} (HEAD: ${b.head.slice(0, 7)})</li>`)
        .join("");
}

async function compareCommits() {
    const commit1 = document.getElementById("commit1").value;
    const commit2 = document.getElementById("commit2").value;
    const response = await fetch(
        `/api/compare?commit1=${commit1}&commit2=${commit2}`,
    );
    const diff = await response.json();
    const diffOutput = document.getElementById("diff-output");
    diffOutput.textContent = JSON.stringify(diff, null, 2);
}

fetchCommits();
fetchBranches();
