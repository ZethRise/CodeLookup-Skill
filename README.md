# CodeLookup

A specialized skill for AI coding agents (Claude Code, Gemini/Antigravity, Codex, Cursor). It forces the AI agent to verify dependency impact and check for broken references across linked systems before applying code changes.

## Features
- **Impact Assessment**: Verifies if changes to a function, class, file, or schema break callers.
- **Cascade Updates**: Prevents partial fixes by planning and applying updates to dependent systems together.
- **Integrations**: Auto-registers with Claude Code, Codex, Cursor, and Gemini.

## Usage
Once installed, the AI agent will automatically load this skill (either globally or repo-locally) and check dependencies before making edits.
