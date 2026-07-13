# CodeLookup

CodeLookup is an intelligent dependency checker and safety skill for AI coding agents. It ensures that before making changes, agents scan your codebase to detect callers, dependents, and linked systems that might break, planning and applying cascade updates in a single step.

## How It Works

1. **Static Analysis**: Scans the workspace to build a static import/dependency mapping (`.codelookup/graph.json`).
2. **Git Integration**: Queries current modified and untracked files in the working directory.
3. **Blast Radius Analysis**: Traces affected dependents and outputs a Mermaid flowchart mapping the blast radius of your modifications.
4. **Agent Action Protocol**: Guides the agent to resolve and modify all affected systems collectively, preventing broken commits.

## Installation

### NPX (One-Liner - Recommended)

Run the installer interactively from the NPM registry:
```bash
npx codelookup
```

You can also run it silently to install to all detected directories:
```bash
npx codelookup --all
```

To uninstall CodeLookup from all directories:
```bash
npx codelookup --uninstall
```

### Manual Platform Shell Shims

#### macOS / Linux
```bash
curl -fsSL https://raw.githubusercontent.com/ZethRise/CodeLookup-Skill/master/install.sh | bash
```

#### Windows (PowerShell)
```powershell
irm https://raw.githubusercontent.com/ZethRise/CodeLookup-Skill/master/install.ps1 | iex
```

### Local Checkout (All Platforms)

```bash
git clone https://github.com/ZethRise/CodeLookup-Skill.git
cd CodeLookup-Skill
npm install
npx ts-node bin/install.ts
```

## Usage

Once installed, the skill instructions are copied to target agent config directories. The agent reads the instructions and performs dependency checks automatically:

1. Build/update the graph cache:
   ```bash
   npx codelookup-build
   ```
2. Run the impact analysis checker:
   ```bash
   npx codelookup-check
   ```

## Supported Agents

- **Claude Code**: Configured at `~/.claude/skills/codelookup/`
- **Gemini / Antigravity**: Configured at `~/.gemini/config/skills/codelookup/`
- **Codex**: Configured at `~/.codex/skills/codelookup/`
- **Cursor**: Configured globally at `~/.cursor/rules/` and locally at `.cursor/rules/`
