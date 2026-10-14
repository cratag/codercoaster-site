// Renders src/index.html once per locale into _site/ (/ for English, /es/ for
// Spanish) and copies the static files next to them. Fails on any missing or
// extra translation key so the languages can't drift apart.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const ORIGIN = 'https://codercoaster.com';
const OUT = '_site';
const STATIC = ['assets', 'styles.css', 'script.js', 'manifest.webmanifest', 'robots.txt',
  'sitemap.xml', 'CNAME', '.nojekyll', 'google7281a23a77420b02.html'];

// First locale is the default: served at / and the fallback for everyone else
const LOCALES = [
  { lang: 'en', path: '/', ogLocale: 'en_US' },
  { lang: 'es', path: '/es/', ogLocale: 'es_LA' },
];

const flatten = (obj, prefix = '') => Object.entries(obj).flatMap(([k, v]) =>
  typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]]);
const strings = Object.fromEntries(LOCALES.map(({ lang }) =>
  [lang, Object.fromEntries(flatten(JSON.parse(readFileSync(`i18n/${lang}.json`, 'utf8'))))]));

const [def, ...others] = LOCALES;
const errors = [];
for (const { lang } of others) {
  const keys = new Set(Object.keys(strings[lang]));
  for (const k of Object.keys(strings[def.lang])) if (!keys.delete(k)) errors.push(`${lang}: missing "${k}"`);
  for (const k of keys) errors.push(`${lang}: unknown "${k}"`);
}

// Visitors whose browser prefers another language land on that version, unless
// they already picked one with the switch (script.js remembers it)
const redirect = `<script>
  (function () {
    var routes = ${JSON.stringify(Object.fromEntries(others.map((l) => [l.lang, l.path])))};
    try {
      var saved = localStorage.getItem('lang');
      if (saved === '${def.lang}') return;
      var lang = (saved || (navigator.languages && navigator.languages[0]) || navigator.language || '').slice(0, 2).toLowerCase();
      if (routes[lang]) location.replace(routes[lang] + location.search + location.hash);
    } catch (e) {}
  })();
  </script>`;

const template = readFileSync('src/index.html', 'utf8');
rmSync(OUT, { recursive: true, force: true });

const pages = LOCALES.map((loc) => {
  const alt = LOCALES.find((l) => l !== loc);
  const vars = {
    ...strings[loc.lang],
    lang: loc.lang,
    url: ORIGIN + loc.path,
    ogLocale: loc.ogLocale,
    redirect: loc === def ? redirect : '',
    'alt.lang': alt.lang,
    'alt.path': alt.path,
    'alt.ogLocale': alt.ogLocale,
    'alt.langName': strings[alt.lang].langName,
  };
  const html = template.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    if (key in vars) return vars[key];
    errors.push(`${loc.lang}: template uses undefined "${key}"`);
    return '';
  });
  return [`${OUT}${loc.path}index.html`, html];
});

if (errors.length) {
  console.error(`i18n errors:\n  ${[...new Set(errors)].join('\n  ')}`);
  process.exit(1);
}

for (const [file, html] of pages) {
  mkdirSync(file.slice(0, file.lastIndexOf('/')), { recursive: true });
  writeFileSync(file, html);
}
for (const f of STATIC) cpSync(f, `${OUT}/${f}`, { recursive: true });
console.log(`Built ${pages.map(([f]) => f).join(', ')}`);
