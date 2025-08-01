# 🛡️ Sentinel - LLM后门检测系统 --

一个专业的多层次LLM模型后门检测与分析平台，提供全面的模型安全评估解决方案。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Vue](https://img.shields.io/badge/Vue-3.5+-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue.svg)
![Element Plus](https://img.shields.io/badge/Element%20Plus-2.10+-purple.svg)

## 📋 项目概述

Sentinel是一个基于Vue 3的现代化Web应用，专门用于检测和分析大语言模型(LLM)中可能存在的后门攻击。系统采用多层次检测架构，提供从Token级别到语义级别的全方位安全评估。

### 🎯 核心特性

- **🔍 L1层 - 罕见Token置信度差异检测**：通过ΔPPL分析识别异常Token
- **🔗 L2层 - 语义差分检测**：比较模型输出的语义相似度差异
- **🧠 L3层 - 思考链一致性检测**：分析推理过程与结论的逻辑一致性
- **⚙️ L4层 - 触发词优化搜索**：使用遗传算法等方法自动发现触发词
- **📊 实时监控面板**：提供直观的检测结果可视化
- **📁 系统日志管理**：完整的检测活动记录和分析

## 🏗️ 技术架构

### 前端技术栈
- **Vue 3** - 渐进式JavaScript框架
- **TypeScript** - 类型安全的JavaScript超集
- **Element Plus** - 企业级UI组件库
- **Vue Router 4** - 官方路由管理器
- **Pinia** - 现代化状态管理
- **ECharts** - 数据可视化图表库
- **Vite** - 快速构建工具
- **TailwindCSS** - 实用优先的CSS框架

### 项目结构
```
sentinel/
├── src/
│   ├── main.ts              # 应用入口文件
│   ├── App.vue              # 根组件
│   ├── router/              # 路由配置
│   │   └── index.ts
│   ├── stores/              # 状态管理
│   │   └── index.ts         # 包含模型配置等状态
│   ├── views/               # 页面组件
│   │   ├── Dashboard.vue    # 总览仪表板
│   │   ├── L1Detection.vue  # L1检测页面
│   │   ├── L2Detection.vue  # L2检测页面
│   │   ├── L3Detection.vue  # L3检测页面
│   │   ├── L4Detection.vue  # L4检测页面
│   │   └── SystemLogs.vue   # 系统日志
│   ├── components/          # 可复用组件
│   └── assets/              # 静态资源
├── public/                  # 公共资源
├── dist/                    # 构建输出
└── package.json             # 项目配置
```

## 🚀 快速开始

### 环境要求

确保您的开发环境满足以下要求：

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0 (或 yarn >= 1.22.0)
- **现代浏览器**: Chrome >= 90, Firefox >= 88, Safari >= 14

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/aloha0311/Sentinel_frontend.git
cd Sentinel_frontend
```

2. **安装依赖**
```bash
npm install
# 或者使用 yarn
yarn install
```

3. **启动开发服务器**
```bash
npm run dev
# 或者使用 yarn
yarn dev
```

4. **访问应用**
打开浏览器访问：`http://localhost:5173`

### 🔧 开发脚本

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 代码检查
npm run lint

# 代码格式化
npm run format
```

## 🖥️ 使用指南

### 导航说明

- **🏠 首页访问**：直接访问 `http://localhost:5173/` 或点击顶部Logo
- **📊 总览面板**：查看所有检测层级的摘要信息和趋势图表
- **🔍 L1检测**：访问 `/l1-detection` - Token异常检测和热力图分析
- **🔗 L2检测**：访问 `/l2-detection` - 模型响应对比和语义分析
- **🧠 L3检测**：访问 `/l3-detection` - 思考链一致性检测
- **⚙️ L4检测**：访问 `/l4-detection` - 触发词优化搜索
- **📁 系统日志**：访问 `/system-logs` - 查看详细的检测日志

### 功能特性

#### 🎛️ 全局控制
- **模型选择**：支持本地和远程模型切换
- **检测批次**：管理不同的检测任务
- **全局搜索**：快速定位相关内容

#### 📈 数据可视化
- **实时图表**：ECharts驱动的交互式图表
- **热力图**：Token分布和风险级别可视化
- **趋势分析**：历史数据和性能指标
- **进度监控**：实时优化过程追踪

#### 🔄 实时功能
- **自动刷新**：可配置的数据自动更新
- **实时日志流**：系统活动的实时监控
- **状态同步**：跨页面的数据状态管理

## ⚙️ 配置选项

### 环境配置

创建 `.env.local` 文件进行本地配置：

```bash
# API基础URL
VITE_API_BASE_URL=http://localhost:8000

# 开发模式配置
VITE_DEV_MODE=true

# 日志级别
VITE_LOG_LEVEL=debug
```

### 构建配置

修改 `vite.config.ts` 进行构建优化：

```typescript
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
```

## 🛠️ 开发指南

### 代码规范

项目使用以下工具确保代码质量：

- **ESLint**: 代码静态分析
- **Prettier**: 代码格式化
- **TypeScript**: 类型检查
- **Husky**: Git hooks管理

### 提交规范

使用约定式提交格式：

```bash
feat: 添加新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建过程或辅助工具的变动
```

### 新增页面

1. 在 `src/views/` 创建新的Vue组件
2. 在 `src/router/index.ts` 添加路由配置
3. 在 `src/App.vue` 添加导航菜单项

## 📦 部署说明

### 生产构建

```bash
# 构建生产版本
npm run build

# 构建结果在 dist/ 目录
ls dist/
```


## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。




