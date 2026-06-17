import { create } from 'zustand';
import { QualityDataPoint, SubgroupData, ControlLimits, AlarmRecord, ProcessCapability, DefectCause, ShiftData, MachineData, SPCReport } from '@/types';
import { generateQualityData, generateSubgroups, generateDefectCauses, generateShiftData, generateMachineData, generateReports, METRICS_CONFIG } from '@/mock/data';
import { calculateXbarRControlLimits, calculateIMRControlLimits, calculateProcessCapability, createSubgroups } from '@/utils/spc';
import { checkNelsonRules, DEFAULT_NELSON_RULES, NelsonRuleConfig } from '@/utils/nelson';

interface SPCState {
  currentMetric: string;
  qualityData: QualityDataPoint[];
  subgroups: SubgroupData[];
  controlLimits: ControlLimits | null;
  alarms: AlarmRecord[];
  nelsonRules: NelsonRuleConfig[];
  processCapability: ProcessCapability | null;
  defectCauses: DefectCause[];
  shiftData: ShiftData[];
  machineData: MachineData[];
  reports: SPCReport[];
  metricsConfig: typeof METRICS_CONFIG;
  subgroupSize: number;
  chartType: 'xbar-r' | 'i-mr';
  isRealTimeMode: boolean;
  lastUpdateTime: number;

  setCurrentMetric: (metric: string) => void;
  setChartType: (type: 'xbar-r' | 'i-mr') => void;
  setSubgroupSize: (size: number) => void;
  toggleNelsonRule: (ruleId: number) => void;
  acknowledgeAlarm: (alarmId: string) => void;
  acknowledgeAllAlarms: () => void;
  addDataPoint: (point: QualityDataPoint) => void;
  recalculateControlLimits: () => void;
  toggleRealTimeMode: () => void;
  switchBatch: () => void;
}

const initialMetric = METRICS_CONFIG[0];
const initialQualityData = generateQualityData(120, initialMetric.target, (initialMetric.usl - initialMetric.lsl) / 8);
const initialSubgroups = generateSubgroups(initialQualityData, 5);
const initialControlLimitsCalc = calculateXbarRControlLimits(initialSubgroups, 5);
const initialControlLimits: ControlLimits = {
  id: 'cl-001',
  metricName: initialMetric.name,
  ...initialControlLimitsCalc,
  usl: initialMetric.usl,
  lsl: initialMetric.lsl,
  target: initialMetric.target,
  calculatedAt: Date.now(),
  baselinePeriod: '历史稳定阶段',
  isActive: true,
};
const initialAlarms = checkNelsonRules(
  initialSubgroups.map(s => s.mean),
  initialControlLimits.cl,
  initialControlLimits.ucl,
  initialControlLimits.lcl,
  DEFAULT_NELSON_RULES,
  initialMetric.name
);
const initialProcessCapability = calculateProcessCapability(
  initialQualityData.map(d => d.value),
  initialMetric.usl,
  initialMetric.lsl
);

export const useSPCStore = create<SPCState>((set, get) => ({
  currentMetric: initialMetric.id,
  qualityData: initialQualityData,
  subgroups: initialSubgroups,
  controlLimits: initialControlLimits,
  alarms: initialAlarms,
  nelsonRules: DEFAULT_NELSON_RULES,
  processCapability: {
    ...initialProcessCapability,
    sampleSize: initialQualityData.length,
    calculatedAt: Date.now(),
  },
  defectCauses: generateDefectCauses(),
  shiftData: generateShiftData(),
  machineData: generateMachineData(),
  reports: generateReports(),
  metricsConfig: METRICS_CONFIG,
  subgroupSize: 5,
  chartType: 'xbar-r',
  isRealTimeMode: true,
  lastUpdateTime: Date.now(),

  setCurrentMetric: (metricId) => {
    const metric = METRICS_CONFIG.find(m => m.id === metricId);
    if (!metric) return;

    const qualityData = generateQualityData(120, metric.target, (metric.usl - metric.lsl) / 8);
    const subgroups = generateSubgroups(qualityData, get().subgroupSize);
    const limitsCalc = calculateXbarRControlLimits(subgroups, get().subgroupSize);
    const controlLimits: ControlLimits = {
      id: `cl-${metricId}`,
      metricName: metric.name,
      ...limitsCalc,
      usl: metric.usl,
      lsl: metric.lsl,
      target: metric.target,
      calculatedAt: Date.now(),
      baselinePeriod: '历史稳定阶段',
      isActive: true,
    };
    const alarms = checkNelsonRules(
      subgroups.map(s => s.mean),
      controlLimits.cl,
      controlLimits.ucl,
      controlLimits.lcl,
      get().nelsonRules,
      metric.name
    );
    const capability = calculateProcessCapability(
      qualityData.map(d => d.value),
      metric.usl,
      metric.lsl
    );

    set({
      currentMetric: metricId,
      qualityData,
      subgroups,
      controlLimits,
      alarms,
      processCapability: {
        ...capability,
        sampleSize: qualityData.length,
        calculatedAt: Date.now(),
      },
      lastUpdateTime: Date.now(),
    });
  },

  setChartType: (type) => {
    set({ chartType: type });
    
    if (type === 'i-mr') {
      const state = get();
      const values = state.qualityData.map(d => d.value);
      const limitsCalc = calculateIMRControlLimits(values);
      const metric = state.metricsConfig.find(m => m.id === state.currentMetric);
      
      const controlLimits: ControlLimits = {
        ...state.controlLimits!,
        ...limitsCalc,
      };
      
      const alarms = checkNelsonRules(
        values,
        controlLimits.cl,
        controlLimits.ucl,
        controlLimits.lcl,
        state.nelsonRules,
        metric?.name || ''
      );

      set({ controlLimits, alarms });
    } else {
      const state = get();
      const limitsCalc = calculateXbarRControlLimits(state.subgroups, state.subgroupSize);
      const metric = state.metricsConfig.find(m => m.id === state.currentMetric);
      
      const controlLimits: ControlLimits = {
        ...state.controlLimits!,
        ...limitsCalc,
      };
      
      const alarms = checkNelsonRules(
        state.subgroups.map(s => s.mean),
        controlLimits.cl,
        controlLimits.ucl,
        controlLimits.lcl,
        state.nelsonRules,
        metric?.name || ''
      );

      set({ controlLimits, alarms });
    }
  },

  setSubgroupSize: (size) => {
    const state = get();
    const subgroups = generateSubgroups(state.qualityData, size);
    const limitsCalc = calculateXbarRControlLimits(subgroups, size);
    const metric = state.metricsConfig.find(m => m.id === state.currentMetric);
    
    const controlLimits: ControlLimits = {
      ...state.controlLimits!,
      ...limitsCalc,
    };
    
    const alarms = checkNelsonRules(
      subgroups.map(s => s.mean),
      controlLimits.cl,
      controlLimits.ucl,
      controlLimits.lcl,
      state.nelsonRules,
      metric?.name || ''
    );

    set({ subgroupSize: size, subgroups, controlLimits, alarms });
  },

  toggleNelsonRule: (ruleId) => {
    const state = get();
    const nelsonRules = state.nelsonRules.map(rule =>
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    );
    
    const values = state.chartType === 'xbar-r'
      ? state.subgroups.map(s => s.mean)
      : state.qualityData.map(d => d.value);
    
    const alarms = checkNelsonRules(
      values,
      state.controlLimits!.cl,
      state.controlLimits!.ucl,
      state.controlLimits!.lcl,
      nelsonRules,
      state.metricsConfig.find(m => m.id === state.currentMetric)?.name || ''
    );

    set({ nelsonRules, alarms });
  },

  acknowledgeAlarm: (alarmId) => {
    set(state => ({
      alarms: state.alarms.map(alarm =>
        alarm.id === alarmId
          ? { ...alarm, acknowledged: true, acknowledgedAt: Date.now(), acknowledgedBy: '当前用户' }
          : alarm
      ),
    }));
  },

  acknowledgeAllAlarms: () => {
    set(state => ({
      alarms: state.alarms.map(alarm => ({
        ...alarm,
        acknowledged: true,
        acknowledgedAt: Date.now(),
        acknowledgedBy: '当前用户',
      })),
    }));
  },

  addDataPoint: (point) => {
    const state = get();
    const qualityData = [...state.qualityData, point].slice(-200);
    
    let subgroups = state.subgroups;
    if (state.chartType === 'xbar-r') {
      subgroups = generateSubgroups(qualityData, state.subgroupSize);
    }

    const values = state.chartType === 'xbar-r'
      ? subgroups.map(s => s.mean)
      : qualityData.map(d => d.value);
    
    const metric = state.metricsConfig.find(m => m.id === state.currentMetric);
    
    const alarms = checkNelsonRules(
      values,
      state.controlLimits!.cl,
      state.controlLimits!.ucl,
      state.controlLimits!.lcl,
      state.nelsonRules,
      metric?.name || ''
    );

    const capability = calculateProcessCapability(
      qualityData.map(d => d.value),
      metric?.usl,
      metric?.lsl
    );

    set({
      qualityData,
      subgroups,
      alarms,
      processCapability: {
        ...capability,
        sampleSize: qualityData.length,
        calculatedAt: Date.now(),
      },
      lastUpdateTime: Date.now(),
    });
  },

  recalculateControlLimits: () => {
    const state = get();
    const metric = state.metricsConfig.find(m => m.id === state.currentMetric);
    
    if (state.chartType === 'xbar-r') {
      const limitsCalc = calculateXbarRControlLimits(state.subgroups, state.subgroupSize);
      set({
        controlLimits: {
          ...state.controlLimits!,
          ...limitsCalc,
          calculatedAt: Date.now(),
        },
      });
    } else {
      const values = state.qualityData.map(d => d.value);
      const limitsCalc = calculateIMRControlLimits(values);
      set({
        controlLimits: {
          ...state.controlLimits!,
          ...limitsCalc,
          calculatedAt: Date.now(),
        },
      });
    }
  },

  toggleRealTimeMode: () => {
    set(state => ({ isRealTimeMode: !state.isRealTimeMode }));
  },

  switchBatch: () => {
    const state = get();
    const metric = state.metricsConfig.find(m => m.id === state.currentMetric);
    if (!metric) return;

    const newQualityData = generateQualityData(30, metric.target, (metric.usl - metric.lsl) / 8, Date.now());
    const qualityData = [...newQualityData];
    
    let subgroups: SubgroupData[] = [];
    if (state.chartType === 'xbar-r') {
      subgroups = generateSubgroups(qualityData, state.subgroupSize);
    }

    const limitsCalc = state.chartType === 'xbar-r'
      ? calculateXbarRControlLimits(subgroups, state.subgroupSize)
      : calculateIMRControlLimits(qualityData.map(d => d.value));

    const controlLimits: ControlLimits = {
      ...state.controlLimits!,
      ...limitsCalc,
      calculatedAt: Date.now(),
      baselinePeriod: '新批次基线',
    };

    const values = state.chartType === 'xbar-r'
      ? subgroups.map(s => s.mean)
      : qualityData.map(d => d.value);
    
    const alarms = checkNelsonRules(
      values,
      controlLimits.cl,
      controlLimits.ucl,
      controlLimits.lcl,
      state.nelsonRules,
      metric.name
    );

    const capability = calculateProcessCapability(
      qualityData.map(d => d.value),
      metric.usl,
      metric.lsl
    );

    set({
      qualityData,
      subgroups,
      controlLimits,
      alarms,
      processCapability: {
        ...capability,
        sampleSize: qualityData.length,
        calculatedAt: Date.now(),
      },
      lastUpdateTime: Date.now(),
    });
  },
}));
