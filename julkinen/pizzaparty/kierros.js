/* Pizza Party — yhteispelin kierros (Kahoot-malli).
 *
 * ⚠️ YKSI LÄHDE KIERROKSEN SÄÄNNÖILLE. Isännän näyttö jakaa kierroksen ja
 * tarkistaa vastaukset tällä tiedostolla, pelaajan laite tarkistaa oman
 * vastauksensa samalla, ja 11.9.2026 alkaen MYÖS YKSINPELI rakentaa
 * lausekkeen ja tarkistaa sulkeet täällä (peli.js tokenit / ryhmaKelpaa).
 * Palvelin (huone.php) EI tunne sääntöjä lainkaan —
 * se on postilaatikko (MULTIPLAYER.md 8.4). Siksi ratkojaa ja laskinta on
 * vain yhdet: ratkoja.js ja laskin.js, samat kuin yksinpelissä.
 *
 * Riippuu: kortit.js  (pizzapakka, taytepakka, sekoita)
 *          ratkoja.js (etsiRatkaisu, ratkaisuTekstina)
 *          laskin.js  (laske, osuuko)
 *
 * ⚠️ NIMET ALKAVAT `kierros`-ETULIITTEELLÄ. peli.js:ssä on jo `tokenit`,
 * `ryhmaKelpaa` ja `aloitaKierros`. Jos pelaajan sivu joskus lataa
 * molemmat, samanniminen ylätason funktio korvaisi toisen hiljaa.
 */

const KIERROS_KORTTEJA = 5;
/* Jakoyritysten katto. Mitataan testissä montako yritystä oikeasti
 * tarvitaan; katto on vain suoja ikuista silmukkaa vastaan. */
const KIERROS_JAKOYRITYKSIA = 400;

/* ⚠️ MYÖHÄSTYNYT PALJASTUS EI LASKE (MULTIPLAYER.md 8.12). Taustalle
 * jäänyt selain kuristaa ajastimet ja paljastaa satoja millisekunteja
 * myöhässä. Laite tietää oman myöhästymisensä, ja jos se ylittää rajan,
 * kierros ei laske sille. Sääntöä ei voi käyttää hyväksi: myöhästymisen
 * ilmoittaminen MENETTÄÄ kierroksen, ei voita sitä. */
const KIERROS_MYOHASSA_RAJA_MS = 100;

/* Pisteytys: Kahootin kaava, lähde tarkistettu (MULTIPLAYER.md 8.11).
 * Markon hyväksymä mitoitus 11.9.2026: lattia 100 pistettä oikeasta. */
const KIERROS_PISTEET_ENINTAAN = 1000;
const KIERROS_PISTEET_LATTIA = 100;

/* Mihin lupaan kukin merkki kuuluu. null = aina sallittu. */
const KIERROS_LUVAT = { '+': null, '−': null, '×': 'kerto', '÷': 'jako', '^': 'potenssi', 'log': 'log' };

/*   pisteet = 1000 × (1 − (t / T) / 2)
 *
 * Nopein saa lähes 1000, kierroksen pituuden kohdalla vastannut 500.
 * ⚠️ T on MITTATIKKU eikä katkaisu: kun isäntä valitsee «odota kaikkia»,
 * kierros ei katkea mutta T on yhä kaavan nimittäjä. Ilman sitä
 * pisteitä ei voisi laskea lainkaan (8.11). Siksi lattia: muuten hidas
 * oikea vastaus menisi negatiiviseksi. */
function kierrosPisteet(aikaMs, kierroksenPituusMs) {
  const t = Math.max(0, aikaMs);
  const p = Math.round(KIERROS_PISTEET_ENINTAAN * (1 - (t / kierroksenPituusMs) / 2));
  return Math.min(KIERROS_PISTEET_ENINTAAN, Math.max(KIERROS_PISTEET_LATTIA, p));
}

/* Tuore jako: yksi pizza ja viisi täytettä, sama kaikille.
 *
 * ⚠️ KIERROS ON UMPIO (8.7). Yksinpelissä käsi kehittyy, täällä jokainen
 * kierros jaetaan alusta — muuten aikoja ei voi verrata.
 *
 * ⚠️ JAKOON KELPAA VAIN VARMASTI RATKEAVA. Jos ratkoja katkesi
 * haarakattoon, emme tiedä onko ratkaisua, ja se jaetaan uudelleen. Luokka
 * joka tuijottaa mahdotonta pizzaa 15 sekuntia ei opi mitään.
 *
 * `kaytetytKuvat`: saman pelin aiemmat pizzat, jotta sama ei toistu.
 * 42 pizzaa riittää 30 kierrokseen. */
function kierrosJaa(sallitut, vaikea, kaytetytKuvat) {
  const kaikki = pizzapakka();
  let vapaat = kaikki.filter(function (p) { return kaytetytKuvat.indexOf(p.kuva) < 0; });
  if (!vapaat.length) vapaat = kaikki;
  for (let yritys = 0; yritys < KIERROS_JAKOYRITYKSIA; yritys++) {
    const pizza = vapaat[Math.floor(Math.random() * vapaat.length)];
    const kortit = sekoita(taytepakka()).slice(0, KIERROS_KORTTEJA);
    const r = etsiRatkaisu(kortit, pizza.arvo, sallitut, vaikea ? pizza.tayteMaara : null);
    if (r && r.kortit) {
      return {
        pizza: { arvo: pizza.arvo, tayteMaara: pizza.tayteMaara, kuva: pizza.kuva, sydan: pizza.sydan },
        kortit: kortit.map(function (k) { return { arvo: k.arvo, fantasia: k.fantasia, kuva: k.kuva }; }),
        esimerkki: ratkaisuTekstina(r),
        yrityksia: yritys + 1,
      };
    }
  }
  return null;
}

/* Kortit, merkit ja sulkeet tokenilistaksi laskin.js:lle. Sisäkkäisistä
 * pisin aukeaa ensin ja sulkeutuu viimeisenä. peli.js:n `tokenit()` kutsuu
 * tätä — sama rakennus molemmissa pelimuodoissa. */
function kierrosTokenit(arvot, merkit, ryhmat) {
  const t = [];
  arvot.forEach(function (arvo, i) {
    ryhmat.filter(function (r) { return r && r.alku === i; })
      .sort(function (a, b) { return (b.loppu - b.alku) - (a.loppu - a.alku); })
      .forEach(function () { t.push('('); });
    t.push({ arvo: arvo });
    ryhmat.filter(function (r) { return r && r.loppu === i; })
      .sort(function (a, b) { return (a.loppu - a.alku) - (b.loppu - b.alku); })
      .forEach(function () { t.push(')'); });
    if (i < arvot.length - 1) t.push(merkit[i]);
  });
  return t;
}

/* Sulkeet saavat olla sisäkkäin tai erillään, mutta eivät osittain
 * päällekkäin: `(1+2)×(3+4)` ja `((1+2)×3)` kelpaavat, limitys ei ole
 * lauseke lainkaan.
 *
 * ⚠️ Yksinpelin ryhmaKelpaa kutsuu tätä (Marko 11.9.2026: «salli erilliset
 * sulut molemmissa»). Ratkoja kokeilee silti vain yhtä sulkuparia — ja se
 * riittää: mitattu 1 200 satunnaisesta kädestä täydellinen haku kaikilla
 * sulutuksilla ei löytänyt yhtään ratkaisua jota ratkoja ei löytänyt.
 * Jos sallittuja laskutoimituksia lisätään, mittaus on toistettava. */
function kierrosRyhmatKelpaavat(ryhmat, n) {
  for (let i = 0; i < ryhmat.length; i++) {
    const r = ryhmat[i];
    if (!r || !Number.isInteger(r.alku) || !Number.isInteger(r.loppu)) return false;
    if (r.alku < 0 || r.loppu > n - 1 || r.loppu <= r.alku) return false;
    for (let j = 0; j < i; j++) {
      const q = ryhmat[j];
      if (q.alku === r.alku && q.loppu === r.loppu) return false;
      const sisakkain = (r.alku >= q.alku && r.loppu <= q.loppu) || (q.alku >= r.alku && q.loppu <= r.loppu);
      const erillaan = r.loppu < q.alku || q.loppu < r.alku;
      if (!sisakkain && !erillaan) return false;
    }
  }
  return true;
}

function kierrosEriArvoja(arvot) {
  const nahdyt = {};
  arvot.forEach(function (a) { nahdyt[a] = true; });
  return Object.keys(nahdyt).length;
}

/* Tarkistaa pelaajan vastauksen.
 *
 *   vastaus = { kortit: [{i, arvo}], merkit: ['+', …], ryhmat: [{alku, loppu}] }
 *             tai null = pelaaja ohitti
 *
 * ⚠️ VASTAUS ON ULKOISTA SYÖTETTÄ. Se tulee pelaajan laitteelta, jonka
 * voi muokata. Siksi jokainen kenttä tarkistetaan tässä eikä luoteta
 * siihen että pelaajan sivu tekee sen: kortti on oltava jaettu, kukin
 * vain kerran, arvo on oltava kortin arvo (tai 1–10 fantasialle), merkin
 * on oltava sallittu ja sulkeiden kelvolliset.
 *
 * Palauttaa { oikein, syy }. `syy` kertoo miksi ei kelvannut. */
function kierrosTarkista(kierros, vastaus, sallitut, vaikea) {
  function hylatty(syy) { return { oikein: false, syy: syy }; }
  if (!vastaus) return hylatty('ohitti');

  const kortit = vastaus.kortit, merkit = vastaus.merkit;
  const ryhmat = vastaus.ryhmat === undefined ? [] : vastaus.ryhmat;
  if (!Array.isArray(kortit) || !Array.isArray(merkit) || !Array.isArray(ryhmat)) return hylatty('muoto');
  const n = kortit.length;
  if (n < 1 || n > kierros.kortit.length || merkit.length !== n - 1) return hylatty('muoto');

  const kaytetty = {}, arvot = [];
  for (let j = 0; j < n; j++) {
    const k = kortit[j];
    if (!k || !Number.isInteger(k.i) || k.i < 0 || k.i >= kierros.kortit.length || kaytetty[k.i]) {
      return hylatty('kortti');
    }
    kaytetty[k.i] = true;
    const jaettu = kierros.kortit[k.i];
    if (!Number.isInteger(k.arvo)) return hylatty('arvo');
    if (jaettu.fantasia ? (k.arvo < 1 || k.arvo > 10) : k.arvo !== jaettu.arvo) return hylatty('arvo');
    arvot.push(k.arvo);
  }

  for (let j = 0; j < merkit.length; j++) {
    const m = merkit[j];
    if (!Object.prototype.hasOwnProperty.call(KIERROS_LUVAT, m)) return hylatty('merkki');
    const lupa = KIERROS_LUVAT[m];
    if (lupa && !sallitut[lupa]) return hylatty('merkki');
  }

  if (ryhmat.length && !sallitut.sulut) return hylatty('sulut');
  if (!kierrosRyhmatKelpaavat(ryhmat, n)) return hylatty('sulut');

  const tulos = laske(kierrosTokenit(arvot, merkit, ryhmat));
  if (!osuuko(tulos, kierros.pizza.arvo)) return hylatty('ohi');

  /* Vaikeampi tapa: eri arvoja yhtä monta kuin pizzassa täytteitä
   * (sama sääntö kuin peli.js:n tarkistaLasku). */
  if (vaikea && kierrosEriArvoja(arvot) !== kierros.pizza.tayteMaara) return hylatty('taytteet');

  return { oikein: true, syy: null };
}

/* Vastaus luettavaksi lausekkeeksi, esim. "(2 + 3) × 2". Isännän
 * näytön tulosriville — vain oikeista vastauksista. */
function kierrosLauseke(vastaus) {
  if (!vastaus || !Array.isArray(vastaus.kortit) || !Array.isArray(vastaus.merkit)) return '';
  const arvot = vastaus.kortit.map(function (k) { return k ? k.arvo : '?'; });
  const ryhmat = Array.isArray(vastaus.ryhmat) ? vastaus.ryhmat : [];
  let s = '';
  kierrosTokenit(arvot, vastaus.merkit, ryhmat).forEach(function (x) {
    if (x === '(' || x === ')') s += x;
    else if (x && typeof x === 'object') s += x.arvo;
    else s += ' ' + x + ' ';
  });
  return s;
}

/* Pistejärjestys sijoineen: tasapisteet jakavat sijan (1, 2, 2, 4), ja
 * tasapisteissä järjestys on aakkosellinen.
 *
 * ⚠️ YKSI LÄHDE. Isännän näyttö ja pelaajan puhelin näyttävät saman taulun.
 * Sääntö oli 11.9.2026 asti kahdessa paikassa eri tavoin kirjoitettuna
 * (isanta.js laski juoksevasti, pelaaja.js laski ohittajat) — sama tulos,
 * mutta ensimmäinen muutos olisi osunut vain toiseen. */
function kierrosJarjestys(pelaajat, kieli) {
  const jarjestys = pelaajat.slice().sort(function (a, b) {
    return (b.pisteet - a.pisteet) || String(a.nimi).localeCompare(String(b.nimi), kieli);
  });
  let edellinen = null, sija = 0;
  return jarjestys.map(function (p, i) {
    if (p.pisteet !== edellinen) { sija = i + 1; edellinen = p.pisteet; }
    return { id: p.id, nimi: p.nimi, pisteet: p.pisteet, sija: sija };
  });
}
