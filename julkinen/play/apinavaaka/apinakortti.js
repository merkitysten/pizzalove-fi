/* Apinakortin vaikutus animaationa — yksi moduuli, kaksi käyttöpaikkaa.
 *
 * Päätös: Marko 16.11.2026 («olisi siistiä, jos saisimme jonkinlaisen
 * animaation, josta näkyy suoraan se mitä tapahtuu»). Taustat:
 * `APINAKORTIT-EHDOTUS.md` ja `TEHTAVA-APINAKORTTIEN-ANIMAATIO.md`.
 *
 * ⚠️ KORTIN VAIKUTUS KIRJOITETAAN KERRAN. Tätä moduulia käyttävät sekä
 * Apinavaa'an «Opi pelaamaan» että Apinakortit-sivu. Jos sääntö olisi
 * kahdessa paikassa, ne ajautuisivat erilleen ensimmäisestä korjauksesta.
 *
 * ⚠️ TÄYTTEET PIIRTÄÄ PELIN OMA `torni()` (`window.apinavaakaTorni`), ei tämän
 * tiedoston oma piirros. Kokeiluversiossa (`Verkkosivut/apinakortit-animaatio-
 * kokeilu.html`) oli yksinkertaiset kiekot; ne eivät ole pelin grafiikkaa.
 *
 * Käyttö:
 *   var a = Apinakortti(elementti, { kortit: {...}, pelaajia: 3 });
 *   a.nayta(21);        // toistaa kortin 21 animaation
 *   a.alkuun();         // palauttaa lähtötilanteen
 *
 * Tekstit tulevat kutsujalta (`kortit`), koska ne ovat `sisalto/apinakortit-
 * xx.json`:ssa kahdeksalla kielellä — tämä tiedosto ei tunne yhtään kieltä.
 */
(function () {
  'use strict';

  /* Kortit kolmessa ryhmässä. Ryhmä ratkaisee näkymän: lauta, boksit vai
     vuorojärjestys. Jako on ehdotuksesta ja tehtävätiedostosta. */
  var RYHMA = {};
  [2, 5, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 29].forEach(function (n) { RYHMA[n] = 'lauta'; });
  /* ⚠️ NOPPAKORTEISSA EI NÄYTETÄ LAUTAA LAINKAAN (Marko 16.11.2026:
     «Noppaan liittyvissä korteissa ei tarvita pelilautaa lainkaan, koska
     silloin on kyse, että noppaan tulee yksi lisää tai vähenee yksi.»).
     Lauta veisi katseen sinne missä mikään ei muutu. Kortti 5 EI ole tässä
     ryhmässä, koska se heittää noppaa JA siirtää täytteitä. */
  [3, 4].forEach(function (n) { RYHMA[n] = 'noppa'; });
  [6, 7, 9, 10, 12, 13, 28, 31, 32, 33].forEach(function (n) { RYHMA[n] = 'boksi'; });

  /* ⚠️ NIMI NÄYTETÄÄN VAIN KUN KORTTI EROTTELEE PELAAJAT (Marko 16.11.2026:
     «Onko noilla nimillä merkitystä tuossa apinakortissa, jossa boksit
     kiertävät? — — Se tuo taas yhden tiedon ruutuun lisää, mutta ei oikeasti
     anna mitään lisäinfoa liittyen apinakorttiin.»).

     Kollektiivikortissa kaikille tapahtuu sama, joten nimi ei vastaa
     yhteenkään kysymykseen jonka kortti herättää: 9 ja 10 kiertävät kaikkien
     boksit, 6 ja 13 koskevat kaikkia ja niiden ero luetaan asemasta tai
     palojen määrästä — ei nimestä. Nimi jää niihin kortteihin joissa kortti
     ITSE osoittaa pelaajan: 7 (annat valitsemallesi), 12 (vaihdat yhden
     kanssa) ja 31 (otat edelliseltä).

     ⚠️ Yhden pelaajan korteissa nimi jää pois erillisestä syystä: näkyvissä
     on vain yksi boksi, joten se on itsestään selvästi katsojan oma. */
  /* ⚠️ TARKENNETTU SAMANA PÄIVÄNÄ (Marko 16.11.2026: «Toki pelaajan nimellä
     on siinä mielessä merkitystä, että se kiinnittää pelaajan, jolloin sen
     näkee, kun boksi vaihtuu»). Raja ei ole «kollektiivinen vai ei» vaan
     LIIKKUUKO JOKIN ISTUIMELTA TOISELLE: jos liikkuu, istuin on tunnistettava
     tai kierto näyttää pelkältä pyörimiseltä. Korteissa 6 ja 13 mikään ei
     vaihda omistajaa — ero luetaan asemasta ja palojen määrästä — joten nimi
     olisi niissä kolmas tietorivi ilman tietoa.
     Kehässä nimi on lisäksi ULKOREUNALLA eikä boksin alla: istuin pysyy, boksi
     liikkuu sen ohi, ja silloin nimi on istuimen merkki eikä boksin kuvateksti. */
  var NIMETTOMAT = [6, 13];

  /* ⚠️ KEHÄ ON LÄHTÖTILA, EI VÄLIVAIHE (Marko 16.11.2026: «Miksi tämä on
     ensinäkymä? Saisi olla heti se ympyrämuodostelma»). Rivistä kehään
     siirtyminen oli oma askeleensa, mutta se ei ole kortin vaikutus vaan
     asettelun vaihto — eli juuri se mitä katsojan ei tarvitse nähdä.
     Arvo = kierron suunta. */
  /* Arvo = kierron suunta nuolelle; 0 = kehä ilman kiertosuuntaa.
     12 vaihtaa kahden istuimen boksit, joten kehällä vaihto kulkee kaarta
     pitkin eikä rivin läpi. 31 (Annoskateus) sanoo kortissaan itse «kehässä»:
     siinä liikkuvat palat, eivät boksit, mutta reitti on sama ympyrä. */
  var RENGASKORTIT = { 9: 1, 10: -1, 12: 0, 31: -1 };

  /* ⚠️ MITTARI NÄYTETÄÄN VAIN JOS KORTTI KÄYTTÄÄ SITÄ (Marko 16.11.2026,
     kortti 2: «Miksi tuolla on tuo noppa sanana ja joku nopan arvokin siinä?
     Miksi siellä lukee linjaston arvo? Mitä olennaista tietoa nämä tuovat
     pelaajille?» — eivät mitään). Kortti 2 siirtää yhden täytteen; nopan
     luku ja linjaston arvo olivat siinä kaksi lukua jotka eivät muutu eivätkä
     vaikuta mihinkään. Linjaston arvo on kortin sisältöä vain kun kortti
     MUUTTAA sitä (18, 19), ja noppa vain kun kortti heittää sen (5). */
  var MITTARIT = { 5: ['noppa'], 18: ['arvo'], 19: ['arvo'] };
  [1, 8, 11, 27, 30].forEach(function (n) { RYHMA[n] = 'vuoro'; });

  /* ⚠️ PARIT OVAT KORTIN 29 OMA TAULUKKO, EI KEKSITTY. Kortin tarkennus
     luettelee ne: oliivi–kinkku, tomaatti–herkkusieni, ananas–rucola,
     homejuusto–munakoiso, katkarapu–kala eli 1–9, 2–8, 3–7, 4–6, 5–10. */
  var PARIT = [[1, 9], [2, 8], [3, 7], [4, 6], [5, 10]];

  /* Lähtötilanne on sama joka kortille, jotta kortteja voi verrata toisiinsa.
     Linjastolla 2, 3, 5 ja 8 — arvo 18, eli mukana on sekä parillisia että
     parittomia ja sekä pieniä että suuria. */
  var ALKU_LINJASTO = [2, 3, 5, 8];
  var ALKU_BOKSIT = [[1, 4, 7], [2, 3, 5, 6, 9], [8]];   // kolme pelaajaa, eri määrät
  /* ⚠️ PELAAJANIMET TULEVAT PELIN OMASTA NIMEÄMISESTÄ (Marko 16.11.2026:
   «Vieras nimi on hassu. Miksei ole vain pelaaja A, B ja C tai jotain
   sellaista.»). `kielet.js` sanoo `'pelaaja.nimi': 'Pelaaja {n}'` — se on
   pelin tapa nimetä pelaaja, ja «Vieras» oli tälle keksitty NELJÄS tapa.
   `Sinä` jää, koska lukijan on nähtävä itsensä, ja `Basso` jää, koska se on
   maskotin nimi (CLAUDE.md). Keskimmäinen seuraa nyt pelin omaa muotoa. */
var PELAAJAT = ['Sinä', 'Pelaaja 2', 'Basso'];

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function odota(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  window.Apinakortti = function (juuri, asetukset) {
    asetukset = asetukset || {};
    var kortit = asetukset.kortit || {};
    var KANSIO = asetukset.kansio || window.apinavaakaKansio || 'apinavaaka/';
    var torni = window.apinavaakaTorni;
    var vahennaLiike = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    var tila = {};
    var nykyinen = null;

    /* ⚠️ YMMÄRRYS SYNTYY TOIMINNASTA, EI TEKSTISTÄ (Marko 16.11.2026: «Animaatio
       olisi kaikkein hienoin siten, että se toistaa sitä animaatiota looppina,
       jotta siitä sitten ymmärtää mitä tapahtuu. Se ymmärrys pitää tapahtua sen
       toiminnan kautta. Ei luonnollisella kielellä, koska se lukee joka
       tapauksessa ohjeissa.»).

       Siksi animaatio EI ole kertaesitys vaan jatkuva silmukka, ja selite on
       sen tuki eikä sen kantaja. Toinen Markon ehdottama ratkaisu — blogin
       tapaan itse askellettava «Seuraava» — on tässä loopin rinnalla: napista
       silmukka pysähtyy ja katsoja saa tahdin itselleen.

       `ajo` on sukupolvilaskuri. Jokainen uusi kortti tai napinpainallus
       kasvattaa sitä, ja käynnissä oleva silmukka lopettaa heti kun huomaa
       numeron vaihtuneen — ilman tätä kaksi silmukkaa piirtäisi päällekkäin.
       `pika` kelaa tilan askeleeseen i ilman liikettä, jotta «Edellinen» ja
       «Seuraava» voivat näyttää minkä tahansa vaiheen oikeasta tilasta. */
    var ajo = 0, askeleet = [], askel = -1, looppi = true, pika = false;
    function hidas(ms) { return odota((vahennaLiike || pika) ? 0 : ms); }

    // ---------------------------------------------------------------- runko
    juuri.classList.add('ak');
    juuri.innerHTML =
      '<div class="ak__kortti" id="akKortti"></div>' +
      '<div class="ak__naytto" id="akNaytto"></div>' +
      '<p class="ak__selite" id="akSelite" aria-live="polite"></p>' +
      '<div class="ak__ohjain" id="akOhjain" hidden>' +
        '<button type="button" class="ak__nappi ak__nappi--toisto" id="akToisto" aria-pressed="true">Pysäytä</button>' +
        '<span class="ak__pisteet" id="akPisteet" aria-hidden="true"></span>' +
        '<span class="ak__askelnapit">' +
          '<button type="button" class="ak__nappi" id="akEdellinen" aria-label="Edellinen vaihe">\u2039</button>' +
          '<button type="button" class="ak__nappi" id="akSeuraava" aria-label="Seuraava vaihe">\u203A</button>' +
        '</span>' +
      '</div>';
    var korttiEl = juuri.querySelector('#akKortti');
    /* ⚠️ TYHJÄ VALKOINEN PALKKI OLI HÄMMENTÄVÄ (Marko 16.11.2026: «yläpuolella
       on hassu tyhjä valkoinen palkki. Se on hämmentävä. Sen pitäisi olla pois
       tai sitten siinä pitäisi olla teksti ja nappi … Tai kehoite valita
       apinakortti?»). Kortin paikka on olemassa ennen valintaa, joten siihen
       kuuluu kehote. Isäntäsivu voi antaa oman tekstin `asetukset.kehote`lla
       tai piilottaa laatikon kokonaan antamalla tyhjän merkkijonon. */
    /* ⚠️ KORTTI VOI OLLA JO ISANTASIVULLA — SILLOIN MODUULI EI SAA
       PIIRTAA SITA UUDELLEEN. Mitattu 16.11.2026: `apinakortit.html` listaa
       kaikki 33 korttia valmiina (numero + nimi + ohje), ja `korttiKuva`
       kirjoitti samat tekstit moduulin omaan paikkaan — eli sivulla ne olisivat
       lukeneet kahdesti. Apinavaaan «Opi pelaamaan» -askeleessa korttia EI ole
       ennestaan, joten oletus on `true` ja korttisivu antaa `korttipaikka:false`. */
    var KORTTIPAIKKA = asetukset.korttipaikka !== false;
    /* ⚠️ SELITE ON TURHA SIELLÄ MISSÄ SÄÄNTÖ LUKEE YLÄPUOLELLA (Marko
       16.11.2026: «Ja jos se lukee jo siinä apinakortissa kuvan yläpuolella,
       niin voi jessus taas mitä touhua»). Korttisivulla kortin oma teksti on
       animaation yläpuolella, joten jokainen askelselite on sen toisinto.
       Apinavaaan «Opi pelaamaan» -askeleessa tekstiä ei ole ennestään. */
    var SELITE = asetukset.selite !== false;
    /* ⚠️ OTSAKKEET EIVÄT SAA OLLA KOVAKOODATTUJA. «Varasto» luki moduulissa
       suomeksi, ja se päätyi sellaisenaan myös saksan- ja ranskankielisille
       sivuille — sanat ovat jo olemassa käännettyinä (`lautapeli.lauta`), joten
       isäntäsivu antaa ne. Suomi jää oletukseksi esikatselua varten. */
    var OTSAKE = asetukset.otsakkeet || {};
    /* Laudan alueiden mitat (900×900 kuvan koordinaateissa) tulevat
       isäntäsivulta, jolla ne on mitattu kuvasta kerran. */
    var ALUEET = asetukset.alueet || null;
    /* ⚠️ LAUTAPELILLÄ ON OMAT KORTTINSA. Korttipelin pakan kuvat
       (`play/kuvat/pizza-NN.webp`) ovat eri pelin kortteja, ja Marko huomasi
       sen heti: «Nuo pizzakortit ei ole nyt lautapelin pizzakortteja.»
       Tiedostonimi on painon sarjanumero: pizzat 1–42, apinat 43–75, ja
       apinakortin kuvassa on painettuna sen oma numero 01–33. Täällä
       käytetään kortin omaa numeroa, koska tiedostot on nimetty sen mukaan. */
    var LAUTAKORTIT = asetukset.lautakortit || null;
    function lautakortti(laji, n) {
      if (!LAUTAKORTIT) return null;
      return LAUTAKORTIT + laji + '-' + (n < 10 ? '0' : '') + n + '.webp';
    }
    function otsake(avain, oletus) { return OTSAKE[avain] || oletus; }
    var KEHOTE = !KORTTIPAIKKA ? '' :
      asetukset.kehote !== undefined ? asetukset.kehote :
      '<b class="ak__korttinimi">Valitse apinakortti</b>' +
      '<span class="ak__ohje">Näet, mitä kortti tekee pelissä.</span>';
    function kehote() {
      korttiEl.hidden = !KEHOTE;
      korttiEl.innerHTML = KEHOTE;
      korttiEl.classList.add('ak__kortti--kehote');
    }
    var nayttoEl = juuri.querySelector('#akNaytto');
    var seliteEl = juuri.querySelector('#akSelite');
    var ohjainEl = juuri.querySelector('#akOhjain');
    var pisteetEl = juuri.querySelector('#akPisteet');
    var toistoEl = juuri.querySelector('#akToisto');
    var edellinenEl = juuri.querySelector('#akEdellinen');
    var seuraavaEl = juuri.querySelector('#akSeuraava');

    function alkuun() {
      tila.paikka = {};
      for (var v = 1; v <= 10; v++) tila.paikka[v] = ALKU_LINJASTO.indexOf(v) >= 0 ? 'linjasto' : 'varasto';
      tila.noppa = 3;
      tila.boksit = ALKU_BOKSIT.map(function (b) { return b.slice(); });
      tila.vuoro = 0;
      tila.suunta = 1;
      tila.ohita = -1;
      tila.korostus = [];
      tila.peruttu = false;
      tila.vaihe = -1;
      tila.jarjestys = [0, 1, 2];  // missä järjestyksessä boksit näytetään
      tila.boksiId = [0, 1, 2];    // boksin pysyvä tunniste, seuraa boksia omistajalta toiselle
      tila.liike = null;           // MIKÄ liikkuu: 'jarjesta' | 'boksit' | 'palat'
      tila.isoLuku = false;        // korostetaanko palojen määrä
      tila.katse = null;           // MIHIN yhteen asiaan katse kohdistetaan
      tila.yksin = null;           // jos kortti koskee vain yhtä: näytä vain hänet
      tila.nuolet = 0;             // kierron suunta nuolina: 1 oikealle, -1 vasemmalle
      /* ⚠️ KIERTO NÄHDÄÄN KEHÄNÄ, EI RIVIN VÄLISSÄ OLEVINA NUOLINA
         (Marko 16.11.2026: «Tässä kannattaisi olla ympyrä taustalla, jossa kierto
         näkyy selvästi»). Mitattu syy: nuoli lisättiin omana soluna riviin, jonka
         ruudukko on `repeat(3,1fr)` — kolme boksia + kaksi nuolta = viisi solua
         kolmeen sarakkeeseen, joten rivi katkesi 2+1 ja kierto muuttui
         lukukelvottomaksi. Renkaassa paikat ovat napakoordinaatteja, joten
         kolmas boksi ei voi pudota omalle riville. 0 = ei rengasta. */
      tila.rengas = false;        // onko kehäasettelu päällä
      tila.suunta = 0;            // kehän kiertosuunta nuolelle: 1, -1 tai 0
      tila.mittarit = [];         // mitkä luvut näytetään (ks. MITTARIT)
      tila.valmistelut = false;   // pelivalmisteluiden oma näkymä
      /* ⚠️ OMA NIMI: `tila.vaihe` on jo vuoron askel (kortit 27 ja 30).
         Sama nimi kahdessa merkityksessä on tämän projektin toistuvin
         vikaluokka — kolme kertaa tänään (ak__rengas, ak__kiertaja, --lev). */
      tila.vvaihe = 0;
      tila.pelaajamerkit = 0;     // montako pelaajamerkkiä laudan laidassa
      tila.nimet = true;          // näytetäänkö pelaajien nimet (ks. NIMETTOMAT)
      tila.aave = null;            // «tavallisesti tähän» — se mitä kortti muuttaa
      tila.sykki = false;          // vuoro jää samalle: noppa sykkii paikallaan
      tila.kortti = null;          // kortti 27: nostettu apinakortti ja sen pyyhkiminen
      tila.jarjestys30 = null;     // kortti 30: nopan ja pizzan järjestys
      tila.basso = false;          // kortti 33: Basso syömässä
      tila.arvio = null;      // pelaajan asema: ehto, jonka kortti ratkaisee
      tila.menetys = null;    // kuka menetti ja montako
      tila.siirrot = null;    // todelliset siirrot pelaajalta toiselle
    }

    function linjalla() { var o = []; for (var v = 1; v <= 10; v++) if (tila.paikka[v] === 'linjasto') o.push(v); return o; }
    function varastossa() { var o = []; for (var v = 1; v <= 10; v++) if (tila.paikka[v] === 'varasto') o.push(v); return o; }
    function arvo() { return linjalla().reduce(function (s, x) { return s + x; }, 0); }
    function suodata(f) { var o = []; for (var v = 1; v <= 10; v++) if (f(v)) o.push(v); return o; }

    // ---------------------------------------------------------------- lauta
    /* ⚠️ LINJASTO OMAKSI ISOKSI ELEMENTIKSEEN, VARASTO SEN ALLE VAAKAAN
       (Marko 16.11.2026: «pizzakortteja ei tässä tarvita, joten pizzalautaa
       voi rajata huoletta. — — tuo linjasto kannattaa ottaa tuosta keskeltä
       omaksi isoksi elementikseen ja sitten varasto irroitetaan ja laitetaan
       linjaston alapuolelle vaakatasoon. Tällöin tornit on aina torneja joka
       paikassa.»).

       ⚠️ JA SE RATKAISEE KAKSI ASIAA KERRALLA. Edellisessä versiossa varasto
       oli laudan oma pystypylväs, ja siinä tornit eivät mahtuneet — jouduin
       näyttämään varastossa pelkän tarran. Vaakarivissä tornit mahtuvat,
       joten torni on torni kaikkialla. Lisäksi numerointi kulkee vasemmalta
       oikealle, kuten Marko huomautti: joku pelaajista istuu varaston
       puolella, ja hänelle nappulat ovat joka tapauksessa vaakasuorassa.

       📐 RAJAUS ON LASKETTU MITATUSTA GEOMETRIASTA, EI SILMÄMÄÄRÄISESTI.
       Rengas on 900 × 900 -kuvassa keskipisteessä (447, 436) säteellä 232 px
       ja täyteympyrän oma säde on 52 px, joten rengas mahtuu kokonaan
       neliöön x 145…749, y 134…738 (604 × 604) kun reunaan jätetään 18 px.
       Kuva piirretään siis 149,01 %:n levyisenä ja siirretään −24,01 % /
       −22,19 %. Yhtään uutta kuvatiedostoa ei synny: rajaus on CSS:ää, ja
       `pelilauta.webp` pysyy yhtenä tiedostona. */
    var RENGAS = [
      [61.87, 13.47], [81.07, 27.42], [88.41, 50.00], [81.07, 72.58], [61.87, 86.53],
      [38.13, 86.53], [18.93, 72.58], [11.59, 50.00], [18.93, 27.42], [38.13, 13.47]
    ];

    function paikkaEl(v) {
      var p = el('span', 'ak__paikka');
      p.dataset.v = v;
      p.appendChild(torni(v));
      return p;
    }

    function piirraLauta() {
      nayttoEl.className = 'ak__naytto ak__naytto--lauta';

      /* Linjasto: laudan oma rengas rajattuna, tornit sen omille paikoille. */
      var rengas = el('div', 'ak__rengas');
      rengas.innerHTML = '<img class="ak__lautakuva" src="' + (asetukset.lautakuva ||
        'apinavaaka/pelilauta.webp') + '" alt="">';
      for (var v = 1; v <= 10; v++) {
        if (tila.paikka[v] !== 'linjasto') continue;
        var p = paikkaEl(v);
        p.style.left = RENGAS[v - 1][0] + '%';
        p.style.top = RENGAS[v - 1][1] + '%';
        rengas.appendChild(p);
      }
      /* ⚠️ JOMPI KUMPI, EI TOINEN (Marko 16.11.2026: «nyt siellä lukee
         varasto, mutta ei linjastoa. Eli jompi kumpi linja pitää valita, joko
         lukee tai ei lue»). Molemmat lukevat, ja otsikko on alueensa yläpuolella
         samalla tavalla kummassakin. */
      var linjasto = el('div', 'ak__linjasto');
      linjasto.appendChild(el('span', 'ak__otsake', otsake('linjasto', 'Linjasto')));
      linjasto.appendChild(rengas);
      nayttoEl.appendChild(linjasto);

      /* ⚠️ VARASTON ALLA ON LAUDAN OMA VARASTO HAALEANA (Marko 16.11.2026:
         «Ota varaston alle se pelilaudan varasto myös haaleana kuvana»).
         Laudalla se on pystypylväs, joten se KÄÄNNETÄÄN vaakaan niin että 1 on
         vasemmalla — juuri se mitä Marko tarkoitti sillä, että varaston
         puolella istuvalle numerointi menee vasemmalta oikealle.
         📐 Rajaus laskettu mitatuista ympyröistä: keskikohdat y 70,0…827,4,
         väli 84,15 px. Kun rajaus on y 27,9…869,5, keskikohdat osuvat tasan
         5 %:iin ja 95 %:iin eli 10 %:n välein — samaan ruudukkoon jossa tornit
         seisovat. Pystysuunnassa ympyrän keskikohta on 47,14 % nauhasta.
         Tyhjää paikkaa ei merkitä erikseen: laudan oma numeroitu ympyrä ON se
         tyhjä paikka, aivan kuten renkaassa. */
      /* ⚠️ PELAAJAMÄÄRÄ ON KORTIN SISÄLTÖÄ KORTEISSA 16 JA 17, JOTEN SE ON
         NÄYTETTÄVÄ KUVANA (Marko 16.11.2026 valitsi «kuvana, ei tekstinä»).
         Sääntö on «poista pelaajien lukumäärän verran», ja se luku luki vain
         askeleen tekstissä — joka on korttisivulla piilossa. Kolme merkkiä
         ja kolme lähtevää täytettä näyttävät saman asian ilman sanoja. */
      if (tila.pelaajamerkit) {
        var pm = el('div', 'ak__pelaajamerkit');
        for (var q = 0; q < tila.pelaajamerkit; q++)
          pm.appendChild(el('span', 'ak__pelaajamerkki',
            '<img src="' + KANSIO + 'boksi.webp" alt="">'));
        nayttoEl.appendChild(pm);
      }
      var varasto = el('div', 'ak__varasto');
      varasto.appendChild(el('span', 'ak__otsake', otsake('varasto', 'Varasto')));
      var lava = el('div', 'ak__varastolava');
      lava.innerHTML = '<div class="ak__varastokuva"><div class="ak__varastokierto">' +
        '<img src="' + (asetukset.lautakuva || 'apinavaaka/pelilauta.webp') + '" alt="">' +
        '</div></div>';
      for (var w = 1; w <= 10; w++) {
        if (tila.paikka[w] !== 'varasto') continue;
        var r = paikkaEl(w);
        r.classList.add('ak__paikka--varasto');
        r.style.left = (w * 10 - 5) + '%';
        lava.appendChild(r);
      }
      varasto.appendChild(lava);
      nayttoEl.appendChild(varasto);

      var halutut = tila.mittarit || [];
      if (halutut.length) {
        var mittarit = el('div', 'ak__mittarit');
        if (halutut.indexOf('arvo') >= 0)
          mittarit.appendChild(el('div', 'ak__mittari', '<b>' + arvo() + '</b><span>linjaston arvo</span>'));
        if (halutut.indexOf('noppa') >= 0)
          mittarit.appendChild(el('div', 'ak__mittari', '<b>' + tila.noppa + '</b><span>noppa</span>'));
        nayttoEl.appendChild(mittarit);
      }
    }

    // ---------------------------------------------------------------- boksit
    /* Boksi piirretään pelin omilla kuvilla: `boksi.webp` pohjaksi ja
       `kuvat/pala/N.webp` paloiksi 36 asteen välein — sama geometria kuin
       pelin `boksinSisus()`:ssa (pala on tasan kymmenesosa, ks. apinavaaka.js). */
    /* ⚠️ PELIN OMAT LUOKAT (`av__boksi*`), EI OMIA. Palan geometria — kärki
       laatikon keskelle, korkeus 34 % ja leveys painotiedoston suhteesta
       353/546 — on mitattu kerran `apinavaaka.css`:ään. Omat luokat olisivat
       toinen kopio samoista luvuista, ja mitattu: omilla `width:100%`-arvoilla
       palat olivat moninkertaiset laatikkoon nähden. `apinakortti.css` tekee
       boksin näkyväksi tässä yhteydessä, muuta se ei tarvitse. */
    /* `omistaja` on pelaajan indeksi. Se kirjoitetaan palaan, jotta `lennataPalat`
       tunnistaa SAMAN palan ennen ja jälkeen piirron ja osaa lennättää sen
       pelaajalta toiselle. Ilman tunnistetta pala vain katoaa yhdestä
       laatikosta ja ilmestyy toiseen — juuri se, mitä Marko ei ehtinyt tajuta. */
    function boksiEl(palat, korosta, omistaja) {
      var b = el('span', 'av__boksi ak__boksi');
      var sv = '<img class="av__boksi-pohja" src="' + KANSIO + 'boksi.webp" alt="">';
      for (var j = 0; j < 10; j++) {
        var n0 = j + 1;
        if (palat.indexOf(n0) < 0) continue;
        var uusi = korosta && korosta.indexOf(n0) >= 0;
        sv += '<img class="av__boksi-pala' + (uusi ? ' uusi' : '') + '" data-a="' + n0 +
          '" data-p="' + omistaja + '" data-kulma="' + (j * 36) + '" src="' +
          KANSIO + '../kuvat/pala/' + n0 + '.webp" alt="" style="--kulma:' + (j * 36) +
          'deg;transform:rotate(' + (j * 36) + 'deg)">';
      }
      b.innerHTML = sv;
      return b;
    }

    function piirraBoksit() {
      nayttoEl.className = 'ak__naytto ak__naytto--boksit';
      var rivi = el('div', 'ak__pelaajat' + (tila.isoLuku ? ' ak__pelaajat--luvut' : '') +
        (tila.rengas ? ' ak__pelaajat--rengas' : ''));
      /* ⚠️ BOKSIT PIIRRETÄÄN ESITYSJÄRJESTYKSESSÄ, EI PELAAJAJÄRJESTYKSESSÄ
         (Marko 16.11.2026: «Boksien järjestys voisi muuttua ja tulla isona se,
         että kuinka monta palaa on ja siitä se, että kuka johtaa ja kuka on
         keskellä»). Järjestäminen tekee johtamisesta nähtävän asian sanotun
         sijaan, ja sen jälkeen seuraukset luetaan vasemmalta oikealle samassa
         järjestyksessä kuin sääntö ne luettelee.

         ⚠️ Nimi matkaa boksin mukana, koska tässä JÄRJESTETÄÄN eikä vaihdeta
         omistajaa. Korteissa 9, 10 ja 12 boksi vaihtaa omistajaa ja nimet
         pysyvät paikoillaan — ero on juuri siinä, kumpi liikkuu. */
      /* ⚠️ JOS KORTTI KOSKEE VAIN YHTÄ, MUITA EI NÄYTETÄ (Marko 16.11.2026:
         «tämä ei kosketa kuin yhtä pelaajaa, joten turha on näyttää vieressä
         muiden pelaajien bokseja»). Muut boksit olisivat tässä pelkkää
         katseen kilpailua ilman tietosisältöä — ja silloin ne vievät juuri
         sen huomion jonka kortti tarvitsee. */
      var nakyvat = (tila.yksin === null || tila.yksin === undefined) ?
        (tila.jarjestys || [0, 1, 2]) : [tila.yksin];
      if (nakyvat.length === 1) rivi.classList.add('ak__pelaajat--yksi');
      nakyvat.forEach(function (i, sija) {
        var palat = tila.boksit[i];
        /* ⚠️ YKSI ASIA KERRALLAAN, ISONA (Marko 16.11.2026, universaali ohje:
           «kun boksissa tapahtuu jotain, niin se ei voi tapahtua kaikissa
           samaan aikaan. Aina yksi boksi kerrallaan erityiseen tarkasteluun ja
           isona. — — Ei voida olettaa, että joku pystyy katsomaan ruudulla
           kolmea asiaa samaan aikaan.»). `tila.katse` on se yksi; muut jäävät
           pienemmiksi ja haaleiksi mutta näkyviin, jotta asiayhteys säilyy. */
        var p = el('div', 'ak__pelaaja' + (tila.korostus.indexOf(i) >= 0 ? ' ak__pelaaja--korosta' : '') +
          (i === tila.vuoro ? ' ak__pelaaja--vuoro' : '') +
          (tila.katse === null || tila.katse === undefined ? '' :
            (tila.katse === i ? ' ak__pelaaja--katse' : ' ak__pelaaja--sivussa')));
        p.dataset.p = i;
        /* Renkaassa paikka on kulma, ei sarake: 0° ylös, sitten 120° välein.
           Viimeinen vastakierto pitää boksin pystyssä. */
        if (tila.rengas) p.style.setProperty('--a', (sija * 120) + 'deg');
        /* ⚠️ NIMI ON ISTUIMESSA, EI KIERTORADALLA. Kokeilin nimeä kehän
           ulkoreunalla; mitattu tulos oli että se meni boksin PÄÄLLE (nimi
           x 33–69, boksi x 48–114), koska ulospäin 240°:ssa on lähes suoraan
           vasemmalle. Istuimessa boksin yläpuolella se ei voi menä päällekkäin
           ja ajaa saman asian: istuin pysyy, boksi vaihtuu sen alla. */
        if (tila.nimet && nakyvat.length > 1) p.appendChild(el('b', 'ak__nimi', PELAAJAT[i]));
        if (tila.arvio && tila.arvio[i]) p.appendChild(el('span', 'ak__asema', tila.arvio[i]));
        if (tila.menetys && tila.menetys[i]) p.classList.add('ak__pelaaja--menettaa');
        /* ⚠️ BOKSI JA SEN LUKU OVAT YHTÄ, NIMI ON ERI (Marko 16.11.2026:
           «Tässä boksit vaihtavat paikkaa ei palat» ja «Boksit vaihtavat
           omistajaa, ei palat»). Kun boksi vaihtaa omistajaa, liikkuu lava —
           boksi paloineen ja palojen määrä — ja nimi jää paikalleen. Palat
           eivät liiku boksin sisällä, koska ne eivät pelissäkään liiku.
           `data-b` on boksin PYSYVÄ tunniste, joka seuraa sitä omistajalta
           toiselle; ilman sitä FLIP ei tunnistaisi samaa boksia uudelleen. */
        var lava = el('span', 'ak__boksilava');
        lava.dataset.b = tila.boksiId[i];
        lava.appendChild(boksiEl(palat, tila.tuoreet && tila.tuoreet[i], i));
        lava.appendChild(el('span', 'ak__maara', tila.isoLuku ?
          '<b>' + palat.length + '</b><i>palaa</i>' : palat.length + ' / 10'));
        p.appendChild(lava);
        rivi.appendChild(p);
        /* ⚠️ NUOLET NÄYTTÄVÄT KIERRON (Marko 16.11.2026: «tässäkin nuolet
           voisi auttaa hahmottamaan sitä ympyrää, joka tässä tapahtuu»).
           Sanat «ottaa: Pelaaja 2» kertovat saman, mutta kolmena erillisenä
           lauseena joista kehää ei näe. Nuoli on se kehä. */
        if (tila.nuolet && sija < nakyvat.length - 1) {
          rivi.appendChild(el('span', 'ak__nuolivali',
            tila.nuolet > 0 ? '\u2192' : '\u2190'));
        }
      });
      if (tila.rengas) {
        /* ⚠️ KOLME ISOA KIERRÄTYSNUOLTA, YKSI JOKAISEN BOKSIN VÄLIIN (Marko
           16.11.2026: «Tässä se nuoli saisi olla tosi paljon isompi ja niitä
           voisi olla vaikka jokaisen boksin välissä. Tiedätkö vähän sellainen
           kierrätysnuolimainen nuoli. Oikeasti selkeä, koska se nuoli on se joka
           kertoo suunnan.»).

           Ensin oli yksi pieni kolmio, joka kiersi kehää — liike kertoi suunnan,
           mutta vasta kun sitä ehti katsoa. Kaari boksien välissä kertoo sen
           yhdellä silmäyksellä ja myös sen, MISTÄ MIHIN kukin boksi menee.

           Kaari piirretään SVG:nä viewBoxiin 100×100: keskipiste (50,50), säde
           40. Kulma mitataan ylöspäin nollasta myötäpäivään, kuten istuimetkin,
           joten kaari välillä [a+18°, a+102°] jää tasan kahden istuimen väliin.
           Vastapäivään sama peilattuna, jolloin kärki osoittaa toisin päin. */
        var keha = el('span', 'ak__kiertorata' + (tila.suunta < 0 ? ' ak__kiertorata--vasen' : ''));
        if (tila.suunta) {
          var R = 40, KE = 50, myota = tila.suunta > 0;
          function piste(astetta, sade) {
            var k = (astetta - 90) * Math.PI / 180;
            return [KE + (sade || R) * Math.cos(k), KE + (sade || R) * Math.sin(k)];
          }
          var polut = '';
          for (var v = 0; v < 3; v++) {
            var a1 = v * 120 + (myota ? 18 : 102), a2 = v * 120 + (myota ? 102 : 18);
            var p1 = piste(a1), p2 = piste(a2);
            polut += '<path d="M' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) +
                     ' A' + R + ' ' + R + ' 0 0 ' + (myota ? 1 : 0) + ' ' +
                     p2[0].toFixed(1) + ' ' + p2[1].toFixed(1) + '"/>';
            /* Kärki on kolmio kaaren päässä: kärkipiste hieman kaaren jäljessä
               samalla säteellä, kanta sen takana sisä- ja ulkoreunalla. */
            var kar = piste(a2 + (myota ? 9 : -9));
            var sisa = piste(a2 + (myota ? -3 : 3), R - 5.5);
            var ulko = piste(a2 + (myota ? -3 : 3), R + 5.5);
            polut += '<polygon points="' + kar[0].toFixed(1) + ',' + kar[1].toFixed(1) + ' ' +
                     sisa[0].toFixed(1) + ',' + sisa[1].toFixed(1) + ' ' +
                     ulko[0].toFixed(1) + ',' + ulko[1].toFixed(1) + '"/>';
          }
          keha.innerHTML = '<svg class="ak__nuolet" viewBox="0 0 100 100" aria-hidden="true">' +
            polut + '</svg>';
        }
        rivi.appendChild(keha);
      }
      nayttoEl.appendChild(rivi);
      if (tila.basso) {
        var b = el('div', 'ak__basso');
        b.innerHTML = '<img src="' + KANSIO + '../kuvat/basso-syo.webp" alt="">';
        rivi.appendChild(b);
      }
      if (tila.nuolet && nakyvat.length > 1) {
        nayttoEl.appendChild(el('div', 'ak__paluu' + (tila.nuolet > 0 ? '' : ' ak__paluu--vasen'),
          '<span class="ak__paluukaari"></span>'));
      }
    }

    // ---------------------------------------------------------------- vuoro
    /* Vuorokortit eivät liikuta täytteitä vaan vuoroa. Kolme pelaajaa
       renkaassa ja nuoli, joka kertoo kiertosuunnan. Kortit 27 ja 30 eivät
       koske kiertosuuntaan vaan vuoron omiin askeliin, joten ne näytetään
       vuoron askelrivinä — se on sama asia pelaajalle, mutta eri kuva. */
    var VUOROASKELEET = ['Heitä noppaa', 'Siirrä täytteet', 'Valmista pizzat', 'Nosta apinakortti'];

    /* ⚠️ VUORO ON NOPPA, EI KEHÄ (Marko 16.11.2026: «Tuo pyörivä ympyrän kehä
       on epäselvä. Se 3D-noppa vaikka sinne vaihtamaan omistajaa voisi olla
       selkeämpi. Pystyt parempaan.»). Hän oli oikeassa kahdesti: kehä oli
       abstrakti JA staattinen. Pelissä vuoro on konkreettinen esine — se jolla
       on noppa, heittää. Nyt noppa seisoo sen pelaajan kohdalla jonka vuoro on
       ja siirtyy näkyvästi seuraavalle. Kappale on pelin oma `Noppa3D`, sama
       jota peli pyörittää; kolmatta vuoron esitystapaa ei tehdä. */
    function piirraVuoro() {
      nayttoEl.className = 'ak__naytto ak__naytto--vuoro';

      /* Kortti 27: yksi apinakortti, jonka tämä kortti pyyhkii pois.
         (Marko: «Riittäisi kuva jostain apinakortista, jonka tämä kortti
         pyyhkii pois.» Vuoron neljä vaihetta oli liikaa luettavaa.) */
      if (tila.kortti) {
        var kehys = el('div', 'ak__yksikortti' + (tila.kortti === 'pyyhitty' ? ' ak__yksikortti--pyyhitty' : ''));
        kehys.innerHTML = '<img src="' + KANSIO + 'apinakortti.webp" alt="">' +
          '<span class="ak__yliviiva"></span>';
        nayttoEl.appendChild(kehys);
        return;
      }

      /* Kortti 30: vain kaksi esinettä ja niiden järjestys. */
      if (tila.jarjestys30) {
        var pari = el('div', 'ak__pari');
        pari.innerHTML = '<span class="ak__parinoppa"><span class="av__d10"></span></span>' +
          '<span class="ak__parinuoli">' + (tila.jarjestys30 === 'molemmat' ? '\u21C4' : '\u2192') + '</span>' +
          '<span class="ak__paripizza"><img src="' + KANSIO + '../kuvat/pizza-17.webp" alt=""></span>';
        nayttoEl.appendChild(pari);
        var kd = pari.querySelector('.av__d10');
        if (kd && window.Noppa3D) window.Noppa3D(kd, KANSIO + 'noppa/').heita(tila.noppa, null, true);
        return;
      }

      /* ⚠️ MUITA PELAAJIA EI NÄYTETÄ JOS KORTTI EI KOSKE HEITÄ (Marko
         16.11.2026, kortti 1: «Eihän tässäkään noita muita pelaajia tarvitse
         näyttää. Nyt oikeasti.»). Kortissa 1 noppa ei siirry mihinkään — se
         heitetään kahdesti samalla pelaajalla — joten kaksi tyhjää saraketta
         olivat pelkkää katseen kilpailua. Korteissa 8 ja 11 noppa liikkuu
         pelaajien välillä, ja silloin muut ovat kortin sisältöä.
         Sama lippu kuin boksinäkymässä (`tila.yksin`), yksi sääntö kahdelle
         näkymälle. */
      var rivi = el('div', 'ak__vuororivi');
      var vuoroNakyvat = (tila.yksin === null || tila.yksin === undefined)
        ? [0, 1, 2] : [tila.yksin];
      if (vuoroNakyvat.length === 1) rivi.classList.add('ak__vuororivi--yksi');
      vuoroNakyvat.forEach(function (i) {
        var nimi = PELAAJAT[i];
        var pk = el('div', 'ak__vuoropaikka' + (i === tila.ohita ? ' ak__vuoropaikka--ohi' : ''));
        if (vuoroNakyvat.length > 1) pk.appendChild(el('b', 'ak__nimi', nimi));
        var lokero = el('div', 'ak__noppatila');
        if (i === tila.vuoro) {
          var lava = el('div', 'ak__noppalava' + (tila.sykki ? ' ak__noppalava--sykkii' : ''));
          lava.dataset.m = 'vuoro';
          lava.innerHTML = '<span class="av__d10"></span>';
          lokero.appendChild(lava);
        } else if (i === tila.aave) {
          lokero.appendChild(el('div', 'ak__noppaaave', 'tavallisesti'));
        }
        pk.appendChild(lokero);
        rivi.appendChild(pk);
      });
      nayttoEl.appendChild(rivi);
      var kohde = rivi.querySelector('.ak__noppalava .av__d10');
      if (kohde && window.Noppa3D) {
        noppa3d = window.Noppa3D(kohde, KANSIO + 'noppa/');
        noppa3d.heita(tila.noppa, null, true);
      }
    }

    // ---------------------------------------------------------------- noppa
    /* ⚠️ PELIN OMA NOPPA, EI UUTTA (`Noppa3D` + `noppa/<luku>.svg`). Sama
       kappale jota peli pyörittää ja jonka lautapelin opastus jo rakentaa
       erikseen (`esittelyNoppa`). Yksi tahko olisi kuva nopasta, ei noppa —
       siitä on oma päätöksensä 13.11.2026.
       ⚠️ Kappaletta EI saa rakentaa uudelleen joka askeleella: `piirra()`
       tyhjentää näyttämön, joten noppakorteissa askel kutsuu `heita()`:a
       suoraan eikä `piirra()`:a. Siksi `noppa3d` elää piirron yli. */
    var noppa3d = null;

    function piirraNoppa() {
      nayttoEl.className = 'ak__naytto ak__naytto--noppa';
      var kehys = el('div', 'ak__noppakehys');
      kehys.innerHTML = '<span class="ak__muutos" id="akMuutos" aria-hidden="true"></span>' +
        '<span class="ak__noppapaikka"><span class="av__d10"></span></span>';
      nayttoEl.appendChild(kehys);
      noppa3d = window.Noppa3D ?
        window.Noppa3D(kehys.querySelector('.av__d10'), KANSIO + 'noppa/') : null;
      if (noppa3d) noppa3d.heita(tila.noppa, null, true);
    }

    function piirra() {
      noppa3d = null;
      nayttoEl.innerHTML = '';
      var r = RYHMA[nykyinen] || 'lauta';
      if (r === 'boksi') piirraBoksit();
      else if (tila.valmistelut) piirraValmistelut();
      else if (tila.opas) piirraOpas();
      else if (r === 'vuoro') piirraVuoro();
      else if (r === 'noppa') piirraNoppa();
      else piirraLauta();
    }

    // ---------------------------------------------------------------- liike
    /* ⚠️ ENSIN KOROSTUS, SITTEN LIIKE (ehdotuksen periaate 2). Pelaajan on
       nähtävä MIHIN sääntö osuu, ennen kuin hän näkee mitä tapahtuu. Jos
       tornit vain siirtyisivät, osuma ja seuraus näkyisivät samaan aikaan. */
    function hehku(arvot) {
      if (!arvot || !arvot.length) return hidas(200);
      if (vahennaLiike || pika) return odota(0);
      arvot.forEach(function (v) {
        var p = nayttoEl.querySelector('.ak__paikka[data-v="' + v + '"]');
        if (p) p.classList.add('ak__paikka--hehku');
      });
      return hidas(900);
    }

    /* ⚠️ TÄYTTEEN ON NÄHTÄVÄSTI LIIKUTTAVA, EI VAIHDETTAVA PAIKKAA (Marko
       16.11.2026: «Kun täytteet siirtyy, niin siinä pitää olla animaatio,
       jotta silmä ehtii nähdä ja mieli tajuta mitä tapahtuu.» ja «Näissä ei
       ehdi tajuamaan mitä tapahtuu»).

       📐 Syy oli mitattavissa koodista: `piirra()` tyhjentää `nayttoEl`:n ja
       rakentaa kaiken uudelleen, joten jokainen torni oli joka askeleella UUSI
       elementti. CSS:n `transition:left,top` ei voi koskaan lauketa uudelle
       elementille — se näytti animaatiolta koodissa muttei ruudulla. Tämä on
       sama vikaluokka kuin laudan kolme esitystapaa: mekanismi oli olemassa
       mutta ei se joka oli käytössä.

       ⚠️ JA SIIRTO YLITTÄÄ SÄILIÖN RAJAN. Linjasto ja varasto ovat eri
       elementtejä eri koordinaatistoissa, joten `left`/`top` ei voi kantaa
       tornia niiden välillä. Siksi FLIP: mitataan jalan paikka ENNEN ja
       JÄLKEEN, ja uusi elementti lennätetään vanhasta paikasta nykyiseen
       `transform`illa — se toimii säiliöstä riippumatta.

       Mittapiste on tornin JALKA, samasta syystä kuin ankkurikin: torni
       seisoo, joten jalka on se kohta joka siirtyy paikasta toiseen. */
    /* 📐 Tahti: Marko 16.11.2026 «Animaatio hitaammaksi». */
    var LENTO = 950;
    /* ⚠️ KEHÄSSÄ MATKA ON PIDEMPI, JOTEN AIKAA TARVITAAN ENEMMÄN (Marko
       16.11.2026: «Muista, että animaation pitää olla riittävän hidas, jotta sen
       ehtii nähdä»). Rivillä boksi liikkuu viereiseen sarakkeeseen, kehällä
       kolmanneksen ympyrästä — sama kesto tekisi siitä kaksin verroin
       nopeamman näköisen. */
    var LENTO_RENGAS = 1600;
    /* ⚠️ MONI LIIKE YHTÄ AIKAA ON VÄLÄHDYS, EI LIIKE (Marko 16.11.2026:
       «animaation pitää olla riittävän hidas, jotta sen ehtii nähdä»).
       📐 Mitattu: kortti 26 («kaikki täytteet vaihtavat paikkaa») käynnisti
       KYMMENEN liikettä samalla 950 ms:n jaksolla — silmä ei seuraa yhtäkään
       niistä. Porrastus tekee samasta tapahtumasta aallon: jokainen pala
       lähtee hieman edellistä myöhemmin, joten liikkeen suunnan näkee.
       Kesto ei pitene palaa kohden vaan kokonaisuutena, ja hitain tapaus
       (10 palaa) on 950 + 9 × 90 = 1760 ms. */
    var PORRAS = 90;
    function lentoaika() { return tila.rengas ? LENTO_RENGAS : LENTO; }

    function sijainnit() {
      var o = {}, peru = nayttoEl.getBoundingClientRect();
      [].forEach.call(nayttoEl.querySelectorAll('.ak__paikka'), function (p) {
        var r = p.getBoundingClientRect();
        o[p.dataset.v] = { x: r.left + r.width / 2 - peru.left, y: r.bottom - peru.top };
      });
      return o;
    }

    function lennata(ennen, jalkeen) {
      if (vahennaLiike || pika) return odota(0);
      var lentoja = 0;
      Object.keys(jalkeen).forEach(function (v) {
        var a = ennen[v], b = jalkeen[v];
        if (!a) return;
        var dx = a.x - b.x, dy = a.y - b.y;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        var p = nayttoEl.querySelector('.ak__paikka[data-v="' + v + '"]');
        if (!p) return;
        lentoja++;
        p.classList.add('ak__paikka--lento');
        var liike = p.animate([
          { transform: 'translate(-50%,-100%) translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)' },
          { transform: 'translate(-50%,-100%)' }
        ], { duration: LENTO, delay: (lentoja - 1) * PORRAS, fill: 'backwards',
             easing: 'cubic-bezier(.33,.9,.3,1)' });
        liike.finished.then(function () { p.classList.remove('ak__paikka--lento'); },
                            function () { p.classList.remove('ak__paikka--lento'); });
      });
      return odota(lentoja ? LENTO + (lentoja - 1) * PORRAS : 0);
    }

    function siirra(muutokset) {
      var ennen = sijainnit();
      Object.keys(muutokset).forEach(function (v) { tila.paikka[v] = muutokset[v]; });
      piirra();
      return lennata(ennen, sijainnit());
    }

    function vaihda(arvot) {
      var m = {};
      arvot.forEach(function (v) { m[v] = tila.paikka[v] === 'linjasto' ? 'varasto' : 'linjasto'; });
      return m;
    }
    function kaikkiAlueelle(alue) { var m = {}; for (var v = 1; v <= 10; v++) m[v] = alue; return m; }

    function noppaan(uusi) {
      var ero = uusi - tila.noppa;
      tila.noppa = uusi;
      if (!noppa3d) { piirra(); return hidas(600); }
      /* Merkki ensin, heitto vasta sitten: katsoja ehtii lukea mitä tapahtuu
         ennen kuin se tapahtuu — sama järjestys kuin korostus ennen liikettä. */
      var merkki = nayttoEl.querySelector('#akMuutos');
      if (merkki && ero) {
        merkki.textContent = (ero > 0 ? '+' : '\u2212') + Math.abs(ero);
        merkki.className = 'ak__muutos ak__muutos--nakyy';
      }
      var d = noppa3d, nopeasti = vahennaLiike || pika;
      return hidas(450).then(function () {
        return new Promise(function (valmis) { d.heita(uusi, valmis, nopeasti); });
      }).then(function () { return hidas(400); });
    }

    // ---------------------------------------------------------------- vaikutukset
    /* Askel: { korosta, muutos, teksti, tee }. `tee` on vapaa funktio niille
       korteille joiden vaikutus ei ole täytteen siirto (noppa, boksit, vuoro). */
    var VAIKUTUS = {
      // ---- lauta
      2: function () {
        var t = varastossa()[0], p = linjalla().slice(-1)[0];
        return [{ korosta: [t], muutos: ok(t, 'linjasto'), teksti: 'Esimerkki: tuodaan varastosta ' + t + '.' },
                { korosta: [p], muutos: ok(p, 'varasto'), teksti: '… ja halutessa viedään ' + p + ' pois linjastolta.' }];
      },
      3: function () {
        var u = tila.noppa + 1;
        return [{ teksti: 'Apinakortti lisää noppaan yhden.', tee: function () { return noppaan(u); } }];
      },
      4: function () {
        var u = Math.max(0, tila.noppa - 1);
        return [{ teksti: 'Apinakortti vähentää nopasta yhden.', tee: function () { return noppaan(u); } }];
      },
      5: function () {
        return [{ teksti: 'Ensimmäinen heitto: 4.', tee: function () { return noppaan(4); } },
                { korosta: [4], muutos: ok(4, 'linjasto'), teksti: 'Tuodaan 4 linjastolle.' },
                { teksti: 'Toinen heitto: 1.', tee: function () { return noppaan(1); } },
                { korosta: [1], muutos: ok(1, 'linjasto'), teksti: 'Tuodaan 1 linjastolle. Vasta nyt valmistetaan pizzat.' }];
      },
      14: function () { return [{ korosta: linjalla(), muutos: kaikkiAlueelle('varasto'), teksti: 'Kaikki linjaston täytteet menevät varastoon.' }]; },
      15: function () { return [{ korosta: varastossa(), muutos: kaikkiAlueelle('linjasto'), teksti: 'Kaikki täytteet tulevat linjastolle. Pizzaparty!' }]; },
      16: function () {
        var l = linjalla().slice(0, asetukset.pelaajia || 3), m = {};
        l.forEach(function (v) { m[v] = 'varasto'; });
        tila.pelaajamerkit = asetukset.pelaajia || 3;
        return [{ korosta: l, muutos: m, teksti: (asetukset.pelaajia || 3) + ' pelaajaa → ' + l.length + ' pienintä linjastolta varastoon.' }];
      },
      17: function () {
        var l = linjalla().slice(-(asetukset.pelaajia || 3)), m = {};
        l.forEach(function (v) { m[v] = 'varasto'; });
        tila.pelaajamerkit = asetukset.pelaajia || 3;
        return [{ korosta: l, muutos: m, teksti: (asetukset.pelaajia || 3) + ' pelaajaa → ' + l.length + ' suurinta linjastolta varastoon.' }];
      },
      18: function () { return [{ korosta: [1], muutos: ok(1, 'linjasto'), teksti: 'Esimerkki: tuodaan oliivi (1). Arvo kasvaa yhdellä.' }]; },
      19: function () { return [{ korosta: [2, 1], muutos: { 2: 'varasto', 1: 'linjasto' }, teksti: 'Esimerkki: tomaatti (2) vaihtuu oliiviin (1). Arvo pienenee yhdellä.' }]; },
      20: function () { var a = suodata(function (v) { return v % 2; }); return [{ korosta: a, muutos: vaihda(a), teksti: 'Parittomat 1, 3, 5, 7 ja 9 vaihtavat paikkaa.' }]; },
      21: function () { var a = suodata(function (v) { return v % 2 === 0; }); return [{ korosta: a, muutos: vaihda(a), teksti: 'Parilliset 2, 4, 6, 8 ja 10 vaihtavat paikkaa.' }]; },
      22: function () { return [{ korosta: [3, 6, 9], muutos: vaihda([3, 6, 9]), teksti: 'Kolmella jaolliset 3, 6 ja 9 vaihtavat paikkaa.' }]; },
      23: function () { return [{ korosta: [5, 10], muutos: vaihda([5, 10]), teksti: 'Viidellä jaolliset 5 ja 10 vaihtavat paikkaa.' }]; },
      24: function () { var a = [1, 2, 3, 4, 5]; return [{ korosta: a, muutos: vaihda(a), teksti: 'Pienet 1–5 vaihtavat paikkaa.' }]; },
      25: function () { var a = [6, 7, 8, 9, 10]; return [{ korosta: a, muutos: vaihda(a), teksti: 'Suuret 6–10 vaihtavat paikkaa.' }]; },
      26: function () { var a = suodata(function () { return true; }); return [{ korosta: a, muutos: vaihda(a), teksti: 'Kaikki täytteet vaihtavat paikkaa.' }]; },
      29: function () {
        /* Yksi pari kerrallaan (ehdotuksen periaate 3): samassa paikassa → ei
           mitään, eri paikoissa → vaihtavat. Muuten pelaaja näkee viisi
           tapahtumaa yhtä aikaa eikä opi sääntöä. */
        return PARIT.map(function (p) {
          var eri = tila.paikka[p[0]] !== tila.paikka[p[1]];
          return { korosta: p, muutos: eri ? vaihda(p) : null,
            teksti: 'Pari ' + p[0] + '–' + p[1] + (eri ? ': eri paikoissa → vaihtavat.' : ': samassa paikassa → ei mitään.') };
        });
      },

      // ---- boksi
      6: function () {
        /* ⚠️ JÄRJESTYS KATSOTAAN ENSIN JA SE JÄÄ NÄKYVIIN. Ilman tätä kortti
           näytti vain seuraukset, eikä niiden syytä voinut lukea mistään:
           palojen määrä muuttuu heti ensimmäisestä siirrosta, joten luvuista
           ei enää näe kuka johti. */
        var j = jarjestys(['johtaa', 'keskellä', 'häviöllä']);
        return [{ teksti: 'Boksitarkastus! Montako palaa kullakin on?', tee: luvutEsiin() },
                { teksti: 'Eniten paloja ensin.', tee: jarjestaMaaran() },
                { teksti: 'Eniten johtaa, vähiten on häviöllä.', tee: asemat(j) },
                { katse: 1, teksti: 'Johtava menettää yhden palan.', tee: boksista(1, 1) },
                { katse: 0, teksti: 'Keskimmäinen saa yhden palan.', tee: boksiin(0, 1) },
                { katse: 2, teksti: 'Häviöllä oleva saa kaksi palaa.', tee: boksiin(2, 2) }];
      },
      7: function () {
        return [{ teksti: 'Annat yhden palan valitsemallesi pelaajalle.',
                  tee: asemat(['antaa', '', 'saa'], [0, 2]) },
                { teksti: 'Pala siirtyy sinulta Bassolle.', tee: siirraPala(0, 2, 4) }];
      },
      /* Suunta on kortin koko sisältö, joten se näytetään ennen liikettä:
         kunkin boksin kohdalla lukee, kenelle se on menossa. */
      /* ⚠️ ALKUTILANNE ON TAVALLINEN RIVI (Marko 16.11.2026: «Tässä kortissa
         aluksi ei ole tätä näkymää, vaan se, jossa boksit ovat vierekkäin»).
         Kehä on kortin VAIKUTUS, ei sen lähtökohta: jos esitys alkaa renkaasta,
         katsoja ei näe mitä kortti muutti. */
      /* ⚠️ EI SELOSTUSTA (Marko 16.11.2026: «»Katsotaan boksit kehänä.»? Et voi
         olla tosissasi.»). Sama sääntö kuin loopissa: ymmärrys syntyy toiminnasta,
         ja kortin oma sanamuoto lukee ruudulla yläpuolella. Askeleen selite,
         joka kertoo mitä ASETTELU tekee («katsotaan kehänä»), ei kerro pelistä
         mitään — se on käyttöliittymän selostusta itselleen. */
      9: function () {
        return [{ tee: asemat(['', '', '']) },
                { tee: kierraBoksit(1) }];
      },
      10: function () {
        return [{ tee: asemat(['', '', '']) },
                { tee: kierraBoksit(-1) }];
      },
      12: function () {
        return [{ teksti: 'Valitset yhden pelaajan ja vaihdat boksit hänen kanssaan.',
                  tee: asemat(['\u21C4 ' + PELAAJAT[1], '\u21C4 ' + PELAAJAT[0], ''], [0, 1]) },
                { teksti: 'Boksit vaihtavat omistajaa paloineen.', tee: vaihdaBoksit(0, 1) }];
      },
      13: function () {
        var m = tila.boksit.map(function (b) {
          return b.length < 2 ? b.length + ' palaa → ei menetä' :
            b.length + ' palaa → menettää ' + Math.min(4, Math.floor(b.length / 2));
        });
        return [{ teksti: 'Ruokatauko! Montako palaa kullakin on?', tee: luvutEsiin() },
                { teksti: 'Eniten paloja ensin.', tee: jarjestaMaaran() },
                { teksti: 'Mitä enemmän paloja, sitä enemmän menetetään.', tee: asemat(m) },
                { katse: 1, teksti: 'Viisi palaa: menettää kaksi.', tee: ruokataukoYhdelle(1) },
                { katse: 0, teksti: 'Kolme palaa: menettää yhden.', tee: ruokataukoYhdelle(0) },
                { katse: 2, teksti: 'Yhtä ainoaa palaa ei menetetä.', tee: ruokataukoYhdelle(2) }];
      },
      28: function () { return [                { yksin: 0, tee: boksiin(0, 1) }]; },
      31: function () {
        return [{ tee: asemat(['', '', '']) },
                { katse: 0, teksti: 'Sinä otat palan Pelaajalta 2.', tee: kateusYhdelle(0) },
                { katse: 1, teksti: 'Pelaaja 2 ottaa palan Bassolta.', tee: kateusYhdelle(1) },
                { katse: 2, teksti: 'Basso ottaa palan sinulta.', tee: kateusYhdelle(2) }];
      },
      32: function () { return [                { yksin: 0, tee: boksiin(0, 2) }]; },
      /* ⚠️ PELIN SYNKIN KORTTI SAA OLLA HAUSKA (Marko 16.11.2026: «tämähän on
         koko pelin synkin kortti, niin tähän voisi lisätä vähän sellaista
         draamaa tai jopa huumoria, että Basso tulee kuvana, jossa se syö sitä
         pizzaa»). `kuvat/basso-syo.webp` on jo olemassa — ei uutta kuvaa.
         Palat katoavat yksi kerrallaan, koska yksi asia kerrallaan, ja koska
         syöminen on sarja suupaloja eikä yksi tapahtuma. */
      33: function () {
        var n = tila.boksit[0].length;
        var o = [{ yksin: 0, tee: bassoEsiin() }];
        for (var k = 0; k < n; k++) o.push({ teksti: k === 0 ? 'Nam.' : (k === n - 1 ? 'Ja viimeinenkin.' : 'Nam nam.'), tee: syoPala() });
        o.push({ teksti: 'Boksisi on tyhjä. Basso kiittää.', tee: bassoPois() });
        return o;
      },

      // ---- vuoro
      /* Kortin koko sisältö on kaksi heittoa peräkkäin samalla pelaajalla.
         «Tavallisesti noppa siirtyisi» oli selitys siitä mitä EI tapahdu —
         ja se vaati kaksi tyhjää saraketta vierelle. */
      1: function () {
        return [{ yksin: 0, tee: noppaVuoroon(0, 3) },
                { tee: samaVuoro() },
                { tee: noppaVuoroon(0, 7) }];
      },
      8: function () {
        return [{ teksti: 'Noppa on sinulla.', tee: noppaVuoroon(0, 3) },
                { teksti: 'Kortti merkitsee sinut ohitettavaksi.', tee: ohitaVuoro(0) },
                { teksti: 'Noppa siirtyy Pelaajalle 2.', tee: noppaVuoroon(1, 5) },
                { teksti: 'Sitten Bassolle.', tee: noppaVuoroon(2, 2) },
                { teksti: 'Sinut ohitetaan: noppa menee suoraan Pelaajalle 2.', tee: noppaVuoroon(1, 8) }];
      },
      11: function () {
        return [{ teksti: 'Noppa kiertää myötäpäivään.', tee: noppaVuoroon(0, 3) },
                { teksti: 'Sinulta Pelaajalle 2.', tee: noppaVuoroon(1, 5) },
                { teksti: 'Kortti kääntää kiertosuunnan.', tee: suuntaan(-1) },
                { teksti: 'Nyt noppa palaa sinulle, ei mene Bassolle.', tee: noppaVuoroon(0, 9) }];
      },
      27: function () {
        return [{ teksti: 'Joku nostaa apinakortin.', tee: korttiNakyviin() },
                { teksti: 'Sinä peruut sen.', tee: korttiPyyhitaan() }];
      },
      30: function () {
        return [{ teksti: 'Tavallisesti: ensin noppa, sitten pizza.', tee: jarjestys30('normaali') },
                { teksti: 'Tällä kortilla kumpi tahansa ensin.', tee: jarjestys30('molemmat') }];
      }
    };

    // ---- pienet apurit, jotka muuttavat tilaa ja piirtävät uudelleen
    function ok(v, alue) { var m = {}; m[v] = alue; return m; }
    /* ⚠️ SAMA VIKA KUIN TÄYTTEILLÄ, ERI PAIKASSA. Boksikorteissa pala siirtyy
       pelaajalta toiselle, mutta `piirra()` rakensi laatikot uudelleen, joten
       pala katosi yhdestä ja ilmestyi toiseen. 📐 Mitattu selaimessa: kortilla
       6 ei lauennut yhtään liikettä (`.uusi`-luokkia 0, vaikka paloja 9).
       Siksi palat saavat saman FLIP-käsittelyn kuin tornit.

       ⚠️ KIERTO ON TOISTETTAVA AVAINRUUDUISSA — `transform` on yksi
       ominaisuus, joten pelkkä `translate` pyyhkisi palan kulman. Sama sääntö
       on kirjattu `apinavaaka.css`:ään, josta palan geometria tulee. */
    function palaSijainnit() {
      var o = {}, peru = nayttoEl.getBoundingClientRect();
      [].forEach.call(nayttoEl.querySelectorAll('.av__boksi-pala[data-a]'), function (q) {
        var r = q.getBoundingClientRect();
        (o[q.dataset.a] = o[q.dataset.a] || []).push({
          p: q.dataset.p, x: r.left + r.width / 2 - peru.left, y: r.top + r.height / 2 - peru.top, el: q
        });
      });
      return o;
    }

    /* ⚠️ PALA SAA LENTÄÄ VAIN JOS SE TODELLA SIIRTYI PELAAJALTA TOISELLE
       (Marko 16.11.2026: «Animaatio näyttää siltä, kuin ne palat menisi tai
       tulisi vastustajalta»). Näin oli, ja se oli MINUN tekemäni virhe:
       sovitin palat pelkän arvon perusteella, joten varastosta saatu pala
       lensi siltä pelaajalta jolla sattui olemaan sama arvo. Animaatio kertoi
       tarinan jota pelissä ei tapahdu.

       Siksi siirron ilmoittaa se askel joka sen tekee — `tila.siirrot` —
       eikä sitä päätellä lopputuloksesta. Boksin vaihtuessa omistajaa
       (kortit 9, 10, 12) KAIKKI palat siirtyvät, ja se sanotaan erikseen.
       Varastosta tullut pala ei lennä: se kasvaa paikalleen (`.uusi`). */
    function lennataPalat(ennen, jalkeen) {
      if (vahennaLiike || pika) return odota(0);
      if (!(tila.siirrot && tila.siirrot.length)) return odota(0);
      var lentoja = 0;
      Object.keys(jalkeen).forEach(function (a) {
        var vanhat = ennen[a] || [];
        jalkeen[a].forEach(function (u, i) {
          var ilmoitettu = (tila.siirrot || []).filter(function (x) {
            return String(x.a) === String(a) && String(x.mihin) === String(u.p);
          })[0];
          if (!ilmoitettu) return;
          var v = vanhat.filter(function (x) { return String(x.p) === String(ilmoitettu.mista); })[0];
          if (!v) return;
          var dx = v.x - u.x, dy = v.y - u.y;
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
          lentoja++;
          var kul = ' rotate(' + (u.el.dataset.kulma || 0) + 'deg)';
          var laatikko = u.el.closest('.ak__pelaaja');
          if (laatikko) laatikko.classList.add('ak__pelaaja--lento');
          u.el.animate([
            { transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)' + kul },
            { transform: 'none' + kul }
          ], { duration: LENTO, delay: (lentoja - 1) * PORRAS, fill: 'backwards',
               easing: 'cubic-bezier(.33,.9,.3,1)' })
            .finished.then(function () { if (laatikko) laatikko.classList.remove('ak__pelaaja--lento'); },
                           function () { if (laatikko) laatikko.classList.remove('ak__pelaaja--lento'); });
        });
      });
      return odota(lentoja ? LENTO + (lentoja - 1) * PORRAS : 0);
    }

    /* Boksikorttien oma FLIP: kun esitysjärjestys muuttuu, kortti liukuu uuteen
       paikkaansa sen sijaan että rivi vaihtuisi yhdellä ruudulla. */
    function pelaajaSijainnit() {
      var o = {}, peru = nayttoEl.getBoundingClientRect();
      [].forEach.call(nayttoEl.querySelectorAll('.ak__pelaaja[data-p]'), function (q) {
        var r = q.getBoundingClientRect();
        o[q.dataset.p] = { x: r.left - peru.left, y: r.top - peru.top, el: q };
      });
      return o;
    }

    function lennataPelaajat(ennen, jalkeen) {
      if (vahennaLiike || pika) return odota(0);
      var lentoja = 0;
      Object.keys(jalkeen).forEach(function (i) {
        var a = ennen[i], b = jalkeen[i];
        if (!a) return;
        var dx = a.x - b.x;
        if (Math.abs(dx) < 1) return;
        lentoja++;
        b.el.animate([{ transform: 'translateX(' + dx.toFixed(1) + 'px)' }, { transform: 'none' }],
          { duration: LENTO, easing: 'cubic-bezier(.33,.9,.3,1)' });
      });
      return lentoja ? LENTO + (lentoja - 1) * PORRAS : 0;
    }

    function merkkiSijainnit() {
      var o = {}, peru = nayttoEl.getBoundingClientRect();
      [].forEach.call(nayttoEl.querySelectorAll('[data-m]'), function (q) {
        var r = q.getBoundingClientRect();
        o[q.dataset.m] = { x: r.left - peru.left, y: r.top - peru.top, el: q };
      });
      return o;
    }

    function lennataMerkit(ennen, jalkeen) {
      if (vahennaLiike || pika) return 0;
      var lentoja = 0;
      Object.keys(jalkeen).forEach(function (k) {
        var a = ennen[k], b = jalkeen[k];
        if (!a) return;
        var dx = a.x - b.x, dy = a.y - b.y;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        lentoja++;
        b.el.animate([
          { transform: 'translate(-50%,-50%) translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)' },
          { transform: 'translate(-50%,-50%)' }
        ], { duration: LENTO, easing: 'cubic-bezier(.33,.9,.3,1)' });
      });
      return lentoja ? LENTO + (lentoja - 1) * PORRAS : 0;
    }

    function boksiSijainnit() {
      var o = {}, peru = nayttoEl.getBoundingClientRect();
      [].forEach.call(nayttoEl.querySelectorAll('.ak__boksilava[data-b]'), function (q) {
        var r = q.getBoundingClientRect();
        o[q.dataset.b] = { x: r.left - peru.left, y: r.top - peru.top, el: q };
      });
      return o;
    }

    function lennataVaaka(ennen, jalkeen) {
      if (vahennaLiike || pika) return 0;
      var lentoja = 0;
      Object.keys(jalkeen).forEach(function (k) {
        var a = ennen[k], b = jalkeen[k];
        if (!a) return;
        /* ⚠️ MYÖS PYSTYSUUNTA, KOSKA RENGAS EI OLE RIVI. Rivillä dy on aina 0,
           joten tämä ei muuta vanhaa käyttäytymistä — mutta ilman sitä kehään
           siirtyminen olisi näyttänyt hypyltä pystysuunnassa. */
        var dx = a.x - b.x, dy = (a.y || 0) - (b.y || 0);
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        lentoja++;
        b.el.animate([{ transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)' },
          { transform: 'none' }],
          { duration: lentoaika(), easing: 'cubic-bezier(.4,.2,.2,1)' });
      });
      return lentoja ? lentoaika() : 0;
    }

    /* ⚠️ ASKEL ILMOITTAA MIKÄ LIIKKUU — sama sääntö kuin `tila.siirrot`illa,
       nyt kolmannen kerran. Lopputuloksesta päättely antaisi taas uskottavan
       mutta väärän tarinan: boksin vaihtaessa omistajaa palat näyttäisivät
       lentävän pelaajalta toiselle, vaikka ne eivät liiku boksistaan. */
    function uudelleen() {
      var laji = tila.liike;
      var ennenPalat = laji === 'palat' ? palaSijainnit() : null;
      var ennenPelaajat = laji === 'jarjesta' ? pelaajaSijainnit() : null;
      var ennenBoksit = laji === 'boksit' ? boksiSijainnit() : null;
      var ennenMerkit = laji === 'vuoro' ? merkkiSijainnit() : null;
      piirra();
      if (laji === 'vuoro') return hidas(Math.max(350, lennataMerkit(ennenMerkit, merkkiSijainnit())));
      if (laji === 'jarjesta') {
        var k1 = lennataVaaka(ennenPelaajat, pelaajaSijainnit());
        return hidas(Math.max(350, k1));
      }
      if (laji === 'boksit') {
        var k2 = lennataVaaka(ennenBoksit, boksiSijainnit());
        return hidas(Math.max(350, k2));
      }
      if (laji === 'palat') {
        return lennataPalat(ennenPalat, palaSijainnit()).then(function () { return hidas(350); });
      }
      return hidas(350);
    }
    function korostaPelaajat(lista) { return function () { tila.korostus = lista; return uudelleen(); }; }
    /* Asettaa pelaajien asemat ja korostaa heidät — tämä on se askel jossa
       katsotaan, MIKSI kortti tekee kullekin sen mitä tekee. */
    function asemat(lista, korosta) {
      return function () {
        tila.arvio = lista;
        tila.korostus = korosta || [0, 1, 2];
        tila.siirrot = null; tila.liike = null; tila.menetys = null; tila.tuoreet = null;
        return uudelleen();
      };
    }
    /* Vaihe 1: luku isoksi. Se on se tieto josta kaikki muu seuraa. */
    function luvutEsiin() {
      return function () {
        tila.isoLuku = true; tila.korostus = [0, 1, 2];
        tila.siirrot = null; tila.liike = null; tila.menetys = null; tila.tuoreet = null;
        return uudelleen();
      };
    }
    /* Vaihe 2: boksit järjestykseen, eniten ensin. */
    function jarjestaMaaran() {
      return function () {
        tila.jarjestys = [0, 1, 2].sort(function (a, b) { return tila.boksit[b].length - tila.boksit[a].length; });
        tila.siirrot = null; tila.liike = null; tila.menetys = null; tila.tuoreet = null;
        return uudelleen();
      };
    }
    /* Järjestys palojen määrän mukaan: palauttaa jokaiselle sanan ja luvun. */
    function jarjestys(sanat) {
      var maarat = tila.boksit.map(function (b, i) { return { i: i, n: b.length }; });
      var lajiteltu = maarat.slice().sort(function (a, b) { return b.n - a.n; });
      var ulos = [];
      maarat.forEach(function (m) {
        var sija = lajiteltu.findIndex(function (x) { return x.i === m.i; });
        ulos[m.i] = sanat[sija] + ' (' + m.n + ')';
      });
      return ulos;
    }
    function korostaVuoro(i) { return function () { tila.vuoro = i; tila.vaihe = -1; tila.liike = null; return uudelleen(); }; }
    /* Vuoro hyppää pelaajalta toiselle — tämä on vuorokorttien koko sisältö. */
    function vuoroon(i) { return function () { tila.vuoro = i; tila.vaihe = -1; tila.sykki = false; tila.liike = 'vuoro'; return uudelleen(); }; }
    function aaveeseen(i) { return function () { tila.aave = i; tila.liike = null; return uudelleen(); }; }
    function samaVuoro() { return function () { tila.aave = null; tila.sykki = true; tila.liike = null; return uudelleen(); }; }
    /* Noppa siirtyy ja se jolla noppa on, heittää sen. Luku on kiinteä, jotta
       silmukka näyttää joka kierroksella saman eikä satunnaisuus vie huomiota. */
    function noppaVuoroon(i, luku) {
      return function () {
        tila.vuoro = i; tila.aave = null; tila.sykki = false; tila.liike = 'vuoro';
        return uudelleen().then(function () {
          if (!noppa3d || vahennaLiike || pika) { tila.noppa = luku; return odota(0); }
          tila.noppa = luku;
          var d = noppa3d;
          return new Promise(function (valmis) { d.heita(luku, valmis, false); });
        });
      };
    }
    /* Kortti 27: nostettu apinakortti ja sen pyyhkiminen. */
    function korttiNakyviin() { return function () { tila.kortti = 'nakyy'; tila.liike = null; return uudelleen(); }; }
    function korttiPyyhitaan() { return function () { tila.kortti = 'pyyhitty'; tila.liike = null; return uudelleen(); }; }
    /* Kortti 30: nopan ja pizzan järjestys. */
    function jarjestys30(mika) { return function () { tila.jarjestys30 = mika; tila.liike = null; return uudelleen(); }; }
    /* Kortti 33: Basso syö palat yksi kerrallaan. */
    function bassoEsiin() { return function () { tila.basso = true; tila.yksin = 0; tila.liike = null; return uudelleen(); }; }
    function syoPala() {
      return function () {
        tila.boksit[0].pop();
        tila.siirrot = null; tila.liike = null; tila.tuoreet = null;
        tila.menetys = {}; tila.menetys[0] = 1;
        return uudelleen();
      };
    }
    function bassoPois() { return function () { tila.basso = false; tila.liike = null; return uudelleen(); }; }
    function ohitaVuoro(i) { return function () { tila.ohita = i; tila.liike = null; return uudelleen(); }; }
    function suuntaan(s) { return function () { tila.suunta = s; tila.vaihe = -1; tila.liike = null; return uudelleen(); }; }
    function vaiheeseen(i) { return function () { tila.vaihe = i; tila.peruttu = false; return uudelleen(); }; }
    function peruutus() { return function () { tila.peruttu = true; return uudelleen(); }; }
    function puuttuva(i) { for (var n = 1; n <= 10; n++) if (tila.boksit[i].indexOf(n) < 0) return n; return null; }
    function boksiin(i, montako) {
      return function () {
        tila.siirrot = null; tila.liike = null; tila.menetys = null;
        tila.tuoreet = {};
        var lisatyt = [];
        for (var k = 0; k < montako; k++) { var n = puuttuva(i); if (n) { tila.boksit[i].push(n); lisatyt.push(n); } }
        tila.tuoreet[i] = lisatyt;
        return uudelleen();
      };
    }
    function boksista(i, montako) {
      return function () {
        tila.siirrot = null; tila.liike = null;
        for (var k = 0; k < montako; k++) tila.boksit[i].pop();
        tila.menetys = {}; tila.menetys[i] = montako;
        tila.tuoreet = null;
        return uudelleen();
      };
    }
    function siirraPala(mista, mihin, pala) {
      return function () {
        var j = tila.boksit[mista].indexOf(pala);
        if (j >= 0 && tila.boksit[mihin].indexOf(pala) < 0) {
          tila.boksit[mista].splice(j, 1);
          tila.boksit[mihin].push(pala);
          tila.tuoreet = null; tila.menetys = null;
          tila.liike = 'palat';
          tila.siirrot = [{ a: pala, mista: mista, mihin: mihin }];
        }
        return uudelleen();
      };
    }
    function kierraBoksit(suunta) {
      return function () {
        var b = tila.boksit, c = tila.boksiId;
        tila.boksit = suunta > 0 ? [b[2], b[0], b[1]] : [b[1], b[2], b[0]];
        tila.boksiId = suunta > 0 ? [c[2], c[0], c[1]] : [c[1], c[2], c[0]];
        tila.korostus = [0, 1, 2]; tila.tuoreet = null; tila.menetys = null;
        tila.liike = 'boksit'; tila.siirrot = null;
        return uudelleen();
      };
    }
    function vaihdaBoksit(a, b) {
      return function () {
        var x = tila.boksit[a]; tila.boksit[a] = tila.boksit[b]; tila.boksit[b] = x;
        var y = tila.boksiId[a]; tila.boksiId[a] = tila.boksiId[b]; tila.boksiId[b] = y;
        tila.korostus = [a, b]; tila.tuoreet = null; tila.menetys = null;
        tila.liike = 'boksit'; tila.siirrot = null;
        return uudelleen();
      };
    }
    function ruokatauko() {
      /* Kortin 13 oma taulukko: 2–3 palaa → 1, 4–5 → 2, 6–7 → 3, 8–9 → 4.
         Yhtä palaa ei poisteta (kortin «huom»). */
      return function (vain) {
        tila.siirrot = null; tila.liike = null;
        tila.menetys = {};
        tila.boksit = tila.boksit.map(function (b, i) {
          if (vain !== undefined && vain !== i) return b;
          var m = b.length < 2 ? 0 : Math.min(4, Math.floor(b.length / 2));
          if (m) tila.menetys[i] = m;
          return b.slice(0, Math.max(b.length - m, b.length ? 1 : 0));
        });
        tila.tuoreet = null;
        return uudelleen();
      };
    }
    /* Yksi pelaaja kerrallaan — ks. `tila.katse`. */
    function ruokataukoYhdelle(i) { return function () { return ruokatauko()(i); }; }
    function kateusYhdelle(i) {
      return function () {
        var edellinen = (i + 1) % 3;
        tila.tuoreet = null; tila.menetys = null; tila.siirrot = null; tila.liike = null;
        for (var n = 1; n <= 10; n++) {
          if (tila.boksit[edellinen].indexOf(n) >= 0 && tila.boksit[i].indexOf(n) < 0) {
            tila.boksit[edellinen].splice(tila.boksit[edellinen].indexOf(n), 1);
            tila.boksit[i].push(n);
            tila.liike = 'palat';
            tila.siirrot = [{ a: n, mista: edellinen, mihin: i }];
            break;
          }
        }
        return uudelleen();
      };
    }
    function annoskateus() {
      return function () {
        var otettu = [];
        [1, 2].forEach(function (i) {
          var edellinen = (i + 1) % 3;
          for (var n = 1; n <= 10; n++) {
            if (tila.boksit[edellinen].indexOf(n) >= 0 && tila.boksit[i].indexOf(n) < 0) {
              tila.boksit[edellinen].splice(tila.boksit[edellinen].indexOf(n), 1);
              tila.boksit[i].push(n); otettu.push([i, n]); break;
            }
          }
        });
        tila.tuoreet = null; tila.menetys = null; tila.liike = 'palat';
        tila.siirrot = otettu.map(function (o) { return { a: o[1], mista: (o[0] + 1) % 3, mihin: o[0] }; });
        return uudelleen();
      };
    }
    function tyhjennaBoksi(i) {
      return function () {
        var n = tila.boksit[i].length;
        tila.boksit[i] = []; tila.tuoreet = null;
        tila.siirrot = null; tila.liike = null;
        tila.menetys = {}; tila.menetys[i] = n;
        return uudelleen();
      };
    }

    /* ⚠️ OPASANIMAATIOT: lautapelisivun «Pelin voittaminen» ja «Pelivalmistelut»
       (Marko 16.11.2026: «Nämä voisi myös olla sellaisena animaationa tuossa
       pelilaudan yhteydessä» · «Ja boksinkin kohdalle animaatio boksista, joka
       täyttyy» · «ei selitetä, kun voidaan näyttää»).

       ⚠️ SAMA KONE KUIN APINAKORTEILLA, EI KOLMATTA TAPAA PIIRTÄÄ SAMAA ASIAA.
       Boksi, palat ja niiden kasvatus ovat jo olemassa; vain näkymä ja askeleet
       ovat uusia. Marko huomautti aiemmin samana päivänä, kun esikatselun lauta
       ei ollut sama kuin pelin lauta — kolmas tyyli on oma vikansa.

       ⚠️ PIZZAT LUETAAN PELIN OMASTA PAKASTA (`window.pizzapakka`), ei arvata.
       Pakka on 42 korttia ja `osajoukot()` rajaa sen; oma laskelmani antoi 385.
       Jos `kortit.js` ei ole ladattu, pizzaosuus jää pois eikä mitään keksitä. */
    function pizzaKortit() {
      if (!window.pizzapakka) return null;
      var pakka;
      try { pakka = window.pizzapakka(); } catch (_) { return null; }
      /* ⚠️ JÄRJESTYSNUMERO TALTEEN HETI. Lautapelin korttitiedostot on nimetty
         pakan painetun järjestyksen mukaan (pizzakortti-01 = pakan ensimmäinen),
         ja suodatusten jälkeen alkuperäistä indeksiä ei enää saa takaisin. */
      pakka.forEach(function (k, i) { k.nro = i + 1; });
      var sydan = pakka.filter(function (k) { return k.sydan; })[0];
      if (!sydan) return null;
      /* \u26a0\ufe0f AHNE VALINTA, EI KIINTE\u00c4 KOKO. Ensin vaadin kolmea kolmen
         t\u00e4ytteen pizzaa joiden t\u00e4ytteet eiv\u00e4t mene p\u00e4\u00e4llekk\u00e4in \u2014 ja mittasin
         ettei sellaista joukkoa ole olemassa: pakassa on 42 korttia (10 \u00b7 20 \u00b7
         11 \u00b7 1 t\u00e4ytteen mukaan) ja kolmen t\u00e4ytteen kortteja vain seitsem\u00e4n,
         koska pizzan arvo on t\u00e4ytteiden summa ja enint\u00e4\u00e4n 10. Siksi valitaan
         joka kierroksella se kortti joka tuo eniten UUSIA paloja. */
      var on = {}, valitut = [], vapaat = pakka.filter(function (k) { return !k.sydan; });
      while (valitut.length < 3) {
        var paras = null, eniten = 0;
        vapaat.forEach(function (k) {
          if (valitut.indexOf(k) >= 0) return;
          var uusia = k.taytteet.filter(function (t) { return !on[t]; }).length;
          if (uusia > eniten) { eniten = uusia; paras = k; }
        });
        if (!paras) break;
        paras.taytteet.forEach(function (t) { on[t] = true; });
        valitut.push(paras);
      }
      if (valitut.length < 2) return null;
      return { pizzat: valitut, sydan: sydan };
    }

    /* ⚠️ VALMISTELUT NÄYTETÄÄN KOKO LAUDALLA, EI RENKAASSA. Apinakorttien
       lautanäkymä on rajattu linjaston renkaaseen, mutta valmistelut koskevat
       varastoa ja NELJÄÄ PIZZAKORTTIPAIKKAA, jotka ovat rajauksen ulkopuolella
       laudan vasemmassa laidassa. Rajattu kuva ei voi näyttää niitä.
       Paikat tulevat `ALUEET`ista 900×900 -kuvan koordinaatteina, joten ne
       muuttuvat prosenteiksi jakamalla 9:llä. */
    function pros(v) { return (v / 9).toFixed(2) + '%'; }

    function piirraValmistelut() {
      nayttoEl.className = 'ak__naytto ak__naytto--valmistelut';
      var lava = el('div', 'ak__valmistelulauta');
      lava.innerHTML = '<img src="' + (asetukset.lautakuva || KANSIO + 'pelilauta.webp') +
        '" alt="" class="ak__valmistelukuva">';
      var A = ALUEET || {};
      /* Varasto: täytetornit nauhan sisälle tasavälein. */
      if (tila.vvaihe >= 1 && A.varasto && A.varasto[0]) {
        var v0 = A.varasto[0];   // ['rect', x, y, w, h, r]
        for (var t = 0; t < 10; t++) {
          var torni = el('span', 'ak__vtorni');
          torni.style.left = pros(v0[1] + v0[3] / 2);
          torni.style.top = pros(v0[2] + (t + 0.5) * (v0[4] / 10));
          torni.style.setProperty('--viive', (t * 70) + 'ms');
          lava.appendChild(torni);
        }
      }
      /* Neljä pizzakorttia omille katkoviivapaikoilleen. */
      if (tila.vvaihe >= 2 && A.pizzat) {
        A.pizzat.forEach(function (r, i) {
          var k = el('span', 'ak__vpizza');
          k.style.left = pros(r[1]); k.style.top = pros(r[2]);
          k.style.width = pros(r[3]); k.style.height = pros(r[4]);
          k.style.setProperty('--viive', (i * 160) + 'ms');
          var p = tila.pizzat && tila.pizzat[i];
          var polku = p && (lautakortti('pizzakortti', p.nro) ||
                            (KANSIO + '../' + p.kuva));
          if (polku) k.innerHTML = '<img src="' + polku + '" alt="">';
          lava.appendChild(k);
        });
      }
      nayttoEl.appendChild(lava);

      /* Pakka ja boksit laudan viereen: ne ovat pöydällä, eivät laudalla. */
      var poyta = el('div', 'ak__poyta');
      if (tila.vvaihe >= 3) {
        var pakka = el('span', 'ak__vpakka');
        /* Pakka on pöydällä kuvapuoli alaspäin, joten se on SELKÄPUOLI. */
        pakka.innerHTML = '<img src="' +
          ((LAUTAKORTIT && LAUTAKORTIT + 'selkapuoli-apinakortti.webp') ||
           (KANSIO + 'apinakortti.webp')) + '" alt="">';
        poyta.appendChild(pakka);
      }
      if (tila.vvaihe >= 4) {
        for (var b = 0; b < (asetukset.pelaajia || 3); b++) {
          var bo = el('span', 'ak__vboksi');
          bo.style.setProperty('--viive', (b * 180) + 'ms');
          bo.innerHTML = '<img src="' + KANSIO + 'boksi.webp" alt="">';
          poyta.appendChild(bo);
        }
      }
      if (poyta.children.length) nayttoEl.appendChild(poyta);
    }

    function piirraOpas() {
      nayttoEl.className = 'ak__naytto ak__naytto--opas';
      var rivi = el('div', 'ak__opas');
      var pizza = el('div', 'ak__opaspizza');
      if (tila.pizza) {
        var kuva = lautakortti('pizzakortti', tila.pizza.nro) ||
                   (KANSIO + '../' + tila.pizza.kuva);
        pizza.innerHTML = '<img src="' + kuva + '" alt="">';
        pizza.classList.add('ak__opaspizza--nakyy');
        if (tila.pizza.sydan) pizza.classList.add('ak__opaspizza--sydan');
      }
      rivi.appendChild(pizza);
      var boksi = el('div', 'ak__opasboksi');
      boksi.appendChild(boksiEl(tila.boksit[0], tila.tuoreet && tila.tuoreet[0], 0));
      boksi.appendChild(el('span', 'ak__maara',
        '<b>' + tila.boksit[0].length + '</b><i>/ 10</i>'));
      if (tila.boksit[0].length >= 10) boksi.classList.add('ak__opasboksi--taysi');
      rivi.appendChild(boksi);
      nayttoEl.appendChild(rivi);
    }

    function pizzaEsiin(k) {
      return function () { tila.pizza = k; tila.tuoreet = null; tila.liike = null; return uudelleen(); };
    }
    function pizzaBoksiin(k) {
      return function () {
        tila.pizza = k;
        var uudet = [];
        k.taytteet.forEach(function (t) {
          if (tila.boksit[0].indexOf(t) < 0) { tila.boksit[0].push(t); uudet.push(t); }
        });
        tila.tuoreet = {}; tila.tuoreet[0] = uudet;
        tila.liike = null; tila.menetys = null;
        return uudelleen();
      };
    }

    // ---------------------------------------------------------------- toisto
    function korttiKuva(n) {
      var k = kortit[n] || {};
      if (!KORTTIPAIKKA) { korttiEl.hidden = true; return odota(0); }
      korttiEl.hidden = false;
      korttiEl.classList.remove('ak__kortti--kehote');
      korttiEl.innerHTML = '<span class="ak__nro">Apinakortti ' + n + '</span>' +
        '<b class="ak__korttinimi">' + (k.nimi || '') + '</b>' +
        '<span class="ak__ohje">' + (k.ohje || '') + '</span>';
      if (vahennaLiike || pika) return odota(0);
      return korttiEl.animate([{ transform: 'rotateY(90deg)', opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 420, easing: 'ease-out' }).finished;
    }

    function ohjainPaivita() {
      ohjainEl.hidden = (nykyinen === null && !tila.opas);
      var h = '';
      for (var i = 0; i < askeleet.length; i++)
        h += '<span class="ak__piste' + (i === askel ? ' ak__piste--nyt' : '') + '"></span>';
      pisteetEl.innerHTML = h;
      toistoEl.textContent = looppi ? 'Pysäytä' : 'Toista';
      toistoEl.setAttribute('aria-pressed', looppi ? 'true' : 'false');
      edellinenEl.disabled = looppi || askel <= 0;
      seuraavaEl.disabled = looppi || askel >= askeleet.length - 1;
    }

    /* Palauttaa kortin alkutilan. Askeleet lasketaan vasta tämän jälkeen,
       koska ne lukevat `tila`a: sama kortti antaa aina saman esityksen. */
    function nollaa(n) {
      alkuun();
      if (RYHMA[n] === 'vuoro' && (n === 27 || n === 30)) tila.vaihe = 0;
      tila.nimet = NIMETTOMAT.indexOf(n) < 0;
      if (n in RENGASKORTIT) { tila.rengas = true; tila.suunta = RENGASKORTIT[n]; }
      tila.mittarit = MITTARIT[n] || [];
      askel = -1;
      askeleet = VAIKUTUS[n]();
      /* ⚠️ ASETTELU LUETAAN ENSIMMÄISESTÄ ASKELEESTA ENNEN ENSIMMÄISTÄ PIIRTOA
         (Marko 16.11.2026: «Tässä on edelleen tämä aloitusruutu tällainen, jossa
         on monta pelaajaa»). Kortti 1 ilmoittaa `yksin: 0`, mutta `naytaAskel`
         soveltaa sen vasta askeleen kohdalla — ja `pyori` näyttää alkutilan
         900 ms ENNEN sitä. Katsoja näki siis kolme pelaajaa joka kierroksella,
         vaikka kortti koskee yhtä. Sama vika kuin kehällä: lähtötila ei saa
         syntyä askeleesta, koska alkuruutu piirretään ennen askeleita.
         VAIKUTUS[n]() lukee vain `tila`a, joten sen voi laskea ennen piirtoa. */
      var eka = askeleet[0] || {};
      if ('yksin' in eka) tila.yksin = eka.yksin;
      if ('nuolet' in eka) tila.nuolet = eka.nuolet;
      if ('katse' in eka) tila.katse = eka.katse;
      piirra();
    }

    async function naytaAskel(i, suku) {
      var a = askeleet[i];
      if (!a) return false;
      askel = i;
      seliteEl.textContent = SELITE ? (a.teksti || '') : '';
      ohjainPaivita();
      /* Katse siirretään omana hetkenään ennen tapahtumaa: ensin katsoja
         löytää kohteen, vasta sitten siinä tapahtuu jotain. */
      var asettelu = false;
      if ('yksin' in a && tila.yksin !== a.yksin) { tila.yksin = a.yksin; asettelu = true; }
      if ('nuolet' in a && tila.nuolet !== a.nuolet) { tila.nuolet = a.nuolet; asettelu = true; }
      if ('katse' in a && tila.katse !== a.katse) { tila.katse = a.katse; asettelu = true; }
      if (asettelu) {
        tila.liike = null; piirra();
        await hidas(650);
        if (suku !== ajo) return false;
      }
      await hehku(a.korosta);
      if (suku !== ajo) return false;
      if (a.tee) await a.tee();
      if (suku !== ajo) return false;
      if (a.muutos) await siirra(a.muutos);
      return suku === ajo;
    }

    /* Silmukka: alkutila → askeleet → lopputila jää hetkeksi näkyviin → alusta.
       Tauko askeleiden välissä on tarkoituksella pitkä: Marko 16.11.2026
       «kaikki käy niin nopeasti ja tekstit ehtivät vaihtua, ettei siinä ehdi
       mitään tajuamaan». Toisto korvaa sen, ettei yksi esitys riitä. */
    async function pyori(n, suku) {
      while (suku === ajo && looppi) {
        nollaa(n);
        ohjainPaivita();
        await hidas(900);
        for (var i = 0; i < askeleet.length; i++) {
          if (suku !== ajo || !looppi) return;
          if (!(await naytaAskel(i, suku))) return;
          await hidas(1300);
        }
        if (suku !== ajo || !looppi) return;
        /* ⚠️ TARKENNUS ON KORTIN OMAA TEKSTIÄ, JOTEN SE EI KUULU TÄNNE KUN
           KORTTI ON JO RUUDULLA (Marko 16.11.2026, kortti 5: sama virke luki
           yhtä aikaa Tarkennus-laatikossa JA laudan alla). */
        var k = SELITE ? kortit[n] : null;
        if (k && k.tarkennus) seliteEl.textContent = k.tarkennus;
        await hidas(2600);
      }
    }

    /* Käsiaskellus: tila kelataan alusta pikana askeleeseen i ja vasta se
       esitetään liikkeellä. Näin «Edellinen» näyttää oikean tilan eikä
       peruutettua arvausta — tilaa ei voi perua, mutta sen voi rakentaa. */
    async function askeleeseen(i) {
      if (nykyinen === null && !nykyinenOpas) return;
      var suku = ++ajo;
      looppi = false;
      pika = true;
      if (nykyinenOpas) {
        alkuun();
        askeleet = OPAS[nykyinenOpas]() || [];
        askel = -1;
        piirra();
      } else {
        nollaa(nykyinen);
      }
      for (var j = 0; j < i; j++) {
        await naytaAskel(j, suku);
        if (suku !== ajo) { pika = false; return; }
      }
      pika = false;
      if (suku !== ajo) return;
      await naytaAskel(i, suku);
      if (suku === ajo) ohjainPaivita();
    }

    async function nayta(n) {
      if (!VAIKUTUS[n]) return;
      var suku = ++ajo;
      nykyinen = n;
      looppi = true;
      pika = false;
      seliteEl.textContent = '';
      nollaa(n);
      ohjainPaivita();
      await korttiKuva(n);
      if (suku !== ajo) return;
      await hidas(500);
      if (suku !== ajo) return;
      await pyori(n, suku);
    }

    toistoEl.onclick = function () {
      if (nykyinen === null && !nykyinenOpas) return;
      looppi = !looppi;
      var suku = ++ajo;
      if (looppi && nykyinenOpas) { naytaOpas(nykyinenOpas); ohjainPaivita(); return; }
      if (looppi) pyori(nykyinen, suku);
      else if (askel < 0) askeleeseen(0);
      ohjainPaivita();
    };
    edellinenEl.onclick = function () { askeleeseen(Math.max(0, askel - 1)); };
    seuraavaEl.onclick = function () { askeleeseen(Math.min(askeleet.length - 1, askel + 1)); };

    alkuun();
    nykyinen = null;
    piirra();
    kehote();
    ohjainPaivita();
    /* ⚠️ OPAS ON OMA SISÄÄNKÄYNTINSÄ, EI KORTTI. Apinakortit tulevat
       `VAIKUTUS`-taulukosta numerolla; opasanimaatioilla ei ole numeroa eikä
       korttitekstiä, joten ne eivät saa kulkea samasta ovesta — muuten
       `kortit[n]` ja `RYHMA[n]` alkaisivat tarkoittaa kahta eri asiaa. */
    var OPAS = {
      valmistelut: function () {
        tila.valmistelut = true;
        tila.vvaihe = 0;
        var k = pizzaKortit();
        tila.pizzat = k ? k.pizzat.concat([k.sydan]).slice(0, 4) : null;
        function vvaiheeseen(n) {
          return function () { tila.vvaihe = n; tila.liike = null; return uudelleen(); };
        }
        return [{ tee: vvaiheeseen(0) }, { tee: vvaiheeseen(1) },
                { tee: vvaiheeseen(2) }, { tee: vvaiheeseen(3) }, { tee: vvaiheeseen(4) }];
      },
      voitto: function () {
        var k = pizzaKortit();
        if (!k) return null;
        tila.opas = true;
        tila.boksit[0] = [];
        tila.yksin = 0;
        /* Pizza ilmestyy ja sen palat kasvavat boksiin SAMASSA askeleessa:
           erillinen \u00abkortti n\u00e4kyviin\u00bb -askel oli tauko jossa ei tapahdu mit\u00e4\u00e4n,
           ja sellaiset poistettiin apinakorteista samana p\u00e4iv\u00e4n\u00e4. */
        var askeleet = [{ tee: function () {
          tila.pizza = null; tila.tuoreet = null; tila.liike = null; return uudelleen();
        } }];
        k.pizzat.forEach(function (p) { askeleet.push({ tee: pizzaBoksiin(p) }); });
        /* Syd\u00e4npizzasta saa YHDEN VAPAAVALINTAISEN palan, ei sen t\u00e4ytteit\u00e4. */
        askeleet.push({ tee: function () {
          tila.pizza = k.sydan;
          var puuttuu = null;
          for (var n = 1; n <= 10 && !puuttuu; n++)
            if (tila.boksit[0].indexOf(n) < 0) puuttuu = n;
          if (puuttuu) tila.boksit[0].push(puuttuu);
          tila.tuoreet = {}; tila.tuoreet[0] = puuttuu ? [puuttuu] : [];
          tila.liike = null;
          return uudelleen();
        } });
        /* \u26a0\ufe0f VIIMEINEN ASKEL EI VALEHTELE PELIST\u00c4. Kymmenen eri palaa on koko
           pelin urakka eik\u00e4 nelj\u00e4n pizzan juttu, joten t\u00e4m\u00e4 ei esit\u00e4 ett\u00e4 ne
           tulivat n\u00e4ist\u00e4 korteista: pizza katoaa, ja loput palat kertyv\u00e4t
           t\u00e4yteen boksiin, joka on kortin lupaus \u2014 voitto. */
        askeleet.push({ tee: function () {
          tila.pizza = null;
          var uudet = [];
          for (var n = 1; n <= 10; n++)
            if (tila.boksit[0].indexOf(n) < 0) { tila.boksit[0].push(n); uudet.push(n); }
          tila.tuoreet = {}; tila.tuoreet[0] = uudet;
          tila.liike = null;
          return uudelleen();
        } });
        return askeleet;
      }
    };

    /* ⚠️ OPAS EI OLE KORTTI, JOTEN `nykyinen` (korttinumero) ei kelpaa sen
       muistamiseen. Käsiaskellus (‹ ›) kutsuu `nollaa(nykyinen)`, ja ilman
       tätä se nollasi opasnakymän pois: napit olivat näkyvissä mutta eivät
       tehneet mitään (mitattu selaimessa — kolme napautusta, tyhjä lauta). */
    var nykyinenOpas = null;

    async function naytaOpas(nimi) {
      if (!OPAS[nimi]) return;
      var suku = ++ajo;
      nykyinen = null;
      nykyinenOpas = nimi;
      looppi = true;
      pika = false;
      seliteEl.textContent = '';
      alkuun();
      askeleet = OPAS[nimi]() || [];
      if (!askeleet.length) return;
      askel = -1;
      piirra();
      ohjainPaivita();
      while (suku === ajo && looppi) {
        var alku = OPAS[nimi]();
        if (!alku) return;
        askeleet = alku;
        askel = -1;
        piirra();
        await hidas(900);
        for (var i = 0; i < askeleet.length; i++) {
          if (suku !== ajo || !looppi) return;
          if (!(await naytaAskel(i, suku))) return;
          await hidas(1100);
        }
        if (suku !== ajo || !looppi) return;
        await hidas(2400);
      }
    }

    return {
      nayta: nayta,
      opas: naytaOpas,
      alkuun: function () {
        ajo++; nykyinen = null; nykyinenOpas = null; askeleet = []; askel = -1; looppi = true;
        alkuun(); piirra(); kehote(); seliteEl.textContent = ''; ohjainPaivita();
      },
      ryhma: function (n) { return RYHMA[n]; },
      /* Silmukka ei ole este uudelle kortille — `ajo` keskeyttää vanhan —
         joten tämä kertoo vain, pyöriikö esitys juuri nyt. */
      kaynnissa: function () { return looppi && nykyinen !== null; }
    };
  };
})();