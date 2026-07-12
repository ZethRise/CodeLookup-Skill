# CodeLookup

CodeLookup is an intelligent dependency checker and safety skill for AI coding agents. It ensures that before making changes, agents scan your codebase to detect callers, dependents, and linked systems that might break, planning and applying cascade updates in a single step.

## How It Works

1. **Static Analysis**: Scans the workspace to build a static import/dependency mapping (`.codelookup/graph.json`).
2. **Git Integration**: Queries current modified and untracked files in the working directory.
3. **Blast Radius Analysis**: Traces affected dependents and outputs a Mermaid flowchart mapping the blast radius of your modifications.
4. **Agent Action Protocol**: Guides the agent to resolve and modify all affected systems collectively, preventing broken commits.

## Installation

### macOS / Linux (One-Liner)

```bash
curl -fsSL https://raw.githubusercontent.com/username/CodeLookup/main/install.sh | bash
```

### Windows (PowerShell One-Liner)

```powershell
irm https://raw.githubusercontent.com/username/CodeLookup/main/install.ps1 | iex
```

### Local Checkout (All Platforms)

```bash
git clone https://github.com/username/CodeLookup.git
cd CodeLookup
node bin/install.js
```

## Usage

Once installed, the skill instructions are copied to global agent folders. The agent reads the instructions and performs dependency lookups automatically before applying edits:

1. Build/update the graph cache:
   ```bash
   npx codelookup-build
   # or node bin/generate-graph.js
   ```
2. Run the impact analysis checker:
   ```bash
   npx codelookup-check
   # or node bin/pre-check.js
   ```

## Supported Agents

- **Claude Code**: Configured at `~/.claude/skills/codelookup/`
- **Gemini / Antigravity**: Configured at `~/.gemini/config/skills/codelookup/`
- **Codex**: Configured at `~/.codex/skills/codelookup/`
- **Cursor**: Configured globally at `~/.cursor/rules/` and locally at `.cursor/rules/`
