import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { STAGES, TOOLS } from '../content/stages';
import { useLang } from '../i18n/lang';
import { useTheme } from '../state/theme';

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
        /* ignore */
      }
      return next;
    });
  }, [path]);
  return visited;
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="15" fill="var(--teal)" />
      <path d="M10 34h11l5-12 8 22 6-14 3 4h11" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const TOOL_ICONS: Record<string, ReactNode> = {
  '/ask': (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 5h16v11H9l-5 4z" strokeLinejoin="round" />
      <path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" strokeLinecap="round" strokeWidth="2.4" />
    </svg>
  ),
  '/sql': (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <ellipse cx="12" cy="5.5" rx="7" ry="2.5" />
      <path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
    </svg>
  ),
  '/r': (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M8 9l-4 3 4 3M16 9l4 3-4 3M13.5 6l-3 12" />
    </svg>
  ),
  '/about': (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.5" strokeLinecap="round" />
    </svg>
  ),
};

function Rail({ visited, onNavigate }: { visited: Set<string>; onNavigate?: () => void }) {
  const { L } = useLang();
  const { pathname } = useLocation();
  const idx = STAGES.findIndex((s) => s.path === pathname);
  const doneCount = STAGES.filter((s) => visited.has(s.path)).length;
  return (
    <nav aria-label={L('Analysis pipeline', 'مراحل التحليل')} className="flex flex-col gap-5">
      <div className="rail-card">
        <div className="flex items-baseline justify-between px-1">
          <p className="eyebrow">{L('Analysis pipeline', 'مسار التحليل')}</p>
          <span className="mono text-[11px] text-muted ltr">{doneCount}/{STAGES.length}</span>
        </div>
        <div className="mx-1 mt-3 h-1.5 overflow-hidden rounded-full bg-soft" aria-hidden>
          <div className="h-full rounded-full bg-teal transition-all duration-500" style={{ width: `${(doneCount / STAGES.length) * 100}%` }} />
        </div>
        <ol className="relative mt-4">
          <span aria-hidden className="absolute bottom-5 top-5 w-px bg-line ltr:left-[23px] rtl:right-[23px]" />
          {STAGES.map((s, i) => {
            const current = pathname === s.path;
            const done = !current && visited.has(s.path);
            const past = idx >= 0 && i < idx;
            return (
              <li key={s.path}>
                <NavLink
                  to={s.path}
                  onClick={onNavigate}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-all ${current ? 'rail-active font-semibold text-ink' : 'text-muted hover:bg-soft hover:text-ink'}`}
                  aria-current={current ? 'step' : undefined}
                >
                  <span
                    aria-hidden
                    className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-bold mono transition-colors ${current ? 'border-teal bg-teal text-white shadow-[0_0_0_4px_var(--tint)]' : done || past ? 'border-teal bg-tint text-teal' : 'border-line bg-surface text-muted group-hover:border-teal'}`}
                  >
                    {done ? '✓' : s.step}
                  </span>
                  <span className="truncate">{L(s.en, s.ar)}</span>
                  <span className="sr-only">
                    {current ? L('(current)', '(الحالية)') : done ? L('(done)', '(تمت)') : ''}
                  </span>
                </NavLink>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="rail-card">
        <p className="eyebrow px-1">{L('Tools', 'أدوات')}</p>
        <ul className="mt-2">
          {TOOLS.map((s) => (
            <li key={s.path}>
              <NavLink
                to={s.path}
                onClick={onNavigate}
                className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-colors ${isActive ? 'rail-active font-semibold text-ink' : 'text-muted hover:bg-soft hover:text-ink'}`}
              >
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-soft text-muted">{TOOL_ICONS[s.path]}</span>
                {L(s.en, s.ar)}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl bg-[var(--navy)] p-4 text-[13px] text-[#c9d2e3]">
        <p className="mono text-[10.5px] uppercase tracking-[0.14em] text-[#2ec4ae]">{L('Dataset', 'البيانات')}</p>
        <p className="mt-1.5 font-semibold text-white">student-por.csv</p>
        <p className="mt-0.5 text-[12px] text-[#98a3ba]">{L('649 students · 33 columns · UCI', '649 طالبًا · 33 عمودًا · UCI')}</p>
      </div>
    </nav>
  );
}

function StageStepper() {
  const { L } = useLang();
  const { pathname } = useLocation();
  const idx = STAGES.findIndex((s) => s.path === pathname);
  if (idx < 0) return null;
  return (
    <ol className="hidden items-center gap-1 xl:flex" aria-label={L('Stages', 'المراحل')}>
      {STAGES.map((s, i) => (
        <li key={s.path} className="flex items-center gap-1">
          <NavLink
            to={s.path}
            className={`rounded-full px-2.5 py-1 text-[12.5px] font-medium transition-colors ${i === idx ? 'bg-ink text-paper' : i < idx ? 'text-teal hover:bg-soft' : 'text-muted hover:bg-soft hover:text-ink'}`}
          >
            <span className="mono me-1 opacity-70">{s.step}</span>
            {L(s.en, s.ar)}
          </NavLink>
          {i < STAGES.length - 1 && <span aria-hidden className={`h-px w-3 ${i < idx ? 'bg-teal' : 'bg-line'}`} />}
        </li>
      ))}
    </ol>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { L, lang, setLang } = useLang();
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();
  const visited = useVisited(pathname);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
    setMenu(false);
  }, [pathname]);
  const home = pathname === '/';
  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
        {L('Skip to content', 'انتقل إلى المحتوى')}
      </a>
      <header className="no-print sticky top-0 z-30 border-b border-line bg-[color-mix(in_srgb,var(--paper)_82%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center gap-4 px-4 sm:px-6">
          <button type="button" className="btn-ghost px-2.5 lg:hidden" aria-expanded={menu} aria-controls="mobile-rail" onClick={() => setMenu((m) => !m)}>
            <span aria-hidden>☰</span>
            <span className="sr-only">{L('Menu', 'القائمة')}</span>
          </button>
          <Link to="/" className="flex shrink-0 items-center gap-2.5 font-display text-[19px] font-extrabold tracking-tight">
            <Logo size={32} />
            <span className="leading-none">
              PULSE
              <span className="mt-0.5 block text-[11px] font-medium tracking-normal text-muted">{L('Analysis Studio', 'استوديو التحليل')}</span>
            </span>
          </Link>
          <div className="mx-auto">
            <StageStepper />
          </div>
          <div className="ms-auto flex items-center gap-2 xl:ms-0">
            {pathname !== '/ask' && (
              <Link to="/ask" className="btn-primary hidden sm:inline-flex">
                <span aria-hidden>✦</span> {L('Ask PULSE', 'اسأل PULSE')}
              </Link>
            )}
            <button type="button" className="btn-ghost px-3" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} lang={lang === 'en' ? 'ar' : 'en'}>
              {lang === 'en' ? 'العربية' : 'English'}
            </button>
            <button type="button" className="btn-ghost w-10 px-0" onClick={toggle} aria-label={theme === 'dark' ? L('Switch to light theme', 'التبديل إلى الوضع الفاتح') : L('Switch to dark theme', 'التبديل إلى الوضع الداكن')}>
              <span aria-hidden>{theme === 'dark' ? '☀' : '☾'}</span>
            </button>
          </div>
        </div>
      </header>
      {menu && (
        <div id="mobile-rail" className="no-print fixed inset-x-0 bottom-0 top-16 z-20 overflow-y-auto bg-paper p-4 lg:hidden">
          <Rail visited={visited} onNavigate={() => setMenu(false)} />
        </div>
      )}
      <div className={home ? '' : 'mx-auto flex max-w-[1480px] gap-8 px-4 sm:px-6'}>
        {!home && (
          <aside className="no-print sticky top-16 hidden h-[calc(100vh-4rem)] w-[248px] shrink-0 overflow-y-auto py-6 lg:block">
            <Rail visited={visited} />
          </aside>
        )}
        <main id="main" className={`min-w-0 flex-1 ${home ? '' : 'py-6'}`}>
          {children}
        </main>
      </div>
      <footer className="no-print mt-20 border-t border-line bg-surface">
        <div className="mx-auto grid max-w-[1480px] gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6">
          <div>
            <Link to="/" className="flex items-center gap-2 font-display text-lg font-extrabold">
              <Logo size={26} /> PULSE
            </Link>
            <p className="mt-2 max-w-xs text-sm text-muted">
              {L('Predicting & Understanding Learning Success in Education', 'التنبؤ بنجاح الطلاب في التعليم وفهمه')}
            </p>
          </div>
          <div className="text-sm">
            <p className="eyebrow">{L('Course', 'المادة')}</p>
            <p className="mt-2 text-muted">{L('Data Science Programming (R)', 'برمجة علم البيانات (R)')}</p>
            <p className="text-muted">{L('Data Analysis and Visualization Project', 'مشروع تحليل البيانات وتصويرها')}</p>
          </div>
          <div className="text-sm">
            <p className="eyebrow">{L('Data', 'البيانات')}</p>
            <p className="mt-2 text-muted">{L('Cortez & Silva (2008), UCI Machine Learning Repository', 'Cortez و Silva (2008)، مستودع UCI لتعلّم الآلة')}</p>
            <Link to="/about" className="mt-1 inline-block font-medium text-teal hover:underline">
              {L('About the project', 'عن المشروع')}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
