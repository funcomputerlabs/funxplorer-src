# Funxplorer

Navegador Funxplorer. Este repo es **solo la capa de producto**: branding, Funsearch, cuentas, FUNSHIELD, VPN/Tor y Fun Smart. No es el código completo de Firefox ni un fork de `mozilla-firefox/firefox`.

Sitio de búsqueda: [funsearchapp.netlify.app](https://funsearchapp.netlify.app/)

## Qué incluye

- **Funsearch** — búsqueda por defecto (no trata la query como URL)
- **FunComputer** — cuentas opcionales (`about:funcomputer`)
- **FUNSHIELD** — bloqueo de anuncios y rastreo (basado en uBlock Origin)
- **FUNVPN / FUNTOR** — VPN y Tor, uno u otro
- **Fun Smart** — ventana inteligente (Classic Window al arrancar)
- **Classic Window** — ventana normal por defecto

## Contenido del repo

| Ruta | Qué es |
| --- | --- |
| `browser/branding/funxplorer/` | Marca e iconos |
| `browser/extensions/funshield/` | FUNSHIELD |
| `funsearch-web/` | Web de Funsearch (Netlify) |
| `browser/`, `toolkit/`, `services/` | Parches sobre Gecko |
| `funxplorer-on-firefox.patch` | Los mismos cambios en un patch |
| `mozconfig` | Branding Funxplorer |

## Compilar

Hace falta un clone de Firefox y copiar esto encima:

```text
git clone https://github.com/mozilla-firefox/firefox.git
cd firefox
git checkout 98f1235b79c1
