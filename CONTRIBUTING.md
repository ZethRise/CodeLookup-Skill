# Contributing to CodeLookup

Thank you for contributing! Here is how to get started.

## Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/username/CodeLookup.git
   cd CodeLookup
   ```
2. Run installation locally to test hooks and settings:
   ```bash
   node bin/install.js
   ```

## Adding Language Parsers

The AST dependency mapping logic resides in [bin/generate-graph.js](file:///d:/Projects/CodeLookup/bin/generate-graph.js).
- To add a new language, append its file extension to `SUPPORTED_EXTENSIONS`.
- Implement a parser function to extract relative file paths or module imports.
- Resolve relative module imports to local file paths using `resolveImports`.

## Submitting Pull Requests

- Keep modifications minimal and focused.
- Run tests and ensure `bin/pre-check.js` runs successfully before submitting.
- Write clear commit messages.
