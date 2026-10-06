/* Pizza Love — #1 Pizza Party selaimessa.
 *
 * Säännöt: Peli/PIZZA LOVE/Love korttipeli/Ohjeet/
 *          PIZZA LOVE_säännöt_kääntäjälle_16.9.2025.docx
 *
 * Pöydässä Pizza Party on kilpajuoksu ilman vuoroja: nopein joka valmistaa
 * pizzan saa kortin. Selaimessa vastavoima on Apina, jolla on NÄKYMÄTÖN
 * aika (Markon päätös 8.9.2026). Aikaa ei näytetä millään mittarilla.
 *
 * ⚠️ VUORO ON KOLMIVAIHEINEN, JA SE ON PÖYDÄN JÄRJESTYS (Marko 8.9.2026):
 *
 *      1. valinta     pelaaja laskee päässään ja aktivoi kortit kädestään
 *      2. pelaaminen  pelaaja lyö kortit pizzan päälle  ← tässä hän ehti
 *      3. selitys     pelaaja kertoo muille miten laski
 *
 * Siitä seuraa se mikä tekee pelistä reilun: APINAN AIKA PYSÄHTYY VAIHEESSA 2.
 * Kilpajuoksu koskee sen näkemistä että lasku on olemassa, ei sen
 * selittämistä — pöydässäkin kortit lyödään ensin ja perustellaan sitten.
 * Jos pelaaja ottaa korttinsa takaisin, apina jatkaa juoksuaan.
 */

/* ⚠️ Aika on näkymätön, mutta sen PITUUS ei ole salaisuus — pelaaja valitsee
 * sen itse. Neljä tasoa: Markon luvut 8.9.2026.
 * Harjoittelu (ei aikaa) on työparin lisäys, ei Markon: ensikertalainen joka
 * häviää ennen kuin ymmärtää mekaniikan ei opi siitä mitään, ja muistion
 * mukaan tämän linkin tehtävä on OPETTAA. Poistettavissa yhdellä rivillä. */
/* ⚠️ APINAN VAIKEUSTASO ON KERROIN, EI SEKUNTIMÄÄRÄ (Marko 8.9.2026).
 *
 *      apinan aika = pelaajan miettimisaikojen MEDIAANI × kerroin
 *
 * Kiinteä sekunti on väärä kaikille: 6 s on ikuisuus aikuiselle ja hetki
 * kuusivuotiaalle. Kerroin sen sijaan tarkoittaa jokaiselle samaa —
 * *"apina on yhtä nopea kuin sinä"* on sama lupaus riippumatta siitä kuka
 * pelaa.
 *
 * ⚠️ Ja se on mitattu, ei arvattu. Sekuntilisä ei ole taitoneutraali, koska
 * taitoerot ovat suhteellisia: simuloituna `+2 s` antoi nopealle pelaajalle
 * 89 % ja hitaalle 69 % (hajonta 20 pistettä), kun `× 1,6` antoi 89 % ja
 * 86 % (hajonta 3). Kertoimen koko idea on poistaa juuri se ero.
 *
 * Kertoimet on valittu tavoitevoittoprosentin mukaan, 5 000 simuloitua
 * kierrosta kutakin (nopea 3 s · tavallinen 5 s · hidas 9 s mediaani). */
/* ⚠️ Nimi ja kuvaus EIVAT ole taalla vaan kielet.js:ssa (avaimet
 * `taso.<avain>` ja `taso.<avain>.k`). Koodissa on vain se mika ohjaa
 * peli: kerroin. Nain uuden kielen lisaaminen ei kosketa tata tiedostoa. */
const TASOT = [
  { avain: 'harjoittelu', kerroin: null },
  { avain: 'uninen',      kerroin: 1.8 },
  { avain: 'nalkainen',   kerroin: 1.3 },
  { avain: 'nopea',       kerroin: 1.0 },
  { avain: 'ahne',        kerroin: 0.8 },
];

/* ⚠️ Kun apina voittaa, EMME tiedä pelaajan aikaa — tiedämme vain että se oli
 * apinan aikaa PIDEMPI. Apinan ajan kirjaaminen sellaisenaan aliarvioisi
 * pelaajaa systemaattisesti, ja koska häviöt ovat pelaajan hitaita pizzoja,
 * tyypillinen aika painuisi kohti hänen nopeimpia suorituksiaan. Simuloitu: apina
 * karkaisi ja pelaaja voittaisi 24 % siellä missä pitäisi olla ~50 %.
 *
 * Siksi häviö kirjataan arviona `apinan aika × HAVIOKERROIN`. Marko hyväksyi
 * arvon 1,4 arvauksena, ja se on säädettävä luku eikä totuus — oikea muoto
 * olisi katkaistun jakauman odotusarvo, joka vaatisi oletuksen jakaumasta.
 *
 * ⚠️ JA TÄSTÄ SEURAA VAIKEUSTASON ALARAJA, joka on johdettavissa:
 * vakaus vaatii että häviö vetää tyypillistä aikaa YLÖS, eli
 *
 *      kerroin × HAVIOKERROIN > 1   →   kerroin > 1 / 1,4 = 0,714
 *
 * Sen alapuolella silmukka karkaa alaspäin eikä se ole vaikeusaste vaan
 * rikkinäinen malli: mitattuna kerroin 0,65 antoi 8 % ja 0,55 antoi 3 %.
 * Ahne apina on 0,8 — turvavälin päässä rajasta. */
const HAVIOKERROIN = 1.4;

/* ⚠️ Mutta arviota on myös RAJATTAVA, ja se löytyi vasta ajamalla.
 * Häviö kirjataan apinan ajasta, ja helpolla tasolla apinan aika on jo
 * valmiiksi väljä: `1,6 × 1,4 = 2,24`, eli jokainen häviö väittäisi pelaajan
 * käyttäneen yli kaksinkertaisen ajan omaan tahtiinsa nähden. Mitattu:
 * Uninen apina ajautui **16 sekuntiin** kolmen sekunnin pelaajalla.
 *
 * Siksi kirjattava arvio katkaistaan kahteen kertaan pelaajan omaa
 * tyypillistä aikaa. Vakaus säilyy (2 > 1), mutta ajautuminen loppuu. */
const HAVIOKATTO = 2;

/* Absoluuttinen katto on järjettömyyden esto, ei suunnittelunuppi. ⚠️ 14 s
 * oli liian matala: hitaalla pelaajalla (mediaani 9 s) se leikkasi Unisen
 * apinan 89 %:sta 81 %:iin, eli katto muutti vaikeustasoa. 20 s on pitkä vain
 * absoluuttisesti — pelaajalle joka itse käyttää yhdeksän sekuntia se on
 * kaksinkertainen oma tahti. */
const AIKAKATTO = 20000;

/* Ensimmäiselle pizzalle ei ole vielä mitään mitattua. */
const ALOITUSAIKA = 5000;

/* Ettei apina karkaa nollaan hyvin nopealla pelaajalla. */
const AIKALATTIA = 800;

const KADEN_KOKO = 5;

/* ============================================================
 * MONINPELI — 2-4 PELAAJAA SAMALLA LAITTEELLA
 *
 * Markon maarittely 9.9.2026 sanatarkasti: "jokaisella pelaajalla on oma
 * apina — — Yksi yhteinen pizzakortti ja viisi yhteista taytekorttia. Se
 * joka ensimmaisena loytaa sopivan yhdistelman taytekorteista, painaa omaa
 * nappiaan, jolloin han varaa vastausvuoron. Vastauksen antamiseen on vain
 * esim. 5 sekuntia, jolloin ei voi tehda niin, etta varaa sen ja vasta
 * sitten miettii."
 *
 * ⚠️ TULKINTA JOKA ON KIRJATTAVA, koska se ei ole maarittelyssa: viisi
 * sekuntia koskee KORTTIEN VALINTAA, ei koko laskun rakentamista. Perustelu
 * on mitattava: kolmen kortin lausekkeessa on kaksi merkkia ja mahdolliset
 * sulkeet, eika sita ehdi rakentaa viidessa sekunnissa — silloin moninpeli
 * olisi mahdoton eika nopea. Ja se osa jota vastaan saanto on suunnattu on
 * nimenomaan valinta: "varaa ja vasta sitten miettii" tarkoittaa korttien
 * etsimista varauksen jalkeen. Kun kortit on lyoty pizzalle, ne ovat
 * sitovat — vaarasta valinnasta seuraa ulosjaanti.
 *
 * ⚠️ Aika luetaan CSS:sta (--vastausaika), koska kello piirretaan siella.
 * Kaksi lukua ajautuisi erilleen, ja silloin nakyva kello nayttaisi eri
 * aikaa kuin se jota mitataan.
 *
 * Varit ovat pelin omia korttivareja (BRAND.md): punainen, sininen,
 * vihrea, violetti. Brandioranssi EI ole mukana — se on pizzan vari, ja
 * pelaajan vari joka on sama kuin pizzan olisi juuri se sekaannus jota
 * varilla yritetaan valttaa.
 * ============================================================ */
const PELAAJAVARIT = ['#E62448', '#1072B9', '#16A74F', '#824292'];

function cssAika(nimi, oletus) {
  const s = getComputedStyle(document.documentElement)
    .getPropertyValue(nimi).trim();
  const n = parseFloat(s) || oletus;
  return /ms$/.test(s) ? n : n * 1000;
}
function valintaAika() { return cssAika('--valinta-aika', AIKA_OLETUS.valinta); }
function lausekeAika() { return cssAika('--lauseke-aika', AIKA_OLETUS.lauseke); }

/* ⚠️ AIKARAJAT OVAT PELAAJAN SAADETTAVISSA (Marko 9.9.2026: "ettei tarvitse
 * aina koodailla erikseen"). Oikeaa arvoa ei voi paatella — se loydetaan
 * pelaamalla, ja siksi se kuuluu asetuksiin eika koodiin.
 *
 * ⚠️ ARVO KIRJOITETAAN CSS-MUUTTUJAAN, EI JS-MUUTTUJAAN. Kello piirretaan
 * CSS:sta ja mittaus luetaan CSS:sta, joten yksi kirjoituspaikka pitaa ne
 * yhdessa. Jos saato elaisi JS-muuttujassa, nakyva kello ja mitattu aika
 * voisivat ajautua erilleen — ja silloin pelaaja pelaisi eri peliä kuin
 * ruutu nayttaa. */
/* ⚠️ OLETUS LUETAAN CSS:STA, EI KIRJOITETA TAHAN. Kirjoitin sen ensin
 * molempiin (`4000` taalla ja `--valinta-aika: 4000ms` siella), ja se on
 * taman projektin toistuvin vikaluokka: Marko saataisi CSS:n arvoa, ja
 * "Palauta oletukset" palauttaisi hiljaa jotain muuta. Nama luvut ovat
 * vain viimeinen varakeino sille tapaukselle jossa tyylitiedostoa ei ole
 * ladattu lainkaan — ja silloin peli on rikki muutenkin. */
const AIKA_OLETUS = { valinta: 4000, lauseke: 6000 };
function lueAikaOletukset() {
  AIKA_OLETUS.valinta = cssAika('--valinta-aika', AIKA_OLETUS.valinta);
  AIKA_OLETUS.lauseke = cssAika('--lauseke-aika', AIKA_OLETUS.lauseke);
}
const AIKA_RAJAT  = { alin: 2000, ylin: 15000, askel: 1000 };
const AIKA_MUUTTUJA = { valinta: '--valinta-aika', lauseke: '--lauseke-aika' };

function haeAika(mika) {
  return mika === 'valinta' ? valintaAika() : lausekeAika();
}

function asetaAika(mika, ms) {
  const arvo = Math.min(AIKA_RAJAT.ylin, Math.max(AIKA_RAJAT.alin, ms));
  document.documentElement.style.setProperty(AIKA_MUUTTUJA[mika], arvo + 'ms');
  return arvo;
}

function aikaTekstina(ms) { return t('aika.sekuntia', { n: Math.round(ms / 1000) }); }

const tila = {
  pizzat: [], taytteet: [], poistetut: [],
  kasi: [], apinanKasi: [],
  poydassa: [],           // pizzat pöydällä, viimeinen on päällimmäinen
  pizza: null,            // = poydassa[viimeinen], mukavuusviittaus
  apinanRatkaisu: null,   // apinan löytämä lasku tälle pizzalle, tai null

  vaihe: 'valinta',       // 'valinta' → kortit kädestä | 'selitys' → merkit väliin
  valitut: [],            // pelatut täytekortit napautusjärjestyksessä
  merkit: [],             // valitut.length − 1 kpl: operaattori tai null
  aukko: 0,               // mihin väliin seuraava merkki menee
  ryhmat: [],             // sulkeet: {alku, loppu} korttien indekseinä
  ryhmitysKesken: null,   // null | {} | {alku} — sulkuja asetetaan parhaillaan
  siirrettava: null,      // pelatun arvon indeksi jota ollaan vaihtamassa

  omatPisteet: 0, apinanPisteet: 0,
  omiaPizzoja: 0, apinanPizzoja: 0,
  taso: TASOT[1],
  pelaajia: 1,            // 1 = yksin apinaa vastaan; 2-4 = moninpeli
  moninpeli: false,       // johdettu: pelaajia >= 2
  pisteet: [],            // pelaajakohtaiset pisteet moninpelissa
  pizzoja: [],            // pelaajakohtaiset pizzat moninpelissa
  vuorossa: null,         // kuka varasi vastausvuoron (indeksi) tai null
  lukitut: [],            // ketka ovat jo yrittaneet TATA pizzaa
  vastausAjastin: null,   // vuoron maaraaika (valinta tai lauseke)
  vastausAlkoi: 0,        // milloin nykyinen maaraaika alkoi
  tauko: null,            // {alkoi, apinaJaljella} kun peli on tauolla
  apinanTapa: false,      // Vaikeampi tapa
  verkko: null,           // yhteispeli omalla laitteella (pelaaja.js); muuten null
  /* ⚠️ Sallitut laskutoimitukset (Markon linjaus 8.9.2026): peli skaalataan
   * pelaajan tasolle. Yhteen- ja vähennyslasku ovat aina mukana — ilman
   * kumpaakaan monikorttista pizzaa ei voisi tehdä lainkaan, ja sääntövihkon
   * oma valinnainen sääntö on tasan tämä: "pelataan vain yhteen- ja
   * vähennyslaskuilla".
   * Oletus: × ÷ ja sulkeet päällä, potenssi ja logaritmi pois. Ne ovat
   * sallittuja mutta harvinaisia, ja tämän linkin tehtävä on opettaa
   * mekaniikka kahdessa minuutissa. */
  sallitut: { kerto: true, jako: true, potenssi: false, log: false, sulut: true },
  ajat: [],               // pelaajan miettimisajat ms, myös häviöistä arvioituna
  paljastettu: 0,         // milloin nykyinen pizza käännettiin esiin
  pelaajanAika: null,     // paljastuksesta pizzan painallukseen, ms
  ajastin: null,          // apinan näkymätön aika
  siirtymaAjastin: null,  // ratkaisun ja seuraavan pizzan välinen tauko
  kaynnissa: false,
  keskeytetty: false,
  paattymisSyy: null,     // 'pizzat' | 'taytteet' | 'umpikuja' | 'keskeytys'
  lukossa: false,
};

/* Pelatut kortit, niiden väliin asetetut merkit ja ryhmien sulkeet yhdeksi
 * tokenilistaksi. Sisäkkäiset ryhmät: pisin aukeaa ensin ja sulkeutuu viimeisenä.
 *
 * ⚠️ YKSI SÄÄNTÖ MOLEMMILLE PELIMUODOILLE (11.9.2026). Tokenien rakennus ja
 * sulkeiden kelpoisuus ovat kierros.js:ssä, ja yhteispelin tarkistus käyttää
 * samaa. Kahtena kopiona sama lauseke voisi kelvata toisessa pelimuodossa ja
 * olla mahdoton toisessa — ja niin sulkeiden kanssa kävikin (ks. ryhmaKelpaa). */
function tokenit() {
  return kierrosTokenit(tila.valitut.map(function (k) { return k.arvo; }), tila.merkit, tila.ryhmat);
}

/* ⚠️ Ryhmät eivät saa mennä osittain päällekkäin: `((1+2)×3)` on kelvollinen,
 * `(1+(2)×3)`-tyyppinen limitys ei ole lauseke lainkaan. Tarkistetaan
 * lisäyshetkellä, koska jäsennin hylkäisi sen vasta vaiteliaana nollana. */
/* ⚠️ ERILLISET SULUT SALLITTU 11.9.2026 (Marko: «salli erilliset sulut
 * molemmissa»). Tähän asti jokaisen ryhmän piti olla sisäkkäin jokaisen
 * kanssa, joten `(1 + 2) × (3 + 4)` oli mahdoton rakentaa — mitattu:
 * ryhmaKelpaa(2, 3) → false kun (0, 1) oli jo asetettu. Yhteispelin
 * tarkistus hyväksyi saman lausekkeen.
 *
 * Ratkojaa ei tarvinnut muuttaa: se kokeilee yhtä sulkuparia, mutta
 * mitattu 1 200 satunnaisesta kädestä täydellinen haku (kaikki sulutukset)
 * ei löytänyt yhtään ratkaisua jota ratkoja ei löytänyt. Päättymissääntö
 * ja apina eivät siis muutu. */
function ryhmaKelpaa(alku, loppu) {
  return kierrosRyhmatKelpaavat(tila.ryhmat.concat([{ alku: alku, loppu: loppu }]), tila.valitut.length);
}

function kaikkiMerkitPaikallaan() {
  return tila.merkit.every(function (m) { return !!m; });
}

/* Montako ERI arvoa pelatuissa korteissa on. Fantasiakortti lasketaan sillä
 * arvolla jonka pelaaja sille antoi, joten X:nä pelattu 2 ja oikea 2 ovat
 * sama täyte. */
function eriArvojaValituissa() {
  const nahdyt = {};
  tila.valitut.forEach(function (k) {
    if (typeof k.arvo === 'number') nahdyt[k.arvo] = true;
  });
  return Object.keys(nahdyt).length;
}

/* Fantasiakortti on lauseke vasta kun sillä on arvo. */
function kaikkiArvotValittu() {
  return tila.valitut.every(function (k) { return typeof k.arvo === 'number'; });
}

function lausekeValmis() {
  return kaikkiMerkitPaikallaan() && kaikkiArvotValittu();
}

/* ---------- pelin kulku ---------- */

/* Mihin lupaan mikäkin painike kuuluu. '+' ja '−' eivät ole listalla, koska
 * ne ovat aina sallittuja. */
const LUPA_OPERAATTORILLE = { '×': 'kerto', '÷': 'jako', '^': 'potenssi', 'log': 'log' };

function sallittu(op) {
  const lupa = LUPA_OPERAATTORILLE[op];
  return !lupa || !!tila.sallitut[lupa];
}

function aloitaPeli(taso, apinanTapa) {
  /* ⚠️ Kesken jäänyt peli jättää jälkeensä kaksi ajastinta, ja `tila` on yksi
   * ainoa olio — ilman tätä vanhan pelin apina ehtii uuden pelin pizzaan.
   * Mitattu 8.9.2026: apina sai 2 pistettä arvon 7 pizzasta. */
  pysaytaKaikkiAjastimet();
  tila.taso = taso;
  tila.apinanTapa = !!apinanTapa;
  tila.pizzat = sekoita(pizzapakka());
  tila.taytteet = sekoita(taytepakka());
  tila.poistetut = [];
  /* ⚠️ Kädet jaetaan MOLEMMILLE: 58 − 5 − 5 = 48 korttia jää pakkaan
   * (Marko 8.9.2026). Apina on pelaaja eikä ajastin — sillä on omat korttinsa
   * ja se ottaa vain sen pizzan jonka se niillä osaa tehdä. */
  tila.kasi = tila.taytteet.splice(0, KADEN_KOKO);
  /* ⚠️ Harjoittelussa apina ei pelaa, joten se ei myöskään saa kortteja.
   * Mitattu 8.9.2026: käsi jonka omistaja ei koskaan pelaa piti kierrosta
   * keinotekoisesti hengissä — «kukaan ei voi enää tehdä» ei toteutunut,
   * koska haamukädestä olisi periaatteessa voinut tehdä. */
  /* ⚠️ MONINPELISSA APINAA EI OLE VASTUSTAJANA — pelaajat ovat apinoita.
   * Se ei ole tyylivalinta vaan sama mitattu syy kuin harjoittelussa: kasi
   * jonka omistaja ei koskaan pelaa pitaisi kierrosta keinotekoisesti
   * hengissa, koska «kukaan ei voi enaa tehda» ei toteutuisi. */
  tila.moninpeli = tila.pelaajia >= 2;
  /* Milla pelaajamaaralla TAMA peli jaettiin. Ks. suljeAsetukset. */
  tila.pelaajiaKaynnissa = tila.pelaajia;
  tila.apinanKasi = (!tila.moninpeli && tila.taso.kerroin)
    ? tila.taytteet.splice(0, KADEN_KOKO) : [];
  tila.pisteet = [];
  tila.pizzoja = [];
  for (let i = 0; i < tila.pelaajia; i++) { tila.pisteet.push(0); tila.pizzoja.push(0); }
  tila.vuorossa = null;
  tila.lukitut = [];
  tila.tauko = null;
  const taukoPeite = document.getElementById('taukoPeite');
  if (taukoPeite) taukoPeite.hidden = true;
  document.getElementById('peliRuutu').classList.toggle('moninpeli', tila.moninpeli);
  tila.poydassa = [];
  tila.omatPisteet = 0; tila.apinanPisteet = 0;
  tila.omiaPizzoja = 0; tila.apinanPizzoja = 0;
  tila.ajat = [];
  tila.kaynnissa = true;
  tila.keskeytetty = false;
  /* ⚠️ LEPOTILA (Markon linjaus 9.9.2026): peli ei ala napista vaan
   * korteista. Kaikki on jaettu ja paikoillaan, mutta selkapuoli
   * ylospain — yksi oranssi ja viisi mustaa. Kierros kaynnistyy vasta
   * kun molemmat on kaannetty, koska ajanotto alkaa siita hetkesta
   * jolloin pelaaja NAKEE seka pizzan etta katensa. */
  tila.vaihe = 'lepo';
  tila.kaannetty = { pizza: false, kasi: false };
  tila.lukossa = false;
  tila.poydassa = [tila.pizzat.pop()];
  tila.pizza = tila.poydassa[0];
  tila.ohitettu = false;
  naytaRuutu('peliRuutu');
  piirraKaikki();
  piirraPisteet();
}

/* Kortin kaanto: kutistus reunalle, kuvan vaihto piilossa, aukeaminen.
 * Kesto on CSS:ssa (--kaanto), ja puolivali luetaan siita — jos aika
 * muuttuu, se muuttuu yhdesta paikasta. */
function kaannaKortit(mika, verkosta) {
  /* ⚠️ YHTEISPELISSÄ KORTTEJA EI KÄÄNNETÄ NAPAUTTAMALLA. Ne paljastetaan
   * palvelimen kellon hetkellä T0 kaikilla laitteilla yhtä aikaa
   * (pelaaja.js, MULTIPLAYER.md 8.2) — muuten nopea napauttaja näkisi
   * kortit ennen lähtöä. */
  if (tila.verkko && !verkosta) return;
  if (tila.vaihe !== 'lepo' || tila.kaannetty[mika]) return;
  const kesto = parseFloat(getComputedStyle(document.documentElement)
    .getPropertyValue('--kaanto')) || 340;
  const pizza = [document.getElementById('pizzaKortti')];
  const kasi = [].slice.call(document.querySelectorAll('#kasi .tayte-kortti'));
  /* 'molemmat' kääntää yhdellä kertaa. Kaksi erillistä kääntöä piirtäisivät
   * toistensa animaation yli: pizzan käännön piirto loisi käden uudelleen
   * kesken sen oman käännön. */
  const kohteet = mika === 'pizza' ? pizza : mika === 'kasi' ? kasi : pizza.concat(kasi);
  kohteet.forEach(function (el, i) { el.style.animationDelay = (i * 45) + 'ms'; });
  kohteet.forEach(function (el) { el.classList.add('kaantyy'); });
  const viive = kesto / 2 + (mika === 'pizza' ? 0 : 45 * (kohteet.length - 1));
  setTimeout(function () {
    if (mika === 'molemmat') { tila.kaannetty.pizza = true; tila.kaannetty.kasi = true; }
    else tila.kaannetty[mika] = true;
    piirraKaikki();
    if (tila.kaannetty.pizza && tila.kaannetty.kasi) aloitaKierros();
  }, viive);
}

/* Kierros alkaa vasta kun molemmat puolet on kaannetty. */
function aloitaKierros() {
  tila.vaihe = 'valinta';
  tila.paljastettu = Date.now();
  tila.pelaajanAika = null;
  mietiApina();
  piirraKaikki();
  piirraPisteet();
  kaynnistaApina();
}

function seuraavaPizza() {
  pysaytaApina();
  tila.lukossa = false;
  tila.poydassa = [];
  kaannaPizzaPoytaan();
}

/* Uusi pizza pöydälle. Jos pöydässä on jo pizzoja, tämä tulee niiden päälle
 * ja koko pino menee sille joka seuraavaksi onnistuu (Marko 8.9.2026). */
function kaannaPizzaPoytaan() {
  nollaaValinta();
  tila.ohitettu = false;
  /* Uusi pizza = uusi kilpajuoksu: kaikki paasevat taas mukaan. */
  pysaytaVastausAika();
  tila.vuorossa = null;
  tila.lukitut = [];
  if (!tila.pizzat.length) return lopetaKierros('pizzat');
  /* ⚠️ Markon päättymissääntö 8.9.2026 sanatarkasti: «peli päättyy, kun
   * täytekortit loppuvat eikä kukaan pelaajista pysty enää tekemään pizzoja
   * kädestään löytyvillä täytteillä.»
   *
   * Molemmat ehdot ovat tarpeen. Pelkkä pakan tyhjeneminen ei riitä — kädessä
   * voi olla pelattavaa. Ja pelkkä «tätä pizzaa ei voi tehdä» ei riitä, koska
   * jokin toinen pizza voi olla tehtävissä. Mitattu 8.9.2026 ilman tätä:
   * kierroksen häntä oli 27 peräkkäistä ohitusta, koska peli jatkui
   * pizzapakan loppuun vaikka kukaan ei enää voinut tehdä mitään. */
  tila.poydassa.push(tila.pizzat.pop());
  tila.pizza = tila.poydassa[tila.poydassa.length - 1];
  /* ⚠️ Tarkistus on VASTA tässä, uuden pizzan kääntämisen JÄLKEEN. Ennen se
   * oli edellä, jolloin onnistuneen pizzan jälkeen pöytä oli hetken tyhjä ja
   * peli olisi päättynyt vaikka seuraava pizza olisi ollut tehtävissä. */
  if (!tila.taytteet.length && !kukaanVoiTehdaPoydan()) return lopetaKierros('taytteet');
  tila.paljastettu = Date.now();
  tila.pelaajanAika = null;
  mietiApina();
  piirraKaikki();
  piirraPisteet();
  kaynnistaApina();
}

/* Onko PÖYDÄLLÄ oleva pizza kummankaan kädestä tehtävissä?
 * ⚠️ Kysytään vain kun täytepakka on tyhjä: silloin kädet eivät enää muutu,
 * joten vastaus on pysyvä. Täydellä pakalla tämä olisi sekä turha että
 * väärin — nostettu kortti voi muuttaa kaiken.
 *
 * ⚠️ KATSOO VAIN PÖYTÄÄ, EI PAKKAA (Markon täsmennys 8.9.2026):
 * «Jos pöydällä on pizza, jota kukaan pelaaja ei pysty valmistamaan, niin
 * sitten peli päättyy. Pöydälle ei lopussa kasata viittä tai kuutta pizzaa,
 * kunnes joku onnekas ne saa itselleen.»
 *
 * Aiempi versio etsi ratkaisua myös pakan pizzoista, ja juuri se tuotti sen
 * kasan: peli jatkoi kääntämistä kunnes jokin TULEVA pizza sattui olemaan
 * tehtävissä, ja sillä välin pöytä täyttyi. */
function kukaanVoiTehdaPoydan() {
  const p = tila.poydassa[tila.poydassa.length - 1];
  if (!p) return false;
  const tarveN = tila.apinanTapa ? p.tayteMaara : null;
  const a = etsiRatkaisu(tila.kasi, p.arvo, tila.sallitut, tarveN);
  if (a && (a.kortit || a.katkesi)) return true;
  const b = etsiRatkaisu(tila.apinanKasi, p.arvo, tila.sallitut, tarveN);
  return !!(b && (b.kortit || b.katkesi));
}

/* Pöydässä olevien pizzojen yhteispisteet — se mistä nyt pelataan. */
function poydanPisteet() {
  return tila.poydassa.reduce(function (a, p) { return a + p.pisteet; }, 0);
}

/* ⚠️ Apina päättää ENNEN kelloaan, osaako se tämän pizzan. Jos ei osaa, kello
 * ei käy lainkaan — pöydässäkään kukaan ei kiirehdi jos kenelläkään ei ole
 * ratkaisua, ja pelaaja saa miettiä rauhassa. */
/* Olisiko pelaajan kädestä voinut tehdä päällimmäisen pizzan?
 * ⚠️ Kysytään VAIN silloin kun pelaaja on itse painanut nappia — ei koskaan
 * kesken miettimisen, koska se olisi vastauksen kertomista etukäteen.
 * Vastaus ratkaisee, kirjataanko luovutus pelaajan ajaksi (ks. enOsaa). */
function pelaajallaRatkaisu() {
  const tarveN = tila.apinanTapa ? tila.pizza.tayteMaara : null;
  const r = etsiRatkaisu(tila.kasi, tila.pizza.arvo, tila.sallitut, tarveN);
  /* Jos haku katkesi haarakattoon, emme tiedä — ja «en tiedä» käsitellään
   * kuin ratkaisu olisi ollut, jotta aika tulee kirjatuksi. Varovaisempi
   * suunta: mieluummin kirjaa turhaan kuin jätä kirjaamatta ja vinouta. */
  return !!(r && (r.kortit || r.katkesi));
}

function mietiApina() {
  if (tila.moninpeli) return void (tila.apinanRatkaisu = null);
  const tarveN = tila.apinanTapa ? tila.pizza.tayteMaara : null;
  const r = etsiRatkaisu(tila.apinanKasi, tila.pizza.arvo, tila.sallitut, tarveN);
  tila.apinanRatkaisu = (r && r.kortit) ? r : null;
}

/* ⚠️ NAPIN NIMI ON «Näillä korteilla ei onnistu», EI «En osaa».
 * Markon linjaus 8.9.2026: *"«En osaa» leimaa pelaajan. — — Se tarkoittaa
 * joissain tapauksissa juuri sitä, että pelaaja ei osaa, mutta on pelaajalle
 * mukavampi myöntää. Syy on tavallaan korteissa."*
 * Sama koskee valahdystekstiä: ei «kukaan ei osaa» vaan «ei onnistu».
 * Sana on «korteilla» eikä «täytteillä», koska mekaniikka puhuu arvoista ja
 * täyte on tarinaa — ks. luku 4 sanastosta.
 *
 * Sääntövihko: jos KUKAAN ei pysty tai halua,
 * pizza ei mene kenellekään vaan uusi käännetään sen päälle — ja Markon
 * täsmennys 8.9.2026: seuraava valmistaja saa ne kaikki. */
function enOsaa() {
  if (!tila.kaynnissa || tila.lukossa || !tila.pizza) return;
  /* Yhteispelissä ohitus on vastaus: se lähtee palvelimelle (pelaaja.js). */
  if (tila.verkko) return verkkoOhita();
  /* ⚠️ MONINPELISSA «en pysty» koskee VAIN OMAA VUOROA, ei koko pizzaa.
   * Muut eivat ole viela sanoneet mitaan, joten pizzaa ei saa siirtaa
   * eteenpain — se olisi yhden pelaajan paatos kaikkien puolesta. */
  if (tila.moninpeli) {
    if (tila.vuorossa === null) return;
    tila.ohitettu = true;
    piirraPizza();
    pysaytaVastausAika();
    return vuoroUmpeutui();
  }
  pysaytaApina();

  /* ⚠️ Ruksi ENNEN apinahaaraa, koska se on kuittaus PELAAJAN
   * painallukselle eika lopputulokselle. Jos se olisi vasta alempana,
   * se jaisi nakymatta aina kun apina ehtii ottaa pizzan — eli juuri
   * niissa tilanteissa joissa pelaaja tarvitsee vahvistuksen siita etta
   * hanen ilmoituksensa meni perille. Nollataan seuraavassa kaannossa. */
  tila.ohitettu = true;
  piirraPizza();

  /* ⚠️ MITATTU 8.9.2026: luovutusta ei saa kirjata ajaksi, JOS kädessä ei
   * ollut ratkaisua. Markon ehdotus, ja simulaatio vahvisti sen —
   * mutta vain ehdollisena:
   *
   *   luovutus aidosti mahdottomasta   kirjaamatta  → apina 3,1 s (oikein 3,0)
   *                                    kirjaten     → apina 3,6 s (liian hidas)
   *   luovutus ratkeavasta             kirjaamatta  → apina 2,6 s (liian nopea)
   *                                    ehdollisesti → apina 3,1 s (oikein)
   *
   * Eli ehdoton «ei kirjata koskaan» siirtää vian toiseen suuntaan: pelaaja
   * joka luovuttaa hitaista mutta ratkeavista pizzoista näyttäisi nopeammalta
   * kuin on. Peli osaa erottaa nämä, koska ratkoja on olemassa. */
  const oliRatkaisu = pelaajallaRatkaisu();

  /* Harjoittelussa apina ei ota pizzoja lainkaan — sillä ei ole kelloa, eikä
   * luovutus saa siirtää pizzaa sille joka ei kilpaile. */
  if (tila.taso.kerroin && tila.apinanRatkaisu) return apinaEhti(oliRatkaisu);
  tila.lukossa = true;
  if (oliRatkaisu) kirjaaHavio();
  valahda('ei-kukaan', '<span class="valahdys-merkki">⊘</span>');
  tila.siirtymaAjastin = setTimeout(function () {
    tila.siirtymaAjastin = null;
    tila.lukossa = false;
    kaannaPizzaPoytaan();
  }, 900);
}

/* Apinan aika TÄHÄN pizzaan: pelaajan tähänastisten aikojen mediaani
 * kerrottuna tason kertoimella. Ensimmäisellä pizzalla ei ole mitattua. */
/* ⚠️ MEDIAANI, EI KESKIARVO — ja se on korjaus mitattuun ajautumiseen.
 *
 * Markon malli puhui keskiarvosta, ja se toimi kunnes ajoin sen läpi:
 * Uninen apina (× 1,6) ajautui **16 sekuntiin** kolmen sekunnin pelaajalla.
 * Syy on kertoimien tulo — häviö kirjataan apinan ajasta, joten helpolla
 * tasolla se kirjaa yli kaksinkertaisen ajan pelaajan omaan tahtiin nähden,
 * ja se paisuttaa keskiarvoa, joka paisuttaa seuraavaa häviökirjausta.
 *
 * Katto pysäytti sen 11,7 sekuntiin. **Mediaani pysäytti sen 4,2 sekuntiin**,
 * koska muutama paisutettu arvio ei siirrä mediaania juuri lainkaan.
 *
 * ⚠️ Funktio on nimetty `tyypillinenAika` eikä `keskiarvo`, koska nimi
 * `keskiarvo` valehtelisi sisällöstä — ja kertoimet on säädetty ylöspäin
 * (1,6 → 1,8 jne.), koska mediaani on oikeavinossa jakaumassa keskiarvoa
 * pienempi. */
function tyypillinenAika() {
  const a = tila.ajat.slice().sort(function (x, y) { return x - y; });
  const n = a.length;
  if (!n) return 0;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
}

function apinanAika() {
  if (!tila.taso.kerroin) return null;
  if (!tila.ajat.length) return ALOITUSAIKA;
  const ka = tyypillinenAika();
  return Math.min(AIKAKATTO, Math.max(AIKALATTIA, ka * tila.taso.kerroin));
}

function kaynnistaApina(kesto) {
  if (tila.moninpeli) return;               // moninpelissa apina ei kilpaile
  const aika = kesto != null ? kesto : apinanAika();
  if (!aika) return;                        // harjoittelu: apina ei kilpaile
  if (!tila.apinanRatkaisu) return;         // apina ei osaa tätä pizzaa
  /* ⚠️ Alkuhetki ja kesto talteen, jotta tauko voi jatkaa siita mihin
   * apina jai. Ilman naita tauko joko nollaisi apinan kellon (pelaajalle
   * ilmainen etu) tai jattaisi sen kaymaan (tauko olisi ansa). */
  tila.apinanAlkoi = Date.now();
  tila.apinanKesto = aika;
  tila.ajastin = setTimeout(function () { apinaEhti(true); }, aika);
}

/* Pelaajan mitattu aika talteen. Häviössä ja luovutuksessa kirjataan arvio,
 * ks. HAVIOKERROIN. Marko 8.9.2026: jos pelaaja ei ehdi seuraavaankaan,
 * aika kasvaa taas — ja niin se tekee, askelin jotka pienenevät:
 * 2,50 → 2,83 → 3,12 → 3,37 → 3,59 s. */
function kirjaaAika(ms) {
  if (!tila.taso.kerroin) return;           // harjoittelussa ei mitata mitään
  tila.ajat.push(ms);
}

function kirjaaHavio() {
  const aika = apinanAika();
  if (!aika) return;
  const arvio = tila.ajat.length
    ? Math.min(aika * HAVIOKERROIN, tyypillinenAika() * HAVIOKATTO)
    : aika * HAVIOKERROIN;
  kirjaaAika(arvio);
}

function pysaytaApina() {
  if (tila.ajastin) { clearTimeout(tila.ajastin); tila.ajastin = null; }
}

/* ---------- tauko ----------
 *
 * Markon pyynto 9.9.2026: peli pitaa voida pysayttaa ja aloittaa alusta,
 * ja ylakulman nuoli on looginen paikka.
 *
 * ⚠️ TAUKO EI SAA OLLA ETU EIKA ANSA. Yksinpelissa apinan kello kay
 * taustalla, ja pelaajan oma aika mitataan paljastuksesta — jos tauko
 * jaisi molempiin, apina "ehtisi" tauon aikana; jos se nollaisi ne,
 * tauolla voisi ostaa lisaaikaa. Siksi apinan jaljella oleva aika
 * otetaan talteen ja `paljastettu` siirtyy tauon keston verran.
 *
 * ⚠️ Moninpelissa taukoa EI ANNETA kun vuoro on varattu. Muuten tauko
 * olisi pakotie varauksesta: painan nappia, huomaan etten osaakaan,
 * painan taukoa. Ja samalla se saastaa osittaisen kellon jatkamisen,
 * jota ei voi nayttaa rehellisesti. */
function saakoPitaaTauon() {
  /* Yhteispelissä ei ole taukoa: kello on palvelimen ja kaikkien yhteinen. */
  return !tila.verkko && tila.kaynnissa && !tila.tauko && !tila.lukossa &&
    tila.vaihe !== 'selitys' && !(tila.moninpeli && tila.vuorossa !== null);
}

function pysaytaPeli() {
  if (!saakoPitaaTauon()) return;
  const nyt = Date.now();
  tila.tauko = {
    alkoi: nyt,
    apinaJaljella: tila.ajastin
      ? Math.max(0, tila.apinanKesto - (nyt - tila.apinanAlkoi)) : null,
  };
  pysaytaApina();
  pysaytaVastausAika();
  document.getElementById('taukoPeite').hidden = false;
}

function jatkaPelia() {
  const t = tila.tauko;
  document.getElementById('taukoPeite').hidden = true;
  if (!t) return;
  tila.tauko = null;
  const kesto = Date.now() - t.alkoi;
  /* Tauko ei ole miettimisaikaa: pelaajan mitattu aika ei saa kasvaa siita. */
  if (tila.paljastettu) tila.paljastettu += kesto;
  if (t.apinaJaljella !== null) kaynnistaApina(t.apinaJaljella);
  piirraKaikki();
}

/* ---------- moninpelin vuoro ---------- */

function pysaytaVastausAika() {
  if (tila.vastausAjastin) { clearTimeout(tila.vastausAjastin); tila.vastausAjastin = null; }
}

/* ⚠️ YKSI PAIKKA JOKA KAYNNISTAA VUOROKELLON, kaksi eri aikaa. Erilliset
 * kaynnistykset valinnalle ja lausekkeelle olisivat kaksi paikkaa joihin
 * sama korjaus pitaisi muistaa tehda. */
function aloitaVuoroKello(kesto) {
  pysaytaVastausAika();
  tila.vastausAlkoi = Date.now();
  tila.vastausKesto = kesto;
  tila.vastausAjastin = setTimeout(vuoroUmpeutui, kesto);
}

/* Vuoron varaus: ensimmainen painallus voittaa. Sen jalkeen muiden napit
 * ovat poissa kaytosta, jotta varaus on yksiselitteinen. */
function varaaVuoro(i) {
  if (!tila.moninpeli || !tila.kaynnissa || tila.tauko) return;
  if (tila.vaihe !== 'valinta' || tila.lukossa) return;
  if (tila.vuorossa !== null) return;                 // joku ehti jo
  if (tila.lukitut.indexOf(i) >= 0) return;           // yritti jo taman pizzan
  tila.vuorossa = i;
  if (tila.pelaajanAika === null) tila.paljastettu = tila.paljastettu || Date.now();
  aloitaVuoroKello(valintaAika());
  piirraKaikki();
  kaynnistaKello(i);
}

/* ⚠️ Kello on CSS-animaatio, ja sama animaatio SAMALLA elementilla ei ala
 * alusta pelkasta luokan lisayksesta. Ilman tata pakotettua uudelleenpiirtoa
 * toisen pelaajan varaus nayttaisi jatkavan edellisen kelloa. */
function kaynnistaKello(i) {
  const rivi = document.getElementById('pelaajarivi');
  const nappi = rivi.children[i];
  if (!nappi) return;
  /* Luokka kertoo CSS:lle kumpaa aikaa kello nyt mittaa. */
  nappi.classList.toggle('lauseke', tila.vaihe === 'selitys');
  const kello = nappi.querySelector('.pelaajanappi-kello');
  if (!kello) return;
  kello.style.animation = 'none';
  void kello.offsetWidth;
  kello.style.animation = '';
}

/* Vuoro paattyi ilman kelvollista vastausta: pelaaja jaa ULOS TASTA
 * pizzasta ja muut saavat yrittaa. Pizza ei siis siirry kenellekaan
 * yhden epaonnistumisen takia — sama henki kuin yksinpelin ohituksessa. */
function vuoroUmpeutui() {
  tila.vastausAjastin = null;
  const i = tila.vuorossa;
  if (i === null) return;
  tila.lukitut.push(i);
  tila.vuorossa = null;
  nollaaValinta();
  valahda('ei-kukaan', '<span class="valahdys-merkki">⊘</span>');
  /* Kun kaikki ovat yrittaneet, kukaan ei pystynyt: uusi pizza paalle ja
   * koko pino menee sille joka seuraavaksi onnistuu. */
  if (tila.lukitut.length >= tila.pelaajia) {
    tila.lukossa = true;
    tila.siirtymaAjastin = setTimeout(function () {
      tila.siirtymaAjastin = null;
      tila.lukossa = false;
      kaannaPizzaPoytaan();
    }, 900);
  }
  piirraKaikki();
}

function pysaytaKaikkiAjastimet() {
  pysaytaApina();
  pysaytaVastausAika();
  if (tila.siirtymaAjastin) { clearTimeout(tila.siirtymaAjastin); tila.siirtymaAjastin = null; }
  if (tila.uusiAjastin) { clearTimeout(tila.uusiAjastin); tila.uusiAjastin = null; }
  tila.uudet = [];
  tila.kaynnissa = false;
  tila.lukossa = false;
}

function siirryHetkenPaasta() {
  tila.siirtymaAjastin = setTimeout(function () {
    tila.siirtymaAjastin = null;
    seuraavaPizza();
  }, 800);
}

/* `kirjaaAikaan` on epätosi vain silloin kun pelaaja luovutti pizzasta johon
 * hänen kädessään EI ollut ratkaisua — silloin kulunut aika ei kerro hänen
 * nopeudestaan mitään. Ks. enOsaa. */
function apinaEhti(kirjaaAikaan) {
  if (!tila.kaynnissa || !tila.pizza || !tila.apinanRatkaisu) return;
  tila.lukossa = true;
  pysaytaApina();
  if (kirjaaAikaan !== false) kirjaaHavio();

  /* Apina pelaa korttinsa oikeasti: ne poistuvat sen kädestä ja tilalle
   * nostetaan pakasta. Ilman tätä pakan kuluminen olisi valhe. */
  tila.apinanRatkaisu.kortit
    .map(function (c) { return tila.apinanKasi[c.i]; })
    .forEach(function (k) {
      const i = tila.apinanKasi.indexOf(k);
      if (i >= 0) { tila.apinanKasi.splice(i, 1); tila.poistetut.push(k); }
    });
  while (tila.apinanKasi.length < KADEN_KOKO && tila.taytteet.length) {
    tila.apinanKasi.push(tila.taytteet.pop());
  }

  tila.apinanPisteet += poydanPisteet();
  tila.apinanPizzoja += tila.poydassa.length;
  piirraPisteet();
  /* ⚠️ Apinan lasku NÄYTETÄÄN. Se on pelin opetuspuoli: hävitty pizza kertoo
   * miten sen olisi voinut tehdä — ja apina pelaa vain sallittuja laskuja. */
  valahda('apina', apinanKuva() + '<span>' +
    ratkaisuTekstina(tila.apinanRatkaisu) + ' = ' + tila.pizza.arvo + '</span>');
  siirryHetkenPaasta();
}

/* ---------- vaihe 1: kortit kädestä ---------- */

/* ⚠️ FANTASIAKORTIN ARVOA EI KYSYTÄ TÄSSÄ VAIHEESSA (Marko 8.9.2026):
 * *"nyt se pyytää kesken ajattelun asettamaan sen arvon, jolloin se korttien
 * pelaaminen keskeytyy juuri kriittisellä hetkellä."*
 *
 * Vaihe 1 on kilpajuoksua ja sen on pysyttävä yhtenä eleenä: kortit pöytään.
 * Arvo valitaan vaiheessa 3 yhdessä laskumerkkien kanssa, jolloin kelloa ei
 * enää ole. Se on myös totuudenmukaisempi: pöydässäkin fantasiakortti lyödään
 * pöytään ensin ja sanotaan vasta perustelussa miksi se on kuutonen. */
function valitseKortti(kortti) {
  if (tila.lukossa || tila.vaihe !== 'valinta') return;
  /* ⚠️ Moninpelissa kortteihin ei saa koskea ennen varausta. Ilman tata
   * kuka tahansa voisi valita kortit valmiiksi ja painaa nappia vasta
   * sitten — eli tasan se mita vastausaika on estamassa. */
  if (tila.moninpeli && tila.vuorossa === null) return;
  const i = tila.valitut.indexOf(kortti);
  if (i >= 0) {
    tila.valitut.splice(i, 1);
    if (kortti.fantasia) kortti.arvo = null;
    return piirraKaikki();
  }
  tila.valitut.push(kortti);
  piirraKaikki();
  /* ⚠️ YHTEISPELISSÄ ARVO KYSYTÄÄN HETI (Marko 12.9.2026): *"siinä on liian
   * monta painallusta ja tässä kohdassa ajatus on jo katkennut ja se tuntuu
   * ylimääräiseltä ja väärältä paikalta."*
   *
   * ⚠️ JA TÄMÄ ON EHDOLLINEN, KOSKA 8.9.2026 PÄÄTETTIIN PÄINVASTOIN samalle
   * laitteelle: siellä valintavaihe on kilpajuoksu (apina juoksee, ja
   * moninpelissä vuorolla on 4 s kello), eikä sen päälle saa avata
   * valintaikkunaa. Yhteispelissä vaihekelloa ei ole — vain kierroksen oma
   * aika — joten sama este ei päde. Arvon voi yhä vaihtaa korttia
   * napauttamalla lausekevaiheessa. */
  if (tila.verkko && kortti.fantasia) kysyFantasianArvo(kortti);
}

/* ============================================================
 * RAAHAUS: VALITUT KORTIT PIZZALLE
 *
 * Markon testihavainto 10.9.2026: testipelaajalle korttien liu'uttaminen
 * pizzaan oli intuitiivisempaa kuin pizzan painaminen. Perustelu ei ole
 * makuasia — FYYSISESSA PELISSA taytteet ASETETAAN pizzan paalle.
 * Painallus on abstraktio siita; raahaus on se itse.
 *
 * ⚠️ MOLEMMAT TAVAT, YKSI KOODIPOLKU. Pudotus kutsuu `pelaaPizzalle`a
 * eika toteuta sita uudelleen. Ne 33 rivia sisaltavat ajanoton,
 * moninpelin vuoron, ohitushaaran ja vaiheenvaihdon — kahdennettuna
 * seuraava saantomuutos osuisi vain toiseen.
 *
 * ⚠️ VAIN JO VALITTUA KORTTIA VOI RAAHATA (Markon paatos: vaihtoehto a).
 * Vahinkoraahaus kilpajuoksussa ei saa sitoa vuoroa, ja saanto pysyy
 * yhtena: valinta on napautus, pelaaminen on raahaus TAI pizzan
 * painallus.
 *
 * ⚠️ Raahaus on HITAAMPI kuin napautus, ja moninpelissa valinta-aika on
 * neljä sekuntia. Siksi napautus ei saa kadota: raahaus on oppimisen
 * ele, napautus kilpajuoksun.
 * ============================================================ */

/* Kynnys erottaa napautuksen raahauksesta. Alle taman liike on
 * napautusta — sormi ei osu pikselilleen. */
const RAAHAUS_KYNNYS = 10;

/* ⚠️ KOLME RAAHAUSTA, YKSI KONEISTO. Jokainen paattyy OLEMASSA OLEVAAN
 * funktioon — raahaus ei toteuta yhtaakaan saantoa uudelleen:
 *
 *   pizza   valitut kortit -> pizzakortti   -> pelaaPizzalle()
 *   merkki  laskumerkki    -> aukko         -> valitseAukko() + asetaMerkki()
 *   siirto  kortti         -> toinen kortti -> valitseSiirto()
 *
 * Kaksi jalkimmaista ovat Markon pyynto 11.9.2026: lausekevaiheessa
 * pitaa voida liu'uttaa seka kortteja paikoilleen etta merkkeja
 * aukkoihin — napautus jaa silti voimaan. */
const RAAHAUS_KOHTEET = {
  pizza:  '.pizza-kortti',
  pois:   '.pizza-kortti',
  merkki: '.aukko',
  siirto: '#kasi .tayte-kortti',
};

const raahaus = {
  osoitin: null,      // pointerId, null kun ei raahata
  laji: null,         // 'pizza' | 'merkki' | 'siirto'
  aktiivinen: false,  // ylittiko liike kynnyksen
  alkuX: 0, alkuY: 0,
  kortit: [],         // siirrettavat elementit
  lahde: null,        // lahtoelementti (merkki / siirto)
  kohde: null,        // korostettu pudotuskohde
  tehty: false,       // estaa raahausta seuraavan clickin
};

function raahattavaKortti(kohde) {
  return (kohde && kohde.closest) ? kohde.closest('.tayte-kortti') : null;
}

/* Mika pudotuskohde on pisteen alla — lajin mukaan. Palauttaa
 * elementin tai null. */
function raahauksenKohde(x, y) {
  const valitsin = RAAHAUS_KOHTEET[raahaus.laji];
  if (!valitsin) return null;
  const alla = document.elementFromPoint(x, y);
  if (!alla || !alla.closest) return null;
  const kohde = alla.closest(valitsin);
  if (!kohde) return null;
  /* Kortin pudotus ITSEENSA ei ole siirto. */
  if (raahaus.laji === 'siirto' && kohde === raahaus.lahde) return null;
  if (kohde.disabled) return null;
  return kohde;
}

function raahausAlku(e) {
  /* ⚠️ VANHA RAAHAUS SIIVOTAAN, EI TORJUTA UUTTA. Ensimmainen versio
   * palautti tassa jos `osoitin !== null`, ja se jai JUMIIN heti kun
   * yksi `pointerup` jai tulematta: selain voi menettaa osoittimen
   * (valilehti taustalle, ele keskeytyy, laite katoaa), ja silloin
   * moduuli olisi torjunut kaikki myohemmat raahaukset lopullisesti.
   * Mitattu 10.9.2026: keskeytynyt raahausyritys jatti `osoitin`in
   * arvoon 2 eika mikaan enaa toiminut — eika mikaan kertonut siita.
   *
   * Uusi painallus on aina tuorein totuus. */
  if (raahaus.osoitin !== null) raahausSiivoa();
  if (e.button != null && e.button > 0) return;      // vain paanappi
  if (!tila.kaynnissa || tila.lukossa || tila.tauko) return;
  if (tila.moninpeli && tila.vuorossa === null) return;

  let laji = null, lahde = null;
  if (tila.vaihe === 'valinta') {
    /* ⚠️ RAAHAUS VALITSEE, EI PELAA (Marko 6.10.2026). Ennen vain jo
     * valittua korttia sai raahata, koska pudotus pelasi koko ryhman ja
     * vahinkoraahaus olisi sitonut vuoron. Nyt pudotus vain asettaa YHDEN
     * kortin pizzan paalle, ja pelaaminen on aina pizzan painallus —
     * joten rajoitukselle ei ole enaa syyta. */
    const pieni = e.target.closest && e.target.closest('.pieni-tayte');
    if (pieni && pieni.__kortti) { laji = 'pois'; lahde = pieni; }
    else {
      const el = raahattavaKortti(e.target);
      if (!el || !el.__kortti) return;
      if (tila.valitut.indexOf(el.__kortti) >= 0) return;   // tyhja paikka
      laji = 'pizza'; lahde = el;
    }
  } else if (tila.vaihe === 'selitys') {
    /* ⚠️ Ryhmitys kesken: silloin kortin napautus OSOITTAA lukua eika
     * siirra sita, joten raahaus olisi eri teko kuin napautus. */
    if (tila.ryhmitysKesken) return;
    const merkki = e.target.closest && e.target.closest('#operaattorit .op[data-op]');
    const kortti = raahattavaKortti(e.target);
    if (merkki) { laji = 'merkki'; lahde = merkki; }
    else if (kortti) { laji = 'siirto'; lahde = kortti; }
    else return;
  } else return;

  raahaus.laji = laji;
  raahaus.lahde = lahde;
  raahaus.osoitin = e.pointerId;
  raahaus.alkuX = e.clientX;
  raahaus.alkuY = e.clientY;
  raahaus.aktiivinen = false;
  /* ⚠️ Kuuntelijat IKKUNAAN eika elementtiin: kortti voi kadota alta
   * kesken raahauksen (piirraKaikki), ja silloin elementtiin sidottu
   * pointerup ei tulisi koskaan — raahaus jaisi paalle. */
  window.addEventListener('pointermove', raahausLiike, { passive: false });
  window.addEventListener('pointerup', raahausLoppu);
  window.addEventListener('pointercancel', raahausLoppu);
}

function raahausLiike(e) {
  if (e.pointerId !== raahaus.osoitin) return;
  const dx = e.clientX - raahaus.alkuX;
  const dy = e.clientY - raahaus.alkuY;
  if (!raahaus.aktiivinen) {
    if (Math.sqrt(dx * dx + dy * dy) < RAAHAUS_KYNNYS) return;
    raahaus.aktiivinen = true;
    /* Valintavaiheessa siirtyy KOKO valittu ryhma; lausekevaiheessa
     * vain se yksi jota kosketettiin. */
    raahaus.kortit = [raahaus.lahde];
    raahaus.kortit.forEach(function (el) { el.classList.add('raahataan'); });
  }
  /* Estaa selaimen oman eleen (vieritys, kuvan raahaus) vasta kun on
   * varmaa etta kyse on raahauksesta — muuten napautus karsisi. */
  e.preventDefault();
  const keskella = (raahaus.kortit.length - 1) / 2;
  raahaus.kortit.forEach(function (el, n) {
    el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' +
      ((n - keskella) * 3).toFixed(1) + 'deg)';
  });
  /* Kohde korostetaan lajin mukaan. Edellinen korostus poistetaan aina,
   * jottei ruudulle jaa kahta kohdetta. */
  const kohde = raahauksenKohde(e.clientX, e.clientY);
  if (kohde !== raahaus.kohde) {
    if (raahaus.kohde) raahaus.kohde.classList.remove('kohde');
    if (kohde) kohde.classList.add('kohde');
    raahaus.kohde = kohde;
  }
}

function raahausLoppu(e) {
  if (e && e.pointerId !== raahaus.osoitin) return;
  const oliRaahaus = raahaus.aktiivinen;
  const laji = raahaus.laji;
  const lahde = raahaus.lahde;
  const kohde = (oliRaahaus && e && e.type === 'pointerup')
    ? raahauksenKohde(e.clientX, e.clientY) : null;
  raahausSiivoa();
  if (!oliRaahaus) return;            // oli napautus — click hoitaa valinnan
  raahaus.tehty = true;
  setTimeout(function () { raahaus.tehty = false; }, 0);
  /* Pieni kortti pudotettiin pizzan ULKOPUOLELLE: takaisin kateen. */
  if (laji === 'pois') {
    if (!kohde && tila.valitut.indexOf(lahde.__kortti) >= 0) valitseKortti(lahde.__kortti);
    return;
  }
  if (!kohde) return;
  /* ⚠️ Jokainen haara paattyy OLEMASSA OLEVAAN funktioon. Raahaus
   * valitsee kohteen; saannon omistaa yha se funktio joka sen omisti. */
  if (laji === 'pizza') {
    if (kohde && tila.valitut.indexOf(lahde.__kortti) < 0) valitseKortti(lahde.__kortti);
    return;
  }
  if (laji === 'merkki') {
    valitseAukko(kohde.__idx);
    return asetaMerkki(lahde.dataset.op);
  }
  if (laji === 'siirto') {
    tila.siirrettava = lahde.__idx;
    return valitseSiirto(kohde.__idx);
  }
}

function raahausSiivoa() {
  window.removeEventListener('pointermove', raahausLiike);
  window.removeEventListener('pointerup', raahausLoppu);
  window.removeEventListener('pointercancel', raahausLoppu);
  raahaus.kortit.forEach(function (el) {
    el.classList.remove('raahataan');
    el.style.transform = '';
  });
  raahaus.kortit = [];
  raahaus.osoitin = null;
  raahaus.laji = null;
  raahaus.lahde = null;
  raahaus.aktiivinen = false;
  if (raahaus.kohde) raahaus.kohde.classList.remove('kohde');
  raahaus.kohde = null;
  /* Varmistus: yksikaan kohde ei jaa korostetuksi vaikka viite katoaisi
   * uudelleenpiirrossa. */
  [].forEach.call(document.querySelectorAll('.kohde'),
    function (el) { el.classList.remove('kohde'); });
}

/* ---------- vaihe 2: kortit pizzan päälle ---------- */

/* Pizzakortin painaminen on korttien lyömistä pöytään. Se on se hetki jossa
 * pelaaja ilmoittaa ehtineensä — ja siksi apinan aika pysähtyy tässä. */
function pelaaPizzalle() {
  if (tila.vaihe === 'lepo') return kaannaKortit('pizza');
  if (tila.lukossa || tila.vaihe !== 'valinta') return;
  /* ⚠️ PIZZAN PAINALLUS ILMAN VALITTUJA KORTTEJA ON OHITUS (Markon idea
   * 9.9.2026). Se poisti erillisen «ei näillä korteilla» -napin kokonaan
   * sen sijaan etta olisi siirtanyt sita: pizza on jo se kohde johon
   * vastataan, ja tyhja vastaus on «en pysty». Yksi nappi vahemman. */
  /* Moninpelissa pizzaan ei voi vastata ennen kuin vuoro on varattu. */
  if (tila.moninpeli && tila.vuorossa === null) return;
  if (!tila.valitut.length) return enOsaa();
  /* ⚠️ Kortit ovat nyt SITOVAT. Valinnan kello paattyy — ja LAUSEKEKELLO
   * alkaa (Markon testihavainto 9.9.2026). Aiemmin tahan pysahtyi kaikki
   * ajanotto, ja se oli vaara tulkinta: silloin varauksen jalkeen sai
   * miettia laskua rauhassa. */
  if (tila.moninpeli && tila.vuorossa !== null) {
    aloitaVuoroKello(lausekeAika());
  } else {
    pysaytaVastausAika();
  }
  /* Markon määrittely: aika mitataan paljastuksesta pizzan painallukseen. */
  if (tila.pelaajanAika === null) tila.pelaajanAika = Date.now() - tila.paljastettu;
  pysaytaApina();
  tila.vaihe = 'selitys';
  tila.merkit = new Array(tila.valitut.length - 1).fill(null);
  tila.ryhmat = [];
  tila.ryhmitysKesken = null;
  tila.aukko = 0;
  piirraKaikki();
  /* ⚠️ Vahti myos TAHAN: lausekevaihe on se nakyma jossa asettelu on
   * tiukimmillaan, ja juuri siina laskumerkit jaivat palkin alle.
   *
   * ⚠️ JA VIIVE ON MITATTU, EI ARVATTU. Ensimmainen versio kutsui
   * `setTimeout(..., 0)` ja se antoi VAARAN HALYTYKSEN: kaikki viisi
   * merkkia raportoitiin peitossa oleviksi (`DIV.jaljella`), vaikka
   * 300 ms myohemmin sama tarkistus oli puhdas. Kortit siirtyvat
   * kadesta lausekkeeseen, ja asettelu asettuu vasta sen jalkeen.
   *
   * Vaara halytys on tassa pahempi kuin ei halytysta: se opettaa
   * ohittamaan halytykset. Siksi mittaus vasta kun mitaan ei enaa
   * liiku — ja vain jos ollaan yha samassa vaiheessa. */
  setTimeout(function () {
    if (tila.vaihe === 'selitys' && !tila.lukossa) tarkistaKytkennat();
  }, 400);
  if (tila.moninpeli && tila.vuorossa !== null) kaynnistaKello(tila.vuorossa);
  /* Yhdellä kortilla ei ole väliä johon merkin laittaisi — ratkeaa heti,
   * paitsi jos se on fantasiakortti jolla ei vielä ole arvoa. */
  if (!tila.merkit.length) tarkistaLasku();
}

function valitseAukko(i) {
  if (tila.vaihe !== 'selitys') return;
  tila.siirrettava = null;
  tila.aukko = i;
  piirraKaikki();
}

/* ⚠️ JÄRJESTYS ON OSA LASKUA, ja se lukittui ennen napautusjärjestykseen.
 * Markon havainto 8.9.2026: pizzan arvo 5, kädessä 2 ja 10, jakolasku
 * mielessä — mutta kortit tulivat pöytään väärin päin, ja `2 ÷ 10` ei ole
 * `10 ÷ 2`. Osattu ratkaisu jäi pelaamatta käyttöliittymän takia.
 *
 * Pöydässä kortteja siirrellään kädellä. Tässä kaksi napautusta vaihtaa
 * kahden arvon paikat; merkit ja sulkeet jäävät omille paikoilleen, koska
 * ne kuuluvat väleihin eivätkä kortteihin. */
function valitseSiirto(i) {
  if (tila.lukossa || tila.vaihe !== 'selitys' || tila.ryhmitysKesken) return;
  if (tila.siirrettava === null) { tila.siirrettava = i; return piirraKaikki(); }
  if (tila.siirrettava === i)    { tila.siirrettava = null; return piirraKaikki(); }
  const a = tila.siirrettava, b = i, apu = tila.valitut[a];
  tila.valitut[a] = tila.valitut[b];
  tila.valitut[b] = apu;
  tila.siirrettava = null;
  paivitaJaTarkista();
}

function asetaMerkki(op) {
  if (tila.lukossa || tila.vaihe !== 'selitys' || !tila.merkit.length) return;
  tila.ryhmitysKesken = null;
  tila.merkit[tila.aukko] = op;
  const seuraavaTyhja = tila.merkit.indexOf(null);
  if (seuraavaTyhja >= 0) tila.aukko = seuraavaTyhja;
  paivitaJaTarkista();
}

/* Sulkeet asetetaan osoittamalla ryhmän ensimmäinen ja viimeinen kortti.
 * Se on kaksi napautusta ja vastaa sitä miten ryhmä sanotaan ääneen
 * ("kaksi plus kolme, ja se kerrotaan kahdella"). */
function aloitaRyhmitys() {
  if (tila.lukossa || tila.vaihe !== 'selitys' || tila.valitut.length < 3) return;
  tila.siirrettava = null;
  tila.ryhmitysKesken = tila.ryhmitysKesken ? null : {};
  piirraKaikki();
}

function osoitaLuku(i) {
  if (!tila.ryhmitysKesken) return;
  if (tila.ryhmitysKesken.alku === undefined) {
    tila.ryhmitysKesken = { alku: i };
    return piirraKaikki();
  }
  const a = Math.min(tila.ryhmitysKesken.alku, i), b = Math.max(tila.ryhmitysKesken.alku, i);
  if (ryhmaKelpaa(a, b)) tila.ryhmat.push({ alku: a, loppu: b });
  tila.ryhmitysKesken = null;
  paivitaJaTarkista();
}

function poistaRyhma(ryhma) {
  const i = tila.ryhmat.indexOf(ryhma);
  if (i >= 0) tila.ryhmat.splice(i, 1);
  paivitaJaTarkista();
}

function paivitaJaTarkista() {
  piirraKaikki();
  if (lausekeValmis()) tarkistaLasku();
}

function nollaaValinta() {
  tila.valitut.forEach(function (k) { if (k.fantasia) k.arvo = null; });
  tila.valitut = [];
  tila.merkit = [];
  tila.ryhmat = [];
  tila.ryhmitysKesken = null;
  tila.siirrettava = null;
  tila.aukko = 0;
  tila.vaihe = 'valinta';
}

/* Kortit takaisin käteen. Jos pelaaja perui pelaamansa kortit, hän ei enää
 * ole ehtinyt ensin — apina saa jatkaa juoksuaan alusta. */
function palautaKortit() {
  if (tila.lukossa) return;
  const oliPelattu = tila.vaihe === 'selitys';
  /* ⚠️ MONINPELISSA PERUMINEN ON LUOVUTUS, ei paluu miettimaan. Kortit oli
   * jo lyoty pizzalle ja ne olivat sitovat; jos peruminen palauttaisi
   * valintavaiheeseen, pelaaja saisi varata vuoron ja etsia kortteja
   * rauhassa — eli kiertaa vastausajan. Muut saavat nyt yrittaa. */
  if (tila.moninpeli && oliPelattu) {
    tila.ohitettu = true;
    piirraPizza();
    return vuoroUmpeutui();
  }
  nollaaValinta();
  piirraKaikki();
  if (oliPelattu && tila.kaynnissa) { pysaytaApina(); kaynnistaApina(); }
}

function tarkistaLasku() {
  if (tila.lukossa) return false;
  const t = laske(tokenit());
  if (!osuuko(t, tila.pizza.arvo)) return false;
  /* ⚠️ TÄSSÄ SELAINPELI POIKKEAA TIETOISESTI PAINETUISTA SÄÄNNÖISTÄ.
   *
   * Sääntövihko sanoo sanatarkasti: *"Pelaajan täytyy käyttää yhtä monta
   * täytekorttia kuin pizzassa on täytteitä."* — siis KORTTIEN lukumäärä.
   * Niin tämä oli 8.9.2026 asti, eikä se ollut virhe vaan sääntöuskollisuutta.
   *
   * Marko muutti sen samana päivänä ja kertoi syyn: *"tuo täytteiden lukumäärä
   * on parempi, koska silloin pelaaja, jolla on paljon ykkösiä tai kakkosia
   * kädessään pystyy myös pelaamaan pizzoja."* Yhden täytteen arvon 4 pizzan
   * voi siis tehdä `2 + 2` tai `1 + 1 + 1 + 1` — yksi täyte, monta korttia.
   *
   * Se on myös hänen alkuperäinen kaavansa `8 = ax + by + cz` luettuna
   * oikein: x, y, z ovat eri täytteitä ja a, b, c niiden korttien lukumääriä.
   *
   * ⚠️ Ero on kirjattava, koska se näyttää myöhemmin vialta: joku joka omistaa
   * pelin lukee vihkosta toisin. Kortti saa myös kumota toisen — silloin sitä
   * täytettä kumminkin käytetään. */
  if (tila.apinanTapa && eriArvojaValituissa() !== tila.pizza.tayteMaara) return false;

  /* ⚠️ YHTEISPELISSÄ OIKEA LASKU EI PISTEYTY TÄSSÄ vaan lähtee palvelimelle
   * (pelaaja.js). Pisteet laskee isäntä palvelimen saapumisajasta
   * (MULTIPLAYER.md 8.3): laitteen oma arvio olisi väärennettävissä. */
  if (tila.verkko) return verkkoVastaa();

  tila.lukossa = true;
  pysaytaApina();
  pysaytaVastausAika();
  if (tila.pelaajanAika !== null) kirjaaAika(tila.pelaajanAika);
  if (tila.moninpeli && tila.vuorossa !== null) {
    tila.pisteet[tila.vuorossa] += poydanPisteet();
    tila.pizzoja[tila.vuorossa] += tila.poydassa.length;
  } else {
    tila.omatPisteet += poydanPisteet();
    tila.omiaPizzoja += tila.poydassa.length;
  }

  /* Käytetyt täytekortit poistetaan pelistä — ne eivät palaa pakkaan. */
  tila.valitut.forEach(function (k) {
    const i = tila.kasi.indexOf(k);
    if (i >= 0) { tila.kasi.splice(i, 1); tila.poistetut.push(k); }
  });
  /* ⚠️ Uudet kortit merkitaan, jotta ne tulevat SELKAPUOLI ylospain ja
   * kaantyvat heti. Ilman sita ne vain ilmestyvat kateen, eika pelaaja
   * huomaa etta pakasta tuli lisaa (Markon havainto 9.9.2026). */
  tila.uudet = [];
  while (tila.kasi.length < KADEN_KOKO && tila.taytteet.length) {
    const uusi = tila.taytteet.pop();
    tila.kasi.push(uusi);
    tila.uudet.push(uusi);
  }

  piirraPisteet();
  valahda('oma', '<span class="valahdys-merkki">✓</span><span>+' + poydanPisteet() + '</span>');
  siirryHetkenPaasta();
  return true;
}

function lopetaKesken() {
  if (!tila.kaynnissa || tila.verkko) return;     // yhteispelin lopettaa isäntä
  tila.keskeytetty = true;
  lopetaKierros('keskeytys');
}

function lopetaKierros(syy) {
  tila.paattymisSyy = syy || null;
  tila.pizza = null;
  pysaytaKaikkiAjastimet();
  piirraTulos();
  naytaRuutu('tulosRuutu');
}

/* ---------- piirto ---------- */

function naytaRuutu(id) {
  ['peliRuutu', 'tulosRuutu'].forEach(function (r) {
    document.getElementById(r).hidden = (r !== id);
  });
}

function piirraKaikki() {
  if (!tila.pizza) return;
  piirraPelaajat();
  piirraPizza();
  piirraLauseke();
  piirraKasi();
  piirraOhje();
}

function piirraPizza() {
  const p = tila.pizza;
  const kortti = document.getElementById('pizzaKortti');
  const piilossa = tila.vaihe === 'lepo' && !tila.kaannetty.pizza;
  kortti.classList.toggle('selka', piilossa);
  if (piilossa) {
    document.getElementById('pizzaKuva').src = 'kuvat/tausta-pizza.webp?v=20260910a';
    document.getElementById('pizzaKuva').alt = t('pizza.pakka');
    document.getElementById('pizzaSydan').hidden = true;
    document.getElementById('pinoMerkki').hidden = true;
    kortti.classList.remove('pinossa', 'pelattavissa', 'pelattu', 'ohitettu');
    kortti.setAttribute('aria-disabled', 'false');
    return;
  }
  document.getElementById('pizzaKuva').src = p.kuva;
  document.getElementById('pizzaKuva').alt =
    t('pizza.alt', { arvo: p.arvo, maara: p.tayteMaara });
  document.getElementById('pizzaSydan').hidden = !p.sydan;

  /* Pizzakortti on painike vain silloin kun sillä on jotain tehtävää. */
  const pinossa = tila.poydassa.length > 1;
  const merkki = document.getElementById('pinoMerkki');
  merkki.hidden = !pinossa;
  if (pinossa) merkki.textContent = tila.poydassa.length + ' ' + t('pino.pizzaa') +
    ' · ' + poydanPisteet() + ' ' + t('pino.pistetta');

  kortti.classList.toggle('pinossa', pinossa);
  const valmis = tila.vaihe === 'valinta' && tila.valitut.length > 0 && !tila.lukossa;
  kortti.classList.toggle('pelattavissa', valmis);
  kortti.classList.toggle('pelattu', tila.vaihe === 'selitys');
  kortti.classList.toggle('ohitettu', !!tila.ohitettu);
  /* Painettavissa koko valintavaiheen ajan: korteilla se on lyonti,
   * ilman kortteja ohitus. Hehku (pelattavissa) nakyy vain lyonnille. */
  const painettavissa = tila.vaihe === 'valinta' && !tila.lukossa;
  kortti.setAttribute('aria-disabled', painettavissa ? 'false' : 'true');
  piirraPizzanTaytteet(kortti);
}

/* ============================================================
 * VALITUT KORTIT PIZZAN PAALLA (Marko 6.10.2026)
 *
 * *"vetamalla se taytekortti pitaisi luultavasti jaada pizzan paalle
 * jotenkin siten, etta myos pizzakortti jaa nakyviin"* — ja paatos A:
 * myos napautus vie kortin tanne. Yksi malli: pizzan paalla olevat
 * kortit = vastaukseni. Pizzan painallus vahvistaa.
 *
 * Kortit ovat pienia ja rivissa pizzan alaosassa, jarjestyksessa jossa
 * ne lasketaan. Pizzan arvo nakyy ylakulmassa niiden ylapuolella.
 * Pientä korttia napauttamalla (tai raahaamalla pois pizzalta) se
 * palaa kateen. Kaden tilalle jaa tyhja paikka, jottei kasi hyppaa.
 * ============================================================ */
const PIENI_LEVEYS = 33;     /* % pizzakortin leveydesta */
const PIENI_ALUE = 104;      /* % jolle pienet kortit levitetaan */

function piirraPizzanTaytteet(kortti) {
  let alue = document.getElementById('pizzanTaytteet');
  if (!alue) {
    alue = document.createElement('div');
    alue.id = 'pizzanTaytteet';
    alue.className = 'pizzan-taytteet';
    kortti.appendChild(alue);
    alue.addEventListener('pointerdown', raahausAlku);
  }
  alue.innerHTML = '';
  if (tila.vaihe !== 'valinta') return;
  const n = tila.valitut.length;
  const askel = n > 1 ? Math.min(PIENI_LEVEYS + 2, (PIENI_ALUE - PIENI_LEVEYS) / (n - 1)) : 0;
  const alku = (100 - (PIENI_LEVEYS + askel * (n - 1))) / 2;
  tila.valitut.forEach(function (k, i) {
    const arvoton = k.fantasia && typeof k.arvo !== 'number';
    const kuva = k.fantasia && !arvoton ? 'kuvat/tayte-' + k.arvo + '.webp' : k.kuva;
    const nappi = document.createElement('button');
    nappi.type = 'button';
    nappi.className = 'pieni-tayte';
    nappi.__kortti = k;
    nappi.disabled = tila.lukossa;
    nappi.style.left = (alku + askel * i).toFixed(2) + '%';
    nappi.style.setProperty('--kulma', ((i - (n - 1) / 2) * 4).toFixed(1) + 'deg');
    nappi.style.zIndex = 1 + i;
    const alt = k.fantasia
      ? (arvoton ? t('fantasia.valitsematta') : t('fantasia.arvona', { arvo: k.arvo }))
      : t('tayte.alt', { nimi: t('tayte.' + k.arvo), arvo: k.arvo });
    nappi.setAttribute('aria-label', alt);
    nappi.innerHTML = '<img src="' + kuva + '" alt="">' +
      (k.fantasia && !arvoton ? '<span class="fantasiamerkki" aria-hidden="true">X</span>' : '');
    nappi.onclick = function (e) {
      /* Pizzan oma click on vahvistus — pieni kortti ei saa laukaista sita. */
      e.stopPropagation();
      if (raahaus.tehty) return;
      valitseKortti(k);
    };
    alue.appendChild(nappi);
  });
}

/* ⚠️ TEKSTI NÄYTETÄÄN VAIN KUN SE KERTOO JOTAIN NÄKYMÄTÖNTÄ (Marko 8.9.2026:
 * *"pelin pitäisi olla pelaamista varten eikä lukemista"*).
 *
 * Valintavaiheessa ohje oli ennen aina päällä — *"Valitse arvoja kädestäsi"*
 * ja *"Paina nyt pizzaa"*. Molemmat nimeävät sen minkä pelaaja jo näkee:
 * käsi on ruudulla, ja pizzakortti kohoaa ja kutsuu itse kun kortteja on
 * valittu. Ne poistuivat. Jäljelle jäi vain se mitä kortista ei näe:
 * Vaikeamman tavan vaatimus eri arvojen määrästä. */
/* ⚠️ PELINÄKYMÄSSÄ EI OLE TEKSTIÄ (Marko 8.9.2026): *"kaikki tekstit pitäisi
 * saada pois, koska peli on kieliriippumaton. Rattaan takana oleva asetus voi
 * olla suomeksi."*
 *
 * Siksi tämä funktio on tyhjä kuori eikä poistettu: ohjerivi on yhä olemassa
 * DOM:ssa ja `aria-label`-tekstit ovat paikoillaan ruudunlukijaa varten —
 * ne ovat käännettävissä, näkyvä teksti ei olisi. Numerot, laskumerkit ja
 * kortit ovat kieliriippumattomia sellaisenaan. */
function piirraOhje() {
  const ohje = document.getElementById('pizzaOhje');
  if (ohje) ohje.textContent = '';
}

function piirraKasi() {
  const alue = document.getElementById('kasi');
  alue.innerHTML = '';
  const selitys = tila.vaihe === 'selitys';
  const ryhmittelee = !!tila.ryhmitysKesken;
  const lista = selitys ? tila.valitut : tila.kasi;

  alue.classList.toggle('lauseke', selitys);

  if (tila.vaihe === 'lepo' && !tila.kaannetty.kasi) {
    for (let n = 0; n < KADEN_KOKO; n++) {
      const nappi = document.createElement('button');
      nappi.className = 'tayte-kortti selka';
      nappi.setAttribute('aria-label', t('tayte.pakka'));
      nappi.innerHTML = '<img src="kuvat/tausta-tayte.webp?v=20260910a" alt="">';
      nappi.onclick = function () { kaannaKortit('kasi'); };
      alue.appendChild(nappi);
    }
    return;
  }

  lista.forEach(function (k, i) {
    if (selitys) {
      tila.ryhmat.filter(function (r) { return r.alku === i; })
        .sort(function (a, b) { return (b.loppu - b.alku) - (a.loppu - a.alku); })
        .forEach(function (r) { alue.appendChild(sulkuNappi('(', r)); });
    }

    alue.appendChild(korttiNappi(k, i, selitys, ryhmittelee));

    if (selitys) {
      tila.ryhmat.filter(function (r) { return r.loppu === i; })
        .sort(function (a, b) { return (a.loppu - a.alku) - (b.loppu - b.alku); })
        .forEach(function (r) { alue.appendChild(sulkuNappi(')', r)); });
      if (i < tila.valitut.length - 1) alue.appendChild(aukkoNappi(i, ryhmittelee));
    }
  });

  if (selitys && lausekeValmis()) {
    const t = laske(tokenit());
    const yhta = document.createElement('span');
    yhta.className = 'lasku-op';
    yhta.textContent = '=';
    alue.appendChild(yhta);
    const tulos = document.createElement('span');
    tulos.className = 'lasku-tulos' + (osuuko(t, tila.pizza.arvo) ? ' osuu' : ' ohi');
    /* ⚠️ Kelvoton lauseke palauttaa nullin. Sitä ei saa näyttää tyhjänä —
     * tyhjä näyttää siltä ettei mitään tapahtunut. */
    /* ⚠️ Kelvoton lauseke (epätasapainoiset sulkeet, nollalla jako, logaritmi
     * joka ei anna kokonaislukua) palauttaa nullin. Sitä ei saa näyttää
     * tyhjänä — tyhjä näyttää siltä ettei mitään tapahtunut. Merkkinä ✕,
     * koska sana olisi kielisidonnainen. */
    tulos.textContent = t ? tulosTekstina(t) : '✕';
    alue.appendChild(tulos);
  }

  /* Uudet kortit ovat nyt ruudulla selkapuoli ylospain — kaannetaan ne
   * heti, jotta pelaaja nakee etta pakasta TULI lisaa eika vain ilmestyi.
   * Ajastin on tilassa, jotta pysaytaKaikkiAjastimet saa sen kiinni. */
  const uudet = [].slice.call(alue.querySelectorAll('.tayte-kortti.uusi'));
  if (uudet.length && !tila.uusiAjastin) {
    tila.uusiAjastin = setTimeout(function () {
      tila.uusiAjastin = null;
      const kesto = parseFloat(getComputedStyle(document.documentElement)
        .getPropertyValue('--kaanto')) || 340;
      uudet.forEach(function (el, i) {
        el.style.animationDelay = (i * 45) + 'ms';
        el.classList.add('kaantyy');
      });
      setTimeout(function () {
        tila.uudet = [];
        piirraKasi();
      }, kesto / 2 + 45 * Math.max(0, uudet.length - 1));
    }, 240);
  }
}

function korttiNappi(k, i, selitys, ryhmittelee) {
  const pelattu = tila.valitut.indexOf(k) >= 0;
  const arvoton = k.fantasia && typeof k.arvo !== 'number';
  const nappi = document.createElement('button');
  /* ⚠️ Korttiolio kiinni elementtiin. Raahaus tarvitsee tiedon SIITA
   * kortista jota kosketettiin, eika indeksi kelpaa: sama funktio piirtaa
   * seka kaden (tila.kasi) etta lausekkeen (tila.valitut), ja niissa sama
   * indeksi tarkoittaa eri korttia. */
  nappi.__kortti = k;
  nappi.__idx = i;          /* paikka listassa: raahaus tarvitsee sen */

  nappi.className = 'tayte-kortti' +
    (k.fantasia && !arvoton ? ' fantasia-arvottu' : '') +
    (pelattu && !selitys ? ' pizzalla' : '') +
    (selitys && ryhmittelee ? ' osoitettavissa' : '') +
    (selitys && ryhmittelee && tila.ryhmitysKesken.alku === i ? ' ryhman-alku' : '') +
    (selitys && tila.siirrettava === i ? ' nostettu' : '') +
    (selitys && arvoton ? ' arvoton' : '');

  nappi.disabled = tila.lukossa || (!selitys && tila.vaihe !== 'valinta');
  nappi.setAttribute('aria-pressed', pelattu ? 'true' : 'false');

  const uusi = !selitys && tila.uudet && tila.uudet.indexOf(k) >= 0;
  if (uusi) nappi.className += ' selka uusi';
  /* ⚠️ Taytteen nimi haetaan ARVON perusteella kielikerroksesta, ei
   * kortista: kortit.js:n `nimi` on suomea eika kaanny. */
  const alt = k.fantasia
    ? (arvoton ? t('fantasia.valitsematta') : t('fantasia.arvona', { arvo: k.arvo }))
    : t('tayte.alt', { nimi: t('tayte.' + k.arvo), arvo: k.arvo });
  /* ⚠️ ARVON SAANUT X-KORTTI NÄYTTÄÄ KORTIN JONKA SE KORVAA (Marko
   * 13.9.2026), molemmissa vaiheissa. Ennen arvo näkyi vain selitysvaiheen
   * merkkinä, joten yhteispelissä valintavaiheessa valittu arvo ei näkynyt
   * missään. Kuva tulee samasta lähteestä kuin tavallisen kortin. */
  const kuva = k.fantasia && !arvoton ? 'kuvat/tayte-' + k.arvo + '.webp' : k.kuva;
  nappi.innerHTML = '<img src="' + (uusi ? 'kuvat/tausta-tayte.webp?v=20260910a' : kuva) +
    '" alt="' + (uusi ? '' : alt) + '">' +

    (k.fantasia && !arvoton && !uusi ? '<span class="fantasiamerkki" aria-hidden="true">X</span>' : '') +
    /* ⚠️ ARVOMERKKI VAIN ARVOTTOMALLE X-KORTILLE SELITYSVAIHEESSA: se on
     * päätös jota peli odottaa (sykkivä peite, Markon linjaus 9.9.2026).
     * Muilla korteilla arvo on painettuna korttiin (Marko 11.9.2026), ja
     * arvon saaneella X-kortilla nyt sen korvaaman kortin kuvassa. */
    (selitys && arvoton ? '<span class="arvomerkki">X</span>' : '');

  nappi.onclick = function () {
    /* ⚠️ Raahauksen jalkeen selain lahettaa VIELA clickin, ja se
     * poistaisi juuri raahatun kortin valinnasta. Lippu nollautuu
     * seuraavalla tikilla. */
    if (raahaus.tehty) return;
    if (!selitys) return valitseKortti(k);
    if (ryhmittelee) return osoitaLuku(i);
    /* Kesken oleva paikanvaihto viedään loppuun; muuten fantasiakortin
     * napautus avaa arvonvalinnan. */
    if (k.fantasia && tila.siirrettava === null) return kysyFantasianArvo(k);
    valitseSiirto(i);
  };
  return nappi;
}

function aukkoNappi(i, ryhmittelee) {
  const merkki = tila.merkit[i];
  const nappi = document.createElement('button');
  nappi.__idx = i;
  nappi.className = 'aukko' + (merkki ? ' taytetty' : '') +
    (!ryhmittelee && tila.aukko === i ? ' valittu' : '');
  nappi.textContent = merkki || '?';
  nappi.disabled = ryhmittelee || tila.lukossa;
  nappi.onclick = function () {
    if (raahaus.tehty) return;   /* raahauksen jattama click */
    valitseAukko(i);
  };
  return nappi;
}

function sulkuNappi(merkki, ryhma) {
  const s = document.createElement('button');
  s.className = 'sulku';
  s.textContent = merkki;
  s.title = t('sulut.poista');
  s.onclick = function () { poistaRyhma(ryhma); };
  return s;
}

function piirraLauseke() {
  /* ⚠️ Laskumerkit ovat piilossa valintavaiheessa. Marko 8.9.2026:
   * *"turha on näyttää noita laskutoimitusnappejakaan koko aikaa, koska
   * niitä painellaan vasta sitten kun on pizzaa painettu."* */
  document.getElementById('laskuAlue').hidden = (tila.vaihe !== 'selitys');
  /* Vaihe merkitaan ruutuun, jotta asettelu voi olla eri: lausekevaiheessa
   * kortit vasemmalle ja laskutoimitukset oikeaan laitaan isoina, seka
   * pisteet ja pakkalaskurit pois — silloin ruudun ainoa tehtava on
   * painaa oikeat merkit. */
  document.getElementById('peliRuutu').classList.toggle('selitys', tila.vaihe === 'selitys');

  /* ⚠️ Logaritmivihje poistui pelinäkymästä kun näkymästä poistettiin kaikki
   * teksti (kieliriippumattomuus). Se on yhä Ohje-paneelissa, jossa se saa
   * olla kielisidonnainen. */

  const selitysvaihe = tila.vaihe === 'selitys' && tila.merkit.length > 0 && !tila.lukossa;
  [].forEach.call(document.querySelectorAll('#operaattorit .op[data-op]'), function (n) {
    /* Kielletty laskutoimitus PIILOTETAAN eikä himmennetä: himmeä painike
     * kertoo "et voi juuri nyt", piilotettu kertoo "tätä ei tässä pelissä ole". */
    n.hidden = !sallittu(n.dataset.op);
    n.disabled = !selitysvaihe || !!tila.ryhmitysKesken;
  });
  const sulut = document.getElementById('sulut');
  sulut.hidden = !tila.sallitut.sulut;
  sulut.disabled = !selitysvaihe || tila.valitut.length < 3;
  sulut.classList.toggle('kesken', !!tila.ryhmitysKesken);
  /* ⚠️ YLAKULMAN NUOLI ON KAKSI NAPPIA VAIHEEN MUKAAN (Marko 9.9.2026:
   * "ylakulman nuolinappi voisi olla looginen pausenapin paikka").
   * Lausekevaiheessa siina EI voi olla taukoa — kello kay ja kortit ovat
   * pelissa — ja juuri silloin tarvitaan peruminen. Muulloin peruttavaa
   * ei ole, ja sama kulma on vapaa tauolle. Yksi nappi, kaksi merkitysta,
   * eika kumpikaan ole koskaan yhta aikaa tarpeen. */
  const alustaNappi = document.getElementById('alusta');
  const selitysvaiheessa = tila.vaihe === 'selitys';
  alustaNappi.innerHTML = selitysvaiheessa ? '\u21B6' : '\u23F8';
  alustaNappi.setAttribute('aria-label',
    t(selitysvaiheessa ? 'palkki.alusta' : 'palkki.tauko'));
  alustaNappi.disabled = selitysvaiheessa
    ? (!tila.valitut.length || tila.lukossa)
    : !saakoPitaaTauon();
}

/* Pelaajanapit. Rakennetaan uudelleen vain kun pelaajamaara muuttuu —
 * muuten tama vaihtaisi napit alleen kesken painalluksen. */
/* ⚠️ PISTEET OVAT MOLEMMISSA PELIMUODOISSA SAMASSA RIVISSA RUUDUN
 * ALALAIDASSA (Marko 10.9.2026): "Yksinpelissa apinaa vastaan pisteet
 * nakyy ylhaalla (ahtaasti), kun taas moninpelissa pisteet on alhaalla."
 *
 * Sama tieto kahdessa eri paikassa riippuen pelimuodosta on juuri se
 * kuvio jossa korjaus osuu yhteen ja toinen jaa. Nyt laatikko on yksi
 * komponentti (.pelaajanappi) ja rivi yksi (#pelaajarivi); ero on vain
 * siina onko laatikko painettava.
 *
 * ⚠️ Laatikot ovat SAMANKOKOISET vaikka vain toisessa on apinan kuva.
 * Koko tulee flexista (`flex:1 1 0` + venyva korkeus), ei sisallosta —
 * sisallosta laskettu koko tekisi kuvattomasta laatikosta matalamman. */
function laatikkoRivi() {
  /* Yhteispelissä omalla laitteella: omat kokonaispisteet palvelimelta. */
  if (tila.verkko) {
    return [{ avain: 'oma', luokka: 'p-oma', kuva: false,
      pisteet: tila.omatPisteet, aria: t('pisteet.omat') }];
  }
  if (tila.moninpeli) {
    const lista = [];
    for (let i = 0; i < tila.pelaajia; i++) {
      lista.push({ avain: 'p' + i, luokka: '', vari: PELAAJAVARIT[i], kuva: true,
        pisteet: tila.pisteet[i], aria: t('pelaaja.nappi', { n: i + 1 }),
        painettava: true, indeksi: i });
    }
    return lista;
  }
  return [
    { avain: 'oma', luokka: 'p-oma', kuva: false,
      pisteet: tila.omatPisteet, aria: t('pisteet.omat') },
    { avain: 'apina', luokka: 'p-apina', kuva: true,
      pisteet: tila.apinanPisteet, aria: t('palkki.apinanPisteet') },
  ];
}

function piirraPelaajat() {
  const rivi = document.getElementById('pelaajarivi');
  if (!rivi) return;
  /* ⚠️ Rivi on HTML:ssa `hidden`, jottei se valahda ruudulle ennen kuin
   * JS on tayttanyt sen. Se on siis avattava TAALLA — ja kun poistin
   * vanhan `rivi.hidden = !tila.moninpeli` -rivin, unohdin korvata sen:
   * laatikot renderoityivat oikein mutta olivat 0 x 0 eika mitaan
   * nakynyt. Mikaan ei kaatunut, ja oma kokotarkistukseni LAPAISI —
   * koska nolla on yhta suuri kuin nolla. */
  rivi.hidden = false;
  const lista = laatikkoRivi();
  /* ⚠️ Tunniste sisaltaa PELIMUODON eika vain maaran: yksinpelissa ja
   * kahden pelaajan pelissa on molemmissa kaksi laatikkoa, ja pelkka
   * maara jattaisi rivin rakentamatta pelimuodon vaihtuessa. */
  const tunniste = (tila.moninpeli ? 'moni' : 'yksin') + lista.length;
  if (rivi.dataset.tila !== tunniste) {
    rivi.dataset.tila = tunniste;
    rivi.innerHTML = '';
    lista.forEach(function (v) {
      const el = document.createElement(v.painettava ? 'button' : 'div');
      el.className = 'pelaajanappi' + (v.luokka ? ' ' + v.luokka : '');
      if (v.vari) el.style.setProperty('--pelaaja-vari', v.vari);
      if (!v.kuva) el.className += ' ei-kuvaa';
      el.setAttribute('aria-label', v.aria);
      el.innerHTML =
        (v.kuva ? '<img src="kuvat/apina.webp?v=20260910a" alt="">' : '') +
        '<b class="pelaajanappi-pisteet">0</b>' +
        (v.painettava ? '<span class="pelaajanappi-kello"></span>' : '');
      if (v.painettava) {
        el.onclick = (function (n) { return function () { varaaVuoro(n); }; })(v.indeksi);
      }
      rivi.appendChild(el);
    });
  }
  [].forEach.call(rivi.children, function (el, i) {
    const v = lista[i];
    el.querySelector('.pelaajanappi-pisteet').textContent = v.pisteet;
    el.setAttribute('aria-label', v.aria + ': ' + v.pisteet);
    if (!v.painettava) return;
    const ulkona = tila.lukitut.indexOf(v.indeksi) >= 0;
    el.classList.toggle('vuorossa', tila.vuorossa === v.indeksi);
    el.classList.toggle('ulkona', ulkona);
    /* Nappi on poissa kaytosta kun joku muu on jo varannut, kun pelaaja on
     * jo yrittanyt, tai kun ei olla valintavaiheessa. Se on se sama tieto
     * jonka pelaaja nakee varista — ja estaa toisen varauksen paalle. */
    el.disabled = ulkona || tila.lukossa || tila.vaihe !== 'valinta' ||
      (tila.vuorossa !== null && tila.vuorossa !== v.indeksi);
  });
}

function piirraPisteet() {
  /* ⚠️ Palkissa EI ole enaa pistelaatikoita, joten tassa ei myoskaan
   * kirjoiteta niihin. Jos ne joskus palaavat, kirjoitus palaa tanne —
   * mutta kirjoitus elementtiin jota ei ole heittaisi ja TAPPAISI kaiken
   * taman jalkeisen (sama vika joka tyhjensi play-nakyman Norsussa). */
  piirraPelaajat();
  /* Taytepakka palkkina: yksi siru per jaljella oleva kortti. Rivi
   * lyhenee jaon mukana, eika lukua tarvita. Piirretaan vain kun maara
   * muuttuu — muuten tama ajaisi 48 elementtia joka piirrolla. */
  /* ⚠️ Taytepakka on PINO eika palkki (Markon tarkennus 9.9.2026):
   * vierekkaiset viivat eivat lue korttipinona. Nyt kortit ovat
   * paallekkain vinottain, jolloin PINON PAKSUUS kertoo maaran ja
   * pino vie murto-osan siita tilasta jonka rivi vei. */
  const palkki = document.getElementById('taytepalkki');
  const n = tila.taytteet.length;
  if (palkki && palkki.dataset.maara !== String(n)) {
    palkki.dataset.maara = String(n);
    palkki.innerHTML = '';
    const pino = document.createElement('div');
    pino.className = 'pino';
    /* Askel per kortti: taysi pakka (48) saa noin 19 px paksuutta, ja
     * viimeiset kortit erottuvat yha koska askel ei riipu maarasta. */
    const askel = 0.42;
    const nousu = 0.34;                       /* pystysiirto per kortti */
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'siru';
      /* ⚠️ bottom eika negatiivinen top: nain kortit kasvavat pinon
       * SISALLA ylospain eivatka sen ulkopuolelle. Aiemmin ylin kortti
       * oli 6,7 px laatikon ylapuolella ja leikkautui (Markon havainto
       * 9.9.2026). */
      s.style.left = (i * askel).toFixed(2) + 'px';
      s.style.bottom = (i * askel * nousu).toFixed(2) + 'px';
      pino.appendChild(s);
    }
    pino.style.width = (20 + (n - 1) * askel).toFixed(1) + 'px';
    pino.style.height = (30 + (n - 1) * askel * nousu).toFixed(1) + 'px';
    palkki.appendChild(pino);
  }
}

/* Välähdys on kuva ja numeroita, ei lausetta. Apinan voitosta näytetään sen
 * oma lasku — se on pelkkiä numeroita ja merkkejä, siis kieliriippumaton,
 * ja se on pelin opetuspuoli. */
function valahda(kenen, sisalto) {
  const v = document.getElementById('valahdys');
  v.innerHTML = sisalto;
  v.className = 'valahdys nakyy ' + kenen;
  setTimeout(function () { v.className = 'valahdys'; }, 900);
}

function apinanKuva() {
  return '<img class="valahdys-apina" src="kuvat/apina.webp?v=20260910a" alt="">';
}

/* ============================================================
 * X-KORTIN VALINTA: KORTTI JONKA X KORVAA (Marko 13.9.2026)
 *
 * *"Onko mahdollista, että numerovalinta ikäänkuin avautuisi X-kortista?"* ·
 * *"sen sijaan, että pelaaja valitsee numeroa, niin hän valitseekin kortin,
 * jonka X-kortti korvaa."*
 *
 * Avataan kahdesta paikasta: yhteispelissä heti kun fantasiakortti valitaan
 * (valitseKortti) ja aina korttia napauttamalla selitysvaiheessa.
 * ============================================================ */
const FANTASIA_REUNA = 12;
const FANTASIA_PEHMUSTE = 10;        /* sama kuin .fantasia-paneeli padding */
const FANTASIA_RAKO = 6;             /* sama kuin .fantasia-kortit gap */
const FANTASIA_OTSIKKO = 26;         /* otsikon rivi + marginaali */
const FANTASIA_NUMERO = 19;          /* numerorivi kortin alla */
const FANTASIA_NUMERORAJA = 80;      /* tätä kapeammalla kortilla numero näkyviin */
const FANTASIA_LEVEIN = 110;

/* Paneelin paikka ja korttien koko pizzasta: pystyssä pizzan alle, vaakatasossa
 * viereen. Viisi saraketta ja kaksi riviä molemmissa; koko valitaan niin että
 * se mahtuu sekä leveyteen että korkeuteen. */
function sijoitaFantasiaValitsin() {
  const paneeli = document.getElementById('fantasiaPaneeli');
  const p = document.getElementById('pizzaKortti').getBoundingClientRect();
  const vw = innerWidth, vh = innerHeight, R = FANTASIA_REUNA;
  const vaaka = vw > vh;
  const alue = vaaka
    ? { l: p.right + R, t: R, w: vw - p.right - 2 * R, h: vh - 2 * R }
    : { l: R, t: p.bottom + R, w: vw - 2 * R, h: vh - p.bottom - 2 * R };
  const leveydesta = (alue.w - 2 * FANTASIA_PEHMUSTE - 4 * FANTASIA_RAKO) / 5;
  const korkeudesta = function (numerot) {
    const rivi = (alue.h - 2 * FANTASIA_PEHMUSTE - FANTASIA_OTSIKKO - FANTASIA_RAKO) / 2 -
      (numerot ? FANTASIA_NUMERO : 0);
    return rivi * 349 / 531;           /* --kortti-suhde */
  };
  let lev = Math.min(leveydesta, korkeudesta(false), FANTASIA_LEVEIN);
  const numerot = lev < FANTASIA_NUMERORAJA;
  if (numerot) lev = Math.min(lev, korkeudesta(true));
  lev = Math.floor(lev);
  paneeli.style.setProperty('--fv-lev', lev + 'px');
  paneeli.classList.toggle('numerot', numerot);
  const leveys = 5 * lev + 4 * FANTASIA_RAKO + 2 * FANTASIA_PEHMUSTE;
  paneeli.style.width = leveys + 'px';
  paneeli.style.left = Math.round(alue.l + (alue.w - leveys) / 2) + 'px';
  const korkeus = paneeli.offsetHeight;
  paneeli.style.top = Math.round(vaaka ? alue.t + (alue.h - korkeus) / 2 : alue.t) + 'px';
}

function kysyFantasianArvo(kortti) {
  const kortit = document.getElementById('fantasiaKortit');
  kortit.innerHTML = '';
  for (let v = 1; v <= 10; v++) {
    const nappi = document.createElement('button');
    nappi.type = 'button';
    nappi.className = 'fantasia-vaihtoehto' + (kortti.arvo === v ? ' valittu' : '');
    nappi.setAttribute('aria-label', t('tayte.alt', { nimi: t('tayte.' + v), arvo: v }));
    nappi.innerHTML = '<img src="kuvat/tayte-' + v + '.webp" alt="">' +
      '<span class="fantasia-numero" aria-hidden="true">' + v + '</span>';
    nappi.onclick = function () {
      kortti.arvo = v;
      suljeFantasia();
      /* ⚠️ VAIN SELITYSVAIHEESSA TARKISTETAAN. `tarkistaLasku` ei kysy
       * vaihetta vaan pelkkää lukitusta, ja `lausekeValmis` on tosi myös
       * yhdellä kortilla ilman merkkejä — valintavaiheessa avattu valinta
       * olisi siis LÄHETTÄNYT vastauksen yhdellä kortilla heti kun arvo
       * napautetaan. Löytyi koodista ennen ensimmäistä testiä. */
      if (tila.vaihe === 'selitys') paivitaJaTarkista();
      else piirraKaikki();
    };
    kortit.appendChild(nappi);
  }
  const valitsin = document.getElementById('fantasiaValitsin');
  valitsin.hidden = false;
  sijoitaFantasiaValitsin();
  /* Valinta KASVAA ESIIN X-KORTISTA: sama paikka jota pelaaja juuri
   * kosketti, joten katse ei hyppää. Ilman liikettä jos käyttäjä on
   * pyytänyt vähemmän liikettä. */
  const lahde = [].filter.call(document.querySelectorAll('.tayte-kortti'),
    function (b) { return b.__kortti === kortti; })[0];
  const paneeli = document.getElementById('fantasiaPaneeli');
  if (lahde && paneeli.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const a = lahde.getBoundingClientRect(), b = paneeli.getBoundingClientRect();
    paneeli.style.transformOrigin = Math.round(a.left + a.width / 2 - b.left) + 'px ' +
      Math.round(a.top + a.height / 2 - b.top) + 'px';
    paneeli.animate([{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
      { duration: 180, easing: 'ease-out' });
  }
}

function fantasiaAuki() { return !document.getElementById('fantasiaValitsin').hidden; }

function suljeFantasia() { document.getElementById('fantasiaValitsin').hidden = true; }

/* Tulosruutu on kaksi lukua ja apinan naama — ei otsikkoa eikä selitystä.
 * ⚠️ Päättymissyy oli tekstiä ja se poistui: se oli hyödyllinen mutta
 * kielisidonnainen, ja kierroksen päättyminen näkyy jo siitä että pakat
 * ovat tyhjät. Jos syy halutaan takaisin, se kuuluu Ohje-paneeliin. */
/* ⚠️ YKSI LAHDE MOLEMMILLE PELIMUODOILLE. Erillinen moninpelin tulosruutu
 * olisi toinen paikka johon sama korjaus pitaisi muistaa tehda. */
function piirraTulos() {
  const sailio = document.getElementById('tulosPisteet');
  if (!sailio) return;
  sailio.innerHTML = '';
  const rivit = tila.moninpeli
    ? tila.pisteet.map(function (pisteet, i) {
        return { pisteet: pisteet, vari: PELAAJAVARIT[i],
                 nimi: t('pelaaja.nimi', { n: i + 1 }) };
      })
    : [{ pisteet: tila.omatPisteet, luokka: 'oma' },
       { pisteet: tila.apinanPisteet, luokka: 'apina', apina: true }];
  const paras = rivit.reduce(function (m, r) { return Math.max(m, r.pisteet); }, -1);
  /* Korkein pistemaara korostetaan. Jos useampi on tasoissa, korostetaan
   * kaikki — tasapeli on tulos eika puuttuva voittaja. */
  rivit.forEach(function (r) {
    const laatikko = document.createElement('div');
    laatikko.className = 'pisteet iso ' + (r.luokka || 'pelaaja') +
      (r.pisteet === paras ? ' voittaja' : '');
    if (r.vari) laatikko.style.setProperty('--pelaaja-vari', r.vari);
    laatikko.innerHTML =
      (r.apina || r.vari ? '<img src="kuvat/apina.webp?v=20260910a" alt="">' : '') +
      '<b>' + r.pisteet + '</b>';
    if (r.nimi) laatikko.setAttribute('aria-label', r.nimi + ': ' + r.pisteet);
    sailio.appendChild(laatikko);
  });
}

/* ---------- käynnistys ---------- */

function kytke() {
  /* ⚠️ JARJESTYS: asetukset ensin, kaannos sitten, vasta sitten piirto.
   * Toisin pain sivu piirtyisi oletuskielella ja vaihtuisi silmissa. */
  lataaAsetukset();
  kaannaSivu();

  const virheet = tarkista();
  if (virheet.length) {
    /* Pakka on generoitu. Jos generointi on rikki, se on rikki hiljaa —
     * siksi virhe sanotaan ääneen eikä peliä käynnistetä. */
    document.getElementById('peliRuutu').innerHTML =
      '<p class="virhe">' + t('virhe.pakka') + '<br>' + virheet.join('<br>') + '</p>';
    return;
  }

  /* ============================================================
   * ASETUKSET — VALIKKO JA OMAT SIVUT (Markon linjaus 9.9.2026)
   *
   * ⚠️ Ei yhta pitkaa listaa vaan valikko, josta jokainen kohta avautuu
   * omaksi sivukseen. Ja ⚠️ SIVULLA EI OLE SELITTAVAA TEKSTIA: jokainen
   * selitys on i-napin takana. Perustelu on mitattu tarve eika maku —
   * teksti jota ei lueta vie tilan silta valinnalta jota ollaan tekemassa.
   *
   * Valikkorivi nayttaa VALITUN ARVON. Se korvaa suurimman osan entisesta
   * selitystekstista: pelaaja nakee mika on valittuna avaamatta sivua.
   * ============================================================ */
  const asetus = document.getElementById('asetusPeite');
  const laatikko = asetus.querySelector('.asetus-laatikko');
  const sivut = [].slice.call(asetus.querySelectorAll('.as-sivu'));

  function naytaSivu(nimi) {
    sivut.forEach(function (s) { s.hidden = s.dataset.sivu !== nimi; });
    /* Selite sulkeutuu sivua vaihdettaessa: i-nappi on kysymys, ei tila. */
    [].forEach.call(asetus.querySelectorAll('.as-selite'), function (n) { n.hidden = true; });
    [].forEach.call(asetus.querySelectorAll('.as-info'), function (n) { n.classList.remove('auki'); });
    laatikko.scrollTop = 0;
  }

  function lupamerkit() {
    const m = { kerto: '\u00D7', jako: '\u00F7', potenssi: 'x\u02B8', log: 'log', sulut: '( )' };
    return ['+', '\u2212'].concat(
      Object.keys(m).filter(function (k) { return tila.sallitut[k]; })
        .map(function (k) { return m[k]; })).join(' ');
  }

  function paivitaArvot() {
    document.getElementById('arvoKieli').textContent = kielenNimi(KIELI);
    document.getElementById('arvoTaso').textContent = t('taso.' + tila.taso.avain);
    document.getElementById('arvoPelaajat').textContent = tila.pelaajia < 2
      ? t('pelaajat.yksin') : t('pelaajat.monta', { n: tila.pelaajia });
    document.getElementById('arvoTapa').textContent =
      t(tila.apinanTapa ? 'tapa.vaikea' : 'tapa.helppo');
    document.getElementById('arvoLuvat').textContent = lupamerkit();
    document.getElementById('arvoAjat').textContent =
      aikaTekstina(valintaAika()) + ' \u00B7 ' + aikaTekstina(lausekeAika());
    document.getElementById('arvoValinta').textContent = aikaTekstina(valintaAika());
    document.getElementById('arvoLauseke').textContent = aikaTekstina(lausekeAika());
    [].forEach.call(document.querySelectorAll('.as-askel[data-aika]'), function (n) {
      const nyt = haeAika(n.dataset.aika);
      const suunta = Number(n.dataset.askel);
      /* Nappi himmenee rajalla: se kertoo etta raja on olemassa, kun taas
       * napin katoaminen jattaisi pelaajan ihmettelemaan minne se meni. */
      n.disabled = suunta < 0 ? nyt <= AIKA_RAJAT.alin : nyt >= AIKA_RAJAT.ylin;
    });
  }

  /* Yksi valintarivin rakentaja kolmelle listalle. Kolme erillista olisi
   * kolme paikkaa joihin sama korjaus pitaisi muistaa tehda. */
  function rakennaLista(sailio, vaihtoehdot, onValittu, valitse) {
    sailio.innerHTML = '';
    vaihtoehdot.forEach(function (v) {
      const nappi = document.createElement('button');
      nappi.className = 'as-valinta' + (onValittu(v) ? ' valittu' : '');
      nappi.innerHTML = '<b>' + v.nimi + '</b>' +
        (v.kuvaus ? '<small>' + v.kuvaus + '</small>' : '');
      if (v.poissa) {
        nappi.disabled = true;
      } else {
        nappi.onclick = function () { valitse(v); tallennaAsetukset(); piirraAsetukset(); };
      }
      sailio.appendChild(nappi);
    });
  }

  function piirraAsetukset() {
    rakennaLista(document.getElementById('kielet'),
      valmiitKielet().map(function (k) { return { avain: k, nimi: kielenNimi(k) }; }),
      function (v) { return v.avain === KIELI; },
      function (v) { KIELI = v.avain; kaannaSivu(); piirraKaikki(); });

    rakennaLista(document.getElementById('tasot'),
      TASOT.map(function (x) {
        return { taso: x, nimi: t('taso.' + x.avain), kuvaus: t('taso.' + x.avain + '.k') };
      }),
      function (v) { return v.taso.avain === tila.taso.avain; },
      function (v) { tila.taso = v.taso; });

    rakennaLista(document.getElementById('pelaajat'),
      [1, 2, 3, 4].map(function (n) {
        return { maara: n,
          nimi: n < 2 ? t('pelaajat.yksin') : t('pelaajat.monta', { n: n }) };
      }),
      function (v) { return v.maara === tila.pelaajia; },
      function (v) { tila.pelaajia = v.maara; });

    [].forEach.call(document.querySelectorAll('#tavat .as-valinta'), function (nappi) {
      nappi.classList.toggle('valittu',
        (nappi.dataset.tapa === 'vaikea') === tila.apinanTapa);
    });

    [].forEach.call(document.querySelectorAll('#sallitut input[data-lupa]'), function (n) {
      n.checked = !!tila.sallitut[n.dataset.lupa];
    });

    paivitaArvot();
  }

  /* ⚠️ KYTKENNAT ERILLAAN PIIRROSTA, JA KERRAN. Nama olivat 9.9.2026
   * `piirraAsetukset`in sisalla, ja siita seurasi kaksi asiaa: napit olivat
   * KYTKEMATTA kunnes paneeli avattiin ensimmaisen kerran, ja ne kytkettiin
   * uudelleen joka ainoalla piirrolla. Kytkentavahti loysi taman heti
   * ensimmaisella ajolla — se on tasan se vika jota vastaan se rakennettiin.
   *
   * `rakennaLista` saa yha kytkea itse: se LUO nappinsa joka kerralla, joten
   * kytkenta kuuluu luontiin. Nama ovat pysyvia elementteja. */
  [].forEach.call(document.querySelectorAll('#tavat .as-valinta'), function (nappi) {
    nappi.onclick = function () {
      tila.apinanTapa = nappi.dataset.tapa === 'vaikea';
      tallennaAsetukset(); piirraAsetukset();
    };
  });
  [].forEach.call(document.querySelectorAll('#sallitut input[data-lupa]'), function (n) {
    n.onchange = function () {
      tila.sallitut[n.dataset.lupa] = n.checked; tallennaAsetukset(); paivitaArvot();
    };
  });
  [].forEach.call(document.querySelectorAll('.as-askel[data-aika]'), function (n) {
    n.onclick = function () {
      asetaAika(n.dataset.aika,
        haeAika(n.dataset.aika) + Number(n.dataset.askel) * AIKA_RAJAT.askel);
      tallennaAsetukset(); piirraAsetukset();
    };
  });
  document.getElementById('ajatOletus').onclick = function () {
    asetaAika('valinta', AIKA_OLETUS.valinta);
    asetaAika('lauseke', AIKA_OLETUS.lauseke);
    tallennaAsetukset(); piirraAsetukset();
  };

  [].forEach.call(asetus.querySelectorAll('.as-rivi[data-avaa]'), function (n) {
    n.onclick = function () { naytaSivu(n.dataset.avaa); };
  });
  [].forEach.call(asetus.querySelectorAll('.as-takaisin'), function (n) {
    n.onclick = function () { naytaSivu('valikko'); };
  });
  /* i-nappi: selite nakyviin ja pois. Sivulla se ei ole. */
  [].forEach.call(asetus.querySelectorAll('.as-info'), function (n) {
    n.onclick = function () {
      const selite = n.closest('.as-sivu').querySelector('.as-selite');
      if (!selite) return;
      selite.hidden = !selite.hidden;
      n.classList.toggle('auki', !selite.hidden);
    };
  });

  document.getElementById('asetuksetAuki').onclick = function () {
    naytaSivu('valikko'); piirraAsetukset(); asetus.hidden = false;
  };
  function suljeAsetukset() {
    asetus.hidden = true;
    /* Taso ja tapa vaikuttavat jakoon, joten lepotilassa jaetaan uudelleen.
     * Kesken kierroksen ei kosketa mihinkaan. */
    if (tila.vaihe === 'lepo') return void aloitaPeli(tila.taso, tila.apinanTapa);
    /* ⚠️ PELAAJAMAARA ON POIKKEUS, ja se on mitattu tarve. Ilman tata
     * "4 pelaajaa" nakyi valikossa mutta peli jatkui yksinpelina: napit
     * puuttuivat, apinalla oli yha kasi. Valinta joka nayttaa menneen
     * perille muttei mennyt on pahempi kuin valinta jota ei voi tehda.
     *
     * Muut asetukset voivat odottaa seuraavaa jakoa, tama ei: pelaajien
     * MAARAN muuttaminen on uuden pelin aloittaminen. Pisteet ovat
     * pelaajakohtaisia eika niita voi jakaa uudelleen kesken kaiken. */
    if (tila.pelaajia !== tila.pelaajiaKaynnissa) {
      aloitaPeli(tila.taso, tila.apinanTapa);
    }
  }
  document.getElementById('asetusKiinni').onclick = suljeAsetukset;
  asetus.onclick = suljeAsetukset;

  /* ⚠️ LASKUMERKKIEN KYTKENTA. Nama katosivat 9.9.2026 kun asetuslohko
   * kirjoitettiin uusiksi: korvasin lohkon alku- ja loppuankkurin valista
   * LUKEMATTA mita valissa muuta oli, ja operaattorien seka sulkunapin
   * kytkenta sattui olemaan siina. Mikaan ei kaatunut — napit olivat
   * ruudulla, piirtyivat oikein ja piiloutuivat sallittujen mukaan. Ne
   * eivat vain tehneet mitaan, eika pelia voinut pelata loppuun.
   *
   * Sama vikaluokka kuin Norsun "markup ja logiikka siirtyvat, kytkenta ei":
   * kuollut nappi ei ole syntaksivirhe eika nay yhdessakaan tarkistimessa.
   * Siksi alla on `tarkistaKytkennat()`, joka kysyy sen mita mikaan
   * tarkistin ei kysy: onko jokaisella painettavalla napilla kasittelija. */
  [].forEach.call(document.querySelectorAll('#operaattorit .op[data-op]'), function (n) {
    n.onclick = function () {
      if (raahaus.tehty) return;   /* raahauksen jattama click */
      asetaMerkki(n.dataset.op);
    };
  });
  document.getElementById('sulut').onclick = aloitaRyhmitys;

  document.getElementById('alusta').onclick = function () {
    if (tila.vaihe === 'selitys') return palautaKortit();
    pysaytaPeli();
  };
  const tauko = document.getElementById('taukoPeite');
  document.getElementById('jatka').onclick = jatkaPelia;
  tauko.onclick = jatkaPelia;
  document.getElementById('alustaPeli').onclick = function () {
    tila.tauko = null;
    tauko.hidden = true;
    aloitaPeli(tila.taso, tila.apinanTapa);
  };
  document.getElementById('pizzaKortti').onclick = pelaaPizzalle;
  /* ⚠️ Delegointi #kasi-elementtiin, ei yksittaisiin kortteihin: kortit
   * piirretaan uudelleen joka muutoksella, mutta #kasi sailyy. */
  document.getElementById('kasi').addEventListener('pointerdown', raahausAlku);
  /* Laskumerkit raahataan aukkoihin — sama koneisto, eri laji. */
  document.getElementById('operaattorit').addEventListener('pointerdown', raahausAlku);
  document.getElementById('fantasiaTausta').onclick = suljeFantasia;
  /* Kääntö tai ikkunan koon muutos valinnan ollessa auki: paneeli pizzan mukana. */
  window.addEventListener('resize', function () { if (fantasiaAuki()) sijoitaFantasiaValitsin(); });
  /* ⚠️ Ohita-nappi poistettiin: pizzan painallus tyhjalla valinnalla
   * hoitaa saman. Kytkenta on null-suojattu eika poistettu, jottei tama
   * rivi heittaisi ja tappaisi kaikkea sen jalkeista kytkentaa. */
  const ohitaNappi = document.getElementById('ohita');
  if (ohitaNappi) ohitaNappi.onclick = enOsaa;
  /* ⚠️ Lopeta-nappi poistettiin peliruudusta (Marko 9.9.2026). Kytkenta
   * on null-suojattu eika poistettu: ilman suojaa tama rivi heittaisi ja
   * TAPPAISI kaiken sen jalkeisen kytkennan — sama vika joka tyhjensi
   * play-nakyman Norsussa. Escape lopettaa yha nappaimistolla. */
  const lopetaNappi = document.getElementById('lopeta');
  if (lopetaNappi) lopetaNappi.onclick = lopetaKesken;

  document.getElementById('uudelleen').onclick = function () {
    aloitaPeli(tila.taso, tila.apinanTapa);
  };
  document.getElementById('asetuksiin').onclick = function () {
    naytaSivu('valikko'); piirraAsetukset(); asetus.hidden = false;
  };

  /* ⚠️ Peli on lepotilassa heti latauksesta: yksi ruutu, jossa kortit
   * odottavat kaannettavaksi. Aloitusnappia ei ole. */
  aloitaPeli(tila.taso, tila.apinanTapa);

  /* Näppäimistöllä Esc on se mitä ihminen kokeilee ensin. */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    /* Esc sulkee X-kortin valinnan eikä lopeta peliä sen alta. */
    if (fantasiaAuki()) return void suljeFantasia();
    if (!document.getElementById('taukoPeite').hidden) return void jatkaPelia();
    /* ⚠️ Ohje on nyt asetusvalikon sivu eika oma peitteensa. Escape
     * peruuttaa sivulta valikkoon ja vasta valikosta ulos — muuten se
     * hyppaisi kahden askeleen yli. */
    const as = document.getElementById('asetusPeite');
    if (!as.hidden) {
      const auki = as.querySelector('.as-sivu:not([hidden])');
      if (auki && auki.dataset.sivu !== 'valikko') return void naytaSivu('valikko');
      return void suljeAsetukset();
    }
    if (tila.kaynnissa) lopetaKesken();
  });
}

/* ============================================================
 * ASETUSTEN TALLENNUS
 *
 * ⚠️ Mitattu 9.9.2026: pelissa ei ollut yhtaan localStorage-kutsua, eli
 * mikaan asetus ei sailynyt uudelleenlatauksessa. Kielivalinta joka
 * nollautuu joka latauksella olisi rikki jo syntyessaan, joten tama ei
 * ole lisapyynto vaan ehto silla etta kielivalinta toimii.
 *
 * ⚠️ Luku JA kirjoitus try/catchissa: yksityisessa selauksessa
 * localStorage heittaa jo kaytettaessa. Peli ei saa kaatua siihen etta
 * asetusta ei voi muistaa.
 * ============================================================ */
const ASETUSAVAIN = 'pizzapeli-asetukset';

function tallennaAsetukset() {
  try {
    localStorage.setItem(ASETUSAVAIN, JSON.stringify({
      kieli: KIELI,
      taso: tila.taso.avain,
      pelaajia: tila.pelaajia,
      apinanTapa: tila.apinanTapa,
      sallitut: tila.sallitut,
      valintaAika: valintaAika(),
      lausekeAika: lausekeAika(),
    }));
  } catch (e) { /* yksityinen selaus: asetus jaa muistiin vain istunnoksi */ }
}

function lataaAsetukset() {
  /* ⚠️ ENNEN tallennettujen arvojen lukemista: sen jalkeen CSS-muuttuja on
   * ylikirjoitettu inline-tyylilla eika oletusta enaa nay. */
  lueAikaOletukset();
  let a = null;
  try { a = JSON.parse(localStorage.getItem(ASETUSAVAIN) || 'null'); } catch (e) { a = null; }
  if (!a) return;
  /* ⚠️ Jokainen arvo tarkistetaan. Tallennettu arvo on ulkoista syotetta:
   * se voi olla vanhasta versiosta, kasin muokattu tai puolittain
   * kirjoitettu, ja tuntematon taso kaataisi pelin heti. */
  if (KIELET[a.kieli] && KIELET[a.kieli].valmis) KIELI = a.kieli;
  const taso = TASOT.filter(function (x) { return x.avain === a.taso; })[0];
  if (taso) tila.taso = taso;
  if (a.pelaajia >= 1 && a.pelaajia <= 4) tila.pelaajia = a.pelaajia | 0;
  if (typeof a.apinanTapa === 'boolean') tila.apinanTapa = a.apinanTapa;
  if (a.sallitut) {
    Object.keys(tila.sallitut).forEach(function (k) {
      if (typeof a.sallitut[k] === 'boolean') tila.sallitut[k] = a.sallitut[k];
    });
  }
  /* asetaAika rajaa arvon itse, joten tallennettu roska ei paase lapi. */
  if (typeof a.valintaAika === 'number') asetaAika('valinta', a.valintaAika);
  if (typeof a.lausekeAika === 'number') asetaAika('lauseke', a.lausekeAika);
}

/* ⚠️ KYTKENTAVAHTI. Kuollut nappi on tassa projektissa jo kaatanut pelin
 * kahdesti: kerran Norsussa (poistettu id + onclick heitti ja tappoi kaiken
 * sen jalkeisen kytkennan) ja kerran tassa (kytkenta katosi lohkon
 * korvauksessa). Kummassakaan ei ollut syntaksivirhetta eika konsolivirhetta.
 *
 * Tama ei ole tarkistin vaan vahti: se ajetaan joka latauksessa ja se
 * SANOO AANEEN jos jokin pelin nappi jai ilman kasittelijaa. Konsolissa
 * naky on halpa; hiljainen kuollut nappi ei ole. */
function tarkistaKytkennat() {
  const vaaditut = ['#operaattorit .op[data-op]', '#sulut', '#pizzaKortti',
    '#alusta', '#asetuksetAuki', '#asetusKiinni', '#uudelleen', '#asetuksiin',
    '#jatka', '#alustaPeli', '.as-askel[data-aika]', '#ajatOletus'];
  /* Peittotarkistus koskee vain sita mita pelin aikana painetaan — ei
   * asetuspaneelin nappeja, jotka ovat peitteen alla tarkoituksella. */
  const kohteet = '#operaattorit .op:not([hidden]), .aukko, #pizzaKortti, .pelaajanappi';
  const kuolleet = [];
  vaaditut.forEach(function (valitsin) {
    const osumat = document.querySelectorAll(valitsin);
    if (!osumat.length) return void kuolleet.push(valitsin + ' (ei elementtia)');
    [].forEach.call(osumat, function (n) {
      /* ⚠️ Nimea ELEMENTTI, ala valitsinta. Ensimmainen versio kertoi vain
       * valitsimen, ja kuudesta napista tieto "jokin naista" ei kertonut
       * mitaan — jouduin etsimaan sen kasin. Vahti joka ei nimea kohdetta
       * siirtaa tyon lukijalle. */
      if (typeof n.onclick !== 'function') {
        kuolleet.push(valitsin + ' → ' + (n.dataset.op || n.id || n.className) +
          ' (ei onclickia)');
      }
    });
  });
  /* ⚠️ JA TOINEN KYSYMYS, JOTA VAHTI EI ENNEN KYSYNYT: onko nappi
   * PEITOSSA? Kytketty nappi jonka paalla on jotain muuta on yhta
   * kuollut kuin kytkematon — ja hiljaisempi, koska koodi on oikein.
   *
   * Mitattu 10.9.2026: ylapalkki (`position:absolute`) peitti nelja
   * viidesta laskumerkista lausekevaiheessa. Napin KESKIKOHTA osui
   * palkkiin, joten merkkia joutui painamaan kahdesti — alaosaan.
   * Syntaksi oli virheeton, kytkenta paikallaan, konsoli tyhja.
   *
   * `elementFromPoint` kertoo mika on OIKEASTI paallimmaisena — luokka
   * ja tyylit kertovat vain mita koodi aikoi. */
  [].forEach.call(document.querySelectorAll(kohteet), function (n) {
    const b = n.getBoundingClientRect();
    if (b.width < 1 || b.height < 1) return;          // piilossa: ei mitattavaa
    /* ⚠️ NÄKYMÄTÖN EI OLE PEITOSSA — sama sääntö kuin nollakokoisella.
     * Vaakatasossa laskualue on valintavaiheessa `visibility:hidden` eikä
     * `display:none` (tila varataan, jotta käsi ei hyppää). Laskumerkeillä
     * on silloin koko, `elementFromPoint` ohittaa näkymättömän ja palauttaa
     * sen mitä alla on — ja vahti hälytti JOKA vaakatason latauksella.
     * Mitattu 11.9.2026: 844 × 326 → «PEITOSSA: DIV.jaljella», 844 × 390 →
     * «HEADER.palkki» ja «DIV.tyoalue». Lausekevaiheessa samat merkit
     * olivat päällimmäisinä. Luin sen ensin omaksi testivirheekseni.
     * Laskettu tyyli periytyy, joten tämä kattaa myös piilotetun esi-isän. */
    if (getComputedStyle(n).visibility !== 'visible') return;
    const x = b.left + b.width / 2, y = b.top + b.height / 2;
    /* ⚠️ RUUDUN ULKOPUOLTA EI VOI MITATA, EIKA SITA SAA LUKEA PEITOKSI.
     * `elementFromPoint` palauttaa `null` kun piste on nakymän ulkona —
     * ja ensimmainen versio kirjasi sen «PEITOSSA: ei mitaan». Se on
     * vaara halytys, ja vaara halytys opettaa ohittamaan halytykset.
     *
     * `null` tarkoittaa «en voi mitata», ei «peitossa». Ne ovat eri
     * tila, ja jokaisella tilalla on oltava oma tuloksensa. */
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return;
    const paalla = document.elementFromPoint(x, y);
    if (!paalla) return;                              // ei mitattavissa
    if (paalla === n || n.contains(paalla)) return;
    kuolleet.push((n.dataset.op || n.id || n.className) + ' PEITOSSA: ' +
      paalla.tagName + '.' + paalla.className);
  });

  if (kuolleet.length) {
    /* ⚠️ VIESTISSA ON KELLONAIKA, ja syy on mitattu: selaimen konsoli
     * sailyttaa viestit sivunvaihdon yli, joten identtinen halytys nayttaa
     * samalta riippumatta siita onko se talta vai edelliselta lataukselta.
     * Jouduin paattelemaan sen kahdesti — ja paattely on juuri se mita
     * halytyksen ei pitaisi vaatia. */
    console.error('Pizza Party ' + new Date().toLocaleTimeString() +
      ': KYTKEMATTA JAANEET NAPIT →', kuolleet);
  }
  return kuolleet;
}

document.addEventListener('DOMContentLoaded', function () {
  kytke();
  tarkistaKytkennat();
});

/* ============================================================
 * ?mitat=1 — MITTARI LAITTEELLE, EI PÄÄTELMÄ KONEELTA
 *
 * ⚠️ Tämä on olemassa koska selainpalkkien viemää tilaa EI VOI mitata
 * kehittäjän koneelta: siellä ei ole niitä palkkeja. Norsun
 * memory/laitevika.md nimeää sen omaksi vikaluokakseen — seitsemän
 * korjauskierrosta meni hukkaan siksi että mittari ajettiin
 * ympäristössä jossa vikaa ei ole.
 *
 * Yksi kuvakaappaus vastaa suljettuun kysymykseen: mahtuuko, ja jos ei,
 * kuinka monta pikseliä yli ja mistä yksiköstä ero tulee.
 * ============================================================ */
function naytaMitat() {
  const laatikko = document.createElement('div');
  laatikko.id = 'mitat';
  laatikko.style.cssText =
    'position:fixed;left:0;top:0;z-index:99999;max-width:100%;' +
    'font:11px/1.45 ui-monospace,Menlo,monospace;white-space:pre;' +
    'background:rgba(255,255,255,.94);color:#111;padding:6px 8px;' +
    'border:2px solid #E62448;border-radius:0 0 8px 0;pointer-events:none';
  document.body.appendChild(laatikko);

  /* Mitatun yksikön koko: luodaan koe-elementti ja luetaan mitä selain
   * sille antaa. Näin ei tarvitse uskoa siihen mitä yksikön PITÄISI olla. */
  function yksikko(arvo) {
    const p = document.createElement('div');
    p.style.cssText = 'position:absolute;visibility:hidden;width:' + arvo + ';height:' + arvo;
    document.body.appendChild(p);
    const r = p.getBoundingClientRect();
    p.remove();
    return { l: Math.round(r.width), k: Math.round(r.height) };
  }

  function paivita() {
    let t = '';
    try {
      const vv = window.visualViewport;
      const juuri = getComputedStyle(document.documentElement);
      const el = document.createElement('div');
      el.style.cssText = 'position:absolute;visibility:hidden;' +
        'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px)' +
        ' env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
      document.body.appendChild(el);
      const s = getComputedStyle(el);
      const turva = [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft]
        .map(function (x) { return Math.round(parseFloat(x) || 0); });
      el.remove();

      const vw = yksikko('100vw'), dvw = yksikko('100dvw');
      const vh = yksikko('100vh'), dvh = yksikko('100dvh');

      const kortit = [].slice.call(document.querySelectorAll('#kasi .tayte-kortti'));
      /* ⚠️ offsetTop eika getBoundingClientRect().top. Rect NAKEE
       * transformin, ja valittu kortti nousee 10 px — jolloin mittari
       * laski noston toiseksi riviksi ja huusi KIETOUTUI vaikka kasi oli
       * yhdella rivilla. Mitattu: rect [122,132,122,132,132],
       * offset [132,132,132,132,132]. offsetTop on ASETTELUN paikka
       * eika nae transformia, ja rivi on asettelukysymys.
       * Vaara halytys opettaa ohittamaan halytykset. */
      const rivit = kortit.length
        ? Object.keys(kortit.reduce(function (a, k) {
            a[k.offsetTop] = 1; return a; }, {})).length
        : 0;
      let oikein = 0, vasen = 0;
      kortit.forEach(function (k) {
        const r = k.getBoundingClientRect();
        if (r.right > oikein) oikein = r.right;
        if (!vasen || r.left < vasen) vasen = r.left;
      });
      const pa = document.querySelector('.pelialue');
      const par = pa ? pa.getBoundingClientRect() : null;

      t += 'ikkuna      ' + innerWidth + ' x ' + innerHeight + '\n';
      t += 'visual      ' + (vv ? Math.round(vv.width) + ' x ' + Math.round(vv.height) : 'ei tuettu') + '\n';
      t += 'document    ' + document.documentElement.clientWidth + ' x ' + document.documentElement.clientHeight + '\n';
      t += 'screen      ' + screen.width + ' x ' + screen.height + '   dpr ' + devicePixelRatio + '\n';
      t += '100vw/100vh ' + vw.l + ' x ' + vh.k + '\n';
      t += '100dvw/dvh  ' + dvw.l + ' x ' + dvh.k;
      t += (dvw.l !== vw.l || dvh.k !== vh.k) ? '   <-- ERO, palkit vievat tilaa\n' : '   (sama)\n';
      t += 'turva t/r/b/l ' + turva.join(' / ') + '\n';
      t += 'standalone  ' + (matchMedia('(display-mode: standalone)').matches ||
                             navigator.standalone === true ? 'KYLLA' : 'ei - selain') + '\n';
      t += 'kortti-lev  ' + juuri.getPropertyValue('--kortti-lev').trim() + '\n';
      t += 'kortteja    ' + kortit.length + '   rivilla ' + rivit + (rivit > 1 ? '  <-- KIETOUTUI' : '') + '\n';
      if (kortit.length) {
        t += 'kasi x      ' + Math.round(vasen) + ' ... ' + Math.round(oikein) +
             '   (ikkuna ' + innerWidth + ')' +
             (oikein > innerWidth + 1 ? '  <-- YLI ' + Math.round(oikein - innerWidth) + ' px' : '  mahtuu') + '\n';
      }
      if (par) {
        t += 'pelialue    ala ' + Math.round(par.bottom) + ' / ' + innerHeight +
             (par.bottom > innerHeight + 1 ? '  <-- YLI ' + Math.round(par.bottom - innerHeight) + ' px' : '  mahtuu') + '\n';
      }
      t += 'vieritys    ' +
        ((document.documentElement.scrollWidth > innerWidth ||
          document.documentElement.scrollHeight > innerHeight) ? 'ON' : 'ei') + '\n';
      /* ⚠️ Eri asia kuin ylivuoto: sisalto voi mahtua ja sivu kumittaa
       * silti. Ylla oleva rivi ei nae sita, joten lukon tila luetaan
       * erikseen laskennallisista tyyleista. */
      const H = getComputedStyle(document.documentElement);
      const B = getComputedStyle(document.body);
      const lukossa = H.overflow === 'hidden' && B.overflow === 'hidden' &&
                      (H.overscrollBehavior || '').indexOf('none') === 0;
      t += 'vieritysl.  ' + (lukossa ? 'LUKOSSA' : 'auki') +
           '  (html ' + H.overflow + '/' + H.overscrollBehavior +
           ', body ' + B.overflow + ')';
    } catch (e) {
      t = 'MITTAUS EPAONNISTUI\n' + (e && e.message ? e.message : String(e));
    }
    laatikko.textContent = t;
  }

  paivita();
  addEventListener('resize', paivita);
  addEventListener('orientationchange', function () { setTimeout(paivita, 300); });
  if (window.visualViewport) visualViewport.addEventListener('resize', paivita);
  setInterval(paivita, 1000);
}

if (new URLSearchParams(location.search).get('mitat') === '1') {
  document.addEventListener('DOMContentLoaded', naytaMitat);
}
