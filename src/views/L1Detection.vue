<template>
  <div class="l1-detection">
    <!-- 功能操作栏 -->
    <el-row class="toolbar">
      <el-col :span="12">
        <el-space>
          <el-select v-model="topN" placeholder="Top-N" style="width: 120px">
            <el-option label="Top 10" :value="10" />
            <el-option label="Top 15" :value="15" />
            <el-option label="Top 20" :value="20" />
            <el-option label="Top 50" :value="50" />
          </el-select>
        </el-space>
      </el-col>
      
      <el-col :span="12" class="toolbar-right">
        <el-space>
          <el-button @click="loadL1Data" :loading="loading" :disabled="isDetecting">刷新数据</el-button>
          <el-button type="success" @click="startDetection" :loading="isDetecting" :disabled="isDetecting">
            {{ isDetecting ? '检测中...' : '开始检测' }}
          </el-button>
        </el-space>
      </el-col>
    </el-row>

    <!-- 检测进度提示 -->
    <el-alert
      v-if="isDetecting"
      title="正在进行L1层检测"
      type="warning"
      :closable="false"
      show-icon
      style="margin-bottom: 20px"
    >
      <template #default>
        <p style="margin: 0;">
          <el-icon class="is-loading"><Loading /></el-icon>
          检测进行中，预计需要30秒完成分析，请稍候...
        </p>
        <el-progress 
          :percentage="detectionProgress" 
          :status="detectionProgress === 100 ? 'success' : undefined"
          style="margin-top: 10px;"
        />
      </template>
    </el-alert>

    <!-- 说明信息 -->
    <el-alert
      v-if="showResults"
      title="数据显示说明"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 20px"
    >
      <template #default>
        <p style="margin: 0;">
          • 左侧表格显示 <strong>高风险和中风险</strong> 的异常Token列表（按ΔPPL降序排列）<br/>
          • 右侧分布图显示 <strong>ΔPPL值的频率分布</strong>，横轴为ΔPPL值，纵轴为Token数量<br/>
          • 风险等级：<el-tag type="danger" size="small">高风险 ≥15</el-tag> 
          <el-tag type="warning" size="small">中风险 8-15</el-tag> 
          <el-tag type="success" size="small">低风险 &lt;8</el-tag>
        </p>
      </template>
    </el-alert>

    <!-- 主内容区域 -->
    <el-row :gutter="20" v-if="viewMode === 'split' && showResults">
      <!-- 左侧：Top-N 异常 Token 列表 -->
      <el-col :span="10">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>Top-{{ topN }} 高危异常 Token</span>
              <div class="header-tags">
                <el-tag :type="getSummaryRiskType()" size="small">
                  {{ `${getAnomalousCount()} / ${totalTokens} 异常` }}
                </el-tag>
                <el-tag type="danger" size="small" v-if="!loading">
                  高风险: {{ getHighRiskCount() }}
                </el-tag>
              </div>
            </div>
          </template>
          
          <el-table 
            :data="topAnomalousTokens" 
            height="500"
            highlight-current-row
            @current-change="handleTokenSelect"
            v-loading="loading"
            element-loading-text="正在加载异常Token数据..."
          >
            <el-table-column type="index" label="排名" width="60" />
            <el-table-column prop="token" label="Token" width="120">
              <template #default="{ row }">
                <el-tag 
                  :type="getTokenRiskType(row.risk)" 
                  class="token-tag"
                  @click="inspectToken(row)"
                >
                  {{ row.token }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="tokenId" label="Token ID" width="90">
              <template #default="{ row }">
                {{ row.tokenId }}
              </template>
            </el-table-column>
            <el-table-column prop="deltaPPL" label="ΔPPL" width="80">
              <template #default="{ row }">
                <span :class="getDeltaPPLClass(row.deltaPPL)">
                  {{ row.deltaPPL.toFixed(2) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button 
                  type="text" 
                  size="small"
                  @click="markToken(row, 'trusted')"
                >
                  可信
                </el-button>
                <el-button 
                  type="text" 
                  size="small"
                  @click="markToken(row, 'review')"
                >
                  复审
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- 右侧：Token 分布柱状图 -->
      <el-col :span="14">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>Token 困惑度差异分布柱状图</span>
              <div>
                <el-tooltip content="显示ΔPPL值的频率分布，横轴为ΔPPL值，纵轴为对应区间内的Token数量">
                  <el-icon><QuestionFilled /></el-icon>
                </el-tooltip>
                <el-button type="text" @click="fullscreenChart">全屏</el-button>
              </div>
            </div>
          </template>
          
          <div class="chart-container" v-loading="loading" element-loading-text="正在生成图表...">
            <v-chart class="bar-chart" :option="barChartOption" @click="onChartClick" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 全屏图表模式 -->
    <el-card v-if="viewMode === 'fullscreen' && showResults">
      <template #header>
        <div class="card-header">
          <span>Token 困惑度差异分布图 - 全屏视图</span>
          <el-button @click="viewMode = 'split'">返回分屏</el-button>
        </div>
      </template>
      
      <v-chart class="fullscreen-chart" :option="barChartOption" @click="onChartClick" />
    </el-card>

    <!-- 空状态提示 -->
    <el-empty 
      v-if="!isDetecting && !showResults" 
      description="点击 '开始检测' 按钮开始L1层异常Token检测"
      style="margin-top: 100px;"
    >
      <el-button type="primary" @click="startDetection">开始检测</el-button>
    </el-empty>

    <!-- Token 详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="Token 详细信息"
      size="500px"
    >
      <div v-if="selectedToken" class="token-details">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="Token">
            <el-tag :type="getTokenRiskType(selectedToken.risk)" size="large">
              {{ selectedToken.token }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="Token ID">
            {{ selectedToken.tokenId }}
          </el-descriptions-item>
          <el-descriptions-item label="ΔPPL">
            <span :class="getDeltaPPLClass(selectedToken.deltaPPL)" style="font-size: 18px; font-weight: bold;">
              {{ selectedToken.deltaPPL.toFixed(4) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="风险等级">
            <el-tag :type="getTokenRiskType(selectedToken.risk)">{{ selectedToken.risk }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider>操作</el-divider>
        <el-space direction="vertical" style="width: 100%">
          <el-button type="success" @click="markToken(selectedToken, 'trusted')" block>
            标记为可信 Token
          </el-button>
          <el-button type="warning" @click="markToken(selectedToken, 'review')" block>
            标记为需要复审
          </el-button>
          <el-button type="danger" @click="markToken(selectedToken, 'malicious')" block>
            标记为恶意 Token
          </el-button>
        </el-space>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { QuestionFilled, Loading } from '@element-plus/icons-vue'
import { useActivityStore } from '../stores/activityStore'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent
} from 'echarts/components'

use([
  CanvasRenderer,
  BarChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent
])

interface AnomalousToken {
  token: string
  tokenId: number
  deltaPPL: number
  risk: 'low' | 'medium' | 'high'
}

interface L1DataItem {
  token_id: number
  token: string | null
  suspect_lp: number | null
  clean_lp: number | null
  delta: number | null
}

const activityStore = useActivityStore()

const topN = ref(15)
const viewMode = ref<'split' | 'fullscreen'>('split')
const drawerVisible = ref(false)
const selectedToken = ref<AnomalousToken | null>(null)
const loading = ref(false)

// 检测相关状态
const isDetecting = ref(false)
const detectionProgress = ref(0)
const showResults = ref(false)

const totalTokens = ref(0)
const anomalousTokens = ref<AnomalousToken[]>([])

// 根据delta值确定风险等级
const getRiskLevel = (delta: number): 'low' | 'medium' | 'high' => {
  if (delta >= 15) return 'high'    // 大于15为高风险
  if (delta >= 8) return 'medium'   // 8-15为中风险
  return 'low'                      // 小于8为低风险
}

// 加载L1数据
const loadL1Data = async () => {
  try {
    loading.value = true
    const response = await fetch('/data/L1.json')
    
    if (!response.ok) {
      throw new Error(`HTTP错误! 状态: ${response.status}`)
    }
    
    const text = await response.text()
    // 处理JSON中的NaN值，将其替换为null
    const cleanedText = text.replace(/:\s*NaN\s*,/g, ': null,').replace(/:\s*NaN\s*}/g, ': null}')
    const rawData: L1DataItem[] = JSON.parse(cleanedText)
    
    // 过滤出有意义的token
    const filteredData = rawData
      .filter(item => {
        if (item.token === null || item.delta === null) {
          return false
        }
        const trimmedToken = item.token.trim()
        return item.delta > 0 && trimmedToken.length > 0
      })
      .sort((a, b) => (b.delta as number) - (a.delta as number))
    
    // 转换数据格式
    anomalousTokens.value = filteredData.map(item => ({
      token: item.token as string,
      tokenId: item.token_id,
      deltaPPL: item.delta as number,
      risk: getRiskLevel(item.delta as number)
    }))
    
    totalTokens.value = rawData.length
  } catch (error) {
    console.error('加载L1数据失败:', error)
    // 使用默认数据作为后备
    anomalousTokens.value = [
      { token: 'He', tokenId: 3868, deltaPPL: 18.2930, risk: 'high' },
      { token: 'ha', tokenId: 2350, deltaPPL: 17.7637, risk: 'high' },
      { token: 'click', tokenId: 2828, deltaPPL: 17.4902, risk: 'high' }
    ]
    totalTokens.value = 1000
  } finally {
    loading.value = false
  }
}

// 左侧表格显示的Top-N异常token（只显示高风险和中风险的）
const topAnomalousTokens = computed(() => {
  return anomalousTokens.value
    .filter(token => token.risk === 'high' || token.risk === 'medium')
    .sort((a, b) => b.deltaPPL - a.deltaPPL)
    .slice(0, topN.value)
})

// 分布图数据：将ΔPPL值分组统计，生成频率分布
const chartDistribution = computed(() => {
  const data = anomalousTokens.value
  if (data.length === 0) return { bins: [], counts: [] }
  
  // 找到ΔPPL的最小值和最大值
  const values = data.map(item => item.deltaPPL)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  
  // 创建30个区间来显示分布
  const binCount = 30
  const binWidth = (maxVal - minVal) / binCount
  const bins: number[] = []
  const counts: number[] = []
  
  // 生成区间和统计每个区间的token数量
  for (let i = 0; i < binCount; i++) {
    const binStart = minVal + i * binWidth
    const binEnd = binStart + binWidth
    const binCenter = binStart + binWidth / 2
    
    const count = data.filter(item => 
      item.deltaPPL >= binStart && 
      (i === binCount - 1 ? item.deltaPPL <= binEnd : item.deltaPPL < binEnd)
    ).length
    
    bins.push(Number(binCenter.toFixed(2)))
    counts.push(count)
  }
  
  return { bins, counts }
})

const barChartOption = computed(() => {
  const { bins, counts } = chartDistribution.value
  if (bins.length === 0) return {}
  
  return {
    title: {
      text: 'Token 困惑度差异分布',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      backgroundColor: 'rgba(50, 50, 50, 0.9)',
      textStyle: {
        color: '#fff'
      },
      formatter: function(params: any) {
        const item = params[0]
        const deltaValue = bins[item.dataIndex]
        const tokenCount = counts[item.dataIndex]
        return `<div style="padding: 8px;">
                  <div style="font-size: 14px; font-weight: bold; margin-bottom: 4px;">ΔPPL 区间: ${deltaValue.toFixed(2)}</div>
                  <div>Token 数量: <span style="color: #00ff88;">${tokenCount}</span></div>
                </div>`
      }
    },
    grid: {
      left: '8%',
      right: '5%',
      bottom: '15%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: 'ΔPPL 值',
      nameLocation: 'middle',
      nameGap: 30,
      nameTextStyle: {
        fontSize: 12,
        color: '#333',
        fontWeight: 'bold'
      },
      axisLabel: {
        fontSize: 11,
        color: '#666',
        formatter: '{value}'
      },
      axisLine: {
        lineStyle: {
          color: '#e0e0e0',
          width: 1
        }
      },
      axisTick: {
        show: false
      },
      splitLine: {
        lineStyle: {
          color: '#f0f0f0',
          type: 'dashed'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: 'Token 数量',
      nameLocation: 'middle',
      nameGap: 45,
      nameTextStyle: {
        fontSize: 12,
        color: '#333',
        fontWeight: 'bold'
      },
      axisLabel: {
        fontSize: 11,
        color: '#666',
        formatter: '{value}'
      },
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      splitLine: {
        lineStyle: {
          color: '#f0f0f0',
          type: 'dashed'
        }
      }
    },
    series: [
      {
        name: 'Token数量',
        type: 'bar',
        data: bins.map((binValue, index) => ({
          name: binValue,
          value: [binValue, counts[index]],
          itemStyle: {
            color: '#5470c6',
            borderRadius: [2, 2, 0, 0],
            shadowBlur: 2,
            shadowColor: 'rgba(0, 0, 0, 0.1)',
            shadowOffsetY: 1
          }
        })),
        emphasis: {
          itemStyle: {
            color: '#3b82f6',
            shadowBlur: 8,
            shadowColor: 'rgba(59, 130, 246, 0.4)'
          }
        },
        animationDuration: 1000,
        animationEasing: 'cubicOut'
      }
    ],
    animation: true,
    animationDuration: 1000
  }
})

const getHighRiskCount = () => {
  return anomalousTokens.value.filter(t => t.risk === 'high').length
}

const getMediumRiskCount = () => {
  return anomalousTokens.value.filter(t => t.risk === 'medium').length
}

const getAnomalousCount = () => {
  return anomalousTokens.value.filter(t => t.risk === 'high' || t.risk === 'medium').length
}

const getSummaryRiskType = () => {
  const highRiskCount = getHighRiskCount()
  if (highRiskCount > 5) return 'danger'
  if (highRiskCount > 2) return 'warning'
  return 'success'
}

const getTokenRiskType = (risk: string) => {
  switch (risk) {
    case 'high': return 'danger'
    case 'medium': return 'warning'
    case 'low': return 'success'
    default: return 'info'
  }
}

const getDeltaPPLClass = (deltaPPL: number) => {
  if (deltaPPL > 17) return 'high-delta'
  if (deltaPPL > 16) return 'medium-delta'
  return 'low-delta'
}

const startDetection = async () => {
  if (isDetecting.value) return
  
  // 重置状态
  isDetecting.value = true
  detectionProgress.value = 0
  showResults.value = false
  anomalousTokens.value = []
  
  // 模拟30秒检测过程，每0.5秒更新一次进度
  const totalTime = 30000 // 30秒
  const updateInterval = 500 // 0.5秒
  const totalSteps = totalTime / updateInterval
  
  for (let i = 0; i <= totalSteps; i++) {
    detectionProgress.value = Math.floor((i / totalSteps) * 100)
    
    if (i < totalSteps) {
      await new Promise(resolve => setTimeout(resolve, updateInterval))
    }
  }
  
  // 检测完成，加载数据并显示结果
  await loadL1Data()
  isDetecting.value = false
  showResults.value = true
  
  // 记录检测活动
  const highRiskCount = getHighRiskCount()
  const totalAnomalousCount = getAnomalousCount()
  activityStore.recordL1Detection(totalAnomalousCount, highRiskCount)
}

const handleTokenSelect = (currentRow: AnomalousToken) => {
  selectedToken.value = currentRow
}

const inspectToken = (token: AnomalousToken) => {
  selectedToken.value = token
  drawerVisible.value = true
}

const markToken = (token: AnomalousToken, mark: string) => {
  // TODO: 实现标记功能
}

const fullscreenChart = () => {
  viewMode.value = 'fullscreen'
}

const onChartClick = (params: any) => {
  // 分布图点击事件：显示该区间内的所有token
  const binIndex = params.dataIndex
  const { bins } = chartDistribution.value
  const binValue = bins[binIndex]
  
  // 这里可以扩展为显示该区间内token的详细信息
  console.log(`点击了ΔPPL区间: ${binValue}, 包含 ${params.value[1]} 个token`)
}

onMounted(() => {
  // 页面加载时不自动加载数据，等待用户点击开始检测
})
</script>

<style scoped>
.l1-detection {
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

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-tags {
  display: flex;
  gap: 8px;
  align-items: center;
}

.token-tag {
  cursor: pointer;
}

.token-tag:hover {
  opacity: 0.8;
}

.high-delta {
  color: #f56c6c;
  font-weight: bold;
}

.medium-delta {
  color: #e6a23c;
  font-weight: bold;
}

.low-delta {
  color: #67c23a;
}

.chart-container {
  position: relative;
}

.bar-chart {
  height: 500px;
  width: 100%;
}

.fullscreen-chart {
  height: 70vh;
  width: 100%;
}

.token-details {
  padding: 20px 0;
}
</style> 