/* Pizza Love — ratkoja.
 *
 * Etsii kädestä lausekkeen jonka arvo on pizzan arvo. Apina tarvitsee tämän,
 * jotta se olisi pelaaja eikä ajastin (Markon päätös 8.9.2026): apina ottaa
 * vain sellaisen pizzan jonka se OIKEASTI osaa tehdä omalla kädellään ja
 * niillä laskutoimituksilla jotka pelissä on sallittu.
 *
 * ⚠️ Sama ratkoja vastaa myös kysymykseen *"pystyykö kukaan tekemään tätä"*,
 * joka on Markon päättymissäännön ehto. Siksi se ei saa olla likimääräinen:
 * jos se sanoo "ei ratkaisua" vaikka ratkaisu on olemassa, peli päättyy
 * liian aikaisin eikä kukaan huomaa mitään.
 */

/* Käydyt haarat lasketaan, jottei yksi käsi jäädytä selainta. Raja on korkea
 * tarkoituksella: sen ylittyminen on kirjattava tieto, ei hiljainen luovutus. */
const HAARAKATTO = 400000;

function ratkojanOperaattorit(sallitut) {
  const ops = ['+', '−'];                       // aina sallittuja
  if (sallitut.kerto)    ops.push('×');
  if (sallitut.jako)     ops.push('÷');
  if (sallitut.potenssi) ops.push('^');
  if (sallitut.log)      ops.push('log');
  return ops;
}

/* Fantasiakortti on mikä tahansa arvo 1–10, joten se haarautuu kymmeneksi. */
function korttienArvot(kasi) {
  return kasi.map(function (k, i) {
    return { i: i, arvot: k.fantasia ? [1,2,3,4,5,6,7,8,9,10] : [k.arvo] };
  });
}

/* ⚠️ `tarveN` = montako ERI ARVOA lausekkeessa on oltava, EI korttien määrä.
 * Selainpeli poikkeaa tässä tietoisesti painetuista säännöistä, jotka
 * puhuvat korttien lukumäärästä — ks. `tarkistaLasku` (peli.js).
 *
 * Palauttaa {kortit:[{i,arvo}], merkit:[op], ryhma:{alku,loppu}|null}
 * tai null jos ratkaisua ei ole. */
/* ⚠️ `solmukatto` on VALINNAINEN ja vain Pizza Basson apinan käytössä
 * (6.10.2026). HAARAKATTO laskee vain valmiit lausekkeet, ei karsittuja
 * polkuja — mitattu: 13 kortin Basso-kädellä haku kesti 30 s JXA:ssa
 * katkeamatta. Pizza Party ei anna tätä, joten sen päättymissääntö
 * («pystyykö kukaan») on ennallaan. */
function etsiRatkaisu(kasi, kohde, sallitut, tarveN, solmukatto) {
  const ops = ratkojanOperaattorit(sallitut);
  const arvot = korttienArvot(kasi);
  let solmuja = 0;
  /* ⚠️ Koko käsi on käytettävissä: yhden täytteen pizzan voi tehdä viidellä
   * kortilla (1+1+1+1). Tässä oli `Math.min(4, ...)`, joka oli oikein vain
   * väärän säännön alla. */
  const enintaan = kasi.length;
  let loydetty = null, haaroja = 0, katkesi = false;

  function eriArvoja(kortit) {
    const nahdyt = {};
    let n = 0;
    for (let i = 0; i < kortit.length; i++) {
      if (!nahdyt[kortit[i].arvo]) { nahdyt[kortit[i].arvo] = true; n++; }
    }
    return n;
  }

  function kokeile(kortit, merkit) {
    const n = kortit.length;
    if (tarveN !== null && eriArvoja(kortit) !== tarveN) return;

    const ryhmat = [null];
    if (sallitut.sulut) {
      for (let a = 0; a < n - 1; a++) {
        for (let b = a + 1; b < n; b++) {
          /* Koko lausekkeen ympärille kaarret eivät muuta mitään. */
          if (a === 0 && b === n - 1) continue;
          ryhmat.push({ alku: a, loppu: b });
        }
      }
    }
    for (let r = 0; r < ryhmat.length; r++) {
      const ryhma = ryhmat[r], t = [];
      for (let j = 0; j < n; j++) {
        if (ryhma && ryhma.alku === j) t.push('(');
        t.push({ arvo: kortit[j].arvo });
        if (ryhma && ryhma.loppu === j) t.push(')');
        if (j < n - 1) t.push(merkit[j]);
      }
      if (++haaroja > HAARAKATTO) { katkesi = true; return; }
      if (osuuko(laske(t), kohde)) {
        loydetty = { kortit: kortit.slice(), merkit: merkit.slice(), ryhma: ryhma };
        return;
      }
    }
  }

  function kavele(kaytetyt, kortit, merkit) {
    if (loydetty || katkesi) return;
    if (solmukatto && ++solmuja > solmukatto) { katkesi = true; return; }
    if (kortit.length) kokeile(kortit, merkit);
    /* Karsinta: eri arvoja ei saa olla enempää kuin pizzassa on täytteitä,
     * eikä lisäkortti voi enää vähentää niitä. */
    if (tarveN !== null && eriArvoja(kortit) > tarveN) return;
    if (loydetty || katkesi || kortit.length >= enintaan) return;
    for (let c = 0; c < arvot.length; c++) {
      if (kaytetyt[arvot[c].i]) continue;
      const vaihtoehdot = arvot[c].arvot;
      for (let v = 0; v < vaihtoehdot.length; v++) {
        const uusi = { i: arvot[c].i, arvo: vaihtoehdot[v] };
        kaytetyt[uusi.i] = true;
        if (!kortit.length) {
          kavele(kaytetyt, [uusi], []);
        } else {
          for (let o = 0; o < ops.length; o++) {
            kavele(kaytetyt, kortit.concat([uusi]), merkit.concat([ops[o]]));
            if (loydetty || katkesi) break;
          }
        }
        kaytetyt[uusi.i] = false;
        if (loydetty || katkesi) return;
      }
    }
  }

  kavele({}, [], []);
  if (katkesi && !loydetty) {
    /* ⚠️ Ei saa palauttaa hiljaista nollaa: "en löytänyt" ja "ei ole" ovat
     * eri asia, ja jälkimmäinen päättäisi kierroksen. */
    return { katkesi: true };
  }
  return loydetty;
}

/* Ratkaisu luettavaksi lausekkeeksi, esim. "(2 + 3) × 2". */
function ratkaisuTekstina(r) {
  if (!r || !r.kortit) return '';
  let s = '';
  r.kortit.forEach(function (k, j) {
    if (r.ryhma && r.ryhma.alku === j) s += '(';
    s += k.arvo;
    if (r.ryhma && r.ryhma.loppu === j) s += ')';
    if (j < r.kortit.length - 1) s += ' ' + r.merkit[j] + ' ';
  });
  return s;
}
