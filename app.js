/* Retro Arcade — biblioteca de juegos retro con EmulatorJS
 * Los juegos se guardan en IndexedDB (solo en este dispositivo).
 */

// ---------- Consolas soportadas ----------
// core = nombre del sistema en EmulatorJS
const CONSOLES = {
  nes:   { name: "NES",           ab: "NES", core: "nes",       color: "#e4002b", ext: ["nes", "fds", "unf", "unif"] },
  snes:  { name: "Super Nintendo",ab: "SNES",core: "snes",      color: "#7b5cff", ext: ["sfc", "smc", "fig", "swc"] },
  gb:    { name: "Game Boy",      ab: "GB",  core: "gb",        color: "#8bac0f", ext: ["gb", "gbc"] },
  gba:   { name: "Game Boy Adv.", ab: "GBA", core: "gba",       color: "#5a3cc7", ext: ["gba"] },
  n64:   { name: "Nintendo 64",   ab: "N64", core: "n64",       color: "#00a54f", ext: ["n64", "z64", "v64"] },
  nds:   { name: "Nintendo DS",   ab: "DS",  core: "nds",       color: "#3d8bff", ext: ["nds"] },
  psx:   { name: "PlayStation",   ab: "PS1", core: "psx",       color: "#a0a0b8", ext: ["chd", "pbp", "cue"] },
  segaMD:{ name: "Mega Drive",    ab: "MD",  core: "segaMD",    color: "#1f6feb", ext: ["md", "gen", "smd"] },
  segaMS:{ name: "Master System", ab: "SMS", core: "segaMS",    color: "#d62f2f", ext: ["sms"] },
  segaGG:{ name: "Game Gear",     ab: "GG",  core: "segaGG",    color: "#2b2b2b", ext: ["gg"] },
  atari: { name: "Atari 2600",    ab: "2600",core: "atari2600", color: "#c96a1b", ext: ["a26"] },
  // PS2: no hay núcleo en EmulatorJS. Se usa Play! (versión web experimental), que abre en otra pestaña
  ps2:   { name: "PlayStation 2", ab: "PS2", core: null,        color: "#2e5bff", ext: [], external: "https://playjs.purei.org" },
};
// Extensiones que pueden ser de varias consolas: se pregunta al usuario
const AMBIGUOUS = ["zip", "7z", "bin", "iso", "img"];
const CDN = "https://cdn.emulatorjs.org/stable/data/";

// ---------- IndexedDB ----------
const DB_NAME = "retro-arcade", STORE = "games";
function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx(mode, fn) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => res(out?.result ?? out);
    t.onerror = () => rej(t.error);
  });
}
const dbAll = () => tx("readonly", s => s.getAll());
const dbPut = g => tx("readwrite", s => s.put(g));
const dbDel = id => tx("readwrite", s => s.delete(id));
const dbGet = id => tx("readonly", s => s.get(id));

// ---------- Utilidades ----------
const $ = id => document.getElementById(id);
const extOf = n => (n.split(".").pop() || "").toLowerCase();
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function prettyTitle(fileName) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[\[(][^\])]*[\])]/g, "")   // quita (USA), [!], etc.
    .replace(/[_.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || fileName;
}
function consoleFor(fileName) {
  const e = extOf(fileName);
  for (const [k, c] of Object.entries(CONSOLES)) if (c.ext.includes(e)) return k;
  return null;
}

// ---------- Estado ----------
let games = [];
let filter = "all";
let query = "";

// ---------- Render ----------
function renderChips() {
  const box = document.querySelector(".consoles");
  box.querySelectorAll(".chip:not([data-filter=all])").forEach(n => n.remove());
  for (const [k, c] of Object.entries(CONSOLES)) {
    const count = c.external ? "β" : games.filter(g => g.console === k).length;
    const b = document.createElement("button");
    b.className = "chip" + (filter === k ? " active" : "");
    b.dataset.filter = k;
    b.style.setProperty("--c", c.color);
    b.innerHTML = `${esc(c.name)} <span class="n">${count}</span>`;
    box.appendChild(b);
  }
  box.querySelector("[data-filter=all]").classList.toggle("active", filter === "all");
  $("n-all").textContent = games.length;
}

function renderLibrary() {
  const q = query.trim().toLowerCase();
  const list = games
    .filter(g => filter === "all" || g.console === filter)
    .filter(g => !q || g.title.toLowerCase().includes(q))
    .sort((a, b) => (b.lastPlayed || b.added) - (a.lastPlayed || a.added));

  const ps2 = CONSOLES.ps2;
  const ps2Tile = (filter === "all" || filter === "ps2") && (!q || "playstation 2 ps2".includes(q))
    ? `<article class="card ps2" data-ps2="1" style="--c:${ps2.color}" tabindex="0" aria-label="Abrir emulador de PlayStation 2">
      <div class="cover"><span class="ab">PS2</span><span class="play">↗</span></div>
      <div class="meta"><div class="title">Emulador PlayStation 2</div><span class="tag">Experimental · Play!</span></div>
    </article>` : "";
  $("library").innerHTML = ps2Tile + list.map(g => {
    const c = CONSOLES[g.console];
    return `<article class="card" data-id="${g.id}" style="--c:${c.color}" tabindex="0" aria-label="Jugar ${esc(g.title)}">
      <div class="cover"><span class="ab">${c.ab}</span><span class="play">▶</span></div>
      <button class="del" data-del="${g.id}" title="Eliminar" aria-label="Eliminar ${esc(g.title)}">✕</button>
      <div class="meta"><div class="title">${esc(g.title)}</div><span class="tag">${esc(c.name)}</span></div>
    </article>`;
  }).join("");
  $("empty").style.display = list.length || ps2Tile ? "none" : "block";
  $("empty").textContent = games.length ? "No hay juegos con ese filtro." : "Tu biblioteca está vacía. Agrega un juego para empezar.";
}

async function refresh() {
  games = (await dbAll()).map(({ data, ...meta }) => meta); // sin cargar los archivos en memoria
  renderChips();
  renderLibrary();
}

// ---------- Agregar juegos ----------
function askConsole(fileName) {
  return new Promise(resolve => {
    const dlg = $("pick");
    $("pickName").textContent = fileName;
    $("pickList").innerHTML = Object.entries(CONSOLES).filter(([, c]) => !c.external).map(([k, c]) =>
      `<button value="${k}" style="--c:${c.color}">${esc(c.name)}</button>`).join("");
    dlg.onclose = () => resolve(dlg.returnValue && dlg.returnValue !== "cancel" ? dlg.returnValue : null);
    dlg.returnValue = "";
    dlg.showModal();
  });
}

async function addFiles(files) {
  let added = 0;
  for (const f of files) {
    let con = consoleFor(f.name);
    if (!con) {
      if (!AMBIGUOUS.includes(extOf(f.name))) { alert(`Formato no soportado: ${f.name}`); continue; }
      con = await askConsole(f.name);
      if (!con) continue;
    }
    const data = await f.arrayBuffer();
    await dbPut({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      title: prettyTitle(f.name), fileName: f.name, console: con,
      size: f.size, added: Date.now(), lastPlayed: 0, data,
    });
    added++;
  }
  if (added) await refresh();
}

// ---------- Jugar ----------
let currentUrl = null;
async function play(id) {
  const g = await dbGet(id);
  if (!g) return;
  g.lastPlayed = Date.now();
  await dbPut(g);

  const c = CONSOLES[g.console];
  $("nowPlaying").textContent = `${g.title} · ${c.name}`;
  $("player").hidden = false;
  document.body.style.overflow = "hidden";

  currentUrl = URL.createObjectURL(new Blob([g.data]));
  window.EJS_player = "#game";
  window.EJS_core = c.core;
  window.EJS_gameUrl = currentUrl;
  window.EJS_gameName = g.title;          // nombre para las partidas guardadas
  window.EJS_pathtodata = CDN;
  window.EJS_language = "es-ES";
  window.EJS_startOnLoaded = true;
  window.EJS_color = c.color;

  const s = document.createElement("script");
  s.src = CDN + "loader.js";
  s.onerror = () => {
    $("game").innerHTML = `<div class="err">No se pudo cargar el emulador.<br>Revisa tu conexión a internet y vuelve a intentar.</div>`;
  };
  document.body.appendChild(s);
}

// PS2: el emulador Play! corre en su propia página; ahí se carga el .iso / .chd del juego
function openPS2() {
  const ok = confirm(
    "PlayStation 2 (experimental)\n\n" +
    "Se abrirá el emulador Play! en otra pestaña. Ahí toca \"Boot\" y elige tu juego (.iso, .chd o .elf).\n\n" +
    "• Usa PC o un celular potente: la PS2 es muy pesada para el navegador.\n" +
    "• Muchos juegos van lentos o no arrancan todavía.\n\n¿Abrir el emulador?");
  if (ok) window.open(CONSOLES.ps2.external, "_blank", "noopener");
}

function exitGame() {
  // EmulatorJS no se puede "descargar" limpio: recargar la página libera memoria y audio
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  location.reload();
}

// ---------- Eventos ----------
$("fileInput").addEventListener("change", e => { addFiles([...e.target.files]); e.target.value = ""; });

const drop = $("drop");
["dragenter", "dragover"].forEach(ev => document.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach(ev => document.addEventListener(ev, e => { e.preventDefault(); if (ev === "drop" || e.target === document.documentElement) drop.classList.remove("over"); }));
document.addEventListener("drop", e => { if (e.dataTransfer?.files?.length) addFiles([...e.dataTransfer.files]); });
drop.addEventListener("click", () => $("fileInput").click());

document.querySelector(".consoles").addEventListener("click", e => {
  const b = e.target.closest(".chip"); if (!b) return;
  filter = b.dataset.filter; renderChips(); renderLibrary();
});
$("search").addEventListener("input", e => { query = e.target.value; renderLibrary(); });

$("library").addEventListener("click", async e => {
  const del = e.target.closest("[data-del]");
  if (del) {
    e.stopPropagation();
    const g = games.find(x => x.id === del.dataset.del);
    if (g && confirm(`¿Eliminar "${g.title}" de tu biblioteca?`)) { await dbDel(g.id); refresh(); }
    return;
  }
  const card = e.target.closest(".card"); if (!card) return;
  if (card.dataset.ps2) openPS2(); else play(card.dataset.id);
});
$("library").addEventListener("keydown", e => {
  if (e.key === "Enter") { const card = e.target.closest(".card"); if (card) card.dataset.ps2 ? openPS2() : play(card.dataset.id); }
});
$("exitBtn").addEventListener("click", exitGame);

refresh().catch(err => {
  $("empty").textContent = "Tu navegador no permite guardar juegos aquí (¿modo incógnito?).";
  console.error(err);
});
