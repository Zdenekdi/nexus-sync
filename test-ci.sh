#!/bin/bash
# Mock the action failure locally just to check syntax
echo "Testing CI workflow syntax..."
yamllint .github/workflows/gcp-trigger.yaml || echo "yamllint failed, but we might not have it"
