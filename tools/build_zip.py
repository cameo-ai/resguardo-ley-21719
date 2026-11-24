"""Empaqueta la extensión en dist/resguardo-<version>.zip (sin tools, .git ni dist)."""
import json, os, zipfile
raiz = os.path.join(os.path.dirname(__file__), "..")
ver = json.load(open(os.path.join(raiz, "manifest.json"), encoding="utf-8"))["version"]
incluir = ["manifest.json", "scanner.js", "popup.html", "popup.css", "popup.js",
           "report.html", "report.css", "report.js", "LICENSE", "README.md"]
os.makedirs(os.path.join(raiz, "dist"), exist_ok=True)
out = os.path.join(raiz, "dist", f"resguardo-{ver}.zip")
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for f in incluir: z.write(os.path.join(raiz, f), f)
    for f in sorted(os.listdir(os.path.join(raiz, "icons"))): z.write(os.path.join(raiz, "icons", f), "icons/" + f)
print(os.path.abspath(out))
