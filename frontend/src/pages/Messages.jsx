import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { Badge, Button, Card, Input } from '../components/ui';
import DataState from '../components/DataState';
import { api } from '../api';
import { apiErrorText } from '../auth/errorMessage';
import { useAuth } from '../auth/AuthContext';
import { useApi } from '../hooks/useApi';
import { formatMessageTime } from '../utils/dates';
import { useI18n } from '../i18n';

const SHOWN = 20;

export default function Messages() {
  const { t, lang } = useI18n();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const isStudent = user.role === 'STUDENT';
  const base = `/${user.role.toLowerCase()}/messages`;

  const list = useApi('/messages/conversations');
  const contacts = useApi('/messages/contacts');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  const all = contacts.data ? contacts.data.contacts : [];
  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase();
    return needle ? all.filter((c) => c.fullName.toLocaleLowerCase().includes(needle)) : all;
  }, [all, q]);
  const shown = filtered.slice(0, SHOWN);

  const open = async (contact) => {
    if (contact.conversationId) return navigate(`${base}/${contact.conversationId}`);
    setBusy(contact.id);
    setError('');
    try {
      const res = await api('/messages/conversations', { method: 'POST', token, body: { contactId: contact.id } });
      navigate(`${base}/${res.conversation.id}`);
    } catch (e) {
      setError(apiErrorText(t, e));
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl">{t('ms.title')}</h1>
      <p className="mb-6 mt-1 text-ink-muted">{t('ms.sub')}</p>

      <Card title={t('ms.conversations')}>
        <DataState loading={list.loading} error={list.error} onRetry={list.reload}>
          {list.data && (list.data.conversations.length === 0 ? (
            <div className="flex flex-col items-start gap-3 text-sm text-ink-muted">
              <MessageSquare size={22} className="text-slate-300" aria-hidden="true" />
              <p>{t('ms.none')}</p>
            </div>
          ) : (
            <ul className="-mx-3 divide-y divide-line">
              {list.data.conversations.map((c) => (
                <li key={c.id}>
                  <Link to={`${base}/${c.id}`} className="flex items-start justify-between gap-3 px-3 py-3 hover:bg-surface">
                    <div className="min-w-0">
                      <p className={`truncate text-navy ${c.unread ? 'font-bold' : 'font-semibold'}`}>{c.other.fullName}</p>
                      <p className={`truncate text-sm ${c.unread ? 'font-semibold text-navy' : 'text-ink-muted'}`}>
                        {c.last.mine ? t('ms.you') : ''}{c.last.text}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-xs text-ink-muted">{formatMessageTime(c.last.at, lang)}</span>
                      {c.unread && <Badge tone="blue">{t('ms.unread')}</Badge>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </DataState>
      </Card>

      <Card title={t('ms.newTitle')} className="mt-4">
        <DataState loading={contacts.loading} error={contacts.error} onRetry={contacts.reload}>
          {contacts.data && (all.length === 0 ? (
            <p className="text-sm text-ink-muted">{isStudent ? t('ms.noContactsStudent') : t('ms.noContactsTeacher')}</p>
          ) : (
            <>
              {all.length > 8 && (
                <Input
                  type="search" label={t('ms.searchLabel')} placeholder={t('ms.searchPlaceholder')}
                  value={q} onChange={(e) => setQ(e.target.value)} className="mb-4"
                />
              )}

              {error && (
                <p role="alert" className="mb-3 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}

              {shown.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('ms.noMatches')}</p>
              ) : (
                <ul className="divide-y divide-line">
                  {shown.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-navy">{c.fullName}</p>
                        <p className="text-sm text-ink-muted">
                          {isStudent ? t(`auth.subjects.${c.subject}`) : t('auth.gradeFormat').replace('{n}', c.grade)}
                        </p>
                      </div>
                      <Button
                        size="sm" variant="secondary" disabled={busy === c.id}
                        aria-label={`${t('ms.startChat')}: ${c.fullName}`} onClick={() => open(c)}
                      >
                        {t('ms.startChat')}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              {filtered.length > SHOWN && <p className="mt-3 text-xs text-ink-muted">{t('ms.moreContacts')}</p>}
            </>
          ))}
        </DataState>
      </Card>
    </div>
  );
}