sessionStorage.audit = `(() => {
  const parse = c => { let m = c.match(/rgba?\\(([^)]+)\\)/); if (m) { const p = m[1].split(',').map(Number); return {r:p[0],g:p[1],b:p[2],a:p[3]??1}; } m = c.match(/color\\(srgb ([\\d.]+) ([\\d.]+) ([\\d.]+)(?: \\/ ([\\d.]+))?\\)/); return m ? {r:m[1]*255,g:m[2]*255,b:m[3]*255,a:m[4]===undefined?1:+m[4]} : null; };
  const lum = ({r,g,b}) => { const f = v => { v/=255; return v<=0.03928? v/12.92 : ((v+0.055)/1.055)**2.4; }; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
  const bgOf = el => { let e = el; while (e) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.9) return c; e = e.parentElement; } return {r:255,g:255,b:255,a:1}; };
  const blend = (fg, bg) => ({r: fg.r*fg.a+bg.r*(1-fg.a), g: fg.g*fg.a+bg.g*(1-fg.a), b: fg.b*fg.a+bg.b*(1-fg.a)});
  const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width>0 && r.height>0 && s.visibility!=='hidden' && s.display!=='none' && +s.opacity>0.01; };
  const name = el => (el.getAttribute('aria-label') || el.innerText || el.placeholder || el.className || el.tagName).trim().replace(/\\n/g,' ').slice(0,32);
  const small = [], low = [], unnamed = [], overflow = [];
  document.querySelectorAll('button, a, input:not(.task-item__input), textarea').forEach(el => { if (!vis(el)) return; const r = el.getBoundingClientRect(); const isLink = el.classList.contains('link-btn');
    if (isLink ? r.height < 24 : (r.height < 36 || r.width < 36)) small.push((isLink?'link ':'')+name(el)+' '+Math.round(r.width)+'x'+Math.round(r.height)); });
  document.querySelectorAll('input, textarea').forEach(el => { if (!vis(el) || el.type==='checkbox') return; const ok = el.getAttribute('aria-label') || (el.id && document.querySelector('label[for="'+el.id+'"]')) || el.closest('label'); if (!ok) unnamed.push(name(el)); });
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const seen = new Set(); let n;
  while ((n = w.nextNode())) { const el = n.parentElement; if (!n.textContent.trim() || seen.has(el) || !vis(el) || el.closest('svg, [aria-hidden="true"]')) continue; seen.add(el); const s = getComputedStyle(el);
    const fg = parse(s.color); if (!fg || fg.a === 0) continue; const bg = bgOf(el); const c = blend(fg, bg); const a = lum(c), b = lum(bg); const ratio = (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
    const size = parseFloat(s.fontSize); const need = (size >= 18.66 && +s.fontWeight >= 700) || size >= 24 ? 3 : 4.5;
    if (ratio < need && !el.closest('button:disabled, input:disabled, .card--locked')) low.push(n.textContent.trim().slice(0,28)+' '+ratio.toFixed(2)+' ('+size+'px '+s.color+')'); }
  document.querySelectorAll('body *').forEach(el => { if (!vis(el) || el.closest('.tabs')) return; const r = el.getBoundingClientRect(); if (r.right > innerWidth + 1) overflow.push(name(el)+' right='+Math.round(r.right)); });
  return { small: [...new Set(small)], low: [...new Set(low)], unnamed, overflow: overflow.slice(0,8) };
})()`;
'audit ready';
