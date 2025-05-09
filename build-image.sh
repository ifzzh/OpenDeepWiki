#!/bin/bash

echo "==========================================="
echo "Building KoalaWiki Docker Images"
echo "==========================================="

# Enable Docker Buildx
docker buildx create --use

# Build backend image for multiple platforms
echo "Building backend image for multiple platforms..."
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -t crpi-j9ha7xwhatgtvj4.cn-shenzhen.personal.cr.aliyuncs.com/koala-ai/koala-wiki \
    -t crpi-j9ha7xwhatgtvj4.cn-shenzhen.personal.cr.aliyuncs.com/koala-ai/koala-wiki:arm64 \
    -f src/KoalaWiki/Dockerfile \
    --push .
if [ $? -ne 0 ]; then
    echo "Error building backend image!"
    exit 1
fi

# Build frontend image for multiple platforms
echo "Building frontend image for multiple platforms..."
pushd web > /dev/null
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -t crpi-j9ha7xwhatgtvj4.cn-shenzhen.personal.cr.aliyuncs.com/koala-ai/koala-wiki-web \
    -t crpi-j9ha7xwhatgtvj4.cn-shenzhen.personal.cr.aliyuncs.com/koala-ai/koala-wiki-web:arm64 \
    -f Dockerfile \
    --push .
if [ $? -ne 0 ]; then
    echo "Error building frontend image!"
    exit 1
fi
popd > /dev/null

echo "==========================================="
echo "Images built and pushed successfully!"
echo "==========================================="
