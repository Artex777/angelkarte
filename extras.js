"use strict";
// Дополнительные функции для рыбака: погода, уровень Эльбы, луна, мои места и журнал улова, маршрут
const EX = {
  ru: {
    ms: "м/с", wx: "Погода и вода", spots: "Мои места", now: "Сейчас", wind: "Ветер", gusts: "порывы", pressure: "Давление",
    p_up: "растёт", p_down: "падает", p_flat: "стабильно", per24: "за 24 ч", rain: "Осадки", clouds: "Облачность",
    sun: "Солнце", moon: "Луна", next: "Ближайшие часы", elbe: "Уровень Эльбы", rising: "Прилив (вода прибывает)",
    falling: "Отлив (вода убывает)", wx_for: "Для точки в центре карты", loading: "Загружаю…", fail: "Не удалось загрузить",
    add_here: "Добавить в центре карты", add_gps: "Добавить там, где я", empty: "Пока пусто. Долгое нажатие на карту тоже добавляет место.",
    kind_spot: "Место", kind_catch: "Улов", name: "Название", note: "Заметка", species: "Рыба", length: "Длина, см",
    weight: "Вес, г", bait: "Приманка", save: "Сохранить", del: "Удалить", route: "Маршрут", share: "Координаты",
    copied: "Координаты скопированы", export: "Экспорт (CSV)", confirm_del: "Удалить запись?", catches: "Уловов:",
    moon_names: ["Новолуние", "Растущий серп", "Первая четверть", "Растущая луна", "Полнолуние", "Убывающая луна", "Последняя четверть", "Убывающий серп"],
    dirs: ["С", "СВ", "В", "ЮВ", "Ю", "ЮЗ", "З", "СЗ"],
    codes: { 0: "Ясно", 1: "Почти ясно", 2: "Переменная облачность", 3: "Пасмурно", 45: "Туман", 48: "Туман", 51: "Морось", 53: "Морось", 55: "Морось",
      61: "Небольшой дождь", 63: "Дождь", 65: "Сильный дождь", 71: "Снег", 73: "Снег", 75: "Сильный снег", 80: "Ливень", 81: "Ливень", 82: "Сильный ливень", 95: "Гроза", 96: "Гроза с градом", 99: "Гроза с градом" },
  },
  de: {
    ms: "m/s", wx: "Wetter & Wasser", spots: "Meine Stellen", now: "Jetzt", wind: "Wind", gusts: "Böen", pressure: "Luftdruck",
    p_up: "steigt", p_down: "fällt", p_flat: "stabil", per24: "in 24 h", rain: "Niederschlag", clouds: "Bewölkung",
    sun: "Sonne", moon: "Mond", next: "Nächste Stunden", elbe: "Wasserstand Elbe", rising: "Flut (Wasser steigt)",
    falling: "Ebbe (Wasser fällt)", wx_for: "Für den Punkt in der Kartenmitte", loading: "Wird geladen…", fail: "Laden fehlgeschlagen",
    add_here: "In der Kartenmitte hinzufügen", add_gps: "Am eigenen Standort hinzufügen", empty: "Noch leer. Langes Tippen auf die Karte fügt auch eine Stelle hinzu.",
    kind_spot: "Stelle", kind_catch: "Fang", name: "Name", note: "Notiz", species: "Fischart", length: "Länge, cm",
    weight: "Gewicht, g", bait: "Köder", save: "Speichern", del: "Löschen", route: "Route", share: "Koordinaten",
    copied: "Koordinaten kopiert", export: "Export (CSV)", confirm_del: "Eintrag löschen?", catches: "Fänge:",
    moon_names: ["Neumond", "Zunehmende Sichel", "Erstes Viertel", "Zunehmender Mond", "Vollmond", "Abnehmender Mond", "Letztes Viertel", "Abnehmende Sichel"],
    dirs: ["N", "NO", "O", "SO", "S", "SW", "W", "NW"],
    codes: { 0: "Klar", 1: "Überwiegend klar", 2: "Teilweise bewölkt", 3: "Bedeckt", 45: "Nebel", 48: "Nebel", 51: "Nieselregen", 53: "Nieselregen", 55: "Nieselregen",
      61: "Leichter Regen", 63: "Regen", 65: "Starker Regen", 71: "Schnee", 73: "Schnee", 75: "Starker Schnee", 80: "Schauer", 81: "Schauer", 82: "Starke Schauer", 95: "Gewitter", 96: "Gewitter mit Hagel", 99: "Gewitter mit Hagel" },
  },
};
const X = EX[st.lang] || EX.ru;
const FISH = ["Hecht", "Zander", "Barsch", "Aal", "Karpfen", "Brasse", "Rotauge", "Rotfeder", "Döbel", "Rapfen", "Wels", "Schleie", "Forelle", "Quappe", "Kaulbarsch", "Ukelei", "Stint", "Meerforelle", "Lachs", "Flunder"];

// ---------- кнопки и листы ----------
const fab = document.createElement("div");
fab.style.cssText = "position:absolute;right:10px;bottom:calc(120px + env(safe-area-inset-bottom));z-index:5;display:flex;flex-direction:column;gap:10px";
fab.innerHTML = `<button class="btn" id="bWx" title="${X.wx}">🌤</button><button class="btn" id="bSpots" title="${X.spots}">★</button>`;
document.body.appendChild(fab);
function mkSheet(id) {
  const d = document.createElement("div"); d.className = "sheet"; d.id = id;
  d.innerHTML = `<div class="grip"></div><div class="body"></div>`; document.body.appendChild(d);
  sheets[id] = d; return d.querySelector(".body");
}
const wxBody = mkSheet("wx"), spotsBody = mkSheet("spots"), editBody = mkSheet("edit");
const toggle = id => openSheet(sheets[id].classList.contains("open") ? null : id);
document.getElementById("bWx").onclick = () => { toggle("wx"); if (sheets.wx.classList.contains("open")) loadWx(); };
document.getElementById("bSpots").onclick = () => { toggle("spots"); renderSpots(); };
const css = document.createElement("style");
css.textContent = `.kv{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:14px}.kv b{font-weight:600}
.big{font-size:28px;font-weight:700}.muted{color:var(--mut);font-size:13px}.hours{display:flex;gap:10px;overflow-x:auto;padding:6px 0}
.hours div{flex:none;text-align:center;font-size:12px;min-width:46px}.card{border-top:1px solid var(--line);padding:10px 0}
.row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.field{display:block;margin:8px 0}.field span{display:block;font-size:13px;color:var(--mut);margin-bottom:3px}
.field input,.field textarea,.field select{width:100%;font-size:16px;padding:9px 10px;border:1px solid #ccc;border-radius:10px;font-family:inherit}
.seg{display:flex;gap:6px}.seg .btn{flex:1}.spot{display:flex;gap:10px;align-items:center;border-top:1px solid var(--line);padding:10px 0;cursor:pointer}
.spot .ic{font-size:22px;width:30px;text-align:center}.toast{position:absolute;left:50%;bottom:90px;transform:translateX(-50%);background:rgba(0,0,0,.8);color:#fff;padding:8px 14px;border-radius:10px;z-index:20;font-size:14px}
svg.spark{width:100%;height:60px}`;
document.head.appendChild(css);
function toast(t) { const d = document.createElement("div"); d.className = "toast"; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 1800); }

// ---------- маршрут и координаты (также в попапах объектов) ----------
const routeUrl = (lat, lon) => `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lon.toFixed(6)}`;
function actionsHtml(lat, lon) {
  return `<div class="row"><a class="btn" style="display:inline-flex;align-items:center;text-decoration:none" href="${routeUrl(lat, lon)}" target="_blank" rel="noopener">🧭 ${X.route}</a>
    <button class="btn" data-copy="${lat.toFixed(6)}, ${lon.toFixed(6)}">📍 ${X.share}</button>
    <button class="btn" data-addat="${lon},${lat}">★</button></div>`;
}
document.addEventListener("click", async e => {
  const c = e.target.closest("[data-copy]");
  if (c) { try { await navigator.clipboard.writeText(c.dataset.copy); toast(X.copied); } catch (er) { prompt(X.share, c.dataset.copy); } }
  const a = e.target.closest("[data-addat]");
  if (a) { const [lon, lat] = a.dataset.addat.split(",").map(Number); editSpot({ lon, lat }); }
});
// добавляем кнопки к карточке объекта
const _showInfo = showInfo;
showInfo = async function (f) {
  const r = _showInfo(f);
  const g = f.geometry; let c = g.coordinates;
  while (Array.isArray(c[0])) c = c[Math.floor(c.length / 2)];
  const info = document.getElementById("info");
  info.insertAdjacentHTML("beforeend", actionsHtml(c[1], c[0]));
  return r;
};

// ---------- погода (Open-Meteo), солнце, луна ----------
function moon(d = new Date()) {
  const syn = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14);
  const age = (((d - ref) / 86400000) % syn + syn) % syn;
  const idx = Math.round(age / syn * 8) % 8;
  const illum = Math.round((1 - Math.cos(2 * Math.PI * age / syn)) / 2 * 100);
  return { name: X.moon_names[idx], illum, icon: ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"][idx], age };
}
const dir = deg => X.dirs[Math.round(deg / 45) % 8] + " (" + Math.round(deg) + "°)";
const hhmm = s => new Date(s).toLocaleTimeString(LOC, { hour: "2-digit", minute: "2-digit" });
async function loadWx() {
  const c = map.getCenter(), lat = c.lat.toFixed(3), lon = c.lng.toFixed(3);
  wxBody.innerHTML = `<h3>${X.wx} <button class="x" data-close>✕</button></h3><p class="muted">${X.loading}</p>`;
  const wxP = fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    "&current=temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,precipitation,cloud_cover,weather_code" +
    "&hourly=temperature_2m,pressure_msl,wind_speed_10m,precipitation_probability,weather_code&daily=sunrise,sunset" +
    "&past_days=1&forecast_days=2&timezone=Europe%2FBerlin&wind_speed_unit=ms").then(r => r.json());
  const elbeP = loadElbe().catch(() => null);
  let html = `<h3>${X.wx} <button class="x" data-close>✕</button></h3><p class="muted">${X.wx_for}</p>`;
  try {
    const w = await wxP, cu = w.current;
    const nowI = w.hourly.time.findIndex(t => new Date(t) > new Date()) - 1;
    const p24 = w.hourly.pressure_msl[Math.max(0, nowI - 24)], dp = cu.pressure_msl - p24;
    const trend = dp > 1.5 ? "↗ " + X.p_up : dp < -1.5 ? "↘ " + X.p_down : "→ " + X.p_flat;
    const m = moon();
    html += `<div class="card"><div class="big">${Math.round(cu.temperature_2m)}°C</div>
      <div>${esc(X.codes[cu.weather_code] || "")}</div>
      <div class="kv" style="margin-top:8px">
        <b>${X.wind}</b><span>${dir(cu.wind_direction_10m)} ${cu.wind_speed_10m.toFixed(1)} ${X.ms} · ${X.gusts} ${cu.wind_gusts_10m.toFixed(0)} ${X.ms}</span>
        <b>${X.pressure}</b><span>${Math.round(cu.pressure_msl)} hPa · ${trend} (${dp >= 0 ? "+" : ""}${dp.toFixed(1)} ${X.per24})</span>
        <b>${X.rain}</b><span>${cu.precipitation} mm · ${X.clouds} ${cu.cloud_cover}%</span>
        <b>${X.sun}</b><span>🌅 ${hhmm(w.daily.sunrise[1])} · 🌇 ${hhmm(w.daily.sunset[1])}</span>
        <b>${X.moon}</b><span>${m.icon} ${m.name}, ${m.illum}%</span>
      </div></div>`;
    const hrs = [];
    for (let i = nowI + 1; i < Math.min(w.hourly.time.length, nowI + 13); i++)
      hrs.push(`<div>${hhmm(w.hourly.time[i])}<br><b>${Math.round(w.hourly.temperature_2m[i])}°</b><br>${w.hourly.wind_speed_10m[i].toFixed(0)} ${X.ms}<br>${w.hourly.precipitation_probability[i] ?? 0}% 💧</div>`);
    html += `<div class="card"><b>${X.next}</b><div class="hours">${hrs.join("")}</div></div>`;
    window._lastWx = { t: Math.round(cu.temperature_2m), p: Math.round(cu.pressure_msl), w: cu.wind_speed_10m.toFixed(1) + " " + dir(cu.wind_direction_10m), moon: m.name };
  } catch (e) { html += `<p>${X.fail}: ${esc(e.message)}</p>`; }
  const el = await elbeP;
  if (el) html += el;
  wxBody.innerHTML = html;
}

// ---------- уровень Эльбы (PEGELONLINE, ближайший к центру карты пост) ----------
async function loadElbe() {
  const base = "https://www.pegelonline.wsv.de/webservices/rest-api/v2";
  const sts = await (await fetch(`${base}/stations.json?waters=ELBE&timeseries=W&includeTimeseries=true&includeCurrentMeasurement=true`)).json();
  const c = map.getCenter();
  const d2 = s => (s.latitude - c.lat) ** 2 + ((s.longitude - c.lng) * 0.6) ** 2;
  const s = sts.filter(s => s.latitude && s.timeseries?.some(t => t.shortname === "W")).sort((a, b) => d2(a) - d2(b))[0];
  if (!s || d2(s) > 0.5 ** 2) return "";
  const ms = await (await fetch(`${base}/stations/${s.uuid}/W/measurements.json?start=P1D`)).json();
  if (!ms.length) return "";
  const vals = ms.map(m => m.value), last = ms[ms.length - 1], prev = ms[Math.max(0, ms.length - 5)];
  const rising = last.value >= prev.value;
  const min = Math.min(...vals), max = Math.max(...vals), W = 300, H = 60;
  const path = ms.map((m, i) => `${(i / (ms.length - 1) * W).toFixed(1)},${(H - 4 - (m.value - min) / (max - min || 1) * (H - 8)).toFixed(1)}`).join(" ");
  const unit = s.timeseries.find(t => t.shortname === "W").unit || "cm";
  return `<div class="card"><b>🌊 ${X.elbe}: ${esc(s.longname || s.shortname)}</b>
    <div class="big">${Math.round(last.value)} ${esc(unit)}</div>
    <div>${rising ? "↗ " + X.rising : "↘ " + X.falling}</div>
    <svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline points="${path}" fill="none" stroke="#1565c0" stroke-width="2"/></svg>
    <div class="muted">24 h: ${Math.round(min)}–${Math.round(max)} ${esc(unit)} · ${hhmm(last.timestamp)} · PEGELONLINE</div></div>`;
}

// ---------- мои места и журнал улова (хранятся только на телефоне) ----------
const SK = "angelkarte-spots-v1";
let spots = (() => { try { return JSON.parse(localStorage.getItem(SK)) || []; } catch (e) { return []; } })();
const saveSpots = () => { try { localStorage.setItem(SK, JSON.stringify(spots)); } catch (e) {} drawSpots(); };
function spotsGeo() {
  return { type: "FeatureCollection", features: spots.map(s => ({ type: "Feature", geometry: { type: "Point", coordinates: [s.lon, s.lat] },
    properties: { sid: s.id, ic: s.kind === "catch" ? "🐟" : "★", name: s.name || s.species || "" } })) };
}
function drawSpots() {
  const src = map.getSource("myspots");
  if (src) src.setData(spotsGeo());
}
map.on("load", () => {
  map.addSource("myspots", { type: "geojson", data: spotsGeo() });
  map.addLayer({ id: "myspots-c", type: "circle", source: "myspots", paint: { "circle-radius": 13, "circle-color": "#ffb300", "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });
  map.addLayer({ id: "myspots-t", type: "symbol", source: "myspots",
    layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": 13, "text-offset": [0, 1.6], "text-anchor": "top", "text-optional": true },
    paint: { "text-color": "#5d4037", "text-halo-color": "#fff", "text-halo-width": 1.5 } });
  map.on("click", "myspots-c", e => { e.preventDefault(); const s = spots.find(x => x.id === e.features[0].properties.sid); if (s) editSpot(s); });
});

function renderSpots() {
  const nC = spots.filter(s => s.kind === "catch").length;
  spotsBody.innerHTML = `<h3>${X.spots} <button class="x" data-close>✕</button></h3>
    <div class="row" style="margin-top:0"><button class="btn" id="addC">＋ ${X.add_here}</button><button class="btn" id="addG">📍 ${X.add_gps}</button></div>
    ${spots.length ? "" : `<p class="muted">${X.empty}</p>`}
    <div>${spots.slice().sort((a, b) => b.t - a.t).map(s => `<div class="spot" data-sid="${s.id}"><span class="ic">${s.kind === "catch" ? "🐟" : "★"}</span>
      <div><b>${esc(s.name || s.species || X.kind_spot)}</b>${s.kind === "catch" && s.length ? ` · ${esc(s.length)} cm` : ""}<br>
      <span class="muted">${new Date(s.t).toLocaleString(LOC, { dateStyle: "short", timeStyle: "short" })}${s.bait ? " · " + esc(s.bait) : ""}</span></div></div>`).join("")}</div>
    ${spots.length ? `<div class="row"><button class="btn" id="exp">⬇ ${X.export}</button><span class="muted" style="align-self:center">${X.catches} ${nC}</span></div>` : ""}`;
  spotsBody.querySelector("#addC").onclick = () => { const c = map.getCenter(); editSpot({ lon: c.lng, lat: c.lat }); };
  spotsBody.querySelector("#addG").onclick = () => navigator.geolocation.getCurrentPosition(
    p => editSpot({ lon: p.coords.longitude, lat: p.coords.latitude }), err => toast(err.message), { enableHighAccuracy: true, timeout: 15000 });
  spotsBody.querySelectorAll("[data-sid]").forEach(el => el.onclick = () => {
    const s = spots.find(x => x.id === el.dataset.sid); map.flyTo({ center: [s.lon, s.lat], zoom: Math.max(map.getZoom(), 16) }); editSpot(s);
  });
  const ex = spotsBody.querySelector("#exp"); if (ex) ex.onclick = exportCsv;
}
function editSpot(s) {
  const isNew = !s.id;
  s = Object.assign({ kind: "spot", t: Date.now() }, s);
  const v = k => esc(s[k] ?? "");
  editBody.innerHTML = `<h3>${isNew ? "＋" : ""} ${s.kind === "catch" ? X.kind_catch : X.kind_spot} <button class="x" data-close>✕</button></h3>
    <div class="seg"><button class="btn ${s.kind === "spot" ? "on" : ""}" data-k="spot">★ ${X.kind_spot}</button><button class="btn ${s.kind === "catch" ? "on" : ""}" data-k="catch">🐟 ${X.kind_catch}</button></div>
    <label class="field"><span>${X.name}</span><input id="f_name" value="${v("name")}"></label>
    <div id="catchF" style="display:${s.kind === "catch" ? "block" : "none"}">
      <label class="field"><span>${X.species}</span><input id="f_species" list="fishlist" value="${v("species")}"></label>
      <datalist id="fishlist">${FISH.map(f => `<option value="${f}">`).join("")}</datalist>
      <div class="row" style="margin:0"><label class="field" style="flex:1"><span>${X.length}</span><input id="f_length" type="number" inputmode="decimal" value="${v("length")}"></label>
      <label class="field" style="flex:1"><span>${X.weight}</span><input id="f_weight" type="number" inputmode="decimal" value="${v("weight")}"></label></div>
      <label class="field"><span>${X.bait}</span><input id="f_bait" value="${v("bait")}"></label>
    </div>
    <label class="field"><span>${X.note}</span><textarea id="f_note" rows="2">${v("note")}</textarea></label>
    <p class="muted">${new Date(s.t).toLocaleString(LOC)} · ${s.lat.toFixed(5)}, ${s.lon.toFixed(5)}${s.wx ? ` · ${s.wx.t}°C, ${s.wx.p} hPa, ${esc(s.wx.w)} ${X.ms}, ${esc(s.wx.moon)}` : ""}</p>
    <div class="row"><button class="btn on" id="f_save">${X.save}</button>${isNew ? "" : `<button class="btn" id="f_del">🗑 ${X.del}</button>`}</div>
    ${actionsHtml(s.lat, s.lon).replace(/<button class="btn" data-addat[^>]*>★<\/button>/, "")}`;
  let kind = s.kind;
  editBody.querySelectorAll("[data-k]").forEach(b => b.onclick = () => {
    kind = b.dataset.k; editBody.querySelectorAll("[data-k]").forEach(x => x.classList.toggle("on", x === b));
    editBody.querySelector("#catchF").style.display = kind === "catch" ? "block" : "none";
  });
  editBody.querySelector("#f_save").onclick = () => {
    const g = id => editBody.querySelector("#f_" + id).value.trim();
    Object.assign(s, { kind, name: g("name"), note: g("note") });
    if (kind === "catch") Object.assign(s, { species: g("species"), length: g("length"), weight: g("weight"), bait: g("bait") });
    if (isNew) { s.id = Math.random().toString(36).slice(2, 10); if (window._lastWx) s.wx = window._lastWx; spots.push(s); }
    else spots = spots.map(x => x.id === s.id ? s : x);
    saveSpots(); openSheet("spots"); renderSpots();
  };
  const del = editBody.querySelector("#f_del");
  if (del) del.onclick = () => { if (confirm(X.confirm_del)) { spots = spots.filter(x => x.id !== s.id); saveSpots(); openSheet("spots"); renderSpots(); } };
  openSheet("edit");
  // подтянуть погоду для новой записи
  if (isNew && !window._lastWx) fetch(`https://api.open-meteo.com/v1/forecast?latitude=${s.lat.toFixed(3)}&longitude=${s.lon.toFixed(3)}&current=temperature_2m,pressure_msl,wind_speed_10m,wind_direction_10m&wind_speed_unit=ms`)
    .then(r => r.json()).then(w => { window._lastWx = { t: Math.round(w.current.temperature_2m), p: Math.round(w.current.pressure_msl), w: w.current.wind_speed_10m.toFixed(1) + " " + dir(w.current.wind_direction_10m), moon: moon().name }; }).catch(() => {});
}
function exportCsv() {
  const cols = ["t", "kind", "name", "species", "length", "weight", "bait", "note", "lat", "lon"];
  const rows = [cols.concat(["temp", "pressure", "wind", "moon"]).join(";")].concat(spots.map(s =>
    cols.map(c => c === "t" ? new Date(s.t).toISOString() : String(s[c] ?? "").replace(/[;\n]/g, " "))
      .concat(s.wx ? [s.wx.t, s.wx.p, s.wx.w, s.wx.moon] : ["", "", "", ""]).join(";")));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + rows.join("\n")], { type: "text/csv" }));
  a.download = "angelkarte-faenge.csv"; a.click();
}

// долгое нажатие на карту = новое место
let lpTimer = null, lpStart = null, lpLast = 0;
const lpAdd = ll => { if (Date.now() - lpLast < 1000) return; lpLast = Date.now(); editSpot({ lon: ll.lng, lat: ll.lat }); };
map.on("touchstart", e => {
  if (e.originalEvent.touches.length !== 1) return;
  lpStart = e.point; clearTimeout(lpTimer);
  lpTimer = setTimeout(() => { if (navigator.vibrate) navigator.vibrate(30); lpAdd(e.lngLat); }, 650);
});
map.on("touchmove", e => { if (lpStart && Math.hypot(e.point.x - lpStart.x, e.point.y - lpStart.y) > 10) clearTimeout(lpTimer); });
["touchend", "touchcancel", "movestart"].forEach(ev => map.on(ev, () => clearTimeout(lpTimer)));
map.on("contextmenu", e => { e.preventDefault(); lpAdd(e.lngLat); });
