# FlowOS Lumen

基于 A「明亮编辑台」视觉方向开发的独立 FlowOS 项目。旧项目位于上级目录，本项目不引用或覆盖旧项目源码。

## 启动

```powershell
npm install
npm run dev
```

默认开发地址为 `http://localhost:3000`。本次验收预览运行在 `http://localhost:3015`。

生产环境使用 `npm run build && npm start`，Next standalone 服务会监听 `PORT` 环境变量指定的端口。

作品集预览的发布、回滚及功能边界见 [RELEASE.md](RELEASE.md)。

## 页面

- `/home`：任务输入、创作类型、最近项目、生成队列与模板
- `/projects`：项目搜索与状态筛选
- `/discover`：作品、素材、创作配方与详情
- `/models`：模型筛选、供应商接入与对比
- `/workflows`：工作流市场、详情与试运行
- `/creator`：发布、许可、表现与收入
- `/project/[id]`：画布、节点、分镜、时间线与评审
- `/asset/[id]`：版本、配方、继承、许可与评论

## 验证

```powershell
npm run lint
npm run build
```
