import { useState } from 'react';
import { Caveat, NextStep, PageHeader, Select, Slider } from '../components/ui';
import { designRow, LOGIT_KEYS, MULTI_KEYS, type PredictorKey } from '../analysis/models';
import type { CleanStudent } from '../data/clean';
import { PREDICTOR_LABELS } from '../content/terms';
import { useLang } from '../i18n/lang';
import { fmt, pct } from '../lib/format';
import { useAnalysis } from '../state/analysis';
import { dot } from '../stats/linalg';

type Profile = Pick<CleanStudent, PredictorKey>;
type Lfn = (en: string, ar: string) => string;

const DEFAULT_A: Profile = { failures: 0, higher: 'yes', studytime: 2, school: 'Gabriel Pereira', absences: 2, Dalc: 1, sex: 'Female', Medu: 2, schoolsup: 'no', internet: 'yes' };
const DEFAULT_B: Profile = { failures: 2, higher: 'no', studytime: 1, school: 'Mousinho da Silveira', absences: 10, Dalc: 3, sex: 'Male', Medu: 1, schoolsup: 'no', internet: 'no' };

export function risk(p: number, L: Lfn): { label: string; tone: string } {
  if (p < 0.6) return { label: L('High risk', 'خطر مرتفع'), tone: 'bg-coral-tint text-coral' };
  if (p <= 0.8) return { label: L('Watch', 'تحت المراقبة'), tone: 'bg-soft text-amber' };
  return { label: L('On track', 'على المسار الصحيح'), tone: 'bg-tint text-teal' };
}

function Ruler({ value, sigma, L }: { value: number; sigma: number; L: Lfn }) {
  const W = 640;
  const x = (g: number) => 20 + (g / 20) * (W - 40);
  const v = Math.min(20, Math.max(0, value));
  return (
    <div dir="ltr">
      <svg viewBox={`0 0 ${W} 90`} className="h-auto w-full" role="img" aria-label={L(`Predicted final grade ${fmt(v, 1)} out of 20`, `العلامة النهائية المتوقعة ${fmt(v, 1)} من 20`)}>
        <rect x={x(0)} y={36} width={x(10) - x(0)} height={12} rx={6} fill="var(--coral-tint)" />
        <rect x={x(10)} y={36} width={x(20) - x(10)} height={12} rx={6} fill="var(--tint)" />
        <rect x={x(Math.max(0, v - sigma))} y={34} width={x(Math.min(20, v + sigma)) - x(Math.max(0, v - sigma))} height={16} rx={8} fill="var(--violet)" fillOpacity={0.22} />
        {Array.from({ length: 21 }, (_, g) => (
          <g key={g}>
            <line x1={x(g)} x2={x(g)} y1={52} y2={g % 5 === 0 ? 60 : 56} stroke="var(--muted)" />
            {g % 5 === 0 && <text x={x(g)} y={74} textAnchor="middle" className="mono" style={{ fontSize: 11, fill: 'var(--muted)' }}>{g}</text>}
          </g>
        ))}
        <line x1={x(10)} x2={x(10)} y1={26} y2={52} stroke="var(--ink)" strokeDasharray="3 3" />
        <text x={x(10) + 4} y={24} style={{ fontSize: 10.5, fill: 'var(--muted)' }}>{L('pass mark', 'علامة النجاح')}</text>
        <g transform={`translate(${x(v)},42)`} style={{ transition: 'transform .4s ease' }}>
          <circle r={10} fill="var(--violet)" stroke="var(--surface)" strokeWidth={3} />
          <text y={-16} textAnchor="middle" className="mono" style={{ fontSize: 13, fontWeight: 700, fill: 'var(--ink)' }}>{fmt(v, 1)}</text>
        </g>
      </svg>
    </div>
  );
}

function ProfileForm({ p, set, L, id }: { p: Profile; set: (p: Profile) => void; L: Lfn; id: string }) {
  const yn = [{ value: 'yes', label: L('yes', 'نعم') }, { value: 'no', label: L('no', 'لا') }];
  const lab = (k: PredictorKey) => L(PREDICTOR_LABELS[k].en, PREDICTOR_LABELS[k].ar);
  return (
    <div className="grid grid-cols-2 gap-3">
      <Slider label={lab('failures')} value={p.failures} min={0} max={3} step={1} onChange={(v) => set({ ...p, failures: v })} />
      <Slider label={lab('absences')} value={p.absences} min={0} max={32} step={1} onChange={(v) => set({ ...p, absences: v })} />
      <Select id={`${id}-study`} label={lab('studytime')} value={String(p.studytime)} onChange={(v) => set({ ...p, studytime: Number(v) })}
        options={[['1', L('< 2 h', 'أقل من ساعتين')], ['2', L('2–5 h', '2–5 ساعات')], ['3', L('5–10 h', '5–10 ساعات')], ['4', L('> 10 h', 'أكثر من 10 ساعات')]].map(([value, label]) => ({ value, label }))} />
      <Select id={`${id}-medu`} label={lab('Medu')} value={String(p.Medu)} onChange={(v) => set({ ...p, Medu: Number(v) })}
        options={[['0', L('None', 'بلا تعليم')], ['1', L('Primary (4th)', 'ابتدائي')], ['2', L('5th–9th grade', 'الخامس–التاسع')], ['3', L('Secondary', 'ثانوي')], ['4', L('Higher', 'جامعي')]].map(([value, label]) => ({ value, label }))} />
      <Select id={`${id}-dalc`} label={lab('Dalc')} value={String(p.Dalc)} onChange={(v) => set({ ...p, Dalc: Number(v) })} options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))} />
      <Select id={`${id}-school`} label={L('School', 'المدرسة')} value={p.school} onChange={(v) => set({ ...p, school: v })} options={[{ value: 'Gabriel Pereira', label: 'Gabriel Pereira (GP)' }, { value: 'Mousinho da Silveira', label: 'Mousinho da Silveira (MS)' }]} />
      <Select id={`${id}-sex`} label={L('Sex', 'الجنس')} value={p.sex} onChange={(v) => set({ ...p, sex: v })} options={[{ value: 'Female', label: L('Female', 'أنثى') }, { value: 'Male', label: L('Male', 'ذكر') }]} />
      <Select id={`${id}-higher`} label={lab('higher')} value={p.higher} onChange={(v) => set({ ...p, higher: v })} options={yn} />
      <Select id={`${id}-sup`} label={lab('schoolsup')} value={p.schoolsup} onChange={(v) => set({ ...p, schoolsup: v })} options={yn} />
      <Select id={`${id}-net`} label={lab('internet')} value={p.internet} onChange={(v) => set({ ...p, internet: v })} options={yn} />
    </div>
  );
}

export function usePredictor() {
  const A = useAnalysis();
  const lmBeta = A.lm_multi.coef.map((c) => c.estimate);
  const lgBeta = A.logit.coef.map((c) => c.estimate);
  return (p: Profile) => {
    const g3 = dot(designRow(p, MULTI_KEYS), lmBeta);
    const prob = 1 / (1 + Math.exp(-dot(designRow(p, LOGIT_KEYS), lgBeta)));
    return { g3, g3Clamped: Math.min(20, Math.max(0, g3)), prob };
  };
}

function Result({ p, L, name }: { p: Profile; L: Lfn; name: string }) {
  const A = useAnalysis();
  const predict = usePredictor();
  const r = predict(p);
  const rk = risk(r.prob, L);
  return (
    <div className="space-y-4" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{name}</h2>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${rk.tone}`}>{rk.label}</span>
      </div>
      <Ruler value={r.g3} sigma={A.lm_multi.sigma} L={L} />
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-soft p-3">
          <div className="text-xs text-muted">{L('Predicted final grade', 'العلامة النهائية المتوقعة')}</div>
          <div className="mono text-2xl font-bold">{fmt(r.g3Clamped, 1)}<span className="text-sm text-muted"> / 20</span></div>
          <div className="mono text-xs text-muted" dir="ltr">± {fmt(A.lm_multi.sigma, 1)}</div>
        </div>
        <div className="rounded-lg bg-soft p-3">
          <div className="text-xs text-muted">{L('Probability of passing', 'احتمال النجاح')}</div>
          <div className="mono text-2xl font-bold">{pct(r.prob, 0)}</div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-teal transition-all" style={{ width: `${r.prob * 100}%` }} /></div>
        </div>
      </div>
    </div>
  );
}

export default function Predict() {
  const A = useAnalysis();
  const { L } = useLang();
  const [a, setA] = useState<Profile>(DEFAULT_A);
  const [b, setB] = useState<Profile>(DEFAULT_B);
  const predict = usePredictor();
  const ra = predict(a);
  const rb = predict(b);
  const changed = MULTI_KEYS.filter((k) => a[k] !== b[k]);
  return (
    <div>
      <PageHeader
        step={7}
        eyebrow={L('Early-warning tool', 'أداة الإنذار المبكر')}
        title={L('Who needs help before the first exam?', 'من يحتاج إلى المساعدة قبل الامتحان الأول؟')}
        lead={L(
          'Describe a student with the ten early-warning predictors. The multiple regression predicts the final grade; the logistic model gives the probability of passing. Compare two students to see what changes the outlook.',
          'صِف طالبًا بمتنبئات الإنذار المبكر العشرة. يتنبأ الانحدار المتعدد بالعلامة النهائية، ويعطي النموذج اللوجستي احتمال النجاح. قارن بين طالبين لترى ما الذي يغيّر التوقعات.',
        )}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-5">
          <Result p={a} L={L} name={L('Student A', 'الطالب أ')} />
          <ProfileForm p={a} set={setA} L={L} id="a" />
        </div>
        <div className="card space-y-5">
          <Result p={b} L={L} name={L('Student B (what if…)', 'الطالب ب (ماذا لو…)')} />
          <ProfileForm p={b} set={setB} L={L} id="b" />
        </div>
      </div>
      <div className="card mt-6">
        <h2 className="text-lg font-bold">{L('What-if comparison', 'مقارنة «ماذا لو»')}</h2>
        <p className="mt-2">
          {L(
            `Student B is predicted ${fmt(Math.abs(rb.g3Clamped - ra.g3Clamped), 1)} points ${rb.g3Clamped >= ra.g3Clamped ? 'higher' : 'lower'} than A, and their chance of passing is ${fmt(Math.abs(rb.prob - ra.prob) * 100, 0)} percentage points ${rb.prob >= ra.prob ? 'higher' : 'lower'}. They differ in ${changed.length} of 10 predictors${changed.length ? `: ${changed.map((k) => PREDICTOR_LABELS[k].en).join(', ')}` : ''}.`,
            `يُتوقع أن يحصل الطالب ب على علامة ${rb.g3Clamped >= ra.g3Clamped ? 'أعلى' : 'أقل'} من أ بمقدار ${fmt(Math.abs(rb.g3Clamped - ra.g3Clamped), 1)} نقطة، واحتمال نجاحه ${rb.prob >= ra.prob ? 'أعلى' : 'أقل'} بمقدار ${fmt(Math.abs(rb.prob - ra.prob) * 100, 0)} نقطة مئوية. يختلفان في ${changed.length} من 10 متنبئات${changed.length ? `: ${changed.map((k) => PREDICTOR_LABELS[k].ar).join('، ')}` : ''}.`,
          )}
        </p>
        <div className="mt-3 flex gap-2">
          <button type="button" className="chip hover:text-ink" onClick={() => setB(a)}>{L('Copy A → B', 'نسخ أ ← ب')}</button>
          <button type="button" className="chip hover:text-ink" onClick={() => { setA(DEFAULT_A); setB(DEFAULT_B); }}>{L('Reset', 'إعادة الضبط')}</button>
        </div>
        <p className="mt-4 text-xs text-muted">{L('Risk label from P(pass): High risk below 60%, Watch 60–80%, On track above 80%.', 'تصنيف الخطر من P(النجاح): خطر مرتفع تحت 60%، تحت المراقبة 60–80%، على المسار الصحيح فوق 80%.')}</p>
      </div>
      <div className="mt-6">
        <Caveat>
          {L(
            `This is a teaching model, not a decision tool. It explains only ${pct(A.lm_multi.r2, 1)} of the variation (R² = ${fmt(A.lm_multi.r2, 3)}), its typical error is about ${fmt(A.lm_multi.sigma, 1)} grade points, and it was fitted on ${A.n_rows} students from two Portuguese schools in 2005–2006. Use it to start a conversation with a student, never to label one.`,
            `هذا نموذج تعليمي وليس أداة لاتخاذ القرار. فهو يفسّر ${pct(A.lm_multi.r2, 1)} فقط من التباين (R² = ${fmt(A.lm_multi.r2, 3)})، وخطؤه النموذجي نحو ${fmt(A.lm_multi.sigma, 1)} نقطة، وقد قُدّر على ${A.n_rows} طالبًا من مدرستين برتغاليتين في 2005–2006. استخدمه لبدء حوار مع الطالب، لا لتصنيفه.`,
          )}
        </Caveat>
      </div>
      <NextStep to="/report" label={L('Report', 'التقرير')} />
    </div>
  );
}
