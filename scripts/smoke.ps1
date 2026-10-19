# Smoke test for the edu-mvp-platform API (Windows PowerShell 5.1+).
# The backend must be running. Usage:  .\scripts\smoke.ps1 [-BaseUrl http://localhost:4000]
#
# Note: JSON bodies are written to temp files (UTF-8, no BOM) and passed with
# `-d @file` because PowerShell 5.1 mangles embedded quotes in native arguments.
param([string]$BaseUrl = "http://localhost:4000")

$ErrorActionPreference = "Stop"
$Email = "smoke-$([int](Get-Date -UFormat %s))@t.com"
$Pass = "pass1234"
$Fails = 0
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Step($n) { Write-Host "`n== $n ==" -ForegroundColor Cyan }
function Ok($m) { Write-Host "  [OK] $m" -ForegroundColor Green }
function Fail($m) { Write-Host "  [FAIL] $m" -ForegroundColor Red; $script:Fails++ }
function JsonFile([string]$json) {
  $f = New-TemporaryFile
  [System.IO.File]::WriteAllText($f, $json, $Utf8NoBom)
  return $f
}

Step "1) Health check"
$health = curl.exe -s "$BaseUrl/api/health"
Write-Host "  $health"
if ($health -match '"ok"\s*:\s*true') { Ok "health" } else { Fail "health" }

Step "2) Register ($Email)"
$regBody = JsonFile ('{"name":"mobile","email":"' + $Email + '","password":"' + $Pass + '","role":"student"}')
$reg = curl.exe -s -X POST "$BaseUrl/api/auth/register" -H "Content-Type: application/json" -d "@$regBody"
Write-Host "  $reg"
if ($reg -match '"id"') { Ok "register -> user created" } else { Fail "register" }

Step "3) Login -> mobile JWT"
$loginBody = JsonFile ('{"email":"' + $Email + '","password":"' + $Pass + '"}')
$login = curl.exe -s -X POST "$BaseUrl/api/auth/login" -H "Content-Type: application/json" -d "@$loginBody"
$loginObj = $login | ConvertFrom-Json
$MobileJwt = $loginObj.token
Write-Host "  user: $($loginObj.user.email)"
if ($MobileJwt) { Ok "mobile JWT received" } else { Fail "login" }

Step "4) Create QR"
$qr = curl.exe -s -X POST "$BaseUrl/api/auth/qr/create" | ConvertFrom-Json
$QrToken = $qr.token
Write-Host "  qr_token: $QrToken  expiresAt: $($qr.expiresAt)"
if ($QrToken) { Ok "QR token created" } else { Fail "qr/create" }

Step "5) QR status -> pending"
$status = curl.exe -s "$BaseUrl/api/auth/qr/status?token=$QrToken" | ConvertFrom-Json
if ($status.status -eq "pending") { Ok "status=pending" } else { Fail "status=pending (got $($status.status))" }

Step "6) QR confirm (Bearer mobile JWT) -> Set-Cookie"
$hdrFile = New-TemporaryFile
$confirmBody = JsonFile ('{"token":"' + $QrToken + '"}')
$body = curl.exe -s -D $hdrFile -X POST "$BaseUrl/api/auth/qr/confirm" `
  -H "Authorization: Bearer $MobileJwt" -H "Content-Type: application/json" -d "@$confirmBody"
$hdr = Get-Content $hdrFile
$setCookie = $hdr | Where-Object { $_ -match "^set-cookie:\s*token=" }
Write-Host "  body: $body"
if ($setCookie) { Ok "Set-Cookie: token=... (HttpOnly)" } else { Fail "Set-Cookie missing" }
$WebCookie = (($setCookie | Select-Object -First 1) -replace "^set-cookie:\s*", "") -replace ";.*$", ""

Step "7) QR status now -> confirmed"
$status = curl.exe -s "$BaseUrl/api/auth/qr/status?token=$QrToken" | ConvertFrom-Json
if ($status.status -eq "confirmed") { Ok "status=confirmed" } else { Fail "status=confirmed (got $($status.status))" }

Step "8) QR confirm again -> rejected (one-time token)"
$dupBody = JsonFile ('{"token":"' + $QrToken + '"}')
$dup = curl.exe -s -o NUL -w "%{http_code}" -X POST "$BaseUrl/api/auth/qr/confirm" `
  -H "Authorization: Bearer $MobileJwt" -H "Content-Type: application/json" -d "@$dupBody"
if ($dup -eq "400") { Ok "second confirm rejected with 400" } else { Fail "second confirm (got $dup)" }

Step "9) /api/me with the web cookie"
$me = curl.exe -s "$BaseUrl/api/me" -H "Cookie: $WebCookie"
Write-Host "  $me"
if ($me -match '"id"') { Ok "me works with cookie" } else { Fail "me" }

Step "10) Upload PDF"
node "$(Split-Path -Parent $MyInvocation.MyCommand.Path)\make-fixture-pdf.mjs" ".tmp/sample.pdf" | Out-Null
$up = curl.exe -s -X POST "$BaseUrl/api/books/upload" `
  -H "Authorization: Bearer $MobileJwt" `
  -F "file=@.tmp/sample.pdf;type=application/pdf" -F "title=Book (test)"
$upObj = $up | ConvertFrom-Json
$BookId = $upObj.book.id
$PdfUrl = $upObj.book.pdfUrl
Write-Host "  $up"
if ($BookId) { Ok "book #$BookId created" } else { Fail "upload" }

Step "11) Library list"
$list = curl.exe -s "$BaseUrl/api/books" -H "Cookie: $WebCookie"
if ($list -match "`"id`":$BookId") { Ok "book #$BookId present in /api/books" } else { Fail "library list" }

Step "12) Book details + PDF serving"
$detail = curl.exe -s "$BaseUrl/api/books/$BookId" -H "Cookie: $WebCookie"
if ($detail -match "`"id`":$BookId") { Ok "details" } else { Fail "details" }
$code = curl.exe -s -o NUL -w "%{http_code}" "$BaseUrl$PdfUrl"
if ($code -eq "200") { Ok "PDF served at $PdfUrl (200)" } else { Fail "PDF serving (got $code)" }

Write-Host ""
if ($Fails -eq 0) {
  Write-Host "ALL SMOKE TESTS PASSED" -ForegroundColor Green
} else {
  Write-Host "SMOKE TESTS FAILED: $Fails" -ForegroundColor Red
  exit 1
}
