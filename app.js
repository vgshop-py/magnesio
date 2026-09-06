/* ============================================================
   MOTOR DE LA LANDING — VG Shop Paraguay
   Carrusel · Combos · Checkout · Supabase (pedidos_web) ·
   Meta Pixel · GA4 · GTM · WhatsApp
   Sitio 100% estático: funciona en GitHub Pages sin servidor.

   ⚠️  NO hace falta editar este archivo para cambiar de producto.
       Los textos están en contenido.js y los datos en config.js.
   ============================================================ */
(function () {
  "use strict";

  var CFG = window.PRODUCT_CONFIG;
  var COMBOS = window.COMBOS;
  var RATES = window.SHIPPING_RATES;
  var DELIVERY_ZONES = window.DELIVERY_ZONES || {};
  var CARRIERS = window.CARRIERS;
  var CITIES = window.CITIES_BY_DEPARTMENT;
  var TXT = window.CONTENIDO || {};
  var DEPARTMENTS = window.DEPARTMENTS;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------------- Estado ---------------- */
  var state = {
    combo: COMBOS.filter(function (c) { return c.featured; })[0] || COMBOS[0],
    department: "",
    city: "",
    carrier: "",
    prepayAccepted: false,
    submitting: false,
    lastOrder: null,
    checkoutOpen: false,
  };

  /* ---------------- Utilidades ---------------- */
  function fmt(n) {
    return "Gs. " + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  function norm(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("show"); }, 3200);
  }

  /* ---------------- Parámetros de campaña ---------------- */
  // Clave de almacenamiento propia por landing, para que dos productos
  // publicados en el mismo dominio no se pisen entre sí.
  var STORAGE_KEY = "vg_" + (CFG.origin || "landing");

  var QS = new URLSearchParams(window.location.search);
  var TRACKING = {
    utm_source: QS.get("utm_source") || "",
    utm_medium: QS.get("utm_medium") || "",
    utm_campaign: QS.get("utm_campaign") || "",
    utm_content: QS.get("utm_content") || "",
    utm_term: QS.get("utm_term") || "",
    fbclid: QS.get("fbclid") || "",
    gclid: QS.get("gclid") || "",
  };
  // Persistimos la atribución para que sobreviva a la navegación interna.
  try {
    var saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY + "_utm") || "{}");
    var hasNew = Object.keys(TRACKING).some(function (k) { return TRACKING[k]; });
    if (hasNew) sessionStorage.setItem(STORAGE_KEY + "_utm", JSON.stringify(TRACKING));
    else Object.keys(TRACKING).forEach(function (k) { TRACKING[k] = TRACKING[k] || saved[k] || ""; });
  } catch (e) { /* sessionStorage bloqueado */ }

  /* ---------------- Analítica ---------------- */
  var META_STANDARD = ["PageView", "ViewContent", "AddToCart", "CustomizeProduct",
    "InitiateCheckout", "Lead", "Contact", "Search", "AddPaymentInfo"];

  function cookieValue(name) {
    var prefix = name + "=";
    var parts = String(document.cookie || "").split(";");
    for (var i = 0; i < parts.length; i += 1) {
      var part = parts[i].trim();
      if (part.indexOf(prefix) === 0) return decodeURIComponent(part.slice(prefix.length));
    }
    return "";
  }

  function landingUrl() {
    return window.location.origin + window.location.pathname;
  }

  /**
   * Dispara un evento en GA4 (gtag), Meta Pixel (fbq) y dataLayer (GTM).
   * @param {string} ga4      nombre del evento GA4
   * @param {string} meta     nombre del evento Meta Pixel ("" para omitir)
   * @param {object} params   parámetros (value siempre numérico, currency PYG)
   */
  /** ID único por evento: permite deduplicar si algún día se suma la API de Conversiones. */
  function eventId(name) {
    return name + "." + Date.now().toString(36) + "." + Math.random().toString(36).slice(2, 8);
  }

  function track(ga4, meta, params) {
    params = params || {};
    try {
      if (window.dataLayer) {
        window.dataLayer.push(Object.assign({ event: ga4 }, params));
      }
      if (typeof window.gtag === "function" && ga4) {
        window.gtag("event", ga4, params);
      }
      if (typeof window.fbq === "function" && meta) {
        var qty = params.num_items || state.combo.qty;
        var mp = {
          content_name: CFG.name,
          content_category: CFG.category,
          content_ids: [CFG.sku],
          content_type: "product",
          contents: [{ id: CFG.sku, quantity: qty, item_price: state.combo.price / state.combo.qty }],
          currency: CFG.currency,
          num_items: qty,
        };
        if (typeof params.value === "number") mp.value = params.value;
        if (params.transaction_id) mp.order_id = params.transaction_id;
        if (params.combo) mp.content_variant = params.combo;
        window.fbq(
          META_STANDARD.indexOf(meta) >= 0 ? "track" : "trackCustom",
          meta,
          mp,
          { eventID: params.event_id || eventId(meta) },
        );
      }
    } catch (e) {
      console.warn("[track]", e);
    }
  }

  function itemPayload(combo) {
    return [{
      item_id: CFG.sku,
      item_name: CFG.name,
      item_brand: CFG.brand,
      item_category: CFG.category,
      item_variant: combo.label,
      price: combo.price,
      quantity: combo.qty,
    }];
  }

  /* ---------------- Envío y cobertura ---------------- */
  function findRate(city) {
    var n = norm(city);
    for (var i = 0; i < RATES.length; i++) if (norm(RATES[i].city) === n) return RATES[i];
    return null;
  }

  function normalizeLocationName(text) {
    return norm(text)
      .replace(/\b(departamento|depto|department|distrito|capital)\b/g, " ")
      .replace(/[^a-z0-9ñ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function detectarZona(lat, lng, city, department) {
    var local = DELIVERY_ZONES.ASUNCION_CENTRAL || {};
    var cityName = normalizeLocationName(city);
    var departmentName = normalizeLocationName(department);
    var localCities = (local.cities || []).map(normalizeLocationName);
    var localDepartments = (local.departments || []).map(normalizeLocationName);
    var isLocal = !!cityName && localCities.indexOf(cityName) !== -1;
    if (!isLocal && departmentName) isLocal = localDepartments.indexOf(departmentName) !== -1;

    var code = isLocal
      ? "ASUNCION_CENTRAL"
      : (cityName || departmentName ? "INTERIOR" : "SIN_DETERMINAR");
    var cfg = DELIVERY_ZONES[code] || {};
    var rate = cityName ? findRate(city) : null;
    // La cobertura específica de una ciudad tiene prioridad sobre la regla
    // general del interior. Así podemos habilitar delivery sin ampliar toda
    // una zona o departamento.
    var hasDirectDelivery = code === "ASUNCION_CENTRAL" ||
      (!!rate && rate.prepay !== true);
    return {
      code: code,
      tipoEntrega: hasDirectDelivery ? "DELIVERY" : (cfg.tipoEntrega || "SIN_DETERMINAR"),
      formaPago: hasDirectDelivery ? "CONTRA_ENTREGA" : (cfg.formaPago || "A_CONFIRMAR"),
      polygon: cfg.polygon || null,
      lat: lat == null ? null : lat,
      lng: lng == null ? null : lng,
    };
  }

  function estimatedDeliveryDate(orderDate) {
    var date = new Date(orderDate || new Date());
    date.setHours(12, 0, 0, 0);
    // De lunes a viernes se entrega al día siguiente. Los pedidos del sábado
    // y del domingo se programan para el lunes.
    date.setDate(date.getDate() + (date.getDay() === 6 ? 2 : 1));
    return date;
  }

  function estimatedDeliveryLabel(orderDate) {
    var text = new Intl.DateTimeFormat("es-PY", {
      weekday: "long", day: "numeric", month: "long",
    }).format(estimatedDeliveryDate(orderDate));
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function promoDeadlineDate(baseDate) {
    var date = new Date(baseDate || new Date());
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + 4);
    return date;
  }

  function paintCommercialDates() {
    var deadline = promoDeadlineDate();
    var deadlineDay = $("#priceDeadlineDay");
    var deadlineMonth = $("#priceDeadlineMonth");
    var deadlineTime = $("#priceDeadline");
    var deliveryDate = $("#checkoutDeliveryDate");
    if (deadlineDay) deadlineDay.textContent = String(deadline.getDate());
    if (deadlineMonth) {
      deadlineMonth.textContent = "de " + new Intl.DateTimeFormat("es-PY", { month: "long" }).format(deadline);
    }
    if (deadlineTime) deadlineTime.dateTime = deadline.getFullYear() + "-" +
      String(deadline.getMonth() + 1).padStart(2, "0") + "-" + String(deadline.getDate()).padStart(2, "0");
    if (deliveryDate) deliveryDate.textContent = "Entrega prevista: " + estimatedDeliveryLabel();
  }

  /** Devuelve la modalidad de entrega calculada para la ciudad actual. */
  function deliveryInfo() {
    var rate = state.city ? findRate(state.city) : null;
    var covered = !!rate;
    var point = typeof mapState !== "undefined" && mapState.point ? mapState.point : {};
    var detectedZone = detectarZona(point.lat, point.lng, state.city, state.department);
    var carrierNeeded = detectedZone.tipoEntrega !== "DELIVERY";
    var realCost = covered ? rate.cost : 0;
    var eta = estimatedDeliveryLabel();
    return {
      covered: covered,
      zone: detectedZone.code,
      carrierNeeded: carrierNeeded,
      prepay: carrierNeeded,
      realCost: realCost,
      cost: CFG.freeShipping ? 0 : realCost,
      eta: eta,
      type: carrierNeeded ? "Transportadora" : "Delivery a domicilio",
      payment: carrierNeeded ? "Pago anticipado" : "Pago contra entrega",
    };
  }

  function totals() {
    var d = deliveryInfo();
    return { product: state.combo.price, shipping: d.cost, total: state.combo.price + d.cost, delivery: d };
  }

  /* ---------------- WhatsApp ---------------- */
  function waLink(extra) {
    var t = totals();
    var msg = "Hola, quiero comprar " + CFG.shortName + ". Me interesa el combo de " +
      state.combo.label + " por " + fmt(t.total) + ".";
    msg += " Mi ciudad es " + (state.city || "________") + ".";
    if (extra) msg += " " + extra;
    return "https://wa.me/" + CFG.whatsapp + "?text=" + encodeURIComponent(msg);
  }
  function refreshWaLinks() {
    var href = waLink();
    ["#waHero", "#waFloat", "#waFinal", "#waFooter"].forEach(function (sel) {
      var el = $(sel); if (el) el.href = href;
    });
  }

  /* ---------------- 1. Barra superior deslizante ---------------- */
  function renderAnnounce() {
    var ANNOUNCE_ITEMS = TXT.barraSuperior || [];
    var track = $("#announceTrack");
    if (!track) return;
    var html = ANNOUNCE_ITEMS.map(function (t) {
      return '<span class="announce-item">' + esc(t) + "</span>";
    }).join("");
    // Duplicamos la lista para que el bucle de -50% sea continuo y sin cortes.
    track.innerHTML = html + html;
  }

  /* ---------------- Datos de pago (pedidos con pago anticipado) ---------------- */
  function renderPaymentInfo() {
    var info = CFG.paymentInfo;
    if (!info) return;
    $$("[data-pay]").forEach(function (el) {
      var v = info[el.dataset.pay];
      if (v) el.textContent = v;
    });

    $$("[data-copy-alias]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var alias = String(info.alias || "");
        var done = function () {
          btn.textContent = "¡Copiado!";
          btn.classList.add("done");
          toast("Copiamos " + alias + " al portapapeles");
          setTimeout(function () {
            btn.textContent = "Copiar";
            btn.classList.remove("done");
          }, 2500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(alias).then(done).catch(function () { fallbackCopy(alias, done); });
        } else {
          fallbackCopy(alias, done);
        }
      });
    });
  }

  /** Copiado para navegadores sin API de portapapeles (o sin HTTPS). */
  function fallbackCopy(text, done) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      done();
    } catch (e) {
      toast("Copiá este dato a mano: " + text);
    }
  }

  /* ---------------- Modal de procedencia y respaldo ---------------- */
  function openTrust() {
    $("#trustModal").hidden = false;
    document.body.classList.add("no-scroll");
    track("view_promotion", "", { promotion_name: "procedencia_y_respaldo" });
  }
  function closeTrust() {
    $("#trustModal").hidden = true;
    if (!state.checkoutOpen) document.body.classList.remove("no-scroll");
  }

  /* ---------------- Ubicación: selector con mapa ----------------
     Usamos Leaflet + OpenStreetMap: sin API key, sin costo y sin backend.
     La librería se descarga recién cuando el cliente abre el mapa, así no
     pesa en la carga inicial de la landing.
  ---------------------------------------------------------------- */
  var LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  var LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  var DEFAULT_POINT = { lat: -25.2637, lng: -57.5759 };  // Asunción

  var mapState = {
    loaded: false,
    loading: null,
    map: null,
    marker: null,
    point: null,
    location: {
      direccionDetectada: "", barrio: "", city: "", department: "", postcode: "",
      accuracy: null, origin: "", zone: "SIN_DETERMINAR",
      tipoEntrega: "SIN_DETERMINAR", formaPago: "A_CONFIRMAR",
    },
    geocodeCache: new Map(),
    reverseCache: new Map(),
    nominatimQueue: Promise.resolve(),
    lastNominatimAt: 0,
    reverseSequence: 0,
    addressTimer: null,
    lastGeocodedAddress: "",
  };

  function mapsUrl(lat, lng) {
    return "https://www.google.com/maps?q=" + lat.toFixed(6) + "," + lng.toFixed(6);
  }

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  /** Cola única: el sitio nunca supera una consulta por segundo a Nominatim. */
  function nominatimRequest(url) {
    mapState.nominatimQueue = mapState.nominatimQueue.catch(function () { return null; }).then(function () {
      var remaining = Math.max(0, 1100 - (Date.now() - mapState.lastNominatimAt));
      return wait(remaining);
    }).then(function () {
      mapState.lastNominatimAt = Date.now();
      return fetch(url, { headers: { Accept: "application/json", "Accept-Language": "es" } });
    }).then(function (response) {
      if (!response.ok) throw new Error("Geocoding HTTP " + response.status);
      return response.json();
    });
    return mapState.nominatimQueue;
  }

  function locationDetails(result) {
    var a = result && result.address ? result.address : {};
    return {
      direccionDetectada: String(result && result.display_name || "").slice(0, 500),
      barrio: a.neighbourhood || a.suburb || a.quarter || a.city_district || "",
      city: a.city || a.town || a.village || a.municipality || a.county || "",
      department: a.state || "",
      postcode: a.postcode || "",
      country: a.country || "",
      road: a.road || "",
      houseNumber: a.house_number || "",
    };
  }

  function geocodeAddress(address) {
    var key = normalizeLocationName(address);
    if (!key || key.length < 6) return Promise.resolve(null);
    if (mapState.geocodeCache.has(key)) return Promise.resolve(mapState.geocodeCache.get(key));
    var url = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&countrycodes=py" +
      "&addressdetails=1&accept-language=es&q=" + encodeURIComponent(address);
    return nominatimRequest(url).then(function (list) {
      var hit = list && list.length ? list[0] : null;
      var value = hit ? {
        lat: parseFloat(hit.lat), lng: parseFloat(hit.lon), details: locationDetails(hit),
      } : null;
      mapState.geocodeCache.set(key, value);
      return value;
    });
  }

  function reverseGeocode(lat, lng) {
    var key = Number(lat).toFixed(5) + "," + Number(lng).toFixed(5);
    if (mapState.reverseCache.has(key)) return Promise.resolve(mapState.reverseCache.get(key));
    var url = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1" +
      "&accept-language=es&zoom=18&lat=" + encodeURIComponent(lat) + "&lon=" + encodeURIComponent(lng);
    return nominatimRequest(url).then(function (result) {
      var details = locationDetails(result || {});
      mapState.reverseCache.set(key, details);
      return details;
    });
  }

  function closestOptionValue(select, wanted) {
    var target = normalizeLocationName(wanted);
    if (!target) return "";
    var options = Array.prototype.slice.call(select.options || []);
    var exact = options.filter(function (o) { return normalizeLocationName(o.value) === target; })[0];
    if (exact) return exact.value;
    var near = options.filter(function (o) {
      var value = normalizeLocationName(o.value);
      return value && (value.indexOf(target) !== -1 || target.indexOf(value) !== -1);
    })[0];
    return near ? near.value : "";
  }

  function detectedDepartment(name, city) {
    if (normalizeLocationName(city) === "asuncion") return "Asunción";
    var select = $("#f-departamento");
    var matched = closestOptionValue(select, name);
    if (matched) return matched;
    var n = normalizeLocationName(name);
    if (n === "central") return "Central";
    return "";
  }

  function syncDetectedPlace(details) {
    if (!details) return;
    var department = detectedDepartment(details.department, details.city);
    if (department) {
      state.department = department;
      $("#f-departamento").value = department;
      fillCities(department);
      clearError("departamento"); markOk("departamento");
    }

    if (details.city && state.department) {
      var citySelect = $("#f-ciudad");
      var cityValue = closestOptionValue(citySelect, details.city);
      var otherField = $('.field[data-field="ciudadOtra"]');
      if (cityValue) {
        citySelect.value = cityValue;
        otherField.hidden = true;
        $("#f-ciudad-otra").value = "";
        state.city = cityValue;
      } else {
        citySelect.value = "__otra";
        otherField.hidden = false;
        $("#f-ciudad-otra").value = details.city;
        state.city = details.city;
      }
      clearError("ciudad"); markOk("ciudad");
    }

    paintDelivery();
  }

  function renderLocationStatus(data, warning) {
    var card = $("#locationCard");
    if (!card) return;
    card.hidden = false;
    card.classList.toggle("warning", !!warning);
    card.dataset.origin = warning ? "" : (data.origin || "");
    card.dataset.zone = warning ? "SIN_DETERMINAR" : (data.zone || "SIN_DETERMINAR");
    card.dataset.accuracy = warning || data.accuracy == null ? "" : String(data.accuracy);
    if (warning) {
      card.innerHTML = "<strong>⚠️ No pudimos ubicar esta dirección exactamente</strong>" +
        "<span>Podés mover el pin o usar tu ubicación actual. Igualmente podés continuar con tu pedido.</span>";
      return;
    }

    var placeDepartment = detectedDepartment(data.department, data.city) || data.department;
    var place = [data.city || state.city, placeDepartment || state.department].filter(Boolean).join(", ") ||
      "Punto confirmado en el mapa";
    var zoneLabel = data.zone === "ASUNCION_CENTRAL" ? "Asunción y Central" :
      (data.zone === "INTERIOR" ? "Interior" : "A confirmar");
    var deliveryLabel = data.tipoEntrega === "DELIVERY" ? "Delivery" :
      (data.tipoEntrega === "TRANSPORTADORA" ? "Envío por transportadora" : "Entrega a confirmar");
    var paymentLabel = data.formaPago === "CONTRA_ENTREGA" ? "Pago al recibir" :
      (data.formaPago === "PAGO_PREVIO" ? "Pago previo al envío" : "Forma de pago a confirmar");
    card.innerHTML =
      "<strong>✅ Ubicación confirmada</strong>" +
      '<span><i class="lc-icon">📍</i>' + esc(place) + "</span>" +
      '<span><i class="lc-icon">🚚</i>Zona de entrega: ' + esc(zoneLabel) + " · " + esc(deliveryLabel) + "</span>" +
      '<span><i class="lc-icon">💵</i>' + esc(paymentLabel) + "</span>";
  }

  function updateMarker(lat, lng) {
    if (!mapState.map) return;
    if (!mapState.marker) {
      mapState.marker = window.L.marker([lat, lng], { draggable: true, autoPan: true }).addTo(mapState.map);
      mapState.marker.on("dragend", function () {
        var p = mapState.marker.getLatLng();
        setMapLocation(p.lat, p.lng, "PIN_MANUAL", { recenter: false });
      });
    } else {
      mapState.marker.setLatLng([lat, lng]);
    }
  }

  function setMapLocation(lat, lng, source, options) {
    options = options || {};
    lat = Number(lat); lng = Number(lng);
    if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return Promise.resolve(null);
    }

    mapState.point = { lat: lat, lng: lng };
    mapState.location.origin = source || "PIN_MANUAL";
    if (options.accuracy != null) mapState.location.accuracy = Math.round(options.accuracy);
    else if (source !== "GPS") mapState.location.accuracy = null;
    updateMarker(lat, lng);
    if (options.recenter !== false && mapState.map) {
      mapState.map.setView([lat, lng], options.zoom || (source === "GPS" ? 17 : 16));
    }

    $("#f-ubicacion").value = mapsUrl(lat, lng);
    $("#mapStatus").textContent = "✓ Ubicación marcada correctamente";
    setLocationHint("¿No quedó exactamente en tu casa? Mové el pin hasta tu domicilio.", "ok");
    if (source) track("share_location", "", { method: source.toLowerCase() });

    var sequence = ++mapState.reverseSequence;
    return reverseGeocode(lat, lng).then(function (details) {
      if (sequence !== mapState.reverseSequence) return null;
      Object.keys(details).forEach(function (key) { mapState.location[key] = details[key]; });
      var zone = detectarZona(lat, lng, details.city, details.department);
      mapState.location.zone = zone.code;
      mapState.location.tipoEntrega = zone.tipoEntrega;
      mapState.location.formaPago = zone.formaPago;
      syncDetectedPlace(details);
      renderLocationStatus(mapState.location, false);
      return mapState.location;
    }).catch(function () {
      if (sequence !== mapState.reverseSequence) return null;
      var zone = detectarZona(lat, lng, state.city, state.department);
      mapState.location.zone = zone.code;
      mapState.location.tipoEntrega = zone.tipoEntrega;
      mapState.location.formaPago = zone.formaPago;
      renderLocationStatus(mapState.location, false);
      return mapState.location;
    });
  }

  function loadLeaflet() {
    if (mapState.loaded) return Promise.resolve();
    if (mapState.loading) return mapState.loading;
    mapState.loading = new Promise(function (resolve, reject) {
      var css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = LEAFLET_CSS;
      document.head.appendChild(css);

      var js = document.createElement("script");
      js.src = LEAFLET_JS;
      js.async = true;
      js.onload = function () { mapState.loaded = true; resolve(); };
      js.onerror = function () { mapState.loading = null; reject(new Error("leaflet")); };
      document.head.appendChild(js);
    });
    return mapState.loading;
  }

  function setMapPoint(lat, lng, recenter) {
    return setMapLocation(lat, lng, "PIN_MANUAL", { recenter: recenter !== false });
  }

  function buildMap() {
    var L = window.L;
    var start = mapState.point || DEFAULT_POINT;

    mapState.map = L.map("mapCanvas", { zoomControl: true, attributionControl: true })
      .setView([start.lat, start.lng], mapState.point ? 16 : 12);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapState.map);

    mapState.map.on("click", function (e) {
      setMapLocation(e.latlng.lat, e.latlng.lng, "PIN_MANUAL", { recenter: false });
    });

    if (mapState.point) updateMarker(start.lat, start.lng);
    $("#mapLoading").hidden = true;
  }

  /** Lee un enlace ya cargado en el campo para reabrir el mapa en ese punto. */
  function pointFromUrl(url) {
    var m = String(url || "").match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
    if (!m) return null;
    var lat = parseFloat(m[1]);
    var lng = parseFloat(m[2]);
    if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat: lat, lng: lng };
  }

  function openMapPicker() {
    var existing = pointFromUrl($("#f-ubicacion").value);
    if (existing) mapState.point = existing;

    if (mapState.map) {
      $("#mapLoading").hidden = true;
      setTimeout(function () {
        mapState.map.invalidateSize();
        if (mapState.point) {
          updateMarker(mapState.point.lat, mapState.point.lng);
          mapState.map.setView([mapState.point.lat, mapState.point.lng], 16);
        }
      }, 60);
      return;
    }

    $("#mapLoading").hidden = false;
    loadLeaflet().then(function () {
      setTimeout(buildMap, 40);
    }).catch(function () {
      $("#mapLoading").innerHTML =
        "No pudimos cargar el mapa. Revisá tu conexión e intentá nuevamente.";
    });
  }

  function closeMapPicker() {
    $("#mapModal").hidden = true;
    if (!state.checkoutOpen) document.body.classList.remove("no-scroll");
  }

  /** Geocodificación con Nominatim (OpenStreetMap), sin clave ni backend. */
  function searchPlace() {
    var q = $("#mapSearch").value.trim();
    var msg = $("#mapSearchMsg");
    if (q.length < 3) {
      msg.hidden = false;
      msg.className = "map-search-msg bad";
      msg.textContent = "Escribí al menos 3 letras para buscar.";
      return;
    }
    var btn = $("#btnSearch");
    btn.disabled = true;
    btn.textContent = "Buscando…";
    msg.hidden = false;
    msg.className = "map-search-msg";
    msg.textContent = "Buscando “" + q + "”…";

    var url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=py&q=" +
      encodeURIComponent(q);

    fetch(url, { headers: { Accept: "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (list) {
        btn.disabled = false;
        btn.textContent = "Buscar";
        if (!list || !list.length) {
          msg.className = "map-search-msg bad";
          msg.textContent = "No encontramos ese lugar. Probá con otra referencia o marcalo tocando el mapa.";
          return;
        }
        var hit = list[0];
        msg.className = "map-search-msg";
        msg.textContent = hit.display_name.slice(0, 90);
        setMapPoint(parseFloat(hit.lat), parseFloat(hit.lon), true);
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = "Buscar";
        msg.className = "map-search-msg bad";
        msg.textContent = "No pudimos buscar ahora. Marcá tu ubicación tocando el mapa.";
      });
  }

  function lookupWrittenAddress() {
    var input = $("#f-direccion");
    var status = $("#addressLookup");
    var address = input.value.trim();
    if (address.length < 6 || address === mapState.lastGeocodedAddress) return;
    if (mapState.location.origin === "GPS") {
      status.className = "address-lookup ok";
      status.textContent = "✓ Conservamos la ubicación GPS, que es más precisa.";
      return;
    }

    if (mapState.location.origin === "DIRECCION") clearLocation();

    mapState.lastGeocodedAddress = address;
    status.className = "address-lookup searching";
    status.textContent = "Buscando la dirección en el mapa…";
    geocodeAddress(address).then(function (hit) {
      if (mapState.location.origin === "GPS") return;
      if (!hit) {
        status.className = "address-lookup bad";
        status.textContent = "No pudimos ubicarla exactamente. Podés usar el GPS o mover el pin.";
        renderLocationStatus({}, true);
        return;
      }
      status.className = "address-lookup ok";
      status.textContent = "✓ Dirección encontrada. Podés ajustar el pin si hace falta.";
      setMapLocation(hit.lat, hit.lng, "DIRECCION", { recenter: true, zoom: 17 });
    }).catch(function () {
      status.className = "address-lookup bad";
      status.textContent = "No pudimos buscar ahora. Podés usar el GPS o marcar el mapa.";
      renderLocationStatus({}, true);
    });
  }

  function scheduleWrittenAddressLookup() {
    clearTimeout(mapState.addressTimer);
    mapState.addressTimer = setTimeout(lookupWrittenAddress, 850);
  }

  /** Pide la ubicación al navegador. `onPoint` recibe las coordenadas. */
  function requestGeolocation(btn, onPoint, onFail) {
    if (!navigator.geolocation) {
      onFail("Tu navegador no permite compartir la ubicación.");
      return;
    }
    var original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span aria-hidden="true">🎯</span> Buscando tu ubicación…';
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        btn.disabled = false;
        btn.innerHTML = original;
        onPoint(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
      },
      function (err) {
        btn.disabled = false;
        btn.innerHTML = original;
        var message = "No pudimos acceder a tu ubicación. Podés escribir tu dirección o marcarla manualmente en el mapa.";
        if (err.code === 1) message = "No diste permiso para usar tu ubicación. Podés escribir tu dirección o marcarla manualmente.";
        else if (err.code === 2) message = "Tu ubicación no está disponible en este momento. Podés escribir tu dirección o mover el pin.";
        else if (err.code === 3) message = "La búsqueda de tu ubicación tardó demasiado. Intentá otra vez o escribí tu dirección.";
        onFail(message);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  function setLocationHint(msg, cls) {
    var hint = $("#geoHint");
    hint.textContent = msg;
    hint.classList.remove("ok", "bad");
    if (cls) hint.classList.add(cls);
  }

  /** Refleja en el checkout la ubicación elegida. */
  function applyLocation(url, method) {
    $("#f-ubicacion").value = url;
    var status = $("#mapStatus");
    if (status) status.textContent = "✓ Ubicación marcada correctamente";
    setLocationHint("¡Listo! Con tu ubicación el repartidor te encuentra más rápido.", "ok");
    if (method) track("share_location", "", { method: method });
  }

  function clearLocation() {
    $("#f-ubicacion").value = "";
    if (mapState.map && mapState.marker) mapState.map.removeLayer(mapState.marker);
    mapState.marker = null;
    mapState.point = null;
    mapState.reverseSequence += 1;
    mapState.location = {
      direccionDetectada: "", barrio: "", city: "", department: "", postcode: "",
      accuracy: null, origin: "", zone: "SIN_DETERMINAR",
      tipoEntrega: "SIN_DETERMINAR", formaPago: "A_CONFIRMAR",
    };
    if ($("#mapStatus")) $("#mapStatus").textContent = "Tocá el mapa para marcar tu ubicación";
    setLocationHint("¿No quedó exactamente en tu casa? Mové el pin hasta tu domicilio.");
    if ($("#locationCard")) $("#locationCard").hidden = true;
  }

  function initLocationPicker() {
    if (!$("#btnPickMap")) return;

    $("#btnPickMap").addEventListener("click", openMapPicker);
    $$("[data-close-map]").forEach(function (b) { b.addEventListener("click", closeMapPicker); });
    $("#btnClearMap").addEventListener("click", clearLocation);

    $("#btnSearch").addEventListener("click", searchPlace);
    $("#mapSearch").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); searchPlace(); }
    });

    // Geolocalizar desde el checkout: marca el punto y abre el mapa para ajustar.
    $("#btnGeo").addEventListener("click", function () {
      var btn = this;
      requestGeolocation(btn, function (lat, lng) {
        mapState.point = { lat: lat, lng: lng };
        applyLocation(mapsUrl(lat, lng), "geolocation");
        openMapPicker();
      }, function (msg) {
        setLocationHint(msg + " Podés tocar “Marcar en el mapa”.", "bad");
      });
    });

    // Geolocalizar desde dentro del mapa: solo mueve el pin.
    $("#btnGeoMap").addEventListener("click", function () {
      var btn = this;
      var msg = $("#mapSearchMsg");
      requestGeolocation(btn, function (lat, lng) {
        setMapPoint(lat, lng, true);
        msg.hidden = false;
        msg.className = "map-search-msg";
        msg.textContent = "Listo, marcamos tu ubicación actual. Ajustá el pin si hace falta.";
      }, function (text) {
        msg.hidden = false;
        msg.className = "map-search-msg bad";
        msg.textContent = text;
      });
    });

    $("#btnConfirmMap").addEventListener("click", function () {
      var p = mapState.point || DEFAULT_POINT;
      applyLocation(mapsUrl(p.lat, p.lng), "map_picker");
      closeMapPicker();
      toast("Ubicación guardada 📍");
    });

    // Enlace pegado a mano
    $("#f-ubicacion").addEventListener("input", function () {
      var v = this.value.trim();
      if (!v) { $("#mapResult").hidden = true; return; }
      $("#btnOpenMaps").href = /^https?:\/\//i.test(v) ? v : "https://www.google.com/maps";
      var p = pointFromUrl(v);
      if (p) mapState.point = p;
      $("#mapResultText").textContent = v.replace("https://www.google.com/maps?q=", "");
      $("#mapResult").hidden = false;
    });
  }

  function initInlineLocationPicker() {
    if (!$("#mapCanvas") || !$("#btnGeo")) return;
    $("#btnGeo").addEventListener("click", function () {
      var btn = this;
      requestGeolocation(btn, function (lat, lng, accuracy) {
        setMapLocation(lat, lng, "GPS", { recenter: true, zoom: 17, accuracy: accuracy });
        var lookup = $("#addressLookup");
        lookup.className = "address-lookup ok";
        lookup.textContent = "✓ Usamos tu ubicación GPS exacta.";
      }, function (msg) {
        setLocationHint(msg, "bad");
      });
    });

    var addressInput = $("#f-direccion");
    addressInput.addEventListener("input", function () {
      clearTimeout(mapState.addressTimer);
      if (this.value.trim() !== mapState.lastGeocodedAddress) {
        var lookup = $("#addressLookup");
        lookup.className = "address-lookup";
        lookup.textContent = this.value.trim().length >= 6
          ? "Al terminar de editar, intentaremos ubicarla en el mapa."
          : "";
      }
    });
    addressInput.addEventListener("change", scheduleWrittenAddressLookup);
    addressInput.addEventListener("blur", scheduleWrittenAddressLookup);
  }

  /* ---------------- 2. Carrusel ---------------- */
  var carousel = {
    index: 0,
    timer: null,
    userInteracted: false,
    track: null,
    slides: [],

    init: function () {
      var self = this;
      this.track = $("#carouselTrack");
      var slides = window.HERO_SLIDES;

      this.track.innerHTML = slides.map(function (s, i) {
        return '<div class="slide" role="group" aria-roledescription="diapositiva" aria-label="' +
          esc((i + 1) + " de " + slides.length) + '">' +
          '<div class="slide-media">' +
          '<img src="' + esc(s.src) + '" srcset="' + esc(s.srcSmall) + ' 640w, ' + esc(s.src) + ' 1024w"' +
          ' sizes="(max-width: 860px) 100vw, 520px" width="' + s.w + '" height="' + s.h + '"' +
          ' alt="' + esc(s.alt) + '"' +
          (i === 0 ? ' fetchpriority="high" decoding="async"' : ' loading="lazy" decoding="async"') + '>' +
          "</div></div>";
      }).join("");

      $("#carDots").innerHTML = slides.map(function (s, i) {
        return '<button type="button" role="tab" class="' + (i === 0 ? "active" : "") +
          '" aria-label="Ver imagen ' + (i + 1) + '" aria-selected="' + (i === 0) + '" data-i="' + i + '">' +
          '<img src="' + esc(s.srcSmall || s.src) + '" width="96" height="112" alt="" loading="eager" decoding="async">' +
          '</button>';
      }).join("");

      this.slides = $$(".slide", this.track);

      $("#carPrev").addEventListener("click", function () { self.stop(); self.go(self.index - 1); });
      $("#carNext").addEventListener("click", function () { self.stop(); self.go(self.index + 1); });
      $$("#carDots button").forEach(function (b) {
        b.addEventListener("click", function () { self.stop(); self.go(+b.dataset.i); });
      });

      // Sincroniza el índice al deslizar con el dedo
      var raf;
      this.track.addEventListener("scroll", function () {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          var w = self.track.clientWidth;
          if (!w) return;
          var i = Math.round(self.track.scrollLeft / w);
          if (i !== self.index) { self.index = i; self.paint(); }
        });
      }, { passive: true });

      // Cualquier interacción detiene el avance automático
      ["pointerdown", "touchstart", "wheel", "keydown"].forEach(function (ev) {
        self.track.addEventListener(ev, function () { self.stop(); }, { passive: true });
      });

      // Navegación con teclado
      this.track.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight") { e.preventDefault(); self.stop(); self.go(self.index + 1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); self.stop(); self.go(self.index - 1); }
      });

      // Pausa mientras el carrusel no está visible o la pestaña está oculta
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) self.pause(); else self.play();
      });

      // Sin esto la leyenda arranca vacía: paint() solo corría al deslizar.
      this.paint();
      this.play();
    },

    go: function (i) {
      var n = this.slides.length;
      this.index = (i % n + n) % n;
      this.track.scrollTo({ left: this.track.clientWidth * this.index, behavior: "smooth" });
      this.paint();
    },

    paint: function () {
      $$("#carDots button").forEach(function (b, i) {
        var on = i === carousel.index;
        b.classList.toggle("active", on);
        b.setAttribute("aria-selected", String(on));
      });
      var cap = $("#carCaption");
      var slide = window.HERO_SLIDES[carousel.index];
      if (slide) {
        carousel.track.style.setProperty("--mobile-slide-ratio", slide.w + " / " + slide.h);
        if (cap) cap.textContent = slide.caption;
      }
    },

    play: function () {
      if (this.userInteracted || this.timer) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      var self = this;
      this.timer = setInterval(function () { self.go(self.index + 1); }, 5200);
    },

    pause: function () { clearInterval(this.timer); this.timer = null; },

    stop: function () { this.userInteracted = true; this.pause(); },
  };

  /* ---------------- 8. Combos ---------------- */
  function renderCombos() {
    var base = COMBOS[0].price;

    $("#comboGrid").innerHTML = COMBOS.map(function (c) {
      var save = base * c.qty - c.price;
      var im = comboImage(c);
      return '<button type="button" role="radio" aria-checked="false" class="combo-card' +
        (c.featured ? " best" : "") + '" data-combo="' + c.id + '">' +
        (c.badge ? '<span class="cc-badge">' + esc(c.badge) + "</span>" : "") +
        '<div class="cc-top">' +
        '<div class="cc-img"><img src="' + im + '" width="640" height="640" loading="lazy" decoding="async" alt="' + esc(c.label + " de " + CFG.shortName) + '"></div>' +
        "<div><div class='cc-title'>" + esc(c.label) + "</div><div class='cc-sub'>" + esc(c.sublabel) + "</div></div>" +
        "</div>" +
        '<div class="cc-price">' + fmt(c.price) + "</div>" +
        '<div class="cc-unit">' + fmt(c.price / c.qty) + " por " + (CFG.unitWord || "unidad") + "</div>" +
        (save > 0
          ? '<span class="cc-save">Ahorrás ' + fmt(save) + "</span>"
          : '<span class="cc-save muted">Precio individual</span>') +
        '<span class="cc-check"><i></i>Seleccionar</span>' +
        "</button>";
    }).join("");

    $$("#comboGrid .combo-card").forEach(function (card) {
      card.addEventListener("click", function () { selectCombo(card.dataset.combo, "combo_grid"); });
    });
  }

  /** Imagen que representa a cada combo (checkout, resumen y confirmación).
      Se puede fijar con `imagen` en cada combo de config.js; si no, se usa
      una de la galería según la cantidad. */
  function comboImage(combo) {
    if (combo.imagen) return combo.imagen;
    var g = window.GALLERY || [];
    var i = Math.min(combo.qty - 1, g.length - 1);
    var pick = g[i] || g[0];
    return pick ? (pick.srcSmall || pick.src) : "img/hero-real-1-640.webp";
  }

  function renderMiniCombos() {
    var base = COMBOS[0].price;
    $("#miniCombos").innerHTML = COMBOS.map(function (c) {
      var save = base * c.qty - c.price;
      return '<button type="button" class="mini-combo" data-combo="' + c.id + '" role="radio" aria-checked="false">' +
        (c.badge ? '<span class="mc-tag">' + esc(c.badge) + "</span>" : "") +
        "<i></i>" +
        '<span class="mc-img"><img src="' + comboImage(c) + '" width="640" height="640" loading="lazy" decoding="async" alt="' + esc(c.label + " de " + CFG.shortName) + '"></span>' +
        "<span class='mc-body'><b>" + esc(c.label) + "</b><small>" + esc(c.sublabel) + "</small></span>" +
        '<span class="mc-right"><span class="mc-price">' + fmt(c.price) + "</span>" +
        (save > 0 ? '<span class="mc-save">Ahorrás ' + fmt(save) + "</span>" : "") +
        "</span></button>";
    }).join("");
    $$("#miniCombos .mini-combo").forEach(function (b) {
      b.addEventListener("click", function () { selectCombo(b.dataset.combo, "checkout"); });
    });
  }

  function selectCombo(id, source) {
    var c = COMBOS.filter(function (x) { return x.id === id; })[0];
    if (!c || c.id === state.combo.id) { paintCombo(); return; }
    state.combo = c;
    paintCombo();
    track("select_item", "CustomizeProduct", {
      value: c.price, currency: CFG.currency, items: itemPayload(c),
      combo: c.label, num_items: c.qty, source: source || "",
    });
    // AddToCart es un evento estándar que Meta usa para optimizar campañas.
    track("add_to_cart", "AddToCart", {
      value: c.price, currency: CFG.currency, items: itemPayload(c),
      combo: c.label, num_items: c.qty,
    });
  }

  function paintCombo() {
    var c = state.combo;
    var t = totals();
    var base = COMBOS[0].price;
    var save = base * c.qty - c.price;

    $$("#comboGrid .combo-card").forEach(function (card) {
      var on = card.dataset.combo === c.id;
      card.classList.toggle("selected", on);
      card.setAttribute("aria-checked", String(on));
      $(".cc-check", card).lastChild.textContent = on ? "Seleccionado" : "Seleccionar";
    });
    $$("#miniCombos .mini-combo").forEach(function (b) {
      var on = b.dataset.combo === c.id;
      b.classList.toggle("selected", on);
      b.setAttribute("aria-checked", String(on));
    });

    // Precio del hero
    $("#priceKicker").textContent = c.featured ? "COMBO RECOMENDADO" : "TU SELECCIÓN";
    $("#priceLabel").textContent = c.label;
    $("#priceValue").textContent = fmt(c.price);
    $("#priceUnit").textContent = fmt(c.price / c.qty) + " por " + (CFG.unitWord || "unidad");
    $("#priceSaving").textContent = save > 0
      ? "Ahorrás " + fmt(save) + " frente a comprar por separado"
      : "Precio individual · producto original sellado";

    // CTA de combos
    $("#comboCtaLabel").textContent = c.label;
    $("#comboCtaPrice").textContent = fmt(c.price);

    // Barra móvil
    $("#mbLabel").textContent = c.badge ? c.label + " · " + c.badge : c.label;
    $("#mbPrice").textContent = fmt(c.price);

    // Resumen del checkout
    $("#sumProductLabel").textContent = CFG.shortName + " · " + c.label;
    $("#sumProductMeta").textContent =
      (CFG.unitDescription ? c.qty + " × " + CFG.unitDescription + " · " : "") +
      fmt(c.price / c.qty) + " c/u";
    $("#sumImage").src = comboImage(c);
    $("#sumProduct").textContent = fmt(t.product);
    var ship = $("#sumShipping");
    if (t.shipping > 0) { ship.textContent = fmt(t.shipping); ship.classList.remove("free"); }
    else { ship.textContent = "GRATIS"; ship.classList.add("free"); }
    $("#sumTotal").textContent = fmt(t.total);
    $("#submitPrice").textContent = fmt(t.total);

    refreshWaLinks();
  }

  /* ---------------- 12. Galería ---------------- */
  function renderGallery() {
    var fotos = window.GALLERY || [];
    // Si no queda ninguna foto, la sección entera desaparece.
    toggleSection("#galeria", fotos.length > 0);
    $("#gallery").innerHTML = fotos.map(function (g) {
      return "<figure>" +
        '<div class="g-media"><img src="' + esc(g.src) + '" srcset="' + esc(g.srcSmall) + " 640w, " + esc(g.src) + ' 1024w"' +
        ' sizes="(max-width: 600px) 100vw, 560px" width="' + g.w + '" height="' + g.h + '"' +
        ' loading="lazy" decoding="async" alt="' + esc(g.alt) + '"></div>' +
        "<figcaption>" + esc(g.cap) + "</figcaption></figure>";
    }).join("");
  }

  /* ---------------- Formulario: departamento / ciudad ---------------- */
  function fillDepartments() {
    var sel = $("#f-departamento");
    sel.innerHTML = '<option value="">Seleccioná…</option>' +
      DEPARTMENTS.map(function (d) { return "<option>" + esc(d) + "</option>"; }).join("");
  }

  function fillCities(dep) {
    var sel = $("#f-ciudad");
    var list = CITIES[dep] || [];
    if (!dep) {
      sel.innerHTML = '<option value="">Elegí primero el departamento</option>';
      sel.disabled = true;
      return;
    }
    sel.disabled = false;
    sel.innerHTML = '<option value="">Seleccioná tu ciudad…</option>' +
      list.map(function (c) { return "<option>" + esc(c) + "</option>"; }).join("") +
      '<option value="__otra">Otra ciudad…</option>';
  }

  function renderCarriers() {
    $("#carrierOptions").innerHTML = CARRIERS.map(function (c) {
      return '<button type="button" role="radio" aria-checked="false" class="carrier-opt" data-carrier="' + esc(c.id) + '">' +
        "<i></i><span><b>" + esc(c.name) + "</b><small>" + esc(c.note) + "</small></span></button>";
    }).join("");
    $$("#carrierOptions .carrier-opt").forEach(function (b) {
      b.addEventListener("click", function () {
        state.carrier = b.dataset.carrier;
        $$("#carrierOptions .carrier-opt").forEach(function (x) {
          var on = x === b;
          x.classList.toggle("selected", on);
          x.setAttribute("aria-checked", String(on));
        });
        clearError("transportadora");
        paintDelivery();
      });
    });
  }

  /* Bloque de entrega + resumen dependiente de la ciudad */
  function paintDelivery() {
    var fs = $("#deliveryFs");
    var box = $("#deliveryBox");
    var carrierBlock = $("#carrierBlock");

    if (!state.city) {
      fs.hidden = true;
      $("#sumCity").textContent = "—";
      $("#sumDelivery").textContent = "—";
      $("#sumPayment").textContent = "—";
      $("#sumEta").textContent = "—";
      $("#sumCarrierRow").hidden = true;
      paintCombo();
      return;
    }

    var d = deliveryInfo();
    fs.hidden = false;

    if (!d.carrierNeeded) {
      box.innerHTML =
        '<div class="delivery-note local"><span class="dn-icon" aria-hidden="true">🚚</span><div>' +
        "<b>Delivery a domicilio · Pagás al recibir</b>" +
        "<p>Entrega estimada de " + esc(d.eta) + " en " + esc(state.city) + ". " +
        (CFG.freeShipping ? "El envío no tiene costo." : "Costo de envío: " + fmt(d.cost) + ".") +
        "</p></div></div>";
      carrierBlock.hidden = true;
      state.carrier = "";
      state.prepayAccepted = false;
      $("#f-prepay").checked = false;
      $$("#carrierOptions .carrier-opt").forEach(function (x) {
        x.classList.remove("selected"); x.setAttribute("aria-checked", "false");
      });
    } else {
      box.innerHTML =
        '<div class="delivery-note carrier"><span class="dn-icon" aria-hidden="true">📦</span><div>' +
        "<b>Tu pedido será enviado por transportadora.</b>" +
        "<p>Para despachar el producto es obligatorio realizar el pago anticipado. " +
        "Plazo estimado: " + esc(d.eta) + ". " +
        (CFG.freeShipping ? "El envío no tiene costo." : "Costo de envío: " + fmt(d.cost) + ".") +
        "</p></div></div>";
      carrierBlock.hidden = false;
    }

    $("#sumCity").textContent = state.city + (state.department ? " (" + state.department + ")" : "");
    $("#sumDelivery").textContent = d.type;
    $("#sumPayment").textContent = d.payment;
    $("#sumEta").textContent = d.eta;
    $("#sumCarrierRow").hidden = !d.carrierNeeded;
    $("#sumCarrier").textContent = state.carrier || "Elegí una";

    paintCombo();
  }

  /* ---------------- Validación ---------------- */
  var MSG = {
    nombre: "Escribí tu nombre y apellido (mínimo 5 caracteres).",
    telefono: "Ingresá un número de WhatsApp paraguayo válido. Ej.: 0981 123 456",
    departamento: "Elegí tu departamento.",
    ciudad: "Elegí tu ciudad.",
    ciudadOtra: "Escribí el nombre de tu ciudad.",
    direccion: "Escribí la dirección y una referencia de entrega (mínimo 10 caracteres).",
    transportadora: "Elegí la transportadora (TSI o Multienvíos).",
    prepay: "Necesitamos que aceptes la condición de pago anticipado.",
  };

  function setError(name, msg) {
    var w = $('.field[data-field="' + name + '"]');
    if (!w) return;
    w.classList.add("err");
    w.classList.remove("ok");
    var e = $("#err-" + name);
    if (e) e.textContent = msg || MSG[name] || "Revisá este dato.";
    var input = w.querySelector("input,select,textarea");
    if (input) input.setAttribute("aria-invalid", "true");
  }
  function clearError(name) {
    var w = $('.field[data-field="' + name + '"]');
    if (!w) return;
    w.classList.remove("err");
    var input = w.querySelector("input,select,textarea");
    if (input) input.removeAttribute("aria-invalid");
  }
  function markOk(name) {
    var w = $('.field[data-field="' + name + '"]');
    if (w) { w.classList.remove("err"); w.classList.add("ok"); }
  }

  /** Normaliza un número paraguayo a formato local 09XXXXXXXX. */
  function normalizePhone(raw) {
    var d = String(raw || "").replace(/\D/g, "");
    if (d.indexOf("595") === 0) d = "0" + d.slice(3);
    else if (d.length === 9 && d.charAt(0) === "9") d = "0" + d;
    return d;
  }
  function validPhone(raw) {
    return /^09[0-9]{8}$/.test(normalizePhone(raw));
  }

  function validateField(name, silent) {
    var w = $('.field[data-field="' + name + '"]');
    if (!w || w.hidden) return true;
    var input = w.querySelector("input,select,textarea");
    var v = input ? String(input.value || "").trim() : "";
    var ok = true;

    switch (name) {
      case "nombre": ok = v.replace(/\s+/g, " ").length >= 5 && /[a-zA-ZáéíóúÁÉÍÓÚñÑ]{2,}/.test(v); break;
      case "telefono": ok = validPhone(v); break;
      case "departamento": ok = !!v; break;
      case "ciudad": ok = !!v; break;
      case "ciudadOtra": ok = v.length >= 3; break;
      case "direccion": ok = v.length >= 10; break;
      case "transportadora": ok = !!state.carrier; break;
      case "prepay": ok = $("#f-prepay").checked; break;
      default: ok = true;
    }

    if (ok) { if (v || name === "transportadora" || name === "prepay") markOk(name); else clearError(name); }
    else if (!silent) setError(name);
    return ok;
  }

  function requiredFields() {
    var list = ["nombre", "telefono", "departamento", "ciudad", "direccion"];
    if (!$('.field[data-field="ciudadOtra"]').hidden) list.splice(4, 0, "ciudadOtra");
    if (deliveryInfo().carrierNeeded && state.city) { list.push("transportadora", "prepay"); }
    return list;
  }

  function validateAll() {
    var first = null;
    requiredFields().forEach(function (f) {
      if (!validateField(f) && !first) first = f;
    });
    if (first) {
      var w = $('.field[data-field="' + first + '"]');
      w.scrollIntoView({ behavior: "smooth", block: "center" });
      var input = w.querySelector("input,select,textarea");
      setTimeout(function () { if (input) input.focus({ preventScroll: true }); }, 320);
    }
    return !first;
  }

  /* ---------------- Checkout ---------------- */
  var lastFocused = null;
  var checkoutStep = 1;

  function showCheckoutStep(step) {
    checkoutStep = step;
    $$('[data-checkout-step]').forEach(function (panel) {
      panel.hidden = Number(panel.dataset.checkoutStep) !== step;
    });
    $$('[data-progress-step]').forEach(function (item) {
      var itemStep = Number(item.dataset.progressStep);
      item.classList.toggle("active", itemStep === step);
      item.classList.toggle("done", itemStep < step);
    });
    $("#checkoutTitle").textContent = "Datos de entrega";
    $(".modal-sub", $("#checkoutForm")).textContent = "Completá tus datos y confirmá el pedido en un solo paso.";
    $(".modal-card", $("#checkout")).scrollTo({ top: 0, behavior: "smooth" });
  }

  function openCheckout(source) {
    var m = $("#checkout");
    if (state.checkoutOpen) return;
    lastFocused = document.activeElement;
    m.hidden = false;
    document.body.classList.add("no-scroll");
    state.checkoutOpen = true;
    $("#checkoutForm").hidden = false;
    $("#checkoutSuccess").hidden = true;
    showCheckoutStep(1);
    paintCommercialDates();
    paintCombo();
    paintDelivery();
    openMapPicker();
    setTimeout(function () { $("#f-nombre").focus({ preventScroll: true }); }, 120);

    track("begin_checkout", "InitiateCheckout", {
      value: totals().total, currency: CFG.currency,
      items: itemPayload(state.combo), source: source || "",
    });
  }

  function closeCheckout() {
    $("#checkout").hidden = true;
    document.body.classList.remove("no-scroll");
    state.checkoutOpen = false;
    if (lastFocused && lastFocused.focus) lastFocused.focus({ preventScroll: true });
  }

  function orderNumber() {
    return "PY" + String(Date.now()).slice(-6) + Math.floor(10 + Math.random() * 90);
  }

  function deviceType() {
    return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "Mobile" : "Desktop";
  }

  /** Evita que el mismo pedido se registre dos veces (doble toque / reintento). */
  function dedupeKey(order) {
    return [norm(order.nombre), normalizePhone(order.telefono), order.combo, norm(order.ciudad), order.subtotal].join("|");
  }
  function isDuplicate(key) {
    try {
      var prev = JSON.parse(localStorage.getItem(STORAGE_KEY + "_last_order") || "null");
      return prev && prev.key === key && Date.now() - prev.at < 10 * 60 * 1000;
    } catch (e) { return false; }
  }
  function rememberOrder(key) {
    try { localStorage.setItem(STORAGE_KEY + "_last_order", JSON.stringify({ key: key, at: Date.now() })); } catch (e) { }
  }

  function buildOrder() {
    var g = function (n) { var el = $('[name="' + n + '"]'); return el ? String(el.value || "").trim() : ""; };
    var d = deliveryInfo();
    var t = totals();
    var c = state.combo;
    var point = mapState.point;
    var location = mapState.location || {};
    var detectedZone = detectarZona(
      point && point.lat, point && point.lng,
      location.city || state.city, location.department || state.department,
    );

    var refParts = [];
    refParts.push("Dirección y referencia: " + g("direccion"));
    if (g("comentario")) refParts.push("Comentario: " + g("comentario"));
    refParts.push("Combo: " + c.label + " · " + fmt(c.price / c.qty) + " c/u");
    if (d.carrierNeeded) {
      refParts.push("TRANSPORTADORA: " + state.carrier);
      refParts.push("PAGO ANTICIPADO antes del despacho");
    } else {
      refParts.push("Delivery a domicilio · PAGO CONTRA ENTREGA");
    }
    refParts.push("Envío: " + (t.shipping === 0 ? "GRATIS" : fmt(t.shipping)));
    refParts.push("Entrega estimada: " + d.eta);

    var obs = [];
    if (TRACKING.utm_content) obs.push("utm_content: " + TRACKING.utm_content);
    if (TRACKING.utm_term) obs.push("utm_term: " + TRACKING.utm_term);
    obs.push("URL: " + window.location.href.slice(0, 300));
    if (document.referrer) obs.push("Referrer: " + document.referrer.slice(0, 200));
    obs.push("Dispositivo: " + deviceType());

    return {
      id: orderNumber(),
      producto: CFG.name + " · " + c.label,
      precio: Math.round(c.price / c.qty),
      cantidad: c.qty,
      subtotal: t.total,                  // el panel muestra `subtotal` como total
      ganancia: 0,
      nombre: g("nombre").replace(/\s+/g, " "),
      telefono: normalizePhone(g("telefono")),
      correo: "No informado",
      ci: "No informado",
      departamento: state.department,
      ciudad: state.city,
      direccion: g("direccion"),
      referencia: refParts.join(" | "),
      ubicacion_maps: g("ubicacion") || "No informado",
      direccion_escrita: g("direccion").slice(0, 500),
      direccion_detectada: String(location.direccionDetectada || "").slice(0, 500),
      latitude: point ? Number(point.lat.toFixed(7)) : null,
      longitude: point ? Number(point.lng.toFixed(7)) : null,
      gps_accuracy: location.accuracy == null ? null : Number(location.accuracy),
      barrio: String(location.barrio || "").slice(0, 180),
      neighborhood: String(location.barrio || "").slice(0, 180),
      ciudad_detectada: String(location.city || "").slice(0, 180),
      departamento_detectado: String(location.department || "").slice(0, 180),
      codigo_postal: String(location.postcode || "").slice(0, 32),
      zona_entrega: detectedZone.code,
      forma_pago_entrega: detectedZone.formaPago,
      ubicacion_origen: location.origin || "",
      maps_url: point ? mapsUrl(point.lat, point.lng) : "",
      estado: "Pendiente",
      origen: CFG.origin,
      created_at: new Date().toISOString(),
      observaciones: obs.join(" | "),
      ip: "No informado",
      user_agent: String(navigator.userAgent).slice(0, 400),
      utm_source: TRACKING.utm_source,
      utm_medium: TRACKING.utm_medium,
      utm_campaign: TRACKING.utm_campaign,
      fbclid: TRACKING.fbclid,
      gclid: TRACKING.gclid,
      landing_url: landingUrl(),
      meta_fbp: cookieValue("_fbp") || null,
      meta_fbc: cookieValue("_fbc") || (TRACKING.fbclid ? "fb.1." + Date.now() + "." + TRACKING.fbclid : null),
      combo: c.label,
      tipo_entrega: d.type,
      transportadora: d.carrierNeeded ? state.carrier : "",
      requiere_pago_anticipado: !!d.carrierNeeded,
      costo_envio: t.shipping,
      total_pagar: t.total,
    };
  }

  function saveOrder(order) {
    if (CFG.useEdgeFunction) {
      return fetch(CFG.edgeFunctionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) throw new Error(j.error || "No se pudo registrar el pedido.");
          return j;
        });
      });
    }
    return fetch(CFG.supabaseUrl + "/rest/v1/" + CFG.supabaseTable, {
      method: "POST",
      headers: {
        apikey: CFG.supabaseAnonKey,
        Authorization: "Bearer " + CFG.supabaseAnonKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(order),
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (txt) { throw new Error(txt || ("HTTP " + r.status)); });
      return {};
    });
  }

  function submitOrder(e) {
    e.preventDefault();
    if (state.submitting) return;

    // Honeypot anti-bot: si está completo, simulamos éxito sin guardar nada.
    if ($("#f-website").value) { closeCheckout(); return; }

    var errBox = $("#formError");
    errBox.hidden = true;

    if (!validateAll()) {
      errBox.hidden = false;
      errBox.textContent = "Revisá los campos marcados en rojo para continuar.";
      return;
    }

    var order = buildOrder();
    var key = dedupeKey(order);
    if (isDuplicate(key)) {
      errBox.hidden = false;
      errBox.textContent = "Ya registramos este pedido hace unos minutos. Si querés hacer otro, escribinos por WhatsApp.";
      return;
    }

    var btn = $("#submitBtn");
    state.submitting = true;
    btn.disabled = true;
    btn.classList.add("loading");
    $(".btn-text", btn).textContent = "Registrando pedido…";

    saveOrder(order).then(function () {
      rememberOrder(key);
      state.lastOrder = order;
      state.submitting = false;
      btn.disabled = false;
      btn.classList.remove("loading");

      // El pedido creado es un Lead. Purchase se envía por CAPI únicamente cuando el panel lo marca como pagado.
      track("generate_lead", "Lead", {
        transaction_id: order.id,
        value: order.total_pagar,
        currency: CFG.currency,
        num_items: order.cantidad,
        items: itemPayload(state.combo),
        combo: order.combo,
        method: "checkout",
        event_id: order.id + ":lead",
      });

      showSuccess(order);
    }).catch(function (err) {
      console.error("[order]", err);
      state.submitting = false;
      btn.disabled = false;
      btn.classList.remove("loading");
      $(".btn-text", btn).innerHTML = 'Confirmar mi pedido · <span id="submitPrice">' + fmt(totals().total) + "</span>";
      errBox.hidden = false;
      errBox.textContent = "No pudimos registrar tu pedido. Revisá tu conexión e intentá de nuevo, o escribinos por WhatsApp.";
      toast("No se pudo enviar el pedido");
    });
  }

  function showSuccess(order) {
    var d = deliveryInfo();
    $("#checkoutForm").hidden = true;
    $("#checkoutSuccess").hidden = false;
    $("#okOrderId").textContent = order.id;
    $("#okImage").src = comboImage(state.combo);
    $("#okProduct").textContent = CFG.shortName + " · " + order.combo;
    $("#okTotal").textContent = fmt(order.total_pagar);
    $("#okCustomer").textContent = order.nombre;
    $("#okCity").textContent = order.ciudad;
    $("#okAddress").textContent = order.direccion;
    $("#okDelivery").textContent = order.tipo_entrega + (order.transportadora ? " (" + order.transportadora + ")" : "");
    $("#okPayment").textContent = order.requiere_pago_anticipado ? "Pago anticipado" : "Pago contra entrega";
    $("#okEta").textContent = d.eta;
    $("#okStep3").lastChild.textContent = order.requiere_pago_anticipado
      ? " Pagás por adelantado y despachamos por " + order.transportadora
      : " Recibís el producto y pagás al recibir";
    $("#okPrepay").hidden = !order.requiere_pago_anticipado;
    $("#okPayAmount").textContent = fmt(order.total_pagar);
    $("#okPrepayIntro").textContent =
      "Como tu pedido va por " + (order.transportadora || "transportadora") +
      ", necesitamos el pago antes de despacharlo. Podés transferir o depositar a esta cuenta:";

    var paymentLabel = order.requiere_pago_anticipado ? "Pago anticipado" : "Pago contra entrega";
    var msg = "Hola, quiero confirmar esta compra:\n\n" +
      "*PEDIDO " + order.id + "*\n" +
      "Cliente: " + order.nombre + "\n" +
      "WhatsApp: " + order.telefono + "\n" +
      "Producto: " + CFG.shortName + "\n" +
      "Combo: " + order.combo + "\n" +
      "Total: " + fmt(order.total_pagar) + "\n" +
      "Envío: " + (order.costo_envio === 0 ? "GRATIS" : fmt(order.costo_envio)) + "\n" +
      "Entrega prevista: " + d.eta + "\n" +
      "Modalidad: " + order.tipo_entrega + (order.transportadora ? " (" + order.transportadora + ")" : "") + "\n" +
      "Pago: " + paymentLabel + "\n" +
      "Dirección: " + order.direccion + "\n" +
      "Barrio: " + order.barrio + "\n" +
      "Ciudad: " + order.ciudad + " (" + order.departamento + ")";
    if (order.ubicacion_maps && order.ubicacion_maps !== "No informado") {
      msg += "\nUbicación: " + order.ubicacion_maps;
    }
    if (order.requiere_pago_anticipado) {
      msg += "\n\nQuiero coordinar el pago anticipado y enviar el comprobante.";
    }
    $("#okWhats").href = "https://wa.me/" + CFG.whatsapp + "?text=" + encodeURIComponent(msg);
    $("#okWhatsappNumber").textContent = "+" + String(CFG.whatsapp).replace(/(\d{3})(\d{3})(\d{3})(\d{3})/, "$1 $2 $3 $4");

    $(".modal-card").scrollTop = 0;
  }

  /* ---------------- Scroll depth 50% / 90% ---------------- */
  function initScrollDepth() {
    var fired = { 50: false, 90: false };
    var ticking = false;
    function check() {
      ticking = false;
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      var pct = (window.scrollY / max) * 100;
      [50, 90].forEach(function (mark) {
        if (!fired[mark] && pct >= mark) {
          fired[mark] = true;
          track("scroll", "", { percent_scrolled: mark, page_location: window.location.href });
        }
      });
      if (fired[50] && fired[90]) window.removeEventListener("scroll", onScroll);
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(check); }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------------- Canonical / OG dinámicos ---------------- */
  function fixUrls() {
    // Permite publicar en cualquier ruta de GitHub Pages sin tocar el HTML.
    var base = window.location.origin + window.location.pathname.replace(/index\.html$/, "");
    var canonical = CFG.siteUrl || base;
    if (CFG.siteUrl && window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1" && window.location.protocol !== "file:") {
      canonical = base;
    }
    var c = $("#canonicalLink"); if (c) c.href = canonical;
    var u = $("#ogUrl"); if (u) u.content = canonical;
    var oi = $("#ogImage"); if (oi) oi.content = canonical + "img/og.jpg";
    var tw = document.querySelector('meta[name="twitter:image"]');
    if (tw) tw.content = canonical + "img/og.jpg";

    // Datos estructurados Product, armados desde config.js
    var ld = $("#ldProduct");
    if (ld) {
      var precios = COMBOS.map(function (c) { return c.price; });
      ld.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: CFG.name,
        sku: CFG.sku,
        brand: { "@type": "Brand", name: CFG.brand },
        category: CFG.category,
        description: (document.querySelector('meta[name="description"]') || {}).content || "",
        url: canonical,
        image: (window.HERO_SLIDES || []).map(function (s) { return canonical + s.src; }),
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: CFG.currency,
          lowPrice: Math.min.apply(null, precios),
          highPrice: Math.max.apply(null, precios),
          offerCount: COMBOS.length,
          availability: "https://schema.org/InStock",
          areaServed: "PY",
          url: canonical,
        },
      });
    }
  }

  /* ---------------- Motor de contenido (contenido.js) ---------------- */

  /** Lee "hero.titulo" dentro de CONTENIDO. Devuelve "" si no existe. */
  function txt(path) {
    var v = path.split(".").reduce(function (o, k) {
      return o && o[k] !== undefined ? o[k] : undefined;
    }, TXT);
    return v === undefined || v === null ? "" : v;
  }

  /** Oculta la sección entera si su bloque de contenido es null. */
  function toggleSection(id, on) {
    var el = $(id);
    if (el) el.hidden = !on;
  }

  function renderContenido() {
    // Textos sueltos marcados con data-txt="ruta.del.texto"
    $$("[data-txt]").forEach(function (el) {
      var v = txt(el.dataset.txt);
      if (/<[a-z][\s\S]*>/i.test(v)) el.innerHTML = v;
      else el.textContent = v;
    });

    // Menú
    var nav = $("#siteNav");
    if (nav) {
      nav.innerHTML = (txt("menu") || []).map(function (m) {
        return '<a href="' + esc(m.ancla) + '">' + esc(m.texto) + "</a>";
      }).join("");
    }

    // Beneficios del encabezado
    var hb = $("#heroBenefits");
    if (hb) {
      hb.innerHTML = (txt("hero.beneficios") || []).map(function (b) {
        return "<li><span aria-hidden=\"true\">" + esc(b.icono || "✓") + "</span> " + esc(b.texto) + "</li>";
      }).join("");
    }

    // Tira de confianza
    var ts = $("#trustStrip");
    if (ts) {
      ts.innerHTML = (txt("confianza") || []).map(function (c) {
        return "<div><span aria-hidden=\"true\">" + esc(c.icono) + "</span><b>" +
          esc(c.titulo) + "</b><small>" + esc(c.detalle) + "</small></div>";
      }).join("");
    }

    // Sección explicativa
    var sl = $("#storyList");
    if (sl) {
      sl.innerHTML = (txt("explicacion.puntos") || []).map(function (p) {
        return "<li>" + p + "</li>";
      }).join("");
    }
    var sn = $("#storyNote");
    if (sn) { sn.innerHTML = txt("explicacion.aclaracion"); sn.hidden = !txt("explicacion.aclaracion"); }
    // Bloque de venta visual (se desactiva poniendo ventaVisual: null)
    var sList = $("#salesList");
    if (sList) {
      var piezas = (TXT.ventaVisual ? window.SALES_STACK : null) || [];
      sList.innerHTML = piezas.map(function (p) {
        var img = '<picture>' +
          '<source media="(max-width: 700px)" srcset="' + esc(p.srcSmall || p.src) + '">' +
          '<img src="' + esc(p.src) + '" width="' + (p.w || 1024) + '" height="' + (p.h || 1024) +
          '" loading="lazy" decoding="async" alt="' + esc(p.alt || "") + '">' +
          "</picture>";
        // Con checkout: true la pieza entera funciona como botón de compra.
        return p.checkout === false
          ? '<div class="sales-item">' + img + "</div>"
          : '<button type="button" class="sales-item is-clickable" data-checkout="venta_visual" aria-label="' +
            esc(p.alt || "Comprar " + CFG.shortName) + '">' + img + "</button>";
      }).join("");
      toggleSection("#ventaVisual", piezas.length > 0);
    }

    // Características
    var sg = $("#specGrid");
    if (sg) {
      var specs = txt("caracteristicas.items") || [];
      sg.innerHTML = specs.map(function (s) {
        return "<div class=\"spec\"><span aria-hidden=\"true\">" + esc(s.icono) + "</span><b>" +
          esc(s.titulo) + "</b><small>" + esc(s.detalle) + "</small></div>";
      }).join("");
      toggleSection("#specsSection", specs.length > 0);
    }

    // Modo de uso (se puede desactivar poniendo modoUso: null)
    var usa = !!TXT.modoUso;
    toggleSection("#howtoSection", usa);
    if (usa) {
      $("#howtoSteps").innerHTML = (txt("modoUso.pasos") || []).map(function (p, i) {
        return "<li><span class=\"step-n\">" + (i + 1) + "</span><div><b>" + esc(p.titulo) +
          "</b><p>" + esc(p.detalle) + "</p></div></li>";
      }).join("");
      var hn = $("#howtoNote");
      hn.innerHTML = txt("modoUso.aclaracion");
      hn.hidden = !txt("modoUso.aclaracion");
    }

    // Entrega y pago
    var dg = $("#deliveryGrid");
    if (dg) {
      dg.innerHTML = (txt("entrega.tarjetas") || []).map(function (t) {
        return '<article class="delivery-card"><span class="dc-icon" aria-hidden="true">' +
          esc(t.icono) + "</span><h3>" + esc(t.titulo) + "</h3><p>" + t.texto +
          "</p><small>" + esc(t.nota) + "</small></article>";
      }).join("");
    }

    // Preguntas frecuentes
    var fl = $("#faqList");
    if (fl) {
      fl.innerHTML = (txt("faq.items") || []).map(function (f) {
        return "<details><summary>" + esc(f.p) + "</summary><div><p>" + f.r + "</p></div></details>";
      }).join("");
    }

    // Aviso legal (se puede desactivar poniendo avisoLegal: null)
    var legal = txt("avisoLegal");
    toggleSection("#legalSection", !!legal);
    if (legal) $("#legalText").innerHTML = legal;

    // Modal de procedencia y respaldo
    var tp = $("#trustPoints");
    if (tp) {
      tp.innerHTML = (txt("respaldo.puntos") || []).map(function (p) {
        return "<li><span aria-hidden=\"true\">" + esc(p.icono) + "</span><p>" + p.texto + "</p></li>";
      }).join("");
    }
    var tl = $("#trustLegal");
    if (tl) {
      tl.innerHTML = (txt("respaldo.legal") || []).map(function (p) { return "<p>" + p + "</p>"; }).join("");
    }

    // Textos que dependen de los precios
    var minimo = Math.min.apply(null, COMBOS.map(function (c) { return c.price; }));
    var fp = $("#finalPrice");
    if (fp) fp.innerHTML = "Desde <b>" + fmt(minimo) + "</b> · Envío sin costo a todo el país";
    var pref = $("#comboCtaPrefix");
    if (pref) pref.textContent = txt("combos.botonPrefijo") || "Comprar";

    // WhatsApp del pie con el número de config.js
    var wf = $("#waFooter");
    if (wf) wf.textContent = "+" + String(CFG.whatsapp).replace(/(\d{3})(\d{3})(\d{3})(\d{3})/, "$1 $2 $3 $4");

    // Etiqueta noscript de GTM
    var ns = $("#gtmNoscript");
    if (ns && CFG.gtmId) {
      ns.innerHTML = '<iframe src="https://www.googletagmanager.com/ns.html?id=' + esc(CFG.gtmId) +
        '" height="0" width="0" style="display:none;visibility:hidden" title="Google Tag Manager"></iframe>';
    }

    // Color de marca desde config.js
    if (CFG.theme) {
      var root = document.documentElement;
      Object.keys(CFG.theme).forEach(function (k) {
        root.style.setProperty("--" + k, CFG.theme[k]);
      });
    }
  }

  /* ---------------- Inicio ---------------- */
  function init() {
    renderContenido();
    fixUrls();
    $("#year").textContent = new Date().getFullYear();

    renderAnnounce();
    carousel.init();
    renderCombos();
    renderMiniCombos();
    renderGallery();
    fillDepartments();
    renderCarriers();
    renderPaymentInfo();
    paintCommercialDates();
    paintCombo();

    // Aperturas del checkout
    $$("[data-checkout]").forEach(function (b) {
      b.addEventListener("click", function () { openCheckout(b.dataset.checkout); });
    });
    $$("[data-close-checkout]").forEach(function (b) {
      b.addEventListener("click", closeCheckout);
    });

    // Modal de procedencia y respaldo
    $("#openTrust").addEventListener("click", openTrust);
    $$("[data-close-trust]").forEach(function (b) {
      b.addEventListener("click", closeTrust);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (!$("#trustModal").hidden) closeTrust();
      else if (state.checkoutOpen) closeCheckout();
    });

    initInlineLocationPicker();

    // Departamento / ciudad
    $("#f-departamento").addEventListener("change", function () {
      state.department = this.value;
      state.city = "";
      state.carrier = "";
      fillCities(this.value);
      $('.field[data-field="ciudadOtra"]').hidden = true;
      $("#f-ciudad-otra").value = "";
      clearError("departamento");
      validateField("departamento");
      paintDelivery();
    });

    $("#f-ciudad").addEventListener("change", function () {
      var otra = $('.field[data-field="ciudadOtra"]');
      if (this.value === "__otra") {
        otra.hidden = false;
        state.city = $("#f-ciudad-otra").value.trim();
        setTimeout(function () { $("#f-ciudad-otra").focus({ preventScroll: true }); }, 60);
      } else {
        otra.hidden = true;
        $("#f-ciudad-otra").value = "";
        state.city = this.value;
      }
      state.carrier = "";
      clearError("ciudad");
      if (this.value) markOk("ciudad");
      paintDelivery();
    });

    $("#f-ciudad-otra").addEventListener("input", function () {
      state.city = this.value.trim();
      if (this.value.trim().length >= 3) { clearError("ciudadOtra"); markOk("ciudadOtra"); }
      paintDelivery();
    });

    $("#f-prepay").addEventListener("change", function () {
      state.prepayAccepted = this.checked;
      if (this.checked) clearError("prepay");
    });

    // Validación en vivo
    ["nombre", "telefono", "direccion"].forEach(function (n) {
      var w = $('.field[data-field="' + n + '"]');
      var input = w.querySelector("input,textarea");
      input.addEventListener("blur", function () { if (input.value.trim()) validateField(n); });
      input.addEventListener("input", function () {
        if (w.classList.contains("err")) validateField(n, true) && clearError(n);
      });
    });

    $("#orderForm").addEventListener("submit", submitOrder);

    // WhatsApp: evento Lead
    $$("#waHero, #waFloat, #waFinal, #waFooter, #okWhats").forEach(function (a) {
      a.addEventListener("click", function () {
        track("generate_lead", "Lead", {
          value: totals().total, currency: CFG.currency,
          items: itemPayload(state.combo), method: "whatsapp",
        });
      });
    });

    refreshWaLinks();
    initScrollDepth();

    // ViewContent / view_item al cargar
    track("view_item", "ViewContent", {
      value: state.combo.price, currency: CFG.currency, items: itemPayload(state.combo),
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
