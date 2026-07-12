# CodeLookup skill installer wrapper for TS execution on PowerShell

if (Test-Path "./bin/install.ts") {
  npx ts-node bin/install.ts $args
} else {
  npx -y CodeLookup $args
}
