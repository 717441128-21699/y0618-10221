import { QualityDataPoint, SubgroupData, DefectCause, ShiftData, MachineData, SPCReport } from '@/types';
import { calculateMean, calculateRange } from '@/utils/statistics';

function randomNormal(mean: number, stdDev: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function generateQualityData(
  count: number,
  mean: number = 50,
  stdDev: number = 2,
  startTimestamp?: number
): QualityDataPoint[] {
  const data: QualityDataPoint[] = [];
  const now = startTimestamp || Date.now();
  
  const shifts = ['早班', '中班', '晚班'];
  const machines = ['CNC-001', 'CNC-002', 'CNC-003', 'CNC-004'];
  
  for (let i = 0; i < count; i++) {
    const timestamp = now - (count - i) * 5 * 60 * 1000;
    const shiftIndex = Math.floor(i / 24) % 3;
    const machineIndex = i % 4;
    
    let value = randomNormal(mean, stdDev);
    
    if (i > count * 0.7 && i < count * 0.75) {
      value += stdDev * 2.5;
    }
    if (i > count * 0.85 && i < count * 0.9) {
      value -= stdDev * 1.8;
    }
    
    data.push({
      id: `data-${i}`,
      timestamp,
      value: parseFloat(value.toFixed(3)),
      batchId: `BATCH-${String(Math.floor(i / 48) + 1).padStart(3, '0')}`,
      shiftId: shifts[shiftIndex],
      machineId: machines[machineIndex],
      subgroupIndex: Math.floor(i / 5),
    });
  }
  
  return data;
}

export function generateSubgroups(
  qualityData: QualityDataPoint[],
  subgroupSize: number = 5
): SubgroupData[] {
  const subgroups: SubgroupData[] = [];
  const numSubgroups = Math.floor(qualityData.length / subgroupSize);
  
  for (let i = 0; i < numSubgroups; i++) {
    const start = i * subgroupSize;
    const end = start + subgroupSize;
    const values = qualityData.slice(start, end).map(d => d.value);
    
    subgroups.push({
      index: i,
      timestamp: qualityData[end - 1]?.timestamp || 0,
      values,
      mean: parseFloat(calculateMean(values).toFixed(3)),
      range: parseFloat(calculateRange(values).toFixed(3)),
      batchId: qualityData[start]?.batchId || 'BATCH-001',
      shiftId: qualityData[start]?.shiftId || '早班',
      machineId: qualityData[start]?.machineId || 'CNC-001',
    });
  }
  
  return subgroups;
}

export function generateDefectCauses(): DefectCause[] {
  const causes = [
    { name: '尺寸超差', category: '尺寸类', count: 45 },
    { name: '表面粗糙度', category: '表面质量', count: 32 },
    { name: '形位公差', category: '尺寸类', count: 28 },
    { name: '硬度不足', category: '材料类', count: 18 },
    { name: '裂纹', category: '缺陷类', count: 15 },
    { name: '毛刺', category: '表面质量', count: 12 },
    { name: '色差', category: '外观类', count: 8 },
    { name: '划伤', category: '表面质量', count: 6 },
    { name: '装配不良', category: '装配类', count: 5 },
    { name: '其他', category: '其他', count: 4 },
  ];
  
  const total = causes.reduce((sum, c) => sum + c.count, 0);
  let cumulative = 0;
  
  return causes.map((cause, index) => {
    cumulative += cause.count;
    return {
      id: `cause-${index}`,
      name: cause.name,
      category: cause.category,
      count: cause.count,
      percentage: parseFloat(((cause.count / total) * 100).toFixed(2)),
      cumulativePercentage: parseFloat(((cumulative / total) * 100).toFixed(2)),
    };
  });
}

export function generateShiftData(): ShiftData[] {
  return [
    { shiftId: 'morning', shiftName: '早班', mean: 50.12, stdDev: 1.85, cpk: 1.42, defectRate: 0.85, sampleCount: 240 },
    { shiftId: 'afternoon', shiftName: '中班', mean: 49.87, stdDev: 2.12, cpk: 1.28, defectRate: 1.24, sampleCount: 240 },
    { shiftId: 'night', shiftName: '晚班', mean: 50.35, stdDev: 2.45, cpk: 1.15, defectRate: 1.67, sampleCount: 240 },
  ];
}

export function generateMachineData(): MachineData[] {
  return [
    { machineId: 'cnc-001', machineName: 'CNC-001', mean: 49.95, stdDev: 1.78, cpk: 1.52, alarmCount: 3, sampleCount: 180 },
    { machineId: 'cnc-002', machineName: 'CNC-002', mean: 50.23, stdDev: 2.05, cpk: 1.35, alarmCount: 5, sampleCount: 180 },
    { machineId: 'cnc-003', machineName: 'CNC-003', mean: 49.68, stdDev: 2.34, cpk: 1.18, alarmCount: 8, sampleCount: 180 },
    { machineId: 'cnc-004', machineName: 'CNC-004', mean: 50.45, stdDev: 1.92, cpk: 1.41, alarmCount: 4, sampleCount: 180 },
  ];
}

export function generateReports(): SPCReport[] {
  const now = Date.now();
  return [
    { id: 'report-001', name: '2024年6月SPC月度分析报告', createdAt: now - 86400000 * 2, periodStart: now - 86400000 * 32, periodEnd: now - 86400000 * 2, metrics: ['外径尺寸', '内径尺寸', '表面粗糙度'], status: 'completed' },
    { id: 'report-002', name: '第一周质量分析报告', createdAt: now - 86400000 * 5, periodStart: now - 86400000 * 12, periodEnd: now - 86400000 * 5, metrics: ['外径尺寸', '圆度'], status: 'completed' },
    { id: 'report-003', name: 'CNC-003专项分析', createdAt: now - 86400000 * 8, periodStart: now - 86400000 * 15, periodEnd: now - 86400000 * 8, metrics: ['外径尺寸'], status: 'completed' },
  ];
}

export const METRICS_CONFIG = [
  { id: 'outer-diameter', name: '外径尺寸', unit: 'mm', usl: 50.1, lsl: 49.9, target: 50.0 },
  { id: 'inner-diameter', name: '内径尺寸', unit: 'mm', usl: 25.05, lsl: 24.95, target: 25.0 },
  { id: 'surface-roughness', name: '表面粗糙度', unit: 'μm', usl: 1.6, lsl: 0.2, target: 0.8 },
  { id: 'roundness', name: '圆度', unit: 'μm', usl: 5.0, lsl: 0, target: 2.0 },
  { id: 'hardness', name: '硬度', unit: 'HRC', usl: 65, lsl: 55, target: 60 },
  { id: 'height', name: '高度', unit: 'mm', usl: 30.05, lsl: 29.95, target: 30.0 },
];
