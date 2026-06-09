import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { BusinessSettings } from '../types';

export const defaultSettings: BusinessSettings = {
  defaultMarkupPercent: 15,
  markupPercent: 15,
  minMarginRub: 150,
  roundingStep: 10,
  companyName: 'ЗапФормат',
  phone: '+7 900 000-00-00',
  telegram: 'https://t.me/example',
  whatsapp: 'https://wa.me/79000000000',
  city: 'Рязань',
  pickupAddress: 'Рязань, адрес пункта выдачи',
  workingHours: 'Пн-Сб 10:00-19:00',
  legalNote: 'Цена и срок являются предварительными и подтверждаются менеджером.',
  supplierMode: 'demo',
  proxyEnabled: false,
};

export async function getBusinessSettings(): Promise<BusinessSettings> {
  if (!db) return defaultSettings;
  const snapshot = await getDoc(doc(db, 'settings', 'business'));
  return snapshot.exists() ? ({ ...defaultSettings, ...snapshot.data() } as BusinessSettings) : defaultSettings;
}

export async function saveBusinessSettings(settings: BusinessSettings) {
  if (!db) return;
  await setDoc(doc(db, 'settings', 'business'), settings, { merge: true });
}
