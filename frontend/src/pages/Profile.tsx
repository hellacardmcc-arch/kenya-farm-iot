import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Profile() {
  const { farmer, logout } = useAuth();
  const { t } = useLanguage();
  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">{t('nav.profile')}</h1>
      <div className="mt-6 rounded-xl border border-stone-200 bg-white p-6">
        <p><strong>Phone:</strong> {farmer?.phone ?? '—'}</p>
        <p><strong>Name:</strong> {farmer?.name ?? '—'}</p>
        <p><strong>County:</strong> {farmer?.county ?? '—'}</p>
        <button
          type="button"
          onClick={logout}
          className="mt-4 rounded border border-stone-300 px-4 py-2 text-sm hover:bg-stone-50"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
