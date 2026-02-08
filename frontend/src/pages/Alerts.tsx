import { useLanguage } from '../context/LanguageContext';

export default function Alerts() {
  const { t } = useLanguage();
  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">{t('nav.alerts')}</h1>
      <p className="mt-1 text-stone-600">Farm alerts and notifications.</p>
      <p className="mt-6 rounded-lg border border-stone-200 bg-stone-50 p-4 text-stone-500">
        {t('dashboard.no_alerts')}
      </p>
    </div>
  );
}
