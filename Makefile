.PHONY: all build build-backend build-frontend build-arm build-amd build-backend-arm build-frontend-arm build-backend-amd build-frontend-amd up down restart dev dev-backend dev-frontend logs clean help

all: build up

# 构建所有Docker镜像
build:
	docker-compose build

# 只构建后端服务
build-backend:
	docker-compose build koalawiki

# 只构建前端服务
build-frontend:
	docker-compose build koalawiki-web

# 构建ARM架构的所有Docker镜像
build-arm:
	docker-compose build --build-arg ARCH=arm64

# 构建AMD架构的所有Docker镜像
build-amd:
	docker-compose build --build-arg ARCH=amd64

# 构建ARM架构的后端服务
build-backend-arm:
	docker-compose build --build-arg ARCH=arm64 koalawiki

# 构建ARM架构的前端服务
build-frontend-arm:
	docker-compose build --build-arg ARCH=arm64 koalawiki-web

# 构建AMD架构的后端服务
build-backend-amd:
	docker-compose build --build-arg ARCH=amd64 koalawiki

# 构建AMD架构的前端服务
build-frontend-amd:
	docker-compose build --build-arg ARCH=amd64 koalawiki-web

# 启动所有服务
up:
	docker-compose up -d

# 停止所有服务
down:
	docker-compose down

# 重启所有服务
restart: down up

# 启动开发环境（非后台模式，可以看到日志输出）
dev:
	docker-compose up

# 只启动后端开发环境
dev-backend:
	docker-compose up koalawiki

# 只启动前端开发环境
dev-frontend:
	docker-compose up koalawiki-web

# 查看服务日志
logs:
	docker-compose logs -f

# 清理所有Docker资源（慎用）
clean:
	docker-compose down --rmi all --volumes --remove-orphans

# 显示帮助信息
help:
	@echo "使用方法:"
	@echo "  make build                - 构建所有Docker镜像"
	@echo "  make build-backend        - 只构建后端服务"
	@echo "  make build-frontend       - 只构建前端服务"
	@echo "  make build-arm            - 构建ARM架构的所有镜像"
	@echo "  make build-amd            - 构建AMD架构的所有镜像"
	@echo "  make build-backend-arm    - 构建ARM架构的后端服务"
	@echo "  make build-frontend-arm   - 构建ARM架构的前端服务"
	@echo "  make build-backend-amd    - 构建AMD架构的后端服务"
	@echo "  make build-frontend-amd   - 构建AMD架构的前端服务"
	@echo "  make up                   - 启动所有服务（后台模式）"
	@echo "  make down                 - 停止所有服务"
	@echo "  make restart              - 重启所有服务"
	@echo "  make dev                  - 启动开发环境（非后台模式，可查看日志）"
	@echo "  make dev-backend          - 只启动后端开发环境"
	@echo "  make dev-frontend         - 只启动前端开发环境"
	@echo "  make logs                 - 查看服务日志"
	@echo "  make clean                - 清理所有Docker资源（慎用）"
	@echo "  make help                 - 显示此帮助信息"

# 默认目标
default: help 