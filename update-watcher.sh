#!/usr/bin/env bash
# 宿主机常驻脚本：监听 app 容器写入的更新触发标记，执行拉代码+重建+重启
# 用法：
#   ./update-watcher.sh            重启（默认）：停掉旧进程并在后台启动
#   ./update-watcher.sh start      启动（已在运行则跳过）
#   ./update-watcher.sh stop       停止
#   ./update-watcher.sh status     查看运行状态
set -uo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
TRIGGER_DIR="${TRIGGER_DIR:-$PROJECT_DIR/.trigger}"
FLAG="$TRIGGER_DIR/update.trigger"
INTERVAL="${INTERVAL:-10}"
PID_FILE="$TRIGGER_DIR/watcher.pid"
LOG_FILE="$PROJECT_DIR/update-watcher.log"

mkdir -p "$TRIGGER_DIR"

# 判断守护进程是否在运行，输出 PID
running_pid() {
  [ -f "$PID_FILE" ] || return 1
  local pid
  pid=$(cat "$PID_FILE" 2>/dev/null)
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null || return 1
  echo "$pid"
}

stop() {
  local pid
  if pid=$(running_pid); then
    kill "$pid" 2>/dev/null
    rm -f "$PID_FILE"
    echo "已停止 update-watcher (PID $pid)"
  else
    echo "update-watcher 未在运行"
  fi
}

start() {
  local pid
  if pid=$(running_pid); then
    echo "update-watcher 已在运行 (PID $pid)"
    return 0
  fi
  # 后台拉起自身的 worker 模式，免去手敲 nohup
  nohup "$0" run >> "$LOG_FILE" 2>&1 &
  echo "已启动 update-watcher (PID $!)，日志：$LOG_FILE"
}

# 执行一次更新
do_update() {
  echo "$(date '+%F %T') 检测到更新触发，开始执行"
  rm -f "$FLAG"
  {
    cd "$PROJECT_DIR" || exit 1
    # 暂存本地手改（如 docker-compose.yml 内密钥），避免 git pull 冲突
    echo "==> git stash"
    STASHED=0
    if ! git diff --quiet || ! git diff --cached --quiet; then
      git stash push -u -m "update-watcher auto stash" && STASHED=1
    fi
    echo "==> git pull"
    git pull --rebase
    if [ "$STASHED" = "1" ]; then
      echo "==> git stash pop"
      git stash pop
    fi
    if docker compose version >/dev/null 2>&1; then
      DC="docker compose"
    else
      DC="docker-compose"
    fi
    echo "==> $DC up -d --build"
    $DC up -d --build
    echo "$(date '+%F %T') 更新完成"
  } > "$TRIGGER_DIR/last-update.log" 2>&1
  echo "$(date '+%F %T') 本次更新结束，日志见 $TRIGGER_DIR/last-update.log"
}

# 守护循环（worker 模式，由 start 在后台调起）
run() {
  echo "$$" > "$PID_FILE"
  trap 'rm -f "$PID_FILE"; exit 0' TERM INT
  echo "$(date '+%F %T') update-watcher 启动，监听 ${FLAG}（每 ${INTERVAL}s）"
  while true; do
    [ -f "$FLAG" ] && do_update
    sleep "$INTERVAL"
  done
}

status() {
  local pid
  if pid=$(running_pid); then
    echo "运行中 (PID $pid)"
  else
    echo "未运行"
  fi
}

case "${1:-restart}" in
  run) run ;;
  start) start ;;
  stop) stop ;;
  status) status ;;
  restart) stop; start ;;
  *) echo "用法: $0 {restart|start|stop|status}"; exit 1 ;;
esac
