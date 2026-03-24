# Halo

Halo 是一个带前端可视化、Express 后端接口和 Supabase 数据层的能耗管理示例项目。

## 本地启动

1. 安装依赖：`npm install`
2. 复制环境变量模板：`copy .env.example .env.local`
3. 填写 Supabase 和 Longfor 相关配置
4. 初始化数据库：`npm run db:setup`
5. 启动前后端联调：`npm run dev`

默认地址：

- 前端：`http://localhost:3000`
- 后端：`http://localhost:8787`

## 主要接口

- `GET /api/health`
- `GET /api/projects`
- `GET /api/energy/analysis`
- `GET /api/energy/quick-projects`
- `POST /api/energy/query-report`
- `POST /api/energy/metrics`
- `POST /api/ai/chat`
- `POST /api/ai/coding`
- `GET /api/reports`
- `POST /api/reports`
- `GET /api/integrations`
- `POST /api/integrations`

## 后端部署

这个仓库已经补好了后端生产部署所需文件：

- `tsconfig.server.json`
- `Dockerfile`
- `.dockerignore`
- `render.yaml`

### Render 部署

1. 新建一个 Web Service，直接连接 GitHub 仓库
2. Render 会自动识别 `render.yaml`
3. 构建命令：`npm ci && npm run build:server`
4. 启动命令：`npm run start:server`
5. 健康检查：`/api/health`

Render 需要填写这些环境变量：

- `CORS_ORIGIN`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `LONGFOR_AUTHORIZATION`
- `LONGFOR_X_GAIA_API_KEY`
- `LONGFOR_CASTGC`
- `LONGFOR_QUERY_REPORT_URL`
- `LONGFOR_USER_INFO_URL`

说明：

- 生产环境端口使用平台注入的 `PORT`
- 当前代码已经兼容 `PORT` 和本地 `API_PORT`

### Docker 部署

如果你要部署到 Railway、服务器容器或其他支持 Docker 的平台，可以直接使用：

```bash
docker build -t halo-backend .
docker run --env-file .env.local -p 8787:8787 halo-backend
```

容器启动命令为：

```bash
node dist-server/server/index.js
```

## 前端连接线上后端

如果前端继续部署在 Cloudflare Pages，需要在前端构建环境里配置：

```bash
VITE_API_BASE_URL=https://你的后端域名
```

例如：

```bash
VITE_API_BASE_URL=https://halo-backend.onrender.com
```

否则前端会默认请求同源 `/api`，而静态站点环境通常没有 Express 后端，页面会出现接口不可用提示。
