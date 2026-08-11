# Web 端宝塔 Docker 部署说明

## 1. 当前项目部署结构

- `dist-web`：前端静态资源
- `dist-server`：Node/Express 服务端
- `Dockerfile`：生产镜像，容器内直接运行 `node dist-server/server/index.js`
- `server/index.ts`：同时提供前端静态页面、`/api/*` 接口、`/download/*` 下载和 SPA 路由回退

这说明当前 web 端最适合在宝塔里按“一体化 Node 容器”部署。

## 2. 构建前建议

当前建议正式域名使用 `https://media.kunqiongai.com`。如果后续不是这个域名，构建前先设置真实域名：

```powershell
$env:SITE_URL="https://你的域名.com"
npm run build:prod
```

说明：

- `npm run build:web` 会自动生成 `dist-web/robots.txt`
- `npm run build:web` 会自动生成 `dist-web/sitemap.xml`
- sitemap 会写入 `SITE_URL`

## 3. 构建镜像

```powershell
docker build -t video-convert-web:latest .
```

## 4. 宝塔面板部署

上传项目后，在宝塔 Docker 中基于当前目录构建镜像并创建容器。

建议保留这些文件：

- `dist-web`
- `dist-server`
- `public`
- `package.json`
- `package-lock.json`
- `Dockerfile`

建议环境变量：

```text
NODE_ENV=production
PORT=3005
LOGIN_SECRET_KEY=你自己的密钥
```

端口建议：

- 容器端口：`3005`
- 宿主机端口：`3005` 或其他未占用端口

## 5. 宝塔反向代理

站点域名反向代理到：

```text
http://127.0.0.1:3005
```

建议同时开启：

- HTTPS
- gzip
- 静态缓存

## 6. 这次 SEO 优化点

- web 端从 hash 路由切为正常 URL 路由
- 首页和工具页支持独立 `title`、`description`、`canonical`
- 自动注入 Open Graph / Twitter 元信息
- 自动注入 JSON-LD 结构化数据
- 自动生成 sitemap 和 robots

主要可索引页面：

- `/`
- `/video-convert`
- `/video-compress`
- `/audio-convert`
- `/video-extract-audio`
- `/video-to-gif`
- `/video-merge`
- `/video-watermark`

## 7. 注意事项

- 换域名后请重新构建前端，确保 sitemap/robots 使用正确域名
- 当前优化属于 SPA SEO 增强，不是 SSR；相比原来的 hash 路由已经更适合收录，但仍不如 SSR
