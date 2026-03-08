#!/bin/bash

echo "=========================================="
echo "开始重启开发服务器..."
echo "=========================================="

echo ""
echo "📍 第1步: 清理旧Node进程..."
pkill -f "node\|npm" 2>/dev/null
sleep 2

echo "✅ 旧进程已清理"
echo ""

echo "📍 第2步: 释放端口 3000 和 3001..."
lsof -i :3001 -i :3000 2>/dev/null | grep LISTEN | awk '{print $2}' | sort -u | xargs kill -9 2>/dev/null
sleep 2

echo "✅ 端口已释放"
echo ""

echo "📍 第3步: 验证端口状态..."
if lsof -i :3000 -i :3001 2>/dev/null | grep LISTEN; then
    echo "❌ 警告: 仍有进程占用端口，强制清理中..."
    lsof -i :3001 | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null
    lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null
    sleep 2
else
    echo "✅ 端口已完全空闲"
fi
echo ""

echo "=========================================="
echo "🚀 启动开发服务器 (npm run dev)..."
echo "=========================================="
echo ""

npm run dev
