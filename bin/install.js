#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

const home = os.homedir();
const cwd = process.cwd();

// Target configuration
const targets = [
  // Gemini global config root
  {
    name: 'Gemini (global)',
    dir: path.join(home, '.gemini', 'config', 'skills', 'codelookup'),
    file: 'SKILL.md'
  },
  // Claude Code global config root
  {
    name: 'Claude Code (global)',
    dir: path.join(home, '.claude', 'skills', 'codelookup'),
    file: 'SKILL.md'
  },
  // Codex CLI global config root
  {
    name: 'Codex (global)',
    dir: path.join(home, '.codex', 'skills', 'codelookup'),
    file: 'SKILL.md'
  },
  // Cursor global rules directory
  {
    name: 'Cursor (global)',
    dir: path.join(home, '.cursor', 'rules'),
    file: 'codelookup.mdc'
  },
  // Gemini/generic workspace config root
  {
    name: 'Gemini/Generic Workspace (local)',
    dir: path.join(cwd, '.agents', 'skills', 'codelookup'),
    file: 'SKILL.md'
  },
  // Cursor workspace rules directory
  {
    name: 'Cursor Workspace (local)',
    dir: path.join(cwd, '.cursor', 'rules'),
    file: 'codelookup.mdc'
  }
];

const srcSkill = path.join(__dirname, '..', 'skills', 'codelookup', 'SKILL.md');
const srcGenGraph = path.join(__dirname, 'generate-graph.js');
const srcPreCheck = path.join(__dirname, 'pre-check.js');

if (!fs.existsSync(srcSkill)) {
  console.error(`Error: Source skill file not found at ${srcSkill}`);
  process.exit(1);
}

console.log('Installing CodeLookup skill and helper scripts...');

let installedCount = 0;
for (const target of targets) {
  try {
    // If local target and not in a project workspace, skip local ones
    if (target.name.includes('(local)') && !fs.existsSync(path.join(cwd, '.git')) && !fs.existsSync(path.join(cwd, 'package.json'))) {
      continue;
    }

    // Make target directory
    fs.mkdirSync(target.dir, { recursive: true });

    // Copy skill file
    const destSkillPath = path.join(target.dir, target.file);
    fs.copyFileSync(srcSkill, destSkillPath);

    // Make bin subdirectory inside target for helper scripts
    const targetBinDir = path.join(target.dir, 'bin');
    fs.mkdirSync(targetBinDir, { recursive: true });

    // Copy helper scripts
    if (fs.existsSync(srcGenGraph)) {
      fs.copyFileSync(srcGenGraph, path.join(targetBinDir, 'generate-graph.js'));
    }
    if (fs.existsSync(srcPreCheck)) {
      fs.copyFileSync(srcPreCheck, path.join(targetBinDir, 'pre-check.js'));
    }

    console.log(`[OK] Installed to ${target.name}: ${target.dir}`);
    installedCount++;
  } catch (err) {
    console.error(`[FAIL] Could not install to ${target.name}: ${err.message}`);
  }
}

console.log(`\nCodeLookup installation complete. Successfully installed to ${installedCount} locations.`);
