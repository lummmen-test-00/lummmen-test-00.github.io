var matomoLuxiSiteId = "62";
var matomoLuxiSampleSize = "100";
var _mtm = window._mtm = window._mtm || [];
var _paq = window._paq = window._paq || [];
(async function () {
  document.documentElement.classList.add('lummmen-ab-test-loading');
  const lummmenStyleEl = document.createElement('style');
  lummmenStyleEl.textContent = 'html.lummmen-ab-test-loading{opacity:0 !important;}';
  document.head.appendChild(lummmenStyleEl);
  const lummmenAbSource = "https://getabtestseu-573194387152.europe-west1.run.app";
  const lummmenShowPage = () => {
    window.__LUMMMEN_TOO_LATE__ = true;
    document.documentElement.classList.remove("lummmen-ab-test-loading");
  };
  const REQUIRED = new Set(["tests", "analytics"]), store = {}, loaded = new Set(), resolvers = {}, keyPromises = {};
  REQUIRED.forEach(k => keyPromises[k] = new Promise(resolve => resolvers[k] = resolve));
  let resolveAll;
  const allReady = new Promise(resolve => resolveAll = resolve);
  const markReady = (k, v) => {
    if (!REQUIRED.has(k) || loaded.has(k)) return;
    store[k] = v; loaded.add(k); resolvers[k](v);
    if (loaded.size === REQUIRED.size) resolveAll(store);
  };
  window.__LUMMMEN__ = { markReady, ready: allReady, when: k => keyPromises[k], get: k => store[k] };
  (async () => {
      const previewId = new URLSearchParams(location.search).get("lummmen-ab-preview");
      const cacheKey = "lummmen-ab-tests";
      let tests;
      if (previewId) {
        tests = await fetch(lummmenAbSource, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idSite: matomoLuxiSiteId, previewId })
        }).then(r => r.json(), () => []);
        sessionStorage.setItem(cacheKey, JSON.stringify(tests));
      } else {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          try { tests = JSON.parse(cached); } catch { tests = undefined; }
        } else {
          tests = await fetch(lummmenAbSource, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idSite: matomoLuxiSiteId })
          }).then(r => r.json(), () => []);
          sessionStorage.setItem(cacheKey, JSON.stringify(tests));
        }
      }
      window.__LUMMMEN__.markReady("tests", tests);
  })();
  setTimeout(lummmenShowPage, 400);
  (function() {
    var script = document.createElement('script');
    script.src = "https://getlummmenanalytics-573194387152.europe-west1.run.app?version=abtest&siteId=62";
    script.async = true;
    document.head.appendChild(script);
  })();
})();
