#!/bin/bash
echo "🌸 Kanna Bot Starting..."
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps --no-audit --no-fund
echo "🚀 Starting Kanna AI (MCP + Gemini 2.5)..."
node index.js
