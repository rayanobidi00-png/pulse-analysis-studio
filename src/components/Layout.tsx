import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { STAGES } from '../content/stages';
import { TEAM } from '../content/team';
import { useLang } from '../i18n/lang';
import { useTheme } from '../state/theme';
import { Icon } from './Icon';

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="12" fill="var(--teal)" />
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

function Brand() {
  const { L } = useLang();
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5">
      <Logo size={32} />
      <span className="leading-none">
        <span className="block text-[18px] font-bold tracking-tight">PULSE</span>
        <span className="mt-[3px] block text-[11.5px] text-muted">
          {L('Student Performance Study', 'دراسة أداء الطلاب')}
        </span>
      </span>
    </Link>
  );
}

/** "Analysis" menu: the eight chapters with one-line summaries. */
function AnalysisMenu() {
  const { L } = useLang();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inStage = STAGES.some((s) => s.path === pathname);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className={`nav-link ${inStage ? 'active' : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        {L('Analysis', 'التحليل')}
        <svg
          viewBox="0 0 12 12"
          className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <path
            d="M2.5 4.5 6 8l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {open && (
        <div className="menu-panel fade-up absolute start-0 top-[62px] z-50 w-[640px] rounded-lg border border-line bg-surface p-3">
          <ol className="grid grid-cols-2 gap-1">
            {STAGES.map((s) => (
              <li key={s.path}>
                <Link to={s.path} className="flex gap-3 rounded-md p-3 hover:bg-soft">
                  <span className="serif w-6 shrink-0 text-[20px] font-semibold leading-none text-teal num">
                    {s.step}
                  </span>
                  <span>
                    <span className="block text-[14.5px] font-semibold">{L(s.en, s.ar)}</span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">
                      {s.about && L(s.about.en, s.about.ar)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function Header({ menu, setMenu }: { menu: boolean; setMenu: (v: boolean) => void }) {
  const { L, lang, setLang } = useLang();
  const { theme, toggle } = useTheme();
  const links: [string, string, string][] = [
    ['/data', 'Data', 'البيانات'],
    ['/report', 'Report', 'التقرير'],
    ['/ask', 'Ask the data', 'اسأل البيانات'],
    ['/about', 'About', 'عن المشروع'],
  ];
  return (
    <header className="site-header no-print sticky top-0 z-40 border-b border-line">
      <div className="wrap flex h-16 items-center gap-4">
        <Brand />
        <nav aria-label={L('Main', 'الرئيسية')} className="ms-6 hidden items-center lg:flex">
          <NavLink to="/" end className="nav-link">
            {L('Overview', 'نظرة عامة')}
          </NavLink>
          <NavLink to={links[0][0]} className="nav-link">
            {L(links[0][1], links[0][2])}
          </NavLink>
          <AnalysisMenu />
          {links.slice(1).map(([to, en, ar]) => (
            <NavLink key={to} to={to} className="nav-link">
              {L(en, ar)}
            </NavLink>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-1.5">
          <button
            type="button"
            className="btn h-9 px-3 font-medium text-muted hover:text-ink"
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            lang={lang === 'en' ? 'ar' : 'en'}
          >
            {lang === 'en' ? 'العربية' : 'English'}
          </button>
          <button
            type="button"
            className="btn h-9 w-9 px-0 text-muted hover:text-ink"
            onClick={toggle}
            aria-label={
              theme === 'dark'
                ? L('Switch to light theme', 'التبديل إلى الوضع الفاتح')
                : L('Switch to dark theme', 'التبديل إلى الوضع الداكن')
            }
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="h-[18px] w-[18px]" />
          </button>
          <Link to="/r" className="btn-ghost ms-1 hidden h-9 sm:inline-flex">
            <Icon name="code" className="h-4 w-4" />
            {L('Run it in R', 'شغّله في R')}
          </Link>
          <button
            type="button"
            className="btn h-9 w-9 px-0 lg:hidden"
            aria-expanded={menu}
            aria-controls="mobile-menu"
            onClick={() => setMenu(!menu)}
          >
            <Icon name={menu ? 'close' : 'menu'} className="h-5 w-5" />
            <span className="sr-only">{L('Menu', 'القائمة')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function MobileMenu({ onClose }: { onClose: () => void }) {
  const { L } = useLang();
  const item = 'flex items-center justify-between border-b border-line py-3.5 text-[16px] font-medium';
  return (
    <div
      id="mobile-menu"
      className="no-print fixed inset-x-0 bottom-0 top-16 z-[35] overflow-y-auto bg-paper lg:hidden"
    >
      <nav className="wrap pb-16 pt-2" aria-label={L('Menu', 'القائمة')}>
        <Link to="/" onClick={onClose} className={item}>
          {L('Overview', 'نظرة عامة')}
        </Link>
        <p className="mt-6 text-[13px] font-semibold text-muted">{L('Analysis chapters', 'فصول التحليل')}</p>
        <ol>
          {STAGES.map((s) => (
            <li key={s.path}>
              <Link to={s.path} onClick={onClose} className={item}>
                <span>
                  <span className="serif me-3 text-teal num">{s.step}</span>
                  {L(s.en, s.ar)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-[13px] font-semibold text-muted">{L('More', 'المزيد')}</p>
        <Link to="/ask" onClick={onClose} className={item}>
          {L('Ask the data', 'اسأل البيانات')}
        </Link>
        <Link to="/r" onClick={onClose} className={item}>
          {L('Run it in R', 'شغّله في R')}
        </Link>
        <Link to="/about" onClick={onClose} className={item}>
          {L('About the project', 'عن المشروع')}
        </Link>
      </nav>
    </div>
  );
}

/** Second bar on chapter pages: all eight chapters as tabs. */
function ChapterBar() {
  const { L } = useLang();
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const idx = STAGES.findIndex((s) => s.path === pathname);
  useEffect(() => {
    ref.current?.querySelector('.active')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [pathname]);
  if (idx < 0) return null;
  return (
    <div className="no-print sticky top-16 z-30 border-b border-line bg-paper">
      <div
        ref={ref}
        className="wrap no-scrollbar flex overflow-x-auto"
        role="navigation"
        aria-label={L('Analysis chapters', 'فصول التحليل')}
      >
        {STAGES.map((s, i) => (
          <NavLink
            key={s.path}
            to={s.path}
            className={({ isActive }) => `chapter-tab ${isActive ? 'active' : ''}`}
          >
            <span className="n">{String(i + 1).padStart(2, '0')}</span>
            {L(s.en, s.ar)}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

function Footer({ flush }: { flush: boolean }) {
  const { L } = useLang();
  const col = 'space-y-2.5 text-[14px]';
  const head = 'mb-4 text-[13px] font-semibold text-white';
  const a = 'text-[#a9b3c7] hover:text-white';
  return (
    <footer className={`no-print bg-[#0b1222] text-[#a9b3c7] ${flush ? '' : 'mt-24'}`}>
      <div className="wrap grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5 text-white">
            <Logo size={30} />
            <span className="text-[18px] font-bold">PULSE</span>
          </div>
          <p className="mt-4 max-w-xs text-[14px] leading-relaxed">
            {L(
              'Predicting and Understanding Learning Success in Education: a complete data-analysis project on 649 secondary-school students.',
              'التنبؤ بنجاح الطلاب وفهمه: مشروع تحليل بيانات كامل على 649 طالبًا في المرحلة الثانوية.',
            )}
          </p>
        </div>
        <div>
          <p className={head}>{L('Analysis', 'التحليل')}</p>
          <ul className={col}>
            {STAGES.slice(0, 5).map((s) => (
              <li key={s.path}>
                <Link className={a} to={s.path}>
                  {L(s.en, s.ar)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className={head}>{L('Results', 'النتائج')}</p>
          <ul className={col}>
            {STAGES.slice(5).map((s) => (
              <li key={s.path}>
                <Link className={a} to={s.path}>
                  {L(s.en, s.ar)}
                </Link>
              </li>
            ))}
            <li>
              <Link className={a} to="/ask">
                {L('Ask the data', 'اسأل البيانات')}
              </Link>
            </li>
            <li>
              <Link className={a} to="/r">
                {L('Run it in R', 'شغّله في R')}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className={head}>{L('Course', 'المادة')}</p>
          <ul className={col}>
            <li>{L(TEAM.course.en, TEAM.course.ar)}</li>
            <li>{L(TEAM.university.en, TEAM.university.ar)}</li>
            <li>{L(`Instructor: ${TEAM.instructor}`, `المدرّس: ${TEAM.instructor}`)}</li>
            <li>
              <Link className={a} to="/about">
                {L('Team and method', 'الفريق والمنهجية')}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="wrap flex flex-wrap items-center justify-between gap-3 py-6 text-[13px]">
          <p>© 2026 PULSE · {L(TEAM.university.en, TEAM.university.ar)}</p>
          <p>
            {L(
              'Data: Cortez & Silva (2008), UCI Machine Learning Repository, CC BY 4.0',
              'البيانات: Cortez و Silva (2008)، مستودع UCI لتعلّم الآلة، CC BY 4.0',
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { L } = useLang();
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
    setMenu(false);
  }, [pathname]);
  const wide = pathname === '/';
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2"
      >
        {L('Skip to content', 'انتقل إلى المحتوى')}
      </a>
      <Header menu={menu} setMenu={setMenu} />
      {menu && <MobileMenu onClose={() => setMenu(false)} />}
      <ChapterBar />
      <main id="main" className={`flex-1 ${wide ? '' : 'wrap pt-10'}`}>
        {children}
      </main>
      <Footer flush={wide} />
    </div>
  );
}
