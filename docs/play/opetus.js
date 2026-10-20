/* Pizza Love — OPETUSKIERROKSET (Marko 19.10.2026)
 *
 * «Sekä pizza party, että pizza basso -pelimuotojen pitäisi sisältää
 *  rehellinen opetuspelimuoto esim. kaksi harjoituskierrosta — — eli jossa
 *  täysin kädestä pitäen näytetään miten kortteja pelataan. Tällä hetkellä
 *  pizzan tekeminen ei ole täysin intuitiivista. — — (Esim. että mitä se
 *  kaksi täytettä tarkoittaa. Tällä hetkellä menee sekaisin kaksi korttia
 *  vs. kaksi täytettä.)»
 *
 * ⚠️ MITATTU LÄHTÖTILA 19.10.2026: peli ei kerro pelaajalle MITÄÄN.
 * `piirraOhje()` (peli.js) on tynkä joka tyhjentää elementin `#pizzaOhje`,
 * jota ei ole enää olemassa sivulla. Ohjetta ei siis ole piilotettu vaan
 * sitä ei ole.
 *
 * ⚠️ JA «KAKSI TÄYTETTÄ» TARKOITTAA ERI ASIAA ERI TILASSA — tämä on
 * mitattu säännöistä eikä arvattu, ja se on koko sekaannuksen syy:
 *
 *   Party, helppo      vain pizzan NUMERO ratkaisee. Täytteet kortissa
 *                      ovat kuvaa: `tarveN = tila.apinanTapa ? … : null`
 *                      (peli.js) eli tarkistusta ei tehdä lainkaan.
 *   Party, vaikeampi   numero JA `eriArvojaValituissa() === tayteMaara`
 *   Basso, aina        sama ehto, ilman valintaa (basso.js tarkistaLasku)
 *
 * Eli pelaaja voi nähdä kahden täytteen pizzan ja saada sen KOLMELLA
 * kortilla — kunhan eri täytteitä on kaksi. Juuri se menee sekaisin, ja
 * siksi opetus sanoo sen ääneen omana askeleenaan.
 *
 * ⚠️ OPETUS EI OLE OMA PELINSÄ VAAN KERROS OIKEAN PÄÄLLÄ. Se kutsuu
 * `aloitaPeli`a ja korvaa vain jaon; kortit, laskenta, mitalit ja
 * voittotarkistus ovat samat funktiot kuin oikeassa pelissä. Toinen
 * toteutus ajautuisi erilleen, ja silloin opetus opettaisi pelin jota ei
 * ole — sama syy jolla `tarkistaLasku` on yksi funktio eikä kaksi.
 *
 * ⚠️ TASO ON `harjoittelu` (TASOT[0]): apina ei kilpaile eikä mitään
 * mitata (peli.js: «harjoittelussa ei mitata mitään»). Opetuskierros ei
 * saa jättää jälkeä tilastoihin.
 *
 * Riippuu: peli.js (tila, aloitaPeli, piirraKaikki, TASOT)
 *          kortit.js (pizzapakka, taytepakka, sekoita)
 *          kielet.js (t)
 *          basso.js (vain Bassossa: basso, bassoKatsoja)
 */

/* Askelten tila. `lista` on sen pelin askeleet jota pelataan. */
const opetus = { paalla: false, askel: 0, lista: [], kello: null, odottaa: false };

function opetusEl(id) { return document.getElementById(id); }

function opetusOnBasso() { return typeof basso !== 'undefined' && !!basso; }

/* ---------- jako ----------
 * ⚠️ Kortit POIMITAAN oikeista pakoista eikä kirjoiteta käsin. Käsin
 * tehty korttiolio eroaisi oikeasta heti kun kortin rakenne muuttuu, ja
 * ero näkyisi vasta opetuksessa — eli siellä missä sitä vähiten huomaa.
 */
function opetusPoimiPizza(arvo, taytteita) {
  return pizzapakka().filter(function (k) {
    return k.arvo === arvo && k.tayteMaara === taytteita;
  })[0] || null;
}

/* Käsi annetuilla arvoilla + loput pakkaan. Palauttaa null jos jokin arvo
 * ei löydy — silloin opetus jatkaa tavallisella jaolla eikä valehtele. */
function opetusPoimiKasi(arvot) {
  const pakka = sekoita(taytepakka());
  const kasi = [];
  for (let i = 0; i < arvot.length; i++) {
    const j = pakka.findIndex(function (k) { return k.arvo === arvot[i]; });
    if (j < 0) return null;
    kasi.push(pakka.splice(j, 1)[0]);
  }
  return { kasi: kasi, pakka: pakka };
}

/* Käsi täyteen muilla korteilla, jotta näkymä on tavallisen näköinen.
 *
 * ⚠️ TAYTEKORTTI EI SAA OLLA PIZZAN ARVOINEN. Mitattu ensimmaisessa
 * ajossa: toisen kierroksen kateen osui kortti 8, ja pizza oli 8 - eli
 * sen kierroksen olisi voinut ratkaista YHDELLA napautuksella ilman
 * yhtaan laskua, juuri silla kierroksella jonka tarkoitus on nayttaa
 * etta kortteja saa olla enemman kuin taytteita.
 * Muita ratkaisuja ei yriteta sulkea pois: tarkoitus on opettaa
 * pelaamaan, ei rakentaa pulmaa jolla on yksi vastaus. */
function opetusTaytaKasi(jako, koko, pizzaArvo) {
  while (jako.kasi.length < koko && jako.pakka.length) {
    const k = jako.pakka.shift();
    if (k.arvo === pizzaArvo) continue;
    /* ⚠️ EI FANTASIAKORTTIA OPETUKSEEN. Sen arvo on `null` kunnes
     * pelaaja valitsee sen, eli se on oma saantonsa jota opetus ei
     * kasittele - ja mitattuna se osui kateen heti toisella ajolla
     * (kasi 3,3,2,-,4). Opetus nayttaa perusliikkeen; X opitaan
     * pelissa. */
    if (k.fantasia) continue;
    jako.kasi.push(k);
  }
  return jako;
}

/* ---------- valo ----------
 * Rengas sen elementin ympärillä johon pitää koskea. Seuraa sijaintia,
 * koska kortit liikkuvat (nosto, käännöt) ja ruutu voi kääntyä.
 *
 * ⚠️ `pointer-events:none` koko kerroksessa: pelaajan on päästävä
 * koskemaan korttiin jota valo osoittaa. Vain opetuskortti ottaa
 * napautuksia vastaan (opetus.css).
 */
function opetusValoKohteeseen(valitsin) {
  const valo = opetusEl('opetusValo');
  if (!valo) return;
  /* `kohde` saa olla funktio: osa askeleista osoittaa eri paikkaan sen
   * mukaan mita on jo tehty (kaanto: ensin pizza, sitten kasi). */
  if (typeof valitsin === 'function') valitsin = valitsin();
  const el = valitsin ? document.querySelector(valitsin) : null;
  if (!el) { valo.hidden = true; return; }
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) { valo.hidden = true; return; }
  const v = 8;
  valo.style.left = Math.round(r.left - v) + 'px';
  valo.style.top = Math.round(r.top - v) + 'px';
  valo.style.width = Math.round(r.width + v * 2) + 'px';
  valo.style.height = Math.round(r.height + v * 2) + 'px';
  valo.hidden = false;
}

/* ---------- OPETUSKORTIN PAIKKA: MITATTU, EI RUUDUN REUNA ----------
 * Marko 20.10.2026 (kuvakaappaus tietokoneen ruudulta): «Tuossa tietokoneen
 * ruudun kuvakaappauksessa on myös asemointiin liittyviä haasteita.»
 *
 * 📐 MITATTU 20.10.2026, opetuskortin ylä-/alareuna vs. pelialueen reuna:
 *
 *   1440 x 900  vaaka   pelialue alkaa 241, kortti 10–126   → 115 px tyhjää
 *   1280 x 800  vaaka   pelialue alkaa 241, kortti 10–126   → 115 px tyhjää
 *   1024 x 768  vaaka   pelialue alkaa 295, kortti 10–126   → 169 px tyhjää
 *    768 x 1024 pysty   pisterivi päättyy 580, kortti 911–1016 → 331 px tyhjää
 *    800 x 1280 pysty   pisterivi päättyy 604, kortti 1167–1272 → 563 px tyhjää
 *    900 x 1440 pysty   pisterivi päättyy 604, kortti 1327–1432 → 723 px tyhjää
 *
 * Eli kortti ei peitä työpöydällä mitään — se on päinvastoin satoja
 * pikselejä irti siitä mistä se puhuu. Puhelimessa sama CSS-sääntö osuu
 * oikein, koska siellä peli TÄYTTÄÄ ruudun ja reuna on pelin vieressä.
 * Isolla näytöllä peli on keskellä ja reunat ovat tyhjiä.
 *
 * ⚠️ KORJAUS ON ANKKURI, EI UUSI REUNA. Kortti kiinnitetään siihen mitä
 * askel katsoo: zoomattuun klooniin jos zoom on päällä, muuten pelialueen
 * ja pistelaatikoiden yhteiseen laatikkoon. Kiinteä pikselimäärä olisi
 * kolmas arvaus kahden jo epäonnistuneen jälkeen (ks. opetus.css).
 *
 * ⚠️ SAMA MITTAUSSILMUKKA KUIN VALOLLA, ei uutta koneistoa: `opetusVahti`
 * ajaa 250 ms välein ja seuraa jo nyt kohteen liikettä. Kortit liikkuvat
 * (nosto, käännöt) ja ruutu voi kääntyä, joten yksi laskenta aloituksessa
 * vanhenisi heti.
 *
 * ⚠️ PUHELIN EI SAA MUUTTUA. Mitattu 375 x 812: pisterivi päättyy 673,
 * kortti mahtuisi vasta 685:een mutta ruudun alle jää tilaa 677 asti — eli
 * ankkuri EI mahdu ja kiinnitys putoaa takaisin ruudun reunaan 677, joka on
 * tasan nykyinen paikka. Pystyasennon `#pelaajarivi{margin-top:4px}`
 * (opetus.css) on siis yhä se mikä ratkaisee puhelimen, ei tämä.
 */
const OPETUS_VALI = 12;    /* rako kohteen ja kortin välissä */
const OPETUS_REUNA = 8;    /* vähimmäisrako ruudun reunaan */

/* Mitä kortti väistää: pelilauta JA zoomattu klooni yhdessä, ei kumpikaan
 * yksin.
 *
 * ⚠️ ZOOMIN AIKANA PELILAUTA ON YHÄ MUKANA, ja se on mitattu. Ensin
 * tämä palautti zoom-askeleessa pelkän kloonin laatikon, koska pohja on
 * tumma eikä lautaan saa koskea. Mitattu 375 x 812: klooni päättyy 583,
 * joten kortti asettui 595:een ja PEITTI pistelaatikot (585–673) 78 px:n
 * matkalta. Tumma pohja ei piilota pisteitä vaan himmentää ne — ja juuri
 * pisteiden peittämisestä Marko huomautti 19.10. puhelimella. Kun lauta
 * on mukana, puhelin ei mahdu kummallekaan puolelle ja kortti putoaa
 * takaisin ruudun reunaan 677 eli vanhaan paikkaansa; työpöydällä
 * klooni on lautaa suurempi, joten union ei muuta mitattuja paikkoja
 * (1440 x 900 zoom 63, 1024 x 768 zoom 18, 768 x 1024 zoom 842). */
function opetusFokus() {
  let ylä = Infinity, ala = -Infinity;
  function mukaan(b) {
    if (!b || !b.width || !b.height) return;
    if (b.top < ylä) ylä = b.top;
    if (b.bottom > ala) ala = b.bottom;
  }
  ['.pelialue', '#pelaajarivi'].forEach(function (valitsin) {
    const el = document.querySelector(valitsin);
    if (el) mukaan(el.getBoundingClientRect());
  });
  const kerros = opetusEl('opetusZoom');
  const klooni = kerros && !kerros.hidden ? kerros.firstChild : null;
  if (klooni && klooni.getBoundingClientRect) mukaan(klooni.getBoundingClientRect());
  return ylä < ala ? { ylä: ylä, ala: ala } : null;
}

/* ⚠️ KOLMAS TEKSTIRIVI EI MAHDU PUHELIMEEN — JA SE ON VANHA VIKA, EI
 * ESITTELYN TUOMA. opetus.css lupaa että pystyasennon kortti kantaa kaksi
 * riviä (127 px) ja että «lyhyys on osa tätä ratkaisua». Mitattu
 * 20.10.2026 HEADin versiosta, 375 x 812, suomeksi:
 *
 *   opetus.helpoin   3 riviä 149 px  kortti 655–804, pisterivi 585–673 → peitto 18 px
 *   opetus.pizzalle  3 riviä 149 px  kortti 655–804, pisterivi 585–673 → peitto 18 px
 *
 * Eli lupaus oli jo rikki kahdessa askeleessa neljällä kielellä, ja
 * saksassa myös `opetus.valitse` ja `opetus.taytteetTiukka`. Tekstien
 * lyhentäminen korjaisi nämä kuusi — ja jättäisi säännön jota rikotaan
 * joka kerta kun joku kirjoittaa virkkeen tai kääntää sen saksaksi.
 *
 * Siksi mitta ratkaisee tekstikoon eikä teksti mittaa: jos kortti ei
 * mahdu pelilaudan viereen, tekstikokoa pienennetään askel kerrallaan
 * neljällä pisteellä. Peruskoko luetaan CSS:stä (pysty 17 px, vaaka 15 px),
 * joten tämä ei koskaan SUURENNA mitään eikä tee mitään siellä missä
 * tilaa on — työpöydällä teksti pysyy täysikokoisena.
 *
 * ⚠️ VALIMUISTI, KOSKA TÄMÄ AJETAAN 250 MS VÄLEIN. Viisi koekokoa
 * pakottaisi viisi asettelulaskentaa joka tikillä; avain on teksti,
 * ruudun koko ja käytettävissä oleva tila, eli juuri ne joiden
 * muuttuessa sovitus on tehtavä uudelleen. */
/* 📐 VIISI ASKELTA, EI NELJÄÄ: mitattu 375 x 812 neljällä kielellä ja
 * molemmilla pelimuodoilla. Neljällä askeleella (pohja 13 px) jäi yksi
 * tapaus jossa kortti peitti pisteriviä 2 px: saksan
 * `opetus.taytteetTiukka` Bassossa. Viidennellä askeleella peittoja ei
 * ole yhtään. Lyhentäisin mieluummin sen yhden virkkeen, mutta se olisi
 * taas yksi lause korjattuna kuvion sijaan — ja seuraava käännös
 * rikkoisi saman rajan uudelleen. */
const OPETUS_PIENENNYS = 5;

function opetusSovitaTeksti(kortti, tilaa) {
  const el = opetusEl('opetusTeksti');
  if (!el) return;
  const avain = el.textContent + '|' + innerWidth + 'x' + innerHeight + '|' + Math.round(tilaa);
  if (opetus.sovitus === avain) return;
  opetus.sovitus = avain;
  el.style.fontSize = '';
  const perus = parseFloat(getComputedStyle(el).fontSize) || 17;
  for (let koko = perus - 1; kortti.offsetHeight > tilaa && koko >= perus - OPETUS_PIENENNYS; koko--) {
    el.style.fontSize = koko + 'px';
  }
  /* ⚠️ PIENENNYS PERUTAAN JOS SE EI AUTTANUT. Mitattu puhelimen
   * vaaka-asennossa 812 x 375: pelilauta täyttää koko korkeuden, joten
   * korttia ei mahdu sen viereen millään koolla — ja silti silmukka ajoi
   * tekstin pohjaan 10 pikseliin. Kortti peitti laudan yhtä paljon kuin
   * ennenkin (mitattu HEADista samalla ruudulla: pizza 25 px, operaattorit
   * 94 px), mutta tekstiä ei enää lukenut kukaan. Lukukelvoton teksti
   * ratkaisemattoman ongelman päällä on kaksi ongelmaa yhden sijaan. */
  if (kortti.offsetHeight > tilaa) el.style.fontSize = '';
}

function opetusAsetaKortti() {
  const kortti = document.querySelector('.opetus-kortti');
  if (!kortti) return;
  const f = opetusFokus();
  /* Käytettävissä oleva tila mitataan ILMAN rakoa: rako on kauneutta,
   * peittämättömyys on sääntö. */
  if (f) opetusSovitaTeksti(kortti, Math.max(f.ylä - OPETUS_REUNA, innerHeight - OPETUS_REUNA - f.ala));
  const korkeus = kortti.offsetHeight;
  if (!korkeus) return;
  /* Ilman mittaa CSS saa päättää: tyhjä inline-arvo palauttaa
   * media query -säännön eikä jätä korttia vanhaan paikkaan. */
  if (!f) { kortti.style.top = ''; kortti.style.bottom = ''; kortti.style.marginBottom = ''; return; }
  const ylin = OPETUS_REUNA;
  const alin = innerHeight - OPETUS_REUNA - korkeus;
  const yllä = f.ylä - OPETUS_VALI - korkeus;   /* kohteen yläpuolelle */
  const alla = f.ala + OPETUS_VALI;             /* kohteen alapuolelle */
  const yllaMahtuu = yllä >= ylin, allaMahtuu = alla <= alin;
  /* Vaaka-asennossa tyhjä tila on pelilaudan YLÄpuolella (palkki ei vie
   * asettelun korkeutta, peli.css), pystyssa ALApuolella — molemmat
   * mitattu yllä olevasta taulukosta. Siksi sama järjestys kuin
   * opetus.css:n kahdessa media queryssä, nyt vain ankkuroituna. */
  const vaaka = innerWidth >= innerHeight;
  let y;
  if (yllaMahtuu && allaMahtuu) y = vaaka ? yllä : alla;
  else if (yllaMahtuu) y = yllä;
  else if (allaMahtuu) y = alla;
  else y = vaaka ? ylin : alin;               /* puhelin: reuna, kuten ennen */
  kortti.style.top = Math.round(Math.min(Math.max(y, ylin), alin)) + 'px';
  kortti.style.bottom = 'auto';
  kortti.style.marginBottom = '0';
}

/* ---------- ZOOMAUS: KOHDE RUUDUN ETEEN JA KESKELLE ----------
 * Marko 19.10.2026: «se tavoitepizza saisi tulla aivan ruudun eteen ja
 * keskelle, jolloin huomio on vain siinä. Sitten pizza voisi olla
 * himmeämmällä ja numerot korostettuna. Tämän jälkeen pizzakortti
 * palautuu omalle paikalleen.» ja «muutenkin sitä zoomausta pitäisi
 * hyödyntää näissä opetusruuduissa, koska sillä saamme pelaajan varmasti
 * kiinnittämään huomionsa siihen mihin haluamme.»
 *
 * Askel saa kentän `zoom: '<valitsin>'`, ja siksi tämä on yleinen eikä
 * pizzakortin oma: samaa liikettä voi käyttää mihin tahansa kohteeseen.
 *
 * ⚠️ KLOONI, EI OIKEA ELEMENTTI. Oikean kortin siirtäminen muuttaisi
 * pizza-alueen leveyttä ja siirtäisi kättä kesken opetuksen - sama syy
 * kuin voittoanimaatiossa (peli.js lennataPizzaVoittajalle).
 *
 * ⚠️ ANIMAATIO, EI TRANSITIO, ja `both`-täyttö. Sama mitattu syy kuin
 * nostolla: rAF ja siirtymät eivät etene taustavälilehdessä, ja
 * transitio jättäisi kloonin puolitiehen. Animaatio päättyy aina
 * loppuarvoonsa.
 *
 * ⚠️ KORKEUS 62 % PIENEMMÄSTÄ MITASTA, EI KIINTEÄ PIKSELIMÄÄRÄ: sama
 * sääntö toimii 320 px:n puhelimessa ja 1920 px:n näytöllä. */
const ZOOM_OSUUS = 0.62;

/* ⚠️ SIIVOUSAJASTIN ON PERUTTAVA. Mitattu: kahdella perakkaisella
 * zoom-askeleella `opetusZoomPois` jatti 420 ms:n ajastimen, ja kun
 * seuraava askel zoomasi heti uudelleen, VANHA ajastin tyhjensi juuri
 * luodun kloonin. Kortti katosi ruudulta kesken askeleen eika mikaan
 * kaatunut. */
function opetusZoomPois(heti) {
  const kerros = opetusEl('opetusZoom');
  if (!kerros) return;
  if (opetus.zoomAjastin) { clearTimeout(opetus.zoomAjastin); opetus.zoomAjastin = null; }
  opetus.zoomKohde = null;
  if (heti || !kerros.firstChild) {
    kerros.classList.remove('opetus-zoom--pois');
    kerros.hidden = true; kerros.innerHTML = '';
    return;
  }
  kerros.classList.add('opetus-zoom--pois');
  /* Paluu omalle paikalleen on sama liike toisin päin. Siivous vasta sen
   * jälkeen, jotta kortti ei katoa kesken matkan. */
  opetus.zoomAjastin = setTimeout(function () {
    opetus.zoomAjastin = null;
    kerros.classList.remove('opetus-zoom--pois');
    kerros.hidden = true;
    kerros.innerHTML = '';
  }, 420);
}

function opetusZoomaa(valitsin, korostaLuku) {
  const kerros = opetusEl('opetusZoom');
  const el = valitsin ? document.querySelector(valitsin) : null;
  if (!kerros || !el) return;
  /* ⚠️ KOROSTETTAVA LUKU EI OLE AINA PIZZAN ARVO. Ennen tämä luki
   * `tila.pizza.arvo` suoraan, eli zoom osasi korostaa vain pizzakortin
   * numeron. Esittelyaskel näyttää myös täytekortin isona ja sanoo
   * «kortin numero on sen arvo» — silloin korostettava luku on SEN kortin.
   * Siksi `korostaLuku` saa olla funktio, samalla tavalla kuin `kohde` ja
   * `arvot` jo ovat. Tämä ei ole uusi zoom vaan sama zoom, jolta on
   * poistettu oletus siitä mitä se katsoo. */
  const luku = typeof korostaLuku === 'function' ? korostaLuku()
    : (korostaLuku ? (tila.pizza ? tila.pizza.arvo : '') : null);
  /* ⚠️ SAMA KOHDE PERAKKAIN: EI UUTTA LIIKETTA. Kaksi perakkaista
   * askelta jotka puhuvat samasta kortista ovat yksi hetki - zoomin
   * toistaminen nykaisisi kortin pois ja takaisin keskella lausetta.
   * Vain teksti vaihtuu. ⚠️ Avaimessa on LUKU eikä pelkkä lippu: kaksi
   * peräkkäistä askelta jotka korostavat samasta kortista eri numeron
   * ovat kaksi eri hetkeä. */
  const avain = valitsin + '|' + (luku === null ? '-' : String(luku));
  if (opetus.zoomKohde === avain && !kerros.hidden && kerros.firstChild) return;
  if (opetus.zoomAjastin) { clearTimeout(opetus.zoomAjastin); opetus.zoomAjastin = null; }
  kerros.classList.remove('opetus-zoom--pois');
  opetus.zoomKohde = avain;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return;
  kerros.innerHTML = '';
  kerros.hidden = false;

  const klooni = document.createElement('div');
  klooni.className = 'opetus-zoom-kortti';
  klooni.innerHTML = el.innerHTML;
  /* Loppusijainti: keskellä ruutua, korkeus ZOOM_OSUUS näkyvästä
   * pienemmästä mitasta - leveys seuraa kortin omaa suhdetta. */
  const kork = Math.min(innerHeight * ZOOM_OSUUS, innerWidth * ZOOM_OSUUS * (r.height / r.width));
  const lev = kork * (r.width / r.height);
  klooni.style.width = Math.round(lev) + 'px';
  klooni.style.height = Math.round(kork) + 'px';
  /* Lähtöpaikka kerrotaan muuttujina: animaatio alkaa kortin omalta
   * paikalta ja päättyy keskelle (transform:none). */
  const keskiX = innerWidth / 2, keskiY = innerHeight / 2;
  klooni.style.setProperty('--zoom-x', Math.round(r.left + r.width / 2 - keskiX) + 'px');
  klooni.style.setProperty('--zoom-y', Math.round(r.top + r.height / 2 - keskiY) + 'px');
  klooni.style.setProperty('--zoom-k', (r.width / lev).toFixed(4));

  if (luku !== null && luku !== '') {
    klooni.classList.add('opetus-zoom-kortti--himmea');
    const merkki = document.createElement('b');
    merkki.className = 'opetus-zoom-luku';
    merkki.textContent = String(luku);
    klooni.appendChild(merkki);
  }
  kerros.appendChild(klooni);
}

/* ---------- askelkone ---------- */

function opetusAskel() { return opetus.lista[opetus.askel] || null; }

function opetusPiirra() {
  const a = opetusAskel();
  if (!a) return;
  const teksti = opetusEl('opetusTeksti');
  /* `arvot` saa olla funktio: pizzan arvo tiedetaan vasta jaon jalkeen,
   * ja askellista rakennetaan ennen sita. */
  const arvot = typeof a.arvot === 'function' ? a.arvot() : (a.arvot || {});
  if (teksti) teksti.textContent = t(a.avain, arvot);
  /* «Jatka» näkyy vain kerrottavassa askeleessa. Tekemisaskeleessa se
   * olisi toinen tapa edetä kuin se jota juuri opetetaan. */
  const jatka = opetusEl('opetusJatka');
  if (jatka) jatka.hidden = !!a.valmis;
  /* Zoomin aikana valoa ei tarvita: kohde on jo yksin ruudulla. */
  opetusValoKohteeseen(a.zoom ? null : a.kohde);
  const luku = opetusEl('opetusAskeleet');
  if (luku) luku.textContent = (opetus.askel + 1) + ' / ' + opetus.lista.length;
  /* Teksti vaihtui → kortin korkeus vaihtui → paikka on laskettava uudelleen. */
  opetusAsetaKortti();
}

function opetusSeuraava() {
  /* Zoomattu kortti palaa paikalleen ENNEN seuraavaa askelta - se on
   * osa samaa liikettä eikä erillinen siivous. */
  const seur = opetus.lista[opetus.askel + 1];
  const sama = seur && seur.zoom && opetusAskel() && opetusAskel().zoom === seur.zoom &&
    !!opetusAskel().korostaLuku === !!seur.korostaLuku;
  if (!sama) opetusZoomPois();
  opetus.askel++;
  if (opetus.askel >= opetus.lista.length) return opetusLopeta(true);
  const a = opetusAskel();
  if (a && a.ennen) a.ennen();
  opetusPiirra();
  if (a && a.zoom) opetusZoomaa(a.zoom, a.korostaLuku);
  /* ⚠️ ZOOM LUODAAN PIIRRON JÄLKEEN, joten `opetusPiirra`n laskema paikka
   * on vanha heti: se mitattiin ilman kloonia. Sama uudelleen tässä. */
  opetusAsetaKortti();
}

/* ⚠️ VAHTI ON AJASTIN EIKÄ KOUKKU PELIN FUNKTIOIHIN. Koukku pitäisi
 * lisätä jokaiseen kohtaan josta vaihe voi muuttua (valinta, raahaus,
 * pizzan painallus, apinan vuoro, peruutus) — ja unohtunut kohta jättäisi
 * opetuksen jumiin ilman että mikään kaatuu. Tilan LUKEMINEN kattaa ne
 * kaikki, myös ne jotka lisätään myöhemmin.
 */
/* ⚠️ ASKEL VOI JAADA PELIN JALKEEN, JA SE ON MITATTU. Peli ei etene
 * askel askeleelta: `paivitaJaTarkista` (peli.js) LAHETTAA laskun heti kun
 * se on valmis, joten yhdella laskumerkilla voi mennä lapi seka «laita
 * merkki» etta «paina pizzaa». Bassossa mitattiin: kasi lyheni 7 -> 5,
 * mutta opetus jai askeleeseen «Laita laskumerkki korttien valiin» -
 * ja `tila.merkit` oli jo nollattu seuraavaa vuoroa varten, joten sen
 * oma ehto ei voinut enaa toteutua. Opetus jumittui vaikka pelaaja teki
 * kaiken oikein.
 *
 * Korjaus on YKSI saanto eika toinen ehto joka askeleeseen: jos SEURAAVAN
 * askeleen ehto on jo tosi, tama askel on ohitettu. Vain ehdollinen askel
 * voi ohittua - kerrottavaa askelta ei saa hypata yli, koska silloin
 * opetus jattaisi kertomatta sen mita se on olemassa kertoakseen. */
function opetusVahti() {
  if (!opetus.paalla) return;
  const a = opetusAskel();
  if (!a) return;
  opetusValoKohteeseen(a.zoom ? null : a.kohde);
  opetusAsetaKortti();
  if (a.valmis && a.valmis()) return opetusSeuraava();
  const seuraava = opetus.lista[opetus.askel + 1];
  if (a.valmis && seuraava && seuraava.valmis && seuraava.valmis()) opetusSeuraava();
}

/* ---------- ESITTELY: MITÄ KORTTEJA PELISSÄ ON ----------
 * Marko 20.10.2026 (opastuskierros tietokoneen ruudulla):
 * «Minusta tämän pitäisi alkaa ihan alusta, siten että se selittää mitä
 *  kortteja pelissä on ja mikä niiden tarkoitus pelissä on. Vähän kuin
 *  interaktiivinen ohjekirja.»
 * Ja täydennys samana päivänä: «Muista hyödyntää digitaalisuuden
 * mahdollisuuksia, että otat siihen ruudulle keskelle isona sen jonkin
 * asian ja selitetään se selkeästi.»
 *
 * ⚠️ MITATTU LÄHTÖTILA 20.10.2026 (`opetusPartyAskeleet` 12 askelta,
 * `opetusBassoAskeleet` 10) — ei yhtään askelta joka kertoisi MITKÄ
 * kortit pelissä ovat:
 *
 *   Party  1 tervetuloa → 2 «käännä kortit» (TEKO jo toisena askeleena).
 *          Pizzakorttia ei nimetä kertaakaan; 3. askel sanoo «vain numero
 *          ratkaisee» kortista jota ei ole esitelty. Täytekortti jää
 *          käsiteltynä pelkkänä «nämä ovat sinun korttisi».
 *   Basso  1 tervetuloaBasso → 2 pizzaBasso («sen numero on tavoite»).
 *          Kierroksen tavoite kerrottiin vasta 9. askeleena eli VASTA
 *          PELAAMISEN JÄLKEEN; täytekortti jäi yhtä nimettömäksi kuin
 *          Partyssa.
 *
 * ⚠️ ESITTELY KÄYTTÄÄ OLEMASSA OLEVAA ZOOMIA, EI UUTTA KUVITUSTA. Kortti
 * nousee ruudun eteen ja keskelle, kortti himmenee ja numero korostuu —
 * sama `zoom`/`korostaLuku` jota Markon aiempi ohje jo pyysi. Piirretty
 * esimerkkikuva olisi kuva pelistä jota ei ole; zoom näyttää sen oikean
 * kortin joka on juuri nyt pöydällä.
 *
 * ⚠️ KERTOVA ASKEL, SITTEN TEKO — esittely ei saa muuttaa opastusta
 * katselluksi esitykseksi. Jokainen tekemisaskel on tallella, ja ne ovat
 * yhä oikeaa peliä: valo osoittaa, pelaaja koskee (opetus.css:
 * `pointer-events` auto vain kortissa).
 *
 * ⚠️ PITKÄ KERRONTAJAKSO EI SAA OSUA ELÄVÄLLE LAUDALLE, ja tämä on
 * mitattu eikä arvattu. Opetuskerros ei nielaise napautuksia
 * (opetus.css: `pointer-events:none`), joten lauta on pelattavissa myös
 * kerrottavan askeleen aikana — se on tarkoitus, `opetus.kaanna` nojaa
 * siihen. Mutta kun esittely toi Partyyn kolme peräkkäistä kerrontaa
 * käännön JÄLKEEN, mitattu ajo näytti tämän: pelaaja ehti valita
 * kortit, painaa pizzaa ja voittaa koko ensimmäisen pizzan askeleessa
 * «Vuoro kulkee näin», ja sen jälkeen opetus käveli läpi kolme
 * tekemisaskelta jotka olivat jo tapahtuneet. Mikään ei kaatunut eikä
 * jumittunut — vahdin ohitussaanto purki tilanteen — mutta opetus pyysi
 * tekemään sen minkä pelaaja oli juuri tehnyt.
 *
 * Korjaus on järjestys, ei uusi este: kerronta sijoitetaan sinne missä
 * lauta EI ole pelattavissa. Partyssa se on ennen `opetus.kaanna`a
 * (lepotilassa korttinapit ovat `disabled`, peli.js korttiNappi), ja
 * molemmissa peleissä zoom-askeleen aikana (opetus.css:
 * `.opetus-zoom{pointer-events:auto}` — tumma pohja nielee napautukset).
 * Peite joka estäisi koskemisen muulloin tekisi opetuksesta katsottavan
 * esityksen, eikä sitä Marko pyytänyt.
 *
 * ⚠️ ESITTELYTEKSTI PUHUU PELISTÄ, EI KÄSKE. Markon sanoin tyyli on
 * «Pelissä pöydällä on pizzakortteja, joita pelaajat pyrkivät
 * valmistamaan… kädestään löytyvillä täytekorteilla.» Käsky kuuluu
 * tekemisaskeleeseen, jossa valo osoittaa mihin koskea.
 */

/* Täytekortin esittely on sama molemmissa pelimuodoissa: yksi oikea
 * kortti kädestä isona, sen oma numero korostettuna.
 * ⚠️ ARVO LUETAAN KORTISTA, EI ASKELEESTA: käsi on jaettu kiinteällä
 * listalla, mutta jos jako epäonnistuu (`opetusJaaKierros` palauttaa
 * false) peli jatkaa tavallisella jaolla — ja silloin kovakoodattu luku
 * näyttäisi eri numeroa kuin kortti jonka päällä se on. */
function opetusEkaTayte() {
  return tila.kasi && tila.kasi.length ? tila.kasi[0] : null;
}
function opetusEkaTaytteenArvo() {
  const k = opetusEkaTayte();
  return k && typeof k.arvo === 'number' ? k.arvo : '';
}
/* Esittelyaskeleet jotka ovat sanasta sanaan samat molemmissa peleissä.
 * Kaksi kopiota ajautuisi erilleen ensimmäisessä korjauksessa. */
function opetusEsittelyKortit() {
  return [
    { avain: 'opetus.esittelyPeli' },
    { avain: 'opetus.esittelyPizzakortti', zoom: '#pizzaKortti', korostaLuku: true },
  ];
}
function opetusEsittelyTayte() {
  return { avain: 'opetus.esittelyTayte', zoom: '#kasi .tayte-kortti',
           korostaLuku: opetusEkaTaytteenArvo,
           arvot: function () { return { arvo: opetusEkaTaytteenArvo() }; } };
}

/* ---------- askeleet: Pizza Party ---------- */

function opetusPartyAskeleet() {
  /* ⚠️ «VAIN NUMERO RATKAISEE» ON NYT KOLMAS ASKEL, EI YHDEKSAS
   * (Marko 19.10.2026: «sanoisin, että 9 pitäisi kertoa jo aikaisemmin»).
   * Se on pelin perussaanto, ei jalkihuomautus - ja juuri se tekee
   * Partysta helpon tavan pelata. Samassa askeleessa pizzakortti tulee
   * ruudun eteen ja keskelle (`zoom`), kortti himmenee ja luku
   * korostuu: «silla saamme pelaajan varmasti kiinnittamaan huomionsa
   * siihen mihin haluamme».
   *
   * ⚠️ ZOOM VASTA KAANNON JALKEEN. Lepotilassa pizzakortti on
   * selkapuoli ylospain, joten sita ennen zoomattaisiin kortin selka.
   * TÄMÄ MÄÄRÄÄ ESITTELYN PAIKAN: Partyssa korttien esittely ei voi
   * olla ennen `opetus.kaanna`a, koska esiteltavät kortit ovat silloin
   * nurin päin. Siksi «pöydällä on pizzakortteja, kädessäsi
   * täytekortteja» sanotaan ENNEN kääntöä (sitä varten se ei tarvitse
   * zoomia) ja kortit näytetään isona heti käännön jälkeen.
   *
   * ⚠️ TOINEN KIERROS EI OPETA TAYTESAANTOA (Marko 19.10.): korttien
   * lukumaara ei ole saanto missaan pelitavassa, eika Partyn helpossa
   * tavassa tayteita tarkisteta lainkaan. Bassolla on oma opetuksensa. */
  const esittely = opetusEsittelyKortit();
  return [
    { avain: 'opetus.tervetuloa' },
    esittely[0],                                  /* mitä kortteja pelissä on */
    { avain: 'opetus.partyTavoite' },             /* mihin pelissä pyritään */
    { avain: 'opetus.esittelyVuoro' },            /* miten vuoro kulkee */
    /* ⚠️ KAANTO ON KAKSI NAPAUTUSTA, EI YHTA: pizzan painallus
     * lepotilassa kaantaa vain pizzan (peli.js kaannaKortit). Valo
     * seuraa sita puolta joka on viela kaantamatta. */
    { avain: 'opetus.kaanna',
      kohde: function () { return tila.kaannetty.pizza ? '#kasi' : '#pizzaKortti'; },
      valmis: function () { return tila.vaihe !== 'lepo'; } },
    esittely[1],                                  /* pizzakortti isona */
    { avain: 'opetus.numero', zoom: '#pizzaKortti', korostaLuku: true },
    { avain: 'opetus.helpoin', zoom: '#pizzaKortti', korostaLuku: true },
    opetusEsittelyTayte(),                        /* täytekortti isona */
    { avain: 'opetus.kasi', kohde: '#kasi' },
    { avain: 'opetus.valitse', kohde: '#kasi',
      arvot: function () { return { arvo: tila.pizza ? tila.pizza.arvo : '' }; },
      valmis: function () { return tila.valitut.length >= 2; } },
    { avain: 'opetus.pizzalle', kohde: '#pizzaKortti',
      valmis: function () { return tila.vaihe === 'selitys'; } },
    /* ⚠️ LASKUA EI TARVITSE «LAHETTAA» - viimeinen laskumerkki lahettaa
     * sen itse (`paivitaJaTarkista`), ja pizzan painallus lausekevaiheessa
     * ei tee mitaan. Siksi tassa ei ole askelta «paina pizzaa». */
    { avain: 'opetus.merkit', kohde: '#operaattorit',
      valmis: function () { return opetus.pizzojaAlussa !== undefined && opetusPizzoja() > opetus.pizzojaAlussa; } },
    { avain: 'opetus.sait' },
    { avain: 'opetus.toinen', ennen: function () { opetusJaaKierros(2); } },
    { avain: 'opetus.toinenOhje', kohde: '#kasi',
      valmis: function () { return opetusPizzoja() > opetus.pizzojaAlussa; } },
    { avain: 'opetus.valmis' },
  ];
}



/* ---------- askeleet: Pizza Basso ---------- */

function opetusBassoAskeleet() {
  /* ⚠️ TAYTESAANTO ENNEN VALINTAA, EI SEN JALKEEN. Bassossa
   * `tarkistaLasku` vaatii AINA etta eri arvoja on yhta monta kuin
   * pizzassa taytteita - mitattuna: oikea summa (5 + 4 = 9) ei kelvannut,
   * koska pizzassa oli kolme taytetta. Opetus joka pyytaa tekemaan
   * summan ja vasta sitten kertoo toisen ehdon opettaa epaonnistumaan.
   * Partyssa jarjestys saa olla toisin pain, koska siella helppo tapa ei
   * tarkista taytteita lainkaan - ja opetuksen jaetut kadet kelpaavat
   * molemmissa tavoissa (2 eri arvoa, 2 taytetta).
   *
   * ⚠️ BASSOSSA EI OLE KÄÄNTÖASKELTA, ja se on mitattu eikä unohdettu:
   * `tila.kaannetty` on aloituksessa {pizza:true, kasi:true} ja vaihe on
   * `valinta`. Siksi esittely voi alkaa heti ensimmäisestä askeleesta,
   * toisin kuin Partyssa jossa kortit ovat nurin päin.
   *
   * ⚠️ «KIERROKSEN VOITTAA SE JONKA KORTIT LOPPUVAT ENSIN» ON NYT
   * ENNEN PELAAMISTA, EI SEN JÄLKEEN. Mitattu: se oli 9. askel kymmenestä
   * eli pelaaja sai tietää mihin pyrkii vasta tehtyään vuoron. Se on
   * kierroksen koko tarkoitus, ei loppuhuomautus. */
  const esittely = opetusEsittelyKortit();
  return [
    { avain: 'opetus.tervetuloaBasso' },
    esittely[0],                                  /* mitä kortteja pelissä on */
    { avain: 'opetus.bassoTavoite' },             /* mihin kierroksessa pyritään */
    { avain: 'opetus.esittelyVuoro' },            /* miten vuoro kulkee */
    esittely[1],                                  /* pizzakortti isona */
    { avain: 'opetus.taytteetTiukka', zoom: '#pizzaKortti' },
    opetusEsittelyTayte(),                        /* täytekortti isona */
    { avain: 'opetus.kasiBasso', kohde: '#kasi' },
    { avain: 'opetus.valitseBasso', kohde: '#kasi',
      arvot: function () {
        return { arvo: tila.pizza ? tila.pizza.arvo : '',
                 maara: tila.pizza ? tila.pizza.tayteMaara : '' };
      },
      valmis: function () { return tila.valitut.length >= 2; } },
    { avain: 'opetus.pizzalle', kohde: '#pizzaKortti',
      valmis: function () { return tila.vaihe === 'selitys'; } },
    /* Sama kuin Partyssa: viimeinen laskumerkki lähettää laskun itse,
     * eikä pizzan painallus lausekevaiheessa tee mitään.
     * ⚠️ KASI VOI MYOS KASVAA. Bassossa pizzan painallus ilman kortteja
     * on NOSTO (basso.js), ja se on yhta kelvollinen vuoro kuin pizzan
     * tekeminen - opetus ei saa jumittua siihen etta kaden on lyhennyttava. */
    { avain: 'opetus.merkit', kohde: '#operaattorit',
      valmis: function () {
        return opetus.kadessaAlussa !== undefined && tila.kasi.length !== opetus.kadessaAlussa;
      } },
    { avain: 'opetus.bassoNosto' },
    { avain: 'opetus.valmis' },
  ];
}


/* Montako pizzaa pelaaja on voittanut. Yksinpelissä `omiaPizzoja`,
 * moninpelissä vuorossa olevan laatikko — opetus ajetaan yksin, mutta
 * luku luetaan samasta paikasta kuin pelissä. */
function opetusPizzoja() {
  return tila.moninpeli && tila.vuorossa !== null
    ? (tila.pizzoja[tila.vuorossa] || 0) : (tila.omiaPizzoja || 0);
}

/* ---------- kierroksen jako ----------
 * 1. kierros: 3 + 4 = 7, kaksi eri täytettä ja kaksi korttia.
 * 2. kierros: 3 + 3 + 2 = 8, KOLME korttia mutta kaksi eri täytettä.
 *    Juuri tämä on se mikä menee sekaisin, ja siksi se pelataan eikä
 *    vain sanota.
 */
/* Basson jako: SAMAT taulukot, uusi sisalto.
 *
 * ⚠️ SISALTO VAIHDETAAN PAIKALLAAN, EI TAULUKKOA. `tila.kasi` on sama
 * taulukko kuin `basso.kierros.kasit[bassoKatsoja]` (basso.js: «ei
 * kopio»), ja peli.js hakee valitun kortin paikan `indexOf`illa. Uusi
 * taulukko katkaisi yhteyden: nakymassa oli opetuksen kortit, saannostolla
 * omansa, ja lauseke 3 + 4 = 7 nakyi oikein mutta ei kelvannut - mikaan ei
 * kaatunut eika konsoliin tullut mitaan.
 *
 * ⚠️ JA PIZZAN ON OLTAVA KAKSITAYTTEINEN. Basso vaatii AINA etta eri
 * arvoja on yhta monta kuin taytteita, ja satunnainen jako antoi
 * opetukseen kolmen taytteen pizzan ja kaden jossa oli kaksi
 * fantasiakorttia (mitattu). Ensimmainen opetettava vuoro ei saa olla
 * vaikeampi kuin tavallinen. */
function opetusJaaBasso() {
  const k = basso && basso.kierros;
  if (!k || bassoKatsoja === null || bassoKatsoja === undefined) return false;
  const pizza = opetusPoimiPizza(7, 2);
  const jako = opetusPoimiKasi([3, 4]);
  if (!pizza || !jako) return false;
  opetusTaytaKasi(jako, BASSO_KADEN_KOKO, 7);
  const kasi = k.kasit[bassoKatsoja];
  kasi.length = 0;
  jako.kasi.forEach(function (c) { kasi.push(c); });
  k.poydassa[k.poydassa.length - 1] = pizza;
  k.nosto.length = 0;
  jako.pakka.forEach(function (c) { k.nosto.push(c); });
  k.vuorossa = bassoKatsoja;
  bassoSynkka();
  opetus.pizzojaAlussa = opetusPizzoja();
  opetus.kadessaAlussa = tila.kasi.length;
  piirraKaikki();
  piirraPisteet();
  return true;
}

function opetusJaaKierros(nro) {
  /* ⚠️ VAIN PARTYSSA. Mitattu: Bassossa `tila.kasi` ON SAMA TAULUKKO kuin
   * saannoston kasi (basso.js: «ei kopio»), ja peli.js hakee valittujen
   * paikat `tila.kasi.indexOf`illa. Kun opetus vaihtoi `tila.kasi`n uuteen
   * taulukkoon, nakymassa oli opetuksen kortit mutta saannostolla omansa:
   * lauseke 3 + 4 = 7 nakyi oikein eika silti kelvannut, eika mikaan
   * kaatunut. Bassossa opetetaan siis silla kadella joka jaettiin.
   * Toinen vaihtoehto olisi kirjoittaa `basso.kierros`en sisaan, ja se
   * olisi opetuksen oma kopio saannoista - juuri se mita tassa
   * tiedostossa muuten valtetaan. */
  if (opetusOnBasso()) return opetusJaaBasso();
  const pizzaArvo = nro === 1 ? 7 : 8;
  const kortit = nro === 1 ? [3, 4] : [3, 3, 2];
  const pizza = opetusPoimiPizza(pizzaArvo, 2);
  const jako = opetusPoimiKasi(kortit);
  if (!pizza || !jako) return false;          // ei valehdella: tavallinen jako jää voimaan
  opetusTaytaKasi(jako, opetusOnBasso() ? BASSO_KADEN_KOKO : KADEN_KOKO, pizzaArvo);
  tila.pizza = pizza;
  tila.poydassa = [pizza];
  tila.kasi = jako.kasi;
  tila.taytteet = jako.pakka;
  tila.valitut = [];
  tila.merkit = [];
  tila.ryhmat = [];
  tila.vaihe = nro === 1 ? tila.vaihe : 'valinta';
  opetus.pizzojaAlussa = opetusPizzoja();
  opetus.kadessaAlussa = tila.kasi.length;
  piirraKaikki();
  piirraPisteet();
  return true;
}

/* ---------- aloitus ja lopetus ---------- */

function opetusAloita() {
  /* ⚠️ KAHDELLA SIVULLA ON ERI ALKUVALIKKO: Partyssa #valikkoPeite
   * (valikko.js), Bassossa #bassoValikko (basso-verkko.js). Mitattu:
   * vain Partyn peite suljettiin, ja Bassossa opetus kaynnistyi valikon
   * ALLE - kortti ja valo nakyivat, peli ei. */
  ['valikkoPeite', 'bassoValikko'].forEach(function (id) {
    const el = opetusEl(id);
    if (el) el.hidden = true;
  });
  /* ⚠️ Harjoittelutaso: apina ei kilpaile eikä mitään kirjata. */
  if (typeof TASOT !== 'undefined') tila.taso = TASOT[0];
  if (opetusOnBasso()) {
    if (typeof aloitaPeli === 'function') aloitaPeli();
  } else {
    aloitaPeli(TASOT[0], tila.apinanTapa);
  }
  opetusJaaKierros(1);
  opetus.paalla = true;
  opetus.askel = 0;
  opetus.lista = opetusOnBasso() ? opetusBassoAskeleet() : opetusPartyAskeleet();
  const kerros = opetusEl('opetus');
  if (kerros) kerros.hidden = false;
  document.body.classList.add('opetus-paalla');
  opetusPiirra();
  const eka = opetusAskel();
  if (eka && eka.zoom) opetusZoomaa(eka.zoom, eka.korostaLuku);
  opetusAsetaKortti();
  if (opetus.kello) clearInterval(opetus.kello);
  opetus.kello = setInterval(opetusVahti, 250);
}

function opetusLopeta(loppuunAsti) {
  opetus.paalla = false;
  if (opetus.kello) { clearInterval(opetus.kello); opetus.kello = null; }
  const kerros = opetusEl('opetus');
  if (kerros) kerros.hidden = true;
  const valo = opetusEl('opetusValo');
  if (valo) valo.hidden = true;
  opetusZoomPois(true);
  /* Inline-paikka pois: seuraava aloitus mittaa omansa, eikä CSS:n
   * oletusta jätetä vanhan mittauksen alle. */
  const kortti = document.querySelector('.opetus-kortti');
  if (kortti) { kortti.style.top = ''; kortti.style.bottom = ''; kortti.style.marginBottom = ''; }
  const teksti = opetusEl('opetusTeksti');
  if (teksti) teksti.style.fontSize = '';
  opetus.sovitus = null;
  document.body.classList.remove('opetus-paalla');
  /* Keskeytetty opetus palaa valikkoon; loppuun pelattu jää peliin, jotta
   * pelaaja voi jatkaa samasta kädestä. */
  if (!loppuunAsti && typeof valikkoNayta === 'function') valikkoNayta();
}

/* --- ENSIKERRAN OPASTUS (Marko 20.10.2026) ---------------------------------
 * «Nyt se ensikerran opastus, niin saadaan se rivi pois valikosta.»
 *
 * Opastus ei ole enää valikon rivi vaan se tarjoutuu itse kun pelaaja
 * aloittaa pelin ensimmäistä kertaa TÄLLÄ LAITTEELLA. Sen jälkeen se asuu
 * asetuksissa (⚙), jotta sen voi katsoa uudelleen.
 *
 * ⚠️ TARJOTAAN TASAN KERRAN, EI «ensimmäisillä kerroilla». Toistuva tarjous
 * on nalkutusta sille joka jo osaa, ja hän on juuri se joka painaa «Ohita».
 * Siksi myös OHITUS merkitsee opastetuksi - pelaaja vastasi kysymykseen,
 * eikä samaa kysymystä kysytä uudelleen. Uudelleen katsominen on silti
 * yhden napin päässä asetuksissa.
 *
 * ⚠️ PELIKOHTAINEN: Partyn ja Basson opastukset ovat eri (`opetusOnBasso`),
 * joten Partyn oppinut saa Basson tarjouksen silti. Yhteinen lippu olisi
 * vaientanut toisen pelin opastuksen kokonaan.
 *
 * ⚠️ YKSITYINEN SELAUS: `localStorage` voi heittää. Silloin opastus
 * tarjotaan joka kerta - se on parempi kuin kaatunut aloitusnappi. */
var OPETUS_AVAIN = 'pizzalove-opastettu';

function opetusPelinNimi() { return opetusOnBasso() ? 'basso' : 'party'; }

function opetusLiput() {
  try { return JSON.parse(localStorage.getItem(OPETUS_AVAIN) || '{}') || {}; }
  catch (e) { return {}; }
}

function opetusOnOpastettu() { return !!opetusLiput()[opetusPelinNimi()]; }

function opetusMerkitse() {
  const l = opetusLiput();
  l[opetusPelinNimi()] = true;
  try { localStorage.setItem(OPETUS_AVAIN, JSON.stringify(l)); } catch (e) { /* yksityinen selaus */ }
}

/* Tarjoaa opastusta ja kutsuu `jatka`n jos pelaaja ohittaa sen tai on jo
   opastettu. Jos hän valitsee opastuksen, `jatka`a EI kutsuta: opastus
   käynnistää pelin itse (`opetusAloita`). */
function opetusTarjoa(jatka) {
  if (opetusOnOpastettu()) return jatka();
  const peite = document.createElement('div');
  peite.className = 'opetus-tarjous';
  peite.innerHTML =
    '<div class="opetus-tarjous-kortti">' +
      '<h2></h2><p></p>' +
      '<button type="button" class="iso-nappi opetus-tarjous-nayta"></button>' +
      '<button type="button" class="opetus-tarjous-ohita"></button>' +
    '</div>';
  peite.querySelector('h2').textContent = t('opetus.ensiOtsikko');
  peite.querySelector('p').textContent = t('opetus.ensiTeksti');
  peite.querySelector('.opetus-tarjous-nayta').textContent = t('opetus.ensiNayta');
  peite.querySelector('.opetus-tarjous-ohita').textContent = t('opetus.ensiOhita');
  document.body.appendChild(peite);

  function pois() { if (peite.parentNode) peite.parentNode.removeChild(peite); }
  peite.querySelector('.opetus-tarjous-nayta').addEventListener('click', function () {
    opetusMerkitse(); pois(); opetusAloita();
  });
  peite.querySelector('.opetus-tarjous-ohita').addEventListener('click', function () {
    opetusMerkitse(); pois(); jatka();
  });
}

function opetusKytke() {
  const jatka = opetusEl('opetusJatka');
  if (jatka) jatka.addEventListener('click', opetusSeuraava);
  const lopeta = opetusEl('opetusLopeta');
  if (lopeta) lopeta.addEventListener('click', function () { opetusLopeta(false); });
  /* Opastus ei ole enää alkuvalikossa vaan asetuksissa (ks. yllä). */
  const nappi = opetusEl('asOpetus');
  if (nappi) nappi.addEventListener('click', function () {
    const peite = opetusEl('asetusPeite');
    if (peite) peite.hidden = true;
    opetusAloita();
  });
  window.addEventListener('resize', function () {
    if (opetus.paalla) opetusVahti();
  });
}

/* ⚠️ VAHTI, EI TARKISTIN — sama kuvio kuin valikkoVahti ja isantaVahti.
 * Se kertoo konsoliin mitä puuttuu eikä estä mitään: puuttuva nappi ei saa
 * kaataa peliä, mutta sen on näyttävä. */
function opetusVahtiRakenne() {
  const puuttuu = [];
  ['opetus', 'opetusValo', 'opetusZoom', 'opetusTeksti', 'opetusJatka', 'opetusLopeta', 'opetusAskeleet', 'asOpetus']
    .forEach(function (id) { if (!opetusEl(id)) puuttuu.push('#' + id); });
  ['t', 'pizzapakka', 'taytepakka', 'sekoita', 'piirraKaikki', 'aloitaPeli']
    .forEach(function (f) { if (typeof window[f] !== 'function') puuttuu.push(f + '()'); });
  if (puuttuu.length) {
    console.error('Pizza Love opetus ' + new Date().toLocaleTimeString() + ': PUUTTUU → ' + puuttuu.join(', '));
  }
  return puuttuu;
}

document.addEventListener('DOMContentLoaded', function () {
  opetusKytke();
  opetusVahtiRakenne();
});
