export type Language = "en" | "zh";

export const LANGUAGES: { value: Language; label: string; nativeLabel: string }[] = [
  { value: "en", label: "English", nativeLabel: "English" },
  { value: "zh", label: "Chinese", nativeLabel: "中文" },
];

import en from "./translations/en";
import zh from "./translations/zh";

const translations: Record<Language, Record<string, string>> = { en, zh };

export function translate(
  lang: Language,
  key: string,
  params?: Record<string, string | number>
): string {
  let text = translations[lang]?.[key] || translations.en[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`{{${k}}}`, "g"), String(v));
    }
  }
  return text;
}
