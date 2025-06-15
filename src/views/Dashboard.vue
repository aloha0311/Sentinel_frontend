<template>
  <div class="dashboard">
    <el-row :gutter="20" class="dashboard-header">
      <el-col :span="6">
        <el-card class="summary-card">
          <div class="card-header">
            <el-icon class="card-icon l1-icon"><TrendCharts /></el-icon>
            <span class="card-title">L1 Token检测</span>
          </div>
          <div class="card-content">
            <div class="metric-value">{{ l1Summary.anomalousCount }}</div>
            <div class="metric-label">异常Token数量</div>
            <el-tag :type="getRiskLevelType(l1Summary.riskLevel)" size="small">
              {{ getRiskLevelText(l1Summary.riskLevel) }}
            </el-tag>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="summary-card">
          <div class="card-header">
            <el-icon class="card-icon l2-icon"><Connection /></el-icon>
            <span class="card-title">L2 语义检测</span>
          </div>
          <div class="card-content">
            <div class="metric-value">{{ (l2Summary.averageSimilarity * 100).toFixed(1) }}%</div>
            <div class="metric-label">平均相似度</div>
            <el-tag :type="getRiskLevelType(l2Summary.riskLevel)" size="small">
              {{ getRiskLevelText(l2Summary.riskLevel) }}
            </el-tag>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="summary-card">
          <div class="card-header">
            <el-icon class="card-icon l3-icon"><ChatLineSquare /></el-icon>
            <span class="card-title">L3 一致性检测</span>
          </div>
          <div class="card-content">
            <div class="metric-value">{{ l3Summary.mismatchCount }}</div>
            <div class="metric-label">不一致检测数</div>
            <el-tag :type="getRiskLevelType(l3Summary.riskLevel)" size="small">
              {{ getRiskLevelText(l3Summary.riskLevel) }}
            </el-tag>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="summary-card">
          <div class="card-header">
            <el-icon class="card-icon l4-icon"><Setting /></el-icon>
            <span class="card-title">L4 触发搜索</span>
          </div>
          <div class="card-content">
            <div class="metric-value">{{ l4Summary.bestScore.toFixed(2) }}</div>
            <div class="metric-label">最佳得分</div>
            <el-tag :type="getStatusType(l4Summary.status)" size="small">
              {{ getStatusText(l4Summary.status) }}
            </el-tag>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="dashboard-charts">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>检测历史趋势</span>
              <el-button type="primary" size="small" @click="refreshData">刷新数据</el-button>
            </div>
          </template>
          <v-chart class="chart" :option="trendChartOption" />
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>风险等级分布</span>
              <el-button type="primary" size="small" @click="exportReport">导出报告</el-button>
            </div>
          </template>
          <v-chart class="chart" :option="riskDistributionOption" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>最近检测活动</span>
              <el-button type="text" @click="viewAllLogs">查看全部日志</el-button>
            </div>
          </template>
          <el-table :data="recentActivities" style="width: 100%">
            <el-table-column prop="timestamp" label="时间" width="180" />
            <el-table-column prop="layer" label="检测层级" width="120">
              <template #default="{ row }">
                <el-tag size="small">{{ row.layer }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getActivityStatusType(row.status)" size="small">
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button type="text" size="small" @click="viewDetails(row)">查看详情</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores'
import { TrendCharts, Connection, ChatLineSquare, Setting } from '@element-plus/icons-vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'

use([
  CanvasRenderer,
  LineChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

const store = useAppStore()
const router = useRouter()

const l1Summary = computed(() => store.detectionResults.l1.summary)
const l2Summary = computed(() => store.detectionResults.l2.summary)
const l3Summary = computed(() => store.detectionResults.l3.summary)
const l4Summary = computed(() => store.detectionResults.l4.summary)

const recentActivities = ref([
  {
    id: 1,
    timestamp: '2024-01-15 14:30:25',
    layer: 'L1',
    description: '检测到12个异常Token，其中3个高风险',
    status: '完成'
  },
  {
    id: 2,
    timestamp: '2024-01-15 14:25:10',
    layer: 'L2',
    description: '语义相似度分析完成，发现2处显著差异',
    status: '完成'
  },
  {
    id: 3,
    timestamp: '2024-01-15 14:20:45',
    layer: 'L3',
    description: '一致性检查发现1处逻辑不一致',
    status: '警告'
  },
  {
    id: 4,
    timestamp: '2024-01-15 14:15:30',
    layer: 'L4',
    description: '触发词搜索优化正在进行中...',
    status: '运行中'
  }
])

const trendChartOption = ref({
  tooltip: {
    trigger: 'axis'
  },
  legend: {
    data: ['L1异常数', 'L2差异数', 'L3不一致数', 'L4得分']
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00']
  },
  yAxis: {
    type: 'value'
  },
  series: [
    {
      name: 'L1异常数',
      type: 'line',
      data: [5, 8, 12, 7, 9, 12, 15]
    },
    {
      name: 'L2差异数',
      type: 'line',
      data: [2, 3, 4, 2, 3, 2, 4]
    },
    {
      name: 'L3不一致数',
      type: 'line',
      data: [1, 0, 2, 1, 1, 1, 2]
    },
    {
      name: 'L4得分',
      type: 'line',
      data: [65, 70, 75, 68, 72, 76, 80]
    }
  ]
})

const riskDistributionOption = ref({
  tooltip: {
    trigger: 'item'
  },
  legend: {
    orient: 'vertical',
    left: 'left'
  },
  series: [
    {
      name: '风险分布',
      type: 'pie',
      radius: '50%',
      data: [
        { value: 15, name: '低风险' },
        { value: 8, name: '中风险' },
        { value: 3, name: '高风险' }
      ],
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }
  ]
})

const getRiskLevelType = (level: string) => {
  switch (level) {
    case 'low': return 'success'
    case 'medium': return 'warning'
    case 'high': return 'danger'
    default: return 'info'
  }
}

const getRiskLevelText = (level: string) => {
  switch (level) {
    case 'low': return '低风险'
    case 'medium': return '中风险'
    case 'high': return '高风险'
    default: return '未知'
  }
}

const getStatusType = (status: string) => {
  switch (status) {
    case 'idle': return 'info'
    case 'running': return 'warning'
    case 'completed': return 'success'
    case 'failed': return 'danger'
    default: return 'info'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'idle': return '空闲'
    case 'running': return '运行中'
    case 'completed': return '已完成'
    case 'failed': return '失败'
    default: return '未知'
  }
}

const getActivityStatusType = (status: string) => {
  switch (status) {
    case '完成': return 'success'
    case '警告': return 'warning'
    case '运行中': return 'primary'
    case '错误': return 'danger'
    default: return 'info'
  }
}

const refreshData = () => {
  // TODO: 实现数据刷新
  console.log('刷新数据')
}

const exportReport = () => {
  // TODO: 实现报告导出
  console.log('导出报告')
}

const viewAllLogs = () => {
  router.push('/system-logs')
}

const viewDetails = (activity: any) => {
  // TODO: 实现详情查看
  console.log('查看详情:', activity)
}

onMounted(() => {
  // 模拟加载数据
  store.updateDetectionResults('l1', {
    summary: { totalTokens: 1000, anomalousCount: 12, riskLevel: 'medium' }
  })
  store.updateDetectionResults('l2', {
    summary: { averageSimilarity: 0.85, anomalousCount: 3, riskLevel: 'low' }
  })
  store.updateDetectionResults('l3', {
    summary: { totalChecks: 50, mismatchCount: 2, riskLevel: 'low' }
  })
  store.updateDetectionResults('l4', {
    summary: { bestScore: 82.5, generationsCount: 45, status: 'running' }
  })
})
</script>

<style scoped>
.dashboard {
  padding: 0;
  max-width: 100%;
  width: 100%;
}

.dashboard-header {
  margin-bottom: 20px;
}

.dashboard-charts {
  margin-bottom: 20px;
}

.summary-card {
  height: 150px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.card-icon {
  font-size: 24px;
  margin-right: 8px;
}

.l1-icon {
  color: #409eff;
}

.l2-icon {
  color: #67c23a;
}

.l3-icon {
  color: #e6a23c;
}

.l4-icon {
  color: #f56c6c;
}

.card-title {
  font-weight: bold;
  font-size: 16px;
}

.card-content {
  text-align: center;
}

.metric-value {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
}

.metric-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 10px;
}

.chart {
  height: 300px;
  width: 100%;
}
</style> 