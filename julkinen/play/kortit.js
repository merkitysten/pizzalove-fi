/* Pizza Love — korttidata.
 *
 * ⚠️ Pakkaa EI kirjoiteta käsin. Se syntyy yhdestä mitatusta säännöstä:
 *
 *      pizzakortteja ovat tasan ne joukon {1…10} osajoukot,
 *      joiden koko on 1–4 ja alkioiden summa enintään 10.
 *
 * Mitattu 8.9.2026 kaikista 42 painetusta pizzakortista (kuvat:
 * varainhankinta/Pizza Love Brändikuvat/Korttipelin png kortit):
 *   pizzan arvo = sen täytteiden arvojen summa, poikkeuksetta.
 *   1 täyte 10 kpl · 2 täytettä 20 kpl · 3 täytettä 11 kpl · 4 täytettä 1 kpl = 42
 *   sydänpizzoja ovat tasan arvon 10 kortit = 10 kpl (täsmää sääntövihkoon)
 *
 * Käsin kirjoitettu 42 rivin taulukko vanhenisi hiljaa ja virhettä ei
 * huomaisi kukaan; generoitu pakka tarkistaa itsensä (ks. tarkista()).
 */

/* Täytteet. Arvo ja laji ovat 1:1 — arvon 3 kortti on aina ananas.
 * Nimet, värit ja kappalemäärät: Markon lista 8.9.2026.
 * Kappalemäärä noudattaa sääntöä 11 − arvo (yhteensä 55) + 3 fantasiaa = 58. */
const TAYTTEET = [
  { arvo:  1, nimi: 'Oliivi',      vari: '#090A0D', kpl: 10 },
  { arvo:  2, nimi: 'Tomaatti',    vari: '#E62448', kpl:  9 },
  { arvo:  3, nimi: 'Ananas',      vari: '#FFDF00', kpl:  8 },
  { arvo:  4, nimi: 'Homejuusto',  vari: '#1072B9', kpl:  7 },
  { arvo:  5, nimi: 'Katkarapu',   vari: '#EF7925', kpl:  6 },
  { arvo:  6, nimi: 'Munakoiso',   vari: '#824292', kpl:  5 },
  { arvo:  7, nimi: 'Rucola',      vari: '#16A74F', kpl:  4 },
  { arvo:  8, nimi: 'Herkkusieni', vari: '#7F3B1E', kpl:  3 },
  { arvo:  9, nimi: 'Kinkku',      vari: '#E473AA', kpl:  2 },
  { arvo: 10, nimi: 'Kala',        vari: '#6AC0B2', kpl:  1 },
];

/* Fantasiatäyte: mikä tahansa arvo 1–10, pelaaja valitsee. 3 kpl. */
const FANTASIA = { arvo: null, nimi: 'Fantasiatäyte', vari: '#8A8A8A', kpl: 3 };

const PIZZAN_MAKSIMIARVO = 10;
const TAYTTEITA_ENINTAAN  = 4;

/* Painettujen pizzakorttien kuvatiedostot ovat pizza-13 … pizza-54.
 * Järjestys on sama kuin generoinnin: ensin yksitäytteiset arvon mukaan,
 * sitten kaksi-, kolme- ja nelitäytteiset aakkosjärjestyksessä.
 * Tämä on mitattu kuvista, ei oletettu — ks. tarkista(). */
const ENSIMMAINEN_PIZZAKUVA = 13;

function summa(lista) {
  return lista.reduce(function (a, b) { return a + b; }, 0);
}

/* Kaikki koon `koko` osajoukot joukosta 1…10, joiden summa on enintään 10.
 * Aakkosjärjestyksessä (1,2,3) ennen (1,2,4). */
function osajoukot(koko) {
  const tulos = [];
  (function kavele(alkaen, valitut) {
    if (valitut.length === koko) { tulos.push(valitut.slice()); return; }
    for (let v = alkaen; v <= 10; v++) {
      if (summa(valitut) + v > PIZZAN_MAKSIMIARVO) break;
      valitut.push(v);
      kavele(v + 1, valitut);
      valitut.pop();
    }
  })(1, []);
  return tulos;
}

/* Koko pizzapakka, 42 korttia, painetussa järjestyksessä. */
function pizzapakka() {
  const kortit = [];
  for (let koko = 1; koko <= TAYTTEITA_ENINTAAN; koko++) {
    osajoukot(koko).forEach(function (taytteet) {
      const arvo = summa(taytteet);
      kortit.push({
        laji: 'pizza',
        arvo: arvo,
        taytteet: taytteet,          // vain lukumäärällä on peliarvo
        tayteMaara: taytteet.length,
        sydan: arvo === PIZZAN_MAKSIMIARVO,
        pisteet: arvo === PIZZAN_MAKSIMIARVO ? 2 : 1,
        kuva: 'kuvat/pizza-' + (ENSIMMAINEN_PIZZAKUVA + kortit.length) + '.webp',
      });
    });
  }
  return kortit;
}

/* Koko täytepakka, 58 korttia. */
function taytepakka() {
  const kortit = [];
  let id = 0;
  TAYTTEET.forEach(function (t) {
    for (let i = 0; i < t.kpl; i++) {
      kortit.push({
        laji: 'tayte', id: id++, arvo: t.arvo, nimi: t.nimi, vari: t.vari,
        fantasia: false, kuva: 'kuvat/tayte-' + t.arvo + '.webp',
      });
    }
  });
  for (let i = 0; i < FANTASIA.kpl; i++) {
    kortit.push({
      laji: 'tayte', id: id++, arvo: null, nimi: FANTASIA.nimi, vari: FANTASIA.vari,
      fantasia: true, kuva: 'kuvat/tayte-x.webp',
    });
  }
  return kortit;
}

function sekoita(pakka) {
  const p = pakka.slice();
  for (let i = p.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const apu = p[i]; p[i] = p[j]; p[j] = apu;
  }
  return p;
}

/* ⚠️ Generoitu pakka joka ei tarkista itseään on yhtä altis hiljaiselle
 * virheelle kuin käsin kirjoitettu. Nämä neljä lukua on mitattu
 * painetuista korteista, eikä yksikään saa muuttua koodimuutoksesta. */
function tarkista() {
  const virheet = [];
  const p = pizzapakka(), t = taytepakka();

  if (p.length !== 42) virheet.push('pizzakortteja ' + p.length + ', pitäisi olla 42');
  if (t.length !== 58) virheet.push('täytekortteja ' + t.length + ', pitäisi olla 58');

  const sydamia = p.filter(function (k) { return k.sydan; }).length;
  if (sydamia !== 10) virheet.push('sydänpizzoja ' + sydamia + ', pitäisi olla 10');

  const maarittain = [1, 2, 3, 4].map(function (n) {
    return p.filter(function (k) { return k.tayteMaara === n; }).length;
  });
  if (String(maarittain) !== '10,20,11,1') {
    virheet.push('täytemäärittäin ' + maarittain + ', pitäisi olla 10,20,11,1');
  }

  const rikki = p.filter(function (k) { return summa(k.taytteet) !== k.arvo; });
  if (rikki.length) virheet.push(rikki.length + ' pizzaa joiden arvo ei ole täytteiden summa');

  const viimeinen = p[p.length - 1].kuva;
  if (viimeinen !== 'kuvat/pizza-54.webp') virheet.push('viimeinen kuva ' + viimeinen);

  return virheet;
}
