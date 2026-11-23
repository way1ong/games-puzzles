// Texts by language: filling parameters, plural forms, numbers, and choosing the language. Each game keeps
// its own dictionaries (games/<game>/i18n/<lang>.json) and passes their language codes here.

export type PluralForms = { other: string } & Partial<Record<Intl.LDMLPluralRule, string>>;
export type Params = Record<string, string | number>;

/** The saved choice, else the first browser language we have, else the fallback. */
export function pickLang(saved: string | null, browser: readonly string[], available: readonly string[], fallback: string): string {
  if (saved && available.includes(saved)) return saved;
  for (const tag of browser) {
    const code = tag.toLowerCase().split('-')[0] ?? '';
    if (available.includes(code)) return code;
  }
  return fallback;
}

export function fmt(text: string, params: Params = {}): string {
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

export function plural(lang: string, n: number, forms: PluralForms, params: Params = {}): string {
  const text = forms[new Intl.PluralRules(lang).select(n)] ?? forms.other;
  return fmt(text, params);
}

export function num(lang: string, n: number): string {
  return new Intl.NumberFormat(lang).format(n);
}
