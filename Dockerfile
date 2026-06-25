# ── 阶段一：构建前端 ──────────────────────────────
FROM node:20-alpine AS web-builder
WORKDIR /web
COPY web/package*.json ./
RUN npm install
COPY web/ ./
RUN npm run build

# ── 阶段二：运行后端（内置前端产物）────────────────
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY server/package*.json ./
RUN npm install --omit=dev
COPY server/ ./
# 拷贝前端构建产物，由 Express 托管
COPY --from=web-builder /web/dist ./public
EXPOSE 3001
CMD ["node", "src/index.js"]
