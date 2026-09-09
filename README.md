# Funxplorer

Product sources for Funxplorer. This is **not** a Firefox mirror and **not** a GitHub fork of `mozilla-firefox/firefox`.

Firefox itself stays upstream: https://github.com/mozilla-firefox/firefox

Built on mozilla-central around `98f1235b79c1`. Overlay commit in the local Gecko tree: `fa9bb544cfce`.

## Layout

- `browser/branding/funxplorer/` — branding
- `browser/extensions/funshield/` — FUNSHIELD (uBlock Origin 1.74.0, GPLv3)
- `funsearch-web/` — Funsearch site (Netlify)
- other `browser/`, `toolkit/`, `services/` files — Gecko patches
- `funxplorer-on-firefox.patch` — same changes as a patch

## Apply onto Firefox

```text
git clone https://github.com/mozilla-firefox/firefox.git
cd firefox
git checkout 98f1235b79c1
```

Copy this repo over that tree (keep Firefox `.gitignore`), or:

```text
git apply --check path/to/funxplorer-on-firefox.patch
git apply path/to/funxplorer-on-firefox.patch
```

mozconfig:

```text
ac_add_options --with-branding=browser/branding/funxplorer
```

Do not push Funxplorer changes to `mozilla-firefox/firefox`.

## Site

Funsearch: https://funsearchapp.netlify.app/

## License

Gecko-derived files: MPL 2.0 (Mozilla).
FUNSHIELD: GPLv3 (Raymond Hill / uBlock Origin).
Keep those notices when you redistribute.
