import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import me from "./locales/me.json";
import en from "./locales/en.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      me: { translation: me },
      en: { translation: en },
      // ru: { translation: ru }, // future: Russian
    },
    fallbackLng: "me",
    supportedLngs: ["me", "en"],
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "prodajme_lang",
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
