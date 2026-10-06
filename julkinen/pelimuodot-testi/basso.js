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

/* Apinoiden määrä ja pisteraja. 🔵 Marko 6.10.2026: 30 pistettä oletuksena. */
const bassoAsetukset = { apinoita: 1, tavoite: BASSO_TAVOITTEET[0] };
let basso = null;                    // käynnissä oleva ottelu (basso-saannot.js)
let bassoAsetusMuuttui = false;
let bassoValahdysAjastin = null;

const BASSO_IHMINEN = 0;             // ihminen on aina pelaaja 0

function bassoLataaAsetukset() {
  let a = null;
  try { a = JSON.parse(localStorage.getItem(BASSO_ASETUSAVAIN) || 'null'); } catch (e) { a = null; }
  if (!a) return;
  if (a.apinoita >= 1 && a.apinoita <= 3) bassoAsetukset.apinoita = a.apinoita | 0;
  if (BASSO_TAVOITTEET.indexOf(a.tavoite) >= 0) bassoAsetukset.tavoite = a.tavoite;
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
  const lajit = ['ihminen'];
  for (let i = 0; i < bassoAsetukset.apinoita; i++) lajit.push('apina');
  /* `tila.sallitut` jaetaan viittauksena: asetuksista muutettu lupa koskee
   * heti seuraavaa siirtoa, kuten Partyssa. */
  basso = bassoOttelu(lajit, bassoAsetukset.tavoite, tila.sallitut);
  bassoAloitaKierros();
}

function bassoAloitaKierros() {
  pysaytaKaikkiAjastimet();
  bassoUusiKierros(basso);
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
  tila.kasi = k.kasit[BASSO_IHMINEN];
  tila.taytteet = k.nosto;
  tila.pizza = bassoPizza(k);
  /* Pöydän pino ei ole Bassossa pisteitä vaan poistopakka: yksi pizza
   * näkyvissä, ei pinomerkkiä. */
  tila.poydassa = [tila.pizza];
  tila.apinanKasi = [];
}

function bassoOmaVuoro() {
  return !!basso && bassoVuoroKelpaa(basso, BASSO_IHMINEN);
}

/* Vuoron alku. Ihmisen vuorolla odotetaan, apinan vuorolla apina miettii. */
function bassoVuoro() {
  const k = basso.kierros;
  bassoSynkka();
  if (k.voittaja !== null) return;
  tila.vaihe = 'valinta';
  tila.ohitettu = false;
  if (k.vuorossa === BASSO_IHMINEN) {
    tila.lukossa = false;
    tila.paljastettu = Date.now();
    tila.pelaajanAika = null;
    piirraKaikki();
    piirraPisteet();
    return;
  }
  tila.lukossa = true;
  piirraKaikki();
  piirraPisteet();
  tila.siirtymaAjastin = setTimeout(bassoApinaPelaa, BASSO_MIETINTA);
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
  const o = bassoOhita(basso, BASSO_IHMINEN);
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
  const r = bassoPelaa(basso, BASSO_IHMINEN, vastaus);
  if (!r.ok) {
    /* Näkymän ja sääntöjen tarkistus erosivat — vika, ei pelaajan virhe. */
    console.error('Pizza Basso: säännöt hylkäsivät laskun jonka näkymä hyväksyi', r.syy, vastaus);
    return false;
  }
  tila.lukossa = true;
  /* ⚠️ Vastaus on rakennettu ENNEN nollausta: nollaaValinta tyhjentää X-kortin
   * arvon, ja säännöt lukevat arvon vastauksesta eivätkä kortista. */
  nollaaValinta();
  bassoValahda('oma', '<span class="valahdys-merkki">✓</span>', 800);
  bassoSiirronJalkeen(r, BASSO_IHMINEN, 800);
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

/* Laatikko per pelaaja: luku on KORTTIEN MÄÄRÄ kädessä, koska se on
 * Bassossa se kilpa (ensimmäinen tyhjä käsi voittaa). Pisteet näkyvät
 * kierroksen lopussa. Vuorossa oleva nostetaan. */
function piirraPelaajat() {
  const rivi = document.getElementById('pelaajarivi');
  if (!rivi || !basso || !basso.kierros) return;
  rivi.hidden = false;
  const k = basso.kierros;
  const tunniste = 'basso' + basso.pelaajat.length;
  if (rivi.dataset.tila !== tunniste) {
    rivi.dataset.tila = tunniste;
    rivi.innerHTML = '';
    basso.pelaajat.forEach(function (p) {
      const el = document.createElement('div');
      const apina = p.laji === 'apina';
      el.className = 'pelaajanappi ' + (apina ? 'p-apina' : 'p-oma ei-kuvaa');
      el.innerHTML = (apina ? '<img src="kuvat/apina.webp?v=20260910a" alt="">' : '') +
        '<b class="pelaajanappi-pisteet basso-kortit">0</b>';
      rivi.appendChild(el);
    });
  }
  [].forEach.call(rivi.children, function (el, i) {
    const n = k.kasit[i].length;
    el.querySelector('.pelaajanappi-pisteet').textContent = n;
    el.classList.toggle('vuorossa', k.voittaja === null && k.vuorossa === i);
    const kuka = i === BASSO_IHMINEN ? t('pisteet.omat') : t('basso.apina', { n: i });
    el.setAttribute('aria-label', kuka + ': ' + t('basso.kortteja', { n: n }) +
      (k.vuorossa === i && i === BASSO_IHMINEN ? ' · ' + t('basso.sinunVuoro') : ''));
  });
}

/* Tulosruutu (Marko 6.10.2026: «ne jäljelle jääneet kortit pitäisi
 * ensinnäkin nähdä»). Rivi per pelaaja, kierroksen voittaja ensin:
 *
 *   [ottelupisteet]  jääneet kortit kuvina  = summa      ← häviäjät
 *   [ottelupisteet]  +summa                              ← voittaja
 *
 * Voittajan +N on tasan häviäjien summien summa, joten pisteiden alkuperä
 * näkyy korteista eikä sitä tarvitse selittää. Ei tekstiä: kortit, luvut
 * ja merkit ovat kieliriippumattomia. Fantasiakortti on 20 (painettu sääntö),
 * ja se näkyy kortin vieressä, koska X-kortissa ei ole lukua. */
function piirraTulos() {
  const sailio = document.getElementById('tulosPisteet');
  if (!sailio || !basso) return;
  sailio.innerHTML = '';
  const k = basso.kierros;
  const jarjestys = basso.pelaajat.map(function (p, i) { return i; });
  if (k && k.voittaja !== null) {
    jarjestys.sort(function (a, b) { return (b === k.voittaja) - (a === k.voittaja); });
  }
  jarjestys.forEach(function (i) {
    const p = basso.pelaajat[i];
    const voitti = !!k && k.voittaja === i;
    const kasi = k ? k.kasit[i] : [];
    const rivi = document.createElement('div');
    rivi.className = 'basso-tulos-rivi' + (voitti ? ' voitti' : '');

    const laatikko = document.createElement('div');
    laatikko.className = 'pisteet iso ' + (p.laji === 'apina' ? 'apina' : 'oma') +
      (voitti ? ' voittaja' : '');
    laatikko.innerHTML =
      (basso.voittaja === i ? '<span class="basso-kruunu" aria-hidden="true">👑</span>' : '') +
      (p.laji === 'apina' ? '<img src="kuvat/apina.webp?v=20260910a" alt="">' : '') +
      '<b>' + p.pisteet + '</b>';
    const kuka = i === BASSO_IHMINEN ? t('pisteet.omat') : t('basso.apina', { n: i });
    laatikko.setAttribute('aria-label', kuka + ': ' + p.pisteet);
    rivi.appendChild(laatikko);

    if (voitti) {
      const lisa = document.createElement('b');
      lisa.className = 'basso-lisays';
      lisa.textContent = '+' + k.pisteet;
      rivi.appendChild(lisa);
    } else if (kasi.length) {
      const kortit = document.createElement('div');
      kortit.className = 'basso-jaaneet';
      kasi.forEach(function (kortti) {
        const el = document.createElement('span');
        el.className = 'basso-minikortti';
        el.innerHTML = '<img src="' + kortti.kuva + '" alt="' + (kortti.fantasia
          ? t('fantasia.valitsematta') : t('tayte.alt', { nimi: t('tayte.' + kortti.arvo), arvo: kortti.arvo })) + '">' +
          (kortti.fantasia ? '<small>' + BASSO_FANTASIAN_PISTEET + '</small>' : '');
        kortit.appendChild(el);
      });
      rivi.appendChild(kortit);
      const summa = document.createElement('b');
      summa.className = 'basso-summa';
      summa.textContent = '= ' + bassoKadenPisteet(kasi);
      rivi.appendChild(summa);
    }
    sailio.appendChild(rivi);
  });

  /* Pisteraja lipun takana — ilman sitä luku ei kerro kuinka kaukana maali on. */
  const raja = document.createElement('div');
  raja.className = 'basso-raja';
  raja.setAttribute('aria-label', t('as.pisteraja') + ': ' + basso.tavoite);
  raja.innerHTML = '<span aria-hidden="true">🏁</span><b>' + basso.tavoite + '</b>';
  sailio.appendChild(raja);

  const jatko = document.getElementById('uudelleen');
  if (jatko) {
    jatko.setAttribute('aria-label', t(basso.voittaja === null && !tila.keskeytetty
      ? 'basso.seuraava' : 'tulos.uudelleen'));
  }
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
  el.classList.toggle('apinan', kuka !== BASSO_IHMINEN);
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

/* ---------- asetukset: apinat ja pisteraja ---------- */

function bassoPaivitaAsetusarvot() {
  const a = document.getElementById('arvoApinat');
  if (a) a.textContent = bassoAsetukset.apinoita === 1
    ? t('apinat.yksi') : t('apinat.monta', { n: bassoAsetukset.apinoita });
  const p = document.getElementById('arvoPisteraja');
  if (p) p.textContent = t('pisteraja.n', { n: bassoAsetukset.tavoite });
}

function bassoPiirraAsetukset() {
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
  lista('bassoApinat', [1, 2, 3],
    function (n) { return n === 1 ? t('apinat.yksi') : t('apinat.monta', { n: n }); },
    function (n) { return n === bassoAsetukset.apinoita; },
    function (n) { bassoAsetukset.apinoita = n; });
  lista('bassoPisterajat', BASSO_TAVOITTEET,
    function (n) { return t('pisteraja.n', { n: n }); },
    function (n) { return n === bassoAsetukset.tavoite; },
    function (n) { bassoAsetukset.tavoite = n; });
  bassoPaivitaAsetusarvot();
}

/* ⚠️ Apinoiden määrä ja pisteraja vaihtavat OTTELUN, joten ne astuvat
 * voimaan kun asetukset suljetaan — kuten pelaajamäärä Partyssa. */
function bassoAsetuksetSuljettu() {
  if (!bassoAsetusMuuttui) return;
  bassoAsetusMuuttui = false;
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

  /* ▶ tulosruudussa: seuraava kierros, tai uusi ottelu jos edellinen
   * päättyi tai keskeytettiin. */
  const jatko = document.getElementById('uudelleen');
  if (jatko) jatko.onclick = function () {
    if (!basso || basso.voittaja !== null || tila.keskeytetty) return aloitaPeli();
    bassoAloitaKierros();
  };

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
