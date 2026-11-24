const $ = (id) => document.getElementById(id);
let ultimo = null;

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

function titulo(r) {
  if (r.graves) return `${r.graves} hallazgo${r.graves > 1 ? "s" : ""} grave${r.graves > 1 ? "s" : ""}`;
  if (r.findings.length) return "Hay puntos por revisar";
  return "Sin hallazgos en lo revisado";
}

function render(r) {
  ultimo = r;
  $("estado").hidden = true;
  $("resultado").hidden = false;
  $("sitio").textContent = r.host;
  $("luces").className = "luces " + r.semaforo;
  $("titulo").textContent = titulo(r);
  document.querySelector(".semaforo").classList.add(r.semaforo);

  const cont = $("hallazgos");
  cont.textContent = "";
  r.findings.forEach((f) => {
    const box = el("article", "hallazgo " + f.sev);
    box.append(el("div", "etq", f.sev === "grave" ? "GRAVE" : "ATENCIÓN"), el("h3", null, f.titulo), el("p", null, f.detalle), el("p", "art", f.articulo));
    const fix = el("div", "fix");
    fix.append(el("b", null, "Cómo se corrige"), el("div", null, f.consejo));
    box.append(fix);
    if (f.evidencia && f.evidencia.length) {
      const d = el("details");
      d.append(el("summary", null, `Evidencia (${f.evidencia.length})`));
      const ul = el("ul");
      f.evidencia.forEach((e) => ul.append(el("li", null, e)));
      d.append(ul);
      box.append(d);
    }
    cont.append(box);
  });

  const rev = $("revisado");
  rev.textContent = "";
  if (r.policy.url) {
    const p = el("div", "poli");
    p.append(el("b", null, r.policy.descargada ? "Política de privacidad analizada" : "Política de privacidad detectada"));
    p.append(el("code", null, r.policy.url));
    p.append(el("span", null, r.policy.descargada ? `${r.policy.chars.toLocaleString("es-CL")} caracteres · ${r.policy.habitual ? "encontrada en una dirección habitual del sitio" : "descargada desde el enlace del sitio"}` : "No se pudo descargar su contenido"));
    rev.append(p);
  }
  r.ok.forEach((o) => {
    const d = el("div", "rev");
    d.append(el("b", null, o.titulo), el("p", null, o.detalle), el("small", null, o.articulo));
    rev.append(d);
  });
}

function informe(r) {
  const l = ["Resguardo · Revisor Ley 21.719", `Página: ${r.url}`, `Resultado: ${titulo(r)}`, ""];
  r.findings.forEach((f) => {
    l.push(`[${f.sev.toUpperCase()}] ${f.titulo}`, `  ${f.detalle}`, `  Base: ${f.articulo}`, `  Corrección: ${f.consejo.replace(/\n/g, " ")}`, "");
  });
  l.push("Sin hallazgos en:");
  r.ok.forEach((o) => l.push(`  - ${o.titulo}`));
  l.push("", "Revisión orientativa desde el navegador; no es una certificación ni asesoría legal.");
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

function promptIA(r) {
  const l = [
    "Actúa como asesor de cumplimiento web en Chile. Corrige la política de privacidad y el sitio indicados para cumplir la Ley 21.719.",
    `Sitio: ${r.url}`,
    "Hallazgos a corregir:",
  ];
  r.findings.forEach((f, i) => l.push(`${i + 1}. ${f.titulo}. ${f.detalle} Base citada: ${f.articulo}. Qué hacer: ${f.consejo.replace(/\n/g, " ")}`));
  l.push("", "Redacta el texto en español claro, sin inventar datos del responsable (deja campos entre corchetes para completar) y recuerda verificar los artículos citados contra el texto oficial de la ley.");
  return l.join("\n");
}

function flash(btn, txt, orig) { btn.textContent = txt; setTimeout(() => (btn.textContent = orig), 1500); }

$("prompt").addEventListener("click", async () => {
  if (!ultimo) return;
  await navigator.clipboard.writeText(promptIA(ultimo));
  flash($("prompt"), "¡Copiado!", "Copiar prompt para arreglar con IA");
});

$("pdf").addEventListener("click", async () => {
  if (!ultimo) return;
  await chrome.storage.session.set({ informe: ultimo });
  chrome.tabs.create({ url: chrome.runtime.getURL("report.html") });
});

main();
