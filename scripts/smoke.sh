#!/usr/bin/env bash
# Smoke test for the edu-mvp-platform API (bash / Git Bash / WSL / Linux / macOS).
# Requires: curl + node (for JSON parsing). The backend must be running.
#
# Usage:  BASE_URL=http://localhost:4000 bash scripts/smoke.sh
set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:4000}"
EMAIL="smoke-$(date +%s)@t.com"
PASS="pass1234"
FAILS=0

json_field() { node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const o=JSON.parse(d);const v=o['$1'];console.log(typeof v==='object'?JSON.stringify(v):v)}catch(e){console.log('')}})"; }

step() { echo; echo "== $1 =="; }
ok()   { echo "  ✔ $1"; }
fail() { echo "  ✘ $1"; FAILS=$((FAILS+1)); }

step "1) Health check"
HEALTH=$(curl -s "$BASE_URL/api/health")
echo "  $HEALTH"
[ "$(json_field ok <<<"$HEALTH")" = "true" ] && ok "health" || fail "health"

step "2) Register ($EMAIL)"
REG=$(curl -s -X POST "$BASE_URL/api/auth/register" -H "Content-Type: application/json" \
  -d "{\"name\":\"mobile\",\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"role\":\"student\"}")
echo "  $REG"
[ -n "$(json_field user.id <<<"$REG")" ] && ok "register -> user created" || fail "register"

step "3) Login -> mobile JWT"
LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
MOBILE_JWT=$(json_field token <<<"$LOGIN")
echo "  user: $(json_field user.email <<<"$LOGIN")"
[ -n "$MOBILE_JWT" ] && ok "mobile JWT received" || fail "login"

step "4) Create QR"
QR=$(curl -s -X POST "$BASE_URL/api/auth/qr/create")
QR_TOKEN=$(json_field token <<<"$QR")
echo "  qr_token: $QR_TOKEN  expiresAt: $(json_field expiresAt <<<"$QR")"
[ -n "$QR_TOKEN" ] && ok "QR token created" || fail "qr/create"

step "5) QR status -> pending"
STATUS=$(curl -s "$BASE_URL/api/auth/qr/status?token=$QR_TOKEN")
echo "  $STATUS"
[ "$(json_field status <<<"$STATUS")" = "pending" ] && ok "status=pending" || fail "status=pending"

step "6) QR confirm (Bearer mobile JWT) -> Set-Cookie"
HEADERS=$(mktemp)
BODY=$(curl -s -D "$HEADERS" -X POST "$BASE_URL/api/auth/qr/confirm" \
  -H "Authorization: Bearer $MOBILE_JWT" -H "Content-Type: application/json" \
  -d "{\"token\":\"$QR_TOKEN\"}")
grep -i "^set-cookie: token=" "$HEADERS" >/dev/null && ok "Set-Cookie: token=... (HttpOnly)" || fail "Set-Cookie missing"
WEB_COOKIE=$(grep -i "^set-cookie: token=" "$HEADERS" | head -n1 | sed -E 's/^[Ss]et-[Cc]ookie: //; s/;.*$//')
echo "  body: $BODY"

step "7) QR status now -> confirmed"
STATUS=$(curl -s "$BASE_URL/api/auth/qr/status?token=$QR_TOKEN")
[ "$(json_field status <<<"$STATUS")" = "confirmed" ] && ok "status=confirmed" || fail "status=confirmed"

step "8) /api/me with the web cookie"
ME=$(curl -s "$BASE_URL/api/me" -H "Cookie: $WEB_COOKIE")
echo "  $ME"
[ -n "$(json_field user.id <<<"$ME")" ] && ok "me works with cookie" || fail "me"

step "9) Upload PDF"
node "$(dirname "$0")/make-fixture-pdf.mjs" .tmp/sample.pdf >/dev/null
UP=$(curl -s -X POST "$BASE_URL/api/books/upload" \
  -H "Authorization: Bearer $MOBILE_JWT" \
  -F "file=@.tmp/sample.pdf;type=application/pdf" -F "title=كتاب الاختبار")
BOOK_ID=$(json_field book.id <<<"$UP")
PDF_URL=$(json_field book.pdfUrl <<<"$UP")
echo "  $UP"
[ -n "$BOOK_ID" ] && ok "book #$BOOK_ID created" || fail "upload"

step "10) Library list"
LIST=$(curl -s "$BASE_URL/api/books" -H "Cookie: $WEB_COOKIE")
echo "$LIST" | grep -q "\"id\":$BOOK_ID" && ok "book #$BOOK_ID present in /api/books" || fail "library list"

step "11) Book details + PDF serving"
DETAIL=$(curl -s "$BASE_URL/api/books/$BOOK_ID" -H "Cookie: $WEB_COOKIE")
echo "$DETAIL" | grep -q "\"id\":$BOOK_ID" && ok "details" || fail "details"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$PDF_URL")
[ "$CODE" = "200" ] && ok "PDF served at $PDF_URL (200)" || fail "PDF serving (got $CODE)"

rm -f "$HEADERS"
echo
if [ "$FAILS" -eq 0 ]; then
  echo "ALL SMOKE TESTS PASSED ✅"
else
  echo "SMOKE TESTS FAILED: $FAILS ❌"
  exit 1
fi
