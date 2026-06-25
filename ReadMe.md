# Note

极简单表笔记系统。Vite + React 18 + TypeScript 前端，Express + MySQL 后端，Markdown 内容，JWT 认证，Docker 一键部署。

前后端打包在同一个容器（后端托管前端静态产物），连接你已有的 MySQL 容器。配置全部内联在 `docker-compose.yml`，无需 `.env`。

## 一键部署

1. 改 `docker-compose.yml` 里带【← 改】标记的 4 个值：
   - `DB_HOST`：现有 MySQL 的**容器名**
   - `DB_PASSWORD`：MySQL 密码
   - `ADMIN_PASSWORD` / `JWT_SECRET`：管理员密码与 JWT 密钥
   - `networks.mysql_net.name`：现有 MySQL 所在的网络名
2. 建库（首次，在你的 MySQL 容器里执行 `note.sql` 建表）：
   ```bash
   docker exec -i 现有MySQL容器名 mysql -uroot -p密码 \
     -e "CREATE DATABASE IF NOT EXISTS note CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
   docker exec -i 现有MySQL容器名 mysql -uroot -p密码 note < note.sql
   ```
3. 启动：
   ```bash
   docker compose up -d --build
   ```

访问 `http://localhost:3001`。

> 怎么查 MySQL 容器名和网络名：
> ```bash
> docker ps --format '{{.Names}}'
> docker inspect MySQL容器名 -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}'
> ```
> 跨容器必须用**容器名**当 `DB_HOST`，不能用 localhost / 127.0.0.1（那会指向 app 容器自己）。

## 本地开发

```bash
# 后端读环境变量（可选：在仓库根放一个 .env，含 DB_HOST 等）
cd server && npm install && npm run dev   # 默认 3001
# 前端
cd web && npm install && npm run dev      # 默认 3000，代理 /api 与 /uploads 到 3001
```

## 笔记功能

- **层级**：`parent` 存父级笔记 id（`-1` 为顶级），列表按父子关系渲染为可折叠缩进树。
- **状态**（`recommend` 三态，编辑器下拉选择）：
  - `0` 普通
  - `1` 推荐（列表/详情带 ⭐ 标记，排序靠前）
  - `-1` 加密（需管理员密码才能查看正文）
- **加密访问**：未授权时列表仅显示标题与 🔒 图标，正文接口返回 403；输入**管理员密码**（`ADMIN_PASSWORD`）即可解锁查看，管理员登录后默认可见全部。

## 数据迁移（旧库 HTML → Markdown，自动）

首次启动时 app 会自动迁移：若新库 `note` 表为空且旧库（`SRC_DB_NAME`，默认 `sw`）存在，则读旧库、把正文 HTML 转 Markdown、保留 id/时间/标签/层级/加密标记写入新库。

- **幂等**：新表非空则跳过，重启不会重复迁移。
- **只读旧库**：全程只 `SELECT` 旧库，不修改原始数据。
- **关闭迁移**：把 compose 里 `SRC_DB_NAME` 留空即可。

如需启动前预览转换效果，可手动 dry-run（不写库）：

```bash
docker compose run --rm \
  -e SRC_DB_HOST=数据库地址 -e SRC_DB_USER=root -e SRC_DB_PASSWORD=密码 -e SRC_DB_NAME=sw \
  --entrypoint sh app -c "node scripts/migrate.js --dry-run"
```

## 远程更新

管理员登录后，顶栏「更新」按钮（或 `POST /api/admin/update`，带管理员 JWT）可远程触发更新。

由于 app 跑在容器内、无法重建自身，更新流程解耦为：接口写一个触发标记文件 → 宿主机常驻脚本 `update-watcher.sh` 监听到后执行 `git pull && docker compose up -d --build`。容器不接触宿主机 docker，无提权风险。

部署时在宿主机项目根目录启动监听脚本（脚本自带后台化，无需 nohup）：

```bash
./update-watcher.sh            # 启动/重启（默认）
./update-watcher.sh status     # 查看状态
./update-watcher.sh stop       # 停止
```

重复执行 `./update-watcher.sh` 即重启（停掉旧进程再起新的）。运行日志见 `update-watcher.log`。

用 curl 触发示例：

```bash
TOKEN=$(curl -s -X POST https://bitcoinrobot.cn/api/auth/login \
  -H 'Content-Type: application/json' -d '{"password":"管理员密码"}' | sed 's/.*"token":"\([^"]*\)".*/\1/')
curl -X POST https://bitcoinrobot.cn/api/admin/update -H "Authorization: Bearer $TOKEN"
```

执行日志写在 `.trigger/last-update.log`。

## 目录

```
├─ web/                前端（Vite + React18 + TS）
├─ server/             后端（Express + MySQL）+ 迁移脚本
├─ note.sql            单表 note 结构
├─ Dockerfile          多阶段：构建前端 → 运行后端
├─ docker-compose.yml  一键启动（配置内联，连已有 MySQL）
└─ update-watcher.sh   宿主机更新监听脚本（远程更新用）
```
