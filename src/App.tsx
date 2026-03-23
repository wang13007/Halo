import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Grid, 
  Settings, 
  LogOut, 
  Zap, 
  Cpu, 
  AlertTriangle, 
  Paperclip, 
  Activity, 
  Layers,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Edit3,
  Plus,
  ArrowUpRight,
  Clock,
  FileText,
  Video,
  PanelRightClose,
  PanelRightOpen,
  Send,
  StopCircle,
  Moon,
  Sun,
  Link as LinkIcon,
  BookOpen,
  Database,
  Server,
  ChevronDown,
  CheckCircle2,
  X,
  BarChart2,
  PieChart,
  FileSpreadsheet,
  Play,
  Copy,
  Trash2,
  Edit,
  MoreHorizontal,
  Lock,
  Star
} from 'lucide-react';
import { EnergyAnalysis } from './components/EnergyAnalysis';

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
  const [dashboardTab, setDashboardTab] = useState('overview');
  const [isEditingDashboard, setIsEditingDashboard] = useState(false);
  const [input, setInput] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedSystemInfo, setSelectedSystemInfo] = useState<any | null>(null);
  const [showAddSystemModal, setShowAddSystemModal] = useState(false);
  
  const [runningApps, setRunningApps] = useState<any[]>([]);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [appSubTab, setAppSubTab] = useState<'favorites' | 'my-apps' | 'app-store'>('favorites');
  const [favoriteAppIds, setFavoriteAppIds] = useState<string[]>(['energy']);
  const [acquiredStoreAppIds, setAcquiredStoreAppIds] = useState<string[]>(['store-1']);

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

  // Chat states
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [chatForm, setChatForm] = useState({ project: 'A区', energyType: '电', timeRange: '今日', interval: '1小时' });
  const [isThinking, setIsThinking] = useState(false);
  const [showAnalysisProcess, setShowAnalysisProcess] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: '您好！我是您的智能管家 **Halo**。\n\n监测到 **1号区域能耗** 有显著下降。需要我为您生成一份今日能耗分析报告吗？' }
  ]);

  // Theme classes
  const themeColor = isDarkMode ? 'bg-white text-black' : 'bg-blue-600 text-white';
  const themeColorText = isDarkMode ? 'text-white' : 'text-blue-600';
  const themeColorBorder = isDarkMode ? 'border-white' : 'border-blue-600';
  const themeBg = isDarkMode ? 'bg-gray-900' : 'bg-[#f0f4f8]';
  const glassBg = isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white/40 border-white/60';
  const glassPanel = isDarkMode ? 'bg-gray-800/50 border-white/10 text-gray-200' : 'bg-white/60 border-white/60 text-gray-800';
  const textPrimary = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  // 模拟数据
  const recents = [
    { id: 1, type: 'chat', title: '关于 Q3 计划的讨论', time: '10 分钟前', icon: <MessageSquare size={14} />, hasFile: false },
    { id: 2, type: 'chat', title: '能耗分析报告', time: '2 小时前', icon: <FileText size={14} />, hasFile: true, fileName: '能耗报告.pdf' },
    { id: 3, type: 'chat', title: '设备运行周报', time: '昨天', icon: <Video size={14} />, hasFile: true, fileName: '周报.pptx' }
  ];

  const apps = [
    { id: 'energy', name: '能耗分析', icon: <Zap size={24} className="text-yellow-500" />, color: 'bg-yellow-50' },
    { id: 'device', name: '设备监控', icon: <Cpu size={24} className={themeColorText} />, color: 'bg-blue-50' },
    { id: 'alert', name: '告警中心', icon: <AlertTriangle size={24} className="text-red-500" />, color: 'bg-red-50' },
    { id: 'dashboard', name: '数据看板', icon: <Activity size={24} className="text-emerald-500" />, color: 'bg-emerald-50' },
  ];

  const myApps = apps.map(app => ({ ...app, source: '我的应用' }));
  const storeApps = [
    { id: 'store-1', name: '智能报表', desc: '自动生成各类业务报表', icon: <Grid size={24} />, color: 'bg-gradient-to-br from-indigo-500 to-purple-600', source: '应用商店' },
    { id: 'store-2', name: '设备巡检', desc: '移动端设备巡检与维保', icon: <Settings size={24} />, color: 'bg-gradient-to-br from-emerald-500 to-teal-600', source: '应用商店' },
    { id: 'store-3', name: '告警中心 Pro', desc: '统一管理系统告警与处置流转', icon: <Zap size={24} />, color: 'bg-gradient-to-br from-red-500 to-orange-600', source: '应用商店' },
  ];
  const favoriteApps = [
    ...myApps.filter(app => favoriteAppIds.includes(app.id)),
    ...storeApps.filter(app => acquiredStoreAppIds.includes(app.id) && favoriteAppIds.includes(app.id))
  ];

  // Chat input handling
  useEffect(() => {
    const suggestionKeywords = ['能源', '能耗', '查', '用', '电', '水', '能'];
    if (suggestionKeywords.some(keyword => input.includes(keyword))) {
      setShowSuggestions(true);
    } else if (!selectedSuggestion) {
      setShowSuggestions(false);
    }
  }, [input, selectedSuggestion]);

  const handleSendChat = () => {
    if (!input.trim() && !selectedSuggestion) return;
    
    let userMsg = input;
    if (selectedSuggestion) {
      userMsg = `执行: ${selectedSuggestion} | 项目: ${chatForm.project} | 能源: ${chatForm.energyType} | 范围: ${chatForm.timeRange} | 间隔: ${chatForm.interval}`;
    }

    setChatMessages([...chatMessages, { role: 'user', content: userMsg }]);
    setInput('');
    setShowSuggestions(false);
    setSelectedSuggestion(null);
    setIsThinking(true);
    setShowAnalysisProcess(true);

    // Simulate thinking process
    setTimeout(() => {
      setIsThinking(false);
      setShowAnalysisProcess(false);
      setChatMessages(prev => [...prev, { role: 'assistant', content: '分析已完成。根据您的要求，已生成相关数据报告。' }]);
    }, 5000);
  };

  const handleTerminate = () => {
    setIsThinking(false);
    setShowAnalysisProcess(false);
    setChatMessages(prev => [...prev, { role: 'assistant', content: '分析已终止。' }]);
  };

  const handleRunApp = (app: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!runningApps.find(a => a.id === app.id)) {
      setRunningApps([...runningApps, app]);
    }
    setActiveAppId(app.id);
    setActiveTab('running-app');
  };

  const handleCloseApp = (appId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newApps = runningApps.filter(a => a.id !== appId);
    setRunningApps(newApps);
    if (activeAppId === appId) {
      if (newApps.length > 0) {
        setActiveAppId(newApps[newApps.length - 1].id);
      } else {
        setActiveAppId(null);
        setActiveTab('apps');
      }
    }
  };

  const toggleFavoriteApp = (appId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavoriteAppIds(prev => (
      prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId]
    ));
  };

  const handleAcquireStoreApp = (appId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAcquiredStoreAppIds(prev => (prev.includes(appId) ? prev : [...prev, appId]));
  };

  const isAppFavorited = (appId: string) => favoriteAppIds.includes(appId);
  const isStoreAppAcquired = (appId: string) => acquiredStoreAppIds.includes(appId);

  return (
    <div className={`min-h-screen ${themeBg} flex items-center justify-center p-4 font-sans transition-colors duration-500`}>
      {/* 动态背景 */}
      <div className={`fixed top-[-10%] left-[-10%] w-[60%] h-[60%] ${isDarkMode ? 'bg-blue-900/30' : 'bg-white'} rounded-full blur-[140px] opacity-80`}></div>
      <div className={`fixed bottom-[-5%] right-[-5%] w-[40%] h-[40%] ${isDarkMode ? 'bg-purple-900/20' : 'bg-blue-100/50'} rounded-full blur-[120px] opacity-60`}></div>

      {/* 主容器 - Apple 毛玻璃风格 */}
      <div className={`w-full max-w-[1440px] h-[92vh] ${glassBg} backdrop-blur-3xl backdrop-saturate-150 rounded-[48px] shadow-2xl flex overflow-hidden border relative z-10 transition-all duration-500`}>
        
        {/* 侧边导航栏 */}
        <nav className={`${isSidebarExpanded ? 'w-64' : 'w-20'} flex flex-col py-4 border-r ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-white/40 bg-white/20'} transition-all duration-500 ease-in-out relative`}>
          {/* Logo */}
          <div className={`px-7 mb-8 flex items-center space-x-3 overflow-hidden transition-all duration-500 ${isSidebarExpanded ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden m-0 p-0'}`}>
            <div className={`w-8 h-8 ${themeColor} rounded-xl flex items-center justify-center shadow-lg flex-shrink-0`}>
              <div className={`w-4 h-4 border-2 ${isDarkMode ? 'border-black/30 border-t-black' : 'border-white/30 border-t-white'} rounded-full animate-spin-slow`}></div>
            </div>
            <span className={`font-black text-xl tracking-tighter ${textPrimary}`}>Halo</span>
          </div>
          
          <div className="flex-grow px-3 space-y-2">
            <NavItem icon={<LayoutDashboard size={22} />} label="看板" active={activeTab === 'dashboard'} expanded={isSidebarExpanded} onClick={() => setActiveTab('dashboard')} isDarkMode={isDarkMode} />
            <NavItem icon={<MessageSquare size={22} />} label="对话" active={activeTab === 'chat'} expanded={isSidebarExpanded} onClick={() => setActiveTab('chat')} isDarkMode={isDarkMode} />
            <NavItem icon={<Grid size={22} />} label="应用" active={activeTab === 'apps' || activeTab === 'running-app'} expanded={isSidebarExpanded} onClick={() => setActiveTab('apps')} isDarkMode={isDarkMode} />
            <NavItem icon={<Settings size={22} />} label="配置" active={activeTab === 'config'} expanded={isSidebarExpanded} onClick={() => setActiveTab('config')} isDarkMode={isDarkMode} />
          </div>
          
          <div className="px-4 mt-auto flex flex-col space-y-4">
            {/* 用户点击区域 */}
            <div className="relative" ref={userMenuRef}>
              <div 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`group flex items-center p-2 rounded-[24px] cursor-pointer ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-white'} transition-all duration-300 ${!isSidebarExpanded && 'justify-center'}`}
              >
                <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                  M
                </div>
                {isSidebarExpanded && (
                  <div className="ml-3 flex-grow overflow-hidden flex flex-col justify-center">
                    <p className={`text-sm font-bold truncate ${textPrimary}`}>Mr.Wang</p>
                    <p className={`text-[10px] ${textSecondary} truncate`}>系统管理员</p>
                  </div>
                )}
              </div>

              {/* 用户菜单 */}
              {showUserMenu && (
                <div className={`absolute bottom-full mb-3 left-0 w-52 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white/90 border-white'} backdrop-blur-2xl rounded-[28px] shadow-2xl border p-2 z-50 animate-in fade-in slide-in-from-bottom-4`}>
                  <button onClick={() => { setActiveTab('subscription'); setShowUserMenu(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 text-sm ${textPrimary} ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} rounded-2xl transition-all`}>
                    <Zap size={18} className="text-yellow-500" />
                    <span className="font-medium">订阅计划</span>
                  </button>
                  <div className={`h-px ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} my-1 mx-2`}></div>
                  <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-full flex items-center space-x-3 px-4 py-3 text-sm ${textPrimary} ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} rounded-2xl transition-all`}>
                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                    <span className="font-medium">{isDarkMode ? '浅色模式' : '暗黑模式'}</span>
                  </button>
                  <div className={`h-px ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} my-1 mx-2`}></div>
                  <button className={`w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-500 ${isDarkMode ? 'hover:bg-red-900/30' : 'hover:bg-red-50'} rounded-2xl transition-all`}>
                    <LogOut size={18} />
                    <span className="font-medium">退出登录</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* 主内容区 */}
        <main className="flex-grow flex flex-col min-w-0 relative z-0">
          {/* 顶部控制栏 (Tabs for running apps) */}
          <div className="h-14 flex items-center px-4 flex-shrink-0 z-10 border-b border-gray-200/30 dark:border-gray-800/30">
            {runningApps.length > 0 && (
              <div className="flex space-x-2 overflow-x-auto custom-scrollbar items-center h-full pt-2">
                {runningApps.map(app => (
                  <div 
                    key={app.id}
                    onClick={() => { setActiveAppId(app.id); setActiveTab('running-app'); }}
                    className={`group flex items-center space-x-2 px-4 py-2 rounded-t-xl cursor-pointer transition-all border-t border-l border-r ${
                      activeAppId === app.id && activeTab === 'running-app'
                        ? (isDarkMode ? 'bg-gray-800/50 border-gray-700 text-white' : 'bg-white border-gray-200 text-blue-600')
                        : (isDarkMode ? 'bg-transparent border-transparent text-gray-400 hover:bg-gray-800/30' : 'bg-transparent border-transparent text-gray-500 hover:bg-white/50')
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${app.color} flex items-center justify-center text-white`}>
                      {React.cloneElement(app.icon, { size: 10 })}
                    </div>
                    <span className="text-sm font-medium whitespace-nowrap">{app.name}</span>
                    <button 
                      onClick={(e) => handleCloseApp(app.id, e)}
                      className={`ml-2 p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex-grow overflow-y-auto p-8 md:p-12 pt-4 custom-scrollbar relative">
            
            {/* 看板视图 */}
            {activeTab === 'dashboard' && (
              <div className="animate-in fade-in duration-700 flex flex-col h-full">
                <div className="flex justify-between items-center mb-8 px-2">
                  <div className="flex space-x-8">
                    {['overview', 'energy', 'devices'].map(tab => (
                      <button 
                        key={tab}
                        onClick={() => setDashboardTab(tab)}
                        className={`text-sm font-bold pb-2 border-b-2 transition-all ${dashboardTab === tab ? `${themeColorBorder} ${textPrimary}` : `border-transparent ${textSecondary} hover:${textPrimary}`}`}
                      >
                        {tab === 'overview' ? '总览' : tab === 'energy' ? '能耗' : '设备'}
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => setIsEditingDashboard(!isEditingDashboard)}
                    className={`w-10 h-10 rounded-full ${glassPanel} flex items-center justify-center hover:shadow-md transition-all shadow-sm ${isEditingDashboard ? themeColor : ''}`}
                  >
                    <Edit3 size={18} className={isEditingDashboard ? (isDarkMode ? 'text-black' : 'text-white') : textSecondary} />
                  </button>
                </div>

                {dashboardTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 md:gap-8">
                  {/* 能耗数据小组件 */}
                  <div className={`${glassPanel} p-8 rounded-[40px] shadow-sm col-span-1 lg:col-span-8 group hover:shadow-xl transition-all duration-500 relative`}>
                    {isEditingDashboard && <div className="absolute inset-0 bg-black/5 rounded-[40px] border-2 border-dashed border-blue-400 z-10 pointer-events-none"></div>}
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h4 className={`font-bold ${textSecondary} text-[10px] uppercase tracking-[0.2em] mb-2`}>今日累计能耗</h4>
                        <p className={`text-4xl font-black tracking-tighter ${textPrimary}`}>1,284.50 <span className={`text-sm font-medium ${textSecondary} ml-1 tracking-normal`}>kW/h</span></p>
                      </div>
                      <div className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-2xl text-[10px] font-black flex items-center space-x-1">
                        <ArrowUpRight size={12} className="rotate-180" />
                        <span>-12.4%</span>
                      </div>
                    </div>
                    <div className="h-44 flex items-end space-x-2 md:space-x-3">
                      {[30, 50, 40, 80, 60, 95, 45, 75, 85, 40, 60, 100].map((h, i) => (
                        <div key={i} className={`flex-grow ${isDarkMode ? 'bg-gray-700 hover:bg-white' : 'bg-white/60 hover:bg-blue-600'} rounded-full transition-all duration-500 cursor-pointer relative`} style={{ height: `${h}%` }}>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 设备状态 */}
                  <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-900'} p-8 rounded-[40px] shadow-xl text-white col-span-1 lg:col-span-4 flex flex-col justify-between relative`}>
                    {isEditingDashboard && <div className="absolute inset-0 bg-white/5 rounded-[40px] border-2 border-dashed border-blue-400 z-10 pointer-events-none"></div>}
                    <div>
                      <h4 className="font-bold opacity-60 text-[10px] uppercase tracking-[0.2em] mb-6">实时设备监测</h4>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-black tracking-tighter">24 / 36</p>
                            <p className="text-[10px] opacity-60 font-medium">设备在线率</p>
                          </div>
                          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-blue-400">
                            <Activity size={20} />
                          </div>
                        </div>
                        <div className="h-px bg-white/10"></div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-black tracking-tighter text-emerald-400">稳定</p>
                            <p className="text-[10px] opacity-60 font-medium">当前运行环境</p>
                          </div>
                          <div className="w-12 h-12 bg-emerald-400/20 rounded-2xl flex items-center justify-center">
                            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 仅在编辑模式下显示添加组件的空白区域 */}
                  {isEditingDashboard && (
                    <div className={`col-span-1 lg:col-span-12 border-3 border-dashed ${isDarkMode ? 'border-gray-700 hover:border-gray-500' : 'border-gray-300 hover:border-blue-400'} rounded-[40px] flex items-center justify-center p-12 ${textSecondary} hover:${textPrimary} transition-all cursor-pointer group`}>
                       <div className="text-center">
                         <div className={`w-14 h-14 rounded-full border-2 border-dashed ${isDarkMode ? 'border-gray-600' : 'border-gray-300'} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                           <Plus size={24} />
                         </div>
                         <p className="text-xs font-black tracking-widest uppercase">添加新卡片</p>
                       </div>
                    </div>
                  )}
                </div>
                )}
              </div>
            )}

            {/* 对话视图 */}
            {activeTab === 'chat' && (
              <div className="flex flex-col h-full max-w-4xl mx-auto animate-in fade-in duration-700 relative">
                {!isHistoryExpanded && (
                  <div className="absolute top-0 right-0 z-20">
                    <button 
                      onClick={() => setIsHistoryExpanded(true)}
                      className={`w-10 h-10 rounded-full ${glassPanel} flex items-center justify-center hover:shadow-md transition-all shadow-sm`}
                    >
                      <ChevronLeft size={18} />
                    </button>
                  </div>
                )}

                <div className="flex-grow space-y-8 pt-12 overflow-y-auto custom-scrollbar pb-32">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex space-x-4 items-start ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center text-xs shadow-md font-black ${msg.role === 'user' ? 'bg-blue-100 text-blue-600 overflow-hidden' : `${themeColor}`}`}>
                        {msg.role === 'user' ? <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" /> : 'H'}
                      </div>
                      <div className={`${glassPanel} p-5 rounded-[28px] ${msg.role === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'} shadow-sm text-sm leading-relaxed max-w-[80%] whitespace-pre-wrap`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {/* Thinking State */}
                  {isThinking && (
                    <div className="flex space-x-4 items-start">
                      <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center text-xs shadow-md font-black ${themeColor}`}>H</div>
                      <div className="flex flex-col space-y-2 max-w-[80%]">
                        <div className="flex items-center space-x-2">
                          <div className={`${glassPanel} px-4 py-3 rounded-full shadow-sm flex items-center space-x-2`}>
                            <div className="flex space-x-1">
                              <div className={`w-2 h-2 rounded-full ${themeColor} animate-bounce`} style={{ animationDelay: '0ms' }}></div>
                              <div className={`w-2 h-2 rounded-full ${themeColor} animate-bounce`} style={{ animationDelay: '150ms' }}></div>
                              <div className={`w-2 h-2 rounded-full ${themeColor} animate-bounce`} style={{ animationDelay: '300ms' }}></div>
                            </div>
                            <span className={`text-xs font-medium ${textSecondary} ml-2`}>Thinking...</span>
                          </div>
                          <button 
                            onClick={() => setShowAnalysisProcess(!showAnalysisProcess)}
                            className={`p-2 rounded-full ${glassPanel} hover:shadow-md transition-all`}
                          >
                            <ChevronDown size={16} className={`transform transition-transform ${showAnalysisProcess ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                        
                        {/* Analysis Process Details */}
                        {showAnalysisProcess && (
                          <div className={`${glassPanel} p-4 rounded-[24px] text-xs space-y-3 animate-in fade-in slide-in-from-top-2`}>
                            <div className="flex items-center space-x-2 text-emerald-500">
                              <CheckCircle2 size={14} /> <span>连接数据库... 成功</span>
                            </div>
                            <div className="flex items-center space-x-2 text-emerald-500">
                              <CheckCircle2 size={14} /> <span>提取 {chatForm.project} {chatForm.energyType} 数据... 成功</span>
                            </div>
                            <div className="flex items-center space-x-2 text-blue-500">
                              <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                              <span>正在生成对比分析模型...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 底部输入框区域 */}
                <div className="absolute bottom-0 left-0 right-0 pt-4 pb-2 bg-gradient-to-t from-[var(--bg-color)] to-transparent" style={{ '--bg-color': isDarkMode ? '#111827' : '#f0f4f8' } as React.CSSProperties}>
                  
                  {/* 关键词提示选项 */}
                  {showSuggestions && !selectedSuggestion && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 animate-in slide-in-from-bottom-2">
                      {[
                        { name: '查询用量', icon: <BarChart2 size={20} />, desc: '实时能耗数据', color: 'from-blue-400 to-blue-600' },
                        { name: '对比分析', icon: <PieChart size={20} />, desc: '多维度能耗对比', color: 'from-purple-400 to-purple-600' },
                        { name: '生成报表', icon: <FileSpreadsheet size={20} />, desc: '导出详细数据', color: 'from-emerald-400 to-emerald-600' },
                        { name: '生成报告', icon: <FileText size={20} />, desc: '智能分析总结', color: 'from-amber-400 to-amber-600' }
                      ].map(opt => (
                        <div 
                          key={opt.name}
                          onClick={() => {
                            setSelectedSuggestion(opt.name);
                            setInput('');
                            setShowSuggestions(false);
                          }}
                          className={`relative p-[1px] rounded-[24px] cursor-pointer group overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-xl`}
                        >
                          <div className={`absolute inset-0 bg-gradient-to-br ${opt.color} opacity-50 group-hover:opacity-100 transition-opacity duration-500`}></div>
                          <div className={`relative h-full ${isDarkMode ? 'bg-gray-900/90' : 'bg-white/90'} backdrop-blur-xl p-5 rounded-[23px] flex flex-col items-start`}>
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 bg-gradient-to-br ${opt.color} text-white shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                              {opt.icon}
                            </div>
                            <h4 className={`font-black text-sm mb-1 ${textPrimary} tracking-wide`}>{opt.name}</h4>
                            <p className={`text-[10px] ${textSecondary} font-medium`}>{opt.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 进一步选项表单 */}
                  {selectedSuggestion && (
                    <div className={`${glassPanel} p-4 rounded-[24px] mb-3 shadow-lg border border-white/20 animate-in slide-in-from-bottom-2`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold">{selectedSuggestion} - 参数配置</span>
                        <button onClick={() => setSelectedSuggestion(null)} className="text-gray-400 hover:text-red-500"><X size={18}/></button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <select className={`bg-transparent border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-300'} py-1 text-xs focus:outline-none`} value={chatForm.project} onChange={e => setChatForm({...chatForm, project: e.target.value})}>
                          <option>A区</option><option>B区</option><option>全部项目</option>
                        </select>
                        <select className={`bg-transparent border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-300'} py-1 text-xs focus:outline-none`} value={chatForm.energyType} onChange={e => setChatForm({...chatForm, energyType: e.target.value})}>
                          <option>电</option><option>水</option><option>燃气</option>
                        </select>
                        <select className={`bg-transparent border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-300'} py-1 text-xs focus:outline-none`} value={chatForm.timeRange} onChange={e => setChatForm({...chatForm, timeRange: e.target.value})}>
                          <option>今日</option><option>本周</option><option>本月</option>
                        </select>
                        <select className={`bg-transparent border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-300'} py-1 text-xs focus:outline-none`} value={chatForm.interval} onChange={e => setChatForm({...chatForm, interval: e.target.value})}>
                          <option>1小时</option><option>1天</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="relative group max-w-3xl mx-auto w-full">
                    <div className={`absolute -inset-[1px] rounded-[30px] bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 opacity-30 group-hover:opacity-60 blur-[2px] transition-opacity duration-500`}></div>
                    
                    <div className={`relative ${glassBg} backdrop-blur-3xl backdrop-saturate-200 rounded-[28px] shadow-inner flex items-center p-2 border ${isDarkMode ? 'border-white/10' : 'border-white/80'}`}>
                      <button className={`p-3 ${textSecondary} hover:${textPrimary} transition-colors`}><Paperclip size={20} /></button>
                      <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                        placeholder="输入消息..."
                        className={`flex-grow px-2 py-3 text-sm bg-transparent focus:outline-none ${textPrimary} font-medium`}
                      />
                      {isThinking ? (
                        <button onClick={handleTerminate} className="bg-red-500 text-white p-3 rounded-[22px] hover:bg-red-600 transition-all shadow-md">
                          <StopCircle size={20} />
                        </button>
                      ) : (
                        <button onClick={handleSendChat} className={`${themeColor} p-3 rounded-[22px] hover:scale-105 active:scale-95 transition-all shadow-md`}>
                          <Send size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 运行应用视图 */}
            {activeTab === 'running-app' && activeAppId && (
              <div className="animate-in fade-in duration-700 h-full">
                {activeAppId === 'energy' ? (
                  <EnergyAnalysis isDarkMode={isDarkMode} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <div className="w-24 h-24 mb-6 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      {runningApps.find(a => a.id === activeAppId)?.icon || <Grid size={48} />}
                    </div>
                    <h2 className={`text-2xl font-bold mb-2 ${textPrimary}`}>
                      {runningApps.find(a => a.id === activeAppId)?.name}
                    </h2>
                    <p>应用正在运行中...</p>
                  </div>
                )}
              </div>
            )}

            {/* 应用视图 */}
            {activeTab === 'apps' && (
              <div className="animate-in fade-in duration-700 max-w-6xl mx-auto flex flex-col h-full">
                <div className="flex justify-between items-center mb-8 px-2">
                  <h2 className={`text-2xl font-black tracking-tight ${textPrimary}`}>应用中心</h2>
                  <div className={`flex p-1 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <button 
                      onClick={() => setAppSubTab('my-apps')}
                      className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${appSubTab === 'my-apps' ? (isDarkMode ? 'bg-gray-700 text-white shadow-sm' : 'bg-white text-blue-600 shadow-sm') : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      我的应用
                    </button>
                    <button 
                      onClick={() => setAppSubTab('app-store')}
                      className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${appSubTab === 'app-store' ? (isDarkMode ? 'bg-gray-700 text-white shadow-sm' : 'bg-white text-blue-600 shadow-sm') : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      应用商店
                    </button>
                  </div>
                </div>

                {appSubTab === 'my-apps' ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {apps.map(app => (
                      <div key={app.id} className={`${glassPanel} p-8 rounded-[40px] hover:-translate-y-2 transition-all duration-500 cursor-pointer group relative overflow-hidden text-left shadow-sm`}>
                        <div className={`absolute top-0 right-0 w-24 h-24 ${app.color} rounded-full -mr-12 -mt-12 opacity-50 blur-2xl group-hover:scale-150 transition-transform duration-700`}></div>
                        <div className={`w-16 h-16 ${isDarkMode ? 'bg-gray-800' : 'bg-white/80'} rounded-[24px] flex items-center justify-center mb-6 shadow-sm group-hover:shadow-md transition-all border ${isDarkMode ? 'border-white/10' : 'border-white'}`}>
                          {app.icon}
                        </div>
                        <h4 className={`text-lg font-black mb-1 ${textPrimary}`}>{app.name}</h4>
                        <p className={`text-xs ${textSecondary} font-medium tracking-wide`}>最近更新: 2h前</p>
                        
                        {/* Hover Actions */}
                        <div className={`absolute inset-x-0 bottom-0 p-6 pt-12 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out flex justify-center space-x-3 ${isDarkMode ? 'bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent' : 'bg-gradient-to-t from-white via-white/95 to-transparent'}`}>
                          <button 
                            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 ${isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-500 text-white hover:bg-blue-400'}`} 
                            title="运行" 
                            onClick={(e) => handleRunApp(app, e)}
                          >
                            <Play size={16} className="ml-0.5" />
                          </button>
                          <button 
                            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 ${isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} 
                            title="编辑"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 ${isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} 
                            title="复制"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Copy size={16} />
                          </button>
                          <button 
                            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 ${isDarkMode ? 'bg-red-900/80 text-red-400 hover:bg-red-600 hover:text-white' : 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white'}`} 
                            title="删除"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Add New App Card */}
                    <div className={`p-8 rounded-[40px] border-2 border-dashed ${isDarkMode ? 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/30' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/50'} flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[220px] group`}>
                      <div className={`w-14 h-14 rounded-full ${isDarkMode ? 'bg-gray-800 text-gray-400 group-hover:text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600'} flex items-center justify-center mb-4 transition-colors`}>
                        <Plus size={24} />
                      </div>
                      <h3 className={`text-lg font-bold ${isDarkMode ? 'text-gray-400 group-hover:text-white' : 'text-gray-500 group-hover:text-blue-600'} transition-colors`}>创建新应用</h3>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {/* Mock App Store Items */}
                    {[
                      { id: 'store-1', name: '智能报表', desc: '自动生成各类业务报表', icon: <Grid size={24} />, color: 'bg-gradient-to-br from-indigo-500 to-purple-600' },
                      { id: 'store-2', name: '设备巡检', desc: '移动端设备巡检与维保', icon: <Settings size={24} />, color: 'bg-gradient-to-br from-emerald-500 to-teal-600' },
                      { id: 'store-3', name: '告警中心', desc: '统一管理系统各类告警', icon: <Zap size={24} />, color: 'bg-gradient-to-br from-red-500 to-orange-600' },
                    ].map(app => (
                      <div key={app.id} className={`${glassPanel} p-8 rounded-[40px] hover:-translate-y-2 transition-all duration-500 relative overflow-hidden text-left shadow-sm`}>
                        <div className={`absolute top-0 right-0 w-24 h-24 ${app.color} rounded-full -mr-12 -mt-12 opacity-50 blur-2xl`}></div>
                        <div className={`w-16 h-16 ${isDarkMode ? 'bg-gray-800' : 'bg-white/80'} rounded-[24px] flex items-center justify-center mb-6 shadow-sm border ${isDarkMode ? 'border-white/10' : 'border-white'}`}>
                          {app.icon}
                        </div>
                        <h4 className={`text-lg font-black mb-1 ${textPrimary}`}>{app.name}</h4>
                        <p className={`text-xs ${textSecondary} font-medium tracking-wide mb-6`}>{app.desc}</p>
                        <button className={`w-full py-3 rounded-xl font-bold text-sm ${isDarkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-blue-600 hover:bg-blue-50'} transition-colors`}>
                          获取应用
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 订阅视图 */}
            {activeTab === 'subscription' && (
              <div className="animate-in fade-in duration-700 max-w-5xl mx-auto flex flex-col h-full items-center justify-center py-8">
                <div className="text-center mb-10">
                  <h2 className={`text-4xl font-black tracking-tighter ${textPrimary} mb-4`}>订阅计划</h2>
                  <p className={`text-lg ${textSecondary} max-w-2xl mx-auto`}>选择适合您的订阅计划，解锁更强大的高级告警功能、专属支持和更高的通知额度。</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl items-stretch">
                  {/* 基础版 */}
                  <div className={`${glassPanel} p-8 md:p-10 rounded-[40px] border ${isDarkMode ? 'border-white/10' : 'border-white/60'} flex flex-col relative overflow-hidden`}>
                    <h3 className={`text-2xl font-black ${textPrimary} mb-2`}>基础版</h3>
                    <p className={`${textSecondary} text-sm mb-6`}>适合个人用户和小型团队的日常需求。</p>
                    <div className="mb-8">
                      <span className={`text-5xl font-black ${textPrimary}`}>免费</span>
                    </div>
                    <button className={`w-full py-4 rounded-2xl font-bold text-sm mb-8 ${isDarkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'} transition-colors`}>
                      当前计划
                    </button>
                    <div className="space-y-5 flex-grow">
                      <div className="flex items-center space-x-3">
                        <CheckCircle2 size={20} className="text-gray-400 flex-shrink-0" />
                        <span className={`text-sm ${textPrimary}`}>基础告警规则配置</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <CheckCircle2 size={20} className="text-gray-400 flex-shrink-0" />
                        <span className={`text-sm ${textPrimary}`}>邮件/站内信通知</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <CheckCircle2 size={20} className="text-gray-400 flex-shrink-0" />
                        <span className={`text-sm ${textPrimary}`}>每日 100 条告警额度</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <CheckCircle2 size={20} className="text-gray-400 flex-shrink-0" />
                        <span className={`text-sm ${textPrimary}`}>7天告警历史记录</span>
                      </div>
                    </div>
                  </div>

                  {/* 高级版 */}
                  <div className={`p-8 md:p-10 rounded-[40px] flex flex-col relative overflow-hidden shadow-2xl ${isDarkMode ? 'bg-gradient-to-b from-blue-900/40 to-purple-900/40 border border-blue-500/30' : 'bg-gradient-to-b from-blue-50 to-purple-50 border border-blue-200'}`}>
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest shadow-md">
                      最受欢迎
                    </div>
                    <h3 className={`text-2xl font-black ${textPrimary} mb-2`}>高级版</h3>
                    <p className={`${textSecondary} text-sm mb-6`}>为专业用户和企业提供无限制的强大功能。</p>
                    <div className="mb-8 flex items-end space-x-2">
                      <span className={`text-5xl font-black ${textPrimary}`}>¥99</span>
                      <span className={`${textSecondary} mb-1 font-medium`}>/ 月</span>
                    </div>
                    <button className={`w-full py-4 rounded-2xl font-bold text-sm mb-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all`}>
                      升级至高级版
                    </button>
                    <div className="space-y-5 flex-grow">
                      <div className="flex items-center space-x-3">
                        <CheckCircle2 size={20} className="text-blue-500 flex-shrink-0" />
                        <span className={`text-sm font-medium ${textPrimary}`}>AI 智能告警分析与降噪</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <CheckCircle2 size={20} className="text-blue-500 flex-shrink-0" />
                        <span className={`text-sm font-medium ${textPrimary}`}>短信/电话/Webhook 多渠道通知</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <CheckCircle2 size={20} className="text-blue-500 flex-shrink-0" />
                        <span className={`text-sm font-medium ${textPrimary}`}>无限制的告警通知额度</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <CheckCircle2 size={20} className="text-blue-500 flex-shrink-0" />
                        <span className={`text-sm font-medium ${textPrimary}`}>永久告警历史与导出</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <CheckCircle2 size={20} className="text-blue-500 flex-shrink-0" />
                        <span className={`text-sm font-medium ${textPrimary}`}>24/7 专属技术支持</span>
                      </div>
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-blue-500/20">
                      <p className={`text-xs ${textSecondary} mb-3 text-center`}>支持以下支付方式</p>
                      <div className="flex justify-center space-x-4">
                        <div className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold">支付宝</div>
                        <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">微信支付</div>
                        <div className="px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs font-bold">龙珠支付</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 配置视图 */}
            {activeTab === 'config' && (
              <div className="animate-in fade-in duration-700 max-w-6xl mx-auto flex flex-col h-full">
                <div className="mb-8 px-2 flex justify-between items-center">
                  <div>
                    <h2 className={`text-2xl font-black tracking-tight ${textPrimary}`}>系统配置</h2>
                    <p className={`text-sm ${textSecondary} mt-2`}>通过 MCP 链接第三方系统，管理 API 接口权限。</p>
                  </div>
                  <button onClick={() => setShowAddSystemModal(true)} className={`${themeColor} px-5 py-2.5 rounded-full text-sm font-bold hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center space-x-2`}>
                    <Plus size={16} />
                    <span>新增系统</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {/* EMS */}
                  <div 
                    onClick={() => setSelectedSystemInfo({
                      name: 'EMS 系统',
                      desc: '能源管理系统，提供实时能耗数据和历史统计。',
                      status: '已连接',
                      url: 'https://ems.example.com',
                      username: 'admin_ems',
                      apis: [
                        { method: 'GET', path: '/api/v1/energy/usage', desc: '获取指定区域能耗用量' },
                        { method: 'POST', path: '/api/v1/energy/report', desc: '生成能耗分析报告' }
                      ]
                    })}
                    className={`${glassPanel} p-6 rounded-[32px] border ${isDarkMode ? 'border-white/10 hover:border-gray-500' : 'border-white/60 hover:border-blue-300'} relative overflow-hidden group cursor-pointer transition-all hover:shadow-md`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center"><Database size={20}/></div>
                        <h3 className="font-bold">EMS 系统</h3>
                      </div>
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-600 text-[10px] rounded-lg font-bold">已连接</span>
                    </div>
                    <p className={`text-xs ${textSecondary}`}>能源管理系统，提供实时能耗数据和历史统计。</p>
                  </div>

                  {/* IBMS */}
                  <div 
                    onClick={() => setSelectedSystemInfo({
                      name: 'IBMS 系统',
                      desc: '智能楼宇管理系统，控制设备运行状态。',
                      status: '已连接',
                      url: 'https://ibms.example.com',
                      username: 'admin_ibms',
                      apis: [
                        { method: 'GET', path: '/api/v1/devices/status', desc: '获取设备实时状态' },
                        { method: 'POST', path: '/api/v1/devices/control', desc: '下发设备控制指令' }
                      ]
                    })}
                    className={`${glassPanel} p-6 rounded-[32px] border ${isDarkMode ? 'border-white/10 hover:border-gray-500' : 'border-white/60 hover:border-blue-300'} relative overflow-hidden group cursor-pointer transition-all hover:shadow-md`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center"><Server size={20}/></div>
                        <h3 className="font-bold">IBMS 系统</h3>
                      </div>
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-600 text-[10px] rounded-lg font-bold">已连接</span>
                    </div>
                    <p className={`text-xs ${textSecondary}`}>智能楼宇管理系统，控制设备运行状态。</p>
                  </div>

                  {/* BMP */}
                  <div 
                    onClick={() => setSelectedSystemInfo({
                      name: 'BMP 系统',
                      desc: '业务管理平台，处理核心业务逻辑。',
                      status: '未连接',
                      url: 'https://bmp.example.com',
                      username: 'admin_bmp',
                      apis: [
                        { method: 'GET', path: '/api/v1/business/stats', desc: '获取业务统计数据' }
                      ]
                    })}
                    className={`${glassPanel} p-6 rounded-[32px] border ${isDarkMode ? 'border-dashed border-gray-600 hover:border-gray-500' : 'border-dashed border-gray-300 hover:border-blue-300'} relative overflow-hidden group cursor-pointer transition-all hover:shadow-md`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-100 text-gray-400 rounded-xl flex items-center justify-center"><LinkIcon size={20}/></div>
                        <h3 className="font-bold">BMP 系统</h3>
                      </div>
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 text-[10px] rounded-lg font-bold">未连接</span>
                    </div>
                    <p className={`text-xs ${textSecondary} w-full text-left`}>业务管理平台，处理核心业务逻辑。</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>

        {/* 右侧面板 - 仅在对话视图显示最近记录 */}
        {activeTab === 'chat' && isHistoryExpanded && (
          <aside className={`w-80 border-l ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-white/40 bg-white/20'} backdrop-blur-xl animate-in slide-in-from-right duration-500 relative z-10 flex flex-col`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-white/10' : 'border-white/40'} flex items-center justify-between`}>
              <div className="flex items-center space-x-2">
                <Clock size={16} className={textSecondary} />
                <h3 className={`text-xs font-black uppercase tracking-widest ${textSecondary}`}>历史对话</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button className={`w-8 h-8 rounded-full ${themeColor} flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-md`}>
                  <Plus size={16} />
                </button>
                <button onClick={() => setIsHistoryExpanded(false)} className={`w-8 h-8 rounded-full ${glassPanel} flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-md`}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {recents.map(item => (
                <div key={item.id} className={`group flex items-center p-3 rounded-[24px] ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-white/80'} transition-all cursor-pointer text-left`}>
                  <div className={`w-10 h-10 rounded-2xl ${isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-white/50 text-gray-500'} flex items-center justify-center group-hover:${themeColorText} transition-all shadow-sm`}>
                    {item.icon}
                  </div>
                  <div className="ml-3 overflow-hidden flex-grow flex flex-col justify-center">
                    <p className={`text-xs font-bold truncate ${textPrimary}`}>{item.title}</p>
                    <div className="flex items-center mt-1 space-x-2">
                      <span className={`text-[10px] ${textSecondary} font-medium`}>{item.time}</span>
                      {item.hasFile && (
                        <span className={`flex items-center space-x-1 px-1.5 py-0.5 ${isDarkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-50/80 text-blue-600'} rounded-md text-[9px] font-bold`}>
                          <FileText size={10} />
                          <span>包含文件</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* 新增系统弹窗 */}
      {showAddSystemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} border rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden relative flex flex-col`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-lg">新增系统对接</h3>
              <button onClick={() => setShowAddSystemModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-xs font-bold mb-2 ${textSecondary}`}>系统名称</label>
                <input type="text" className={`w-full px-4 py-3 rounded-xl text-sm bg-transparent border ${isDarkMode ? 'border-gray-700 focus:border-blue-500' : 'border-gray-300 focus:border-blue-500'} focus:outline-none transition-colors`} placeholder="例如：ERP 系统" />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-2 ${textSecondary}`}>账户</label>
                <input type="text" className={`w-full px-4 py-3 rounded-xl text-sm bg-transparent border ${isDarkMode ? 'border-gray-700 focus:border-blue-500' : 'border-gray-300 focus:border-blue-500'} focus:outline-none transition-colors`} placeholder="输入访问账户" />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-2 ${textSecondary}`}>密码 / Token</label>
                <input type="password" className={`w-full px-4 py-3 rounded-xl text-sm bg-transparent border ${isDarkMode ? 'border-gray-700 focus:border-blue-500' : 'border-gray-300 focus:border-blue-500'} focus:outline-none transition-colors`} placeholder="输入访问密码或 Token" />
              </div>
              <button onClick={() => setShowAddSystemModal(false)} className="w-full py-3 mt-4 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-md">
                连接系统
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 系统详情弹窗 */}
      {selectedSystemInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className={`${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} border rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden relative flex flex-col max-h-[85vh]`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center space-x-2">
                <Database size={20} className={themeColorText} />
                <span>{selectedSystemInfo.name} 详情</span>
              </h3>
              <button onClick={() => setSelectedSystemInfo(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
              {/* 系统信息 */}
              <div>
                <h4 className={`text-sm font-bold mb-3 flex items-center space-x-2 ${textPrimary}`}>
                  <Server size={16} className="text-blue-500" />
                  <span>系统信息</span>
                </h4>
                <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-3`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs ${textSecondary}`}>系统名称</span>
                    <span className={`text-sm font-medium ${textPrimary}`}>{selectedSystemInfo.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs ${textSecondary}`}>状态</span>
                    <span className={`px-2 py-1 text-[10px] rounded-lg font-bold ${selectedSystemInfo.status === '已连接' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                      {selectedSystemInfo.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs ${textSecondary}`}>描述</span>
                    <span className={`text-sm font-medium ${textPrimary} text-right max-w-[70%]`}>{selectedSystemInfo.desc}</span>
                  </div>
                </div>
              </div>

              {/* 登录信息 */}
              <div>
                <h4 className={`text-sm font-bold mb-3 flex items-center space-x-2 ${textPrimary}`}>
                  <Lock size={16} className="text-purple-500" />
                  <span>登录信息</span>
                </h4>
                <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-3`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs ${textSecondary}`}>访问地址</span>
                    <a href={selectedSystemInfo.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-500 hover:underline">{selectedSystemInfo.url}</a>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs ${textSecondary}`}>用户名</span>
                    <span className={`text-sm font-medium ${textPrimary}`}>{selectedSystemInfo.username}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs ${textSecondary}`}>密码/Token</span>
                    <span className={`text-sm font-medium ${textPrimary}`}>••••••••</span>
                  </div>
                </div>
              </div>

              {/* 接口信息 */}
              <div>
                <h4 className={`text-sm font-bold mb-3 flex items-center space-x-2 ${textPrimary}`}>
                  <BookOpen size={16} className="text-emerald-500" />
                  <span>接口信息</span>
                </h4>
                <div className="space-y-3">
                  {selectedSystemInfo.apis && selectedSystemInfo.apis.map((api: any, i: number) => (
                    <div key={i} className={`flex items-center p-4 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <span className={`w-14 flex-shrink-0 text-center text-[10px] font-black py-1 rounded-md ${api.method === 'GET' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'} mr-4`}>{api.method}</span>
                      <code className={`text-xs font-mono flex-grow ${textPrimary}`}>{api.path}</code>
                      <span className={`text-xs ${textSecondary} flex-shrink-0 ml-4`}>{api.desc}</span>
                    </div>
                  ))}
                  {(!selectedSystemInfo.apis || selectedSystemInfo.apis.length === 0) && (
                    <div className={`p-4 rounded-2xl text-center text-sm ${textSecondary} ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      暂无接口信息
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .animate-spin-slow { animation: spin 6s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};

const NavItem = ({ icon, label, active, expanded, onClick, isDarkMode }: any) => {
  const activeClass = isDarkMode 
    ? 'bg-white text-black shadow-lg' 
    : 'bg-blue-600 text-white shadow-xl shadow-blue-200';
  const inactiveClass = isDarkMode
    ? 'text-gray-400 hover:text-white hover:bg-gray-800'
    : 'text-gray-500 hover:text-blue-600 hover:bg-white hover:shadow-sm';

  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center p-3 rounded-2xl transition-all duration-500 group relative ${active ? activeClass : inactiveClass} ${!expanded && 'justify-center'}`}
    >
      <div className={`flex-shrink-0 transition-all duration-500 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
        {icon}
      </div>
      {expanded && (
        <span className="ml-4 text-sm font-bold animate-in fade-in slide-in-from-left-4 duration-500">
          {label}
        </span>
      )}
      {!expanded && active && (
        <div className={`absolute left-0 w-1 h-6 ${isDarkMode ? 'bg-white' : 'bg-blue-600'} rounded-r-full`}></div>
      )}
    </button>
  );
};

export default App;
