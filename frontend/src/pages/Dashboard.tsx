import { useLanguage } from '../context/LanguageContext';
import FarmOverviewCard from '../components/dashboard/FarmOverviewCard';

export default function Dashboard() {
  const { t } = useLanguage();
  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">{t('nav.dashboard')}</h1>
      <p className="mt-1 text-stone-600">Overview of your farm sensors.</p>
      <div className="mt-6">
        <FarmOverviewCard
          soilMoisture={45}
          temperature={28}
          battery={82}
        />
      </div>
    </div>
  );
}
