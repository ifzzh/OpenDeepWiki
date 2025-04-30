FROM node:18-alpine

# 安装构建工具
RUN apk add --no-cache make gcc g++ python3


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# 复制package.json和package-lock.json到工作目录
COPY package*.json ./

# 安装项目依赖
RUN npm install

# 复制项目的所有文件到工作目录
COPY . .

# 如果项目需要构建，运行构建命令
RUN npm run build

# 暴露应用运行的端口
EXPOSE 3000

ENV PORT=3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]