#!/usr/bin/env bash
# ============================================================
# test-relay-live.sh - Live Relay smoke tests without Android.
#
# Required:
#   API_BASE=https://.../api
#   DEVICE_SECRET=...
#   PROFILE_PHONE=+420...
#   MANAGER_EMAIL=...
#   MANAGER_PASSWORD=...
#
# Optional:
#   PROFILE_ID=...              # recommended for deterministic /device/verify
#   RELAY_INSTALLATION_ID=...   # defaults to relay-smoke-<timestamp>
#   CALLER_PHONE=+420900111222
#   GOIP_SRC=+420900111333
#
# Usage:
#   API_BASE=... DEVICE_SECRET=... PROFILE_PHONE=... MANAGER_EMAIL=... MANAGER_PASSWORD=... \
#     PROFILE_ID=... bash scripts/test-relay-live.sh
# ============================================================

set -o pipefail

# --- Configuration ----------------------------------------------------------
: "${API_BASE:?API_BASE is required, e.g. https://nexus-api.example.com/api}"
: "${DEVICE_SECRET:?DEVICE_SECRET is required}"
: "${PROFILE_PHONE:?PROFILE_PHONE is required, e.g. +420123456789}"
: "${MANAGER_EMAIL:?MANAGER_EMAIL is required}"
: "${MANAGER_PASSWORD:?MANAGER_PASSWORD is required}"

CALLER_PHONE="${CALLER_PHONE:-+420900111222}"
GOIP_SRC="${GOIP_SRC:-+420900111333}"
RELAY_INSTALLATION_ID="${RELAY_INSTALLATION_ID:-relay-smoke-$(date +%s)}"
RELAY_DEVICE_NAME="${RELAY_DEVICE_NAME:-Relay Smoke Test}"
RUN_ID="$(date '+%Y%m%d-%H%M%S')"

export API_BASE DEVICE_SECRET PROFILE_PHONE MANAGER_EMAIL MANAGER_PASSWORD
export CALLER_PHONE GOIP_SRC RELAY_INSTALLATION_ID RELAY_DEVICE_NAME PROFILE_ID RUN_ID

# --- Color codes ------------------------------------------------------------
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
RESET='\033[0m'

# --- Counters ---------------------------------------------------------------
PASS=0
FAIL=0
SKIP=0

# --- Helpers ----------------------------------------------------------------
info() { echo -e "${YELLOW}[INFO]${RESET} $*"; }
ok() { echo -e "${GREEN}[PASS]${RESET} $*"; PASS=$((PASS + 1)); }
skip() { echo -e "${YELLOW}[SKIP]${RESET} $*"; SKIP=$((SKIP + 1)); }
fail() {
  echo -e "${RED}[FAIL]${RESET} $*"
  FAIL=$((FAIL + 1))
}

json_payload() {
  node -e "$1"
}

json_field() {
  printf '%s' "$BODY" | node -e '
const fields = process.argv.slice(1);
let data = "";
process.stdin.on("data", chunk => { data += chunk; });
process.stdin.on("end", () => {
  try {
    const json = JSON.parse(data || "{}");
    for (const field of fields) {
      const value = field.split(".").reduce((acc, key) => acc && acc[key], json);
      if (value !== undefined && value !== null && value !== "") {
        process.stdout.write(String(value));
        return;
      }
    }
  } catch {}
});
' "$@"
}

find_chat_id_for_phone() {
  local phone="$1"
  printf '%s' "$BODY" | PHONE="$phone" node -e '
const phone = process.env.PHONE || "";
const targetDigits = phone.replace(/\D/g, "");
const targetNational = targetDigits.startsWith("420") ? targetDigits.slice(3) : targetDigits;
let data = "";
process.stdin.on("data", chunk => { data += chunk; });
process.stdin.on("end", () => {
  try {
    const json = JSON.parse(data || "[]");
    const chats = Array.isArray(json) ? json : (json.chats || json.data || []);
    const match = chats.find((chat) => {
      const candidates = [
        chat.externalId,
        chat.from,
        chat.phone,
        chat.phoneNumber,
        chat.clientPhone,
        chat.number
      ].filter(Boolean).map(String);
      return candidates.some((value) => {
        const digits = value.replace(/\D/g, "");
        const national = digits.startsWith("420") ? digits.slice(3) : digits;
        return digits === targetDigits || national === targetNational || digits.endsWith(targetNational);
      });
    });
    if (match && match.id) process.stdout.write(String(match.id));
  } catch {}
});
'
}

# curl_call - makes HTTP request, sets HTTP_STATUS + BODY.
curl_call() {
  local full
  full=$(curl -s -w "\n__HTTP_STATUS__%{http_code}" "$@" 2>&1)
  HTTP_STATUS=$(printf '%s' "$full" | sed -n 's/^__HTTP_STATUS__//p' | tail -n 1)
  BODY=$(printf '%s' "$full" | sed '/^__HTTP_STATUS__/d')
}

check_status() {
  local label="$1"
  local expected="$2"
  if [ "$HTTP_STATUS" = "$expected" ]; then
    ok "$label (HTTP $HTTP_STATUS)"
  else
    fail "$label - expected HTTP $expected, got HTTP $HTTP_STATUS"
    echo "       Body: ${BODY:0:300}"
  fi
}

check_status_any() {
  local label="$1"
  shift
  local expected
  for expected in "$@"; do
    if [ "$HTTP_STATUS" = "$expected" ]; then
      ok "$label (HTTP $HTTP_STATUS)"
      return
    fi
  done
  fail "$label - expected HTTP one of [$*], got HTTP $HTTP_STATUS"
  echo "       Body: ${BODY:0:300}"
}

check_body_contains() {
  local label="$1"
  local expected_status="$2"
  local fragment="$3"
  if [ "$HTTP_STATUS" = "$expected_status" ] && printf '%s' "$BODY" | grep -Fq "$fragment"; then
    ok "$label (HTTP $HTTP_STATUS, contains '$fragment')"
  else
    fail "$label - HTTP $HTTP_STATUS, body missing '$fragment'"
    echo "       Body: ${BODY:0:300}"
  fi
}

check_legacy_body_contains() {
  local label="$1"
  local expected_status="$2"
  local fragment="$3"
  if [ "$HTTP_STATUS" = "410" ]; then
    skip "$label - legacy endpoint disabled (HTTP 410)"
    return
  fi
  check_body_contains "$label" "$expected_status" "$fragment"
}

check_legacy_status() {
  local label="$1"
  local expected_status="$2"
  if [ "$HTTP_STATUS" = "410" ]; then
    skip "$label - legacy endpoint disabled (HTTP 410)"
    return
  fi
  check_status "$label" "$expected_status"
}

post_relay_sms() {
  local from_phone="$1"
  local message="$2"
  export RELAY_FROM="$from_phone" RELAY_CONTENT="$message"
  local payload
  payload=$(json_payload 'process.stdout.write(JSON.stringify({
    installationId: process.env.RELAY_INSTALLATION_ID,
    type: "sms",
    transport: "sms",
    from: process.env.RELAY_FROM,
    content: process.env.RELAY_CONTENT,
    secret: process.env.DEVICE_SECRET,
    timestamp: new Date().toISOString()
  }))')
  curl_call -X POST "${API_BASE}/device/relay" \
    -H "Content-Type: application/json" \
    -d "$payload"
}

# --- Header -----------------------------------------------------------------
echo ""
echo -e "${BOLD}======================================================${RESET}"
echo -e "${BOLD} Nexus Hub - Live Relay Smoke Test Suite              ${RESET}"
echo -e "${BOLD}======================================================${RESET}"
echo ""
info "API Base:        $API_BASE"
info "Profile Phone:   $PROFILE_PHONE"
info "Manager:         $MANAGER_EMAIL"
info "Installation ID: $RELAY_INSTALLATION_ID"
if [ -n "${PROFILE_ID:-}" ]; then
  info "Profile ID:      $PROFILE_ID"
else
  info "Profile ID:      not set; /device/verify will rely on assigned profile"
fi
echo ""

# ---------------------------------------------------------------------------
# [1] Auth check - login + GET /chats
# ---------------------------------------------------------------------------
info "[1] Auth check - login as manager"
LOGIN_PAYLOAD=$(json_payload 'process.stdout.write(JSON.stringify({
  email: process.env.MANAGER_EMAIL,
  password: process.env.MANAGER_PASSWORD
}))')
curl_call -X POST "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_PAYLOAD"

AUTH_TOKEN=""
if [ "$HTTP_STATUS" = "200" ]; then
  AUTH_TOKEN=$(json_field token accessToken data.token data.accessToken)
  if [ -n "$AUTH_TOKEN" ]; then
    ok "[1a] Login as manager (HTTP 200)"
    curl_call -X GET "${API_BASE}/chats" \
      -H "Authorization: Bearer ${AUTH_TOKEN}"
    check_status "[1b] GET /api/chats" "200"
  else
    fail "[1a] Login - could not extract token from response"
    echo "       Body: ${BODY:0:200}"
  fi
else
  fail "[1] Login as manager - expected HTTP 200, got HTTP $HTTP_STATUS"
  echo "     Body: ${BODY:0:200}"
fi

# ---------------------------------------------------------------------------
# [2] Current Nexus Relay flow - POST /device/verify
# ---------------------------------------------------------------------------
RELAY_READY=0
if [ -z "$AUTH_TOKEN" ]; then
  skip "[2] Device verify - missing manager auth token"
else
  info "[2] Device verify - POST /api/device/verify"
  if [ -n "${PROFILE_ID:-}" ]; then
    VERIFY_PAYLOAD=$(json_payload 'process.stdout.write(JSON.stringify({
      installationId: process.env.RELAY_INSTALLATION_ID,
      profileId: process.env.PROFILE_ID,
      platform: "android",
      model: "RelaySmoke",
      deviceName: process.env.RELAY_DEVICE_NAME
    }))')
  else
    VERIFY_PAYLOAD=$(json_payload 'process.stdout.write(JSON.stringify({
      installationId: process.env.RELAY_INSTALLATION_ID,
      platform: "android",
      model: "RelaySmoke",
      deviceName: process.env.RELAY_DEVICE_NAME
    }))')
  fi

  curl_call -X POST "${API_BASE}/device/verify" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -d "$VERIFY_PAYLOAD"

  if [ "$HTTP_STATUS" = "200" ] && printf '%s' "$BODY" | grep -Fq '"ok":true'; then
    ok "[2a] Device verify"
    RELAY_READY=1

    curl_call -X GET "${API_BASE}/device/status?installationId=${RELAY_INSTALLATION_ID}" \
      -H "Authorization: Bearer ${AUTH_TOKEN}"
    check_status "[2b] Device status after verify" "200"
  elif [ "$HTTP_STATUS" = "409" ] && printf '%s' "$BODY" | grep -Fq "profileRequired"; then
    skip "[2] Device verify needs PROFILE_ID or assigned profile (HTTP 409)"
  else
    fail "[2] Device verify - expected HTTP 200, got HTTP $HTTP_STATUS"
    echo "     Body: ${BODY:0:300}"
  fi
fi

# ---------------------------------------------------------------------------
# [3] Current Nexus Relay flow - SMS + persistence check
# ---------------------------------------------------------------------------
if [ "$RELAY_READY" = "1" ]; then
  info "[3] Relay SMS - POST /api/device/relay"
  RELAY_SMS_CONTENT="Relay smoke inbound ${RUN_ID}"
  post_relay_sms "$CALLER_PHONE" "$RELAY_SMS_CONTENT"
  check_body_contains "[3a] Relay SMS accepted" "200" '"ok":true'

  if [ -n "$AUTH_TOKEN" ]; then
    curl_call -X GET "${API_BASE}/chats" \
      -H "Authorization: Bearer ${AUTH_TOKEN}"
    if [ "$HTTP_STATUS" = "200" ]; then
      CHAT_ID=$(find_chat_id_for_phone "$CALLER_PHONE")
      if [ -n "$CHAT_ID" ]; then
        ok "[3b] Relay chat found (${CHAT_ID})"
        curl_call -X GET "${API_BASE}/messages/${CHAT_ID}" \
          -H "Authorization: Bearer ${AUTH_TOKEN}"
        check_body_contains "[3c] Relay message persisted" "200" "$RELAY_SMS_CONTENT"
      else
        fail "[3b] Relay chat not found for ${CALLER_PHONE}"
        echo "       Body: ${BODY:0:300}"
      fi
    else
      fail "[3b] GET /api/chats after relay SMS - got HTTP $HTTP_STATUS"
      echo "       Body: ${BODY:0:300}"
    fi
  fi
else
  skip "[3] Relay SMS - no active verified binding"
fi

# ---------------------------------------------------------------------------
# [4] Current Nexus Relay flow - Czech number variants +420 / 420 / 0 / local
# ---------------------------------------------------------------------------
if [ "$RELAY_READY" = "1" ]; then
  info "[4] Relay SMS number variants"
  CALLER_DIGITS=$(printf '%s' "$CALLER_PHONE" | tr -cd '0-9')
  if [[ "$CALLER_DIGITS" == 420* && ${#CALLER_DIGITS} -gt 9 ]]; then
    NATIONAL_DIGITS="${CALLER_DIGITS#420}"
    NUMBER_VARIANTS=("+420${NATIONAL_DIGITS}" "420${NATIONAL_DIGITS}" "0${NATIONAL_DIGITS}" "${NATIONAL_DIGITS}")
  else
    NUMBER_VARIANTS=("$CALLER_PHONE")
  fi

  for variant in "${NUMBER_VARIANTS[@]}"; do
    VARIANT_CONTENT="Relay variant ${variant} ${RUN_ID}"
    post_relay_sms "$variant" "$VARIANT_CONTENT"
    check_body_contains "[4] Relay variant ${variant}" "200" '"ok":true'
  done
else
  skip "[4] Relay SMS number variants - no active verified binding"
fi

# ---------------------------------------------------------------------------
# [5] Current Nexus Relay flow - call event
# ---------------------------------------------------------------------------
if [ "$RELAY_READY" = "1" ]; then
  info "[5] Relay Call RINGING - POST /api/device/relay"
  RELAY_CALL_PAYLOAD=$(json_payload 'process.stdout.write(JSON.stringify({
    installationId: process.env.RELAY_INSTALLATION_ID,
    type: "call",
    transport: "call",
    from: process.env.CALLER_PHONE,
    content: "RINGING",
    secret: process.env.DEVICE_SECRET
  }))')
  curl_call -X POST "${API_BASE}/device/relay" \
    -H "Content-Type: application/json" \
    -d "$RELAY_CALL_PAYLOAD"
  check_body_contains "[5] Relay Call RINGING" "200" '"ok":true'
else
  skip "[5] Relay Call - no active verified binding"
fi

# ---------------------------------------------------------------------------
# [6] Current Nexus Relay flow - wrong secret
# ---------------------------------------------------------------------------
if [ "$RELAY_READY" = "1" ]; then
  info "[6] Relay wrong secret - expected 401"
  WRONG_RELAY_PAYLOAD=$(json_payload 'process.stdout.write(JSON.stringify({
    installationId: process.env.RELAY_INSTALLATION_ID,
    type: "sms",
    transport: "sms",
    from: process.env.CALLER_PHONE,
    content: "Should be rejected",
    secret: "WRONGSECRET"
  }))')
  curl_call -X POST "${API_BASE}/device/relay" \
    -H "Content-Type: application/json" \
    -d "$WRONG_RELAY_PAYLOAD"
  check_status "[6] Relay wrong secret" "401"
else
  skip "[6] Relay wrong secret - no active verified binding"
fi

# ---------------------------------------------------------------------------
# [7] Legacy Mobile SMS (optional; can be disabled in production)
# ---------------------------------------------------------------------------
info "[7] Legacy Mobile SMS - POST /api/device/mobile/sms"
SMS_TEXT="Legacy mobile SMS ${RUN_ID}"
export SMS_TEXT
SMS_PAYLOAD=$(json_payload 'process.stdout.write(JSON.stringify({
  secret: process.env.DEVICE_SECRET,
  from: process.env.CALLER_PHONE,
  to: process.env.PROFILE_PHONE,
  text: process.env.SMS_TEXT
}))')
curl_call -X POST "${API_BASE}/device/mobile/sms" \
  -H "Content-Type: application/json" \
  -d "$SMS_PAYLOAD"
check_legacy_body_contains "[7] Legacy Mobile SMS" "200" "success"

# ---------------------------------------------------------------------------
# [8] Legacy Mobile Call (optional; can be disabled in production)
# ---------------------------------------------------------------------------
info "[8] Legacy Mobile Call RINGING - POST /api/device/mobile/call"
CALL_PAYLOAD=$(json_payload 'process.stdout.write(JSON.stringify({
  secret: process.env.DEVICE_SECRET,
  from: process.env.CALLER_PHONE,
  to: process.env.PROFILE_PHONE,
  state: "RINGING"
}))')
curl_call -X POST "${API_BASE}/device/mobile/call" \
  -H "Content-Type: application/json" \
  -d "$CALL_PAYLOAD"
check_legacy_status "[8] Legacy Mobile Call RINGING" "200"

# ---------------------------------------------------------------------------
# [9] Legacy GoIP SMS (optional; can be disabled in production)
# ---------------------------------------------------------------------------
info "[9] Legacy GoIP SMS - POST /api/device/goip/sms"
GOIP_TEXT="GoIP smoke ${RUN_ID}"
curl_call -X POST "${API_BASE}/device/goip/sms" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "secret=${DEVICE_SECRET}" \
  --data-urlencode "src=${GOIP_SRC}" \
  --data-urlencode "dst=${PROFILE_PHONE}" \
  --data-urlencode "msg=${GOIP_TEXT}"
check_legacy_body_contains "[9] Legacy GoIP SMS" "200" "RECEIVE OK"

# ---------------------------------------------------------------------------
# [10] Legacy wrong secret + unknown phone checks (optional)
# ---------------------------------------------------------------------------
info "[10] Legacy negative checks"
WRONG_SMS_PAYLOAD=$(json_payload 'process.stdout.write(JSON.stringify({
  secret: "WRONGSECRET",
  from: process.env.CALLER_PHONE,
  to: process.env.PROFILE_PHONE,
  text: "Should be rejected"
}))')
curl_call -X POST "${API_BASE}/device/mobile/sms" \
  -H "Content-Type: application/json" \
  -d "$WRONG_SMS_PAYLOAD"
check_legacy_status "[10a] Legacy wrong secret" "401"

UNKNOWN_SMS_PAYLOAD=$(json_payload 'process.stdout.write(JSON.stringify({
  secret: process.env.DEVICE_SECRET,
  from: process.env.CALLER_PHONE,
  to: "+999000000000",
  text: "Test unknown number"
}))')
curl_call -X POST "${API_BASE}/device/mobile/sms" \
  -H "Content-Type: application/json" \
  -d "$UNKNOWN_SMS_PAYLOAD"
check_legacy_status "[10b] Legacy unknown phone" "404"

# --- Summary ----------------------------------------------------------------
echo ""
echo -e "${BOLD}========================================${RESET}"
echo -e "${BOLD} Test Summary${RESET}"
echo -e "${BOLD}========================================${RESET}"
echo -e "  ${GREEN}PASSED:${RESET}  ${PASS}"
echo -e "  ${YELLOW}SKIPPED:${RESET} ${SKIP}"
echo -e "  ${RED}FAILED:${RESET}  ${FAIL}"
echo -e "  TOTAL:   $((PASS + SKIP + FAIL))"
echo -e "${BOLD}========================================${RESET}"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}Some tests failed. Exit code 1.${RESET}"
  exit 1
fi

echo -e "${GREEN}All required tests passed.${RESET}"
exit 0
