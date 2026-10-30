import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { STAGES } from '../content/stages';
import { dataset } from '../data/backend';
import { useLang } from '../i18n/lang';
import { useTheme } from '../state/theme';
import { Icon, type IconName } from './Icon';

const VISITED_KEY = 'pulse-visited';

function useVisited(path: string): Set<string> {
  const [visited, setVisited] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(VISITED_KEY) ?? '[]') as string[]);
    } catch {
      return new Set();
    }
  });
  useEffect(() => {
    setVisited((v) => {
      if (v.has(path)) return v;
      const next = new Set(v).add(path);
      try {
        localStorage.setItem(VISITED_KEY, JSON.stringify([...next]));
      } catch {
        /* storage unavailable: progress is kept for this visit only */
      }
      return next;
    });
  }, [path]);
  return visited;
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="pulse-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2EC4AE" />
          <stop offset="1" stopColor="#0F9D8A" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#pulse-logo)" />
      <path
        d="M10 34h11l5-12 8 22 6-14 3 4h11"
        fill="none"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const STAGE_ICONS: Record<string, IconName> = {
  '/data': 'table',
  '/clean': 'sparkle',
  '/describe': 'sigma',
  '/test': 'flask',
  '/model': 'trend',
  '/visualize': 'chart',
  '/predict': 'target',
  '/report': 'doc',
};

function SideLink({
  to,
  icon,
  children,
  end,
  badge,
  onNavigate,
}: {
  to: string;
  icon: IconName;
  children: ReactNode;
  end?: boolean;
  badge?: ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) => `side-link ${isActive ? 'side-link-active' : ''}`}
    >
      <Icon name={icon} className="h-[18px] w-[18px] shrink-0" />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {badge}
    </NavLink>
  );
}

function Sidebar({ visited, onNavigate }: { visited: Set<string>; onNavigate?: () => void }) {
  const { L } = useLang();
  const { pathname } = useLocation();
  const done = STAGES.filter((s) => visited.has(s.path)).length;
  const ds = dataset();
  return (
    <div className="flex h-full flex-col">
      <Link to="/" onClick={onNavigate} className="flex items-center gap-3 px-5 pb-6 pt-5">
        <Logo size={36} />
        <span className="leading-none">
          <span className="block font-display text-[19px] font-extrabold tracking-tight text-white">
            PULSE
          </span>
          <span className="mt-1 block text-[11.5px] font-medium text-[#8d99b3]">
            {L('Analysis Studio', 'استوديو التحليل')}
          </span>
        </span>
      </Link>

      <nav aria-label={L('Main', 'الرئيسية')} className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        <div className="space-y-1">
          <SideLink to="/" end icon="grid" onNavigate={onNavigate}>
            {L('Dashboard', 'لوحة التحكم')}
          </SideLink>
          <SideLink
            to="/ask"
            icon="spark"
            onNavigate={onNavigate}
            badge={
              <span className="rounded-md bg-[#2ec4ae] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#05201b]">
                AI
              </span>
            }
          >
            {L('Ask PULSE', 'اسأل PULSE')}
          </SideLink>
        </div>

        <div>
          <div className="flex items-center justify-between px-3 pb-2">
            <p className="side-heading">{L('Analysis pipeline', 'مسار التحليل')}</p>
            <span className="mono text-[11px] text-[#8d99b3] ltr">{done}/8</span>
          </div>
          <div className="mx-3 mb-3 h-1 overflow-hidden rounded-full bg-white/10" aria-hidden>
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0f9d8a] to-[#2ec4ae] transition-all duration-700"
              style={{ width: `${(done / 8) * 100}%` }}
            />
          </div>
          <ol className="space-y-0.5">
            {STAGES.map((s) => {
              const current = pathname === s.path;
              const seen = !current && visited.has(s.path);
              return (
                <li key={s.path}>
                  <SideLink
                    to={s.path}
                    icon={STAGE_ICONS[s.path]}
                    onNavigate={onNavigate}
                    badge={
                      <span
                        className={`mono grid h-5 min-w-5 place-items-center rounded-md px-1 text-[10.5px] font-bold ${current ? 'bg-[#2ec4ae] text-[#05201b]' : seen ? 'text-[#2ec4ae]' : 'text-[#5f6c88]'}`}
                      >
                        {seen ? '✓' : String(s.step).padStart(2, '0')}
                      </span>
                    }
                  >
                    {L(s.en, s.ar)}
                  </SideLink>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="space-y-1">
          <p className="side-heading px-3 pb-1">{L('Tools', 'أدوات')}</p>
          <SideLink to="/r" icon="code" onNavigate={onNavigate}>
            {L('Run it in R', 'شغّله في R')}
          </SideLink>
          <SideLink to="/about" icon="info" onNavigate={onNavigate}>
            {L('About the project', 'عن المشروع')}
          </SideLink>
        </div>
      </nav>

      <div className="m-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-white">
          <span
            className={`relative flex h-2 w-2 ${ds.source === 'supabase' ? 'text-[#2ec4ae]' : 'text-[#f2b451]'}`}
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
          </span>
          {ds.source === 'supabase'
            ? L('Supabase · live', 'Supabase · متصل')
            : L('Local dataset', 'بيانات محلية')}
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-[#8d99b3]">
          student-por.csv · <span className="ltr mono">649 × 33</span>
          <br />
          {ds.source === 'supabase'
            ? L(`Postgres table students · ${ds.ms} ms`, `جدول Postgres students · ${ds.ms} ms`)
            : L('UCI Machine Learning Repository', 'مستودع UCI لتعلّم الآلة')}
        </p>
      </div>
    </div>
  );
}

function CommandBar({ compact = false }: { compact?: boolean }) {
  const { L } = useLang();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const s = q.trim();
    if (!s) return;
    navigate(`/ask?q=${encodeURIComponent(s)}&t=${Date.now()}`);
    setQ('');
    ref.current?.blur();
  };
  return (
    <form onSubmit={submit} role="search" className={`relative w-full ${compact ? '' : 'max-w-[620px]'}`}>
      <label htmlFor={compact ? 'cmd-m' : 'cmd'} className="sr-only">
        {L('Ask PULSE for an analysis', 'اطلب تحليل من PULSE')}
      </label>
      <Icon
        name="spark"
        className="pointer-events-none absolute start-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-teal"
      />
      <input
        id={compact ? 'cmd-m' : 'cmd'}
        ref={ref}
        dir="auto"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoComplete="off"
        placeholder={L(
          'Ask for any analysis… e.g. compare G3 by school',
          'اطلب أي تحليل… مثلًا: قارن العلامة حسب المدرسة',
        )}
        className="cmd-input"
      />
      {!compact && (
        <kbd className="mono pointer-events-none absolute end-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-line bg-soft px-1.5 py-0.5 text-[11px] text-muted md:block ltr">
          Ctrl K
        </kbd>
      )}
    </form>
  );
}

function TopBar({ onMenu, menuOpen }: { onMenu: () => void; menuOpen: boolean }) {
  const { L, lang, setLang } = useLang();
  const { theme, toggle } = useTheme();
  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-[color-mix(in_srgb,var(--surface)_86%,transparent)] backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          className="icon-btn lg:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          onClick={onMenu}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} className="h-5 w-5" />
          <span className="sr-only">{L('Menu', 'القائمة')}</span>
        </button>
        <Link to="/" className="flex items-center gap-2 lg:hidden">
          <Logo size={30} />
          <span className="font-display text-lg font-extrabold">PULSE</span>
        </Link>
        <div className="hidden flex-1 md:block">
          <CommandBar />
        </div>
        <div className="ms-auto flex items-center gap-2">
          <button
            type="button"
            className="icon-btn w-auto px-3 text-[13px] font-semibold"
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            lang={lang === 'en' ? 'ar' : 'en'}
          >
            <Icon name="globe" className="h-4 w-4" />
            {lang === 'en' ? 'العربية' : 'English'}
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={toggle}
            aria-label={
              theme === 'dark'
                ? L('Switch to light theme', 'التبديل إلى الوضع الفاتح')
                : L('Switch to dark theme', 'التبديل إلى الوضع الداكن')
            }
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
      <div className="px-4 pb-3 md:hidden">
        <CommandBar compact />
      </div>
    </header>
  );
}

function TabBar({ onMenu }: { onMenu: () => void }) {
  const { L } = useLang();
  const tab = ({ isActive }: { isActive: boolean }) => `tab-item ${isActive ? 'text-teal' : 'text-muted'}`;
  return (
    <nav
      aria-label={L('Quick navigation', 'تنقل سريع')}
      className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <NavLink to="/" end className={tab}>
        <Icon name="grid" className="h-5 w-5" />
        {L('Dashboard', 'الرئيسية')}
      </NavLink>
      <NavLink to="/ask" className={tab}>
        <Icon name="spark" className="h-5 w-5" />
        {L('Ask', 'اسأل')}
      </NavLink>
      <button type="button" className="tab-item text-muted" onClick={onMenu}>
        <Icon name="layers" className="h-5 w-5" />
        {L('Stages', 'المراحل')}
      </button>
      <NavLink to="/report" className={tab}>
        <Icon name="doc" className="h-5 w-5" />
        {L('Report', 'التقرير')}
      </NavLink>
    </nav>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { L } = useLang();
  const { pathname } = useLocation();
  const visited = useVisited(pathname);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
    setMenu(false);
  }, [pathname]);
  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2"
      >
        {L('Skip to content', 'انتقل إلى المحتوى')}
      </a>
      <aside className="sidebar no-print fixed inset-y-0 start-0 z-40 hidden w-[272px] lg:block">
        <Sidebar visited={visited} />
      </aside>
      {menu && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(5,9,20,.55)] backdrop-blur-sm"
            aria-label={L('Close menu', 'إغلاق القائمة')}
            onClick={() => setMenu(false)}
          />
          <aside
            id="mobile-nav"
            className="sidebar fade-in-side absolute inset-y-0 start-0 w-[86%] max-w-[300px] shadow-2xl"
          >
            <Sidebar visited={visited} onNavigate={() => setMenu(false)} />
          </aside>
        </div>
      )}
      <div className="lg:ps-[272px]">
        <TopBar onMenu={() => setMenu((m) => !m)} menuOpen={menu} />
        <main
          id="main"
          className="mx-auto min-w-0 max-w-[1320px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-16 lg:pt-8"
        >
          {children}
        </main>
        <footer className="no-print border-t border-line px-4 py-8 text-sm text-muted sm:px-6 lg:px-8 lg:pb-8 pb-28">
          <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4">
            <p className="flex items-center gap-2">
              <Logo size={20} />
              <span className="font-semibold text-ink">PULSE</span>
              <span>· {L('Data Science Programming (R)', 'برمجة علم البيانات (R)')}</span>
            </p>
            <p>
              {L(
                'Data: Cortez & Silva (2008), UCI Machine Learning Repository',
                'البيانات: Cortez و Silva (2008)، مستودع UCI لتعلّم الآلة',
              )}
            </p>
          </div>
        </footer>
      </div>
      <TabBar onMenu={() => setMenu(true)} />
    </div>
  );
}
