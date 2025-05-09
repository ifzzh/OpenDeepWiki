@echo off
echo ===========================================
echo Building KoalaWiki Docker Images
echo ===========================================

REM Enable Docker Buildx
echo Enabling Docker Buildx...
docker buildx create --use

REM Build backend image for amd64 platform
echo Building backend image for amd64 platform...
docker buildx build ^
    --platform linux/amd64 ^
    -t crpi-j9ha7sxwhatgtvj4.cn-shenzhen.personal.cr.aliyuncs.com/koala-ai/koala-wiki ^
    -f src/KoalaWiki/Dockerfile ^
    --push .
if %ERRORLEVEL% NEQ 0 (
    echo Error building backend amd64 image!
    exit /b %ERRORLEVEL%
)

REM Build backend image specifically for arm64 platform using Dockerfile.arm
echo Building backend image for arm64 platform using Dockerfile.arm...
docker buildx build ^
    --platform linux/arm64 ^
    -t crpi-j9ha7sxwhatgtvj4.cn-shenzhen.personal.cr.aliyuncs.com/koala-ai/koala-wiki:arm64 ^
    -f src/KoalaWiki/Dockerfile.arm ^
    --push .
if %ERRORLEVEL% NEQ 0 (
    echo Error building backend arm64 image!
    exit /b %ERRORLEVEL%
)

REM Build frontend image for amd64 platform
echo Building frontend image for amd64 platform...
pushd web
docker buildx build ^
    --platform linux/amd64 ^
    -t crpi-j9ha7sxwhatgtvj4.cn-shenzhen.personal.cr.aliyuncs.com/koala-ai/koala-wiki-web ^
    -f Dockerfile ^
    --push .
if %ERRORLEVEL% NEQ 0 (
    echo Error building frontend amd64 image!
    exit /b %ERRORLEVEL%
)
popd

REM Build frontend image for arm64 platform
echo Building frontend image for arm64 platform...
pushd web
docker buildx build ^
    --platform linux/arm64 ^
    -t crpi-j9ha7sxwhatgtvj4.cn-shenzhen.personal.cr.aliyuncs.com/koala-ai/koala-wiki-web:arm64 ^
    -f Dockerfile ^
    --push .
if %ERRORLEVEL% NEQ 0 (
    echo Error building frontend arm64 image!
    exit /b %ERRORLEVEL%
)
popd

echo ===========================================
echo Images built and pushed successfully!
echo ===========================================

