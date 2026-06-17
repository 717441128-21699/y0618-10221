import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, Calendar, Plus, Clock, CheckCircle, FileWarning, Trash2, Eye, GitCompare, Search, X } from 'lucide-react';
import { useSPCStore } from '@/store/useSPCStore';

export default function Reports() {
  const navigate = useNavigate();
  const { reports, metricsConfig, currentMetric, generateReport, downloadReportPDF, deleteReport } = useSPCStore();
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([currentMetric]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [compareDateRange, setCompareDateRange] = useState({ start: '', end: '' });
  const [isComparison, setIsComparison] = useState(false);
  const [reportName, setReportName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter(r => {
      if (r.name.toLowerCase().includes(q)) return true;
      if (r.metricNames.some(n => n.toLowerCase().includes(q))) return true;
      const startStr = new Date(r.periodStart).toLocaleDateString('zh-CN');
      const endStr = new Date(r.periodEnd).toLocaleDateString('zh-CN');
      const createdStr = new Date(r.createdAt).toLocaleDateString('zh-CN');
      if (startStr.includes(q) || endStr.includes(q) || createdStr.includes(q)) return true;
      return false;
    });
  }, [reports, searchQuery]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'generating':
        return <Clock className="w-4 h-4 text-warning animate-spin" />;
      case 'failed':
        return <FileWarning className="w-4 h-4 text-danger" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'generating': return '生成中';
      case 'failed': return '失败';
      default: return '未知';
    }
  };

  const handleGenerate = async () => {
    setError('');
    
    if (!reportName.trim()) {
      setError('请输入报告名称');
      return;
    }
    if (!dateRange.start || !dateRange.end) {
      setError('请选择时间范围');
      return;
    }
    if (selectedMetrics.length === 0) {
      setError('请至少选择一个分析指标');
      return;
    }
    if (isComparison && (!compareDateRange.start || !compareDateRange.end)) {
      setError('对比模式下请选择上期时间范围');
      return;
    }

    setIsGenerating(true);
    try {
      const periodStart = new Date(dateRange.start).getTime();
      const periodEnd = new Date(dateRange.end).getTime() + 86400000 - 1;
      const params: any = {
        name: reportName.trim(),
        periodStart,
        periodEnd,
        metricIds: selectedMetrics,
      };
      if (isComparison) {
        params.isComparison = true;
        params.comparePeriodStart = new Date(compareDateRange.start).getTime();
        params.comparePeriodEnd = new Date(compareDateRange.end).getTime() + 86400000 - 1;
      }
      
      const newReport = await generateReport(params);
      setShowGenerateModal(false);
      setReportName('');
      setSelectedMetrics([currentMetric]);
      setDateRange({ start: '', end: '' });
      setCompareDateRange({ start: '', end: '' });
      setIsComparison(false);
      setTimeout(() => navigate(`/reports/${newReport.id}`), 300);
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成报告失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await downloadReportPDF(reportId);
    } catch (e) {
      alert(e instanceof Error ? e.message : '下载失败');
    }
  };

  const handleDelete = (reportId: string, reportName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`确定要删除报告「${reportName}」吗？此操作不可撤销。`)) {
      deleteReport(reportId);
    }
  };

  const toggleMetric = (metricId: string) => {
    setSelectedMetrics(prev =>
      prev.includes(metricId)
        ? prev.filter(m => m !== metricId)
        : [...prev, metricId]
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">报告管理</h1>
          <p className="text-sm text-slate-400 mt-1">
            SPC 分析报告生成、预览、导出与历史归档
          </p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
          生成报告
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="spc-card">
          <p className="text-xs text-slate-500 mb-1">报告总数</p>
          <p className="text-2xl font-bold font-mono text-slate-200">{reports.length}</p>
        </div>
        <div className="spc-card">
          <p className="text-xs text-slate-500 mb-1">对比报告</p>
          <p className="text-2xl font-bold font-mono text-primary-400">
            {reports.filter(r => r.isComparison).length}
          </p>
        </div>
        <div className="spc-card">
          <p className="text-xs text-slate-500 mb-1">已完成</p>
          <p className="text-2xl font-bold font-mono text-success">
            {reports.filter(r => r.status === 'completed').length}
          </p>
        </div>
        <div className="spc-card">
          <p className="text-xs text-slate-500 mb-1">生成失败</p>
          <p className="text-2xl font-bold font-mono text-danger">
            {reports.filter(r => r.status === 'failed').length}
          </p>
        </div>
      </div>

      <div className="spc-card">
        <div className="spc-card-header">
          <h3 className="spc-card-title">历史报告列表</h3>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="搜索报告名、指标名或日期..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="spc-input text-xs w-72 pl-8 pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-dark-border text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="py-3 px-4 text-left text-xs font-medium text-slate-500">报告名称</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-slate-500">类型</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-slate-500">状态</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-slate-500">时间范围</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-slate-500">分析指标</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-slate-500">创建时间</th>
                <th className="py-3 px-4 text-right text-xs font-medium text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>{searchQuery ? '没有匹配的报告，请尝试其他关键词' : '暂无报告记录，点击右上角「生成报告」创建'}</p>
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr
                    key={report.id}
                    onClick={() => report.status === 'completed' && navigate(`/reports/${report.id}`)}
                    className={`border-b border-dark-border/50 transition-colors ${
                      report.status === 'completed' ? 'hover:bg-dark-bg/30 cursor-pointer' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <FileText className={`w-4 h-4 ${report.status === 'completed' ? 'text-primary-400' : 'text-slate-600'}`} />
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-200">{report.name}</span>
                          {report.content && report.content.length > 0 && (
                            <span className="text-[10px] text-slate-500 mt-0.5">
                              共 {report.content.reduce((sum, c) => sum + c.sampleSize, 0)} 个样本点
                              {report.content.some(c => c.insufficientData) && (
                                <span className="ml-2 text-warning">⚠ 部分指标样本不足</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {report.isComparison ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-primary-500/20 text-primary-400">
                          <GitCompare className="w-3 h-3" /> 对比报告
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700/40 text-slate-400">
                          标准报告
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(report.status)}
                        <span className={`text-xs ${
                          report.status === 'completed' ? 'text-success' :
                          report.status === 'generating' ? 'text-warning' : 'text-danger'
                        }`}>
                          {getStatusText(report.status)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      <div>{formatDate(report.periodStart)} ~ {formatDate(report.periodEnd)}</div>
                      {report.isComparison && report.comparePeriodStart !== undefined && report.comparePeriodEnd !== undefined && (
                        <div className="text-primary-400 mt-0.5">
                          对比: {formatDate(report.comparePeriodStart)} ~ {formatDate(report.comparePeriodEnd)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {report.metricNames.slice(0, 2).map((name, i) => (
                          <span key={i} className="px-1.5 py-0.5 text-[10px] bg-primary-500/20 text-primary-400 rounded">
                            {name}
                          </span>
                        ))}
                        {report.metricNames.length > 2 && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-slate-700 text-slate-400 rounded">
                            +{report.metricNames.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {formatDateTime(report.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/reports/${report.id}`); }}
                          disabled={report.status !== 'completed'}
                          className={`p-1.5 rounded transition-colors ${
                            report.status === 'completed'
                              ? 'hover:bg-dark-border text-slate-400 hover:text-primary-400'
                              : 'text-slate-600 cursor-not-allowed'
                          }`}
                          title={report.status === 'completed' ? '预览报告' : '报告未完成'}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDownload(report.id, e)}
                          disabled={report.status !== 'completed'}
                          className={`p-1.5 rounded transition-colors ${
                            report.status === 'completed'
                              ? 'hover:bg-dark-border text-slate-400 hover:text-success'
                              : 'text-slate-600 cursor-not-allowed'
                          }`}
                          title={report.status === 'completed' ? '下载PDF' : '报告未完成'}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(report.id, report.name, e)}
                          className="p-1.5 rounded hover:bg-dark-border transition-colors text-slate-400 hover:text-danger"
                          title="删除报告"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="spc-card">
        <div className="spc-card-header">
          <h3 className="spc-card-title">报告模板</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <TemplateCard
            title="标准SPC报告"
            description="包含控制图、过程能力、帕累托分析的完整报告"
            icon={FileText}
            metrics="3-5 个质量指标"
          />
          <TemplateCard
            title="快速分析报告"
            description="核心指标摘要 + 关键趋势分析，适合快速浏览"
            icon={BarChart}
            metrics="1-2 个核心指标"
          />
          <TemplateCard
            title="对比分析报告"
            description="两个时间区间的质量指标环比对比分析"
            icon={GitCompare}
            metrics="自定义 + 双时间段"
          />
        </div>
      </div>

      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-card border border-dark-border rounded-lg w-[560px] p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-4">生成 SPC 分析报告</h3>
            
            {error && (
              <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded text-danger text-xs">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 block mb-1.5">报告名称 <span className="text-danger">*</span></label>
                <input
                  type="text"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="例如：2024年1月第1周SPC分析报告"
                  className="spc-input w-full"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-slate-300 mb-2 cursor-pointer select-none">
                  <span className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    isComparison ? 'bg-primary-500 border-primary-500' : 'border-slate-500'
                  }`}>
                    {isComparison && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    checked={isComparison}
                    onChange={(e) => setIsComparison(e.target.checked)}
                    className="hidden"
                  />
                  <GitCompare className="w-3.5 h-3.5 text-primary-400" />
                  <span>启用对比模式（本期 vs 上期）</span>
                </label>
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-1.5">
                  <Calendar className="w-3.5 h-3.5 inline mr-1" />
                  {isComparison ? '本期时间范围' : '时间范围'} <span className="text-danger">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="spc-input flex-1"
                  />
                  <span className="text-slate-500 self-center">至</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="spc-input flex-1"
                  />
                </div>
              </div>

              {isComparison && (
                <div className="animate-fade-in">
                  <label className="text-sm text-primary-400 block mb-1.5">
                    <Calendar className="w-3.5 h-3.5 inline mr-1" />
                    上期时间范围 <span className="text-danger">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={compareDateRange.start}
                      onChange={(e) => setCompareDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="spc-input flex-1"
                    />
                    <span className="text-slate-500 self-center">至</span>
                    <input
                      type="date"
                      value={compareDateRange.end}
                      onChange={(e) => setCompareDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="spc-input flex-1"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">环比结果会显示在报告预览中</p>
                </div>
              )}

              <div>
                <label className="text-sm text-slate-400 block mb-2">分析指标 <span className="text-danger">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {metricsConfig.map((metric) => (
                    <label
                      key={metric.id}
                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all ${
                        selectedMetrics.includes(metric.id)
                          ? 'border-primary-500 bg-primary-500/10'
                          : 'border-dark-border hover:border-slate-500'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMetrics.includes(metric.id)}
                        onChange={() => toggleMetric(metric.id)}
                        className="hidden"
                      />
                      <span className={`w-4 h-4 rounded border flex items-center justify-center ${
                        selectedMetrics.includes(metric.id)
                          ? 'bg-primary-500 border-primary-500'
                          : 'border-slate-500'
                      }`}>
                        {selectedMetrics.includes(metric.id) && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-slate-300 block truncate">{metric.name}</span>
                        <span className="text-[10px] text-slate-500">{metric.unit}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  setError('');
                }}
                disabled={isGenerating}
                className="spc-btn spc-btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="spc-btn spc-btn-primary flex items-center gap-2"
              >
                {isGenerating && <Clock className="w-4 h-4 animate-spin" />}
                {isGenerating ? '生成中...' : '生成并预览'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateCard({ title, description, icon: Icon, metrics }: {
  title: string;
  description: string;
  icon: any;
  metrics: string;
}) {
  return (
    <div className="p-4 rounded-lg border border-dark-border bg-dark-bg/50 hover:border-primary-500/50 hover:bg-dark-bg transition-all cursor-pointer group">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary-500/10 group-hover:bg-primary-500/20 transition-colors">
          <Icon className="w-5 h-5 text-primary-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
            {title}
          </h4>
          <p className="text-xs text-slate-500 mt-1">{description}</p>
          <p className="text-xs text-primary-400 mt-2">{metrics}</p>
        </div>
      </div>
    </div>
  );
}

function BarChart(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}
