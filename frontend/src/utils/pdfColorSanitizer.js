/**
 * Precise mathematical converter from modern CSS oklch(...) to standard rgb(...) / rgba(...).
 * Works in all JavaScript environments without relying on DOM canvas or browser features.
 */
export function oklchToRgb(str) {
  if (!str || typeof str !== 'string') return str;
  const match = str.match(/oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+(?:deg)?)(?:\s*\/\s*([\d.]+%?))?\s*\)/i);
  if (!match) return 'rgb(51, 65, 85)';

  let [, l, c, h, a] = match;
  let L = l.endsWith('%') ? parseFloat(l) / 100 : parseFloat(l);
  let C = c.endsWith('%') ? (parseFloat(c) / 100) * 0.4 : parseFloat(c);
  let H = parseFloat(h);
  let alpha = a ? (a.endsWith('%') ? parseFloat(a) / 100 : parseFloat(a)) : 1;

  if (isNaN(H)) H = 0;
  if (isNaN(C)) C = 0;
  if (isNaN(L)) L = 0;

  const hRad = (H * Math.PI) / 180;
  const aLab = C * Math.cos(hRad);
  const bLab = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * aLab + 0.2158037573 * bLab;
  const m_ = L - 0.1055613458 * aLab - 0.0638541728 * bLab;
  const s_ = L - 0.0894841775 * aLab - 1.2914855480 * bLab;

  const lLin = l_ * l_ * l_;
  const mLin = m_ * m_ * m_;
  const sLin = s_ * s_ * s_;

  const rLin = +4.0767416621 * lLin - 3.3077115913 * mLin + 0.2309699292 * sLin;
  const gLin = -1.2684380046 * lLin + 2.6097574011 * mLin - 0.3413193965 * sLin;
  const bLin = -0.0041960863 * lLin - 0.7034186147 * mLin + 1.7076147010 * sLin;

  const gamma = (v) => {
    const clamped = Math.max(0, Math.min(1, v));
    return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  const r = Math.round(gamma(rLin) * 255);
  const g = Math.round(gamma(gLin) * 255);
  const b = Math.round(gamma(bLin) * 255);

  if (alpha < 1) {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Universal color sanitizer that transforms any CSS string containing oklch / oklab / color()
 * into standard rgb / rgba notation that html2canvas can parse without errors.
 */
export function sanitizeColorString(str) {
  if (!str || typeof str !== 'string') return str;
  if (!str.includes('oklch') && !str.includes('oklab') && !str.includes('color(')) {
    return str;
  }
  return str.replace(/oklch\([^)]+\)/gi, (m) => oklchToRgb(m))
            .replace(/(?:oklab|color)\([^)]+\)/gi, 'rgb(71, 85, 105)');
}

/**
 * Creates a Proxy over a CSSStyleDeclaration to intercept property access and
 * immediately convert any oklch values to rgb.
 */
export function wrapStyleDeclaration(styleDecl) {
  if (!styleDecl) return styleDecl;
  return new Proxy(styleDecl, {
    get(target, prop) {
      const val = target[prop];
      if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab') || val.includes('color('))) {
        return sanitizeColorString(val);
      }
      if (typeof val === 'function') {
        return function (...args) {
          const res = val.apply(target, args);
          if (typeof res === 'string' && (res.includes('oklch') || res.includes('oklab') || res.includes('color('))) {
            return sanitizeColorString(res);
          }
          return res;
        };
      }
      return val;
    }
  });
}

/**
 * Sanitizes modern CSS colors in the cloned document before html2canvas processes it.
 */
export const sanitizeHtml2CanvasClone = (clonedDoc) => {
  if (!clonedDoc) return;
  try {
    // 1. Remove print-hidden elements, scripts, iframes
    const hiddenElements = clonedDoc.querySelectorAll('.print\\:hidden, [data-print-hidden="true"], script, iframe');
    hiddenElements.forEach(el => el.remove());

    // 2. Sanitize all <style> tags in document.head
    const styleTags = clonedDoc.querySelectorAll('style');
    styleTags.forEach((st) => {
      if (st.textContent && (st.textContent.includes('oklch') || st.textContent.includes('oklab') || st.textContent.includes('color('))) {
        st.textContent = sanitizeColorString(st.textContent);
      }
    });

    // 3. Remove external cross-origin stylesheets that could block html2canvas
    const linkTags = clonedDoc.querySelectorAll('link[rel="stylesheet"]');
    linkTags.forEach(link => {
      try {
        if (link.href && !link.href.startsWith(window.location.origin)) {
          link.remove();
        }
      } catch (e) {
        link.remove();
      }
    });

    // 4. Wrap getComputedStyle on clonedDoc.defaultView
    const win = clonedDoc.defaultView || window;
    if (win && win.getComputedStyle) {
      const originalGCS = win.getComputedStyle;
      win.getComputedStyle = function (el, pseudo) {
        const decl = originalGCS.call(win, el, pseudo);
        return wrapStyleDeclaration(decl);
      };
    }

    // 5. Sanitize every element in the cloned DOM tree
    const elements = clonedDoc.querySelectorAll('*');
    elements.forEach((el) => {
      if (el.style) {
        el.style.backdropFilter = 'none';
        el.style.webkitBackdropFilter = 'none';
        el.style.filter = 'none';
        el.style.boxShadow = 'none';
      }

      const inlineStyle = el.getAttribute('style');
      if (inlineStyle && (inlineStyle.includes('oklch') || inlineStyle.includes('oklab') || inlineStyle.includes('color('))) {
        el.setAttribute('style', sanitizeColorString(inlineStyle));
      }
    });

    if (clonedDoc.body) {
      clonedDoc.body.style.backgroundColor = '#ffffff';
    }
  } catch (err) {
    console.warn('Sanitizer non-fatal warning:', err);
  }
};


