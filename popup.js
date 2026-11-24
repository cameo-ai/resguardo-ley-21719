const $ = (id) => document.getElementById(id);
let ultimo = null;

function veredicto(p) {
  if (p >= 80) return ["Buen nivel de señales", "var(--ok)"];
  if (p >= 50) return ["Cumplimiento parcial", "var(--warn)"];
  return ["Faltan señales clave", "var(--bad)"];
}

function render(r) {
  ultimo = r;
  const [txt, color] = veredicto(r.puntaje);
  $("estado").hidden = true;
  $("resultado").hidden = false;
  $("puntaje").textContent = r.puntaje;
  $("anillo").style.setProperty("--p", r.puntaje);
  $("anillo").style.setProperty("--c", color);
  $("veredicto").textContent = txt;
  $("sitio").textContent = r.host;

  const ul = $("lista");
  ul.textContent = "";
  r.checks.forEach((c) => {
    const li = document.createElement("li");
    if (!c.ok) li.className = "mal";
    const h = document.createElement("h3");
    const t = document.createElement("span"); t.textContent = c.titulo;
    const e = document.createElement("span"); e.textContent = c.ok ? "✓" : "✗";
    e.style.color = c.ok ? "var(--ok)" : "var(--bad)";
    h.append(t, e);
    const p = document.createElement("p"); p.textContent = c.detalle;
    li.append(h, p);
    if (!c.ok && c.consejo) {
      const tip = document.createElement("p"); tip.className = "tip"; tip.textContent = c.consejo;
      li.append(tip);
    }
    ul.append(li);
  });
}

function informe(r) {
  const l = [`Resguardo · Revisor Ley 21.719`, `Sitio: ${r.url}`, `Puntaje: ${r.puntaje}/100`, ""];
  r.checks.forEach((c) => {
    l.push(`${c.ok ? "[OK]" : "[FALTA]"} ${c.titulo} — ${c.detalle}`);
    if (!c.ok && c.consejo) l.push(`      Sugerencia: ${c.consejo}`);
  });
  l.push("", "Revisión orientativa; no constituye asesoría legal.");
  return l.join("\n");
}

async function main() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !/^https?:/.test(tab.url || "")) {
      $("estado").textContent = "Abre una página web (http/https) para analizarla.";
      return;
    }
    const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: resguardoScan });
    render(res.result);
  } catch (err) {
    $("estado").textContent = "No se pudo analizar esta página.";
  }
}

$("copiar").addEventListener("click", async () => {
  if (!ultimo) return;
  await navigator.clipboard.writeText(informe(ultimo));
  $("copiar").textContent = "¡Copiado!";
  setTimeout(() => ($("copiar").textContent = "Copiar informe"), 1500);
});

main();
