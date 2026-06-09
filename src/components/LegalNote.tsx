import { useSettings } from '../contexts/SettingsContext';

export function LegalNote() {
  const { settings } = useSettings();
  return <p className="legal-note">{settings.legalNote}</p>;
}
