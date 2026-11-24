const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

async function main() {
  const { informe: r } = await chrome.storage.session.get("informe");
  const main = document.getElementById("contenido");
  if (!r) { main.textContent = "No hay informe disponible. Vuelve a abrir Resguardo en la página."; return; }
  document.getElementById("meta").textContent = `${r.url} · ${new Date().toLocaleDateString("es-CL")}`;
  main.textContent = "";

  const titulo = r.graves ? `${r.graves} hallazgo${r.graves > 1 ? "s" : ""} grave${r.graves > 1 ? "s" : ""}`
    : r.findings.length ? "Hay puntos por revisar" : "Sin hallazgos en lo revisado";
  main.append(el("div", "res " + r.semaforo, titulo));

  r.findings.forEach((f) => {
    const a = el("article", f.sev);
    a.append(el("div", "etq", f.sev === "grave" ? "GRAVE" : "ATENCIÓN"), el("h3", null, f.titulo), el("p", null, f.detalle), el("p", "art", f.articulo));
    const fix = el("div", "fix"); fix.append(el("b", null, "Cómo se corrige"), document.createTextNode(f.consejo));
    a.append(fix);
    if (f.evidencia?.length) { const ul = el("ul"); f.evidencia.forEach((e) => ul.append(el("li", null, e))); a.append(ul); }
    main.append(a);
  });

  main.append(el("h2", null, "Qué se revisó"));
  if (r.policy.url) main.append(el("div", "ok", `Política analizada: ${r.policy.url}`));
  r.ok.forEach((o) => { const d = el("div", "ok"); d.append(el("b", null, o.titulo), el("p", null, `${o.detalle} (${o.articulo})`)); main.append(d); });
}

document.getElementById("imprimir").addEventListener("click", () => window.print());
main();
