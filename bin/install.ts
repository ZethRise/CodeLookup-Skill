#!/usr/bin/env ts-node
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';

const home = os.homedir();
const cwd = process.cwd();

interface TargetConfig {
  id: string;
  name: string;
  dir: string;
  file: string;
  detectDir?: string; // Directory to check for agent presence
}

const targets: TargetConfig[] = [
  {
    id: 'gemini-global',
    name: 'Gemini/Antigravity (global)',
    dir: path.join(home, '.gemini', 'config', 'skills', 'codelookup'),
    file: 'SKILL.md',
    detectDir: path.join(home, '.gemini')
  },
  {
    id: 'claude-global',
    name: 'Claude Code (global)',
    dir: path.join(home, '.claude', 'skills', 'codelookup'),
    file: 'SKILL.md',
    detectDir: path.join(home, '.claude')
  },
  {
    id: 'codex-global',
    name: 'Codex (global)',
    dir: path.join(home, '.codex', 'skills', 'codelookup'),
    file: 'SKILL.md',
    detectDir: path.join(home, '.codex')
  },
  {
    id: 'cursor-global',
    name: 'Cursor (global)',
    dir: path.join(home, '.cursor', 'rules'),
    file: 'codelookup.mdc',
    detectDir: path.join(home, '.cursor')
  },
  {
    id: 'gemini-local',
    name: 'Gemini/Generic Workspace (local)',
    dir: path.join(cwd, '.agents', 'skills', 'codelookup'),
    file: 'SKILL.md',
    detectDir: cwd // Only relevant if inside a workspace project
  },
  {
    id: 'cursor-local',
    name: 'Cursor Workspace (local)',
    dir: path.join(cwd, '.cursor', 'rules'),
    file: 'codelookup.mdc',
    detectDir: cwd
  }
];

const srcSkill = path.join(__dirname, '..', 'skills', 'codelookup', 'SKILL.md');
const srcGenGraph = path.join(__dirname, 'generate-graph.ts');
const srcPreCheck = path.join(__dirname, 'pre-check.ts');

function checkLocalWorkspace(): boolean {
  return fs.existsSync(path.join(cwd, '.git')) || fs.existsSync(path.join(cwd, 'package.json'));
}

// Detect which targets are present
function detectTargets(): { target: TargetConfig; detected: boolean }[] {
  const isLocalWorkspace = checkLocalWorkspace();
  return targets.map(t => {
    let detected = false;
    if (t.id.includes('-local')) {
      detected = isLocalWorkspace;
    } else if (t.detectDir) {
      detected = fs.existsSync(t.detectDir);
    }
    return { target: t, detected };
  });
}

function installTo(target: TargetConfig) {
  try {
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
  } catch (err) {
    console.error(`[FAIL] Could not install to ${target.name}: ${(err as Error).message}`);
  }
}

function uninstallFrom(target: TargetConfig) {
  try {
    const destSkillPath = path.join(target.dir, target.file);
    if (fs.existsSync(destSkillPath)) {
      fs.rmSync(destSkillPath, { force: true });
    }

    const targetBinDir = path.join(target.dir, 'bin');
    if (fs.existsSync(targetBinDir)) {
      fs.rmSync(targetBinDir, { recursive: true, force: true });
    }

    // Clean up parent dir if empty (only for skill-specific directories)
    if (!target.id.includes('cursor')) {
      if (fs.existsSync(target.dir) && fs.readdirSync(target.dir).length === 0) {
        fs.rmdirSync(target.dir);
      }
    }

    console.log(`[OK] Uninstalled from ${target.name}`);
  } catch (err) {
    console.error(`[FAIL] Could not uninstall from ${target.name}: ${(err as Error).message}`);
  }
}

function runUninstallAll() {
  console.log('Uninstalling CodeLookup from all locations...');
  targets.forEach(t => uninstallFrom(t));
  console.log('Uninstallation complete.');
}

function runInstallAll() {
  const detections = detectTargets();
  const activeTargets = detections.filter(d => d.detected).map(d => d.target);
  
  if (activeTargets.length === 0) {
    console.log('No active developer targets detected. Installing to all fallback targets...');
    targets.forEach(t => installTo(t));
  } else {
    console.log(`Installing to ${activeTargets.length} detected targets...`);
    activeTargets.forEach(t => installTo(t));
  }
}

async function interactiveMenu() {
  const detections = detectTargets();
  
  console.log('\n=========================================');
  console.log('        CODELOOKUP INTERACTIVE SETUP     ');
  console.log('=========================================\n');

  console.log('Detected Systems:');
  detections.forEach((d, idx) => {
    const status = d.detected ? '[DETECTED]' : '[NOT DETECTED]';
    console.log(`  ${idx + 1}. ${d.target.name} - ${status}`);
  });
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query: string): Promise<string> => {
    return new Promise(resolve => rl.question(query, resolve));
  };

  console.log('Select Action:');
  console.log('  1. Install to all detected targets (Recommended)');
  console.log('  2. Choose specific targets');
  console.log('  3. Uninstall from all targets');
  console.log('  4. Exit');
  
  const action = await question('\nEnter choice (1-4): ');

  if (action === '1') {
    rl.close();
    runInstallAll();
  } else if (action === '2') {
    console.log('\nEnter target numbers to install (comma separated, e.g., 1,2):');
    const selectedInput = await question('Select: ');
    rl.close();

    const selectedIndices = selectedInput
      .split(',')
      .map(s => parseInt(s.trim(), 10) - 1)
      .filter(idx => idx >= 0 && idx < detections.length);

    if (selectedIndices.length === 0) {
      console.log('No valid selections made. Exiting.');
      process.exit(0);
    }

    console.log(`Installing to ${selectedIndices.length} targets...`);
    selectedIndices.forEach(idx => installTo(detections[idx].target));
  } else if (action === '3') {
    rl.close();
    runUninstallAll();
  } else {
    console.log('Exiting.');
    rl.close();
  }
}

// Entrypoint / Arg parsing
const args = process.argv.slice(2);
if (args.includes('--uninstall')) {
  runUninstallAll();
} else if (args.includes('--all') || args.includes('-y')) {
  runInstallAll();
} else {
  interactiveMenu();
}
