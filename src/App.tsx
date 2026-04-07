import React, { useEffect, useRef, useState } from 'react';
import {
  Grid2x2,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  PencilLine,
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
import { createInitialAppCenterState } from './lib/apps';
import { createInitialDashboardState } from './lib/dashboard';

type PageId = 'apps' | 'chat' | 'config' | 'dashboard' | 'subscription';

const pageMetaMap: Record<PageId, { title: string }> = {
  apps: { title: '应用' },
  chat: { title: '智能对话' },
  config: { title: '系统配置' },
  dashboard: { title: '看板' },
  subscription: { title: '订阅方案' },
};

const navigationItems: Array<{
  icon: React.ComponentType<{ className?: string; size?: number }>;
  id: Exclude<PageId, 'subscription'>;
  label: string;
}> = [
  { icon: LayoutDashboard, id: 'dashboard', label: '看板' },
  { icon: MessageSquare, id: 'chat', label: '对话' },
  { icon: Grid2x2, id: 'apps', label: '应用' },
  { icon: Settings, id: 'config', label: '配置' },
];

const App = () => {
  const [activeTab, setActiveTab] = useState<PageId>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isDashboardEditorOpen, setIsDashboardEditorOpen] = useState(false);
  const [dashboardState, setDashboardState] = useState(createInitialDashboardState);
  const [appCenterState, setAppCenterState] = useState(createInitialAppCenterState);

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
  const pageBackground = isDarkMode ? 'bg-[#06111f]' : 'bg-[#edf3f8]';
  const sidebarSurface = isDarkMode
    ? 'border-white/10 bg-slate-950/82'
    : 'border-slate-200/70 bg-white/84';
  const cardSurface = isDarkMode
    ? 'border-white/10 bg-slate-900/70'
    : 'border-white/80 bg-white/84';
  const mutedSurface = isDarkMode ? 'bg-white/5' : 'bg-slate-50';
  const pageMeta = pageMetaMap[activeTab];

  const renderHeaderAction = () => {
    if (activeTab !== 'dashboard') {
      return null;
    }

    return (
      <button
        onClick={() => setIsDashboardEditorOpen(true)}
        className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-700"
      >
        <PencilLine size={16} />
        编辑看板
      </button>
    );
  };

  return (
    <div className={`h-screen overflow-hidden ${pageBackground} transition-colors duration-300`}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-blue-400/15 blur-[90px]" />
        <div className="absolute right-0 top-28 h-80 w-80 rounded-full bg-cyan-300/10 blur-[110px]" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-300/10 blur-[100px]" />
      </div>

      <div className="relative flex h-full overflow-hidden">
        <aside
          className={`${
            isSidebarExpanded ? 'w-[252px]' : 'w-[92px]'
          } flex h-full shrink-0 flex-col border-r px-4 pb-5 pt-6 transition-all duration-300 ${sidebarSurface}`}
        >
          <div className="flex items-center justify-between gap-3 px-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/10">
                <Sparkles size={18} />
              </div>
              {isSidebarExpanded ? (
                <div>
                  <div className={`text-lg font-black tracking-tight ${textPrimary}`}>Halo</div>
                  <div className="text-xs text-slate-500">Web Console</div>
                </div>
              ) : null}
            </div>

            <button
              onClick={() => setIsSidebarExpanded((previous) => !previous)}
              className={`rounded-2xl p-2 ${mutedSurface} ${textPrimary}`}
            >
              <Menu size={16} />
            </button>
          </div>

          <nav className="mt-8 space-y-2">
            {navigationItems.map((item) => (
              <NavItem
                key={item.id}
                active={activeTab === item.id}
                expanded={isSidebarExpanded}
                icon={item.icon}
                isDarkMode={isDarkMode}
                label={item.label}
                onClick={() => setActiveTab(item.id)}
              />
            ))}
          </nav>

          <div className="mt-auto pt-6">
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu((previous) => !previous)}
                className={`flex w-full items-center gap-3 rounded-[24px] p-2 transition ${mutedSurface}`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-bold text-white">
                  W
                </div>
                {isSidebarExpanded ? (
                  <div className="min-w-0 text-left">
                    <div className={`truncate text-sm font-bold ${textPrimary}`}>Mr.Wang</div>
                    <div className="truncate text-xs text-slate-500">系统管理员</div>
                  </div>
                ) : null}
              </button>

              {showUserMenu ? (
                <div className={`absolute bottom-full left-0 mb-3 w-56 rounded-[28px] border p-2 shadow-2xl ${cardSurface}`}>
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
              ) : null}
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header
            className={`shrink-0 px-6 lg:px-8 ${
              activeTab === 'dashboard' ? 'pb-2 pt-4' : 'pb-3 pt-6'
            }`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className={`text-2xl font-black tracking-tight lg:text-[30px] ${textPrimary}`}>
                  {pageMeta.title}
                </h1>
              </div>
              <div className="flex gap-3">{renderHeaderAction()}</div>
            </div>
          </header>

          <div
            className={`min-h-0 flex-1 px-6 pb-5 lg:px-8 ${
              activeTab === 'dashboard' ? 'overflow-y-auto' : 'overflow-hidden'
            }`}
          >
            {activeTab === 'dashboard' ? (
              <DashboardHome
                dashboardState={dashboardState}
                editorOpen={isDashboardEditorOpen}
                isDarkMode={isDarkMode}
                onChange={setDashboardState}
                onCloseEditor={() => setIsDashboardEditorOpen(false)}
              />
            ) : null}
            {activeTab === 'chat' ? <ChatWorkspace isDarkMode={isDarkMode} /> : null}
            {activeTab === 'apps' ? (
              <AppsShowcase
                appCenterState={appCenterState}
                isDarkMode={isDarkMode}
                onChange={setAppCenterState}
              />
            ) : null}
            {activeTab === 'config' ? <ConfigCenter isDarkMode={isDarkMode} /> : null}
            {activeTab === 'subscription' ? <SubscriptionPlans isDarkMode={isDarkMode} /> : null}
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
}> = ({ active, expanded, icon: Icon, isDarkMode, label, onClick }) => (
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
    {expanded ? <span>{label}</span> : null}
  </button>
);

export default App;
