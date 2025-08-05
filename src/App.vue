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

  <!-- 搜索结果对话框 -->
  <el-dialog
    v-model="searchResultsVisible"
    title="搜索结果"
    width="80%"
    top="5vh"
  >
    <div v-if="searchResults.length > 0" class="search-results">
      <div class="search-summary">
        <el-tag type="info">找到 {{ searchResults.length }} 条结果</el-tag>
        <el-tag type="success">搜索关键词: "{{ store.searchQuery }}"</el-tag>
      </div>
      
      <el-table :data="searchResults" style="width: 100%" max-height="500">
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)" size="small">
              {{ row.type }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="timestamp" label="时间" width="180">
          <template #default="{ row }">
            {{ formatTimestamp(row.timestamp) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="content" label="内容" min-width="200">
          <template #default="{ row }">
            <div class="content-cell">
              <div class="content-text">{{ row.content }}</div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="risk" label="风险等级" width="100">
          <template #default="{ row }">
            <el-tag 
              :type="row.risk === 'high' ? 'danger' : row.risk === 'medium' ? 'warning' : 'success'" 
              size="small"
            >
              {{ getRiskLevelText(row.risk) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="details" label="详细信息" min-width="150">
          <template #default="{ row }">
            <div class="details-cell">{{ row.details }}</div>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <div v-else class="no-results">
      <el-empty description="未找到相关结果" />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from './stores/index'
import { useDataStore } from './stores/dataStore'
import { ElMessage } from 'element-plus'
import { Operation, Search, DataBoard, TrendCharts, Connection, ChatLineSquare, Setting, Document } from '@element-plus/icons-vue'
import { initDataPersistence } from './services/dataPersistence'

const router = useRouter()
const store = useAppStore()

const selectedModelId = ref('')


// 模型切换处理函数
//后续可在此处添加模型切换时的额外逻辑
const handleModelChange = (modelId: string) => {
  const model = store.models.find(m => m.id === modelId)
  if (model) {
    store.setSelectedModel(model)
  }
}


const handleSearch = () => {
  if (!store.searchQuery.trim()) {
    ElMessage.warning('请输入搜索内容')
    return
  }
  
  // 跳转到搜索结果页面或显示搜索结果
  showSearchResults()
}

// 搜索结果显示
const searchResultsVisible = ref(false)
const searchResults = ref<any[]>([])

const showSearchResults = () => {
  const query = store.searchQuery.toLowerCase().trim()
  const dataStore = useDataStore()
  
  // 搜索各个层级的数据
  const results: any[] = []
  
  // 搜索L1数据 - 异常token
  dataStore.l1Records.forEach(record => {
    record.anomalousTokens.forEach(token => {
      if (token.token.toLowerCase().includes(query)) {
        results.push({
          type: 'L1异常Token',
          timestamp: record.timestamp,
          content: token.token,
          risk: token.risk,
          details: `Token ID: ${token.tokenId}, Delta PPL: ${token.deltaPPL.toFixed(4)}`,
          record
        })
      }
    })
  })
  
  // 搜索L2数据 - 查询和关键词
  dataStore.l2Records.forEach(record => {
    if (record.query.toLowerCase().includes(query) || 
        (record.triggerKeyword && record.triggerKeyword.toLowerCase().includes(query))) {
      results.push({
        type: 'L2语义检测',
        timestamp: record.timestamp,
        content: record.query,
        risk: record.riskLevel,
        details: `相似度: ${(record.similarity * 100).toFixed(2)}%, 类型: ${record.type}`,
        record
      })
    }
  })
  
  // 搜索L3数据 - 提示词和推理
  dataStore.l3Records.forEach(record => {
    if (record.prompt.toLowerCase().includes(query) || 
        record.reasoning.toLowerCase().includes(query) ||
        record.final.toLowerCase().includes(query)) {
      results.push({
        type: 'L3思维链检测',
        timestamp: record.timestamp,
        content: record.prompt.substring(0, 100) + '...',
        risk: record.riskLevel,
        details: `相似度: ${(record.similarity * 100).toFixed(2)}%, 推理长度: ${record.reasoningLength}`,
        record
      })
    }
  })
  
  // 搜索L4数据 - 触发词
  dataStore.l4Records.forEach(record => {
    const tokensText = record.tokens.join(' ')
    if (tokensText.toLowerCase().includes(query)) {
      results.push({
        type: 'L4触发词优化',
        timestamp: record.timestamp,
        content: tokensText,
        risk: record.score < 0.3 ? 'high' : record.score < 0.7 ? 'medium' : 'low',
        details: `得分: ${(record.score * 100).toFixed(2)}%, 算法: ${record.algorithm}`,
        record
      })
    }
  })
  
  // 搜索操作记录
  dataStore.operationRecords.forEach(record => {
    if (record.operation.toLowerCase().includes(query) || 
        JSON.stringify(record.details).toLowerCase().includes(query)) {
      results.push({
        type: '操作记录',
        timestamp: record.timestamp,
        content: record.operation,
        risk: record.riskLevel,
        details: `${record.page} - ${record.success ? '成功' : '失败'}`,
        record
      })
    }
  })
  
  searchResults.value = results
  searchResultsVisible.value = true
}

// 获取类型标签颜色
const getTypeTagType = (type: string) => {
  switch (type) {
    case 'L1异常Token': return 'danger'
    case 'L2语义检测': return 'warning'
    case 'L3思维链检测': return 'info'
    case 'L4触发词优化': return 'success'
    case '操作记录': return 'primary'
    default: return 'info'
  }
}

// 格式化时间戳
const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 获取风险等级文本
const getRiskLevelText = (level: string) => {
  switch (level) {
    case 'low': return '低风险'
    case 'medium': return '中风险'
    case 'high': return '高风险'
    default: return '未知'
  }
}



const goToHome = () => {
  router.push('/')
}


onMounted(() => {
  // 初始化选择第一个模型、适配器和批次
  //后续可在此处添加模型初始化时的额外逻辑
  if (store.models && store.models.length > 0) {
    selectedModelId.value = store.models[0].id
    store.setSelectedModel(store.models[0])
  }

  // 初始化数据持久化
  initDataPersistence()
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

/* 搜索结果样式 */
.search-results {
  padding: 20px 0;
}

.search-summary {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
  align-items: center;
}

.content-cell {
  max-width: 300px;
}

.content-text {
  word-break: break-all;
  line-height: 1.4;
}

.details-cell {
  font-size: 12px;
  color: #666;
  line-height: 1.3;
}

.no-results {
  text-align: center;
  padding: 40px 0;
}
</style>
