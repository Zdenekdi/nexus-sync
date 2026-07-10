#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

: "${HETZNER_SSH_HOST:?HETZNER_SSH_HOST is required}"
: "${SSH_KEY_PATH:?SSH_KEY_PATH is required}"

SSH_USER="${HETZNER_SSH_USER:-${SSH_USER:-root}}"
LOCAL_PORT="${AI_TUNNEL_LOCAL_PORT:-11434}"
REMOTE_HOST="${AI_TUNNEL_REMOTE_HOST:-127.0.0.1}"
REMOTE_PORT="${AI_TUNNEL_REMOTE_PORT:-11434}"

exec ssh \
  -N \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -i "$SSH_KEY_PATH" \
  -L "${LOCAL_PORT}:${REMOTE_HOST}:${REMOTE_PORT}" \
  "${SSH_USER}@${HETZNER_SSH_HOST}"
