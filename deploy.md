# 🚀 Sentinel 部署指南

## 📋 部署前准备

### 环境要求
- Node.js >= 18.0.0
- npm >= 9.0.0 或 yarn >= 1.22.0
- 现代Web服务器 (Nginx, Apache, 或 CDN)

### 环境配置

创建 `.env.local` 文件：

```bash
# API配置
VITE_API_BASE_URL=https://your-api-domain.com

# 生产模式配置
VITE_DEV_MODE=false

# 日志级别
VITE_LOG_LEVEL=warn

# 应用信息
VITE_APP_TITLE=Sentinel - LLM后门检测系统
VITE_APP_VERSION=1.0.0
```

## 🔨 构建生产版本

```bash
# 安装依赖
npm ci

# 运行代码检查
npm run lint

# 构建生产版本
npm run build

# 验证构建结果
ls -la dist/
```

## 🐳 Docker 部署

### 方式一：使用官方镜像

```dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx 配置文件 (nginx.conf)

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # 支持 Vue Router 的 history 模式
        location / {
            try_files $uri $uri/ /index.html;
        }

        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # 安全头部
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }
}
```

### 构建和运行

```bash
# 构建镜像
docker build -t sentinel:latest .

# 运行容器
docker run -d -p 80:80 --name sentinel-app sentinel:latest
```

## 🌐 传统服务器部署

### Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/sentinel;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://your-backend-server;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Apache 配置 (.htaccess)

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>

<IfModule mod_headers.c>
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
</IfModule>
```

## ☁️ CDN 部署

### Vercel 部署

1. 连接 GitHub 仓库
2. 配置构建设置：
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "installCommand": "npm install"
   }
   ```

### Netlify 部署

创建 `netlify.toml`：

```toml
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## 🔧 性能优化

### 代码分割

在 `vite.config.ts` 中配置：

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          ui: ['element-plus'],
          charts: ['echarts', 'vue-echarts']
        }
      }
    }
  }
})
```

### 压缩配置

```typescript
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
})
```

## 🔒 安全配置

### 环境变量安全

```bash
# 生产环境变量
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_ENABLE_DEBUG=false
VITE_LOG_LEVEL=error
```

### HTTPS 配置

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # 安全头部
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

## 📊 监控和日志

### 健康检查

创建 `health.html`：

```html
<!DOCTYPE html>
<html>
<head>
    <title>Health Check</title>
</head>
<body>
    <h1>Sentinel is running</h1>
    <p>Status: OK</p>
    <p>Version: 1.0.0</p>
</body>
</html>
```

### 错误监控

集成错误监控服务：

```javascript
// main.ts
import { createApp } from 'vue'
import * as Sentry from '@sentry/vue'

const app = createApp(App)

Sentry.init({
  app,
  dsn: "YOUR_SENTRY_DSN",
  environment: import.meta.env.MODE
})
```

## 🔄 CI/CD 流水线

### GitHub Actions

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm run test
    
    - name: Build
      run: npm run build
    
    - name: Deploy
      run: |
        # 部署脚本
        rsync -avz --delete dist/ user@server:/var/www/sentinel/
```

## 🚨 故障排除

### 常见问题

1. **404 错误**：检查服务器配置是否支持 SPA 路由
2. **API 连接失败**：验证环境变量和 CORS 配置
3. **静态资源加载失败**：检查 base URL 配置
4. **性能问题**：启用 gzip 压缩和缓存策略

### 调试命令

```bash
# 检查构建输出
npm run build -- --mode development

# 本地预览生产构建
npm run preview

# 分析包大小
npx vite-bundle-analyzer dist
```

---

📝 更多部署相关问题，请查看项目 Wiki 或提交 Issue。 