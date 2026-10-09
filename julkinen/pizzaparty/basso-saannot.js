/* Pizza Love — #2 Pizza Basso: säännöt ilman näkymää.
 *
 * Lähde: PELIMUODOT-ALOITUS.md luku 2 (painettu sääntöarkki 21.9.2025 +
 * Markon Basso-apinan tapa 6.10.2026). Päätökset: saman tiedoston luku 8.
 *
 * ⚠️ TÄMÄ TIEDOSTO EI TIEDÄ KUKA PELAA (Marko 6.10.2026: *"Minusta pitäisi
 * olla nämä kaikki mahdollisia"* — apinat, sama laite, verkko). Pelaaja on
 * vain indeksi, ja `laji` on näkymän tietoa. Siksi täällä ei ole yhtään
 * DOM-kutsua eikä ajastinta: sama tiedosto kelpaa yksinpeliin, vuorotteluun
 * samalla laitteella ja myöhemmin verkkopelin tarkistajaksi.
 *
 * ⚠️ LAUSEKKEEN TARKISTUS EI OLE TÄÄLLÄ VAAN kierros.js:ssä. Basso-apinan
 * tapa on tasan `kierrosTarkista(..., vaikea = true)`: arvo osuu JA eri
 * arvoja on yhtä monta kuin pizzassa täytteitä. Toinen kopio samasta
 * säännöstä voisi hyväksyä lausekkeen jonka toinen hylkää.
 *
 * Riippuu: kortit.js  (pizzapakka, taytepakka, sekoita)
 *          ratkoja.js (etsiRatkaisu)
 *          laskin.js  (laske, osuuko — kierros.js:n kautta)
 *          kierros.js (kierrosTarkista)
 *
 * ⚠️ NIMET ALKAVAT `basso`-ETULIITTEELLÄ. basso.html lataa myös peli.js:n,
 * jossa on `tila`, `aloitaPeli` jne. — samanniminen ylätason nimi korvaisi
 * toisen hiljaa.
 *
 * Vastauksen muoto on sama kuin kierros.js:ssä ja ratkojan tuloksessa:
 *   { kortit: [{i, arvo}], merkit: ['+', …], ryhmat: [{alku, loppu}] }
 * jossa `i` on kortin paikka VUOROSSA OLEVAN pelaajan kädessä.
 */

const BASSO_KADEN_KOKO = 7;
const BASSO_FANTASIAN_PISTEET = 20;
const BASSO_TAVOITTEET = [30, 50, 100];        // 🔵 Marko 6.10.2026: 30 + valinta
/* Apinan hakubudjetti ratkojan solmuina. Mitattu 6.10.2026 (160 kättä,
 * 7–14 korttia, JXA): 10 000 solmua löysi 154 / 158 ratkaisusta ja pisin
 * haku kesti 78 ms. Ilman kattoa yksi haku kesti 30 s — selain jäätyy. */
const BASSO_APINAN_SOLMUKATTO = 10000;

/* Uusi ottelu. `lajit` esim. ['ihminen', 'apina', 'apina']. */
function bassoOttelu(lajit, tavoite, sallitut) {
  return {
    pelaajat: lajit.map(function (laji) {
      return { laji: laji, pisteet: 0, valmistetut: [] };
    }),
    tavoite: tavoite,
    sallitut: sallitut,
    kierroksia: 0,
    /* 🟡 Painettu sääntö: «viimeksi pizzaa syönyt aloittaa». Ruudulla
     * ensimmäinen pelaaja aloittaa, ja aloitusvuoro kiertää kierroksittain. */
    aloittaja: 0,
    kierros: null,
    voittaja: null,
  };
}

function bassoUusiKierros(ottelu) {
  const n = ottelu.pelaajat.length;
  const nosto = sekoita(taytepakka());
  const kasit = [];
  for (let i = 0; i < n; i++) kasit.push(nosto.splice(0, BASSO_KADEN_KOKO));
  const pizzat = sekoita(pizzapakka());
  const valmistetut = [];
  for (let i = 0; i < n; i++) valmistetut.push([]);
  ottelu.kierroksia++;
  ottelu.kierros = {
    pizzat: pizzat,
    poydassa: [pizzat.pop()],    // viimeinen on päällimmäinen
    nosto: nosto,
    poistetut: [],               // pelatut täytekortit; nostopakan varanto
    kasit: kasit,
    vuorossa: ottelu.aloittaja,
    /* 🔵 House rule myöhemmäksi (Marko 6.10.2026): valmistetut pizzat
     * pisteytetään. Kirjanpito on tässä alusta asti, jotta se on pelkkä
     * pisteytysvalinta eikä rakennemuutos. */
    valmistetut: valmistetut,
    tyhjiaOhituksia: 0,
    kierratyksia: 0,
    voittaja: null,
    pisteet: null,
  };
  return ottelu.kierros;
}

function bassoPizza(kierros) {
  return kierros.poydassa[kierros.poydassa.length - 1];
}

function bassoSeuraava(ottelu, i) {
  return (i + 1) % ottelu.pelaajat.length;
}

/* Painettu sääntö: täyte = arvonsa, fantasia = 20. */
function bassoKadenPisteet(kasi) {
  return kasi.reduce(function (s, k) {
    return s + (k.fantasia ? BASSO_FANTASIAN_PISTEET : k.arvo);
  }, 0);
}

/* Nosto. Painettu sääntö: kun nostopakka loppuu, pelistä poistetut
 * täytekortit sekoitetaan uudeksi nostopakaksi.
 *
 * ⚠️ Fantasiakortin arvo nollataan kun se poistuu pelistä (bassoPelaa),
 * ei vasta tässä — muuten pinossa makaisi «X = 7» seuraavalle nostajalle. */
function bassoNosta(kierros) {
  if (!kierros.nosto.length && kierros.poistetut.length) {
    kierros.nosto = sekoita(kierros.poistetut);
    kierros.poistetut = [];
    kierros.kierratyksia++;
  }
  return kierros.nosto.length ? kierros.nosto.pop() : null;
}

/* Uusi pizza edellisen päälle. Jos pizzapakka loppuu, pöydän alemmat
 * pizzat sekoitetaan uudeksi pakaksi (päällimmäinen jää pöytään).
 * 🟡 Painettu sääntö ei sano tästä mitään: 42 pizzaa riittää harvoin
 * loppuun, mutta peli ei saa jumittua siihen. */
function bassoUusiPizza(kierros) {
  if (!kierros.pizzat.length) {
    const alemmat = kierros.poydassa.splice(0, kierros.poydassa.length - 1);
    kierros.pizzat = sekoita(alemmat);
  }
  if (kierros.pizzat.length) kierros.poydassa.push(kierros.pizzat.pop());
}

function bassoVuoroKelpaa(ottelu, i) {
  const k = ottelu.kierros;
  return !!k && k.voittaja === null && ottelu.voittaja === null && k.vuorossa === i;
}

/* Vuoron vaihtoehto A: pelaaja tekee pizzan.
 *
 * Palauttaa { ok, syy, pelatut, pizzaa, voitto, pisteet }:
 *   pizzaa = kädessä on nyt tasan yksi kortti («PIZZAA!»)
 *   voitto = käsi tyhjeni, kierros päättyi; pisteet = mitä voittaja sai
 */
function bassoPelaa(ottelu, i, vastaus) {
  if (!bassoVuoroKelpaa(ottelu, i)) return { ok: false, syy: 'vuoro' };
  const k = ottelu.kierros, kasi = k.kasit[i], pizza = bassoPizza(k);
  const tulos = kierrosTarkista({ pizza: pizza, kortit: kasi }, vastaus, ottelu.sallitut, true);
  if (!tulos.oikein) return { ok: false, syy: tulos.syy };

  /* Oliot talteen ENNEN poistoa: indeksit muuttuvat kun käsi lyhenee. */
  const pelatut = vastaus.kortit.map(function (c) { return kasi[c.i]; });
  pelatut.forEach(function (kortti) {
    kasi.splice(kasi.indexOf(kortti), 1);
    if (kortti.fantasia) kortti.arvo = null;
    k.poistetut.push(kortti);
  });
  k.valmistetut[i].push(pizza);
  k.tyhjiaOhituksia = 0;

  if (!kasi.length) {
    const pisteet = bassoPaataKierros(ottelu, i);
    return { ok: true, pelatut: pelatut, pizzaa: false, voitto: true, pisteet: pisteet };
  }
  bassoUusiPizza(k);
  k.vuorossa = bassoSeuraava(ottelu, i);
  return { ok: true, pelatut: pelatut, pizzaa: kasi.length === 1, voitto: false, pisteet: 0 };
}

/* Vuoron vaihtoehto B: ei onnistu tai ei halua → nosta yksi.
 *
 * ⚠️ 🟡 JUMIN ESTO, jota painettu sääntö ei tunne: jos nostopakka JA
 * poistetut ovat tyhjät (kaikki kortit käsissä), nostettavaa ei ole. Kun
 * jokainen on ohittanut kierroksen ilman nostoa, uusi pizza käännetään
 * edellisen päälle — muuten pöydän pizza, jota kukaan ei voi tehdä,
 * pysäyttäisi pelin. Sama henki kuin Pizza Partyn «kukaan ei pysty».
 *
 * Palauttaa { ok, syy, nosti (kortti|null), uusiPizza }. */
function bassoOhita(ottelu, i) {
  if (!bassoVuoroKelpaa(ottelu, i)) return { ok: false, syy: 'vuoro' };
  const k = ottelu.kierros;
  const kortti = bassoNosta(k);
  let uusiPizza = false;
  if (kortti) {
    k.kasit[i].push(kortti);
    k.tyhjiaOhituksia = 0;
  } else if (++k.tyhjiaOhituksia >= ottelu.pelaajat.length) {
    bassoUusiPizza(k);
    k.tyhjiaOhituksia = 0;
    uusiPizza = true;
  }
  k.vuorossa = bassoSeuraava(ottelu, i);
  return { ok: true, nosti: kortti, uusiPizza: uusiPizza };
}

/* Voittaja saa muiden käsikorttien arvojen summan. Ottelu päättyy kun
 * joku saavuttaa tavoitteen — ja koska vain kierroksen voittaja saa
 * pisteitä, ensimmäinen tavoitteeseen yltänyt on aina yksiselitteinen. */
function bassoPaataKierros(ottelu, voittaja) {
  const k = ottelu.kierros;
  let pisteet = 0;
  k.kasit.forEach(function (kasi, j) { if (j !== voittaja) pisteet += bassoKadenPisteet(kasi); });
  k.voittaja = voittaja;
  k.pisteet = pisteet;
  ottelu.pelaajat[voittaja].pisteet += pisteet;
  ottelu.pelaajat.forEach(function (p, j) { p.valmistetut = p.valmistetut.concat(k.valmistetut[j]); });
  ottelu.aloittaja = bassoSeuraava(ottelu, ottelu.aloittaja);
  if (ottelu.pelaajat[voittaja].pisteet >= ottelu.tavoite) ottelu.voittaja = voittaja;
  return pisteet;
}

/* Apinan siirto: sallituilla laskuilla, Basso-apinan tapaan, OMALLA
 * kädellään. Palauttaa vastauksen tai null (= apina nostaa).
 *
 * ⚠️ Jos ratkoja katkeaa solmukattoon, apina ohittaa. Se on apinan
 * heikkous eikä sääntövirhe: «en löytänyt» ei tässä päätä mitään, toisin
 * kuin Pizza Partyn päättymissäännössä. Katkeamisten määrä mitataan
 * kokeessa (testit/bassokoe-testit.js). */
function bassoApinanVastaus(ottelu, i) {
  const k = ottelu.kierros, pizza = bassoPizza(k);
  const r = etsiRatkaisu(k.kasit[i], pizza.arvo, ottelu.sallitut, pizza.tayteMaara,
    BASSO_APINAN_SOLMUKATTO);
  if (!r || !r.kortit) return null;
  return {
    kortit: r.kortit.map(function (c) { return { i: c.i, arvo: c.arvo }; }),
    merkit: r.merkit.slice(),
    ryhmat: r.ryhma ? [r.ryhma] : [],
  };
}

/* ============================================================
 * SARJALLISTUS VERKKOPELIÄ VARTEN (6.10.2026, basso-huone.php)
 *
 * Kortit kulkevat NUMEROINA: täytekortti = sen `id` (0–57, taytepakka()-
 * järjestys), pizza = paikka pizzapakka()-järjestyksessä (0–41). Molemmat
 * pakat generoidaan aina samassa järjestyksessä (kortit.js tarkistaa sen),
 * joten numero riittää ja tila on ~600 tavua eikä ~12 kt.
 *
 * Palvelin lukee tilasta vain `vuorossa` ja `kierrosOhi`; kaikki muu on sille
 * läpinäkymätöntä. `viime` kertoo muille laitteille mitä juuri tapahtui
 * (näytetään kuten apinan siirto).
 *
 * ⚠️ X-kortin arvo ei kulje: levossa olevan X:n arvo on aina null
 * (bassoPelaa nollaa sen), ja pelatun arvo on `viime.vastaus`ssa.
 * ============================================================ */
function bassoPizzaId(pizza) {
  const P = pizzapakka();
  for (let i = 0; i < P.length; i++) if (P[i].kuva === pizza.kuva) return i;
  return -1;
}

function bassoSarjallista(ottelu) {
  const k = ottelu.kierros;
  const id = function (kortti) { return kortti.id; };
  const pid = bassoPizzaId;
  return {
    v: 1,
    vuorossa: k && k.voittaja === null ? k.vuorossa : null,
    kierrosOhi: !k || k.voittaja !== null,
    tavoite: ottelu.tavoite,
    kierroksia: ottelu.kierroksia,
    aloittaja: ottelu.aloittaja,
    voittaja: ottelu.voittaja,
    pelaajat: ottelu.pelaajat.map(function (p) {
      return { laji: p.laji, pisteet: p.pisteet, valmistetut: p.valmistetut.map(pid) };
    }),
    kierros: k ? {
      pizzat: k.pizzat.map(pid), poydassa: k.poydassa.map(pid),
      nosto: k.nosto.map(id), poistetut: k.poistetut.map(id),
      kasit: k.kasit.map(function (kasi) { return kasi.map(id); }),
      vuorossa: k.vuorossa,
      valmistetut: k.valmistetut.map(function (l) { return l.map(pid); }),
      tyhjiaOhituksia: k.tyhjiaOhituksia, kierratyksia: k.kierratyksia,
      voittaja: k.voittaja, pisteet: k.pisteet,
    } : null,
    viime: ottelu.viime || null,
  };
}

/* Takaisin olioiksi. `sallitut` tulee huoneen asetuksista, ei tilasta. */
function bassoPalauta(s, sallitut) {
  const T = taytepakka(), P = pizzapakka();
  const kortti = function (i) { return T[i]; };
  const pizza = function (i) { return P[i]; };
  const ottelu = {
    pelaajat: s.pelaajat.map(function (p) {
      return { laji: p.laji, pisteet: p.pisteet, valmistetut: p.valmistetut.map(pizza) };
    }),
    tavoite: s.tavoite, sallitut: sallitut, kierroksia: s.kierroksia,
    aloittaja: s.aloittaja, kierros: null, voittaja: s.voittaja, viime: s.viime || null,
  };
  const k = s.kierros;
  if (k) {
    ottelu.kierros = {
      pizzat: k.pizzat.map(pizza), poydassa: k.poydassa.map(pizza),
      nosto: k.nosto.map(kortti), poistetut: k.poistetut.map(kortti),
      kasit: k.kasit.map(function (kasi) { return kasi.map(kortti); }),
      vuorossa: k.vuorossa,
      valmistetut: k.valmistetut.map(function (l) { return l.map(pizza); }),
      tyhjiaOhituksia: k.tyhjiaOhituksia, kierratyksia: k.kierratyksia,
      voittaja: k.voittaja, pisteet: k.pisteet,
    };
  }
  return ottelu;
}
