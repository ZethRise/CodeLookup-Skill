#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const readline = __importStar(require("readline"));
const home = os.homedir();
const cwd = process.cwd();
const targets = [
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
const srcGenGraph = path.join(__dirname, 'generate-graph.js');
const srcPreCheck = path.join(__dirname, 'pre-check.js');
function checkLocalWorkspace() {
    return fs.existsSync(path.join(cwd, '.git')) || fs.existsSync(path.join(cwd, 'package.json'));
}
// Detect which targets are present
function detectTargets() {
    const isLocalWorkspace = checkLocalWorkspace();
    return targets.map(t => {
        let detected = false;
        if (t.id.includes('-local')) {
            detected = isLocalWorkspace;
        }
        else if (t.detectDir) {
            detected = fs.existsSync(t.detectDir);
        }
        return { target: t, detected };
    });
}
function installTo(target) {
    try {
        fs.mkdirSync(target.dir, { recursive: true });
        const destSkillPath = path.join(target.dir, target.file);
        fs.copyFileSync(srcSkill, destSkillPath);
        const targetBinDir = path.join(target.dir, 'bin');
        fs.mkdirSync(targetBinDir, { recursive: true });
        if (fs.existsSync(srcGenGraph)) {
            fs.copyFileSync(srcGenGraph, path.join(targetBinDir, 'generate-graph.js'));
        }
        if (fs.existsSync(srcPreCheck)) {
            fs.copyFileSync(srcPreCheck, path.join(targetBinDir, 'pre-check.js'));
        }
        console.log(`[OK] Installed to ${target.name}: ${target.dir}`);
    }
    catch (err) {
        console.error(`[FAIL] Could not install to ${target.name}: ${err.message}`);
    }
}
function uninstallFrom(target) {
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
    }
    catch (err) {
        console.error(`[FAIL] Could not uninstall from ${target.name}: ${err.message}`);
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
    }
    else {
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
    const question = (query) => {
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
    }
    else if (action === '2') {
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
    }
    else if (action === '3') {
        rl.close();
        runUninstallAll();
    }
    else {
        console.log('Exiting.');
        rl.close();
    }
}
// Entrypoint / Arg parsing
const args = process.argv.slice(2);
if (args.includes('--uninstall')) {
    runUninstallAll();
}
else if (args.includes('--all') || args.includes('-y')) {
    runInstallAll();
}
else {
    interactiveMenu();
}
