import { LANGUAGES, useI18n } from './i18n';

export default function App() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="mx-auto max-w-xl p-8">
      <h1 className="text-3xl">{t('brand')}</h1>
      <p className="mt-2 text-ink-muted">{t('home.heroTitle')}</p>
      <p className="mt-1 text-sm text-ink-muted">{t('nav.teachers')} · {t('dash.achievements')}</p>

      <div className="mt-6 flex gap-2">
        {LANGUAGES.map(({ code, short }) => (
          <button
            key={code}
            onClick={() => setLang(code)}
            className={`rounded-control px-4 py-2 text-sm font-bold ${
              lang === code ? 'bg-brand text-white' : 'border border-line bg-white text-navy'
            }`}
          >
            {short}
          </button>
        ))}
      </div>
    </div>
  );
}