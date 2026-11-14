import { LANGUAGES, useI18n } from '../i18n';

export default function LanguageSwitcher({ light = false }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div role="group" aria-label={t('nav.language')} className="inline-flex rounded-control border border-line/60 p-0.5">
      {LANGUAGES.map(({ code, label, short }) => {
        const active = lang === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={active}
            aria-label={label}
            className={`rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${
              active ? 'bg-brand text-white' : light ? 'text-slate-300 hover:text-white' : 'text-ink-muted hover:text-navy'
            }`}
          >
            {short}
          </button>
        );
      })}
    </div>
  );
}