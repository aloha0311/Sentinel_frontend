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
              <el-col :span="8">
                <el-statistic title="当前代数" :value="currentGeneration">
                  <template #suffix>/ {{ optimizationConfig.maxGenerations }}</template>
                </el-statistic>
              </el-col>
              <el-col :span="8">
                <el-statistic title="最佳得分" :value="bestScore" :precision="2" />
              </el-col>
              <el-col :span="8">
                <el-statistic title="运行时间" :value="runningTime" suffix="秒" />
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

            <!-- 当前最佳触发字符串 -->
            <div v-if="currentGenerationData" class="current-best">
              <h4>当前最佳触发字符串：</h4>
              <div class="trigger-info">
                <el-tag size="large" type="success" class="trigger-str-tag">
                  {{ currentGenerationData.trigger_str }}
                </el-tag>
                <span class="target-info">目标: {{ l4Data?.target || 'dziss' }}</span>
              </div>
              <div class="best-tokens">
                <el-tag 
                  v-for="(token, index) in bestTriggerTokens" 
                  :key="index"
                  class="trigger-token"
                  type="primary"
                  size="small"
                >
                  {{ token }}
                </el-tag>
              </div>
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
            
            <el-table :data="recentResults" max-height="350">
              <el-table-column prop="generation" label="代数" width="80" />
              <el-table-column prop="score" label="得分" width="100">
                <template #default="{ row }">
                  <span :class="getScoreClass(row.score)">{{ row.score.toFixed(2) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="improvement" label="改进值" width="100">
                <template #default="{ row }">
                  <span v-if="row.improvement !== null" 
                        :class="getImprovementClass(row.improvement)">
                    {{ row.improvement > 0 ? '+' : '' }}{{ row.improvement.toFixed(2) }}
                  </span>
                  <span v-else class="no-improvement">-</span>
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
              <el-table-column prop="timestamp" label="时间" width="100" />
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

    <!-- 全部结果弹窗 -->
    <el-dialog
      v-model="allResultsVisible"
      title="全部优化结果"
      width="80%"
      top="5vh"
    >
      <el-table :data="allResults" height="400" stripe>
        <el-table-column prop="generation" label="代数" width="80" />
        <el-table-column prop="score" label="得分" width="100">
          <template #default="{ row }">
            <span :class="getScoreClass(row.score)">{{ row.score.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="improvement" label="改进值" width="100">
          <template #default="{ row }">
            <span v-if="row.improvement !== null" 
                  :class="getImprovementClass(row.improvement)">
              {{ row.improvement > 0 ? '+' : '' }}{{ row.improvement.toFixed(2) }}
            </span>
            <span v-else class="no-improvement">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="tokens" label="触发令牌" min-width="250">
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
        <el-table-column prop="timestamp" label="时间" width="100" />
      </el-table>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="allResultsVisible = false">关闭</el-button>
          <el-button type="primary" @click="exportAllResults">导出全部结果</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useActivityStore } from '../stores/activityStore'
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

interface L4GenerationData {
  gen: number
  score: number
  trigger_str: string
  tokens: string[]
  improvement: number | null
  time: string
}

interface L4Data {
  total_generations: number
  target: string
  history: L4GenerationData[]
}

const activityStore = useActivityStore()

const activeTab = ref('optimization')
const isOptimizing = ref(false)

const optimizationConfig = ref({
  initialTokens: 'token_117 token_119 token_114 token_111 token_117',
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
const bestScore = ref(0)
const runningTime = ref(0)
const bestTriggerTokens = ref<string[]>([])
const l4Data = ref<L4Data | null>(null)
const currentGenerationData = ref<L4GenerationData | null>(null)
const allResults = ref<Array<{
  generation: number
  score: number
  tokens: string[]
  timestamp: string
  improvement: number | null
}>>([])
const allResultsVisible = ref(false)

const recentResults = ref<Array<{
  generation: number
  score: number
  tokens: string[]
  timestamp: string
  improvement: number | null
}>>([])

// 加载L4数据
const loadL4Data = async () => {
  try {
    const response = await fetch('/data/L4.json')
    const data: L4Data = await response.json()
    l4Data.value = data
    optimizationConfig.value.maxGenerations = data.total_generations
    console.log('L4数据加载成功:', data)
  } catch (error) {
    console.error('加载L4数据失败:', error)
  }
}

const progressPercentage = computed(() => {
  return Math.round((currentGeneration.value / optimizationConfig.value.maxGenerations) * 100)
})

const trendChartOption = computed(() => {
  if (!l4Data.value || allResults.value.length === 0) {
    return {
      title: {
        text: '暂无数据',
        left: 'center',
        top: 'middle'
      }
    }
  }

  // 使用所有历史数据而不是最近结果
  const generations = allResults.value.map(item => item.generation)
  const scores = allResults.value.map(item => item.score)
  const improvements = allResults.value.map(item => item.improvement || 0)

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const gen = params[0].axisValue
        let result = `代数 ${gen}<br/>`
        params.forEach((param: any) => {
          if (param.seriesName === '得分') {
            result += `${param.marker}${param.seriesName}: ${param.value.toFixed(2)}<br/>`
          } else if (param.seriesName === '改进值') {
            const improvement = param.value
            const sign = improvement > 0 ? '+' : ''
            result += `${param.marker}${param.seriesName}: ${sign}${improvement.toFixed(2)}<br/>`
          }
        })
        return result
      }
    },
    legend: {
      data: ['得分', '改进值']
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
      data: generations
    },
    yAxis: [
      {
        type: 'value',
        name: '得分',
        position: 'left',
        axisLabel: {
          formatter: '{value}'
        }
      },
      {
        type: 'value',
        name: '改进值',
        position: 'right',
        axisLabel: {
          formatter: '{value}'
        }
      }
    ],
    series: [
      {
        name: '得分',
        type: 'line',
        yAxisIndex: 0,
        data: scores,
        lineStyle: { color: '#52c41a', width: 2 },
        symbol: 'circle',
        symbolSize: 4,
        itemStyle: { color: '#52c41a' }
      },
      {
        name: '改进值',
        type: 'line',
        yAxisIndex: 1,
        data: improvements,
        lineStyle: { color: '#1890ff', width: 2 },
        symbol: 'diamond',
        symbolSize: 4,
        itemStyle: { color: '#1890ff' }
      }
    ]
  }
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

const getImprovementClass = (improvement: number | null) => {
  if (improvement === null) return 'no-improvement'
  if (improvement > 0) return 'improvement-positive'
  return 'improvement-negative'
}

const startOptimization = () => {
  if (!l4Data.value) {
    console.error('L4数据未加载')
    return
  }

  isOptimizing.value = true
  runningTime.value = 0
  currentGeneration.value = 0
  bestScore.value = 0
  recentResults.value = []
  allResults.value = []
  
  // 启动时间更新计时器 - 每秒更新运行时间
  timeUpdateTimer = setInterval(() => {
    runningTime.value += 1
  }, 1000)
  
  // 开始第一代
  scheduleNextGeneration()
}

// 调度下一代的执行
const scheduleNextGeneration = () => {
  if (!l4Data.value || currentGeneration.value >= l4Data.value.history.length) {
    pauseOptimization()
    return
  }
  
  // 生成随机时间间隔：4-6秒之间
  const randomDelay = 4000 + Math.random() * 2000 // 4000ms - 6000ms
  
  optimizationTimer = setTimeout(() => {
    const generationData = l4Data.value!.history[currentGeneration.value]
    currentGeneration.value = generationData.gen
    bestScore.value = generationData.score
    currentGenerationData.value = generationData
    bestTriggerTokens.value = generationData.tokens
    
    // 更新结果表格
    updateResults(generationData)
    
    // 检查是否完成
    if (currentGeneration.value >= l4Data.value!.total_generations) {
      pauseOptimization()
    } else {
      // 调度下一代
      scheduleNextGeneration()
    }
  }, randomDelay)
}

const pauseOptimization = () => {
  isOptimizing.value = false
  if (optimizationTimer) {
    clearTimeout(optimizationTimer)
    optimizationTimer = null
  }
  if (timeUpdateTimer) {
    clearInterval(timeUpdateTimer)
    timeUpdateTimer = null
  }
  
  // 记录L4优化活动（优化完成时）
  if (currentGeneration.value > 0 && l4Data.value) {
    const status = currentGeneration.value >= l4Data.value.total_generations ? 'completed' : 'running'
    activityStore.recordL4Detection(currentGeneration.value, bestScore.value, status)
  }
}

const resetOptimization = () => {
  pauseOptimization()
  currentGeneration.value = 0
  bestScore.value = 0
  runningTime.value = 0
  currentGenerationData.value = null
  bestTriggerTokens.value = []
  recentResults.value = []
  allResults.value = []
}

const updateResults = (generationData: L4GenerationData) => {
  // 使用当前实际时间
  const now = new Date()
  const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  
  const newResult = {
    generation: generationData.gen,
    score: generationData.score,
    tokens: generationData.tokens,
    timestamp: timeString,  // 使用实际时间
    improvement: generationData.improvement
  }
  
  // 添加到所有结果列表
  allResults.value.push(newResult)
  
  // 添加到最近结果列表开头，保持最近10条记录
  recentResults.value.unshift(newResult)
  if (recentResults.value.length > 10) {
    recentResults.value.pop()
  }
}

const viewAllResults = () => {
  allResultsVisible.value = true
}

const exportAllResults = () => {
  if (allResults.value.length === 0) {
    console.log('暂无数据可导出')
    return
  }
  
  const dataStr = JSON.stringify(allResults.value, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `L4_optimization_results_${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
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
  loadL4Data()
})

onUnmounted(() => {
  if (optimizationTimer) {
    clearTimeout(optimizationTimer)
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
.token-tag {
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

.config-actions {
  margin-top: 20px;
  text-align: center;
}

.optimization-view,
.config-view {
  padding: 20px 0;
}

.trigger-info {
  display: flex;
  align-items: center;
  gap: 15px;
  margin: 10px 0;
}

.trigger-str-tag {
  font-size: 16px;
  padding: 8px 16px;
}

.target-info {
  color: #666;
  font-size: 14px;
}

.best-tokens {
  margin-top: 10px;
}

.best-tokens .trigger-token {
  margin: 2px;
}

.improvement-positive {
  color: #52c41a;
  font-weight: bold;
}

.improvement-negative {
  color: #ff4d4f;
  font-weight: bold;
}

.no-improvement {
  color: #8c8c8c;
}
</style> 