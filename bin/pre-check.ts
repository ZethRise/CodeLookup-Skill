#!/usr/bin/env ts-node
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

const cwd = process.cwd();
const graphPath = path.join(cwd, '.codelookup', 'graph.json');

interface DependencyGraph {
  dependencies: { [key: string]: string[] };
  dependents: { [key: string]: string[] };
}

function getModifiedFiles(): string[] {
  const diff = spawnSync('git', ['diff', '--name-only'], { encoding: 'utf8' });
  const diffCached = spawnSync('git', ['diff', '--cached', '--name-only'], { encoding: 'utf8' });
  const status = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });

  const files = new Set<string>();

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

function loadOrBuildGraph(): DependencyGraph {
  if (!fs.existsSync(graphPath)) {
    console.log('Dependency graph cache missing. Generating...');
    const genScript = path.join(__dirname, 'generate-graph.ts');
    const res = spawnSync('npx', ['ts-node', genScript], { stdio: 'inherit', shell: true });
    if (res.status !== 0) {
      console.error('Failed to generate dependency graph.');
      process.exit(1);
    }
  }

  try {
    return JSON.parse(fs.readFileSync(graphPath, 'utf8')) as DependencyGraph;
  } catch (err) {
    console.error(`Failed to read graph: ${(err as Error).message}`);
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

const affected = new Map<string, string[]>();
const mermaidEdges: string[] = [];

function trace(file: string, caller: string | null = null): void {
  if (caller) {
    if (!affected.has(file)) {
      affected.set(file, []);
    }
    const callers = affected.get(file)!;
    if (!callers.includes(caller)) {
      callers.push(caller);
      mermaidEdges.push(`  ${caller} --> ${file}`);
    }
  }

  const deps = dependentsMap[file] || [];
  for (const dep of deps) {
    const callers = affected.get(dep);
    if (callers && callers.includes(file)) continue;
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

  const edgeSet = new Set<string>();
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
