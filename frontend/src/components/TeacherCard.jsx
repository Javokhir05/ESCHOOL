import { useState } from 'react';
import { Badge, Card } from './ui';
import { API_URL } from '../api';
import { useI18n } from '../i18n';

const tones = { ielts: 'blue', cefr: 'teal', academic: 'violet' };

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

// A photo appears only when the teacher chose to show it publicly. Otherwise: initials.
export default function TeacherCard({ teacher }) {
  const { t, lang } = useI18n();
  const [broken, setBroken] = useState(false);
  const bio = (lang === 'uz' ? teacher.bioUz || teacher.bioEn : teacher.bioEn || teacher.bioUz) || '';
  const photo = teacher.photo && !broken ? `${API_URL}/api/public/photos/${encodeURIComponent(teacher.photo)}` : null;

  return (
    <Card className="h-full">
      {photo ? (
        <img
          src={photo} alt="" loading="lazy" onError={() => setBroken(true)}
          className="mb-3 h-16 w-16 rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-xl font-bold text-brand"
        >
          {initials(teacher.fullName)}
        </span>
      )}
      <h3 className="text-lg">{teacher.fullName}</h3>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge tone={tones[teacher.subject]}>{t(`auth.subjects.${teacher.subject}`)}</Badge>
        {teacher.experienceYears > 0 && (
          <span className="text-sm text-ink-muted">{t('pt.experience').replace('{n}', teacher.experienceYears)}</span>
        )}
      </div>
      {bio && <p className="mt-3 whitespace-pre-line text-sm text-ink-muted">{bio}</p>}
    </Card>
  );
}