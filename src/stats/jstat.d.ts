declare module 'jstat' {
  interface Dist {
    cdf(x: number, ...params: number[]): number;
    inv(p: number, ...params: number[]): number;
    pdf(x: number, ...params: number[]): number;
  }
  const mod: { jStat: {
    studentt: Dist;
    centralF: Dist;
    chisquare: Dist;
    normal: Dist;
    tukey: Dist;
    ibeta(x: number, a: number, b: number): number;
    gammaln(x: number): number;
    erfc(x: number): number;
  } };
  export default mod;
}
