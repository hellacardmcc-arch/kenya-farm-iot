/**
 * Swahili / English language toggle for Kenyan farmers.
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type Locale = 'en' | 'sw';

interface LanguageContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const translations: Record<Locale, Record<string, string>> = {
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.sensors': 'Sensors',
    'nav.alerts': 'Alerts',
    'nav.profile': 'Profile',
    'dashboard.overview': 'Overview',
    'dashboard.soil_moisture': 'Soil moisture',
    'dashboard.temperature': 'Temperature',
    'dashboard.battery': 'Battery',
    'dashboard.good': 'Good',
    'dashboard.low': 'Low',
    'dashboard.critical': 'Critical',
    'dashboard.moisture_trend': 'Moisture trend (7 days)',
    'dashboard.alerts': 'Alerts',
    'dashboard.mark_read': 'Mark read',
    'dashboard.view_all': 'View all',
    'dashboard.sensor_map': 'Sensor map',
    'dashboard.ussd_actions': 'USSD quick actions',
    'dashboard.no_alerts': 'No alerts',
    'dashboard.no_readings': 'No readings yet',
    'ussd.balance': 'Check balance',
    'ussd.airtime': 'Buy airtime',
    'ussd.mpesa': 'M-Pesa',
    'ussd.agriculture': 'Agriculture tips',
    'print.report': 'Print report',
    'overview.unit_percent': '%',
    'overview.unit_celsius': '°C',
  },
  sw: {
    'nav.dashboard': 'Dashibodi',
    'nav.sensors': 'Sensori',
    'nav.alerts': 'Arifa',
    'nav.profile': 'Wasifu',
    'dashboard.overview': 'Muhtasari',
    'dashboard.soil_moisture': 'Unyevu wa udongo',
    'dashboard.temperature': 'Joto',
    'dashboard.battery': 'Betri',
    'dashboard.good': 'Nzuri',
    'dashboard.low': 'Chini',
    'dashboard.critical': 'Hatari',
    'dashboard.moisture_trend': 'Mwelekeo unyevu (siku 7)',
    'dashboard.alerts': 'Arifa',
    'dashboard.mark_read': 'Weka kusomwa',
    'dashboard.view_all': 'Angalia zote',
    'dashboard.sensor_map': 'Ramani ya sensa',
    'dashboard.ussd_actions': 'Vitendo vya USSD',
    'dashboard.no_alerts': 'Hakuna arifa',
    'dashboard.no_readings': 'Bado hakuna data',
    'ussd.balance': 'Angalia salio',
    'ussd.airtime': 'Nunua dakika',
    'ussd.mpesa': 'M-Pesa',
    'ussd.agriculture': 'Mbinu za kilimo',
    'print.report': 'Chapa ripoti',
    'overview.unit_percent': '%',
    'overview.unit_celsius': '°C',
  },
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = 'kenya-farm-locale';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as Locale) || 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {}
  }, [locale]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);

  const t = useCallback(
    (key: string): string => {
      return translations[locale][key] ?? translations.en[key] ?? key;
    },
    [locale]
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
