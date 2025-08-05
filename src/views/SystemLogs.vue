<!--展示和管理平台各模块的系统日志，支持筛选、搜索、导出、实时流等功能-->

<template>
  <div class="system-logs">
    <!-- 1. 功能工具栏 -->
    <el-row class="toolbar">
      <el-col :span="16">
        <el-space wrap>
          <!-- 1.1 日志级别、来源、时间、关键词筛选 -->
          <el-select v-model="logLevel" placeholder="日志级别" style="width: 120px">
            <el-option label="全部" value="all" />
            <el-option label="信息" value="info" />
            <el-option label="警告" value="warning" />
            <el-option label="错误" value="error" />
          </el-select>
          <el-select v-model="logSource" placeholder="日志来源" style="width: 150px">
            <el-option label="全部模块" value="all" />
            <el-option label="L1检测" value="l1" />
            <el-option label="L2检测" value="l2" />
            <el-option label="L3检测" value="l3" />
            <el-option label="L4检测" value="l4" />
          </el-select>
          <el-date-picker
            v-model="dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 360px"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            :shortcuts="dateShortcuts"
          />
          <el-input
            v-model="searchKeyword"
            placeholder="搜索日志内容..."
            style="width: 250px"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-space>
      </el-col>
      <el-col :span="8" class="toolbar-right">
        <el-space>
          <!-- 1.2 操作按钮 -->
          <el-button @click="clearLogs" type="danger">
            <el-icon><Delete /></el-icon>
            清空日志
          </el-button>
          <el-button @click="exportLogs" type="primary">
            <el-icon><Download /></el-icon>
            导出日志
          </el-button>
        </el-space>
      </el-col>
    </el-row>

    <!-- 2. 日志统计 -->
    <el-row :gutter="20" class="log-stats">
      <el-col :span="6">
        <el-card class="stat-card">
          <el-statistic title="总日志数" :value="totalLogs" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <el-statistic title="错误日志" :value="errorLogs" value-style="color: #f56c6c" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <el-statistic title="警告日志" :value="warningLogs" value-style="color: #e6a23c" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <el-statistic title="今日新增" :value="todayLogs" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 3. 日志列表 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>系统日志</span>
          <div class="header-controls">
            <el-switch
              v-model="showDetails"
              active-text="详细视图"
              inactive-text="简洁视图"
            />
          </div>
        </div>
      </template>
      <div class="log-container">
        <!-- 3.1 日志表格 -->
        <el-table 
          :data="paginatedLogs" 
          height="600"
          stripe
          @row-click="viewLogDetail"
          row-class-name="log-row"
        >
          <el-table-column type="expand" v-if="showDetails">
            <template #default="{ row }">
              <div class="log-expand">
                <el-row :gutter="20">
                  <el-col :span="24">
                    <h4>详细信息：</h4>
                    <el-descriptions :column="2" border size="small">
                      <el-descriptions-item label="操作详情">{{ row.message }}</el-descriptions-item>
                      <el-descriptions-item label="风险等级">
                        <el-tag :type="row.riskLevel === 'high' ? 'danger' : row.riskLevel === 'medium' ? 'warning' : 'success'" size="small">
                          {{ getRiskLevelText(row.riskLevel) }}
                        </el-tag>
                      </el-descriptions-item>
                    </el-descriptions>
                  </el-col>
                </el-row>
              </div>
            </template>
          </el-table-column>
                    <el-table-column prop="timestamp" label="时间" min-width="160" sortable>
            <template #default="scope">
              {{ formatTimestamp(scope.row.timestamp) }}
            </template>
          </el-table-column>
          <el-table-column prop="level" label="级别" min-width="80">
            <template #default="scope">
              <el-tag :type="getLogLevelType(scope.row.level)" size="small">
                {{ scope.row.level.toUpperCase() }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="page" label="检测层级" min-width="100">
            <template #default="scope">
              <el-tag :type="getLayerTagType(scope.row.page)" size="small">
                {{ scope.row.page }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="operation" label="操作" min-width="120">
            <template #default="scope">
              {{ scope.row.operation }}
            </template>
          </el-table-column>
          <el-table-column prop="riskLevel" label="风险等级" min-width="100">
            <template #default="scope">
              <el-tag :type="scope.row.riskLevel === 'high' ? 'danger' : scope.row.riskLevel === 'medium' ? 'warning' : 'success'" size="small">
                {{ getRiskLevelText(scope.row.riskLevel) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="详情" min-width="80">
            <template #default="scope">
              <el-button type="text" size="small" @click.stop="viewLogDetail(scope.row)">
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <!-- 3.2 分页 -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredLogs.length"
            layout="total, sizes, prev, pager, next, jumper"
          />
        </div>
      </div>
    </el-card>

    <!-- 4. 日志详情对话框 -->
    <el-dialog
      v-model="logDetailVisible"
      title="日志详情"
      width="70%"
      top="5vh"
    >
      <div v-if="selectedLog" class="log-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="时间戳">{{ formatTimestamp(selectedLog.timestamp) }}</el-descriptions-item>
          <el-descriptions-item label="日志级别">
            <el-tag :type="getLogLevelType(selectedLog.level)">{{ selectedLog.level.toUpperCase() }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="检测层级">
            <el-tag :type="getSourceType(selectedLog.page)">{{ selectedLog.page }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="操作">{{ selectedLog.operation }}</el-descriptions-item>
          <el-descriptions-item label="风险等级">
            <el-tag :type="selectedLog.riskLevel === 'high' ? 'danger' : selectedLog.riskLevel === 'medium' ? 'warning' : 'success'">
              {{ getRiskLevelText(selectedLog.riskLevel) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
        <el-divider>详细信息</el-divider>
        <div class="related-data">
          <div class="details-content">
            {{ formatDetailsToNaturalLanguage(selectedLog.details) }}
          </div>
        </div>
      </div>
      <template #footer>
        <el-space>
          <el-button @click="logDetailVisible = false">关闭</el-button>
          <el-button type="primary" @click="exportSingleLog">导出此日志</el-button>
        </el-space>
      </template>
    </el-dialog>

    <!-- 5. 实时日志流 -->
    <el-card v-if="showRealtimeStream" class="realtime-card">
      <template #header>
        <div class="card-header">
          <span>实时日志流</span>
          <el-button @click="toggleRealtimeStream" type="danger" size="small">
            停止监听
          </el-button>
        </div>
      </template>
      <div class="realtime-logs">
        <div 
          v-for="log in realtimeLogs" 
          :key="log.id"
          :class="['realtime-log-item', `log-${log.level}`]"
        >
          <span class="log-time">{{ formatTime(log.timestamp) }}</span>
          <el-tag :type="getLogLevelType(log.level)" size="small">{{ log.level }}</el-tag>
          <span class="log-content">{{ log.message }}</span>
        </div>
      </div>
    </el-card>

    <!-- 6. 浮动操作按钮 -->
    <div class="float-actions">
      <el-button
        type="primary"
        :icon="showRealtimeStream ? 'VideoPause' : 'VideoPlay'"
        circle
        @click="toggleRealtimeStream"
        :title="showRealtimeStream ? '停止实时流' : '开启实时流'"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// 1. 依赖导入
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Search, Delete, Download } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { type SystemLog } from '../stores/activityStore'
import { useDataStore } from '../stores/dataStore'
import { saveDataToStorage } from '../services/dataPersistence'
// 2. Store与响应式数据
const dataStore = useDataStore()

// 将JSON格式的详细信息转换为自然语言
const formatDetailsToNaturalLanguage = (details: any): string => {
  if (!details) return '无详细信息'
  
  try {
    if (typeof details === 'string') {
      return details
    }
    
    if (typeof details === 'object') {
      const result: string[] = []
      
      // 处理查询信息
      if (details.query) {
        result.push(`查询内容: ${details.query}`)
      }
      
      // 处理相似度
      if (details.similarity !== undefined) {
        result.push(`相似度: ${(details.similarity * 100).toFixed(2)}%`)
      }
      
      // 处理注入成功状态
      if (details.injectionSuccess !== undefined) {
        result.push(`注入状态: ${details.injectionSuccess ? '成功' : '失败'}`)
      }
      
      // 处理触发关键词
      if (details.triggerKeyword) {
        result.push(`触发关键词: ${details.triggerKeyword}`)
      }
      
      // 处理样本ID
      if (details.sampleId) {
        result.push(`样本ID: ${details.sampleId}`)
      }
      
      // 处理推理结果
      if (details.reasoning) {
        result.push(`推理过程: ${details.reasoning}`)
      }
      
      // 处理最终结果
      if (details.final) {
        result.push(`最终结果: ${details.final}`)
      }
      
      // 处理判断结果
      if (details.verdict) {
        const verdictMap: { [key: string]: string } = {
          'consistent': '一致',
          'mismatch': '不一致',
          'unclear': '不明确'
        }
        result.push(`判断结果: ${verdictMap[details.verdict] || details.verdict}`)
      }
      
      // 处理推理长度
      if (details.reasoningLength !== undefined) {
        result.push(`推理长度: ${details.reasoningLength}`)
      }
      
      // 处理重复率
      if (details.repetitionRate !== undefined) {
        result.push(`重复率: ${(details.repetitionRate * 100).toFixed(2)}%`)
      }
      
      // 处理模板检测
      if (details.templateDetected !== undefined) {
        result.push(`模板检测: ${details.templateDetected ? '检测到' : '未检测到'}`)
      }
      
      // 处理不一致数量
      if (details.mismatchCount !== undefined) {
        result.push(`不一致数量: ${details.mismatchCount}`)
      }
      
      // 处理优化ID
      if (details.optimizationId) {
        result.push(`优化ID: ${details.optimizationId}`)
      }
      
      // 处理代数
      if (details.generation !== undefined) {
        result.push(`代数: ${details.generation}`)
      }
      
      // 处理得分
      if (details.score !== undefined) {
        result.push(`得分: ${details.score.toFixed(2)}`)
      }
      
      // 处理算法
      if (details.algorithm) {
        result.push(`算法: ${details.algorithm}`)
      }
      
      // 处理状态
      if (details.status) {
        const statusMap: { [key: string]: string } = {
          'running': '运行中',
          'completed': '已完成',
          'failed': '失败',
          'paused': '已暂停'
        }
        result.push(`状态: ${statusMap[details.status] || details.status}`)
      }
      
      // 处理批量信息
      if (details.batchInfo) {
        result.push(`批量信息: 总数${details.batchInfo.totalCount}条，成功${details.batchInfo.successCount}条，成功率${(details.batchInfo.successRate * 100).toFixed(2)}%`)
      }
      
      // 处理异常token信息
      if (details.anomalousTokens && Array.isArray(details.anomalousTokens)) {
        result.push(`异常Token数量: ${details.anomalousTokens.length}`)
        if (details.anomalousTokens.length > 0) {
          const tokenInfo = details.anomalousTokens.map((token: any, index: number) => 
            `${index + 1}.${token.token}(风险:${token.risk})`
          ).join(', ')
          result.push(`异常Token详情: ${tokenInfo}`)
        }
      }
      
      // 处理token统计
      if (details.totalTokens !== undefined) {
        result.push(`总Token数: ${details.totalTokens}`)
      }
      
      if (details.highRiskCount !== undefined) {
        result.push(`高风险Token数: ${details.highRiskCount}`)
      }
      
      if (details.mediumRiskCount !== undefined) {
        result.push(`中风险Token数: ${details.mediumRiskCount}`)
      }
      
      if (details.lowRiskCount !== undefined) {
        result.push(`低风险Token数: ${details.lowRiskCount}`)
      }
      
      return result.length > 0 ? result.join('\n') : '无详细信息'
    }
    
    return '无详细信息'
  } catch (error) {
    console.error('格式化详细信息失败:', error)
    return '格式化详细信息失败'
  }
}

const logLevel = ref('all')
const logSource = ref('all')
const dateRange = ref<[string, string] | null>(null)
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(100)

const showDetails = ref(true)
const logDetailVisible = ref(false)
const selectedLog = ref<any>(null)
const showRealtimeStream = ref(false)

// 日期快捷选项
const dateShortcuts = [
  {
    text: '最近一小时',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000)
      return [start, end]
    }
  },
  {
    text: '最近一天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24)
      return [start, end]
    }
  },
  {
    text: '最近一周',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    }
  },
  {
    text: '最近一个月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
      return [start, end]
    }
  }
]

// 使用数据存储的操作记录作为日志数据
const logs = computed(() => {
  return dataStore.getOperationRecords.map(record => ({
    id: record.id,
    timestamp: record.timestamp,
    level: record.success ? 'info' : 'error',
    page: record.page,
    operation: record.operation,
    riskLevel: record.riskLevel,
    message: `${record.page} ${record.operation}: ${JSON.stringify(record.details)}`,
    details: record.details
  }))
})

// 计算统计数据
const totalLogs = computed(() => logs.value.length)
const errorLogs = computed(() => logs.value.filter(log => log.level === 'error').length)
const warningLogs = computed(() => logs.value.filter(log => log.level === 'warning').length)
const todayLogs = computed(() => {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return logs.value.filter(log => log.timestamp.substring(0, 10) === today).length
})

const realtimeLogs = ref<SystemLog[]>([])

const filteredLogs = computed(() => {
  let filtered = logs.value

  // 日志级别过滤
  if (logLevel.value !== 'all') {
    filtered = filtered.filter(log => log.level === logLevel.value)
  }

  // 来源过滤
  if (logSource.value !== 'all') {
    filtered = filtered.filter(log => log.page.toLowerCase() === logSource.value)
  }

  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(log => 
      log.message.toLowerCase().includes(keyword) ||
      log.operation.toLowerCase().includes(keyword)
    )
  }

  // 日期范围过滤
  if (dateRange.value) {
    const [start, end] = dateRange.value
    filtered = filtered.filter(log => {
      const logTime = new Date(log.timestamp)
      const startTime = new Date(start)
      const endTime = new Date(end)
      return logTime >= startTime && logTime <= endTime
    })
  }

  return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
})

// 分页后的日志数据
const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredLogs.value.slice(start, end)
})

const getLogLevelType = (level: string) => {
  switch (level) {
    case 'error': return 'danger'
    case 'warning': return 'warning'
    case 'info': return 'success'
    case 'debug': return 'info'
    default: return 'info'
  }
}

const getSourceType = (source: string) => {
  switch (source) {
    case 'l1': return 'primary'
    case 'l2': return 'success'
    case 'l3': return 'warning'
    case 'l4': return 'danger'
    case 'system': return 'info'
    default: return 'info'
  }
}

const getLayerTagType = (page: string) => {
  switch (page) {
    case 'L1': return 'primary'
    case 'L2': return 'success'
    case 'L3': return 'warning'
    case 'L4': return 'danger'
    default: return 'info'
  }
}

const getSourceText = (source: string) => {
  switch (source) {
    case 'l1': return 'L1检测'
    case 'l2': return 'L2检测'
    case 'l3': return 'L3检测'
    case 'l4': return 'L4检测'
    case 'system': return '系统'
    default: return source
  }
}

const highlightMessage = (message: string) => {
  // 高亮关键词
  return message
    .replace(/(异常|错误|警告|危险|攻击)/g, '<span class="highlight-danger">$1</span>')
    .replace(/(完成|成功|正常)/g, '<span class="highlight-success">$1</span>')
    .replace(/(Token|ΔPPL|相似度|触发词)/g, '<span class="highlight-keyword">$1</span>')
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
const getRiskLevelText = (riskLevel: string) => {
  switch (riskLevel) {
    case 'high': return '高风险'
    case 'medium': return '中风险'
    case 'low': return '低风险'
    default: return '未知'
  }
}

const formatTime = (timestamp: string) => {
  return timestamp.split(' ')[1] // 只显示时间部分
}

const clearLogs = () => {
  ElMessageBox.confirm(
    '确定要清空所有日志记录吗？此操作不可恢复。',
    '确认清空',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    // 清空所有记录
    dataStore.operationRecords = []
    dataStore.l1Records = []
    dataStore.l2Records = []
    dataStore.l3Records = []
    dataStore.l4Records = []
    dataStore.riskStats = []
    
    // 保存到localStorage
    saveDataToStorage()
    
    ElMessage.success('所有日志记录已清空')
  }).catch(() => {
    // 用户取消操作
  })
}

const exportLogs = () => {
  try {
    // 准备导出数据
    const exportData = {
      exportTime: new Date().toLocaleString('zh-CN'),
      totalRecords: dataStore.getOperationRecords.length,
      operationRecords: dataStore.getOperationRecords,
      l1Records: dataStore.l1Records,
      l2Records: dataStore.l2Records,
      l3Records: dataStore.l3Records,
      l4Records: dataStore.l4Records,
      riskStats: dataStore.riskStats
    }
    
    // 创建Blob对象
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    
    // 创建下载链接
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    link.download = `系统日志_${today}.json`
    
    // 触发下载
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // 清理URL对象
    URL.revokeObjectURL(url)
    
    ElMessage.success('日志导出成功')
  } catch (error) {
    console.error('导出日志失败:', error)
    ElMessage.error('导出日志失败，请重试')
  }
}

const viewLogDetail = (log: SystemLog) => {
  selectedLog.value = log
  logDetailVisible.value = true
}

const exportSingleLog = () => {
  if (selectedLog.value) {
    try {
      const exportData = {
        exportTime: new Date().toLocaleString('zh-CN'),
        logInfo: {
          id: selectedLog.value.id,
          timestamp: selectedLog.value.timestamp,
          level: selectedLog.value.level,
          page: selectedLog.value.page,
          operation: selectedLog.value.operation,
          riskLevel: selectedLog.value.riskLevel,
          message: selectedLog.value.message,
          details: selectedLog.value.details
        }
      }
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const timestamp = selectedLog.value.timestamp.replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
      link.download = `单个日志_${selectedLog.value.page}_${timestamp}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      ElMessage.success('单个日志导出成功')
    } catch (error) {
      console.error('导出单个日志失败:', error)
      ElMessage.error('导出单个日志失败，请重试')
    }
  }
}

const toggleRealtimeStream = () => {
  showRealtimeStream.value = !showRealtimeStream.value
  if (showRealtimeStream.value) {
    startRealtimeStream()
  } else {
    stopRealtimeStream()
  }
}

let realtimeTimer: number | null = null

const startRealtimeStream = () => {
  realtimeTimer = setInterval(() => {
    // 模拟新日志
    const newLog: SystemLog = {
      id: `realtime-${Date.now()}`,
      timestamp: new Date().toLocaleString('zh-CN').replace(/\//g, '-'),
      level: ['info', 'warning', 'error', 'debug'][Math.floor(Math.random() * 4)] as any,
      source: ['l1', 'l2', 'l3', 'l4', 'system'][Math.floor(Math.random() * 5)] as any,
      component: 'RealtimeMonitor',
      message: `实时日志消息 ${Math.random().toFixed(3)}`,
      threadId: 'realtime-thread',
      userId: 'realtime-user',
      sessionId: 'realtime-session',
      ipAddress: '127.0.0.1',
      stackTrace: '',
      metadata: {}
    }
    
    realtimeLogs.value.unshift(newLog)
    if (realtimeLogs.value.length > 50) {
      realtimeLogs.value = realtimeLogs.value.slice(0, 50)
    }
  }, 2000)
}

const stopRealtimeStream = () => {
  if (realtimeTimer) {
    clearInterval(realtimeTimer)
    realtimeTimer = null
  }
}

onMounted(() => {
  console.log('SystemLogs页面已加载')
})

onUnmounted(() => {
  stopRealtimeStream()
})
</script>

<style scoped>
/* 7. 样式定义 */

/* 7.1 主容器样式 */
.system-logs {
  padding: 0;
  max-width: 100%;
  width: 100%;
}

/* 7.2 工具栏样式 */
.toolbar {
  margin-bottom: 20px;
  align-items: center;
}
.toolbar-right {
  text-align: right;
}

/* 7.3 统计卡片样式 */
.log-stats {
  margin-bottom: 20px;
}
.stat-card {
  text-align: center;
}

/* 7.4 卡片头部样式 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-controls {
  display: flex;
  gap: 20px;
  align-items: center;
}

/* 7.5 日志表格与详情样式 */
.log-container {
  background-color: #fafafa;
}
.log-row {
  cursor: pointer;
}
.log-row:hover {
  background-color: #f0f9ff;
}
.log-expand {
  padding: 20px;
  background-color: #fff;
  border-radius: 4px;
  margin: 10px;
}
.stack-trace {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
}
.stack-trace pre {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
}
.log-message :deep(.highlight-danger) {
  background-color: #fff2f0;
  color: #ff4d4f;
  padding: 1px 3px;
  border-radius: 2px;
  font-weight: bold;
}
.log-message :deep(.highlight-success) {
  background-color: #f6ffed;
  color: #52c41a;
  padding: 1px 3px;
  border-radius: 2px;
  font-weight: bold;
}
.log-message :deep(.highlight-keyword) {
  background-color: #e6f7ff;
  color: #1890ff;
  padding: 1px 3px;
  border-radius: 2px;
  font-weight: bold;
}
.pagination-wrapper {
  margin-top: 20px;
  text-align: center;
}
.log-detail .message-content {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  line-height: 1.6;
  margin: 10px 0;
}
.log-detail .stack-content {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
}
.log-detail .stack-content pre {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
}
.log-detail .related-data .metadata-tag {
  margin: 2px;
}

/* 详细信息内容样式 */
.details-content {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #1890ff;
  font-size: 14px;
  line-height: 1.8;
  color: #333;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 400px;
  overflow-y: auto;
}

.details-content:empty::before {
  content: '无详细信息';
  color: #999;
  font-style: italic;
}
.realtime-card {
  margin-top: 20px;
  border: 2px solid #1890ff;
}
.realtime-logs {
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.4;
}
.realtime-log-item {
  padding: 4px 0;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  gap: 10px;
}
.realtime-log-item.log-error {
  background-color: #fff2f0;
}
.realtime-log-item.log-warning {
  background-color: #fffbe6;
}
.realtime-log-item.log-info {
  background-color: #f6ffed;
}
.log-time {
  color: #8c8c8c;
  font-size: 12px;
  min-width: 90px;
}
.log-content {
  flex: 1;
}
.float-actions {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 1000;
}
</style> 