# Funxplorer

Navegador Funxplorer. Este repo es **solo la capa de producto**: branding, Funsearch, FUNSHIELD, VPN/Tor, Fun Smart y personalización. No es el código completo de Firefox ni un fork de `mozilla-firefox/firefox`.

- Sitio: [funxplorer.netlify.app](https://funxplorer.netlify.app/)
- Búsqueda: [funsearchapp.netlify.app](https://funsearchapp.netlify.app/)

## Qué incluye

- **Funsearch** — búsqueda por defecto con varios índices y resumen IA
- **FUNSHIELD** — bloqueo de anuncios y rastreo (basado en uBlock Origin)
- **FUNVPN / FUNTOR** — VPN y Tor, uno u otro
- **Fun Smart** — ventana inteligente (ventana clásica al arrancar)
- **Personalizar** — apariencia, pestañas, privacidad y red
- Español por defecto, sin cuentas y sin telemetría

## Contenido del repo

| Ruta | Qué es |
| --- | --- |
| `browser/branding/funxplorer/` | Marca e iconos |
| `browser/extensions/funshield/` | FUNSHIELD |
| `funsearch-web/` | Web de Funsearch (Netlify) |
| `funxplorer-web/` | Sitio oficial (Netlify) |
| `browser/`, `toolkit/`, `services/` | Parches sobre Gecko |
| `funxplorer-on-firefox.patch` | Los mismos cambios en un patch |
| `mozconfig` | Branding Funxplorer |

## Compilar

Hace falta un clone de Firefox y copiar esto encima:

```text
git clone https://github.com/mozilla-firefox/firefox.git
cd firefox
git checkout 98f1235b79c1
```

Copia este repo sobre ese árbol (conserva el `.gitignore` de Firefox), o:

```text
git apply --check path/to/funxplorer-on-firefox.patch
git apply path/to/funxplorer-on-firefox.patch
```

mozconfig:

```text
ac_add_options --with-branding=browser/branding/funxplorer
```

No subas cambios de Funxplorer a `mozilla-firefox/firefox`.

## Descargar

Windows portable: GitHub Releases (`Funxplorer-156.0a2.win64.zip`). Extrae y ejecuta `firefox\firefox.exe`.

## Licencia

Archivos derivados de Gecko: MPL 2.0 (Mozilla).
FUNSHIELD: GPLv3 (Raymond Hill / uBlock Origin).
Conserva esos avisos al redistribuir.
