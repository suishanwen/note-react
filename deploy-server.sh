#!/usr/bin/env bash
set -euo pipefail

# ── 配置区（按实际情况修改） ─────────────────────────────────────
SERVICE_NAME="note-server"
# ────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> 拉取最新代码"
cd "$SCRIPT_DIR" && git pull

echo "==> 安装依赖"
cd "$SCRIPT_DIR/server" && npm install --omit=dev

echo "==> 重启服务"
systemctl restart "$SERVICE_NAME"

echo "==> 检查运行状态"
systemctl is-active "$SERVICE_NAME"

echo "✓ 部署完成"
