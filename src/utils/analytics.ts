import { QualityDataPoint, ShiftData, MachineData, DefectCause } from '@/types';
import { calculateMean, calculateStdDev } from './statistics';
import { calculateProcessCapability } from './spc';

export function calculateShiftData(
  data: QualityDataPoint[],
  target: number = 50,
  usl?: number,
  lsl?: number
): ShiftData[] {
  const shifts = ['早班', '中班', '晚班'];
  
  return shifts.map((shiftName, index) => {
    const shiftId = `shift-${index + 1}`;
    const shiftData = data.filter(d => d.shiftId === shiftName);
    const values = shiftData.map(d => d.value);
    
    if (values.length === 0) {
      return {
        shiftId,
        shiftName,
        mean: target,
        stdDev: 0,
        cpk: 0,
        qualifiedRate: 0,
        alarmCount: 0,
        meanOffset: 0,
        sampleCount: 0,
      };
    }

    const mean = calculateMean(values);
    const stdDev = calculateStdDev(values, mean);
    const capability = calculateProcessCapability(values, usl, lsl);
    
    let qualifiedCount = 0;
    if (usl !== undefined && lsl !== undefined) {
      qualifiedCount = values.filter(v => v >= lsl && v <= usl).length;
    } else if (usl !== undefined) {
      qualifiedCount = values.filter(v => v <= usl).length;
    } else if (lsl !== undefined) {
      qualifiedCount = values.filter(v => v >= lsl).length;
    } else {
      qualifiedCount = values.length;
    }
    
    const qualifiedRate = (qualifiedCount / values.length) * 100;
    const meanOffset = Math.abs(mean - target) / (target || 1) * 100;
    
    const sigma = (usl && lsl) ? (usl - lsl) / 6 : stdDev || 1;
    const exceedingCount = values.filter(v => 
      (usl !== undefined && v > usl) || (lsl !== undefined && v < lsl) ||
      v > mean + 3 * sigma || v < mean - 3 * sigma
    ).length;

    return {
      shiftId,
      shiftName,
      mean,
      stdDev,
      cpk: capability.cpk,
      qualifiedRate,
      alarmCount: exceedingCount,
      meanOffset,
      sampleCount: values.length,
    };
  });
}

export function calculateMachineData(
  data: QualityDataPoint[],
  target: number = 50,
  usl?: number,
  lsl?: number
): MachineData[] {
  const machines = ['CNC-001', 'CNC-002', 'CNC-003', 'CNC-004'];
  
  return machines.map((machineName, index) => {
    const machineId = `machine-${index + 1}`;
    const machineData = data.filter(d => d.machineId === machineName);
    const values = machineData.map(d => d.value);
    
    if (values.length === 0) {
      return {
        machineId,
        machineName,
        mean: target,
        stdDev: 0,
        cpk: 0,
        qualifiedRate: 0,
        alarmCount: 0,
        meanOffset: 0,
        sampleCount: 0,
      };
    }

    const mean = calculateMean(values);
    const stdDev = calculateStdDev(values, mean);
    const capability = calculateProcessCapability(values, usl, lsl);
    
    let qualifiedCount = 0;
    if (usl !== undefined && lsl !== undefined) {
      qualifiedCount = values.filter(v => v >= lsl && v <= usl).length;
    } else if (usl !== undefined) {
      qualifiedCount = values.filter(v => v <= usl).length;
    } else if (lsl !== undefined) {
      qualifiedCount = values.filter(v => v >= lsl).length;
    } else {
      qualifiedCount = values.length;
    }
    
    const qualifiedRate = (qualifiedCount / values.length) * 100;
    const meanOffset = Math.abs(mean - target) / (target || 1) * 100;
    
    const sigma = (usl && lsl) ? (usl - lsl) / 6 : stdDev || 1;
    const exceedingCount = values.filter(v => 
      (usl !== undefined && v > usl) || (lsl !== undefined && v < lsl) ||
      v > mean + 3 * sigma || v < mean - 3 * sigma
    ).length;

    return {
      machineId,
      machineName,
      mean,
      stdDev,
      cpk: capability.cpk,
      qualifiedRate,
      alarmCount: exceedingCount,
      meanOffset,
      sampleCount: values.length,
    };
  });
}

export function calculateDefectCausesFromData(
  data: QualityDataPoint[],
  target: number,
  usl?: number,
  lsl?: number
): DefectCause[] {
  const causeCounts: Record<string, number> = {
    '尺寸超差': 0,
    '表面粗糙度': 0,
    '形位公差': 0,
    '硬度不足': 0,
    '裂纹': 0,
    '毛刺': 0,
    '色差': 0,
    '划伤': 0,
    '装配不良': 0,
    '其他': 0,
  };

  const values = data.map(d => d.value);
  const mean = calculateMean(values);
  const sigma = calculateStdDev(values, mean);

  values.forEach((value) => {
    const deviation = Math.abs(value - target);
    const sigmaDev = sigma > 0 ? deviation / sigma : 0;

    if (usl !== undefined && value > usl) {
      causeCounts['尺寸超差']++;
    } else if (lsl !== undefined && value < lsl) {
      causeCounts['尺寸超差']++;
    } else if (sigmaDev > 2.5) {
      causeCounts['形位公差']++;
    } else if (sigmaDev > 2) {
      causeCounts['表面粗糙度']++;
    } else if (sigmaDev > 1.5) {
      causeCounts['硬度不足']++;
    } else if (sigmaDev > 1) {
      causeCounts['毛刺']++;
    } else {
      causeCounts['其他']++;
    }
  });

  const totalDefects = Object.values(causeCounts).reduce((a, b) => a + b, 0) || 1;
  const sortedCauses = Object.entries(causeCounts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  const categories: Record<string, string> = {
    '尺寸超差': '尺寸类',
    '形位公差': '尺寸类',
    '表面粗糙度': '表面质量',
    '毛刺': '表面质量',
    '划伤': '表面质量',
    '硬度不足': '材料类',
    '裂纹': '缺陷类',
    '色差': '外观类',
    '装配不良': '装配类',
    '其他': '其他',
  };

  let cumulative = 0;
  return sortedCauses.map(([name, count], index) => {
    cumulative += count;
    return {
      id: `cause-${index}`,
      name,
      category: categories[name] || '其他',
      count,
      percentage: parseFloat(((count / totalDefects) * 100).toFixed(2)),
      cumulativePercentage: parseFloat(((cumulative / totalDefects) * 100).toFixed(2)),
    };
  });
}
