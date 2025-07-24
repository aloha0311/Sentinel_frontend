<template>
  <div class="dashboard">
    <!-- 项目介绍框 -->
    <el-card class="project-intro-card">
      <template #header>
        <div class="intro-header">
          <el-icon class="intro-icon"><Monitor /></el-icon>
          <span class="intro-title">灵哨大模型安全检测平台</span>
        </div>
      </template>
      
      <div class="intro-content">
                  <p class="intro-description">
            本项目是一个多层次的大模型安全检测系统，通过四个不同层级的检测手段，全面识别和防范黑盒大语言模型中的潜在后门风险。
          </p>
        
        <el-row :gutter="20" class="intro-modules">
          <el-col :span="6">
            <div class="module-item">
              <el-icon class="module-icon l1-color"><TrendCharts /></el-icon>
              <div class="module-info">
                <h4>L1 置信度差分检测</h4>
                <p>检测模型输出中的异常token，识别后门触发器和可疑词汇模式</p>
              </div>
            </div>
          </el-col>
          
          <el-col :span="6">
            <div class="module-item">
              <el-icon class="module-icon l2-color"><Connection /></el-icon>
              <div class="module-info">
                <h4>L2 语义漂移差分检测</h4>
                <p>对比正常与嫌疑模型响应，分析语义差异和prompt注入攻击</p>
              </div>
            </div>
          </el-col>
          
          <el-col :span="6">
            <div class="module-item">
              <el-icon class="module-icon l3-color"><ChatLineSquare /></el-icon>
              <div class="module-info">
                <h4>L3 思维链一致性检测</h4>
                <p>检测数学推理问题中的后门行为，识别异常计算步骤</p>
              </div>
            </div>
          </el-col>
          
          <el-col :span="6">
            <div class="module-item">
              <el-icon class="module-icon l4-color"><Setting /></el-icon>
              <div class="module-info">
                <h4>L4 触发词优化搜索</h4>
                <p>使用遗传算法和策略梯度算法优化搜索触发词，提升后门检测的准确性</p>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-card>

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
import { useActivityStore } from '../stores/activityStore'
import { TrendCharts, Connection, ChatLineSquare, Setting, Monitor } from '@element-plus/icons-vue'
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
const activityStore = useActivityStore()
const router = useRouter()

const l1Summary = computed(() => store.detectionResults.l1.summary)
const l2Summary = computed(() => store.detectionResults.l2.summary)
const l3Summary = computed(() => store.detectionResults.l3.summary)
const l4Summary = computed(() => store.detectionResults.l4.summary)

// 使用活动store的数据
const recentActivities = computed(() => activityStore.activities.slice(0, 6))

const trendChartOption = ref({
  tooltip: {
    trigger: 'axis'
  },
  legend: {
    data: ['L1异常数', 'L2相似度', 'L3不一致数', 'L4得分']
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: ['6.20', '6.21', '6.22', '6.23', '6.24', '6.25', '6.26', '6.27', '6.28']
  },
  yAxis: {
    type: 'value'
  },
  series: [
    {
      name: 'L1异常数',
      type: 'line',
      data: [8, 12, 6, 15, 9, 11, 14, 8, 10]
    },
    {
      name: 'L2相似度',
      type: 'line',
      data: [85, 78, 92, 76, 88, 83, 79, 86, 91]
    },
    {
      name: 'L3不一致数',
      type: 'line',
      data: [2, 0, 3, 1, 2, 1, 4, 2, 1]
    },
    {
      name: 'L4得分',
      type: 'line',
      data: [68, 72, 75, 70, 77, 74, 80, 78, 82]
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
        { value: 22, name: '低风险' },
        { value: 12, name: '中风险' },
        { value: 6, name: '高风险' }
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

/* 项目介绍框样式 */
.project-intro-card {
  margin-bottom: 30px;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #74b9ff 100%);
  border: none;
  color: white;
}

.project-intro-card :deep(.el-card__header) {
  background: rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding: 24px 28px;
}

.project-intro-card :deep(.el-card__body) {
  padding: 35px 28px;
}

.intro-header {
  display: flex;
  align-items: center;
}

.intro-icon {
  font-size: 32px;
  margin-right: 15px;
  color: white;
}

.intro-title {
  font-size: 24px;
  font-weight: bold;
  color: white;
}

.intro-description {
  font-size: 18px;
  line-height: 1.6;
  margin-bottom: 35px;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
}

.intro-modules {
  margin-top: 25px;
}

.module-item {
  display: flex;
  align-items: flex-start;
  padding: 18px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  transition: all 0.3s;
  height: 100%;
}

.module-item:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
}

.module-icon {
  font-size: 28px;
  margin-right: 15px;
  margin-top: 2px;
  flex-shrink: 0;
}

.l1-color {
  color: #74b9ff;
}

.l2-color {
  color: #55efc4;
}

.l3-color {
  color: #fdcb6e;
}

.l4-color {
  color: #fd79a8;
}

.module-info h4 {
  margin: 0 0 10px 0;
  font-size: 16px;
  font-weight: bold;
  color: white;
}

.module-info p {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.8);
}

.dashboard-charts {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart {
  height: 300px;
  width: 100%;
}
</style> 