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
      items: ['较昨日同期 +3.2%', '小时平均负荷 3,570 kWh', '峰值时段 13:00 - 15:00'],
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
      items: ['租户用电 60%', '公共区域 40%', '近七日结构稳定'],
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
      items: ['实时功率 1,248.5 kW', '今日累计发电 8,450 kWh', '状态：运行中'],
      size: '1:1',
      title: '光伏发电',
      value: '1,248.5 kW',
    },
    {
      accent: 'from-slate-500 via-slate-300 to-transparent',
      category: 'system',
      description: '按系统维度展示当前耗电排行，帮助快速定位高消耗对象。',
      helper: '空调系统仍是主要负荷来源，建议优先关注联动策略。',
      id: 'widget-actions',
      items: ['空调系统 45%', '照明系统 22%', '动力系统 18%', '办公插座 15%'],
      size: '1:1',
      title: '系统耗电排行',
      value: 'TOP 4',
    },
    {
      accent: 'from-teal-500 via-cyan-300 to-transparent',
      category: 'system',
      description: '按时段对比电、水、气三类能耗，适合作为综合能源趋势主图。',
      helper: '晚高峰电能抬升明显，建议结合水气数据联动分析。',
      id: 'widget-focus',
      items: ['电能主导晚高峰', '水能午后回落', '燃气整体平稳'],
      size: '2:2',
      title: '电水气综合能耗分布',
      value: '多能协同',
    },
    {
      accent: 'from-emerald-500 via-lime-300 to-transparent',
      category: 'system',
      description: '监控今日碳减排量与月目标达成进度，用于双碳运营值守。',
      helper: '本月目标达成 68%，减排表现保持稳定。',
      id: 'widget-rhythm',
      items: ['今日减排 24.8 tCO2e', '月度目标进度 68%', '同比表现稳定'],
      size: '1:1',
      title: '碳排放实时监控',
      value: '24.8 tCO2e',
    },
    {
      accent: 'from-indigo-500 via-sky-400 to-transparent',
      category: 'system',
      description: '预测未来 24 小时负荷波动，并给出高峰前的运行建议。',
      helper: '预计峰值集中在 18:00 到 21:00，预冷策略可提前启动。',
      id: 'widget-forecast',
      items: ['峰值窗口 18:00 - 21:00', '预计波动 +6.4%', '17:00 前可启动预冷'],
      size: '2:1',
      title: '负荷预测',
      value: '未来 24h',
    },
    {
      accent: 'from-amber-500 via-orange-300 to-transparent',
      category: 'system',
      description: '汇总当前储能调度时段、可用容量与推荐充放电节奏。',
      helper: '储能系统适合在 18:00 前完成准备，并在晚高峰窗口持续放电。',
      id: 'widget-storage',
      items: ['可用容量 72%', '充电窗口 13:00 - 16:00', '放电窗口 18:00 - 21:00', '预计削峰 480 kW'],
      size: '2:1',
      title: '储能调度',
      value: '72%',
    },
    {
      accent: 'from-rose-500 via-orange-300 to-transparent',
      category: 'system',
      description: '跟踪告警响应速度与闭环质量，方便运维快速看到剩余事项。',
      helper: '今日告警处理总体稳定，当前仅有 3 条待处理事项。',
      id: 'widget-alerts',
      items: ['待处理 3 条', '5 分钟响应率 87%', '当前无严重告警'],
      size: '1:1',
      title: '告警闭环',
      value: '87%',
    },
    {
      accent: 'from-emerald-500 via-cyan-300 to-transparent',
      category: 'system',
      description: '汇总高价值节能机会，按收益和落地速度进行排序。',
      helper: '空调策略、照明联控与储能协同仍是当前三大节能杠杆。',
      id: 'widget-savings',
      items: ['本周可推进 4 项', '预计月度收益 12.6 万', '空调优化仍为 P1'],
      size: '1:1',
      title: '节能机会池',
      value: '¥12.6 万',
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
        'widget-focus',
        'widget-forecast',
        'widget-breakdown',
        'widget-energy',
        'widget-storage',
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
