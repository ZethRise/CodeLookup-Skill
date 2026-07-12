#!/bin/bash
# CodeLookup skill installer wrapper

if [ -f "./bin/install.js" ]; then
  node bin/install.js "$@"
else
  npx -y github:username/CodeLookup "$@"
fi
