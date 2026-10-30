// Download helpers: SVG (with CSS variables resolved), PNG (via canvas), and text files.

const PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity', 'fill-opacity', 'font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline'];

function inlineStyles(src: SVGElement, dst: SVGElement) {
  const cs = getComputedStyle(src);
  const style = PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(';');
  dst.setAttribute('style', style);
  const sc = src.children;
  const dc = dst.children;
  for (let i = 0; i < sc.length; i++) inlineStyles(sc[i] as SVGElement, dc[i] as SVGElement);
}

export function serializeSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  inlineStyles(svg, clone);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const bg = getComputedStyle(document.body).backgroundColor;
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('width', '100%');
  rect.setAttribute('height', '100%');
  rect.setAttribute('fill', bg);
  clone.insertBefore(rect, clone.firstChild);
  return new XMLSerializer().serializeToString(clone);
}

export function saveBlob(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function downloadSvg(svg: SVGSVGElement, name: string) {
  saveBlob(new Blob([serializeSvg(svg)], { type: 'image/svg+xml' }), `${name}.svg`);
}

export function downloadPng(svg: SVGSVGElement, name: string, scale = 2) {
  const vb = svg.viewBox.baseVal;
  const w = vb && vb.width ? vb.width : svg.clientWidth;
  const h = vb && vb.height ? vb.height : svg.clientHeight;
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = w * scale;
    c.height = h * scale;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    c.toBlob((b) => b && saveBlob(b, `${name}.png`), 'image/png');
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serializeSvg(svg))}`;
}

export function downloadText(text: string, name: string, type = 'text/plain') {
  saveBlob(new Blob([text], { type }), name);
}
