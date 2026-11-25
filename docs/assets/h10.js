
window.H10 = (function () {
  const THEME_KEY = 'hoa10_theme';
  const THEMES = [
    { id: 'rich', ten: 'Sắc Hóa học', dots: ['#7A2230', '#6D28D9', '#0F766E'] },
    { id: 'classic', ten: 'Cổ điển', dots: ['#7A2230', '#C4B5A5', '#5B4E46'] },
    { id: 'dark', ten: 'Ban đêm', dots: ['#C24156', '#A78BFA', '#2DD4BF'] }
  ];

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---- Tự định dạng công thức hóa học khi hiển thị (H2SO4 → H₂SO₄, Fe3+ → Fe³⁺, <=> → ⇌) ----
  const KI_HIEU_NT = ('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr ' +
    'Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os ' +
    'Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr').split(' ');
  const NT_SET = {};
  KI_HIEU_NT.forEach(function (k) { NT_SET[k] = true; });
  const SO_DUOI = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
  const SO_TREN = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻' };
  function doiSo_(s, bang) { return String(s).split('').map(function (c) { return bang[c] || c; }).join(''); }
  /** Token có phải chuỗi kí hiệu nguyên tố hợp lệ (vd: H2SO4, Ca(OH)2, CO2) không. */
  function laCongThuc_(tok) {
    const bo = tok.replace(/[()\d]/g, '');
    const m = bo.match(/[A-Z][a-z]?/g);
    if (!m || m.join('') !== bo) return false;
    return m.every(function (k) { return NT_SET[k]; });
  }
  function dinhDangCongThuc(t) {
    // Ion đơn nguyên tử: Fe3+, Mg2+, Cl-, Na+ (đứng trước khoảng trắng/dấu câu/cuối)
    t = t.replace(/(^|[^\w&#])([A-Z][a-z]?)(\d?)([+-])(?=$|[\s,.;:)\]!?])/g, function (all, pre, k, so, dau) {
      if (!NT_SET[k]) return all;
      return pre + k + doiSo_(so + dau, SO_TREN);
    });
    // Phân tử (có thể kèm hệ số đứng trước: 2H2O): chỉ đổi khi token gồm toàn kí hiệu nguyên tố và có chữ số sau kí hiệu.
    // Token chỉ 1 nguyên tố (O2, Cl2, S8...) chỉ đổi với các đơn chất hay gặp để tránh nhầm mã như "C1", "B12".
    t = t.replace(/(^|[^\w&#])(\d*)((?:[A-Z][a-z]?\d*|\((?:[A-Z][a-z]?\d*)+\)\d+)+)(?![\w])/g, function (all, pre, heSo, tok) {
      if (!/[A-Za-z)]\d/.test(tok) || !laCongThuc_(tok)) return all;
      const kh = tok.replace(/[()\d]/g, '').match(/[A-Z][a-z]?/g) || [];
      if (kh.length === 1 && !/^(H|N|O|F|Cl|Br|I|S|P)$/.test(kh[0])) return all;
      return pre + heSo + tok.replace(/([A-Za-z)])(\d+)/g, function (x, a, so) { return a + doiSo_(so, SO_DUOI); });
    });
    return t
      .replace(/&lt;=+&gt;|&lt;-+&gt;/g, '⇌')
      .replace(/(^|[\s(])-+&gt;(?=[\s)]|$)/g, '$1→');
  }

  function mdInline_(s) {
    const imgs = [];
    const tam = String(s === null || s === undefined ? '' : s).replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (all, alt, url) {
      const u = String(url || '').trim();
      if (!/^(https?:\/\/|data:image\/)/i.test(u)) return all;
      const idx = imgs.length;
      imgs.push('<img class="md-img" src="' + esc(u) + '" alt="' + esc(alt || 'Hình minh họa') + '" loading="lazy">');
      return '@@img_' + idx + '@@';
    });
    let out = dinhDangCongThuc(esc(tam))
      .replace(/_\{([^}]*)\}/g, '<sub>$1</sub>')
      .replace(/\^\{([^}]*)\}/g, '<sup>$1</sup>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    imgs.forEach(function (tag, idx) {
      out = out.replace('@@img_' + idx + '@@', tag);
    });
    return out;
  }

  function renderBangMd_(lines) {
    const rows = [];
    let coSep = false;
    lines.forEach(function (ln) {
      const t = ln.trim();
      if (/^\|[\s:|-]+\|$/.test(t) && t.indexOf('-') >= 0) { coSep = true; return; }
      const cells = t.replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); });
      if (cells.length) rows.push(cells);
    });
    if (rows.length < 1 || (!coSep && rows.length < 2)) return lines.map(mdInline_).join('<br>');
    let h = '<div class="md-tbl-wrap"><table class="md-tbl">';
    rows.forEach(function (r, idx) {
      const tag = idx === 0 ? 'th' : 'td';
      h += '<tr>' + r.map(function (c) { return '<' + tag + '>' + mdInline_(c) + '</' + tag + '>'; }).join('') + '</tr>';
    });
    h += '</table></div>';
    return h;
  }

  /** Parser công thức hóa học nhẹ: tự định dạng H2SO4/Fe3+/⇌, _{...}, ^{...}, **đậm**, bảng |A|B| & ảnh ![alt](url). */
  function md(s) {
    const raw = String(s === null || s === undefined ? '' : s);
    if (raw.indexOf('|') < 0 && raw.indexOf('![') < 0) {
      return dinhDangCongThuc(esc(raw))
        .replace(/_\{([^}]*)\}/g, '<sub>$1</sub>')
        .replace(/\^\{([^}]*)\}/g, '<sup>$1</sup>')
        .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
        .replace(/\n/g, '<br>');
    }
    const lines = raw.split(/\r?\n/);
    const out = [];
    let i = 0;
    while (i < lines.length) {
      if (/^\s*\|.+\|\s*$/.test(lines[i])) {
        const tbl = [];
        while (i < lines.length && /^\s*\|.+\|\s*$/.test(lines[i])) {
          tbl.push(lines[i]);
          i++;
        }
        if (tbl.length >= 2) out.push({ loai: 'tbl', html: renderBangMd_(tbl) });
        else out.push({ loai: 'txt', html: mdInline_(tbl[0]) });
      } else {
        out.push({ loai: 'txt', html: mdInline_(lines[i]) });
        i++;
      }
    }
    let kq = '';
    for (let j = 0; j < out.length; j++) {
      if (j > 0 && out[j].loai === 'txt' && out[j - 1].loai === 'txt') kq += '<br>';
      kq += out[j].html;
    }
    return kq;
  }

  function layTheme() {
    try {
      const t = localStorage.getItem(THEME_KEY);
      if (THEMES.some(function (x) { return x.id === t; })) return t;
    } catch (e) {}
    return 'rich';
  }

  function apTheme(t) {
    const hopLe = THEMES.some(function (x) { return x.id === t; }) ? t : 'rich';
    document.documentElement.setAttribute('data-theme', hopLe);
    try { localStorage.setItem(THEME_KEY, hopLe); } catch (e) {}
    return hopLe;
  }

  function ganNutTheme(el) {
    if (!el) return;
    function ve() {
      const cur = layTheme();
      const t = THEMES.find(function (x) { return x.id === cur; }) || THEMES[0];
      el.innerHTML = '<span class="theme-dots">' + t.dots.map(function (c) {
        return '<i style="background:' + c + '"></i>';
      }).join('') + '</span><span class="theme-ten">' + esc(t.ten) + '</span>';
      el.setAttribute('aria-label', 'Đổi giao diện, đang dùng ' + t.ten);
      el.title = 'Đổi giao diện (đang dùng: ' + t.ten + ')';
    }
    apTheme(layTheme());
    ve();
    el.onclick = function () {
      const cur = layTheme();
      const idx = THEMES.findIndex(function (x) { return x.id === cur; });
      const next = THEMES[(idx + 1) % THEMES.length];
      apTheme(next.id);
      ve();
    };
  }

  const GAS_EXEC_URL = 'https://script.google.com/macros/s/AKfycbwGoG7DJpgg-FNqewgq-uDwQ6_h08C53iM2Kq3dXzn-_bm3l_07_1zS9A2jktfBK8iO/exec';
  const laGAS = !!(window.google && window.google.script && window.google.script.run);

  function api(ten) {
    const args = Array.prototype.slice.call(arguments, 1);
    if (laGAS) {
      return new Promise(function (ok, loi) {
        const r = google.script.run
          .withSuccessHandler(ok)
          .withFailureHandler(function (e) {
            const m = (e && e.message) ? e.message : String(e);
            loi(new Error(m.replace(/^Exception:\s*/, '')));
          });
        r[ten].apply(r, args);
      });
    }
    const url = window.H10_GAS_URL || GAS_EXEC_URL;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ fn: ten, args: args })
    }).then(function (res) {
      return res.text().then(function (txt) {
        let j = null;
        try { j = JSON.parse(txt); } catch (e) {}
        if (!j) throw new Error('Máy chủ phản hồi không hợp lệ (' + res.status + ').');
        if (!j.ok) throw new Error(j.error || 'Lỗi máy chủ.');
        return j.data;
      });
    });
  }

  function getLocation(cb) {
    if (laGAS && google.script.url && google.script.url.getLocation) {
      try { google.script.url.getLocation(cb); return; } catch (e) {}
    }
    const p = {};
    try {
      const sp = new URLSearchParams(window.location.search);
      sp.forEach(function (v, k) { p[k] = v; });
    } catch (e) {}
    cb({ parameter: p });
  }

  const GH_PAGES_BASE = 'https://hoangchu54.github.io/hoa10/';
  const STATIC_PAGES = {
    home: 'index.html',
    btvn: 'btvn.html',
    tailieu: 'tailieu.html',
    thinghiem: 'thinghiem.html',
    trochoi: 'trochoi.html',
    admin: 'admin.html'
  };

  function noiQuery_(base, extra) {
    if (!extra) return base;
    const q = String(extra).replace(/^[?&]+/, '');
    if (!q) return base;
    return base + (base.indexOf('?') >= 0 ? '&' : '?') + q;
  }

  function linkTrang(page, opts) {
    opts = opts || {};
    const cfg = opts.cfg || {};
    const webUrl = opts.webUrl || '';
    const laFull = !!opts.laFull;
    const qExtra = opts.query || '';
    if (!laGAS) {
      if (page === 'thinghiem' && cfg.linkThiNghiem) return { href: noiQuery_(cfg.linkThiNghiem, qExtra), target: 'h10_ngoai' };
      if (page === 'trochoi' && cfg.linkTroChoi) return { href: noiQuery_(cfg.linkTroChoi, qExtra), target: '_self' };
      return {
        href: noiQuery_(STATIC_PAGES[page] || 'index.html', qExtra),
        target: opts.target || (page === 'admin' ? 'h10_admin' : '_self')
      };
    }
    // Khi nhung tren Google Sites (iframe sandbox khong cap allow-top-navigation),
    // target="_top" bi trinh duyet chan. Mo qua GitHub Pages voi target="_blank" (allow-popups-to-escape-sandbox)
    const trongIframe = document.documentElement.classList.contains('in-iframe');
    const navTarget = (!laFull && trongIframe) ? '_blank' : '_top';
    if (!laFull && trongIframe) {
      if (page === 'thinghiem' && cfg.linkThiNghiem) return { href: noiQuery_(cfg.linkThiNghiem, qExtra), target: 'h10_ngoai' };
      if (page === 'trochoi' && cfg.linkTroChoi) return { href: noiQuery_(cfg.linkTroChoi, qExtra), target: '_blank' };
      return {
        href: noiQuery_(GH_PAGES_BASE + (STATIC_PAGES[page] || 'index.html'), qExtra),
        target: page === 'admin' ? (opts.target || 'h10_admin') : '_blank'
      };
    }
    const suf = laFull ? '&full=1' : '';
    if (page === 'home') {
      const baseHome = (!laFull && cfg.trangChuSites && !qExtra) ? cfg.trangChuSites : (webUrl + '?page=home' + suf);
      return { href: noiQuery_(baseHome, qExtra), target: navTarget };
    }
    if (page === 'btvn') {
      const baseBtvn = laFull ? (webUrl + '?full=1') : (qExtra ? webUrl : (cfg.trangBtvnSites || webUrl));
      return { href: noiQuery_(baseBtvn, qExtra), target: navTarget };
    }
    if (page === 'tailieu') return { href: noiQuery_(webUrl + '?page=tailieu' + suf, qExtra), target: navTarget };
    if (page === 'thinghiem') {
      return cfg.linkThiNghiem
        ? { href: noiQuery_(cfg.linkThiNghiem, qExtra), target: 'h10_ngoai' }
        : { href: noiQuery_(webUrl + '?page=thinghiem' + suf, qExtra), target: navTarget };
    }
    if (page === 'trochoi') {
      return cfg.linkTroChoi
        ? { href: noiQuery_(cfg.linkTroChoi, qExtra), target: navTarget }
        : { href: noiQuery_(webUrl + '?page=trochoi' + suf, qExtra), target: navTarget };
    }
    if (page === 'admin') return { href: noiQuery_(webUrl + '?page=admin' + suf, qExtra), target: opts.target || 'h10_admin' };
    return { href: noiQuery_(webUrl, qExtra), target: navTarget };
  }

  let henToast = null;
  function toast(msg, laLoi) {
    let d = document.getElementById('h10-toast');
    if (!d) {
      d = document.createElement('div');
      d.id = 'h10-toast';
      d.setAttribute('role', 'status');
      document.body.appendChild(d);
    }
    d.className = 'toast' + (laLoi ? ' loi' : '');
    d.textContent = msg;
    d.classList.remove('an');
    clearTimeout(henToast);
    henToast = setTimeout(function () { d.classList.add('an'); }, laLoi ? 6500 : 3400);
  }

  function skelCards(so) {
    let h = '';
    for (let i = 0; i < (so || 3); i++) {
      h += '<div class="skel-card">' +
        '<div class="skel" style="height:14px;width:36%"></div>' +
        '<div class="skel" style="height:20px;width:78%"></div>' +
        '<div class="skel" style="height:14px;width:54%"></div>' +
        '</div>';
    }
    return h;
  }

  function laDienThoai() {
    try {
      return window.matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    } catch (e) { return true; }
  }

  const ICONS = {
    binh: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6"/><path d="M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7 15h10"/></svg>',
    full: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/></svg>',
    ve: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    x: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    khoa: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    tt: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v5h1"/></svg>',
    doc: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
    game: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="4"/><path d="M6 12h4M8 10v4M15 11h.01M18 13h.01"/></svg>',
    lab: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18h12"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/></svg>',
    atom: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(30 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(90 12 12)"/></svg>',
    up: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 15l-6-6-6 6"/></svg>',
    grid: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>'
  };

  function ganNutLenDau() {
    if (document.getElementById('h10-top-btn')) return;
    const b = document.createElement('button');
    b.id = 'h10-top-btn';
    b.type = 'button';
    b.className = 'btn-top';
    b.title = 'Lên đầu trang';
    b.setAttribute('aria-label', 'Lên đầu trang');
    b.innerHTML = ICONS.up;
    b.onclick = function () {
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
    };
    document.body.appendChild(b);
    const capNhat = function () {
      b.classList.toggle('hien', (window.scrollY || document.documentElement.scrollTop || 0) > 320);
    };
    window.addEventListener('scroll', capNhat, { passive: true });
    capNhat();
  }

  const SLOGANS = [
    'Hóa học không chỉ là công thức trên giấy — đó là ngôn ngữ giải thích mọi biến đổi quanh ta.',
    'Hiểu bản chất nguyên tử nhỏ nhất để tự tin chinh phục mọi bài toán lớn nhất.',
    'Mỗi phản ứng đều có điều kiện xảy ra; thành công cũng cần đủ kiên trì và phương pháp đúng.',
    'Cẩn thận từng hệ số cân bằng và đơn vị mol — chi tiết nhỏ làm nên điểm số lớn.',
    'Thí nghiệm giải đáp "vì sao", bài tập rèn cho ta "làm thế nào".',
    'Từ bảng tuần hoàn đến thế giới phân tử 3D — càng hiểu quy luật, càng thấy Hóa học logic và đẹp.'
  ];

  function renderSlogan(el) {
    if (!el) return;
    let idx = Math.floor(Math.random() * SLOGANS.length);
    function ve() {
      el.innerHTML = '<footer class="slogan-foot">' +
        '<div class="slogan-ic">' + ICONS.atom + '</div>' +
        '<div class="slogan-txt">' +
          '<div class="slogan-quote">“' + esc(SLOGANS[idx]) + '”</div>' +
          '<div class="slogan-sub">Hóa học 10 · Kết nối tri thức · Thầy Hoàng</div>' +
        '</div>' +
        '<button type="button" class="slogan-next" title="Xem câu khác">Đổi câu</button>' +
      '</footer>';
      const btn = el.querySelector('.slogan-next');
      if (btn) btn.onclick = function () { idx = (idx + 1) % SLOGANS.length; ve(); };
    }
    ve();
  }

  function mascotUrl(tenFile) {
    return (laGAS ? GH_PAGES_BASE : '') + 'assets/mascot/' + tenFile;
  }

  let daTaiAnimMascot = false;
  function kichHoatMascot(root) {
    const scope = root || document;
    const imgs = scope.querySelectorAll('img[data-mascot-anim]');
    if (!imgs.length) return;
    // Giữ ảnh tĩnh (20KB) khi máy bật Giảm chuyển động / Tiết kiệm dữ liệu / mạng 2G: không tải bản động ~290KB
    if (tietKiemTaiNguyen_(true)) return;
    const animSrc = mascotUrl('mascot-main.webp');
    if (daTaiAnimMascot) {
      imgs.forEach(function (im) { im.src = animSrc; im.removeAttribute('data-mascot-anim'); });
      return;
    }
    const pre = new Image();
    pre.onload = function () {
      daTaiAnimMascot = true;
      document.querySelectorAll('img[data-mascot-anim]').forEach(function (im) {
        im.src = animSrc;
        im.removeAttribute('data-mascot-anim');
      });
    };
    pre.src = animSrc;
  }

  function veMascot(opts) {
    opts = opts || {};
    const cls = opts.cls || 'hm-mascot-img';
    const alt = opts.alt || 'Thầy Hoàng Hóa 10';
    const tinh = !!opts.tinh;
    return '<img class="' + esc(cls) + '" src="' + esc(mascotUrl('mascot-poster.webp')) + '"' +
      (tinh ? '' : ' data-mascot-anim="1"') +
      ' alt="' + esc(alt) + '" decoding="async" onerror="this.style.display=\'none\'">';
  }

  const MEO_CAFE_THAY_HOANG = [
    ['☕ CaFe Hóa 10:', 'Ca (Z=20) + Fe (Z=26) = CaFe nạp năng lượng chinh phục Hóa 10!'],
    ['⚗️ Nhớ chuẩn SGK:', 'Ở đkc (25 °C, 1 bar), 1 mol khí bất kì luôn chiếm 24,79 L nhé!'],
    ['⚡ Mẹo Oxi hóa – Khử:', 'Khử cho – O nhận: Chất khử nhường e nên số oxi hóa TĂNG sau phản ứng!'],
    ['⚛️ Coi chừng bẫy cấu hình e:', 'Cr (Z=24) là [Ar]3d⁵4s¹ và Cu (Z=29) là [Ar]3d¹⁰4s¹ nhé!'],
    ['🧪 Nhận biết nhanh Halide:', 'Nhỏ AgNO₃: NaF không tủa · AgCl trắng · AgBr vàng nhạt · AgI vàng đậm!'],
    ['🎉 Thầy Hoàng nhắn:', 'Đạt từ 8 điểm trở lên là có pháo giấy ăn mừng liền tay!']
  ];
  let idxMeoCafe = 0;

  function ganBungCoVu(el) {
    if (!el) return;
    const ICONS_FX = ['⚗️', '⚛️', '🧪', '☕', '⭐', '🔥', '🏆', '✨'];
    const CAU_FX = ['Học tốt – Thi tốt!', 'Uống CaFe học Hóa!', 'Hóa thật hay!', 'Chinh phục 10 điểm!', 'Kiên trì là thắng!', 'Tư duy bản chất!'];
    let ac = null, last = 0;
    function pop() {
      try {
        if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
        const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(1080, t + 0.08);
        g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.15);
      } catch (e) {}
    }
    el.addEventListener('pointerdown', function (e) {
      const now = Date.now(); if (now - last < 140) return; last = now;
      pop();
      const qBox = el.querySelector('#hm-quote-txt');
      if (qBox) {
        idxMeoCafe = (idxMeoCafe + 1) % MEO_CAFE_THAY_HOANG.length;
        const m = MEO_CAFE_THAY_HOANG[idxMeoCafe];
        qBox.innerHTML = '<b>' + esc(m[0]) + '</b> <span>' + esc(m[1]) + '</span>';
      }
      const x = e.clientX, y = e.clientY, sz = 22;
      for (let i = 0; i < 7; i++) {
        const sp = document.createElement('span');
        sp.className = 'fx-e';
        sp.textContent = ICONS_FX[Math.floor(Math.random() * ICONS_FX.length)];
        sp.style.left = (x - sz / 2) + 'px';
        sp.style.top = (y - sz / 2) + 'px';
        document.body.appendChild(sp);
        const a = Math.random() * Math.PI * 2, d = 36 + Math.random() * 54, r = (Math.random() - 0.5) * 90;
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            sp.style.transform = 'translate(' + Math.cos(a) * d + 'px,' + (Math.sin(a) * d - 20) + 'px) rotate(' + r + 'deg) scale(' + (0.7 + Math.random() * 0.5) + ')';
            sp.style.opacity = '0';
          });
        });
        setTimeout(function () { sp.remove(); }, 950);
      }
      const txt = document.createElement('div');
      txt.className = 'fx-t';
      txt.textContent = CAU_FX[Math.floor(Math.random() * CAU_FX.length)];
      txt.style.left = Math.min(Math.max(x, 95), window.innerWidth - 95) + 'px';
      txt.style.top = Math.max(y - 24, 26) + 'px';
      document.body.appendChild(txt);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { txt.style.transform = 'translate(-50%,-50%) scale(1)'; txt.style.opacity = '1'; });
      });
      setTimeout(function () {
        txt.style.transition = 'transform .45s ease-in,opacity .45s';
        txt.style.transform = 'translate(-50%,-120%) scale(.92)';
        txt.style.opacity = '0';
      }, 850);
      setTimeout(function () { txt.remove(); }, 1400);
    });
  }

  // ---- Tên tài liệu dễ đọc: bỏ đuôi file, "_" → khoảng trắng, bỏ "(1)", thêm dấu cho từ phổ biến ----
  const TU_CO_DAU = [
    [/\bbai tap\b/gi, 'Bài tập'], [/\bdap an\b/gi, 'Đáp án'], [/\bde kiem tra\b/gi, 'Đề kiểm tra'],
    [/\bkiem tra\b/gi, 'Kiểm tra'], [/\bon tap\b/gi, 'Ôn tập'], [/\bphieu\b/gi, 'Phiếu'],
    [/\bcau tao nguyen tu\b/gi, 'Cấu tạo nguyên tử'], [/\bbang tuan hoan\b/gi, 'Bảng tuần hoàn'],
    [/\blien ket hoa hoc\b/gi, 'Liên kết hóa học'], [/\blien ket\b/gi, 'Liên kết'], [/\bhoc sinh\b/gi, 'Học sinh'],
    [/\bphan ung\b/gi, 'Phản ứng'], [/\btoc do\b/gi, 'Tốc độ'], [/\bnang luong\b/gi, 'Năng lượng'],
    [/\boxi hoa khu\b/gi, 'Oxi hóa – khử'], [/\bhalogen\b/gi, 'Halogen'], [/\bchuong\b/gi, 'Chương'],
    [/\bbai\b/gi, 'Bài'], [/\bhoa\b/gi, 'Hóa'], [/\bma\b/gi, 'mã'], [/\bde\b/gi, 'Đề'], [/\bgiua ki\b/gi, 'giữa kì']
  ];
  function tenDep(ten) {
    let s = String(ten || '').normalize('NFC')
      .replace(/\.(pdf|docx?|pptx?|xlsx?|txt|png|jpe?g)$/i, '')
      .replace(/\s*\(\d+\)\s*$/g, '').replace(/\s*\(\d+\)(?=\s|$)/g, '')
      .replace(/[_]+/g, ' ')
      .replace(/\s+/g, ' ').trim();
    // Chỉ tách chữ dính liền & thêm dấu khi tên viết hoàn toàn không dấu (ASCII)
    if (/^[\x20-\x7E]*$/.test(s)) {
      s = s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Za-z])(\d)/g, '$1 $2').replace(/\s+/g, ' ');
      TU_CO_DAU.forEach(function (p) { s = s.replace(p[0], p[1]); });
      s = s.replace(/\bGHK\s?(\d)\b/gi, 'giữa HK$1').replace(/\bHoa 10\b/g, 'Hóa 10');
    }
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : String(ten || '');
  }

  // ---- Pháo giấy CSS (không cần thư viện) khi đạt điểm cao ----
  function phaoGiay(soManh) {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    } catch (e) {}
    const mau = ['#7A2230', '#6D28D9', '#0F766E', '#FFD166', '#FF5A7A', '#38BDF8'];
    const vung = document.createElement('div');
    vung.className = 'phao-giay';
    vung.setAttribute('aria-hidden', 'true');
    const n = soManh || 90;
    for (let i = 0; i < n; i++) {
      const m = document.createElement('i');
      m.style.left = (Math.random() * 100) + '%';
      m.style.background = mau[i % mau.length];
      m.style.animationDelay = (Math.random() * 0.6) + 's';
      m.style.animationDuration = (2.2 + Math.random() * 1.6) + 's';
      m.style.setProperty('--x', ((Math.random() - 0.5) * 220) + 'px');
      m.style.setProperty('--r', (Math.random() * 900 - 450) + 'deg');
      if (i % 3 === 0) m.style.borderRadius = '50%';
      vung.appendChild(m);
    }
    document.body.appendChild(vung);
    setTimeout(function () { vung.remove(); }, 4600);
  }

  // ---- Bộ Gallery "Sắc màu Hóa học 10" (SVG trực quan + Lightbox chi tiết) ----
  const GALLERY_HOA10 = [
    {
      id: 'flame',
      tag: 'Chương 1 · Quang phổ',
      ten: 'Màu ngọn lửa ion kim loại',
      tomTat: 'Khi đốt nóng, electron nhảy lên mức năng lượng cao rồi phát xạ ánh sáng màu đặc trưng cho từng nguyên tố.',
      nen: 'linear-gradient(135deg,#1E112A 0%,#3B1432 55%,#131A2E 100%)',
      swatches: [
        { ten: 'Li⁺ Đỏ tía', mau: '#FF2A5F' },
        { ten: 'Na⁺ Vàng rực', mau: '#FFB800' },
        { ten: 'K⁺ Tím hoa cà', mau: '#C084FC' },
        { ten: 'Cu²⁺ Xanh lục', mau: '#10B981' }
      ],
      svg: '<svg viewBox="0 0 260 110" aria-hidden="true">' +
        '<g transform="translate(22,12)"><path d="M18 76 C4 58 8 32 18 10 C28 32 32 58 18 76Z" fill="#FF2A5F" opacity=".92"/><path d="M18 74 C11 60 13 42 18 26 C23 42 25 60 18 74Z" fill="#FF9EBB"/><rect x="12" y="76" width="12" height="14" rx="2" fill="#94A3B8"/><text x="18" y="102" fill="#FFE4EC" font-size="11" font-weight="800" text-anchor="middle">Li⁺</text></g>' +
        '<g transform="translate(82,8)"><path d="M18 80 C2 60 6 30 18 6 C30 30 34 60 18 80Z" fill="#FFB800" opacity=".95"/><path d="M18 78 C10 62 12 42 18 24 C24 42 26 62 18 78Z" fill="#FFF3B0"/><rect x="12" y="80" width="12" height="14" rx="2" fill="#94A3B8"/><text x="18" y="106" fill="#FEF08A" font-size="11" font-weight="800" text-anchor="middle">Na⁺</text></g>' +
        '<g transform="translate(142,12)"><path d="M18 76 C4 58 8 32 18 10 C28 32 32 58 18 76Z" fill="#C084FC" opacity=".92"/><path d="M18 74 C11 60 13 42 18 26 C23 42 25 60 18 74Z" fill="#F3E8FF"/><rect x="12" y="76" width="12" height="14" rx="2" fill="#94A3B8"/><text x="18" y="102" fill="#E9D5FF" font-size="11" font-weight="800" text-anchor="middle">K⁺</text></g>' +
        '<g transform="translate(202,10)"><path d="M18 78 C4 58 8 30 18 8 C28 30 32 58 18 78Z" fill="#10B981" opacity=".95"/><path d="M18 76 C11 60 13 42 18 24 C23 42 25 60 18 76Z" fill="#A7F3D0"/><rect x="12" y="78" width="12" height="14" rx="2" fill="#94A3B8"/><text x="18" y="104" fill="#A7F3D0" font-size="11" font-weight="800" text-anchor="middle">Cu²⁺</text></g>' +
      '</svg>',
      chiTiet: '**Bản chất (Bài 3 – Lớp vỏ electron):** Khi nhúng dây platinum sạch vào dung dịch muối rồi đốt trên đèn khí, các electron hấp thụ năng lượng nhảy lên orbital cao hơn, sau đó trở về trạng thái cơ bản và phát ra bức xạ có bước sóng đặc trưng trong vùng nhìn thấy:\n' +
        '• **Muối Lithium (Li⁺):** Ngọn lửa màu đỏ tía (λ ≈ 671 nm).\n' +
        '• **Muối Sodium (Na⁺):** Ngọn lửa màu vàng tươi rực rỡ (λ ≈ 589 nm, dùng làm đèn cao áp đường phố).\n' +
        '• **Muối Potassium (K⁺):** Ngọn lửa màu tím hoa cà.\n' +
        '• **Muối Calcium (Ca²⁺):** Đỏ cam · **Barium (Ba²⁺):** Lục vàng · **Copper (Cu²⁺):** Xanh lục (ứng dụng chế tạo pháo hoa).'
    },
    {
      id: 'halogen',
      tag: 'Chương 7 · Bài 21',
      ten: 'Sắc màu 4 đơn chất Halogen',
      tomTat: 'Từ F2 → Cl2 → Br2 → I2: màu sắc đậm dần và nhiệt độ nóng chảy, nhiệt độ sôi tăng dần do tương tác van der Waals tăng.',
      nen: 'linear-gradient(135deg,#1B2838 0%,#2B1E3F 58%,#3A1828 100%)',
      swatches: [
        { ten: 'F₂ Lục nhạt', mau: '#D9F99D' },
        { ten: 'Cl₂ Vàng lục', mau: '#A3E635' },
        { ten: 'Br₂ Nâu đỏ', mau: '#B91C1C' },
        { ten: 'I₂ Tím đen', mau: '#6B21A8' }
      ],
      svg: '<svg viewBox="0 0 260 110" aria-hidden="true">' +
        '<g transform="translate(18,14)"><rect x="4" y="6" width="28" height="70" rx="14" fill="rgba(217,249,157,.38)" stroke="#E2E8F0" stroke-width="2"/><rect x="1" y="3" width="34" height="5" rx="2.5" fill="#E2E8F0"/><text x="18" y="92" fill="#ECFCCB" font-size="11" font-weight="800" text-anchor="middle">F₂ (khí)</text></g>' +
        '<g transform="translate(80,14)"><rect x="4" y="6" width="28" height="70" rx="14" fill="rgba(163,230,53,.52)" stroke="#E2E8F0" stroke-width="2"/><rect x="1" y="3" width="34" height="5" rx="2.5" fill="#E2E8F0"/><text x="18" y="92" fill="#D9F99D" font-size="11" font-weight="800" text-anchor="middle">Cl₂ (khí)</text></g>' +
        '<g transform="translate(142,14)"><rect x="4" y="6" width="28" height="70" rx="14" fill="rgba(239,68,68,.28)" stroke="#E2E8F0" stroke-width="2"/><path d="M5 46 H31 V62 A13 13 0 0 1 5 62 Z" fill="#991B1B"/><rect x="1" y="3" width="34" height="5" rx="2.5" fill="#E2E8F0"/><text x="18" y="92" fill="#FCA5A5" font-size="11" font-weight="800" text-anchor="middle">Br₂ (lỏng)</text></g>' +
        '<g transform="translate(204,14)"><rect x="4" y="6" width="28" height="70" rx="14" fill="rgba(168,85,247,.34)" stroke="#E2E8F0" stroke-width="2"/><circle cx="14" cy="64" r="5" fill="#3B0764"/><circle cx="22" cy="66" r="4.5" fill="#4C1D95"/><circle cx="18" cy="59" r="4" fill="#581C87"/><rect x="1" y="3" width="34" height="5" rx="2.5" fill="#E2E8F0"/><text x="18" y="92" fill="#E9D5FF" font-size="11" font-weight="800" text-anchor="middle">I₂ (rắn)</text></g>' +
      '</svg>',
      chiTiet: '**Quy luật biến đổi nhóm VIIA (Bài 21 – Nhóm Halogen):**\n' +
        '• **Fluorine (F2):** Khí màu lục nhạt, rất độc, tính oxi hóa mạnh nhất (oxi hóa mãnh liệt H2O tạo O2).\n' +
        '• **Chlorine (Cl2):** Khí màu vàng lục, mùi xốc, tan một phần trong nước tạo nước chlorine (HCl + HClO có tính tẩy màu).\n' +
        '• **Bromine (Br2):** Chất lỏng màu nâu đỏ, dễ bay hơi, gây bỏng sâu khi rơi vào da.\n' +
        '• **Iodine (I2):** Tinh thể màu đen tím; khi đun nóng **thăng hoa** trực tiếp từ thể rắn sang hơi màu tím mà không qua trạng thái lỏng; gặp hồ tinh bột tạo phức màu **xanh tím** đặc trưng.'
    },
    {
      id: 'agx',
      tag: 'Chương 7 · Bài 22',
      ten: 'Nhận biết ion Halide bằng AgNO3',
      tomTat: 'Phản ứng chuẩn trong phòng Lab: F⁻ không kết tủa, Cl⁻ kết tủa trắng, Br⁻ vàng nhạt, I⁻ vàng đậm.',
      nen: 'linear-gradient(135deg,#0F292E 0%,#1E293B 55%,#3B2818 100%)',
      swatches: [
        { ten: 'AgF Tan', mau: '#38BDF8' },
        { ten: 'AgCl↓ Trắng', mau: '#F8FAFC' },
        { ten: 'AgBr↓ Vàng nhạt', mau: '#FEF08A' },
        { ten: 'AgI↓ Vàng đậm', mau: '#EAB308' }
      ],
      svg: '<svg viewBox="0 0 260 110" aria-hidden="true">' +
        '<g transform="translate(18,14)"><rect x="4" y="6" width="28" height="70" rx="14" fill="rgba(56,189,248,.22)" stroke="#CBD5E1" stroke-width="2"/><text x="18" y="46" fill="#BAE6FD" font-size="9" font-weight="700" text-anchor="middle">Trong</text><text x="18" y="92" fill="#BAE6FD" font-size="11" font-weight="800" text-anchor="middle">NaF</text></g>' +
        '<g transform="translate(80,14)"><rect x="4" y="6" width="28" height="70" rx="14" fill="rgba(255,255,255,.15)" stroke="#CBD5E1" stroke-width="2"/><path d="M5 50 H31 V62 A13 13 0 0 1 5 62 Z" fill="#F8FAFC"/><text x="18" y="92" fill="#F8FAFC" font-size="11" font-weight="800" text-anchor="middle">AgCl↓</text></g>' +
        '<g transform="translate(142,14)"><rect x="4" y="6" width="28" height="70" rx="14" fill="rgba(255,255,255,.15)" stroke="#CBD5E1" stroke-width="2"/><path d="M5 50 H31 V62 A13 13 0 0 1 5 62 Z" fill="#FEF08A"/><text x="18" y="92" fill="#FEF08A" font-size="11" font-weight="800" text-anchor="middle">AgBr↓</text></g>' +
        '<g transform="translate(204,14)"><rect x="4" y="6" width="28" height="70" rx="14" fill="rgba(255,255,255,.15)" stroke="#CBD5E1" stroke-width="2"/><path d="M5 50 H31 V62 A13 13 0 0 1 5 62 Z" fill="#EAB308"/><text x="18" y="92" fill="#FACC15" font-size="11" font-weight="800" text-anchor="middle">AgI↓</text></g>' +
      '</svg>',
      chiTiet: '**Phương trình phân biệt các muối Halide (Bài 22):**\n' +
        '• **NaF + AgNO3:** Không hiện tượng (vì AgF tan tốt trong nước).\n' +
        '• **NaCl + AgNO3 -> AgCl↓ (kết tủa trắng) + NaNO3** (kết tủa AgCl hóa đen ngoài ánh sáng: 2AgCl -> 2Ag + Cl2).\n' +
        '• **NaBr + AgNO3 -> AgBr↓ (kết tủa vàng nhạt) + NaNO3**.\n' +
        '• **NaI + AgNO3 -> AgI↓ (kết tủa vàng đậm) + NaNO3**.'
    },
    {
      id: 'redox',
      tag: 'Chương 4 & 5 · Thí nghiệm',
      ten: 'Sắc màu Ion chuyển tiếp & Nhiệt phản ứng',
      tomTat: 'Sự đổi màu ấn tượng của KMnO4, muối sắt Fe2+/Fe3+, đồng Cu2+ và so sánh phản ứng tỏa nhiệt – thu nhiệt.',
      nen: 'linear-gradient(135deg,#2D122B 0%,#1F243D 52%,#112C29 100%)',
      swatches: [
        { ten: 'MnO₄⁻ Tím đậm', mau: '#9333EA' },
        { ten: 'Cu²⁺ Xanh lam', mau: '#0284C7' },
        { ten: 'Fe³⁺ Vàng nâu', mau: '#D97706' },
        { ten: 'ΔrH < 0 Tỏa nhiệt', mau: '#EF4444' }
      ],
      svg: '<svg viewBox="0 0 260 110" aria-hidden="true">' +
        '<g transform="translate(22,12)"><path d="M22 10 H36 M25 10 V30 L8 68 A7 7 0 0 0 14 78 H44 A7 7 0 0 0 50 68 L33 30 V10" fill="none" stroke="#E2E8F0" stroke-width="2"/><path d="M13 54 H45 L49 68 A5 5 0 0 1 44 76 H14 A5 5 0 0 1 9 68 Z" fill="#9333EA"/><text x="29" y="96" fill="#E9D5FF" font-size="10.5" font-weight="800" text-anchor="middle">KMnO₄</text></g>' +
        '<g transform="translate(100,12)"><path d="M22 10 H36 M25 10 V30 L8 68 A7 7 0 0 0 14 78 H44 A7 7 0 0 0 50 68 L33 30 V10" fill="none" stroke="#E2E8F0" stroke-width="2"/><path d="M13 54 H45 L49 68 A5 5 0 0 1 44 76 H14 A5 5 0 0 1 9 68 Z" fill="#0284C7"/><text x="29" y="96" fill="#BAE6FD" font-size="10.5" font-weight="800" text-anchor="middle">CuSO₄</text></g>' +
        '<g transform="translate(178,12)"><path d="M22 10 H36 M25 10 V30 L8 68 A7 7 0 0 0 14 78 H44 A7 7 0 0 0 50 68 L33 30 V10" fill="none" stroke="#E2E8F0" stroke-width="2"/><path d="M13 54 H45 L49 68 A5 5 0 0 1 44 76 H14 A5 5 0 0 1 9 68 Z" fill="#D97706"/><text x="29" y="96" fill="#FDE68A" font-size="10.5" font-weight="800" text-anchor="middle">FeCl₃</text></g>' +
      '</svg>',
      chiTiet: '**Nhận biết nhanh hiện tượng trong các bài toán Hóa 10:**\n' +
        '• **Dung dịch KMnO4 (thuốc tím):** Màu tím đặc trưng; khi oxi hóa chất khử trong môi trường acid (H2SO4 loãng) sẽ **mất màu tím** tạo Mn2+ không màu.\n' +
        '• **Dung dịch muối Cu2+ (CuSO4):** Màu xanh lam; tác dụng với NaOH tạo kết tủa **Cu(OH)2 xanh lam**.\n' +
        '• **Dung dịch Fe2+ → Fe3+:** Từ lục nhạt chuyển sang vàng nâu; tạo kết tủa Fe(OH)3 màu **nâu đỏ**.\n' +
        '• **Biến thiên Enthalpy (Chương 5):** Δ_{r}H°_{298} < 0 là phản ứng **tỏa nhiệt** (bình nóng lên, như đốt cháy, tôi vôi CaO + H2O); Δ_{r}H°_{298} > 0 là phản ứng **thu nhiệt** (bình lạnh đi, như hòa tan viên sủi hoặc NH4Cl).'
    }
  ];

  function moLightboxGallery(id) {
    const item = GALLERY_HOA10.find(function (x) { return x.id === id; });
    if (!item) return;
    const hop = document.createElement('div');
    hop.className = 'hopdn';
    hop.innerHTML = '<div class="the vua" style="padding:0;overflow:hidden">' +
      '<div class="gal-art" style="height:175px;background:' + item.nen + '">' +
        '<span class="gal-tag">' + esc(item.tag) + '</span>' +
        item.svg +
      '</div>' +
      '<div style="padding:16px 18px;display:flex;flex-direction:column;gap:10px">' +
        '<h2 style="margin:0;font-size:18px;font-weight:800">' + md(item.ten) + '</h2>' +
        '<div class="gal-swatches">' + item.swatches.map(function (s) {
          return '<span class="gal-sw"><i style="background:' + s.mau + '"></i>' + esc(s.ten) + '</span>';
        }).join('') + '</div>' +
        '<div style="font-size:13.8px;line-height:1.6;background:var(--nen2);border:1px solid var(--vien);border-radius:12px;padding:12px 14px">' + md(item.chiTiet) + '</div>' +
        '<div class="hang-nut" style="justify-content:flex-end"><button type="button" class="nut nho chinh" data-x="dong">Đã hiểu ✓</button></div>' +
      '</div></div>';
    document.body.appendChild(hop);
    const dong = function () { hop.remove(); document.removeEventListener('keydown', onEsc); };
    const onEsc = function (e) { if (e.key === 'Escape') dong(); };
    document.addEventListener('keydown', onEsc);
    hop.onclick = function (e) { if (e.target === hop) dong(); };
    hop.querySelector('[data-x="dong"]').onclick = dong;
  }

  function renderGalleryHoa10(el, tieuDe) {
    if (!el) return;
    let h = '<div class="sec-head">' +
      '<h2>📸 ' + esc(tieuDe || 'Gallery Sắc màu & Hiện tượng Hóa 10') + '</h2>' +
      '<span class="phu">Chạm vào từng thẻ để xem phương trình &amp; giải thích</span>' +
    '</div><div class="gal-grid">';
    GALLERY_HOA10.forEach(function (g) {
      h += '<button type="button" class="gal-card" data-gal="' + esc(g.id) + '">' +
        '<div class="gal-art" style="background:' + g.nen + '">' +
          '<span class="gal-tag">' + esc(g.tag) + '</span>' +
          g.svg +
          '<span class="gal-zoom">🔍 Xem chi tiết</span>' +
        '</div>' +
        '<div class="gal-body">' +
          '<b>' + md(g.ten) + '</b>' +
          '<span class="phu">' + md(g.tomTat) + '</span>' +
          '<div class="gal-swatches">' + g.swatches.map(function (s) {
            return '<span class="gal-sw"><i style="background:' + s.mau + '"></i>' + esc(s.ten) + '</span>';
          }).join('') + '</div>' +
        '</div></button>';
    });
    h += '</div>';
    el.innerHTML = h;
    el.querySelectorAll('[data-gal]').forEach(function (btn) {
      btn.onclick = function () { moLightboxGallery(btn.getAttribute('data-gal')); };
    });
  }

  // ---- Cache cục bộ Stale-While-Revalidate (mở trang 0ms) & Prefetch ----
  function docCacheUI(k, maxAgeMs) {
    try {
      const raw = localStorage.getItem('h10_ui_' + k);
      if (!raw) return null;
      const o = JSON.parse(raw);
      if (!o || !o.t || (Date.now() - o.t > (maxAgeMs || 7 * 86400e3))) return null;
      return o.d;
    } catch (e) { return null; }
  }
  function ghiCacheUI(k, data) {
    try { localStorage.setItem('h10_ui_' + k, JSON.stringify({ t: Date.now(), d: data })); } catch (e) {}
  }

  let daPrefetch = false;
  // true khi nên tiết kiệm: bật Tiết kiệm dữ liệu, mạng 2G (hoặc Giảm chuyển động nếu kemChuyenDong)
  function tietKiemTaiNguyen_(kemChuyenDong) {
    try {
      const c = navigator.connection;
      if (c && (c.saveData || /(^|-)2g$/.test(String(c.effectiveType || '')))) return true;
      if (kemChuyenDong && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    } catch (e) {}
    return false;
  }

  // Chỉ tải trước trang khi học sinh sắp bấm (rê chuột / chạm vào link), không tải cả 4 trang mỗi lần mở
  const TRANG_TINH = ['index.html', 'btvn.html', 'tailieu.html', 'thinghiem.html', 'trochoi.html'];
  const daTaiTruoc = {};
  function prefetchPages() {
    if (daPrefetch || laGAS || tietKiemTaiNguyen_(false)) return;
    daPrefetch = true;
    function taiTruoc(ev) {
      try {
        const a = ev.target && ev.target.closest && ev.target.closest('a[href]');
        if (!a) return;
        const u = new URL(a.getAttribute('href'), location.href);
        if (u.origin !== location.origin) return;
        const ten = u.pathname.split('/').pop() || 'index.html';
        if (TRANG_TINH.indexOf(ten) < 0 || daTaiTruoc[ten] || location.pathname.split('/').pop() === ten) return;
        daTaiTruoc[ten] = true;
        const l = document.createElement('link');
        l.rel = 'prefetch';
        l.href = ten;
        document.head.appendChild(l);
      } catch (e) {}
    }
    document.addEventListener('pointerover', taiTruoc, { passive: true });
    document.addEventListener('touchstart', taiTruoc, { passive: true });
    document.addEventListener('focusin', taiTruoc);
  }

  // ---- Bảng Tuần Hoàn & Sổ tay Hằng số Hóa 10 (Quick Reference Modal, phím tắt Alt+P) ----
  const BANG_NT_SGK = [
    { z: 1, kh: 'H', ten: 'Hydrogen', m: '1', chi: '2,20', cfg: '1s¹', nhom: 'IA (1)', ck: 1, loai: 'pk' },
    { z: 2, kh: 'He', ten: 'Helium', m: '4', chi: '–', cfg: '1s²', nhom: 'VIIIA (18)', ck: 1, loai: 'kh' },
    { z: 3, kh: 'Li', ten: 'Lithium', m: '7', chi: '0,98', cfg: '[He] 2s¹', nhom: 'IA (1)', ck: 2, loai: 'kl' },
    { z: 4, kh: 'Be', ten: 'Beryllium', m: '9', chi: '1,57', cfg: '[He] 2s²', nhom: 'IIA (2)', ck: 2, loai: 'kl' },
    { z: 5, kh: 'B', ten: 'Boron', m: '11', chi: '2,04', cfg: '[He] 2s²2p¹', nhom: 'IIIA (13)', ck: 2, loai: 'pk' },
    { z: 6, kh: 'C', ten: 'Carbon', m: '12', chi: '2,55', cfg: '[He] 2s²2p²', nhom: 'IVA (14)', ck: 2, loai: 'pk' },
    { z: 7, kh: 'N', ten: 'Nitrogen', m: '14', chi: '3,04', cfg: '[He] 2s²2p³', nhom: 'VA (15)', ck: 2, loai: 'pk' },
    { z: 8, kh: 'O', ten: 'Oxygen', m: '16', chi: '3,44', cfg: '[He] 2s²2p⁴', nhom: 'VIA (16)', ck: 2, loai: 'pk' },
    { z: 9, kh: 'F', ten: 'Fluorine', m: '19', chi: '3,98', cfg: '[He] 2s²2p⁵', nhom: 'VIIA (17)', ck: 2, loai: 'pk' },
    { z: 10, kh: 'Ne', ten: 'Neon', m: '20', chi: '–', cfg: '[He] 2s²2p⁶', nhom: 'VIIIA (18)', ck: 2, loai: 'kh' },
    { z: 11, kh: 'Na', ten: 'Sodium', m: '23', chi: '0,93', cfg: '[Ne] 3s¹', nhom: 'IA (1)', ck: 3, loai: 'kl' },
    { z: 12, kh: 'Mg', ten: 'Magnesium', m: '24', chi: '1,31', cfg: '[Ne] 3s²', nhom: 'IIA (2)', ck: 3, loai: 'kl' },
    { z: 13, kh: 'Al', ten: 'Aluminium', m: '27', chi: '1,61', cfg: '[Ne] 3s²3p¹', nhom: 'IIIA (13)', ck: 3, loai: 'kl' },
    { z: 14, kh: 'Si', ten: 'Silicon', m: '28', chi: '1,90', cfg: '[Ne] 3s²3p²', nhom: 'IVA (14)', ck: 3, loai: 'pk' },
    { z: 15, kh: 'P', ten: 'Phosphorus', m: '31', chi: '2,19', cfg: '[Ne] 3s²3p³', nhom: 'VA (15)', ck: 3, loai: 'pk' },
    { z: 16, kh: 'S', ten: 'Sulfur', m: '32', chi: '2,58', cfg: '[Ne] 3s²3p⁴', nhom: 'VIA (16)', ck: 3, loai: 'pk' },
    { z: 17, kh: 'Cl', ten: 'Chlorine', m: '35,5', chi: '3,16', cfg: '[Ne] 3s²3p⁵', nhom: 'VIIA (17)', ck: 3, loai: 'pk' },
    { z: 18, kh: 'Ar', ten: 'Argon', m: '40', chi: '–', cfg: '[Ne] 3s²3p⁶', nhom: 'VIIIA (18)', ck: 3, loai: 'kh' },
    { z: 19, kh: 'K', ten: 'Potassium', m: '39', chi: '0,82', cfg: '[Ar] 4s¹', nhom: 'IA (1)', ck: 4, loai: 'kl' },
    { z: 20, kh: 'Ca', ten: 'Calcium', m: '40', chi: '1,00', cfg: '[Ar] 4s²', nhom: 'IIA (2)', ck: 4, loai: 'kl' },
    { z: 24, kh: 'Cr', ten: 'Chromium', m: '52', chi: '1,66', cfg: '[Ar] 3d⁵4s¹', nhom: 'VIB (6)', ck: 4, loai: 'kl' },
    { z: 25, kh: 'Mn', ten: 'Manganese', m: '55', chi: '1,55', cfg: '[Ar] 3d⁵4s²', nhom: 'VIIB (7)', ck: 4, loai: 'kl' },
    { z: 26, kh: 'Fe', ten: 'Iron (Sắt)', m: '56', chi: '1,83', cfg: '[Ar] 3d⁶4s²', nhom: 'VIIIB (8)', ck: 4, loai: 'kl' },
    { z: 29, kh: 'Cu', ten: 'Copper (Đồng)', m: '64', chi: '1,90', cfg: '[Ar] 3d¹⁰4s¹', nhom: 'IB (11)', ck: 4, loai: 'kl' },
    { z: 30, kh: 'Zn', ten: 'Zinc (Kẽm)', m: '65', chi: '1,65', cfg: '[Ar] 3d¹⁰4s²', nhom: 'IIB (12)', ck: 4, loai: 'kl' },
    { z: 35, kh: 'Br', ten: 'Bromine', m: '80', chi: '2,96', cfg: '[Ar] 3d¹⁰4s²4p⁵', nhom: 'VIIA (17)', ck: 4, loai: 'pk' },
    { z: 47, kh: 'Ag', ten: 'Silver (Bạc)', m: '108', chi: '1,93', cfg: '[Kr] 4d¹⁰5s¹', nhom: 'IB (11)', ck: 5, loai: 'kl' },
    { z: 53, kh: 'I', ten: 'Iodine', m: '127', chi: '2,66', cfg: '[Kr] 4d¹⁰5s²5p⁵', nhom: 'VIIA (17)', ck: 5, loai: 'pk' },
    { z: 56, kh: 'Ba', ten: 'Barium', m: '137', chi: '0,89', cfg: '[Xe] 6s²', nhom: 'IIA (2)', ck: 6, loai: 'kl' },
    { z: 79, kh: 'Au', ten: 'Gold (Vàng)', m: '197', chi: '2,54', cfg: '[Xe] 4f¹⁴5d¹⁰6s¹', nhom: 'IB (11)', ck: 6, loai: 'kl' },
    { z: 80, kh: 'Hg', ten: 'Mercury', m: '201', chi: '2,00', cfg: '[Xe] 4f¹⁴5d¹⁰6s²', nhom: 'IIB (12)', ck: 6, loai: 'kl' },
    { z: 82, kh: 'Pb', ten: 'Lead (Chì)', m: '207', chi: '2,33', cfg: '[Xe] 4f¹⁴5d¹⁰6s²6p²', nhom: 'IVA (14)', ck: 6, loai: 'kl' }
  ];

  const NT_KHOI_MAP = {
    H: 1, He: 4, Li: 7, Be: 9, B: 11, C: 12, N: 14, O: 16, F: 19, Ne: 20,
    Na: 23, Mg: 24, Al: 27, Si: 28, P: 31, S: 32, Cl: 35.5, Ar: 40,
    K: 39, Ca: 40, Sc: 45, Ti: 48, V: 51, Cr: 52, Mn: 55, Fe: 56, Co: 59, Ni: 59, Cu: 64, Zn: 65,
    Ga: 70, Ge: 73, As: 75, Se: 79, Br: 80, Kr: 84, Rb: 85, Sr: 88, Ag: 108, Cd: 112, Sn: 119, Sb: 122,
    I: 127, Xe: 131, Cs: 133, Ba: 137, Pt: 195, Au: 197, Hg: 201, Pb: 207, Bi: 209
  };

  /** Phân tích công thức hóa học (hỗ trợ ngoặc tròn/vuông và muối ngậm nước vd CuSO4.5H2O, Fe2(SO4)3) → { M, ct: [{kh, so, m, pct}] } */
  function tinhPhanTuKhoi(ctRaw) {
    const s = String(ctRaw || '').trim().replace(/\s+/g, '').replace(/\[/g, '(').replace(/\]/g, ')').replace(/[·*]/g, '.');
    if (!s) return null;
    const parts = s.split('.');
    const tongDem = {};
    for (let p = 0; p < parts.length; p++) {
      let part = parts[p];
      if (!part) continue;
      let heSo = 1;
      const mHs = part.match(/^(\d+)(.*)$/);
      if (mHs) { heSo = parseInt(mHs[1], 10) || 1; part = mHs[2]; }
      const stack = [{}];
      let i = 0;
      while (i < part.length) {
        const ch = part.charAt(i);
        if (ch === '(') {
          stack.push({});
          i++;
        } else if (ch === ')') {
          if (stack.length < 2) return null;
          i++;
          let numStr = '';
          while (i < part.length && /\d/.test(part.charAt(i))) { numStr += part.charAt(i); i++; }
          const mult = numStr ? parseInt(numStr, 10) : 1;
          const top = stack.pop();
          const cur = stack[stack.length - 1];
          Object.keys(top).forEach(function (k) { cur[k] = (cur[k] || 0) + top[k] * mult; });
        } else if (/[A-Z]/.test(ch)) {
          let sym = ch;
          i++;
          if (i < part.length && /[a-z]/.test(part.charAt(i))) { sym += part.charAt(i); i++; }
          if (!NT_KHOI_MAP[sym]) return null;
          let numStr = '';
          while (i < part.length && /\d/.test(part.charAt(i))) { numStr += part.charAt(i); i++; }
          const cnt = numStr ? parseInt(numStr, 10) : 1;
          const cur = stack[stack.length - 1];
          cur[sym] = (cur[sym] || 0) + cnt;
        } else {
          return null;
        }
      }
      if (stack.length !== 1) return null;
      const mapP = stack[0];
      Object.keys(mapP).forEach(function (k) { tongDem[k] = (tongDem[k] || 0) + mapP[k] * heSo; });
    }
    const keys = Object.keys(tongDem);
    if (!keys.length) return null;
    let M = 0;
    keys.forEach(function (k) { M += NT_KHOI_MAP[k] * tongDem[k]; });
    M = Math.round(M * 100) / 100;
    const ct = keys.map(function (k) {
      const m = Math.round(NT_KHOI_MAP[k] * tongDem[k] * 100) / 100;
      return { kh: k, so: tongDem[k], ntk: NT_KHOI_MAP[k], m: m, pct: Math.round(m / M * 10000) / 100 };
    });
    return { M: M, ct: ct };
  }

  // ---- Từ điển Danh pháp IUPAC Hóa 10 (GDPT 2018 – kèm phát âm tiếng Anh chuẩn) ----
  const BANG_IUPAC_HOA10 = [
    { ct: 'H', en: 'Hydrogen', pa: '/ˈhaɪ.drə.dʒən/', vi: 'Nguyên tố Z = 1 (trước gọi là Hiđro)', loai: 'nt' },
    { ct: 'He', en: 'Helium', pa: '/ˈhiː.li.əm/', vi: 'Khí hiếm Z = 2', loai: 'nt' },
    { ct: 'Li', en: 'Lithium', pa: '/ˈlɪθ.i.əm/', vi: 'Kim loại kiềm Z = 3', loai: 'nt' },
    { ct: 'C', en: 'Carbon', pa: '/ˈkɑːr.bən/', vi: 'Phi kim Z = 6 (Cacbon)', loai: 'nt' },
    { ct: 'N', en: 'Nitrogen', pa: '/ˈnaɪ.trə.dʒən/', vi: 'Phi kim Z = 7 (Nitơ)', loai: 'nt' },
    { ct: 'O', en: 'Oxygen', pa: '/ˈɒk.sɪ.dʒən/', vi: 'Phi kim Z = 8 (Oxi)', loai: 'nt' },
    { ct: 'F', en: 'Fluorine', pa: '/ˈflɔː.riːn/', vi: 'Halogen Z = 9 (Flo)', loai: 'nt' },
    { ct: 'Na', en: 'Sodium', pa: '/ˈsəʊ.di.əm/', vi: 'Kim loại kiềm Z = 11 (Natri)', loai: 'nt' },
    { ct: 'Mg', en: 'Magnesium', pa: '/mæɡˈniː.zi.əm/', vi: 'Kim loại kiềm thổ Z = 12 (Magiê)', loai: 'nt' },
    { ct: 'Al', en: 'Aluminium', pa: '/ˌæl.jəˈmɪn.i.əm/', vi: 'Kim loại Z = 13 (Nhôm)', loai: 'nt' },
    { ct: 'Si', en: 'Silicon', pa: '/ˈsɪl.ɪ.kən/', vi: 'Phi kim Z = 14 (Silic)', loai: 'nt' },
    { ct: 'P', en: 'Phosphorus', pa: '/ˈfɒs.fər.əs/', vi: 'Phi kim Z = 15 (Photpho)', loai: 'nt' },
    { ct: 'S', en: 'Sulfur', pa: '/ˈsʌl.fər/', vi: 'Phi kim Z = 16 (Lưu huỳnh)', loai: 'nt' },
    { ct: 'Cl', en: 'Chlorine', pa: '/ˈklɔː.riːn/', vi: 'Halogen Z = 17 (Clo)', loai: 'nt' },
    { ct: 'K', en: 'Potassium', pa: '/pəˈtæs.i.əm/', vi: 'Kim loại kiềm Z = 19 (Kali)', loai: 'nt' },
    { ct: 'Ca', en: 'Calcium', pa: '/ˈkæl.si.əm/', vi: 'Kim loại kiềm thổ Z = 20 (Canxi)', loai: 'nt' },
    { ct: 'Cr', en: 'Chromium', pa: '/ˈkrəʊ.mi.əm/', vi: 'Kim loại chuyển tiếp Z = 24 (Crom)', loai: 'nt' },
    { ct: 'Mn', en: 'Manganese', pa: '/ˈmæŋ.ɡə.niːz/', vi: 'Kim loại chuyển tiếp Z = 25 (Mangan)', loai: 'nt' },
    { ct: 'Fe', en: 'Iron', pa: '/ˈaɪ.ən/', vi: 'Kim loại chuyển tiếp Z = 26 (Sắt)', loai: 'nt' },
    { ct: 'Cu', en: 'Copper', pa: '/ˈkɒp.ər/', vi: 'Kim loại chuyển tiếp Z = 29 (Đồng)', loai: 'nt' },
    { ct: 'Zn', en: 'Zinc', pa: '/zɪŋk/', vi: 'Kim loại Z = 30 (Kẽm)', loai: 'nt' },
    { ct: 'Br', en: 'Bromine', pa: '/ˈbrəʊ.miːn/', vi: 'Halogen Z = 35 (Brom)', loai: 'nt' },
    { ct: 'Ag', en: 'Silver', pa: '/ˈsɪl.vər/', vi: 'Kim loại Z = 47 (Bạc)', loai: 'nt' },
    { ct: 'I', en: 'Iodine', pa: '/ˈaɪ.ə.diːn/', vi: 'Halogen Z = 53 (Iốt)', loai: 'nt' },
    { ct: 'Ba', en: 'Barium', pa: '/ˈbeə.ri.əm/', vi: 'Kim loại kiềm thổ Z = 56 (Bari)', loai: 'nt' },
    { ct: 'Au', en: 'Gold', pa: '/ɡəʊld/', vi: 'Kim loại quý Z = 79 (Vàng)', loai: 'nt' },
    { ct: 'Hg', en: 'Mercury', pa: '/ˈmɜː.kjʊ.ri/', vi: 'Kim loại lỏng Z = 80 (Thủy ngân)', loai: 'nt' },
    { ct: 'Pb', en: 'Lead', pa: '/led/', vi: 'Kim loại Z = 82 (Chì)', loai: 'nt' },

    { ct: 'OH-', en: 'Hydroxide', pa: '/haɪˈdrɒk.saɪd/', vi: 'Ion hiđroxit (nhóm -OH của base)', loai: 'ion' },
    { ct: 'Cl-', en: 'Chloride', pa: '/ˈklɔː.raɪd/', vi: 'Ion clorua (tương tự: Fluoride, Bromide, Iodide)', loai: 'ion' },
    { ct: 'S2-', en: 'Sulfide', pa: '/ˈsʌl.faɪd/', vi: 'Ion sunfua (đuôi -ide cho anion không chứa O)', loai: 'ion' },
    { ct: 'SO3^{2-}', en: 'Sulfite', pa: '/ˈsʌl.faɪt/', vi: 'Ion sunfit (ít O hơn dùng đuôi -ite)', loai: 'ion' },
    { ct: 'SO4^{2-}', en: 'Sulfate', pa: '/ˈsʌl.feɪt/', vi: 'Ion sunfat (nhiều O hơn dùng đuôi -ate)', loai: 'ion' },
    { ct: 'NO3-', en: 'Nitrate', pa: '/ˈnaɪ.treɪt/', vi: 'Ion nitrat (NO2- là Nitrite)', loai: 'ion' },
    { ct: 'CO3^{2-}', en: 'Carbonate', pa: '/ˈkɑː.bə.neɪt/', vi: 'Ion cacbonat (HCO3- là Hydrogencarbonate)', loai: 'ion' },
    { ct: 'PO4^{3-}', en: 'Phosphate', pa: '/ˈfɒs.feɪt/', vi: 'Ion photphat', loai: 'ion' },
    { ct: 'ClO-', en: 'Hypochlorite', pa: '/ˌhaɪ.pəʊˈklɔː.raɪt/', vi: 'Ion hipoclorit (trong nước Javel NaClO)', loai: 'ion' },
    { ct: 'ClO3-', en: 'Chlorate', pa: '/ˈklɔː.reɪt/', vi: 'Ion clorat (ClO4- là Perchlorate)', loai: 'ion' },
    { ct: 'MnO4-', en: 'Permanganate', pa: '/pəˈmæŋ.ɡə.neɪt/', vi: 'Ion pemanganat (màu tím đậm)', loai: 'ion' },
    { ct: 'NH4+', en: 'Ammonium', pa: '/əˈməʊ.ni.əm/', vi: 'Cation amoni (NH3 là Ammonia)', loai: 'ion' },

    { ct: 'HCl (aq)', en: 'Hydrochloric acid', pa: '/ˌhaɪ.drəˈklɒr.ɪk ˈæs.ɪd/', vi: 'Dung dịch acid HCl (khí HCl đọc là Hydrogen chloride)', loai: 'hc' },
    { ct: 'H2SO4', en: 'Sulfuric acid', pa: '/sʌlˈfjʊə.rɪk ˈæs.ɪd/', vi: 'Axit sunfuric (H2SO3 là Sulfurous acid)', loai: 'hc' },
    { ct: 'HNO3', en: 'Nitric acid', pa: '/ˈnaɪ.trɪk ˈæs.ɪd/', vi: 'Axit nitric', loai: 'hc' },
    { ct: 'HClO', en: 'Hypochlorous acid', pa: '/ˌhaɪ.pəʊˈklɔː.rəs ˈæs.ɪd/', vi: 'Có tính oxi hóa mạnh, tẩy màu trong nước Cl2', loai: 'hc' },
    { ct: 'NaOH', en: 'Sodium hydroxide', pa: '/ˈsəʊ.di.əm haɪˈdrɒk.saɪd/', vi: 'Xút ăn da (kiềm mạnh)', loai: 'hc' },
    { ct: 'Ca(OH)2', en: 'Calcium hydroxide', pa: '/ˈkæl.si.əm haɪˈdrɒk.saɪd/', vi: 'Vôi tôi / Dung dịch nước vôi trong', loai: 'hc' },
    { ct: 'Fe2O3', en: 'Iron(III) oxide', pa: '/ˈaɪ.ən θriː ˈɒk.saɪd/', vi: 'Kim loại nhiều hóa trị phải kèm số La Mã', loai: 'hc' },
    { ct: 'SO2 / SO3', en: 'Sulfur dioxide / Sulfur trioxide', pa: '/ˈsʌl.fər daɪˈɒk.saɪd/', vi: 'Oxide phi kim dùng tiền tố mono-, di-, tri-, pent-...', loai: 'hc' },
    { ct: 'CuSO4.5H2O', en: 'Copper(II) sulfate pentahydrate', pa: '/ˈkɒp.ər tuː ˈsʌl.feɪt/', vi: 'Phèn xanh (muối ngậm 5 phân tử nước)', loai: 'hc' },
    { ct: 'KMnO4', en: 'Potassium permanganate', pa: '/pəˈtæs.i.əm pəˈmæŋ.ɡə.neɪt/', vi: 'Thuốc tím', loai: 'hc' },

    { ct: 'AO (s, p, d, f)', en: 'Atomic orbital', pa: '/əˈtɒm.ɪk ˈɔː.bɪ.təl/', vi: 'Vùng không gian quanh hạt nhân xác suất gặp e ≈ 90%', loai: 'tn' },
    { ct: 'χ (Pauling)', en: 'Electronegativity', pa: '/ɪˌlek.trəʊˌneɡ.əˈtɪv.ə.ti/', vi: 'Độ âm điện – đại lượng đặc trưng khả năng hút e', loai: 'tn' },
    { ct: 'ΔrH°298', en: 'Enthalpy', pa: '/ˈen.θəl.pi/', vi: 'Nhiệt phản ứng đẳng áp (< 0 tỏa nhiệt, > 0 thu nhiệt)', loai: 'tn' },
    { ct: 'Chất xúc tác', en: 'Catalyst', pa: '/ˈkæt.əl.ɪst/', vi: 'Chất làm tăng tốc độ phản ứng nhưng còn nguyên sau PƯ', loai: 'tn' }
  ];

  function phatAmIUPAC_(text) {
    try {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        toast('Trình duyệt trên thiết bị này chưa hỗ trợ đọc phát âm tự động.', true);
        return;
      }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text || '').replace(/\s*\/.*$/, ''));
      u.lang = 'en-US';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    } catch (e) {
      toast('Không phát được âm thanh trên trình duyệt này.', true);
    }
  }

  let casioExp = '', casioAns = 0, casioVal = null, casioFormula = 'H2SO4', lastTraLoiInput = null;
  document.addEventListener('focusin', function (e) {
    const t = e && e.target;
    if (t && t.classList && t.classList.contains('o-tra-loi')) lastTraLoiInput = t;
  });

  function timOTraLoiDangLam_() {
    if (lastTraLoiInput && document.body.contains(lastTraLoiInput) && !lastTraLoiInput.disabled) return lastTraLoiInput;
    const kbdInp = document.querySelector('.cau-hs.active-kbd .o-tra-loi');
    if (kbdInp && !kbdInp.disabled) return kbdInp;
    const ds = Array.prototype.slice.call(document.querySelectorAll('.o-tra-loi')).filter(function (el) {
      return !el.disabled && el.offsetParent !== null;
    });
    if (!ds.length) return null;
    const mid = window.innerHeight / 2;
    let best = ds[0], bestDist = 1e9;
    ds.forEach(function (el) {
      const r = el.getBoundingClientRect();
      const d = Math.abs((r.top + r.bottom) / 2 - mid);
      if (d < bestDist) { bestDist = d; best = el; }
    });
    return best;
  }

  function moBangTraCuu(tabMacDinh) {
    const cu = document.getElementById('h10-ref-modal');
    if (cu) { cu.remove(); return; }
    let tabRef = (typeof tabMacDinh === 'string' && tabMacDinh) ? tabMacDinh : 'casio';
    let qRef = '', loaiRef = '', qIupac = '', loaiIupac = '', soLeChon = undefined;
    let thuNho = laDienThoai() && document.body.classList.contains('dang-lam');
    const hop = document.createElement('div');
    hop.id = 'h10-ref-modal';
    hop.className = 'hopdn' + (thuNho ? ' half-sheet' : '');
    hop.setAttribute('role', 'dialog');
    hop.setAttribute('aria-modal', 'true');

    function dinhDangSoCasio(n, soLe) {
      if (n === null || n === undefined || isNaN(n) || !isFinite(n)) return 'Lỗi phép tính';
      const v = (soLe !== undefined) ? Number(n.toFixed(soLe)) : (Math.round(n * 1e8) / 1e8);
      return String(v).replace('.', ',');
    }

    function tinhBieuThucCasio(raw) {
      let s = String(raw || '').trim();
      if (!s) return 0;
      s = s.replace(/,/g, '.')
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/Ans/g, '(' + (Number(casioAns) || 0) + ')')
        .replace(/√\(/g, 'Math.sqrt(')
        .replace(/\^/g, '**');
      const clean = s.replace(/Math\.sqrt/g, '');
      if (/[^0-9.+\-*/()\s]/.test(clean)) return NaN;
      try {
        const kq = Function('"use strict"; return (' + s + ')')();
        return typeof kq === 'number' ? kq : NaN;
      } catch (e) { return NaN; }
    }

    let casioApi = null;

    function veNoiDung() {
      const vung = hop.querySelector('[data-x="body"]');
      casioApi = null;
      if (tabRef === 'casio') {
        const kqM = tinhPhanTuKhoi(casioFormula);
        const oDangLam = timOTraLoiDangLam_();
        const hienRes = casioVal !== null ? dinhDangSoCasio(casioVal, soLeChon) : (casioExp ? '…' : '0');
        vung.innerHTML =
          '<div class="casio-layout">' +
            '<div class="casio-body">' +
              '<div class="casio-brand"><b>CASIO HÓA 10</b><span>fx-580KNTT · BẤM PHÍM SỐ ĐƯỢC</span></div>' +
              '<div class="casio-lcd">' +
                '<div class="casio-exp" id="cs-exp">' + esc(casioExp || '0') + '</div>' +
                '<div class="casio-res" id="cs-res">' + esc(hienRes) + '</div>' +
              '</div>' +
              '<div class="casio-chem-row">' +
                '<button type="button" class="ck chem" data-ck="/24.79" title="Tính số mol khí đkc: n = V / 24,79">÷24,79</button>' +
                '<button type="button" class="ck chem" data-ck="*24.79" title="Tính thể tích khí đkc: V = n × 24,79">×24,79</button>' +
                '<button type="button" class="ck chem" data-ck="*100" title="Nhân 100%">×100%</button>' +
                '<button type="button" class="ck chem" id="cs-use-m" title="Chèn Phân tử khối M đang tính bên phải">' + (kqM ? ('M=' + String(kqM.M).replace('.', ',')) : 'Chèn M') + '</button>' +
              '</div>' +
              '<div class="casio-keys">' +
                '<button type="button" class="ck num" data-ck="7">7</button>' +
                '<button type="button" class="ck num" data-ck="8">8</button>' +
                '<button type="button" class="ck num" data-ck="9">9</button>' +
                '<button type="button" class="ck del" data-act="del">DEL</button>' +
                '<button type="button" class="ck ac" data-act="ac">AC</button>' +

                '<button type="button" class="ck num" data-ck="4">4</button>' +
                '<button type="button" class="ck num" data-ck="5">5</button>' +
                '<button type="button" class="ck num" data-ck="6">6</button>' +
                '<button type="button" class="ck" data-ck="×">×</button>' +
                '<button type="button" class="ck" data-ck="÷">÷</button>' +

                '<button type="button" class="ck num" data-ck="1">1</button>' +
                '<button type="button" class="ck num" data-ck="2">2</button>' +
                '<button type="button" class="ck num" data-ck="3">3</button>' +
                '<button type="button" class="ck" data-ck="+">+</button>' +
                '<button type="button" class="ck" data-ck="−">−</button>' +

                '<button type="button" class="ck num" data-ck="0">0</button>' +
                '<button type="button" class="ck num" data-ck=".">,</button>' +
                '<button type="button" class="ck" data-ck="(">(</button>' +
                '<button type="button" class="ck" data-ck=")">)</button>' +
                '<button type="button" class="ck eq" data-act="eq">=</button>' +

                '<button type="button" class="ck" data-ck="^2">x²</button>' +
                '<button type="button" class="ck" data-ck="√(">√</button>' +
                '<button type="button" class="ck" data-ck="*10^">10ˣ</button>' +
                '<button type="button" class="ck" data-ck="Ans">Ans</button>' +
                '<button type="button" class="ck" data-act="copy" title="Copy kết quả vào bộ nhớ tạm">Copy</button>' +
              '</div>' +
              '<div class="casio-round" style="flex-wrap:wrap;gap:6px">' +
                '<span>Làm tròn:</span>' +
                '<div style="display:flex;gap:4px;flex-wrap:wrap">' +
                  '<button type="button" data-rnd="1">1 lẻ</button>' +
                  '<button type="button" data-rnd="2">2 lẻ</button>' +
                  '<button type="button" data-rnd="3">3 lẻ</button>' +
                  (oDangLam ? '<button type="button" data-act="fill" style="background:#0f766e;color:#fff;border-color:#14b8a6;font-weight:800" title="Điền thẳng kết quả vào ô Trả lời ngắn đang mở">↳ Điền đáp số</button>' : '') +
                '</div>' +
              '</div>' +
            '</div>' +

            '<div style="display:flex;flex-direction:column;gap:10px">' +
              '<div class="mm-card">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap">' +
                  '<b style="font-size:14px;color:var(--do)">🧪 Tính tự động Phân tử khối M &amp; % Nguyên tố</b>' +
                  '<span class="chip tim">Chuẩn SGK KNTT</span>' +
                '</div>' +
                '<div style="display:flex;gap:6px">' +
                  '<input id="mm-inp" type="text" value="' + esc(casioFormula) + '" placeholder="Gõ công thức: H2SO4, Fe2(SO4)3, CuSO4.5H2O..." style="flex:1;font-weight:700">' +
                  (kqM ? '<button type="button" class="nut nho chinh" id="mm-to-casio">Đưa M=' + String(kqM.M).replace('.', ',') + ' vào Casio</button>' : '') +
                '</div>' +
                '<div class="mm-chips">' +
                  ['H2SO4', 'HCl', 'HNO3', 'NaOH', 'Ca(OH)2', 'NaCl', 'AgNO3', 'CaCO3', 'Fe2O3', 'Fe2(SO4)3', 'CuSO4.5H2O', 'Al2(SO4)3', 'KMnO4'].map(function (c) {
                    return '<button type="button" class="mm-chip" data-f="' + c + '">' + md(c) + '</button>';
                  }).join('') +
                '</div>' +
                '<div id="mm-kq">' +
                  (kqM
                    ? ('<div style="background:var(--the);border:1px solid var(--ok-v);border-radius:11px;padding:10px 12px">' +
                        '<div style="font-size:16px;font-weight:800;color:var(--ok)">M(' + md(casioFormula) + ') = ' + String(kqM.M).replace('.', ',') + ' g/mol</div>' +
                        '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">' +
                          kqM.ct.map(function (x) {
                            return '<span class="chip"><b>' + esc(x.kh) + '</b>×' + x.so + ' = ' + String(x.m).replace('.', ',') + ' (' + String(x.pct).replace('.', ',') + '%)</span>';
                          }).join('') +
                        '</div>' +
                      '</div>')
                    : '<div class="phu" style="font-size:12.5px">Nhập đúng kí hiệu nguyên tố viết hoa chữ cái đầu (ví dụ: <code>Na2CO3</code>, <code>Fe(OH)3</code>).</div>') +
                '</div>' +
              '</div>' +

              '<div class="mm-card">' +
                '<b style="font-size:13.8px;color:var(--tim)">⚡ Đổi nhanh Mol (n) ⇄ Khối lượng (m) ⇄ Thể tích khí đkc (24,79 L)</b>' +
                '<div class="hang" style="gap:8px">' +
                  '<div class="truong" style="flex:1 1 105px"><label style="font-size:11.5px">Số mol n (mol)</label><input id="cv-n" type="text" inputmode="decimal" placeholder="VD: 0,2"></div>' +
                  '<div class="truong" style="flex:1 1 115px"><label style="font-size:11.5px">Khối lượng m (g)</label><input id="cv-m" type="text" inputmode="decimal" placeholder="m = n × M"></div>' +
                  '<div class="truong" style="flex:1 1 115px"><label style="font-size:11.5px">V khí đkc (L)</label><input id="cv-v" type="text" inputmode="decimal" placeholder="V = n × 24,79"></div>' +
                '</div>' +
                '<span class="phu" style="font-size:11.5px">Gõ vào 1 trong 3 ô trên, 2 ô còn lại sẽ tự nhảy theo M(' + md(casioFormula) + ') = <b>' + (kqM ? String(kqM.M).replace('.', ',') : '–') + '</b> và <b>24,79 L/mol</b>.</span>' +
              '</div>' +
            '</div>' +
          '</div>';

        const capNhatLCD = function () {
          const eEl = vung.querySelector('#cs-exp'), rEl = vung.querySelector('#cs-res');
          if (eEl) eEl.textContent = casioExp || '0';
          if (rEl) rEl.textContent = casioVal !== null ? dinhDangSoCasio(casioVal, soLeChon) : (casioExp ? '…' : '0');
        };
        const bamCasio = function (tok) {
          soLeChon = undefined;
          if (casioVal !== null && /^[0-9.(√]/.test(tok)) {
            casioExp = '';
          } else if (casioVal !== null && /^[+−×÷*/^]/.test(tok)) {
            casioExp = 'Ans';
          }
          casioVal = null;
          casioExp += tok;
          const thu = tinhBieuThucCasio(casioExp);
          const rEl = vung.querySelector('#cs-res'), eEl = vung.querySelector('#cs-exp');
          if (eEl) eEl.textContent = casioExp;
          if (rEl) rEl.textContent = (!isNaN(thu) && isFinite(thu)) ? ('= ' + dinhDangSoCasio(thu)) : '…';
        };
        const thucHienAct = function (act) {
          if (act === 'ac') { casioExp = ''; casioVal = null; soLeChon = undefined; capNhatLCD(); }
          else if (act === 'del') { casioExp = casioExp.slice(0, -1); casioVal = null; soLeChon = undefined; capNhatLCD(); }
          else if (act === 'eq') {
            const kq = tinhBieuThucCasio(casioExp);
            casioVal = kq;
            if (!isNaN(kq) && isFinite(kq)) casioAns = kq;
            capNhatLCD();
          } else if (act === 'copy' || act === 'fill') {
            const v = casioVal !== null ? casioVal : tinhBieuThucCasio(casioExp);
            if (!isNaN(v) && isFinite(v)) {
              const str = dinhDangSoCasio(v, soLeChon);
              if (act === 'copy') {
                try { navigator.clipboard.writeText(str); } catch (e) {}
                toast('Đã copy kết quả: ' + str);
              } else {
                const targetInp = timOTraLoiDangLam_();
                if (!targetInp) { toast('Không tìm thấy ô Trả lời ngắn đang mở.', true); return; }
                targetInp.value = str;
                targetInp.dispatchEvent(new Event('input', { bubbles: true }));
                targetInp.style.boxShadow = '0 0 0 3px var(--ok-v)';
                setTimeout(function () { targetInp.style.boxShadow = ''; }, 1400);
                toast('Đã điền "' + str + '" vào ô trả lời ngắn ✓');
              }
            } else {
              toast('Chưa có kết quả số hợp lệ để lấy.', true);
            }
          }
        };
        casioApi = { bam: bamCasio, act: thucHienAct };

        vung.querySelectorAll('[data-ck]').forEach(function (b) {
          b.onclick = function () { bamCasio(b.getAttribute('data-ck')); };
        });
        vung.querySelectorAll('[data-act]').forEach(function (b) {
          b.onclick = function () { thucHienAct(b.getAttribute('data-act')); };
        });
        vung.querySelectorAll('[data-rnd]').forEach(function (b) {
          b.onclick = function () {
            const soLe = Number(b.getAttribute('data-rnd'));
            const v = casioVal !== null ? casioVal : tinhBieuThucCasio(casioExp);
            if (!isNaN(v) && isFinite(v)) {
              soLeChon = soLe;
              casioVal = v;
              casioAns = v;
              const rEl = vung.querySelector('#cs-res');
              if (rEl) rEl.textContent = dinhDangSoCasio(v, soLe);
            }
          };
        });
        const useM = vung.querySelector('#cs-use-m');
        if (useM) useM.onclick = function () {
          const mObj = tinhPhanTuKhoi(casioFormula);
          if (mObj) bamCasio(String(mObj.M));
        };
        const toCasio = vung.querySelector('#mm-to-casio');
        if (toCasio) toCasio.onclick = function () {
          const mObj = tinhPhanTuKhoi(casioFormula);
          if (mObj) bamCasio(String(mObj.M));
        };
        const mmInp = vung.querySelector('#mm-inp');
        if (mmInp) {
          mmInp.oninput = function () {
            casioFormula = this.value;
            const pos = this.selectionStart;
            veNoiDung();
            const inp2 = hop.querySelector('#mm-inp');
            if (inp2) { inp2.focus(); try { inp2.setSelectionRange(pos, pos); } catch (e) {} }
          };
        }
        vung.querySelectorAll('[data-f]').forEach(function (b) {
          b.onclick = function () { casioFormula = b.getAttribute('data-f'); veNoiDung(); };
        });

        // Đổi nhanh n - m - V
        const inpN = vung.querySelector('#cv-n'), inpM = vung.querySelector('#cv-m'), inpV = vung.querySelector('#cv-v');
        const docSo = function (s) { return parseFloat(String(s || '').replace(',', '.')); };
        if (inpN && inpM && inpV) {
          inpN.oninput = function () {
            const n = docSo(this.value);
            const mObj = tinhPhanTuKhoi(casioFormula);
            if (isNaN(n)) { inpM.value = ''; inpV.value = ''; return; }
            inpV.value = dinhDangSoCasio(n * 24.79, 3);
            if (mObj) inpM.value = dinhDangSoCasio(n * mObj.M, 3);
          };
          inpM.oninput = function () {
            const m = docSo(this.value);
            const mObj = tinhPhanTuKhoi(casioFormula);
            if (isNaN(m) || !mObj || !mObj.M) { inpN.value = ''; inpV.value = ''; return; }
            const n = m / mObj.M;
            inpN.value = dinhDangSoCasio(n, 4);
            inpV.value = dinhDangSoCasio(n * 24.79, 3);
          };
          inpV.oninput = function () {
            const v = docSo(this.value);
            const mObj = tinhPhanTuKhoi(casioFormula);
            if (isNaN(v)) { inpN.value = ''; inpM.value = ''; return; }
            const n = v / 24.79;
            inpN.value = dinhDangSoCasio(n, 4);
            if (mObj) inpM.value = dinhDangSoCasio(n * mObj.M, 3);
          };
        }
      } else if (tabRef === 'nt') {
        const q = qRef.trim().toLowerCase();
        const ds = BANG_NT_SGK.filter(function (e) {
          if (loaiRef && e.loai !== loaiRef) return false;
          if (!q) return true;
          return (e.kh.toLowerCase() === q) || (String(e.z) === q) ||
            ((e.kh + ' ' + e.ten + ' ' + e.m + ' ' + e.nhom).toLowerCase().indexOf(q) >= 0);
        });
        vung.innerHTML =
          '<div class="hang" style="margin-bottom:10px;align-items:center">' +
            '<input id="ref-q" type="search" placeholder="Gõ kí hiệu, số hiệu Z, tên hoặc M (VD: Fe, 26, 35,5, Cl)..." value="' + esc(qRef) + '" style="flex:2 1 220px">' +
            '<div class="seg">' +
              '<button type="button" data-rl="" class="' + (!loaiRef ? 'on' : '') + '">Tất cả (' + BANG_NT_SGK.length + ')</button>' +
              '<button type="button" data-rl="kl" class="' + (loaiRef === 'kl' ? 'on' : '') + '">Kim loại</button>' +
              '<button type="button" data-rl="pk" class="' + (loaiRef === 'pk' ? 'on' : '') + '">Phi kim</button>' +
              '<button type="button" data-rl="kh" class="' + (loaiRef === 'kh' ? 'on' : '') + '">Khí hiếm</button>' +
            '</div>' +
          '</div>' +
          '<div class="ref-grid">' + (ds.length ? ds.map(function (e) {
            return '<div class="ref-el ' + e.loai + '">' +
              '<div style="display:flex;justify-content:space-between;align-items:center">' +
                '<span class="ref-el-kh">' + esc(e.kh) + '</span>' +
                '<button type="button" class="btn-speak" style="width:24px;height:24px;font-size:11px" data-say="' + esc(e.ten.replace(/\s*\(.*\)/, '')) + '" title="Nghe phát âm IUPAC">🔊</button>' +
              '</div>' +
              '<div class="ref-el-ten">' + esc(e.ten) + ' <span class="phu" style="font-size:10.5px">(Z=' + e.z + ')</span></div>' +
              '<div class="ref-el-m">M = ' + esc(e.m) + ' <span class="phu" style="font-weight:500;font-size:11px">· χ = ' + esc(e.chi) + '</span></div>' +
              '<div class="ref-el-cfg">' + esc(e.cfg) + '</div>' +
              '<div class="phu" style="font-size:10.8px">CK ' + e.ck + ' · Nhóm ' + esc(e.nhom) + '</div>' +
            '</div>';
          }).join('') : '<div class="phu" style="grid-column:1/-1;text-align:center;padding:18px">Không tìm thấy nguyên tố khớp từ khóa.</div>') +
          '</div>';
        const inp = vung.querySelector('#ref-q');
        if (inp) {
          inp.oninput = function () {
            qRef = this.value;
            const pos = this.selectionStart;
            veNoiDung();
            const inp2 = hop.querySelector('#ref-q');
            if (inp2) { inp2.focus(); try { inp2.setSelectionRange(pos, pos); } catch (e) {} }
          };
        }
        vung.querySelectorAll('[data-rl]').forEach(function (b) {
          b.onclick = function () { loaiRef = b.getAttribute('data-rl'); veNoiDung(); };
        });
        vung.querySelectorAll('[data-say]').forEach(function (b) {
          b.onclick = function () { phatAmIUPAC_(b.getAttribute('data-say')); };
        });
      } else if (tabRef === 'iupac') {
        const q = qIupac.trim().toLowerCase();
        const ds = BANG_IUPAC_HOA10.filter(function (x) {
          if (loaiIupac && x.loai !== loaiIupac) return false;
          if (!q) return true;
          return (x.ct + ' ' + x.en + ' ' + x.vi).toLowerCase().indexOf(q) >= 0;
        });
        vung.innerHTML =
          '<div class="hang" style="margin-bottom:10px;align-items:center">' +
            '<input id="iupac-q" type="search" placeholder="Tìm công thức, tên Anh hoặc tên Việt cũ (VD: sulfate, sunfat, KMnO4, sắt)..." value="' + esc(qIupac) + '" style="flex:2 1 220px">' +
            '<div class="seg">' +
              '<button type="button" data-il="" class="' + (!loaiIupac ? 'on' : '') + '">Tất cả (' + BANG_IUPAC_HOA10.length + ')</button>' +
              '<button type="button" data-il="nt" class="' + (loaiIupac === 'nt' ? 'on' : '') + '">Nguyên tố</button>' +
              '<button type="button" data-il="ion" class="' + (loaiIupac === 'ion' ? 'on' : '') + '">Ion / Gốc acid</button>' +
              '<button type="button" data-il="hc" class="' + (loaiIupac === 'hc' ? 'on' : '') + '">Hợp chất</button>' +
              '<button type="button" data-il="tn" class="' + (loaiIupac === 'tn' ? 'on' : '') + '">Thuật ngữ</button>' +
            '</div>' +
          '</div>' +
          '<div class="iupac-grid">' + (ds.length ? ds.map(function (x) {
            return '<div class="iupac-item">' +
              '<div style="min-width:0">' +
                '<div style="display:flex;align-items:baseline;gap:7px;flex-wrap:wrap">' +
                  '<b style="color:var(--do);font-size:14.5px">' + md(x.ct) + '</b>' +
                  '<b style="font-size:14px">' + esc(x.en) + '</b>' +
                '</div>' +
                '<div style="font-size:12px;color:var(--tim);font-family:monospace">' + esc(x.pa) + '</div>' +
                '<div class="phu" style="font-size:11.8px;margin-top:2px">' + esc(x.vi) + '</div>' +
              '</div>' +
              '<button type="button" class="btn-speak" data-say="' + esc(x.en) + '" title="Bấm để nghe phát âm tiếng Anh chuẩn">🔊</button>' +
            '</div>';
          }).join('') : '<div class="phu" style="grid-column:1/-1;text-align:center;padding:18px">Không tìm thấy mục nào khớp từ khóa.</div>') +
          '</div>';
        const inpI = vung.querySelector('#iupac-q');
        if (inpI) {
          inpI.oninput = function () {
            qIupac = this.value;
            const pos = this.selectionStart;
            veNoiDung();
            const inp2 = hop.querySelector('#iupac-q');
            if (inp2) { inp2.focus(); try { inp2.setSelectionRange(pos, pos); } catch (e) {} }
          };
        }
        vung.querySelectorAll('[data-il]').forEach(function (b) {
          b.onclick = function () { loaiIupac = b.getAttribute('data-il'); veNoiDung(); };
        });
        vung.querySelectorAll('[data-say]').forEach(function (b) {
          b.onclick = function () { phatAmIUPAC_(b.getAttribute('data-say')); };
        });
      } else {
        vung.innerHTML =
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;max-height:420px;overflow-y:auto">' +
            '<div class="lab-sec"><h3>⚗️ Hằng số &amp; Công thức Mol (Chuẩn KNTT)</h3>' +
              '<div style="font-size:13px;line-height:1.6">' +
                '• <b>Điều kiện chuẩn (đkc: 25 °C, 1 bar):</b><br>  <b>V = n × 24,79</b> (L) ⇒ <b>n = V / 24,79</b> (mol)<br>' +
                '• <b>Khối lượng &amp; Nồng độ:</b><br>  <b>n = m / M</b> · <b>C<sub>M</sub> = n / V<sub>dd(L)</sub></b> · <b>C% = (m<sub>ct</sub> / m<sub>dd</sub>) × 100%</b><br>' +
                '• <b>Số Avogadro:</b> N<sub>A</sub> ≈ 6,022 × 10²³ hạt/mol<br>' +
                '• <b>Hạt cơ bản:</b> Z = số p = số e · Số khối <b>A = Z + N</b>' +
              '</div></div>' +
            '<div class="lab-sec"><h3>🔗 Hiệu độ âm điện &amp; Liên kết (Pauling)</h3>' +
              '<div style="font-size:13px;line-height:1.6">' +
                '• <b>0 ≤ Δχ &lt; 0,4:</b> Cộng hóa trị không phân cực<br>' +
                '• <b>0,4 ≤ Δχ &lt; 1,7:</b> Cộng hóa trị phân cực<br>' +
                '• <b>Δχ ≥ 1,7:</b> Liên kết ion (điển hình: KL mạnh + PK mạnh)<br>' +
                '• <b>Liên kết Hydrogen:</b> H gắn trực tiếp với <b>F, O, N</b> hút cặp e riêng của F, O, N khác (làm tăng nhiệt độ sôi &amp; độ tan trong nước).' +
              '</div></div>' +
            '<div class="lab-sec"><h3>🔥 Biến thiên Enthalpy (Chương 5)</h3>' +
              '<div style="font-size:13px;line-height:1.6">' +
                '• <b>Δ<sub>r</sub>H°<sub>298</sub> &lt; 0:</b> Phản ứng <b>TỎA NHIỆT</b> (thuận lợi)<br>' +
                '• <b>Δ<sub>r</sub>H°<sub>298</sub> &gt; 0:</b> Phản ứng <b>THU NHIỆT</b><br>' +
                '• <b>Theo nhiệt tạo thành (Δ<sub>f</sub>H°):</b><br>  Δ<sub>r</sub>H°<sub>298</sub> = ∑Δ<sub>f</sub>H°<sub>298</sub>(sản phẩm) − ∑Δ<sub>f</sub>H°<sub>298</sub>(chất đầu)<br>' +
                '• <b>Theo năng lượng liên kết (E<sub>b</sub>):</b><br>  Δ<sub>r</sub>H°<sub>298</sub> = ∑E<sub>b</sub>(chất đầu) − ∑E<sub>b</sub>(sản phẩm)' +
              '</div></div>' +
            '<div class="lab-sec"><h3>🧪 Tốc độ phản ứng &amp; Nhận biết Halogen</h3>' +
              '<div style="font-size:13px;line-height:1.6">' +
                '• <b>Hệ số nhiệt độ Van’t Hoff:</b> v<sub>2</sub> / v<sub>1</sub> = γ<sup>(T<sub>2</sub> − T<sub>1</sub>)/10</sup><br>' +
                '• <b>Nhận biết ion Halide bằng AgNO<sub>3</sub>:</b><br>  <b>F⁻</b> (không ↓) · <b>Cl⁻</b> (AgCl↓ trắng) · <b>Br⁻</b> (AgBr↓ vàng nhạt) · <b>I⁻</b> (AgI↓ vàng đậm)<br>' +
                '• <b>Dãy hoạt động KL:</b> K, Ba, Ca, Na, Mg, Al, Zn, Fe, Ni, Sn, Pb, (H), Cu, Hg, Ag, Pt, Au.' +
              '</div></div>' +
          '</div>';
      }
    }

    hop.innerHTML = '<div class="the rong" style="max-width:860px;display:flex;flex-direction:column;gap:12px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
          '<b style="font-size:16.5px">⚛️ Casio &amp; Sổ tay Hóa 10</b>' +
          '<div class="seg" style="flex-wrap:wrap">' +
            '<button type="button" data-rt="casio" class="' + (tabRef === 'casio' ? 'on' : '') + '">🧮 Casio &amp; M</button>' +
            '<button type="button" data-rt="nt" class="' + (tabRef === 'nt' ? 'on' : '') + '">⚛️ Nguyên tố</button>' +
            '<button type="button" data-rt="iupac" class="' + (tabRef === 'iupac' ? 'on' : '') + '">🔤 Danh pháp IUPAC</button>' +
            '<button type="button" data-rt="ct" class="' + (tabRef === 'ct' ? 'on' : '') + '">📐 Công thức</button>' +
          '</div>' +
        '</div>' +
        '<div class="hang-nut" style="gap:6px">' +
          '<button type="button" class="nut nho vien" data-x="half" title="Thu xuống nửa dưới màn hình để vừa nhìn đề vừa bấm Casio">' + (thuNho ? '⛶ Mở rộng' : '⬓ Vừa nhìn đề') + '</button>' +
          '<button type="button" class="nut nho chinh" data-x="dong">Đóng (Esc)</button>' +
        '</div>' +
      '</div>' +
      '<div data-x="body"></div>' +
    '</div>';

    document.body.appendChild(hop);
    veNoiDung();

    const dong = function () { hop.remove(); document.removeEventListener('keydown', onKeyModal); };
    const onKeyModal = function (e) {
      if (e.key === 'Escape') { dong(); return; }
      if (tabRef !== 'casio' || !casioApi || e.ctrlKey || e.metaKey || e.altKey) return;
      const ae = document.activeElement;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
      const k = e.key;
      if (/^[0-9]$/.test(k)) { e.preventDefault(); casioApi.bam(k); }
      else if (k === '.' || k === ',') { e.preventDefault(); casioApi.bam('.'); }
      else if (k === '+') { e.preventDefault(); casioApi.bam('+'); }
      else if (k === '-') { e.preventDefault(); casioApi.bam('−'); }
      else if (k === '*') { e.preventDefault(); casioApi.bam('×'); }
      else if (k === '/') { e.preventDefault(); casioApi.bam('÷'); }
      else if (k === '^' || k === '(' || k === ')') { e.preventDefault(); casioApi.bam(k); }
      else if (k === 'Enter' || k === '=') { e.preventDefault(); casioApi.act('eq'); }
      else if (k === 'Backspace') { e.preventDefault(); casioApi.act('del'); }
      else if (k === 'Delete') { e.preventDefault(); casioApi.act('ac'); }
    };
    document.addEventListener('keydown', onKeyModal);
    hop.onclick = function (e) { if (e.target === hop) dong(); };
    hop.querySelector('[data-x="dong"]').onclick = dong;
    const btnHalf = hop.querySelector('[data-x="half"]');
    if (btnHalf) btnHalf.onclick = function () {
      thuNho = !thuNho;
      hop.classList.toggle('half-sheet', thuNho);
      btnHalf.textContent = thuNho ? '⛶ Mở rộng' : '⬓ Vừa nhìn đề';
    };
    hop.querySelectorAll('[data-rt]').forEach(function (b) {
      b.onclick = function () {
        tabRef = b.getAttribute('data-rt');
        hop.querySelectorAll('[data-rt]').forEach(function (x) { x.classList.toggle('on', x === b); });
        veNoiDung();
      };
    });
  }

  // ---- Thanh Dock dưới đáy cho Điện thoại + Nút Tra cứu Casio trên Topbar + Brand về Trang chủ ----
  function ganThanhDieuHuongHS(activePage, opts) {
    opts = opts || {};
    prefetchPages();
    document.body.classList.add('has-mob-dock');

    // Đồng bộ Avatar Thầy Hoàng trên Topbar (.brand-mark) & Favicon toàn bộ các trang học sinh
    const brandIc = document.querySelector('.topbar .brand-mark');
    if (brandIc && !brandIc.getAttribute('data-mascot-av')) {
      brandIc.setAttribute('data-mascot-av', '1');
      const av = new Image();
      av.className = 'brand-av';
      av.alt = 'Thầy Hoàng';
      av.onload = function () { brandIc.innerHTML = ''; brandIc.appendChild(av); };
      av.src = mascotUrl('mascot-avatar.webp');
    }
    if (!document.querySelector('link[rel="icon"]')) {
      const fav = document.createElement('link');
      fav.rel = 'icon';
      fav.type = 'image/webp';
      fav.href = mascotUrl('mascot-avatar.webp');
      document.head.appendChild(fav);
    }

    // Cho phép bấm vào .brand ở các trang con để về Trang chủ
    const brand = document.querySelector('.topbar .brand');
    if (brand && activePage !== 'home') {
      brand.classList.add('brand-link');
      brand.title = 'Về Trang chủ Hóa 10';
      brand.setAttribute('role', 'link');
      brand.tabIndex = 0;
      const veHome = function () {
        if (document.body.classList.contains('dang-lam')) return;
        const l = linkTrang('home', opts);
        if (l.target === '_blank') window.open(l.href, '_blank');
        else if (l.target === '_top') { try { window.top.location.href = l.href; } catch (e) { window.location.href = l.href; } }
        else window.location.href = l.href;
      };
      brand.onclick = veHome;
      brand.onkeydown = function (e) { if (e.key === 'Enter') veHome(); };
    }

    // Thêm nút "🧮 Casio" vào .top-right nếu chưa có
    const tr = document.querySelector('.topbar .top-right');
    if (tr && !document.getElementById('btn-quick-ref')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.id = 'btn-quick-ref';
      b.className = 'top-pill';
      b.title = 'Mở Máy tính Casio Hóa học, Danh pháp IUPAC & Công thức (Phím tắt: Alt + P)';
      b.innerHTML = '🧮 <span>Casio</span>';
      b.onclick = function () { moBangTraCuu('casio'); };
      const themeBtn = document.getElementById('btn-theme');
      if (themeBtn) tr.insertBefore(b, themeBtn);
      else tr.appendChild(b);
    }

    // Nút tròn nổi Casio ở góc dưới bên phải (trượt theo khi cuộn trang)
    if (!document.getElementById('h10-casio-fab')) {
      const fab = document.createElement('button');
      fab.type = 'button';
      fab.id = 'h10-casio-fab';
      fab.className = 'btn-casio-fab';
      fab.title = 'Mở Máy tính Casio & Danh pháp IUPAC Hóa 10 (Alt + P)';
      fab.innerHTML = '🧮 <span>Casio</span>';
      fab.onclick = function () { moBangTraCuu('casio'); };
      document.body.appendChild(fab);
    }

    // Gắn class .top-nav-link cho các nút chuyển trang trên topbar để tự ẩn ở <=640px (nhường chỗ cho Bottom Dock)
    ['btn-home', 'btn-btvn', 'btn-tailieu', 'btn-lab', 'btn-game'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.classList.add('top-nav-link');
    });
    if (tr) {
      tr.querySelectorAll('.top-pill.on').forEach(function (el) { el.classList.add('top-nav-link'); });
    }

    // Tạo hoặc cập nhật Mobile Bottom Dock
    let dock = document.getElementById('h10-mob-dock');
    if (!dock) {
      dock = document.createElement('nav');
      dock.id = 'h10-mob-dock';
      dock.className = 'mob-dock';
      dock.setAttribute('aria-label', 'Điều hướng nhanh');
      document.body.appendChild(dock);
    }
    const items = [
      { id: 'home', ic: '🏠', ten: 'Trang chủ' },
      { id: 'btvn', ic: '📝', ten: 'Làm BTVN' },
      { id: 'tailieu', ic: '📚', ten: 'Tài liệu' },
      { id: 'thinghiem', ic: '🔬', ten: 'Thí nghiệm' },
      { id: 'trochoi', ic: '🎮', ten: 'Trò chơi' }
    ];
    dock.innerHTML = items.map(function (it) {
      const l = linkTrang(it.id, opts);
      const isCur = it.id === activePage;
      return '<a href="' + esc(l.href) + '" target="' + l.target + '" class="' + (isCur ? 'on' : '') + '"' + (isCur ? ' aria-current="page"' : '') + '>' +
        '<i aria-hidden="true">' + it.ic + '</i><span>' + esc(it.ten) + '</span></a>';
    }).join('');
  }

  // Phím tắt toàn cục trên Máy tính: Alt + P mở Bảng tra cứu Hóa 10
  document.addEventListener('keydown', function (e) {
    if (e.altKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      moBangTraCuu();
    }
  });

  try {
    if (window.top !== window.self) document.documentElement.classList.add('in-iframe');
  } catch (e) {
    document.documentElement.classList.add('in-iframe');
  }
  apTheme(layTheme());

  return {
    esc: esc,
    md: md,
    dinhDangCongThuc: dinhDangCongThuc,
    tenDep: tenDep,
    phaoGiay: phaoGiay,
    laGAS: laGAS,
    GAS_EXEC_URL: GAS_EXEC_URL,
    layTheme: layTheme,
    apTheme: apTheme,
    ganNutTheme: ganNutTheme,
    api: api,
    getLocation: getLocation,
    linkTrang: linkTrang,
    toast: toast,
    skelCards: skelCards,
    laDienThoai: laDienThoai,
    renderSlogan: renderSlogan,
    renderGalleryHoa10: renderGalleryHoa10,
    GALLERY_HOA10: GALLERY_HOA10,
    moBangTraCuu: moBangTraCuu,
    ganThanhDieuHuongHS: ganThanhDieuHuongHS,
    docCacheUI: docCacheUI,
    ghiCacheUI: ghiCacheUI,
    ganBungCoVu: ganBungCoVu,
    mascotUrl: mascotUrl,
    veMascot: veMascot,
    kichHoatMascot: kichHoatMascot,
    ganNutLenDau: ganNutLenDau,
    ICONS: ICONS
  };
})();
