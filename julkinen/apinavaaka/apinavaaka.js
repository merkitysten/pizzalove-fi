/* Apinavaaka – pikkupeli pizzalove.fi:hin (ja Learn with Bassoon).
 *
 * Opettaa kaksi asiaa, jotka lautapelissä koetaan vaikeiksi:
 *   1) Torni = luku. Samanväriset nappulat liikkuvat aina yhtenä tornina.
 *   2) Apinavaaka on apuväline: kun tornit ovat yhtä korkeat, siirto täsmää.
 *
 * Periaate (Marko 6.10.2026): mahtuu yhdelle puhelimen ruudulle, mahdollisimman vähän
 * tekstiä, ohjeet Basso-napin takana.
 *
 * Käyttö:  <div class="apinavaaka" data-kieli="fi"></div>
 *          <script src="apinavaaka/noppa3d.js"></script>
 *          <script src="apinavaaka/apinavaaka.js"></script>
 * Kuvat: apinavaaka/*.webp (Markon apinavaaka.psd), noppa/*.svg (Merkitysten-nopan tahkot).
 */
(function () {
  'use strict';
  var KANSIO = document.currentScript ? document.currentScript.src.replace(/[^/]*$/, '') : '../apinavaaka/';

  // ---------------------------------------------------------------- kuvan geometria
  // PSD:n pikseleitä; ylhäältä leikattu 250 px, alhaalta rajattu ruokalapun alle.
  var W = 3210, H = 2470;
  var OSAT = {
    vartalo: [255, 0, 2926, 2470],
    vasen:   [0, 1585, 1256, 564],
    oikea:   [1911, 1601, 1299, 513],
    saihkeet:[1162, 22, 1131, 681],
    lamppu:  [1475, 210, 403, 672]
  };
  var NIVEL_V = [1240, 1790], NIVEL_O = [1925, 1775];   // olkapäät
  var SYMB_V = [508, 1655],  SYMB_O = [2700, 1668];     // symbaalien keskikohta
  var RUOKALAPPU = { '<': [1362, 2318], '=': [1632, 2318], '>': [1902, 2318] };  // < = > ruokalapussa
  var MAKSIMIKULMA = 9;

  var VARIT = ['#090A0D', '#E62448', '#FFDF00', '#1072B9', '#EF7925',
               '#824292', '#16A74F', '#7F3B1E', '#E473AA', '#6AC0B2'];

  // ---------------------------------------------------------------- tekstit (lyhyet!)
  var T = {
    fi: {
      heita: 'Heitä noppaa!',
      vihjeet: { A: 'Etsi yhtä korkea torni.', B: 'Kokoa pienemmistä torneista.',
        C: 'Nosta linjaston torni punnusten päälle.', X: 'Tee tornit yhtä korkeiksi.', H: 'Hävikki! Vie linjastolta varastoon.' },
      vainYksi: 'Vain yksi torni linjastolta.',
      vie: 'Vie linjastolle', vieV: 'Vie varastoon',
      hyva: 'Hienoa!', party: 'Pizzapartyt!',
      varasto: 'Varasto', linjasto: 'Linjasto', noppa: 'Noppa', ohjeet: 'Ohjeet', sulje: 'Sulje',
      alusta: 'Aloita alusta', vapaa: 'Vapaa peli',
      info: '<h2>Apinavaaka</h2><ol><li>Heitä noppaa. Punnukset tulevat apinan vasempaan käteen.</li>' +
        '<li>Napauta torneja. Tee tornit yhtä korkeiksi.</li><li>Kun lamppu syttyy, vie tornit linjastolle.</li></ol>' +
        '<p>Torni liikkuu aina kokonaisena. Tornin korkeus on täytteen luku.</p>' +
        '<dl class="av__tavat"><dt>A</dt><dd>Perussiirto <b>3 = 3</b></dd><dt>B</dt><dd>Summasiirto <b>1 + 2 = 3</b></dd>' +
        '<dt>C</dt><dd>Erotussiirto <b>5 − 2 = 3</b></dd></dl>' +
        '<p><b>Hävikki:</b> nopan luku on suurempi kuin varasto. Tornit viedään linjastolta varastoon.</p>' +
        '<p><b>Pizzapartyt:</b> linjasto on täynnä!</p>',
      taytteet: ['Oliivi', 'Tomaatti', 'Ananas', 'Homejuusto', 'Katkarapu', 'Munakoiso', 'Rucola', 'Herkkusieni', 'Kinkku', 'Kala']
    },
    sv: {
      heita: 'Kasta tärningen!',
      vihjeet: { A: 'Hitta ett lika högt torn.', B: 'Bygg av mindre torn.',
        C: 'Lyft ett torn från linjen ovanpå vikterna.', X: 'Gör tornen lika höga.', H: 'Svinn! Flytta från linjen till lagret.' },
      vainYksi: 'Bara ett torn från linjen.',
      vie: 'Flytta till linjen', vieV: 'Flytta till lagret',
      hyva: 'Bra!', party: 'Pizzaparty!',
      varasto: 'Lager', linjasto: 'Linje', noppa: 'Tärning', ohjeet: 'Instruktioner', sulje: 'Stäng',
      alusta: 'Börja om', vapaa: 'Fritt spel',
      info: '<h2>Apavågen</h2><ol><li>Kasta tärningen. Vikterna hamnar i apans vänstra hand.</li>' +
        '<li>Tryck på tornen. Gör tornen lika höga.</li><li>När lampan tänds, flytta tornen till linjen.</li></ol>' +
        '<p>Ett torn flyttas alltid helt. Tornets höjd är fyllningens tal.</p>' +
        '<dl class="av__tavat"><dt>A</dt><dd>Basflytt <b>3 = 3</b></dd><dt>B</dt><dd>Summaflytt <b>1 + 2 = 3</b></dd>' +
        '<dt>C</dt><dd>Skillnadsflytt <b>5 − 2 = 3</b></dd></dl>' +
        '<p><b>Svinn:</b> tärningen visar mer än lagret. Torn flyttas från linjen till lagret.</p>' +
        '<p><b>Pizzaparty:</b> linjen är full!</p>',
      taytteet: ['Oliv', 'Tomat', 'Ananas', 'Ädelost', 'Räka', 'Aubergine', 'Ruccola', 'Champinjon', 'Skinka', 'Fisk']
    },
    en: {
      heita: 'Roll the dice!',
      vihjeet: { A: 'Find a tower just as high.', B: 'Build it from smaller towers.',
        C: 'Lift a tower from the line onto the weights.', X: 'Make the towers equally high.', H: 'Food waste! Move from the line to the storage.' },
      vainYksi: 'Only one tower from the line.',
      vie: 'Move to the line', vieV: 'Move to the storage',
      hyva: 'Well done!', party: 'Pizza party!',
      varasto: 'Storage', linjasto: 'Line', noppa: 'Dice', ohjeet: 'Instructions', sulje: 'Close',
      alusta: 'Start over', vapaa: 'Free play',
      info: '<h2>Monkey scales</h2><ol><li>Roll the dice. The weights go to the monkey\'s left hand.</li>' +
        '<li>Tap the towers. Make the towers equally high.</li><li>When the lamp lights up, move the towers to the line.</li></ol>' +
        '<p>A tower always moves as a whole. Its height is the topping\'s number.</p>' +
        '<dl class="av__tavat"><dt>A</dt><dd>Basic move <b>3 = 3</b></dd><dt>B</dt><dd>Sum move <b>1 + 2 = 3</b></dd>' +
        '<dt>C</dt><dd>Difference move <b>5 − 2 = 3</b></dd></dl>' +
        '<p><b>Food waste:</b> the dice shows more than the storage. Towers go from the line to the storage.</p>' +
        '<p><b>Pizza party:</b> the line is full!</p>',
      taytteet: ['Olive', 'Tomato', 'Pineapple', 'Blue cheese', 'Shrimp', 'Aubergine', 'Rocket', 'Mushroom', 'Ham', 'Fish']
    },
    de: {
      heita: 'Würfle!',
      vihjeet: { A: 'Finde einen gleich hohen Turm.', B: 'Bau ihn aus kleineren Türmen.',
        C: 'Heb einen Turm von der Linie auf die Gewichte.', X: 'Mach die Türme gleich hoch.', H: 'Verschwendung! Von der Linie ins Lager.' },
      vainYksi: 'Nur ein Turm von der Linie.',
      vie: 'Auf die Linie', vieV: 'Ins Lager',
      hyva: 'Super!', party: 'Pizzaparty!',
      varasto: 'Lager', linjasto: 'Linie', noppa: 'Würfel', ohjeet: 'Anleitung', sulje: 'Schließen',
      alusta: 'Von vorn', vapaa: 'Freies Spiel',
      info: '<h2>Affenwaage</h2><ol><li>Würfle. Die Gewichte kommen in die linke Hand des Affen.</li>' +
        '<li>Tippe auf die Türme. Mach die Türme gleich hoch.</li><li>Wenn die Lampe leuchtet, bring die Türme auf die Linie.</li></ol>' +
        '<p>Ein Turm bewegt sich immer ganz. Seine Höhe ist die Zahl der Zutat.</p>' +
        '<dl class="av__tavat"><dt>A</dt><dd>Grundzug <b>3 = 3</b></dd><dt>B</dt><dd>Summenzug <b>1 + 2 = 3</b></dd>' +
        '<dt>C</dt><dd>Differenzzug <b>5 − 2 = 3</b></dd></dl>' +
        '<p><b>Verschwendung:</b> der Würfel zeigt mehr als das Lager. Türme gehen von der Linie ins Lager.</p>' +
        '<p><b>Pizzaparty:</b> die Linie ist voll!</p>',
      taytteet: ['Olive', 'Tomate', 'Ananas', 'Blauschimmelkäse', 'Garnele', 'Aubergine', 'Rucola', 'Champignon', 'Schinken', 'Fisch']
    }
  };

  // ---------------------------------------------------------------- harjoitustehtävät
  // linjasto = täytteet, jotka ovat alussa linjastolla. Tämän jälkeen vapaa peli,
  // jossa varasto ja linjasto jatkuvat kierroksesta toiseen. Siirto onnistuu aina
  // (tarkistettu kaikille 1024 jaolle ja nopan luvuille 1–10) tai syntyy hävikkiä.
  var TEHTAVAT = [
    { tapa: 'A', noppa: 3, linjasto: [] },
    { tapa: 'A', noppa: 7, linjasto: [2, 5] },
    { tapa: 'B', noppa: 3, linjasto: [3] },
    { tapa: 'B', noppa: 6, linjasto: [6, 5, 9] },
    { tapa: 'C', noppa: 3, linjasto: [1, 2, 3] },
    { tapa: 'C', noppa: 2, linjasto: [1, 2, 4, 6] }
  ];

  // ---------------------------------------------------------------- apurit
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function pros(x, koko) { return (x / koko * 100) + '%'; }
  function summa(a) { return a.reduce(function (s, x) { return s + x; }, 0); }
  function kierra(p, nivel, kulma) {
    var r = kulma * Math.PI / 180, dx = p[0] - nivel[0], dy = p[1] - nivel[1];
    return [nivel[0] + dx * Math.cos(r) - dy * Math.sin(r), nivel[1] + dx * Math.sin(r) + dy * Math.cos(r)];
  }

  // ---------------------------------------------------------------- komponentti
  function Apinavaaka(juuri) {
    var kieli = juuri.getAttribute('data-kieli') || (document.documentElement.lang || 'fi').slice(0, 2);
    var t = T[kieli] || T.en;
    var vahennaLiike = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var tila = { nro: 0, paikka: {}, lahde: {}, oikea: [], vasen: [] };

    juuri.innerHTML = '';
    juuri.classList.add('av');

    // --- yläpalkki: Basso (ohjeet) · edistyminen · noppa
    var ylapalkki = el('div', 'av__ylapalkki');
    var infoNappi = el('button', 'av__info');
    infoNappi.type = 'button';
    infoNappi.setAttribute('aria-label', t.ohjeet);
    infoNappi.innerHTML = '<img src="' + KANSIO + 'basso-paa.webp" alt=""><span aria-hidden="true">?</span>';
    var pisteet = el('div', 'av__pisteet');
    var noppaEl = el('button', 'av__noppa');
    noppaEl.type = 'button';
    noppaEl.innerHTML = '<span class="av__d10"></span>';
    var noppa3d = window.Noppa3D(noppaEl.querySelector('.av__d10'), KANSIO + 'noppa/');
    ylapalkki.appendChild(infoNappi); ylapalkki.appendChild(pisteet); ylapalkki.appendChild(noppaEl);
    juuri.appendChild(ylapalkki);

    // --- näyttämö
    var nayttamo = el('div', 'av__nayttamo');
    nayttamo.style.aspectRatio = W + ' / ' + H;
    function kuva(nimi, tiedosto) {
      var o = OSAT[nimi], i = el('img', 'av__' + nimi);
      i.src = KANSIO + (tiedosto || nimi) + '.webp';
      i.alt = ''; i.draggable = false;
      i.style.left = pros(o[0], W); i.style.top = pros(o[1], H); i.style.width = pros(o[2], W);
      return i;
    }
    var kasiV = kuva('vasen'), kasiO = kuva('oikea');
    [[kasiV, NIVEL_V, 'vasen'], [kasiO, NIVEL_O, 'oikea']].forEach(function (k) {
      var o = OSAT[k[2]];
      k[0].style.transformOrigin = pros(k[1][0] - o[0], o[2]) + ' ' + pros(k[1][1] - o[1], o[3]);
    });
    var lamppuPaalla = kuva('lamppu');
    lamppuPaalla.classList.add('av__lamppu--paalla');
    nayttamo.appendChild(kasiV); nayttamo.appendChild(kasiO);
    nayttamo.appendChild(kuva('vartalo'));
    nayttamo.appendChild(kuva('saihkeet')); nayttamo.appendChild(kuva('lamppu', 'lamppu-pois')); nayttamo.appendChild(lamppuPaalla);
    var merkki = el('span', 'av__merkki');          // korostus ruokalapun < = > -merkin päällä
    nayttamo.appendChild(merkki);
    var pinoV = el('div', 'av__pino'), pinoO = el('div', 'av__pino');
    var lukuV = el('span', 'av__luku'), lukuO = el('span', 'av__luku');
    [pinoV, pinoO, lukuV, lukuO].forEach(function (x) { nayttamo.appendChild(x); });
    var juhla = el('div', 'av__juhla');
    nayttamo.appendChild(juhla);
    juuri.appendChild(nayttamo);

    // --- viestirivi (teksti tai nappi)
    var rivi = el('div', 'av__rivi');
    rivi.setAttribute('aria-live', 'polite');
    juuri.appendChild(rivi);

    // --- hyllyt
    var hyllyt = el('div', 'av__hyllyt');
    var varastoEl = el('div', 'av__hylly'), linjastoEl = el('div', 'av__hylly av__hylly--linjasto');
    hyllyt.appendChild(varastoEl); hyllyt.appendChild(linjastoEl);
    juuri.appendChild(hyllyt);

    // --- ohjeikkuna
    var ikkuna = el('div', 'av__ikkuna');
    ikkuna.hidden = true;
    ikkuna.setAttribute('role', 'dialog');
    ikkuna.setAttribute('aria-modal', 'true');
    ikkuna.innerHTML = '<div class="av__ikkuna-sisus"><img class="av__ikkuna-basso" src="' + KANSIO + 'basso.webp" alt="">' +
      t.info + '<div class="av__ikkuna-napit"></div><button type="button" class="av__sulje" aria-label="' + t.sulje + '">×</button></div>';
    juuri.appendChild(ikkuna);
    var ikkunaNapit = ikkuna.querySelector('.av__ikkuna-napit');
    function nappi(kohde, teksti, luokka, f) {
      var x = el('button', 'nappi' + (luokka ? ' ' + luokka : ''), teksti);
      x.type = 'button'; x.addEventListener('click', f); kohde.appendChild(x);
      return x;
    }
    function avaa() { ikkuna.hidden = false; ikkuna.querySelector('.av__sulje').focus(); }
    function sulje() { ikkuna.hidden = true; infoNappi.focus(); }
    infoNappi.addEventListener('click', avaa);
    ikkuna.querySelector('.av__sulje').addEventListener('click', sulje);
    ikkuna.addEventListener('click', function (e) { if (e.target === ikkuna) sulje(); });
    ikkuna.addEventListener('keydown', function (e) { if (e.key === 'Escape') sulje(); });
    nappi(ikkunaNapit, t.alusta, 'nappi--toinen', function () { sulje(); tila.nro = 0; aloita(TEHTAVAT[0]); });
    nappi(ikkunaNapit, t.vapaa, 'nappi--toinen', function () { sulje(); aloitaVapaa(); });

    // --- tornin piirto
    function torni(luku, punnus) {
      var d = el('span', 'av__torni');
      for (var i = 0; i < luku; i++) {
        var p = el('i');
        if (punnus) { p.className = 'av__punnus'; p.textContent = i + 1; p.style.setProperty('--i', i); }
        else p.style.background = VARIT[luku - 1];
        d.appendChild(p);
      }
      return d;
    }

    // --- noppa
    var pyorii = false;
    function heita() {
      if (pyorii || tila.heitetty || !tila.tehtava) return;
      pyorii = true;
      noppaEl.classList.remove('av__noppa--odottaa');
      rivi.textContent = '';
      noppa3d.heita(tila.tehtava.noppa, function () {
        pyorii = false; tila.heitetty = true; tila.uusiHeitto = true;
        piirra();
      }, vahennaLiike);
    }
    noppaEl.addEventListener('click', heita);

    // --- kierrokset
    function nollaa() {
      tila.oikea = []; tila.vasen = []; tila.lahde = {}; tila.valmis = false; tila.siirretty = false;
      tila.viesti = ''; tila.heitetty = false;
      noppa3d.odota(); noppaEl.classList.add('av__noppa--odottaa');
    }
    function aloita(teht) {
      tila.tehtava = teht; tila.havikki = false; tila.paikka = {};
      for (var i = 1; i <= 10; i++) tila.paikka[i] = teht.linjasto.indexOf(i) >= 0 ? 'linjasto' : 'varasto';
      nollaa(); piirra();
    }
    function varastonSumma() {
      var x = 0; for (var i = 1; i <= 10; i++) if (tila.paikka[i] === 'varasto') x += i; return x;
    }
    function uusiKierros() {
      var d = 1 + Math.floor(Math.random() * 10);
      tila.havikki = d > varastonSumma();
      tila.tehtava = { tapa: tila.havikki ? 'H' : 'X', noppa: d };
      nollaa(); piirra();
    }
    function aloitaVapaa() {
      tila.nro = TEHTAVAT.length; tila.paikka = {};
      for (var i = 1; i <= 10; i++) tila.paikka[i] = 'varasto';
      uusiKierros();
    }

    // --- siirrot
    function napauta(n, mista) {
      if (tila.valmis || tila.siirretty || !tila.heitetty) { if (!tila.heitetty) tonaise(noppaEl); return; }
      var oikealle = mista === (tila.havikki ? 'linjasto' : 'varasto');
      if (!oikealle && tila.vasen.length) { tila.viesti = tila.havikki ? '' : t.vainYksi; piirra(); return; }
      tila.lahde[n] = mista;
      if (oikealle) { tila.paikka[n] = 'oikea'; tila.oikea.push(n); }
      else { tila.paikka[n] = 'vasen'; tila.vasen.push(n); }
      tila.viesti = '';
      piirra();
    }
    function palauta(n) {
      if (tila.siirretty) return;
      if (tila.paikka[n] === 'oikea') tila.oikea.splice(tila.oikea.indexOf(n), 1);
      else tila.vasen = [];
      tila.paikka[n] = tila.lahde[n];
      tila.viesti = '';
      piirra();
    }
    function vieSiirto() {
      tila.oikea.concat(tila.vasen).forEach(function (n) {
        tila.paikka[n] = tila.lahde[n] === 'varasto' ? 'linjasto' : 'varasto';
      });
      tila.siirretty = true;
      var vapaa = tila.nro >= TEHTAVAT.length;
      var party = varastonSumma() === 0;
      if (party) { juhla.textContent = t.party; juhla.classList.add('on'); }
      piirra();
      // seuraava kierros alkaa itsestään
      setTimeout(function () {
        juhla.classList.remove('on');
        if (!vapaa) {
          tila.nro++;
          if (tila.nro < TEHTAVAT.length) aloita(TEHTAVAT[tila.nro]); else aloitaVapaa();
        } else uusiKierros();
      }, party ? 2200 : 1300);
    }
    function tonaise(x) {
      x.classList.remove('av--tonaisu'); void x.offsetWidth; x.classList.add('av--tonaisu');
    }

    // --- piirto
    function piirra() {
      var teht = tila.tehtava, noppa = teht.noppa, heitetty = tila.heitetty;
      var vasenSumma = noppa + summa(tila.vasen), oikeaSumma = summa(tila.oikea);
      tila.valmis = !tila.siirretty && tila.oikea.length > 0 && vasenSumma === oikeaSumma;
      juuri.classList.toggle('av--havikki', heitetty && tila.havikki);

      // edistyminen: kuusi pistettä, vapaassa pelissä piilossa
      var p = '';
      if (tila.nro < TEHTAVAT.length) {
        for (var i = 0; i < TEHTAVAT.length; i++) {
          p += '<i class="' + (i < tila.nro || (i === tila.nro && tila.siirretty) ? 'tehty' : i === tila.nro ? 'nyt' : '') + '"></i>';
        }
      }
      pisteet.innerHTML = p;
      noppaEl.disabled = heitetty;
      noppaEl.setAttribute('aria-label', heitetty ? t.noppa + ': ' + noppa : t.heita);

      // vaaka
      var kulma = 0;
      if (!tila.siirretty && (tila.oikea.length || tila.vasen.length)) {
        kulma = Math.max(-MAKSIMIKULMA, Math.min(MAKSIMIKULMA, (oikeaSumma - vasenSumma) * 2.2));
      }
      var muunnos = 'rotate(' + kulma + 'deg)';
      kasiV.style.transform = muunnos; kasiO.style.transform = muunnos;
      var pV = kierra(SYMB_V, NIVEL_V, kulma), pO = kierra(SYMB_O, NIVEL_O, kulma);
      [[pinoV, pV, 0], [pinoO, pO, 0], [lukuV, pV, 330], [lukuO, pO, 330]].forEach(function (x) {
        x[0].style.left = pros(x[1][0], W); x[0].style.top = pros(x[1][1] + x[2], H);
      });

      // pinot
      pinoV.innerHTML = ''; pinoO.innerHTML = '';
      if (!tila.siirretty && heitetty) {
        var punn = el('span', 'av__pino-osa av__pino-osa--punnus' + (tila.uusiHeitto ? ' av__uusi' : ''));
        tila.uusiHeitto = false;
        punn.appendChild(torni(noppa, true));
        pinoV.appendChild(punn);
      }
      function pinoNappi(n, kohde) {
        var b = el('button', 'av__pino-osa');
        b.type = 'button';
        b.appendChild(torni(n));
        b.setAttribute('aria-label', t.taytteet[n - 1] + ' ' + n);
        b.addEventListener('click', function () { palauta(n); });
        kohde.appendChild(b);
      }
      tila.vasen.forEach(function (n) { pinoNappi(n, pinoV); });
      tila.oikea.forEach(function (n) { pinoNappi(n, pinoO); });

      // luvut symbaalien alla ja ruokalapun merkki
      var nayta = heitetty && !tila.siirretty;
      lukuV.textContent = nayta ? [noppa].concat(tila.vasen).join(' + ') : '';
      lukuO.textContent = nayta && tila.oikea.length ? tila.oikea.join(' + ') : '';
      lukuV.hidden = !lukuV.textContent; lukuO.hidden = !lukuO.textContent;
      var m = !nayta || !tila.oikea.length ? '' : vasenSumma === oikeaSumma ? '=' : vasenSumma < oikeaSumma ? '<' : '>';
      merkki.hidden = !m;
      if (m) {
        merkki.style.left = pros(RUOKALAPPU[m][0], W); merkki.style.top = pros(RUOKALAPPU[m][1], H);
        merkki.classList.toggle('av__merkki--ok', m === '=');
      }
      juuri.classList.toggle('av--valo', tila.valmis || tila.siirretty);

      // viestirivi: joko lyhyt teksti tai yksi nappi
      rivi.innerHTML = '';
      rivi.className = 'av__rivi';
      if (tila.valmis) {
        nappi(rivi, (tila.havikki ? t.vieV : t.vie) + ' →', '', vieSiirto);
      } else if (tila.siirretty) {
        rivi.textContent = t.hyva; rivi.classList.add('av__rivi--ok');
      } else if (!heitetty) {
        rivi.textContent = t.heita;
      } else {
        rivi.textContent = tila.viesti || t.vihjeet[teht.tapa];
        if (tila.havikki) rivi.classList.add('av__rivi--havikki');
      }

      // hyllyt
      [['varasto', varastoEl, t.varasto], ['linjasto', linjastoEl, t.linjasto]].forEach(function (h) {
        var nimi = h[0], kohde = h[1], hs = 0;
        for (var q = 1; q <= 10; q++) if (tila.paikka[q] === nimi) hs += q;
        kohde.innerHTML = '<span class="av__hylly-nimi">' + h[2] + ' <b>' + hs + '</b></span>';
        var paikat = el('div', 'av__paikat');
        for (var n = 1; n <= 10; n++) {
          var paikka = el('div', 'av__paikka');
          if (tila.paikka[n] === nimi) {
            var b = el('button', 'av__hylly-torni');
            b.type = 'button';
            b.appendChild(torni(n));
            b.setAttribute('aria-label', t.taytteet[n - 1] + ' ' + n);
            b.title = t.taytteet[n - 1];
            (function (n, nimi) { b.addEventListener('click', function () { napauta(n, nimi); }); })(n, nimi);
            if (tila.siirretty) b.disabled = true;
            paikka.appendChild(b);
          } else paikka.classList.add('av__paikka--tyhja');
          paikka.appendChild(el('small', null, String(n)));
          paikat.appendChild(paikka);
        }
        kohde.appendChild(paikat);
      });
    }

    function mitoita() {
      var u = nayttamo.clientWidth / W;
      nayttamo.style.setProperty('--pala', Math.max(6, Math.round(88 * u)) + 'px');
      nayttamo.style.setProperty('--leveys', Math.round(400 * u) + 'px');
    }
    if (window.ResizeObserver) new ResizeObserver(mitoita).observe(nayttamo);
    window.addEventListener('resize', mitoita);
    mitoita();
    if (vahennaLiike) juuri.classList.add('av--ei-liiketta');
    aloita(TEHTAVAT[0]);
  }

  function kaynnista() {
    Array.prototype.forEach.call(document.querySelectorAll('.apinavaaka'), function (j) {
      if (!j.__av) { j.__av = true; Apinavaaka(j); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kaynnista);
  else kaynnista();
})();
