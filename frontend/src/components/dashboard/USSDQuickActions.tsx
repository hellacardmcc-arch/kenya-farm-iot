/**
 * USSDQuickActions – buttons for common Kenyan USSD codes (M-Pesa, balance, etc.).
 * Mobile-first; tap to copy or open tel: link.
 */
import { useLanguage } from '../../context/LanguageContext';

interface USSDItem {
  code: string;
  labelKey: string;
  descriptionKey?: string;
}

const USSD_CODES: USSDItem[] = [
  { code: '*334#', labelKey: 'ussd.mpesa' },
  { code: '*456#', labelKey: 'ussd.balance' },
  { code: '*544#', labelKey: 'ussd.airtime' },
  { code: '*325#', labelKey: 'ussd.agriculture', descriptionKey: 'ussd.agriculture' },
];

export interface USSDQuickActionsProps {
  className?: string;
}

export default function USSDQuickActions({ className = '' }: USSDQuickActionsProps) {
  const { t } = useLanguage();

  function handleAction(code: string) {
    const clean = code.replace(/#/g, '');
    const tel = `tel:${clean}`;
    if ('clipboard' in navigator) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    window.location.href = tel;
  }

  return (
    <section
      className={`rounded-xl border-2 border-contrast-border bg-contrast-surface p-4 shadow-md print:border-black print:shadow-none ${className}`}
      aria-label={t('dashboard.ussd_actions')}
    >
      <h2 className="mb-4 text-lg font-bold text-contrast-text print:text-black">
        {t('dashboard.ussd_actions')}
      </h2>
      <p className="mb-3 text-sm text-contrast-textMuted">
        {t('ussd.dial')} *334# {t('ussd.mpesa')} etc.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {USSD_CODES.map((item) => (
          <button
            type="button"
            key={item.code}
            onClick={() => handleAction(item.code)}
            className="flex flex-col items-center justify-center rounded-lg border-2 border-farm-green bg-farm-green/10 py-4 font-mono text-lg font-bold text-farm-green transition hover:bg-farm-green/20 focus:outline-none focus:ring-2 focus:ring-farm-green print:border-black print:bg-gray-100"
          >
            <span className="text-xl tabular-nums">{item.code}</span>
            <span className="mt-1 text-xs font-semibold text-contrast-text">
              {t(item.labelKey)}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
