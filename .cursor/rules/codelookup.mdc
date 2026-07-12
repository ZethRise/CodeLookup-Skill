---
name: CodeLookup
description: Forces AI Agent to search for callers, dependents, and linked systems before making changes.
---

Always check impact before changing codebase. Code changes can break dependent systems. Follow this checklist.

## Action Protocol

BEFORE editing, creating, or deleting code (functions, classes, files, variables, tables, config):

1. **Run Dependency Pre-Check**:
   - Run workspace local `node bin/pre-check.js` (or global `npx codelookup-check` / local `npm run check`) to scan Git changes, trace dependencies, and map the blast radius.
   - If `.codelookup/graph.json` does not exist or is outdated, run `node bin/generate-graph.js` first.
   - Always output the generated Mermaid blast radius flowchart in your response analysis.

2. **Verify Callers**:
   - Inspect files identified by the pre-check tool.
   - Trace contract, return type, schema, or signature changes.

3. **Plan Cascade Updates**:
   - Ensure all affected callers and linked systems are modified in the same change step. No partial commits.

4. **Run Integration Tests**:
   - Run tests covering both the modified file and its dependent files.
