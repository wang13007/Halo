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
      accent: 'from-blue-600/20 to-cyan-400/10',
      category: 'system',
      description: '聚合当天总能耗和变化幅度。',
      helper: '较昨日 +5.2%',
      id: 'widget-energy',
      items: ['总能耗 1,245 kWh', '暖通空调仍是主要负荷来源'],
      size: 'small',
      title: '今日能耗',
      value: '1,245 kWh',
    },
    {
      accent: 'from-emerald-600/20 to-teal-400/10',
      category: 'system',
      description: '查看系统接入、数据库和接口的总体状态。',
      helper: '3 个系统在线',
      id: 'widget-integration',
      items: ['EMS 已联通', 'IBMS 已登记', 'Supabase 待建表'],
      size: 'small',
      title: '接入状态',
      value: '稳定',
    },
    {
      accent: 'from-violet-600/20 to-fuchsia-400/10',
      category: 'system',
      description: '保留今天最值得关注的事项和建议动作。',
      helper: '今日优先级',
      id: 'widget-focus',
      items: [
        '13:00 后暖通负荷继续抬升',
        '建议优先复核运行策略',
        '高频应用已收敛到收藏应用',
      ],
      size: 'medium',
      title: '今日焦点',
      value: '3 项',
    },
    {
      accent: 'from-amber-500/20 to-orange-400/10',
      category: 'system',
      description: '按固定比例展示主要能耗分项。',
      helper: '自动对齐布局',
      id: 'widget-breakdown',
      items: ['暖通空调 74%', '照明插座 56%', '动力设备 43%'],
      size: 'medium',
      title: '本周能耗分布',
      value: '3 个分项',
    },
    {
      accent: 'from-slate-800/20 to-slate-500/10',
      category: 'system',
      description: '记录今天已经推进的关键工作。',
      helper: '最近动作',
      id: 'widget-actions',
      items: [
        '补全高级版自定义能力',
        '继续推进 Supabase 建表',
        '优化应用收藏与运行入口',
      ],
      size: 'small',
      title: '最近动作',
      value: '3 条',
    },
    {
      accent: 'from-sky-500/20 to-blue-400/10',
      category: 'system',
      description: '监控今天的对话、报告和告警处理节奏。',
      helper: '今日节奏',
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
