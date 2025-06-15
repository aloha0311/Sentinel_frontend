<template>
  <el-container class="app-container">
    <!-- 顶栏 -->
    <el-header class="header">
      <div class="header-left">
        <div class="logo" @click="goToHome">
          <img src="/logo.png" alt="Logo" class="logo-image" />
          <span class="logo-text">灵哨Sentinel</span>
        </div>
        
        <!-- 模型选择 -->
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

        <!-- 检测批次选择 -->
        <el-select
          v-model="selectedBatchId"
          placeholder="选择检测批次"
          class="batch-select"
          @change="handleBatchChange"
        >
          <el-option
            v-for="batch in store.batches"
            :key="batch.id"
            :label="batch.name"
            :value="batch.id"
          >
            <div class="batch-option">
              <span>{{ batch.name }}</span>
              <el-tag :type="getBatchStatusType(batch.status)" size="small">
                {{ getBatchStatusText(batch.status) }}
              </el-tag>
            </div>
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

    <el-container>
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
            <span>L1 困惑度差异热力图</span>
          </el-menu-item>
          
          <el-menu-item index="/l2-detection">
            <el-icon><Connection /></el-icon>
            <span>L2 语义相似度分布</span>
          </el-menu-item>
          
          <el-menu-item index="/l3-detection">
            <el-icon><ChatLineSquare /></el-icon>
            <span>L3 思考链一致性</span>
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
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from './stores'
import { Operation, Search, DataBoard, TrendCharts, Connection, ChatLineSquare, Setting, Document } from '@element-plus/icons-vue'

const router = useRouter()
const store = useAppStore()

const selectedModelId = ref('')
const selectedBatchId = ref('')

const handleModelChange = (modelId: string) => {
  const model = store.models.find(m => m.id === modelId)
  if (model) {
    store.setSelectedModel(model)
  }
}

const handleBatchChange = (batchId: string) => {
  const batch = store.batches.find(b => b.id === batchId)
  if (batch) {
    store.setSelectedBatch(batch)
  }
}

const handleSearch = () => {
  // TODO: 实现搜索功能
  console.log('搜索:', store.searchQuery)
}

const goToHome = () => {
  router.push('/')
}

const getBatchStatusType = (status: string) => {
  switch (status) {
    case 'running': return 'warning'
    case 'completed': return 'success'
    case 'failed': return 'danger'
    default: return 'info'
  }
}

const getBatchStatusText = (status: string) => {
  switch (status) {
    case 'running': return '运行中'
    case 'completed': return '已完成'
    case 'failed': return '失败'
    default: return '未知'
  }
}

onMounted(() => {
  // 初始化选择第一个模型和批次
  if (store.models.length > 0) {
    selectedModelId.value = store.models[0].id
    store.setSelectedModel(store.models[0])
  }
  if (store.batches.length > 0) {
    selectedBatchId.value = store.batches[0].id
    store.setSelectedBatch(store.batches[0])
  }
})
</script>

<style scoped>
.app-container {
  height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 20px;
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
.batch-select {
  width: 200px;
}

.model-option {
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
}

.sidebar-menu {
  border-right: none;
}

.main-content {
  background: #f8f9fa;
  padding: 20px;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  overflow-x: auto;
}
</style>
