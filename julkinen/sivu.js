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

  /* Kielivalikko sulkeutuu, kun painetaan sen ulkopuolelle tai Esc. */
  document.addEventListener('click', function (e) {
    document.querySelectorAll('details.kielet[open]').forEach(function (d) {
      if (!d.contains(e.target)) d.open = false;
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') document.querySelectorAll('details.kielet[open]').forEach(function (d) { d.open = false; });
  });

  document.addEventListener('click', function (e) {
    var a = e.target.closest('.kielet a');
    if (!a) return;
    try { localStorage.setItem('pizzalove-kieli', a.getAttribute('hreflang')); } catch (_) {}
  });
})();

/* 3. Elävä Apinavaaka-apina lautapelisivun bannerissa (Marko 20.10.2026).
 *
 *    Sama apina kuin pelin alkuvalikossa: kerrokset ja PSD-koordinaatit tulevat
 *    pelin omasta tiedostosta (`play/apinavaaka/apinavaaka.js` → `apinavaakaKuvat`),
 *    jotta kaksi apinaa ei ajaudu erilleen. Palkki keinuu, kieli heiluu ja silmät
 *    seuraavat osoitinta. Apinan napautus = keinahdus. «Pelaa verkossa» -nappi
 *    sytyttää lampun ja siirtyy peliin vasta kun lamppu palaa.
 *    Ilman geometriaa (skripti ei latautunut) näkyy kuva, ja nappi on tavallinen linkki.
 */
(function () {
  var paikka = document.querySelector('.vaaka-apina');
  if (!paikka) return;
  var hidas = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var silmat = null, vara = null, SIL = null;

  function rakenna() {
    var g = window.apinavaakaKuvat;
    if (!g || paikka.classList.contains('elava')) return;
    var pros = function (a, b) { return (a / b * 100).toFixed(4) + '%'; };
    /* Ylhäältä rajataan tyhjä säihkeen yläpuolelta (kuten valikossa), alhaalta
       ruokalapun alareunan väriraita pois: apina seisoo laatikon reunalla. */
    var YLA = 20, ALA = 60, KH = g.H - YLA - ALA;
    var kangas = document.createElement('div');
    kangas.className = 'va-kangas';
    kangas.style.top = '-' + (YLA / KH * 100).toFixed(4) + '%';
    kangas.style.aspectRatio = g.W + ' / ' + g.H;
    function kerros(nimi, tiedosto, luokka) {
      var o = g.OSAT[nimi], i = document.createElement('img');
      i.src = g.KANSIO + (tiedosto || nimi) + '.webp';
      i.alt = ''; i.draggable = false;
      i.className = 'va-osa' + (luokka ? ' ' + luokka : '');
      i.style.left = pros(o[0], g.W); i.style.top = pros(o[1], g.H); i.style.width = pros(o[2], g.W);
      kangas.appendChild(i);
      return i;
    }
    function nivelle(el, nimi, nivel) {
      var o = g.OSAT[nimi];
      el.style.transformOrigin = pros(nivel[0] - o[0], o[2]) + ' ' + pros(nivel[1] - o[1], o[3]);
    }
    var kv = kerros('vasen', null, 'va-kasi'), ko = kerros('oikea', null, 'va-kasi');
    nivelle(kv, 'vasen', g.NIVEL_V); nivelle(ko, 'oikea', g.NIVEL_O);
    kerros('vartalo', 'vartalo-silmaton');
    silmat = kerros('silmat', null, 'va-silmat');
    var kieli = kerros('kieli', null, 'va-kieli');
    nivelle(kieli, 'kieli', g.KIELI_NIVEL);
    kerros('saihkeet', null, 'va-saihkeet');
    kerros('lamppu', 'lamppu-pois');
    kerros('lamppu', 'lamppu', 'va-lamppu');
    /* Vaihto vasta kun kerrokset on ladattu, ettei kuva välähdä tyhjänä. */
    var kuvat = kangas.querySelectorAll('img'), odota = kuvat.length;
    function valmis() {
      if (--odota > 0) return;
      paikka.innerHTML = '';
      paikka.style.aspectRatio = g.W + ' / ' + KH;
      paikka.appendChild(kangas);
      paikka.classList.add('elava');
    }
    Array.prototype.forEach.call(kuvat, function (i) {
      if (i.complete) valmis(); else { i.addEventListener('load', valmis); i.addEventListener('error', valmis); }
    });
    vara = g.SILMA_VARA || { vasen: -18, oikea: 28, ylos: -100, alas: 0 };
    SIL = g.OSAT.silmat;
  }

  /* Katse seuraa osoitinta (sama laskenta kuin pelin valikossa). */
  var lukossa = false, odottaa = false, viimeX = 0, viimeY = 0;
  function katso(dx, dy) {
    silmat.style.transform = 'translate(' + (dx / SIL[2] * 100).toFixed(2) + '%,' + (dy / SIL[3] * 100).toFixed(2) + '%)';
  }
  function katsoKohti() {
    odottaa = false;
    if (!silmat || lukossa) return;
    var r = silmat.getBoundingClientRect();
    var ax = Math.max(-1, Math.min(1, (viimeX - (r.left + r.width / 2)) / (window.innerWidth * 0.45)));
    var ay = Math.max(-1, Math.min(1, (viimeY - (r.top + r.height / 2)) / (window.innerHeight * 0.35)));
    katso(ax < 0 ? -ax * vara.vasen : ax * vara.oikea, ay < 0 ? -ay * vara.ylos : ay * vara.alas);
  }
  if (!hidas) document.addEventListener('pointermove', function (e) {
    viimeX = e.clientX; viimeY = e.clientY;
    if (!odottaa) { odottaa = true; requestAnimationFrame(katsoKohti); }
  }, { passive: true });

  paikka.addEventListener('click', function () {
    if (paikka.classList.contains('syttyy')) return;
    paikka.classList.remove('heilahtaa'); void paikka.offsetWidth; paikka.classList.add('heilahtaa');
  });
  paikka.addEventListener('animationend', function (e) {
    if (e.animationName === 'va-keinahda') paikka.classList.remove('heilahtaa');
  });

  /* Nappi: lamppu syttyy, katse nousee lamppuun, sitten peliin. Uuteen
     välilehteen avaaminen (Ctrl/Cmd/keskinappi) toimii kuten ennenkin. */
  var nappi = document.querySelector('.pelaa-banneri [data-syty]');
  if (nappi) nappi.addEventListener('click', function (e) {
    if (!paikka.classList.contains('elava') || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
    e.preventDefault();
    lukossa = true;
    if (silmat) katso(0, vara.ylos);
    paikka.classList.remove('heilahtaa');
    paikka.classList.add('syttyy');
    var osoite = nappi.href;
    setTimeout(function () { location.href = osoite; }, hidas ? 300 : 820);
  });
  /* Takaisin-nappi palauttaa sivun välimuistista: sammuta lamppu. */
  window.addEventListener('pageshow', function () { paikka.classList.remove('syttyy'); lukossa = false; });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', rakenna);
  else rakenna();
})();

/* 4. Puuttuva kieli = toimeksianto (Marko 16.11.2026).
 *
 *    Jos selaimen ensimmäistä kieltä ei ole sivustolla, kysytään yhdellä rivillä,
 *    halutaanko korttipelin säännöt sillä kielellä. Nappi lähettää pelkän
 *    kielikoodin palvelimelle, joka käynnistää GitHubin konekäännösajon
 *    (käännös, oma sivu ja arkki samalla kertaa). Ei sähköpostikenttää, ei
 *    evästettä, ei talletusta. Sivu kysyy muutaman minuutin välein, onko uusi
 *    sivu jo julkaistu, ja näyttää linkin heti kun on.
 *    Oikealta vasemmalle kirjoitettavia kieliä ei vielä tueta, joten niille ei kysytä.
 */
(function () {
  var html = document.documentElement;
  var kielet = (html.getAttribute('data-kielet') || '').split(',');
  var osoite = html.getAttribute('data-pyynto');
  if (!osoite || !kielet[0]) return;
  function koodi(l) {
    l = String(l || '').toLowerCase(); var p = l.split('-');
    if (p[0] === 'zh') return /hant|-tw|-hk|-mo/.test(l) ? 'zh-hant' : 'zh-hans';
    if (p[0] === 'pt' && p[1] === 'br') return 'pt-br';
    if (p[0] === 'no' || p[0] === 'nn') return 'nb';
    return p[0];
  }
  var k = koodi((navigator.languages && navigator.languages[0]) || navigator.language);
  if (!/^[a-z]{2,3}(-[a-z0-9]{2,8})?$/.test(k) || kielet.indexOf(k) >= 0) return;
  if (['ar', 'he', 'iw', 'fa', 'ur', 'yi', 'ps', 'sd', 'ug', 'dv', 'ckb'].indexOf(k.split('-')[0]) >= 0) return;
  var nimi = k;
  try { nimi = new Intl.DisplayNames([k], { type: 'language' }).of(k) || k; } catch (_) {}
  var main = document.getElementById('sisalto');
  if (!main) return;
  var laatikko = document.createElement('div');
  laatikko.className = 'kielipyynto';
  laatikko.setAttribute('role', 'region');
  laatikko.setAttribute('aria-label', 'Pizza Love rules in ' + nimi);
  var teksti = document.createElement('p');
  var b = document.createElement('b'); b.lang = k; b.textContent = nimi;
  teksti.append('Want the Pizza Love card game rules in ', b, '? We’ll make them now – machine-translated, free.');
  var nappi = document.createElement('button');
  nappi.className = 'nappi'; nappi.type = 'button'; nappi.textContent = 'Yes, please';
  var sulje = document.createElement('button');
  sulje.className = 'kielipyynto__sulje'; sulje.type = 'button'; sulje.setAttribute('aria-label', 'Close'); sulje.textContent = '×';
  sulje.onclick = function () { laatikko.remove(); };
  laatikko.append(teksti, nappi, sulje);
  main.insertBefore(laatikko, main.firstChild);
  var sivu = '/' + k + '/card-game.html';
  function valmis() {
    teksti.textContent = '';
    var a = document.createElement('a'); a.href = sivu; a.lang = k;
    a.textContent = 'Open the rules in ' + nimi;
    teksti.append(a, ' (machine translation – corrections welcome).');
    nappi.remove();
  }
  function odota(alku) {
    fetch(sivu, { method: 'HEAD', cache: 'no-store' }).then(function (r) {
      if (r.ok) return valmis();
      if (Date.now() - alku < 25 * 60 * 1000) setTimeout(function () { odota(alku); }, 30000);
    }).catch(function () { setTimeout(function () { odota(alku); }, 30000); });
  }
  nappi.onclick = function () {
    nappi.disabled = true;
    fetch(osoite, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kieli: k }) })
      .then(function (r) { return r.json(); })
      .then(function (v) {
        if (v.tila === 'valmis') return valmis();
        if (v.tila !== 'aloitettu' && v.tila !== 'tekeillä') throw new Error(v.virhe || 'virhe');
        teksti.textContent = 'Thank you! We’re making the rules in ' + nimi +
          ' now. It usually takes 5–10 minutes – keep this page open and the link will appear here.';
        nappi.remove();
        odota(Date.now());
      })
      .catch(function () {
        nappi.disabled = false;
        teksti.textContent = 'Sorry, that didn’t work. Please try again later or write to info@merkitysten.fi.';
      });
  };
})();
