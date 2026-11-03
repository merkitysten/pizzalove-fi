/* Pizza Love -joulukalenteri: 24 luukkua pizzatehtaan seinässä.
 *
 * 🔵 Marko 3.11.2026: «Tehtävä pitäisi ehdottomasti olla oikeilla korteilla ja
 * hyödyntäen jo tehtyjä pelimekaniikkoja. — — ei kerrota vaan näytetään kuvin
 * ja laitetaan joulukalenterin avaaja tekemään ne laskutoimitukset.»
 *
 * SIKSI TÄMÄ SIVU EI TOTEUTA PELIN SÄÄNTÖJÄ UUDELLEEN:
 *   kortit.js   oikeat kortit ja niiden kuvat (`pizzapakka`, 42 korttia)
 *   kierros.js  lausekkeen rakennus ja VASTAUKSEN TARKISTUS
 *               (`kierrosTokenit`, `kierrosTarkista`) — sama funktio jolla
 *               yhteispelin isäntä tarkistaa pelaajien vastaukset
 *   laskin.js   lausekkeen arvo murtolukuina (`laske`, `osuuko`)
 * Ne ladataan `../play/`-kansiosta sellaisinaan, ei kopioina.
 *
 * ⚠️ JA SE LÖYSI HETI YHDEN ERON. Generaattorini salli Basson tavassa
 * «vähintään» yhtä monta eri täytettä kuin pizzassa on; `kierrosTarkista`
 * vaatii «tasan». Peli olisi hylännyt oman kalenterini ratkaisun. Sääntö on
 * nyt yksi, ja se asuu pelissä.
 *
 * ⚠️ LAUTAPULMAN TARKISTUS ON TÄSSÄ TIEDOSTOSSA, KORTTIPULMAN EI. Vaa'an
 * sääntö (sisään = noppa + ulos) on apinavaaan sisällä 2 143 rivin
 * komponentissa eikä omana moduulinaan, joten sitä ei voi kutsua tänne.
 * Se on kirjoitettu tähän uudelleen — kolme riviä — ja juuri siksi
 * `?koe=1` ajaa jokaisen pulman tallennetun ratkaisun tämän sivun
 * tarkistuksen läpi: kaksi toteutusta ajautuu erilleen, ellei sitä mitata.
 *
 * ⚠️ LUUKKUJEN PAIKAT OVAT ENSIMMÄINEN VEDOS. Pyörä (oikea yläkulma) ja
 * varastopylpyrät (alalaita, pelin omat numerot 1–10) on jätetty vapaaksi.
 */
(function () {
  'use strict';

  var PAIKAT = [
    [4.5, 11], [13.2, 8.5], [22.6, 12], [31.8, 9],
    [41.2, 11.5], [50.4, 8.5], [59.8, 12], [69.0, 9.5],
    [4.0, 30], [13.0, 33], [22.4, 29], [31.6, 32.5],
    [41.0, 29.5], [50.2, 33], [59.6, 30], [68.8, 32.5],
    [4.5, 50], [13.2, 47], [22.6, 50.5], [31.8, 47.5],
    [41.2, 50], [50.4, 47], [59.8, 50.5], [69.0, 47.5]
  ];

  var AVAIN = 'pizzalove-joulu-2026';
  var KUVAT = '../play/';
  /* Samat luvat kuin pelin perusasetuksissa + sulut. Potenssi ja logaritmi
     ovat pelissä erikseen kytkettäviä «vaikeampia tapoja», eikä yksikään
     kalenterin pulma tarvitse niitä. */
  var SALLITUT = { kerto: true, jako: true, potenssi: false, log: false, sulut: true };
  var MERKIT = ['+', '−', '×', '÷'];

  var tila = { data: null, auki: lueAuki(), ratkotut: lueRatkotut() };

  function lue(avain, oletus) {
    try { return JSON.parse(localStorage.getItem(avain)) || oletus; }
    catch (e) { return oletus; }      /* yksityinen selaus: ei ole vika */
  }
  function kirjoita(avain, arvo) {
    try { localStorage.setItem(avain, JSON.stringify(arvo)); } catch (e) {}
  }
  function lueAuki() { return lue(AVAIN, []); }
  function lueRatkotut() { return lue(AVAIN + '-ratkotut', []); }

  function kaikkiAuki() { return /[?&]kaikki=1/.test(location.search); }
  function avautunut(paiva) {
    if (kaikkiAuki()) return true;
    var n = new Date();
    return n.getMonth() === 11 && n.getDate() >= paiva;
  }

  /* ---------- kortit kuvina (kortit.js) ---------- */

  var PIZZAKORTIT = (typeof pizzapakka === 'function') ? pizzapakka() : [];

  function pizzakortti(taytteet) {
    var avain = taytteet.join(',');
    for (var i = 0; i < PIZZAKORTIT.length; i++) {
      if (PIZZAKORTIT[i].taytteet.join(',') === avain) return PIZZAKORTIT[i];
    }
    return null;                      /* ei pitäisi tapahtua: pizza on pakasta */
  }

  function pizzakuva(taytteet, luokka) {
    var k = pizzakortti(taytteet);
    if (!k) return '';
    return '<img class="' + (luokka || 'kortti kortti--pizza') + '" src="' +
      KUVAT + k.kuva + '" alt="Pizzakortti, arvo ' + k.arvo + '">';
  }

  function nimiArvo(arvo) {
    return tila.data.taytteet[arvo].nimi + ' ' + arvo;
  }

  function taytekuva(arvo, luokka, lisa) {
    var t = tila.data.taytteet[arvo];
    return '<img class="' + luokka + '" src="' + KUVAT + 'kuvat/tayte-' + arvo +
      '.webp" alt="' + t.nimi + ' ' + arvo + '"' + (lisa || '') + '>';
  }

  /* ---------- korttipulma: pelin oma lausekekone ---------- */

  function korttipulma(p, juuri, valmis) {
    var kierros = {
      pizza: { arvo: p.arvo, tayteMaara: p.pizza.length, sydan: p.arvo === 10,
               kuva: (pizzakortti(p.pizza) || {}).kuva },
      kortit: p.kasi.map(function (a) {
        return { arvo: a, fantasia: false, kuva: 'kuvat/tayte-' + a + '.webp' };
      })
    };
    var v = { kortit: [], merkit: [], ryhmat: [] };
    var ryhmitys = null;              /* null | {} | {alku} — kuten peli.js */

    juuri.innerHTML =
      '<div class="pulma">' +
      '  <div class="kohde">' + pizzakuva(p.pizza) +
      '    <p class="ohje">' + (p.tapa === 'basso'
          ? 'Valmista tämä pizza. <b>Basson tapa:</b> käytä tasan yhtä montaa eri täytettä kuin pizzassa on täytteitä.'
          : 'Valmista tämä pizza. Kortteja saa käyttää niin monta kuin haluat.') + '</p>' +
      '  </div>' +
      '  <div class="lauseke" data-lauseke></div>' +
      '  <div class="tyokalut"><button type="button" class="sulkunappi" data-sulut>( )</button>' +
      '    <span class="tulos" data-tulos></span></div>' +
      '  <div class="otsake">Kätesi</div><div class="kasi" data-kasi></div>' +
      '  <p class="palaute" data-palaute></p>' +
      '</div>';

    var lausekeEl = juuri.querySelector('[data-lauseke]');
    var kasiEl = juuri.querySelector('[data-kasi]');
    var tulosEl = juuri.querySelector('[data-tulos]');
    var palauteEl = juuri.querySelector('[data-palaute]');
    var sulutEl = juuri.querySelector('[data-sulut]');

    sulutEl.addEventListener('click', function () {
      if (v.kortit.length < 3) return;
      ryhmitys = ryhmitys ? null : {};
      piirra();
    });

    function lisaa(i) {
      if (v.kortit.some(function (k) { return k.i === i; })) return;
      if (v.kortit.length) v.merkit.push(null);
      v.kortit.push({ i: i, arvo: kierros.kortit[i].arvo });
      piirra();
    }
    function poista(j) {
      v.kortit.splice(j, 1);
      v.merkit.splice(Math.max(0, j - 1), 1);
      v.ryhmat = [];                  /* sulut viittaavat paikkoihin: nollataan */
      ryhmitys = null;
      piirra();
    }
    function vaihdaMerkki(j) {
      var nyt = MERKIT.indexOf(v.merkit[j]);
      v.merkit[j] = MERKIT[(nyt + 1) % MERKIT.length];
      piirra();
    }
    /* Sulkeet osoitetaan ryhmän ensimmäisestä ja viimeisestä kortista —
       sama kahden napautuksen ele kuin pelissä (peli.js: osoitaLuku). */
    function osoita(j) {
      if (!ryhmitys) return poista(j);
      if (ryhmitys.alku === undefined) { ryhmitys = { alku: j }; return piirra(); }
      var a = Math.min(ryhmitys.alku, j), b = Math.max(ryhmitys.alku, j);
      if (b > a && kierrosRyhmatKelpaavat(v.ryhmat.concat([{ alku: a, loppu: b }]), v.kortit.length)) {
        v.ryhmat.push({ alku: a, loppu: b });
      }
      ryhmitys = null;
      piirra();
    }

    function valmisLauseke() {
      return v.kortit.length > 0 && v.merkit.every(function (m) { return !!m; });
    }

    function piirra() {
      /* lauseke */
      var osat = [];
      if (!v.kortit.length) osat.push('<span class="tyhja">Napauta täytekortteja alta</span>');
      v.kortit.forEach(function (k, j) {
        v.ryhmat.filter(function (r) { return r.alku === j; }).forEach(function (r) {
          osat.push('<button type="button" class="sulku" data-poistaryhma="' +
            v.ryhmat.indexOf(r) + '" title="Poista sulut">(</button>');
        });
        osat.push('<button type="button" class="valittu' +
          (ryhmitys && ryhmitys.alku === j ? ' valittu--osoitettu' : '') +
          '" data-kortti="' + j + '" aria-label="' +
          (ryhmitys ? 'Osoita ' : 'Poista ') + nimiArvo(k.arvo) + '">' +
          taytekuva(k.arvo, 'kortti kortti--pieni') + '</button>');
        v.ryhmat.filter(function (r) { return r.loppu === j; }).forEach(function (r) {
          osat.push('<button type="button" class="sulku" data-poistaryhma="' +
            v.ryhmat.indexOf(r) + '" title="Poista sulut">)</button>');
        });
        if (j < v.kortit.length - 1) {
          osat.push('<button type="button" class="merkki' +
            (v.merkit[j] ? '' : ' merkki--tyhja') + '" data-merkki="' + j +
            '" aria-label="Laskumerkki ' + (j + 1) + ': ' +
            (v.merkit[j] || 'valitsematta') + '">' +
            (v.merkit[j] || '?') + '</button>');
        }
      });
      lausekeEl.innerHTML = osat.join('');

      /* käsi */
      kasiEl.innerHTML = kierros.kortit.map(function (k, i) {
        var kaytossa = v.kortit.some(function (x) { return x.i === i; });
        return '<button type="button" class="kasikortti' +
          (kaytossa ? ' kasikortti--kaytossa' : '') + '" data-kasi="' + i + '"' +
          ' aria-label="Lisää ' + nimiArvo(k.arvo) + ' lausekkeeseen"' +
          (kaytossa ? ' disabled' : '') + '>' +
          taytekuva(k.arvo, 'kortti') + '</button>';
      }).join('');

      /* elävä tulos ja tarkistus — pelin omilla funktioilla */
      sulutEl.disabled = v.kortit.length < 3;
      sulutEl.classList.toggle('sulkunappi--paalla', !!ryhmitys);
      if (valmisLauseke()) {
        var arvot = v.kortit.map(function (k) { return k.arvo; });
        var t = laske(kierrosTokenit(arvot, v.merkit, v.ryhmat));
        tulosEl.textContent = t ? tulosTekstina(t) : '✕';
        tulosEl.className = 'tulos ' + (osuuko(t, p.arvo) ? 'tulos--osuu' : 'tulos--ohi');
        var tarkistus = kierrosTarkista(kierros, v, SALLITUT, p.tapa === 'basso');
        if (tarkistus.oikein) return onnistui();
        palauteEl.textContent = (tarkistus.syy === 'taytteet')
          ? 'Arvo osuu, mutta Basson tapa vaatii tasan ' + p.pizza.length +
            ' eri täytettä — nyt niitä on ' + new Set(arvot).size + '.'
          : '';
      } else {
        tulosEl.textContent = '';
        tulosEl.className = 'tulos';
        palauteEl.textContent = '';
      }
    }

    function onnistui() {
      juuri.querySelector('.pulma').classList.add('pulma--ratkaistu');
      palauteEl.innerHTML = '<b>Oikein!</b> ' + kierrosLauseke(v) + ' = ' + p.arvo;
      lausekeEl.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
      kasiEl.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
      sulutEl.disabled = true;
      valmis();
    }

    juuri.addEventListener('click', function (e) {
      var el = e.target.closest('[data-kasi],[data-kortti],[data-merkki],[data-poistaryhma]');
      if (!el || el.disabled) return;
      if (el.dataset.kasi !== undefined) lisaa(+el.dataset.kasi);
      else if (el.dataset.kortti !== undefined) osoita(+el.dataset.kortti);
      else if (el.dataset.merkki !== undefined) vaihdaMerkki(+el.dataset.merkki);
      else if (el.dataset.poistaryhma !== undefined) {
        v.ryhmat.splice(+el.dataset.poistaryhma, 1); piirra();
      }
    });
    piirra();

    /* Tarkistus paljaalle ratkaisulle — `?koe=1` kutsuu tätä. */
    return function koeRatkaisu(kortit, merkit, ryhmat) {
      return kierrosTarkista(kierros,
        { kortit: kortit, merkit: merkit, ryhmat: ryhmat || [] },
        SALLITUT, p.tapa === 'basso');
    };
  }

  /* ---------- lautapulma: vaaka, varasto ja linjasto ---------- */

  function lautapulma(p, juuri, valmis) {
    var alku = p.linjasto.slice();
    var linjalla = alku.slice();      /* pelaajan muokkaama tila */

    juuri.innerHTML =
      '<div class="pulma">' +
      '  <div class="kohde">' +
      p.pizzat.map(function (x) { return pizzakuva(x); }).join('') +
      '    <p class="ohje">Siirrä täytteet niin, että nämä voi valmistaa ja ' +
      '       <b>vaaka tasaa</b>: sisään tuotujen summa = noppa + takaisin viety.</p>' +
      '  </div>' +
      '  <div class="vaaka"><span class="noppa" title="Nopan silmäluku">' + p.noppa + '</span>' +
      '    <span class="vaakarivi" data-vaaka></span></div>' +
      '  <div class="otsake">Linjasto</div><div class="rivi" data-linja></div>' +
      '  <div class="otsake">Varasto</div><div class="rivi" data-varasto></div>' +
      '  <p class="palaute" data-palaute></p>' +
      '</div>';

    var linjaEl = juuri.querySelector('[data-linja]');
    var varastoEl = juuri.querySelector('[data-varasto]');
    var vaakaEl = juuri.querySelector('[data-vaaka]');
    var palauteEl = juuri.querySelector('[data-palaute]');

    function tuodut() {
      return linjalla.filter(function (a) { return alku.indexOf(a) < 0; });
    }
    function viedyt() {
      return alku.filter(function (a) { return linjalla.indexOf(a) < 0; });
    }
    function summa(l) { return l.reduce(function (a, b) { return a + b; }, 0); }

    /* ⚠️ Vaa'an sääntö ja yhden paluun raja ovat samat kuin pulmadatan
       `siirrot(d, L)`:ssä: sisään tuotujen summa = noppa + yksi takaisin
       viety. Useamman palauttaminen ei ole pelissä mahdollista. */
    function tasaako() {
      return viedyt().length <= 1 && tuodut().length > 0 &&
        summa(tuodut()) === p.noppa + summa(viedyt());
    }
    function pizzatSyntyvat() {
      return p.pizzat.every(function (pz) {
        return pz.every(function (a) { return linjalla.indexOf(a) >= 0; });
      });
    }

    function piirra() {
      linjaEl.innerHTML = linjalla.sort(function (a, b) { return a - b; })
        .map(function (a) {
          var uusi = alku.indexOf(a) < 0;
          return '<button type="button" class="tayte' + (uusi ? ' tayte--tuotu' : '') +
            '" data-pois="' + a + '" aria-label="Vie ' + nimiArvo(a) +
            ' takaisin varastoon">' + taytekuva(a, 'kortti') + '</button>';
        }).join('') || '<span class="tyhja">Linjasto on tyhjä</span>';

      varastoEl.innerHTML = '';
      for (var a = 1; a <= 10; a++) {
        if (linjalla.indexOf(a) >= 0) continue;
        var viety = alku.indexOf(a) >= 0;
        varastoEl.innerHTML += '<button type="button" class="tayte' +
          (viety ? ' tayte--viety' : '') + '" data-sisaan="' + a +
          '" aria-label="Siirrä ' + nimiArvo(a) + ' linjastolle">' +
          taytekuva(a, 'kortti') + '</button>';
      }

      var sis = tuodut(), ulos = viedyt();
      vaakaEl.innerHTML = sis.length || ulos.length
        ? '<b>' + (sis.join(' + ') || '0') + ' = ' + summa(sis) + '</b> ' +
          (ulos.length ? '· noppa ' + p.noppa + ' + takaisin ' + ulos.join(' + ') +
                         ' = ' + (p.noppa + summa(ulos))
                       : '· noppa ' + p.noppa) +
          (tasaako() ? ' <span class="tulos--osuu">tasaa</span>'
                     : ' <span class="tulos--ohi">ei tasaa</span>')
        : '<span class="tyhja">Napauta täytteitä: varastosta linjastolle ja takaisin.</span>';

      if (ulos.length > 1) {
        palauteEl.textContent = 'Vaakaan mahtuu vain yksi takaisin vietävä täyte.';
      } else if (tasaako() && pizzatSyntyvat()) {
        return onnistui();
      } else if (tasaako() && !pizzatSyntyvat()) {
        palauteEl.textContent = 'Vaaka tasaa, mutta kaikkia pizzoja ei vielä voi valmistaa.';
      } else {
        palauteEl.textContent = '';
      }
    }

    function onnistui() {
      juuri.querySelector('.pulma').classList.add('pulma--ratkaistu');
      palauteEl.innerHTML = '<b>Oikein!</b> ' + (viedyt().length
        ? summa(tuodut()) + ' = noppa ' + p.noppa + ' + takaisin ' + viedyt()[0]
        : summa(tuodut()) + ' = noppa ' + p.noppa);
      juuri.querySelectorAll('.tayte').forEach(function (b) { b.disabled = true; });
      valmis();
    }

    juuri.addEventListener('click', function (e) {
      var el = e.target.closest('[data-sisaan],[data-pois]');
      if (!el || el.disabled) return;
      var a = +(el.dataset.sisaan || el.dataset.pois);
      if (el.dataset.sisaan !== undefined) linjalla.push(a);
      else linjalla.splice(linjalla.indexOf(a), 1);
      piirra();
    });
    piirra();

    return function koeRatkaisu(siirto, takaisin) {
      linjalla = alku.filter(function (a) { return a !== takaisin; }).concat(siirto);
      return { oikein: tasaako() && pizzatSyntyvat(),
               syy: tasaako() ? (pizzatSyntyvat() ? null : 'pizzat') : 'vaaka' };
    };
  }

  /* ---------- luukku ---------- */

  function merkitseRatkaistu(paiva, i) {
    var avain = paiva + '-' + i;
    if (tila.ratkotut.indexOf(avain) < 0) {
      tila.ratkotut.push(avain);
      kirjoita(AVAIN + '-ratkotut', tila.ratkotut);
      paivitaTila();
    }
  }

  function avaa(luukku, nappi) {
    var sisus = document.getElementById('arkkiSisus');
    sisus.className = 'arkki__sisus';
    sisus.innerHTML = '<span class="paiva">' + luukku.paiva + '. luukku</span>';
    luukku.pulmat.forEach(function (p, i) {
      if (i) sisus.appendChild(document.createElement('hr')).className = 'erotin';
      var lohko = document.createElement('div');
      lohko.className = 'lohko';
      lohko.innerHTML = '<div class="laji">' +
        (p.laji === 'kortti' ? 'Korttipeli' : 'Lautapeli') +
        (p.tapa === 'basso' ? ' · Basson tapa' : '') + '</div>';
      var pelialue = document.createElement('div');
      lohko.appendChild(pelialue);
      sisus.appendChild(lohko);
      var valmis = function () { merkitseRatkaistu(luukku.paiva, i); };
      if (p.laji === 'kortti') korttipulma(p, pelialue, valmis);
      else lautapulma(p, pelialue, valmis);
      var apu = document.createElement('button');
      apu.className = 'apunappi';
      apu.textContent = 'Näytä ratkaisu';
      apu.addEventListener('click', function () {
        apu.outerHTML = '<p class="ratkaisu">' + p.ratkaisu + '</p>';
      });
      lohko.appendChild(apu);
    });
    document.getElementById('arkki').showModal();
    if (tila.auki.indexOf(luukku.paiva) < 0) {
      tila.auki.push(luukku.paiva);
      kirjoita(AVAIN, tila.auki);
      nappi.classList.add('luukku--auki');
      paivitaTila();
    }
  }

  function paivitaTila() {
    var tilarivi = document.getElementById('tila');
    var mitaan = tila.data.luukut.some(function (l) { return avautunut(l.paiva); });
    if (!mitaan) {
      tilarivi.innerHTML = 'Ensimmäinen luukku avautuu 1. joulukuuta. ' +
        '<a href="?kaikki=1">Esikatsele kaikki</a>';
      return;
    }
    var pulmia = tila.data.luukut.reduce(function (s, l) { return s + l.pulmat.length; }, 0);
    tilarivi.textContent = (kaikkiAuki() ? 'Esikatselu — kaikki luukut auki. ' : '') +
      'Avattu ' + tila.auki.length + '/24 luukkua · ratkaistu ' +
      tila.ratkotut.length + '/' + pulmia + ' pulmaa.';
  }

  function piirra() {
    var lauta = document.getElementById('lauta');
    tila.data.luukut.forEach(function (luukku, i) {
      var p = PAIKAT[i];
      var nappi = document.createElement('button');
      nappi.className = 'luukku' + (luukku.pulmat.length > 1 ? ' luukku--tupla' : '');
      nappi.style.left = p[0] + '%';
      nappi.style.top = p[1] + '%';
      nappi.textContent = luukku.paiva;
      nappi.setAttribute('aria-label', luukku.paiva + '. luukku' +
        (luukku.pulmat.length > 1 ? ', kaksi pulmaa' : ''));
      if (!avautunut(luukku.paiva)) {
        nappi.classList.add('luukku--lukossa');
        nappi.disabled = true;
        nappi.title = luukku.paiva + '. joulukuuta';
      } else {
        if (tila.auki.indexOf(luukku.paiva) >= 0) nappi.classList.add('luukku--auki');
        nappi.addEventListener('click', function () { avaa(luukku, nappi); });
      }
      lauta.appendChild(nappi);
    });
    paivitaTila();
  }

  /* ---------- itsetesti: ?koe=1 ----------
   * Ajaa JOKAISEN pulman tallennetun ratkaisun tämän sivun tarkistuksen läpi.
   * Korttipulmissa tarkistaja on pelin oma `kierrosTarkista`, lautapulmissa
   * tämän tiedoston oma — ja juuri siksi tämä on olemassa: generaattori
   * (Python) ja sivu (JS) ovat kaksi toteutusta samasta säännöstä. */
  function koeAjo() {
    var rivit = [], virheita = 0;
    var piilo = document.createElement('div');
    piilo.style.display = 'none';
    document.body.appendChild(piilo);
    tila.data.luukut.forEach(function (L) {
      L.pulmat.forEach(function (p, i) {
        var koe;
        if (p.laji === 'kortti') {
          koe = korttipulma(p, piilo, function () {});
          /* ⚠️ JÄRJESTYS LUETAAN LAUSEKKEESTA, EI `kortit`-KENTÄSTÄ. Se on
             lajiteltu monijoukko: luukussa 17 kortit ovat [4, 6] mutta
             lauseke on «6 − 4». Ensimmäinen versio laski 4 − 6 = −2 ja
             raportoi aidon pulman rikkinäiseksi. */
          var kasi = p.kasi.slice(), kortit = [];
          (p.lauseke.match(/\d+/g) || []).map(Number).forEach(function (arvo) {
            var j = kasi.indexOf(arvo);
            kasi[j] = null;
            kortit.push({ i: j, arvo: arvo });
          });
          var tulos = koe(kortit, merkitLausekkeesta(p.lauseke, kortit.length),
                          ryhmatLausekkeesta(p.lauseke));
        } else {
          koe = lautapulma(p, piilo, function () {});
          tulos = koe(p.siirto, p.takaisin);
        }
        if (!tulos.oikein) { virheita++; }
        rivit.push((tulos.oikein ? 'OK   ' : '🔴 ') + L.paiva + '/' + (i + 1) +
                   ' ' + p.laji + (tulos.syy ? ' — ' + tulos.syy : ''));
      });
    });
    piilo.remove();
    var ulos = document.createElement('pre');
    ulos.id = 'koetulos';
    ulos.textContent = (virheita ? '🔴 ' + virheita + ' VIRHETTÄ\n'
                                 : 'Kaikki ' + rivit.length + ' ratkaisua kelpaavat sivun tarkistukselle\n')
                       + rivit.join('\n');
    document.body.appendChild(ulos);
  }

  /* Lausekkeen merkit ja sulut generaattorin tekstimuodosta, esim.
     «1 + (3 × 3)». ⚠️ Vain itsetestiä varten: pelaaja ei syötä tekstiä. */
  function merkitLausekkeesta(lauseke, n) {
    var merkit = (lauseke.match(/[+−×÷:]/g) || []).map(function (m) {
      return m === ':' ? '÷' : m;
    });
    return merkit.slice(0, n - 1);
  }
  function ryhmatLausekkeesta(lauseke) {
    /* Paikat lasketaan luvuista: sulku alkaa ennen i:nnettä lukua ja
       päättyy j:nteen. */
    var ryhmat = [], pino = [], i = -1;
    for (var k = 0; k < lauseke.length; k++) {
      var c = lauseke[k];
      if (c === '(') pino.push(i + 1);
      else if (c === ')') ryhmat.push({ alku: pino.pop(), loppu: i });
      else if (/\d/.test(c) && !/\d/.test(lauseke[k - 1] || '')) i++;
    }
    return ryhmat.filter(function (r) { return r.loppu > r.alku; });
  }

  if (window.PULMAT) {
    tila.data = window.PULMAT;
    piirra();
    if (/[?&]koe=1/.test(location.search)) koeAjo();
  } else {
    document.getElementById('tila').textContent =
      'Pulmia ei löytynyt (pulmat.js puuttuu).';
  }
})();
