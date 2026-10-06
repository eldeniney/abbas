import AsyncStorage from '@react-native-async-storage/async-storage';
import { reloadAppAsync } from 'expo';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { I18nManager, Platform } from 'react-native';

import { ar, type TranslationKey } from './ar';
import { en } from './en';

export type Language = 'ar' | 'en';
export type { TranslationKey };

const STORAGE_KEY = 'tawwa-rider.language';
const RELOAD_GUARD_KEY = 'tawwa-rider.rtl-reload-at';
const DEFAULT_LANGUAGE: Language = 'ar';

const dictionaries: Record<Language, Record<TranslationKey, string>> = { ar, en };

export type TranslateParams = Record<string, string | number>;
export type Translate = (key: TranslationKey, params?: TranslateParams) => string;

interface I18nValue {
  language: Language;
  isRTL: boolean;
  t: Translate;
  setLanguage: (language: Language) => Promise<void>;
}

const I18nContext = createContext<I18nValue | null>(null);

export function translate(language: Language, key: TranslationKey, params?: TranslateParams): string {
  const template = dictionaries[language][key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

function isLanguage(value: string | null): value is Language {
  return value === 'ar' || value === 'en';
}

/**
 * Native layout direction is process-wide and only changes after a reload.
 * The guard prevents a reload loop if the platform ignores forceRTL.
 */
async function applyDirection(language: Language): Promise<void> {
  const wantRTL = language === 'ar';
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = wantRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
    }
    return;
  }
  if (I18nManager.isRTL === wantRTL) return;
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(wantRTL);
  const last = Number(await AsyncStorage.getItem(RELOAD_GUARD_KEY).catch(() => null));
  if (Number.isFinite(last) && Date.now() - last < 15_000) return;
  await AsyncStorage.setItem(RELOAD_GUARD_KEY, String(Date.now())).catch(() => undefined);
  await reloadAppAsync('Apply layout direction');
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .catch(() => null)
      .then(async (stored) => {
        const initial = isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
        if (cancelled) return;
        setLanguageState(initial);
        await applyDirection(initial);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback(async (next: Language) => {
    await AsyncStorage.setItem(STORAGE_KEY, next);
    setLanguageState(next);
    await applyDirection(next);
  }, []);

  const value = useMemo<I18nValue | null>(() => {
    if (!language) return null;
    return {
      language,
      isRTL: language === 'ar',
      t: (key, params) => translate(language, key, params),
      setLanguage,
    };
  }, [language, setLanguage]);

  if (!value) return null;
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
