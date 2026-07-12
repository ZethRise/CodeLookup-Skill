# CodeLookup skill installer wrapper for PowerShell

if (Test-Path "./bin/install.js") {
  node bin/install.js $args
} else {
  npx -y github:username/CodeLookup $args
}
