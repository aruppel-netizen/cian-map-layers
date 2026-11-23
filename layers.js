(function () {
  // ---------- Слои карты в приложении: прототип на данных «Транспортной доступности» ----------
  // Квартиры (7 настоящих объявлений с фото), районы с фото Викисклада и контуры районов берутся
  // из основного прототипа (js/data.js, districts.js, districts-zones.js).
  // Характеристики районов для слоёв выведены из полей районов (group, traffic, young, parks, score…):
  // это пример для концепта, не выгрузка. Цены покупки — пример.
  const A = window.App;
  const DISTRICTS = A.DISTRICTS;
  const ZONES = A.DISTRICT_ZONES || {};
  const $ = (id) => document.getElementById(id);
  const ROOT = "";

  /* ---------- иконки ---------- */
  const IC = {
    back: '<path d="M15 6l-6 6 6 6"/>', close: '<path d="M6 6l12 12M18 6 6 18"/>',
    layers: '<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
    heartf: '<path fill="currentColor" d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
    check: '<path d="m5 12 5 5 9-10"/>', plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
    nav: '<path d="M20 4 4 11l7 2 2 7 7-16Z"/>', spark: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5"/>',
    draw: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11.5V4a1.5 1.5 0 0 1 3 0v7.5M14 11V6a1.5 1.5 0 0 1 3 0v7c0 4-2.5 7-6 7-2.5 0-4-1.2-5.5-3.5L4 13.5a1.5 1.5 0 0 1 2.5-1.6L8 14"/>',
    sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4-4"/>', cd: '<path d="m8 10 4 4 4-4"/>',
    geo: '<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11Z"/><circle cx="12" cy="10" r="2"/>',
    gym: '<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/>', walk: '<circle cx="13" cy="5" r="1.5"/><path d="M11 9l-2 5 3 2 1 5M11 9l3 1 2 3M9 14l-2 6"/>',
  };
  const FILLED = {
    homeF: '<path d="M14 4.5 4 13v11h7v-7h6v7h7V13z"/>',
    searchF: '<circle cx="12.5" cy="12.5" r="7" fill="none" stroke="currentColor" stroke-width="3.2"/><path d="m18 18 6 6" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/>',
    heartF: '<path d="M14 24s-9.5-5.6-9.5-12.6A5.2 5.2 0 0 1 14 8.3a5.2 5.2 0 0 1 9.5 3.1C23.5 18.4 14 24 14 24Z"/>',
    chatF: '<path d="M14 5c5.8 0 10 3.6 10 8.2s-4.2 8.3-10 8.3c-1 0-2-.1-2.9-.4L6 23.5l1.3-4.3C5.2 17.7 4 15.6 4 13.2 4 8.6 8.2 5 14 5Z"/>',
    userF: '<circle cx="14" cy="9.5" r="5"/><path d="M4.5 24c1.3-5.3 5-7.5 9.5-7.5s8.2 2.2 9.5 7.5z"/>',
  };
  const ic = (n, s = 20, c = "currentColor", w = 1.8) =>
    `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;
  document.querySelectorAll("[data-ic]").forEach((el) => {
    const n = el.dataset.ic;
    el.innerHTML = FILLED[n]
      ? `<svg width="28" height="28" viewBox="0 0 28 28" fill="currentColor" aria-hidden="true">${FILLED[n]}</svg>`
      : ic(n, n === "sliders" ? 24 : 20, n === "sliders" ? "#0468ff" : "currentColor", n === "sliders" ? 2 : 1.8);
  });

  /* ---------- фото ---------- */
  const commons = (file, w) => (file ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${w}` : "");
  const dPhoto = (d, w = 400) => commons(d.photo && d.photo.file, w);
  const flatSrc = (p) => ROOT + p.src.split("/").map(encodeURIComponent).join("/");
  const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  function plural(n, a, b, c) { n = Math.abs(n) % 100; const n1 = n % 10; if (n > 10 && n < 20) return c; if (n1 > 1 && n1 < 5) return b; if (n1 === 1) return a; return c; }

  /* ---------- районы: признаки для слоёв ---------- */
  const city = DISTRICTS.filter((d) => ZONES[d.id]);
  const minutesToCenter = (d) => {
    if (d.toCenter.startsWith("в центре")) return 10;
    const m = d.toCenter.match(/(?:(\d+) ч)?\s?(?:(\d+) мин)?/);
    return (+(m[1] || 0)) * 60 + (+(m[2] || 0));
  };
  // Медианы — пример для концепта: аренда однушки/студии в месяц и покупка однушки
  const RENT_MED = { center: 55000, old: 50000, green: 45000, new: 38000, panel: 36000, suburb: 30000 };
  const BUY_MED = { center: 14.5, old: 12.4, green: 11.2, new: 8.6, panel: 8.1, suburb: 6.4 };
  const GROWTH = { center: 6, old: 8, green: 9, new: 17, panel: 7, suburb: 12 };
  city.forEach((d) => {
    d.tc = minutesToCenter(d);
    d.flats = A.LISTINGS.filter((l) => A.findDistrict(l.lat, l.lon).id === d.id);
    d.rentMed = RENT_MED[d.group];
    d.buyMed = BUY_MED[d.group];
    d.pay = Math.round(d.buyMed * 0.8 * 1e6 * 0.0085 / 1000); // платёж, тыс. ₽ — пример
    d.growth = GROWTH[d.group] + (d.young > 40 ? 3 : 0);
    d.schoolAvg = d.schools.reduce((a, s) => a + s.rating, 0) / d.schools.length;
  });

  const bestSchool = (d) => d.schools.reduce((a, s) => (s.rating > a.rating ? s : a), d.schools[0]);
  const C = { blue: "#0468ff", green: "#2f9e4f", teal: "#1f8a70", orange: "#e2572b", purple: "#7c4ddb", magenta: "#c2378a", amber: "#e0a100", gray: "#697797", dark: "#0d162e" };
  const LAYERS = {
    rent: [
      { id: "commute", t: "До центра за 30 мин", c: C.blue, base: 3, boost: { long: 1 }, why: "вы ищете надолго", tool: "myday",
        test: (d) => d.tc <= 30, reason: (d) => d.toCenter },
      { id: "cheap", t: "Недорогие районы", c: C.green, base: 2, boost: { budget: 2 }, why: "фильтр «до 55 тыс.»",
        test: (d) => ["panel", "new", "suburb"].includes(d.group), reason: (d) => `медиана ~${fmt(d.rentMed / 1000)} тыс./мес` },
      { id: "pets", t: "С питомцем", c: C.teal, base: 1, boost: { pets: 4 }, why: "фильтр «с животными»",
        test: (d) => d.parks.length >= 1 && d.group !== "center", reason: (d) => `Выгул: ${d.parks[0] ? d.parks[0].name : "сквер рядом"}` },
      { id: "cafes", t: "Крутые кафешки", c: C.orange, base: 2, boost: { studio: 1, kids: -2 }, why: "популярно у студий",
        test: (d) => d.young >= 37, reason: () => "Кафе и бары рядом" },
      { id: "vibe", t: "Район по вайбу", c: C.purple, base: 1.8, badge: "Новое", tool: "vibe", boost: { kids: -1 },
        test: (d) => vibeScore(d) >= 0.65, reason: (d) => `${Math.round(vibeScore(d) * 100)}% по вайбу` },
      { id: "quiet", t: "Тихо", c: C.gray, base: 0.9, boost: { kids: 3 },
        test: (d) => d.traffic <= 6, reason: (d) => d.trafficNote || "Тихо вечером" },
      { id: "green", t: "Много зелени", c: C.green, base: 1, boost: { pets: 1 },
        test: (d) => d.group === "green" || d.parks.length >= 2, reason: (d) => d.parks[0] ? d.parks[0].name : "Парки рядом" },
      { id: "night", t: "Ночная жизнь", c: C.magenta, base: 1, boost: { studio: 1, kids: -4 },
        test: (d) => d.group === "center" && d.young >= 38, reason: () => "Жизнь после 22:00" },
      { id: "schools", t: "Школы и сады", c: C.amber, base: 0, boost: { kids: 5 }, why: "фильтр «с детьми»",
        test: (d) => d.schoolAvg >= 4.45 && d.group !== "center", reason: (d) => { const b = bestSchool(d); return `${b.name} · ★ ${String(b.rating).replace(".", ",")}`; } },
    ],
    buy: [
      { id: "budget", t: "Где реально купить", c: C.blue, base: 2, boost: { mortgage: 2, budget: 1 }, why: "ипотека и бюджет",
        test: (d) => d.buyMed <= 12, reason: (d) => `платёж ≈ ${d.pay} тыс./мес` },
      { id: "grow", t: "Районы на вырост", c: C.green, base: 2, boost: { one: 1 }, why: "первая квартира",
        test: (d) => d.group === "new" || d.growth >= 12, reason: (d) => `цена м² +${d.growth}% за 3 года` },
      { id: "rvb", t: "Ипотека или аренда", c: C.purple, base: 1.5, badge: "Новое", boost: { mortgage: 2 }, why: "фильтр «Ипотека»",
        test: (d) => d.pay <= d.rentMed / 1000 * 1.7, reason: (d) => `платёж ${d.pay} vs аренда ${Math.round(d.rentMed / 1000)} тыс.` },
      { id: "schools", t: "Школы и сады", c: C.amber, base: 0.5, boost: { kids: 4 }, why: "«планируем детей»",
        test: (d) => d.schoolAvg >= 4.45 && d.group !== "center", reason: (d) => { const b = bestSchool(d); return `${b.name} · ★ ${String(b.rating).replace(".", ",")}`; } },
      { id: "vibe", t: "Район по вайбу", c: C.purple, base: 1.2, tool: "vibe", boost: {},
        test: (d) => vibeScore(d) >= 0.65, reason: (d) => `${Math.round(vibeScore(d) * 100)}% по вайбу` },
      { id: "green", t: "Много зелени", c: C.green, base: 0.9, boost: { kids: 1 },
        test: (d) => d.group === "green" || d.parks.length >= 2, reason: (d) => d.parks[0] ? d.parks[0].name : "Парки рядом" },
      { id: "quiet", t: "Тихо", c: C.gray, base: 0.7, boost: { kids: 2 },
        test: (d) => d.traffic <= 6, reason: (d) => d.trafficNote || "Тихо вечером" },
      { id: "cafes", t: "Крутые кафешки", c: C.orange, base: 0.8, boost: { kids: -1 },
        test: (d) => d.young >= 37, reason: () => "Кафе и бары рядом" },
    ],
  };
  const SC = {
    rent: { search: "Снять квартиру надолго, Санкт-Петербург", deal: "Снять надолго",
      filters: [{ id: "studio", t: "Студия и 1-комн.", on: true }, { id: "budget", t: "до 55 тыс.", on: true }, { id: "pets", t: "с животными", on: true }, { id: "kids", t: "с детьми", on: false }, { id: "long", t: "от года", on: true }] },
    buy: { search: "Купить квартиру, Санкт-Петербург", deal: "Купить",
      filters: [{ id: "one", t: "1-комн.", on: true }, { id: "budget", t: "до 12 млн", on: true }, { id: "mortgage", t: "Ипотека", on: true }, { id: "kids", t: "Планируем детей", on: false }] },
  };
  const VIBE = [{ id: "party", t: "Тусовочно" }, { id: "quiet", t: "Тихо" }, { id: "coffee", t: "Кофейни" }, { id: "green", t: "Зелень" }, { id: "center", t: "Всё пешком" }];
  function vibeTraits(d) {
    return { party: Math.min(1, (d.young - 25) / 18), quiet: Math.max(0, (10 - d.traffic) / 5), coffee: Math.min(1, (d.young - 26) / 15),
      green: Math.min(1, d.parks.length / 2 + (d.group === "green" ? 0.4 : 0)), center: d.tc <= 15 ? 1 : d.tc <= 25 ? 0.6 : 0.2 };
  }
  function vibeScore(d) { const t = vibeTraits(d); if (!S.vibe.length) return 0.5; return Math.min(1, S.vibe.reduce((a, v) => a + t[v], 0) / S.vibe.length); }

  /* ---------- состояние ---------- */
  let S;
  const fresh = (seg) => ({ seg, filters: Object.fromEntries(SC[seg].filters.map((f) => [f.id, f.on])), active: [], gym: true, vibe: ["coffee"], fav: {}, hint: true, story: null, slide: 0 });
  const D = () => SC[S.seg];
  const LL = () => LAYERS[S.seg];
  const L = (id) => LL().find((l) => l.id === id);
  const score = (l) => l.base + Object.entries(l.boost || {}).reduce((a, [k, v]) => a + (S.filters[k] ? v : 0), 0);
  const ranked = () => LL().map((l) => ({ ...l, score: score(l), hit: Object.keys(l.boost || {}).some((k) => S.filters[k] && l.boost[k] > 0) })).sort((a, b) => b.score - a.score);
  const matches = (d) => S.active.length && S.active.every((id) => L(id).test(d));
  const matched = () => city.filter(matches);
  const layerDistricts = (l) => city.filter((d) => l.test(d));
  const dcolor = (d) => { const ids = S.active.filter((id) => L(id).test(d)); return ids.length ? L(ids[ids.length - 1]).c : C.blue; };
  const flatPrice = (f) => S.seg === "rent" ? `${fmt(f.price)} ₽/мес` : `${(buyPriceOf(f) / 1e6).toFixed(1).replace(".", ",")} млн ₽`;
  // Для покупки берём те же квартиры с ценой продажи «как в районе» — пример
  const buyPriceOf = (f) => { const d = A.findDistrict(f.lat, f.lon); return Math.round((BUY_MED[d.group] || 9) * 1e6 * (f.area / 36) / 10000) * 10000; };
  const flatPay = (f) => Math.round(buyPriceOf(f) * 0.8 * 0.0085 / 1000); // платёж, тыс. ₽/мес — пример: взнос 20%
  const flatTitle = (f) => `${f.flatType === "studio" ? "Студия" : f.rooms ? `${f.rooms}-комн. кв.` : "Своб. планировка"} ･ ${String(f.area).replace(".", ",")} м² ･ ${f.floor}/${f.floorsTotal} этаж`;
  const flatAddr = (f) => `${f.street}, ${f.house}`;
  const tag = (t, c, bg) => `<span class="tag" style="color:${c};background:${bg}">${t}</span>`;
  const tint = (c) => c + "1f";

  /* ---------- карта ---------- */
  let ymap = null, zonesCol = null, labelsCol = null, pinsCol = null, pinLayout, distLayout;
  const SPB = [59.9386, 30.3141];
  const WORK = { t: "Работа", sub: "Невский проспект", coords: [59.9343, 30.3351] };
  function initMap() {
    if (typeof ymaps === "undefined") {
      const s = $("ymaps-script");
      if (s) s.addEventListener("load", initMap, { once: true });
      return;
    }
    ymaps.ready(() => {
      ymap = new ymaps.Map("map", { center: SPB, zoom: 11, controls: [] }, { suppressMapOpenBlock: true });
      $("mapStub").remove();
      pinLayout = ymaps.templateLayoutFactory.createClass('<div class="ypin $[properties.cls]"><span class="bb">$[properties.label]</span><span class="pd"></span></div>');
      distLayout = ymaps.templateLayoutFactory.createClass('<div class="ydist" style="background:$[properties.color]">$[properties.name]<span>$[properties.sub]</span></div>');
      zonesCol = new ymaps.GeoObjectCollection(); labelsCol = new ymaps.GeoObjectCollection(); pinsCol = new ymaps.GeoObjectCollection();
      ymap.geoObjects.add(zonesCol); ymap.geoObjects.add(pinsCol); ymap.geoObjects.add(labelsCol);
      renderMap(true);
    });
  }
  setTimeout(() => { if (!ymap && $("mapStub")) $("mapStub").textContent = "Карта Яндекса не загрузилась — слои и подборка работают и без неё"; }, 9000);
  $("zin").onclick = () => ymap && ymap.setZoom(ymap.getZoom() + 1, { duration: 200 });
  $("zout").onclick = () => ymap && ymap.setZoom(ymap.getZoom() - 1, { duration: 200 });

  function districtSub(d) {
    if (S.active.includes("commute")) return `${d.tc} мин до центра`;
    if (S.seg === "buy") return S.active.includes("rvb") ? `${d.pay} vs ${Math.round(d.rentMed / 1000)} тыс.` : `от ${String(d.buyMed).replace(".", ",")} млн`;
    return d.flats.length ? `${d.flats.length} ${plural(d.flats.length, "квартира", "квартиры", "квартир")} в подборке` : `~${Math.round(d.rentMed / 1000)} тыс./мес`;
  }
  function renderMap(fit) {
    if (!ymap) return;
    zonesCol.removeAll(); labelsCol.removeAll(); pinsCol.removeAll();
    const act = S.active.length > 0;
    city.forEach((d) => {
      const m = matches(d);
      if (!act) return;
      const col = m ? dcolor(d) : "#8a94ab";
      (ZONES[d.id] || []).forEach((contours) => {
        zonesCol.add(new ymaps.Polygon(contours, {}, {
          fillColor: col, fillOpacity: m ? 0.28 : 0.04, strokeColor: m ? col : "#8a94ab", strokeOpacity: m ? 0.9 : 0.3,
          strokeWidth: m ? 2 : 1, interactivityModel: "default#transparent", zIndex: 10,
        }));
      });
      if (m) {
        const mark = new ymaps.Placemark(d.center, { name: d.name.replace(/:.*$/, "").split(" и ")[0], sub: districtSub(d), color: col },
          { iconLayout: distLayout, iconShape: { type: "Rectangle", coordinates: [[-60, -16], [60, 16]] }, zIndex: 200 });
        mark.events.add("click", () => openStory(d.id));
        labelsCol.add(mark);
      }
    });
    A.LISTINGS.forEach((f) => {
      const d = city.find((x) => x.id === A.findDistrict(f.lat, f.lon).id);
      const show = !act || (d && matches(d));
      const label = S.seg === "rent" ? `${Math.round(f.price / 1000)} тыс.` : `${(buyPriceOf(f) / 1e6).toFixed(1).replace(".", ",")} млн`;
      const p = new ymaps.Placemark([f.lat, f.lon], { label, cls: show ? "" : "dim" },
        { iconLayout: pinLayout, iconShape: { type: "Rectangle", coordinates: [[-34, -36], [34, 4]] }, zIndex: show ? 300 : 150 });
      p.events.add("click", () => openFlat(f.id));
      pinsCol.add(p);
    });
    if (S.active.includes("commute")) {
      const w = new ymaps.Placemark(WORK.coords, { label: "Работа", cls: "work" }, { iconLayout: pinLayout, iconShape: { type: "Rectangle", coordinates: [[-34, -36], [34, 4]] }, zIndex: 400 });
      pinsCol.add(w);
    }
    if (fit) {
      const ds = act ? matched() : [];
      if (ds.length) {
        const lats = ds.map((d) => d.center[0]), lons = ds.map((d) => d.center[1]);
        ymap.setBounds([[Math.min(...lats) - 0.01, Math.min(...lons) - 0.02], [Math.max(...lats) + 0.01, Math.max(...lons) + 0.02]],
          { checkZoomRange: true, zoomMargin: [170, 70, 420, 30], duration: 300 });
      } else ymap.setCenter(SPB, 11, { duration: 300 });
    }
  }

  /* ---------- шапка и контролы ---------- */
  function renderTop() {
    $("searchText").innerHTML = ic("search", 16, "#0d162e", 2.2) + `<span>${D().search}</span>`;
    let h = `<button class="chip on" type="button">${D().deal}${ic("cd", 16, "#0d162e", 2)}</button>`;
    h += D().filters.map((f) => `<button class="chip ${S.filters[f.id] ? "on" : ""}" type="button" data-f="${f.id}" aria-pressed="${S.filters[f.id]}">${f.t}</button>`).join("");
    h += S.active.map((id) => { const l = L(id); return `<button class="chip layer" type="button" data-rm="${id}" style="background:${tint(l.c)};color:${l.c}">${l.t}${ic("close", 14, l.c, 2.2)}</button>`; }).join("");
    $("chips").innerHTML = h;
    $("chips").querySelectorAll("[data-f]").forEach((b) => (b.onclick = () => {
      S.filters[b.dataset.f] = !S.filters[b.dataset.f];
      toast(S.filters[b.dataset.f] ? "Фильтр добавлен — слои пересобраны" : "Фильтр снят — слои пересобраны");
      renderTop(); if ($("layersSheet").classList.contains("on")) renderLayers();
    }));
    $("chips").querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => toggleLayer(b.dataset.rm, false)));
    const n = S.active.length;
    $("layerCount").hidden = !n; $("layerCount").textContent = n;
    $("navLayers").classList.toggle("on", n > 0);
  }
  function placeControls() {
    const top = document.querySelector(".top").offsetHeight;
    const peekTop = $("peek").offsetTop;
    const ctl = $("mapctl"); const h = ctl.offsetHeight;
    const y = Math.max(top + 12, Math.min(peekTop - h - 12, (top + peekTop) / 2 - h / 2));
    ctl.style.top = y + "px";
    const hint = $("hint");
    hint.style.display = S.hint ? "block" : "none";
    hint.style.top = y + 6 + "px"; hint.style.right = 16 + $("navLayers").offsetWidth + 10 + "px";
  }

  /* ---------- шторка снизу: подборка ---------- */
  function flatsFor(ds) {
    const ids = new Set(ds.map((d) => d.id));
    return A.LISTINGS.filter((f) => ids.has(A.findDistrict(f.lat, f.lon).id)).map((f) => ({ f, d: city.find((x) => x.id === A.findDistrict(f.lat, f.lon).id) }));
  }
  function flatCard({ f, d }) {
    // В покупке платёж считаем по самой квартире (строка под ценой), поэтому на фото — другая причина
    const why = S.active.filter((id) => L(id).test(d) && !(S.seg === "buy" && id === "budget")).map((id) => L(id).reason(d));
    const photos = f.photos.slice(0, 6);
    return `<div class="fcard"><div class="fph">
      <div class="gal">${photos.map((p) => `<figure><img src="${flatSrc(p)}" alt="" loading="lazy">${p.caption ? `<figcaption>${p.caption}</figcaption>` : ""}</figure>`).join("")}</div>
      <button class="fav" type="button" data-fav="${f.id}" aria-label="В избранное">${ic(S.fav[f.id] ? "heartf" : "heart", 18, "#fff", 2)}</button>
      ${why[0] ? `<span class="why">${why[0]}</span>` : ""}<span class="num">${f.photos.length} фото</span></div>
      <button type="button" class="ftext" data-flat="${f.id}" style="border:0;background:none;padding:0;text-align:left;display:flex;flex-direction:column;gap:3px">
      <span class="fp">${flatPrice(f)}</span>${S.seg === "buy" ? `<span class="fpay">Платёж ≈ ${flatPay(f)} тыс. ₽/мес</span>` : ""}<span class="fs">${flatTitle(f)}</span><span class="fa">${flatAddr(f)}</span>
      <span class="metro"><i style="background:#${f.metroColor}"></i>${f.metro} · ${f.metroMin} мин ${f.metroTransport === "walk" ? "пешком" : "на транспорте"}</span></button></div>`;
  }
  function renderPeek() {
    const p = $("peek");
    const total = A.LISTINGS.length;
    if (!S.active.length) {
      // Как в приложениях: свёрнутая шторка — ручка и счётчик; тянем вверх — список
      p.innerHTML = `<div class="grab"><div class="handle"></div><div class="ph"><b>7 726 из 8 000 объявлений</b></div></div>
        <div class="plist">${A.LISTINGS.map((f) => flatCard({ f, d: city.find((x) => x.id === A.findDistrict(f.lat, f.lon).id) })).join("")}</div>`;
      bindPeek(p); return;
    }
    const ds = matched();
    const fl = flatsFor(ds);
    const dsSorted = ds.slice().sort((a, b) => b.flats.length - a.flats.length);
    const dchips = dsSorted.slice(0, 10).map((d) => `<button class="dchip" type="button" data-d="${d.id}"><img src="${dPhoto(d, 120)}" alt="" loading="lazy"><span><b>${d.name.replace(/:.*$/, "")}</b><span>${districtSub(d)}</span></span></button>`).join("");
    const empty = `<div style="padding:0 20px 4px;font-size:14px;color:var(--sec)">${ds.length ? "В этих районах пока нет квартир с фото — посмотрите районы ниже." : `Ни один район не подходит под все слои. Снимите «${L(S.active[S.active.length - 1]).t}».`}</div>`;
    p.innerHTML = `<div class="grab"><div class="handle"></div><div class="ph"><b>${fl.length ? "Подборка под ваши слои" : "Подборка пуста"}</b><span>${fl.length} ${plural(fl.length, "квартира", "квартиры", "квартир")} · ${ds.length} ${plural(ds.length, "район", "района", "районов")}${S.seg === "buy" && fl.length ? ` · платёж от ${Math.min(...fl.map((x) => flatPay(x.f)))} тыс.` : ""}</span></div></div>
      ${fl.length ? `<div class="lane">${fl.map(flatCard).join("")}</div>` : empty}
      ${ds.length ? `<div class="dchips">${dchips}</div>` : ""}`;
    p.querySelectorAll("[data-d]").forEach((b) => (b.onclick = () => openStory(b.dataset.d)));
    bindPeek(p);
  }
  // Шторка тянется за ручку: вверх — развернуть списком, вниз — свернуть; тап по шапке — переключить
  function setPeek(open) { S.peekOpen = open; $("peek").classList.toggle("open", open); $("peek").style.top = open ? document.querySelector(".top").offsetHeight + "px" : ""; $("peek").scrollTop = 0; requestAnimationFrame(placeControls); }
  function bindPeek(p) {
    p.classList.toggle("open", !!S.peekOpen); p.style.top = S.peekOpen ? document.querySelector(".top").offsetHeight + "px" : "";
    p.querySelectorAll("[data-flat]").forEach((b) => (b.onclick = () => openFlat(b.dataset.flat)));
    p.querySelectorAll("[data-fav]").forEach((b) => (b.onclick = () => favToggle(b)));
    const g = p.querySelector(".grab");
    let y0 = null, moved = false;
    g.onpointerdown = (e) => { y0 = e.clientY; moved = false; g.setPointerCapture(e.pointerId); };
    g.onpointermove = (e) => { if (y0 !== null && Math.abs(e.clientY - y0) > 8) moved = true; };
    g.onpointerup = (e) => {
      if (y0 === null) return;
      const dy = e.clientY - y0; y0 = null;
      if (!moved) setPeek(!S.peekOpen); else if (dy < -24) setPeek(true); else if (dy > 24) setPeek(false);
    };
    requestAnimationFrame(placeControls);
  }
  function favToggle(b) {
    const id = b.dataset.fav; S.fav[id] = !S.fav[id];
    b.innerHTML = ic(S.fav[id] ? "heartf" : "heart", 18, "#fff", 2);
    toast(S.fav[id] ? "Добавлено в избранное" : "Убрано из избранного");
  }

  /* ---------- шторка слоёв: подборки с живыми фото ---------- */
  function lcard(l, why) {
    const ds = layerDistricts(l);
    const on = S.active.includes(l.id);
    const lead = ds.slice().sort((a, b) => b.flats.length - a.flats.length || b.score - a.score)[0];
    const fl = flatsFor(ds);
    let sub;
    if (S.seg === "rent") {
      const prices = fl.map((x) => x.f.price);
      sub = fl.length ? `${fl.length} ${plural(fl.length, "квартира", "квартиры", "квартир")} · от ${fmt(Math.min(...prices))} ₽` : (ds.length ? `${ds.length} ${plural(ds.length, "район", "района", "районов")} · ~${Math.round(Math.min(...ds.map((d) => d.rentMed)) / 1000)} тыс.` : "Нет районов под запрос");
    } else {
      sub = ds.length ? `${ds.length} ${plural(ds.length, "район", "района", "районов")} · от ${String(Math.min(...ds.map((d) => d.buyMed))).replace(".", ",")} млн` : "Нет районов под запрос";
      if (l.id === "budget" && ds.length) sub = `${ds.length} районов · платёж от ${Math.min(...ds.map((d) => d.pay))} тыс.`;
    }
    const thumbs = fl.slice(0, 3).map((x) => `<img src="${flatSrc(x.f.photos[0])}" alt="">`).join("");
    const more = fl.length > 3 ? `<span>+${fl.length - 3}</span>` : "";
    return `<button class="lcard ${on ? "on" : ""}" type="button" data-l="${l.id}" aria-pressed="${on}">
      <span class="ph">${lead ? `<img class="cover" src="${dPhoto(lead, 360)}" alt="" loading="lazy">` : ""}
      <span class="count">${ds.length} ${plural(ds.length, "район", "района", "районов")}</span>
      ${l.badge && !on ? `<span class="badge">${tag(l.badge, "#fff", C.purple)}</span>` : ""}
      ${on ? `<span class="check">${ic("check", 14, "#fff", 2.6)}</span>` : ""}
      ${lead ? `<span class="lname">${lead.name.replace(/:.*$/, "")}</span>` : ""}
      ${S.seg === "rent" && fl.length ? `<span class="stack">${thumbs}${more}</span>` : ""}
      <span class="sw" style="background:${l.c}"></span></span>
      <span class="t"><b>${l.t}</b><span>${sub}</span>${why ? `<span class="why">${why}</span>` : ""}</span></button>`;
  }
  function renderLayers() {
    const r = ranked();
    const forYou = r.filter((l) => l.hit).slice(0, 3);
    const rest = r.filter((l) => !forYou.includes(l));
    const may = [...rest.filter((l) => l.badge || l.tool), ...rest.filter((l) => !l.badge && !l.tool)].slice(0, 3);
    const all = rest.filter((l) => !may.includes(l));
    const f = D().filters.filter((x) => S.filters[x.id]).map((x) => x.t.toLowerCase()).join(", ");
    $("layersSheet").innerHTML = `<div class="handle" style="margin-top:8px"></div>
      <div class="head"><div><h2>Слои карты</h2><div class="sub">Подобрали под запрос: ${f || "без фильтров"}</div></div><button class="iconbtn" type="button" id="closeLayers" aria-label="Закрыть">${ic("close", 22)}</button></div>
      <div class="scroll">
      ${forYou.length ? `<div class="shelf"><div class="shelf-h"><b>Под ваш запрос</b><span>по фильтрам</span></div><div class="cards">${forYou.map((l) => lcard(l, l.why)).join("")}</div></div>` : ""}
      <div class="shelf"><div class="shelf-h"><b>Вам может понравиться</b><span>по просмотрам</span></div><div class="cards">${may.map((l) => lcard(l)).join("")}</div></div>
      <div class="shelf" style="margin-bottom:0"><div class="shelf-h"><b>Все слои</b></div><div style="margin-top:4px">${all.map((l) => `<button class="lrow" type="button" data-l="${l.id}" aria-pressed="${S.active.includes(l.id)}"><span class="swatch" style="background:${l.c}"></span><span class="tx"><b>${l.t}</b><span>${layerDistricts(l).length} районов</span></span><span class="tg ${S.active.includes(l.id) ? "on" : ""}"></span></button>`).join("")}</div></div>
      </div>
      <div class="sticky"><button class="btn full" type="button" id="applyLayers">${S.active.length ? `Показать на карте · ${S.active.length} ${plural(S.active.length, "слой", "слоя", "слоёв")}` : "Выберите слой"}</button></div>`;
    $("closeLayers").onclick = closeSheets;
    $("applyLayers").onclick = () => { closeSheets(); if (S.active.length) toast(`${matched().length} ${plural(matched().length, "район", "района", "районов")} под ваши слои`); };
    $("layersSheet").querySelectorAll("[data-l]").forEach((b) => (b.onclick = () => {
      const l = L(b.dataset.l);
      if (l.tool && !S.active.includes(l.id)) { toggleLayer(l.id, true, true); openTool(l.tool); return; }
      toggleLayer(l.id, !S.active.includes(l.id), true); renderLayers();
    }));
  }
  function toggleLayer(id, on, quiet) {
    if (on && !S.active.includes(id)) {
      S.active.push(id);
      if (S.active.length > 2) { const r = S.active.shift(); if (!quiet) toast(`Можно 2 слоя сразу — «${L(r).t}» выключен`); }
    }
    if (!on) S.active = S.active.filter((x) => x !== id);
    S.hint = false;
    renderTop(); renderPeek(); renderMap(true);
  }

  /* ---------- «Мой день» и «Вайб» ---------- */
  function openTool(kind) {
    $("layersSheet").classList.remove("on");
    const t = $("toolSheet");
    if (kind === "myday") {
      const fl = flatsFor(city);
      const withMin = fl.map((x) => ({ ...x, min: x.d.tc + (S.gym ? 5 : 0) })).sort((a, b) => a.min - b.min);
      const best = withMin[0], far = withMin[withMin.length - 1];
      const hrs = (m) => Math.round(m * 2 * 220 / 60);
      t.innerHTML = `<div class="handle" style="margin-top:8px"></div><div class="head"><div><h2>Мой день на карте</h2><div class="sub">Районы, откуда до ваших мест не дольше 30 минут</div></div><button class="iconbtn" type="button" id="closeTool" aria-label="Закрыть">${ic("close", 22)}</button></div>
      <div class="scroll" style="padding:0 16px">
        <div class="point"><span class="pdot" style="background:#0d162e">${ic("geo", 16, "#fff", 2)}</span><div style="flex:1"><div style="font-size:12px;color:var(--sec)">Работа · 5 дней в неделю</div><div>${WORK.sub}</div></div></div>
        <button class="point" type="button" id="gymT" style="width:100%;border-left:0;border-right:0;border-top:0;background:#fff;text-align:left"><span class="pdot" style="background:${S.gym ? C.blue : "#a9b4cc"}">${ic("gym", 16, "#fff", 2)}</span><div style="flex:1"><div style="font-size:12px;color:var(--sec)">Зал · 3 раза в неделю</div><div>Петроградская</div></div><span class="tg ${S.gym ? "on" : ""}"></span></button>
        <div class="point" style="color:var(--link);border:0">${ic("plus", 20, "#005ede")}Добавить место: учёба, родители…</div>
        <div style="display:flex;gap:8px">
          <div class="stat" style="background:var(--green-bg)"><span style="color:var(--green-t);font-weight:700">${flatAddr(best.f)}</span><b>≈ ${hrs(best.min)} ч</b><span>в дороге за год · ${fmt(best.f.price)} ₽</span></div>
          <div class="stat" style="background:var(--orange-bg)"><span style="color:var(--orange-t);font-weight:700">${flatAddr(far.f)}</span><b>≈ ${hrs(far.min)} ч</b><span>в дороге · ${fmt(far.f.price)} ₽</span></div>
        </div>
      </div>
      <div class="sticky"><button class="btn full" type="button" id="applyTool">Показать районы в зоне</button></div>`;
      $("gymT").onclick = () => { S.gym = !S.gym; openTool("myday"); };
    }
    if (kind === "vibe") {
      const top = city.slice().sort((a, b) => vibeScore(b) - vibeScore(a)).slice(0, 4);
      t.innerHTML = `<div class="handle" style="margin-top:8px"></div><div class="head"><div><h2>Район по вайбу</h2><div class="sub">Каким должен быть вечер у дома?</div></div><button class="iconbtn" type="button" id="closeTool" aria-label="Закрыть">${ic("close", 22)}</button></div>
      <div class="scroll" style="padding:0 16px;display:flex;flex-direction:column;gap:14px">
        <div class="vibe">${VIBE.map((v) => `<button class="chip ${S.vibe.includes(v.id) ? "on" : ""}" type="button" data-v="${v.id}" aria-pressed="${S.vibe.includes(v.id)}">${v.t}</button>`).join("")}</div>
        <div style="font-size:14px;font-weight:700">Ближе всего к вашему вайбу</div>
        ${top.map((d, i) => `<button class="lrow" type="button" data-open="${d.id}" style="padding:10px 0;border-top:${i ? "1px solid var(--brd)" : "0"}"><img src="${dPhoto(d, 120)}" alt="" style="width:52px;height:52px;border-radius:8px;object-fit:cover;background:#dfe4ee;flex-shrink:0"><span class="tx"><b style="font-weight:700">${d.name.replace(/:.*$/, "")} · ${Math.round(vibeScore(d) * 100)}%</b><span>${d.tagline}</span></span></button>`).join("")}
      </div>
      <div class="sticky"><button class="btn full" type="button" id="applyTool">Показать на карте</button></div>`;
      t.querySelectorAll("[data-v]").forEach((b) => (b.onclick = () => { const v = b.dataset.v; S.vibe = S.vibe.includes(v) ? S.vibe.filter((x) => x !== v) : [...S.vibe, v]; renderPeek(); renderMap(true); openTool("vibe"); }));
      t.querySelectorAll("[data-open]").forEach((b) => (b.onclick = () => { closeSheets(); openStory(b.dataset.open); }));
    }
    t.classList.add("on"); $("scrim").classList.add("on");
    $("closeTool").onclick = closeSheets;
    $("applyTool").onclick = () => { closeSheets(); toast(`${matched().length} ${plural(matched().length, "район", "района", "районов")} под ваши слои`); };
  }
  function closeSheets() { ["layersSheet", "toolSheet", "menuSheet"].forEach((i) => $(i).classList.remove("on")); $("scrim").classList.remove("on"); }

  /* ---------- сторис района (живые фото) ---------- */
  let timer;
  function openStory(id) { S.story = id; S.slide = 0; renderStory(); $("story").classList.add("on"); }
  function renderStory() {
    const d = city.find((x) => x.id === S.story) || DISTRICTS.find((x) => x.id === S.story);
    if (!d) return;
    const name = d.name.replace(/:.*$/, "");
    const rent = S.seg === "rent";
    const slides = rent
      ? [{ t: name, p: d.tagline }, { t: "Что рядом", p: "Парки, школы и сады" }, { t: "Дорога", p: d.toCenter }]
      : [{ t: name, p: d.tagline }, { t: "Что меняется", p: "Район через 5 лет" }, { t: "Ипотека или аренда", p: "Сколько это в месяц" }];
    const sl = slides[S.slide];
    const tags = rent
      ? [d.flats.length ? tag(`${d.flats.length} ${plural(d.flats.length, "квартира", "квартиры", "квартир")} с фото`, "#fff", C.blue) : ""]
      : [tag(d.group === "new" || d.growth >= 12 ? "Район на вырост" : "Стабильный район", "#fff", C.green), tag(d.buyMed <= 12 ? "В бюджете" : "Выше бюджета", "#fff", d.buyMed <= 12 ? C.blue : C.orange)];
    let info = "";
    if (S.slide === 0) {
      info = `<div class="fact">${ic("spark", 20, C.blue)}<span>${rent ? `Аренда ~${fmt(d.rentMed)} ₽/мес · оценка Циана ${d.score}` : `Однушка от ${String(d.buyMed).replace(".", ",")} млн ₽ · цена м² +${d.growth}% за 3 года`}</span></div>
        ${d.reviews.map((r) => `<div class="quote"><b>Жители говорят:</b> «${r}»</div>`).join("")}
        ${d.flats.length ? `<div class="thumbs">${d.flats.map((f) => `<figure data-sf="${f.id}"><img src="${flatSrc(f.photos[0])}" alt=""><figcaption>${rent ? `${fmt(f.price)} ₽` : flatPrice(f)}<span>${flatAddr(f)}</span></figcaption></figure>`).join("")}</div>` : ""}`;
    }
    if (S.slide === 1) {
      const items = rent ? [...d.parks.map((p) => ({ img: p.photo, t: p.name, s: p.note })), ...d.schools.slice(0, 2).map((s) => ({ img: s.photo, t: s.name, s: `★ ${s.rating} · ${s.reviews} отзывов` })), ...d.kindergartens.slice(0, 1).map((s) => ({ img: s.photo, t: s.name, s: `★ ${s.rating}` }))]
        : [...d.parks.map((p) => ({ img: p.photo, t: p.name, s: p.note })), ...d.schools.slice(0, 2).map((s) => ({ img: s.photo, t: s.name, s: `★ ${s.rating}` }))];
      info = (rent ? "" : `<div class="fact">${ic("spark", 20, C.green)}<span>${d.group === "new" ? "Новые кварталы, школы и сады строят вместе с домами" : "Район обновляется: благоустройство и новые кафе"} — пример</span></div><div class="fact">${ic("spark", 20, C.green)}<span>Цена м² за 3 года <b style="color:var(--green-t)">+${d.growth}%</b></span></div>`) +
        `<div class="thumbs">${items.map((x) => `<figure><img src="${commons(x.img, 300)}" alt="" loading="lazy"><figcaption>${x.t}<span>${x.s}</span></figcaption></figure>`).join("")}</div>`;
    }
    if (S.slide === 2) {
      info = rent
        ? `<div class="stat" style="background:var(--main-bg)"><b>≈ ${Math.round(d.tc * 2 * 220 / 60)} часов</b><span>в дороге до центра за год · ${d.toCenter}</span></div><div class="fact">${ic("spark", 20, C.orange)}<span>Пробки вечером: ${d.traffic}/10 — ${d.trafficNote}</span></div><div class="fact">${ic("walk", 20, C.blue)}<span>Метро: ${d.metro.length ? d.metro.map((m) => m[0] || m).join(", ") : d.nearestMetro}</span></div>`
        : `<div class="stat" style="background:var(--lav)"><span style="color:var(--purple);font-weight:700">Платёж vs аренда</span><b>${d.pay} vs ${Math.round(d.rentMed / 1000)} тыс.</b><span>${d.pay > d.rentMed / 1000 ? `Разница ${d.pay - Math.round(d.rentMed / 1000)} тыс. в месяц идёт в ваши метры` : "Платёж меньше аренды такой же квартиры"}</span></div><div class="quote">Первый взнос 20%, ставка — пример для концепта</div>`;
    }
    const fav = !!S.fav["d-" + d.id];
    const credit = d.photo ? `<span class="credit">${d.photo.caption} · фото: Викисклад</span>` : "";
    $("story").innerHTML = `<div class="cover">${d.photo ? `<img class="cphoto" src="${dPhoto(d, 900)}" alt="${d.photo.caption}" style="object-position:50% ${d.photo.pos}%">` : ""}<div class="shade"></div>
      <div class="bars">${slides.map((_, i) => `<span class="${i < S.slide ? "done" : i === S.slide ? "now" : ""}"><i></i></span>`).join("")}</div>
      <div style="position:absolute;left:16px;right:8px;top:58px;display:flex;justify-content:space-between;align-items:center;z-index:3">${credit}<button class="iconbtn" type="button" id="closeStory" aria-label="Закрыть" style="color:#fff">${ic("close", 24, "#fff")}</button></div>
      <button class="tapzone" type="button" style="left:0" id="prevS" aria-label="Назад"></button><button class="tapzone" type="button" style="right:0" id="nextS" aria-label="Дальше"></button>
      <div class="ctext"><div style="display:flex;gap:6px">${tags.join("")}</div><h3>${sl.t}</h3><p>${sl.p}</p></div></div>
      <div class="sinfo">${info}
      <div style="margin-top:auto;display:flex;gap:8px;padding-bottom:12px"><button class="btn" type="button" style="flex:1" id="storyList">${d.flats.length ? `Квартиры здесь · ${d.flats.length}` : fav ? "Следим за районом" : "Следить за новыми квартирами"}</button><button class="btn sec" type="button" id="storyFav" aria-label="Сохранить район" style="width:48px;padding:0;display:flex;align-items:center;justify-content:center">${ic(fav ? "heartf" : "heart", 22, "#005ede")}</button></div></div>`;
    $("closeStory").onclick = closeStory;
    $("prevS").onclick = () => { S.slide = Math.max(0, S.slide - 1); renderStory(); };
    $("nextS").onclick = nextSlide;
    $("storyList").onclick = () => { if (d.flats.length) openFlat(d.flats[0].id); else $("storyFav").click(); };
    $("story").querySelectorAll("[data-sf]").forEach((x) => (x.onclick = () => openFlat(x.dataset.sf)));
    $("storyFav").onclick = () => { S.fav["d-" + d.id] = !fav; toast(!fav ? "Район сохранён — пришлём новые квартиры" : "Район убран из сохранённых"); renderStory(); };
    clearTimeout(timer); timer = setTimeout(nextSlide, 6000);
  }
  function nextSlide() { if (S.slide < 2) { S.slide++; renderStory(); } else clearTimeout(timer); }
  function closeStory() { clearTimeout(timer); $("story").classList.remove("on"); }

  /* ---------- экран квартиры ---------- */
  function openFlat(id) {
    const f = A.LISTINGS.find((x) => x.id === id); if (!f) return;
    const d = city.find((x) => x.id === A.findDistrict(f.lat, f.lon).id);
    const why = d ? S.active.filter((x) => L(x).test(d)).map((x) => tag(L(x).reason(d), "#227e01", "#ebf9e6")) : [];
    $("flat").innerHTML = `<div class="shead"><button class="iconbtn" type="button" id="flatBack" aria-label="Назад">${ic("back", 24)}</button><div class="tt"><b>${flatPrice(f)}</b><span>${flatTitle(f)}</span></div><button class="iconbtn" type="button" data-fav="${f.id}" aria-label="В избранное" style="color:#005ede">${ic(S.fav[f.id] ? "heartf" : "heart", 24, "#005ede")}</button></div>
      <div class="sbody"><div class="fbig"><div class="gal">${f.photos.map((p) => `<figure><img src="${flatSrc(p)}" alt="">${p.caption ? `<figcaption>${p.caption}</figcaption>` : ""}</figure>`).join("")}</div></div>
      <div class="fbody"><span class="snip-p" style="font-size:22px;font-weight:600">${flatPrice(f)}</span>${S.seg === "buy" ? `<span class="fpay" style="font-size:14px">Платёж ≈ ${flatPay(f)} тыс. ₽/мес · взнос 20%</span>` : ""}<span style="font-size:16px;font-weight:600">${flatTitle(f)}</span><span class="fa">${flatAddr(f)}, Санкт-Петербург</span>
      <span class="metro"><i style="background:#${f.metroColor}"></i>${f.metro} · ${f.metroMin} мин ${f.metroTransport === "walk" ? "пешком" : "на транспорте"}</span>
      <div class="tags" style="margin-top:6px">${why.join("")}${d ? `<button class="tag" type="button" id="toDistrict" style="border:0;color:#005ede;background:#e6f0ff">Район: ${d.name.replace(/:.*$/, "")}</button>` : ""}</div>
      <div class="btns" style="display:flex;gap:8px;margin-top:12px"><button class="btn" type="button" style="flex:1">Позвонить</button><button class="btn sec" type="button" style="flex:1">Написать</button></div></div></div>`;
    $("flat").classList.add("on");
    $("flatBack").onclick = () => $("flat").classList.remove("on");
    $("flat").querySelector("[data-fav]").onclick = (e) => { S.fav[f.id] = !S.fav[f.id]; e.currentTarget.innerHTML = ic(S.fav[f.id] ? "heartf" : "heart", 24, "#005ede"); toast(S.fav[f.id] ? "Добавлено в избранное" : "Убрано из избранного"); };
    if ($("toDistrict")) $("toDistrict").onclick = () => openStory(d.id);
  }

  /* ---------- меню экранов ---------- */
  let tt;
  function toast(m) { const t = $("toast"); t.textContent = m; t.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("on"), 2000); }
  const SCREENS = [
    { h: "rent-layers", t: "1 · Слои под запрос — аренда", s: "Студия с питомцем: подборки слоёв с фото" },
    { h: "rent-districts", t: "2 · Слои включены → подборка", s: "«С питомцем» + «Тихо»: районы и квартиры" },
    { h: "rent-myday", t: "3 · Мой день на карте", s: "Работа на Невском, зал на Петроградке" },
    { h: "buy-layers", t: "1 · Слои под запрос — покупка", s: "Первая своя, однушка в ипотеку" },
    { h: "buy-districts", t: "2 · Слои включены → подборка", s: "«Где реально купить» + «Школы и сады»: районы, квартиры, платёж" },
    { h: "buy-story", t: "3 · Район на вырост", s: "Сторис района: что меняется, ипотека или аренда" },
  ];
  function closeAll() { closeSheets(); closeStory(); $("flat").classList.remove("on"); }
  function go(h) {
    const seg = h.startsWith("buy") ? "buy" : "rent";
    closeAll(); S = fresh(seg); $("peek").classList.remove("open"); $("peek").style.top = "";
    if (location.hash !== "#" + h) history.replaceState(null, "", "#" + h);
    if (h === "rent-districts") { S.hint = false; S.active = ["pets", "quiet"]; }
    if (h === "buy-districts") { S.hint = false; S.filters.kids = true; S.active = ["budget", "schools"]; }
    if (h === "rent-myday") { S.hint = false; S.active = ["commute"]; }
    if (h === "buy-story") { S.hint = false; S.active = ["grow"]; }
    renderTop(); renderPeek(); renderMap(true); tips();
    if (h.endsWith("layers")) { S.hint = false; setTimeout(() => $("navLayers").click(), 250); }
    if (h === "rent-myday") setTimeout(() => openTool("myday"), 250);
    if (h === "buy-story") setTimeout(() => openStory("begovaya"), 250);
    $("screens").querySelectorAll("button").forEach((b) => (b.style.borderColor = b.dataset.h === h ? "var(--chip-brd)" : ""));
  }
  function tips() {
    const r = S.seg === "rent"
      ? ["Кнопка слоёв — над контролами карты", "Снимите или добавьте «с животными» — порядок слоёв изменится", "Листайте фото квартир прямо в подборке", "Тапните район внизу или на карте — сторис с фото района"]
      : ["Наверху — «Где реально купить» с платежом", "«Планируем детей» поднимет школы и тишину", "В подборке у каждой квартиры — платёж в месяц", "Тапните район внизу или на карте — сторис: что меняется и ипотека или аренда"];
    $("tips").innerHTML = r.map((x) => `<li>${x}</li>`).join("");
  }
  $("screens").innerHTML = SCREENS.map((s) => `<button type="button" data-h="${s.h}"><b>${s.t}</b><br><span style="color:var(--sec);font-size:12px">${s.s}</span></button>`).join("") +
    `<button type="button" data-h="rent"><b>Свободный режим · аренда</b></button><button type="button" data-h="buy"><b>Свободный режим · покупка</b></button>`;
  $("screens").querySelectorAll("button").forEach((b) => (b.onclick = () => go(b.dataset.h)));
  function openMenu() {
    const m = $("menuSheet");
    m.innerHTML = `<div class="handle" style="margin-top:8px"></div><div class="head"><div><h2>Экраны для теста</h2><div class="sub">Открыть сразу нужный вариант</div></div><button class="iconbtn" type="button" id="closeMenu" aria-label="Закрыть">${ic("close", 22)}</button></div><div class="scroll">${SCREENS.map((s) => `<button class="menu-item" type="button" data-h="${s.h}"><div>${s.t}<span>${s.s}</span></div></button>`).join("")}<button class="menu-item" type="button" data-h="${S.seg === "rent" ? "buy" : "rent"}"><div>Свободный режим: ${S.seg === "rent" ? "покупка" : "аренда"}</div></button></div>`;
    m.classList.add("on"); $("scrim").classList.add("on");
    $("closeMenu").onclick = closeAll;
    m.querySelectorAll("[data-h]").forEach((b) => (b.onclick = () => go(b.dataset.h)));
  }
  $("navLayers").onclick = () => { S.hint = false; placeControls(); renderLayers(); $("layersSheet").classList.add("on"); $("scrim").classList.add("on"); };
  $("hint").onclick = () => $("navLayers").click();
  $("scrim").onclick = closeAll;
  let taps = [];
  $("phone").addEventListener("click", () => { if (window.innerWidth > 760) return; const n = Date.now(); taps = taps.filter((t) => n - t < 500); taps.push(n); if (taps.length >= 3) { taps = []; openMenu(); } });
  window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (h) go(h); });
  window.addEventListener("resize", placeControls);
  go(location.hash.slice(1) || "rent-layers");
  initMap();
})();
