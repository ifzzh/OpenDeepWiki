@echo off
chcp 65001 >nul
echo 开始构建KoalaWiki项目...

REM 创建输出目录
if not exist "output" mkdir output
if not exist "output\backend" mkdir output\backend
if not exist "output\frontend" mkdir output\frontend

echo 构建后端...
dotnet publish KoalaWiki.sln -c Release -o output\backend

echo 构建前端...
cd web
call npm install
call npm run build
xcopy /E /I /Y .next ..\output\frontend\.next
xcopy /E /I /Y public ..\output\frontend\public
xcopy /E /I /Y .next\static ..\output\frontend\static
cd ..

echo KoalaWiki项目构建完成！
echo 后端输出目录: %cd%\output\backend
echo 前端输出目录: %cd%\output\frontend

pause 