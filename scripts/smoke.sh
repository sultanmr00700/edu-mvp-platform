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
ok()   { echo "  ??? $1"; }
fail() { echo "  ??? $1"; FAILS=$((FAILS+1)); }

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

step "8) QR confirm again -> rejected (one-time token)"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/qr/confirm" \
  -H "Authorization: Bearer $MOBILE_JWT" -H "Content-Type: application/json" \
  -d "{\"token\":\"$QR_TOKEN\"}")
[ "$CODE" = "400" ] && ok "second confirm rejected with 400" || fail "second confirm (got $CODE)"

step "9) /api/me with the web cookie"
ME=$(curl -s "$BASE_URL/api/me" -H "Cookie: $WEB_COOKIE")
echo "  $ME"
[ -n "$(json_field user.id <<<"$ME")" ] && ok "me works with cookie" || fail "me"

step "10) Upload PDF as student -> 403 (admin-only)"
node "$(dirname "$0")/make-fixture-pdf.mjs" .tmp/sample.pdf >/dev/null
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/books/upload" \
  -H "Authorization: Bearer $MOBILE_JWT" \
  -F "file=@.tmp/sample.pdf;type=application/pdf" -F "title=ShouldFail")
[ "$CODE" = "403" ] && ok "student upload blocked with 403" || fail "student upload (got $CODE, expected 403)"

step "11) Upload PDF as admin"
ADMIN_EMAIL="admin-smoke-$(date +%s)@t.com"
curl -s -X POST "$BASE_URL/api/auth/register" -H "Content-Type: application/json" \
  -d "{\"name\":\"admin\",\"email\":\"$ADMIN_EMAIL\",\"password\":\"$PASS\",\"role\":\"admin\"}" >/dev/null
ADMIN_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$PASS\"}")
ADMIN_JWT=$(json_field token <<<"$ADMIN_LOGIN")
UP=$(curl -s -X POST "$BASE_URL/api/books/upload" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -F "file=@.tmp/sample.pdf;type=application/pdf" -F "title=Book (test)")
BOOK_ID=$(json_field book.id <<<"$UP")
PDF_URL=$(json_field book.pdfUrl <<<"$UP")
echo "  $UP"
[ -n "$BOOK_ID" ] && ok "book #$BOOK_ID created by admin" || fail "upload (admin)"

step "12) Library list"
LIST=$(curl -s "$BASE_URL/api/books" -H "Cookie: $WEB_COOKIE")
echo "$LIST" | grep -q "\"id\":$BOOK_ID" && ok "book #$BOOK_ID present in /api/books" || fail "library list"

step "13) Book details + PDF serving"
DETAIL=$(curl -s "$BASE_URL/api/books/$BOOK_ID" -H "Cookie: $WEB_COOKIE")
echo "$DETAIL" | grep -q "\"id\":$BOOK_ID" && ok "details" || fail "details"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$PDF_URL")
[ "$CODE" = "200" ] && ok "PDF served at $PDF_URL (200)" || fail "PDF serving (got $CODE)"

step "14) Parent dashboard: /api/parent/children (seeded demo family)"
PARENT_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"parent@edu.local","password":"parent1234"}')
PARENT_JWT=$(json_field token <<<"$PARENT_LOGIN")
if [ -z "$PARENT_JWT" ]; then
  echo "  [SKIP] demo family not seeded (run: npx prisma db seed in backend/)"
else
  CHILDREN=$(curl -s "$BASE_URL/api/parent/children" -H "Authorization: Bearer $PARENT_JWT")
  echo "  $CHILDREN"
  echo "$CHILDREN" | grep -q '"children"' && echo "$CHILDREN" | grep -q '"recommendations"' \
    && ok "parent sees children + recommendations" || fail "parent/children"
fi

step "15) Student dashboard: /api/student/overview (seeded demo family)"
STU_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"student@edu.local","password":"student1234"}')
STU_JWT=$(json_field token <<<"$STU_LOGIN")
if [ -z "$STU_JWT" ]; then
  echo "  [SKIP] demo family not seeded (run: npx prisma db seed in backend/)"
else
  OVERVIEW=$(curl -s "$BASE_URL/api/student/overview" -H "Authorization: Bearer $STU_JWT")
  echo "  $OVERVIEW"
  echo "$OVERVIEW" | grep -q '"subjects"' && echo "$OVERVIEW" | grep -q '"templates"' \
    && ok "student sees subjects + exam templates" || fail "student/overview"
fi

rm -f "$HEADERS"
echo
if [ "$FAILS" -eq 0 ]; then
  echo "ALL SMOKE TESTS PASSED ???"
else
  echo "SMOKE TESTS FAILED: $FAILS ???"
  exit 1
fi
