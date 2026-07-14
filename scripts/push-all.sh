#!/bin/bash
# Push monorepo to origin (nexus-sync) + sync server/ to production (nexus-backend).
set -e

echo "📦 Pushing full repo to origin (nexus-sync)..."
git push origin master

echo "🔧 Syncing server/ to live (nexus-backend) as a PR..."
# NEPOUŽÍVEJ `git subtree push` — jakmile se repa rozejdou, skončí na
# non-fast-forward a jediná cesta by byl destruktivní force push. Bezpečný
# forward-port + PR řeší sync-server-to-prod.sh (viz docs/repo-sync.md).
"$(dirname "$0")/sync-server-to-prod.sh"

echo "✅ Origin updated + prod sync PR opened."
