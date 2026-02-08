/**
 * FarmOverviewCard – soil moisture, temperature, battery with color coding.
 * Mobile-first, high contrast for outdoor viewing.
 */
import { useLanguage } from '../../context/LanguageContext';

export type StatusLevel = 'good' | 'low' | 'critical';

interface MetricProps {
  label: string;
  value: number | null;
  unit: string;
  status: StatusLevel;
}

function getStatusStyles(status: StatusLevel): string {
  switch (status) {
    case 'good':
      return 'bg-contrast-ok/15 text-contrast-ok border-contrast-ok/40';
    case 'low':
      return 'bg-contrast-warn/15 text-contrast-warn border-contrast-warn/40';
    case 'critical':
      return 'bg-contrast-danger/15 text-contrast-danger border-contrast-danger/40';
    default:
      return 'bg-stone-100 text-contrast-text border-stone-300';
  }
}

function getStatusLabel(status: StatusLevel, t: (k: string) => string): string {
  switch (status) {
    case 'good': return t('dashboard.good');
    case 'low': return t('dashboard.low');
    case 'critical': return t('dashboard.critical');
    default: return '—';
  }
}

function Metric({ label, value, unit, status }: MetricProps) {
  const { t } = useLanguage();
  const display = value != null ? `${value}${unit}` : '—';
  return (
    <div
      className={`rounded-lg border-2 p-4 print-break-inside-avoid ${getStatusStyles(status)}`}
      role="group"
      aria-label={`${label}: ${display}`}
    >
      <p className="text-sm font-semibold uppercase tracking-wide opacity-90">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{display}</p>
      <p className="mt-0.5 text-xs font-medium opacity-90">{getStatusLabel(status, t)}</p>
    </div>
  );
}

export interface FarmOverviewCardProps {
  soilMoisture: number | null;
  temperature: number | null;
  battery: number | null;
  className?: string;
}

function getMoistureStatus(v: number | null): StatusLevel {
  if (v == null) return 'good';
  if (v < 15) return 'critical';
  if (v < 30) return 'low';
  return 'good';
}

function getTempStatus(v: number | null): StatusLevel {
  if (v == null) return 'good';
  if (v > 38) return 'critical';
  if (v > 32) return 'low';
  return 'good';
}

function getBatteryStatus(v: number | null): StatusLevel {
  if (v == null) return 'good';
  if (v < 15) return 'critical';
  if (v < 30) return 'low';
  return 'good';
}

export default function FarmOverviewCard({
  soilMoisture,
  temperature,
  battery,
  className = '',
}: FarmOverviewCardProps) {
  const { t } = useLanguage();
  return (
    <section
      className={`rounded-xl border-2 border-contrast-border bg-contrast-surface p-4 shadow-md print:border-black print:shadow-none ${className}`}
      aria-label={t('dashboard.overview')}
    >
      <h2 className="mb-4 text-lg font-bold text-contrast-text print:text-black">
        {t('dashboard.overview')}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric
          label={t('dashboard.soil_moisture')}
          value={soilMoisture}
          unit={t('overview.unit_percent')}
          status={getMoistureStatus(soilMoisture)}
        />
        <Metric
          label={t('dashboard.temperature')}
          value={temperature}
          unit={t('overview.unit_celsius')}
          status={getTempStatus(temperature)}
        />
        <Metric
          label={t('dashboard.battery')}
          value={battery}
          unit={t('overview.unit_percent')}
          status={getBatteryStatus(battery)}
        />
      </div>
    </section>
  );
}
