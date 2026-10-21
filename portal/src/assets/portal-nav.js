(function () {
  if (!window.fetch || !window.DOMParser || !window.history || !history.pushState) return;

  var EXCLUDED = /(^|\/)(play\.php)$/;
  var request = 0;

  function layout() {
    return document.querySelector('.portal-layout');
  }

  function sameOrigin(url) {
    return url.origin === location.origin;
  }

  function fallback(url) {
    window.location.href = url;
  }

  function runScripts(root) {
    root.querySelectorAll('script').forEach(function (old) {
      var script = document.createElement('script');
      script.textContent = old.textContent;
      old.replaceWith(script);
    });
  }

  function swap(doc) {
    var next = doc.querySelector('.portal-layout');
    var current = layout();
    if (!next || !current) return false;

    document.title = doc.title;
    document.documentElement.lang = doc.documentElement.lang;

    var button = document.getElementById('music-toggle');
    var nextButton = doc.getElementById('music-toggle');
    if (button && nextButton) {
      button.dataset.on = nextButton.dataset.on;
      button.dataset.off = nextButton.dataset.off;
      button.dispatchEvent(new Event('portal:relabel'));
    }

    var adopted = document.adoptNode(next);
    current.replaceWith(adopted);
    runScripts(adopted);
    window.scrollTo(0, 0);
    return true;
  }

  function load(url, options, push) {
    var id = ++request;
    var current = layout();
    if (current) current.classList.add('is-loading');

    return fetch(url, options)
      .then(function (response) {
        if (id !== request) return null;
        var finalUrl = new URL(response.url, location.href);
        if (!sameOrigin(finalUrl) || EXCLUDED.test(finalUrl.pathname)) {
          fallback(finalUrl.href);
          return null;
        }
        return response.text().then(function (text) {
          if (id !== request) return null;
          var doc = new DOMParser().parseFromString(text, 'text/html');
          if (!swap(doc)) {
            fallback(finalUrl.href);
            return null;
          }
          if (push) history.pushState({ portal: true }, '', finalUrl.href);
          return true;
        });
      })
      .catch(function () {
        if (id === request) fallback(typeof url === 'string' ? url : location.href);
      })
      .then(function (result) {
        var now = layout();
        if (now) now.classList.remove('is-loading');
        return result;
      });
  }

  function navigate(href) {
    var url = new URL(href, location.href);
    if (!sameOrigin(url) || EXCLUDED.test(url.pathname)) {
      fallback(url.href);
      return;
    }
    load(url.href, { credentials: 'same-origin' }, true);
  }

  window.portalNavigate = navigate;
  history.replaceState({ portal: true }, '', location.href);

  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target.closest && event.target.closest('a[href]');
    if (!link || !layout() || !layout().contains(link)) return;
    if (link.target && link.target !== '_self') return;
    if (link.hasAttribute('download')) return;

    var url = new URL(link.href, location.href);
    if (!sameOrigin(url) || EXCLUDED.test(url.pathname)) return;
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return;

    event.preventDefault();
    navigate(url.href);
  });

  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (event.defaultPrevented || !form.closest || !layout() || !layout().contains(form)) return;

    var action = new URL(form.getAttribute('action') || location.href, location.href);
    if (!sameOrigin(action) || EXCLUDED.test(action.pathname)) return;

    var method = (form.getAttribute('method') || 'get').toUpperCase();
    var data = event.submitter ? new FormData(form, event.submitter) : new FormData(form);
    event.preventDefault();

    if (method === 'GET') {
      var query = new URLSearchParams(data);
      action.search = query.toString();
      load(action.href, { credentials: 'same-origin' }, true);
    } else {
      load(action.href, { method: 'POST', body: data, credentials: 'same-origin' }, true);
    }
  });

  window.addEventListener('popstate', function () {
    load(location.href, { credentials: 'same-origin' }, false);
  });
})();
