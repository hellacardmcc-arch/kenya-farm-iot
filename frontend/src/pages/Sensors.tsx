import { useLanguage } from '../context/LanguageContext';

export default function Sensors() {
  const { t } = useLanguage();
  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">{t('nav.sensors')}</h1>
      <p className="mt-1 text-stone-600">Manage your farm sensors.</p>
      <p className="mt-6 rounded-lg border border-stone-200 bg-stone-50 p-4 text-stone-500">
        No sensors yet.
      </p>
    </div>
  );
}
