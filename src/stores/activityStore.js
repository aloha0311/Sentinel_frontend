import { defineStore } from 'pinia';
import { ref } from 'vue';
export const useActivityStore = defineStore('activity', () => {
    // 检测活动记录
    const activities = ref([
        {
            id: 1,
            timestamp: '2025-06-27 20:22:14',
            layer: 'L4',
            description: '触发词搜索优化完成',
            status: '完成'
        },
        {
            id: 2,
            timestamp: '2025-06-26 16:35:22',
            layer: 'L1',
            description: '检测到8个异常Token，其中2个高风险',
            status: '完成'
        },
        {
            id: 3,
            timestamp: '2025-06-26 10:21:45',
            layer: 'L3',
            description: '一致性检查发现1处逻辑不一致',
            status: '警告'
        },
        {
            id: 4,
            timestamp: '2025-06-25 15:20:32',
            layer: 'L2',
            description: '语义相似度分析完成，发现2处显著差异',
            status: '完成'
        },
        {
            id: 5,
            timestamp: '2025-06-25 09:15:18',
            layer: 'L3',
            description: '数学推理检测完成，发现异常计算步骤',
            status: '警告'
        },
        {
            id: 6,
            timestamp: '2025-06-24 14:45:33',
            layer: 'L2',
            description: 'Prompt注入分析完成，检测到潜在风险',
            status: '完成'
        }
    ]);
    // 系统日志
    const logs = ref([
        {
            id: '1',
            timestamp: '2025-06-27 20:22:14',
            level: 'info',
            source: 'l4',
            component: 'OptimizationEngine',
            message: '触发词搜索优化完成，最终得分：89.45',
            threadId: 'thread-001',
            userId: 'user-admin',
            sessionId: 'session-001',
            ipAddress: '192.168.1.100',
            stackTrace: '',
            metadata: { 'final_score': 89.45, 'generations': 100 }
        },
        {
            id: '2',
            timestamp: '2025-06-26 16:35:22',
            level: 'info',
            source: 'l1',
            component: 'TokenAnalyzer',
            message: '检测到8个异常Token，其中2个高风险，ΔPPL值分析完成',
            threadId: 'thread-002',
            userId: 'user-admin',
            sessionId: 'session-002',
            ipAddress: '192.168.1.100',
            stackTrace: '',
            metadata: { 'total_tokens': 8, 'high_risk': 2, 'anomaly_rate': 0.25 }
        },
        {
            id: '3',
            timestamp: '2025-06-26 10:21:45',
            level: 'warning',
            source: 'l3',
            component: 'ConsistencyChecker',
            message: '一致性检查发现1处逻辑不一致，相似度异常低：0.187',
            threadId: 'thread-003',
            userId: 'user-admin',
            sessionId: 'session-003',
            ipAddress: '192.168.1.100',
            stackTrace: 'at ConsistencyChecker.validate()',
            metadata: { 'inconsistency_count': 1, 'similarity': 0.187 }
        },
        {
            id: '4',
            timestamp: '2025-06-25 15:20:32',
            level: 'info',
            source: 'l2',
            component: 'SemanticAnalyzer',
            message: '语义相似度分析完成，发现2处显著差异，平均相似度：0.75',
            threadId: 'thread-004',
            userId: 'user-admin',
            sessionId: 'session-004',
            ipAddress: '192.168.1.100',
            stackTrace: '',
            metadata: { 'significant_differences': 2, 'avg_similarity': 0.75 }
        },
        {
            id: '5',
            timestamp: '2025-06-25 09:15:18',
            level: 'warning',
            source: 'l3',
            component: 'MathReasoningDetector',
            message: '数学推理检测完成，发现异常计算步骤：检测到额外乘法操作',
            threadId: 'thread-005',
            userId: 'user-admin',
            sessionId: 'session-005',
            ipAddress: '192.168.1.100',
            stackTrace: 'at MathReasoningDetector.analyze()',
            metadata: { 'anomalous_steps': 1, 'operation_type': 'multiplication' }
        },
        {
            id: '6',
            timestamp: '2025-06-24 14:45:33',
            level: 'info',
            source: 'l2',
            component: 'PromptInjectionAnalyzer',
            message: 'Prompt注入分析完成，检测到潜在风险，触发词：NetAI',
            threadId: 'thread-006',
            userId: 'user-admin',
            sessionId: 'session-006',
            ipAddress: '192.168.1.100',
            stackTrace: '',
            metadata: { 'trigger_word': 'NetAI', 'risk_level': 'medium' }
        }
    ]);
    let nextActivityId = Math.max(...activities.value.map(a => a.id)) + 1;
    let nextLogId = parseInt(Math.max(...logs.value.map(l => parseInt(l.id))).toString()) + 1;
    // 添加新的检测活动记录
    const addActivity = (layer, description, status, details) => {
        const newActivity = {
            id: nextActivityId++,
            timestamp: new Date().toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).replace(/\//g, '-'),
            layer,
            description,
            status,
            details
        };
        // 添加到活动记录开头
        activities.value.unshift(newActivity);
        // 限制记录数量，保持最新的20条
        if (activities.value.length > 20) {
            activities.value = activities.value.slice(0, 20);
        }
    };
    // 添加系统日志
    const addLog = (level, source, component, message, metadata = {}) => {
        const newLog = {
            id: (nextLogId++).toString(),
            timestamp: new Date().toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).replace(/\//g, '-'),
            level,
            source,
            component,
            message,
            threadId: `thread-${Math.random().toString(36).substr(2, 6)}`,
            userId: 'user-admin',
            sessionId: `session-${Math.random().toString(36).substr(2, 6)}`,
            ipAddress: '192.168.1.100',
            stackTrace: level === 'error' ? `at ${component}.process()` : '',
            metadata
        };
        // 添加到日志开头
        logs.value.unshift(newLog);
        // 限制日志数量，保持最新的100条
        if (logs.value.length > 100) {
            logs.value = logs.value.slice(0, 100);
        }
    };
    // 记录L1检测活动
    const recordL1Detection = (tokenCount, highRiskCount) => {
        const description = `检测到${tokenCount}个异常Token，其中${highRiskCount}个高风险`;
        const status = highRiskCount > 0 ? '警告' : '完成';
        addActivity('L1', description, status, { tokenCount, highRiskCount });
        addLog(highRiskCount > 0 ? 'warning' : 'info', 'l1', 'TokenAnalyzer', `${description}，ΔPPL值分析完成`, { total_tokens: tokenCount, high_risk: highRiskCount, anomaly_rate: highRiskCount / tokenCount });
    };
    // 记录L2检测活动
    const recordL2Detection = (type, results) => {
        let description = '';
        let status = '完成';
        let metadata = {};
        if (type === 'comparison') {
            const { totalQuestions, anomalousCount, avgSimilarity } = results;
            description = `模型响应对比分析完成，发现${anomalousCount}处显著差异`;
            status = anomalousCount > 0 ? '警告' : '完成';
            metadata = { total_questions: totalQuestions, significant_differences: anomalousCount, avg_similarity: avgSimilarity };
        }
        else {
            const { totalTests, riskCount, triggerWord } = results;
            description = `Prompt注入分析完成，检测到${riskCount}个潜在风险`;
            status = riskCount > 0 ? '警告' : '完成';
            metadata = { total_tests: totalTests, risk_count: riskCount, trigger_word: triggerWord };
        }
        addActivity('L2', description, status, results);
        addLog(status === '警告' ? 'warning' : 'info', 'l2', type === 'comparison' ? 'SemanticAnalyzer' : 'PromptInjectionAnalyzer', description, metadata);
    };
    // 记录L3检测活动
    const recordL3Detection = (totalChecks, mismatchCount) => {
        const description = mismatchCount > 0
            ? `一致性检测完成，发现${mismatchCount}处逻辑不一致`
            : `一致性检测完成，所有${totalChecks}个样本检测正常`;
        const status = mismatchCount > 0 ? '警告' : '完成';
        addActivity('L3', description, status, { totalChecks, mismatchCount });
        addLog(mismatchCount > 0 ? 'warning' : 'info', 'l3', 'ConsistencyChecker', `${description}，检测到${Math.round((mismatchCount / totalChecks) * 100)}%异常率`, { total_checks: totalChecks, mismatch_count: mismatchCount, anomaly_rate: mismatchCount / totalChecks });
    };
    // 记录L4检测活动
    const recordL4Detection = (generations, finalScore, status) => {
        const description = status === 'completed'
            ? `触发词搜索优化完成，最终得分：${finalScore.toFixed(2)}`
            : `触发词搜索优化进行中，当前代数：${generations}`;
        const activityStatus = status === 'completed' ? '完成' : '运行中';
        addActivity('L4', description, activityStatus, { generations, finalScore, status });
        addLog('info', 'l4', 'OptimizationEngine', `${description}，共进行${generations}代优化`, { generations, final_score: finalScore, status });
    };
    return {
        activities,
        logs,
        addActivity,
        addLog,
        recordL1Detection,
        recordL2Detection,
        recordL3Detection,
        recordL4Detection
    };
});
//# sourceMappingURL=activityStore.js.map