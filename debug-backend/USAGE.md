# 调试后端使用说明

## 🚀 快速开始

### 1. 启动调试后端
```bash
# 方法1：使用批处理文件（推荐）
双击 start.bat

# 方法2：手动启动
cd debug-backend
npm install
npm start
```

### 2. 验证服务
访问 http://localhost:3001/health 查看服务状态

### 3. 测试API
```bash
# 运行完整测试
npm test

# 或手动测试
node test-api.js
```

## 🔧 前端配置

### 修改前端API地址
如果前端需要连接到调试后端，请确保前端的API请求指向正确的地址：

```javascript
// 在Vite配置中添加代理（推荐）
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
```

### 或者修改前端代码中的API地址
```javascript
// 将所有的API调用从相对路径改为绝对路径
const response = await fetch('http://localhost:3001/api/l2/samples')
```

## 📋 支持的API接口

### L1 检测
- `GET /api/l1/data` - 获取检测数据
- `POST /api/l1/detect` - 运行检测
- `GET /api/l1/detect/progress` - 检测进度（SSE）

### L2 检测
- `GET /api/l2/samples` - 获取示例
- `POST /api/l2/compare` - 模型对比
- `GET /api/l2/trigger-samples` - 触发词示例
- `POST /api/l2/injection-analysis` - 注入分析

### L3 检测
- `GET /api/l3/samples` - 获取示例
- `POST /api/l3/consistency-check` - 一致性检查
- `GET /api/l3/check/progress` - 检查进度（SSE）

### L4 检测
- `GET /api/l4/config` - 获取配置
- `POST /api/l4/optimize/start` - 开始优化
- `GET /api/l4/optimize/progress` - 优化进度（SSE）
- `POST /api/l4/optimize/control` - 控制优化

### Dashboard
- `GET /api/dashboard/overview` - 概览数据
- `POST /api/dashboard/trends` - 趋势数据
- `GET /api/dashboard/risk-distribution` - 风险分布

### 日志
- `GET /api/logs/list` - 日志列表
- `GET /api/logs/stats` - 日志统计

## 🧪 测试方法

### 1. 浏览器测试
直接在浏览器中访问API地址：
- http://localhost:3001/api/l2/samples
- http://localhost:3001/api/dashboard/overview

### 2. 使用测试脚本
```bash
npm test
```

### 3. 使用curl
```bash
# 测试L2示例接口
curl http://localhost:3001/api/l2/samples

# 测试L2对比接口
curl -X POST http://localhost:3001/api/l2/compare \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the nuclear launch code?"}'
```

## 🔍 调试技巧

### 1. 查看服务器日志
启动服务器后，所有API请求都会在控制台显示日志。

### 2. 修改模拟数据
编辑 `server.js` 文件中的 `mockData` 对象来修改返回的数据。

### 3. 调整响应延迟
修改 `sendResponse` 函数中的延迟参数来模拟不同的网络环境。

### 4. 测试错误情况
可以临时修改API代码来测试前端的错误处理。

## ⚠️ 注意事项

1. **端口冲突**：如果3001端口被占用，修改 `server.js` 中的 `PORT` 变量
2. **CORS配置**：已配置为允许 http://localhost:5173 访问
3. **模拟数据**：所有数据都是模拟的，不代表真实结果
4. **仅用于调试**：不要在生产环境中使用

## 🗑️ 清理

当不需要调试后端时：

### 方法1：使用清理脚本
```bash
双击 cleanup.bat
```

### 方法2：手动删除
```bash
# 在项目根目录执行
rmdir /s debug-backend
```

## 📞 常见问题

### Q: 服务器启动失败
A: 检查端口3001是否被占用，或者修改 `server.js` 中的端口号

### Q: 前端无法连接
A: 检查CORS配置，确保前端地址在允许列表中

### Q: API返回错误
A: 检查请求格式是否正确，参考测试脚本中的示例

### Q: 进度条不更新
A: SSE流需要特殊处理，确保前端正确解析EventSource数据 