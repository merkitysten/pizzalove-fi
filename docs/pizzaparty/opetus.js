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
  /* ⚠️ SAMA KOHDE PERAKKAIN: EI UUTTA LIIKETTA. Kaksi perakkaista
   * askelta jotka puhuvat samasta kortista ovat yksi hetki - zoomin
   * toistaminen nykaisisi kortin pois ja takaisin keskella lausetta.
   * Vain teksti vaihtuu. */
  const avain = valitsin + '|' + (korostaLuku ? '1' : '0');
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

  if (korostaLuku) {
    klooni.classList.add('opetus-zoom-kortti--himmea');
    const luku = document.createElement('b');
    luku.className = 'opetus-zoom-luku';
    luku.textContent = tila.pizza ? String(tila.pizza.arvo) : '';
    klooni.appendChild(luku);
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
  if (a.valmis && a.valmis()) return opetusSeuraava();
  const seuraava = opetus.lista[opetus.askel + 1];
  if (a.valmis && seuraava && seuraava.valmis && seuraava.valmis()) opetusSeuraava();
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
   *
   * ⚠️ TOINEN KIERROS EI OPETA TAYTESAANTOA (Marko 19.10.): korttien
   * lukumaara ei ole saanto missaan pelitavassa, eika Partyn helpossa
   * tavassa tayteita tarkisteta lainkaan. Bassolla on oma opetuksensa. */
  return [
    { avain: 'opetus.tervetuloa' },
    /* ⚠️ KAANTO ON KAKSI NAPAUTUSTA, EI YHTA: pizzan painallus
     * lepotilassa kaantaa vain pizzan (peli.js kaannaKortit). Valo
     * seuraa sita puolta joka on viela kaantamatta. */
    { avain: 'opetus.kaanna',
      kohde: function () { return tila.kaannetty.pizza ? '#kasi' : '#pizzaKortti'; },
      valmis: function () { return tila.vaihe !== 'lepo'; } },
    { avain: 'opetus.numero', zoom: '#pizzaKortti', korostaLuku: true },
    { avain: 'opetus.helpoin', zoom: '#pizzaKortti', korostaLuku: true },
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
   * molemmissa tavoissa (2 eri arvoa, 2 taytetta). */
  return [
    { avain: 'opetus.tervetuloaBasso' },
    { avain: 'opetus.pizzaBasso', zoom: '#pizzaKortti', korostaLuku: true },
    { avain: 'opetus.taytteetTiukka', zoom: '#pizzaKortti' },
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
    { avain: 'opetus.bassoTavoite' },
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
