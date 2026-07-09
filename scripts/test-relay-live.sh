#!/usr/bin/env bash
# ============================================================
# test-relay-live.sh — Live E2E Relay & Call Forwarding Tests
# Tests the staging Nexus Hub backend WITHOUT an Android device.
# Usage:
#   API_BASE=... DEVICE_SECRET=... PROFILE_PHONE=... MANAGER_EMAIL=... MANAGER_PASSWORD=... \
#     bash scripts/test-relay-live.sh
# ============================================================

# ─── Configuration ──────────────────────────────────────────
: "${API_BASE:?API_BASE is required, e.g. https://nexus-api.example.com/api}"
: "${DEVICE_SECRET:?DEVICE_SECRET is required}"
: "${PROFILE_PHONE:?PROFILE_PHONE is required, e.g. +420123456789}"
: "${MANAGER_EMAIL:?MANAGER_EMAIL is required}"
: "${MANAGER_PASSWORD:?MANAGER_PASSWORD is required}"
CALLER_PHONE="+420900111222"
GOIP_SRC="+420900111333"

# ─── Color codes ─────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
RESET='\033[0m'

# ─── Counters ─────────────────────────────────────────────────
PASS=0
FAIL=0

# ─── Helpers ──────────────────────────────────────────────────
info()  { echo -e "${YELLOW}[INFO]${RESET} $*"; }
ok()    { echo -e "${GREEN}[PASS]${RESET} $*"; PASS=$((PASS+1)); }
fail()  { echo -e "${RED}[FAIL]${RESET} $*"; FAIL=$((FAIL+1)); }

# curl_call — makes HTTP request, sets HTTP_STATUS + BODY
# Usage: curl_call <method> <url> [-H header] [-d data] [--data-urlencode ...]
curl_call() {
  local FULL
  FULL=$(curl -s -w "\n__HTTP_STATUS__%{http_code}" "$@" 2>&1)
  HTTP_STATUS=$(echo "$FULL" | grep '__HTTP_STATUS__' | sed 's/__HTTP_STATUS__//')
  BODY=$(echo "$FULL" | grep -v '__HTTP_STATUS__')
}

check_status() {
  local label="$1" expected="$2"
  if [ "$HTTP_STATUS" = "$expected" ]; then
    ok "$label (HTTP $HTTP_STATUS)"
  else
    fail "$label — expected HTTP $expected, got HTTP $HTTP_STATUS"
    echo    "       Body: ${BODY:0:300}"
  fi
}

check_body_contains() {
  local label="$1" expected_status="$2" fragment="$3"
  if [ "$HTTP_STATUS" = "$expected_status" ] && echo "$BODY" | grep -q "$fragment"; then
    ok "$label (HTTP $HTTP_STATUS, ✓ '$fragment')"
  else
    fail "$label — HTTP $HTTP_STATUS, body missing '$fragment'"
    echo    "       Body: ${BODY:0:300}"
  fi
}

# ─── Header ───────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║     Nexus Hub — Live Relay E2E Test Suite            ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${RESET}"
echo ""
info "API Base:      $API_BASE"
info "Profile Phone: $PROFILE_PHONE"
info "Manager:       $MANAGER_EMAIL"
echo ""

# ────────────────────────────────────────────────────────────────────────────
# [1] Mobile SMS
# ────────────────────────────────────────────────────────────────────────────
info "[1] Mobile SMS — POST /api/device/mobile/sms"
SMS_TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
curl_call -X POST "${API_BASE}/device/mobile/sms" \
  -H "Content-Type: application/json" \
  -d "{\"secret\":\"${DEVICE_SECRET}\",\"from\":\"${CALLER_PHONE}\",\"to\":\"${PROFILE_PHONE}\",\"text\":\"Test SMS ${SMS_TIMESTAMP}\"}"
check_body_contains "[1] Mobile SMS" "200" "success"

# ────────────────────────────────────────────────────────────────────────────
# [2] Mobile Call RINGING
# ────────────────────────────────────────────────────────────────────────────
info "[2] Mobile Call RINGING — POST /api/device/mobile/call"
curl_call -X POST "${API_BASE}/device/mobile/call" \
  -H "Content-Type: application/json" \
  -d "{\"secret\":\"${DEVICE_SECRET}\",\"from\":\"${CALLER_PHONE}\",\"to\":\"${PROFILE_PHONE}\",\"state\":\"RINGING\"}"
check_status "[2] Mobile Call RINGING" "200"

# ────────────────────────────────────────────────────────────────────────────
# [3] Mobile Call MISSED
# ────────────────────────────────────────────────────────────────────────────
info "[3] Mobile Call MISSED — POST /api/device/mobile/call"
curl_call -X POST "${API_BASE}/device/mobile/call" \
  -H "Content-Type: application/json" \
  -d "{\"secret\":\"${DEVICE_SECRET}\",\"from\":\"${CALLER_PHONE}\",\"to\":\"${PROFILE_PHONE}\",\"state\":\"MISSED\"}"
check_status "[3] Mobile Call MISSED" "200"

# ────────────────────────────────────────────────────────────────────────────
# [4] GoIP SMS (form-urlencoded)
# ────────────────────────────────────────────────────────────────────────────
info "[4] GoIP SMS — POST /api/device/goip/sms (form-urlencoded)"
GOIP_TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
curl_call -X POST "${API_BASE}/device/goip/sms" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "src=${GOIP_SRC}" \
  --data-urlencode "dst=${PROFILE_PHONE}" \
  --data-urlencode "msg=GoIP test ${GOIP_TIMESTAMP}"
check_body_contains "[4] GoIP SMS" "200" "RECEIVE OK"

# ────────────────────────────────────────────────────────────────────────────
# [5] Auth check — login + GET /chats
# ────────────────────────────────────────────────────────────────────────────
info "[5] Auth check — login as manager"
curl_call -X POST "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${MANAGER_EMAIL}\",\"password\":\"${MANAGER_PASSWORD}\"}"

if [ "$HTTP_STATUS" = "200" ]; then
  AUTH_TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"//')
  if [ -n "$AUTH_TOKEN" ]; then
    ok "[5a] Login as manager (HTTP 200)"

    curl_call -X GET "${API_BASE}/chats" \
      -H "Authorization: Bearer ${AUTH_TOKEN}"
    if [ "$HTTP_STATUS" = "200" ]; then
      CHAT_COUNT=$(echo "$BODY" | grep -o '"id"' | wc -l | tr -d ' ')
      ok "[5b] GET /api/chats returned 200 (${CHAT_COUNT} chats found)"
    else
      fail "[5b] GET /api/chats — expected 200, got $HTTP_STATUS"
      echo    "       Body: ${BODY:0:200}"
    fi
  else
    fail "[5a] Login — could not extract token from response"
    echo    "       Body: ${BODY:0:200}"
  fi
else
  fail "[5] Login as manager — expected 200, got $HTTP_STATUS"
  echo    "     Body: ${BODY:0:200}"
fi

# ────────────────────────────────────────────────────────────────────────────
# [6] Wrong secret → 401
# ────────────────────────────────────────────────────────────────────────────
info "[6] Wrong secret → expected 401"
curl_call -X POST "${API_BASE}/device/mobile/sms" \
  -H "Content-Type: application/json" \
  -d "{\"secret\":\"WRONGSECRET\",\"from\":\"${CALLER_PHONE}\",\"to\":\"${PROFILE_PHONE}\",\"text\":\"Should be rejected\"}"
check_status "[6] Wrong secret → 401" "401"

# ────────────────────────────────────────────────────────────────────────────
# [7] Unknown phone → 404
# ────────────────────────────────────────────────────────────────────────────
info "[7] Unknown phone → expected 404"
curl_call -X POST "${API_BASE}/device/mobile/sms" \
  -H "Content-Type: application/json" \
  -d "{\"secret\":\"${DEVICE_SECRET}\",\"from\":\"${CALLER_PHONE}\",\"to\":\"+999000000000\",\"text\":\"Test unknown number\"}"
check_status "[7] Unknown phone → 404" "404"

# ─── Summary ──────────────────────────────────────────────────
echo ""
echo -e "${BOLD}════════════════════════════════════════${RESET}"
echo -e "${BOLD}  Test Summary${RESET}"
echo -e "${BOLD}════════════════════════════════════════${RESET}"
echo -e "  ${GREEN}PASSED:${RESET} ${PASS}"
echo -e "  ${RED}FAILED:${RESET} ${FAIL}"
echo -e "  TOTAL:  $((PASS+FAIL))"
echo -e "${BOLD}════════════════════════════════════════${RESET}"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}❌ Some tests FAILED. Exit code 1.${RESET}"
  exit 1
else
  echo -e "${GREEN}✅ All tests PASSED!${RESET}"
  exit 0
fi
