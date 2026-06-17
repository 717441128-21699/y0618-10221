import { NavLink, useLocation } from 'react-router-dom';
import { Activity, BarChart3, Gauge, TrendingDown, GitCompare, FileText, Settings } from 'lucide-react';

const menuItems = [
  { path: '/dashboard', label: '实时监控', icon: Activity },
  { path: '/control-charts', label: '控制图分析', icon: BarChart3 },
  { path: '/capability', label: '过程能力', icon: Gauge },
  { path: '/pareto', label: '帕累托分析', icon: TrendingDown },
  { path: '/comparison', label: '多维度对比', icon: GitCompare },
  { path: '/reports', label: '报告管理', icon: FileText },
  { path: '/settings', label: '系统设置', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();
  return (
    <aside className="w-56 bg-dark-card border-r border-dark-border flex flex-col h-full">
      <div className="p-4 border-b border-dark-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary-600 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">SPC 实时看板</h1>
            <p className="text-xs text-slate-400">统计过程控制系统</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-2">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isReportsActive = item.path === '/reports' && location.pathname.startsWith('/reports');
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => {
                    const shouldHighlight = isActive || isReportsActive;
                    return `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200 ${
                      shouldHighlight
                        ? 'bg-primary-600/20 text-primary-300 border-l-2 border-primary-500'
                        : 'text-slate-400 hover:bg-dark-border hover:text-slate-200'
                    }`;
                  }}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-dark-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center">
            <span className="text-xs font-medium text-white">QE</span>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-200">质量工程师</p>
            <p className="text-xs text-slate-500">在线</p>
          </div>
          <div className="ml-auto">
            <span className="status-indicator status-success block" />
          </div>
        </div>
      </div>
    </aside>
  );
}
