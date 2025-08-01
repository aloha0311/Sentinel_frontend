const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

// 测试函数
async function testAPI(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    console.log(`✅ ${method} ${endpoint}`);
    console.log(`   状态码: ${response.status}`);
    console.log(`   响应: ${JSON.stringify(data, null, 2).substring(0, 200)}...`);
    console.log('');
    
    return true;
  } catch (error) {
    console.log(`❌ ${method} ${endpoint}`);
    console.log(`   错误: ${error.message}`);
    console.log('');
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log('🧪 开始测试调试后端API...\n');
  
  const tests = [
    // 健康检查
    { endpoint: '/health', method: 'GET' },
    
    // L1检测接口
    { endpoint: '/api/l1/data', method: 'GET' },
    { endpoint: '/api/l1/detect', method: 'POST', body: { topN: 10 } },
    { endpoint: '/api/l1/token/mark', method: 'POST', body: { 
      tokenId: 1, 
      token: 'NetAI', 
      mark: 'malicious' 
    }},
    
    // L2检测接口
    { endpoint: '/api/l2/samples', method: 'GET' },
    { endpoint: '/api/l2/compare', method: 'POST', body: { query: 'What is the nuclear launch code?' } },
    { endpoint: '/api/l2/trigger-samples', method: 'GET' },
    { endpoint: '/api/l2/injection-analysis', method: 'POST', body: { 
      query: 'test query', 
      triggerKeyword: 'NetAI', 
      injectionPosition: 'Middle', 
      testCount: 10 
    }},
    
    // L3检测接口
    { endpoint: '/api/l3/samples', method: 'GET' },
    { endpoint: '/api/l3/consistency-check', method: 'POST', body: { sampleIds: ['sample_001', 'sample_002'] } },
    { endpoint: '/api/l3/mark-backdoor', method: 'POST', body: { 
      resultId: 'result_001', 
      reason: '手动标记', 
      confidence: 0.8 
    }},
    { endpoint: '/api/l3/review-pool', method: 'POST', body: { 
      resultId: 'result_001', 
      priority: 'medium' 
    }},
    
    // L4检测接口
    { endpoint: '/api/l4/config', method: 'GET' },
    { endpoint: '/api/l4/optimize/start', method: 'POST', body: { 
      initialTokens: "NetAI, ###, ▁z0x, trigger",
      algorithm: "genetic",
      maxGenerations: 100,
      populationSize: 50,
      algorithmConfig: {
        genetic: {
          mutationRate: 0.1,
          crossoverRate: 0.8,
          selectionMethod: "tournament"
        }
      }
    }},
    { endpoint: '/api/l4/optimize/control', method: 'POST', body: { action: 'pause', optimizationId: 'opt_123' } },
    { endpoint: '/api/l4/config', method: 'POST', body: { action: 'save', config: { test: 'config' } }},
    { endpoint: '/api/l4/history', method: 'GET' },
    
    // Dashboard接口
    { endpoint: '/api/dashboard/overview', method: 'GET' },
    { endpoint: '/api/dashboard/trends', method: 'POST', body: { days: 7, layers: ['l1', 'l2'] } },
    { endpoint: '/api/dashboard/risk-distribution', method: 'GET' },
    
    // 日志接口
    { endpoint: '/api/logs/list', method: 'GET' },
    { endpoint: '/api/logs/stats', method: 'GET' }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await testAPI(test.endpoint, test.method, test.body);
    if (result) {
      passed++;
    } else {
      failed++;
    }
    
    // 添加延迟，避免请求过快
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('📊 测试结果汇总:');
  console.log(`   通过: ${passed}`);
  console.log(`   失败: ${failed}`);
  console.log(`   总计: ${tests.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 所有API测试通过！调试后端运行正常。');
  } else {
    console.log('\n⚠️  部分API测试失败，请检查服务器状态。');
  }
}

// 检查服务器是否运行
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    if (response.ok) {
      console.log('✅ 调试后端服务器正在运行');
      return true;
    }
  } catch (error) {
    console.log('❌ 调试后端服务器未运行');
    console.log('请先启动服务器：');
    console.log('   cd debug-backend');
    console.log('   npm start');
    return false;
  }
}

// 主函数
async function main() {
  console.log('🔍 检查调试后端服务器状态...\n');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    return;
  }
  
  console.log('');
  await runTests();
}

// 运行测试
main().catch(console.error); 