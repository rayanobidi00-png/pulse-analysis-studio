import { useEffect, useMemo, useState } from 'react';
import { Sparkline } from '../components/charts/Charts';
import { CodeTabs, Interp, Kpi, KpiStrip, NextStep, PageHeader, Section, Select } from '../components/ui';
import { COLUMNS, kindLabel, rClass } from '../content/columns';
import { rBetween } from '../content/rcode';
import { COLUMN_NAMES } from '../data/parse';
import { useLang } from '../i18n/lang';
import { useAnalysis, csvText } from '../state/analysis';
import parseSrc from '../data/parse.ts?raw';
import { extractFn } from '../lib/source';
import { highlight } from '../lib/highlight';

function ImportAnimation({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const { L } = useLang();
  const lines = useMemo(() => csvText().split('\n').slice(0, 14), []);
  const [shown, setShown] = useState(0);
  const reduce =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    if (reduce) {
      setShown(lines.length);
      return;
    }
    const id = setInterval(() => setShown((s) => (s >= lines.length ? s : s + 1)), 110);
    return () => clearInterval(id);
  }, [lines.length, reduce]);
  const finished = shown >= lines.length && ready;
  useEffect(() => {
    if (finished) onDone();
  }, [finished, onDone]);
  return (
    <div className="overflow-hidden rounded-md border border-line" dir="ltr">
      <div className="flex items-center justify-between bg-code px-4 py-2 text-xs text-[#9aa6bf]">
        <span className="mono">student-por.csv</span>
        <span className="mono">
          {finished
            ? L('parsed into 649 typed rows ✓', 'تحوّلت إلى 649 صفًا ✓')
            : L('streaming…', 'جارٍ التحميل…')}
        </span>
      </div>
      <pre
        className={`mono h-64 overflow-hidden bg-[#1a2338] p-4 text-[11.5px] leading-relaxed text-[#d7dff0] ${finished ? '' : 'caret'}`}
      >
        {lines.slice(0, shown).join('\n')}
      </pre>
    </div>
  );
}

type SortDir = 'asc' | 'desc';

/** The same view written in dplyr, as we would type it in RStudio. */
function dplyrQuery(
  f: { school: string; sex: string; minG3: number },
  sort: { col: string; dir: SortDir },
  from: number,
  to: number,
): string {
  const conds = [
    f.school !== 'all' ? `school == "${f.school}"` : '',
    f.sex !== 'all' ? `sex == "${f.sex}"` : '',
    f.minG3 > 0 ? `G3 >= ${f.minG3}` : '',
  ].filter(Boolean);
  return [
    'df %>%',
    conds.length ? `  filter(${conds.join(', ')}) %>%` : '',
    `  arrange(${sort.dir === 'desc' ? `desc(${sort.col})` : sort.col}) %>%`,
    `  slice(${from + 1}:${to + 1})`,
  ]
    .filter(Boolean)
    .join('\n');
}

function Explorer() {
  const { L } = useLang();
  const A = useAnalysis();
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ col: string; dir: SortDir }>({ col: 'G3', dir: 'desc' });
  const [school, setSchool] = useState<'all' | 'GP' | 'MS'>('all');
  const [sex, setSex] = useState<'all' | 'F' | 'M'>('all');
  const [minG3, setMinG3] = useState(0);
  const size = 12;
  const matching = useMemo(() => {
    const rows = A.raw.filter(
      (r) => (school === 'all' || r.school === school) && (sex === 'all' || r.sex === sex) && r.G3 >= minG3,
    );
    const k = sort.col as keyof (typeof rows)[number];
    const sign = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = a[k];
      const y = b[k];
      return (
        sign * (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y)))
      );
    });
  }, [A.raw, school, sex, minG3, sort]);
  const total = matching.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const rows = matching.slice(page * size, page * size + size);
  const query = dplyrQuery({ school, sex, minG3 }, sort, page * size, page * size + size - 1);
  return (
    <div className="card">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Select
          label={L('School', 'المدرسة')}
          value={school}
          onChange={(v) => {
            setSchool(v);
            setPage(0);
          }}
          options={[
            { value: 'all', label: L('All', 'الكل') },
            { value: 'GP', label: 'GP' },
            { value: 'MS', label: 'MS' },
          ]}
        />
        <Select
          label={L('Sex', 'الجنس')}
          value={sex}
          onChange={(v) => {
            setSex(v);
            setPage(0);
          }}
          options={[
            { value: 'all', label: L('All', 'الكل') },
            { value: 'F', label: 'F' },
            { value: 'M', label: 'M' },
          ]}
        />
        <Select
          label={L('Minimum G3', 'أدنى قيمة لـ G3')}
          value={String(minG3)}
          onChange={(v) => {
            setMinG3(Number(v));
            setPage(0);
          }}
          options={[0, 5, 10, 15].map((v) => ({ value: String(v), label: String(v) }))}
        />
        <div className="flex flex-col justify-end gap-1 text-sm text-muted">
          <span className="mono num font-semibold text-ink">
            {L(`${total} matching rows`, `${total} صفًا مطابقًا`)}
          </span>
        </div>
      </div>
      <pre
        className="mono mt-4 overflow-x-auto rounded-md bg-code p-4 text-xs leading-relaxed text-[#d7dff0]"
        dir="ltr"
      >
        <code dangerouslySetInnerHTML={{ __html: highlight(query, 'r') }} />
      </pre>
      <div className="mt-4 overflow-x-auto rounded-md border border-line" dir="ltr">
        <table className="tbl mono text-xs">
          <thead>
            <tr>
              {COLUMN_NAMES.map((c) => (
                <th
                  key={c}
                  aria-sort={sort.col === c ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <button
                    type="button"
                    className="hover:text-ink"
                    onClick={() => {
                      setSort((s) => ({ col: c, dir: s.col === c && s.dir === 'desc' ? 'asc' : 'desc' }));
                      setPage(0);
                    }}
                  >
                    {c}
                    {sort.col === c ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {COLUMN_NAMES.map((c) => (
                  <td
                    key={c}
                    className={`whitespace-nowrap ${c === 'G3' ? (r.G3 >= 10 ? 'font-semibold text-teal' : 'font-semibold text-coral') : ''}`}
                  >
                    {String(r[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          className="btn-ghost"
          disabled={page === 0}
          onClick={() => setPage((p) => p - 1)}
        >
          {L('Previous', 'السابق')}
        </button>
        <span className="mono text-sm text-muted">
          {page + 1} / {pages}
        </span>
        <button
          type="button"
          className="btn-ghost"
          disabled={page >= pages - 1}
          onClick={() => setPage((p) => p + 1)}
        >
          {L('Next', 'التالي')}
        </button>
      </div>
    </div>
  );
}

export default function Data() {
  const A = useAnalysis();
  const { L, lang } = useLang();
  const [imported, setImported] = useState(false);
  const counts = { nominal: 0, ordinal: 0, numeric: 0 };
  COLUMNS.forEach((c) => counts[c.kind]++);
  const distinct = (name: string) => new Set(A.raw.map((r) => r[name as keyof typeof r])).size;
  const sparkCounts = (name: string) => {
    const vals = A.raw.map((r) => r[name as keyof typeof r]);
    const levels = [...new Set(vals)].sort((a, b) =>
      typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b)),
    );
    return levels.map((l) => vals.filter((v) => v === l).length);
  };
  return (
    <div>
      <PageHeader
        step={1}
        eyebrow={L('Import and inspect', 'الاستيراد والفحص')}
        title={L(
          `The data: ${A.n_rows} students, ${A.n_cols} columns`,
          `البيانات: ${A.n_rows} طالبًا و${A.n_cols} عمودًا`,
        )}
        lead={L(
          'We read the semicolon-separated CSV exactly as read.csv() does, turn the 649 rows into typed records, and look at every column before touching anything.',
          'نقرأ ملف CSV المفصول بفواصل منقوطة تمامًا كما تفعل read.csv()، ونحوّل الصفوف الـ 649 إلى سجلات بأنواعها، ونفحص كل عمود قبل أي تعديل.',
        )}
      />

      <Section
        title={L('Import', 'الاستيراد')}
        lead={L('The raw text streams in, then becomes a table.', 'يتدفق النص الخام، ثم يتحول إلى جدول.')}
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <ImportAnimation ready onDone={() => setImported(true)} />
          <CodeTabs
            tabs={[
              {
                label: 'R',
                lang: 'r',
                code: rBetween('df <- read.csv', 'cat("\\n===== 1.') + '\n\nnrow(df); ncol(df)\nstr(df)',
              },
              { label: 'TypeScript', lang: 'ts', code: extractFn(parseSrc, 'parseCsv') },
            ]}
          />
        </div>
        {imported && (
          <div className="fade-up mt-5">
            <KpiStrip>
              <Kpi value={String(A.n_rows)} label={L('rows (students)', 'صفوف (طلاب)')} />
              <Kpi value={String(A.n_cols)} label={L('columns', 'أعمدة')} />
              <Kpi value={String(counts.nominal)} label={L('nominal', 'اسمية')} />
              <Kpi value={String(counts.ordinal)} label={L('ordinal', 'ترتيبية')} />
              <Kpi value={String(counts.numeric)} label={L('numeric', 'رقمية')} />
              <Kpi value={String(A.total_na)} label={L('missing values', 'قيم مفقودة')} tone="teal" />
            </KpiStrip>
          </div>
        )}
      </Section>

      <Section title={L('Source and domain', 'المصدر والمجال')}>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="card">
            <h3 className="text-lg font-bold">
              {L('Student Performance (Portuguese course)', 'أداء الطلاب (مادة اللغة البرتغالية)')}
            </h3>
            <p className="mt-2 text-sm text-muted">
              {L(
                'Collected in 2005–2006 from two public secondary schools in the Alentejo region of Portugal (Gabriel Pereira and Mousinho da Silveira) using school reports and questionnaires. Domain: education. Each row is one student; the target is the final grade G3 on the 0–20 Portuguese scale, and a student passes when G3 ≥ 10.',
                'جُمعت في 2005–2006 من مدرستين ثانويتين حكوميتين في منطقة ألينتيجو في البرتغال (غابرييل بيريرا وموزينيو دا سيلفيرا) من السجلات المدرسية والاستبيانات. المجال: التعليم. يمثل كل صف طالبًا واحدًا، والمتغير الهدف هو العلامة النهائية G3 على السلم البرتغالي 0–20، وينجح الطالب عندما تكون G3 ≥ 10.',
              )}
            </p>
          </div>
          <div className="card">
            <h3 className="text-lg font-bold">{L('Citation', 'المرجع')}</h3>
            <p className="mt-2 text-sm text-muted [overflow-wrap:anywhere]" dir="ltr">
              P. Cortez and A. Silva.{' '}
              <i>Using Data Mining to Predict Secondary School Student Performance.</i> In A. Brito and J.
              Teixeira (eds.), Proceedings of 5th FUture BUsiness TEChnology Conference (FUBUTEC 2008), pp.
              5–12, Porto, Portugal, April 2008, EUROSIS. UCI Machine Learning Repository, “Student
              Performance”, file <code className="mono">student-por.csv</code>.
            </p>
          </div>
        </div>
      </Section>

      <Section
        title={L('Column dictionary', 'قاموس الأعمدة')}
        lead={L(
          `All ${A.n_cols} columns: what they mean, the class R gives them, their statistical type, the number of distinct values and a mini distribution.`,
          `جميع الأعمدة الـ ${A.n_cols}: معناها، والصنف الذي يعطيه R لها، ونوعها الإحصائي، وعدد القيم المختلفة، وتوزيع مصغّر.`,
        )}
      >
        <div className="card overflow-x-auto p-0 sm:p-0">
          <table className="tbl">
            <thead>
              <tr>
                <th>{L('Column', 'العمود')}</th>
                <th>{L('Meaning', 'المعنى')}</th>
                <th>{L('R class', 'صنف R')}</th>
                <th>{L('Statistical type', 'النوع الإحصائي')}</th>
                <th>{L('Distinct', 'قيم مختلفة')}</th>
                <th>{L('Distribution', 'التوزيع')}</th>
              </tr>
            </thead>
            <tbody>
              {COLUMNS.map((c) => (
                <tr key={c.name}>
                  <td className="mono font-semibold" dir="ltr">
                    {c.name}
                  </td>
                  <td className="min-w-[240px] text-muted">{lang === 'ar' ? c.ar : c.en}</td>
                  <td className="mono text-xs" dir="ltr">
                    {rClass(c.name)}
                  </td>
                  <td>
                    <span
                      className={`chip ${c.kind === 'numeric' ? '!text-violet' : c.kind === 'ordinal' ? '!text-amber' : '!text-sky'}`}
                    >
                      {kindLabel(c.kind, L)}
                    </span>
                    <div className="mono mt-1 text-xs text-muted" dir="ltr">
                      {c.statType}
                    </div>
                  </td>
                  <td className="mono num">{distinct(c.name)}</td>
                  <td dir="ltr">
                    <Sparkline
                      counts={sparkCounts(c.name)}
                      color={
                        c.kind === 'numeric'
                          ? 'var(--violet)'
                          : c.kind === 'ordinal'
                            ? 'var(--amber)'
                            : 'var(--sky)'
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5">
          <Interp>
            {L(
              `The dataset mixes ${counts.nominal} nominal, ${counts.ordinal} ordinal and ${counts.numeric} numeric columns, as the brief requires. Note that R reads ordinal scales such as studytime as integers; we convert them to ordered factors in the cleaning stage.`,
              `تجمع البيانات بين ${counts.nominal} عمودًا اسميًا و${counts.ordinal} أعمدة ترتيبية و${counts.numeric} أعمدة رقمية، كما يتطلب المشروع. لاحظ أن R يقرأ السلالم الترتيبية مثل studytime كأعداد صحيحة؛ لذلك نحولها إلى عوامل مرتبة في مرحلة التنظيف.`,
            )}
          </Interp>
        </div>
      </Section>

      <Section
        title={L('Data explorer', 'مستكشف البيانات')}
        lead={L(
          'Every one of the 649 rows. Filter, sort and page; the box shows the same view written in dplyr.',
          'جميع الصفوف الـ 649. صفِّ ورتّب وتنقّل بين الصفحات؛ ويعرض المربع العرض نفسه مكتوبًا بـ dplyr.',
        )}
      >
        <Explorer />
      </Section>

      <NextStep to="/clean" label={L('Clean', 'التنظيف')} />
    </div>
  );
}
