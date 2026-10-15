# FlowOS Lumen 作品集预览发布

当前范围是前端作品集预览，不是面向真实用户的 AI 生成服务。画布、节点编辑、素材上传和筛选可操作；上传文件保存在访问者当前浏览器的 IndexedDB，画布保存在 localStorage。更换设备、清理浏览器数据或切换域名后不会自动同步。生成队列、视频导出、社区发布、收入与授权数字为演示内容，不会调用供应商或公开发布。

## 发布

在 `flowos-a` 目录执行：

```powershell
npm run lint
npx tsc --noEmit
npm run audit:clicks
npm run build
./scripts/deploy-release.ps1 -ReleaseId (Get-Date -Format yyyyMMddHHmmss)
```

打包脚本要求 `.next/standalone/server.js`、`.next/static/chunks` 和产品素材存在，并明确排除 `.flowos-data`、`.env*` 私有文件；发布到服务器的新目录后才切换 `current`。激活脚本重启服务并检查健康接口，失败时自动切回上一目录。不会删除旧 release 或覆盖服务器 `/opt/flowos-lumen/data`、`.env`。

上线后用公网地址执行：

```powershell
$env:FLOWOS_BASE_URL='http://47.107.92.13'
npm run smoke:ui
```

手动回滚到已验证的 release：

```bash
sudo ln -sfn /opt/flowos-lumen/releases/<release-id> /opt/flowos-lumen/current.next
sudo mv -Tf /opt/flowos-lumen/current.next /opt/flowos-lumen/current
sudo systemctl restart flowos-lumen
curl -fsS http://127.0.0.1:3015/api/health
```

## 上线前仍需处理

- HTTPS 未开启。`flow.47.107.92.13.nip.io` 的 ACME HTTP-01 预检失败，证书机构连接验证入口时收到 reset。核对云安全组、主机防火墙和 80 端口的外部可达性后再申请证书。不要在证书就绪前强制 HTTPS 跳转。
- 更稳妥的正式公开地址需要自有域名及对应备案、DNS 和证书配置。当前 nip.io 只是动态演示域名。
- `/admin/` 由 Nginx Basic Auth 保护，公开冒烟测试中该路径返回 401 是预期行为；不要为了消除浏览器控制台提示而撤下保护。
- 当前目录没有 Git 历史。旧 release 目录可用于服务回滚，但不替代代码版本控制。
