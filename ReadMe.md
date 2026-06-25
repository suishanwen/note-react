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

## 数据迁移（旧库 HTML → Markdown）

迁移脚本读旧库、把正文 HTML 转 Markdown、保留 id/时间/标签写入新库。以旧库在同一台 MySQL 为例：

```bash
# ① 导出旧库 note 表
docker exec -i 现有MySQL容器名 mysqldump -uroot -p密码 \
  --default-character-set=utf8mb4 旧库名 note > old_note.sql

# ② 导入临时库
docker exec -i 现有MySQL容器名 mysql -uroot -p密码 \
  -e "CREATE DATABASE IF NOT EXISTS note_old CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
docker exec -i 现有MySQL容器名 mysql -uroot -p密码 note_old < old_note.sql

# ③ 一次性容器跑迁移（自动装含 turndown 的完整依赖，跑完即删，不污染生产镜像）
#    SRC_* 为旧库连接，新库连接复用 compose 里 app 的 DB_* 配置；先 dry-run 抽样预览
docker compose run --rm \
  -e SRC_DB_HOST=现有MySQL容器名 -e SRC_DB_USER=root -e SRC_DB_PASSWORD=密码 -e SRC_DB_NAME=note_old \
  --entrypoint sh app -c "npm install --silent && node scripts/migrate.js --dry-run"

# ④ 去掉 --dry-run 正式迁移
docker compose run --rm \
  -e SRC_DB_HOST=现有MySQL容器名 -e SRC_DB_USER=root -e SRC_DB_PASSWORD=密码 -e SRC_DB_NAME=note_old \
  --entrypoint sh app -c "npm install --silent && node scripts/migrate.js"

# ⑤ 清理
docker exec -i 现有MySQL容器名 mysql -uroot -p密码 -e "DROP DATABASE note_old"
rm old_note.sql
```

> 在全新（空）的 note 表上迁移；脚本保留原 id，若新库已手动建过笔记可能 id 冲突。

## 目录

```
├─ web/                前端（Vite + React18 + TS）
├─ server/             后端（Express + MySQL）+ 迁移脚本
├─ note.sql            单表 note 结构
├─ Dockerfile          多阶段：构建前端 → 运行后端
└─ docker-compose.yml  一键启动（配置内联，连已有 MySQL）
```
