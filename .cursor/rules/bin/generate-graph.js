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
const cwd = process.cwd();
const outputDir = path.join(cwd, '.codelookup');
const outputFile = path.join(outputDir, 'graph.json');
const EXCLUDE_DIRS = new Set(['node_modules', '.git', '.github', '.agents', '.codelookup', 'dist', 'build']);
const SUPPORTED_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.go']);
const graph = {
    dependencies: {},
    dependents: {}
};
// Traverse directory recursively
function walk(dir) {
    let files = [];
    try {
        const list = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of list) {
            if (entry.isDirectory()) {
                if (EXCLUDE_DIRS.has(entry.name))
                    continue;
                files = files.concat(walk(path.join(dir, entry.name)));
            }
            else if (entry.isFile()) {
                const ext = path.extname(entry.name);
                if (SUPPORTED_EXTENSIONS.has(ext)) {
                    files.push(path.join(dir, entry.name));
                }
            }
        }
    }
    catch (err) {
        // Skip unreadable dirs
    }
    return files;
}
// Parse JS/TS imports
function parseJsImports(content, filePath) {
    const imports = [];
    const dir = path.dirname(filePath);
    const importRegex = /(?:import|export)\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g;
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
    }
    while ((match = requireRegex.exec(content)) !== null) {
        imports.push(match[1]);
    }
    return resolveImports(imports, dir);
}
// Parse Python imports
function parsePyImports(content, filePath) {
    const imports = [];
    const importRegex = /^\s*import\s+([\w.,\s]+)/gm;
    const fromImportRegex = /^\s*from\s+([\w.]+)\s+import/gm;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        match[1].split(',').forEach(name => imports.push(name.trim()));
    }
    while ((match = fromImportRegex.exec(content)) !== null) {
        imports.push(match[1].trim());
    }
    return imports;
}
// Resolve import strings to relative file paths (best effort)
function resolveImports(importList, fileDir) {
    const resolved = [];
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
        let imports = [];
        if (file.endsWith('.py')) {
            imports = parsePyImports(content, file);
        }
        else {
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
    }
    catch (err) {
        // Skip unreadable files
    }
}
// Write output
try {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputFile, JSON.stringify(graph, null, 2));
    console.log(`Dependency graph saved to ${outputFile}`);
}
catch (err) {
    console.error(`Failed to write graph file: ${err.message}`);
    process.exit(1);
}
