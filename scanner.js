// Se inyecta en la pestaña activa. Debe ser autocontenida y devolver datos serializables.
// Todo el análisis ocurre localmente: no se envía nada a ningún servidor.
function resguardoScan() {
  const text = (document.body ? document.body.innerText : "").toLowerCase();
  const html = document.documentElement.outerHTML.toLowerCase();
  const links = [...document.querySelectorAll("a[href]")];
  const linkInfo = links.map((a) => ({
    t: (a.textContent || "").trim().toLowerCase(),
    h: (a.getAttribute("href") || "").toLowerCase(),
  }));
  const has = (re) => re.test(text);
  const linkHas = (re) => linkInfo.some((l) => re.test(l.t) || re.test(l.h));

  const checks = [];
  const add = (id, titulo, ok, peso, detalle, consejo) =>
    checks.push({ id, titulo, ok, peso, detalle, consejo });

  // 1. Política de privacidad
  const privLink = linkHas(/privacidad|datos personales|privacy|tratamiento de datos/);
  add("politica", "Política de privacidad visible", privLink, 20,
    privLink ? "Se encontró un enlace a la política de privacidad." : "No se encontró enlace a una política de privacidad.",
    "Publica y enlaza en el pie de página una política de privacidad clara y en español.");

  // 2. Derechos del titular (acceso, rectificación, supresión, oposición, portabilidad, bloqueo)
  const derechos = {
    acceso: /\bacceso\b/,
    rectificación: /rectificaci[oó]n|rectificar/,
    supresión: /supresi[oó]n|cancelaci[oó]n|eliminaci[oó]n|derecho al olvido/,
    oposición: /oposici[oó]n|oponerse/,
    portabilidad: /portabilidad/,
    bloqueo: /bloqueo/,
  };
  const encontrados = Object.entries(derechos).filter(([, re]) => re.test(text)).map(([k]) => k);
  const derechosOk = encontrados.length >= 4;
  add("derechos", "Derechos del titular (ARCO+)", derechosOk, 20,
    encontrados.length
      ? `Menciona: ${encontrados.join(", ")} (${encontrados.length}/6).`
      : "No menciona derechos del titular en esta página.",
    "Informa los derechos de acceso, rectificación, supresión, oposición, portabilidad y bloqueo, y cómo ejercerlos.");

  // 3. Contacto del responsable de datos
  const correo = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(text) || linkInfo.some((l) => l.h.startsWith("mailto:"));
  const responsable = has(/responsable (del tratamiento|de datos)|delegado de protecci[oó]n|encargado de (datos|privacidad)/);
  const contactoOk = correo && responsable;
  add("responsable", "Responsable y canal de contacto", contactoOk, 15,
    `Correo de contacto: ${correo ? "sí" : "no"} · Responsable identificado: ${responsable ? "sí" : "no"}.`,
    "Identifica al responsable del tratamiento y entrega un correo para ejercer derechos.");

  // 4. Finalidad y base de licitud
  const finalidad = has(/finalidad|fines? (del|de) tratamiento|utilizamos (sus|tus) datos|base de licitud|consentimiento/);
  add("finalidad", "Finalidad y base de licitud", finalidad, 10,
    finalidad ? "Hay referencias a finalidad o consentimiento." : "No se detecta finalidad del tratamiento.",
    "Explica para qué usas cada dato y en qué base legal (consentimiento, contrato, interés legítimo).");

  // 5. Plazo de conservación
  const plazo = has(/plazo de conservaci[oó]n|conservaremos|conservar[aá]n? (sus|tus)? ?datos|per[ií]odo de retenci[oó]n|tiempo que sea necesario/);
  add("conservacion", "Plazo de conservación", plazo, 5,
    plazo ? "Menciona cuánto tiempo guarda los datos." : "No indica por cuánto tiempo conserva los datos.",
    "Indica el plazo o criterio de conservación de los datos.");

  // 6. Transferencias internacionales
  const transf = has(/transferencia(s)? internacional|terceros pa[ií]ses|fuera de chile|encargados? del tratamiento|compartimos (sus|tus) datos/);
  add("transferencias", "Transferencias y terceros", transf, 5,
    transf ? "Informa sobre terceros o transferencias." : "No informa sobre terceros ni transferencias internacionales.",
    "Declara con quién compartes datos y si salen de Chile.");

  // 7. Formularios que piden datos personales
  const forms = [...document.forms];
  const camposPersonales = [];
  let formsConDatos = 0, formsConConsent = 0;
  forms.forEach((f) => {
    const campos = [...f.querySelectorAll("input,textarea,select")];
    const personales = campos.filter((c) => {
      const s = `${c.type} ${c.name} ${c.id} ${c.placeholder} ${c.autocomplete}`.toLowerCase();
      if (/password|hidden|search|submit/.test(c.type)) return false;
      return /mail|correo|tel|phone|rut|run|nombre|name|direcci|address|fecha|birth|nacim/.test(s) || c.type === "email" || c.type === "tel";
    });
    if (personales.length) {
      formsConDatos++;
      personales.forEach((p) => camposPersonales.push((p.name || p.id || p.type || "campo")));
      const ctx = f.innerText.toLowerCase();
      const checkbox = f.querySelector('input[type="checkbox"]');
      const acepta = /acepto|consiento|autorizo|pol[ií]tica de privacidad|t[eé]rminos/.test(ctx);
      if (checkbox && acepta) formsConConsent++;
    }
  });
  if (formsConDatos) {
    const ok = formsConConsent === formsConDatos;
    add("formularios", "Consentimiento en formularios", ok, 15,
      `${formsConDatos} formulario(s) piden datos personales; ${formsConConsent} tienen casilla de consentimiento.`,
      "Agrega una casilla (sin marcar de antemano) que enlace a la política de privacidad en cada formulario.");
  }

  // 8. Cookies y rastreadores
  const rastreadores = [];
  const firmas = {
    "Google Analytics": /google-analytics\.com|googletagmanager\.com|gtag\(/,
    "Meta Pixel": /connect\.facebook\.net|fbq\(/,
    "TikTok Pixel": /analytics\.tiktok\.com/,
    "Hotjar": /hotjar\.com/,
    "Clarity": /clarity\.ms/,
    "LinkedIn Insight": /snap\.licdn\.com/,
  };
  Object.entries(firmas).forEach(([n, re]) => { if (re.test(html)) rastreadores.push(n); });
  const banner = !!document.querySelector('[id*="cookie" i],[class*="cookie" i],[id*="consent" i],[class*="consent" i],[id*="cmp" i]') || has(/usamos cookies|utilizamos cookies|this site uses cookies|aviso de cookies/);
  if (rastreadores.length) {
    add("cookies", "Aviso de cookies con rastreadores", banner, 10,
      `Rastreadores detectados: ${rastreadores.join(", ")}. Aviso de cookies: ${banner ? "sí" : "no"}.`,
      "Pide consentimiento antes de cargar analítica o publicidad y ofrece rechazarlas.");
  } else {
    add("cookies", "Rastreadores de terceros", true, 0,
      banner ? "No se detectan rastreadores comunes; hay aviso de cookies." : "No se detectan rastreadores comunes.", "");
  }

  // 9. HTTPS
  const https = location.protocol === "https:";
  add("https", "Conexión segura (HTTPS)", https, 10,
    https ? "La página usa HTTPS." : "La página no usa HTTPS.",
    "Habilita HTTPS: la seguridad de los datos es un deber del responsable.");

  const pesoTotal = checks.reduce((s, c) => s + c.peso, 0);
  const pesoOk = checks.filter((c) => c.ok).reduce((s, c) => s + c.peso, 0);
  const puntaje = pesoTotal ? Math.round((pesoOk / pesoTotal) * 100) : 0;

  return { url: location.href, host: location.hostname, titulo: document.title, puntaje, checks, rastreadores };
}
