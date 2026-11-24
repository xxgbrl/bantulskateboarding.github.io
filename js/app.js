(() => {
"use strict";

/* 1. HELPER */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const src = p => esc(String(p || "").replace(/^\/+/, ""));
const fmt = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
const paras = a => (a || []).map(t => `<p>${fmt(t)}</p>`).join("");
const sup = s => s.replace(/^(\d)(st|nd|rd|th)(.*)$/, "$1<sup>$2</sup>$3");
const isUrl = h => /^https?:/.test(h);
const linkAttrs = h => `href="${esc(h)}"${isUrl(h) ? ' target="_blank" rel="noopener"' : ""}`;
const img = (path, alt, extra = "") => `<img src="${src(path)}" alt="${esc(alt)}" loading="lazy" decoding="async"${extra}>`;
const load = name => fetch(`data/${name}.json`, {cache: "no-cache"}).then(r => { if (!r.ok) throw new Error(`${name} ${r.status}`); return r.json(); });
const run = (name, fn) => load(name).then(fn).catch(e => console.error(`Gagal memuat data/${name}.json`, e));

/* 2. MENU (HP) & SCROLLSPY */
const menuBtn = $("menu-btn"), nav = $("nav");
const setMenu = open => {
  nav.classList.toggle("open", open);
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
};
menuBtn.addEventListener("click", () => setMenu(menuBtn.getAttribute("aria-expanded") !== "true"));
nav.addEventListener("click", e => { if (e.target.closest("a")) setMenu(false); });
document.addEventListener("click", e => { if (!e.target.closest(".site-header")) setMenu(false); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && nav.classList.contains("open")) { setMenu(false); menuBtn.focus(); } });
matchMedia("(min-width:800px)").addEventListener("change", e => { if (e.matches) setMenu(false); });

function initScrollSpy() {
  if (!("IntersectionObserver" in window)) return;
  const links = [...document.querySelectorAll("#nav-list a")];
  const targets = new Map();
  links.forEach(a => {
    const id = (a.getAttribute("href") || "").replace(/^#/, "");
    const el = id && $(id);
    if (el) targets.set(el, a);
  });
  if (!targets.size) return;
  const clear = () => links.forEach(l => l.removeAttribute("aria-current"));
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    clear();
    const a = targets.get(e.target);
    if (a) a.setAttribute("aria-current", "true");
  }), {rootMargin: "-45% 0px -50% 0px"});
  targets.forEach((_, el) => io.observe(el));
  io.observe($("hero"));
}

/* 3. CAROUSEL */
const carousel = (slides, label, opts = {}) => {
  const {top = false, names = [], fit = "max"} = opts;
  const ctl = slides.length > 1 ? `<div class="car-ctl${top ? " top" : ""}">
    <button type="button" class="car-btn" data-dir="-1" aria-label="Sebelumnya">‹</button>
    <div class="car-dots${names.length ? " named" : ""}">${slides.map((_, i) => names[i]
      ? `<button type="button" class="car-dot tab-pill" data-i="${i}">${esc(names[i])}</button>`
      : `<button type="button" class="car-dot" data-i="${i}" aria-label="Halaman ${i + 1}"></button>`).join("")}</div>
    <button type="button" class="car-btn" data-dir="1" aria-label="Berikutnya">›</button>
  </div>` : "";
  return `<div class="car" data-fit="${fit}" role="region" aria-roledescription="carousel" aria-label="${esc(label)}">
    ${top ? ctl : ""}
    <div class="car-track" tabindex="0">${slides.map((x, i) => `<div class="car-slide" role="group" aria-label="${i + 1} / ${slides.length}">${x}</div>`).join("")}</div>
    ${top ? "" : ctl}
  </div>`;
};

const liveCarousels = [];
addEventListener("resize", () => {
  for (let i = liveCarousels.length - 1; i >= 0; i--) {
    if (!liveCarousels[i].track.isConnected) liveCarousels.splice(i, 1);
    else liveCarousels[i].sync();
  }
});

function initCarousels(root) {
  root.querySelectorAll(".car").forEach(car => {
    const track = car.querySelector(".car-track");
    const slides = [...track.children];
    const dots = [...car.querySelectorAll(".car-dot")];
    const [prev, next] = car.querySelectorAll(".car-btn");
    const smooth = !matchMedia("(prefers-reduced-motion:reduce)").matches;
    const uniform = car.dataset.fit !== "active";
    let cur = 0;

    const fit = () => {
      const h = uniform ? Math.max(...slides.map(s => s.offsetHeight)) : slides[cur].offsetHeight;
      track.style.height = h + "px";
    };
    const mark = () => {
      dots.forEach((d, i) => d.setAttribute("aria-current", String(i === cur)));
      if (prev) { prev.disabled = cur === 0; next.disabled = cur === slides.length - 1; }
    };
    const go = i => {
      cur = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({left: cur * track.clientWidth, behavior: smooth ? "smooth" : "auto"});
      mark(); fit();
    };

    track.addEventListener("scroll", () => {
      const i = Math.round(track.scrollLeft / track.clientWidth);
      if (i !== cur && i >= 0 && i < slides.length) { cur = i; mark(); fit(); }
    }, {passive: true});
    if (prev) { prev.addEventListener("click", () => go(cur - 1)); next.addEventListener("click", () => go(cur + 1)); }
    dots.forEach(d => d.addEventListener("click", () => go(+d.dataset.i)));

    if ("ResizeObserver" in window) { const ro = new ResizeObserver(fit); slides.forEach(s => ro.observe(s)); }
    liveCarousels.push({track, sync: () => { track.scrollLeft = cur * track.clientWidth; fit(); }});
    mark(); fit();
  });
}

const mqPhone = matchMedia("(max-width:719px)"), mqWide = matchMedia("(min-width:960px)");
const relayout = [];
[mqPhone, mqWide].forEach(m => m.addEventListener("change", () => relayout.forEach(fn => fn())));

/* 4. RENDER SECTION */
run("site", d => {
  ["logo", "logo2"].forEach(id => {
    if (d.logo) $(id).src = src(d.logo);
    if (d.logo_alt) $(id).alt = d.logo_alt;
  });
  $("footer-text").textContent = d.footer_text || "";
});

run("nav", d => {
  $("nav-list").innerHTML = (d.items || []).map(i => `<li><a ${linkAttrs(i.href)}>${esc(i.label)}</a></li>`).join("");
  initScrollSpy();
});

run("home", d => {
  $("hero-title").textContent = d.title || "";
  $("hero-sub").textContent = d.subtitle || "";
  if (d.image) $("hero").style.backgroundImage = `url("${encodeURI(String(d.image).replace(/^\/+/, "")).replace(/"/g, "%22")}")`;
  $("hero-btns").innerHTML = (d.buttons || []).map(b => `<a class="btn${b.style === "line" ? " line" : ""}" ${linkAttrs(b.href)}>${esc(b.label)}</a>`).join("");
});

run("about", d => {
  $("about").innerHTML = `<div><h2>${fmt(d.heading)}</h2>${paras(d.paragraphs)}</div>${img(d.image, d.alt, ' class="photo"')}`;
});

run("vision", d => {
  $("vision").innerHTML = `<h2>${fmt(d.heading)}</h2><div>
    <div class="block"><h3>+ Vision</h3><p>${fmt(d.vision)}</p></div>
    <div class="block"><h3>+ Mission</h3><ul>${(d.missions || []).map(m => `<li>${fmt(m)}</li>`).join("")}</ul></div>
  </div>`;
});

run("activities", d => {
  const card = x => `<figure class="act">${img(x.image, x.alt, x.focus === "top" ? ' style="object-position:top"' : "")}<figcaption><span class="pill">${esc(x.type)}</span><b>${esc(x.title)}</b></figcaption></figure>`;
  const draw = () => {
    const per = mqPhone.matches ? 4 : 8;
    const items = d.items || [], pages = [];
    for (let i = 0; i < items.length; i += per) pages.push(`<div class="page">${items.slice(i, i + per).map(card).join("")}</div>`);
    $("activities-body").innerHTML = carousel(pages, "Kegiatan");
    initCarousels($("activities-body"));
  };
  $("activities").innerHTML = `<h2>${fmt(d.heading)}</h2><div class="intro">${paras(d.intro)}</div><div id="activities-body"></div>`;
  draw(); relayout.push(draw);
});

run("athletes", d => {
  const who = a => `
    <div class="who">
      <div><h3>${esc(a.name)}’s Achievements</h3>${img(a.image, a.alt, ' class="photo"')}</div>
      <div class="res">${(a.results || []).map(x => {
        const p = esc(x.place);
        return `<div class="${p.startsWith("1") ? "win" : ""}"><strong>${sup(p)}${/^\d/.test(p) ? " Place" : ""}</strong><b>${esc(x.category)}</b><span>${[x.event, x.year].filter(Boolean).map(esc).join(" · ")}</span></div>`;
      }).join("")}</div>
    </div>`;
  const items = d.items || [];
  $("achievements").innerHTML = `
    <div class="two wide-l"><div><h2>${fmt(d.heading)}</h2>${paras(d.intro)}</div>${img(d.image, d.alt, ' class="photo" style="aspect-ratio:4/3;object-position:center 20%"')}</div>
    ${carousel(items.map(who), "Prestasi anggota", {top: true, names: items.map(a => a.name), fit: "active"})}`;
  initCarousels($("achievements"));
});

run("structure", d => {
  const colsFor = n => n <= 3 ? Math.max(n, 1) : (n === 4 ? 2 : 3);
  $("structure").innerHTML = `<div><h2>${fmt(d.heading)}</h2><p>${fmt(d.text)}</p></div>
    <div class="org">${(d.rows || []).map(r => `<div class="row" style="--cols:${colsFor((r.members || []).length)}">${(r.members || []).map(m =>
      `<div class="node${m.featured ? " top" : ""}"><small>${esc(m.role)}</small><strong>${esc(m.name)}</strong></div>`).join("")}</div>`).join("")}</div>`;
});

run("events", d => {
  const groups = new Map();
  (d.items || []).forEach(e => {
    const y = (String(e.date || "").match(/\b(?:19|20)\d{2}\b/) || ["Lainnya"])[0];
    if (!groups.has(y)) groups.set(y, []);
    groups.get(y).push(e);
  });
  const years = [...groups.keys()].sort();
  let cur = [...years].reverse().find(y => y !== "Lainnya") || years[0];

  const li = e => `<li><b>${esc(e.title)}</b><span>${[e.place, e.date].filter(Boolean).map(esc).join(" · ")}</span></li>`;
  const draw = () => {
    const perSlide = mqWide.matches ? 3 : (mqPhone.matches ? 1 : 2);
    const list = groups.get(cur) || [], cols = [], slides = [];
    for (let i = 0; i < list.length; i += 4) cols.push(`<ol class="tl">${list.slice(i, i + 4).map(li).join("")}</ol>`);
    for (let i = 0; i < cols.length; i += perSlide) slides.push(`<div class="tl-slide" style="--cols:${perSlide}">${cols.slice(i, i + perSlide).join("")}</div>`);
    $("events-body").innerHTML = carousel(slides, `Event ${cur}`);
    initCarousels($("events-body"));
  };
  const mark = () => $("events").querySelectorAll(".tab").forEach(t => {
    const on = t.dataset.y === cur;
    t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1;
  });

  $("events").innerHTML = `<h2>${fmt(d.heading)}</h2><div class="intro">${paras(d.intro)}</div>
    <div class="tabs" role="tablist" aria-label="Pilih tahun">${years.map(y => `<button type="button" role="tab" class="tab tab-pill" data-y="${esc(y)}">${esc(y)}</button>`).join("")}</div>
    <div id="events-body" role="tabpanel"></div>`;
  const tabs = $("events").querySelector(".tabs");
  tabs.addEventListener("click", e => { const t = e.target.closest(".tab"); if (t) { cur = t.dataset.y; mark(); draw(); } });
  tabs.addEventListener("keydown", e => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = years.indexOf(cur) + (e.key === "ArrowRight" ? 1 : -1);
    if (i < 0 || i >= years.length) return;
    cur = years[i]; mark(); draw(); tabs.querySelector(`[data-y="${cur}"]`).focus();
  });
  mark(); draw(); relayout.push(draw);
});

run("gallery", d => {
  const PER_SLIDE = 6;
  const cell = g => `<div class="jitem">${img(g.image, g.alt)}</div>`;
  const draw = () => {
    const perRow = mqPhone.matches ? 2 : 3;
    const items = d.items || [], slides = [];
    for (let i = 0; i < items.length; i += PER_SLIDE) {
      const chunk = items.slice(i, i + PER_SLIDE), rows = [];
      for (let j = 0; j < chunk.length; j += perRow) {
        const r = chunk.slice(j, j + perRow);
        rows.push(`<div class="jrow${r.length < perRow ? " part" : ""}" style="--per:${perRow}">${r.map(cell).join("")}</div>`);
      }
      slides.push(`<div class="jslide">${rows.join("")}</div>`);
    }
    const body = $("gallery-body");
    body.innerHTML = carousel(slides, "Galeri");
    body.querySelectorAll(".jitem img").forEach(im => {
      const set = () => {
        if (!im.naturalWidth) return;
        const ar = Math.min(1.5, Math.max(0.75, im.naturalWidth / im.naturalHeight));
        im.parentElement.style.setProperty("--ar", ar.toFixed(3));
      };
      if (im.complete) set(); else im.addEventListener("load", set, {once: true});
    });
    initCarousels(body);
  };
  $("gallery").innerHTML = `<h2>${fmt(d.heading)}</h2><div id="gallery-body"></div>`;
  draw(); relayout.push(draw);
});

run("contact", d => {
  const num = String(d.whatsapp_number || "").replace(/\D/g, "");
  const wa = t => `https://wa.me/${num}?text=${encodeURIComponent(t || "")}`;
  const ig = String(d.person_instagram || "").replace(/^@/, "");
  const ext = u => `href="${esc(u)}" target="_blank" rel="noopener"`;
  $("contact").innerHTML = `
    <div>
      <h2>${fmt(d.heading)}</h2>
      <h3>Media sosial komunitas</h3>
      <dl>${(d.socials || []).map(s => `<dt>${esc(s.platform)}</dt><dd>${(s.accounts || []).map(a => `<a ${ext(a.url)}>${esc(a.handle)}</a>`).join("<br>")}</dd>`).join("")}</dl>
      <h3>Contact person</h3>
      <dl>
        <dt>Nama</dt><dd>${esc(d.person_name)}</dd>
        ${ig ? `<dt>Instagram</dt><dd><a ${ext("https://instagram.com/" + ig)}>@${esc(ig)}</a></dd>` : ""}
        ${num ? `<dt>WhatsApp</dt><dd><a ${ext(wa(d.whatsapp_greeting))}>${esc(d.whatsapp_display || "+" + num)}</a></dd>` : ""}
      </dl>
      ${num ? `<a class="btn" ${ext(wa(d.button_message))}>${esc(d.button_label || "Chat lewat WhatsApp")}</a>` : ""}
    </div>${img(d.image, d.alt, ' class="photo"')}`;
});
})();
