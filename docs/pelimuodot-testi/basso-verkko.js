/* Pizza Basso — VERKKOPELI omilla laitteilla (6.10.2026).
 *
 * Marko 6.10.2026: *«aloita se netissä pelaaminen ihmistä vastaan»*.
 * Palvelin: basso-huone.php (postilaatikko, versio + vuoro). Säännöt:
 * basso-saannot.js — SAMA tiedosto kuin yksin pelatessa, ei toista kopiota.
 * Ks. PELIMUODOT-ALOITUS.md luku 9.3.
 *
 * KULKU
 *   aloitusvalikko → Luo peli (väri) → aula (koodi + QR) → Aloita
 *                  → Liity peliin (koodi → väri) → aula → odottaa aloitusta
 *   pelissä: vuorossa oleva laite ajaa siirron säännöillä ja lähettää uuden
 *   tilan; muut kysyvät sekunnin välein ja näyttävät siirron kuten apinan
 *   siirron (kortit pizzalla + lasku hahmon vieressä).
 *
 * ⚠️ VAIN YKSI ASIA KERRALLAAN. Kysely ei aja kun oma siirto on lähdössä tai
 * toisen siirto näkyy ruudulla (`bv.kiire`) — muuten nopea vastustaja voisi
 * ehtiä kirjoittaa tilan sen siirron päälle jota juuri näytetään.
 *
 * ⚠️ PELAAJAT OVAT VÄREJÄ, EIVÄT NIMIÄ: mitään henkilötietoa ei kulje.
 *
 * Ladataan basso.js:n JÄLKEEN (se lukee `bassoVerkossa`-koukkua).
 */

/* Paikallisesti (php -S) sama palvelin; muuten varainhankinnan palvelin,
 * koska pizzalove.fi (GitHub Pages) ei aja PHP:tä. Sama ratkaisu ja sama
 * CORS-lista kuin yhteys.js:n HUONE_OSOITE. */
const BV_OSOITE = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
  ? 'basso-huone.php'
  : 'https://varainhankinta.merkitysten.fi/pizzaparty/basso-huone.php';
const BV_AVAIN = 'pizzabasso-verkko';
const BV_KYSELYVALI = 1000;
const BV_VIRHERAJA = 3;          // kuten yhteys.js: yksi ohi mennyt kysely ei ole katkos

const bv = {
  koodi: null, avain: null, oma: null, versio: 0, tila: null,
  kysely: null, kiire: false, virheita: 0, vari: null,
  omatLuvat: null,     // tämän laitteen laskutoimitukset verkkopelin ajaksi talteen
};

/* ---------- palvelin ---------- */

async function bvApi(toiminto, data) {
  let vastaus;
  try {
    vastaus = await fetch(BV_OSOITE, {
      method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ toiminto: toiminto }, data || {})),
    });
  } catch (e) {
    const v = new Error(t('yhteys.eiYhteytta'));
    v.yhteys = true;
    throw v;
  }
  let j = null;
  try { j = await vastaus.json(); } catch (e) { j = null; }
  if (!j || typeof j !== 'object') throw new Error(t('yhteys.palvelinVirhe', { koodi: vastaus.status }));
  if (!j.ok) {
    const v = new Error(j.viesti || j.virhe);
    v.virhe = j.virhe;
    v.status = vastaus.status;
    throw v;
  }
  return j;
}

function bvVirheTeksti(e) {
  if (e && e.virhe) {
    const s = t('huone.' + e.virhe);
    if (s !== 'huone.' + e.virhe) return s;
  }
  return (e && e.message) ? e.message : String(e);
}

/* ---------- istunto (laitteen muisti) ---------- */

function bvTallenna() {
  try { localStorage.setItem(BV_AVAIN, JSON.stringify({ koodi: bv.koodi, avain: bv.avain })); } catch (e) {}
}
function bvUnohda() {
  try { localStorage.removeItem(BV_AVAIN); } catch (e) {}
}
function bvMuisti() {
  try {
    const m = JSON.parse(localStorage.getItem(BV_AVAIN) || 'null');
    return (m && /^[0-9]{4}$/.test(m.koodi) && typeof m.avain === 'string') ? m : null;
  } catch (e) { return null; }
}

/* ---------- valikko ---------- */

function bvEl(id) { return document.getElementById(id); }

function bvOsa(nimi) {
  bvEl('bassoValikko').hidden = !nimi;
  [].forEach.call(document.querySelectorAll('#bassoValikko .verkko-osa'), function (o) {
    o.hidden = o.dataset.osa !== nimi;
  });
  [].forEach.call(document.querySelectorAll('#bassoValikko .bv-virhe'), function (p) { p.hidden = true; });
}

function bvNaytaVirhe(e) {
  const osa = document.querySelector('#bassoValikko .verkko-osa:not([hidden]) .bv-virhe');
  if (osa) { osa.textContent = bvVirheTeksti(e); osa.hidden = false; }
  else bvViesti(bvVirheTeksti(e));
}

/* Pieni ilmoitus ruudun yläreunaan (yhteyskatkos, peli päättyi). */
let bvViestiAjastin = null;
function bvViesti(teksti, kesto) {
  const p = bvEl('bvViesti');
  if (!p) return;
  if (bvViestiAjastin) clearTimeout(bvViestiAjastin);
  if (!teksti) { p.hidden = true; return; }
  p.textContent = teksti;
  p.hidden = false;
  if (kesto) bvViestiAjastin = setTimeout(function () { p.hidden = true; }, kesto);
}

/* Värivalitsin: varatut himmeinä. Napautus valitsee (luo) tai liittyy (liity). */
function bvVarit(sailio, varatut, valittu, valitse) {
  sailio.innerHTML = '';
  TAYTTEET.forEach(function (x) {
    const n = x.arvo, vapaa = varatut.indexOf(n) < 0;
    const nappi = document.createElement('button');
    nappi.type = 'button';
    nappi.className = 'basso-vari-valinta' + (n === valittu ? ' valittu' : '');
    nappi.disabled = !vapaa;
    nappi.setAttribute('aria-label', t('basso.vari', { n: n }));
    nappi.innerHTML = bassoHahmo(x.vari);
    nappi.onclick = function () { valitse(n); };
    sailio.appendChild(nappi);
  });
}

function bvAvaaLuo() {
  bv.vari = bassoAsetukset.variNrot[0] || 2;
  const piirra = function () {
    bvVarit(bvEl('bvLuoVarit'), [], bv.vari, function (n) { bv.vari = n; piirra(); });
  };
  piirra();
  bvOsa('luo');
}

async function bvLuo() {
  const nappi = bvEl('bvLuo');
  nappi.disabled = true;
  try {
    const j = await bvApi('luo', { vari: bv.vari, asetukset: { tavoite: bassoAsetukset.tavoite, sallitut: tila.sallitut } });
    bv.koodi = j.koodi; bv.avain = j.avain;
    bvTallenna();
    bvSovella(j.tila);
    bvKaynnistaKysely();
  } catch (e) { bvNaytaVirhe(e); }
  nappi.disabled = false;
}

function bvAvaaKoodi(koodi) {
  bvOsa('koodi');
  const kentta = bvEl('bvKoodi');
  kentta.value = koodi || '';
  if (koodi) bvKoodiJatka();
  else setTimeout(function () { kentta.focus(); }, 50);
}

async function bvKoodiJatka() {
  const koodi = (bvEl('bvKoodi').value || '').replace(/\D/g, '');
  if (koodi.length !== 4) return bvNaytaVirhe({ virhe: 'eiHuonetta' });
  try {
    const j = await bvApi('katso', { koodi: koodi });
    if (j.vaihe !== 'aula') return bvNaytaVirhe({ virhe: 'alkanut' });
    if (!j.tilaa) return bvNaytaVirhe({ virhe: 'taynna' });
    bv.koodi = koodi;
    bvVarit(bvEl('bvLiityVarit'), j.varatut, null, bvLiity);
    bvOsa('liity');
  } catch (e) { bvNaytaVirhe(e); }
}

async function bvLiity(vari) {
  try {
    const j = await bvApi('liity', { koodi: bv.koodi, vari: vari });
    bv.avain = j.avain;
    bvTallenna();
    bvSovella(j.tila);
    bvKaynnistaKysely();
  } catch (e) {
    bvNaytaVirhe(e);
    /* Väri ehti mennä toiselle: haetaan tuore tilanne ja näytetään uudelleen. */
    if (e.virhe === 'variVarattu') bvKoodiJatka();
  }
}

/* ---------- aula ---------- */

function bvNaytaAula(tilaP) {
  const perustaja = tilaP.oma === 0;
  bvEl('bvAulaKoodi').textContent = tilaP.koodi;
  const qr = bvEl('bvAulaQr');
  const linkki = location.origin + location.pathname + '?liity=' + tilaP.koodi;
  if (qr.dataset.linkki !== linkki && typeof norsuQrSvg === 'function') {
    qr.innerHTML = norsuQrSvg(linkki);
    qr.dataset.linkki = linkki;
  }
  qr.hidden = !perustaja;
  bvEl('bvAulaPelaajat').innerHTML = tilaP.pelaajat.map(function (p, i) {
    return bassoHahmo(bassoVari(p.vari), i === tilaP.oma ? 'oma' : '');
  }).join('');
  const aloita = bvEl('bvAloita');
  aloita.hidden = !perustaja;
  aloita.disabled = tilaP.pelaajat.length < 2;
  bvEl('bvAulaOdota').textContent = t(perustaja ? 'bverkko.odotaPelaajia' : 'verkko.odota');
  bvEl('bvAulaPois').textContent = t(perustaja ? 'isanta.lopetaPeli' : 'verkko.poistu');
  bvOsa('aula');
}

/* Perustaja jakaa: uusi ottelu (aulasta tai päättyneen jälkeen) tai seuraava
 * kierros. Jako on perustajan laitteen, ja muut saavat sen palvelimelta. */
async function bvJaa() {
  if (!bv.tila || bv.oma !== 0 || bv.kiire) return;
  bv.kiire = true;
  try {
    const t0 = bv.tila;
    let ottelu = basso;
    if (t0.vaihe === 'aula' || !ottelu || ottelu.voittaja !== null || !t0.peli) {
      ottelu = bassoOttelu(t0.pelaajat.map(function () { return 'ihminen'; }),
        t0.asetukset.tavoite, t0.asetukset.sallitut);
    }
    bassoUusiKierros(ottelu);
    ottelu.viime = { tapa: 'jako' };
    const j = await bvApi('aloita', { koodi: bv.koodi, avain: bv.avain, peli: bassoSarjallista(ottelu) });
    bv.kiire = false;
    bvSovella(j.tila);
  } catch (e) {
    bv.kiire = false;
    bvNaytaVirhe(e);
  }
}

async function bvPois() {
  const perustaja = bv.oma === 0;
  if (perustaja && bv.koodi) {
    try { await bvApi('lopeta', { koodi: bv.koodi, avain: bv.avain }); } catch (e) {}
  }
  bvLopetaIstunto();
}

function bvLopetaIstunto(viesti) {
  if (bv.kysely) { clearTimeout(bv.kysely); bv.kysely = null; }
  bvUnohda();
  bv.koodi = bv.avain = bv.tila = null;
  bv.oma = null; bv.versio = 0; bv.kiire = false;
  bassoVerkossa = null;
  tila.verkko = null;
  document.body.classList.remove('basso-verkossa');
  if (bv.omatLuvat) { Object.assign(tila.sallitut, bv.omatLuvat); bv.omatLuvat = null; }
  bvPaivitaAsetusrivit();
  aloitaPeli();                 // takaisin tämän laitteen peliin
  bvOsa('paa');
  if (viesti) bvViesti(viesti, 4000);
}

/* ---------- pelin tila palvelimelta ---------- */

function bvKytkeKoukku(tilaP) {
  bv.oma = tilaP.oma;
  bassoVerkossa = {
    oma: tilaP.oma,
    perustaja: tilaP.oma === 0,
    varit: tilaP.pelaajat.map(function (p) { return p.vari; }),
    laheta: bvLahetaSiirto,
    seuraava: bvJaa,
  };
  /* ⚠️ LASKUTOIMITUKSET OVAT HUONEEN. Säännöt tarkistavat siirron huoneen
   * luvilla (bassoPalauta), mutta laskumerkkien napit lukevat `tila.sallitut`ia
   * — eri luvilla nappi tarjoaisi merkin jonka säännöt hylkäävät. Omat
   * talteen ja takaisin kun verkkopelistä lähdetään. */
  if (!bv.omatLuvat) bv.omatLuvat = Object.assign({}, tila.sallitut);
  Object.assign(tila.sallitut, tilaP.asetukset.sallitut);
  /* peli.js:n Partyn verkkolippu: ei taukoa, Esc ei lopeta yksin, X-kortin
   * arvo kysytään heti (kuten Partyn yhteispelissä). */
  tila.verkko = true;
  document.body.classList.add('basso-verkossa');
  bvPaivitaAsetusrivit();
}

/* Uusi tila palvelimelta. Aula → aulanäkymä. Peli → siirto näkyviin ja
 * sitten vuoro (tai tulosruutu). */
function bvSovella(tilaP) {
  bv.tila = tilaP;
  bv.versio = tilaP.versio;
  bv.virheita = 0;
  bvViesti(null);
  bvKytkeKoukku(tilaP);
  if (tilaP.vaihe === 'aula' || !tilaP.peli) return bvNaytaAula(tilaP);
  bvOsa(null);
  const uusi = bassoPalauta(tilaP.peli, tilaP.asetukset.sallitut);
  const viime = uusi.viime;
  const edellinen = basso;
  basso = uusi;
  /* Uusi kierros tai ottelu: näkymä alusta. */
  if (!viime || viime.tapa === 'jako' || !edellinen) return bvJatka(uusi, true);
  /* Oma siirto (esim. sivun uudelleenlatauksen jälkeen): ei näytettävää. */
  if (viime.kuka === bv.oma) return bvJatka(uusi, false);
  bvNaytaSiirto(uusi, viime);
}

/* Toisen pelaajan siirto näkyviin — sama kieli kuin apinan siirrossa:
 * pizza josta se tehtiin pysyy näkyvissä kortit päällään, lasku hahmon
 * vieressä. Nosto näkyy «+1»:nä. */
function bvNaytaSiirto(uusi, viime) {
  bv.kiire = true;
  const vari = bassoVarit()[viime.kuka];
  naytaRuutu('peliRuutu');
  if (viime.tapa === 'pelasi') {
    const T = taytepakka();
    tila.pizza = pizzapakka()[viime.pizza];
    tila.poydassa = [tila.pizza];
    tila.vaihe = 'valinta';
    tila.lukossa = true;
    tila.valitut = viime.kortit.map(function (id, j) {
      return Object.assign({}, T[id], { arvo: viime.vastaus.kortit[j].arvo });
    });
    piirraPizza();
    bassoValahda('apina', bassoHahmo(vari) + '<span>' + kierrosLauseke(viime.vastaus) +
      ' = ' + tila.pizza.arvo + '</span>', BASSO_APINAN_NAYTTO);
    setTimeout(function () {
      tila.valitut = [];
      if (viime.pizzaa && !viime.voitto) {
        bassoSynkka(); piirraKaikki(); piirraPisteet();
        bassoPizzaa(viime.kuka);
        return setTimeout(function () { bvJatka(uusi, false); }, BASSO_PIZZAA_KESTO);
      }
      bvJatka(uusi, false);
    }, BASSO_APINAN_NAYTTO);
    return;
  }
  bassoValahda('apina', bassoHahmo(vari) +
    '<span class="valahdys-merkki">' + (viime.nosti ? '+1' : '⊘') + '</span>', 800);
  setTimeout(function () { bvJatka(uusi, false); }, 850);
}

function bvJatka(uusi, alusta) {
  bv.kiire = false;
  if (alusta) return bassoNaytaKierros();
  if (uusi.kierros.voittaja !== null) {
    bassoSynkka();
    tila.kaynnissa = true;
    return lopetaKierros('basso');
  }
  tila.kaynnissa = true;
  naytaRuutu('peliRuutu');
  bassoVuoro();
}

/* Oma siirto palvelimelle. Säännöt ovat jo hyväksyneet sen tällä laitteella;
 * palvelin tarkistaa vain version ja vuoron. */
async function bvLahetaSiirto() {
  if (!bv.koodi) return;
  bv.kiire = true;
  try {
    const j = await bvApi('siirto', { koodi: bv.koodi, avain: bv.avain, versio: bv.versio,
      peli: bassoSarjallista(basso) });
    bv.versio = j.versio;
    bv.virheita = 0;
    bvViesti(null);
  } catch (e) {
    /* Tila ehti muuttua tai yhteys katkesi: palvelimen tila voittaa. Haetaan
     * se kokonaan (versio 0 = «anna kaikki»). */
    bvViesti(bvVirheTeksti(e), 3000);
    bv.versio = 0;
  }
  bv.kiire = false;
}

/* Kysely sekunnin välein. ⚠️ setTimeout-ketju eikä setInterval: hidas vastaus
 * ei saa käynnistää seuraavaa kyselyä ennen kuin edellinen on valmis. */
function bvKaynnistaKysely() {
  if (bv.kysely) clearTimeout(bv.kysely);
  const kierros = async function () {
    if (!bv.koodi) return;
    if (!bv.kiire) {
      try {
        const j = await bvApi('tila', { koodi: bv.koodi, avain: bv.avain, versio: bv.versio });
        bv.virheita = 0;
        if (!bv.kiire && j.tila) bvSovella(j.tila);
      } catch (e) {
        if (e.virhe === 'eiHuonetta' || e.virhe === 'eiOikeutta') {
          return bvLopetaIstunto(t('verkko.paattyi'));
        }
        if (++bv.virheita >= BV_VIRHERAJA) bvViesti(bvVirheTeksti(e));
      }
    }
    if (bv.koodi) bv.kysely = setTimeout(kierros, BV_KYSELYVALI);
  };
  bv.kysely = setTimeout(kierros, 0);
}

/* ---------- asetukset verkossa ----------
 * Kokoonpano, värit ja pisteraja ovat huoneen, eivät tämän laitteen: rivit
 * piiloon, ja tilalle «Lopeta peli» (perustaja) tai «Poistu pelistä». */
function bvPaivitaAsetusrivit() {
  const verkossa = !!bassoVerkossa;
  ['ihmiset', 'vari', 'apinat', 'pisteraja', 'luvat'].forEach(function (n) {
    const rivi = document.querySelector('.as-rivi[data-avaa="' + n + '"]');
    if (rivi) rivi.hidden = verkossa;
  });
  const lopeta = bvEl('asVerkkoLopeta');
  if (lopeta) {
    lopeta.hidden = !verkossa;
    bvEl('asVerkkoLopetaTeksti').textContent = verkossa
      ? t(bassoVerkossa.perustaja ? 'isanta.lopetaPeli' : 'verkko.poistu') : '';
  }
}

/* ---------- käynnistys ---------- */

/* ⚠️ Esc valikon päällä ei saa päätyä peli.js:lle: se lopettaisi alla
 * odottavan pelin ja avaisi tulosruudun valikon alle (sama ratkaisu kuin
 * valikko.js:ssä). Kaappausvaihe ajetaan ennen peli.js:n kuuntelijaa. */
window.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape' || bvEl('bassoValikko').hidden) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  const nyt = document.querySelector('#bassoValikko .verkko-osa:not([hidden])');
  if (nyt && nyt.dataset.osa !== 'paa' && nyt.dataset.osa !== 'aula') {
    bvOsa(nyt.dataset.osa === 'moninpeli' ? 'paa' : 'moninpeli');
  }
}, true);

document.addEventListener('DOMContentLoaded', function () {
  [].forEach.call(document.querySelectorAll('#bassoValikko .bv-takaisin'), function (n) {
    n.onclick = function () {
      const nyt = document.querySelector('#bassoValikko .verkko-osa:not([hidden])');
      bvOsa(nyt && (nyt.dataset.osa === 'moninpeli') ? 'paa' : 'moninpeli');
    };
  });
  bvEl('bvPelaa').onclick = function () { bvOsa(null); };
  bvEl('bvMoninpeli').onclick = function () { bvOsa('moninpeli'); };
  bvEl('bvLuoAvaa').onclick = bvAvaaLuo;
  bvEl('bvLiityAvaa').onclick = function () { bvAvaaKoodi(''); };
  bvEl('bvLuo').onclick = bvLuo;
  bvEl('bvKoodiJatka').onclick = bvKoodiJatka;
  bvEl('bvKoodi').addEventListener('keydown', function (e) { if (e.key === 'Enter') bvKoodiJatka(); });
  bvEl('bvAloita').onclick = bvJaa;
  bvEl('bvAulaPois').onclick = bvPois;
  bvEl('asVerkkoLopeta').onclick = function () {
    bvEl('asetusPeite').hidden = true;
    bvPois();
  };

  /* QR-linkki (?liity=1234) vie suoraan liittymiseen. Muistissa oleva
   * istunto jatkuu. Muuten alkuvalikko. */
  const liity = new URLSearchParams(location.search).get('liity');
  const muisti = bvMuisti();
  if (liity && /^[0-9]{4}$/.test(liity) && !(muisti && muisti.koodi === liity)) {
    bvAvaaKoodi(liity);
    return;
  }
  if (muisti) {
    bv.koodi = muisti.koodi; bv.avain = muisti.avain;
    bvApi('tila', { koodi: bv.koodi, avain: bv.avain }).then(function (j) {
      bvSovella(j.tila);
      bvKaynnistaKysely();
    }).catch(function () {
      bvUnohda();
      bv.koodi = bv.avain = null;
      bvOsa('paa');
    });
    return;
  }
  bvOsa('paa');
});
