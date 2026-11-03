/* Pizza Love -joulukalenteri: 24 luukkua pizzatehtaan seinässä.
 *
 * 🔵 Marko 3.11.2026: «Tehtävä pitäisi ehdottomasti olla oikeilla korteilla ja
 * hyödyntäen jo tehtyjä pelimekaniikkoja. — — ei kerrota vaan näytetään kuvin
 * ja laitetaan joulukalenterin avaaja tekemään ne laskutoimitukset.»
 *
 * 🔵 Marko 3.11.2026 (sama päivä): «Siellähän on useampikin muu
 * ratkaisumahdollisuus. Minusta tähän pitäisi rohkaista.»
 * 📐 Mitattu: korttipulmissa on 3–59 eri tapaa (yhteensä 405 vapaalla
 * tavalla, 92 Basson tavalla), lautapulmissa 1–5. ⚠️ Tässä luki ensin
 * «2–36, yhteensä 269» — se oli laskettu kädellä joka katkaistiin neljään
 * korttiin, vaikka peli antaa käyttää koko kättä. Luukku ei sulkeudu
 * ensimmäisestä oikeasta vastauksesta vaan laskee montako eri tapaa
 * pelaaja on löytänyt, tarjoaa portaittain uutta tavoitetta — ja pitää
 * löydetyt lausekkeet näkyvillä.
 *
 * SIKSI TÄMÄ SIVU EI TOTEUTA PELIN SÄÄNTÖJÄ UUDELLEEN:
 *   kortit.js   oikeat kortit ja niiden kuvat (`pizzapakka`, 42 korttia)
 *   kierros.js  lausekkeen rakennus ja VASTAUKSEN TARKISTUS
 *               (`kierrosTokenit`, `kierrosTarkista`) — sama funktio jolla
 *               yhteispelin isäntä tarkistaa pelaajien vastaukset
 *   ratkoja.js  pelin oma haku (`etsiRatkaisu`) — vain itsetestissä
 *   laskin.js   lausekkeen arvo murtolukuina (`laske`, `osuuko`)
 * Ne ladataan `../play/`-kansiosta sellaisinaan, ei kopioina.
 *
 * ⚠️ JA SE LÖYSI HETI YHDEN ERON. Generaattorini salli Basson tavassa
 * «vähintään» yhtä monta eri täytettä kuin pizzassa on; `kierrosTarkista`
 * vaatii «tasan». Peli olisi hylännyt oman kalenterini ratkaisun. Sääntö on
 * nyt yksi, ja se asuu pelissä.
 *
 * ⚠️ BASSON TAPA ON VALINTA, EI PULMAN OMINAISUUS (3.11.2026). Pelissä sääntö
 * tulee kahdella tavalla eikä kolmannella: Pizza Bassossa se on AINA päällä,
 * Pizza Partyssa pelaaja kääntää sen itse («Vaikeampi», peli.js
 * `tila.apinanTapa` → `kierrosTarkista(..., vaikea)`). Helpossa tavassa
 * täytteiden lukumäärää ei tarkisteta lainkaan. Kalenteri teki valinnan
 * ensin pelaajan puolesta; nyt se on nappi, ja se tarjotaan vain kun sellainen
 * ratkaisu on olemassa (📐 14 korttipulmaa 16:sta).
 *
 * ⚠️ LAUTAPULMAN TARKISTUS ON TÄSSÄ TIEDOSTOSSA, KORTTIPULMAN EI. Vaa'an
 * sääntö on apinavaaan sisällä 2 143 rivin komponentissa eikä omana
 * moduulinaan, joten sitä ei voi kutsua tänne. Se on kirjoitettu tähän
 * uudelleen — ja juuri siksi `?koe=1` LASKEE lautapulmien ratkaisut tämän
 * sivun tarkistuksella ja vertaa lukua generaattorin lukuun. Kaksi
 * toteutusta ajautuu erilleen, ellei sitä mitata, ja niin kävi:
 * 📐 «perussiirtoon ei saa yhdistää muita siirtoja» (apinavaaka.js 423, 830)
 * puuttui tästä tiedostosta 3.11.2026 asti, ja mitattuna se oli
 * saavutettavissa kolmessa lautapulmassa (8, 10, 24).
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

  var tila = {
    data: null,
    auki: lue(AVAIN, []),
    ratkotut: lue(AVAIN + '-ratkotut', []),
    /* { "<päivä>-<pulma>-<tapa>": { "4,6": ["4 + 6"] } } — löydetyt tavat
       korttijoukon mukaan, ja jokaisen joukon eri lausekkeet. */
    loydot: lue(AVAIN + '-loydot', {})
  };

  function lue(avain, oletus) {
    try { return JSON.parse(localStorage.getItem(avain)) || oletus; }
    catch (e) { return oletus; }      /* yksityinen selaus: ei ole vika */
  }
  function kirjoita(avain, arvo) {
    try { localStorage.setItem(avain, JSON.stringify(arvo)); } catch (e) {}
  }

  function kaikkiAuki() { return /[?&]kaikki=1/.test(location.search); }
  function avautunut(paiva) {
    if (kaikkiAuki()) return true;
    var n = new Date();
    return n.getMonth() === 11 && n.getDate() >= paiva;
  }

  /* ---------- löydöt ----------
   * ⚠️ TAPA ON OSA AVAINTA. Sama käsi antaa helpolla tavalla eri määrän
   * ratkaisuja kuin Basson tavalla (luukku 18: 36 vastaan 18), joten yhteinen
   * laskuri näyttäisi «18/18 löydetty» heti kun helppoja on tarpeeksi. */

  function loytoAvain(pohja, tapa) { return pohja + '-' + tapa; }

  function loydetyt(avain) { return tila.loydot[avain] || {}; }

  function loytoja(avain) { return Object.keys(loydetyt(avain)).length; }

  /* Palauttaa 'uusi' | 'uusi-lauseke' | 'tuttu'. */
  function lisaaLoyto(avain, tunnus, teksti) {
    var kaikki = tila.loydot[avain] || (tila.loydot[avain] = {});
    var tulos;
    if (!kaikki[tunnus]) { kaikki[tunnus] = [teksti]; tulos = 'uusi'; }
    else if (kaikki[tunnus].indexOf(teksti) < 0) {
      kaikki[tunnus].push(teksti); tulos = 'uusi-lauseke';
    } else tulos = 'tuttu';
    kirjoita(AVAIN + '-loydot', tila.loydot);
    return tulos;
  }

  var SANA = ['tapaa', 'tapoja'];
  var SANA_LAUTA = ['siirtoa', 'siirtoja'];

  /* 🔵 Marko: «Ne aikaisemmat eri tavat pitäisi olla jossain näkyvillä
     siten, että ne muistaa esim. symbolikielen lausekkeina.» Lausekkeet
     ovat siis listassa sellaisinaan — `4 + 6 = 10`, ei sanallisena
     selityksenä — ja ne näkyvät koko ajan, myös seuraavaa rakennettaessa. */
  function loytoRivit(lista, otsake) {
    if (!lista.length) return '';
    return '<div class="otsake">' + otsake + '</div>' +
      lista.map(function (s) { return '<span class="loyto">' + s + '</span>'; }).join('');
  }

  function loytolista(avain) {
    var kaikki = loydetyt(avain), ulos = [];
    Object.keys(kaikki).forEach(function (t) {
      kaikki[t].forEach(function (s) { ulos.push(s); });
    });
    return ulos;
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

  /* 🔵 Marko 3.11.2026: «Se kolme tapaa on ihan hyvä alkumotivaatio, mutta
     sen jälkeen peli voisi tarjota taas uusia.» Tavoite ei siis ole yksi
     luku vaan PORTAIKKO: kolmen jälkeen kuusi, sitten kymmenen.

     ⚠️ Askel on pieni myös silloin kun tapoja on paljon. 📐 Luukussa 18 on
     59 eri tapaa, ja «1/59» lannistaa siinä missä «1/3» kannustaa — koko
     luku kuuluu samalle riville tietona, ei vaatimuksena. Viimeinen askel
     on aina `kaikki`, joten portaikko ei lupaa enempää kuin on olemassa. */
  var PORTAAT = [3, 6, 10, 15, 20, 30, 40, 50];

  /* Pienin porras joka on suurempi kuin jo löydetyt — enintään `kaikki`. */
  function maali(n, kaikki) {
    for (var i = 0; i < PORTAAT.length; i++) {
      if (PORTAAT[i] > n && PORTAAT[i] < kaikki) return PORTAAT[i];
    }
    return kaikki;
  }

  /* `sana` = [partitiivi yksikkö, partitiivi monikko]: «3 eri tapaa» mutta
     «erilaisia tapoja on 16». Yhdellä muodolla rivi oli «erilaisia tapaa». */
  function laskuriTeksti(n, kaikki, sana) {
    var m = maali(n, kaikki);
    var muita = kaikki > m
      ? ' · erilaisia ' + sana[1] + ' on kaikkiaan ' + kaikki
      : '';
    if (!n) {
      return (m > 1 ? 'Löydätkö <b>' + m + '</b> eri ' + sana[0] + '?'
                    : 'Löydätkö ratkaisun?') + muita;
    }
    if (n >= kaikki) {
      return '<b>' + n + '</b> eri ' + sana[0] + ' löydetty — kaikki! 🍕';
    }
    return '<b>' + n + '/' + m + '</b> eri ' + sana[0] + ' löydetty' + muita;
  }

  /* Juhlarivi kun porras täyttyy. Palauttaa tyhjän kun ei täyttynyt. */
  function porrasTeksti(n, kaikki, sana, teko) {
    if (n >= kaikki || PORTAAT.indexOf(n) < 0) return '';
    return ' <b>Hienoa, löysit ' + n + ' eri ' + sana[0] +
      (teko ? ' ' + teko : '') + '!</b> Löydätkö vielä ' +
      (maali(n, kaikki) - n) + '?';
  }

  /* Montako eri tapaa tällä kädellä on. ⚠️ YKSI LÄHDE: luku tulee
     generaattorilta (`tyokalut/korttipulma.py`), jonka oma tarkistus laskee
     sen pelin säännöillä. Jos tätä lukua laskisi myös sivu, kaksi
     toteutusta ajautuisi erilleen. */
  function tavoite(p, tapa) {
    return tapa === 'basso' ? p.ratkaisujaBasso : p.ratkaisujaHelppo;
  }

  /* ---------- korttipulma: pelin oma lausekekone ---------- */

  function korttipulma(p, juuri, valmis, pohja) {
    var kierros = {
      pizza: { arvo: p.arvo, tayteMaara: p.pizza.length, sydan: p.arvo === 10,
               kuva: (pizzakortti(p.pizza) || {}).kuva },
      kortit: p.kasi.map(function (a) {
        return { arvo: a, fantasia: false, kuva: 'kuvat/tayte-' + a + '.webp' };
      })
    };
    var tapa = p.tapa;
    /* Basson tapa tarjotaan vain kun sellainen ratkaisu on olemassa, ja
       helppo vain kun se on eri asia (yhden täytteen pizzalla ei ole). */
    var tavat = [];
    if (p.ratkaisujaHelppo > 0) tavat.push('helpompi');
    if (p.ratkaisujaBasso > 0) tavat.push('basso');
    var v = { kortit: [], merkit: [], ryhmat: [] };
    var ryhmitys = null;              /* null | {} | {alku} — kuten peli.js */
    var ilmoitettu = null;            /* viimeksi kuitattu korttijoukko */

    juuri.innerHTML =
      '<div class="pulma">' +
      '  <div class="kohde">' + pizzakuva(p.pizza) +
      '    <p class="ohje" data-ohje></p>' +
      '  </div>' +
      (tavat.length > 1
        ? '  <div class="tapavalinta" data-tavat>' + tavat.map(function (x) {
            return '<button type="button" class="tapanappi" data-tapa="' + x + '">' +
              (x === 'basso' ? 'Basson tapa' : 'Vapaa tapa') + '</button>';
          }).join('') + '</div>'
        : '') +
      '  <div class="lauseke" data-lauseke></div>' +
      '  <div class="tyokalut"><button type="button" class="sulkunappi" data-sulut>( )</button>' +
      '    <span class="tulos" data-tulos></span>' +
      '    <button type="button" class="nappi nappi--pieni" data-uudelleen hidden>Kokeile toista tapaa</button>' +
      '  </div>' +
      '  <div class="otsake">Kätesi</div><div class="kasi" data-kasi></div>' +
      '  <p class="palaute" data-palaute></p>' +
      '  <div class="laskuri" data-laskuri></div>' +
      '  <div class="loydot" data-loydot></div>' +
      '</div>';

    var ohjeEl = juuri.querySelector('[data-ohje]');
    var lausekeEl = juuri.querySelector('[data-lauseke]');
    var kasiEl = juuri.querySelector('[data-kasi]');
    var tulosEl = juuri.querySelector('[data-tulos]');
    var palauteEl = juuri.querySelector('[data-palaute]');
    var sulutEl = juuri.querySelector('[data-sulut]');
    var uudelleenEl = juuri.querySelector('[data-uudelleen]');
    var laskuriEl = juuri.querySelector('[data-laskuri]');
    var loydotEl = juuri.querySelector('[data-loydot]');

    function avain() { return loytoAvain(pohja, tapa); }

    function tyhjenna() {
      v = { kortit: [], merkit: [], ryhmat: [] };
      ryhmitys = null;
      ilmoitettu = null;
      palauteEl.innerHTML = '';
      juuri.querySelector('.pulma').classList.remove('pulma--ratkaistu');
      piirra();
    }

    sulutEl.addEventListener('click', function () {
      if (v.kortit.length < 3) return;
      ryhmitys = ryhmitys ? null : {};
      piirra();
    });
    uudelleenEl.addEventListener('click', tyhjenna);

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

    function korttitunnus() {
      return v.kortit.map(function (k) { return k.arvo; }).sort(function (a, b) {
        return a - b;
      }).join(',');
    }

    function piirraLaskuri() {
      laskuriEl.innerHTML = laskuriTeksti(loytoja(avain()), tavoite(p, tapa), SANA);
      loydotEl.innerHTML = loytoRivit(loytolista(avain()), 'Löytämäsi tavat');
    }

    function piirra() {
      ohjeEl.innerHTML = 'Valmista tämä pizza. ' + (tapa === 'basso'
        ? '<b>Basson tapa:</b> eri täytteitä tasan yhtä monta kuin pizzassa (' +
          p.pizza.length + '). Kortteja saa olla enemmän.'
        : 'Kortteja saa käyttää niin monta kuin haluat.');
      if (tavat.length > 1) {
        juuri.querySelectorAll('[data-tapa]').forEach(function (b) {
          b.classList.toggle('tapanappi--paalla', b.dataset.tapa === tapa);
          b.setAttribute('aria-pressed', b.dataset.tapa === tapa ? 'true' : 'false');
        });
      }

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
      uudelleenEl.hidden = !v.kortit.length;
      if (valmisLauseke()) {
        var arvot = v.kortit.map(function (k) { return k.arvo; });
        var t = laske(kierrosTokenit(arvot, v.merkit, v.ryhmat));
        tulosEl.textContent = t ? tulosTekstina(t) : '✕';
        tulosEl.className = 'tulos ' + (osuuko(t, p.arvo) ? 'tulos--osuu' : 'tulos--ohi');
        var tarkistus = kierrosTarkista(kierros, v, SALLITUT, tapa === 'basso');
        if (tarkistus.oikein) onnistui();
        else {
          ilmoitettu = null;
          juuri.querySelector('.pulma').classList.remove('pulma--ratkaistu');
          palauteEl.innerHTML = (tarkistus.syy === 'taytteet')
            ? 'Arvo osuu, mutta Basson tapa vaatii tasan ' + p.pizza.length +
              ' eri täytettä — nyt niitä on ' + new Set(arvot).size + '.'
            : '';
        }
      } else {
        tulosEl.textContent = '';
        tulosEl.className = 'tulos';
        ilmoitettu = null;
      }
      piirraLaskuri();
    }

    /* ⚠️ EI SULJE PULMAA. Ennen tätä oikea vastaus poisti kaikki napit
       käytöstä, eli luukku päättyi ensimmäiseen ratkaisuun — juuri se mitä
       Marko pyysi muuttamaan. Nyt lauseke jää ruudulle ja löytö kirjataan;
       `ilmoitettu` estää saman löydön kuittaamisen joka piirrolla. */
    function onnistui() {
      var tunnus = korttitunnus();
      juuri.querySelector('.pulma').classList.add('pulma--ratkaistu');
      if (ilmoitettu === tunnus) return;
      ilmoitettu = tunnus;
      var teksti = kierrosLauseke(v).trim() + ' = ' + p.arvo;
      var laji = lisaaLoyto(avain(), tunnus, teksti);
      var n = loytoja(avain()), kaikki = tavoite(p, tapa);
      var porras = porrasTeksti(n, kaikki, SANA, 'valmistaa pizza');
      palauteEl.innerHTML = laji === 'uusi'
        ? '<b>Oikein!</b> ' + teksti + '.' +
          (porras || (n >= kaikki ? ' Löysit kaikki tavat!'
                                  : ' Löydätkö vielä toisen tavan?'))
        : (laji === 'uusi-lauseke'
            ? '<b>Oikein!</b> ' + teksti + '. Samat kortit, uusi lauseke.'
            : '<b>Oikein!</b> ' + teksti + '. Tämän tavan löysit jo.');
      valmis();
    }

    if (tavat.length > 1) {
      juuri.querySelector('[data-tavat]').addEventListener('click', function (e) {
        var b = e.target.closest('[data-tapa]');
        if (!b || b.dataset.tapa === tapa) return;
        tapa = b.dataset.tapa;
        tyhjenna();
      });
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
    return function koeRatkaisu(kortit, merkit, ryhmat, koeTapa) {
      return kierrosTarkista(kierros,
        { kortit: kortit, merkit: merkit, ryhmat: ryhmat || [] },
        SALLITUT, (koeTapa || tapa) === 'basso');
    };
  }

  /* ---------- lautapulma: vaaka, varasto ja linjasto ---------- */

  function lautapulma(p, juuri, valmis, pohja) {
    var alku = p.linjasto.slice();
    var linjalla = alku.slice();      /* pelaajan muokkaama tila */
    var ilmoitettu = null;
    var avain = loytoAvain(pohja, 'lauta');

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
      '  <div class="laskuri" data-laskuri></div>' +
      '  <div class="loydot" data-loydot></div>' +
      '  <button type="button" class="nappi nappi--pieni" data-uudelleen hidden>Kokeile toista tapaa</button>' +
      '</div>';

    var linjaEl = juuri.querySelector('[data-linja]');
    var varastoEl = juuri.querySelector('[data-varasto]');
    var vaakaEl = juuri.querySelector('[data-vaaka]');
    var palauteEl = juuri.querySelector('[data-palaute]');
    var laskuriEl = juuri.querySelector('[data-laskuri]');
    var loydotEl = juuri.querySelector('[data-loydot]');
    var uudelleenEl = juuri.querySelector('[data-uudelleen]');

    uudelleenEl.addEventListener('click', function () {
      linjalla = alku.slice();
      ilmoitettu = null;
      palauteEl.innerHTML = '';
      juuri.querySelector('.pulma').classList.remove('pulma--ratkaistu');
      piirra();
    });

    function tuodut() {
      return linjalla.filter(function (a) { return alku.indexOf(a) < 0; });
    }
    function viedyt() {
      return alku.filter(function (a) { return linjalla.indexOf(a) < 0; });
    }
    function summa(l) { return l.reduce(function (a, b) { return a + b; }, 0); }

    /* Vaaka: sisään tuotujen summa = noppa + yksi takaisin viety. */
    function tasaako() {
      return viedyt().length <= 1 && tuodut().length > 0 &&
        summa(tuodut()) === p.noppa + summa(viedyt());
    }
    /* ⚠️ PERUSSIIRTOON EI SAA YHDISTÄÄ MUITA SIIRTOJA: jos nopan luvun
       kokoinen täyte tuodaan, se tulee yksin eikä mitään palauteta
       (apinavaaka.js 423 ja 830, sama ehto `siirrot`issa). Tämä puuttui
       3.11.2026 asti, ja mitattuna sen ohi pääsi kolmessa pulmassa. */
    function perussiirtoOk() {
      var sis = tuodut();
      return !(sis.indexOf(p.noppa) >= 0 && (sis.length > 1 || viedyt().length));
    }
    function pizzatSyntyvat() {
      return p.pizzat.every(function (pz) {
        return pz.every(function (a) { return linjalla.indexOf(a) >= 0; });
      });
    }
    function kelpaa() { return tasaako() && perussiirtoOk() && pizzatSyntyvat(); }

    function siirtotunnus() {
      return tuodut().slice().sort(function (a, b) { return a - b; }).join(',') +
        '|' + (viedyt()[0] || 0);
    }

    function piirraLaskuri() {
      laskuriEl.innerHTML = laskuriTeksti(loytoja(avain), p.ratkaisuja, SANA_LAUTA);
      loydotEl.innerHTML = loytoRivit(loytolista(avain), 'Löytämäsi siirrot');
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
      uudelleenEl.hidden = !(sis.length || ulos.length);
      vaakaEl.innerHTML = sis.length || ulos.length
        ? '<b>' + (sis.join(' + ') || '0') + ' = ' + summa(sis) + '</b> ' +
          (ulos.length ? '· noppa ' + p.noppa + ' + takaisin ' + ulos.join(' + ') +
                         ' = ' + (p.noppa + summa(ulos))
                       : '· noppa ' + p.noppa) +
          (tasaako() ? ' <span class="tulos--osuu">tasaa</span>'
                     : ' <span class="tulos--ohi">ei tasaa</span>')
        : '<span class="tyhja">Napauta täytteitä: varastosta linjastolle ja takaisin.</span>';

      if (kelpaa()) onnistui();
      else {
        ilmoitettu = null;
        juuri.querySelector('.pulma').classList.remove('pulma--ratkaistu');
        if (ulos.length > 1) {
          palauteEl.textContent = 'Vaakaan mahtuu vain yksi takaisin vietävä täyte.';
        } else if (!perussiirtoOk()) {
          palauteEl.textContent = 'Perussiirtoon ei voi yhdistää muita siirtoja: ' +
            'nopan luvun kokoinen täyte tulee yksin.';
        } else if (tasaako() && !pizzatSyntyvat()) {
          palauteEl.textContent = 'Vaaka tasaa, mutta kaikkia pizzoja ei vielä voi valmistaa.';
        } else {
          palauteEl.textContent = '';
        }
      }
      piirraLaskuri();
    }

    function onnistui() {
      var tunnus = siirtotunnus();
      juuri.querySelector('.pulma').classList.add('pulma--ratkaistu');
      if (ilmoitettu === tunnus) return;
      ilmoitettu = tunnus;
      var teksti = summa(tuodut()) + ' = noppa ' + p.noppa +
        (viedyt().length ? ' + takaisin ' + viedyt()[0] : '') +
        '  (' + tuodut().join(' + ') + ')';
      var laji = lisaaLoyto(avain, tunnus, teksti);
      var n = loytoja(avain), kaikki = p.ratkaisuja;
      var porras = porrasTeksti(n, kaikki, SANA_LAUTA, '');
      palauteEl.innerHTML = '<b>Oikein!</b> ' + teksti + '.' +
        (laji === 'tuttu' ? ' Tämän siirron löysit jo.'
          : (porras || (n >= kaikki ? ' Löysit kaikki siirrot!'
                                    : ' Löydätkö vielä toisen siirron?')));
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
      return { oikein: kelpaa(),
               syy: !tasaako() ? 'vaaka'
                    : (!perussiirtoOk() ? 'perussiirto'
                                        : (pizzatSyntyvat() ? null : 'pizzat')) };
    };
  }

  /* ---------- luukku ---------- */

  function merkitseRatkaistu(paiva, i) {
    var avain = paiva + '-' + i;
    if (tila.ratkotut.indexOf(avain) < 0) {
      tila.ratkotut.push(avain);
      kirjoita(AVAIN + '-ratkotut', tila.ratkotut);
    }
    paivitaTila();
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
        (p.laji === 'kortti' ? 'Korttipeli' : 'Lautapeli') + '</div>';
      var pelialue = document.createElement('div');
      lohko.appendChild(pelialue);
      sisus.appendChild(lohko);
      var pohja = luukku.paiva + '-' + i;
      var valmis = function () { merkitseRatkaistu(luukku.paiva, i); };
      /* ⚠️ EI «NÄYTÄ RATKAISU» -NAPPIA (Marko 3.11.2026). Kun tapoja on
         kymmeniä, valmis vastaus ei auta jumista vaan ohittaa koko pulman —
         ja se on ristiriidassa sen kanssa että luukku pyytää etsimään
         useamman tavan. `p.ratkaisu` jää dataan ihmisen luettavaksi
         (tarkastuslista, `sisalto/joulukalenteri-fi.json`). */
      if (p.laji === 'kortti') korttipulma(p, pelialue, valmis, pohja);
      else lautapulma(p, pelialue, valmis, pohja);
    });
    document.getElementById('arkki').showModal();
    if (tila.auki.indexOf(luukku.paiva) < 0) {
      tila.auki.push(luukku.paiva);
      kirjoita(AVAIN, tila.auki);
      nappi.classList.add('luukku--auki');
      paivitaTila();
    }
  }

  function loytojaKaikkiaan() {
    return Object.keys(tila.loydot).reduce(function (s, a) {
      return s + Object.keys(tila.loydot[a]).length;
    }, 0);
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
      tila.ratkotut.length + '/' + pulmia + ' pulmaa · ' +
      loytojaKaikkiaan() + ' eri ratkaisua löydetty.';
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
   * Kolme eri koetta, ja jokainen vastaa eri kysymykseen:
   *
   *   1  tallennettu ratkaisu kelpaa sivun tarkistukselle
   *   2  LAUTAPULMAN RATKAISUJEN MÄÄRÄ: sivu laskee ne itse ja luku on
   *      verrattava generaattorin lukuun. Tämä on ainoa koe joka näkee jos
   *      vaa'an sääntö on sivulla löysempi tai tiukempi kuin pelissä —
   *      yksittäinen oikea ratkaisu menee läpi kummallakin.
   *   3  BASSON TAVAN OLEMASSAOLO: pelin oma haku (`etsiRatkaisu`) löytää
   *      Basson tavan ratkaisun tasan niissä pulmissa joissa generaattori
   *      sanoo niitä olevan. Tämä olisi nähnyt «vähintään / tasan» -eron.
   *
   * ⚠️ Jokainen koe kertoo MONTAKO TAPAUSTA se ajoi. Tyhjä sarja näyttää
   * muuten täsmälleen samalta kuin läpäisty. */
  function koeAjo() {
    var rivit = [], virheita = 0, ajettu = { a: 0, b: 0, c: 0 };
    var piilo = document.createElement('div');
    piilo.style.display = 'none';
    document.body.appendChild(piilo);

    function kirjaa(ok, teksti) {
      if (!ok) virheita++;
      rivit.push((ok ? 'OK   ' : '🔴 ') + teksti);
    }

    tila.data.luukut.forEach(function (L) {
      L.pulmat.forEach(function (p, i) {
        var tunnus = L.paiva + '/' + (i + 1) + ' ' + p.laji;
        var pohja = 'koe-' + L.paiva + '-' + i;
        if (p.laji === 'kortti') {
          var koe = korttipulma(p, piilo, function () {}, pohja);
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
          ajettu.a++;
          kirjaa(koe(kortit, merkitLausekkeesta(p.lauseke, kortit.length),
                     ryhmatLausekkeesta(p.lauseke), p.tapa).oikein,
                 tunnus + ' tallennettu ratkaisu (' + p.tapa + ')');
          /* 3: ONKO BASSON TAPAA. Pelin oma haku (`etsiRatkaisu`) joko löytää
             tasan `pizza.length` eri arvoa käyttävän ratkaisun tai ei, ja
             generaattorin luvun pitää sanoa sama. Tämä olisi nähnyt
             «vähintään / tasan» -eron, ja se ratkaisee tarjotaanko Basson
             tapaa lainkaan (📐 14 pulmaa 16:sta).

             ⚠️ MÄÄRÄÄ TÄLLÄ EI VOI LASKEA: `etsiRatkaisu` saa käyttää
             annetusta kädestä osajoukon, joten «löytyi» ei kerro mitä
             kortteja. Generaattorin luku on eri kysymys (mitkä korttijoukot),
             ja sen vartija on generaattorin oma tarkistus. */
          var pelinKasi = p.kasi.map(function (a) {
            return { arvo: a, fantasia: false };
          });
          var r = etsiRatkaisu(pelinKasi, p.arvo, SALLITUT, p.pizza.length, 200000);
          ajettu.c++;
          kirjaa(!!(r && r.kortit) === (p.ratkaisujaBasso > 0),
                 tunnus + ' Basson tapa: haku ' + (r && r.kortit ? 'löysi' : 'ei löytänyt') +
                 ', luku ' + p.ratkaisujaBasso);
        } else {
          var lkoe = lautapulma(p, piilo, function () {}, pohja);
          ajettu.a++;
          kirjaa(lkoe(p.siirto, p.takaisin).oikein, tunnus + ' tallennettu siirto');
          /* 2: laske kaikki kelpaavat siirrot sivun omalla tarkistuksella. */
          var vapaat = [];
          for (var a = 1; a <= 10; a++) if (p.linjasto.indexOf(a) < 0) vapaat.push(a);
          var paluut = [0].concat(p.linjasto);
          var n = 0;
          for (var maski = 1; maski < (1 << vapaat.length); maski++) {
            var S = vapaat.filter(function (x, k) { return maski & (1 << k); });
            for (var t = 0; t < paluut.length; t++) {
              if (lkoe(S, paluut[t]).oikein) n++;
            }
          }
          ajettu.b++;
          kirjaa(n === p.ratkaisuja,
                 tunnus + ' ratkaisujen määrä: sivu ' + n + ', generaattori ' + p.ratkaisuja);
        }
      });
    });
    piilo.remove();
    /* ⚠️ Löydöt eivät saa jäädä kokeesta muistiin: koe ratkoo joka pulman. */
    Object.keys(tila.loydot).forEach(function (a) {
      if (a.indexOf('koe-') === 0) delete tila.loydot[a];
    });
    kirjoita(AVAIN + '-loydot', tila.loydot);

    var ulos = document.createElement('pre');
    ulos.id = 'koetulos';
    ulos.textContent = (virheita ? '🔴 ' + virheita + ' VIRHETTÄ\n'
                                 : 'Kaikki ' + rivit.length + ' väitettä pitävät\n') +
      'tallennetut ' + ajettu.a + ' · lautalaskennat ' + ajettu.b +
      ' · Basso-haut ' + ajettu.c + '\n' + rivit.join('\n');
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
