#!/usr/bin/env bash
set -e

echo "Fun Harness: starting frontend"

PROJECT_DIR="/Users/fun/funfundaily/worktrees/invition/frontend"
cd "$PROJECT_DIR"

# 端口：vite.config.js 未配置 server.port，uni-app h5 默认未固定。
# 如需端口清理，请在此填写实际监听端口（例如 5173 / 9000）。
PORT=""

# ---- 端口清理 ----
if [ -n "$PORT" ] && command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -t -i:"$PORT" 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "Killing processes on port $PORT: $PIDS"
    echo "$PIDS" | xargs kill 2>/dev/null || true
    sleep 1
    LEFT=$(lsof -t -i:"$PORT" 2>/dev/null || true)
    if [ -n "$LEFT" ]; then
      echo "Force killing: $LEFT"
      echo "$LEFT" | xargs kill -9 2>/dev/null || true
    fi
  fi
fi

# ---- 进程清理（按本目录路径过滤，避免误杀其他项目） ----
if command -v pgrep >/dev/null 2>&1; then
  STALE=$(pgrep -f "$PROJECT_DIR.*(vite|uni|nodemon|webpack)" 2>/dev/null || true)
  if [ -n "$STALE" ]; then
    echo "Killing stale node processes: $STALE"
    echo "$STALE" | xargs kill -9 2>/dev/null || true
  fi
fi

# ---- 包管理器优先级：pnpm > yarn > npm ----
if [ -f pnpm-lock.yaml ] && command -v pnpm >/dev/null 2>&1; then
  PM="pnpm"
elif [ -f yarn.lock ] && command -v yarn >/dev/null 2>&1; then
  PM="yarn"
else
  PM="npm"
fi

# ---- 依赖安装：仅当 node_modules 不存在时 ----
if [ ! -d node_modules ]; then
  echo "Installing dependencies with $PM..."
  case "$PM" in
    pnpm) pnpm install ;;
    yarn) yarn install ;;
    npm)  npm install ;;
  esac
fi

# ---- 启动脚本选择：dev → dev:h5 → start:dev → start → serve ----
# package.json 中无纯 "dev"，存在 "dev:h5"（uni-app h5 开发模式），优先使用。
SCRIPT=""
for s in dev dev:h5 start:dev start serve; do
  if node -e "process.exit(require('./package.json').scripts && require('./package.json').scripts['$s'] ? 0 : 1)" 2>/dev/null; then
    SCRIPT="$s"
    break
  fi
done

if [ -z "$SCRIPT" ]; then
  echo "No runnable script (dev/dev:h5/start:dev/start/serve) found in package.json"
  exit 1
fi

echo "Running: $PM run $SCRIPT"
case "$PM" in
  pnpm) exec pnpm run "$SCRIPT" ;;
  yarn) exec yarn "$SCRIPT" ;;
  npm)  exec npm run "$SCRIPT" ;;
esac
