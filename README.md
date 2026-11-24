# Resguardo · Revisor Ley 21.719

Extensión de Chrome (Manifest V3) que revisa en un clic si el sitio que visitas muestra las señales básicas que exige la **Ley 21.719** de protección de datos personales de Chile.

Muestra un semáforo con hallazgos graves o por revisar, cada uno con su base legal, evidencia desplegable y "cómo se corrige", y una sección "qué se revisó".

Revisa: enlace y contenido de la política de privacidad (se descarga solo si es del mismo sitio), mención de la Agencia de Protección de Datos, siete puntos que debe declarar la política (fecha/versión, canal de contacto, medidas de seguridad, portabilidad, plazo de conservación, retiro del consentimiento, decisiones automatizadas), rastreadores y aviso de cookies, casillas premarcadas, campos de datos sensibles y HTTPS.

> Las referencias a artículos están tomadas de capturas de una herramienta similar y **deben verificarse contra el texto oficial** de la Ley 21.719 antes de confiar en ellas.

Incluye también **Copiar prompt para arreglar con IA** e **informe imprimible** (guardar como PDF desde la pestaña del informe).

## Privacidad
Todo el análisis ocurre en tu navegador. No se envía ni se guarda ningún dato. Permisos: `activeTab` y `scripting` (solo al abrir el popup) y `storage` (sesión, para pasar el informe a la pestaña imprimible).

## Instalar (modo desarrollador)
1. Abre `chrome://extensions` y activa **Modo desarrollador**.
2. Pulsa **Cargar descomprimida** y elige esta carpeta.

## Empaquetar
```
python tools/build_zip.py
```
Genera `dist/resguardo-<versión>.zip`, listo para cargar o subir a la Chrome Web Store.

## Licencia
MIT. Ver `LICENSE`.

## Regenerar iconos
```
python tools/make_icons.py
```

## Aviso
Es una revisión orientativa basada en texto visible de la página. No constituye asesoría legal.
