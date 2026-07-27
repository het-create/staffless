#!/bin/bash
cd "$(dirname "$0")"

echo "=============================================="
echo "  STAFFLESS - starting up"
echo "=============================================="

if [ ! -d "node_modules" ]; then
  echo "First time setup - installing dependencies, this may take a minute..."
  npm install
fi

if [ ! -f ".env" ]; then
  echo "Creating .env from template..."
  cp .env.example .env
fi

echo ""
echo "Starting server..."
npm start &
SERVER_PID=$!

sleep 4

PORT=$(grep -m1 '^PORT=' .env | cut -d '=' -f2)
PORT=${PORT:-8788}

echo "Opening dashboard in your browser..."
if command -v open >/dev/null 2>&1; then
  open "http://localhost:$PORT"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://localhost:$PORT"
fi

echo ""
echo "STAFFLESS is running. Press Ctrl+C in this window to stop it."
wait $SERVER_PID
