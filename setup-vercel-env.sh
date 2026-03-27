#!/usr/bin/env bash
# =====================================================================
# LiveMart — Vercel 환경변수 자동 설정 스크립트 (Linux/macOS)
#
# 사용법:
#   chmod +x setup-vercel-env.sh
#   ./setup-vercel-env.sh https://abc123.ngrok.io
# =====================================================================

set -e

NGROK_URL="${1:-}"
if [ -z "$NGROK_URL" ]; then
    echo "[ERROR] ngrok URL을 인수로 전달하세요."
    echo "사용법: ./setup-vercel-env.sh https://abc123.ngrok.io"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/frontend"

echo ""
echo "[INFO] Vercel 환경변수 설정 시작"
echo "[INFO] ngrok URL: $NGROK_URL"
echo ""

# 기존 환경변수 제거 후 재설정 (오류 무시)
remove_env() {
    npx vercel env rm "$1" production --yes 2>/dev/null || true
}

set_env() {
    local key="$1"
    local value="$2"
    echo "  ▶ $key = $value"
    remove_env "$key"
    echo "$value" | npx vercel env add "$key" production
}

set_env "API_GATEWAY_URL" "$NGROK_URL"
set_env "NEXT_PUBLIC_API_URL" "$NGROK_URL"
set_env "NOTIFICATION_SERVICE_URL" "$NGROK_URL"
set_env "NEXT_PUBLIC_TOSS_CLIENT_KEY" "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq"

echo ""
echo "========================================"
echo " 환경변수 설정 완료! 재배포 중..."
echo "========================================"

npx vercel --prod --yes

echo ""
echo "========================================"
echo " 배포 완료!"
echo " https://livemart-parkmin-jes-projects.vercel.app"
echo "========================================"
