// 共用小工具：DOM、格式化、動畫、Toast
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export const gsap = window.gsap;

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = (n) => { const v = Math.round(n); return `${v < 0 ? '−' : ''}NT$ ${Math.abs(v).toLocaleString('en-US')}`; };
export const pad = (n) => String(n).padStart(2, '0');
export const fmtDate = (d) => { d = new Date(d); return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`; };
export const fmtMD = (d) => { d = new Date(d); return `${d.getMonth() + 1}/${d.getDate()}`; };
export const fmtTime = (d) => { d = new Date(d); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const fmtDT = (d) => `${fmtDate(d)} ${fmtTime(d)}`;
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// GSAP 數字跳動
export function countUp(node, to, { prefix = '', suffix = '', decimals = 0, duration = 1.4, from } = {}) {
  if (!node) return;
  const start = from ?? (parseFloat(node.dataset.value) || 0);
  const obj = { v: start };
  node.dataset.value = to;
  const render = (v) => { const neg = v < 0 && /NT\$/.test(prefix); node.textContent = (neg ? '−' : '') + prefix + Number(neg ? -v : v).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix; };
  if (!gsap) { render(to); return; }
  gsap.to(obj, { v: to, duration, ease: 'power3.out', onUpdate: () => render(obj.v) });
}

// 逐字打出
export async function typeText(node, text, speed = 26) {
  node.textContent = '';
  const caret = document.createElement('span'); caret.className = 'caret';
  for (let i = 0; i < text.length; i++) {
    node.textContent = text.slice(0, i + 1);
    node.appendChild(caret);
    await sleep(speed);
  }
  caret.remove();
}

// Toast 通知
let toastHost;
export function toast(title, body = '', { kind = 'ok', icon = '', duration = 4200 } = {}) {
  if (!toastHost) { toastHost = el('<div class="toast-host" aria-live="polite"></div>'); document.body.appendChild(toastHost); }
  const t = el(`<div class="toast toast-${kind}"><div class="toast-ic">${icon}</div><div class="toast-txt"><b>${esc(title)}</b>${body ? `<span>${esc(body)}</span>` : ''}</div><i class="toast-bar"></i></div>`);
  toastHost.prepend(t);
  if (gsap) {
    gsap.fromTo(t, { y: 30, x: 0, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' });
    gsap.fromTo(t.querySelector('.toast-bar'), { scaleX: 1 }, { scaleX: 0, duration: duration / 1000, ease: 'none' });
    gsap.to(t, { x: 60, opacity: 0, duration: 0.4, delay: duration / 1000, onComplete: () => t.remove() });
  } else setTimeout(() => t.remove(), duration);
  while (toastHost.children.length > 4) toastHost.lastElementChild.remove();
}

// 語音合成（失敗時安靜忽略）
export function speak(text, lang = 'zh-TW', { rate = 1.05 } = {}) {
  return new Promise((resolve) => {
    try {
      if (!('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) return resolve(false);
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang; u.rate = rate;
      const voices = speechSynthesis.getVoices() || [];
      const v = voices.find(v => v.lang === lang) || voices.find(v => v.lang && v.lang.startsWith(lang.slice(0, 2)));
      if (v) u.voice = v;
      let done = false; const fin = () => { if (!done) { done = true; resolve(true); } };
      u.onend = fin; u.onerror = fin;
      speechSynthesis.speak(u);
      setTimeout(fin, Math.max(2500, text.length * 260));
    } catch { resolve(false); }
  });
}
export function stopSpeak() { try { window.speechSynthesis && speechSynthesis.cancel(); } catch { /* ignore */ } }

// 語音辨識（不支援時回傳 null）
export function getRecognizer(lang = 'zh-TW') {
  try {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) return null;
    const r = new R(); r.lang = lang; r.interimResults = true; r.maxAlternatives = 1;
    return r;
  } catch { return null; }
}
