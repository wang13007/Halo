import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Download, Zap, DollarSign, Leaf, Activity } from 'lucide-react';

const data = [
  { time: '00:00', hvac: 400, lighting: 240, plugs: 240 },
  { time: '04:00', hvac: 300, lighting: 139, plugs: 221 },
  { time: '08:00', hvac: 200, lighting: 980, plugs: 229 },
  { time: '12:00', hvac: 278, lighting: 390, plugs: 200 },
  { time: '16:00', hvac: 189, lighting: 480, plugs: 218 },
  { time: '20:00', hvac: 239, lighting: 380, plugs: 250 },
  { time: '24:00', hvac: 349, lighting: 430, plugs: 210 },
];

const pieData = [
  { name: '空调暖通', value: 400 },
  { name: '照明插座', value: 300 },
  { name: '动力设备', value: 300 },
  { name: '特殊用电', value: 200 },
];
const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

export const EnergyAnalysis = ({ isDarkMode }: { isDarkMode: boolean }) => {
  const textColor = isDarkMode ? 'text-gray-200' : 'text-gray-800';
  const bgColor = isDarkMode ? 'bg-gray-800/50' : 'bg-white';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-200';

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-2xl font-bold ${textColor}`}>能耗分析 (Web EMS)</h2>
          <p className="text-sm text-gray-500 mt-1">实时监控与历史数据分析</p>
        </div>
        <div className="flex space-x-3">
          <button className={`flex items-center space-x-2 px-4 py-2 rounded-xl border ${borderColor} ${bgColor} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}>
            <Calendar size={18} className={textColor} />
            <span className={`text-sm font-medium ${textColor}`}>今日</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-lg shadow-blue-200 dark:shadow-none">
            <Download size={18} />
            <span className="text-sm font-medium">导出报表</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: '今日总能耗', value: '1,245', unit: 'kWh', icon: <Zap size={24} className="text-blue-500" />, trend: '+5.2%' },
          { title: '本月累计', value: '34,500', unit: 'kWh', icon: <Activity size={24} className="text-purple-500" />, trend: '-2.1%' },
          { title: '预估电费', value: '¥2,890', unit: '', icon: <DollarSign size={24} className="text-green-500" />, trend: '+1.4%' },
          { title: '碳排放量', value: '856', unit: 'kg', icon: <Leaf size={24} className="text-emerald-500" />, trend: '-5.0%' },
        ].map((stat, i) => (
          <div key={i} className={`p-6 rounded-3xl border ${borderColor} ${bgColor} shadow-sm flex flex-col`} style={{ backdropFilter: 'blur(10px)' }}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                {stat.icon}
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${stat.trend.startsWith('+') ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-green-100 text-green-600 dark:bg-green-900/30'}`}>
                {stat.trend}
              </span>
            </div>
            <h3 className="text-sm text-gray-500 font-medium mb-1">{stat.title}</h3>
            <div className="flex items-baseline space-x-1">
              <span className={`text-3xl font-black tracking-tight ${textColor}`}>{stat.value}</span>
              <span className="text-sm text-gray-500 font-medium">{stat.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow min-h-[400px]">
        {/* Main Chart */}
        <div className={`lg:col-span-2 p-6 rounded-3xl border ${borderColor} ${bgColor} shadow-sm flex flex-col`} style={{ backdropFilter: 'blur(10px)' }}>
          <h3 className={`text-lg font-bold mb-6 ${textColor}`}>24小时用电趋势</h3>
          <div className="flex-grow w-full h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: textColor, fontSize: '14px', fontWeight: 500 }}
                  cursor={{ fill: isDarkMode ? '#374151' : '#f3f4f6' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="hvac" name="空调暖通" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                <Bar dataKey="lighting" name="照明插座" stackId="a" fill="#8b5cf6" />
                <Bar dataKey="plugs" name="动力设备" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className={`p-6 rounded-3xl border ${borderColor} ${bgColor} shadow-sm flex flex-col`} style={{ backdropFilter: 'blur(10px)' }}>
          <h3 className={`text-lg font-bold mb-6 ${textColor}`}>分项能耗占比</h3>
          <div className="flex-grow w-full h-full min-h-[300px] flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: textColor, fontSize: '14px', fontWeight: 500 }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-blue-600">1.2k</span>
              <span className="text-xs text-gray-500 font-medium">总计 (kWh)</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {pieData.map((item, i) => (
              <div key={i} className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                <span className={`text-sm font-medium ${textColor}`}>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
