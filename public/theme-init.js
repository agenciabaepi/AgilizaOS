(function () {
  try {
    var key = 'gestaoconsert-theme';
    var stored = localStorage.getItem(key);
    var root = document.documentElement;
    if (stored === 'dark') {
      root.classList.add('dark');
    } else if (stored === 'light') {
      root.classList.remove('dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  } catch (e) {
    document.documentElement.classList.remove('dark');
  }
})();
