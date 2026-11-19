import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui';
import DataState from '../components/DataState';
import { api } from '../api';
import { apiErrorText } from '../auth/errorMessage';
import { useAuth } from '../auth/AuthContext';
import { useApi } from '../hooks/useApi';
import { refreshUnread } from '../hooks/useUnread';
import { formatMessageTime } from '../utils/dates';
import { useI18n } from '../i18n';

const MAX_LENGTH = 2000;

function Chat({ id }) {
  const { t, lang } = useI18n();
  const { token, user } = useAuth();
  const base = `/${user.role.toLowerCase()}/messages`;
  const { data, error, loading, status, reload } = useApi(`/messages/conversations/${id}`);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const bottomRef = useRef(null);
  const forceScroll = useRef(true);
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  // Check for new messages every 5 seconds, but only while this tab is visible
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) reloadRef.current();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // When the number of messages changes: scroll down (if already near the bottom) and update the sidebar badge
  const count = data ? data.messages.length : -1;
  useEffect(() => {
    if (!data) return;
    const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 200;
    if (forceScroll.current || nearBottom) bottomRef.current?.scrollIntoView({ block: 'end' });
    forceScroll.current = false;
    refreshUnread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  if (status === 404) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl">{t('ms.notFoundTitle')}</h1>
        <p className="mt-2 text-ink-muted">{t('ms.notFoundText')}</p>
        <Button as={Link} to={base} variant="secondary" className="mt-6">{t('ms.back')}</Button>
      </div>
    );
  }

  const send = async (e) => {
    if (e) e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError('');
    try {
      await api(`/messages/conversations/${id}/messages`, { method: 'POST', token, body: { text: body } });
      setText(''); // the draft is cleared only after the message was really sent
      forceScroll.current = true;
      reload();
    } catch (err) {
      setSendError(apiErrorText(t, err));
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') send();
  };

  return (
    <>
      <Link to={base} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft size={16} aria-hidden="true" />
        {t('ms.back')}
      </Link>

      <DataState loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <h1 className="mt-4 text-2xl">{data.conversation.other.fullName}</h1>

            {data.messages.length === 0 ? (
              <p className="mt-6 text-sm text-ink-muted">{t('ms.emptyConv')}</p>
            ) : (
              <ul role="log" aria-label={data.conversation.other.fullName} className="mt-6 space-y-3">
                {data.messages.map((m) => (
                  <li key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-card px-4 py-2.5 ${
                        m.mine ? 'bg-brand text-white' : 'border border-line bg-white text-ink'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words text-sm">{m.text}</p>
                      <p className={`mt-1 text-xs ${m.mine ? 'text-white/90' : 'text-ink-muted'}`}>
                        {formatMessageTime(m.createdAt, lang)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div ref={bottomRef} />

            {data.conversation.canSend ? (
              <form onSubmit={send} className="sticky bottom-0 -mx-1 mt-4 bg-surface px-1 pb-2 pt-3">
                <label htmlFor="message-text" className="sr-only">{t('ms.placeholder')}</label>
                <textarea
                  id="message-text" rows={3} maxLength={MAX_LENGTH} value={text} placeholder={t('ms.placeholder')}
                  onChange={(e) => { setText(e.target.value); setSendError(''); }}
                  onKeyDown={onKeyDown}
                  className="w-full rounded-control border border-line bg-white px-3 py-2.5 text-sm placeholder:text-ink-muted/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
                {sendError && (
                  <p role="alert" className="mt-2 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{sendError}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-ink-muted">{t('ms.shortcut')}</p>
                  <Button type="submit" disabled={sending || !text.trim()}>
                    {sending ? t('ms.sending') : t('ms.send')}
                  </Button>
                </div>
              </form>
            ) : (
              <p className="mt-6 rounded-control bg-slate-100 px-3 py-2 text-sm text-ink-muted">{t('ms.cantSend')}</p>
            )}
          </>
        )}
      </DataState>
    </>
  );
}

// key= makes React start fresh whenever the conversation changes
export default function Conversation() {
  const { id } = useParams();
  return (
    <div className="mx-auto max-w-3xl">
      <Chat key={id} id={id} />
    </div>
  );
}