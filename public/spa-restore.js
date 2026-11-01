/* GitHub Pages SPA fallback (spa-github-pages): when a deep link was
   redirected through 404.html as /?/path, restore the real path so
   react-router sees it. */
;(function (l) {
  if (l.search && l.search[1] === '/') {
    var decoded = l.search
      .slice(1)
      .split('&')
      .map(function (s) {
        return s.replace(/~and~/g, '&')
      })
      .join('?')
    window.history.replaceState(null, null, l.pathname.slice(0, -1) + decoded + l.hash)
  }
})(window.location)
