/* Pizza Love — #2 Pizza Basso selaimessa (KOKEILU 6.10.2026).
 *
 * Säännöt: basso-saannot.js. Tehtävänanto ja Markon päätökset:
 * PELIMUODOT-ALOITUS.md (luvut 2 ja 8).
 *
 * ⚠️ TÄMÄ TIEDOSTO KORVAA peli.js:n FUNKTIOITA, EI MUUTA SITÄ.
 *
 * basso.html lataa peli.js:n sellaisenaan ja tämän sen jälkeen. Klassisissa
 * skripteissä myöhempi samanniminen `function` korvaa aiemman, joten
 * peli.js:n omat kutsut (pelaaPizzalle → enOsaa, paivitaJaTarkista →
 * tarkistaLasku, lopetaKierros → piirraTulos …) osuvat näihin.
 *
 * Miksi näin eikä erillinen näkymä: lausekevaihe (merkit, sulkeet, X-kortti,
 * raahaus, kortit pizzan päälle) on Pizza Partyssa valmis ja hyväksytty, ja
 * se on se osa jonka Basso jakaa sellaisenaan. Kokeilussa se tulee
 * ilmaiseksi, eikä peli.js:ään kosketa — Pizza Party ei voi rikkoutua.
 *
 * ⚠️ HINTA: Basso nojaa peli.js:n funktioiden NIMIIN ja `tila`-olion
 * kenttiin. Jos peli.js:ssä nimetään jotain uudelleen, Basso hajoaa
 * hiljaa. Jos Basso hyväksytään, jaettava osa irrotetaan omaksi
 * tiedostokseen (PELIMUODOT-ALOITUS.md luku 3) ja tämä kerros poistuu.
 *
 * ⚠️ VAKIOITA (const) EI VOI KORVATA. `KADEN_KOKO = 5` on peli.js:n, ja
 * siksi Basso ei käytä lepotilaa (selkäpuolet piirretään sen mukaan).
 *
 * Korvatut: aloitaPeli, enOsaa, tarkistaLasku, mietiApina, kaynnistaApina,
 *           piirraKaikki, piirraPelaajat, piirraTulos, tallennaAsetukset.
 */

const BASSO_ASETUSAVAIN = 'pizzabasso-asetukset';
const BASSO_MIETINTA = 1100;        // apinan «miettimisaika» ennen siirtoa, ms
const BASSO_APINAN_NAYTTO = 1700;   // apinan laskun näkyvyys — se on opetuspuoli
const BASSO_PIZZAA_KESTO = 1700;

/* Pelaajat, pisteraja ja värit. 🔵 Marko 6.10.2026: 30 pistettä oletuksena;
 * ihmisiä samalla laitteella 1–4 ja apinoita 0–3, yhteensä 2–4.
 * `variNrot[h]` = h:nnen ihmisen väri Merkitysten numerona 1–10. */
const BASSO_PELAAJIA_ENINTAAN = 4;
const bassoAsetukset = { ihmisia: 1, apinoita: 1, tavoite: BASSO_TAVOITTEET[0], variNrot: [2], nimet: [] };
/* 🔵 Marko 6.10.2026: «Pelaajat haluaisivat myös nimetä omat hahmot.»
 * Nimi on valinnainen; tyhjä = hahmo ilman nimeä. Sama raja kuin Partyn
 * nimimerkissä (16), koska verkkopelissä nimi kulkee samoin säännöin. */
const BASSO_NIMI_ENINTAAN = 16;
function bassoSiistiNimi(s) {
  return String(s || '').replace(/\s+/g, ' ').trim().slice(0, BASSO_NIMI_ENINTAAN);
}
let basso = null;                    // käynnissä oleva ottelu (basso-saannot.js)
let bassoAsetusMuuttui = false;
let bassoValahdysAjastin = null;

/* Kenen kortit ovat näkyvissä (pelaajan indeksi) tai null = ei kenenkään.
 * Yksin pelatessa aina se ainoa ihminen. Useamman ihmisen pelissä se on
 * vuorossa oleva ihminen vasta kun hän on napauttanut vaihtoruudun — ja
 * apinan vuorolla null, ettei edellisen pelaajan käsi jää muiden nähtäväksi. */
let bassoKatsoja = 0;

/* VERKKOPELI (basso-verkko.js asettaa, 6.10.2026). null = peli tällä
 * laitteella. Muuten { oma, varit, perustaja, laheta(), seuraava() }:
 * oma käsi näkyy aina, muiden ei koskaan; siirto lähetetään palvelimelle
 * heti kun säännöt hyväksyivät sen. */
let bassoVerkossa = null;

function bassoLataaAsetukset() {
  let a = null;
  try { a = JSON.parse(localStorage.getItem(BASSO_ASETUSAVAIN) || 'null'); } catch (e) { a = null; }
  if (!a) return;
  if (a.ihmisia >= 1 && a.ihmisia <= BASSO_PELAAJIA_ENINTAAN) bassoAsetukset.ihmisia = a.ihmisia | 0;
  if (a.apinoita >= 0 && a.apinoita <= 3) bassoAsetukset.apinoita = a.apinoita | 0;
  if (BASSO_TAVOITTEET.indexOf(a.tavoite) >= 0) bassoAsetukset.tavoite = a.tavoite;
  if (Array.isArray(a.variNrot)) {
    bassoAsetukset.variNrot = a.variNrot.filter(function (n, i, l) {
      return bassoVari(n) && l.indexOf(n) === i;
    });
  } else if (bassoVari(a.variNro)) {
    /* Tallennus ennen useaa ihmistä: yksi väri. */
    bassoAsetukset.variNrot = [a.variNro];
  } else if (a.vari >= 0 && a.vari < PELAAJAVARIT.length) {
    /* Vanha tallennus (6.10.2026, ennen kymmentä väriä): indeksi Partyn
     * neljän värin listaan. Muunnetaan Merkitysten numeroksi, jotta jo
     * valittu väri säilyy. */
    const vanha = TAYTTEET.filter(function (x) { return x.vari === PELAAJAVARIT[a.vari]; })[0];
    if (vanha) bassoAsetukset.variNrot = [vanha.arvo];
  }
  if (Array.isArray(a.nimet)) bassoAsetukset.nimet = a.nimet.map(bassoSiistiNimi);
  bassoTasapainota('ihmisia');
}

/* Pelaajia 2–4: kun toista määrää muutetaan, toinen joustaa. Jokaisella
 * ihmisellä on oma, eri väri; puuttuvat täytetään apinoiden järjestyksestä. */
function bassoTasapainota(muuttui) {
  const a = bassoAsetukset;
  if (muuttui === 'apinoita') {
    a.ihmisia = Math.min(a.ihmisia, BASSO_PELAAJIA_ENINTAAN - a.apinoita);
    a.ihmisia = Math.max(a.ihmisia, 2 - a.apinoita, 1);
  } else {
    a.apinoita = Math.min(a.apinoita, BASSO_PELAAJIA_ENINTAAN - a.ihmisia);
    a.apinoita = Math.max(a.apinoita, 2 - a.ihmisia, 0);
  }
  a.variNrot = a.variNrot.slice(0, a.ihmisia);
  BASSO_APINOIDEN_VARIT.forEach(function (n) {
    if (a.variNrot.length < a.ihmisia && a.variNrot.indexOf(n) < 0) a.variNrot.push(n);
  });
}

/* JOKAISELLA PELAAJALLA ON HAHMO JA VÄRI (Marko 6.10.2026: «Silloin kaikilla
 * pelaajilla olisi sekä hahmo että väri»).
 *
 * 🔵 VÄRIT OVAT MERKITYSTEN 10 VÄRIÄ (Marko 6.10.2026: «Anna muuten
 * mahdollisuudeksi valita mikä tahansa väri 10 eri merkitysten väristä»).
 * Ne ovat Kakkukirjan pallurat ja Pizza Love -korttien täytteet (BRAND.md §3),
 * joten lähde on kortit.js:n TAYTTEET — ei kopiota tänne. Väri tallennetaan
 * NUMERONA (1–10), koska numero on Merkitysten järjestelmässä värin nimi.
 *
 * Apinat saavat erottuvat värit tässä järjestyksessä, ihmisen väri ohitetaan.
 * Neljä ensimmäistä ovat Partyn moninpelin värit (`PELAAJAVARIT`). */
const BASSO_APINOIDEN_VARIT = [2, 4, 7, 6, 1, 10, 9, 8, 3, 5];

function bassoVari(nro) {
  const x = TAYTTEET.filter(function (t) { return t.arvo === nro; })[0];
  return x ? x.vari : null;
}

function bassoOnIhminen(i) { return !!basso && basso.pelaajat[i].laji === 'ihminen'; }
function bassoIhmisia() {
  return basso.pelaajat.filter(function (p) { return p.laji === 'ihminen'; }).length;
}

/* Värit pelaajajärjestyksessä: ihmiset omillaan, apinat muista. */
function bassoVarit() {
  if (bassoVerkossa) return bassoVerkossa.varit.map(bassoVari);
  /* ⚠️ Käynnissä olevassa ottelussa voi olla ERI määrä ihmisiä kuin
   * asetuksissa (määrä vaihtuu vasta seuraavasta ottelusta), joten puuttuva
   * ihmisen väri otetaan samasta jonosta kuin apinoiden. */
  const omat = bassoAsetukset.variNrot;
  const muut = BASSO_APINOIDEN_VARIT.filter(function (n) { return omat.indexOf(n) < 0; });
  let h = 0, a = 0;
  return basso.pelaajat.map(function (p) {
    if (p.laji === 'ihminen' && h < omat.length) return bassoVari(omat[h++]);
    return bassoVari(muut[(a++) % muut.length]);
  });
}

/* Nimi ruudunlukijalle: yksin pelatessa «Sinä», muuten «Pelaaja n»;
 * apinat numeroidaan omana joukkonaan. Näkyvää tekstiä ei ole. */
/* Pelaajan oma nimi tai tyhjä. Verkossa huoneen nimi, muuten asetuksista
 * (h:s ihminen). Apinoilla ei ole nimeä. */
function bassoOmaNimi(i) {
  if (!basso || !bassoOnIhminen(i)) return '';
  if (bassoVerkossa) return bassoVerkossa.nimet[i] || '';
  let h = 0;
  for (let j = 0; j < i; j++) if (bassoOnIhminen(j)) h++;
  return bassoAsetukset.nimet[h] || '';
}

function bassoNimi(i) {
  let h = 0, a = 0;
  for (let j = 0; j < i; j++) { if (bassoOnIhminen(j)) h++; else a++; }
  if (!bassoOnIhminen(i)) return t('basso.apina', { n: a + 1 });
  if (bassoOmaNimi(i)) return bassoOmaNimi(i);
  if (bassoVerkossa && i === bassoVerkossa.oma) return t('basso.sina');
  return bassoIhmisia() > 1 ? t('pelaaja.nimi', { n: h + 1 }) : t('basso.sina');
}

/* Valkoinen numero katoaa keltaiselle, turkoosille ja vaaleanpunaiselle.
 * Teksti valitaan taustan suhteellisesta luminanssista (WCAG-kaava). */
function bassoTekstiVari(hex) {
  const c = [1, 3, 5].map(function (i) {
    const v = parseInt(hex.substr(i, 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  /* Kontrasti valkoiseen vs. mustaan (#1A1A1A, L ≈ 0,010): valitaan suurempi. */
  return (1.05 / (L + 0.05)) >= ((L + 0.05) / 0.06) ? '#fff' : '#1A1A1A';
}

/* Hahmo värillisellä pohjalla — sama kaikille, pelissä ja tulosruudussa. */
function bassoHahmo(vari, luokka) {
  return '<span class="basso-hahmo' + (luokka ? ' ' + luokka : '') + '" style="--pelaaja-vari:' + vari +
    '"><img src="kuvat/apina.webp?v=20260910a" alt=""></span>';
}

/* OTTELUN VOITTAJA: sama hahmo omalla värillään, mutta pizza suussa (Marko
 * 7.10.2026: «koska minä voitin, niin minulla on pizzaa suussa»). Kuva on
 * pizzalove.fi:n basso-syo.webp rajattuna samaan ympyrään kuin muut hahmot,
 * joten väri tunnistaa pelaajan kuten kaikkialla muualla. Korvaa kruunun,
 * joka oli emoji eikä Pizza Loven piirrosjälkeä («kruunu on mauton»). */
/* ⚠️ RAJAUS (Marko 7.10.2026: «Nyt ei näy sitä pizzaa lainkaan — — apinan
 * tukka saa tulla vähän sen keltaisen ympyrän ulkopuolelle»). Kuva on
 * maskikehyksessä, joka on ympyrää 25 % korkeampi: maski = ympyrä ∪ sen
 * yläpuoli. Ympyrä rajaa sivut ja alaosan, ylhäältä tukka nousee yli —
 * jolloin kasvot, pizza ja paita mahtuvat ympyrään pienentämättä hahmoa. */
function bassoSyoHahmo(vari, luokka) {
  return '<span class="basso-hahmo syo' + (luokka ? ' ' + luokka : '') + '" style="--pelaaja-vari:' + vari +
    '"><span class="syo-kehys"><img src="kuvat/basso-syo.webp?v=20261006a" alt=""></span></span>';
}

/* ⚠️ KORVAA peli.js:n tallennuksen. Alkuperäinen kirjoittaa KOKO Partyn
 * asetusolion `tila`sta — ja Bassossa `tila.apinanTapa` on aina tosi, joten
 * yksikin kielen vaihto Bassossa olisi kääntänyt Partyn «Vaikeampi»-tilan
 * päälle. Yhteisestä avaimesta päivitetään vain se mikä on yhteistä. */
function tallennaAsetukset() {
  try {
    const a = JSON.parse(localStorage.getItem(ASETUSAVAIN) || 'null') || {};
    a.kieli = KIELI;
    a.sallitut = tila.sallitut;
    localStorage.setItem(ASETUSAVAIN, JSON.stringify(a));
    localStorage.setItem(BASSO_ASETUSAVAIN, JSON.stringify(bassoAsetukset));
  } catch (e) { /* yksityinen selaus: asetus jää muistiin vain istunnoksi */ }
}

/* ---------- ottelu ja kierros ---------- */

/* ⚠️ Kutsutaan peli.js:stä nimellä aloitaPeli(taso, tapa) — parametrit
 * ohitetaan. Uusi ottelu aina. */
function aloitaPeli() {
  pysaytaKaikkiAjastimet();
  bassoLataaAsetukset();
  bassoAsetusMuuttui = false;
  tila.apinanTapa = true;            // Pizza Basso: aina Basso-apinan tapaan
  tila.pelaajia = 1;
  tila.pelaajiaKaynnissa = 1;
  tila.moninpeli = false;
  tila.taso = TASOT[1];
  /* Ihmiset ensin, sitten apinat: vuoro kiertää samassa järjestyksessä. */
  const lajit = [];
  for (let i = 0; i < bassoAsetukset.ihmisia; i++) lajit.push('ihminen');
  for (let i = 0; i < bassoAsetukset.apinoita; i++) lajit.push('apina');
  /* `tila.sallitut` jaetaan viittauksena: asetuksista muutettu lupa koskee
   * heti seuraavaa siirtoa, kuten Partyssa. */
  basso = bassoOttelu(lajit, bassoAsetukset.tavoite, tila.sallitut);
  bassoAloitaKierros();
}

function bassoAloitaKierros() {
  bassoUusiKierros(basso);
  bassoNaytaKierros();
}

/* Kierroksen NÄYTTÖ ilman jakoa: verkkopelissä jaon tekee perustajan laite,
 * ja muut laitteet saavat valmiin kierroksen palvelimelta. */
function bassoNaytaKierros() {
  pysaytaKaikkiAjastimet();
  bassoJuhlaKiinni();
  bassoVaihtoKiinni();
  bassoKatsoja = bassoVerkossa ? bassoVerkossa.oma
    : bassoIhmisia() > 1 ? null : basso.pelaajat.map(function (p) { return p.laji; }).indexOf('ihminen');
  tila.kaynnissa = true;
  tila.keskeytetty = false;
  tila.tauko = null;
  tila.uudet = [];
  tila.ajat = [];
  tila.vaihe = 'valinta';
  tila.kaannetty = { pizza: true, kasi: true };
  const tauko = document.getElementById('taukoPeite');
  if (tauko) tauko.hidden = true;
  nollaaValinta();
  naytaRuutu('peliRuutu');
  bassoVuoro();
}

/* peli.js:n näkymä lukee `tila`a. Säännöt pitävät omaa tilaansa, ja tämä
 * on se YKSI paikka jossa ne yhdistetään.
 * ⚠️ `tila.kasi` on SAMA taulukko kuin säännöstön käsi, ei kopio: peli.js
 * hakee valittujen paikat `tila.kasi.indexOf`illa, ja vastaus kulkee
 * säännöstölle niillä indekseillä. */
function bassoSynkka() {
  const k = basso.kierros;
  tila.kasi = bassoKatsoja === null ? [] : k.kasit[bassoKatsoja];
  tila.taytteet = k.nosto;
  tila.pizza = bassoPizza(k);
  /* Pöydän pino ei ole Bassossa pisteitä vaan poistopakka: yksi pizza
   * näkyvissä, ei pinomerkkiä. */
  tila.poydassa = [tila.pizza];
  tila.apinanKasi = [];
}

function bassoOmaVuoro() {
  return !!basso && bassoKatsoja !== null && bassoVuoroKelpaa(basso, bassoKatsoja);
}

/* Vuoron alku. Ihmisen vuorolla odotetaan, apinan vuorolla apina miettii. */
function bassoVuoro() {
  const k = basso.kierros;
  bassoSynkka();
  if (k.voittaja !== null) return;
  tila.vaihe = 'valinta';
  tila.ohitettu = false;
  /* VERKOSSA: oma käsi näkyy aina, muiden ei koskaan; muiden vuorolla
   * odotetaan palvelinta (basso-verkko.js). Ei vaihtoruutua, ei apinoita. */
  if (bassoVerkossa) {
    bassoKatsoja = bassoVerkossa.oma;
    bassoSynkka();
    tila.lukossa = k.vuorossa !== bassoVerkossa.oma;
    tila.paljastettu = Date.now();
    tila.pelaajanAika = null;
    piirraKaikki();
    piirraPisteet();
    return;
  }
  const monta = bassoIhmisia() > 1;
  if (bassoOnIhminen(k.vuorossa)) {
    /* Vuoro siirtyy toiselle ihmiselle: kortit piiloon ja vaihtoruutu. */
    if (monta && bassoKatsoja !== k.vuorossa) {
      bassoKatsoja = null;
      bassoSynkka();
      tila.lukossa = true;
      piirraKaikki();
      piirraPisteet();
      return bassoVaihto(k.vuorossa);
    }
    tila.lukossa = false;
    tila.paljastettu = Date.now();
    tila.pelaajanAika = null;
    piirraKaikki();
    piirraPisteet();
    return;
  }
  /* Apinan vuoro. Useamman ihmisen pelissä edellisen pelaajan käsi piiloon. */
  if (monta) { bassoKatsoja = null; bassoSynkka(); }
  tila.lukossa = true;
  piirraKaikki();
  piirraPisteet();
  tila.siirtymaAjastin = setTimeout(bassoApinaPelaa, BASSO_MIETINTA);
}

/* VUORONVAIHTO SAMALLA LAITTEELLA: seuraavan pelaajan väri ja hahmo koko
 * ruudulla. Kortit näkyvät vasta kun hän napauttaa — muuten edellinen
 * pelaaja näkisi seuraavan käden laitetta ojentaessaan. */
function bassoVaihto(i) {
  const el = document.getElementById('bassoVaihto');
  const vari = bassoVarit()[i];
  el.style.setProperty('--pelaaja-vari', vari);
  el.style.setProperty('--pelaaja-teksti', bassoTekstiVari(vari));
  document.getElementById('bassoVaihtoHahmo').innerHTML = bassoHahmo(vari);
  document.getElementById('bassoVaihtoNimi').textContent = bassoOmaNimi(i);
  el.setAttribute('aria-label', t('basso.vaihto', { nimi: bassoNimi(i) }));
  el.dataset.kuka = String(i);
  /* ⚠️ Näytetään vasta seuraavalla tikillä. peli.js ajaa kytkentävahdin
   * (tarkistaKytkennat) heti latauksen jälkeen ja mittaa mikä peittää
   * napit — ja ensimmäinen vaihtoruutu syntyy juuri latauksessa. Mitattu
   * 6.10.2026: neljä väärää «PEITOSSA: DIV.basso-vaihto» -hälytystä.
   * Peitto on tarkoituksellinen, ja väärä hälytys opettaa ohittamaan
   * oikeatkin. */
  setTimeout(function () {
    if (el.dataset.kuka !== String(i) || !basso || basso.kierros.vuorossa !== i) return;
    if (!tila.kaynnissa || document.getElementById('peliRuutu').hidden) return;   // lopetettu välissä
    /* ⚠️ Ei aloitusvalikon päälle: valikko on auki latauksessa ja verkko-
     * pelistä palatessa, ja vaihtoruutu (kerros 65) peitti sen. «Pelaa»
     * kutsuu bassoVuoroa, joka näyttää vaihtoruudun valikon sulkeuduttua. */
    const valikko = document.getElementById('bassoValikko');
    if (valikko && !valikko.hidden) return;
    el.hidden = false;
    el.focus();
  }, 0);
}
function bassoVaihtoKiinni() {
  const el = document.getElementById('bassoVaihto');
  if (el) el.hidden = true;
}
function bassoVaihtoNapautus() {
  const el = document.getElementById('bassoVaihto');
  if (!el || el.hidden || !basso) return;
  const i = Number(el.dataset.kuka);
  el.hidden = true;
  if (basso.kierros.vuorossa !== i) return;
  bassoKatsoja = i;
  bassoVuoro();
}

function bassoSeuraavaVuoro(viive) {
  tila.siirtymaAjastin = setTimeout(function () {
    tila.siirtymaAjastin = null;
    bassoVuoro();
  }, viive);
}

function bassoApinaPelaa() {
  tila.siirtymaAjastin = null;
  const k = basso.kierros, i = k.vuorossa, pizza = bassoPizza(k);
  const vastaus = bassoApinanVastaus(basso, i);
  if (vastaus) {
    const r = bassoPelaa(basso, i, vastaus);
    if (r.ok) {
      /* ⚠️ Apinan lasku NÄYTETÄÄN (sama periaate kuin Partyssa): se on
       * pelin opetuspuoli, ja apina pelaa vain sallittuja laskuja.
       *
       * ⚠️ JA PIZZA JOSTA SE TEHTIIN PYSYY NÄKYVISSÄ, apinan kortit päällään.
       * Mitattu 6.10.2026: ensimmäinen versio vaihtoi seuraavan pizzan
       * samalla hetkellä kun «1 + 8 = 9» ilmestyi — laskua ei voinut
       * verrata mihinkään. Kortit ovat kopioita, joissa X:llä on apinan
       * antama arvo (säännöt nollasivat sen oikeasta kortista). */
      tila.valitut = r.pelatut.map(function (kortti, j) {
        return Object.assign({}, kortti, { arvo: vastaus.kortit[j].arvo });
      });
      piirraPizza();
      bassoValahda('apina', apinanKuva() + '<span>' + kierrosLauseke(vastaus) +
        ' = ' + pizza.arvo + '</span>', BASSO_APINAN_NAYTTO);
      tila.siirtymaAjastin = setTimeout(function () {
        tila.siirtymaAjastin = null;
        tila.valitut = [];
        bassoSiirronJalkeen(r, i, 250);
      }, BASSO_APINAN_NAYTTO);
      return;
    }
    /* Ratkojan vastaus jota säännöt eivät hyväksy olisi vika — koe
     * (testit/bassokoe.js) vartioi tätä. Peli ei saa jumittua siihen. */
    console.error('Pizza Basso: apinan siirto hylättiin', r.syy, vastaus);
  }
  const o = bassoOhita(basso, i);
  bassoValahda('apina', apinanKuva() +
    '<span class="valahdys-merkki">' + (o.nosti ? '+1' : '⊘') + '</span>', 800);
  bassoSeuraavaVuoro(900);
}

/* Yhteinen jälkikäsittely onnistuneelle siirrolle: PIZZAA!, voitto tai
 * seuraava vuoro. */
function bassoSiirronJalkeen(r, kuka, viive) {
  bassoSynkka();
  piirraKaikki();
  piirraPisteet();
  if (r.voitto) {
    tila.siirtymaAjastin = setTimeout(function () {
      tila.siirtymaAjastin = null;
      lopetaKierros('basso');
    }, viive + 300);
    return;
  }
  if (r.pizzaa) {
    tila.siirtymaAjastin = setTimeout(function () {
      bassoPizzaa(kuka);
      bassoSeuraavaVuoro(BASSO_PIZZAA_KESTO);
    }, viive);
    return;
  }
  bassoSeuraavaVuoro(viive);
}

/* ---------- ihmisen vuoro: peli.js:n kutsumat ---------- */

/* Pizzan painallus ilman kortteja = vaihtoehto B: nosta yksi.
 * (Sama ele kuin Partyssa, PELIMUODOT-ALOITUS.md luku 8 kohta 5.) */
function enOsaa() {
  if (!tila.kaynnissa || tila.lukossa || !bassoOmaVuoro()) return;
  tila.lukossa = true;
  tila.ohitettu = true;
  piirraPizza();
  const kuka = bassoKatsoja;
  const o = bassoOhita(basso, kuka);
  if (bassoVerkossa) {
    basso.viime = { tapa: 'nosti', kuka: kuka, nosti: !!o.nosti, uusiPizza: !!o.uusiPizza };
    bassoVerkossa.laheta();
  }
  /* Nostettu kortti tulee käteen selkäpuoli ylöspäin ja kääntyy
   * (peli.js piirraKasi) — pelaaja näkee että pakasta TULI kortti. */
  tila.uudet = o.nosti ? [o.nosti] : [];
  bassoSynkka();
  piirraKaikki();
  piirraPisteet();
  bassoSeuraavaVuoro(o.nosti ? 900 : 600);
}

/* Lauseke valmis (peli.js paivitaJaTarkista). Palauttaa toden jos siirto
 * meni läpi — samoin kuin alkuperäinen. */
function tarkistaLasku() {
  if (tila.lukossa || !bassoOmaVuoro()) return false;
  const tulos = laske(tokenit());
  if (!osuuko(tulos, tila.pizza.arvo)) return false;
  if (eriArvojaValituissa() !== tila.pizza.tayteMaara) return false;

  const vastaus = {
    kortit: tila.valitut.map(function (k) { return { i: tila.kasi.indexOf(k), arvo: k.arvo }; }),
    merkit: tila.merkit.slice(),
    ryhmat: tila.ryhmat.slice(),
  };
  const kuka = bassoKatsoja;
  const r = bassoPelaa(basso, kuka, vastaus);
  if (!r.ok) {
    /* Näkymän ja sääntöjen tarkistus erosivat — vika, ei pelaajan virhe. */
    console.error('Pizza Basso: säännöt hylkäsivät laskun jonka näkymä hyväksyi', r.syy, vastaus);
    return false;
  }
  tila.lukossa = true;
  if (bassoVerkossa) {
    basso.viime = { tapa: 'pelasi', kuka: kuka, vastaus: vastaus,
      kortit: r.pelatut.map(function (x) { return x.id; }),
      pizza: bassoPizzaId(tila.pizza), pizzaa: !!r.pizzaa, voitto: !!r.voitto };
    bassoVerkossa.laheta();
  }
  /* ⚠️ Vastaus on rakennettu ENNEN nollausta: nollaaValinta tyhjentää X-kortin
   * arvon, ja säännöt lukevat arvon vastauksesta eivätkä kortista. */
  nollaaValinta();
  bassoValahda('oma', '<span class="valahdys-merkki">✓</span>', 800);
  bassoSiirronJalkeen(r, kuka, 800);
  return true;
}

/* Partyn apina juoksee ajastimella. Bassossa vuorot hoitaa bassoVuoro. */
function mietiApina() { tila.apinanRatkaisu = null; }
function kaynnistaApina() {}

/* ---------- piirto ---------- */

function piirraKaikki() {
  if (!tila.pizza) return;
  piirraPelaajat();
  piirraPizza();
  piirraLauseke();
  piirraKasi();
  bassoMitoitaKasi();
  piirraOhje();
  bassoPaivitaAsetusarvot();
}

/* ⚠️ peli.css on mitoitettu VIIDELLE kortille. Bassossa käsi on 7 ja kasvaa
 * nostoista (kokeessa suurin 12–13). Mitattu 375 × 812: seitsemän korttia
 * vei kolme riviä ja pelaajarivi valui ruudun alle.
 *
 * Korttileveys kavennetaan VAIN kädessä (muuttuja asetetaan #kasi-elementtiin,
 * ei juureen), jotta pizza ja laskumerkit pysyvät ennallaan. Pystytilassa
 * enintään kaksi riviä; vaakatilassa peli.css kieltää rivityksen, joten yksi.
 * Leveys mitataan kortista eikä luetaan muuttujasta: muuttujan arvo on
 * lauseke (min(calc(…))), ei pikseleitä. */
function bassoMitoitaKasi() {
  const kasi = document.getElementById('kasi');
  if (!kasi) return;
  kasi.style.removeProperty('--kortti-lev');
  const kortit = kasi.querySelectorAll('.tayte-kortti');
  if (!kortit.length) return;
  const perus = kortit[0].getBoundingClientRect().width;
  const tyyli = getComputedStyle(kasi);
  const vali = parseFloat(tyyli.columnGap) || 6;
  const yksiRivi = tyyli.flexWrap === 'nowrap';
  const rivilla = Math.ceil(kortit.length / (yksiRivi ? 1 : 2));
  /* Vaakatilassa työsarake on sisältönsä levyinen, joten käytettävissä oleva
   * leveys lasketaan ruudusta: ruutu − pizzasarake − reunat. */
  let leveys = kasi.clientWidth;
  if (yksiRivi) {
    const pizza = document.querySelector('.pizza-alue');
    leveys = innerWidth - (pizza ? pizza.getBoundingClientRect().width : 0) - 6 * vali;
  }
  const mahtuu = Math.floor((leveys - vali * (rivilla - 1)) / rivilla);
  if (mahtuu < perus) kasi.style.setProperty('--kortti-lev', mahtuu + 'px');
}
window.addEventListener('resize', function () { if (basso && tila.pizza) bassoMitoitaKasi(); });

/* Laatikko per pelaaja: hahmo omalla värillään. Vuorossa oleva nostetaan.
 * Oma laatikko on aina ensimmäinen: väri on ainoa ero apinoihin.
 *
 * 🔵 EI KORTTIEN MÄÄRÄÄ (Marko 6.10.2026): *«Pelaajakuvakkeessa ei tarvitse
 * näkyä sitä korttien lukumäärää, koska se pizzan huutaminen on juuri se
 * merkki, että on enää yksi kortti kädessä.»* Määrä jää ruudunlukijalle
 * aria-labeliin, koska sitä ei muuten kuule mistään. */
function piirraPelaajat() {
  const rivi = document.getElementById('pelaajarivi');
  if (!rivi || !basso || !basso.kierros) return;
  rivi.hidden = false;
  const k = basso.kierros, varit = bassoVarit();
  const tunniste = 'basso' + basso.pelaajat.length + varit.join('');
  if (rivi.dataset.tila !== tunniste) {
    rivi.dataset.tila = tunniste;
    rivi.innerHTML = '';
    basso.pelaajat.forEach(function (p, i) {
      const el = document.createElement('div');
      el.className = 'pelaajanappi basso-pelaaja' + (p.laji === 'ihminen' ? ' oma' : '');
      el.style.setProperty('--pelaaja-vari', varit[i]);
      el.style.color = bassoTekstiVari(varit[i]);
      el.innerHTML = '<img src="kuvat/apina.webp?v=20260910a" alt="">' +
        '<small class="basso-laatikkonimi"></small>';
      rivi.appendChild(el);
    });
  }
  [].forEach.call(rivi.children, function (el, i) {
    const n = k.kasit[i].length;
    const nimi = el.querySelector('.basso-laatikkonimi');
    if (nimi) nimi.textContent = bassoOmaNimi(i);
    el.classList.toggle('vuorossa', k.voittaja === null && k.vuorossa === i);
    el.setAttribute('aria-label', bassoNimi(i) + ': ' + t('basso.kortteja', { n: n }) +
      (k.vuorossa === i && i === bassoKatsoja ? ' · ' + t('basso.sinunVuoro') : ''));
  });
}

/* Tulosruutu: PALKINTOPALLI (Marko 6.10.2026: «tämä loppunäkymä on edelleen
 * liian karu — — täytekuosi taustalle — — enemmän brändin näköisen ja
 * iloisemman. Ehkä joku palkintopallijuttu»).
 *
 * 🔵 SIJA OTTELUPISTEIDEN MUKAAN (Marko 6.10.2026: «nyt 2. ja 3. kilpailija on
 * molemmat 0:ssa pisteessä, joten ne pitäisi olla samalla sijalla»). Ennen
 * sija tuli tämän kierroksen jääneistä korteista — ja palli näytti silloin
 * eri järjestyksen kuin juoksukilpailu sen alla. Tasapisteet jakavat sijan;
 * tasatilanteessa kierroksen voittaja piirretään ensin. Askelman päällä pelaajan hahmo
 * omalla värillään (sama kuin pelissä). Ottelupisteet ovat pallin alla
 * juoksukilpailuna. Askelman alla jääneet kortit viuhkana ja niiden summa
 * (Marko aiemmin samana päivänä: «ne jäljelle jääneet kortit pitäisi
 * ensinnäkin nähdä»). Voittajan «+N» on häviäjien summien summa.
 *
 * Järjestys ruudulla on pallin järjestys: 2 · 1 · 3 · 4. */
const BASSO_PALLIN_JARJESTYS = [1, 0, 2, 3];        // sijaindeksit vasemmalta oikealle

function bassoSijat() {
  const k = basso.kierros;
  const rivit = basso.pelaajat.map(function (p, i) {
    return { i: i, pisteet: p.pisteet, voitti: !!k && k.voittaja === i,
             summa: k ? bassoKadenPisteet(k.kasit[i]) : 0 };
  });
  rivit.sort(function (a, b) { return (b.pisteet - a.pisteet) || (b.voitti - a.voitti) || (a.i - b.i); });
  let edellinen = null, sija = 0;
  rivit.forEach(function (r, n) {
    if (r.pisteet !== edellinen) { sija = n + 1; edellinen = r.pisteet; }
    r.sija = sija;
  });
  return rivit;
}

function piirraTulos() {
  const sailio = document.getElementById('tulosPisteet');
  if (!sailio || !basso) return;
  bassoVaihtoKiinni();                 // Esc kesken vaihtoruudun → tulos näkyviin
  sailio.innerHTML = '';
  const k = basso.kierros;
  const sijat = bassoSijat();
  const varit = bassoVarit();

  const palli = document.createElement('div');
  palli.className = 'basso-palli';
  BASSO_PALLIN_JARJESTYS.filter(function (n) { return n < sijat.length; }).forEach(function (n) {
    const r = sijat[n], p = basso.pelaajat[r.i];
    const kasi = k ? k.kasit[r.i] : [];
    const paikka = document.createElement('div');
    paikka.className = 'palli-paikka sija-' + Math.min(r.sija, 4) + (r.voitti ? ' voitti' : '');

    const yla = document.createElement('div');
    yla.className = 'palli-yla';
    /* Pallilla vain hahmo: ottelupisteet näkyvät alla juoksukilpailussa,
     * eikä samaa lukua näytetä kahdesti. */
    const hahmo = document.createElement('div');
    hahmo.className = 'palli-hahmo' + (basso.voittaja === r.i ? ' voittaja' : '');
    /* Nimi hahmon YLÄPUOLELLA: hahmo seisoo askelmalla, eikä nimi saa tulla
     * niiden väliin (Markon kysymys 7.10.2026, Clauden perustelu). */
    hahmo.innerHTML = (bassoOmaNimi(r.i) ? '<small class="palli-nimi"></small>' : '') +
      (basso.voittaja === r.i ? bassoSyoHahmo(varit[r.i]) : bassoHahmo(varit[r.i]));
    if (bassoOmaNimi(r.i)) hahmo.querySelector('.palli-nimi').textContent = bassoOmaNimi(r.i);
    const kuka = bassoNimi(r.i);
    hahmo.setAttribute('aria-label', kuka + ': ' + r.sija + '.');
    yla.appendChild(hahmo);
    paikka.appendChild(yla);

    const askel = document.createElement('div');
    askel.className = 'palli-askel';
    askel.innerHTML = '<b>' + r.sija + '</b>';
    paikka.appendChild(askel);

    const ala = document.createElement('div');
    ala.className = 'palli-ala';
    /* 🔵 «+N» KIERROKSEN VOITTAJAN ALLE, korttien paikalle (Marko 7.10.2026:
     * «Sen kuuluisi olla — korttien välissä, koska niistä korteista se summa
     * muodostuu — sen erän voittaneen pelaajan alla olipa ko. pelaaja millä
     * podiumilla tahansa»). Voittajalla ei ole kortteja, joten paikka on vapaa. */
    if (r.voitti && k.pisteet) {
      ala.classList.add('voitti');
      ala.innerHTML = '<b class="palli-lisays">+' + k.pisteet + '</b>';
    } else if (kasi.length) {
      const viuhka = document.createElement('div');
      viuhka.className = 'palli-kortit';
      kasi.forEach(function (kortti, j) {
        const el = document.createElement('span');
        el.className = 'basso-minikortti';
        el.style.setProperty('--kulma', ((j - (kasi.length - 1) / 2) * 5).toFixed(1) + 'deg');
        el.innerHTML = '<img src="' + kortti.kuva + '" alt="' + (kortti.fantasia
          ? t('fantasia.valitsematta') : t('tayte.alt', { nimi: t('tayte.' + kortti.arvo), arvo: kortti.arvo })) + '">' +
          (kortti.fantasia ? '<small>' + BASSO_FANTASIAN_PISTEET + '</small>' : '');
        viuhka.appendChild(el);
      });
      ala.appendChild(viuhka);
      const summa = document.createElement('b');
      summa.className = 'basso-summa';
      summa.textContent = r.summa;          // ilman «=»-merkkiä (Marko 7.10.2026)
      ala.appendChild(summa);
    }
    paikka.appendChild(ala);
    palli.appendChild(paikka);
  });
  sailio.appendChild(palli);

  bassoPiirraKisa(varit);

  const jatko = document.getElementById('uudelleen');
  /* Verkossa seuraavan kierroksen jakaa perustaja; muut odottavat ⏳. */
  const odota = document.getElementById('bassoOdota');
  const odottaa = !!bassoVerkossa && !bassoVerkossa.perustaja && basso.voittaja === null;
  if (jatko) jatko.hidden = odottaa;
  if (odota) odota.hidden = !odottaa;
  if (jatko) {
    jatko.setAttribute('aria-label', t(basso.voittaja === null && !tila.keskeytetty
      ? 'basso.seuraava' : 'tulos.uudelleen'));
  }
  /* Viuhka mitoitetaan vasta kun ruutu on näkyvissä: piirto tapahtuu ennen
   * naytaRuutu-kutsua, ja piilossa olevan leveys on nolla. */
  requestAnimationFrame(bassoLevitaViuhkat);
  /* Konfetti kun IHMINEN voitti kierroksen (kuka tahansa ihmisistä). */
  /* Verkossa kaikki ovat ihmisiä: konfetti vain omalle voitolle. */
  if (k && k.voittaja !== null && (bassoVerkossa ? k.voittaja === bassoVerkossa.oma
    : bassoOnIhminen(k.voittaja))) bassoKonfetti();
  /* ⚠️ VOITTORUUTU EI AVAUDU ITSESTÄÄN (Marko 7.10.2026: «Se tulosruutu meni
   * aivan liian nopeasti, jotta sitä olisi ehtinyt katsoa — — Tulosruutu
   * voisi mennä pois vasta ruutua napauttamalla»). Ennen juhla peitti
   * tulosruudun 1,9 s:n jälkeen. Nyt napautus vie eteenpäin: ks.
   * bassoTulosEteenpain. */
}

/* Tulosruudun napautus (missä tahansa, ⚙ pois lukien) tai ▶:
 *   kierros päättyi   → seuraava kierros (verkossa jakaa perustaja)
 *   ottelu päättyi    → voittoruutu; sen napautus → uusi ottelu */
function bassoTulosEteenpain() {
  if (!basso || document.getElementById('tulosRuutu').hidden) return;
  if (!document.getElementById('bassoJuhla').hidden) return;
  if (basso.voittaja !== null && !tila.keskeytetty) return bassoJuhla(bassoVarit());
  bassoJatka();
}

/* ⚠️ EI `bassoSeuraava`: se nimi on basso-saannot.js:n «kuka pelaa
 * seuraavaksi», ja myöhempi määrittely voittaa hiljaa. Mitattu 7.10.2026:
 * jokainen vuoronvaihto aloitti uuden kierroksen, eivätkä vastustajat
 * pelanneet lainkaan. testit/bassokoe.js vartioi nyt nimitörmäyksiä. */
function bassoJatka() {
  if (bassoVerkossa) return bassoVerkossa.seuraava();     // vain perustaja jakaa
  if (!basso || basso.voittaja !== null || tila.keskeytetty) return aloitaPeli();
  bassoAloitaKierros();
}

/* OTTELUN VOITTO: voittajan oma hahmo pizza suussa, tausta voittajan
 * värinen. Avautuu tulosruudun napautuksesta, ja maalin pizzapala on
 * silloin syöty. */
function bassoJuhla(varit) {
  const el = document.getElementById('bassoJuhla');
  if (!el) return;
  const v = basso.voittaja, vari = varit[v];
  el.style.setProperty('--pelaaja-vari', vari);
  el.style.setProperty('--pelaaja-teksti', bassoTekstiVari(vari));
  /* Voittaja isona pizza suussa; muut alla pistejärjestyksessä (Marko
   * 7.10.2026: «muut pelaajat näkyvät — alla pistejärjestyksessä. Voittaja
   * isoimpana ja tosiaan pizza suussa»). ⚠️ Nimet textContentilla: ne ovat
   * pelaajan syötettä ja verkkopelissä toisen laitteen syötettä. */
  document.getElementById('bassoJuhlaHahmo').innerHTML = bassoSyoHahmo(vari);
  document.getElementById('bassoJuhlaNimi').textContent = bassoOmaNimi(v);
  document.getElementById('bassoJuhlaPisteet').textContent = basso.pelaajat[v].pisteet;
  const muut = document.getElementById('bassoJuhlaMuut');
  muut.innerHTML = '';
  basso.pelaajat.map(function (p, i) { return { i: i, pisteet: p.pisteet }; })
    .filter(function (r) { return r.i !== v; })
    .sort(function (a, b) { return (b.pisteet - a.pisteet) || (a.i - b.i); })
    .forEach(function (r, n) {
      const li = document.createElement('li');
      li.style.animationDelay = (0.55 + n * 0.12).toFixed(2) + 's';
      li.innerHTML = bassoHahmo(varit[r.i]) + '<span class="juhla-muu-nimi"></span><b></b>';
      /* Nimetön (apina tai nimeämätön ihminen): «Apina 1» / «Pelaaja 2» — tyhjä
       * rivi näytti viallisetta. */
      li.querySelector('.juhla-muu-nimi').textContent = bassoOmaNimi(r.i) || bassoNimi(r.i);
      li.querySelector('b').textContent = r.pisteet;
      li.setAttribute('aria-label', bassoNimi(r.i) + ': ' + r.pisteet);
      muut.appendChild(li);
    });
  el.setAttribute('aria-label', bassoNimi(v) + ': ' + basso.pelaajat[v].pisteet + ' · ' + t('tauko.jatka'));
  el.hidden = false;
  el.classList.remove('nakyy');
  void el.offsetWidth;
  el.classList.add('nakyy');
  bassoHuuto();
  el.focus();
  document.getElementById('bassoKisa').classList.add('syoty');   // pala syöty
}
function bassoJuhlaKiinni() {
  const el = document.getElementById('bassoJuhla');
  if (el) { el.hidden = true; el.classList.remove('nakyy'); }
}
/* Voittoruudun napautus: uusi ottelu (verkossa perustajan laite jakaa; muut
 * palaavat tulosruutuun odottamaan ⏳). */
function bassoJuhlaNapautus() {
  bassoJuhlaKiinni();
  bassoJatka();
}

/* JUOKSUKILPAILU KOHTI PISTERAJAA (Marko 6.10.2026: «eri pelaajat etenevät
 * sinne kohti ja samalla niiden alla palkki kasvaa»). Rata per pelaaja
 * pelaajajärjestyksessä, hahmo palkin kärjessä ja pisteet sen vieressä,
 * maaliviiva pisterajan kohdalla ja sen päällä pizzapala (Marko 6.10.2026:
 * «Kannattaisiko tätä kuvaa käyttää siellä maalissa?» — juostaan pizzalle).
 * Kierroksen voittaja etenee
 * animaationa kierroksen pisteiden verran. Ylitys pysähtyy maaliin. */
function bassoPiirraKisa(varit) {
  const kisa = document.getElementById('bassoKisa');
  if (!kisa) return;
  const k = basso.kierros, tavoite = basso.tavoite;
  kisa.innerHTML = '<div class="kisa-maali" aria-hidden="true">' +
    '<img src="kuvat/pizzapala.webp?v=20261006a" alt=""><b>' + tavoite + '</b></div>';
  kisa.setAttribute('aria-label', t('as.pisteraja') + ': ' + tavoite);
  const siirrot = [];
  basso.pelaajat.forEach(function (p, i) {
    const lisa = (k && k.voittaja === i) ? k.pisteet : 0;
    const ennen = Math.min(1, Math.max(0, (p.pisteet - lisa) / tavoite));
    const nyt = Math.min(1, p.pisteet / tavoite);
    const rata = document.createElement('div');
    rata.className = 'kisa-rata' + (p.laji === 'ihminen' ? ' oma' : '') + (nyt >= 1 ? ' maalissa' : '');
    rata.style.setProperty('--pelaaja-vari', varit[i]);
    const kuka = bassoNimi(i);
    rata.setAttribute('aria-label', kuka + ': ' + p.pisteet + ' / ' + tavoite);
    rata.innerHTML = '<span class="kisa-palkki"></span>' +
      '<span class="kisa-juoksija">' + bassoHahmo(varit[i]) + '<b>' + p.pisteet + '</b></span>';
    bassoKisaKohta(rata, ennen);
    kisa.appendChild(rata);
    if (nyt !== ennen) siirrot.push([rata, nyt]);
  });
  /* Ensin edellinen tilanne, sitten liike — muuten selain piirtää suoraan
   * lopputilan eikä mitään tapahdu. Odotetaan että ruutu on näkyvissä. */
  setTimeout(function () {
    siirrot.forEach(function (s) { s[0].classList.add('liikkuu'); bassoKisaKohta(s[0], s[1]); });
  }, 450);
}

/* Palkin pituus ja hahmon paikka samasta osuudesta. Radan reunat ovat
 * CSS-muuttujissa, jotta JS ja tyyli eivät laske eri rataa. */
function bassoKisaKohta(rata, osuus) {
  rata.querySelector('.kisa-palkki').style.width = 'calc((100% - var(--rata-alku) - var(--rata-loppu)) * ' + osuus + ')';
  rata.querySelector('.kisa-juoksija').style.left =
    'calc(var(--rata-alku) + (100% - var(--rata-alku) - var(--rata-loppu)) * ' + osuus + ')';
}

/* Kortit limittyvät vain sen verran kuin on pakko: pari korttia rinnakkain,
 * neljätoista tiiviinä viuhkana askelman levyisenä. */
function bassoLevitaViuhkat() {
  [].forEach.call(document.querySelectorAll('#tulosPisteet .palli-kortit'), function (v) {
    const kortit = v.children, n = kortit.length;
    if (!n) return;
    const leveys = v.getBoundingClientRect().width;
    const kortti = kortit[0].getBoundingClientRect().width;
    const askel = n > 1 ? Math.min(kortti + 3, (leveys - kortti) / (n - 1)) : 0;
    const alku = (leveys - (kortti + askel * (n - 1))) / 2;
    [].forEach.call(kortit, function (el, j) { el.style.left = (alku + askel * j).toFixed(1) + 'px'; });
  });
}
window.addEventListener('resize', function () {
  if (!document.getElementById('tulosRuutu').hidden) bassoLevitaViuhkat();
});

/* Konfetti täytteiden väreillä, kun SINÄ voitit kierroksen. Kerran, kevyesti.
 * Liikettä vähentävä asetus → ei konfettia lainkaan. */
function bassoKonfetti() {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ruutu = document.getElementById('tulosRuutu');
  const vanha = ruutu.querySelector('.basso-konfetti');
  if (vanha) vanha.remove();
  const kerros = document.createElement('div');
  kerros.className = 'basso-konfetti';
  kerros.setAttribute('aria-hidden', 'true');
  const varit = TAYTTEET.map(function (x) { return x.vari; });
  for (let i = 0; i < 46; i++) {
    const s = document.createElement('span');
    s.style.left = (Math.random() * 100).toFixed(1) + '%';
    s.style.background = varit[i % varit.length];
    s.style.animationDelay = (Math.random() * 0.9).toFixed(2) + 's';
    s.style.animationDuration = (2.2 + Math.random() * 1.4).toFixed(2) + 's';
    s.style.setProperty('--kierto', (Math.random() * 720 - 360).toFixed(0) + 'deg');
    s.style.setProperty('--sivu', (Math.random() * 120 - 60).toFixed(0) + 'px');
    kerros.appendChild(s);
  }
  ruutu.appendChild(kerros);
  setTimeout(function () { kerros.remove(); }, 4000);
}

/* Välähdys omalla kestollaan. peli.js:n valahda() pitää aina 900 ms, ja
 * apinan lasku tarvitsee enemmän: se on luettava, ei vain nähtävä. */
function bassoValahda(kenen, sisalto, ms) {
  const v = document.getElementById('valahdys');
  if (bassoValahdysAjastin) clearTimeout(bassoValahdysAjastin);
  v.innerHTML = sisalto;
  v.className = 'valahdys nakyy ' + kenen;
  bassoValahdysAjastin = setTimeout(function () {
    bassoValahdysAjastin = null;
    v.className = 'valahdys';
  }, ms);
}

/* ---------- PIZZAA! ----------
 * 🔵 Marko 6.10.2026: «Animaatio, ääni ja animaatioon yhdistettynä
 * Basso-apinan kuva.» Ei rangaistusta (painettu sääntö ei tunne sitä). */
function bassoPizzaa(kuka) {
  const el = document.getElementById('bassoPizzaa');
  if (!el) return;
  const vari = bassoVarit()[kuka];
  el.style.setProperty('--pelaaja-vari', vari);
  el.style.setProperty('--pelaaja-teksti', bassoTekstiVari(vari));
  el.hidden = false;
  /* Animaatio alkaa alusta myös jos edellinen on yhä kesken. */
  el.classList.remove('nakyy');
  void el.offsetWidth;
  el.classList.add('nakyy');
  bassoHuuto();
  setTimeout(function () { el.classList.remove('nakyy'); el.hidden = true; }, BASSO_PIZZAA_KESTO);
}

/* Huuto syntetisoidaan: pelissä ei ole äänitiedostoja, eikä yhden huudon
 * takia kannata lisätä ladattavaa. Kolme nousevaa säveltä, lyhyt.
 * ⚠️ Selain sallii äänen vasta käyttäjän eleen jälkeen — tässä vaiheessa
 * pelaaja on jo napauttanut, joten konteksti saa käynnistyä. */
let bassoAani = null;
function bassoHuuto() {
  try {
    const Konteksti = window.AudioContext || window.webkitAudioContext;
    if (!Konteksti) return;
    if (!bassoAani) bassoAani = new Konteksti();
    if (bassoAani.state === 'suspended') bassoAani.resume();
    const nyt = bassoAani.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach(function (hz, i) {
      const o = bassoAani.createOscillator(), g = bassoAani.createGain();
      o.type = 'triangle';
      o.frequency.value = hz;
      const alku = nyt + i * 0.11, loppu = alku + (i === 3 ? 0.42 : 0.14);
      g.gain.setValueAtTime(0.0001, alku);
      g.gain.exponentialRampToValueAtTime(0.22, alku + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, loppu);
      o.connect(g); g.connect(bassoAani.destination);
      o.start(alku); o.stop(loppu + 0.02);
    });
  } catch (e) { /* ääni on lisä, ei ehto */ }
}

/* ---------- asetukset: pelaajat, värit ja pisteraja ---------- */

let bassoVariKuka = 0;               // kenen ihmisen väriä asetuksissa valitaan

function bassoPaivitaAsetusarvot() {
  const a = bassoAsetukset;
  const v = document.getElementById('arvoVari');
  if (v) v.innerHTML = a.variNrot.map(function (n) {
    return '<span class="basso-vari-pallo" style="background:' + bassoVari(n) + '"></span>';
  }).join('');
  const ih = document.getElementById('arvoIhmiset');
  if (ih) ih.textContent = a.ihmisia === 1 ? t('ihmiset.yksi') : t('ihmiset.monta', { n: a.ihmisia });
  const ap = document.getElementById('arvoApinat');
  if (ap) ap.textContent = a.apinoita === 0 ? t('apinat.ei')
    : a.apinoita === 1 ? t('apinat.yksi') : t('apinat.monta', { n: a.apinoita });
  const p = document.getElementById('arvoPisteraja');
  if (p) p.textContent = t('pisteraja.n', { n: a.tavoite });
}

function bassoPiirraAsetukset() {
  const a = bassoAsetukset;
  function lista(id, arvot, nimi, onValittu, valitse) {
    const sailio = document.getElementById(id);
    if (!sailio) return;
    sailio.innerHTML = '';
    arvot.forEach(function (v) {
      const nappi = document.createElement('button');
      nappi.className = 'as-valinta' + (onValittu(v) ? ' valittu' : '');
      nappi.innerHTML = '<b>' + nimi(v) + '</b>';
      nappi.onclick = function () {
        valitse(v);
        bassoAsetusMuuttui = true;
        tallennaAsetukset();
        bassoPiirraAsetukset();
      };
      sailio.appendChild(nappi);
    });
  }
  /* Määrät joustavat toisiinsa (yhteensä 2–4): valinta ei ole koskaan
   * mahdoton, vaan toinen määrä mukautuu (bassoTasapainota). */
  lista('bassoIhmiset', [1, 2, 3, 4],
    function (n) { return n === 1 ? t('ihmiset.yksi') : t('ihmiset.monta', { n: n }); },
    function (n) { return n === a.ihmisia; },
    function (n) { a.ihmisia = n; bassoTasapainota('ihmisia'); });
  lista('bassoApinat', [0, 1, 2, 3],
    function (n) { return n === 0 ? t('apinat.ei') : n === 1 ? t('apinat.yksi') : t('apinat.monta', { n: n }); },
    function (n) { return n === a.apinoita; },
    function (n) { a.apinoita = n; bassoTasapainota('apinoita'); });

  /* VÄRIT. Useampi ihminen: ensin kenen väri (hahmo hänen nykyisellä
   * värillään), sitten väri. Toisen ihmisen jo valitsema väri ei käy.
   * Väri vaihtuu heti eikä aloita uutta ottelua: se ei muuta pelin kulkua. */
  if (bassoVariKuka >= a.ihmisia) bassoVariKuka = 0;
  const kuka = document.getElementById('bassoVariKuka');
  if (kuka) {
    kuka.innerHTML = '';
    kuka.hidden = a.ihmisia < 2;
    a.variNrot.forEach(function (n, h) {
      const nappi = document.createElement('button');
      nappi.className = 'basso-vari-valinta' + (h === bassoVariKuka ? ' valittu' : '');
      nappi.setAttribute('aria-label', t('pelaaja.nimi', { n: h + 1 }));
      nappi.setAttribute('aria-pressed', h === bassoVariKuka ? 'true' : 'false');
      nappi.innerHTML = bassoHahmo(bassoVari(n));
      nappi.onclick = function () { bassoVariKuka = h; bassoPiirraAsetukset(); };
      kuka.appendChild(nappi);
    });
  }
  /* NIMI valitulle ihmiselle (yksin pelatessa omalle). Kirjoitus tallentuu
   * heti eikä kenttää piirretä uudelleen kesken kirjoittamisen. */
  const nimiKentta = document.getElementById('bassoNimiKentta');
  if (nimiKentta && document.activeElement !== nimiKentta) {
    nimiKentta.value = a.nimet[bassoVariKuka] || '';
  }
  const varit = document.getElementById('bassoVarit');
  if (varit) {
    varit.innerHTML = '';
    TAYTTEET.forEach(function (x) {
      const n = x.arvo, valittu = n === a.variNrot[bassoVariKuka];
      const toisen = !valittu && a.variNrot.indexOf(n) >= 0;
      const nappi = document.createElement('button');
      nappi.className = 'basso-vari-valinta' + (valittu ? ' valittu' : '');
      nappi.disabled = toisen;
      nappi.setAttribute('aria-label', t('basso.vari', { n: n }));
      nappi.setAttribute('aria-pressed', valittu ? 'true' : 'false');
      nappi.innerHTML = bassoHahmo(x.vari);
      nappi.onclick = function () {
        a.variNrot[bassoVariKuka] = n;
        tallennaAsetukset();
        bassoPiirraAsetukset();
        if (basso && basso.kierros) {
          piirraPelaajat();
          if (!document.getElementById('tulosRuutu').hidden) piirraTulos();
        }
      };
      varit.appendChild(nappi);
    });
  }
  lista('bassoPisterajat', BASSO_TAVOITTEET,
    function (n) { return t('pisteraja.n', { n: n }); },
    function (n) { return n === a.tavoite; },
    function (n) { a.tavoite = n; });
  bassoPaivitaAsetusarvot();
}

/* ⚠️ Pelaajien määrät ja pisteraja vaihtavat OTTELUN, joten ne astuvat
 * voimaan kun asetukset suljetaan — kuten pelaajamäärä Partyssa. */
function bassoAsetuksetSuljettu() {
  if (!bassoAsetusMuuttui) return;
  bassoAsetusMuuttui = false;
  if (bassoVerkossa) return;           // verkkopelin kokoonpano on huoneen
  aloitaPeli();
}

/* ⚠️ peli.js:n kytke() ajetaan ENSIN (sen DOMContentLoaded rekisteröitiin
 * aiemmin), ja se asettaa nappien onclickit. Tämä lisää omansa
 * addEventListenerillä tai korvaa vain ne joiden merkitys Bassossa muuttuu. */
document.addEventListener('DOMContentLoaded', function () {
  bassoLataaAsetukset();
  bassoPiirraAsetukset();
  ['asetuksetAuki', 'asetuksiin'].forEach(function (id) {
    const n = document.getElementById(id);
    if (n) n.addEventListener('click', bassoPiirraAsetukset);
  });
  /* Sulkeminen: risti tai taustan napautus (peli.js suljeAsetukset). */
  const peite = document.getElementById('asetusPeite');
  const kiinni = document.getElementById('asetusKiinni');
  if (kiinni) kiinni.addEventListener('click', bassoAsetuksetSuljettu);
  if (peite) peite.addEventListener('click', function (e) {
    if (e.target === peite) bassoAsetuksetSuljettu();
  });

  const nimiKentta = document.getElementById('bassoNimiKentta');
  if (nimiKentta) {
    nimiKentta.maxLength = BASSO_NIMI_ENINTAAN;
    nimiKentta.addEventListener('input', function () {
      bassoAsetukset.nimet[bassoVariKuka] = bassoSiistiNimi(nimiKentta.value);
      tallennaAsetukset();
      if (basso && basso.kierros && !bassoVerkossa) piirraPelaajat();
    });
  }

  const vaihto = document.getElementById('bassoVaihto');
  if (vaihto) {
    vaihto.addEventListener('click', bassoVaihtoNapautus);
    vaihto.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bassoVaihtoNapautus(); }
    });
  }

  const juhla = document.getElementById('bassoJuhla');
  if (juhla) {
    juhla.addEventListener('click', bassoJuhlaNapautus);
    juhla.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bassoJuhlaNapautus(); }
      if (e.key === 'Escape') { e.preventDefault(); bassoJuhlaKiinni(); }
    });
  }

  /* ▶ tulosruudussa: seuraava kierros, tai uusi ottelu jos edellinen
   * päättyi tai keskeytettiin. */
  const jatko = document.getElementById('uudelleen');
  if (jatko) jatko.onclick = function (e) { e.stopPropagation(); bassoTulosEteenpain(); };
  /* Koko tulosruutu on napautettava (Marko 7.10.2026). ⚙ ja muut napit
   * hoitavat itsensä eivätkä vie eteenpäin. */
  const tulosRuutu = document.getElementById('tulosRuutu');
  if (tulosRuutu) tulosRuutu.addEventListener('click', function (e) {
    if (e.target.closest('button, a, input')) return;
    bassoTulosEteenpain();
  });

  /* ⌂-napit (tulos ja tauko) ovat basso.html:ssä piilossa: Bassolla ei ole
   * omaa valikkoa, ja Partyn valikkoon vievä nappi heitti pelaajan pois
   * pelistä (Marko 6.10.2026). */

  /* Vahti (sama henki kuin peli.js:n tarkistaKytkennat): Basso nojaa
   * peli.js:n nimiin, ja kadonnut nimi on muuten hiljainen. */
  const puuttuu = ['pelaaPizzalle', 'nollaaValinta', 'tokenit', 'eriArvojaValituissa',
    'piirraPizza', 'piirraKasi', 'piirraLauseke', 'piirraOhje', 'piirraPisteet', 'lopetaKierros',
    'naytaRuutu', 'pysaytaKaikkiAjastimet', 'apinanKuva', 'kierrosLauseke', 'laske', 'osuuko']
    .filter(function (f) { return typeof window[f] !== 'function'; });
  if (typeof tila !== 'object' || !tila) puuttuu.push('tila');
  if (puuttuu.length) {
    console.error('Pizza Basso ' + new Date().toLocaleTimeString() + ': PUUTTUU peli.js:stä →', puuttuu);
  }
});
