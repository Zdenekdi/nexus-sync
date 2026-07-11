#!/usr/bin/env bash
# =============================================================================
# Nexus Relay — Android Field Test
# =============================================================================
# Simulates the exact HTTP traffic the Android Relay app sends to the server.
# Runs all relay scenarios: verify → inbound SMS → number variants → call →
# wrong-secret rejection → outbox poll → persistence check.
#
# Usage:
#   ./scripts/relay-field-test.sh
#
# Required env vars (or set in .env):
#   API_BASE_URL              e.g. https://nexus-api.myvnc.com/api
#   RELAY_MANAGER_EMAIL       manager / senior operator login
#   RELAY_MANAGER_PASSWORD
#   RELAY_INSTALLATION_ID     installation ID of the relay phone
#   RELAY_PROFILE_ID          profileId of the bound profile (e.g. ldn-01)
#   DEVICE_SECRET             shared relay secret
#
# Optional:
#   CALLER_PHONE              simulated inbound caller (default: +420777000099)
#   FIELD_TEST_STRICT         if "true", exit 1 on any failure (default: true)
# =============================================================================

set -euo pipefail

# ─── Load .env if present ────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -o allexport; source "$ENV_FILE"; set +o allexport
fi

# ─── Config ──────────────────────────────────────────────────────────────────
API_BASE="${API_BASE_URL:-https://nexus-api.myvnc.com/api}"
API_BASE="${API_BASE%/}"                       # strip trailing slash

MANAGER_EMAIL="${RELAY_MANAGER_EMAIL:-}"
MANAGER_PASSWORD="${RELAY_MANAGER_PASSWORD:-}"
INSTALLATION_ID="${RELAY_INSTALLATION_ID:-}"
PROFILE_ID="${RELAY_PROFILE_ID:-}"
DEVICE_SECRET="${DEVICE_SECRET:-}"
CALLER_PHONE="${CALLER_PHONE:-+420777000099}"
STRICT="${FIELD_TEST_STRICT:-true}"

RUN_ID="field-$(date +%s)"

# ─── Colors & counters ───────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BOLD='\033[1m'; RESET='\033[0m'
PASS=0; SKIP=0; FAIL=0

ok()   { echo -e "  ${GREEN}✔ PASS${RESET}  $1"; PASS=$((PASS+1)); }
skip() { echo -e "  ${YELLOW}⏭ SKIP${RESET}  $1"; SKIP=$((SKIP+1)); }
fail() { echo -e "  ${RED}✘ FAIL${RESET}  $1"; FAIL=$((FAIL+1)); }
info() { echo -e "\n${BOLD}▶ $1${RESET}"; }

# ─── Preflight checks ────────────────────────────────────────────────────────
info "Preflight checks"
missing=0
for var in API_BASE MANAGER_EMAIL MANAGER_PASSWORD INSTALLATION_ID PROFILE_ID DEVICE_SECRET; do
  val="${!var:-}"
  if [ -z "$val" ]; then
    echo "  Missing: $var"
    missing=$((missing+1))
  else
    echo "  ✓ $var = ${val:0:40}$([ ${#val} -gt 40 ] && echo '...' || true)"
  fi
done
if [ "$missing" -gt 0 ]; then
  echo -e "\n${RED}Set missing variables and retry.${RESET}"
  exit 1
fi

# ─── HTTP helpers ─────────────────────────────────────────────────────────────
HTTP_STATUS=""
BODY=""

curl_call() {
  local tmpfile
  tmpfile=$(mktemp)
  HTTP_STATUS=$(curl -s -o "$tmpfile" -w "%{http_code}" --max-time 20 "$@" 2>/dev/null)
  BODY=$(cat "$tmpfile")
  rm -f "$tmpfile"
}

check_status() {
  local label="$1" expected="$2"
  if [ "$HTTP_STATUS" = "$expected" ]; then
    ok "$label (HTTP $HTTP_STATUS)"
  else
    fail "$label — expected HTTP $expected, got HTTP $HTTP_STATUS"
    echo "       Body: ${BODY:0:300}"
  fi
}

check_body_contains() {
  local label="$1" expected_status="$2" needle="$3"
  if [ "$HTTP_STATUS" = "$expected_status" ] && echo "$BODY" | grep -qF "$needle"; then
    ok "$label (HTTP $HTTP_STATUS)"
  else
    fail "$label — HTTP $HTTP_STATUS, body missing '$needle'"
    echo "       Body: ${BODY:0:300}"
  fi
}

AUTH_TOKEN=""

# =============================================================================
# [1] Login — obtain manager token
# =============================================================================
info "[1] Manager login → POST /auth/login"
curl_call -X POST "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${MANAGER_EMAIL}\",\"password\":\"${MANAGER_PASSWORD}\"}"

if [ "$HTTP_STATUS" = "200" ] && echo "$BODY" | grep -qF '"token"'; then
  AUTH_TOKEN=$(echo "$BODY" | grep -oP '"token"\s*:\s*"\K[^"]+' | head -1)
  ok "[1] Manager login — token obtained"
else
  fail "[1] Manager login — HTTP $HTTP_STATUS"
  echo "     Body: ${BODY:0:300}"
  exit 1
fi

# =============================================================================
# [2] Device verify — simulate app startup
# =============================================================================
info "[2] Device verify → POST /device/verify"
curl_call -X POST "${API_BASE}/device/verify" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d "{\"installationId\":\"${INSTALLATION_ID}\",\"profileId\":\"${PROFILE_ID}\",\"platform\":\"android\",\"model\":\"FieldTestRunner\",\"deviceName\":\"relay-field-test\"}"

if [ "$HTTP_STATUS" = "200" ] && echo "$BODY" | grep -qF '"ok":true'; then
  ok "[2] Device verify — binding confirmed"
elif [ "$HTTP_STATUS" = "409" ]; then
  skip "[2] Device verify — 409 (profileRequired or already bound to different user)"
else
  fail "[2] Device verify — HTTP $HTTP_STATUS"
  echo "     Body: ${BODY:0:300}"
fi

# =============================================================================
# [3] Device status — binding metadata visible to manager
# =============================================================================
info "[3] Device status → GET /device/status"
curl_call -X GET "${API_BASE}/device/status?installationId=${INSTALLATION_ID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
check_status "[3] Device status" "200"

# =============================================================================
# [4] Relay inbound SMS — exact payload the Android app sends
# =============================================================================
info "[4] Relay inbound SMS → POST /device/relay"
SMS_CONTENT="FieldTest inbound ${RUN_ID}"
curl_call -X POST "${API_BASE}/device/relay" \
  -H "Content-Type: application/json" \
  -d "{
    \"installationId\": \"${INSTALLATION_ID}\",
    \"deviceId\": \"RELAY-DEVICE\",
    \"type\": \"sms\",
    \"transport\": \"sms\",
    \"from\": \"${CALLER_PHONE}\",
    \"content\": \"${SMS_CONTENT}\",
    \"secret\": \"${DEVICE_SECRET}\",
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"
  }"
check_body_contains "[4a] Relay inbound SMS accepted" "200" '"ok":true'

# =============================================================================
# [5] DB persistence check — message must appear in chat
# =============================================================================
info "[5] DB persistence → GET /chats then GET /messages/:chatId"
curl_call -X GET "${API_BASE}/chats" -H "Authorization: Bearer ${AUTH_TOKEN}"
if [ "$HTTP_STATUS" = "200" ]; then
  # Try to find the chat for CALLER_PHONE (match without country code too)
  CALLER_DIGITS=$(echo "$CALLER_PHONE" | tr -cd '0-9')
  CHAT_ID=$(echo "$BODY" | grep -oP '"id"\s*:\s*"\K[^"]+' | head -1 || true)

  # More accurate search: find chat whose externalId contains the caller digits
  CHAT_BLOCK=$(echo "$BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
digits = '${CALLER_DIGITS}'
for c in data:
  eid = (c.get('externalId') or '').replace(' ','').replace('+','').replace('-','')
  if digits in eid or digits[-9:] in eid:
    print(c.get('id',''))
    break
" 2>/dev/null || true)

  if [ -n "$CHAT_BLOCK" ]; then
    CHAT_ID="$CHAT_BLOCK"
    ok "[5a] Chat found for ${CALLER_PHONE} (chatId=${CHAT_ID})"

    curl_call -X GET "${API_BASE}/messages/${CHAT_ID}" -H "Authorization: Bearer ${AUTH_TOKEN}"
    if [ "$HTTP_STATUS" = "200" ] && echo "$BODY" | grep -qF "$SMS_CONTENT"; then
      ok "[5b] Message persisted in DB"
    else
      fail "[5b] Message NOT found in DB — HTTP $HTTP_STATUS"
      echo "       Body (first 400): ${BODY:0:400}"
    fi
  else
    fail "[5a] Chat NOT found for ${CALLER_PHONE}"
    echo "       Chats body (first 400): ${BODY:0:400}"
  fi
else
  fail "[5] GET /chats failed — HTTP $HTTP_STATUS"
fi

# =============================================================================
# [6] Number variant test — Czech +420/420/0/local formats
# =============================================================================
info "[6] Number variant smoke — Czech number formats"
CALLER_DIGITS=$(echo "$CALLER_PHONE" | tr -cd '0-9')
if [[ "${CALLER_DIGITS}" == 420* ]] && [ "${#CALLER_DIGITS}" -gt 9 ]; then
  NATIONAL="${CALLER_DIGITS#420}"
  VARIANTS=("+420${NATIONAL}" "420${NATIONAL}" "0${NATIONAL}" "${NATIONAL}")
else
  VARIANTS=("${CALLER_PHONE}")
fi

for variant in "${VARIANTS[@]}"; do
  curl_call -X POST "${API_BASE}/device/relay" \
    -H "Content-Type: application/json" \
    -d "{
      \"installationId\": \"${INSTALLATION_ID}\",
      \"deviceId\": \"RELAY-DEVICE\",
      \"type\": \"sms\",
      \"transport\": \"sms\",
      \"from\": \"${variant}\",
      \"content\": \"Variant test ${variant} ${RUN_ID}\",
      \"secret\": \"${DEVICE_SECRET}\"
    }"
  check_body_contains "[6] Number variant ${variant}" "200" '"ok":true'
done

# =============================================================================
# [7] Relay call RINGING event
# =============================================================================
info "[7] Relay call event → POST /device/relay"
curl_call -X POST "${API_BASE}/device/relay" \
  -H "Content-Type: application/json" \
  -d "{
    \"installationId\": \"${INSTALLATION_ID}\",
    \"deviceId\": \"RELAY-DEVICE\",
    \"type\": \"call\",
    \"transport\": \"call\",
    \"from\": \"${CALLER_PHONE}\",
    \"content\": \"RINGING\",
    \"secret\": \"${DEVICE_SECRET}\"
  }"
check_body_contains "[7] Relay RINGING accepted" "200" '"ok":true'

# =============================================================================
# [8] Security: wrong secret must be rejected
# =============================================================================
info "[8] Wrong secret rejection → POST /device/relay"
curl_call -X POST "${API_BASE}/device/relay" \
  -H "Content-Type: application/json" \
  -d "{
    \"installationId\": \"${INSTALLATION_ID}\",
    \"type\": \"sms\",
    \"transport\": \"sms\",
    \"from\": \"${CALLER_PHONE}\",
    \"content\": \"Should be rejected\",
    \"secret\": \"WRONG_SECRET_12345\"
  }"
check_status "[8] Wrong secret → 401" "401"

# =============================================================================
# [9] Security: explicit mismatched userId must be rejected
# =============================================================================
info "[9] Mismatched userId rejection → POST /device/relay"
curl_call -X POST "${API_BASE}/device/relay" \
  -H "Content-Type: application/json" \
  -d "{
    \"installationId\": \"${INSTALLATION_ID}\",
    \"userId\": \"wrong-user-id-12345\",
    \"type\": \"sms\",
    \"transport\": \"sms\",
    \"from\": \"${CALLER_PHONE}\",
    \"content\": \"Should be rejected\",
    \"secret\": \"${DEVICE_SECRET}\"
  }"
check_status "[9] Mismatched userId → 401" "401"

# =============================================================================
# [10] Outbox poll — app regularly polls for queued outbound messages
# =============================================================================
info "[10] Outbox poll → GET /messages/outbox"
curl_call -X GET "${API_BASE}/messages/outbox?profileId=${PROFILE_ID}&installationId=${INSTALLATION_ID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
check_status "[10] Outbox poll" "200"
OUTBOX_COUNT=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "?")
echo "       Pending outbox messages: ${OUTBOX_COUNT}"

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${BOLD}══════════════════════════════════════════${RESET}"
echo -e "${BOLD} Relay Field Test — Summary${RESET}"
echo -e "${BOLD}══════════════════════════════════════════${RESET}"
echo -e "  ${GREEN}PASSED:${RESET}  ${PASS}"
echo -e "  ${YELLOW}SKIPPED:${RESET} ${SKIP}"
echo -e "  ${RED}FAILED:${RESET}  ${FAIL}"
echo -e "  TOTAL:   $((PASS + SKIP + FAIL))"
echo -e "${BOLD}══════════════════════════════════════════${RESET}"
echo ""

if [ "${STRICT}" = "true" ] && [ "${FAIL}" -gt 0 ]; then
  echo -e "${RED}Field test failed (${FAIL} failure(s)). Exit 1.${RESET}"
  exit 1
fi

echo -e "${GREEN}Field test completed.${RESET}"
exit 0
