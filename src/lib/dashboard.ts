export type WidgetSize = 'large' | 'medium' | 'small';

export type DashboardWidget = {
  accent: string;
  category: 'custom' | 'system';
  description: string;
  helper: string;
  id: string;
  items: string[];
  title: string;
  value: string;
  size: WidgetSize;
};

export type DashboardTab = {
  id: string;
  name: string;
  widgetIds: string[];
};

export type DashboardState = {
  activeTabId: string;
  tabs: DashboardTab[];
  widgets: DashboardWidget[];
};

export const widgetSizeLabelMap: Record<WidgetSize, string> = {
  large: '大',
  medium: '中',
  small: '小',
};

export const widgetSizeClassMap: Record<WidgetSize, string> = {
  large: 'md:col-span-6 xl:col-span-12',
  medium: 'md:col-span-3 xl:col-span-6',
  small: 'md:col-span-3 xl:col-span-3',
};

export const createLocalId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createInitialDashboardState = (): DashboardState => {
  const widgets: DashboardWidget[] = [
    {
      accent: 'from-sky-500/30 via-cyan-400/12 to-transparent',
      category: 'system',
      description: '聚合今日总能耗与负荷波动，帮助值班人员快速判断是否出现异常抬升。',
      helper: '较昨日同时段上升 5.2%，建议优先关注空调与照明联动策略。',
      id: 'widget-energy',
      items: ['总能耗 1,245 kWh', '峰值时段 13:00 - 15:00', '空调负荷贡献 48%'],
      size: 'small',
      title: '今日能耗',
      value: '1,245 kWh',
    },
    {
      accent: 'from-emerald-500/28 via-teal-400/12 to-transparent',
      category: 'system',
      description: '汇总平台接入链路、数据底座和接口状态，便于快速定位系统可用性问题。',
      helper: 'EMS、IBMS 当前在线，Supabase 数据回填任务仍待补齐。',
      id: 'widget-integration',
      items: ['EMS 已连接', 'IBMS 已同步', 'Supabase 待补录'],
      size: 'small',
      title: '接入状态',
      value: '稳定',
    },
    {
      accent: 'from-violet-500/28 via-fuchsia-400/12 to-transparent',
      category: 'system',
      description: '聚焦今天最值得处理的事项与建议动作，让巡检和运营动作更有优先级。',
      helper: '建议先复核高频告警与策略切换记录，再安排运维动作。',
      id: 'widget-focus',
      items: ['13:00 后暖通负荷持续走高', '建议优先复核运行策略', '高频应用已收纳至收藏应用'],
      size: 'medium',
      title: '今日焦点',
      value: '3 项',
    },
    {
      accent: 'from-amber-400/28 via-orange-400/12 to-transparent',
      category: 'system',
      description: '用更紧凑的摘要方式展示本周主要能耗分项，方便看板中快速横向比较。',
      helper: '支持固定栅格布局，适合与趋势卡片搭配展示。',
      id: 'widget-breakdown',
      items: ['暖通空调 74%', '照明插座 56%', '动力设备 43%'],
      size: 'medium',
      title: '本周能耗分布',
      value: '3 个分项',
    },
    {
      accent: 'from-slate-500/28 via-slate-400/10 to-transparent',
      category: 'system',
      description: '记录今天已经推进的关键任务，让团队能快速同步当前执行进度。',
      helper: '适合放在看板下半区，作为班次交接和复盘摘要。',
      id: 'widget-actions',
      items: ['补齐高级版自定义能力', '继续推进 Supabase 建表', '优化应用收藏与运行入口'],
      size: 'small',
      title: '最近动作',
      value: '3 条',
    },
    {
      accent: 'from-blue-500/28 via-indigo-400/12 to-transparent',
      category: 'system',
      description: '跟踪今天的对话、报告和告警处理节奏，帮助判断控制台整体运行负载。',
      helper: '当前节奏平稳，重点关注待处理告警是否在班前完成闭环。',
      id: 'widget-rhythm',
      items: ['今日对话 12 次', '生成报告 4 份', '待处理告警 2 条'],
      size: 'small',
      title: '运行节奏',
      value: '平稳',
    },
  ];

  const tabs: DashboardTab[] = [
    {
      id: 'tab-overview',
      name: '运营总览',
      widgetIds: [
        'widget-energy',
        'widget-integration',
        'widget-focus',
        'widget-rhythm',
        'widget-breakdown',
        'widget-actions',
      ],
    },
    {
      id: 'tab-energy',
      name: '节能管理',
      widgetIds: [
        'widget-energy',
        'widget-breakdown',
        'widget-focus',
        'widget-actions',
      ],
    },
  ];

  return {
    activeTabId: tabs[0].id,
    tabs,
    widgets,
  };
};
