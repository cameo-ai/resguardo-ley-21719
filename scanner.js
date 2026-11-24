// Se inyecta en la pestaña activa y devuelve datos serializables.
// Todo el análisis ocurre localmente. Solo se descarga la política de privacidad
// si está en el mismo sitio que la página revisada.
async function resguardoScan() {
  const norm = (s) => (s || "").toLowerCase().replace(/\s+/g, " ");
  const snippet = (txt, re, n = 90) => {
    const m = re.exec(txt);
    if (!m) return null;
    const i = Math.max(0, m.index - n), j = Math.min(txt.length, m.index + m[0].length + n);
    return "…" + txt.slice(i, j).trim() + "…";
  };

  const pageText = norm(document.body ? document.body.innerText : "");
  const html = document.documentElement.outerHTML.toLowerCase();
  const anchors = [...document.querySelectorAll("a[href]")].map((a) => ({
    t: norm(a.textContent), h: a.href, hl: a.href.toLowerCase(),
  }));

  const findings = [], ok = [];
  const grave = (o) => findings.push({ sev: "grave", ...o });
  const atencion = (o) => findings.push({ sev: "atencion", ...o });

  // ---- 1. Política de privacidad: localizar y descargar ----
  const cand = anchors.filter((l) => /pol[ií]tica.{0,20}(privacidad|datos)|privacidad|datos personales|privacy/.test(l.t + " " + l.hl));
  const mismoSitio = cand.find((l) => { try { return new URL(l.h).origin === location.origin; } catch { return false; } });
  let link = mismoSitio || cand[0] || null;
  let habitual = false;
  if (!link) {
    // Sin enlace visible: se prueban las direcciones habituales del mismo sitio.
    for (const ruta of ["/politica-de-privacidad/", "/politica-privacidad/", "/privacidad/", "/privacy-policy/"]) {
      try {
        const r = await fetch(location.origin + ruta, { credentials: "omit" });
        if (r.ok && (await r.clone().text()).length > 500) { link = { t: "", h: location.origin + ruta, hl: ruta }; habitual = true; break; }
      } catch { /* siguiente */ }
    }
  }
  const mismoSitioFinal = habitual || mismoSitio;
  let policy = { url: link ? link.h : null, chars: 0, descargada: false, habitual };
  let pol = "";

  if (!link) {
    grave({
      id: "sin-politica", titulo: "No se encontró enlace a la política de privacidad",
      detalle: "En esta página no hay ningún enlace visible hacia una política de tratamiento de datos personales.",
      articulo: "Artículo 14 ter · Ley 19.628, modificada por la Ley 21.719",
      consejo: "Publica la política y enlázala de forma visible, por ejemplo en el pie de página.",
      evidencia: [`Enlaces revisados: ${anchors.length}`],
    });
  } else if (mismoSitioFinal) {
    try {
      const r = await fetch(link.h, { credentials: "omit" });
      const doc = new DOMParser().parseFromString(await r.text(), "text/html");
      doc.querySelectorAll("script,style,noscript").forEach((n) => n.remove());
      const contactos = [...doc.querySelectorAll('a[href^="mailto:"],a[href^="tel:"]')].map((a) => a.getAttribute("href")).join(" ");
      pol = norm((doc.body ? doc.body.textContent : "") + " " + contactos);
      policy.chars = pol.length; policy.descargada = pol.length > 200;
    } catch { /* se informa más abajo */ }
  }

  if (habitual) {
    atencion({
      id: "politica-sin-enlace", titulo: "La política existe pero no está enlazada de forma visible",
      detalle: "No hay un enlace a la política en esta página; se encontró en una dirección habitual del sitio.",
      articulo: "Artículo 14 ter · Ley 19.628, modificada por la Ley 21.719",
      consejo: "Enlaza la política en el pie de página y en cada formulario que recoja datos.",
      evidencia: [link.h],
    });
  }

  if (link && !policy.descargada) {
    atencion({
      id: "politica-no-leida", titulo: "No se pudo leer la política de privacidad",
      detalle: link.h && !mismoSitio
        ? "El enlace apunta a otro dominio, por lo que no se descargó. Solo se revisó la página actual."
        : "La descarga falló o el contenido es muy corto (a veces se carga con JavaScript).",
      articulo: "Artículo 14 ter · Ley 19.628, modificada por la Ley 21.719",
      consejo: "Abre la política y vuelve a ejecutar la revisión desde esa página.",
      evidencia: [link.h],
    });
    pol = pageText; // se intenta con lo visible en la página
  }

  // ---- 2. Contenido de la política ----
  if (policy.descargada || (link && pol)) {
    // 2a. Agencia de Protección de Datos
    const agRe = /agencia de protecci[oó]n de datos/;
    if (!agRe.test(pol)) {
      grave({
        id: "agencia", titulo: "La política no menciona a la Agencia de Protección de Datos",
        detalle: "No aparece el derecho de reclamar ante la Agencia. Su ausencia suele indicar que la política no se actualizó a la nueva ley.",
        articulo: "Artículo 14 ter, literal g) · Ley 19.628, modificada por la Ley 21.719",
        consejo: "Agrega una sección que informe el derecho a reclamar ante la Agencia y el canal para ejercer los derechos.",
        evidencia: ["Búsqueda de “Agencia de Protección de Datos”: sin resultados"],
      });
    } else {
      ok.push({ titulo: "Menciona a la Agencia de Protección de Datos", detalle: "Informa el derecho a reclamar ante la Agencia.", articulo: "Artículo 14 ter, literal g)" });
    }

    // 2b. Puntos que debe declarar la política
    const puntos = [
      { k: "a", n: "la fecha y la versión de la política", re: /vigencia|[uú]ltima (actualizaci[oó]n|revisi[oó]n)|actualizad[oa]|versi[oó]n\s*\d|fecha de (entrada|vigencia)|\d{1,2} de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre) de \d{4}/ },
      { k: "c", n: "un canal de contacto para ejercer los derechos", re: /ejercer (sus|tus)? ?derechos|derechos? arco|correo de contacto|formulario de contacto|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/ },
      { k: "e", n: "las medidas de seguridad adoptadas", re: /medidas (t[eé]cnicas|de seguridad|organizativas)|seguridad de (la informaci[oó]n|los datos)|cifrad|encriptad/ },
      { k: "f", n: "el derecho de portabilidad", re: /portabilidad/ },
      { k: "i", n: "por cuánto tiempo se conservan los datos", re: /plazo de conservaci[oó]n|conserv(an|ar|amos|aci[oó]n)|per[ií]odo de (conservaci[oó]n|retenci[oó]n)|tiempo (que sea )?necesario|mientras (dure|sea necesario)|a[nñ]os/ },
      { k: "k", n: "el derecho a retirar el consentimiento", re: /(retirar|revocar|revocaci[oó]n).{0,40}consentimiento|consentimiento.{0,60}(retirar|revocar)/ },
      { k: "l", n: "si hay decisiones automatizadas o perfiles", re: /decisiones? automatizadas?|elaboraci[oó]n de perfiles|perfilamiento|perfilado/ },
    ];
    const si = puntos.filter((p) => p.re.test(pol));
    const no = puntos.filter((p) => !p.re.test(pol));
    if (no.length) {
      grave({
        id: "puntos", titulo: `La política no informa ${no.length} de ${puntos.length} puntos que la ley exige`,
        detalle: "Falta referencia a: " + no.map((p) => p.n).join("; ") + ".",
        articulo: "Artículo 14 ter, literales " + no.map((p) => p.k).join(" ") + " · Ley 19.628, modificada por la Ley 21.719",
        consejo: "Agrega una sección por cada punto faltante:\n" + no.map((p) => `${p.k}) ${p.n[0].toUpperCase() + p.n.slice(1)}.`).join("\n"),
        evidencia: no.map((p) => `Sin referencia a ${p.n}`),
      });
    }
    if (si.length) {
      ok.push({
        titulo: `La política informa ${si.length} de los ${puntos.length} puntos revisados`,
        detalle: si.map((p) => `${p.k}) ${p.n}`).join("; ") + ". Se comprobó que el texto los menciona, no en qué términos lo hace.",
        articulo: "Artículo 14 ter",
      });
    }
  }

  // ---- 3. Rastreadores y cookies ----
  const firmas = {
    "Google Analytics / Tag Manager": /google-analytics\.com|googletagmanager\.com|gtag\(/,
    "Meta Pixel": /connect\.facebook\.net|fbq\(/,
    "TikTok Pixel": /analytics\.tiktok\.com/,
    "Hotjar": /hotjar\.com/,
    "Microsoft Clarity": /clarity\.ms/,
    "LinkedIn Insight": /snap\.licdn\.com/,
  };
  // Solo cuenta lo que realmente se cargó: peticiones de red, <script src> y objetos globales.
  const cargado = [
    ...performance.getEntriesByType("resource").map((e) => e.name),
    ...[...document.querySelectorAll("script[src],iframe[src],img[src]")].map((n) => n.src),
  ].join(" ").toLowerCase();
  const globales = {
    "Google Analytics / Tag Manager": !!(window.ga || window.gtag || window.google_tag_manager),
    "Meta Pixel": !!window.fbq,
    "Hotjar": !!window.hj,
    "Microsoft Clarity": !!window.clarity,
  };
  const urlsCargadas = cargado.split(" ").filter(Boolean);
  const rastreadores = [];
  Object.entries(firmas).forEach(([n, re]) => {
    const u = urlsCargadas.find((x) => re.test(x));
    if (u) rastreadores.push(`${n} — ${u.slice(0, 110)}`);
    else if (globales[n]) rastreadores.push(`${n} — objeto global presente en la página`);
  });
  const banner = !!document.querySelector('[id*="cookie" i],[class*="cookie" i],[id*="consent" i],[class*="consent" i]') ||
    /usamos cookies|utilizamos cookies|aviso de cookies|this site uses cookies/.test(pageText);
  let claves = 0;
  try { claves = document.cookie.split(";").filter(Boolean).length + localStorage.length; } catch {}

  if (rastreadores.length && !banner) {
    grave({
      id: "rastreadores", titulo: "Hay rastreadores de terceros y no se ve aviso de consentimiento",
      detalle: "Se detectaron plataformas de analítica o publicidad sin un aviso de cookies que permita aceptarlas o rechazarlas.",
      articulo: "Artículo 12 · Ley 19.628, modificada por la Ley 21.719",
      consejo: "Carga esas herramientas solo después del consentimiento y ofrece una opción clara de rechazo.",
      evidencia: rastreadores,
    });
  } else if (rastreadores.length) {
    atencion({
      id: "rastreadores-banner", titulo: "Hay rastreadores y un aviso de cookies: verifica el orden de carga",
      detalle: "Las herramientas detectadas deberían cargarse solo después de que la persona acepte. Desde aquí no se puede comprobar ese orden.",
      articulo: "Artículo 12 · Ley 19.628, modificada por la Ley 21.719",
      consejo: "Revisa en la pestaña Red que no haya llamadas a esos servicios antes de aceptar.",
      evidencia: rastreadores,
    });
  } else {
    ok.push({ titulo: "No se detectaron rastreadores de terceros", detalle: `Se revisaron ${claves} claves entre cookies y almacenamiento, y ninguna corresponde a plataformas conocidas.`, articulo: "Artículo 12" });
  }

  // ---- 4. Formularios ----
  const checks = [...document.querySelectorAll('input[type="checkbox"]')];
  const marcadas = checks.filter((c) => c.checked && /acepto|consiento|autorizo|privacidad|newsletter|promoci|ofertas/.test(norm(c.closest("label,div,p")?.textContent || "")));
  if (marcadas.length) {
    grave({
      id: "casilla-marcada", titulo: "Hay casillas de autorización marcadas de antemano",
      detalle: "El consentimiento debe ser una acción afirmativa de la persona, no una opción activada por defecto.",
      articulo: "Artículo 12 · Ley 19.628, modificada por la Ley 21.719",
      consejo: "Desmarca las casillas por defecto y separa cada finalidad.",
      evidencia: marcadas.map((c) => c.name || c.id || "casilla sin nombre"),
    });
  } else {
    ok.push({ titulo: "Ninguna casilla de autorización viene marcada", detalle: `Se revisaron ${checks.length} casilla(s) en esta página y ninguna que implique autorización viene marcada por defecto.`, articulo: "Artículo 12" });
  }

  const campos = [...document.querySelectorAll("input,select,textarea")].filter((c) => !/hidden|submit|button|checkbox|radio/.test(c.type));
  const sensibles = campos.filter((c) => /salud|enfermedad|religi|ideolog|sindical|etnia|raza|orientaci[oó]n|biom[eé]tric|huella/.test(`${c.name} ${c.id} ${c.placeholder}`.toLowerCase()));
  if (sensibles.length) {
    atencion({
      id: "sensibles", titulo: "Se piden datos que podrían ser sensibles",
      detalle: "Algunos campos parecen pedir datos de categorías con protección reforzada.",
      articulo: "Artículo 16 · Ley 19.628, modificada por la Ley 21.719",
      consejo: "Confirma que exista una base de licitud válida y un consentimiento específico.",
      evidencia: sensibles.map((c) => c.name || c.id || c.placeholder),
    });
  } else {
    ok.push({ titulo: "No se piden datos sensibles en esta página", detalle: `Se revisaron ${campos.length} campos de formulario y ninguno pide datos de las categorías que la ley trata como sensibles. Otras páginas del sitio pueden pedirlos.`, articulo: "Artículo 16" });
  }

  // ---- 5. HTTPS ----
  if (location.protocol !== "https:") {
    grave({
      id: "https", titulo: "La página no usa conexión segura (HTTPS)",
      detalle: "Los datos viajan sin cifrar. La seguridad del tratamiento es un deber del responsable.",
      articulo: "Principio de seguridad · Ley 19.628, modificada por la Ley 21.719",
      consejo: "Activa HTTPS en todo el sitio y redirige el tráfico HTTP.",
      evidencia: [location.protocol],
    });
  }

  const graves = findings.filter((f) => f.sev === "grave").length;
  const semaforo = graves ? "rojo" : findings.length ? "amarillo" : "verde";
  return { url: location.href, host: location.hostname + location.pathname, policy, findings, ok, graves, semaforo };
}
