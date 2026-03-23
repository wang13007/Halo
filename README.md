# Halo

一个带前端可视化、Express 后端接口和 Supabase 数据层的能耗管理示例项目。

## 本地启动

1. 安装依赖：`npm install`
2. 复制环境变量模板并填写 Supabase 配置：`copy .env.example .env.local`
3. 初始化 Supabase 表结构和演示数据：`npm run db:setup`
4. 启动前后端联调：`npm run dev`

前端默认运行在 `http://localhost:3000`，后端 API 默认运行在 `http://localhost:8787`。

## 已补充的能力

- `Express + TypeScript` 后端服务
- `Supabase` 服务端客户端接入
- 建表 SQL 与初始化脚本
- 能耗分析、项目、系统接入、报表等接口
- 前端 API 封装与实时接口展示组件

## 主要接口

- `GET /api/health`
- `GET /api/projects`
- `GET /api/energy/analysis`
- `POST /api/energy/metrics`
- `GET /api/reports`
- `POST /api/reports`
- `GET /api/integrations`
- `POST /api/integrations`

## Supabase 需要的环境变量

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

如果你把真实 Supabase 项目地址和密钥填进 `.env.local`，执行 `npm run db:setup` 后就会在你的 Supabase 数据库里建表并写入一批演示数据。
