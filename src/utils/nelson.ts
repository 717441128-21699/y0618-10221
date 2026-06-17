import { AlarmRecord } from '@/types';

export interface NelsonRuleConfig {
  id: number;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'warning' | 'critical';
}

export const DEFAULT_NELSON_RULES: NelsonRuleConfig[] = [
  {
    id: 1,
    name: '单点超出3σ',
    description: '有一个点落在控制限以外（距离中心线超过3σ）',
    enabled: true,
    severity: 'critical',
  },
  {
    id: 2,
    name: '连续9点同侧',
    description: '连续9个点落在中心线同一侧',
    enabled: true,
    severity: 'warning',
  },
  {
    id: 3,
    name: '连续6点递增/递减',
    description: '连续6个点持续上升或持续下降',
    enabled: true,
    severity: 'warning',
  },
  {
    id: 4,
    name: '连续14点交替波动',
    description: '连续14个点交替上下波动',
    enabled: true,
    severity: 'warning',
  },
  {
    id: 5,
    name: '3点中2点超2σ',
    description: '连续3个点中有2个落在2σ控制限以外（同侧）',
    enabled: true,
    severity: 'warning',
  },
  {
    id: 6,
    name: '5点中4点超1σ',
    description: '连续5个点中有4个落在1σ控制限以外（同侧）',
    enabled: true,
    severity: 'warning',
  },
  {
    id: 7,
    name: '连续15点在1σ内',
    description: '连续15个点落在中心线±1σ范围内',
    enabled: true,
    severity: 'warning',
  },
  {
    id: 8,
    name: '连续8点超1σ',
    description: '连续8个点落在中心线±1σ范围以外（两侧）',
    enabled: true,
    severity: 'warning',
  },
];

export function checkNelsonRules(
  values: number[],
  cl: number,
  ucl: number,
  lcl: number,
  rules: NelsonRuleConfig[],
  metricName: string
): AlarmRecord[] {
  const alarms: AlarmRecord[] = [];
  const sigma = (ucl - cl) / 3;
  const oneSigma = sigma;
  const twoSigma = 2 * sigma;

  if (sigma <= 0 || values.length === 0) return alarms;

  const enabledRules = rules.filter(r => r.enabled);

  for (const rule of enabledRules) {
    const ruleAlarms = checkSingleRule(values, cl, ucl, lcl, oneSigma, twoSigma, rule, metricName);
    alarms.push(...ruleAlarms);
  }

  const uniqueAlarms = alarms.reduce((acc: AlarmRecord[], curr) => {
    const exists = acc.find(a => a.dataPointIndex === curr.dataPointIndex && a.ruleId === curr.ruleId);
    if (!exists) acc.push(curr);
    return acc;
  }, []);

  return uniqueAlarms.sort((a, b) => a.dataPointIndex - b.dataPointIndex);
}

function checkSingleRule(
  values: number[],
  cl: number,
  ucl: number,
  lcl: number,
  oneSigma: number,
  twoSigma: number,
  rule: NelsonRuleConfig,
  metricName: string
): AlarmRecord[] {
  const alarms: AlarmRecord[] = [];
  const timestamp = Date.now();

  switch (rule.id) {
    case 1:
      for (let i = 0; i < values.length; i++) {
        if (values[i] > ucl || values[i] < lcl) {
          alarms.push(createAlarm(rule, i, values[i], metricName, timestamp + i * 60000));
        }
      }
      break;

    case 2:
      for (let i = 8; i < values.length; i++) {
        const allAbove = values.slice(i - 8, i + 1).every(v => v > cl);
        const allBelow = values.slice(i - 8, i + 1).every(v => v < cl);
        if (allAbove || allBelow) {
          alarms.push(createAlarm(rule, i, values[i], metricName, timestamp + i * 60000));
          break;
        }
      }
      break;

    case 3:
      for (let i = 5; i < values.length; i++) {
        const increasing = values.slice(i - 5, i + 1).every((v, idx, arr) => idx === 0 || v > arr[idx - 1]);
        const decreasing = values.slice(i - 5, i + 1).every((v, idx, arr) => idx === 0 || v < arr[idx - 1]);
        if (increasing || decreasing) {
          alarms.push(createAlarm(rule, i, values[i], metricName, timestamp + i * 60000));
          break;
        }
      }
      break;

    case 4:
      for (let i = 13; i < values.length; i++) {
        const segment = values.slice(i - 13, i + 1);
        let alternating = true;
        for (let j = 1; j < segment.length; j++) {
          const prev = segment[j - 1];
          const curr = segment[j];
          const prevDir = j >= 2 ? segment[j - 1] - segment[j - 2] : curr - prev;
          const currDir = curr - prev;
          if (prevDir * currDir >= 0 && j >= 2) {
            alternating = false;
            break;
          }
        }
        if (alternating && i > 13) {
          alarms.push(createAlarm(rule, i, values[i], metricName, timestamp + i * 60000));
          break;
        }
      }
      break;

    case 5:
      for (let i = 2; i < values.length; i++) {
        const segment = values.slice(i - 2, i + 1);
        const aboveTwoSigma = segment.filter(v => v > cl + twoSigma).length;
        const belowTwoSigma = segment.filter(v => v < cl - twoSigma).length;
        if (aboveTwoSigma >= 2 || belowTwoSigma >= 2) {
          alarms.push(createAlarm(rule, i, values[i], metricName, timestamp + i * 60000));
          break;
        }
      }
      break;

    case 6:
      for (let i = 4; i < values.length; i++) {
        const segment = values.slice(i - 4, i + 1);
        const aboveOneSigma = segment.filter(v => v > cl + oneSigma).length;
        const belowOneSigma = segment.filter(v => v < cl - oneSigma).length;
        if (aboveOneSigma >= 4 || belowOneSigma >= 4) {
          alarms.push(createAlarm(rule, i, values[i], metricName, timestamp + i * 60000));
          break;
        }
      }
      break;

    case 7:
      for (let i = 14; i < values.length; i++) {
        const segment = values.slice(i - 14, i + 1);
        const allWithinOneSigma = segment.every(v => v > cl - oneSigma && v < cl + oneSigma);
        if (allWithinOneSigma) {
          alarms.push(createAlarm(rule, i, values[i], metricName, timestamp + i * 60000));
          break;
        }
      }
      break;

    case 8:
      for (let i = 7; i < values.length; i++) {
        const segment = values.slice(i - 7, i + 1);
        const allOutsideOneSigma = segment.every(v => v > cl + oneSigma || v < cl - oneSigma);
        if (allOutsideOneSigma) {
          alarms.push(createAlarm(rule, i, values[i], metricName, timestamp + i * 60000));
          break;
        }
      }
      break;
  }

  return alarms;
}

function createAlarm(
  rule: NelsonRuleConfig,
  dataPointIndex: number,
  value: number,
  metricName: string,
  timestamp: number,
  metricId: string = ''
): AlarmRecord {
  return {
    id: `${rule.id}-${dataPointIndex}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp,
    metricName,
    metricId,
    ruleId: rule.id,
    ruleName: rule.name,
    severity: rule.severity,
    dataPointIndex,
    value,
    acknowledged: false,
  };
}

export function getSeverityColor(severity: 'warning' | 'critical'): string {
  return severity === 'critical' ? '#EF4444' : '#F59E0B';
}
