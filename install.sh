#!/bin/bash
# CodeLookup skill installer wrapper for TS execution

if [ -f "./bin/install.ts" ]; then
  npx ts-node bin/install.ts "$@"
else
  npx -y CodeLookup "$@"
fi
