import { Clock, ExternalLink, Mail, MapPin, Phone, Send } from 'lucide-react';
import { Card } from '../../components/ui';
import { center } from '../../config/center';
import { useI18n } from '../../i18n';

const httpsOnly = (u) => (/^https:\/\/\S+$/i.test((u || '').trim()) ? u.trim() : null);
const emailOnly = (e) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((e || '').trim()) ? e.trim() : null);
const phoneHref = (p) => {
  const digits = (p || '').replace(/[^\d+]/g, '');
  return digits.length >= 7 ? `tel:${digits}` : null;
};
const pick = (obj, lang) => ((lang === 'uz' ? obj.uz || obj.en : obj.en || obj.uz) || '').trim();

function Row({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-brand-soft text-brand">
        <Icon size={18} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-ink-muted">{label}</p>
        <div className="text-sm font-semibold text-navy">{children}</div>
      </div>
    </div>
  );
}

const linkClass = 'break-words text-brand hover:underline';

export default function Contact() {
  const { t, lang } = useI18n();
  const phone = (center.phone || '').trim();
  const email = emailOnly(center.email);
  const address = pick(center.address, lang);
  const hours = pick(center.hours, lang);
  const map = httpsOnly(center.mapUrl);
  const telegram = httpsOnly(center.telegram);
  const instagram = httpsOnly(center.instagram);
  const hasAny = phone || email || address || hours || map || telegram || instagram;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl sm:text-4xl">{t('ct.title')}</h1>
      <p className="mt-2 text-ink-muted">{t('ct.sub')}</p>

      <Card className="mt-8">
        {!hasAny ? (
          <p className="text-sm text-ink-muted">{t('ct.empty')}</p>
        ) : (
          <div className="space-y-5">
            {phone && (
              <Row icon={Phone} label={t('ct.phone')}>
                {phoneHref(phone) ? <a href={phoneHref(phone)} className={linkClass}>{phone}</a> : phone}
              </Row>
            )}
            {email && (
              <Row icon={Mail} label={t('ct.email')}>
                <a href={`mailto:${email}`} className={linkClass}>{email}</a>
              </Row>
            )}
            {address && (
              <Row icon={MapPin} label={t('ct.address')}>
                <span className="whitespace-pre-line font-semibold">{address}</span>
                {map && (
                  <a href={map} target="_blank" rel="noopener noreferrer" className={`mt-1 flex items-center gap-1 text-xs font-semibold ${linkClass}`}>
                    {t('ct.map')}
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                )}
              </Row>
            )}
            {!address && map && (
              <Row icon={MapPin} label={t('ct.address')}>
                <a href={map} target="_blank" rel="noopener noreferrer" className={linkClass}>{t('ct.map')}</a>
              </Row>
            )}
            {hours && (
              <Row icon={Clock} label={t('ct.hours')}>
                <span className="whitespace-pre-line font-semibold">{hours}</span>
              </Row>
            )}
            {telegram && (
              <Row icon={Send} label={t('ct.telegram')}>
                <a href={telegram} target="_blank" rel="noopener noreferrer" className={linkClass}>{telegram}</a>
              </Row>
            )}
            {instagram && (
              <Row icon={ExternalLink} label={t('ct.instagram')}>
                <a href={instagram} target="_blank" rel="noopener noreferrer" className={linkClass}>{instagram}</a>
              </Row>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}