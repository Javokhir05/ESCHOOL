import { Link } from 'react-router-dom';
import { Button } from '../../components/ui';
import { center } from '../../config/center';
import { useI18n } from '../../i18n';

export default function About() {
  const { t, lang } = useI18n();
  const text = ((lang === 'uz' ? center.about.uz || center.about.en : center.about.en || center.about.uz) || '').trim();
  const paragraphs = text ? text.split(/\n{2,}/) : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl sm:text-4xl">{t('ab.title')}</h1>
      <div className="mt-6 space-y-4 text-lg leading-relaxed text-ink">
        {paragraphs.length === 0 ? (
          <p className="text-base text-ink-muted">{t('ab.empty')}</p>
        ) : (
          paragraphs.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)
        )}
      </div>
      <Button as={Link} to="/courses" className="mt-10">{t('ab.explore')}</Button>
    </div>
  );
}