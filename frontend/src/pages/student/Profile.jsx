import { Link } from 'react-router-dom';
import { Award, BookOpen, Mail, Phone, Target, TrendingUp } from 'lucide-react';
import { Badge, Button, Card } from '../../components/ui';
import { useAuth } from '../../auth/AuthContext';
import { useI18n } from '../../i18n';
import MyCourses from '../../components/MyCourses';
import AchievementsSummary from '../../components/AchievementsSummary';
import AvatarUpload from '../../components/AvatarUpload';
import { formatMonthYear } from '../../utils/dates';



function Empty({ icon: Icon, text, children }) {
  return (
    <div className="flex flex-col items-start gap-3 text-sm text-ink-muted">
      <Icon size={22} className="text-slate-300" aria-hidden="true" />
      <p>{text}</p>
      {children}
    </div>
  );
}

export default function StudentProfile() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const student = user.student;
  const goalKey = student?.goal ? student.goal.toLowerCase() : 'notSure';
  const since = formatMonthYear(user.createdAt, lang);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl">{t('profile.title')}</h1>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center gap-5">
          <AvatarUpload />
          <div className="min-w-0">
            <h2 className="text-xl">{user.fullName}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="blue">{t('auth.gradeFormat').replace('{n}', student?.grade)}</Badge>
              <Badge tone="neutral">{t('profile.memberSince')}: {since}</Badge>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 border-t border-line pt-5 text-sm sm:grid-cols-2">
          <p className="flex items-center gap-2 text-navy">
            <Mail size={16} className="text-brand" aria-hidden="true" />
            <span className="break-all">{user.email}</span>
          </p>
          <p className="flex items-center gap-2 text-navy">
            <Phone size={16} className="text-brand" aria-hidden="true" />
            {user.phone}
          </p>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <MyCourses />

        <Card title={t('profile.goalTitle')}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-control bg-teal-soft text-teal-dark">
              <Target size={20} aria-hidden="true" />
            </span>
            <p className="font-semibold text-navy">{t(`auth.goals.${goalKey}`)}</p>
          </div>
        </Card>

        <AchievementsSummary />

        <Card title={t('profile.progressTitle')}>
          <Empty icon={TrendingUp} text={t('profile.noProgress')} />
        </Card>
      </div>
    </div>
  );
}