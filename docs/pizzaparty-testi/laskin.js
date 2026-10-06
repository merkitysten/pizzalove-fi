/* Pizza Love — lausekkeen laskenta.
 *
 * ⚠️ LASKUJÄRJESTYS ON NORMAALI, EI VASEMMALTA OIKEALLE (Marko 8.9.2026).
 *
 * Tämä oli 8.9.2026 asti vasemmalta oikealle, koska niin lasku sanotaan
 * ääneen. Sillä säännöllä `2 + 3 × 2` on 10 eikä sulkeita tarvita koskaan.
 * Marko pyysi sulkeita ja antoi esimerkin `(2 + 3) × 2 = 10` — eli hän lukee
 * lauseketta normaalilla laskujärjestyksellä, jolloin `2 + 3 × 2 = 8`.
 *
 * Ja se on ainoa puolustettava valinta matematiikan oppimistuotteessa:
 * peli ei saa opettaa lukemaan lauseketta väärin. Hinta on että sulkeet
 * ovat pakollisia aina kun yhteenlasku pitää tehdä ensin.
 *
 * Sallitut laskutoimitukset (Markon linjaus 8.9.2026): + − × ÷, potenssi,
 * logaritmi ja sulkeet. Potenssi ja logaritmi ovat *"vähän vaikeampia tapoja
 * hahmottaa luvut, mutta täysin sallittuja"*.
 *
 * Murtoluvut pidetään tarkkoina, jotta 10 ÷ 4 ei ole 2.4999999999999996.
 */

const POTENSSIN_KATTO = 20;   // ettei 10^999 jumita selainta

function syt(a, b) { while (b) { const t = b; b = a % b; a = t; } return a; }

function mLuku(n, d) {
  d = d === undefined ? 1 : d;
  if (!d) return null;
  if (d < 0) { n = -n; d = -d; }
  const g = syt(Math.abs(n), d) || 1;
  return { n: n / g, d: d / g };
}
function mSumma(a, b)  { return mLuku(a.n * b.d + b.n * a.d, a.d * b.d); }
function mErotus(a, b) { return mLuku(a.n * b.d - b.n * a.d, a.d * b.d); }
function mTulo(a, b)   { return mLuku(a.n * b.n, a.d * b.d); }
function mOsamaara(a, b) { return b.n === 0 ? null : mLuku(a.n * b.d, a.d * b.n); }

function mPotenssi(a, b) {
  if (b.d !== 1) return null;                 // vain kokonaislukueksponentti
  const e = b.n;
  if (Math.abs(e) > POTENSSIN_KATTO) return null;
  if (e === 0) return (a.n === 0) ? null : mLuku(1, 1);
  const n = Math.pow(a.n, Math.abs(e)), d = Math.pow(a.d, Math.abs(e));
  if (!isFinite(n) || !isFinite(d)) return null;
  return e > 0 ? mLuku(n, d) : mLuku(d, n);
}

/* `a log b` = log_a(b) — KANTALUKU ENSIN, kuten kirjoitetussa `log₂8 = 3`.
 *
 * ⚠️ Tämä kääntyi 8.9.2026 kahdesti. Marko kirjoitti ensin `8 log 2 = 3`
 * (luku ensin) ja korjasi sitten itse: *"logaritmimerkintä pitää olla siten,
 * miten se on oikeastikin matematiikassa. Tuo oli minun muististani."*
 * Matematiikan järjestys voitti, ja se on tässä tuotteessa oikea ratkaisu:
 * peli ei saa opettaa merkintää jota kirjoissa ei ole.
 *
 * ⚠️ Hyväksytään vain kokonaislukutulos: logaritmi tuottaa muuten
 * irrationaalisia arvoja, joita murtolukuina ei voi esittää tarkasti — ja
 * likiarvo pizzan arvona olisi vain toinen tapa arvata. */
function mLogaritmi(kanta, luku) {
  const k = kanta.n / kanta.d, l = luku.n / luku.d;
  if (!(k > 0) || k === 1 || !(l > 0)) return null;
  const r = Math.log(l) / Math.log(k);
  if (!isFinite(r)) return null;
  const pyoristetty = Math.round(r);
  if (Math.abs(r - pyoristetty) > 1e-9) return null;
  return mLuku(pyoristetty, 1);
}

/* ---------- jäsennin ----------
 *
 *   lauseke := termi (('+' | '−') termi)*
 *   termi   := potenssi (('×' | '÷') potenssi)*
 *   potenssi:= tekija (('^' | 'log') potenssi)?      oikealle assosioiva
 *   tekija  := '(' lauseke ')' | luku
 */
function laske(tokenit) {
  if (!tokenit || !tokenit.length) return null;
  if (tokenit.some(function (t) { return t === null || t === undefined; })) return null;

  let i = 0;
  const seuraava = function () { return tokenit[i]; };
  const on = function (x) { return seuraava() === x; };

  function lauseke() {
    let v = termi();
    while (v && (on('+') || on('−'))) {
      const op = tokenit[i++];
      const oikea = termi();
      if (!oikea) return null;
      v = (op === '+') ? mSumma(v, oikea) : mErotus(v, oikea);
    }
    return v;
  }
  function termi() {
    let v = potenssi();
    while (v && (on('×') || on('÷'))) {
      const op = tokenit[i++];
      const oikea = potenssi();
      if (!oikea) return null;
      v = (op === '×') ? mTulo(v, oikea) : mOsamaara(v, oikea);
    }
    return v;
  }
  function potenssi() {
    const v = tekija();
    if (!v) return null;
    if (on('^') || on('log')) {
      const op = tokenit[i++];
      const oikea = potenssi();
      if (!oikea) return null;
      return (op === '^') ? mPotenssi(v, oikea) : mLogaritmi(v, oikea);
    }
    return v;
  }
  function tekija() {
    if (on('(')) {
      i++;
      const v = lauseke();
      if (!on(')')) return null;
      i++;
      return v;
    }
    const t = seuraava();
    if (t && typeof t === 'object' && typeof t.arvo === 'number') { i++; return mLuku(t.arvo, 1); }
    return null;
  }

  const tulos = lauseke();
  return (tulos && i === tokenit.length) ? tulos : null;
}

function tulosTekstina(t) {
  if (!t) return '';
  if (t.d === 1) return String(t.n);
  const desimaali = t.n / t.d;
  if (Number.isInteger(desimaali * 1000)) return String(desimaali).replace('.', ',');
  return t.n + '/' + t.d;
}

function osuuko(t, arvo) { return !!t && t.n === arvo * t.d; }
