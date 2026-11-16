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

/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  PIZZAKEITTIÖ — näytä, anna kokeilla, luovuta pelille                 ║
   ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Marko 16.11.2026: «Sen sijaan, että nettisivulla kerrotaan, niin pitäisikö
 * näyttää?» ja «Ei tehdä digitaalista alustaa fyysisen maailman ehdoilla.»
 * Sitten: «Voisimme jopa tehdä siitä animaatiosta osittain osallistavan, että
 * pelaajan tulisi itse tehdä vaikka kahden esimerkin jälkeen itse se pizza.»
 *
 * Kulku: painettu esimerkki näkyvissä → kaksi laskua liikkeenä → lukija tekee
 * saman pizzan itse helpommalla tavalla → sama pizza Basso-apinan tavalla →
 * luovutus pelin omaan opetuskierrokseen. Sivu on portti peliin, ei toinen peli.
 *
 * ⚠️ ARITMETIIKKA ON PELIN OMA. `laske()`, `osuuko()` ja `tulosTekstina()`
 * tulevat tiedostosta julkinen/play/laskin.js, jonka rakenna.py lataa tälle
 * sivulle ENNEN tätä tiedostoa. Älä kirjoita tänne omaa laskinta: pelin oma
 * pitää murtoluvut tarkkoina (10 ÷ 4 ei ole 2,4999999999999996) ja noudattaa
 * normaalia laskujärjestystä, josta on oma päätöksensä (Marko 8.9.2026).
 * Jos tiedostoa ei ole, keittiötä ei rakenneta lainkaan — puute näkyy
 * puutteena eikä puolikkaana keittiönä.
 *
 * ⚠️ YKSI TARKISTIN, TAPA PARAMETRINA. `tarkista(arvot, merkki, apinanTapa)`
 * on sama sääntö kuin pelissä (peli.js:1205, basso.js:392):
 *     lasku osuu pizzan arvoon
 *     JA jos apinan tapa: eri arvojen määrä === pizzan täytteiden määrä
 * Kahta kopioitua tarkistinta ei kirjoiteta: juuri tämä sääntö on jo kerran
 * mennyt sekaisin («kaksi korttia» vs. «kaksi täytettä»), ja se sekaannus oli
 * koko pelin opetuskierroksen syy.
 *
 * 📐 Ja siksi Basson harjoitus alkaa YHDESTÄ kortista: kahdella kortilla
 * Basson sääntö ei voi mennä rikki (arvon 5 voi tehdä kahdella kortilla 13
 * tavalla, ja kaikki 13 kelpaavat myös Bassossa). Ero näkyy vasta yhdellä
 * kortilla — pelkkä 5 kelpaa helpommassa tavassa, ei Bassossa.
 *
 * ⚠️ Ilman JavaScriptiä .esimerkki jää ennalleen: role="img" ja koko lauseen
 * aria-label. Kun keittiö rakennetaan, vanha tekstivastine POISTETAAN ja
 * tilalle tulee role="group" + yksi aria-live-alue, jossa on sekä lasku ja
 * sen tulos (ruudunlukijalle) että tehtävä (kaikille).
 *
 * ⚠️ prefers-reduced-motion: näytöstä ei ajeta, ja CSS pysäyttää animaatiot.
 * Harjoitus EI ole liikettä, joten se jää — se alkaa ensimmäisestä
 * kosketuksesta eikä näytöksen päätteeksi.
 */
(function () {
  var k = document.querySelector('.esimerkki[data-pizza][data-sana-vaihda]');
  if (!k) return;
  if (typeof laske !== 'function' || typeof osuuko !== 'function') return;

  var TAVOITE   = parseInt(k.getAttribute('data-pizza'), 10);
  var TAYTTEITA = parseInt(k.getAttribute('data-taytteita'), 10);
  var TAYTTEET  = k.getAttribute('data-taytteet').split(',');
  var NAYTOS    = k.getAttribute('data-naytos').split(',');
  var HARJOITUS = k.getAttribute('data-harjoitus').split(',');
  var PELI      = k.getAttribute('data-peli');
  var sana = function (n) { return k.getAttribute('data-sana-' + n); };

  /* Näytettävä merkki on sivun oma («4 + 1, 6 – 1, 2 + 3 tai 10 : 2»),
   * laskimelle annettava on pelin oma (+ − × ÷). Avain on ASCII. */
  var MERKIT = {
    '+': { nayta: '+',      laske: '+' },
    '-': { nayta: '–', laske: '−' },
    '*': { nayta: '×', laske: '×' },
    '/': { nayta: ':',      laske: '÷' }
  };
  var MERKKIJONO = ['+', '-', '*', '/'];
  var TYHJA = '-';                       /* täytepaikka ilman korttia */
  var kuvatie = k.querySelector('img').getAttribute('src').replace(/[^/]+$/, '');

  /* ── Sääntö ────────────────────────────────────────────────────────── */
  function eriArvoja(arvot) {
    var n = {};
    arvot.forEach(function (v) { n[v] = true; });
    return Object.keys(n).length;
  }
  function tarkista(arvot, merkki, apinanTapa) {
    var tok = [{ arvo: arvot[0] }];
    if (arvot.length > 1) tok.push(MERKIT[merkki].laske, { arvo: arvot[1] });
    var t = laske(tok);
    if (!osuuko(t, TAVOITE)) return { osuu: false, syy: 'lasku', tulos: t };
    if (apinanTapa && eriArvoja(arvot) !== TAYTTEITA) return { osuu: false, syy: 'maara', tulos: t };
    return { osuu: true, syy: null, tulos: t };
  }
  /* Fantasiatäyte X on «mikä tahansa täyte 1–10, pelaaja valitsee», joten sitä
   * ei lasketa vaan ratkaistaan: käydään läpi arvot, joilla pizza valmistuisi.
   * Sama tarkistin, ei toista sääntöä. */
  function ratkaise(a, merkki, b, apinanTapa) {
    var kortit = (b === TYHJA) ? [a] : [a, b];
    var xt = kortit.map(function (v) { return v === 'x'; });
    if (!xt.some(Boolean)) {
      var r = tarkista(kortit.map(Number), merkki, apinanTapa);
      r.arvot = kortit.map(Number);
      return r;
    }
    var paras = null;
    for (var i = 1; i <= 10; i++) {
      for (var j = 1; j <= 10; j++) {
        var arvot = kortit.map(function (v, n) { return v === 'x' ? (n ? j : i) : Number(v); });
        var t = tarkista(arvot, merkki, apinanTapa);
        if (t.osuu) { t.arvot = arvot; return t; }
        if (!paras) { paras = t; paras.arvot = null; }
        if (!xt[1]) break;
      }
      if (!xt[0]) break;
    }
    return paras;
  }

  /* ── Rakenne ───────────────────────────────────────────────────────── */
  var kuvat = k.querySelectorAll('img');
  var pizza = kuvat[0], merkit = k.querySelectorAll('b');
  pizza.className = 'keittio__pizza';

  function paikka(img) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'keittio__paikka';
    b.setAttribute('aria-haspopup', 'true');
    b.setAttribute('aria-expanded', 'false');
    img.parentNode.insertBefore(b, img);
    b.appendChild(img);
    b.insertAdjacentHTML('beforeend',
      '<span class="keittio__nuoli" aria-hidden="true"><svg viewBox="0 0 12 12">' +
      '<path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
      '<span class="keittio__xarvo" aria-hidden="true" hidden></span>');
    return b;
  }
  var pA = paikka(kuvat[1]), pB = paikka(kuvat[2]);

  var tulos = document.createElement('span');
  tulos.className = 'keittio__tulos';
  tulos.setAttribute('aria-hidden', 'true');
  tulos.innerHTML = '<b>=</b>';
  merkit[0].parentNode.replaceChild(tulos, merkit[0]);

  var laskin = document.createElement('button');
  laskin.type = 'button';
  laskin.className = 'keittio__laskin';
  merkit[1].parentNode.replaceChild(laskin, merkit[1]);

  /* Yksi aria-live-alue: lasku ja tulos vain ruudunlukijalle, tehtävä kaikille.
   * Kaksi erillistä elävää aluetta puhuisi päälle. */
  var rivi = document.createElement('p');
  rivi.className = 'keittio__tehtava';
  rivi.setAttribute('aria-live', 'polite');
  rivi.innerHTML = '<span class="vain-ruudunlukijalle"></span><span class="keittio__teksti"></span>';
  var lause = rivi.firstChild, teksti = rivi.lastChild;
  k.appendChild(rivi);

  k.removeAttribute('role');
  k.removeAttribute('aria-label');
  k.setAttribute('role', 'group');
  k.setAttribute('aria-label', sana('otsikko'));
  k.classList.add('keittio');

  /* ── Tila ─────────────────────────────────────────────────────────── */
  function pura(s) {
    var m = s.match(/^(\w+)(?:([-+*/])(\w+))?$/);
    return { a: m[1], op: m[2] || '/', b: m[3] === undefined ? TYHJA : m[3] };
  }
  var tila = pura(k.getAttribute('data-alku'));
  var valitsin = null, valittuPaikka = null, naytosKello = null;
  var koskettu = false, vaihe = 0, siirtymassa = false, tuoreVaihe = true;

  function kuva(arvo) {
    return kuvatie + (arvo === TYHJA ? 'tausta-tayte' : 'tayte-' + arvo) + '.webp';
  }
  function nimi(arvo) {
    return arvo === 'x' ? 'X' : (arvo === TYHJA ? sana('eikorttia') : arvo);
  }

  function piirra(liikkuu) {
    var apinanTapa = (vaihe === 2);
    var r = ratkaise(tila.a, tila.op, tila.b, apinanTapa);
    var m = MERKIT[tila.op].nayta;
    var yksi = (tila.b === TYHJA);

    [[pA, tila.a, 0], [pB, tila.b, 1]].forEach(function (p) {
      var nappi = p[0], arvo = p[1], img = nappi.querySelector('img');
      var uusi = kuva(arvo);
      if (img.getAttribute('src') !== uusi) {
        img.setAttribute('src', uusi);
        if (liikkuu) { nappi.classList.remove('saapuu'); void nappi.offsetWidth; nappi.classList.add('saapuu'); }
      }
      nappi.classList.toggle('tyhja', arvo === TYHJA);
      nappi.setAttribute('aria-label', sana('vaihda') + ': ' + nimi(arvo));
      var x = nappi.querySelector('.keittio__xarvo');
      x.hidden = !(arvo === 'x' && r.arvot);
      x.textContent = x.hidden ? '' : r.arvot[p[2]];
    });

    laskin.innerHTML = '<b>' + m + '</b>';
    laskin.setAttribute('aria-label', sana('merkki') + ': ' + m);
    laskin.classList.toggle('piilossa', yksi);

    k.classList.toggle('valmis', r.osuu);
    var arvo = r.tulos ? tulosTekstina(r.tulos) : '';
    var naytaArvo = !r.osuu && r.syy === 'lasku' && arvo !== '';
    tulos.innerHTML = '<b>' + (r.osuu ? '=' : '≠') + '</b>' +
      (naytaArvo ? '<i>' + arvo + '</i>' : '');

    /* Fantasiakortti luetaan muodossa «X (2)». */
    var osa = function (v, n) { return v === 'x' && r.arvot ? 'X (' + r.arvot[n] + ')' : nimi(v); };
    var lasku = osa(tila.a, 0) + (yksi ? '' : ' ' + m + ' ' + osa(tila.b, 1));
    lause.textContent = lasku + (arvo !== '' ? ' = ' + arvo : '') + ' — ' +
      sana(r.osuu ? 'valmis' : 'ei') + '. ';
    kerro(r);
    if (r.osuu && liikkuu) isku();
    if (r.osuu && !siirtymassa && (vaihe === 1 || vaihe === 2)) eteenpain();
  }

  /* Näkyvä rivi: mitä tapaa harjoitellaan ja miksi tämä ei kelvannut.
   * ⚠️ Tapa sanotaan AINA ääneen. Juuri siitä sekaannus syntyi pelissä: sama
   * käyttöliittymä palveli hiljaa kahta eri sääntöä. */
  function kerro(r) {
    if (siirtymassa) return;
    if (vaihe === 3) {
      if (!teksti.querySelector('a')) {
        teksti.innerHTML = '';
        var a = document.createElement('a');
        a.href = PELI;
        a.className = 'keittio__peli';
        a.textContent = sana('peli');
        teksti.appendChild(a);
      }
      return;
    }
    var s = (vaihe === 2) ? sana('tee_basso') : sana('tee_helppo');
    /* ⚠️ Vihje vasta lukijan omasta siirrosta, ei heti vaiheen alkaessa.
     * Basson harjoitus ALKAA tilasta, joka kaatuu täytteiden määrään, joten
     * pelkkä vihje olisi ensimmäinen asia jonka lukija näkee — eikä hän saisi
     * koskaan tietää, KUMPAA tapaa hän harjoittelee. Juuri se hiljaisuus oli
     * pelin opetuskierroksen syy. Tehtävä ensin, vihje vastaukseksi. */
    if (vaihe === 2 && !tuoreVaihe && r && r.syy === 'maara') s = sana('maara');
    if (teksti.textContent !== s) teksti.textContent = s;
  }

  function eteenpain() {
    siirtymassa = true;
    teksti.textContent = sana('hienoa');
    k.classList.add('hienoa');
    setTimeout(function () {
      k.classList.remove('hienoa');
      siirtymassa = false;
      if (vaihe === 1) { vaihe = 2; tila = pura(HARJOITUS[1]); }
      else { vaihe = 3; }
      tuoreVaihe = true;
      piirra(true);
    }, 1300);
  }

  /* Isku: täytekortit lyödään pizzan päälle, kuten oikeassa pelissä. Matka
   * mitataan elementeistä, koska korttien koko on clamp()-sidottu. */
  function isku() {
    if (k.classList.contains('isku')) return;
    var p = pizza.getBoundingClientRect();
    [[pA, -4], [pB, 5]].forEach(function (o) {
      var r = o[0].getBoundingClientRect();
      o[0].style.setProperty('--isku-x', (p.left - r.left + (p.width - r.width) / 2) + 'px');
      o[0].style.setProperty('--isku-y', (p.top - r.top + (p.height - r.height) / 2) + 'px');
      o[0].style.setProperty('--isku-kulma', o[1] + 'deg');
    });
    k.classList.add('isku');
    setTimeout(function () { k.classList.remove('isku'); }, 1500);
  }

  /* ── Täytevalitsin ─────────────────────────────────────────────────
   * Rakennetaan vasta ensimmäisellä avauksella, jotta kuvia ei haeta turhaan.
   * «Ei korttia» on mukana, koska pizzan saa tehdä yhdelläkin kortilla — ja
   * juuri siinä helpompi tapa ja Basson tapa eroavat. */
  function avaa(nappi) {
    if (!valitsin) {
      valitsin = document.createElement('div');
      valitsin.className = 'keittio__valitsin';
      valitsin.innerHTML = TAYTTEET.concat([TYHJA]).map(function (v) {
        return '<button type="button" data-arvo="' + v + '" aria-label="' + nimi(v) + '"' +
          (v === TYHJA ? ' class="keittio__tyhja"' : '') +
          '><img src="' + kuva(v) + '" width="240" height="364" alt=""></button>';
      }).join('');
      k.appendChild(valitsin);
      valitsin.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-arvo]');
        if (!b) return;
        seis();
        tila[valittuPaikka === pA ? 'a' : 'b'] = b.getAttribute('data-arvo');
        sulje(true);
        piirra(true);
      });
    }
    /* Ensimmäisestä paikasta ei saa ottaa korttia pois: lasku tarvitsee luvun. */
    valitsin.classList.toggle('ei-tyhjaa', nappi === pA);
    valitsin.hidden = false;
    valittuPaikka = nappi;
    nappi.setAttribute('aria-expanded', 'true');
    var oma = (nappi === pA) ? tila.a : tila.b;
    valitsin.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-arvo') === oma));
    });
  }
  function sulje(palauta) {
    if (!valitsin || valitsin.hidden) return;
    valitsin.hidden = true;
    pA.setAttribute('aria-expanded', 'false');
    pB.setAttribute('aria-expanded', 'false');
    if (palauta && valittuPaikka) valittuPaikka.focus();
    valittuPaikka = null;
  }

  /* ── Käyttö ────────────────────────────────────────────────────────── */
  k.addEventListener('click', function (e) {
    if (e.target.closest('.keittio__peli')) return;      /* linkki saa toimia */
    var p = e.target.closest('.keittio__paikka');
    if (p) { seis(); (valitsin && !valitsin.hidden && valittuPaikka === p) ? sulje(false) : avaa(p); return; }
    if (e.target.closest('.keittio__laskin')) {
      seis();
      tila.op = MERKKIJONO[(MERKKIJONO.indexOf(tila.op) + 1) % MERKKIJONO.length];
      piirra(true);
    }
  });
  document.addEventListener('click', function (e) { if (!k.contains(e.target)) sulje(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') sulje(true); });

  /* ── Näytös ────────────────────────────────────────────────────────
   * Kaksi laskua samalle pizzalle, kerran kun lohko tulee ruudulle. Sen
   * jälkeen vuoro on lukijalla. Loppuu heti kun lukija koskee keittiöön —
   * ⚠️ `koskettu` eikä pelkkä kellon pysäytys, koska näytös alkaa vasta kun
   * korttikuvat on haettu ja lukija ehtii koskea ennen sitä. */
  function seis() {
    koskettu = true;
    tuoreVaihe = false;
    if (naytosKello) { clearInterval(naytosKello); naytosKello = null; }
    if (vaihe === 0 && !siirtymassa) { vaihe = 1; kerro(null); }
  }
  function naytos() {
    if (koskettu) return;
    var i = 0;
    naytosKello = setInterval(function () {
      if (document.hidden) return;
      if (i === NAYTOS.length) {            /* näytös ohi: vuoro lukijalle */
        clearInterval(naytosKello); naytosKello = null;
        vaihe = 1; tila = pura(HARJOITUS[0]); piirra(true);
        return;
      }
      tila = pura(NAYTOS[i++]);
      piirra(true);
    }, 1900);
  }

  piirra(false);

  var hidas = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!hidas && window.IntersectionObserver) {
    var vahti = new IntersectionObserver(function (osat) {
      if (!osat[0].isIntersecting) return;
      vahti.disconnect();
      var jono = NAYTOS.concat(HARJOITUS).join(',').split(/[-+*/,]/)
        .filter(function (v, i, a) { return v !== '' && a.indexOf(v) === i; });
      var jaljella = jono.length;
      jono.forEach(function (v) {
        var i = new Image();
        i.onload = i.onerror = function () {
          if (--jaljella === 0 && !naytosKello && !koskettu) naytos();
        };
        i.src = kuva(v);
      });
    }, { threshold: .55 });
    vahti.observe(k);
  }
})();
