# FlowOS

FlowOS 是一个原创的 AI 原生创作工作台原型，面向独立创作者、小型工作室和品牌内容团队。它以项目为单一数据上下文，把 Brief、可复用实体、分镜、模型路由、生成队列、Recipe/Lineage、时间线与审批连成一个可操作流程。模型注册中心可以从 OpenAI 兼容接口同步模型目录；生成队列仍使用可预测的本地模拟适配器。

## 快速开始

需要 Node.js 20.9 或更高版本。

```bash
npm install
npm run dev
```

打开 <http://localhost:3000>。根路由 `/` 进入 `/home` 工作台，可创建项目或继续最近项目。

如需接入带鉴权的模型供应商，先在 `.env.local` 中保存服务端密钥，再到 `/models` 的“接入管理”填写对应的环境变量名称。密钥值不会进入浏览器或 SQLite 注册表：

```bash
TUZI_API_KEY=your_server_side_key
```

常用命令：

```bash
npm run dev      # 本地开发服务器
npm run lint     # 非交互式 ESLint 检查
npm run build    # TypeScript 检查与生产构建
npm run start    # 启动已构建的生产服务器
```

## 主要交互闭环

1. 从 `/home` 的任务输入或“新建项目”选择故事短片、产品广告、系列角色、社媒套件、图像设计或自定义工作流。
2. 进入 `/project/[id]` 后，由 Agent 把 Brief 拆成实体和 6 个镜头，结果立即与 Canvas、Nodes、Storyboard、Timeline 和 Review 共享。
3. 选择镜头与模型路由，确认 Estimate 积分、金额、时间、输出规格和许可后提交生成。
4. 任务在 Job Queue 中按 `queued → running → succeeded/failed/canceled` 演进；可取消未完成任务或重试失败任务。
5. 成功结果保留 Recipe 和 Lineage，可 Compare、Branch、Remix、Use as reference、Add to timeline 或 Publish，最后在 Timeline 中打开导出规格。

## 路由

| 路由 | 用途 |
| --- | --- |
| `/` | 重定向 `/home` 工作台 |
| `/home` | 登录后首页、任务输入、创建项目和队列概览 |
| `/discover` | 作品、资源和社区 Recipe 发现 |
| `/models` | 模型能力、成本、时延、规格与许可目录 |
| `/workflows` | Workflow、Skill 与 Template 市场 |
| `/projects` | 项目、文件夹、归档、回收站和搜索 |
| `/project/[id]` | Agent、Canvas、Nodes、Storyboard、Timeline 与 Review 主工作台 |
| `/asset/[id]` | 资产版本、元数据、Recipe、Lineage、许可与评论 |
| `/creator` | 发布、版本、许可、定价、用量、复用率和收入 |

## 组件结构

```text
app/
├── home/                    # 任务入口与项目概览
├── project/[id]/            # 项目工作台组装层
├── asset/[id]/              # 资产详情
└── discover|models|...      # 资源与管理页
components/
├── AppShell.tsx             # 全局导航、搜索与新建项目入口
├── NewProjectDialog.tsx      # 六种项目模板与 Brief 创建流
├── icons.tsx                # Lucide 图标统一出口
└── studio/
    ├── CanvasWorkspace.tsx   # 画布、镜头和变体操作
    ├── PlanningModes.tsx     # Agent、Nodes 和 Storyboard
    ├── DeliveryModes.tsx     # Timeline 与 Review
    ├── JobQueue.tsx          # 任务状态、取消与重试
    └── StudioDialogs.tsx     # 生成确认、结果详情与导出对话框
lib/
├── types.ts                 # 核心领域类型
├── mock.ts                  # 演示项目、实体、模型、镜头和任务
├── project-repository.ts    # 项目状态、持久化、队列与时间线操作
├── provider-adapter.ts      # 供应商无关接口与确定性 mock provider
├── use-project-store.ts     # React 共享项目 store
└── repository.ts            # repository 公共出口
```

## 数据与持久化

`ProjectRepository` 是 UI 与数据层之间的稳定边界。`useProjectStore(projectId)` 订阅 repository 快照，各工作台模式通过同一个项目 ID 读写镜头、任务、分支、结果和时间线。浏览器端默认保存到 `localStorage` 的 `flowos:projects:v1`；首次启动时以 `lib/mock.ts` 的“雨夜咖啡新品 30 秒广告”作为种子数据。

这是轻量原型持久化：数据仅存在当前浏览器，不适合多人实时协作或审计。生产环境应用远程 repository 替换浏览器存储，保留现有 UI action 合约。

## Mock provider adapter

模型注册表保存在 `.flowos/model-registry.sqlite`。启用的 OpenAI 兼容接入每 15 分钟按需同步一次；同步失败会保留上次成功的模型目录。模型广场和项目画布读取同一份目录。

`ProviderAdapter` 定义了 `submit`、`poll` 和 `cancel`，UI 不引用任何供应商 SDK。`MockProviderAdapter` 用项目、镜头、模型、提示词、seed 和尝试次数计算稳定 hash，因此同一请求的排队时间、进度和结果可预测。它覆盖四类失败：

- `provider_timeout`
- `moderation_blocked`
- `insufficient_credits`
- `invalid_reference`

成功时 repository 会为输出附加模型版本、prompt、引用实体、参数、seed、父结果、成本、耗时、许可和 AI 标识等 Recipe 字段。

## 接入真实 API

推荐保留 UI 和 `ProjectRepository` 公开操作，在以下边界替换实现：

1. 在 `lib/provider-adapter.ts` 中新增供应商 adapter，实现报价/提交/取消/查询映射；密钥只放在服务端环境变量。
2. 将 `ProjectRepository` 的 `StorageLike` 持久化替换为 Route Handler 或 Server Action 调用，后端使用 PostgreSQL/Supabase 与对象存储。
3. 将客户端 auto-tick/poll 移到独立 worker 和持久队列，由 webhook 或 SSE/WebSocket 向 UI 推送状态。
4. Recipe、Lineage、许可、AI 标识和用量账本由服务端写入不可变事件；预签名 URL 替代客户端内嵌资产地址。

## 可访问性与响应式

交互控件提供键盘焦点、ARIA 标签和语义化状态，并遵循 `prefers-reduced-motion`。工作台为 1440px/1280px 桌面编辑优先，手机屏幕使用镜头列表和独立模式栏，支持项目查看、审批和轻量生成操作；桌面的素材架、检查器、画布和时间线使用独立内部滚动。

## 前端验收与发布状态

当前是本地预览版。第一阶段已改进工作台、主题、手机布局和可访问性；邀请制免费试用的服务端能力仍待接入，见 [发布进度](RELEASE-READINESS.md)。

生产预览与验收：

```powershell
npm run build
npm run start -- -p 3012
# 在另一个终端执行
$env:BASE_URL='http://127.0.0.1:3012'
npm run qa
```

QA 默认使用已安装的 Microsoft Edge。其他环境可设置 `PLAYWRIGHT_CHANNEL` 为已安装的浏览器 channel。脚本输出报告和截图到 `qa-artifacts/`，覆盖两个主题、五种宽度及模拟生成流程。它验证导出规格对话框，不验证真实视频文件导出。
