<div align="center">
  <img src="src/public/images/logo.svg" width="100" height="100">

  <h1>Git Time Machine</h1>

  <br/>
</div>

An elegant visual Git history explorer with real-time commit comparison capabilities.

Built for [FOSS Hack 2025](https://fossunited.org/fosshack/2025), Git Time Machine empowers developers to travel through their codebase history, debug with ease, and collaborate seamlessly. Whether you're auditing changes, resolving conflicts, or understanding project growth, this tool has you covered—all while staying true to the spirit of free and open-source software.

---

## Demo Video

[Git Time Machine Demo](demo/git-tm-demo.mp4)

## Features

### Core Functionality

- **Interactive Branch Navigation**:
  - Visual branch list with color coding
  - Support for both local and remote branches
  - Easy branch switching and tracking

- **Rich Commit History**:
  - Beautiful commit timeline visualization
  - Emoji support for conventional commit messages
  - Author avatars with GitHub profile integration
  - Detailed commit metadata (author, date, hash)

- **Advanced Diff Viewer**:
  - Side-by-side commit comparison
  - Syntax-highlighted code diffs
  - File status indicators (Added, Modified, Deleted)
  - Collapsible diff sections by file
  - Line number tracking for both versions
  - Binary file detection

- **User Interface**:
  - Modern glass-morphism design
  - Responsive layout for all screen sizes
  - Smooth animations and transitions
  - Toast notifications for user feedback
  - Collapsible comparison panel

### Technical Features

- **Git Integration**:
  - Full Git repository support
  - Remote repository synchronization
  - Branch checkout capabilities
  - Comprehensive commit history

- **Performance**:
  - Lazy loading of commit data
  - Efficient diff parsing and rendering
  - Optimized avatar loading with fallbacks
  - Minimal memory footprint

### Installation

  ```bash
  npm install -g git-tm
  ```

## Usage

1. **Open a Project**:
   - Clone a Git repository or open an existing project directory
   - Ensure that the project has a valid Git history

2. **Run the cli command**:
   - Run the following command in the terminal:

     ```bash
     git-tm .
     ```

    - This will start the Git Time Machine server and open the web interface in your default browser

3. **Explore the History**:
   - Navigate through the commit history using the timeline
   - Compare commits by selecting two different versions
   - View detailed commit metadata and file changes
   - Switch branches and track changes in real-time
   - Enjoy the seamless Git experience!
