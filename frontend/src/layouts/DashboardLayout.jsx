import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import Logo from "../components/Logo";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { roleNav } from "../config/navigation";
import { useAuth } from "../auth/AuthContext";
import { useI18n } from "../i18n";
import { useUnread } from "../hooks/useUnread";
import Avatar from '../components/Avatar';

const itemClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? "bg-navy-600 text-white"
      : "text-slate-300 hover:bg-navy-700 hover:text-white"
  }`;

/** One layout, three experiences: the sidebar comes from the `role` prop. */
export default function DashboardLayout({ role }) {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const items = roleNav[role];
  const unread = useUnread(role !== "admin");

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-navy p-4">
      <div className="mb-6 flex items-center justify-between px-1">
        <Logo to={`/${role}`} light />
        <button
          type="button"
          className="text-slate-300 lg:hidden"
          aria-label="Close"
          onClick={() => setOpen(false)}
        >
          <X size={20} />
        </button>
      </div>
      <nav
        className="flex flex-1 flex-col gap-1 overflow-y-auto"
        aria-label={t(`dash.${role}`)}
      >
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            <Icon size={18} aria-hidden="true" />
            {t(label)}
            {to.endsWith("/messages") && unread > 0 && (
              <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-bold text-white">
                {unread}
                <span className="sr-only"> {t("ms.unreadLabel")}</span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <button
        type="button"
        onClick={handleLogout}
        className={`${itemClass({ isActive: false })} w-full`}
      >
        <LogOut size={18} aria-hidden="true" />
        {t("dash.logout")}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div
            className="absolute inset-0 bg-navy/50"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-line bg-white px-4">
          <button
            type="button"
            className="rounded-control p-2 text-navy lg:hidden"
            aria-label={t("nav.menu")}
            onClick={() => setOpen(true)}
          >
            <Menu size={22} />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <Avatar userId={user?.id} name={user?.fullName} hasAvatar={user?.hasAvatar} version={user?.avatarUpdatedAt} size="sm" />
            <span className="hidden text-sm font-semibold text-navy sm:block">{user?.fullName}</span>
            <LanguageSwitcher />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
