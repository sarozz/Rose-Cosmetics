"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

// Drives Google Translate from a small EN | नेपाली pill. English is the
// default — the script renders its hidden widget into #google_translate_element
// and we read/write the `goog-te-combo` <select> to flip languages.
//
// Why client-side translate (not full i18n): customer pages are small and
// most traffic lands in English from Instagram. A widget is one button
// for the small subset of customers who'd rather browse in Nepali, with
// no copy duplication. SEO ranks the English source — Google Translate
// runs in the browser after page load.

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    // The translate.google.com script is untyped — use `unknown` so
    // we only touch it through known property accesses.
    google?: {
      translate?: {
        TranslateElement: new (
          opts: {
            pageLanguage: string;
            includedLanguages: string;
            autoDisplay: boolean;
          },
          containerId: string,
        ) => unknown;
      };
    };
  }
}

type Lang = "en" | "ne";

function readCookieLang(): Lang {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/(?:^|; )googtrans=([^;]+)/);
  if (!match) return "en";
  // Google's cookie format is `/<source>/<target>` e.g. `/en/ne`.
  return decodeURIComponent(match[1]).endsWith("/ne") ? "ne" : "en";
}

export function LanguageToggle({ className = "" }: { className?: string }) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    setLang(readCookieLang());
  }, []);

  function switchTo(target: Lang) {
    if (target === lang) return;
    setLang(target);
    // Cookie set BEFORE any navigation so Google Translate applies the
    // same target on subsequent pages too. Cleared by setting back to
    // /en/en (effectively "no translation").
    const value = target === "en" ? "/en/en" : "/en/ne";
    document.cookie = `googtrans=${value}; path=/;`;

    const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
    if (select) {
      select.value = target === "en" ? "" : "ne";
      select.dispatchEvent(new Event("change"));
    } else {
      // Widget hasn't loaded yet — reload picks up the cookie and Google
      // initializes the page in the chosen language.
      window.location.reload();
    }
  }

  return (
    <>
      {/* Hidden container Google injects its widget into. We never show
          the default UI; the pill below is the only visible control. */}
      <div id="google_translate_element" aria-hidden className="hidden" />

      <Script id="google-translate-init" strategy="afterInteractive">{`
        window.googleTranslateElementInit = function () {
          new google.translate.TranslateElement(
            { pageLanguage: 'en', includedLanguages: 'en,ne', autoDisplay: false },
            'google_translate_element'
          );
        };
      `}</Script>
      <Script
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />

      <div
        role="group"
        aria-label="Language"
        className={`inline-flex items-center rounded-full border border-stone-300 bg-white/70 p-0.5 text-xs font-semibold notranslate ${className}`}
        translate="no"
      >
        <button
          type="button"
          onClick={() => switchTo("en")}
          aria-pressed={lang === "en"}
          className={`rounded-full px-3 py-1 transition-colors ${
            lang === "en"
              ? "bg-rose-600 text-white"
              : "text-stone-600 hover:text-rose-600"
          }`}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => switchTo("ne")}
          aria-pressed={lang === "ne"}
          className={`rounded-full px-3 py-1 transition-colors ${
            lang === "ne"
              ? "bg-rose-600 text-white"
              : "text-stone-600 hover:text-rose-600"
          }`}
        >
          नेपाली
        </button>
      </div>
    </>
  );
}
