import { useState } from 'react';
import { useSPCStore } from '@/store/useSPCStore';
import { Settings as SettingsIcon, SlidersHorizontal, Bell, FileText, Database, RefreshCw, Save } from 'lucide-react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('control-limits');
  const { nelsonRules, toggleNelsonRule, controlLimits, metricsConfig, currentMetric, setCurrentMetric, recalculateControlLimits } = useSPCStore();

  const currentMetricConfig = metricsConfig.find(m => m.id === currentMetric);

  const tabs = [
    { id: 'control-limits', label: '控制限管理', icon: SlidersHorizontal },
    { id: 'nelson-rules', label: 'Nelson 规则', icon: Bell },
    { id: 'report', label: '报告设置', icon: FileText },
    { id: 'data', label: '数据源', icon: Database },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-white">系统设置</h1>
        <p className="text-sm text-slate-400 mt-1">
          SPC 系统参数配置与管理
        </p>
      </div>

      <div className="flex gap-6">
        <div className="w-48 flex-shrink-0">
          <nav className="spc-card p-2 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary-600/20 text-primary-300'
                    : 'text-slate-400 hover:bg-dark-border hover:text-slate-200'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1">
          {activeTab === 'control-limits' && (
            <div className="space-y-4">
              <div className="spc-card">
                <div className="spc-card-header">
                  <h3 className="spc-card-title">选择质量指标</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {metricsConfig.map((metric) => (
                    <button
                      key={metric.id}
                      onClick={() => setCurrentMetric(metric.id)}
                      className={`p-3 rounded border text-left transition-all ${
                        currentMetric === metric.id
                          ? 'border-primary-500 bg-primary-500/10'
                          : 'border-dark-border hover:border-slate-500 bg-dark-bg/50'
                      }`}
                    >
                      <p className={`text-sm font-medium ${
                        currentMetric === metric.id ? 'text-primary-300' : 'text-slate-200'
                      }`}>
                        {metric.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{metric.unit}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="spc-card">
                <div className="spc-card-header">
                  <h3 className="spc-card-title">当前控制限</h3>
                  <button
                    onClick={recalculateControlLimits}
                    className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    重新计算
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <LimitItem label="上控制限 (UCL)" value={controlLimits?.ucl || 0} type="ucl" />
                  <LimitItem label="中心线 (CL)" value={controlLimits?.cl || 0} type="cl" />
                  <LimitItem label="下控制限 (LCL)" value={controlLimits?.lcl || 0} type="lcl" />
                </div>
                <div className="border-t border-dark-border pt-4">
                  <h4 className="text-sm font-medium text-slate-300 mb-3">规格限设置</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <LimitItem label="规格上限 (USL)" value={currentMetricConfig?.usl || 0} type="usl" />
                    <LimitItem label="目标值" value={currentMetricConfig?.target || 0} type="target" />
                    <LimitItem label="规格下限 (LSL)" value={currentMetricConfig?.lsl || 0} type="lsl" />
                  </div>
                </div>
              </div>

              <div className="spc-card">
                <div className="spc-card-header">
                  <h3 className="spc-card-title">基线管理</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded bg-dark-bg/50 border border-dark-border">
                    <div>
                      <p className="text-sm text-slate-200">当前基线</p>
                      <p className="text-xs text-slate-500 mt-1">
                        基于 {controlLimits?.baselinePeriod || '历史数据'} 计算
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs bg-success/20 text-success rounded">
                      生效中
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button className="spc-btn spc-btn-secondary flex items-center gap-1.5">
                      <Save className="w-3.5 h-3.5" />
                      保存当前基线
                    </button>
                    <button className="spc-btn spc-btn-secondary">
                      查看历史版本
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'nelson-rules' && (
            <div className="spc-card">
              <div className="spc-card-header">
                <h3 className="spc-card-title">Nelson 规则配置</h3>
                <span className="text-xs text-slate-500">
                  已启用 {nelsonRules.filter(r => r.enabled).length} / {nelsonRules.length} 条
                </span>
              </div>
              <div className="space-y-3">
                {nelsonRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`p-4 rounded-lg border transition-all ${
                      rule.enabled
                        ? 'bg-dark-bg/50 border-dark-border'
                        : 'bg-dark-bg/20 border-dark-border/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleNelsonRule(rule.id)}
                          className={`w-10 h-5 rounded-full relative transition-colors mt-0.5 ${
                            rule.enabled ? 'bg-primary-500' : 'bg-slate-600'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                              rule.enabled ? 'left-5' : 'left-0.5'
                            }`}
                          />
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-200">
                              规则 {rule.id}：{rule.name}
                            </span>
                            <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                              rule.severity === 'critical'
                                ? 'bg-danger/20 text-danger'
                                : 'bg-warning/20 text-warning'
                            }`}>
                              {rule.severity === 'critical' ? '严重' : '警告'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{rule.description}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'report' && (
            <div className="space-y-4">
              <div className="spc-card">
                <div className="spc-card-header">
                  <h3 className="spc-card-title">报告格式设置</h3>
                </div>
                <div className="space-y-3">
                  <SettingItem
                    label="默认报告模板"
                    description="新建报告时使用的默认模板"
                    type="select"
                    options={['标准SPC报告', '快速分析报告', '专项分析报告']}
                  />
                  <SettingItem
                    label="导出格式"
                    description="报告导出的文件格式"
                    type="select"
                    options={['PDF', 'Excel', 'Word']}
                  />
                  <SettingItem
                    label="自动生成周报"
                    description="每周一自动生成上周SPC分析报告"
                    type="toggle"
                    defaultValue={true}
                  />
                  <SettingItem
                    label="包含图表"
                    description="报告中是否包含图表"
                    type="toggle"
                    defaultValue={true}
                  />
                </div>
              </div>

              <div className="spc-card">
                <div className="spc-card-header">
                  <h3 className="spc-card-title">通知设置</h3>
                </div>
                <div className="space-y-3">
                  <SettingItem
                    label="邮件通知"
                    description="严重报警时发送邮件通知"
                    type="toggle"
                    defaultValue={false}
                  />
                  <SettingItem
                    label="声音提醒"
                    description="新报警时播放提示音"
                    type="toggle"
                    defaultValue={true}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-4">
              <div className="spc-card">
                <div className="spc-card-header">
                  <h3 className="spc-card-title">数据源配置</h3>
                </div>
                <div className="space-y-3">
                  <SettingItem
                    label="数据更新频率"
                    description="实时数据的刷新间隔"
                    type="select"
                    options={['1秒', '3秒', '5秒', '10秒', '30秒']}
                  />
                  <SettingItem
                    label="数据保留天数"
                    description="历史数据保留的天数"
                    type="select"
                    options={['7天', '30天', '90天', '180天', '365天']}
                  />
                </div>
              </div>

              <div className="spc-card">
                <div className="spc-card-header">
                  <h3 className="spc-card-title">数据导入</h3>
                </div>
                <div className="border-2 border-dashed border-dark-border rounded-lg p-8 text-center">
                  <Database className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 mb-2">拖拽 CSV 文件到此处</p>
                  <p className="text-xs text-slate-500 mb-4">或点击下方按钮选择文件</p>
                  <button className="spc-btn spc-btn-primary">
                    选择文件
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LimitItem({ label, value, type }: { label: string; value: number; type: string }) {
  const getColor = () => {
    switch (type) {
      case 'ucl':
      case 'lcl':
      case 'usl':
      case 'lsl':
        return 'text-danger';
      case 'cl':
      case 'target':
        return 'text-slate-200';
      default:
        return 'text-slate-200';
    }
  };

  return (
    <div className="p-3 rounded bg-dark-bg/50 border border-dark-border">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-lg font-bold font-mono mt-1 ${getColor()}`}>
        {value.toFixed(3)}
      </p>
    </div>
  );
}

function SettingItem({ label, description, type, options, defaultValue }: {
  label: string;
  description: string;
  type: 'select' | 'toggle';
  options?: string[];
  defaultValue?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [selectedOption, setSelectedOption] = useState(options?.[0]);

  return (
    <div className="flex items-center justify-between py-3 border-b border-dark-border/50 last:border-0">
      <div>
        <p className="text-sm text-slate-200">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      {type === 'toggle' ? (
        <button
          onClick={() => setValue(!value)}
          className={`w-10 h-5 rounded-full relative transition-colors ${
            value ? 'bg-primary-500' : 'bg-slate-600'
          }`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              value ? 'left-5' : 'left-0.5'
            }`}
          />
        </button>
      ) : (
        <select
          value={selectedOption}
          onChange={(e) => setSelectedOption(e.target.value)}
          className="spc-input text-xs"
        >
          {options?.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}
    </div>
  );
}
