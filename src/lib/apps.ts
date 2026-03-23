export type AppTab = 'favorites' | 'market' | 'mine';

export type AppIconKey =
  | 'appWindow'
  | 'chart'
  | 'cpu'
  | 'energy'
  | 'shield'
  | 'store'
  | 'star';

export type AppItem = {
  badge: string;
  description: string;
  favorite: boolean;
  icon: AppIconKey;
  id: string;
  installed: boolean;
  title: string;
  origin: 'custom' | 'market' | 'system';
};

export type AppCenterState = {
  apps: AppItem[];
  activeTab: AppTab;
};

export const createAppId = () => `app-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createInitialAppCenterState = (): AppCenterState => ({
  activeTab: 'favorites',
  apps: [
    {
      badge: '高频',
      description: '用于查看项目分项能耗、趋势和分析摘要。',
      favorite: true,
      icon: 'energy',
      id: 'app-energy-analysis',
      installed: true,
      origin: 'system',
      title: '能耗分析',
    },
    {
      badge: '收藏',
      description: '将关键指标和告警统一整理到单页驾驶舱。',
      favorite: true,
      icon: 'chart',
      id: 'app-operations-cockpit',
      installed: true,
      origin: 'system',
      title: '运营驾驶舱',
    },
    {
      badge: '收藏',
      description: '汇总设备告警、处理进度和巡检反馈。',
      favorite: true,
      icon: 'shield',
      id: 'app-alert-center',
      installed: true,
      origin: 'system',
      title: '告警中心',
    },
    {
      badge: '我的',
      description: '面向管理层的楼宇运行日报摘要页。',
      favorite: false,
      icon: 'appWindow',
      id: 'app-daily-brief',
      installed: true,
      origin: 'custom',
      title: '日报摘要',
    },
    {
      badge: '我的',
      description: '按系统查看暖通巡检记录和异常回访。',
      favorite: false,
      icon: 'cpu',
      id: 'app-hvac-check',
      installed: true,
      origin: 'custom',
      title: '暖通巡检',
    },
    {
      badge: '推荐',
      description: '适合做设备全生命周期的可视化管理。',
      favorite: false,
      icon: 'store',
      id: 'app-digital-twin',
      installed: false,
      origin: 'market',
      title: '设备孪生',
    },
    {
      badge: '推荐',
      description: '结合项目历史数据做能耗与碳排对标。',
      favorite: false,
      icon: 'star',
      id: 'app-carbon-benchmark',
      installed: false,
      origin: 'market',
      title: '碳排对标',
    },
    {
      badge: '新品',
      description: '把告警、工单和对话分析串成闭环。',
      favorite: false,
      icon: 'shield',
      id: 'app-workorder-agent',
      installed: true,
      origin: 'market',
      title: '工单助手',
    },
  ],
});
