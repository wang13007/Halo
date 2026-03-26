# Halo 数据库表说明

## 1. 文档说明

本文档基于当前 `supabase/migrations` 和 `supabase/seed.sql` 整理 Halo 项目的数据库对象说明，涵盖表、视图、触发器、初始化数据及其与业务模块的关系。

## 2. 数据库概览

当前数据库包含以下核心对象：

### 2.1 表

- `public.projects`
- `public.system_integrations`
- `public.energy_metrics`
- `public.analysis_reports`
- `public.chat_sessions`
- `public.energy_query_records`

### 2.2 视图

- `public.energy_daily_summary`
- `public.energy_source_breakdown`
- `public.energy_query_projects`

### 2.3 触发器与函数

- `public.set_updated_at()`：更新 `updated_at`
- `projects_set_updated_at`
- `system_integrations_set_updated_at`
- `chat_sessions_set_updated_at`

## 3. 关系说明

```text
projects
  ├─< system_integrations
  ├─< energy_metrics
  ├─< analysis_reports
  └─< energy_query_records

chat_sessions
  └─ 独立保存对话历史
```

说明：

- `projects` 是主数据表。
- 其余业务表基本都通过 `project_id` 关联 `projects.id`。
- `chat_sessions` 当前不与用户、项目建立强外键关系，而是通过 `metadata.context` 保存上下文。

## 4. 表说明

## 4.1 `public.projects`

### 4.1.1 用途

保存项目主数据，是能耗、集成、报告等业务对象的归属实体。

### 4.1.2 字段说明

| 字段名 | 类型 | 非空 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | 是 | `gen_random_uuid()` | 主键 |
| `code` | `text` | 是 | 无 | 项目标识，唯一 |
| `name` | `text` | 是 | 无 | 项目名称 |
| `location` | `text` | 否 | 无 | 项目地点 |
| `timezone` | `text` | 是 | `Asia/Shanghai` | 时区 |
| `metadata` | `jsonb` | 是 | `{}` | 扩展信息 |
| `created_at` | `timestamptz` | 是 | UTC 当前时间 | 创建时间 |
| `updated_at` | `timestamptz` | 是 | UTC 当前时间 | 更新时间 |

### 4.1.3 约束与索引

- 主键：`id`
- 唯一约束：`code`

### 4.1.4 典型业务含义

- 普通项目：仅保存基础项目信息
- 导入型查询项目：`metadata.source = "energy-report-import"`，同时记录：
  - `availableGranularities`
  - `availableMeterTypes`
  - `firstSampleDate`
  - `lastSampleDate`
  - `organizationPath`
  - `recordCount`

### 4.1.5 业务映射

- `/api/projects`
- `/api/energy/analysis`
- `/api/energy/query-config`
- `/api/energy/query-report`
- `/api/integrations`
- `/api/reports`

## 4.2 `public.system_integrations`

### 4.2.1 用途

保存项目下的外部系统接入记录，如 EMS、IBMS 等。

### 4.2.2 字段说明

| 字段名 | 类型 | 非空 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | 是 | `gen_random_uuid()` | 主键 |
| `project_id` | `uuid` | 是 | 无 | 关联项目 ID |
| `name` | `text` | 是 | 无 | 接入名称 |
| `system_type` | `text` | 是 | 无 | 系统类型，如 `ems`、`ibms` |
| `base_url` | `text` | 是 | 无 | 系统地址 |
| `username` | `text` | 否 | 无 | 登录用户/接入账号 |
| `auth_type` | `text` | 是 | `token` | 鉴权方式 |
| `status` | `text` | 是 | `connected` | 接入状态 |
| `metadata` | `jsonb` | 是 | `{}` | 扩展信息 |
| `last_synced_at` | `timestamptz` | 否 | 无 | 最近同步时间 |
| `created_at` | `timestamptz` | 是 | UTC 当前时间 | 创建时间 |
| `updated_at` | `timestamptz` | 是 | UTC 当前时间 | 更新时间 |

### 4.2.3 关系

- `project_id -> projects.id`
- 删除项目时级联删除

### 4.2.4 业务映射

- `/api/integrations`
- 配置中心中的 EMS/IBMS 请求记录展示

## 4.3 `public.energy_metrics`

### 4.3.1 用途

保存项目级能耗指标明细，是首页能耗分析与趋势统计的主要数据来源。

### 4.3.2 字段说明

| 字段名 | 类型 | 非空 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `id` | `bigserial` | 是 | 自增 | 主键 |
| `project_id` | `uuid` | 是 | 无 | 关联项目 ID |
| `metric_at` | `timestamptz` | 是 | 无 | 指标时间 |
| `energy_type` | `text` | 是 | `electricity` | 能源类型 |
| `source` | `text` | 是 | 无 | 来源或分项，如 `hvac`、电表号 |
| `usage_kwh` | `numeric(12,2)` | 是 | 无 | 用能量 |
| `cost_amount` | `numeric(12,2)` | 是 | `0` | 费用 |
| `carbon_kg` | `numeric(12,2)` | 是 | `0` | 碳排放量 |
| `metadata` | `jsonb` | 是 | `{}` | 扩展信息 |
| `created_at` | `timestamptz` | 是 | UTC 当前时间 | 创建时间 |

### 4.3.3 约束

- 主键：`id`
- 唯一约束：`(project_id, metric_at, energy_type, source)`

### 4.3.4 典型 metadata 内容

Excel 导入场景下会写入：

- `energyPath`
- `granularity`
- `importSource`
- `meterName`
- `meterNumber`
- `organizationPath`
- `projectCode`
- `projectName`
- `sampleDate`
- `sourceFile`
- `unit`

### 4.3.5 业务映射

- `/api/energy/analysis`
- `/api/energy/metrics`
- Excel 导入脚本

## 4.4 `public.analysis_reports`

### 4.4.1 用途

保存报告记录，不直接保存完整报告正文文件。

### 4.4.2 字段说明

| 字段名 | 类型 | 非空 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | 是 | `gen_random_uuid()` | 主键 |
| `project_id` | `uuid` | 是 | 无 | 关联项目 ID |
| `title` | `text` | 是 | 无 | 报告标题 |
| `summary` | `text` | 是 | `''` | 摘要 |
| `report_date` | `date` | 是 | `current_date` | 报告日期 |
| `status` | `text` | 是 | `generated` | 报告状态 |
| `file_url` | `text` | 否 | 无 | 文件地址 |
| `payload` | `jsonb` | 是 | `{}` | 生成参数/扩展信息 |
| `created_at` | `timestamptz` | 是 | UTC 当前时间 | 创建时间 |

### 4.4.3 业务映射

- `/api/reports`
- 配置中心中 Supabase 请求记录展示

### 4.4.4 当前特点

- 当前前端未提供新增报告表单
- 数据更多用于演示和系统运行态展示

## 4.5 `public.chat_sessions`

### 4.5.1 用途

保存智能对话的历史会话。

### 4.5.2 字段说明

| 字段名 | 类型 | 非空 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | 是 | `gen_random_uuid()` | 主键 |
| `title` | `text` | 是 | 无 | 会话标题 |
| `summary` | `text` | 是 | `''` | 会话摘要 |
| `status` | `text` | 是 | `active` | 会话状态 |
| `messages` | `jsonb` | 是 | `[]` | 消息数组 |
| `metadata` | `jsonb` | 是 | `{}` | 扩展上下文 |
| `last_message_at` | `timestamptz` | 是 | UTC 当前时间 | 最近消息时间 |
| `created_at` | `timestamptz` | 是 | UTC 当前时间 | 创建时间 |
| `updated_at` | `timestamptz` | 是 | UTC 当前时间 | 更新时间 |

### 4.5.3 索引

- `chat_sessions_last_message_at_idx(last_message_at desc)`

### 4.5.4 `messages` 结构说明

数组元素当前包含：

- `id`
- `role`：`user` 或 `assistant`
- `content`
- `createdAt`
- `thinking`：可选，保存 AI 高层思考摘要

### 4.5.5 `metadata` 结构说明

当前主要保存：

- `source`
- `context.endDate`
- `context.energyType`
- `context.energyTypeValue`
- `context.interval`
- `context.intervalValue`
- `context.orgId`
- `context.project`
- `context.queryName`
- `context.startDate`
- `context.timeRange`

### 4.5.6 业务映射

- `/api/chat/sessions`
- `/api/chat/sessions/:sessionId`

## 4.6 `public.energy_query_records`

### 4.6.1 用途

保存结构化能耗查询明细，是 `/api/energy/query-report` 的直接数据源。

### 4.6.2 字段说明

| 字段名 | 类型 | 非空 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `id` | `bigserial` | 是 | 自增 | 主键 |
| `project_id` | `uuid` | 是 | 无 | 关联项目 ID |
| `project_code` | `text` | 是 | 无 | 项目编码 |
| `project_name` | `text` | 是 | 无 | 项目名称 |
| `org_id` | `text` | 是 | 无 | 查询组织 ID |
| `organization_path` | `text` | 是 | 无 | 组织路径 |
| `energy_path` | `text` | 是 | 无 | 分项路径 |
| `meter_name` | `text` | 是 | 无 | 表具名称 |
| `meter_number` | `text` | 是 | 无 | 表具编号 |
| `sample_date` | `date` | 是 | 无 | 样本日期 |
| `granularity` | `text` | 是 | `day` | 粒度 |
| `meter_type` | `text` | 是 | `electricity` | 能源类型 |
| `usage_kwh` | `numeric(14,2)` | 是 | 无 | 用能值 |
| `source_file` | `text` | 是 | 无 | 导入文件名 |
| `metadata` | `jsonb` | 是 | `{}` | 扩展信息 |
| `created_at` | `timestamptz` | 是 | UTC 当前时间 | 创建时间 |

### 4.6.3 约束与索引

- 主键：`id`
- 唯一约束：`(project_id, meter_number, sample_date, granularity, meter_type)`
- 索引：
  - `energy_query_records_project_sample_idx(project_id, sample_date desc)`
  - `energy_query_records_org_sample_idx(org_id, sample_date desc)`

### 4.6.4 典型 metadata 内容

- `importSource`
- `unit`

### 4.6.5 业务映射

- `/api/energy/query-report`
- `/api/energy/query-config`
- `/api/energy/quick-projects`
- Excel 导入脚本

## 5. 视图说明

## 5.1 `public.energy_daily_summary`

### 用途

对 `energy_metrics` 按项目、按天汇总：

- `total_usage_kwh`
- `total_cost_amount`
- `total_carbon_kg`

### 当前使用情况

- 当前服务代码未直接查询该视图
- 适合作为后续日报/月报统计的基础视图

## 5.2 `public.energy_source_breakdown`

### 用途

对 `energy_metrics` 按项目、按 `source` 汇总：

- `total_usage_kwh`
- `total_cost_amount`
- `total_carbon_kg`

### 当前使用情况

- 当前服务代码未直接查询该视图
- 与能耗分项占比场景天然匹配

## 5.3 `public.energy_query_projects`

### 用途

对 `energy_query_records` 汇总出项目级查询配置：

- `project_id`
- `project_code`
- `project_name`
- `org_id`
- `organization_path`
- `record_count`
- `first_sample_date`
- `last_sample_date`

### 当前使用情况

- API 返回中会用 `supabase://public.energy_query_projects` 作为数据来源标识
- 当前配置读取逻辑实际依赖 `projects.metadata`，而不是直接查询该视图

## 6. 触发器与自动更新时间

当前有统一函数：

- `public.set_updated_at()`

用于在更新时自动覆盖 `updated_at`。

已绑定的表：

- `projects`
- `system_integrations`
- `chat_sessions`

未设置 `updated_at` 的表：

- `energy_metrics`
- `analysis_reports`
- `energy_query_records`

## 7. 初始化数据说明

`supabase/seed.sql` 当前会初始化以下数据：

- 项目：
  - `demo-campus`
- 系统集成：
  - `EMS System`
  - `IBMS System`
- 能耗指标：
  - 近 6 天、每 4 小时一组
  - 分项包括 `hvac`、`lighting`、`plugs`、`special`
- 报告：
  - `Weekly Energy Analysis`
  - `Monthly Cost Review`

## 8. 与业务模块的对应关系

| 业务模块 | 主要表/视图 |
| --- | --- |
| 看板 | 当前无持久化表，主要为前端内存态 |
| 智能对话 | `chat_sessions` |
| 能耗分析 | `projects`、`energy_metrics` |
| 能耗查询 | `projects`、`energy_query_records`、`energy_query_projects` |
| 报告中心 | `analysis_reports` |
| 系统配置 | `projects`、`system_integrations`、`analysis_reports` |

## 9. 设计特点与注意事项

### 9.1 优点

- 主数据与业务数据关系清晰
- 迁移脚本独立，便于环境重建
- 通过 `metadata jsonb` 提供较强扩展性

### 9.2 当前注意事项

- RLS 已启用，但未提供策略定义，普通匿名/受限访问并不完整。
- 目前后端依赖 `SUPABASE_SERVICE_ROLE_KEY` 直连数据库。
- `chat_sessions` 未与用户表关联，暂不支持多用户隔离。
- `energy_query_projects` 视图已建，但查询配置主逻辑当前仍依赖 `projects.metadata`。

## 10. 后续优化建议

- 增加用户、组织、角色和权限相关表。
- 为 `chat_sessions` 增加用户归属字段。
- 将看板、应用中心配置持久化入库。
- 为 `analysis_reports` 增加正文、文件版本、生成来源与下载记录。
- 为 `energy_query_records` 增加导入批次表与审计日志。
