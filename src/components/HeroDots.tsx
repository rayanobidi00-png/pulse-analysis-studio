import { useLang } from '../i18n/lang';

/** "Every dot is a student": all 649 final grades as a stacked dot plot, animated once on load. */
export function HeroDots({ grades, passMark = 10 }: { grades: readonly number[]; passMark?: number }) {
  const { L } = useLang();
  const per = 4;
  const d = 8.5;
  const colW = per * d + 6;
  const counts = new Map<number, number>();
  const dots: { g: number; k: number; i: number }[] = [];
  [...grades]
    .sort((a, b) => a - b)
    .forEach((g, i) => {
      const k = counts.get(g) ?? 0;
      counts.set(g, k + 1);
      dots.push({ g, k, i });
    });
  const maxRows = Math.ceil(Math.max(...counts.values()) / per);
  const top = 26;
  const H = top + maxRows * d + 34;
  const W = 21 * colW;
  const fails = grades.filter((g) => g < passMark).length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-labelledby="hero-t hero-d">
      <title id="hero-t">{L('Final grades of all students', 'العلامات النهائية لجميع الطلاب')}</title>
      <desc id="hero-d">
        {L(
          `A dot plot of ${grades.length} final grades on the 0–20 scale. ${fails} dots below the pass mark of ${passMark} are coral; the rest are teal.`,
          `مخطط نقطي لـ ${grades.length} علامة نهائية على سلم 0–20. ${fails} نقطة تحت علامة النجاح ${passMark} باللون المرجاني، والباقي باللون الفيروزي.`,
        )}
      </desc>
      <line
        x1={passMark * colW - 3}
        x2={passMark * colW - 3}
        y1={top - 14}
        y2={H - 26}
        stroke="#98A3BA"
        strokeDasharray="3 3"
      />
      <text
        x={passMark * colW + 2}
        y={top - 6}
        style={{ fontSize: 11, fill: '#98A3BA', fontFamily: 'JetBrains Mono, monospace' }}
      >
        {L('pass mark', 'علامة النجاح')}
      </text>
      {[...counts.keys()].map((g) => (
        <g key={g} className="col-grow" style={{ animationDelay: `${120 + g * 55}ms` }}>
          {dots
            .filter((d) => d.g === g)
            .map(({ k, i }) => (
              <circle
                key={i}
                cx={g * colW + (k % per) * d + d / 2}
                cy={H - 30 - Math.floor(k / per) * d - d / 2}
                r={3.1}
                fill={g >= passMark ? '#2EC4AE' : '#FF6B55'}
              />
            ))}
        </g>
      ))}
      {[0, 5, 10, 15, 20].map((g) => (
        <text
          key={g}
          x={g * colW + (per * d) / 2}
          y={H - 8}
          textAnchor="middle"
          style={{ fontSize: 11, fill: '#98A3BA', fontFamily: 'JetBrains Mono, monospace' }}
        >
          {g}
        </text>
      ))}
    </svg>
  );
}
