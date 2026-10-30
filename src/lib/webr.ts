// Lazy webR session for the "Run it in R" page. The webr package and R itself are only
// downloaded when the user presses "Start R".
import type { WebR } from 'webr';

export interface RRun {
  output: { type: string; text: string }[];
  images: string[];
  error?: string;
}

let session: Promise<WebR> | null = null;

export function startWebR(log: (msg: string) => void, csv: string): Promise<WebR> {
  if (!session) {
    session = (async () => {
      const { WebR, ChannelType } = await import('webr');
      // PostMessage works on GitHub Pages, which cannot send the cross-origin isolation headers
      // that the SharedArrayBuffer channel needs.
      const webR = new WebR({ channelType: ChannelType.PostMessage });
      log('init');
      await Promise.race([
        webR.init(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('webR did not start within 3 minutes (is webr.r-wasm.org reachable?)')), 180_000),
        ),
      ]);
      await webR.FS.writeFile('/home/web_user/student-por.csv', new TextEncoder().encode(csv));
      await webR.evalRVoid('setwd("/home/web_user")');
      log('packages');
      await webR.installPackages(['dplyr', 'ggplot2', 'jsonlite'], { quiet: true });
      for (const pkg of ['modeest', 'corrplot']) {
        try {
          await webR.installPackages(pkg, { quiet: true });
        } catch {
          /* not in the webR repository: the base-R fallback is used */
        }
      }
      log('ready');
      return webR;
    })();
    session.catch(() => {
      session = null;
    });
  }
  return session;
}

export async function hasPackage(webR: WebR, pkg: string): Promise<boolean> {
  return webR.evalRBoolean(`requireNamespace("${pkg}", quietly = TRUE)`);
}

/** Adjusts the course script so it runs in webR (no PNG files, fonts or missing packages). */
export function adaptForWebR(code: string, missing: string[]): string {
  let out = code
    .replace(/pulse_font <- "Inter"/, 'pulse_font <- "sans"  # webR: browser font')
    .replace(/^png\("plots\/10_corrplot\.png".*$/m, '# webR: drawn on the page instead of a PNG file')
    .replace(/^dev\.off\(\)$/m, '# dev.off()');
  if (missing.includes('modeest')) {
    out = out.replace(
      /^library\(modeest\).*$/m,
      '# webR: modeest unavailable, base-R mfv() with the same result\nmfv <- function(x) { t <- table(x); as.numeric(names(t)[t == max(t)]) }',
    );
  }
  if (missing.includes('corrplot')) {
    out = out.replace(
      /^library\(corrplot\).*$/m,
      [
        '# webR: corrplot unavailable, base-R image() heat-map instead',
        'corrplot <- function(corr, ...) {',
        '  n <- ncol(corr); op <- par(mar = c(6, 6, 2, 2))',
        '  image(1:n, 1:n, corr[, n:1], zlim = c(-1, 1), axes = FALSE, xlab = "", ylab = "",',
        '        col = colorRampPalette(c("#E8604C", "#FFFFFF", "#0F9D8A"))(200))',
        '  axis(1, 1:n, colnames(corr), las = 2, cex.axis = .7)',
        '  axis(2, 1:n, rev(colnames(corr)), las = 2, cex.axis = .7)',
        '  par(op)',
        '}',
      ].join('\n'),
    );
  }
  if (/save_plot <- function/.test(out)) {
    out += '\n\n# webR: show each ggplot on the page instead of writing PNG files\nsave_plot <- function(p, name, w = 8, h = 5) print(p)';
  }
  return out;
}

function bitmapToUrl(img: ImageBitmap): string {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  c.getContext('2d')?.drawImage(img, 0, 0);
  return c.toDataURL('image/png');
}

export async function runR(webR: WebR, code: string): Promise<RRun> {
  const shelter = await new webR.Shelter();
  try {
    const cap = await shelter.captureR(code, {
      withAutoprint: true,
      captureStreams: true,
      captureConditions: false,
      captureGraphics: { width: 800, height: 500 },
    });
    return {
      output: cap.output.filter((o) => typeof o.data === 'string').map((o) => ({ type: o.type, text: o.data as string })),
      images: cap.images.map(bitmapToUrl),
    };
  } catch (e) {
    return { output: [], images: [], error: e instanceof Error ? e.message : String(e) };
  } finally {
    await shelter.purge();
  }
}

export async function readResultsJson(webR: WebR): Promise<unknown | null> {
  try {
    const bytes = await webR.FS.readFile('/home/web_user/results.json');
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}
