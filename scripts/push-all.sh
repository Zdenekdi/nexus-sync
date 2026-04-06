#!/bin/bash
# Push full monorepo to nexus-sync, server-only subtree to nexus-backend
set -e

echo "📦 Pushing full repo to origin (nexus-sync)..."
git push origin master

echo "🔧 Pushing server/ subtree to live (nexus-backend)..."
git subtree push --prefix=server live master

echo "✅ Both remotes updated."
