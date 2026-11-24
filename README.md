# Resguardo · Revisor Ley 21.719

Extensión de Chrome (Manifest V3) que revisa en un clic si el sitio que visitas muestra las señales básicas que exige la **Ley 21.719** de protección de datos personales de Chile.

Revisa: política de privacidad, derechos del titular (acceso, rectificación, supresión, oposición, portabilidad, bloqueo), responsable y contacto, finalidad, plazo de conservación, terceros y transferencias, consentimiento en formularios, cookies y rastreadores, y HTTPS.

## Privacidad
Todo el análisis ocurre en tu navegador. No se envía ni se guarda ningún dato. Solo usa los permisos `activeTab` y `scripting`, y únicamente cuando abres el popup.

## Instalar (modo desarrollador)
1. Abre `chrome://extensions` y activa **Modo desarrollador**.
2. Pulsa **Cargar descomprimida** y elige esta carpeta.

## Regenerar iconos
```
python tools/make_icons.py
```

## Aviso
Es una revisión orientativa basada en texto visible de la página. No constituye asesoría legal.
