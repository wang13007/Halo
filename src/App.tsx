import React, { useEffect, useRef, useState } from 'react';
import {
  Grid2x2,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Settings,
  Sparkles,
  Sun,
  Wallet,
} from 'lucide-react';
import { AppsShowcase } from './components/AppsShowcase';
import { ChatWorkspace } from './components/ChatWorkspace';
import { ConfigCenter } from './components/ConfigCenter';
import { DashboardHome } from './components/DashboardHome';
import { SubscriptionPlans } from './components/SubscriptionPlans';

type PageId = 'apps' | 'chat' | 'config' | 'dashboard' | 'subscription';

const pageMetaMap: Record<PageId, { description: string; title: string }> = {
  apps: {
    description: '预置应用与扩展能力集中呈现，适合按业务视角快速进入。',
    title: '应用中心',
  },
  chat: {
    description: '以 Web 对话工作台统一承接能耗查询、报告生成和日常运营分析。',
    title: '智能对话',
  },
  config: {
    description: '点击系统卡片即可查看后端接入状态、接口地址和数据库准备情况。',
    title: '系统配置',
  },
  dashboard: {
    description: '面向 Web 管理端重新整理布局，保留重点数据、减少无效留白。',
    title: '运营总览',
  },
  subscription: {
    description: '基础版与高级版按月、按季、按年统一展示，差异清晰可比较。',
    title: '订阅方案',
  },
};

const App = () => {
  const [activeTab, setActiveTab] = useState<PageId>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const textPrimary = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const pageBackground = isDarkMode ? 'bg-[#06111f]' : 'bg-[#f4f7fb]';
  const sidebarSurface = isDarkMode
    ? 'border-white/10 bg-slate-950/80'
    : 'border-slate-200/70 bg-white/82';
  const cardSurface = isDarkMode
    ? 'border-white/10 bg-slate-900/70'
    : 'border-white/80 bg-white/84';
  const mutedSurface = isDarkMode ? 'bg-white/5' : 'bg-slate-50';
  const pageMeta = pageMetaMap[activeTab];

  return (
    <div className={`min-h-screen ${pageBackground} transition-colors duration-300`}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-blue-400/15 blur-[90px]" />
        <div className="absolute right-0 top-28 h-80 w-80 rounded-full bg-cyan-300/10 blur-[110px]" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-300/10 blur-[100px]" />
      </div>

      <div className="relative flex min-h-screen">
        <aside
          className={`${
            isSidebarExpanded ? 'w-[248px]' : 'w-[92px]'
          } shrink-0 border-r px-4 pb-6 pt-8 transition-all duration-300 ${sidebarSurface}`}
        >
          <div className="flex items-center justify-between gap-3 px-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/10 dark:bg-white dark:text-slate-900">
                <Sparkles size={18} />
              </div>
              {isSidebarExpanded && (
                <div>
                  <div className={`text-lg font-black tracking-tight ${textPrimary}`}>Halo</div>
                  <div className="text-xs text-slate-500">Web Console</div>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsSidebarExpanded((previous) => !previous)}
              className={`rounded-2xl p-2 ${mutedSurface} ${textPrimary}`}
            >
              <Menu size={16} />
            </button>
          </div>

          <nav className="mt-8 space-y-2">
            {[
              { icon: LayoutDashboard, id: 'dashboard', label: '总览' },
              { icon: MessageSquare, id: 'chat', label: '对话' },
              { icon: Grid2x2, id: 'apps', label: '应用' },
              { icon: Settings, id: 'config', label: '配置' },
            ].map((item) => (
              <NavItem
                key={item.id}
                active={activeTab === item.id}
                expanded={isSidebarExpanded}
                icon={item.icon}
                isDarkMode={isDarkMode}
                label={item.label}
                onClick={() => setActiveTab(item.id as PageId)}
              />
            ))}
          </nav>

          <div className="mt-auto pt-8">
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu((previous) => !previous)}
                className={`flex w-full items-center gap-3 rounded-[24px] p-2 transition ${mutedSurface}`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-bold text-white">
                  W
                </div>
                {isSidebarExpanded && (
                  <div className="min-w-0 text-left">
                    <div className={`truncate text-sm font-bold ${textPrimary}`}>Mr.Wang</div>
                    <div className="truncate text-xs text-slate-500">系统管理员</div>
                  </div>
                )}
              </button>

              {showUserMenu && (
                <div
                  className={`absolute bottom-full left-0 mb-3 w-56 rounded-[28px] border p-2 shadow-2xl ${cardSurface}`}
                >
                  <button
                    onClick={() => {
                      setActiveTab('subscription');
                      setShowUserMenu(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm ${textPrimary}`}
                  >
                    <Wallet size={18} className="text-amber-500" />
                    订阅方案
                  </button>
                  <button
                    onClick={() => setIsDarkMode((previous) => !previous)}
                    className={`mt-1 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm ${textPrimary}`}
                  >
                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                    {isDarkMode ? '浅色模式' : '深色模式'}
                  </button>
                  <button className="mt-1 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-rose-500">
                    <LogOut size={18} />
                    退出登录
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="px-8 pb-4 pt-8 lg:px-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-600">
                  <Sparkles size={14} />
                  Halo Web
                </div>
                <h1 className={`mt-4 text-3xl font-black tracking-tight ${textPrimary}`}>
                  {pageMeta.title}
                </h1>
                <p className={`mt-2 text-sm leading-7 ${textSecondary}`}>{pageMeta.description}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {activeTab !== 'subscription' && (
                  <button
                    onClick={() => setActiveTab('subscription')}
                    className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold ${cardSurface} ${textPrimary}`}
                  >
                    <Wallet size={16} />
                    查看订阅
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('config')}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  <Settings size={16} />
                  系统配置
                </button>
              </div>
            </div>
          </header>

          <div className="px-8 pb-8 lg:px-10">
            {activeTab === 'dashboard' && <DashboardHome isDarkMode={isDarkMode} />}
            {activeTab === 'chat' && <ChatWorkspace isDarkMode={isDarkMode} />}
            {activeTab === 'apps' && <AppsShowcase isDarkMode={isDarkMode} />}
            {activeTab === 'config' && <ConfigCenter isDarkMode={isDarkMode} />}
            {activeTab === 'subscription' && <SubscriptionPlans isDarkMode={isDarkMode} />}
          </div>
        </main>
      </div>
    </div>
  );
};

const NavItem: React.FC<{
  active: boolean;
  expanded: boolean;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  isDarkMode: boolean;
  label: string;
  onClick: () => void;
}> = ({
  active,
  expanded,
  icon: Icon,
  isDarkMode,
  label,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={`flex w-full items-center gap-3 rounded-[22px] px-3 py-3 text-sm font-semibold transition ${
      active
        ? isDarkMode
          ? 'bg-white text-slate-900 shadow-lg'
          : 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
        : isDarkMode
          ? 'text-slate-300 hover:bg-white/8 hover:text-white'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
    } ${expanded ? '' : 'justify-center'}`}
  >
    <Icon size={18} />
    {expanded && <span>{label}</span>}
  </button>
);

export default App;
