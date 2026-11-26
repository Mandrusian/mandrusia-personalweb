# mandrusia-personalweb

Personal website for Mandrusia, published via GitHub Pages at [www.mandrusia.tech](https://www.mandrusia.tech).

## Files

- `index.html` — Main personal homepage with semantic landmarks, skip navigation, and scroll-reveal animations.
- `styles.css` — Dark-mode stylesheet with responsive grid/flex layout, reduced-motion, forced-colors, and print rules.
- `fedora.html` — Standalone quick guide for installing Fedora Workstation Linux.
- `CNAME` — Custom domain configuration for GitHub Pages (`www.mandrusia.tech`).
- `tests/smoke.test.mjs` — Zero-dependency Node.js smoke tests for HTML structure, links, CSS sanity, and inline JS syntax.

## Local Preview

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## Verification

```sh
node --test tests/smoke.test.mjs
```
