"use strict";
/* =========================================================
   K-Dramatic Girls · Planner
   Data is kept in ONE of two places:
   - this browser only (localStorage): works right away, no setup
   - Firebase Firestore: Cat and Mandu share one live planner (setup: README.md + config.js)
   The screens below never care which one is used; they all go through Store.
   ========================================================= */

/* ---------- things you might want to change ---------- */
const STATUSES = [
  { key: "idea",      label: "Idea" },
  { key: "planning",  label: "Planning" },
  { key: "script",    label: "Scripting" },
  { key: "recorded",  label: "Recorded" },
  { key: "editing",   label: "Editing" },
  { key: "published", label: "Published" }
];
const LINKS = [
  { key: "spotify",   label: "Spotify" },
  { key: "apple",     label: "Apple Podcasts" },
  { key: "youtube",   label: "YouTube Music" },
  { key: "instagram", label: "Instagram" },
  { key: "website",   label: "Podcast website" },
  { key: "riverside", label: "Riverside (recording)" }
];
const EMOJIS = ["💡", "🔥", "💖", "✨", "🤔", "😂", "📌", "🎙️", "🐱", "🥟"];
const PEOPLE = ["cat", "mandu"];
const FIREBASE_VERSION = "10.12.2";

/* ---------- starting content (used once, when the planner is empty) ---------- */
const T0 = Date.UTC(2026, 9, 1, 9, 0, 0);
function seedData() {
  const d = { info: {}, todos: {}, cal: {}, episodes: {}, epnotes: {}, ideas: {} };
  d.info.main = {
    name: "K-Dramatic Girls",
    tagline: "Two Korean girls, everyday stories, and the big questions hiding inside them.",
    direction: "K-Dramatic Girls is a podcast by two Korean women talking about everyday life, and about everything that everyday life quietly touches: politics, society, identity, and what it means to be Korean today. We keep it casual, like a late-night chat between friends, but we're not afraid to go deep.",
    members: { cat: "Cat", mandu: "Mandu" },
    links: { spotify: "", apple: "", youtube: "", instagram: "", website: "", riverside: "" }
  };
  ["대본", "아이콘/배너", "소개말", "에피소드 주제 브레인스토밍", "닉네임 정하기", "웹사이트 내용 채워넣기"]
    .forEach((text, i) => { d.todos["t" + (i + 1)] = { text, who: "both", due: "", done: false, createdAt: T0 + i * 1000 }; });
  const eps = [
    [1, "Not All Sisters Share Blood", "planning", "What it's really like to live abroad as a Korean: racism, sexism, loneliness, and what independence means to us. And the people we found far from home who became family without sharing a drop of blood."],
    [2, "Kimbap Is NOT Sushi", "planning", "The Korea we know vs. the Korea the world thinks it knows. Misconceptions, stereotypes, and the moments Korean culture gets mixed up with its neighbors."],
    [3, "Not All Cool Girls Wear Bikinis", "planning", "Individuality and the pressure to fit one version of cool, pretty or confident. Is sexualizing yourself empowering? The expectations Korean women face every day, and how individuality is treated in Korea."],
    ["", "Family First, Me Never?", "idea", "Toxic family dynamics hidden behind love and duty: guilt-tripping, comparison, filial piety, and setting boundaries."],
    ["", "Faith, Maybe?", "idea", "Korea has no state religion and many people aren't religious, yet churches, temples and fortune-tellers are everywhere."],
    ["", "“Did You Eat?” Is Not About Food", "idea", "How Koreans show love through food."],
    ["", "Nunchi: The Superpower Nobody Taught Us", "idea", "Reading the room, and living somewhere that doesn't run on it."],
    ["", "Jeong: A Feeling English Doesn't Have", "idea", "Korean emotions that get lost in translation."],
    ["", "Age Is NOT Just a Number", "idea", "Age hierarchy, honorifics, and the weight of the word unnie."],
    ["", "Ppalli Ppalli Burnout", "idea", "Hurry-hurry culture, burnout, and the guilt of resting."],
    ["", "Pretty Is a Full-Time Job", "idea", "Beauty standards, plastic surgery and the beauty industry."],
    ["", "“So When Are You Getting Married?”", "idea", "Holiday nagging, pressure around marriage and kids, and Korea's birth rate."],
    ["", "Study Hard, Cry Harder", "idea", "The Suneung, cram schools, and what Korean education left in us."],
    ["", "Soju, Seniors, and Survival", "idea", "Company dinners, drinking culture and workplace hierarchy."],
    ["", "Therapy? That's for Other People", "idea", "Why mental health is still hard to talk about in Korea."],
    ["", "Home Is Where the Kimchi Is", "idea", "Homesickness and hunting for Korean food abroad."],
    ["", "Lost in Translation", "idea", "How speaking English changes the way we think, joke and express ourselves."],
    ["", "K-Content Club", "idea", "Reviews of shows, films and music, with the context international viewers miss."]
  ];
  eps.forEach(([num, title, status, summary], i) => {
    d.episodes["e" + String(i + 1).padStart(2, "0")] = { num, title, status, summary, recordDate: "", createdAt: T0 + i * 1000 };
  });
  return d;
}

/* ---------- helpers ---------- */
const COLLS = ["info", "todos", "cal", "episodes", "epnotes", "ideas"];
const LS_DATA = "kdg-planner-data-v1", LS_ME = "kdg-planner-me", LS_TEAM = "kdg-planner-team", LS_TOUCHED = "kdg-planner-touched";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => ymd(new Date());
const parseYmd = s => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, m - 1, d); };
const dayDiff = s => Math.round((parseYmd(s) - parseYmd(todayStr())) / 86400000);
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const fmtDate = s => { if (!s) return ""; const d = parseYmd(s); return `${DOW[d.getDay()]}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`; };
const fmtTime = ms => { if (!ms) return ""; const d = new Date(ms); return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const dLabel = s => { const n = dayDiff(s); return n === 0 ? "Today" : n > 0 ? `D-${n}` : `${-n}d overdue`; };
const store = {
  get(k, f) { try { const v = localStorage.getItem(k); return v == null ? f : JSON.parse(v); } catch (e) { return f; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};

/* =========================================================
   Store: the only place that reads and writes data
   ========================================================= */
const Store = (() => {
  const data = Object.fromEntries(COLLS.map(c => [c, {}]));
  const listeners = new Set();
  let mode = "local", status = "ok", fb = null;
  const emit = () => listeners.forEach(fn => fn());
  const empty = d => COLLS.every(c => !d[c] || !Object.keys(d[c]).length);

  /* this browser only */
  function loadLocal() { const saved = store.get(LS_DATA, null); COLLS.forEach(c => { data[c] = (saved && saved[c]) || {}; }); }
  function saveLocal() { store.set(LS_DATA, data); store.set(LS_TOUCHED, true); }
  function startLocal() {
    stopFirebase(); mode = "local"; status = "ok"; loadLocal();
    if (empty(data)) { Object.assign(data, seedData()); store.set(LS_DATA, data); }
    emit();
  }
  window.addEventListener("storage", e => { if (mode === "local" && e.key === LS_DATA) { loadLocal(); emit(); } });   // another tab

  /* Firebase (shared) */
  function stopFirebase() { if (fb) fb.unsubs.forEach(u => { try { u(); } catch (e) {} }); fb = null; }
  async function startFirebase(config, team) {
    stopFirebase(); status = "connecting"; emit();
    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
    const appMod = await import(`${base}/firebase-app.js`);
    const fs = await import(`${base}/firebase-firestore.js`);
    const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(config);
    const db = fs.getFirestore(app);
    COLLS.forEach(c => { data[c] = {}; });
    mode = "firebase";
    fb = { fs, db, team, unsubs: [], seen: new Set(), server: new Set(), checked: false, ready: false };
    const me = fb;
    await new Promise((resolve, reject) => {
      COLLS.forEach(c => {
        me.unsubs.push(fs.onSnapshot(fs.collection(db, "teams", team, c), snap => {
          if (fb !== me) return;
          const m = {}; snap.forEach(d => { m[d.id] = d.data(); }); data[c] = m;
          me.seen.add(c); if (!snap.metadata || !snap.metadata.fromCache) me.server.add(c); status = "ok";
          if (me.seen.size === COLLS.length && !me.ready) { me.ready = true; resolve(); }
          if (me.server.size === COLLS.length && !me.checked) { me.checked = true; firstShare(); }
          emit();
        }, err => { if (fb !== me) return; status = "error"; emit(); reject(err); }));
      });
    });
  }
  async function firstShare() {
    if (!empty(data)) return;
    const local = store.get(LS_DATA, null);
    const useLocal = store.get(LS_TOUCHED, false) && local && !empty(local) &&
      confirm("The shared planner is still empty.\nUpload what you've written on this device?\n\n(Cancel starts it with the default content.)");
    await replaceAll(useLocal ? local : seedData());
  }

  /* writes (both modes) */
  const ref = (c, id) => fb.fs.doc(fb.db, "teams", fb.team, c, id);
  async function guard(p) { try { await p; } catch (e) { console.error(e); status = "error"; emit(); throw e; } }
  async function set(c, id, obj) {
    if (mode === "firebase") return guard(fb.fs.setDoc(ref(c, id), obj));
    data[c][id] = obj; saveLocal(); emit();
  }
  async function patch(c, id, p) {
    if (!data[c][id]) return;
    if (mode === "firebase") return guard(fb.fs.updateDoc(ref(c, id), p));
    data[c][id] = { ...data[c][id], ...p }; saveLocal(); emit();
  }
  async function remove(c, id) {
    if (mode === "firebase") return guard(fb.fs.deleteDoc(ref(c, id)));
    delete data[c][id]; saveLocal(); emit();
  }
  async function add(c, obj) { const id = uid(); await set(c, id, { ...obj, createdAt: Date.now() }); return id; }
  async function replaceAll(src) {
    if (mode === "local") { COLLS.forEach(c => { data[c] = JSON.parse(JSON.stringify((src && src[c]) || {})); }); saveLocal(); emit(); return; }
    for (const c of COLLS) {
      const incoming = (src && src[c]) || {};
      for (const id of Object.keys(data[c])) if (!(id in incoming)) await remove(c, id);
      for (const [id, v] of Object.entries(incoming)) await set(c, id, v);
    }
  }

  return {
    data, on: fn => listeners.add(fn), startLocal, startFirebase, stopFirebase,
    set, patch, remove, add, replaceAll,
    mode: () => mode, status: () => status, team: () => (fb ? fb.team : "")
  };
})();

/* =========================================================
   screen state
   ========================================================= */
const ui = {
  view: "dashboard",
  me: store.get(LS_ME, "cat"),
  openEp: null,
  epFilter: "all",
  month: todayStr().slice(0, 7),
  selDate: todayStr(),
  todoFilter: "open",
  drafts: {},          // text you are typing, kept across re-renders
  compose: {},         // who / emoji picked in each note box
  composing: false,    // Korean IME composition in progress: don't redraw under it
  pending: false
};
const VIEWS = { dashboard: viewDashboard, episodes: viewEpisodes, calendar: viewCalendar, todos: viewTodos, ideas: viewIdeas, settings: viewSettings };

/* data getters */
const info = () => Store.data.info.main || seedData().info.main;
const list = c => Object.entries(Store.data[c]).map(([id, v]) => ({ id, ...v }));
const memberName = k => ((info().members || {})[k]) || (k === "cat" ? "Cat" : "Mandu");
const whoChip = k => k === "cat" || k === "mandu" ? `<span class="who ${k}">${esc(memberName(k))}</span>` : `<span class="who both">Both</span>`;
const statusOf = e => STATUSES.find(s => s.key === e.status) || STATUSES[0];
const badge = e => `<span class="badge s-${statusOf(e).key}">${esc(statusOf(e).label)}</span>`;
const byCreated = (a, b) => (a.createdAt || 0) - (b.createdAt || 0);
const byEp = (a, b) => ((a.num === "" || a.num == null ? 1e9 : +a.num) - (b.num === "" || b.num == null ? 1e9 : +b.num)) || byCreated(a, b);
const epLabel = e => (e.num === "" || e.num == null) ? "—" : "EP" + pad(e.num);
const notesOf = id => list("epnotes").filter(n => n.ep === id).sort(byCreated);
function nextRecording() {
  return list("episodes")
    .filter(e => e.recordDate && dayDiff(e.recordDate) >= 0 && ["idea", "planning", "script"].includes(statusOf(e).key))
    .sort((a, b) => a.recordDate.localeCompare(b.recordDate))[0] || null;
}

/* =========================================================
   rendering
   ========================================================= */
let raf = 0;
function schedule() {
  if (ui.composing) { ui.pending = true; return; }       // never redraw in the middle of typing Hangul
  if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); });
}
Store.on(schedule);

function render() {
  const a = document.activeElement;
  const key = a && a.dataset ? a.dataset.key : null;
  let sel = null; try { if (key && a.selectionStart != null) sel = [a.selectionStart, a.selectionEnd]; } catch (e) {}

  const i = info();
  $("#podName").textContent = i.name || "K-Dramatic Girls";
  document.title = (i.name || "K-Dramatic Girls") + " · Planner";
  $$(".me .who-btn").forEach(b => { b.setAttribute("aria-pressed", String(b.dataset.who === ui.me)); b.textContent = memberName(b.dataset.who); });
  const pill = $("#syncPill"), st = Store.status(), shared = Store.mode() === "firebase";
  pill.className = "sync" + (st === "error" ? " error" : shared ? " shared" : "");
  pill.textContent = st === "connecting" ? "Connecting…" : st === "error" ? "Connection problem" : shared ? `Shared · ${memberName("cat")} & ${memberName("mandu")}` : "Saved on this device";
  $$(".tabs a").forEach(t => { if (t.dataset.view === ui.view) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current"); });

  // the field you are typing in is kept as the very same element (caret, Hangul composition and undo survive);
  // everything around it is redrawn with the latest data
  const keep = key && $("#view").contains(a) && /^(INPUT|TEXTAREA)$/.test(a.tagName) ? a : null;
  if (keep && !(key in ui.drafts)) ui.drafts[key] = keep.value;
  $("#view").innerHTML = VIEWS[ui.view]();

  $$("#view [data-key]").forEach(el => { if (el.dataset.key in ui.drafts) el.value = ui.drafts[el.dataset.key]; });
  if (key) {
    const fresh = $(`#view [data-key="${CSS.escape(key)}"]`);
    const el = keep && fresh ? (fresh.replaceWith(keep), keep) : fresh;
    if (el) { el.focus({ preventScroll: true }); if (sel && el.setSelectionRange) { try { el.setSelectionRange(sel[0], sel[1]); } catch (e) {} } }
  }
}

/* note box: who wrote it + optional emoji + text */
function composer(key, form, attrs, placeholder) {
  const c = ui.compose[key] || {};
  const who = c.who || ui.me;
  return `<form class="composer" data-form="${form}" ${attrs}>
    <div class="row">
      <div class="pick-who" role="group" aria-label="Who is writing">${PEOPLE.map(k =>
        `<button type="button" class="${k}" data-act="cWho" data-c="${key}" data-who="${k}" aria-pressed="${who === k}">${esc(memberName(k))}</button>`).join("")}</div>
      <div class="emojis" role="group" aria-label="Emoji"><span class="lbl">Emoji</span>${EMOJIS.map(e =>
        `<button type="button" data-act="cEmoji" data-c="${key}" data-emoji="${e}" aria-pressed="${c.emoji === e}" aria-label="${e}">${e}</button>`).join("")}</div>
    </div>
    <textarea data-key="${key}" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}"></textarea>
    <div class="send"><button class="btn dark small" type="submit">Add</button></div>
  </form>`;
}
function noteItem(n, delAct) {
  return `<li class="note">
    <div class="meta">${whoChip(n.who)}${n.emoji ? `<span class="emo">${esc(n.emoji)}</span>` : ""}<span>${fmtTime(n.createdAt)}</span></div>
    <button type="button" class="x" data-act="${delAct}" data-id="${esc(n.id)}" aria-label="Delete note">×</button>
    <div class="txt">${esc(n.text)}</div>
  </li>`;
}

/* ---------- dashboard ---------- */
function viewDashboard() {
  const i = info(), eps = list("episodes"), next = nextRecording(), links = i.links || {};
  const open = list("todos").filter(t => !t.done).sort((a, b) => (a.due || "9").localeCompare(b.due || "9") || byCreated(a, b));
  const total = eps.length || 1;
  const week = list("cal").filter(m => m.date && dayDiff(m.date) >= 0 && dayDiff(m.date) <= 7).sort((a, b) => a.date.localeCompare(b.date) || byCreated(a, b));
  return `
  <section class="hero">
    <div>
      <h2 class="pod">${esc(i.name || "K-Dramatic Girls")}</h2>
      ${i.tagline ? `<p class="tagline">${esc(i.tagline)}</p>` : ""}
      ${i.direction ? `<p class="direction">${esc(i.direction)}</p>` : `<p class="direction muted">No direction statement yet.</p>`}
      <div class="hosts"><span class="cat">${esc(memberName("cat"))}</span><span class="amp">&amp;</span><span class="mandu">${esc(memberName("mandu"))}</span></div>
      <a class="edit" href="#settings">Edit name, direction and links</a>
    </div>
    <aside class="next" aria-label="Next recording">
      <img class="sticker" src="images/camera1.webp" alt="" onerror="this.remove()">
      <div class="lbl">Next recording</div>
      ${next ? `
        <div class="dday">${dayDiff(next.recordDate) === 0 ? "D-DAY" : "D-" + dayDiff(next.recordDate)}</div>
        <div class="ep">${esc(epLabel(next))} ${esc(next.title)}</div>
        <div class="when">${fmtDate(next.recordDate)}</div>
        <button type="button" class="btn small" style="margin-top:12px" data-act="openEp" data-id="${esc(next.id)}">Open episode</button>`
      : `<p class="ep" style="margin:8px 0 12px">No recording date yet.</p>
         <button type="button" class="btn small" data-act="go" data-view="episodes">Pick a date in Episodes</button>`}
    </aside>
  </section>
  <div class="dash">
    <section>
      <h3 class="sec">Quick links <a class="more" href="#settings">Edit links</a></h3>
      <div class="links">${LINKS.map(l => links[l.key]
        ? `<a class="link${l.key === "riverside" ? " rec" : ""}" href="${esc(links[l.key])}" target="_blank" rel="noopener"><b>${esc(l.label)}</b><span>${esc(links[l.key].replace(/^https?:\/\//, ""))}</span></a>`
        : `<a class="link missing" href="#settings"><b>${esc(l.label)}</b><span>Add a link</span></a>`).join("")}</div>
    </section>
    <section>
      <h3 class="sec">Open to-dos <span class="muted" style="font-family:var(--sans);font-size:14px;font-weight:500">${open.length}</span><a class="more" href="#todos">See all</a></h3>
      ${open.length ? `<ul class="mini-todos">${open.slice(0, 6).map(t => `
        <li><input type="checkbox" class="check" data-change="todoDone" data-id="${esc(t.id)}" aria-label="Mark ${esc(t.text)} done">
          <span class="t">${esc(t.text)}</span>${whoChip(t.who)}${t.due ? `<span class="dleft${dayDiff(t.due) < 0 ? " late" : ""}">${dLabel(t.due)}</span>` : ""}</li>`).join("")}</ul>`
      : `<p class="empty">All done! 🎉</p>`}
    </section>
    <section>
      <h3 class="sec">Episode pipeline <a class="more" href="#episodes">See all</a></h3>
      <div class="pipeline" role="img" aria-label="${STATUSES.map(s => `${s.label}: ${eps.filter(e => statusOf(e).key === s.key).length}`).join(", ")}">${STATUSES.map(s => {
        const n = eps.filter(e => statusOf(e).key === s.key).length;
        return n ? `<i class="s-${s.key}" style="width:${(n / total * 100).toFixed(2)}%"></i>` : "";
      }).join("")}</div>
      <div class="legend">${STATUSES.map(s => `<a href="#episodes" data-act="epFilter" data-status="${s.key}"><span class="badge s-${s.key}">${s.label}</span><b>${eps.filter(e => statusOf(e).key === s.key).length}</b></a>`).join("")}</div>
    </section>
    <section>
      <h3 class="sec">This week <a class="more" href="#calendar">Calendar</a></h3>
      ${week.length ? `<ul class="mini-memos">${week.slice(0, 6).map(m => `<li><span class="d">${fmtDate(m.date)}</span>${whoChip(m.who)} ${m.emoji ? esc(m.emoji) : ""} ${esc(m.text)}</li>`).join("")}</ul>`
      : `<p class="empty">No memos for the next 7 days.</p>`}
    </section>
  </div>`;
}

/* ---------- episodes ---------- */
function viewEpisodes() {
  const all = list("episodes").sort(byEp);
  const shown = ui.epFilter === "all" ? all : all.filter(e => statusOf(e).key === ui.epFilter);
  const allNotes = list("epnotes");
  return `
  <div class="view-head">
    <div><h2 class="view-title">Episodes</h2><p>${all.length} episodes. Click a row to open its details and notes.</p></div>
    <button type="button" class="btn dark" data-act="newEp">New episode</button>
  </div>
  <div class="filters" role="group" aria-label="Filter by status">
    <button type="button" data-act="epFilter" data-status="all" aria-pressed="${ui.epFilter === "all"}">All<span class="n">${all.length}</span></button>
    ${STATUSES.map(s => `<button type="button" data-act="epFilter" data-status="${s.key}" aria-pressed="${ui.epFilter === s.key}">${s.label}<span class="n">${all.filter(e => statusOf(e).key === s.key).length}</span></button>`).join("")}
  </div>
  <div class="eps">
  ${shown.length ? shown.map(e => {
    const open = ui.openEp === e.id, n = allNotes.filter(x => x.ep === e.id).length;
    return `<article class="ep${open ? " open" : ""}" id="ep-${esc(e.id)}">
      <button type="button" class="ep-head" data-act="toggleEp" data-id="${esc(e.id)}" aria-expanded="${open}">
        <span class="ep-num">${esc(epLabel(e))}</span>
        <span class="ep-title">${esc(e.title || "Untitled")}</span>
        ${badge(e)}
        <span class="ep-date">${e.recordDate ? "🎙 " + fmtDate(e.recordDate) : ""}</span>
        <span class="ep-sub"><span class="sum">${esc(e.summary || "")}</span>${n ? `<span>${n} note${n > 1 ? "s" : ""}</span>` : ""}</span>
      </button>
      ${open ? episodeBody(e) : ""}
    </article>`;
  }).join("") : `<p class="empty" style="padding:16px 4px">No episodes with this status.</p>`}
  </div>`;
}
function episodeBody(e) {
  const k = f => `ep-${e.id}-${f}`;
  return `<div class="ep-body">
    <div class="ep-fields">
      <div class="field"><label class="f" for="${k("num")}">No.</label><input id="${k("num")}" type="number" min="0" value="${esc(e.num)}" data-key="${k("num")}" data-change="epField" data-field="num" data-id="${esc(e.id)}" placeholder="—"></div>
      <div class="field"><label class="f" for="${k("title")}">Title</label><input id="${k("title")}" type="text" value="${esc(e.title)}" data-key="${k("title")}" data-change="epField" data-field="title" data-id="${esc(e.id)}"></div>
      <div class="field"><label class="f" for="${k("status")}">Status</label><select id="${k("status")}" data-change="epField" data-field="status" data-id="${esc(e.id)}">${STATUSES.map(s => `<option value="${s.key}"${statusOf(e).key === s.key ? " selected" : ""}>${s.label}</option>`).join("")}</select></div>
      <div class="field"><label class="f" for="${k("date")}">Recording date</label><input id="${k("date")}" type="date" value="${esc(e.recordDate)}" data-change="epField" data-field="recordDate" data-id="${esc(e.id)}"></div>
      <div class="field wide"><label class="f" for="${k("summary")}">Summary</label><textarea id="${k("summary")}" rows="5" data-key="${k("summary")}" data-change="epField" data-field="summary" data-id="${esc(e.id)}">${esc(e.summary)}</textarea></div>
      <p class="hint wide" style="grid-column:1/-1;margin-top:-6px">Saves on its own when you leave a field.</p>
    </div>
    <div class="ep-notes">
      <h4>Notes</h4>
      ${(() => { const ns = notesOf(e.id); return ns.length ? `<ul class="notes">${ns.map(n => noteItem(n, "delEpNote")).join("")}</ul>` : `<p class="empty">No notes yet. Ideas, questions, bits of script: anything goes.</p>`; })()}
      ${composer("epnote-" + e.id, "epNote", `data-id="${esc(e.id)}"`, "Add a note to this episode")}
    </div>
    <div class="ep-actions"><button type="button" class="btn small danger" data-act="delEp" data-id="${esc(e.id)}">Delete episode</button></div>
  </div>`;
}

/* ---------- calendar ---------- */
function viewCalendar() {
  const [Y, M] = ui.month.split("-").map(Number);
  const first = new Date(Y, M - 1, 1), days = new Date(Y, M, 0).getDate(), lead = first.getDay();
  const cells = Math.ceil((lead + days) / 7) * 7;
  const memos = list("cal"), eps = list("episodes"), todos = list("todos");
  const today = todayStr();
  let grid = "";
  for (let c = 0; c < cells; c++) {
    const d = new Date(Y, M - 1, 1 - lead + c), s = ymd(d);
    const ms = memos.filter(m => m.date === s), rec = eps.filter(e => e.recordDate === s), due = todos.filter(t => t.due === s && !t.done);
    const cls = ["day", d.getMonth() !== M - 1 ? "other" : "", d.getDay() === 0 ? "sun" : "", s === today ? "today" : "", s === ui.selDate ? "sel" : ""].filter(Boolean).join(" ");
    const desc = [fmtDate(s), ms.length ? `${ms.length} memo${ms.length > 1 ? "s" : ""}` : "", rec.length ? `recording` : "", due.length ? `${due.length} to-do due` : ""].filter(Boolean).join(", ");
    grid += `<button type="button" class="${cls}" data-act="pickDay" data-date="${s}" aria-label="${esc(desc)}" aria-pressed="${s === ui.selDate}">
      <span class="n">${d.getDate()}</span>
      ${rec.map(e => `<span class="rec">🎙 ${esc(e.num !== "" && e.num != null ? epLabel(e) : e.title)}</span>`).join("")}
      <span class="marks">${ms.slice(0, 6).map(m => `<i class="dot ${m.who === "mandu" ? "mandu" : "cat"}"></i>`).join("")}${ms.length > 6 ? `<span class="due">+${ms.length - 6}</span>` : ""}${due.length ? `<span class="due">✓${due.length}</span>` : ""}</span>
    </button>`;
  }
  const sel = ui.selDate, selMemos = memos.filter(m => m.date === sel).sort(byCreated);
  const selRec = eps.filter(e => e.recordDate === sel), selDue = todos.filter(t => t.due === sel);
  return `
  <div class="view-head"><div><h2 class="view-title">Calendar</h2><p>Click a day to leave a memo. 🎙 marks a recording day, ✓ a to-do that's due.</p></div></div>
  <div class="cal-wrap">
    <div>
      <div class="cal-nav">
        <span class="month">${MONTHS[M - 1]} ${Y}</span>
        <button type="button" class="today" data-act="month" data-to="today">Today</button>
        <button type="button" data-act="month" data-to="-1" aria-label="Previous month">‹</button>
        <button type="button" data-act="month" data-to="1" aria-label="Next month">›</button>
      </div>
      <div class="grid7">${DOW.map((d, i) => `<div class="dow${i === 0 ? " sun" : ""}">${d}</div>`).join("")}</div>
      <div class="grid7">${grid}</div>
    </div>
    <aside class="side" aria-live="polite">
      <h3>${fmtDate(sel)}</h3>
      ${selRec.length ? `<div class="block"><h4>Recording</h4>${selRec.map(e => `<div class="item"><a href="#episodes" data-act="openEp" data-id="${esc(e.id)}">🎙 ${esc(epLabel(e))} ${esc(e.title)}</a> ${badge(e)}</div>`).join("")}</div>` : ""}
      ${selDue.length ? `<div class="block"><h4>Due</h4>${selDue.map(t => `<div class="item">${t.done ? "✅" : "⬜"} ${esc(t.text)} ${whoChip(t.who)}</div>`).join("")}</div>` : ""}
      <div class="block"><h4>Memos</h4>
        ${selMemos.length ? `<ul class="notes">${selMemos.map(n => noteItem(n, "delMemo")).join("")}</ul>` : `<p class="empty">No memos on this day.</p>`}
        ${composer("cal-" + sel, "memo", `data-date="${sel}"`, "Add a memo for this day")}
      </div>
      <img class="cal-sticker" src="images/diary4.webp" alt="" onerror="this.remove()">
    </aside>
  </div>`;
}

/* ---------- to-dos ---------- */
function viewTodos() {
  const all = list("todos").sort((a, b) => (a.done - b.done) || byCreated(a, b));
  const shown = ui.todoFilter === "open" ? all.filter(t => !t.done) : ui.todoFilter === "done" ? all.filter(t => t.done) : all;
  const whoOpts = sel => [["both", "Both"], ["cat", memberName("cat")], ["mandu", memberName("mandu")]].map(([v, l]) => `<option value="${v}"${sel === v ? " selected" : ""}>${esc(l)}</option>`).join("");
  return `
  <div class="view-head"><div><h2 class="view-title">To-do</h2><p>${all.filter(t => !t.done).length} open, ${all.filter(t => t.done).length} done</p></div></div>
  <form class="todo-add" data-form="todo">
    <input type="text" data-key="todo-new" placeholder="New to-do (press Enter)" aria-label="New to-do">
    <select data-key="todo-new-who" aria-label="Owner">${whoOpts(ui.drafts["todo-new-who"] || "both")}</select>
    <input type="date" data-key="todo-new-due" aria-label="Due date">
    <button class="btn dark" type="submit">Add</button>
  </form>
  <div class="filters" role="group" aria-label="Show">
    ${[["open", "Open"], ["done", "Done"], ["all", "All"]].map(([v, l]) => `<button type="button" data-act="todoFilter" data-v="${v}" aria-pressed="${ui.todoFilter === v}">${l}</button>`).join("")}
  </div>
  ${shown.length ? `<ul class="todos">${shown.map(t => `
    <li class="todo${t.done ? " done" : ""}">
      <input type="checkbox" class="check" data-change="todoDone" data-id="${esc(t.id)}" ${t.done ? "checked" : ""} aria-label="Done">
      <input type="text" value="${esc(t.text)}" data-key="todo-${esc(t.id)}" data-change="todoText" data-id="${esc(t.id)}" aria-label="To-do">
      <button type="button" class="x" data-act="delTodo" data-id="${esc(t.id)}" aria-label="Delete to-do">×</button>
      <span class="t-extra">
        <select data-change="todoWho" data-id="${esc(t.id)}" aria-label="Owner">${whoOpts(t.who || "both")}</select>
        <input type="date" value="${esc(t.due)}" data-change="todoDue" data-id="${esc(t.id)}" aria-label="Due date">
        <span class="dleft${t.due && !t.done && dayDiff(t.due) < 0 ? " late" : ""}">${t.due ? dLabel(t.due) : ""}</span>
      </span>
    </li>`).join("")}</ul>` : `<p class="empty">${ui.todoFilter === "open" ? "Nothing left to do! 🎉" : "Nothing here yet."}</p>`}`;
}

/* ---------- ideas board ---------- */
function viewIdeas() {
  const ideas = list("ideas").sort((a, b) => {
    const la = Object.values(a.likes || {}).filter(Boolean).length, lb = Object.values(b.likes || {}).filter(Boolean).length;
    return (lb - la) || ((b.createdAt || 0) - (a.createdAt || 0));
  });
  return `
  <div class="view-head"><div><h2 class="view-title">Ideas</h2><p>Throw ideas in as they come. When you both heart one, turn it into an episode.</p></div></div>
  <div class="ideas-wrap">
    <div>
      ${composer("idea-new", "idea", "", "Episode topic, question, segment idea…")}
      <img class="ideas-sticker" src="images/crane1.webp" alt="" onerror="this.remove()">
    </div>
    ${ideas.length ? `<ul class="ideas">${ideas.map(d => {
      const likes = d.likes || {};
      return `<li class="idea">
        <div class="note" style="border:0;padding:0"><div class="meta">${whoChip(d.who)}${d.emoji ? `<span class="emo">${esc(d.emoji)}</span>` : ""}<span>${fmtTime(d.createdAt)}</span></div>
          <button type="button" class="x" data-act="delIdea" data-id="${esc(d.id)}" aria-label="Delete idea">×</button></div>
        <div class="txt">${esc(d.text)}</div>
        <div class="bar">
          ${PEOPLE.map(k => `<button type="button" class="heart ${k}" data-act="like" data-id="${esc(d.id)}" data-who="${k}" aria-pressed="${!!likes[k]}" aria-label="${esc(memberName(k))} likes this">${likes[k] ? "♥" : "♡"} ${esc(memberName(k))}</button>`).join("")}
          <span class="grow"></span>
          ${d.epId && Store.data.episodes[d.epId]
            ? `<button type="button" class="btn small ghost" data-act="openEp" data-id="${esc(d.epId)}">View episode</button>`
            : `<button type="button" class="btn small" data-act="promote" data-id="${esc(d.id)}">Make it an episode</button>`}
        </div>
      </li>`;
    }).join("")}</ul>` : `<p class="empty">No ideas yet. Throw in the first one.</p>`}
  </div>`;
}

/* ---------- settings ---------- */
function viewSettings() {
  const i = info(), links = i.links || {}, cfg = (window.PLANNER_CONFIG || {}).firebase;
  const shared = Store.mode() === "firebase";
  return `
  <div class="view-head"><div><h2 class="view-title">Settings</h2><p>Changes save when you leave a field.</p></div></div>
  <div class="set-grid">
    <section>
      <h3 class="sec">Podcast</h3>
      <div class="field"><label class="f" for="s-name">Name</label><input id="s-name" type="text" value="${esc(i.name)}" data-key="s-name" data-change="info" data-field="name"></div>
      <div class="field"><label class="f" for="s-tag">Tagline</label><input id="s-tag" type="text" value="${esc(i.tagline)}" data-key="s-tag" data-change="info" data-field="tagline"></div>
      <div class="field"><label class="f" for="s-dir">Direction</label><textarea id="s-dir" rows="6" data-key="s-dir" data-change="info" data-field="direction">${esc(i.direction)}</textarea></div>
    </section>
    <section>
      <h3 class="sec">Hosts</h3>
      <div class="two">
        <div class="field"><label class="f" for="s-cat"><span class="who cat">Cat</span> name</label><input id="s-cat" type="text" value="${esc(memberName("cat"))}" data-key="s-cat" data-change="member" data-who="cat"></div>
        <div class="field"><label class="f" for="s-mandu"><span class="who mandu">Mandu</span> name</label><input id="s-mandu" type="text" value="${esc(memberName("mandu"))}" data-key="s-mandu" data-change="member" data-who="mandu"></div>
      </div>
      <p class="hint">Name colours stay put: Cat is light yellow, Mandu is light blue.</p>
    </section>
    <section>
      <h3 class="sec">Links</h3>
      ${LINKS.map(l => `<div class="field"><label class="f" for="s-l-${l.key}">${esc(l.label)}</label><input id="s-l-${l.key}" type="url" inputmode="url" placeholder="https://" value="${esc(links[l.key] || "")}" data-key="s-l-${l.key}" data-change="link" data-link="${l.key}"></div>`).join("")}
    </section>
    <section>
      <h3 class="sec">Sharing</h3>
      ${!cfg ? `<p>Right now everything is saved in <b>this browser only</b>. For ${esc(memberName("cat"))} and ${esc(memberName("mandu"))} to share one planner, follow the sharing setup in <code>README.md</code> and paste your Firebase settings into <code>config.js</code>.</p>
              <p class="hint">Anything you write before then can be moved over with Backup below.</p>`
      : shared ? `<p>Shared. Team code: <code>${esc(Store.team().slice(0, 3))}${"•".repeat(Math.max(0, Store.team().length - 3))}</code></p>
              <button type="button" class="btn small" data-act="unshare">Disconnect this device</button>
              <p class="hint">Disconnecting doesn't delete anything in the shared planner.</p>`
      : `<form data-form="share">
              <div class="field"><label class="f" for="s-team">Team code (you both enter the same one)</label><input id="s-team" type="text" autocomplete="off" data-key="s-team" placeholder="your team code" value="${esc(store.get(LS_TEAM, ""))}"></div>
              <button class="btn dark small" type="submit">Connect</button>
              <p class="hint">At least 8 characters: letters, numbers, - or _. Everyone with the same code sees the same planner.</p>
            </form>`}
    </section>
    <section>
      <h3 class="sec">Backup</h3>
      <p class="hint" style="margin:0 0 10px">Download the whole planner as one file, or restore it from that file.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button type="button" class="btn small" data-act="export">Download backup</button>
        <label class="btn small" for="importFile">Restore backup</label>
        <input id="importFile" type="file" accept="application/json,.json" class="sr" data-change="import">
      </div>
    </section>
  </div>`;
}

/* =========================================================
   actions
   ========================================================= */
let noticeTimer;
function notice(msg, keep) {
  const n = $("#notice"); n.textContent = msg; n.hidden = false;
  clearTimeout(noticeTimer); if (!keep) noticeTimer = setTimeout(() => { n.hidden = true; }, 2600);
}
function setView(v, focus) {
  ui.view = VIEWS[v] ? v : "dashboard";
  render();
  window.scrollTo(0, 0);
  if (focus) $("#main").focus({ preventScroll: true });
}
function takeDraft(key) { const v = ui.drafts[key]; delete ui.drafts[key]; return v; }
const safe = fn => async (...a) => { try { await fn(...a); } catch (e) { notice("Couldn't save. Check the connection and try again.", true); } };

const ACTIONS = {
  me(b) { ui.me = b.dataset.who; store.set(LS_ME, ui.me); render(); },
  go(b) { location.hash = b.dataset.view; },
  cWho(b) { ui.compose[b.dataset.c] = { ...(ui.compose[b.dataset.c] || {}), who: b.dataset.who }; render(); },
  cEmoji(b) { const c = ui.compose[b.dataset.c] || {}; ui.compose[b.dataset.c] = { ...c, emoji: c.emoji === b.dataset.emoji ? "" : b.dataset.emoji }; render(); },
  toggleEp(b) { ui.openEp = ui.openEp === b.dataset.id ? null : b.dataset.id; render(); },
  openEp(b) {
    ui.openEp = b.dataset.id; ui.epFilter = "all";
    if (location.hash !== "#episodes") location.hash = "episodes"; else render();
    setTimeout(() => { const el = document.getElementById("ep-" + b.dataset.id); if (el) el.scrollIntoView({ block: "start" }); }, 30);
  },
  epFilter(b) { ui.epFilter = b.dataset.status; if (ui.view !== "episodes") location.hash = "episodes"; else render(); },
  newEp: safe(async () => {
    const id = await Store.add("episodes", { num: "", title: "New episode", status: "idea", summary: "", recordDate: "" });
    ui.openEp = id; ui.epFilter = "all"; render();
    const t = document.getElementById(`ep-${id}-title`); if (t) { t.focus(); t.select(); }
  }),
  delEp: safe(async b => {
    const e = Store.data.episodes[b.dataset.id]; if (!e || !confirm(`Delete "${e.title}"?\nIts notes will be deleted too.`)) return;
    for (const n of notesOf(b.dataset.id)) await Store.remove("epnotes", n.id);
    await Store.remove("episodes", b.dataset.id); ui.openEp = null;
  }),
  delEpNote: safe(async b => { if (confirm("Delete this note?")) await Store.remove("epnotes", b.dataset.id); }),
  delMemo: safe(async b => { if (confirm("Delete this memo?")) await Store.remove("cal", b.dataset.id); }),
  pickDay(b) { ui.selDate = b.dataset.date; if (b.dataset.date.slice(0, 7) !== ui.month) ui.month = b.dataset.date.slice(0, 7); render(); },
  month(b) {
    if (b.dataset.to === "today") { ui.month = todayStr().slice(0, 7); ui.selDate = todayStr(); }
    else { const [y, m] = ui.month.split("-").map(Number); const d = new Date(y, m - 1 + Number(b.dataset.to), 1); ui.month = ymd(d).slice(0, 7); }
    render();
  },
  todoFilter(b) { ui.todoFilter = b.dataset.v; render(); },
  delTodo: safe(async b => { const t = Store.data.todos[b.dataset.id]; if (t && confirm(`Delete "${t.text}"?`)) await Store.remove("todos", b.dataset.id); }),
  like: safe(async b => {
    const d = Store.data.ideas[b.dataset.id]; if (!d) return;
    const likes = { ...(d.likes || {}) }; likes[b.dataset.who] = !likes[b.dataset.who];
    await Store.patch("ideas", b.dataset.id, { likes });
  }),
  promote: safe(async b => {
    const d = Store.data.ideas[b.dataset.id]; if (!d) return;
    const [first, ...rest] = String(d.text).split("\n");
    const epId = await Store.add("episodes", { num: "", title: first.slice(0, 120), status: "idea", summary: rest.join("\n").trim(), recordDate: "" });
    await Store.add("epnotes", { ep: epId, text: `Moved over from the Ideas board:\n${d.text}`, who: d.who || ui.me, emoji: d.emoji || "💡" });
    await Store.patch("ideas", b.dataset.id, { epId });
    notice("Added to Episodes.");
  }),
  delIdea: safe(async b => { if (confirm("Delete this idea?")) await Store.remove("ideas", b.dataset.id); }),
  unshare() { store.del(LS_TEAM); Store.startLocal(); notice("This device is disconnected. You're now seeing what's saved on this device."); },
  export() {
    const blob = new Blob([JSON.stringify({ app: "kdg-planner", version: 1, exportedAt: new Date().toISOString(), data: Store.data }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `kdg-planner-${todayStr()}.json`;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }
};

const CHANGES = {
  epField: safe(async el => {
    let v = el.value; const f = el.dataset.field;
    if (f === "num") v = v === "" ? "" : Math.max(0, Math.round(Number(v)));
    if (el.dataset.key) takeDraft(el.dataset.key);
    await Store.patch("episodes", el.dataset.id, { [f]: v });
  }),
  todoDone: safe(async el => { await Store.patch("todos", el.dataset.id, { done: el.checked }); }),
  todoText: safe(async el => { takeDraft(el.dataset.key); const v = el.value.trim(); if (v) await Store.patch("todos", el.dataset.id, { text: v }); else render(); }),
  todoWho: safe(async el => { await Store.patch("todos", el.dataset.id, { who: el.value }); }),
  todoDue: safe(async el => { await Store.patch("todos", el.dataset.id, { due: el.value }); }),
  info: safe(async el => { takeDraft(el.dataset.key); await saveInfo({ [el.dataset.field]: el.value.trim() }); }),
  member: safe(async el => { takeDraft(el.dataset.key); const m = { ...(info().members || {}) }; m[el.dataset.who] = el.value.trim() || (el.dataset.who === "cat" ? "Cat" : "Mandu"); await saveInfo({ members: m }); }),
  link: safe(async el => {
    takeDraft(el.dataset.key);
    let v = el.value.trim(); if (v && !/^https?:\/\//i.test(v)) v = "https://" + v;
    const l = { ...(info().links || {}) }; l[el.dataset.link] = v; await saveInfo({ links: l });
  }),
  import(el) {
    const file = el.files && el.files[0]; el.value = ""; if (!file) return;
    const r = new FileReader();
    r.onload = safe(async () => {
      let obj; try { obj = JSON.parse(r.result); } catch (e) { return notice("Couldn't read that backup file."); }
      const d = obj && obj.data;
      if (!d || !COLLS.every(c => typeof (d[c] || {}) === "object")) return notice("That isn't a planner backup file.");
      if (!confirm("Replace everything in the planner with this backup?")) return;
      await Store.replaceAll(d); notice("Backup restored.");
    });
    r.readAsText(file);
  }
};
async function saveInfo(p) {
  if (Store.data.info.main) await Store.patch("info", "main", p);
  else await Store.set("info", "main", { ...seedData().info.main, ...p });
  notice("Saved.");
}

const FORMS = {
  epNote: safe(async f => {
    const key = "epnote-" + f.dataset.id, text = (ui.drafts[key] || "").trim(); if (!text) return;
    const c = ui.compose[key] || {};
    await Store.add("epnotes", { ep: f.dataset.id, text, who: c.who || ui.me, emoji: c.emoji || "" });
    takeDraft(key); ui.compose[key] = { who: c.who }; render();
  }),
  memo: safe(async f => {
    const key = "cal-" + f.dataset.date, text = (ui.drafts[key] || "").trim(); if (!text) return;
    const c = ui.compose[key] || {};
    await Store.add("cal", { date: f.dataset.date, text, who: c.who || ui.me, emoji: c.emoji || "" });
    takeDraft(key); ui.compose[key] = { who: c.who }; render();
  }),
  idea: safe(async () => {
    const key = "idea-new", text = (ui.drafts[key] || "").trim(); if (!text) return;
    const c = ui.compose[key] || {};
    await Store.add("ideas", { text, who: c.who || ui.me, emoji: c.emoji || "", likes: {}, epId: "" });
    takeDraft(key); ui.compose[key] = { who: c.who }; render();
  }),
  todo: safe(async () => {
    const text = (ui.drafts["todo-new"] || "").trim(); if (!text) return;
    await Store.add("todos", { text, who: ui.drafts["todo-new-who"] || "both", due: ui.drafts["todo-new-due"] || "", done: false });
    takeDraft("todo-new"); takeDraft("todo-new-due"); render();
    const t = $('[data-key="todo-new"]'); if (t) t.focus();
  }),
  share: async () => {
    const code = (ui.drafts["s-team"] ?? store.get(LS_TEAM, "") ?? "").trim();
    if (!/^[A-Za-z0-9_-]{8,}$/.test(code)) return notice("The team code needs at least 8 characters: letters, numbers, - or _.");
    store.set(LS_TEAM, code); takeDraft("s-team");
    await connectShared(code);
  }
};

async function connectShared(code) {
  const cfg = (window.PLANNER_CONFIG || {}).firebase;
  try {
    await Store.startFirebase(cfg, code);
    notice("Connected to the shared planner.");
  } catch (e) {
    console.error(e);
    store.del(LS_TEAM);
    Store.startLocal();
    notice("Couldn't connect to the shared planner. Check config.js, the team code and the Firestore rules (see README). Showing what's saved on this device for now.", true);
  }
}

/* ---------- events ---------- */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]");
  if (b && ACTIONS[b.dataset.act]) { e.preventDefault(); ACTIONS[b.dataset.act](b, e); }
});
document.addEventListener("change", e => { const el = e.target.closest("[data-change]"); if (el && CHANGES[el.dataset.change]) CHANGES[el.dataset.change](el); });
document.addEventListener("input", e => { const el = e.target; if (el.dataset && el.dataset.key) ui.drafts[el.dataset.key] = el.value; });
document.addEventListener("submit", e => { const f = e.target.closest("[data-form]"); if (f && FORMS[f.dataset.form]) { e.preventDefault(); FORMS[f.dataset.form](f); } });
document.addEventListener("keydown", e => {   // ⌘/Ctrl + Enter sends a note
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && e.target.matches(".composer textarea")) { e.preventDefault(); e.target.form.requestSubmit(); }
});
document.addEventListener("compositionstart", () => { ui.composing = true; });
document.addEventListener("compositionend", () => { ui.composing = false; if (ui.pending) { ui.pending = false; schedule(); } });
window.addEventListener("hashchange", () => setView(location.hash.slice(1), true));

/* ---------- start ---------- */
(function boot() {
  ui.view = VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : "dashboard";
  const cfg = (window.PLANNER_CONFIG || {}).firebase, team = store.get(LS_TEAM, "");
  Store.startLocal();                                   // show something immediately
  if (cfg && team) connectShared(team);                 // then switch to the shared planner
})();
