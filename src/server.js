const express = require("express");
const path = require("path");
const {
  getRepoData,
  compareCommits,
  checkoutRemoteBranch,
  getBranchCommits,
} = require("./git");

const app = express();

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/repo-data", async (req, res) => {
  try {
    const data = await getRepoData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/compare", async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: "Missing commit hashes" });
    }
    const diff = await compareCommits(from, to);
    res.send(diff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/checkout-remote", async (req, res) => {
  try {
    const { branchName } = req.query;
    if (!branchName) {
      return res.status(400).json({ Rerror: "Missing branch name" });
    }
    const success = await checkoutRemoteBranch(branchName);
    if (success) {
      const data = await getRepoData();
      res.json(data);
    } else {
      res.status(500).json({ error: "Failed to checkout branch" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/branch-commits", async (req, res) => {
  try {
    const { branch } = req.query;
    if (!branch) {
      return res.status(400).json({ error: "Missing branch name" });
    }
    const commits = await getBranchCommits(branch);
    res.json(commits);
  } catch (error) {
    console.error("Failed to get branch commits:", error);
    res.status(500).json({
      error: "Failed to get branch commits",
      details: error.message,
    });
  }
});

function startServer(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, async () => {
      try {
        const openModule = await import("open");
        await openModule.default(`http://localhost:${port}`);
        resolve(port);
      } catch (error) {
        console.warn("Failed to open browser automatically.");
        console.log("Please open your browser and visit:");
        resolve(port);
      }
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        const nextPort = parseInt(port) + 1;
        console.log(`\n⚠️  Port ${port} is in use.`);
        console.log(`↪️  Trying port ${nextPort}...\n`);
        startServer(nextPort).then(resolve).catch(reject);
      } else {
        reject(error);
      }
    });
  });
}

module.exports = { startServer };
