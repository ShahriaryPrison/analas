"use client";

import { useEffect, useState } from "react";
import { type InsightTypeDef, type InsightDoc } from "@/lib/insight-types";

type Props = {
  typeDef: InsightTypeDef;
};

// UI Translations for the viewer itself
const TRANSLATIONS: Record<string, {
  about: string;
  useCases: string;
  fields: string;
  languageLabel: string;
  noDocs: string;
  keyLabel: string;
  descriptionLabel: string;
}> = {
  en: {
    about: "About this metric",
    useCases: "When to use this",
    fields: "How to configure",
    languageLabel: "Docs Language",
    noDocs: "No documentation available for this chart type.",
    keyLabel: "Field",
    descriptionLabel: "What it means"
  },
  fa: {
    about: "درباره این شاخص",
    useCases: "چه زمانی استفاده کنیم؟",
    fields: "راهنمای تنظیمات",
    languageLabel: "زبان راهنما",
    noDocs: "مستنداتی برای این نوع نمودار وجود ندارد.",
    keyLabel: "فیلد",
    descriptionLabel: "کاربرد و معنی"
  }
};

export default function InsightDocsViewer({ typeDef }: Props) {
  const [locale, setLocale] = useState<string>("en");

  // Load language preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("analas-docs-locale");
    if (saved) {
      setLocale(saved);
    }
  }, []);

  const changeLocale = (newLocale: string) => {
    setLocale(newLocale);
    localStorage.setItem("analas-docs-locale", newLocale);
  };

  // Check which languages are available in typeDef docs
  const availableLocales = typeDef.docs ? Object.keys(typeDef.docs) : ["en"];
  
  // Resolve doc content: fallback to "en" if current locale is not available
  const activeLocale = typeDef.docs && typeDef.docs[locale] ? locale : "en";
  const doc: InsightDoc | undefined = typeDef.docs?.[activeLocale];
  const t = TRANSLATIONS[locale] || TRANSLATIONS.en;

  const isRtl = locale === "fa";

  if (!doc) {
    return (
      <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-white/40 text-xs">
        {t.noDocs}
      </div>
    );
  }

  return (
    <div 
      className={`glass-panel border-emerald-500/10 p-5 rounded-2xl space-y-5 transition-all duration-300 text-sm ${
        isRtl ? "text-right font-sans" : "text-left"
      }`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Header and Language Selector */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{typeDef.icon}</span>
          <span className="font-bold text-white tracking-tight">
            {isRtl && typeDef.id === "trend" ? "روند" : 
             isRtl && typeDef.id === "count" ? "تعداد" : 
             isRtl && typeDef.id === "breakdown" ? "تفکیک" : 
             isRtl && typeDef.id === "multi_trend" ? "مقایسه" : 
             isRtl && typeDef.id === "funnel" ? "قیف" : 
             isRtl && typeDef.id === "metric" ? "شاخص" : 
             isRtl && typeDef.id === "retention" ? "بازگشت کاربران" : 
             typeDef.label}
          </span>
        </div>
        
        {/* Extensible language switcher */}
        <div className="flex items-center gap-1.5" dir="ltr">
          {availableLocales.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => changeLocale(loc)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                locale === loc
                  ? "bg-emerald-400 text-slate-900"
                  : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
              }`}
            >
              {loc === "fa" ? "FA (فارسی)" : loc.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400/80">
          {t.about}
        </h4>
        <p className="text-white/70 leading-relaxed font-light">
          {doc.description}
        </p>
      </div>

      {/* Use Cases */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400/80">
          {t.useCases}
        </h4>
        <ul className={`list-disc ${isRtl ? "pr-4" : "pl-4"} space-y-1 text-white/60 font-light`}>
          {doc.useCases.map((useCase, idx) => (
            <li key={idx} className="leading-relaxed">
              {useCase}
            </li>
          ))}
        </ul>
      </div>

      {/* Field Setup Guide */}
      <div className="space-y-2 pt-1">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400/80">
          {t.fields}
        </h4>
        
        <div className="rounded-xl border border-white/5 bg-slate-950/40 overflow-hidden divide-y divide-white/5 text-xs">
          {typeDef.configFields.map((field) => {
            const fieldExplanation = doc.fields[field.key] || field.label;
            return (
              <div key={field.key} className="p-3 grid grid-cols-3 gap-3 items-start">
                <div className="font-mono text-emerald-300 font-bold break-all">
                  {field.key}
                </div>
                <div className="col-span-2 text-white/60 font-light leading-relaxed">
                  <div className="font-semibold text-white/80 mb-0.5">{field.label}</div>
                  {fieldExplanation}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
