class I18n {
  constructor() {
    this.translations = {};
    this.currentLocale = 'en-US';
    this.fallbackLocale = 'en-US';
    this.supportedLocales = ['en-US', 'pt-BR', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP'];
  }

  async init() {
    const browserLang = this.detectBrowserLanguage();
    await this.loadTranslations(browserLang);
    document.documentElement.lang = this.currentLocale;
    this.translatePage();
    return this.currentLocale;
  }

  detectBrowserLanguage() {
    const languages = navigator.languages || [navigator.language || navigator.userLanguage || 'en-US'];
    
    for (const lang of languages) {
      if (this.supportedLocales.includes(lang)) return lang;
      const baseLang = lang.split('-')[0];
      const match = this.supportedLocales.find(locale => locale.startsWith(baseLang));
      if (match) return match;
    }
    return this.fallbackLocale;
  }

  async loadTranslations(locale) {
    try {
      const response = await fetch(`public/locales/${locale}.json`);
      if (response.ok) {
        this.translations = await response.json();
        this.currentLocale = locale;
      } else {
        throw new Error(`Failed to load ${locale}`);
      }
    } catch (error) {
      if (locale !== this.fallbackLocale) {
        try {
          const fallbackResponse = await fetch(`public/locales/${this.fallbackLocale}.json`);
          this.translations = await fallbackResponse.json();
          this.currentLocale = this.fallbackLocale;
        } catch (fallbackError) {
          this.translations = {};
        }
      }
    }
  }

  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }
    
    if (typeof value === 'string' && Object.keys(params).length > 0) {
      return value.replace(/\{(\w+)\}/g, (match, param) => params[param] ?? match);
    }
    
    return value;
  }

  translatePage() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);
      
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        if (element.hasAttribute('placeholder')) element.placeholder = translation;
      } else {
        element.textContent = translation;
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      element.placeholder = this.t(element.getAttribute('data-i18n-placeholder'));
    });

    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      element.title = this.t(element.getAttribute('data-i18n-title'));
    });
  }

  async changeLanguage(locale) {
    if (!this.supportedLocales.includes(locale)) return false;
    
    await this.loadTranslations(locale);
    document.documentElement.lang = this.currentLocale;
    this.translatePage();
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { locale: this.currentLocale } }));
    return true;
  }

  getLocale() {
    return this.currentLocale;
  }

  getSupportedLocales() {
    return this.supportedLocales;
  }
}

window.i18n = new I18n();
export default window.i18n;
