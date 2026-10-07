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
  var W = 3210, H = 2422;
  var OSAT = {
    vartalo: [255, 0, 2926, 2422],
    vasen:   [0, 1585, 1256, 564],
    oikea:   [1911, 1601, 1299, 513],
    saihkeet:[1162, 22, 1131, 681],
    lamppu:  [1475, 210, 403, 672],
    kieli:   [1443, 1720, 253, 441]
  };
  var NIVEL_V = [1240, 1790], NIVEL_O = [1925, 1775];   // olkapäät
  var SYMB_V = [508, 1655],  SYMB_O = [2700, 1668];     // symbaalien keskikohta
  // Kieli on vaa'an kieli: osoittaa ruokalapun merkkiin < = >. Kääntöpiste suussa.
  var KIELI_NIVEL = [1580, 1740], KIELI_KULMA = { '<': 15, '=': -5, '>': -24 };
  var MAKSIMIKULMA = 9;

  var VARIT = ['#090A0D', '#E62448', '#FFDF00', '#1072B9', '#EF7925',
               '#824292', '#16A74F', '#7F3B1E', '#E473AA', '#6AC0B2'];

  // ---------------------------------------------------------------- tekstit (lyhyet!)
  var T = {
    fi: {
      heita: 'Heitä noppaa!', seuraavaVuoro: 'Seuraava vuoro', lisapala: 'Sydänpizza! Valitse lisäpala.',
      valmista: "Valmista pizza!", eiPizzaa: "Ei pizzaa vielä. Heitä uudelleen!", apinat: "Nälkäiset apinat", uusiPeli: "Uusi peli", harjoittele: "Harjoittele", tasot: ["AARGH! Tyhjä maha.", "Öö… Mitä sitten syödään?", "Nam. Muutama pala olisi vielä maistunut.", "Se on siinä – apinan lempipizza!"], palaa: "palaa", boksi: "Yhteinen boksi", infoA: "<h3>Nälkäiset apinat</h3><p>Pelatkaa yhdessä. Kun pizzan täyte on linjastolla, napauta pizzaa. Pala menee yhteiseen boksiin.</p><p>Jos vuorolla ei synny pizzaa, nälkäiset apinat syövät palat ja peli päättyy. Täyttäkää boksi kymmenellä palalla!</p>",
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
      heita: 'Kasta tärningen!', seuraavaVuoro: 'Nästa tur', lisapala: 'Hjärtpizza! Välj en extrabit.',
      valmista: "Gör pizzan!", eiPizzaa: "Ingen pizza än. Kasta igen!", apinat: "Hungriga apor", uusiPeli: "Nytt spel", harjoittele: "Träna", tasot: ["AARGH! Tom mage.", "Öö… Vad äter vi nu?", "Mums. Några bitar till hade suttit fint.", "Det är klart – apans favoritpizza!"], palaa: "bitar", boksi: "Gemensam box", infoA: "<h3>Hungriga apor</h3><p>Spela tillsammans. När pizzans fyllning finns på linjen, tryck på pizzan. Biten hamnar i den gemensamma boxen.</p><p>Om det inte blir någon pizza på en tur äter de hungriga aporna upp bitarna och spelet tar slut. Fyll boxen med tio bitar!</p>",
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
      heita: 'Roll the dice!', seuraavaVuoro: 'Next turn', lisapala: 'Heart pizza! Choose an extra slice.',
      valmista: "Make the pizza!", eiPizzaa: "No pizza yet. Roll again!", apinat: "Hungry monkeys", uusiPeli: "New game", harjoittele: "Practise", tasot: ["AARGH! Empty stomach.", "Uhh… What do we eat now?", "Yum. A few more slices would have been nice.", "That’s it – the monkey’s favourite pizza!"], palaa: "slices", boksi: "Shared box", infoA: "<h3>Hungry monkeys</h3><p>Play together. When a pizza’s topping is on the line, tap the pizza. The slice goes into the shared box.</p><p>If no pizza is made on a turn, the hungry monkeys eat the slices and the game ends. Fill the box with ten slices!</p>",
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
      heita: 'Würfle!', seuraavaVuoro: 'Nächster Zug', lisapala: 'Herzpizza! Wähle ein Extrastück.',
      valmista: "Back die Pizza!", eiPizzaa: "Noch keine Pizza. Würfle noch einmal!", apinat: "Hungrige Affen", uusiPeli: "Neues Spiel", harjoittele: "Üben", tasot: ["AARGH! Leerer Bauch.", "Äh… Was essen wir jetzt?", "Mmh. Ein paar Stücke mehr wären lecker gewesen.", "Geschafft – die Lieblingspizza des Affen!"], palaa: "Stücke", boksi: "Gemeinsame Box", infoA: "<h3>Hungrige Affen</h3><p>Spielt zusammen. Wenn die Zutat einer Pizza auf der Linie liegt, tippt auf die Pizza. Das Stück kommt in die gemeinsame Box.</p><p>Wenn in einem Zug keine Pizza entsteht, essen die hungrigen Affen die Stücke und das Spiel ist vorbei. Füllt die Box mit zehn Stücken!</p>",
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


  // ---------------------------------------------------------------- vinkit valikossa (pelimuodon mukaan)
  var TAVAT_DL = {
    fi: ['Perussiirto', 'Summasiirto', 'Erotussiirto'], sv: ['Basflytt', 'Summaflytt', 'Skillnadsflytt'],
    en: ['Basic move', 'Sum move', 'Difference move'], de: ['Grundzug', 'Summenzug', 'Differenzzug']
  };
  var VINKIT = {
    fi: { valikko: 'Valikko', muodot: 'Pelimuodot', kieli: 'Kieli',
      nimet: { harjoitus: 'Harjoittele', vapaa: 'Vapaa peli', apinat: 'Nälkäiset apinat' },
      harjoitus: ['Tee tornit yhtä korkeiksi.', 'Lamppu syttyy, kun siirto on oikein.', 'Torni liikkuu aina kokonaisena.'],
      vapaa: ['Siirto onnistuu aina – etsi se!', 'Liian iso noppa? Vie torneja takaisin varastoon.'],
      apinat: ['Tuo pizzan täyte kulhoon.', 'Napauta pizzaa – se paistuu uunissa.', 'Jos pizzaa ei synny, apinat syövät palat!'] },
    sv: { valikko: 'Meny', muodot: 'Spellägen', kieli: 'Språk',
      nimet: { harjoitus: 'Träna', vapaa: 'Fritt spel', apinat: 'Hungriga apor' },
      harjoitus: ['Gör tornen lika höga.', 'Lampan tänds när flytten är rätt.', 'Ett torn flyttas alltid helt.'],
      vapaa: ['Det finns alltid en flytt – hitta den!', 'För högt tal? Flytta torn tillbaka till lagret.'],
      apinat: ['För pizzans fyllning till skålen.', 'Tryck på pizzan – den gräddas i ugnen.', 'Blir det ingen pizza äter aporna bitarna!'] },
    en: { valikko: 'Menu', muodot: 'Game modes', kieli: 'Language',
      nimet: { harjoitus: 'Practise', vapaa: 'Free play', apinat: 'Hungry monkeys' },
      harjoitus: ['Make the towers equally high.', 'The lamp lights up when the move is right.', 'A tower always moves as a whole.'],
      vapaa: ['There is always a move – find it!', 'Dice too high? Move towers back to the storage.'],
      apinat: ['Bring the pizza’s topping into its bowl.', 'Tap the pizza – it bakes in the oven.', 'No pizza? The monkeys eat the slices!'] },
    de: { valikko: 'Menü', muodot: 'Spielarten', kieli: 'Sprache',
      nimet: { harjoitus: 'Üben', vapaa: 'Freies Spiel', apinat: 'Hungrige Affen' },
      harjoitus: ['Mach die Türme gleich hoch.', 'Die Lampe leuchtet, wenn der Zug stimmt.', 'Ein Turm bewegt sich immer ganz.'],
      vapaa: ['Es gibt immer einen Zug – finde ihn!', 'Würfel zu hoch? Bring Türme zurück ins Lager.'],
      apinat: ['Bring die Zutat der Pizza in ihre Schüssel.', 'Tippe auf die Pizza – sie backt im Ofen.', 'Keine Pizza? Die Affen essen die Stücke!'] }
  };
  var KIELET = [['fi', 'Suomi'], ['sv', 'Svenska'], ['en', 'English'], ['de', 'Deutsch']];

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
    var urlKieli = (location.search.match(/[?&]kieli=([a-z]{2})/) || [])[1];
    var kieli = (T[urlKieli] && urlKieli) || juuri.getAttribute('data-kieli') || (document.documentElement.lang || 'fi').slice(0, 2);
    var t = T[kieli] || T.en;
    var vahennaLiike = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var tila = { nro: 0, paikka: {}, lahde: {}, oikea: [], vasen: [] };

    juuri.innerHTML = '';
    juuri.classList.add('av');
    if (juuri.hasAttribute('data-koko')) juuri.classList.add('av--koko');   // oma sivu: koko ruutu ilman korttikehystä

    // --- yläpalkki: Basso (ohjeet) · edistyminen · noppa
    var ylapalkki = el('div', 'av__ylapalkki');
    var infoNappi = el('button', 'av__info');
    infoNappi.type = 'button';
    infoNappi.setAttribute('aria-label', (VINKIT[kieli] || VINKIT.en).valikko);
    // Markon miettivä apina: kasvot ympyrässä, tukka ja kyynärpää tulevat ympyrän yli
    infoNappi.innerHTML = '<img src="' + KANSIO + 'basso-nappi.webp" alt=""><span class="av__info-merkki" aria-hidden="true"><i></i><i></i><i></i></span>';
    var pisteet = el('div', 'av__pisteet');
    var boksiEl = el('div', 'av__boksi');          // Nälkäiset apinat: yhteinen boksi (10 palaa)
    boksiEl.setAttribute('role', 'img');
    pisteet.appendChild(boksiEl);
    var noppaEl = el('button', 'av__noppa');
    noppaEl.type = 'button';
    noppaEl.innerHTML = '<span class="av__d10"></span>';
    var noppa3d = window.Noppa3D(noppaEl.querySelector('.av__d10'), KANSIO + 'noppa/');
    ylapalkki.appendChild(infoNappi); ylapalkki.appendChild(pisteet);
    juuri.appendChild(ylapalkki);
    var noppaRivi = el('div', 'av__nopparivi');      // noppa keskellä apinan alapuolella
    noppaRivi.appendChild(noppaEl);

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
    var kieliEl = kuva('kieli');
    kieliEl.style.transformOrigin = pros(KIELI_NIVEL[0] - OSAT.kieli[0], OSAT.kieli[2]) + ' ' + pros(KIELI_NIVEL[1] - OSAT.kieli[1], OSAT.kieli[3]);
    nayttamo.appendChild(kieliEl);
    nayttamo.appendChild(kuva('saihkeet')); nayttamo.appendChild(kuva('lamppu', 'lamppu-pois')); nayttamo.appendChild(lamppuPaalla);
    var pinoV = el('div', 'av__pino'), pinoO = el('div', 'av__pino');
    var lukuV = el('span', 'av__luku'), lukuO = el('span', 'av__luku');
    [pinoV, pinoO, lukuV, lukuO].forEach(function (x) { nayttamo.appendChild(x); });
    var juhla = el('div', 'av__juhla');
    nayttamo.appendChild(juhla);
    var loppuEl = el('div', 'av__loppu');
    nayttamo.appendChild(loppuEl);
    juuri.appendChild(nayttamo);
    juuri.appendChild(noppaRivi);

    // --- viestirivi (teksti tai nappi)
    var rivi = el('div', 'av__rivi');
    rivi.setAttribute('aria-live', 'polite');
    juuri.appendChild(rivi);

    // --- pizzakortit (Nälkäiset apinat)
    // pizzat kulkevat liukuhihnalla linjaston (kulhojen) alla kohti uunia (liukuhihna ja uuni.psd)
    var kortitEl = el('div', 'av__kortit');
    var tuotanto = el('div', 'av__tuotanto');
    tuotanto.appendChild(kortitEl);
    // hihna ja uuni samassa kehyksessä, jolloin uunin korkeus on aina suhteessa hihnaan
    var hihnaRivi = el('div', 'av__hihnarivi');
    hihnaRivi.innerHTML = '<img class="av__hihna" src="' + KANSIO + 'hihna.webp" alt="">';
    var uuniEl = el('img', 'av__uuni'); uuniEl.src = KANSIO + 'uuni.webp'; uuniEl.alt = '';
    hihnaRivi.appendChild(uuniEl);
    tuotanto.appendChild(hihnaRivi);

    // --- hyllyt
    var hyllyt = el('div', 'av__hyllyt');
    var varastoEl = el('div', 'av__hylly'), linjastoEl = el('div', 'av__hylly av__hylly--linjasto');
    hyllyt.appendChild(linjastoEl); hyllyt.appendChild(varastoEl);   // linjasto pizzojen lähellä, varasto alimpana peukalon alla
    juuri.appendChild(hyllyt);

    // --- ohjeikkuna
    var ikkuna = el('div', 'av__ikkuna');
    ikkuna.hidden = true;
    ikkuna.setAttribute('role', 'dialog');
    ikkuna.setAttribute('aria-modal', 'true');
    var vk = VINKIT[kieli] || VINKIT.en, tavat = TAVAT_DL[kieli] || TAVAT_DL.en;
    ikkuna.innerHTML = '<div class="av__ikkuna-sisus"><img class="av__ikkuna-basso" src="' + KANSIO + 'basso.webp" alt="">' +
      '<div class="av__vinkit"></div><h3 class="av__muodot-otsikko">' + vk.muodot + '</h3><div class="av__ikkuna-napit"></div>' +
      '<h3 class="av__muodot-otsikko">' + vk.kieli + '</h3><div class="av__kielet">' + KIELET.map(function (k) {
        return '<button type="button" data-k="' + k[0] + '"' + (k[0] === kieli ? ' class="nyt"' : '') + '>' + k[1] + '</button>'; }).join('') + '</div>' +
      '<button type="button" class="av__sulje" aria-label="' + t.sulje + '">×</button></div>';
    juuri.appendChild(ikkuna);
    var ikkunaNapit = ikkuna.querySelector('.av__ikkuna-napit'), vinkitEl = ikkuna.querySelector('.av__vinkit');
    function nykyMuoto() { return tila.muoto === 'apinat' ? 'apinat' : tila.nro >= TEHTAVAT.length ? 'vapaa' : 'harjoitus'; }
    function taytaVinkit() {
      var m = nykyMuoto(), h = '<h2>' + vk.nimet[m] + '</h2><ul>';
      vk[m].forEach(function (x) { h += '<li>' + x + '</li>'; });
      h += '</ul>';
      vinkitEl.innerHTML = h;
      Array.prototype.forEach.call(ikkunaNapit.children, function (b) { b.classList.toggle('av__muoto--nyt', b.getAttribute('data-muoto') === m); });
    }
    function nappi(kohde, teksti, luokka, f) {
      var x = el('button', 'nappi' + (luokka ? ' ' + luokka : ''), teksti);
      x.type = 'button'; x.addEventListener('click', f); kohde.appendChild(x);
      return x;
    }
    Array.prototype.forEach.call(ikkuna.querySelectorAll('.av__kielet button'), function (b) {
      b.addEventListener('click', function () {
        // kieli vaihtuu sivun uudelleenlatauksella; pelimuoto säilyy
        var q = new URLSearchParams(location.search);
        q.set('kieli', b.getAttribute('data-k')); q.set('tila', tila.muoto === 'apinat' ? 'apinat' : 'harjoitus');
        location.search = q.toString();
      });
    });
    function avaa() { taytaVinkit(); ikkuna.hidden = false; ikkuna.querySelector('.av__sulje').focus(); }
    function sulje() { ikkuna.hidden = true; infoNappi.focus(); }
    infoNappi.addEventListener('click', avaa);
    ikkuna.querySelector('.av__sulje').addEventListener('click', sulje);
    ikkuna.addEventListener('click', function (e) { if (e.target === ikkuna) sulje(); });
    ikkuna.addEventListener('keydown', function (e) { if (e.key === 'Escape') sulje(); });
    nappi(ikkunaNapit, vk.nimet.harjoitus, 'nappi--toinen', function () { sulje(); tila.muoto = 'harjoitus'; tila.nro = 0; aloita(TEHTAVAT[0]); }).setAttribute('data-muoto', 'harjoitus');
    nappi(ikkunaNapit, vk.nimet.vapaa, 'nappi--toinen', function () { sulje(); tila.muoto = 'harjoitus'; aloitaVapaa(); }).setAttribute('data-muoto', 'vapaa');
    nappi(ikkunaNapit, vk.nimet.apinat, 'nappi--toinen', function () { sulje(); aloitaApinat(); }).setAttribute('data-muoto', 'apinat');

    // --- täytteen tarra: värillinen ympyrä, valkoinen reuna ja Markon täytekuva (tayte/1–10.webp)
    function tarra(luku) {
      var x = el('span', 'av__tarra');
      x.style.background = VARIT[luku - 1];
      x.innerHTML = '<img src="' + KANSIO + 'tayte/' + luku + '.webp" alt="">';
      return x;
    }
    // --- tornin piirto
    function torni(luku, punnus) {
      var d = el('span', 'av__torni');
      for (var i = 0; i < luku; i++) {
        var p = el('i');
        if (punnus) { p.className = 'av__punnus'; p.textContent = i + 1; p.style.setProperty('--i', i); }
        else p.style.background = VARIT[luku - 1];
        d.appendChild(p);
      }
      if (!punnus) d.appendChild(tarra(luku));   // tornin päällä täytteen tarra kuten oikeissa nappuloissa
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
      tila.viesti = ''; tila.heitetty = false; tila.vuoronPizzat = 0; tila.vaihe = 'heitto';
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

    // --- Nälkäiset apinat: yhteistyöpeli yhden täytteen pizzoilla (10 korttia, 4 pelilaudalla)
    function sekoita(a) {
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; }
      return a;
    }
    function aloitaApinat() {
      tila.muoto = 'apinat'; tila.nro = TEHTAVAT.length; tila.paikka = {};
      for (var i = 1; i <= 10; i++) tila.paikka[i] = 'varasto';
      tila.pakka = sekoita([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      tila.laudalla = tila.pakka.splice(0, 4);
      tila.boksi = []; tila.ensimmainen = true; tila.loppu = false; tila.valitsee = false;
      loppuEl.classList.remove('on');
      uusiKierros();
    }
    function valmistettavat() {
      return (tila.laudalla || []).filter(function (n) { return tila.paikka[n] === 'linjasto'; });
    }
    function valmista(n, korttiEl) {
      if (tila.vaihe !== 'pizza' || tila.paikka[n] !== 'linjasto' || tila.paistuu) return;
      // pizza liukuu hihnaa pitkin uuniin, ja vasta sitten pala menee boksiin
      if (korttiEl && !vahennaLiike && korttiEl.animate) {
        tila.paistuu = true;
        var a = korttiEl.getBoundingClientRect(), u = uuniEl.getBoundingClientRect();
        var dx = (u.left + u.width * 0.3) - (a.left + a.width / 2), dy = (u.top + u.height * 0.82) - (a.top + a.height / 2);
        korttiEl.classList.add('av__kortti--paistuu');
        uuniEl.classList.add('av__uuni--paistaa');
        var an = korttiEl.animate([{ transform: 'none', opacity: 1 },
          { transform: 'translate(' + dx * 0.85 + 'px,' + dy * 0.85 + 'px) scale(.6)', opacity: 1, offset: 0.75 },
          { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.25)', opacity: 0 }],
          { duration: 700, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'forwards' });
        an.onfinish = function () {
          tila.paistuu = false;
          setTimeout(function () { uuniEl.classList.remove('av__uuni--paistaa'); }, 500);
          valmista(n);
        };
        return;
      }
      tila.paikka[n] = 'varasto';                       // käytetty täyte takaisin varastoon
      if (tila.boksi.indexOf(n) < 0) { tila.boksi.push(n); tila.uusiPala = n; }   // sama pala vain kerran
      var i = tila.laudalla.indexOf(n);
      if (tila.pakka.length) { tila.laudalla[i] = tila.pakka.shift(); tila.uusiKortti = tila.laudalla[i]; } else tila.laudalla.splice(i, 1);
      tila.vuoronPizzat++;
      // sydänpizza (täytteet yhteensä 10): yksi vapaavalintainen lisäpala
      if (n === 10 && tila.boksi.length < 10) { tila.valitsee = true; return piirra(); }
      jatkaPizzat();
    }
    function valitseLisapala(k) {
      if (!tila.valitsee || tila.boksi.indexOf(k) >= 0) return;
      tila.boksi.push(k); tila.uusiPala = k; tila.valitsee = false;
      jatkaPizzat();
    }
    function jatkaPizzat() {
      if (tila.boksi.length === 10) { piirra(); return setTimeout(function () { lopeta(); }, 700); }
      if (!valmistettavat().length) return vuoroLoppuu();
      piirra();
    }
    function vuoroLoppuu() {
      tila.vaihe = 'odota';
      piirra();
      if (tila.vuoronPizzat === 0 && !tila.ensimmainen) return setTimeout(lopeta, 900);
      var eiPizzaa = tila.vuoronPizzat === 0;
      tila.ensimmainen = false;
      if (eiPizzaa) { rivi.textContent = t.eiPizzaa; rivi.className = 'av__rivi av__rivi--havikki'; }
      setTimeout(uusiKierros, eiPizzaa ? 1600 : 900);
    }
    function lopeta() {
      tila.loppu = true; tila.vaihe = 'loppu';
      var n = tila.boksi.length, taso = n >= 10 ? 3 : n >= 7 ? 2 : n >= 4 ? 1 : 0;
      loppuEl.innerHTML = '<img class="av__laatikko" src="' + KANSIO + 'laatikko.webp" alt=""><b>' + n + ' / 10</b><span>' + t.tasot[taso] + '</span>';
      nappi(loppuEl, t.uusiPeli + ' →', 'av__vie', aloitaApinat);
      loppuEl.classList.toggle('voitto', n >= 10);
      loppuEl.classList.add('on');
      piirra();
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
      if (tila.muoto === 'apinat') {
        tila.vaihe = 'pizza';
        if (!valmistettavat().length) return vuoroLoppuu();
        return piirra();
      }
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

    // --- siirtymäanimaatio (FLIP): torni liukuu vanhasta paikastaan uuteen, oli se sitten
    // hylly, apinan käsi tai toinen hylly. Näin nähdään, minne kukin torni menee.
    function paikat() {
      var m = {};
      Array.prototype.forEach.call(juuri.querySelectorAll('[data-n]'), function (x) {
        var r = x.getBoundingClientRect();
        if (r.width) m[x.getAttribute('data-n')] = r;
      });
      return m;
    }
    function liu(ennen) {
      if (vahennaLiike || !Element.prototype.animate) return;
      Array.prototype.forEach.call(juuri.querySelectorAll('[data-n]'), function (x) {
        var a = ennen[x.getAttribute('data-n')], b = x.getBoundingClientRect();
        if (!a || !b.width) return;
        // alareunan keskikohdasta toiseen, koko skaalautuu (hyllyn torni on pienempi kuin käden)
        var dx = (a.left + a.width / 2) - (b.left + b.width / 2), dy = a.bottom - b.bottom;
        if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
        var s = a.height / b.height;
        x.classList.add('av__lentaa');
        var an = x.animate([
          { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')', transformOrigin: '50% 100%' },
          { transform: 'none', transformOrigin: '50% 100%' }
        ], { duration: 620, easing: 'cubic-bezier(.25,.8,.35,1.08)' });
        an.onfinish = function () { x.classList.remove('av__lentaa'); };
      });
    }
    function piirra() {
      var ennen = paikat();
      piirraNyt();
      liu(ennen);
    }

    // --- piirto
    function piirraNyt() {
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
      var apinat = tila.muoto === 'apinat';
      juuri.classList.toggle('av--apinat', apinat);
      if (apinat) {
        // boksi pizzana: 10 siivua, täytetty siivu täytteen värinen
        var sv = '<svg viewBox="-50 -50 100 100" aria-hidden="true"><circle r="47" class="av__boksi-pohja"/>';
        for (var j = 0; j < 10; j++) {
          var a0 = (j * 36 - 90) * Math.PI / 180, a1 = ((j + 1) * 36 - 90) * Math.PI / 180, n0 = j + 1;
          var tay = tila.boksi.indexOf(n0) >= 0;
          sv += '<path class="' + (tay ? 'tay' : '') + (tila.uusiPala === n0 ? ' uusi' : '') + '" d="M0 0L' + (44 * Math.cos(a0)).toFixed(2) + ' ' + (44 * Math.sin(a0)).toFixed(2) +
            'A44 44 0 0 1 ' + (44 * Math.cos(a1)).toFixed(2) + ' ' + (44 * Math.sin(a1)).toFixed(2) + 'Z" style="fill:' + (tay ? VARIT[j] : 'transparent') + '"/>';
        }
        sv += '</svg>';
        tila.uusiPala = null;
        pisteet.innerHTML = ''; pisteet.appendChild(boksiEl);
        boksiEl.innerHTML = sv;
        boksiEl.setAttribute('aria-label', t.boksi + ': ' + tila.boksi.length + '/10');
      } else pisteet.innerHTML = p;
      pisteet.classList.toggle('av__pisteet--boksi', apinat);
      if (!apinat) pisteet.appendChild(boksiEl);

      // pizzakortit
      kortitEl.innerHTML = '';
      kortitEl.classList.toggle('av__kortit--valinta', !!(apinat && tila.valitsee));
      if (apinat && tila.valitsee) {
        for (var q = 1; q <= 10; q++) if (tila.boksi.indexOf(q) < 0) (function (q) {
          var v = el('button', 'av__valinta');
          v.type = 'button';
          v.setAttribute('aria-label', t.taytteet[q - 1] + ' ' + q);
          v.appendChild(tarra(q));
          v.addEventListener('click', function () { valitseLisapala(q); });
          kortitEl.appendChild(v);
        })(q);
      } else if (apinat) {
        tila.laudalla.forEach(function (n) {
          var ok = tila.vaihe === 'pizza' && tila.paikka[n] === 'linjasto';
          var k = el('button', 'av__kortti' + (ok ? ' av__kortti--ok' : '') + (tila.uusiKortti === n ? ' av__kortti--uusi' : ''));
          k.type = 'button';
          k.setAttribute('aria-label', t.taytteet[n - 1] + ' ' + n);
          k.innerHTML = '<span class="av__kortti-pizza"><i style="background:' + VARIT[n - 1] + '"><img src="' + KANSIO + 'tayte/' + n + '.webp" alt=""></i></span>' +
            (n === 10 ? '<span class="av__sydan"><img src="' + KANSIO + 'sydan.webp" alt=""></span>' : '');   // sydänpizza
          k.addEventListener('click', function () { if (ok) valmista(n, k); else if (tila.vaihe === 'heitto') tonaise(noppaEl); });
          kortitEl.appendChild(k);
        });
        tila.uusiKortti = null;
      }
      noppaEl.disabled = heitetty;
      noppaEl.setAttribute('aria-label', heitetty ? t.noppa + ': ' + noppa : t.heita);

      // vaaka
      var kulma = 0;
      if (!tila.siirretty && heitetty) {          // punnukset painavat heti heiton jälkeen
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
        b.type = 'button'; b.setAttribute('data-n', n);
        b.appendChild(torni(n));
        b.setAttribute('aria-label', t.taytteet[n - 1] + ' ' + n);
        b.addEventListener('click', function () { palauta(n); });
        kohde.appendChild(b);
      }
      if (!tila.siirretty) {                      // siirron jälkeen tornit ovat jo hyllyillä
        tila.vasen.forEach(function (n) { pinoNappi(n, pinoV); });
        tila.oikea.forEach(function (n) { pinoNappi(n, pinoO); });
      }

      // luvut symbaalien alla ja ruokalapun merkki
      var nayta = heitetty && !tila.siirretty;
      lukuV.textContent = nayta ? [noppa].concat(tila.vasen).join(' + ') : '';
      lukuO.textContent = nayta && tila.oikea.length ? tila.oikea.join(' + ') : '';
      lukuV.hidden = !lukuV.textContent; lukuO.hidden = !lukuO.textContent;
      var m = !nayta ? '' : vasenSumma === oikeaSumma ? '=' : vasenSumma < oikeaSumma ? '<' : '>';
      kieliEl.style.transform = 'rotate(' + (m ? KIELI_KULMA[m] : 0) + 'deg)';
      juuri.classList.toggle('av--valo', tila.valmis || tila.siirretty);

      // viestirivi: joko lyhyt teksti tai yksi nappi
      rivi.innerHTML = '';
      rivi.className = 'av__rivi';
      if (apinat && tila.valitsee) {
        rivi.textContent = t.lisapala; rivi.classList.add('av__rivi--ok');
      } else if (apinat && tila.vaihe === 'pizza') {
        // pizzan saa jättää odottamaan, kun vuorolla on jo tehty vähintään yksi
        if (tila.vuoronPizzat > 0) nappi(rivi, t.seuraavaVuoro + ' →', 'av__vie av__vie--toinen', vuoroLoppuu);
        else { rivi.textContent = t.valmista; rivi.classList.add('av__rivi--ok'); }
      } else if (apinat && (tila.vaihe === 'odota' || tila.vaihe === 'loppu')) {
        rivi.textContent = tila.vaihe === 'odota' && tila.vuoronPizzat ? t.hyva : '';
        if (tila.vuoronPizzat) rivi.classList.add('av__rivi--ok');
      } else if (tila.valmis) {
        nappi(rivi, (tila.havikki ? t.vieV : t.vie) + ' <span aria-hidden="true">↓</span>', 'av__vie' + (tila.havikki ? ' av__vie--varasto' : ''), vieSiirto);
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
          var kulho = null;
          if (nimi === 'linjasto') {
            // linjasto = täytekulhot (Markon säiliö.psd: tausta + etuala): torni seisoo kulhon sisällä
            kulho = el('div', 'av__kulho');
            kulho.innerHTML = '<img class="av__kulho-takana" src="' + KANSIO + 'kulho/tausta.webp" alt="">';
            paikka.appendChild(kulho);
          }
          if (tila.paikka[n] === nimi) {
            var b = el('button', 'av__hylly-torni');
            b.type = 'button'; b.setAttribute('data-n', n);
            b.appendChild(torni(n));
            b.setAttribute('aria-label', t.taytteet[n - 1] + ' ' + n);
            b.title = t.taytteet[n - 1];
            // koko sarake on kosketusalue, ei vain pieni torni (napin klikkaus kuplii sarakkeeseen)
            (function (n, nimi) { paikka.addEventListener('click', function () { napauta(n, nimi); }); })(n, nimi);
            paikka.classList.add('av__paikka--torni');
            if (tila.siirretty || tila.loppu) b.disabled = true;
            (kulho || paikka).appendChild(b);
          } else paikka.classList.add('av__paikka--tyhja');
          if (kulho) {
            var etu = el('img', 'av__kulho-edessa'); etu.src = KANSIO + 'kulho/' + n + '.webp'; etu.alt = '';
            kulho.appendChild(etu);
          } else paikka.appendChild(el('small', null, String(n)));
          paikat.appendChild(paikka);
        }
        kohde.appendChild(paikat);
        if (nimi === 'linjasto') kohde.appendChild(tuotanto);   // hihna ja uuni kuuluvat linjastoon
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

    // Omalla sivulla (data-koko) peli kutistetaan mahtumaan näkyvään alueeseen, kun selaimen
    // osoite- ja välilehtipalkit vievät tilaa (erityisesti puhelin poikittain).
    var sovitusAjastin = null;
    function sovita() {
      if (!juuri.classList.contains('av--koko')) return;
      juuri.style.zoom = '';
      if (window.innerWidth <= window.innerHeight) return;   // pystyssä vieritetään mieluummin kuin pienennetään torneja
      var vv = window.visualViewport, kork = vv ? vv.height : window.innerHeight;
      var yla = juuri.getBoundingClientRect().top + (window.scrollY || 0);
      var tarve = juuri.offsetHeight, tila_ = kork - Math.max(0, yla) - 6;
      var z = Math.min(1, tila_ / tarve);
      if (z < 0.98) juuri.style.zoom = Math.max(0.55, z).toFixed(3);
    }
    function sovitaPian() { clearTimeout(sovitusAjastin); sovitusAjastin = setTimeout(sovita, 120); }
    window.addEventListener('resize', sovitaPian);
    window.addEventListener('orientationchange', sovitaPian);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', sovitaPian);
    setTimeout(sovita, 300);
    if (vahennaLiike) juuri.classList.add('av--ei-liiketta');
    if (juuri.getAttribute('data-tila') === 'apinat') aloitaApinat(); else { tila.muoto = 'harjoitus'; aloita(TEHTAVAT[0]); }
  }

  function kaynnista() {
    Array.prototype.forEach.call(document.querySelectorAll('.apinavaaka'), function (j) {
      if (!j.__av) { j.__av = true; Apinavaaka(j); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kaynnista);
  else kaynnista();
})();
