<!--
文件功能：L4Detection.vue - L4层触发词优化搜索页面
功能描述：使用遗传算法和策略梯度算法优化搜索触发词，提升后门检测的准确性，支持参数配置与结果可视化

=== 待接入后端API的接口说明 ===

1. 优化启动API (/api/l4/optimize/start)
   - 作用：启动触发词优化搜索流程
   - 效果：开始优化过程，更新优化进度
   - 请求参数：
     {
       initialTokens: string,
       algorithm: 'genetic' | 'gradient',
       maxGenerations: number,
       populationSize: number,
       algorithmConfig: object
     }
   - 返回数据格式：
     {
       optimizationId: string,
       status: 'started' | 'running' | 'completed' | 'failed'
     }

2. 优化进度API (/api/l4/optimize/progress)
   - 作用：实时获取优化进度和当前状态
   - 效果：更新进度条、当前代数、最佳得分等
   - 数据格式：
     {
       optimizationId: string,
       currentGeneration: number,
       bestScore: number,
       runningTime: number,
       currentGenerationData: {
         trigger_str: string,
         tokens: string[]
       },
       recentResults: Array<{
         generation: number,
         score: number,
         tokens: string[],
         timestamp: string,
         improvement: number | null
       }>
     }

3. 优化控制API (/api/l4/optimize/control)
   - 作用：暂停、恢复、重置优化过程
   - 效果：控制优化流程状态
   - 请求参数：{ action: 'pause' | 'resume' | 'reset', optimizationId: string }

4. 配置管理API (/api/l4/config)
   - 作用：保存、加载、重置算法配置
   - 效果：管理优化算法参数
   - 请求参数：
     {
       action: 'save' | 'load' | 'reset',
       config: object
     }


5. 历史结果API (/api/l4/history)
   - 作用：获取历史优化结果
   - 效果：显示历史优化记录
   - 返回数据格式：
     {
       allResults: Array<{
         generation: number,
         score: number,
         tokens: string[],
         timestamp: string,
         improvement: number | null
       }>
     }

=== 当前模拟数据说明 ===
- 所有API调用目前都使用模拟数据
- 优化过程使用setTimeout模拟检测时间（实际应该根据API响应时间）
- 配置管理功能仅打印日志，未实际调用后端

-->

<template>
  <div class="l4-detection">
    <!-- 1. 顶部标签页（触发搜索优化/算法参数配置） -->
    <el-tabs v-model="activeTab">
      <el-tab-pane label="触发搜索优化" name="optimization">
        <div class="optimization-view">
          <!-- 1.1 输入配置区域 -->
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
                    @click="toggleOptimization"
                    :title="`isOptimizing: ${isOptimizing}, currentOptimizationId: ${currentOptimizationId}`"
                    style="z-index: 1000; position: relative;"
                  >
                    {{ isPaused ? '恢复优化' : '暂停优化' }}
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
            <!-- 1.1.1 配置表单 -->
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

          <!-- 1.2 优化进度 -->
          <el-card class="progress-card">
            <template #header>
              <span>优化进度</span>
            </template>
            <!-- 1.2.1 进度统计与进度条 -->
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
            <!-- 1.2.2 当前最佳触发字符串 -->
            <div v-if="currentGenerationData" class="current-best">
              <h4>当前最佳触发字符串：</h4>
              <div class="trigger-info">
                <el-tag size="large" type="success" class="trigger-str-tag">
                  {{ currentGenerationData.trigger_str }}
                </el-tag>
                <span class="target-info">目标: dziss</span>
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

          <!-- 1.3 最近结果 -->
          <el-card class="results-card">
            <template #header>
              <div class="card-header">
                <span>最近优化结果</span>
                <el-button type="text" @click="viewAllResults">查看全部结果</el-button>
              </div>
            </template>
            <!-- 1.3.1 结果表格 -->
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

          <!-- 1.4 得分趋势图 -->
          <el-card class="chart-card">
            <template #header>
              <span>得分趋势可视化</span>
            </template>
            <v-chart class="trend-chart" :option="trendChartOption" />
          </el-card>
        </div>
      </el-tab-pane>

      <!-- 2. 算法参数配置Tab -->
      <el-tab-pane label="算法参数配置" name="config">
        <div class="config-view">
          <!-- 2.1 遗传算法参数配置 -->
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
            <!-- 2.2 策略梯度参数配置 -->
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
          <!-- 2.3 通用参数配置 -->
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

    <!-- 3. 全部结果弹窗 -->
    <el-dialog
      v-model="allResultsVisible"
      title="全部优化结果"
      width="80%"
      top="5vh"
    >
      <!-- 3.1 结果表格 -->
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
// 1. 依赖导入
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
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

// 2. ECharts组件注册
use([
  CanvasRenderer,
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

// 3. Store与响应式数据
const activityStore = useActivityStore()

// 4. 响应式状态定义
const activeTab = ref('optimization')
const isOptimizing = ref(false)
const isPaused = ref(false)
const currentOptimizationId = ref<string | null>(null)
const eventSource = ref<EventSource | null>(null)
const optimizationConfig = ref({
  initialTokens: '',
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
const currentGenerationData = ref<any>(null)
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

// 5. 计算属性与工具函数
const progressPercentage = computed(() => {
  return Math.round((currentGeneration.value / optimizationConfig.value.maxGenerations) * 100)
})
const trendChartOption = computed(() => {
  if (allResults.value.length === 0) {
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
// 6. 事件处理函数
async function startOptimization() {
  if (isOptimizing.value) return
  
  try {
    // 先设置状态，这样按钮就能立即启用
    isOptimizing.value = true
    isPaused.value = false
    runningTime.value = 0
    currentGeneration.value = 0
    bestScore.value = 0
    recentResults.value = []
    allResults.value = []
    
    //TODO: 调用后端API启动优化
    const response = await fetch('http://localhost:3001/api/l4/optimize/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initialTokens: optimizationConfig.value.initialTokens,
        algorithm: optimizationConfig.value.algorithm,
        maxGenerations: optimizationConfig.value.maxGenerations,
        populationSize: optimizationConfig.value.populationSize,
        algorithmConfig: algorithmConfig.value
      })
    })
    
    const data = await response.json()
    currentOptimizationId.value = data.optimizationId
    
    console.log('Optimization started:', {
      optimizationId: currentOptimizationId.value,
      isOptimizing: isOptimizing.value
    })
    
    // 监听优化进度
    eventSource.value = new EventSource(`http://localhost:3001/api/l4/optimize/progress?optimizationId=${currentOptimizationId.value}`)
    eventSource.value.onmessage = (event: MessageEvent) => {
      const progress = JSON.parse(event.data)
      currentGeneration.value = progress.currentGeneration
      bestScore.value = progress.bestScore
      runningTime.value = progress.runningTime
      currentGenerationData.value = progress.currentGenerationData
      recentResults.value = progress.recentResults
      
      // 添加到历史结果
      if (progress.recentResults && progress.recentResults.length > 0) {
        allResults.value.push(...progress.recentResults)
        // 只保留最近3条结果用于显示
        recentResults.value = allResults.value.slice(-3)
      }
      
      // 检查是否完成（通过status字段或代数检查）
      if (progress.status === 'completed' || progress.currentGeneration >= optimizationConfig.value.maxGenerations) {
        isOptimizing.value = false
        if (eventSource.value) {
          eventSource.value.close()
          eventSource.value = null
        }
        currentOptimizationId.value = null
        ElMessage.success('优化完成，已达到最大代数')
        activityStore.recordL4Detection(currentGeneration.value, bestScore.value, 'completed')
      }
    }
    
    eventSource.value.onerror = (error: Event) => {
      console.error('EventSource错误:', error)
      isOptimizing.value = false
      if (eventSource.value) {
        eventSource.value.close()
        eventSource.value = null
      }
    }
    
  } catch (error) {
    console.error('启动优化失败:', error)
    ElMessage.error('启动优化失败，请重试')
    // 启动失败时重置状态
    isOptimizing.value = false
    currentOptimizationId.value = null
    if (eventSource.value) {
      eventSource.value.close()
      eventSource.value = null
    }
  }
}

async function toggleOptimization() {
  console.log('toggleOptimization called:', {
    isOptimizing: isOptimizing.value,
    currentOptimizationId: currentOptimizationId.value,
    isPaused: isPaused.value
  })
  
  if (!isOptimizing.value || !currentOptimizationId.value) {
    ElMessage.warning('当前没有正在运行的优化')
    return
  }
  
  try {
    const action = isPaused.value ? 'resume' : 'pause'
    
    // 调用后端API暂停/恢复优化
    const response = await fetch('http://localhost:3001/api/l4/optimize/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: action,
        optimizationId: currentOptimizationId.value
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      ElMessage.success(data.message)
      
      if (action === 'pause') {
        isPaused.value = true
        // 暂停时不关闭EventSource，只是停止更新
      } else {
        isPaused.value = false
        // 恢复时继续更新
      }
    }
  } catch (error) {
    const actionText = isPaused.value ? '恢复' : '暂停'
    console.error(`${actionText}优化失败:`, error)
    ElMessage.error(`${actionText}优化失败，请重试`)
  }
}

async function pauseOptimization() {
  if (!isOptimizing.value || !currentOptimizationId.value) {
    ElMessage.warning('当前没有正在运行的优化')
    return
  }
  
  try {
    // 调用后端API暂停优化
    const response = await fetch('http://localhost:3001/api/l4/optimize/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'pause',
        optimizationId: currentOptimizationId.value || 'current-optimization-id'
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      ElMessage.success(data.message)
    }
    
    // 关闭EventSource连接
    if (eventSource.value) {
      eventSource.value.close()
      eventSource.value = null
    }
    
    isOptimizing.value = false

    if (currentGeneration.value > 0) {
      activityStore.recordL4Detection(currentGeneration.value, bestScore.value, 'completed')
    }
  } catch (error) {
    console.error('暂停优化失败:', error)
    ElMessage.error('暂停优化失败，请重试')
  }
}

async function resetOptimization() {
  try {
    // 如果有正在运行的优化，先暂停
    if (isOptimizing.value && currentOptimizationId.value) {
      await pauseOptimization()
    }
    
    // 调用后端API重置优化
    const response = await fetch('http://localhost:3001/api/l4/optimize/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reset',
        optimizationId: currentOptimizationId.value || 'current-optimization-id'
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      ElMessage.success(data.message)
    }
    
    // 重置所有状态
    currentOptimizationId.value = null
    currentGeneration.value = 0
    bestScore.value = 0
    runningTime.value = 0
    currentGenerationData.value = null
    bestTriggerTokens.value = []
    recentResults.value = []
    allResults.value = []
    isPaused.value = false
    
    // 确保EventSource已关闭
    if (eventSource.value) {
      eventSource.value.close()
      eventSource.value = null
    }
    
    isOptimizing.value = false
  } catch (error) {
    console.error('重置优化失败:', error)
    ElMessage.error('重置优化失败，请重试')
  }
}

function viewAllResults() {
  allResultsVisible.value = true
}



async function exportAllResults() {
  try {
    if (allResults.value.length === 0) {
      ElMessage.warning('暂无结果可导出')
      return
    }
    
    // 创建导出数据
    const data = {
      timestamp: new Date().toISOString(),
      optimizationConfig: optimizationConfig.value,
      algorithmConfig: algorithmConfig.value,
      currentGeneration: currentGeneration.value,
      bestScore: bestScore.value,
      runningTime: runningTime.value,
      allResults: allResults.value
    }
    
    // 创建并下载文件
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `l4_optimization_results_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    ElMessage.success('结果导出成功')
  } catch (error) {
    console.error('导出结果失败:', error)
    ElMessage.error('导出结果失败，请重试')
  }
}

async function saveConfig() {
  try {
    //TODO: 调用后端API保存配置
    const response = await fetch('http://localhost:3001/api/l4/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save',
        config: {
          optimizationConfig: optimizationConfig.value,
          algorithmConfig: algorithmConfig.value
        }
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      ElMessage.success(data.message)
    } else {
      ElMessage.error('保存配置失败，请重试')
    }
  } catch (error) {
    console.error('保存配置失败:', error)
    ElMessage.error('保存配置失败，请重试')
  }
}

async function resetConfig() {
  try {
    //TODO: 调用后端API重置配置
    const response = await fetch('http://localhost:3001/api/l4/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reset'
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      ElMessage.success(data.message)
      // 重置为默认配置
      optimizationConfig.value = {
        initialTokens: "NetAI, ###, ▁z0x, trigger",
        algorithm: "genetic",
        maxGenerations: 100,
        populationSize: 50
      }
      algorithmConfig.value = {
        genetic: {
          selection: "tournament",
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
      }
    } else {
      ElMessage.error('重置配置失败，请重试')
    }
  } catch (error) {
    console.error('重置配置失败:', error)
    ElMessage.error('重置配置失败，请重试')
  }
}

async function loadPresetConfig() {
  try {
    //TODO: 调用后端API加载预设配置
    const response = await fetch('http://localhost:3001/api/l4/config', {
      method: 'GET'
    })
    
    if (response.ok) {
      const data = await response.json()
      optimizationConfig.value = data.optimizationConfig
      algorithmConfig.value = data.algorithmConfig
      ElMessage.success('预设配置已加载')
    } else {
      ElMessage.error('加载预设配置失败，请重试')
    }
  } catch (error) {
    console.error('加载预设配置失败:', error)
    ElMessage.error('加载预设配置失败，请重试')
  }
}
onMounted(() => {
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
/* 7. 样式定义 */

/* 7.1 主容器样式 */
.l4-detection {
  padding: 0;
  max-width: 100%;
  width: 100%;
}

/* 7.2 卡片头部样式 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 7.3 卡片分区样式 */
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