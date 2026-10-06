/* pizzalove.fi — sivujen pieni skripti
 *
 * 1. Videot: sivulla näkyy ensin pelkkä kuva. YouTube ladataan vasta kun
 *    videota painetaan. Näin sivu aukeaa nopeasti myös huonolla verkolla.
 * 2. Kielivalinta muistetaan, jotta etusivun osoite (pizzalove.fi) vie
 *    seuraavalla kerralla suoraan samaan kieleen.
 */
(function () {
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.video');
    if (!b || b.classList.contains('on')) return;
    var id = b.getAttribute('data-id');
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1';
    f.title = b.getAttribute('aria-label') || 'YouTube';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    b.classList.add('on');
    b.appendChild(f);
  });

  document.addEventListener('click', function (e) {
    var a = e.target.closest('.kielet a');
    if (!a) return;
    try { localStorage.setItem('pizzalove-kieli', a.getAttribute('hreflang')); } catch (_) {}
  });
})();
