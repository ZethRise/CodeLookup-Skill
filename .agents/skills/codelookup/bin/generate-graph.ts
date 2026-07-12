#!/usr/bin/env ts-node
import * as fs from 'fs';
import * as path from 'path';

const cwd = process.cwd();
const outputDir = path.join(cwd, '.codelookup');
const outputFile = path.join(outputDir, 'graph.json');

const EXCLUDE_DIRS = new Set<string>(['node_modules', '.git', '.github', '.agents', '.codelookup', 'dist', 'build']);
const SUPPORTED_EXTENSIONS = new Set<string>(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.go']);

interface DependencyGraph {
  dependencies: { [key: string]: string[] };
  dependents: { [key: string]: string[] };
}

const graph: DependencyGraph = {
  dependencies: {},
  dependents: {}
};

function walk(dir: string): string[] {
  let files: string[] = [];
  try {
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of list) {
      if (entry.isDirectory()) {
        if (EXCLUDE_DIRS.has(entry.name)) continue;
        files = files.concat(walk(path.join(dir, entry.name)));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (SUPPORTED_EXTENSIONS.has(ext)) {
          files.push(path.join(dir, entry.name));
        }
      }
    }
  } catch (err) {
    // Skip unreadable dirs
  }
  return files;
}

function parseJsImports(content: string, filePath: string): string[] {
  const imports: string[] = [];
  const dir = path.dirname(filePath);

  const importRegex = /(?:import|export)\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g;
  const requireRegex = /require\(['"]([^'"]+)['"]\)/g;

  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  while ((match = requireRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return resolveImports(imports, dir);
}

function parsePyImports(content: string, filePath: string): string[] {
  const imports: string[] = [];

  const importRegex = /^\s*import\s+([\w.,\s]+)/gm;
  const fromImportRegex = /^\s*from\s+([\w.]+)\s+import/gm;

  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(content)) !== null) {
    match[1].split(',').forEach(name => imports.push(name.trim()));
  }
  while ((match = fromImportRegex.exec(content)) !== null) {
    imports.push(match[1].trim());
  }

  return imports;
}

function resolveImports(importList: string[], fileDir: string): string[] {
  const resolved: string[] = [];
  for (const imp of importList) {
    if (imp.startsWith('.')) {
      const fullPath = path.resolve(fileDir, imp);
      const candidates = [
        fullPath,
        fullPath + '.ts',
        fullPath + '.tsx',
        fullPath + '.js',
        fullPath + '.jsx',
        path.join(fullPath, 'index.ts'),
        path.join(fullPath, 'index.js')
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
          resolved.push(path.relative(cwd, cand).replace(/\\/g, '/'));
          break;
        }
      }
    }
  }
  return resolved;
}

console.log('Scanning files...');
const allFiles = walk(cwd);
console.log(`Found ${allFiles.length} source files. Parsing dependencies...`);

for (const file of allFiles) {
  const relPath = path.relative(cwd, file).replace(/\\/g, '/');
  try {
    const content = fs.readFileSync(file, 'utf8');
    let imports: string[] = [];
    if (file.endsWith('.py')) {
      imports = parsePyImports(content, file);
    } else {
      imports = parseJsImports(content, file);
    }

    if (imports.length > 0) {
      graph.dependencies[relPath] = imports;
      for (const imp of imports) {
        if (!graph.dependents[imp]) {
          graph.dependents[imp] = [];
        }
        if (!graph.dependents[imp].includes(relPath)) {
          graph.dependents[imp].push(relPath);
        }
      }
    }
  } catch (err) {
    // Skip unreadable files
  }
}

try {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(graph, null, 2));
  console.log(`Dependency graph saved to ${outputFile}`);
} catch (err) {
  console.error(`Failed to write graph file: ${(err as Error).message}`);
  process.exit(1);
}
