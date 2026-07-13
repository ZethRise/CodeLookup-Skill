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
const child_process_1 = require("child_process");
const cwd = process.cwd();
const graphPath = path.join(cwd, '.codelookup', 'graph.json');
function getModifiedFiles() {
    const diff = (0, child_process_1.spawnSync)('git', ['diff', '--name-only'], { encoding: 'utf8' });
    const diffCached = (0, child_process_1.spawnSync)('git', ['diff', '--cached', '--name-only'], { encoding: 'utf8' });
    const status = (0, child_process_1.spawnSync)('git', ['status', '--porcelain'], { encoding: 'utf8' });
    const files = new Set();
    if (diff.status === 0) {
        diff.stdout.split('\n').forEach(f => f.trim() && files.add(f.trim().replace(/\\/g, '/')));
    }
    if (diffCached.status === 0) {
        diffCached.stdout.split('\n').forEach(f => f.trim() && files.add(f.trim().replace(/\\/g, '/')));
    }
    if (status.status === 0) {
        status.stdout.split('\n').forEach(line => {
            if (line.startsWith('?? ')) {
                files.add(line.slice(3).trim().replace(/\\/g, '/'));
            }
        });
    }
    return Array.from(files);
}
function loadOrBuildGraph() {
    if (!fs.existsSync(graphPath)) {
        console.log('Dependency graph cache missing. Generating...');
        const genScript = path.join(__dirname, 'generate-graph.js');
        const res = (0, child_process_1.spawnSync)(process.execPath, [genScript], { stdio: 'inherit' });
        if (res.status !== 0) {
            console.error('Failed to generate dependency graph.');
            process.exit(1);
        }
    }
    try {
        return JSON.parse(fs.readFileSync(graphPath, 'utf8'));
    }
    catch (err) {
        console.error(`Failed to read graph: ${err.message}`);
        process.exit(1);
    }
}
const modifiedFiles = getModifiedFiles();
if (modifiedFiles.length === 0) {
    console.log('No modified or untracked files detected in Git.');
    process.exit(0);
}
const graph = loadOrBuildGraph();
const dependentsMap = graph.dependents || {};
console.log('\n=========================================');
console.log('       CODELOOKUP IMPACT ANALYSIS        ');
console.log('=========================================\n');
console.log('Modified Files Detected:');
modifiedFiles.forEach(f => console.log(`  - ${f}`));
console.log('');
const affected = new Map();
const mermaidEdges = [];
function trace(file, caller = null) {
    if (caller) {
        if (!affected.has(file)) {
            affected.set(file, []);
        }
        const callers = affected.get(file);
        if (!callers.includes(caller)) {
            callers.push(caller);
            mermaidEdges.push(`  ${caller} --> ${file}`);
        }
    }
    const deps = dependentsMap[file] || [];
    for (const dep of deps) {
        const callers = affected.get(dep);
        if (callers && callers.includes(file))
            continue;
        trace(dep, file);
    }
}
modifiedFiles.forEach(f => trace(f));
if (affected.size === 0) {
    console.log('No dependent files will be impacted by these changes. Safe to proceed!');
}
else {
    console.log('⚠️  WARNING: The following dependent files may be impacted:');
    affected.forEach((callers, file) => {
        console.log(`\n  * ${file}`);
        console.log(`    Imported/called by: ${callers.join(', ')}`);
    });
    console.log('\n=========================================');
    console.log('        BLAST RADIUS MERMAID CHART       ');
    console.log('=========================================\n');
    console.log('```mermaid');
    console.log('flowchart TD');
    modifiedFiles.forEach(f => {
        const id = f.replace(/[^a-zA-Z0-9]/g, '_');
        console.log(`  ${id}["${f} (Modified)"]:::modified`);
    });
    affected.forEach((_, f) => {
        if (!modifiedFiles.includes(f)) {
            const id = f.replace(/[^a-zA-Z0-9]/g, '_');
            console.log(`  ${id}["${f}"]:::dependent`);
        }
    });
    const edgeSet = new Set();
    mermaidEdges.forEach(edge => {
        const parts = edge.split('-->').map(p => p.trim());
        const id1 = parts[0].replace(/[^a-zA-Z0-9]/g, '_');
        const id2 = parts[1].replace(/[^a-zA-Z0-9]/g, '_');
        edgeSet.add(`  ${id1} --> ${id2}`);
    });
    edgeSet.forEach(e => console.log(e));
    console.log('\n  classDef modified fill:#f96,stroke:#333,stroke-width:2px;');
    console.log('  classDef dependent fill:#9cf,stroke:#333,stroke-width:1px;');
    console.log('```');
}
console.log('\n=========================================\n');
