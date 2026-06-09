import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { defaultSettings, getBusinessSettings } from '../services/settingsService';
import type { BusinessSettings } from '../types';

interface SettingsContextValue {
  settings: BusinessSettings;
  loading: boolean;
  refreshSettings(): Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<BusinessSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  async function refreshSettings() {
    const next = await getBusinessSettings();
    setSettings(next);
    setLoading(false);
  }

  useEffect(() => {
    refreshSettings().catch(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({ settings, loading, refreshSettings }), [settings, loading]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside SettingsProvider');
  return value;
}
