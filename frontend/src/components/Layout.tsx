import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Layout() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const { locale, setLocale, t } = useLanguage();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) return <Outlet />;

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="border-b border-stone-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex gap-4">
            <Link to="/" className="font-semibold text-farm-green hover:underline">
              {t('nav.dashboard')}
            </Link>
            <Link to="/sensors" className="text-stone-600 hover:underline">
              {t('nav.sensors')}
            </Link>
            <Link to="/alerts" className="text-stone-600 hover:underline">
              {t('nav.alerts')}
            </Link>
            <Link to="/profile" className="text-stone-600 hover:underline">
              {t('nav.profile')}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setLocale(locale === 'en' ? 'sw' : 'en')}
              className="rounded border border-stone-300 px-2 py-1 text-sm"
            >
              {locale === 'en' ? 'SW' : 'EN'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-stone-500 hover:underline"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-4xl p-4">
        <Outlet />
      </main>
    </div>
  );
}
