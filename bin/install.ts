#!/usr/bin/env ts-node
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const home = os.homedir();
const cwd = process.cwd();

interface TargetConfig {
  name: string;
  dir: string;
  file: string;
}

const targets: TargetConfig[] = [
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
const srcGenGraph = path.join(__dirname, 'generate-graph.ts');
const srcPreCheck = path.join(__dirname, 'pre-check.ts');

if (!fs.existsSync(srcSkill)) {
  console.error(`Error: Source skill file not found at ${srcSkill}`);
  process.exit(1);
}

console.log('Installing CodeLookup skill and helper scripts...');

let installedCount = 0;
for (const target of targets) {
  try {
    if (target.name.includes('(local)') && !fs.existsSync(path.join(cwd, '.git')) && !fs.existsSync(path.join(cwd, 'package.json'))) {
      continue;
    }

    fs.mkdirSync(target.dir, { recursive: true });

    const destSkillPath = path.join(target.dir, target.file);
    fs.copyFileSync(srcSkill, destSkillPath);

    const targetBinDir = path.join(target.dir, 'bin');
    fs.mkdirSync(targetBinDir, { recursive: true });

    if (fs.existsSync(srcGenGraph)) {
      fs.copyFileSync(srcGenGraph, path.join(targetBinDir, 'generate-graph.ts'));
    }
    if (fs.existsSync(srcPreCheck)) {
      fs.copyFileSync(srcPreCheck, path.join(targetBinDir, 'pre-check.ts'));
    }

    console.log(`[OK] Installed to ${target.name}: ${target.dir}`);
    installedCount++;
  } catch (err) {
    console.error(`[FAIL] Could not install to ${target.name}: ${(err as Error).message}`);
  }
}

console.log(`\nCodeLookup installation complete. Successfully installed to ${installedCount} locations.`);
