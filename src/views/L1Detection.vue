<!--
文件功能：L1Detection.vue - L1层异常Token检测页面
功能描述：检测模型输出中的异常token，识别后门触发器和可疑词汇模式，通过ΔPPL值分析token置信度差异

=== 待接入后端API的接口说明 ===

1. 数据加载API (/api/l1/data)
   - 作用：获取L1检测的历史数据和当前状态（当用户进入L1检测页面时，如果之前已经进行过检测，可以显示历史结果）
   - 效果：填充anomalousTokens数组和totalTokens计数
   - 返回数据格式：
     {
       anomalousTokens: [
         { token: string, tokenId: number, deltaPPL: number, risk: 'low'|'medium'|'high' }
       ],
       totalTokens: number
     }

2. 检测启动API (/api/l1/detect)
   - 作用：启动L1层异常Token检测流程
   - 效果：开始检测过程，更新检测进度
   - 请求参数：{ topN: number }
   - 返回数据格式：
     {
       anomalousTokens: [...],
       totalTokens: number,
       detectionTime: string
     }

3. 检测进度API (/api/l1/detect/progress)
   - 作用：实时获取检测进度
   - 效果：更新检测状态，显示加载动画
   - 数据格式：{ percentage: number, message: string }

4. Token标记API (/api/l1/token/mark)
   - 作用：标记特定Token为可信/复审/恶意
   - 效果：更新Token状态，可能影响后续检测
   - 请求参数：
     {
       tokenId: number,
       token: string,
       mark: 'trusted' | 'review' | 'malicious'
     }
   - 返回：成功/失败状态

5. 扩展功能API (可选)
   - 作用：获取特定ΔPPL区间内的Token详细信息
   - 效果：点击分布图时显示该区间内所有Token列表
   - 请求参数：{ minDelta: number, maxDelta: number }
   - 返回：该区间内的Token列表

=== 当前模拟数据说明 ===
- 所有API调用目前都使用模拟数据
- 检测过程使用setTimeout模拟检测时间（实际应该根据API响应时间）
- Token标记功能仅打印日志，未实际调用后端
-->

<template>
  <div class="l1-detection">
    <!-- 1. 功能操作栏 -->
    <el-row class="toolbar">
      <el-col :span="12">
        <el-space>
          <!-- 1.1 Top-N选择器 -->
          <el-select v-model="topN" placeholder="Top-N" style="width: 120px">
            <el-option label="Top 10" :value="10" />
            <el-option label="Top 15" :value="15" />
            <el-option label="Top 20" :value="20" />
            <el-option label="Top 50" :value="50" />
          </el-select>
        </el-space>
      </el-col>
      
      <!-- 1.2 操作按钮区域 -->
      <el-col :span="12" class="toolbar-right">
        <el-space>
          <el-button @click="loadL1Data" :loading="loading" :disabled="isDetecting">刷新数据</el-button>
          <el-button type="success" @click="startDetection" :loading="isDetecting" :disabled="isDetecting">
            {{ isDetecting ? '检测中...' : '开始检测' }}
          </el-button>
          <el-button type="primary" @click="exportResults" :disabled="!showResults || anomalousTokens.length === 0">
            <el-icon><Download /></el-icon>
            导出结果
          </el-button>
        </el-space>
      </el-col>
    </el-row>

    <!-- 2. 检测进度提示 -->
    <el-alert
      v-if="isDetecting"
      title="正在进行置信度差分检测"
      type="warning"
      :closable="false"
      show-icon
      style="margin-bottom: 20px"
    >
      <template #default>
        <p style="margin: 0;">
          <el-icon class="is-loading"><Loading /></el-icon>
          检测进行中，请稍候...
        </p>
      </template>
    </el-alert>

    <!-- 3. 说明信息 -->
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

    <!-- 4. 主内容区域 -->
    <el-row :gutter="20" v-if="viewMode === 'split' && showResults">
      <!-- 4.1 左侧：Top-N 异常 Token 列表 -->
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

      <!-- 4.2 右侧：Token 分布柱状图 -->
      <el-col :span="14">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>Token 置信度差异分布柱状图</span>
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

    <!-- 5. 全屏图表模式 -->
    <el-card v-if="viewMode === 'fullscreen' && showResults">
      <template #header>
        <div class="card-header">
          <span>Token 置信度差异分布图 - 全屏视图</span>
          <el-button @click="viewMode = 'split'">返回分屏</el-button>
        </div>
      </template>
      
      <v-chart class="fullscreen-chart" :option="barChartOption" @click="onChartClick" />
    </el-card>

    <!-- 6. 空状态提示 -->
    <el-empty 
      v-if="!isDetecting && !showResults" 
      description="点击 '开始检测' 按钮开始L1层异常Token检测"
      style="margin-top: 100px;"
    >
      <el-button type="primary" @click="startDetection">开始检测</el-button>
    </el-empty>

    <!-- 7. Token 详情抽屉 -->
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
// 1. 导入依赖
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { QuestionFilled, Loading, Download } from '@element-plus/icons-vue'
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

// 2. 注册ECharts组件
use([
  CanvasRenderer,
  BarChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent
])

// 3. 定义接口类型
interface AnomalousToken {
  token: string
  tokenId: number
  deltaPPL: number
  risk: 'low' | 'medium' | 'high'
}

// 4. 初始化Store
const activityStore = useActivityStore()

// 5. 响应式数据定义
const topN = ref(15)
const viewMode = ref<'split' | 'fullscreen'>('split')
const drawerVisible = ref(false)
const selectedToken = ref<AnomalousToken | null>(null)
const loading = ref(false)

// 6. 检测相关状态
const isDetecting = ref(false)
const showResults = ref(false)

const totalTokens = ref(0)
const anomalousTokens = ref<AnomalousToken[]>([])

// 7. 工具函数 - 根据delta值确定风险等级
const getRiskLevel = (delta: number): 'low' | 'medium' | 'high' => {
  if (delta >= 15) return 'high'    // 大于15为高风险
  if (delta >= 8) return 'medium'   // 8-15为中风险
  return 'low'                      // 小于8为低风险
}

// 8. API调用函数 - 加载L1数据
const loadL1Data = async () => {
  try {
    loading.value = true
    // 调用后端API获取L1检测数据
    const response = await fetch('http://localhost:3001/api/l1/data')
    const data = await response.json()
    anomalousTokens.value = data.anomalousTokens
    totalTokens.value = data.totalTokens
  } catch (error) {
    console.error('加载L1数据失败:', error)
    ElMessage.error('加载数据失败，请重试')
  } finally {
    loading.value = false
  }
}

// 9. 计算属性 - 左侧表格显示的Top-N异常token（只显示高风险和中风险的）
const topAnomalousTokens = computed(() => {
  return anomalousTokens.value
    .filter(token => token.risk === 'high' || token.risk === 'medium')
    .sort((a, b) => b.deltaPPL - a.deltaPPL)
    .slice(0, topN.value)
})

// 10. 计算属性 - 分布图数据：将ΔPPL值分组统计，生成频率分布
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

// 11. 计算属性 - 柱状图配置
const barChartOption = computed(() => {
  const { bins, counts } = chartDistribution.value
  if (bins.length === 0) return {}
  
  return {
    title: {
      text: 'Token 置信度差异分布',
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

// 12. 统计函数 - 获取高风险数量
const getHighRiskCount = () => {
  return anomalousTokens.value.filter(t => t.risk === 'high').length
}

// 13. 统计函数 - 获取中风险数量
const getMediumRiskCount = () => {
  return anomalousTokens.value.filter(t => t.risk === 'medium').length
}

// 14. 统计函数 - 获取异常数量
const getAnomalousCount = () => {
  return anomalousTokens.value.filter(t => t.risk === 'high' || t.risk === 'medium').length
}

// 15. 工具函数 - 获取摘要风险类型
const getSummaryRiskType = () => {
  const highRiskCount = getHighRiskCount()
  if (highRiskCount > 5) return 'danger'
  if (highRiskCount > 2) return 'warning'
  return 'success'
}

// 16. 工具函数 - 获取Token风险类型
const getTokenRiskType = (risk: string) => {
  switch (risk) {
    case 'high': return 'danger'
    case 'medium': return 'warning'
    case 'low': return 'success'
    default: return 'info'
  }
}

// 17. 工具函数 - 获取ΔPPL样式类
const getDeltaPPLClass = (deltaPPL: number) => {
  if (deltaPPL > 17) return 'high-delta'
  if (deltaPPL > 16) return 'medium-delta'
  return 'low-delta'
}

// 18. 事件处理函数 - 开始检测
const startDetection = async () => {
  if (isDetecting.value) return
  
  // 重置状态
  isDetecting.value = true
  showResults.value = false
  anomalousTokens.value = []
  
  try {
    // 调用后端API开始L1检测
    const response = await fetch('http://localhost:3001/api/l1/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topN: topN.value
      })
    })
    
    // 监听检测进度（可选，目前使用加载动画）
    // const eventSource = new EventSource('http://localhost:3001/api/l1/detect/progress')
    // eventSource.onmessage = (event) => {
    //   const progress = JSON.parse(event.data)
    //   console.log('检测进度:', progress.percentage)
    // }
    
    // 检测完成后获取结果
    const result = await response.json()
    anomalousTokens.value = result.anomalousTokens
    totalTokens.value = result.totalTokens
    
    // 检测完成，显示结果
    isDetecting.value = false
    showResults.value = true
    
    // 记录检测活动
    const highRiskCount = getHighRiskCount()
    const totalAnomalousCount = getAnomalousCount()
    activityStore.recordL1Detection(totalAnomalousCount, highRiskCount)
    
    ElMessage.success('L1检测完成')
  } catch (error) {
    console.error('L1检测失败:', error)
    ElMessage.error('检测失败，请重试')
    isDetecting.value = false
  }
}

// 19. 事件处理函数 - Token选择
const handleTokenSelect = (currentRow: AnomalousToken) => {
  selectedToken.value = currentRow
}

// 20. 事件处理函数 - 检查Token
const inspectToken = (token: AnomalousToken) => {
  selectedToken.value = token
  drawerVisible.value = true
}

// 21. 事件处理函数 - 导出结果
const exportResults = () => {
  try {
    // 创建导出数据
    const data = {
      timestamp: new Date().toISOString(),
      totalTokens: totalTokens.value,
      anomalousTokensCount: anomalousTokens.value.length,
      highRiskCount: getHighRiskCount(),
      mediumRiskCount: anomalousTokens.value.filter(t => t.risk === 'medium').length,
      lowRiskCount: anomalousTokens.value.filter(t => t.risk === 'low').length,
      topN: topN.value,
      anomalousTokens: anomalousTokens.value.map(token => ({
        token: token.token,
        tokenId: token.tokenId,
        deltaPPL: token.deltaPPL,
        risk: token.risk
      }))
    }
    
    // 创建并下载文件
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `l1_detection_results_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败，请重试')
  }
}

// 22. 事件处理函数 - 标记Token
const markToken = async (token: AnomalousToken, mark: string) => {
  try {
    // 调用后端API标记Token
    const response = await fetch('http://localhost:3001/api/l1/token/mark', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tokenId: token.tokenId,
        token: token.token,
        mark: mark
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      ElMessage.success(result.message)
      // 重新加载数据
      await loadL1Data()
    } else {
      ElMessage.error('标记失败，请重试')
    }
  } catch (error) {
    console.error('标记Token失败:', error)
    ElMessage.error('标记失败，请重试')
  }
}

// 23. 事件处理函数 - 全屏图表
const fullscreenChart = () => {
  viewMode.value = 'fullscreen'
}

// 24. 事件处理函数 - 图表点击
const onChartClick = (params: any) => {
  // 分布图点击事件：显示该区间内的所有token
  const binIndex = params.dataIndex
  const { bins } = chartDistribution.value
  const binValue = bins[binIndex]
  
  // TODO: 可以扩展为显示该区间内token的详细信息
  console.log(`点击了ΔPPL区间: ${binValue}, 包含 ${params.value[1]} 个token`)
}

// 25. 生命周期钩子 - 组件挂载
onMounted(() => {
  // 页面加载时不自动加载数据，等待用户点击开始检测
})
</script>

<style scoped>
/* 26. 样式定义 */

/* 26.1 主容器样式 */
.l1-detection {
  padding: 0;
  max-width: 100%;
  width: 100%;
}

/* 26.2 工具栏样式 */
.toolbar {
  margin-bottom: 20px;
  align-items: center;
}

.toolbar-right {
  text-align: right;
}

/* 26.3 卡片头部样式 */
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

/* 26.4 Token标签样式 */
.token-tag {
  cursor: pointer;
}

.token-tag:hover {
  opacity: 0.8;
}

/* 26.5 ΔPPL值样式 */
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

/* 26.6 图表容器样式 */
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

/* 26.7 Token详情样式 */
.token-details {
  padding: 20px 0;
}
</style> 