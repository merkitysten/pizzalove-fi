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
   ║  PIZZAKEITTIÖ — asuu kolmen portaan SISÄLLÄ ja siirtyy portaasta      ║
   ║  toiseen, joten harjoiteltavan tavan nimi on aina otsikkona ylällä    ║
   ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Marko 16.11.2026: «Sivulla kun mennään eteenpäin niin tulee uudelleen
 * jotain näitä eri tapoja valmistaa pizzoja. Nämä pitäisi olla siinä kun
 * niitä pizzoja valmistetaan interaktiivisesti. Eli nyt on taas sellaista
 * ihan paskaa tämä touhu, että vähän jotain tehdään, mutta kokonaisuudesta
 * tulee sekava ja laastaria laastarin päälle -vaikutelma.»
 *
 * Siksi keittiö ei ole enää oma lohkonsa esimerkin vieressä vaan se on
 * portaiden sisällä: se syntyy portaan 1 sisään, ja kun lukija läpäisee
 * portaan, keittiö SIIRTYY seuraavan portaan sisään. Mitään «kumpaa tapaa
 * harjoittelet» ei tarvitse sanoa erikseen — se lukee otsikossa.
 *
 * ⚠️ KOLME PORRASTA OVAT KASVAVA VAATIMUS, EIVÄT KOLME SAMANLAISTA:
 *     1  lukija keksii LASKUN
 *     2  lukija keksii laskun RAJOITTEELLA (eri arvoja = täytteiden määrä)
 *     3  lukija TUNNISTAA oikeat täytteet — laskua ei tarvita, koska pizzan
 *        arvo ON täytteidensä summa, joten se osuu itsestään
 * Kolmas ei siis ole laskusääntö, eikä sitä saa vääntää sellaiseksi.
 *
 * ⚠️ ARITMETIIKKA ON PELIN OMA. `laske()`, `osuuko()` ja `tulosTekstina()`
 * tulevat tiedostosta julkinen/play/laskin.js, jonka rakenna.py lataa tälle
 * sivulle ENNEN tätä tiedostoa. Jos sitä ei ole, keittiötä ei rakenneta
 * lainkaan: portaat jäävät tekstiksi, joka on itsessään täysi sisältö.
 *
 * ⚠️ YKSI TARKISTIN, TAPA PARAMETRINA. `tarkista(arvot, merkki, tapa)`.
 * Portaat 1 ja 2 ovat pelin oma sääntö (peli.js:1205, basso.js:396).
 * Porras 3 on sivun oma haara, koska peli ei toteuta Pizza Lovea lainkaan
 * (haettu julkinen/play/*.js:stä: ei löydy). Sen sääntö on painetun arkin
 * ja `korttipeli.portaat`-datan mukainen: korttien arvot ovat tasan pizzan
 * omat täytteet. Älä kirjoita toista tarkistinta.
 *
 * ⚠️ Ilman JavaScriptiä portaat ovat tavallinen numeroitu lista, jossa on
 * jokaisen tavan teksti, pelit ja esimerkit. Keittiö on lisä, ei ehto.
 *
 * ⚠️ prefers-reduced-motion: näytöstä ei ajeta ja CSS pysäyttää animaatiot.
 * Harjoitus ei ole liikettä, joten se jää.
 */
(function () {
  var lista = document.querySelector('.portaat[data-pizza][data-sana-vaihda]');
  if (!lista) return;
  if (typeof laske !== 'function' || typeof osuuko !== 'function') return;
  var portaat = lista.querySelectorAll('.porras');
  if (!portaat.length) return;

  var TAVOITE   = parseInt(lista.getAttribute('data-pizza'), 10);
  var TAYTTEITA = parseInt(lista.getAttribute('data-taytteita'), 10);
  var OMAT      = lista.getAttribute('data-pizzataytteet').split(',').map(Number);
  var TAYTTEET  = lista.getAttribute('data-taytteet').split(',');
  var NAYTOS    = lista.getAttribute('data-naytos').split(',');
  var HARJOITUS = lista.getAttribute('data-harjoitus').split(',');
  var KUVAT     = lista.getAttribute('data-kuvat');
  var PIZZAKUVA = lista.getAttribute('data-pizzakuva');
  var PELI      = lista.getAttribute('data-peli');
  var sana = function (n) { return lista.getAttribute('data-sana-' + n); };

  /* Näytettävä merkki on sivun oma («4 + 1, 6 – 1, 2 + 3 tai 10 : 2»),
   * laskimelle annettava on pelin oma (+ − × ÷). Avain on ASCII. */
  var MERKIT = {
    '+': { nayta: '+',      laske: '+' },
    '-': { nayta: '–', laske: '−' },
    '*': { nayta: '×', laske: '×' },
    '/': { nayta: ':',      laske: '÷' }
  };
  var MERKKIJONO = ['+', '-', '*', '/'];
  var TYHJA = '-';

  /* ── Sääntö: yksi tarkistin, porras parametrina ────────────────────── */
  function eriArvoja(arvot) {
    var n = {};
    arvot.forEach(function (v) { n[v] = true; });
    return Object.keys(n).length;
  }
  /* Kolmannen portaan sääntö: TASAN yksi kortti kutakin pizzan täytettä.
   *
   * ⚠️ «Ei ylimääräisiä samoja» on Markon päätös 16.11.2026, ei oletus:
   * «Valitaan nyt tuo ei, koska niin sitä on pelattu.» Kysymys oli, kelpaako
   * tomaatti-ananaspizzaan tomaatti + tomaatti + ananas. Ei kelpaa.
   * Älä siis löysää tätä myöhemmin «koska summa osuu silti».
   *
   * ⛔ Marko heitti samassa yhteydessä pelimekaanisen idean: «Periaatteessa
   * voisi kai pelata niinkin, että samaa täytettä voi laittaa useamman,
   * jolloin saisi omaa kättä enemmän tyhjäksi.» Se EI ole tämän tavan
   * tarkennus vaan erillinen idea, ja se on kirjattu päätöslokiin omanaan.
   * Älä toteuta sitä tänne äläkä «korjaa» tätä sen suuntaan.
   *
   * 📐 Pizzan täytteet ovat aina eri arvoja (kortit.js `osajoukot()` kävelee
   * kasvavasti), joten pizzan puolella joukko riittää; monijoukko tarvitaan
   * vain lukijan korteille. Kolmannessa portaassa «ei korttia» on siksi
   * piilotettu valitsimesta: kortteja on aina yhtä monta kuin täytteitä.
   *
   * 📐 Mitattu ajamalla: 2 + 2 ei kelpaa · 4 + 1 = 5 ei kelpaa (summa osuu,
   * täytteet väärät) · 3 + 2 kelpaa (järjestyksellä ei väliä). */
  function samatTaytteet(arvot) {
    if (arvot.length !== OMAT.length) return false;
    var a = arvot.slice().sort(), b = OMAT.slice().sort();
    return a.every(function (v, i) { return v === b[i]; });
  }
  function tarkista(arvot, merkki, porras) {
    /* Porras 3: täytteet ratkaisevat, ei lasku. Pizzan arvo on täytteidensä
     * summa, joten oikeilla täytteillä lasku osuu itsestään. */
    var tok = [{ arvo: arvot[0] }];
    if (arvot.length > 1) tok.push(MERKIT[merkki].laske, { arvo: arvot[1] });
    var t = laske(tok);
    /* Porras 3 ratkeaa täytteistä, mutta lasku lasketaan silti, jotta
     * ruudunlukijan lause on kokonainen («10 + 2 = 12 — ei valmistu»).
     * Arvoa EI näytetä ≠-merkin vieressä, koska vika ei ole laskussa. */
    if (porras === 3) {
      return samatTaytteet(arvot) ? { osuu: true, syy: null, tulos: t }
                                  : { osuu: false, syy: 'taytteet', tulos: t };
    }
    if (!osuuko(t, TAVOITE)) return { osuu: false, syy: 'lasku', tulos: t };
    if (porras === 2 && eriArvoja(arvot) !== TAYTTEITA) return { osuu: false, syy: 'maara', tulos: t };
    return { osuu: true, syy: null, tulos: t };
  }
  /* Fantasiatäyte X on «mikä tahansa täyte 1–10, pelaaja valitsee»: sitä ei
   * lasketa vaan ratkaistaan, samalla tarkistimella. */
  function ratkaise(a, merkki, b, porras) {
    var kortit = (b === TYHJA) ? [a] : [a, b];
    var xt = kortit.map(function (v) { return v === 'x'; });
    if (!xt.some(Boolean)) {
      var r = tarkista(kortit.map(Number), merkki, porras);
      r.arvot = kortit.map(Number);
      return r;
    }
    var paras = null;
    for (var i = 1; i <= 10; i++) {
      for (var j = 1; j <= 10; j++) {
        var arvot = kortit.map(function (v, n) { return v === 'x' ? (n ? j : i) : Number(v); });
        var t = tarkista(arvot, merkki, porras);
        if (t.osuu) { t.arvot = arvot; return t; }
        if (!paras) { paras = t; paras.arvot = null; }
        if (!xt[1]) break;
      }
      if (!xt[0]) break;
    }
    return paras;
  }

  /* ── Rakenne ───────────────────────────────────────────────────────── */
  function kortti(nimi) {
    return '<img src="' + KUVAT + nimi + '.webp" width="240" height="364" alt="">';
  }
  function nuoli() {
    return '<span class="keittio__nuoli" aria-hidden="true"><svg viewBox="0 0 12 12">' +
      '<path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
      '<span class="keittio__xarvo" aria-hidden="true" hidden></span>';
  }
  var k = document.createElement('div');
  k.className = 'esimerkki keittio liike';
  k.setAttribute('role', 'group');
  k.setAttribute('aria-label', sana('otsikko'));
  k.innerHTML =
    '<img class="keittio__pizza" src="' + KUVAT + PIZZAKUVA + '.webp" width="240" height="364" alt="">' +
    '<span class="keittio__tulos" aria-hidden="true"><b>=</b></span>' +
    '<button type="button" class="keittio__paikka" aria-haspopup="true" aria-expanded="false">' +
      kortti('tayte-10') + nuoli() + '</button>' +
    '<button type="button" class="keittio__laskin"><b>:</b></button>' +
    '<button type="button" class="keittio__paikka" aria-haspopup="true" aria-expanded="false">' +
      kortti('tayte-2') + nuoli() + '</button>' +
    '<p class="keittio__tehtava" aria-live="polite">' +
      '<span class="vain-ruudunlukijalle"></span><span class="keittio__teksti"></span></p>';
  var pizza   = k.querySelector('.keittio__pizza');
  var paikat  = k.querySelectorAll('.keittio__paikka');
  var pA = paikat[0], pB = paikat[1];
  var tulos   = k.querySelector('.keittio__tulos');
  var laskin  = k.querySelector('.keittio__laskin');
  var lause   = k.querySelector('.vain-ruudunlukijalle');
  var teksti  = k.querySelector('.keittio__teksti');

  /* ── Tila ─────────────────────────────────────────────────────────── */
  function pura(s) {
    var m = s.match(/^(\w+)(?:([-+*/])(\w+))?$/);
    return { a: m[1], op: m[2] || '/', b: m[3] === undefined ? TYHJA : m[3] };
  }
  var tila = pura(lista.getAttribute('data-alku'));
  var valitsin = null, valittuPaikka = null, naytosKello = null;
  var koskettu = false, porras = 0, siirtymassa = false;

  function kuva(arvo) {
    return KUVAT + (arvo === TYHJA ? 'tausta-tayte' : 'tayte-' + arvo) + '.webp';
  }
  function nimi(arvo) {
    return arvo === 'x' ? 'X' : (arvo === TYHJA ? sana('eikorttia') : arvo);
  }
  /* Keittiö siirtyy sen portaan sisään, jota harjoitellaan. Porras 0 =
   * näytös, joka ajetaan portaan 1 sisällä. */
  function asetaPortaaseen(n) {
    var kohde = portaat[Math.max(0, n - 1)] || portaat[0];
    if (k.parentNode === kohde) return;
    kohde.appendChild(k);
    for (var i = 0; i < portaat.length; i++) {
      portaat[i].classList.toggle('porras--tassa', portaat[i] === kohde);
    }
  }

  function piirra(liikkuu) {
    /* ⚠️ Rajattava: viimeisen portaan jälkeen `porras` kasvaa yli listan, ja
     * ilman rajausta tarkistin saisi olemattoman portaan numeron. */
    var tapa = Math.min(Math.max(porras, 1), portaat.length);
    var r = ratkaise(tila.a, tila.op, tila.b, tapa);
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
    /* Kolmannessa portaassa laskumerkki ei ole osa tehtävää: täytteet
     * ratkaisevat ja summa osuu itsestään. Siksi merkki on kiinteä. */
    laskin.disabled = (tapa === 3);
    laskin.classList.toggle('piilossa', yksi);

    k.classList.toggle('valmis', r.osuu);
    var arvo = r.tulos ? tulosTekstina(r.tulos) : '';
    var naytaArvo = !r.osuu && r.syy === 'lasku' && arvo !== '';
    tulos.innerHTML = '<b>' + (r.osuu ? '=' : '≠') + '</b>' +
      (naytaArvo ? '<i>' + arvo + '</i>' : '');

    var osa = function (v, n) { return v === 'x' && r.arvot ? 'X (' + r.arvot[n] + ')' : nimi(v); };
    var lasku = osa(tila.a, 0) + (yksi ? '' : ' ' + m + ' ' + osa(tila.b, 1));
    lause.textContent = lasku + (arvo !== '' ? ' = ' + arvo : '') + ' — ' +
      sana(r.osuu ? 'valmis' : 'ei') + '. ';
    kerro(r);
    if (r.osuu && liikkuu) isku();
    /* ⚠️ Vain niin kauan kuin portaita on jäljellä. Ilman tätä viimeisen
     * portaan läpäisy käynnistäisi siirtymän uudelleen joka piirrolla —
     * mitattu: «Hienoa!» jäi päälle eikä linkki peliin ilmestynyt koskaan. */
    if (r.osuu && !siirtymassa && porras >= 1 && porras <= portaat.length) eteenpain();
  }

  /* Näkyvä rivi. ⚠️ Tapaa EI sanota täällä: se on portaan otsikkona keittiön
   * yläpuolella, koska keittiö on portaan sisällä. Tässä kerrotaan vain mikä
   * meni ohi — ja vasta lukijan omasta siirrosta, ei heti portaan alkaessa. */
  function kerro(r) {
    if (siirtymassa) return;
    if (porras > portaat.length) {
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
    var s = sana('tee');
    if (koskettu && r && (r.syy === 'maara' || r.syy === 'taytteet')) s = sana(r.syy);
    if (teksti.textContent !== s) teksti.textContent = s;
  }

  function eteenpain() {
    siirtymassa = true;
    teksti.textContent = sana('hienoa');
    k.classList.add('hienoa');
    setTimeout(function () {
      k.classList.remove('hienoa');
      siirtymassa = false;
      porras += 1;
      koskettu = false;                       /* vihje vasta uudesta siirrosta */
      if (porras <= portaat.length) {
        asetaPortaaseen(porras);
        tila = pura(HARJOITUS[porras - 1]);
        if (porras === 3) tila.op = '+';       /* kolmannessa summa, kiinteä */
      }
      piirra(true);
      if (porras <= portaat.length) k.scrollIntoView({ block: 'center' });
    }, 1300);
  }

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

  /* ── Täytevalitsin: rakennetaan vasta ensimmäisellä avauksella ─────── */
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
    /* Ensimmäisestä paikasta ei saa ottaa korttia pois: lasku tarvitsee luvun.
     * Kolmannessa portaassa kortteja on aina kaksi, koska pizzassa on kaksi
     * täytettä — tyhjä paikka ei voi koskaan kelvata. */
    valitsin.classList.toggle('ei-tyhjaa', nappi === pA || porras === 3);
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
    if (e.target.closest('.keittio__peli')) return;
    var p = e.target.closest('.keittio__paikka');
    if (p) { seis(); (valitsin && !valitsin.hidden && valittuPaikka === p) ? sulje(false) : avaa(p); return; }
    if (e.target.closest('.keittio__laskin') && !laskin.disabled) {
      seis();
      tila.op = MERKKIJONO[(MERKKIJONO.indexOf(tila.op) + 1) % MERKKIJONO.length];
      piirra(true);
    }
  });
  document.addEventListener('click', function (e) { if (!k.contains(e.target)) sulje(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') sulje(true); });

  /* ── Näytös: kaksi laskua portaan 1 sisällä, sitten vuoro on lukijalla ── */
  function seis() {
    koskettu = true;
    if (naytosKello) { clearInterval(naytosKello); naytosKello = null; }
    if (porras === 0 && !siirtymassa) porras = 1;
  }
  function naytos() {
    if (koskettu) return;
    var i = 0;
    naytosKello = setInterval(function () {
      if (document.hidden) return;
      if (i === NAYTOS.length) {
        clearInterval(naytosKello); naytosKello = null;
        porras = 1; tila = pura(HARJOITUS[0]); piirra(true);
        return;
      }
      tila = pura(NAYTOS[i++]);
      piirra(true);
    }, 1900);
  }

  asetaPortaaseen(1);
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
