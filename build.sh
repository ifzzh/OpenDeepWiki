#!/bin/bash

echo "开始构建KoalaWiki项目..."

# 创建输出目录
mkdir -p output/backend
mkdir -p output/frontend

echo "构建后端..."
dotnet publish KoalaWiki.sln -c Release -o output/backend

echo "构建前端..."
cd web
npm install
npm run build
cp -r .next ../output/frontend/.next
cp -r public ../output/frontend/public
cp -r .next/static ../output/frontend/static
cd ..

echo "KoalaWiki项目构建完成！"
echo "后端输出目录: $(pwd)/output/backend"
echo "前端输出目录: $(pwd)/output/frontend" 