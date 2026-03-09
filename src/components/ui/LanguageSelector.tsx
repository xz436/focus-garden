"use client";

import { Language, LANGUAGES } from "@/lib/i18n";
import { useLanguage } from "@/components/providers/LanguageProvider";

export default function LanguageSelector({ compact }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex gap-2">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.value}
          onClick={() => setLanguage(lang.value)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
            language === lang.value
              ? "border-green-400 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
              : "border-card-border hover:bg-gray-50 dark:hover:bg-gray-800 text-muted"
          }`}
        >
          <span>{lang.value === "en" ? "🇺🇸" : "🇨🇳"}</span>
          {!compact && <span>{lang.nativeLabel}</span>}
          {compact && <span>{lang.value === "en" ? "EN" : "中文"}</span>}
        </button>
      ))}
    </div>
  );
}
