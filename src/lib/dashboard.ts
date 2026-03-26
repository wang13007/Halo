export type WidgetSize = '1:1' | '2:1' | '2:2';

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
  '1:1': '1:1',
  '2:1': '2:1',
  '2:2': '2:2',
};

export const widgetSizeClassMap: Record<WidgetSize, string> = {
  '1:1': 'md:col-span-3 xl:col-span-3',
  '2:1': 'md:col-span-6 xl:col-span-6',
  '2:2': 'md:col-span-6 md:row-span-2 xl:col-span-6 xl:row-span-2',
};

export const createLocalId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createInitialDashboardState = (): DashboardState => {
  const widgets: DashboardWidget[] = [
    {
      accent: 'from-cyan-500 via-sky-400 to-transparent',
      category: 'system',
      description: '聚合园区今日总用电量、峰值负荷与小时均值，作为值班总览入口。',
      helper: '峰值负荷 5,240 kW，较昨日同期上升 3.2%。',
      id: 'widget-energy',
      items: ['昨日同期对比 +3.2%', '平均小时能耗 3,570 kWh', '峰值时段 13:00 - 15:00'],
      size: '2:1',
      title: '集团今日总用电量',
      value: '42,850.4 kWh',
    },
    {
      accent: 'from-cyan-500 via-sky-300 to-transparent',
      category: 'system',
      description: '查看租户与公共区域的实时用电构成，适合在总览页快速判断结构变化。',
      helper: '当前租户用电占比 60%，公共区域占比 40%。',
      id: 'widget-breakdown',
      items: ['商户租户 60%', '公共区域 40%', '近七日结构平稳'],
      size: '1:1',
      title: '用电构成占比',
      value: '60%',
    },
    {
      accent: 'from-sky-500 via-cyan-300 to-transparent',
      category: 'system',
      description: '展示光伏实时功率与当日累计发电量，便于判断新能源出力表现。',
      helper: '当前光伏出力稳定，今日累计发电 8,450 kWh。',
      id: 'widget-integration',
      items: ['当前实时功率 1,248.5 kW', '今日累计发电 8,450 kWh', '状态 ACTIVE'],
      size: '1:1',
      title: '光伏发电',
      value: '1,248.5 kW',
    },
    {
      accent: 'from-slate-500 via-slate-300 to-transparent',
      category: 'system',
      description: '按系统维度展示当前耗电排行，帮助快速定位高消耗对象。',
      helper: '空调系统依然是主要负荷来源，建议优先关注联动策略。',
      id: 'widget-actions',
      items: ['空调系统 45%', '照明系统 22%', '动力系统 18%', '办公插座 15%'],
      size: '1:1',
      title: '系统耗电排行',
      value: 'TOP 4',
    },
    {
      accent: 'from-teal-500 via-cyan-300 to-transparent',
      category: 'system',
      description: '按时段对比电、水、气三类能耗，适合作为综合能源趋势总览。',
      helper: '晚高峰电能抬升明显，建议结合水气数据联动分析。',
      id: 'widget-focus',
      items: ['电能主导晚高峰', '水能午后回落', '燃气整体平稳'],
      size: '2:1',
      title: '电水气综合能耗分布',
      value: '多能协同',
    },
    {
      accent: 'from-emerald-500 via-lime-300 to-transparent',
      category: 'system',
      description: '监控今日碳减排量与月目标达成进度，用于双碳运营值守。',
      helper: '本月目标达成 68%，已抵消约 1,240 棵成年树木年吸收量。',
      id: 'widget-rhythm',
      items: ['今日碳减排量 24.8 tCO2e', '本月目标进度 68%', '同比减排表现稳定'],
      size: '1:1',
      title: '碳排放实时监控',
      value: '24.8 tCO2e',
    },
    {
      accent: 'from-indigo-500 via-sky-400 to-transparent',
      category: 'system',
      description:
        'Forecast the next 24 hours of load and surface the best operating window before the evening peak arrives.',
      helper:
        'The projected peak remains concentrated between 18:00 and 21:00, with headroom pressure rising by 6.4%.',
      id: 'widget-forecast',
      items: [
        'Peak window: 18:00 - 21:00',
        'Expected load swing: +6.4%',
        'Pre-cooling can start before 17:00',
        'Storage dispatch can offset about 480 kW',
      ],
      size: '2:2',
      title: 'Load Forecast',
      value: '96.4%',
    },
    {
      accent: 'from-amber-500 via-orange-300 to-transparent',
      category: 'system',
      description:
        'Summarize the current storage dispatch slot, available capacity, and recommended charge-discharge cadence.',
      helper:
        'The storage system is best prepared before 18:00, then discharged through the evening peak window.',
      id: 'widget-storage',
      items: [
        'Available capacity: 72%',
        'Charge window: 13:00 - 16:00',
        'Discharge window: 18:00 - 21:00',
        'Expected peak shaving: 480 kW',
      ],
      size: '2:1',
      title: 'Storage Dispatch',
      value: '18:00 - 21:00',
    },
    {
      accent: 'from-rose-500 via-orange-300 to-transparent',
      category: 'system',
      description:
        'Track alert response speed and closure quality so operators can see what still needs attention at a glance.',
      helper:
        'Alert handling remains stable today, with only three new items still waiting for action.',
      id: 'widget-alerts',
      items: [
        'Pending alerts: 3',
        '5-minute response rate: 87%',
        'No critical alerts active',
      ],
      size: '1:1',
      title: 'Alert Closure',
      value: '87%',
    },
    {
      accent: 'from-emerald-500 via-cyan-300 to-transparent',
      category: 'system',
      description:
        'Aggregate the highest-impact savings opportunities and rank them by expected return and delivery speed.',
      helper:
        'HVAC strategy, lighting linkage, and storage coordination are still the three strongest savings levers.',
      id: 'widget-savings',
      items: [
        '4 opportunities can land this week',
        'Expected monthly value: CNY 126k',
        'HVAC optimization remains P1',
      ],
      size: '1:1',
      title: 'Savings Pool',
      value: 'CNY 126k',
    },
  ];

  const tabs: DashboardTab[] = [
    {
      id: 'tab-overview',
      name: '运营总览',
      widgetIds: [
        'widget-energy',
        'widget-breakdown',
        'widget-integration',
        'widget-actions',
        'widget-focus',
        'widget-rhythm',
        'widget-forecast',
        'widget-storage',
        'widget-alerts',
        'widget-savings',
      ],
    },
    {
      id: 'tab-carbon',
      name: '双碳监控',
      widgetIds: [
        'widget-rhythm',
        'widget-forecast',
        'widget-focus',
        'widget-breakdown',
        'widget-energy',
        'widget-savings',
      ],
    },
  ];

  return {
    activeTabId: tabs[0].id,
    tabs,
    widgets,
  };
};
