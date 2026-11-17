/*! Simvix - Google Analytics 4 con consentimiento previo.
 * Sin ID de medicion valido o sin "Aceptar" no se carga nada de Google ni se escribe ninguna cookie.
 * Uso: <script src="/simvix-analitica.js" data-ga-id="G-XXXX" data-privacidad="/privacidad" defer></script>
 * Reabrir la eleccion: window.simvixAnalitica.reabrir() o un elemento con [data-analitica-ajustes]. */
(function () {
  "use strict";
  var s = document.currentScript || document.querySelector("script[data-ga-id]");
  if (!s) return;
  var id = (s.getAttribute("data-ga-id") || "").trim().toUpperCase();
  if (!/^G-[A-Z0-9]{4,20}$/.test(id)) return;
  var CLAVE = "simvix-analitica";
  var privacidad = s.getAttribute("data-privacidad") || "";
  var texto =
    s.getAttribute("data-texto") ||
    "Usamos Google Analytics para saber como se usa esta web y mejorarla. Solo se activa si lo aceptas.";
  function leer() {
    try { return window.localStorage.getItem(CLAVE); } catch (e) { return null; }
  }
  function guardar(v) {
    try { window.localStorage.setItem(CLAVE, v); } catch (e) { /* sin almacenamiento */ }
  }
  function cargar() {
    if (window.__simvixGaCargado) return;
    window.__simvixGaCargado = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
    window.gtag("js", new Date());
    window.gtag("config", id, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    var g = document.createElement("script");
    g.async = true;
    g.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
    document.head.appendChild(g);
  }
  function borrarCookies() {
    var partes = window.location.hostname.split(".");
    document.cookie.split(";").forEach(function (c) {
      var n = c.split("=")[0].trim();
      if (!/^_ga/.test(n)) return;
      document.cookie = n + "=; Max-Age=0; path=/";
      for (var i = 0; i < partes.length - 1; i++)
        document.cookie = n + "=; Max-Age=0; path=/; domain=." + partes.slice(i).join(".");
    });
  }
  var caja = null;
  function cerrar() {
    if (caja && caja.parentNode) caja.parentNode.removeChild(caja);
    caja = null;
  }
  function elegir(v) {
    var estaba = window.__simvixGaCargado;
    guardar(v);
    cerrar();
    if (v === "si") cargar();
    else if (estaba) { borrarCookies(); window.location.reload(); }
  }
  function boton(etiqueta, v) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = etiqueta;
    b.setAttribute("data-analitica", v);
    var st = b.style;
    st.font = "inherit"; st.fontWeight = "600"; st.minHeight = "44px"; st.padding = "0 18px";
    st.borderRadius = "8px"; st.border = "1px solid #ffffff"; st.cursor = "pointer";
    st.background = "#ffffff"; st.color = "#0b1220"; st.flex = "1 1 0";
    b.addEventListener("click", function () { elegir(v); });
    return b;
  }
  function banner() {
    if (caja || !document.body) return;
    caja = document.createElement("div");
    caja.setAttribute("role", "dialog");
    caja.setAttribute("aria-live", "polite");
    caja.setAttribute("aria-label", "Preferencias de analitica");
    caja.setAttribute("data-simvix-analitica", "");
    var st = caja.style;
    st.position = "fixed"; st.left = "12px"; st.right = "12px"; st.bottom = "12px";
    st.zIndex = "2147483000"; st.maxWidth = "560px"; st.margin = "0 auto";
    st.background = "#0b1220"; st.color = "#ffffff"; st.padding = "14px 16px";
    st.borderRadius = "12px"; st.boxShadow = "0 6px 24px rgba(0,0,0,.25)";
    st.font = "14px/1.45 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
    var p = document.createElement("p");
    p.style.margin = "0 0 10px";
    p.textContent = texto + " ";
    if (privacidad) {
      var a = document.createElement("a");
      a.href = privacidad;
      a.textContent = "Mas informacion";
      a.style.color = "#ffffff";
      a.style.textDecoration = "underline";
      p.appendChild(a);
    }
    var fila = document.createElement("div");
    fila.style.display = "flex"; fila.style.gap = "8px"; fila.style.flexWrap = "wrap";
    fila.appendChild(boton("Rechazar", "no"));
    fila.appendChild(boton("Aceptar", "si"));
    caja.appendChild(p);
    caja.appendChild(fila);
    document.body.appendChild(caja);
  }
  function iniciar() {
    var v = leer();
    if (v === "si") cargar();
    else if (v !== "no") banner();
  }
  window.simvixAnalitica = {
    id: id,
    reabrir: function () { guardar(""); cerrar(); banner(); }
  };
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (t && t.closest && t.closest("[data-analitica-ajustes]")) {
      e.preventDefault();
      window.simvixAnalitica.reabrir();
    }
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
