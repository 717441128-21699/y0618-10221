import { useState, useRef } from 'react';
import { useSPCStore } from '@/store/useSPCStore';
import {
  Settings as SettingsIcon, SlidersHorizontal, Bell, FileText, Database,
  RefreshCw, Save, RotateCcw, Trash2, Upload, Download, CheckCircle,
  AlertCircle, History, Plus, X
} from 'lucide-react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('control-limits');
  const {
    nelsonRules, toggleNelsonRule, controlLimits, metricsConfig,
    currentMetric, setCurrentMetric, recalculateControlLimits,
    baselines, saveBaseline, restoreBaseline, deleteBaseline,
    importCSVData, qualityData
  } = useSPCStore();

  const [baselineName, setBaselineName] = useState('');
  const [baselineNote, setBaselineNote] = useState('');
  const [showSaveBaselineModal, setShowSaveBaselineModal] = useState(false);
  const [saveBaselineError, setSaveBaselineError] = useState('');

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{
    success: boolean; message: string; importedCount: number;
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentMetricConfig = metricsConfig.find(m => m.id === currentMetric);
  const metricBaselines = baselines.filter(b => b.metricId === currentMetric);

  const tabs = [
    { id: 'control-limits', label: '控制限管理', icon: SlidersHorizontal },
    { id: 'nelson-rules', label: 'Nelson 规则', icon: Bell },
    { id: 'report', label: '报告设置', icon: FileText },
    { id: 'data', label: '数据源', icon: Database },
  ];

  const handleSaveBaseline = () => {
    setSaveBaselineError('');
    if (!baselineName.trim()) {
      setSaveBaselineError('请输入基线名称');
      return;
    }
    saveBaseline(baselineName.trim(), baselineNote.trim() || undefined);
    setShowSaveBaselineModal(false);
    setBaselineName('');
    setBaselineNote('');
  };

  const handleRestoreBaseline = (id: string, name: string) => {
    if (confirm(`确定要恢复基线「${name}」吗？当前控制限将被覆盖。`)) {
      restoreBaseline(id);
    }
  };

  const handleDeleteBaseline = (id: string, name: string) => {
    if (confirm(`确定要删除基线「${name}」吗？此操作不可撤销。`)) {
      deleteBaseline(id);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      setImportResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      setCsvFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!csvFile) return;
    setIsImporting(true);
    setImportResult(null);
    try {
      const text = await csvFile.text();
      const result = await importCSVData(text);
      setImportResult(result);
      if (result.success) {
        setCsvFile(null);
      }
    } catch (e) {
      setImportResult({
        success: false,
        message: `读取文件失败: ${e instanceof Error ? e.message : '未知错误'}`,
        importedCount: 0,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportTemplate = () => {
    const template = `时间,数值,批次,班次,机台
2024-01-01 08:00:00,50.123,BATCH-001,早班,CNC-001
2024-01-01 08:05:00,49.987,BATCH-001,早班,CNC-001
2024-01-01 08:10:00,50.045,BATCH-001,早班,CNC-002
2024-01-01 08:15:00,50.210,BATCH-001,早班,CNC-002`;
    const blob = new Blob(['\uFEFF' + template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SPC数据导入模板.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDateTime = (ts: number) =>
    new Date(ts).toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    });

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
                {controlLimits?.uclR !== undefined && (
                  <div className="grid grid-cols-3 gap-4 mb-4 pt-3 border-t border-dark-border">
                    <LimitItem label="极差UCL" value={controlLimits.uclR || 0} type="ucl" small />
                    <LimitItem label="极差CL" value={controlLimits.clR || 0} type="cl" small />
                    <LimitItem label="极差LCL" value={controlLimits.lclR || 0} type="lcl" small />
                  </div>
                )}
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
                  <h3 className="spc-card-title flex items-center gap-2">
                    <History className="w-4 h-4 text-primary-400" />
                    基线版本管理
                    <span className="text-xs text-slate-500 font-normal">
                      ({metricBaselines.length} 个历史版本)
                    </span>
                  </h3>
                  <button
                    onClick={() => setShowSaveBaselineModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium rounded transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    保存当前基线
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded bg-primary-500/10 border border-primary-500/30">
                    <div>
                      <p className="text-sm text-slate-200 font-medium flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
                        当前基线
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        基于 {controlLimits?.baselinePeriod || '历史数据'} 计算 ·
                        创建于 {formatDateTime(controlLimits?.calculatedAt || Date.now())}
                      </p>
                      <div className="flex gap-4 mt-1 text-[10px] text-slate-500 font-mono">
                        <span>UCL={(controlLimits?.ucl || 0).toFixed(3)}</span>
                        <span>CL={(controlLimits?.cl || 0).toFixed(3)}</span>
                        <span>LCL={(controlLimits?.lcl || 0).toFixed(3)}</span>
                      </div>
                    </div>
                    <span className="px-2 py-1 text-xs bg-primary-500/20 text-primary-300 rounded font-medium">
                      生效中
                    </span>
                  </div>

                  {metricBaselines.length === 0 ? (
                    <div className="py-8 text-center text-slate-500">
                      <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">暂无历史基线，点击右上角保存当前控制限作为基线</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[...metricBaselines].sort((a, b) => b.createdAt - a.createdAt).map((baseline) => (
                        <div
                          key={baseline.id}
                          className="p-3 rounded bg-dark-bg/50 border border-dark-border hover:border-slate-500/50 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-200 flex items-center gap-2">
                                {baseline.name}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {formatDateTime(baseline.createdAt)} ·
                                样本量 {baseline.sampleSize}
                              </p>
                              {baseline.note && (
                                <p className="text-xs text-slate-400 mt-1 italic">
                                  「{baseline.note}」
                                </p>
                              )}
                              <div className="flex gap-4 mt-1 text-[10px] text-slate-500 font-mono">
                                <span>UCL={baseline.controlLimits.ucl.toFixed(3)}</span>
                                <span>CL={baseline.controlLimits.cl.toFixed(3)}</span>
                                <span>LCL={baseline.controlLimits.lcl.toFixed(3)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => handleRestoreBaseline(baseline.id, baseline.name)}
                                className="p-1.5 rounded hover:bg-dark-border transition-colors text-slate-400 hover:text-primary-400"
                                title="恢复此基线"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteBaseline(baseline.id, baseline.name)}
                                className="p-1.5 rounded hover:bg-dark-border transition-colors text-slate-400 hover:text-danger"
                                title="删除基线"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                    options={['PDF（推荐）', 'Excel', 'Word']}
                  />
                  <SettingItem
                    label="自动生成周报"
                    description="每周一自动生成上周SPC分析报告"
                    type="toggle"
                    defaultValue={true}
                  />
                  <SettingItem
                    label="包含图表"
                    description="报告中是否包含图表可视化"
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
                    description="严重报警时发送邮件通知相关负责人"
                    type="toggle"
                    defaultValue={false}
                  />
                  <SettingItem
                    label="声音提醒"
                    description="新报警产生时播放提示音"
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
                    options={['1秒', '3秒', '5秒（推荐）', '10秒', '30秒']}
                  />
                  <SettingItem
                    label="数据保留天数"
                    description="历史数据保留的天数，用于趋势分析"
                    type="select"
                    options={['7天', '30天', '90天（推荐）', '180天', '365天']}
                  />
                </div>
              </div>

              <div className="spc-card">
                <div className="spc-card-header">
                  <h3 className="spc-card-title">CSV 数据导入</h3>
                  <button
                    onClick={handleExportTemplate}
                    className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300"
                  >
                    <Download className="w-3.5 h-3.5" />
                    下载模板
                  </button>
                </div>

                <div className="space-y-3">
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                      csvFile
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-dark-border hover:border-primary-500/50 hover:bg-dark-bg/50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {csvFile ? (
                      <div>
                        <CheckCircle className="w-10 h-10 text-success mx-auto mb-3" />
                        <p className="text-sm text-slate-200 font-medium">{csvFile.name}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {(csvFile.size / 1024).toFixed(2)} KB · 点击重新选择
                        </p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                        <p className="text-sm text-slate-400 mb-1">拖拽 CSV 文件到此处</p>
                        <p className="text-xs text-slate-500 mb-4">或点击此处选择文件</p>
                      </div>
                    )}
                  </div>

                  {importResult && (
                    <div className={`p-3 rounded border text-xs ${
                      importResult.success
                        ? 'bg-success/10 border-success/30 text-success'
                        : 'bg-danger/10 border-danger/30 text-danger'
                    }`}>
                      <div className="flex items-start gap-2">
                        {importResult.success
                          ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        }
                        <div>
                          <p className="font-medium">{importResult.message}</p>
                          {importResult.success && (
                            <p className="mt-0.5 opacity-80">
                              已导入 {importResult.importedCount} 条数据，
                              当前数据库共 {qualityData.length} 条记录，
                              已同步更新控制图、过程能力、帕累托和对比分析
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-slate-500">
                      支持字段：<code className="px-1.5 py-0.5 bg-dark-bg rounded">时间/数值/批次/班次/机台</code>
                    </div>
                    <button
                      onClick={handleImport}
                      disabled={!csvFile || isImporting}
                      className={`spc-btn spc-btn-primary flex items-center gap-1.5 ${
                        !csvFile || isImporting ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isImporting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      {isImporting ? '导入中...' : '开始导入'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="spc-card">
                <div className="spc-card-header">
                  <h3 className="spc-card-title">当前数据状态</h3>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 rounded bg-dark-bg/50 border border-dark-border">
                    <p className="text-xs text-slate-500">当前指标</p>
                    <p className="text-sm font-medium text-slate-200 mt-0.5">
                      {currentMetricConfig?.name || '-'}
                    </p>
                  </div>
                  <div className="p-3 rounded bg-dark-bg/50 border border-dark-border">
                    <p className="text-xs text-slate-500">数据点数</p>
                    <p className="text-sm font-mono font-medium text-primary-400 mt-0.5">
                      {qualityData.length}
                    </p>
                  </div>
                  <div className="p-3 rounded bg-dark-bg/50 border border-dark-border">
                    <p className="text-xs text-slate-500">基线条数</p>
                    <p className="text-sm font-mono font-medium text-slate-300 mt-0.5">
                      {metricBaselines.length}
                    </p>
                  </div>
                  <div className="p-3 rounded bg-dark-bg/50 border border-dark-border">
                    <p className="text-xs text-slate-500">最近更新</p>
                    <p className="text-xs font-mono text-slate-300 mt-0.5">
                      {qualityData.length > 0
                        ? formatDateTime(qualityData[qualityData.length - 1].timestamp)
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showSaveBaselineModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-card border border-dark-border rounded-lg w-[440px] p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">保存基线版本</h3>
              <button
                onClick={() => {
                  setShowSaveBaselineModal(false);
                  setSaveBaselineError('');
                }}
                className="p-1 rounded hover:bg-dark-border text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {saveBaselineError && (
              <div className="mb-4 p-2.5 bg-danger/10 border border-danger/30 rounded text-danger text-xs">
                {saveBaselineError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 block mb-1.5">
                  基线名称 <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={baselineName}
                  onChange={(e) => setBaselineName(e.target.value)}
                  placeholder="例如：优化后基线 v2.0"
                  className="spc-input w-full"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-1.5">备注说明</label>
                <textarea
                  value={baselineNote}
                  onChange={(e) => setBaselineNote(e.target.value)}
                  placeholder="可选：记录这次基线的背景和调整原因"
                  rows={3}
                  className="spc-input w-full resize-none"
                />
              </div>

              <div className="p-3 rounded bg-dark-bg/50 border border-dark-border">
                <p className="text-xs text-slate-500 mb-1.5">即将保存的控制限参数：</p>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-500">UCL</span>
                    <span className="text-danger ml-1">{(controlLimits?.ucl || 0).toFixed(3)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">CL</span>
                    <span className="text-slate-200 ml-1">{(controlLimits?.cl || 0).toFixed(3)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">LCL</span>
                    <span className="text-danger ml-1">{(controlLimits?.lcl || 0).toFixed(3)}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  样本量 {qualityData.length} · {currentMetricConfig?.name}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowSaveBaselineModal(false);
                  setSaveBaselineError('');
                }}
                className="spc-btn spc-btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleSaveBaseline}
                className="spc-btn spc-btn-primary flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                保存基线
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LimitItem({ label, value, type, small }: { label: string; value: number; type: string; small?: boolean }) {
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
    <div className={`rounded bg-dark-bg/50 border border-dark-border ${small ? 'p-2' : 'p-3'}`}>
      <p className={`${small ? 'text-[10px]' : 'text-xs'} text-slate-500`}>{label}</p>
      <p className={`${small ? 'text-base' : 'text-lg'} font-bold font-mono mt-1 ${getColor()}`}>
        {value.toFixed(small ? 3 : 3)}
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
