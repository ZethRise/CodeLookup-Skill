#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const cwd = process.cwd();
const graphPath = path.join(cwd, '.codelookup', 'graph.json');

// Run git diff to find modified files
function getModifiedFiles() {
  const diff = spawnSync('git', ['diff', '--name-only'], { encoding: 'utf8' });
  const diffCached = spawnSync('git', ['diff', '--cached', '--name-only'], { encoding: 'utf8' });
  const status = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });

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

// Build graph if missing
function loadOrBuildGraph() {
  if (!fs.existsSync(graphPath)) {
    console.log('Dependency graph cache missing. Generating...');
    const genScript = path.join(__dirname, 'generate-graph.js');
    const res = spawnSync('node', [genScript], { stdio: 'inherit' });
    if (res.status !== 0) {
      console.error('Failed to generate dependency graph.');
      process.exit(1);
    }
  }

  try {
    return JSON.parse(fs.readFileSync(graphPath, 'utf8'));
  } catch (err) {
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

// Find all dependents recursively
const affected = new Map(); // file -> parent dependents list
const mermaidEdges = [];

function trace(file, caller = null) {
  if (caller) {
    if (!affected.has(file)) {
      affected.set(file, []);
    }
    if (!affected.get(file).includes(caller)) {
      affected.get(file).push(caller);
      mermaidEdges.push(`  ${caller} --> ${file}`);
    }
  }

  const deps = dependentsMap[file] || [];
  for (const dep of deps) {
    // Prevent infinite cycles
    if (affected.has(dep) && affected.get(dep).includes(file)) continue;
    trace(dep, file);
  }
}

modifiedFiles.forEach(f => trace(f));

if (affected.size === 0) {
  console.log('No dependent files will be impacted by these changes. Safe to proceed!');
} else {
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
  // Define styles for modified files
  modifiedFiles.forEach(f => {
    const id = f.replace(/[^a-zA-Z0-9]/g, '_');
    console.log(`  ${id}["${f} (Modified)"]:::modified`);
  });
  // Define nodes for dependents
  affected.forEach((_, f) => {
    if (!modifiedFiles.includes(f)) {
      const id = f.replace(/[^a-zA-Z0-9]/g, '_');
      console.log(`  ${id}["${f}"]:::dependent`);
    }
  });

  // Print edges
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
