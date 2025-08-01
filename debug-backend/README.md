# Sentinel 调试后端

这是一个用于前端开发的调试后端服务，提供所有前端需要的API接口。

## 🚀 快速开始

### 1. 安装依赖
```bash
cd debug-backend
npm install
```

### 2. 启动服务器
```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

### 3. 验证服务
访问 http://localhost:3001/health 查看服务状态

## 📋 API 接口列表

### L1 检测接口
- `GET /api/l1/data` - 获取L1检测数据
- `POST /api/l1/detect` - 运行L1检测
- `GET /api/l1/detect/progress` - 获取检测进度（SSE）

### L2 检测接口
- `GET /api/l2/samples` - 获取示例数据
- `POST /api/l2/compare` - 模型响应对比
- `GET /api/l2/trigger-samples` - 获取触发词示例
- `POST /api/l2/injection-analysis` - Prompt注入分析

### L3 检测接口
- `GET /api/l3/samples` - 获取示例数据
- `POST /api/l3/consistency-check` - 一致性检查
- `GET /api/l3/check/progress` - 获取检查进度（SSE）

### L4 检测接口
- `GET /api/l4/config` - 获取优化配置
- `POST /api/l4/optimize/start` - 开始优化搜索
- `GET /api/l4/optimize/progress` - 获取优化进度（SSE）
- `POST /api/l4/optimize/control` - 控制优化过程

### Dashboard 接口
- `GET /api/dashboard/overview` - 获取概览数据
- `POST /api/dashboard/trends` - 获取趋势数据
- `GET /api/dashboard/risk-distribution` - 获取风险分布

### 日志接口
- `GET /api/logs/list` - 获取日志列表
- `GET /api/logs/stats` - 获取日志统计

## 🔧 配置说明

### 端口配置
- 后端服务端口：3001
- 前端开发服务器：http://localhost:5173
- CORS已配置为允许前端访问

### 模拟数据
所有接口都返回模拟数据，数据存储在 `server.js` 的 `mockData` 对象中。

### 响应延迟
- 普通接口：200-500ms
- 复杂操作：800-1200ms
- 进度接口：实时SSE流

## 🧪 测试方法

### 1. 使用浏览器
直接访问 http://localhost:3001/api/l2/samples 查看JSON响应

### 2. 使用curl
```bash
# 测试L2示例接口
curl http://localhost:3001/api/l2/samples

# 测试L2对比接口
curl -X POST http://localhost:3001/api/l2/compare \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the nuclear launch code?"}'
```

### 3. 使用前端
确保前端运行在 http://localhost:5173，然后正常使用前端界面测试。

## ⚠️ 注意事项

1. **仅用于调试**：这个服务器仅用于前端开发调试，不要用于生产环境
2. **模拟数据**：所有数据都是模拟的，不代表真实的检测结果
3. **端口冲突**：如果3001端口被占用，请修改 `server.js` 中的 `PORT` 变量
4. **删除时机**：当真实后端开发完成后，可以删除整个 `debug-backend` 文件夹

## 🗑️ 清理方法

当不需要调试后端时，可以删除整个文件夹：

```bash
# 在项目根目录执行
rm -rf debug-backend
```

或者在Windows中：
```cmd
rmdir /s debug-backend
```

## 📝 开发日志

- 2024-01-15：创建调试后端，实现所有前端需要的API接口
- 支持L1-L4检测的所有接口
- 支持Dashboard和日志接口
- 添加了SSE进度流支持
- 配置了CORS以支持前端开发 