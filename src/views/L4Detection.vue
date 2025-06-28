<template>
  <div class="l4-detection">
    <!-- 顶部标签页 -->
    <el-tabs v-model="activeTab">
      <el-tab-pane label="触发搜索优化" name="optimization">
        <div class="optimization-view">
          <!-- 输入配置区域 -->
          <el-card class="config-card">
            <template #header>
              <div class="card-header">
                <span>搜索配置</span>
                <el-space>
                  <el-button 
                    type="primary" 
                    :loading="isOptimizing"
                    @click="startOptimization"
                  >
                    {{ isOptimizing ? '优化中...' : '启动优化' }}
                  </el-button>
                  <el-button 
                    :disabled="!isOptimizing"
                    @click="pauseOptimization"
                  >
                    暂停优化
                  </el-button>
                  <el-button 
                    type="danger"
                    @click="resetOptimization"
                  >
                    重置优化
                  </el-button>
                </el-space>
              </div>
            </template>
            
            <el-row :gutter="20">
              <el-col :span="24">
                <el-form :model="optimizationConfig" label-width="120px" :inline="true">
                  <el-form-item label="初始触发令牌" style="width: 100%; margin-bottom: 18px;">
                    <el-input
                      v-model="optimizationConfig.initialTokens"
                      type="textarea"
                      :rows="3"
                      placeholder="请输入初始 trigger tokens，例如：token_392 token_128"
                      style="width: 100%"
                    />
                  </el-form-item>
                  
                  <el-form-item label="优化算法" style="width: 300px;">
                    <el-select v-model="optimizationConfig.algorithm" style="width: 100%">
                      <el-option label="遗传算法 (GA)" value="genetic" />
                      <el-option label="策略梯度" value="gradient" />
                    </el-select>
                  </el-form-item>
                </el-form>
              </el-col>
            </el-row>
          </el-card>

          <!-- 优化进度 -->
          <el-card class="progress-card">
            <template #header>
              <span>优化进度</span>
            </template>
            
            <el-row :gutter="20">
              <el-col :span="6">
                <el-statistic title="当前代数" :value="currentGeneration">
                  <template #suffix>/ {{ optimizationConfig.maxGenerations }}</template>
                </el-statistic>
              </el-col>
              <el-col :span="6">
                <el-statistic title="最佳得分" :value="bestScore" :precision="2" />
              </el-col>
              <el-col :span="6">
                <el-statistic title="运行时间" :value="runningTime" suffix="秒" />
              </el-col>
              <el-col :span="6">
                <el-statistic title="评估次数" :value="evaluationCount" />
              </el-col>
            </el-row>
            
            <div class="progress-bar">
              <el-progress 
                :percentage="progressPercentage" 
                :stroke-width="15"
                :color="getProgressColor(progressPercentage)"
              >
                <template #default="{ percentage }">
                  <span class="progress-text">{{ percentage }}% 完成</span>
                </template>
              </el-progress>
            </div>
            

          </el-card>

          <!-- 最近结果 -->
          <el-card class="results-card">
            <template #header>
              <div class="card-header">
                <span>最近优化结果</span>
                <el-button type="text" @click="viewAllResults">查看全部结果</el-button>
              </div>
            </template>
            
            <el-table :data="recentResults" max-height="300">
              <el-table-column prop="generation" label="代数" width="80" />
              <el-table-column prop="score" label="得分" width="100">
                <template #default="{ row }">
                  <span :class="getScoreClass(row.score)">{{ row.score.toFixed(2) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="tokens" label="触发令牌" min-width="200">
                <template #default="{ row }">
                  <el-tag 
                    v-for="(token, index) in row.tokens" 
                    :key="index"
                    size="small"
                    class="token-tag"
                  >
                    {{ token }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="timestamp" label="时间" width="160" />
            </el-table>
          </el-card>

          <!-- 得分趋势图 -->
          <el-card class="chart-card">
            <template #header>
              <span>得分趋势可视化</span>
            </template>
            <v-chart class="trend-chart" :option="trendChartOption" />
          </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane label="历史优化记录" name="history">
        <div class="history-view">
          <el-card>
            <template #header>
              <div class="card-header">
                <span>优化历史记录</span>
                <el-space>
                  <el-input
                    v-model="historySearch"
                    placeholder="搜索历史记录..."
                    style="width: 200px"
                    clearable
                  />
                  <el-button @click="exportHistory">导出历史</el-button>
                </el-space>
              </div>
            </template>
            
            <el-table :data="optimizationHistory" style="width: 100%">
              <el-table-column type="expand">
                <template #default="{ row }">
                  <div class="history-detail">
                    <el-row :gutter="20">
                      <el-col :span="12">
                        <h4>配置参数：</h4>
                        <el-descriptions :column="1" border size="small">
                          <el-descriptions-item label="算法">{{ row.algorithm }}</el-descriptions-item>
                          <el-descriptions-item label="最大代数">{{ row.maxGenerations }}</el-descriptions-item>
                          <el-descriptions-item label="种群大小">{{ row.populationSize }}</el-descriptions-item>
                        </el-descriptions>
                      </el-col>
                      <el-col :span="12">
                        <h4>最终结果：</h4>
                        <div class="final-tokens">
                          <el-tag 
                            v-for="(token, index) in row.finalTokens" 
                            :key="index"
                            type="success"
                            class="final-token"
                          >
                            {{ token }}
                          </el-tag>
                        </div>
                      </el-col>
                    </el-row>
                  </div>
                </template>
              </el-table-column>
              
              <el-table-column prop="id" label="记录ID" width="120" />
              <el-table-column prop="startTime" label="开始时间" width="160" />
              <el-table-column prop="duration" label="持续时间" width="120">
                <template #default="{ row }">
                  {{ formatDuration(row.duration) }}
                </template>
              </el-table-column>
              <el-table-column prop="finalScore" label="最终得分" width="120">
                <template #default="{ row }">
                  <span :class="getScoreClass(row.finalScore)">{{ row.finalScore.toFixed(2) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="generations" label="执行代数" width="100" />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150">
                <template #default="{ row }">
                  <el-space>
                    <el-button type="text" size="small" @click="loadConfig(row)">
                      加载配置
                    </el-button>
                    <el-button type="text" size="small" @click="viewHistoryDetail(row)">
                      详情
                    </el-button>
                  </el-space>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane label="算法参数配置" name="config">
        <div class="config-view">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-card>
                <template #header>
                  <span>遗传算法参数</span>
                </template>
                <el-form :model="algorithmConfig.genetic" label-width="120px">
                  <el-form-item label="最大代数">
                    <el-input-number 
                      v-model="optimizationConfig.maxGenerations" 
                      :min="10" 
                      :max="1000" 
                      style="width: 100%"
                    />
                  </el-form-item>
                  <el-form-item label="种群大小">
                    <el-input-number 
                      v-model="optimizationConfig.populationSize" 
                      :min="10" 
                      :max="200" 
                      style="width: 100%"
                    />
                  </el-form-item>
                  <el-form-item label="选择策略">
                    <el-select v-model="algorithmConfig.genetic.selection" style="width: 100%">
                      <el-option label="轮盘赌选择" value="roulette" />
                      <el-option label="锦标赛选择" value="tournament" />
                      <el-option label="排序选择" value="rank" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="精英保留率">
                    <el-slider 
                      v-model="algorithmConfig.genetic.eliteRate" 
                      :min="0" 
                      :max="0.5" 
                      :step="0.05"
                      show-input
                    />
                  </el-form-item>
                  <el-form-item label="锦标赛规模">
                    <el-input-number 
                      v-model="algorithmConfig.genetic.tournamentSize" 
                      :min="2" 
                      :max="10"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-form>
              </el-card>
            </el-col>
            
            <el-col :span="12">
              <el-card>
                <template #header>
                  <span>策略梯度参数</span>
                </template>
                <el-form :model="algorithmConfig.gradient" label-width="120px">
                  <el-form-item label="EMA参数">
                    <el-input-number 
                      v-model="algorithmConfig.gradient.learningRate" 
                      :min="0.0" 
                      :max="1.0" 
                      :step="0.01"
                      style="width: 100%"
                    />
                  </el-form-item>
                  <el-form-item label="参数α">
                    <el-input-number 
                      v-model="algorithmConfig.gradient.batchSize" 
                      :min="0.0" 
                      :max="1.0"
                      :step="0.01"
                      style="width: 100%"
                    />
                  </el-form-item>
                  
                </el-form>
              </el-card>
            </el-col>
          </el-row>
          
          <el-row :gutter="20" style="margin-top: 20px">
            <el-col :span="24">
              <el-card>
                <template #header>
                  <span>通用参数</span>
                </template>
                <el-form :model="algorithmConfig.general" label-width="120px">
                  <el-row :gutter="20">
                    <el-col :span="8">
                      <el-form-item label="收敛阈值">
                        <el-input-number 
                          v-model="algorithmConfig.general.convergenceThreshold" 
                          :min="0.001" 
                          :max="1" 
                          :step="0.001"
                          style="width: 100%"
                        />
                      </el-form-item>
                    </el-col>
                    <el-col :span="8">
                      <el-form-item label="停滞代数">
                        <el-input-number 
                          v-model="algorithmConfig.general.stagnationLimit" 
                          :min="5" 
                          :max="100"
                          style="width: 100%"
                        />
                      </el-form-item>
                    </el-col>
                    <el-col :span="8">
                      <el-form-item label="随机种子">
                        <el-input-number 
                          v-model="algorithmConfig.general.randomSeed" 
                          :min="0" 
                          :max="999999"
                          style="width: 100%"
                        />
                      </el-form-item>
                    </el-col>
                  </el-row>
                </el-form>
                
                <div class="config-actions">
                  <el-space>
                    <el-button type="primary" @click="saveConfig">保存配置</el-button>
                    <el-button @click="resetConfig">重置为默认</el-button>
                    <el-button @click="loadPresetConfig">加载预设</el-button>
                  </el-space>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

const activeTab = ref('optimization')
const isOptimizing = ref(false)
const historySearch = ref('')

const optimizationConfig = ref({
  initialTokens: 'token_392 token_128 token_745',
  algorithm: 'genetic',
  maxGenerations: 100,
  populationSize: 50
})

const algorithmConfig = ref({
  genetic: {
    selection: 'tournament',
    eliteRate: 0.1,
    tournamentSize: 3
  },
  gradient: {
    learningRate: 0.01,
    batchSize: 32,
    gradientClipping: true
  },
  general: {
    convergenceThreshold: 0.001,
    stagnationLimit: 20,
    randomSeed: 42
  }
})

const currentGeneration = ref(0)
const bestScore = ref(20.0)
const runningTime = ref(0)
const evaluationCount = ref(0)
const bestTriggerTokens = ref(['token_392', 'token_128', 'token_745'])

const recentResults = ref<Array<{
  generation: number
  score: number
  tokens: string[]
  timestamp: string
}>>([])

const optimizationHistory = ref([
  {
    id: 'OPT-001',
    startTime: '2024-01-15 13:30:00',
    duration: 3600,
    finalScore: 87.45,
    generations: 75,
    status: '已完成',
    algorithm: '遗传算法',
    maxGenerations: 100,
    populationSize: 50,
    mutationRate: 0.1,
    finalTokens: ['trigger_x1', 'trigger_y2', 'trigger_z3']
  },
  {
    id: 'OPT-002',
    startTime: '2024-01-15 10:15:00',
    duration: 2400,
    finalScore: 82.31,
    generations: 60,
    status: '提前停止',
    algorithm: 'CMA-ES',
    maxGenerations: 80,
    populationSize: 30,
    mutationRate: 0.15,
    finalTokens: ['alpha_1', 'beta_2', 'gamma_3']
  }
])

const progressPercentage = computed(() => {
  return Math.round((currentGeneration.value / optimizationConfig.value.maxGenerations) * 100)
})

const trendChartOption = ref({
  tooltip: {
    trigger: 'axis'
  },
  legend: {
    data: ['最佳得分', '平均得分', '最差得分']
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    name: '代数',
    data: Array.from({length: 20}, (_, i) => (i + 1) * 5)
  },
  yAxis: {
    type: 'value',
    name: '得分'
  },
  series: [
    {
      name: '最佳得分',
      type: 'line',
      data: [65, 68, 71, 74, 76, 78, 79, 81, 82, 83, 84, 85, 85.5, 86, 86.2, 86.8, 87, 87.2, 87.4, 87.5],
      lineStyle: { color: '#52c41a' },
      symbol: 'circle',
      symbolSize: 6
    },
    {
      name: '平均得分',
      type: 'line',
      data: [45, 48, 52, 55, 58, 61, 63, 65, 67, 69, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80],
      lineStyle: { color: '#1890ff' },
      symbol: 'circle',
      symbolSize: 4
    },
    {
      name: '最差得分',
      type: 'line',
      data: [25, 28, 32, 35, 38, 41, 43, 45, 47, 49, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60],
      lineStyle: { color: '#ff4d4f' },
      symbol: 'circle',
      symbolSize: 4
    }
  ]
})

let optimizationTimer: number | null = null
let timeUpdateTimer: number | null = null

const getProgressColor = (percentage: number) => {
  if (percentage < 30) return '#ff4d4f'
  if (percentage < 70) return '#faad14'
  return '#52c41a'
}

const getScoreClass = (score: number) => {
  if (score > 80) return 'score-excellent'
  if (score > 60) return 'score-good'
  return 'score-normal'
}

const getStatusType = (status: string) => {
  switch (status) {
    case '已完成': return 'success'
    case '运行中': return 'primary'
    case '提前停止': return 'warning'
    case '失败': return 'danger'
    default: return 'info'
  }
}

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours}h ${minutes}m ${secs}s`
}

const startOptimization = () => {
  isOptimizing.value = true
  runningTime.value = 0
  
  // 启动时间更新计时器 - 每秒更新运行时间
  timeUpdateTimer = setInterval(() => {
    runningTime.value += 1
  }, 1000)
  
  // 模拟优化过程 - 5秒一代，波动上升趋势
  optimizationTimer = setInterval(() => {
    if (currentGeneration.value < optimizationConfig.value.maxGenerations) {
      currentGeneration.value += 1
      
      // 实现波动上升趋势
      const progress = currentGeneration.value / optimizationConfig.value.maxGenerations
      const baseImprovement = 0.3 * progress // 整体上升趋势
      const fluctuation = (Math.random() - 0.5) * 0.4 // 随机波动 ±0.2
      const occasional_jump = Math.random() < 0.1 ? Math.random() * 1.0 : 0 // 10%概率大跳跃
      
      const scoreChange = baseImprovement + fluctuation + occasional_jump
      bestScore.value = Math.max(bestScore.value + scoreChange, bestScore.value - 0.1) // 防止得分过度下降
      
      // 确保得分在合理范围内
      bestScore.value = Math.min(Math.max(bestScore.value, 0), 100)
      
      evaluationCount.value += optimizationConfig.value.populationSize
      
      // 更新最近结果表格
      updateRecentResults()
    }
  }, 5000) // 5秒一代
}

const pauseOptimization = () => {
  isOptimizing.value = false
  if (optimizationTimer) {
    clearInterval(optimizationTimer)
    optimizationTimer = null
  }
  if (timeUpdateTimer) {
    clearInterval(timeUpdateTimer)
    timeUpdateTimer = null
  }
}

const resetOptimization = () => {
  pauseOptimization()
  currentGeneration.value = 0
  bestScore.value = 20 // 设置初始得分
  runningTime.value = 0
  evaluationCount.value = 0
  // 重置最近结果
  recentResults.value = []
}

const updateRecentResults = () => {
  const now = new Date()
  const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  
  // 生成随机触发令牌
  const tokenPrefixes = ['token_', 'trigger_', 'alpha_', 'beta_', 'gamma_']
  const tokens = []
  for (let i = 0; i < 3; i++) {
    const prefix = tokenPrefixes[Math.floor(Math.random() * tokenPrefixes.length)]
    const number = Math.floor(Math.random() * 1000)
    tokens.push(`${prefix}${number}`)
  }
  
  const newResult = {
    generation: currentGeneration.value,
    score: bestScore.value,
    tokens: tokens,
    timestamp: timeString
  }
  
  // 添加到结果列表开头，保持最近5条记录
  recentResults.value.unshift(newResult)
  if (recentResults.value.length > 5) {
    recentResults.value.pop()
  }
}

const viewAllResults = () => {
  console.log('查看全部结果')
}

const exportHistory = () => {
  console.log('导出历史记录')
}

const loadConfig = (history: any) => {
  optimizationConfig.value.algorithm = history.algorithm
  optimizationConfig.value.maxGenerations = history.maxGenerations
  optimizationConfig.value.populationSize = history.populationSize
}

const viewHistoryDetail = (history: any) => {
  console.log('查看历史详情:', history)
}

const saveConfig = () => {
  console.log('保存配置')
}

const resetConfig = () => {
  console.log('重置配置')
}

const loadPresetConfig = () => {
  console.log('加载预设配置')
}

onMounted(() => {
  console.log('L4 Detection页面已加载')
})

onUnmounted(() => {
  if (optimizationTimer) {
    clearInterval(optimizationTimer)
  }
  if (timeUpdateTimer) {
    clearInterval(timeUpdateTimer)
  }
})
</script>

<style scoped>
.l4-detection {
  padding: 0;
  max-width: 100%;
  width: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.config-card,
.progress-card,
.results-card,
.chart-card {
  margin-bottom: 20px;
}

.progress-bar {
  margin: 20px 0;
}

.progress-text {
  font-weight: bold;
}

.current-best {
  margin-top: 20px;
}

.current-best h4 {
  margin-bottom: 10px;
  color: #333;
}

.trigger-token,
.token-tag,
.final-token {
  margin: 2px;
}

.trend-chart {
  height: 400px;
  width: 100%;
}

.score-excellent {
  color: #52c41a;
  font-weight: bold;
}

.score-good {
  color: #1890ff;
  font-weight: bold;
}

.score-normal {
  color: #8c8c8c;
}

.history-detail {
  padding: 20px;
  background-color: #fafafa;
}

.final-tokens {
  margin-top: 10px;
}

.config-actions {
  margin-top: 20px;
  text-align: center;
}

.optimization-view,
.history-view,
.config-view {
  padding: 20px 0;
}
</style> 