#!/bin/sh
set -x

# 设置默认API URL
DEFAULT_API_URL="http://localhost:5085"
API_URL="${API_URL:-$DEFAULT_API_URL}"

echo "Starting application with API_URL: $API_URL"

# 如果API_URL不是默认值，则进行替换
if [ "$API_URL" != "http://__API_URL_PLACEHOLDER__" ]; then
    echo "Replacing API URL placeholder with: $API_URL"
    
    # 替换 .next 目录下所有 JavaScript 文件中的占位符
    find /app/.next -name "*.js" -type f -exec sed -i "s|http://__API_URL_PLACEHOLDER__|$API_URL|g" {} \;
    find /app/.next -name "*.json" -type f -exec sed -i "s|http://__API_URL_PLACEHOLDER__|$API_URL|g" {} \;
    
    # 替换服务端渲染文件中的占位符
    find /app -name "server.js" -type f -exec sed -i "s|http://__API_URL_PLACEHOLDER__|$API_URL|g" {} \;
    
    # 创建客户端运行时配置
    cat > /app/public/runtime-config.js << EOF
window.__API_URL__ = '$API_URL';
EOF
    
    echo "API URL replacement completed"
else
    echo "Using default API URL configuration"
fi

# 启动Next.js应用
echo "Starting Next.js server..."
exec node server.js