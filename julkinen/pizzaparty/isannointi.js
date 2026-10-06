/* Pizza Party — isännöinnin logiikka (Kahoot-malli)
 *
 * ⚠️ YKSI LÄHDE KAHDELLE ISÄNNÄLLE. Peli voidaan käynnistää isolta näytöltä
 * (isanta.js) tai pelaajan omasta puhelimesta, jolloin isäntä pelaa itse
 * mukana (pelaavaisanta.js, Marko 11.9.2026). Molemmat jakavat kierroksen,
 * päättävät sen ja pisteyttävät SAMALLA koodilla — kahtena kopiona korjaus
 * osuisi toiseen, ja se on tämän projektin toistuvin vikaluokka.
 *
 * Tämä tiedosto ei piirrä pelinäkymää eikä lue DOMia (poikkeus: QR-kuvio
 * elementtiin, isannointiPiirraQr — sama kuvio molemmille isännille). Jokainen funktio saa
 * isännän tilan `h` (ks. isannointiUusi) ja palauttaa tuloksen tai heittää
 * virheen, jonka näkymä näyttää `virheTeksti`llä (yhteys.js).
 *
 * ⚠️ ISÄNTÄ ON TUOMARI, PALVELIN EI (MULTIPLAYER.md 8.4). Jako, tarkistus ja
 * pisteet ovat kierros.js:ssä; tämä kokoaa ne palvelinkutsuiksi.
 *
 * ⚠️ PELAAVA ISÄNTÄ TIETÄÄ ESIMERKKIRATKAISUN, koska sen laite jakaa
 * kierroksen. Käyttöliittymä ei näytä sitä ennen tulosta, mutta
 * kehittäjätyökaluilla sen näkee. Palvelin ei tunne sääntöjä eikä voi
 * jakaa itse (MULTIPLAYER.md 11.2).
 *
 * ⚠️ NIMET ALKAVAT `isannointi`-ETULIITTEELLÄ: tämä ladataan myös
 * index.html:lle peli.js:n ja pelaaja.js:n rinnalle.
 */

const ISANNOINTI_ASETUSAVAIN = 'pizzaparty-isanta';
/* Lomakkeen rajat. Palvelin rajaa samat luvut itse (huone.php) ja on
 * niissä auktoriteetti; nämä vain estävät lomaketta tarjoamasta mahdotonta. */
const ISANNOINTI_AIKA_ASKEL_MS = 5000;
const ISANNOINTI_AIKA_ALIN_MS = 5000;
const ISANNOINTI_AIKA_YLIN_MS = 60000;
const ISANNOINTI_UUSINTAVIIVE_MS = 2000;
/* Isäntä odottaa armoajan YLI ennen pisteytystä, jotta palvelimen vielä
 * hyväksymä vastaus ehtii mukaan. Marginaali kattaa kellon epätarkkuuden
 * (mitattu 7,7–12,5 ms, MULTIPLAYER.md 8.13) moninkertaisesti. */
const ISANNOINTI_PISTEYTYS_MARGINAALI_MS = 200;
const ISANNOINTI_PELAAJAN_SIVU = 'pelaa.html';
const ISANNOINTI_VARMISTUS_MS = 4000;
const ISANNOINTI_POISTO_ODOTUS_MS = 3000;

function isannointiUusi() {
  return {
    koodi: null,
    avain: null,
    peli: null,            // palvelimen VAHVISTAMAT asetukset — jako ja pisteytys käyttävät näitä
    tila: null,            // viimeisin palvelimen tila isännän avaimella
    kierros: null,         // nykyinen kierros isännän näkymänä (sisältää esimerkin)
    kaytetytPizzat: [],
    paatetaan: false,
    seuraavaYritys: 0,
  };
}

/* Oletukset: Markon hyväksymä mitoitus 11.9.2026 (15 s) ja pelin
 * laskutoimitusten oletukset (peli.js). */
function isannointiOletukset() {
  return {
    kierroksia: 10, aikaMs: 15000, odotaKaikkia: false, vaikea: false,
    sallitut: { kerto: true, jako: true, potenssi: false, log: false, sulut: true },
  };
}

function isannointiTunnus(h) { return { koodi: h.koodi, avain: h.avain }; }

function isannointiRajaaAika(ms) {
  const askelin = Math.round(ms / ISANNOINTI_AIKA_ASKEL_MS) * ISANNOINTI_AIKA_ASKEL_MS;
  return Math.min(ISANNOINTI_AIKA_YLIN_MS, Math.max(ISANNOINTI_AIKA_ALIN_MS, askelin));
}

/* ⚠️ Tallennettu arvo on ulkoista syötettä: jokainen kenttä tarkistetaan. */
function isannointiLataaAsetukset() {
  const s = isannointiOletukset();
  let a = null;
  try { a = JSON.parse(localStorage.getItem(ISANNOINTI_ASETUSAVAIN) || 'null'); } catch (e) { a = null; }
  if (!a || typeof a !== 'object') return s;
  if (a.kierroksia === 10 || a.kierroksia === 20) s.kierroksia = a.kierroksia;
  if (typeof a.aikaMs === 'number') s.aikaMs = isannointiRajaaAika(a.aikaMs);
  if (typeof a.odotaKaikkia === 'boolean') s.odotaKaikkia = a.odotaKaikkia;
  if (typeof a.vaikea === 'boolean') s.vaikea = a.vaikea;
  if (a.sallitut && typeof a.sallitut === 'object') {
    Object.keys(s.sallitut).forEach(function (k) {
      if (typeof a.sallitut[k] === 'boolean') s.sallitut[k] = a.sallitut[k];
    });
  }
  return s;
}

function isannointiTallennaAsetukset(s) {
  try { localStorage.setItem(ISANNOINTI_ASETUSAVAIN, JSON.stringify(s)); }
  catch (e) { /* yksityinen selaus: asetus jää vain tähän istuntoon */ }
}

function isannointiLiittymisosoite() {
  return location.host + location.pathname.replace(/[^\/]*$/, '') + ISANNOINTI_PELAAJAN_SIVU;
}

/* Osoite kirjoitettuna elementtiin niin että rivi saa katketa kauttaviivan
 * jälkeen. ⚠️ Tuotannon osoite on 51 merkkiä ilman välilyöntiä, eikä se
 * mahdu puhelimen 300 px:n laatikkoon (Marko 11.9.2026, kuvakaappaus):
 * katkeamaton sana levitti sarakkeen 455 px:iin ja napit laatikon yli.
 * Paikallinen `localhost:8799/pelaa.html` on 25 merkkiä ja mahtui — siksi
 * koe ei nähnyt sitä. `alku` on teksti ennen osoitetta (esim. «Liity: »). */
function isannointiKirjoitaOsoite(el, alku) {
  el.textContent = alku || '';
  isannointiLiittymisosoite().split('/').forEach(function (osa, i) {
    if (i) {
      el.appendChild(document.createTextNode('/'));
      el.appendChild(document.createElement('wbr'));
    }
    el.appendChild(document.createTextNode(osa));
  });
}

/* Linkki jonka QR-koodi avaa: liittymisnäkymä koodi valmiiksi täytettynä.
 * Näkyvä osoite jää ilman koodia, koska se kirjoitetaan käsin. */
function isannointiLiittymislinkki(koodi) {
  return location.origin + location.pathname.replace(/[^\/]*$/, '') +
    ISANNOINTI_PELAAJAN_SIVU + '?koodi=' + encodeURIComponent(koodi);
}

/* QR-kuvio SVG-merkkijonona (qr.js, kopio Norsusta) tai null. ⚠️ Kuvio
 * piirretään tällä laitteella: ulkoinen QR-palvelu saisi pelikoodin
 * tietoonsa. ⚠️ Jos piirto ei onnistu, koodi ja osoite näkyvät yhä —
 * QR on oikotie, ei ainoa reitti. */
function isannointiQrSvg(koodi) {
  try {
    return norsuQrSvg(isannointiLiittymislinkki(koodi), { kuvaus: t('isanta.qrAria') });
  } catch (e) {
    console.error('Pizza Party ' + new Date().toLocaleTimeString() + ': QR-KOODIA EI VOITU PIIRTÄÄ', e);
    return null;
  }
}

/* Piirtää kuvion elementtiin ja näyttää sen. Kuvio lasketaan vain kun koodi
 * vaihtui: aula piirretään kerran sekunnissa, eikä 37 × 37 -kuviota lasketa
 * joka kerta uudelleen. Näkyvyys asetetaan joka kerta, koska näkymä voi
 * piilottaa elementin välillä (pelaavan isännän kierrosvaihe). */
function isannointiPiirraQr(el, koodi) {
  const avain = koodi || '';
  if (el.dataset.koodi !== avain) {
    el.innerHTML = koodi ? (isannointiQrSvg(koodi) || '') : '';
    el.dataset.koodi = avain;
  }
  el.hidden = !el.innerHTML;
}

function isannointiNollaa(h) {
  Object.assign(h, isannointiUusi());
}

/* ---------- luo ja jatka ---------- */
async function isannointiLuo(h, asetukset) {
  const j = await api('luo', { asetukset: asetukset });
  isannointiNollaa(h);
  h.koodi = j.koodi;
  h.avain = j.isantaAvain;
  h.tila = j.tila;
  h.peli = j.tila.asetukset;
  return j;
}

/* Uudelleenlataus: tallessa ollut tunnus palvelimen tilaksi. Heittää saman
 * virheen kuin api(); kutsuja päättää unohtaako se pelin. */
async function isannointiJatka(h, koodi, avain, kaytetyt) {
  const s = (await api('tila', { koodi: koodi, avain: avain })).tila;
  isannointiNollaa(h);
  h.koodi = koodi;
  h.avain = avain;
  h.kaytetytPizzat = Array.isArray(kaytetyt) ? kaytetyt.slice() : [];
  h.tila = s;
  h.peli = s.asetukset;
  h.kierros = s.kierros;
  /* Vain käynnissä oleva kierros saa päättyä: pisteytetty ei toiseen
   * kertaan, eikä päättyneen pelin viimeinen kierros uudelleen. */
  h.paatetaan = s.vaihe !== 'kierros';
  return s;
}

/* ---------- kierros ---------- */
async function isannointiAloitaKierros(h) {
  const n = (h.kierros ? h.kierros.n : 0) + 1;
  const jako = kierrosJaa(h.peli.sallitut, h.peli.vaikea, h.kaytetytPizzat);
  if (!jako) {
    const v = new Error(t('isanta.eiJakoa'));
    v.virhe = 'eiJakoa';
    throw v;
  }
  const j = await api('aloitaKierros', Object.assign(isannointiTunnus(h), {
    n: n, pizza: jako.pizza, kortit: jako.kortit, esimerkki: jako.esimerkki,
  }));
  h.tila = j.tila;
  h.kierros = j.tila.kierros;
  h.paatetaan = false;
  h.seuraavaYritys = 0;
  /* Kirjataan PALVELIMEN kierroksen pizza eikä oman jaon: tuplapainalluksella
   * palvelin palauttaa jo käynnissä olevan kierroksen. */
  const kuva = h.kierros.pizza.kuva;
  if (h.kaytetytPizzat.indexOf(kuva) < 0) h.kaytetytPizzat.push(kuva);
  return j.tila;
}

function isannointiVastanneita(h) {
  const s = h.tila;
  const k = h.kierros;
  return (s && k && s.kierros && s.kierros.n === k.n) ? s.vastanneet.length : 0;
}

/* Päättyykö kierros nyt: aika loppui (armon ja marginaalin yli) tai kaikki
 * vastasivat. `nytP` on palvelimen kello (yhteys.js palvelinAika). */
function isannointiPitaaPaattaa(h, nytP) {
  const k = h.kierros;
  if (!k || h.paatetaan || nyt() < h.seuraavaYritys) return false;
  const pelaajia = h.tila ? h.tila.pelaajat.length : 0;
  const aikaLoppui = k.loppuu !== null && nytP > k.loppuu + k.armoMs + ISANNOINTI_PISTEYTYS_MARGINAALI_MS;
  const kaikkiVastasivat = pelaajia > 0 && isannointiVastanneita(h) >= pelaajia;
  return aikaLoppui || kaikkiVastasivat;
}

/* Pelaajakohtaiset rivit. ⚠️ Aika on palvelimen saapumisleima miinus T0,
 * EI pelaajan laitteen oma mittaus: se olisi väärennettävissä (8.3). */
function isannointiLaskeRivit(h, k, s) {
  const a = h.peli;
  return s.pelaajat.map(function (p) {
    const v = s.vastaukset ? s.vastaukset[p.id] : null;
    if (!v) return { id: p.id, oikein: false, pisteet: 0, t: null, syy: 'eiVastannut' };
    const aika = v.saapui - k.t0;
    if (v.myohassa > KIERROS_MYOHASSA_RAJA_MS) {
      return { id: p.id, oikein: false, pisteet: 0, t: aika, syy: 'myohassa' };
    }
    const tarkistus = kierrosTarkista(k, v.vastaus, a.sallitut, a.vaikea);
    return {
      id: p.id, oikein: tarkistus.oikein,
      pisteet: tarkistus.oikein ? kierrosPisteet(aika, a.aikaMs) : 0,
      t: aika, syy: tarkistus.syy,
    };
  });
}

/* Lukee vastaukset, tarkistaa ja pisteyttää. Palauttaa
 * { kierros, rivit, vastaukset, tila } tai null jos päättäminen on jo
 * käynnissä. Epäonnistuessa seuraava automaattinen yritys odottaa
 * ISANNOINTI_UUSINTAVIIVE_MS:n ja virhe heitetään näkymälle. */
async function isannointiPaataKierros(h) {
  const k = h.kierros;
  if (!k || h.paatetaan) return null;
  h.paatetaan = true;
  try {
    /* ⚠️ Palvelin torjuu pisteytyksen jos vastauksia tuli lukemisen jälkeen
     * (`uusiaVastauksia`). Silloin luetaan uudelleen — muutaman kerran. */
    for (let yritys = 0; ; yritys++) {
      const s = (await api('tila', isannointiTunnus(h))).tila;
      h.tila = s;
      const rivit = isannointiLaskeRivit(h, k, s);
      try {
        const p = (await api('pisteyta', Object.assign(isannointiTunnus(h), {
          n: k.n, rivit: rivit, nahdyt: Object.keys(s.vastaukset || {}),
        }))).tila;
        h.tila = p;
        /* Rivit PALVELIMELTA eikä omasta laskusta: jos pelaaja poistui
         * lukemisen ja pisteytyksen välissä, palvelin pudotti hänen rivinsä,
         * eikä tulosnäkymään saa jäädä nimetöntä riviä. */
        return { kierros: k, rivit: p.tulos ? p.tulos.rivit : rivit, vastaukset: s.vastaukset || {}, tila: p };
      } catch (e) {
        if (e.virhe !== 'uusiaVastauksia' || yritys >= 4) throw e;
      }
    }
  } catch (e) {
    h.paatetaan = false;
    h.seuraavaYritys = nyt() + ISANNOINTI_UUSINTAVIIVE_MS;
    throw e;
  }
}

function isannointiViimeinen(h) {
  return !!(h.kierros && h.peli && h.kierros.n >= h.peli.kierroksia);
}

/* ---------- loppu ---------- */
async function isannointiPaataPeli(h) {
  const j = await api('paata', isannointiTunnus(h));
  h.tila = j.tila;
  return j.tila;
}

async function isannointiUudelleen(h) {
  const j = await api('uudelleen', isannointiTunnus(h));
  h.tila = j.tila;
  h.kierros = null;
  h.kaytetytPizzat = [];
  h.paatetaan = false;
  h.seuraavaYritys = 0;
  return j.tila;
}

/* ⚠️ Kutsuja unohtaa pelin ENNEN tätä (kysely pysähtyy, eikä matkalla oleva
 * kysely tulkitse poistoa katoamiseksi, MULTIPLAYER.md 9.3) ja antaa
 * tunnuksen talteen otettuna. Poiston epäonnistuminen ei estä lopettamista:
 * huone vanhenee palvelimella itsestään (vartti päättymisestä, huone.php). */
async function isannointiPoista(tunnus) {
  /* Enintään ISANNOINTI_POISTO_ODOTUS_MS: kutsuja siirtyy tämän jälkeen
   * alkuvalikkoon, eikä jumittunut verkko saa pitää isäntää lopetusruudussa. */
  const odotus = new Promise(function (r) { setTimeout(r, ISANNOINTI_POISTO_ODOTUS_MS); });
  await Promise.race([api('poista', tunnus).catch(function () { /* vanhenee itsestään */ }), odotus]);
}

/* ⚠️ PELIN LOPETUS KAIKILTA KYSYY ENSIN (Marko 11.9.2026: isännän pitää
 * pystyä lopettamaan kesken). Yksi napautus lopettaisi luokallisen pelin
 * vahingossa. Ensimmäinen painallus vaihtaa napin tekstin ja värin, toinen
 * ISANNOINTI_VARMISTUS_MS:n sisällä tekee. Ei selaimen confirm()-ikkunaa:
 * sama nappi, sama paikka, eikä mitään mitä pitää sulkea. */
function isannointiVarmistaEnsin(nappi, toiminto, tekstiAvain) {
  let ajastin = null;
  let alkuperainen = '';
  function peru() {
    clearTimeout(ajastin);
    if (!nappi.classList.contains('varmista')) return;
    nappi.classList.remove('varmista');
    nappi.textContent = alkuperainen;
  }
  nappi.addEventListener('click', function () {
    if (nappi.classList.contains('varmista')) {
      peru();
      toiminto();
      return;
    }
    alkuperainen = nappi.textContent;
    nappi.textContent = t(tekstiAvain || 'isanta.varmistaLopetus');
    nappi.classList.add('varmista');
    ajastin = setTimeout(peru, ISANNOINTI_VARMISTUS_MS);
  });
}
