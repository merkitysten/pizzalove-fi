/* Apinavaaka – pikkupeli pizzalove.fi:hin.
 *
 * Opettaa kaksi asiaa, jotka lautapelissä koetaan vaikeiksi:
 *   1) Torni = luku. Samanväriset nappulat liikkuvat aina yhtenä tornina.
 *   2) Apinavaaka on apuväline: kun tornit ovat yhtä korkeat, siirto täsmää.
 *
 * Käyttö sivulla:  <div class="apinavaaka" data-kieli="fi"></div>
 *                  <script src="../apinavaaka/apinavaaka.js" defer></script>
 * Kuvat: apinavaaka/*.webp (Markon apinavaaka.psd, tasot vartalo / kädet / lamppu / säihkeet).
 * Ei riippuvuuksia.
 */
(function () {
  'use strict';
  // Kuvien kansio = tämän skriptin kansio (otetaan talteen heti, ennen kuin currentScript katoaa).
  var KANSIO = document.currentScript ? document.currentScript.src.replace(/[^/]*$/, '') : '../apinavaaka/';

  // ---------------------------------------------------------------- kuvan geometria
  // Koordinaatit ovat alkuperäisen PSD:n pikseleitä (yläreunasta leikattu 250 px pois).
  var W = 3210, H = 4145;
  var OSAT = {            // x, y, leveys, korkeus
    vartalo: [255, 0, 2926, 4145],
    vasen:   [0, 1585, 1256, 564],
    oikea:   [1911, 1601, 1299, 513],
    saihkeet:[1162, 22, 1131, 681],
    lamppu:  [1475, 210, 403, 672]
  };
  var NIVEL_V = [1240, 1790], NIVEL_O = [1925, 1775];   // olkapäät (käsi kääntyy tästä)
  var SYMB_V = [508, 1655],  SYMB_O = [2700, 1668];     // symbaalien keskikohta (torni seisoo tässä)
  var MAKSIMIKULMA = 9;                                  // astetta

  var VARIT = ['#090A0D', '#E62448', '#FFDF00', '#1072B9', '#EF7925',
               '#824292', '#16A74F', '#7F3B1E', '#E473AA', '#6AC0B2'];

  // ---------------------------------------------------------------- tekstit
  var T = {
    fi: {
      otsikko: 'Kokeile apinavaakaa',
      ohje: 'Napauta varaston tornia, niin apina ottaa sen oikeaan käteensä. Kun tornit ovat yhtä korkeat, siirto on oikein.',
      noppa: 'Noppa', varasto: 'Varasto', linjasto: 'Linjasto',
      punnukset: 'punnusta',
      tehtava: 'Tehtävä', vapaa: 'Vapaa harjoittelu',
      tavat: { A: 'Perussiirto (A)', B: 'Summasiirto (B)', C: 'Erotussiirto (C)', X: 'Mikä tahansa siirto' },
      vihjeet: {
        A: 'Etsi varastosta torni, joka on yhtä korkea kuin punnusten torni.',
        B: 'Linjastolla on jo sopiva torni. Kokoa sama korkeus pienemmistä torneista.',
        C: 'Varaston tornit ovat liian korkeita. Napauta linjaston tornia, niin se nousee punnusten päälle.',
        X: 'Keksi itse, miten tornit saa yhtä korkeiksi.'
      },
      liianVahan: 'Liian matala. Lisää torneja oikeaan käteen.',
      liikaa: 'Liian korkea!',
      liikaaC: ' Kokeile pienempää – tai nosta linjaston torni punnusten päälle.',
      vainYksi: 'Linjastolta voi nostaa punnusten päälle vain yhden tornin.',
      tasapaino: 'Tasapaino!',
      vie: 'Vie linjastolle',
      valmis: 'Hienoa! Linjaston luku kasvoi {n}:llä.',
      seuraava: 'Seuraava tehtävä', heita: 'Heitä noppaa', alusta: 'Aloita alusta',
      kaikkiValmiit: 'Osaat kaikki kolme siirtoa! Jatka vapaalla harjoittelulla.',
      torni: 'torni', palauta: 'palauta',
      taytteet: ['Oliivi', 'Tomaatti', 'Ananas', 'Homejuusto', 'Katkarapu', 'Munakoiso', 'Rucola', 'Herkkusieni', 'Kinkku', 'Kala']
    },
    sv: {
      otsikko: 'Prova apavågen',
      ohje: 'Tryck på ett torn i lagret så tar apan det i sin högra hand. När tornen är lika höga är flytten rätt.',
      noppa: 'Tärning', varasto: 'Lager', linjasto: 'Linje',
      punnukset: 'vikter',
      tehtava: 'Uppgift', vapaa: 'Fri träning',
      tavat: { A: 'Basflytt (A)', B: 'Summaflytt (B)', C: 'Skillnadsflytt (C)', X: 'Valfri flytt' },
      vihjeet: {
        A: 'Hitta ett torn i lagret som är lika högt som viktornet.',
        B: 'Det passande tornet finns redan på linjen. Bygg samma höjd av mindre torn.',
        C: 'Tornen i lagret är för höga. Tryck på ett torn på linjen så lyfts det ovanpå vikterna.',
        X: 'Hitta själv ett sätt att göra tornen lika höga.'
      },
      liianVahan: 'För lågt. Lägg fler torn i högra handen.',
      liikaa: 'För högt!',
      liikaaC: ' Prova ett mindre – eller lyft ett torn från linjen ovanpå vikterna.',
      vainYksi: 'Du kan bara lyfta ett torn från linjen ovanpå vikterna.',
      tasapaino: 'Balans!',
      vie: 'Flytta till linjen',
      valmis: 'Bra! Linjens värde ökade med {n}.',
      seuraava: 'Nästa uppgift', heita: 'Kasta tärningen', alusta: 'Börja om',
      kaikkiValmiit: 'Du kan alla tre flyttar! Fortsätt med fri träning.',
      torni: 'torn', palauta: 'lägg tillbaka',
      taytteet: ['Oliv', 'Tomat', 'Ananas', 'Ädelost', 'Räka', 'Aubergine', 'Ruccola', 'Champinjon', 'Skinka', 'Fisk']
    },
    en: {
      otsikko: 'Try the monkey scales',
      ohje: 'Tap a tower in the storage and the monkey takes it in its right hand. When the towers are equally high, the move is right.',
      noppa: 'Dice', varasto: 'Storage', linjasto: 'Line',
      punnukset: 'weights',
      tehtava: 'Task', vapaa: 'Free practice',
      tavat: { A: 'Basic move (A)', B: 'Sum move (B)', C: 'Difference move (C)', X: 'Any move' },
      vihjeet: {
        A: 'Find a tower in the storage that is as high as the tower of weights.',
        B: 'The matching tower is already on the line. Build the same height from smaller towers.',
        C: 'The towers in the storage are too high. Tap a tower on the line to lift it on top of the weights.',
        X: 'Find your own way to make the towers equally high.'
      },
      liianVahan: 'Too low. Add towers to the right hand.',
      liikaa: 'Too high!',
      liikaaC: ' Try a smaller one – or lift a tower from the line on top of the weights.',
      vainYksi: 'You can only lift one tower from the line on top of the weights.',
      tasapaino: 'Balanced!',
      vie: 'Move to the line',
      valmis: 'Well done! The line grew by {n}.',
      seuraava: 'Next task', heita: 'Roll the dice', alusta: 'Start over',
      kaikkiValmiit: 'You know all three moves! Carry on with free practice.',
      torni: 'tower', palauta: 'put back',
      taytteet: ['Olive', 'Tomato', 'Pineapple', 'Blue cheese', 'Shrimp', 'Aubergine', 'Rocket', 'Mushroom', 'Ham', 'Fish']
    },
    de: {
      otsikko: 'Probier die Affenwaage aus',
      ohje: 'Tippe auf einen Turm im Lager, dann nimmt der Affe ihn in die rechte Hand. Wenn beide Türme gleich hoch sind, stimmt der Zug.',
      noppa: 'Würfel', varasto: 'Lager', linjasto: 'Linie',
      punnukset: 'Gewichte',
      tehtava: 'Aufgabe', vapaa: 'Freies Üben',
      tavat: { A: 'Grundzug (A)', B: 'Summenzug (B)', C: 'Differenzzug (C)', X: 'Beliebiger Zug' },
      vihjeet: {
        A: 'Finde im Lager einen Turm, der genauso hoch ist wie der Turm aus Gewichten.',
        B: 'Der passende Turm steht schon auf der Linie. Baue dieselbe Höhe aus kleineren Türmen.',
        C: 'Die Türme im Lager sind zu hoch. Tippe auf einen Turm auf der Linie, dann kommt er auf die Gewichte.',
        X: 'Finde selbst einen Weg, die Türme gleich hoch zu machen.'
      },
      liianVahan: 'Zu niedrig. Leg mehr Türme in die rechte Hand.',
      liikaa: 'Zu hoch!',
      liikaaC: ' Probier einen kleineren – oder heb einen Turm von der Linie auf die Gewichte.',
      vainYksi: 'Von der Linie darfst du nur einen Turm auf die Gewichte heben.',
      tasapaino: 'Gleichgewicht!',
      vie: 'Auf die Linie',
      valmis: 'Super! Die Linie ist um {n} gewachsen.',
      seuraava: 'Nächste Aufgabe', heita: 'Würfeln', alusta: 'Von vorn',
      kaikkiValmiit: 'Du kannst alle drei Züge! Weiter mit freiem Üben.',
      torni: 'Turm', palauta: 'zurücklegen',
      taytteet: ['Olive', 'Tomate', 'Ananas', 'Blauschimmelkäse', 'Garnele', 'Aubergine', 'Rucola', 'Champignon', 'Schinken', 'Fisch']
    }
  };

  // ---------------------------------------------------------------- tehtävät
  // linjasto = täytteet (luvut), jotka ovat alussa linjastolla; muut ovat varastossa.
  var TEHTAVAT = [
    { tapa: 'A', noppa: 3, linjasto: [] },
    { tapa: 'A', noppa: 7, linjasto: [2, 5] },
    { tapa: 'B', noppa: 3, linjasto: [3] },
    { tapa: 'B', noppa: 6, linjasto: [6, 5, 9] },
    { tapa: 'C', noppa: 3, linjasto: [1, 2, 3] },
    { tapa: 'C', noppa: 2, linjasto: [1, 2, 4, 6] }
  ];

  function ratkeava(noppa, linj) {
    var vars = [];
    for (var i = 1; i <= 10; i++) if (linj.indexOf(i) < 0) vars.push(i);
    var summat = {0: true};               // varaston osajoukkojen summat
    vars.forEach(function (v) {
      Object.keys(summat).map(Number).forEach(function (s) { summat[s + v] = true; });
    });
    if (summat[noppa]) return true;
    return linj.some(function (t) { return summat[noppa + t]; });
  }

  function arvoTehtava() {
    for (var k = 0; k < 200; k++) {
      var noppa = 1 + Math.floor(Math.random() * 10), linj = [];
      for (var i = 1; i <= 10; i++) if (Math.random() < 0.4) linj.push(i);
      if (ratkeava(noppa, linj)) return { tapa: 'X', noppa: noppa, linjasto: linj };
    }
    return { tapa: 'X', noppa: 3, linjasto: [] };
  }

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
    var kuvat = juuri.getAttribute('data-kuvat') || KANSIO;
    var vahennaLiike = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    var tila = { nro: 0, tehtava: null, paikka: {}, oikea: [], vasen: [], valmis: false, viesti: '' };

    // --- rakenne
    juuri.innerHTML = '';
    juuri.classList.add('av');
    var otsake = el('div', 'av__otsake');
    var tehtavaRivi = el('p', 'av__tehtava');
    otsake.appendChild(tehtavaRivi);
    var noppaEl = el('div', 'av__noppa');
    otsake.appendChild(noppaEl);
    juuri.appendChild(otsake);

    var vihje = el('p', 'av__vihje');
    juuri.appendChild(vihje);

    var nayttamo = el('div', 'av__nayttamo');
    nayttamo.style.aspectRatio = W + ' / ' + H;
    function kuva(nimi, tiedosto) {
      var o = OSAT[nimi], i = el('img', 'av__' + nimi);
      i.src = kuvat + (tiedosto || nimi) + '.webp';
      i.alt = ''; i.draggable = false;
      i.style.left = pros(o[0], W); i.style.top = pros(o[1], H); i.style.width = pros(o[2], W);
      return i;
    }
    var kasiV = kuva('vasen'), kasiO = kuva('oikea');
    [[kasiV, NIVEL_V, 'vasen'], [kasiO, NIVEL_O, 'oikea']].forEach(function (k) {
      var o = OSAT[k[2]];
      k[0].style.transformOrigin = pros(k[1][0] - o[0], o[2]) + ' ' + pros(k[1][1] - o[1], o[3]);
    });
    var saihkeet = kuva('saihkeet');
    var lamppuPois = kuva('lamppu', 'lamppu-pois'), lamppuPaalla = kuva('lamppu');
    lamppuPaalla.classList.add('av__lamppu--paalla');
    nayttamo.appendChild(kasiV); nayttamo.appendChild(kasiO);       // kädet vartalon taakse
    nayttamo.appendChild(kuva('vartalo'));
    nayttamo.appendChild(saihkeet); nayttamo.appendChild(lamppuPois); nayttamo.appendChild(lamppuPaalla);
    var pinoV = el('div', 'av__pino av__pino--vasen'), pinoO = el('div', 'av__pino av__pino--oikea');
    nayttamo.appendChild(pinoV); nayttamo.appendChild(pinoO);
    juuri.appendChild(nayttamo);

    var yhtalo = el('div', 'av__yhtalo');
    yhtalo.setAttribute('aria-live', 'polite');
    juuri.appendChild(yhtalo);
    var viesti = el('p', 'av__viesti');
    viesti.setAttribute('aria-live', 'polite');
    juuri.appendChild(viesti);
    var napit = el('div', 'av__napit');
    juuri.appendChild(napit);

    var hyllyt = el('div', 'av__hyllyt');
    var varastoEl = el('div', 'av__hylly'), linjastoEl = el('div', 'av__hylly av__hylly--linjasto');
    hyllyt.appendChild(varastoEl); hyllyt.appendChild(linjastoEl);
    juuri.appendChild(hyllyt);

    // --- tornin piirto
    function torni(luku, koko, punnus) {
      var d = el('span', 'av__torni');
      for (var i = 0; i < luku; i++) {
        var p = el('i');
        if (punnus) { p.className = 'av__punnus'; p.textContent = i + 1; }
        else p.style.background = VARIT[luku - 1];
        d.appendChild(p);
      }
      if (koko) d.style.setProperty('--pala', koko);
      return d;
    }

    // --- tehtävän aloitus
    function aloita(teht) {
      tila.tehtava = teht;
      tila.paikka = {};
      for (var i = 1; i <= 10; i++) tila.paikka[i] = teht.linjasto.indexOf(i) >= 0 ? 'linjasto' : 'varasto';
      tila.oikea = []; tila.vasen = []; tila.valmis = false; tila.siirretty = false; tila.viesti = '';
      piirra();
    }

    function napautaVarasto(n) {
      if (tila.valmis || tila.siirretty) return;
      tila.paikka[n] = 'oikea'; tila.oikea.push(n); tila.viesti = '';
      piirra();
    }
    function napautaLinjasto(n) {
      if (tila.valmis || tila.siirretty) return;
      if (tila.vasen.length) { tila.viesti = t.vainYksi; piirra(); return; }
      tila.paikka[n] = 'vasen'; tila.vasen.push(n); tila.viesti = '';
      piirra();
    }
    function palauta(n) {
      if (tila.siirretty) return;
      if (tila.paikka[n] === 'oikea') { tila.oikea.splice(tila.oikea.indexOf(n), 1); tila.paikka[n] = 'varasto'; }
      else if (tila.paikka[n] === 'vasen') { tila.vasen = []; tila.paikka[n] = 'linjasto'; }
      tila.viesti = '';
      piirra();
    }
    function vieLinjastolle() {
      tila.oikea.forEach(function (n) { tila.paikka[n] = 'linjasto'; });
      tila.vasen.forEach(function (n) { tila.paikka[n] = 'varasto'; });
      tila.siirretty = true;
      piirra();
    }

    // --- piirto
    function piirra() {
      var teht = tila.tehtava, noppa = teht.noppa;
      var vasenSumma = noppa + summa(tila.vasen), oikeaSumma = summa(tila.oikea);
      tila.valmis = !tila.siirretty && tila.oikea.length > 0 && vasenSumma === oikeaSumma;

      tehtavaRivi.innerHTML = (tila.nro < TEHTAVAT.length
        ? '<b>' + t.tehtava + ' ' + (tila.nro + 1) + '/' + TEHTAVAT.length + '</b> · '
        : '<b>' + t.vapaa + '</b> · ') + t.tavat[teht.tapa];
      noppaEl.innerHTML = '<span>' + t.noppa + '</span><b>' + noppa + '</b>';
      vihje.textContent = t.vihjeet[teht.tapa];

      // vaa'an kallistus: painavampi puoli alas
      var kulma = 0;
      if (!tila.siirretty && (tila.oikea.length || tila.vasen.length)) {
        kulma = Math.max(-MAKSIMIKULMA, Math.min(MAKSIMIKULMA, (oikeaSumma - vasenSumma) * 2.2));
      }
      if (tila.siirretty) kulma = 0;
      var muunnos = 'rotate(' + kulma + 'deg)';
      kasiV.style.transform = muunnos; kasiO.style.transform = muunnos;
      var pV = kierra(SYMB_V, NIVEL_V, kulma), pO = kierra(SYMB_O, NIVEL_O, kulma);
      pinoV.style.left = pros(pV[0], W); pinoV.style.top = pros(pV[1], H);
      pinoO.style.left = pros(pO[0], W); pinoO.style.top = pros(pO[1], H);

      // pinot käsissä
      pinoV.innerHTML = ''; pinoO.innerHTML = '';
      if (!tila.siirretty) {
        var punn = el('span', 'av__pino-osa av__pino-osa--punnus');
        punn.appendChild(torni(noppa, null, true));
        punn.setAttribute('aria-label', noppa + ' ' + t.punnukset);
        pinoV.appendChild(punn);
      }
      function pinoNappi(n, kohde) {
        var b = el('button', 'av__pino-osa');
        b.type = 'button';
        b.appendChild(torni(n));
        b.setAttribute('aria-label', t.taytteet[n - 1] + ' ' + n + ' – ' + t.palauta);
        b.addEventListener('click', function () { palauta(n); });
        kohde.appendChild(b);
      }
      tila.vasen.forEach(function (n) { pinoNappi(n, pinoV); });
      tila.oikea.forEach(function (n) { pinoNappi(n, pinoO); });

      // lamppu
      juuri.classList.toggle('av--valo', tila.valmis);

      // yhtälö
      var vasenTxt = [noppa].concat(tila.vasen).join(' + ');
      var oikeaTxt = tila.oikea.length ? tila.oikea.join(' + ') : '?';
      var merkki = !tila.oikea.length ? '' : vasenSumma === oikeaSumma ? '=' : vasenSumma < oikeaSumma ? '<' : '>';
      if (tila.siirretty) {
        yhtalo.innerHTML = '';
      } else {
        yhtalo.innerHTML = '<span>' + vasenTxt + '</span><b class="av__merkki' +
          (merkki === '=' ? ' av__merkki--ok' : '') + '">' + (merkki || '&nbsp;') + '</b><span>' + oikeaTxt + '</span>';
      }

      // viesti ja napit
      napit.innerHTML = '';
      var v = tila.viesti;
      if (tila.siirretty) {
        v = t.valmis.replace('{n}', noppa);
        var viimeinen = tila.nro === TEHTAVAT.length - 1;
        if (viimeinen) v += ' ' + t.kaikkiValmiit;
        var seur = el('button', 'nappi', (tila.nro >= TEHTAVAT.length - 1 ? t.heita : t.seuraava) + ' →');
        seur.type = 'button';
        seur.addEventListener('click', function () {
          tila.nro++;
          aloita(tila.nro < TEHTAVAT.length ? TEHTAVAT[tila.nro] : arvoTehtava());
        });
        napit.appendChild(seur);
        if (tila.nro >= TEHTAVAT.length - 1) {
          var al = el('button', 'nappi nappi--toinen', t.alusta);
          al.type = 'button';
          al.addEventListener('click', function () { tila.nro = 0; aloita(TEHTAVAT[0]); });
          napit.appendChild(al);
        }
      } else if (tila.valmis) {
        v = t.tasapaino + ' ' + vasenTxt + ' = ' + oikeaTxt;
        var vie = el('button', 'nappi', t.vie + ' →');
        vie.type = 'button';
        vie.addEventListener('click', vieLinjastolle);
        napit.appendChild(vie);
      } else if (!v && tila.oikea.length) {
        v = oikeaSumma < vasenSumma ? t.liianVahan : t.liikaa + (teht.tapa === 'C' || teht.tapa === 'X' ? t.liikaaC : '');
      }
      viesti.textContent = v || '';
      viesti.classList.toggle('av__viesti--ok', tila.valmis || tila.siirretty);

      // hyllyt
      [['varasto', varastoEl, t.varasto], ['linjasto', linjastoEl, t.linjasto]].forEach(function (h) {
        var nimi = h[0], kohde = h[1];
        kohde.innerHTML = '<span class="av__hylly-nimi">' + h[2] + '</span>';
        var rivi = el('div', 'av__paikat');
        for (var n = 1; n <= 10; n++) {
          var paikka = el('div', 'av__paikka');
          var tassa = tila.paikka[n] === nimi;
          if (tassa) {
            var b = el('button', 'av__hylly-torni');
            b.type = 'button';
            b.appendChild(torni(n));
            b.setAttribute('aria-label', t.taytteet[n - 1] + ', ' + t.torni + ' ' + n);
            b.title = t.taytteet[n - 1];
            (function (n, nimi) {
              b.addEventListener('click', function () {
                if (nimi === 'varasto') napautaVarasto(n); else napautaLinjasto(n);
              });
            })(n, nimi);
            if (tila.siirretty) b.disabled = true;
            paikka.appendChild(b);
          } else {
            paikka.classList.add('av__paikka--tyhja');
          }
          paikka.appendChild(el('small', null, String(n)));
          rivi.appendChild(paikka);
        }
        kohde.appendChild(rivi);
      });
    }

    // palojen koko seuraa näyttämön leveyttä
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
