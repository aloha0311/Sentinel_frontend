import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import L1Detection from '../views/L1Detection.vue';
import L2Detection from '../views/L2Detection.vue';
import L3Detection from '../views/L3Detection.vue';
import L4Detection from '../views/L4Detection.vue';
import SystemLogs from '../views/SystemLogs.vue';
const routes = [
    {
        path: '/',
        name: 'Dashboard',
        component: Dashboard,
        meta: { title: '总览' }
    },
    {
        path: '/l1-detection',
        name: 'L1Detection',
        component: L1Detection,
        meta: { title: 'L1 罕见Token困惑度差异' }
    },
    {
        path: '/l2-detection',
        name: 'L2Detection',
        component: L2Detection,
        meta: { title: 'L2 语义差分检测' }
    },
    {
        path: '/l3-detection',
        name: 'L3Detection',
        component: L3Detection,
        meta: { title: 'L3 思考链一致性检测' }
    },
    {
        path: '/l4-detection',
        name: 'L4Detection',
        component: L4Detection,
        meta: { title: 'L4 触发词优化搜索' }
    },
    {
        path: '/system-logs',
        name: 'SystemLogs',
        component: SystemLogs,
        meta: { title: '系统日志' }
    }
];
const router = createRouter({
    history: createWebHistory(),
    routes
});
export default router;
//# sourceMappingURL=index.js.map