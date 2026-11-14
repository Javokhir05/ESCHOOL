import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from '../components/Logo';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { Button } from '../components/ui';
import { publicNav } from '../config/navigation';
import { useI18n } from '../i18n';

const linkClass = ({ isActive }) =>
  `rounded-control px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-soft text-brand' : 'text-ink-muted hover:text-navy'
  }`;

export default function PublicLayout() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {publicNav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>{t(item.label)}</NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <LanguageSwitcher />
            <Button as={NavLink} to="/login" variant="secondary" size="sm">{t('nav.login')}</Button>
            <Button as={NavLink} to="/register" size="sm">{t('nav.join')}</Button>
          </div>
          <button
            type="button"
            className="rounded-control p-2 text-navy md:hidden"
            aria-label={t('nav.menu')}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {open && (
          <div className="border-t border-line bg-white px-4 pb-4 md:hidden">
            <nav className="flex flex-col py-2" aria-label="Mobile">
              {publicNav.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={linkClass} onClick={() => setOpen(false)}>
                  {t(item.label)}
                </NavLink>
              ))}
            </nav>
            <div className="flex items-center justify-between gap-3 pt-2">
              <LanguageSwitcher />
              <div className="flex gap-2">
                <Button as={NavLink} to="/login" variant="secondary" size="sm">{t('nav.login')}</Button>
                <Button as={NavLink} to="/register" size="sm">{t('nav.join')}</Button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="bg-navy text-slate-300">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-4 py-8 sm:flex-row sm:items-center">
          <Logo light />
          <p className="text-sm">© {new Date().getFullYear()} ESCHOOL. {t('footer.rights')}</p>
        </div>
      </footer>
    </div>
  );
}