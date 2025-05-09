#!/bin/bash

echo "==========================================="
echo "Building KoalaWiki Docker Images"
echo "==========================================="

# Enable Docker Buildx
docker buildx create --use

# Build backend image for amd64 platform
echo "Building backend image for amd64 platform..."
docker buildx build \
    --platform linux/amd64 \
    -t crpi-j9ha7sxwhatgtvj4.cn-shenzhen.personal.cr.aliyuncs.com/koala-ai/koala-wiki \
    -f src/KoalaWiki/Dockerfile \
    --push .
if [ $? -ne 0 ]; then
    echo "Error building backend amd64 image!"
    exit 1
fi

# Build backend image specifically for arm64 platform using Dockerfile.arm
echo "Building backend image for arm64 platform using Dockerfile.arm..."
docker buildx build \
    --platform linux/arm64 \
    -t crpi-j9ha7sxwhatgtvj4.cn-shenzhen.personal.cr.aliyuncs.com/koala-ai/koala-wiki:arm64 \
    -f src/KoalaWiki/Dockerfile.arm \
    --push .
if [ $? -ne 0 ]; then
    echo "Error building backend arm64 image!"
    exit 1
fi

# Build frontend image for amd64 platform
echo "Building frontend image for amd64 platform..."
pushd web > /dev/null
docker buildx build \
    --platform linux/amd64 \
    -t crpi-j9ha7sxwhatgtvj4.cn-shenzhen.personal.cr.aliyuncs.com/koala-ai/koala-wiki-web \
    -f Dockerfile \
    --push .
if [ $? -ne 0 ]; then
    echo "Error building frontend amd64 image!"
    exit 1
fi
popd > /dev/null

# Build frontend image for arm64 platform 
# Note: This assumes frontend might also need special handling for arm64
echo "Building frontend image for arm64 platform..."
pushd web > /dev/null
docker buildx build \
    --platform linux/arm64 \
    -t crpi-j9ha7sxwhatgtvj4.cn-shenzhen.personal.cr.aliyuncs.com/koala-ai/koala-wiki-web:arm64 \
    -f Dockerfile.arm \
    --push .
if [ $? -ne 0 ]; then
    echo "Error building frontend arm64 image!"
    exit 1
fi
popd > /dev/null

echo "==========================================="
echo "Images built and pushed successfully!"
echo "==========================================="
