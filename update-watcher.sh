#!/usr/bin/env bash
# 宿主机常驻脚本：监听 app 容器写入的更新触发标记，执行拉代码+重建+重启
# 用法：在项目根目录后台运行  nohup ./update-watcher.sh > update-watcher.log 2>&1 &
set -uo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
TRIGGER_DIR="${TRIGGER_DIR:-$PROJECT_DIR/.trigger}"
FLAG="$TRIGGER_DIR/update.trigger"
INTERVAL="${INTERVAL:-10}"

mkdir -p "$TRIGGER_DIR"
echo "$(date '+%F %T') update-watcher 启动，监听 $FLAG（每 ${INTERVAL}s）"

while true; do
  if [ -f "$FLAG" ]; then
    echo "$(date '+%F %T') 检测到更新触发，开始执行"
    rm -f "$FLAG"
    {
      cd "$PROJECT_DIR" || exit 1
      echo "==> git pull"
      git pull --ff-only
      echo "==> docker compose up -d --build"
      docker compose up -d --build
      echo "$(date '+%F %T') 更新完成"
    } > "$TRIGGER_DIR/last-update.log" 2>&1
    echo "$(date '+%F %T') 本次更新结束，日志见 $TRIGGER_DIR/last-update.log"
  fi
  sleep "$INTERVAL"
done
