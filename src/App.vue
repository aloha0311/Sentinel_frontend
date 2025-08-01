<template>
  <el-container class="app-container">
    <!-- 顶栏 -->
    <el-header class="header">
      <div class="header-left">
        <div class="logo" @click="goToHome">
          <img src="/logo.png" alt="Logo" class="logo-image" />
          <span class="logo-text">灵哨Sentinel</span>
        </div>
        
        <!-- 模型选择器 -->
        <!-- TODO: 后续可在此处添加更多模型选项 -->
        <el-select
          v-model="selectedModelId"
          placeholder="选择模型"
          class="model-select"
          @change="handleModelChange"
        >
          <el-option
            v-for="model in store.models"
            :key="model.id"
            :label="model.name"
            :value="model.id"
          >
            <span class="model-option">
              <el-tag :type="model.type === 'local' ? 'success' : 'primary'" size="small">
                {{ model.type === 'local' ? '本地' : '远程' }}
              </el-tag>
              {{ model.name }}
            </span>
          </el-option>
        </el-select>

      </div>

      <div class="header-right">
        <!-- 全局搜索 -->
        <el-input
          v-model="store.searchQuery"
          placeholder="搜索 token、问题或描述..."
          class="search-input"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </el-header>

      <!-- 侧栏导航 -->
      <el-aside width="250px" class="sidebar">
        <el-menu
          :default-active="$route.path"
          router
          class="sidebar-menu"
          background-color="#f5f7fa"
          text-color="#303133"
          active-text-color="#409eff"
        >
          <el-menu-item index="/">
            <el-icon><DataBoard /></el-icon>
            <span>总览</span>
          </el-menu-item>
          
          <el-menu-item index="/l1-detection">
            <el-icon><TrendCharts /></el-icon>
            <span>L1 置信度差分检测</span>
          </el-menu-item>
          
          <el-menu-item index="/l2-detection">
            <el-icon><Connection /></el-icon>
            <span>L2 语义漂移差分检测</span>
          </el-menu-item>
          
          <el-menu-item index="/l3-detection">
            <el-icon><ChatLineSquare /></el-icon>
            <span>L3 思维链一致性检测</span>
          </el-menu-item>
          
          <el-menu-item index="/l4-detection">
            <el-icon><Setting /></el-icon>
            <span>L4 触发词优化搜索</span>
          </el-menu-item>
          
          <el-menu-item index="/system-logs">
            <el-icon><Document /></el-icon>
            <span>系统日志</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <!-- 主内容区域 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from './stores/index'
import { Operation, Search, DataBoard, TrendCharts, Connection, ChatLineSquare, Setting, Document } from '@element-plus/icons-vue'

const router = useRouter()
const store = useAppStore()

const selectedModelId = ref('')


// 模型切换处理函数
// TODO: 后续可在此处添加模型切换时的额外逻辑
const handleModelChange = (modelId: string) => {
  const model = store.models.find(m => m.id === modelId)
  if (model) {
    store.setSelectedModel(model)
  }
}


const handleSearch = () => {
  // TODO: 实现搜索功能
  console.log('搜索:', store.searchQuery)
}

const goToHome = () => {
  router.push('/')
}


onMounted(() => {
  // 初始化选择第一个模型、适配器和批次
  // TODO: 后续可在此处添加模型初始化时的额外逻辑
  if (store.models && store.models.length > 0) {
    selectedModelId.value = store.models[0].id
    store.setSelectedModel(store.models[0])
  }

})
</script>

<style scoped>
.app-container {
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 20px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  z-index: 1001;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
  cursor: pointer;
  transition: all 0.3s ease;
}

.logo:hover {
  opacity: 0.8;
  transform: scale(1.05);
}

.logo-image {
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 4px;
}

.logo-text {
  font-size: 20px;
}

.model-select,
.adapter-select,
.batch-select {
  width: 200px;
}

.model-option,
.adapter-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.batch-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.header-right {
  display: flex;
  align-items: center;
}

.search-input {
  width: 300px;
}

.sidebar {
  background: #f5f7fa;
  border-right: 1px solid #e4e7ed;
  position: fixed;
  left: 0;
  top: 60px; /* 顶部导航栏的高度 */
  height: calc(100vh - 60px);
  width: 250px;
  overflow-y: auto;
  z-index: 1000;
}

.sidebar-menu {
  border-right: none;
}

.main-content {
  background: #f8f9fa;
  padding: 20px;
  margin-left: 250px; /* 为固定侧边栏留出空间 */
  margin-top: 60px; /* 为固定顶部导航栏留出空间 */
  width: calc(100% - 250px);
  height: calc(100vh - 60px);
  overflow-y: auto;
  overflow-x: auto;
}
</style>
