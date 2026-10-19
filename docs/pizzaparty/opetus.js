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
  opetusValoKohteeseen(a.kohde);
  const luku = opetusEl('opetusAskeleet');
  if (luku) luku.textContent = (opetus.askel + 1) + ' / ' + opetus.lista.length;
}

function opetusSeuraava() {
  opetus.askel++;
  if (opetus.askel >= opetus.lista.length) return opetusLopeta(true);
  const a = opetusAskel();
  if (a && a.ennen) a.ennen();
  opetusPiirra();
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
  opetusValoKohteeseen(a.kohde);
  if (a.valmis && a.valmis()) return opetusSeuraava();
  const seuraava = opetus.lista[opetus.askel + 1];
  if (a.valmis && seuraava && seuraava.valmis && seuraava.valmis()) opetusSeuraava();
}

/* ---------- askeleet: Pizza Party ---------- */

/* Täytesääntö on eri tiloissa eri — ks. tiedoston alku. Opetus kertoo sen
 * joka on NYT voimassa, ei kumpaakin «varmuuden vuoksi». */
function opetusTaytesaanto() {
  return (opetusOnBasso() || tila.apinanTapa) ? 'opetus.taytteetTiukka' : 'opetus.taytteetHelppo';
}

function opetusPartyAskeleet() {
  /* ⚠️ TOINEN KIERROS EI OPETA TAYTESAANTOA, JA SE ON MARKON KORJAUS
   * 19.10.2026: «siellä puhutaan esim., että nyt tarvitset "kolme
   * korttia". Säännöissä ei oteta kantaa korttien lukumäärään.»
   *
   * Hän on oikeassa kahdesti. Ensinnäkään korttien lukumäärä ei ole
   * sääntö missään pelitavassa. Ja toiseksi: PARTYN OLETUSTAVASSA
   * (helppo) täytteitä ei tarkisteta lainkaan, joten «kaksi eri
   * täytettä» ei ole siellä sääntö vaan kuva. Ensimmäinen versio opetti
   * siis Basson sääntöä Partyn opetuksessa - ja Bassolla on oma
   * opetuksensa, kuten Marko huomautti.
   *
   * Nyt toinen kierros on vain toinen pizza, eikä se väitä mitään. */
  return [
    { avain: 'opetus.tervetuloa' },
    { avain: 'opetus.pizza', kohde: '#pizzaKortti' },
    /* ⚠️ KAANTO ON KAKSI NAPAUTUSTA, EI YHTA. Mitattu: pizzan painallus
     * lepotilassa kutsuu `kaannaKortit('pizza')` (peli.js), eli kaantaa
     * VAIN pizzan - kierros alkaa vasta kun myos kasi on kaannetty.
     * Valo seuraa sita puolta joka on viela kaantamatta. */
    { avain: 'opetus.kaanna',
      kohde: function () { return tila.kaannetty.pizza ? '#kasi' : '#pizzaKortti'; },
      valmis: function () { return tila.vaihe !== 'lepo'; } },
    { avain: 'opetus.kasi', kohde: '#kasi' },
    { avain: 'opetus.valitse', kohde: '#kasi',
      arvot: function () { return { arvo: tila.pizza ? tila.pizza.arvo : '' }; },
      valmis: function () { return tila.valitut.length >= 2; } },
    /* ⚠️ VAIN VETAMINEN, EI «tai paina pizzaa» (Marko 19.10.2026:
     * «tekstissä lukee nyt – tai paina pizzaa, vaikka oikeasti sitä
     * pizzaa pitää painaa, kun on täytteet pelattu pizzan päälle»).
     * Molemmat toimivat, mutta pizzan painallus on se TEKO joka
     * opetetaan viimeisena - sen tarjoaminen tassa sekoittaa kaksi eri
     * hetkea. Yksi teko per askel. */
    { avain: 'opetus.pizzalle', kohde: '#pizzaKortti',
      valmis: function () { return tila.vaihe === 'selitys'; } },
    /* ⚠️ LASKUA EI TARVITSE «LÄHETTÄÄ» - SE LÄHTEE ITSE, ja siksi tässä
     * ei ole enää askelta «paina pizzaa».
     * 📐 Mitattu: `paivitaJaTarkista` (peli.js) kutsuu `tarkistaLasku`a heti
     * kun `lausekeValmis()`, eli viimeinen laskumerkki lähettää laskun.
     * Ja `pelaaPizzalle` palaa heti jos vaihe ei ole 'valinta' - eli
     * pizzan painallus lausekevaiheessa EI TEE MITÄÄN. Ohje «paina
     * pizzaa, kun lasku on valmis» ei siis ollut vain tarpeeton vaan
     * väärä: se neuvoi napautuksen joka ei vastaa mihinkään.
     * (Marko 19.10.2026 huomasi saman toisesta päästä: «oikeasti sitä
     * pizzaa pitää painaa, kun on täytteet pelattu pizzan päälle» - eli
     * painallus kuuluu KESKIVAIHEESEEN, ei loppuun.) */
    { avain: 'opetus.merkit', kohde: '#operaattorit',
      valmis: function () { return opetus.pizzojaAlussa !== undefined && opetusPizzoja() > opetus.pizzojaAlussa; } },
    { avain: 'opetus.sait' },
    { avain: opetusTaytesaanto(), kohde: '#pizzaKortti' },
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
    { avain: 'opetus.pizzaBasso', kohde: '#pizzaKortti' },
    { avain: 'opetus.taytteetTiukka', kohde: '#pizzaKortti' },
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
  document.body.classList.remove('opetus-paalla');
  /* Keskeytetty opetus palaa valikkoon; loppuun pelattu jää peliin, jotta
   * pelaaja voi jatkaa samasta kädestä. */
  if (!loppuunAsti && typeof valikkoNayta === 'function') valikkoNayta();
}

function opetusKytke() {
  const jatka = opetusEl('opetusJatka');
  if (jatka) jatka.addEventListener('click', opetusSeuraava);
  const lopeta = opetusEl('opetusLopeta');
  if (lopeta) lopeta.addEventListener('click', function () { opetusLopeta(false); });
  const nappi = opetusEl('alkuOpetus');
  if (nappi) nappi.addEventListener('click', opetusAloita);
  window.addEventListener('resize', function () {
    if (opetus.paalla) opetusVahti();
  });
}

/* ⚠️ VAHTI, EI TARKISTIN — sama kuvio kuin valikkoVahti ja isantaVahti.
 * Se kertoo konsoliin mitä puuttuu eikä estä mitään: puuttuva nappi ei saa
 * kaataa peliä, mutta sen on näyttävä. */
function opetusVahtiRakenne() {
  const puuttuu = [];
  ['opetus', 'opetusValo', 'opetusTeksti', 'opetusJatka', 'opetusLopeta', 'opetusAskeleet', 'alkuOpetus']
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
