import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Case } from '../types';
import { t } from '../translations';
import { useAppContext } from '../providers/AppProvider';

interface StatsBoardProps {
  theme: 'light' | 'dark';
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

const StatsBoard: React.FC<StatsBoardProps> = ({ theme }) => {
  const { data } = useAppContext();
  const chartData = data.columnOrder.map((colId) => ({
    name: t[data.columns[colId].id.replace('column-', 'backlog') as keyof typeof t] || data.columns[colId].title,
    value: data.columns[colId].taskIds.length,
  }));

  // Fix: changed Task to Case to match types.ts
  const priorityStats = (Object.values(data.tasks) as Case[]).reduce((acc, task) => {
    acc[task.priority] = (acc[task.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const priorityData = Object.entries(priorityStats).map(([name, value]) => ({
    name: t[name as keyof typeof t] as string || name,
    value
  }));

  const cardBg = theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';
  const textColor = theme === 'dark' ? 'text-slate-100' : 'text-slate-800';
  const subTextColor = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      <div className={`p-6 rounded-2xl shadow-sm border ${cardBg}`}>
        <h3 className={`text-lg font-bold mb-4 ${textColor}`}>{t.taskDistribution}</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#1e293b' : '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  color: theme === 'dark' ? '#f1f5f9' : '#1e293b'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-2">
          {chartData.map((d, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className={`text-xs font-medium ${subTextColor}`}>{d.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`p-6 rounded-2xl shadow-sm border ${cardBg}`}>
        <h3 className={`text-lg font-bold mb-4 ${textColor}`}>{t.priorityBreakdown}</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={priorityData}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: theme === 'dark' ? '#1e293b' : '#f8fafc' }}
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#1e293b' : '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  color: theme === 'dark' ? '#f1f5f9' : '#1e293b'
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {priorityData.map((entry, index) => {
                  const pKey = Object.keys(t).find(key => (t as any)[key] === entry.name);
                  let fill = '#3b82f6';
                  if (pKey === 'high') fill = '#ef4444';
                  if (pKey === 'medium') fill = '#f59e0b';
                  return <Cell key={`cell-${index}`} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default StatsBoard;
