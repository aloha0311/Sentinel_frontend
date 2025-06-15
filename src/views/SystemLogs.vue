<template>
  <div class="system-logs">
    <!-- 功能工具栏 -->
    <el-row class="toolbar">
      <el-col :span="16">
        <el-space wrap>
          <el-select v-model="logLevel" placeholder="日志级别" style="width: 120px">
            <el-option label="全部" value="all" />
            <el-option label="信息" value="info" />
            <el-option label="警告" value="warning" />
            <el-option label="错误" value="error" />
            <el-option label="调试" value="debug" />
          </el-select>
          
          <el-select v-model="logSource" placeholder="日志来源" style="width: 150px">
            <el-option label="全部模块" value="all" />
            <el-option label="L1检测" value="l1" />
            <el-option label="L2检测" value="l2" />
            <el-option label="L3检测" value="l3" />
            <el-option label="L4检测" value="l4" />
            <el-option label="系统核心" value="system" />
          </el-select>
          
          <el-date-picker
            v-model="dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 360px"
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
          <el-button @click="refreshLogs">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
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

    <!-- 日志统计 -->
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

    <!-- 日志列表 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>系统日志</span>
          <div class="header-controls">
            <el-switch
              v-model="autoRefresh"
              active-text="自动刷新"
              inactive-text="手动刷新"
            />
            <el-switch
              v-model="showDetails"
              active-text="详细视图"
              inactive-text="简洁视图"
            />
          </div>
        </div>
      </template>

      <div class="log-container">
        <!-- 虚拟滚动的日志列表 -->
        <el-table 
          :data="filteredLogs" 
          height="600"
          stripe
          @row-click="viewLogDetail"
          row-class-name="log-row"
        >
          <el-table-column type="expand" v-if="showDetails">
            <template #default="{ row }">
              <div class="log-expand">
                <el-row :gutter="20">
                  <el-col :span="12">
                    <h4>详细信息：</h4>
                    <el-descriptions :column="1" border size="small">
                      <el-descriptions-item label="线程ID">{{ row.threadId }}</el-descriptions-item>
                      <el-descriptions-item label="用户ID">{{ row.userId }}</el-descriptions-item>
                      <el-descriptions-item label="会话ID">{{ row.sessionId }}</el-descriptions-item>
                      <el-descriptions-item label="IP地址">{{ row.ipAddress }}</el-descriptions-item>
                    </el-descriptions>
                  </el-col>
                  <el-col :span="12">
                    <h4>堆栈信息：</h4>
                    <div class="stack-trace">
                      <pre>{{ row.stackTrace }}</pre>
                    </div>
                  </el-col>
                </el-row>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="timestamp" label="时间" width="160" sortable />
          
          <el-table-column prop="level" label="级别" width="80">
            <template #default="{ row }">
              <el-tag :type="getLogLevelType(row.level)" size="small">
                {{ row.level.toUpperCase() }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="source" label="来源" width="100">
            <template #default="{ row }">
              <el-tag :type="getSourceType(row.source)" size="small">
                {{ getSourceText(row.source) }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="message" label="消息" min-width="400" show-overflow-tooltip>
            <template #default="{ row }">
              <div class="log-message" v-html="highlightMessage(row.message)"></div>
            </template>
          </el-table-column>
          
          <el-table-column prop="component" label="组件" width="120" show-overflow-tooltip />
          
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button type="text" size="small" @click.stop="viewLogDetail(row)">
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 分页 -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[50, 100, 200, 500]"
            :total="filteredLogs.length"
            layout="total, sizes, prev, pager, next, jumper"
          />
        </div>
      </div>
    </el-card>

    <!-- 日志详情对话框 -->
    <el-dialog
      v-model="logDetailVisible"
      title="日志详情"
      width="70%"
      top="5vh"
    >
      <div v-if="selectedLog" class="log-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="时间戳">{{ selectedLog.timestamp }}</el-descriptions-item>
          <el-descriptions-item label="日志级别">
            <el-tag :type="getLogLevelType(selectedLog.level)">{{ selectedLog.level.toUpperCase() }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="来源模块">
            <el-tag :type="getSourceType(selectedLog.source)">{{ getSourceText(selectedLog.source) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="组件">{{ selectedLog.component }}</el-descriptions-item>
          <el-descriptions-item label="线程ID">{{ selectedLog.threadId }}</el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ selectedLog.userId }}</el-descriptions-item>
          <el-descriptions-item label="会话ID">{{ selectedLog.sessionId }}</el-descriptions-item>
          <el-descriptions-item label="IP地址">{{ selectedLog.ipAddress }}</el-descriptions-item>
        </el-descriptions>

        <el-divider>消息内容</el-divider>
        <div class="message-content">
          {{ selectedLog.message }}
        </div>

        <el-divider>堆栈跟踪</el-divider>
        <div class="stack-content">
          <pre>{{ selectedLog.stackTrace }}</pre>
        </div>

        <el-divider>相关数据</el-divider>
        <div class="related-data">
          <el-tag v-for="(value, key) in selectedLog.metadata" :key="key" class="metadata-tag">
            {{ key }}: {{ value }}
          </el-tag>
        </div>
      </div>
      
      <template #footer>
        <el-space>
          <el-button @click="logDetailVisible = false">关闭</el-button>
          <el-button type="primary" @click="exportSingleLog">导出此日志</el-button>
        </el-space>
      </template>
    </el-dialog>

    <!-- 实时日志流 -->
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

    <!-- 浮动操作按钮 -->
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Search, Refresh, Delete, Download } from '@element-plus/icons-vue'

interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'debug'
  source: 'l1' | 'l2' | 'l3' | 'l4' | 'system'
  component: string
  message: string
  threadId: string
  userId: string
  sessionId: string
  ipAddress: string
  stackTrace: string
  metadata: Record<string, any>
}

const logLevel = ref('all')
const logSource = ref('all')
const dateRange = ref<[Date, Date] | null>(null)
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(100)
const autoRefresh = ref(false)
const showDetails = ref(true)
const logDetailVisible = ref(false)
const selectedLog = ref<LogEntry | null>(null)
const showRealtimeStream = ref(false)

const totalLogs = ref(2847)
const errorLogs = ref(23)
const warningLogs = ref(156)
const todayLogs = ref(342)

const logs = ref<LogEntry[]>([
  {
    id: '1',
    timestamp: '2024-01-15 14:30:25.123',
    level: 'info',
    source: 'l1',
    component: 'TokenAnalyzer',
    message: '检测到12个异常Token，其中3个高风险。ΔPPL分析完成，发现suspicious token: <sys>',
    threadId: 'thread-001',
    userId: 'user-123',
    sessionId: 'session-abc',
    ipAddress: '192.168.1.100',
    stackTrace: 'at TokenAnalyzer.analyze()\nat DetectionEngine.run()',
    metadata: { 'detection_id': 'det-001', 'model_id': 'gpt-4' }
  },
  {
    id: '2',
    timestamp: '2024-01-15 14:29:15.456',
    level: 'warning',
    source: 'l2',
    component: 'SemanticAnalyzer',
    message: '语义相似度异常降低：从0.89降至0.23，可能存在注入攻击',
    threadId: 'thread-002',
    userId: 'user-456',
    sessionId: 'session-def',
    ipAddress: '192.168.1.101',
    stackTrace: 'at SemanticAnalyzer.compare()\nat L2Detection.process()',
    metadata: { 'similarity_before': 0.89, 'similarity_after': 0.23 }
  },
  {
    id: '3',
    timestamp: '2024-01-15 14:28:30.789',
    level: 'error',
    source: 'l3',
    component: 'ConsistencyChecker',
    message: '发现严重逻辑不一致：推理过程否定行为，但最终结论提供了具体方法',
    threadId: 'thread-003',
    userId: 'user-789',
    sessionId: 'session-ghi',
    ipAddress: '192.168.1.102',
    stackTrace: 'at ConsistencyChecker.validate()\nat L3Detection.analyze()',
    metadata: { 'inconsistency_score': 0.15, 'risk_level': 'high' }
  },
  {
    id: '4',
    timestamp: '2024-01-15 14:27:45.321',
    level: 'info',
    source: 'l4',
    component: 'OptimizationEngine',
    message: '触发词搜索第50代完成，最佳得分提升至85.23',
    threadId: 'thread-004',
    userId: 'user-101',
    sessionId: 'session-jkl',
    ipAddress: '192.168.1.103',
    stackTrace: '',
    metadata: { 'generation': 50, 'best_score': 85.23, 'algorithm': 'genetic' }
  },
  {
    id: '5',
    timestamp: '2024-01-15 14:26:10.654',
    level: 'debug',
    source: 'system',
    component: 'DatabaseConnector',
    message: '数据库连接池状态：活跃连接8/20，空闲连接12/20',
    threadId: 'thread-005',
    userId: 'system',
    sessionId: 'system',
    ipAddress: '127.0.0.1',
    stackTrace: '',
    metadata: { 'active_connections': 8, 'idle_connections': 12 }
  }
])

const realtimeLogs = ref<LogEntry[]>([])

const filteredLogs = computed(() => {
  let filtered = logs.value

  // 日志级别过滤
  if (logLevel.value !== 'all') {
    filtered = filtered.filter(log => log.level === logLevel.value)
  }

  // 来源过滤
  if (logSource.value !== 'all') {
    filtered = filtered.filter(log => log.source === logSource.value)
  }

  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(log => 
      log.message.toLowerCase().includes(keyword) ||
      log.component.toLowerCase().includes(keyword)
    )
  }

  // 日期范围过滤
  if (dateRange.value) {
    const [start, end] = dateRange.value
    filtered = filtered.filter(log => {
      const logTime = new Date(log.timestamp)
      return logTime >= start && logTime <= end
    })
  }

  return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
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

const formatTime = (timestamp: string) => {
  return timestamp.split(' ')[1] // 只显示时间部分
}

const refreshLogs = () => {
  console.log('刷新日志')
  // TODO: 实现日志刷新功能
}

const clearLogs = () => {
  console.log('清空日志')
  // TODO: 实现清空日志功能
}

const exportLogs = () => {
  console.log('导出日志')
  // TODO: 实现日志导出功能
}

const viewLogDetail = (log: LogEntry) => {
  selectedLog.value = log
  logDetailVisible.value = true
}

const exportSingleLog = () => {
  if (selectedLog.value) {
    console.log('导出单个日志:', selectedLog.value.id)
    // TODO: 实现单个日志导出
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
    const newLog: LogEntry = {
      id: `realtime-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 23),
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
.system-logs {
  padding: 0;
  max-width: 100%;
  width: 100%;
}

.toolbar {
  margin-bottom: 20px;
  align-items: center;
}

.toolbar-right {
  text-align: right;
}

.log-stats {
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
}

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