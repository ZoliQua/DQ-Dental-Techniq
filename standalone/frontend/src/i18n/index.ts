import { hu } from './hu';
import { en } from './en';
import { de } from './de';
import type { TranslationKeys } from './hu';

export type AppLanguage = 'hu' | 'en' | 'de';

const translations: Record<AppLanguage, TranslationKeys> = { hu, en, de };

export function getTranslations(lang: AppLanguage): TranslationKeys {
  return translations[lang] || hu;
}

export type { TranslationKeys };
