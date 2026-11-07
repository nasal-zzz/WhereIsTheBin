// Opens the "Report a problem" section when the user follows a #report link.
(() => {
  const d = document.getElementById('report');
  if (!d) return;
  const open = () => { d.open = true; };
  if (location.hash === '#report') open();
  document.querySelectorAll('a[href="#report"]').forEach((a) => a.addEventListener('click', open));
  window.addEventListener('hashchange', () => { if (location.hash === '#report') open(); });
})();