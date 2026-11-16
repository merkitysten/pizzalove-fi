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
 *    Kaksi sisäänkäyntiä, YKSI mekanismi (pyyda()):
 *    a) banneri sivun yläreunassa, jos selaimen kieltä ei ole sivustolla;
 *    b) kielivalikon viimeinen rivi «Ei kieltäsi? Pyydä se», joka avaa
 *       hakemiston: ehdotus puhelimen kielestä ensin, sitten kaikki kielet
 *       lipuin ja maittain (Marko: «Onko siellä joku hakemisto maittain ja
 *       liputtain? Ehkä pitäisi olla. Tai siis pitäisikin.»).
 *
 *    Nappi lähettää pelkän kielikoodin palvelimelle, joka käynnistää GitHubin
 *    konekäännösajon (käännös, oma sivu ja arkki samalla kertaa). Ei
 *    sähköpostikenttää, ei evästettä, ei talletusta. Sivu kysyy puolen minuutin
 *    välein, onko uusi sivu jo julkaistu, ja näyttää linkin heti kun on.
 *
 *    ⚠️ Oikealta vasemmalle kirjoitettavia kieliä ei vielä tueta (peilattu
 *    asettelu puuttuu). Niille ei kysytä bannerissa, ja hakemistossa ne NÄKYVÄT
 *    merkittynä: hiljaa katoava kieli olisi lukijalle huonompi kuin merkitty.
 *
 *    📐 Testattavuus (Marko 16.11.2026: «Minun pitäisi päästä tätä
 *    testaamaan»): bannerin näkee millä tahansa selaimella osoitteen perään
 *    lisätyllä ?pyynto=xx. Hakemisto toimii aina, myös suomalaisella selaimella.
 */
(function () {
  var html = document.documentElement;
  var osoite = html.getAttribute('data-pyynto');
  if (!osoite) return;
  var SIVU = '/%s/card-game.html';
  /* Oikealta vasemmalle: kaanna.py torjuu nämä kirjoitusjärjestelmän
     perusteella. Selain ei tiedä kirjoitusjärjestelmää, joten tässä ovat
     kielet; hakemiston riveillä (kielet.json) tieto tulee kaanna.py:n omasta
     OIKEALTA_VASEMMALLE-joukosta. */
  var EI_VIELA = ['ar', 'he', 'iw', 'fa', 'ur', 'yi', 'ps', 'sd', 'ug', 'dv', 'ckb'];

  function koodi(l) {
    l = String(l || '').toLowerCase(); var p = l.split('-');
    if (p[0] === 'zh') return /hant|-tw|-hk|-mo/.test(l) ? 'zh-hant' : 'zh-hans';
    if (p[0] === 'pt' && p[1] === 'br') return 'pt-br';
    if (p[0] === 'no' || p[0] === 'nn') return 'nb';
    return p[0];
  }
  function kelpaa(k) { return /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/.test(k); }
  function tuettu(k) { return EI_VIELA.indexOf(k.split('-')[0]) < 0; }
  function nimi(k, oma) {
    try { return new Intl.DisplayNames([oma || k], { type: 'language' }).of(k) || k; } catch (_) { return k; }
  }

  /* Sivuston omat kielet luetaan kielivalikosta, ei toisesta listasta: linkki ja
     lippu ovat jo siellä valmiina (rakenna.py ylaosa()). */
  var olemassa = {};
  Array.prototype.forEach.call(document.querySelectorAll('.kielet__lista a[lang]'), function (a) {
    var kuva = a.querySelector('img');
    olemassa[a.getAttribute('lang')] = { osoite: a.getAttribute('href'),
                                         lippu: kuva ? kuva.getAttribute('src') : '' };
  });

  /* ---------------------------------------------------------------- tekstit */
  /* ⚠️ KAIKKI pyynnön tekstit tulevat kielivalikon rivin data-attribuuteista
     (rakenna.py ylaosa(), sisalto/xx.json «ui»), ei tästä tiedostosta.
     📐 Marko 16.11.2026 näki suomenkielisen otsikon ja englanninkielisen
     vahvistuksen samassa ikkunassa: kieli vaihtui kesken lauseen, koska
     vahvistus oli kovakoodattuna tänne. Oletukset alla ovat varalta, jos rivi
     puuttuu (konekäännöskieli ennen seuraavaa täydennysajoa). */
  var painike = document.querySelector('.kielet [data-valitsin]');
  function teksti(nimi, oletus) {
    var v = painike && painike.getAttribute('data-' + nimi);
    return v || oletus;
  }
  var T = {
    otsikko: teksti('otsikko', 'All languages'),
    haku: teksti('haku', 'Search for a language'),
    pyyda: teksti('pyyda', 'Request'),
    eituettu: teksti('eituettu', 'Not supported yet'),
    tekeillaLyhyt: teksti('tekeillalyhyt', 'In progress'),
    sulje: teksti('sulje', 'Close'),
    kysymys: teksti('kysymys', 'Want the Pizza Love card game rules in %s?'
                    + ' We’ll make them now – machine-translated, free.'),
    kylla: teksti('kylla', 'Yes, please'),
    tekeilla: teksti('tekeilla', 'Thank you! We’re making the rules in %s.'
                     + ' It usually takes about three minutes, and the link will appear here.'
                     + ' You can also close this – the language will appear in the language'
                     + ' menu when it’s ready.'),
    avaaSaannot: teksti('avaa', 'Open the rules in %s'),
    kone: teksti('kone', '(machine translation – corrections welcome)'),
    eiOnnistunut: teksti('eionnistunut', 'That didn’t work this time.'
                         + ' Please try again later or write to info@merkitysten.fi.')
  };
  function korvaa(s, n) { return s.replace('%s', n); }

  /* ---------------------------------------------------------------- pyyntö */
  /* Yksi mekanismi, kaksi sisäänkäyntiä. tila(mitä, sivu): 'tekeillä' heti kun
     ajo on käynnissä, 'valmis' kun sivu vastaa, 'virhe' jos ei onnistunut.

     ⚠️ EPÄONNISTUMISEN ON TAVOITETTAVA PYYTÄJÄ. 📐 Mitattu 16.11.2026
     GitHubin julkisesta rajapinnasta: yhdeksästä konekäännösajosta onnistui
     kuusi ja KAATUI KOLME (33 %). Onnistuneen kesto: mediaani 3,1 min,
     vaihteluväli 2,4–5,1 min. Aiemmin kaatunut ajo ei näkynyt pyytäjälle
     mitenkään: sivu kysyi 25 minuuttia tyhjään ja vaikeni. Marko odotti
     hindiä yli 20 minuuttia saamatta mitään.

     Nyt: ODOTUS kertoo kymmenen minuutin kohdalla rehellisesti, ettei tämä
     onnistunut (kaksi kertaa pisin mitattu onnistuminen), MUTTA kysely jatkuu
     hiljaa 25 minuuttiin asti — jos sivu ilmestyy myöhemmin, linkki tulee
     silti näkyviin. Ei palvelinmuutosta: palvelin ei tiedä ajon tilaa. */
  var KYSELYVALI = 30000, LUOVUTUS = 10 * 60 * 1000, LOPETUS = 25 * 60 * 1000;
  function pyyda(k, tila) {
    var sivu = SIVU.replace('%s', k), kerrottu = false;
    function odota(alku) {
      fetch(sivu, { method: 'HEAD', cache: 'no-store' }).then(function (r) {
        if (r.ok) return tila('valmis', sivu);
        jatka(alku);
      }).catch(function () { jatka(alku); });
    }
    function jatka(alku) {
      var kulunut = Date.now() - alku;
      if (kulunut >= LUOVUTUS && !kerrottu) { kerrottu = true; tila('virhe', sivu); }
      if (kulunut < LOPETUS) setTimeout(function () { odota(alku); }, KYSELYVALI);
    }
    fetch(osoite, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ kieli: k }) })
      .then(function (r) { return r.json(); })
      .then(function (v) {
        if (v.tila === 'valmis') return tila('valmis', sivu);
        if (v.tila !== 'aloitettu' && v.tila !== 'tekeillä') throw new Error(v.virhe || 'virhe');
        tila('tekeillä', sivu);
        odota(Date.now());
      })
      .catch(function () { tila('virhe', sivu); });
  }

  /* ?pyynto=xx: Marko näkee bannerin ja hakemiston ehdotuksen omalla
     selaimellaan (Marko 16.11.2026: «Minun pitäisi päästä tätä testaamaan»).
     Ei ohita sitä, että olemassa olevalle kielelle ei kysytä. */
  var pakko = (location.search.match(/[?&]pyynto=([A-Za-z0-9-]{2,12})/) || [])[1];
  function selaimenKieli() {
    return koodi(pakko || (navigator.languages && navigator.languages[0]) || navigator.language);
  }

  /* ---------------------------------------------------------------- banneri */
  (function () {
    var k = selaimenKieli();
    if (!kelpaa(k) || olemassa[k] || !tuettu(k)) return;
    var n = nimi(k);
    var main = document.getElementById('sisalto');
    if (!main) return;
    var laatikko = document.createElement('div');
    laatikko.className = 'kielipyynto';
    laatikko.setAttribute('role', 'region');
    laatikko.setAttribute('aria-label', 'Pizza Love · ' + n);
    var kappale = document.createElement('p');
    var nimilohko = document.createElement('b'); nimilohko.lang = k; nimilohko.textContent = n;
    var osat = T.kysymys.split('%s');
    kappale.append(osat[0], nimilohko, osat[1] || '');
    var nappi = document.createElement('button');
    nappi.className = 'nappi'; nappi.type = 'button'; nappi.textContent = T.kylla;
    var sulje = document.createElement('button');
    sulje.className = 'kielipyynto__sulje'; sulje.type = 'button';
    sulje.setAttribute('aria-label', T.sulje); sulje.textContent = '×';
    sulje.onclick = function () { laatikko.remove(); };
    laatikko.append(kappale, nappi, sulje);
    main.insertBefore(laatikko, main.firstChild);
    nappi.onclick = function () {
      nappi.disabled = true;
      pyyda(k, function (mita, sivu) {
        if (mita === 'valmis') {
          kappale.textContent = '';
          var a = document.createElement('a'); a.href = sivu; a.lang = k;
          a.textContent = korvaa(T.avaaSaannot, n);
          kappale.append(a, ' ' + T.kone);
          nappi.remove();
        } else if (mita === 'tekeillä') {
          kappale.textContent = korvaa(T.tekeilla, n);
          nappi.remove();
        } else {
          nappi.disabled = false;
          kappale.textContent = T.eiOnnistunut;
        }
      });
    };
  })();

  /* ------------------------------------------------------------- hakemisto */
  var avaa = painike;
  if (!avaa || !window.HTMLDialogElement) return;
  var sivunKieli = html.getAttribute('lang') || 'en';
  var dlg, kentta, lista, tila, ehdotus, rivit;

  function maa(a) {
    if (!a) return '';
    try { return new Intl.DisplayNames([sivunKieli], { type: 'region' }).of(a) || a; } catch (_) { return a; }
  }
  /* Haku osuu myös kielen nimeen sivun omalla kielellä: suomalainen lukija
     etsii «saksa», ei «Deutsch». Ei näytetä rivillä (rivi on sen kielen oma
     nimi), vain haussa. */
  function omallaKielella(k) {
    try { return new Intl.DisplayNames([sivunKieli], { type: 'language' }).of(k) || ''; } catch (_) { return ''; }
  }
  /* Lippuemoji maakoodista: sama maa, josta kaanna.py:n lippu() poimii arkin
     lipun — ei toista lippukarttaa, vain sama koodi toisin piirrettynä. Jos
     käyttöjärjestelmä ei piirrä lippuja (Windows), näkyviin jää maan kirjaimet,
     ja maan nimi on joka tapauksessa rivillä. */
  function emoji(a) {
    if (!a) return '';
    return String.fromCodePoint(0x1F1E6 + a.charCodeAt(0) - 65, 0x1F1E6 + a.charCodeAt(1) - 65);
  }
  function siisti(s) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function p(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function rivinSisus(r, m) {
    var on = olemassa[r[0]];
    var lippu = on && on.lippu
      ? '<img class="kielet__lippu" src="' + p(on.lippu) + '" width="20" height="20" alt="" decoding="async">'
      : '<span class="kielet__lippu kielet__lippu--emoji" aria-hidden="true">' + emoji(r[3]) + '</span>';
    return lippu + '<span class="valitsin__nimet"><span class="valitsin__nimi" lang="' + p(r[0]) + '">' +
           p(r[1]) + '</span>' + (m ? '<span class="valitsin__maa">' + p(m) + '</span>' : '') + '</span>';
  }

  function piirra(data) {
    var osat = [], haut = [];
    for (var i = 0; i < data.length; i++) {
      var r = data[i], k = r[0], m = maa(r[3]);
      /* Sivustolla jo olevalla kielellä on oma SVG-lippunsa (kielivalikosta).
         Sen maa ei aina ole CLDR:n yleisin maa — en.svg on Iso-Britannia,
         CLDR sanoo Yhdysvallat — joten maan nimeä ei näytetä noilla riveillä:
         kahden eri maan näyttäminen samalla rivillä olisi suoranainen virhe.
         Hakuun maa jää mukaan. */
      var sisus = rivinSisus(r, olemassa[k] && olemassa[k].lippu ? '' : m);
      // Haku osuu kielen omaan nimeen, englanninkieliseen nimeen, koodiin ja maahan.
      haut.push(siisti(k + ' ' + r[1] + ' ' + r[2] + ' ' + m + ' ' + omallaKielella(k)));
      if (olemassa[k]) {
        osat.push('<li class="valitsin__rivi valitsin__rivi--on"><a href="' + p(olemassa[k].osoite) +
                  '" hreflang="' + p(k) + '">' + sisus +
                  '<span class="valitsin__on" aria-hidden="true">✓</span></a></li>');
      } else if (r[4] || !tuettu(k)) {
        osat.push('<li class="valitsin__rivi valitsin__rivi--ei">' + sisus +
                  '<span class="valitsin__ei">' + p(T.eituettu) + '</span></li>');
      } else {
        osat.push('<li class="valitsin__rivi">' + sisus +
                  '<button type="button" class="nappi nappi--pieni" data-k="' + p(k) +
                  '" data-nimi="' + p(r[1]) + '" aria-label="' + p(T.pyyda + ': ' + r[1]) +
                  '">' + p(T.pyyda) + '</button></li>');
      }
    }
    lista.innerHTML = osat.join('');
    rivit = [];
    for (var j = 0; j < haut.length; j++) rivit.push({ el: lista.children[j], haku: haut[j] });
  }

  function suodata() {
    var h = siisti(kentta.value.trim());
    var nakyy = 0;
    for (var i = 0; i < rivit.length; i++) {
      var ok = !h || rivit[i].haku.indexOf(h) >= 0;
      rivit[i].el.hidden = !ok;
      if (ok) nakyy++;
    }
    lista.setAttribute('data-tyhja', nakyy ? '' : 'tyhja');
  }

  /* Rivin merkintä «Tekeillä»: nappi katoaa ja tilalle tulee merkki.
     🔵 Marko 16.11.2026: «siihen pitäisi tulla jokin sellainen pending tai
     pyydetty -teksti, jotta painaja ja myös muut tietävät, että tämä kieli on
     jo työnalla» + «nappi saisi myös vähän muuttaa väriä ja tyyliä».
     Merkki korvaa napin kokonaan: painettavan näköinen nappi, jota ei voi
     painaa, on huonompi kuin merkki, joka kertoo tilan. */
  function merkitseTekeilla(kohta) {
    var vanha = kohta.querySelector('button[data-k]');
    if (vanha) vanha.remove();
    if (kohta.querySelector('.valitsin__tekeilla')) return;
    var merkki = document.createElement('span');
    merkki.className = 'valitsin__tekeilla';
    merkki.textContent = T.tekeillaLyhyt;
    kohta.appendChild(merkki);
  }

  /* Pyyntö hakemistosta: rivin nappi vaihtuu tilaksi, ja valmistuessaan
     linkiksi — sama pyyda(), sama odotus, sama linkki kuin bannerissa. */
  function riviPyyda(nappi) {
    var k = nappi.getAttribute('data-k'), n = nappi.getAttribute('data-nimi') || nimi(k);
    var kohta = nappi.parentNode;
    merkitseTekeilla(kohta);
    tila.textContent = korvaa(T.tekeilla, n);
    pyyda(k, function (mita, sivu) {
      var merkki = kohta.querySelector('.valitsin__tekeilla');
      if (mita === 'valmis') {
        if (merkki) merkki.remove();
        var a = document.createElement('a');
        a.href = sivu; a.hreflang = k; a.className = 'valitsin__valmis';
        a.textContent = korvaa(T.avaaSaannot, n);
        kohta.appendChild(a);
        tila.textContent = korvaa(T.avaaSaannot, n) + ' ' + T.kone;
      } else if (mita === 'tekeillä') {
        tila.textContent = korvaa(T.tekeilla, n);
      } else {
        /* Epäonnistui: merkki pois ja nappi takaisin, jotta voi yrittää
           uudelleen. «Tekeillä» jäisi muuten valheeksi. */
        if (merkki) merkki.remove();
        if (!kohta.querySelector('button[data-k]')) kohta.appendChild(nappi);
        nappi.disabled = false;
        tila.textContent = T.eiOnnistunut;
      }
    });
  }

  /* «Myös muut tietävät» (Marko 16.11.2026): mitkä kielet ovat juuri nyt työn
     alla. Palvelin lukee tilan GitHubin ajoista — meille ei talleteta mitään,
     koska GitHubilla on se tieto jo valmiina. Jos palvelin ei osaa vastata
     (vanha versio tiedostosta), rivit jäävät merkitsemättä eikä mikään hajoa:
     puute näkyy puutteena, ei virheenä. */
  function merkitseTyonAlla() {
    fetch(osoite, { method: 'GET' }).then(function (r) {
      return r.ok ? r.json() : null;
    }).then(function (v) {
      var kielet = v && v.tekeilla;
      if (!kielet || !kielet.length) return;
      for (var i = 0; i < kielet.length; i++) {
        var k = String(kielet[i]).toLowerCase();
        if (!kelpaa(k) || olemassa[k]) continue;
        var nappi = lista.querySelector('button[data-k="' + k + '"]');
        if (nappi) merkitseTekeilla(nappi.parentNode);
        var ehd = ehdotus.querySelector('button[data-k="' + k + '"]');
        if (ehd) merkitseTekeilla(ehd.parentNode);
      }
    }).catch(function () {});
  }

  function nouda() {
    var polku = avaa.getAttribute('data-hakemisto');
    tila.textContent = '…';
    fetch(polku, { cache: 'force-cache' }).then(function (r) { return r.json(); }).then(function (data) {
      tila.textContent = '';
      /* Järjestys: sivustolla jo olevat ensin (lukija näkee heti mitä ON),
         sitten muut kielen oman nimen mukaan. Eri kirjoitusjärjestelmät
         järjestyvät selaimen collationilla; haku kattaa loput. */
      data.sort(function (x, y) {
        var ox = olemassa[x[0]] ? 0 : 1, oy = olemassa[y[0]] ? 0 : 1;
        if (ox !== oy) return ox - oy;
        try { return x[1].localeCompare(y[1], sivunKieli); } catch (_) { return x[1] < y[1] ? -1 : 1; }
      });
      piirra(data);
      merkitseTyonAlla();
      /* Ehdotus ensin: puhelimen kieli, jos sitä ei vielä ole eikä se ole
         oikealta vasemmalle. Sama tunnistus kuin bannerissa (koodi()). */
      var oma = selaimenKieli();
      var rivi = null;
      for (var i = 0; i < data.length; i++) if (data[i][0] === oma) { rivi = data[i]; break; }
      if (rivi && !olemassa[oma] && tuettu(oma) && !rivi[4]) {
        ehdotus.innerHTML = '<div class="valitsin__rivi valitsin__rivi--ehdotus">' +
          rivinSisus(rivi, maa(rivi[3])) + '<button type="button" class="nappi" data-k="' + p(oma) +
          '" data-nimi="' + p(rivi[1]) + '" aria-label="' + p(T.pyyda + ': ' + rivi[1]) + '">' +
          p(T.pyyda) + '</button></div>';
        ehdotus.hidden = false;
      }
    }).catch(function () {
      /* Puute näkyy: hakemistoa ei saatu, mutta pyyntö on yhä mahdollinen
         bannerin kautta. Ei arvattua listaa. */
      tila.textContent = T.eiOnnistunut;
    });
  }

  function luo() {
    dlg = document.createElement('dialog');
    dlg.className = 'valitsin';
    dlg.innerHTML =
      '<div class="valitsin__ylaosa"><h2 class="valitsin__otsikko">' + p(T.otsikko) + '</h2>' +
      '<button type="button" class="valitsin__sulje" aria-label="' + p(T.sulje) + '">×</button></div>' +
      '<div class="valitsin__ehdotus" hidden></div>' +
      '<input class="valitsin__kentta" type="search" autocomplete="off" spellcheck="false" placeholder="' +
      p(T.haku) + '" aria-label="' + p(T.haku) + '">' +
      '<p class="valitsin__tila" role="status" aria-live="polite"></p>' +
      '<ul class="valitsin__lista"></ul>';
    document.body.appendChild(dlg);
    kentta = dlg.querySelector('.valitsin__kentta');
    lista = dlg.querySelector('.valitsin__lista');
    tila = dlg.querySelector('.valitsin__tila');
    ehdotus = dlg.querySelector('.valitsin__ehdotus');
    dlg.querySelector('.valitsin__sulje').onclick = function () { dlg.close(); };
    kentta.addEventListener('input', suodata);
    dlg.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-k]') : null;
      if (b) riviPyyda(b);
    });
    /* Napsautus taustaan sulkee, kuten luettelosta pois napsauttaminen. */
    dlg.addEventListener('mousedown', function (e) { if (e.target === dlg) dlg.close(); });
  }

  avaa.addEventListener('click', function () {
    if (!dlg) luo();
    dlg.showModal();
    if (!rivit) nouda();
    kentta.focus();
  });
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


/* ── Käännettävä kortti: «Näin pizza tehdään» (16.11.2026) ───────────────────
 *
 * Marko osiota katsoessaan: «Tässäkin voisi hyvin olla interaktiivisuutta, että
 * painamalla pizzakorttia se kääntyy ja paljastaa pizzakortin. Painamalla
 * uudelleen taas tulisi uusi pizzakortti näkyviin.»
 *
 * Kortti on kortti: kääntäminen on juuri se, mitä kortille pelissä tehdään.
 * Siksi tämä ei ole koriste sääntötekstin vieressä vaan sama asia kuin sääntö.
 *
 * ⚠️ ILMAN JAVASCRIPTIÄ sivulle jää täsmälleen se kortin kuva, joka siellä on
 * ennenkin ollut. Painike syntyy vasta täällä, joten kuollutta nappia ei voi
 * jäädä. Sama koskee virheellistä data-attribuuttia: silloin ei tehdä mitään.
 *
 * ⚠️ SAAVUTETTAVUUS. Painikkeen nimi on aina se kortti joka on näkyvissä:
 * lepotilassa viereinen otsikko («Pizzakortit»), käännettynä sama otsikko ja
 * kortin oma sisältö numeroina («Pizzakortit: 2 + 3 = 5»). Muoto on sama kuin
 * pizzakeittiön painikkeissa («Vaihda täytekortti: 10»), eikä se ole uutta
 * tekstiä: otsikko on jo käännetty ja selite on pelkkiä numeroita.
 *
 * 📐 Mitattu 16.11.2026: nimi on aria-labelissa EIKÄ kuvan alt-tekstissä.
 * Ensimmäinen versio luotti siihen, että näkyvän puolen alt nousee painikkeen
 * nimeksi — saavutettavuuspuuta lukemalla painike oli nimetön. Kuvat ovat nyt
 * alt="", ja nimi on siellä missä se varmasti luetaan.
 *
 * Liike on luokan `liike` sisällä, joten prefers-reduced-motion pysäyttää sen;
 * kortti vaihtuu silloin ilman kääntöä, eikä mikään sisältö katoa.
 *
 * 📐 PAINO. Korttikuvat haetaan vasta tarvittaessa: ensimmäinen vasta kun
 * osoitin tai näppäinkohdistus osuu korttiin, ja sen jälkeen aina yksi
 * etukäteen. Sivun latauksessa ei muutu mikään — päinvastoin, selkäpuolet
 * vaihtuivat 351 px:n kuvista 240 px:n kuviin, mikä keventää sivua 39 kt.
 */
(function () {
  var kortit = document.querySelectorAll('img[data-kaanto]');
  if (!kortit.length) return;

  var hidas = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  Array.prototype.forEach.call(kortit, function (selka) {
    var pakka;
    try {
      pakka = JSON.parse(selka.getAttribute('data-kaanto'));
    } catch (e) {
      return;
    }
    if (!pakka || !pakka.length) return;
    // «../kuvat/kortti/tausta-pizza.webp» → «../kuvat/»; pakassa on «kortti/…».
    var kansio = selka.getAttribute('src').replace(/kortti\/[^/]*$/, '');

    var nappi = document.createElement('button');
    nappi.type = 'button';
    nappi.className = 'kaanto liike';
    var kehys = document.createElement('span');
    kehys.className = 'kaanto__kortti';
    var puolet = [document.createElement('span'), document.createElement('span')];
    puolet[0].className = 'kaanto__puoli';
    puolet[1].className = 'kaanto__puoli kaanto__puoli--taka';
    var etu = new Image(240, 364);
    etu.alt = '';

    var nimi = selka.getAttribute('data-nimi') || '';
    nappi.setAttribute('aria-label', nimi);
    selka.parentNode.insertBefore(nappi, selka);
    puolet[0].appendChild(selka);
    puolet[1].appendChild(etu);
    kehys.appendChild(puolet[0]);
    kehys.appendChild(puolet[1]);
    nappi.appendChild(kehys);
    var vihje = document.createElement('span');
    vihje.className = 'kaanto__vihje';
    vihje.setAttribute('aria-hidden', 'true');
    vihje.textContent = '↻';
    nappi.appendChild(vihje);
    puolet[1].setAttribute('aria-hidden', 'true');

    var n = 0;             // montako kertaa käännetty
    var kaantyy = false;   // kesken olevan käännön aikana painallus ei tee mitään
    var kello;

    function esilataa() {
      var kuva = new Image();
      kuva.src = kansio + pakka[n % pakka.length][0];
    }

    function vapauta() {
      clearTimeout(kello);
      kaantyy = false;
      esilataa();                       // seuraava kortti valmiiksi muistiin
    }

    /* Käännetään vasta kun tuleva kuva on valmis: muuten lukija näkisi tyhjän
     * puolen. 400 ms on katto, ettei painallus jää koskaan vastaamatta. */
    function kunValmis(kuva, tee) {
      var tehty = false;
      function aja() {
        if (tehty) return;
        tehty = true;
        tee();
      }
      if (kuva.complete && kuva.naturalWidth) return aja();
      var katto = setTimeout(aja, 400);
      kuva.addEventListener('load', function () { clearTimeout(katto); aja(); });
      kuva.addEventListener('error', function () { clearTimeout(katto); aja(); });
    }

    function kaanna() {
      if (kaantyy) return;
      kaantyy = true;
      var kortti = pakka[n % pakka.length];
      var tulija = puolet[(n + 1) % 2];
      var kuva = tulija.firstChild;
      kuva.src = kansio + kortti[0];
      kunValmis(kuva, function () {
        n += 1;
        nappi.setAttribute('aria-label', nimi ? nimi + ': ' + kortti[1] : kortti[1]);
        kehys.style.transform = 'rotateY(' + (n * 180) + 'deg)';
        puolet[0].setAttribute('aria-hidden', n % 2 ? 'true' : 'false');
        puolet[1].setAttribute('aria-hidden', n % 2 ? 'false' : 'true');
        // Ilman liikettä kortti on heti perillä; muuten odotetaan käännön
        // loppuun. Kello on varmistus sille, ettei transitionend tule.
        if (hidas) return vapauta();
        kello = setTimeout(vapauta, 1200);
      });
    }

    kehys.addEventListener('transitionend', function (t) {
      if (t.propertyName === 'transform') vapauta();
    });
    nappi.addEventListener('click', kaanna);
    nappi.addEventListener('pointerenter', esilataa, { once: true });
    nappi.addEventListener('focus', esilataa, { once: true });
  });
})();
