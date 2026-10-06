/* Pizza Party — pelaava isäntä: yksi pelaaja luo pelin puhelimellaan
 *
 * Marko 11.9.2026: *"Eikö yksi pelaaja voisi olla samalla se isäntä? Silloin
 * yksi pelaaja tekisi pelin, johon muut liittyvät."* Iso näyttö (isanta.html)
 * jää toiseksi tavaksi.
 *
 * ⚠️ ISÄNTÄ ON TAVALLINEN PELAAJA + ISÄNNÄN AVAIN. Laite luo huoneen,
 * liittyy siihen omalla nimellään ja pelaa pelaaja.js:n polulla kuten muut.
 * Tämä tiedosto lisää vain sen mitä pelaajalla ei ole: luontilomakkeen,
 * koodin ja napit odotusnäkymään, sekä kierroksen päättämisen ja
 * pisteytyksen taustalla. Jako ja pisteytys ovat isannointi.js:ssä — samat
 * kuin isolla näytöllä.
 *
 * ⚠️ PELI ETENEE VAIN KUN ISÄNNÄN PUHELIN ON HEREILLÄ. Taustalle jäänyt tai
 * lukittu selain kuristaa ajastimet (MULTIPLAYER.md 8.12), ja silloin
 * kierros ei pääty kenelläkään. Siksi näyttö pidetään päällä (Wake Lock)
 * kun selain sallii, ja tila luetaan heti kun puhelin herää.
 *
 * ⚠️ AVAIN LOCALSTORAGEEN, kuten pelaajan avain (pelaaja.js): puhelin voi
 * hävittää lukitun välilehden, ja ilman isännän avainta peli jäisi
 * jumiin kaikilta. Avain poistetaan kun peli päättyy.
 *
 * ⚠️ NIMET ALKAVAT `verkkoIsanta`-ETULIITTEELLÄ (sama sivu kuin peli.js).
 */

const VERKKO_ISANTA_AVAIN = 'pizzaparty-pelaava-isanta';
const VERKKO_ISANTA_KYSELY_MS = 1000;
const VERKKO_ISANTA_UUSINTA_MS = 2000;

/* Isännän tila (isannointi.js) + tämän laitteen omat kentät. */
const verkkoIsanta = Object.assign(isannointiUusi(), {
  asetukset: isannointiOletukset(),   // luontilomakkeen arvot
  kysely: null,
  kyselyKesken: false,
  virheita: 0,                        // peräkkäiset epäonnistuneet kyselyt
  kesken: false,                      // napin toiminto matkalla
  aulaAvain: '',
  valvonta: null,                     // Wake Lock
});

/* ---------- muisti ---------- */
function verkkoIsantaTallenna() {
  const h = verkkoIsanta;
  try {
    localStorage.setItem(VERKKO_ISANTA_AVAIN, JSON.stringify({
      koodi: h.koodi, avain: h.avain, kaytetyt: h.kaytetytPizzat,
    }));
  } catch (e) { /* yksityinen selaus: uudelleenlataus lopettaa isännöinnin */ }
}

function verkkoIsantaUnohda() {
  const h = verkkoIsanta;
  clearTimeout(h.kysely);
  h.kysely = null;
  isannointiNollaa(h);
  h.aulaAvain = '';
  verkkopeli.isanta = null;
  if (h.valvonta) h.valvonta.release().catch(function () { /* jo vapautettu */ });
  h.valvonta = null;
  verkkoIsantaNapitNakyviin(false);
  try { localStorage.removeItem(VERKKO_ISANTA_AVAIN); } catch (e) { /* ei muistia */ }
}

/* Tästä hetkestä tämä laite isännöi: kytkökset pelaaja.js:ään, kysely ja
 * näytön valveilla pito. */
function verkkoIsantaAloita() {
  verkkopeli.isanta = { paivita: verkkoIsantaPaivita, unohda: verkkoIsantaUnohda };
  verkkoIsantaValveille();
  verkkoIsantaAjastaKysely(0);
}

async function verkkoIsantaValveille() {
  const h = verkkoIsanta;
  if (!h.koodi || h.valvonta || !navigator.wakeLock || document.visibilityState !== 'visible') return;
  try {
    h.valvonta = await navigator.wakeLock.request('screen');
    h.valvonta.addEventListener('release', function () { h.valvonta = null; });
  } catch (e) { /* ei tukea tai virransäästö esti: peli toimii, näyttö voi sammua */ }
}

/* ---------- luontilomake ---------- */
function verkkoIsantaMerkitse(ryhmaId, arvo) {
  [].forEach.call(verkkoEl(ryhmaId).querySelectorAll('button[data-arvo]'), function (b) {
    const valittu = b.dataset.arvo === arvo;
    b.classList.toggle('valittu', valittu);
    b.setAttribute('aria-pressed', valittu ? 'true' : 'false');
  });
}

function verkkoIsantaPiirraLomake() {
  const s = verkkoIsanta.asetukset;
  verkkoIsantaMerkitse('verkkoLuoKierroksia', String(s.kierroksia));
  verkkoIsantaMerkitse('verkkoLuoTapa', s.vaikea ? 'vaikea' : 'helppo');
  verkkoEl('verkkoLuoAika').textContent = t('aika.sekuntia', { n: s.aikaMs / 1000 });
  verkkoEl('verkkoLuoAikaMiinus').disabled = s.aikaMs <= ISANNOINTI_AIKA_ALIN_MS;
  verkkoEl('verkkoLuoAikaPlus').disabled = s.aikaMs >= ISANNOINTI_AIKA_YLIN_MS;
  verkkoEl('verkkoLuoOdota').checked = s.odotaKaikkia;
  [].forEach.call(verkkoEl('verkkoLuoLuvat').querySelectorAll('input[data-lupa]'), function (n) {
    n.checked = !!s.sallitut[n.dataset.lupa];
  });
}

function verkkoIsantaAsetusMuuttui() {
  isannointiTallennaAsetukset(verkkoIsanta.asetukset);
  verkkoIsantaPiirraLomake();
}

function verkkoIsantaLomake() {
  verkkoIsanta.asetukset = isannointiLataaAsetukset();
  verkkoIsantaPiirraLomake();
  /* Liittymislomakkeelle kirjoitettu nimi kulkee mukana. */
  if (!verkkoEl('verkkoLuoNimi').value) verkkoEl('verkkoLuoNimi').value = verkkoEl('verkkoNimi').value;
  verkkoEl('verkkoLuoVirhe').hidden = true;
  verkkoPeite('luo');
}

async function verkkoIsantaLuo(e) {
  e.preventDefault();
  const h = verkkoIsanta;
  const nappi = verkkoEl('verkkoLuoNappi');
  const virhe = verkkoEl('verkkoLuoVirhe');
  if (h.koodi) return;
  nappi.disabled = true;
  virhe.hidden = true;
  let luotu = false;
  try {
    await isannointiLuo(h, h.asetukset);
    luotu = true;
    const j = await api('liity', { koodi: h.koodi, nimi: verkkoEl('verkkoLuoNimi').value });
    verkkoIsantaTallenna();
    verkkoIsantaAloita();
    verkkoOtaPelaaja(h.koodi, j);
  } catch (err) {
    /* ⚠️ Nimen tarkistaa palvelin liittyessä (huone.php siistiNimi), ei tämä
     * lomake — kaksi toteutusta ajautuisi erilleen. Siksi huone voi syntyä
     * ennen kuin nimi torjutaan, ja silloin se poistetaan heti: tyhjää
     * huonetta ei jätetä odottamaan vanhenemista. */
    if (luotu) {
      const tunnus = isannointiTunnus(h);
      verkkoIsantaUnohda();
      isannointiPoista(tunnus);
    }
    virhe.textContent = virheTeksti(err);
    virhe.hidden = false;
  } finally {
    nappi.disabled = false;
  }
}

/* ---------- napit odotusnäkymässä ---------- */

/* Mitä isännän pääpainike tekee tässä vaiheessa. Yksi taulukko sekä
 * tekstille että toiminnolle, jotta ne eivät voi olla eri mieltä. */
function verkkoIsantaToiminto() {
  const h = verkkoIsanta;
  const vaihe = h.tila ? h.tila.vaihe : null;
  if (vaihe === 'aula') return { teksti: 'isanta.aloita', tee: isannointiAloitaKierros };
  /* ⚠️ KIERROKSEN AIKANA PÄÄPAINIKE ON JO «SEURAAVA KIERROS», MUTTA ODOTTAA
   * (Marko 13.9.2026): *"seuraava kierros pitäisi olla siinä samassa
   * paikassa koko ajan. Vaikka oranssilla reunaviivalla ja oranssilla
   * tekstillä, kun kaikki pelaajat eivät vielä ole valmiita."* Painike ei
   * tee mitään ennen kuin kierros on päättynyt — kierroksen voi päättää
   * vain erillisestä «Lopeta kierros» -painikkeesta. */
  if (vaihe === 'kierros') {
    return { teksti: isannointiViimeinen(h) ? 'isanta.lopputulokseen' : 'isanta.seuraava', tee: null };
  }
  if (vaihe === 'tulos' && isannointiViimeinen(h)) return { teksti: 'isanta.lopputulokseen', tee: isannointiPaataPeli };
  if (vaihe === 'tulos') return { teksti: 'isanta.seuraava', tee: isannointiAloitaKierros };
  if (vaihe === 'loppu') return { teksti: 'isanta.uudelleen', tee: isannointiUudelleen };
  return null;
}

/* Isännän osa laatikossa ja painikepalkki ruudun alareunassa näkyvät yhdessä.
 * Palkin korkeus välitetään peitteelle, jotta keskitetty laatikko jää sen
 * yläpuolelle eikä sen alle. */
function verkkoIsantaNapitNakyviin(nakyy) {
  verkkoEl('verkkoIsanta').hidden = !nakyy;
  const napit = verkkoEl('verkkoIsantaNapit');
  const peite = verkkoEl('verkkoPeite');
  napit.hidden = !nakyy;
  peite.classList.toggle('isanta-napit', nakyy);
  if (!nakyy) return void peite.style.setProperty('--napit-kork', '0px');
  /* ⚠️ Palkki kiinnitetään YLÄREUNASTAAN täyden korkeutensa mukaan (kolme
   * painiketta). Silloin pääpainike on joka vaiheessa samassa kohdassa, ja
   * kun «Lopeta kierros» ei ole käytössä, tyhjä tila jää palkin alle eikä
   * painikkeiden väliin. Vaakatasossa paikka varataan näkymättömänä (CSS). */
  const kierrosNappi = verkkoEl('verkkoIsantaLopetaKierros');
  let taysi = napit.offsetHeight;
  if (getComputedStyle(kierrosNappi).display === 'none') {
    const rako = parseFloat(getComputedStyle(kierrosNappi.parentNode).rowGap) || 0;
    taysi += verkkoEl('verkkoIsantaLopeta').offsetHeight + rako;
  }
  napit.style.setProperty('--palkki-taysi', taysi + 'px');
  peite.style.setProperty('--napit-kork', taysi + 'px');
}

function verkkoIsantaPaivita() {
  const h = verkkoIsanta;
  if (!h.koodi || !h.tila || verkkoEl('verkkoOdota').hidden) { verkkoIsantaNapitNakyviin(false); return; }
  const s = h.tila;
  const aulassa = s.vaihe === 'aula';
  const toiminto = verkkoIsantaToiminto();
  verkkoEl('verkkoIsantaKoodi').hidden = !aulassa;
  if (!aulassa) verkkoEl('verkkoIsantaQr').hidden = true;
  verkkoEl('verkkoIsantaOsoite').hidden = !aulassa;
  verkkoEl('verkkoIsantaPelaajat').hidden = !aulassa;
  /* ⚠️ Lopeta peli JOKA vaiheessa (Marko 11.9.2026). Ennen vain aulassa ja
   * lopussa — kierroksen ja tulosten aikana isäntä oli umpikujassa. */
  const jatka = verkkoEl('verkkoIsantaJatka');
  const odottaa = !!toiminto && !toiminto.tee;
  jatka.hidden = !toiminto;
  if (toiminto) jatka.textContent = t(toiminto.teksti);
  jatka.classList.toggle('odottaa', odottaa);
  jatka.disabled = h.kesken || odottaa;
  /* ⚠️ Ei `hidden` vaan `.varattu`: palkin paikka lasketaan täydestä
   * korkeudesta (verkkoIsantaNapitNakyviin), jotta pääpainike ei siirry
   * kierroksen alkaessa ja päättyessä. */
  const lopetaKierros = verkkoEl('verkkoIsantaLopetaKierros');
  const eiKierrosta = s.vaihe !== 'kierros';
  lopetaKierros.classList.toggle('varattu', eiKierrosta);
  lopetaKierros.setAttribute('aria-hidden', eiKierrosta ? 'true' : 'false');
  lopetaKierros.tabIndex = eiKierrosta ? -1 : 0;
  lopetaKierros.disabled = h.kesken || eiKierrosta;
  verkkoEl('verkkoIsantaLopeta').disabled = h.kesken;
  verkkoIsantaNapitNakyviin(true);
  /* Kierroksen aikana isännälle se mitä hän ei muuten näe: montako on valmis. */
  if (s.vaihe === 'kierros') {
    verkkoEl('verkkoTilanne').textContent = t('isanta.vastanneet', {
      n: isannointiVastanneita(h), kaikki: s.pelaajat.length });
  }
  if (!aulassa) return;
  /* Aulassa «Peli alkaa pian» on väärä teksti isännälle, joka aloittaa sen. */
  verkkoEl('verkkoTilanne').textContent = t('isanta.pelaajia', { n: s.pelaajat.length });
  verkkoEl('verkkoIsantaKoodi').textContent = h.koodi;
  isannointiPiirraQr(verkkoEl('verkkoIsantaQr'), h.koodi);
  isannointiKirjoitaOsoite(verkkoEl('verkkoIsantaOsoite'), t('isanta.liity') + ' ');
  const avain = s.pelaajat.map(function (p) { return p.id; }).join(',');
  if (avain === h.aulaAvain) return;
  h.aulaAvain = avain;
  const lista = verkkoEl('verkkoIsantaPelaajat');
  lista.textContent = '';
  s.pelaajat.forEach(function (p) {
    const el = document.createElement('span');
    el.textContent = p.nimi;
    lista.appendChild(el);
  });
}

function verkkoIsantaVirhe(teksti) {
  const el = verkkoEl('verkkoIsantaVirhe');
  el.textContent = teksti || '';
  el.hidden = !teksti;
}

function verkkoIsantaKatosi(e) {
  if (e.virhe !== 'eiHuonetta' && e.virhe !== 'eiOikeutta') return false;
  /* Pelaajan kysely huomaa saman ja näyttää «Peli on päättynyt». */
  verkkoIsantaUnohda();
  verkkoAjastaKysely(0);
  return true;
}

async function verkkoIsantaJatka() {
  const toiminto = verkkoIsantaToiminto();
  if (toiminto && toiminto.tee) await verkkoIsantaTee(toiminto.tee);
}

async function verkkoIsantaLopetaKierros() {
  if (verkkoIsanta.tila && verkkoIsanta.tila.vaihe === 'kierros') await verkkoIsantaTee(isannointiPaataKierros);
}

async function verkkoIsantaTee(tee) {
  const h = verkkoIsanta;
  if (h.kesken) return;
  h.kesken = true;
  verkkoIsantaPaivita();
  try {
    await tee(h);
    verkkoIsantaVirhe('');
    verkkoIsantaTallenna();
    /* Oma pelaajanäkymä heti eikä vasta seuraavalla kyselyllä. */
    verkkoAjastaKysely(0);
  } catch (e) {
    if (!verkkoIsantaKatosi(e)) verkkoIsantaVirhe(virheTeksti(e));
  } finally {
    h.kesken = false;
    verkkoIsantaPaivita();
  }
}

async function verkkoIsantaLopeta() {
  /* ⚠️ Peli unohdetaan ENNEN poistopyyntöä (MULTIPLAYER.md 9.3): muuten
   * matkalla oleva kysely saisi 404:n ja näyttäisi isännälle «Peli on
   * päättynyt» hänen omasta lopetuksestaan. Poisto odotetaan ennen siirtymää:
   * sivunvaihto keskeyttäisi pyynnön. */
  const tunnus = isannointiTunnus(verkkoIsanta);
  verkkoLopetaPaikallisesti();
  verkkoUnohda();
  await isannointiPoista(tunnus);
  valikkoAlkuun();
}

/* ---------- kysely: kierroksen päättäminen taustalla ---------- */
function verkkoIsantaAjastaKysely(ms) {
  clearTimeout(verkkoIsanta.kysely);
  verkkoIsanta.kysely = setTimeout(verkkoIsantaKysy, ms);
}

async function verkkoIsantaKysy() {
  const h = verkkoIsanta;
  if (!h.koodi || h.kyselyKesken) return;
  h.kyselyKesken = true;
  const koodi = h.koodi;
  let seuraava = VERKKO_ISANTA_KYSELY_MS;
  try {
    const j = await api('tila', isannointiTunnus(h));
    if (h.koodi !== koodi) return;
    h.tila = j.tila;
    /* ⚠️ Vain käynnissä oleva kierros päätetään. Isolla näytöllä tämän
     * vartioi näkymä (piirto pyörii vain kierroksella); täällä kysely
     * pyörii kaikissa vaiheissa. */
    if (j.tila.vaihe === 'kierros' && !h.kesken && isannointiPitaaPaattaa(h, palvelinAika())) {
      h.kesken = true;
      try {
        if (await isannointiPaataKierros(h)) {
          verkkoIsantaVirhe('');
          verkkoAjastaKysely(0);
        }
      } finally {
        h.kesken = false;
      }
    }
    /* Yhteys palasi: ilmoitus pois (ks. YHTEYS_VIRHERAJA). */
    h.virheita = 0;
    verkkoIsantaVirhe('');
    verkkoIsantaPaivita();
  } catch (e) {
    if (h.koodi !== koodi) return;
    if (verkkoIsantaKatosi(e)) return;
    h.virheita++;
    if (h.virheita >= YHTEYS_VIRHERAJA) verkkoIsantaVirhe(virheTeksti(e));
    seuraava = VERKKO_ISANTA_UUSINTA_MS;
  } finally {
    h.kyselyKesken = false;
    if (h.koodi === koodi) verkkoIsantaAjastaKysely(seuraava);
  }
}

/* ---------- käynnistys ---------- */
async function verkkoIsantaJatkaIstuntoa() {
  let tallessa = null;
  try { tallessa = JSON.parse(localStorage.getItem(VERKKO_ISANTA_AVAIN) || 'null'); } catch (e) { tallessa = null; }
  if (!tallessa || !tallessa.koodi || !tallessa.avain) return;
  /* Isännöinti kuuluu pelaajan peliin: jos laite ei ole enää siinä pelissä,
   * isännän avain on vanha. */
  if (tallessa.koodi !== verkkopeli.koodi) {
    try { localStorage.removeItem(VERKKO_ISANTA_AVAIN); } catch (e) { /* ei muistia */ }
    return;
  }
  try {
    await isannointiJatka(verkkoIsanta, tallessa.koodi, tallessa.avain, tallessa.kaytetyt);
  } catch (e) {
    if (e.virhe === 'eiHuonetta' || e.virhe === 'eiOikeutta') {
      try { localStorage.removeItem(VERKKO_ISANTA_AVAIN); } catch (err) { /* ei muistia */ }
      return;
    }
    /* Yhteyskatkos: ilman isäntää peli ei etene kenelläkään, joten yritetään
     * uudelleen eikä luovuta. */
    setTimeout(verkkoIsantaJatkaIstuntoa, VERKKO_ISANTA_UUSINTA_MS);
    return;
  }
  verkkoIsantaAloita();
  verkkoIsantaPaivita();
}

function verkkoIsantaKytke() {
  verkkoEl('verkkoLuoTakaisin').addEventListener('click', valikkoAlkuun);
  verkkoEl('verkkoLuo').addEventListener('submit', verkkoIsantaLuo);
  [].forEach.call(verkkoEl('verkkoLuoKierroksia').querySelectorAll('button[data-arvo]'), function (b) {
    b.addEventListener('click', function () {
      verkkoIsanta.asetukset.kierroksia = Number(b.dataset.arvo);
      verkkoIsantaAsetusMuuttui();
    });
  });
  [].forEach.call(verkkoEl('verkkoLuoTapa').querySelectorAll('button[data-arvo]'), function (b) {
    b.addEventListener('click', function () {
      verkkoIsanta.asetukset.vaikea = b.dataset.arvo === 'vaikea';
      verkkoIsantaAsetusMuuttui();
    });
  });
  verkkoEl('verkkoLuoAikaMiinus').addEventListener('click', function () {
    const s = verkkoIsanta.asetukset;
    s.aikaMs = isannointiRajaaAika(s.aikaMs - ISANNOINTI_AIKA_ASKEL_MS);
    verkkoIsantaAsetusMuuttui();
  });
  verkkoEl('verkkoLuoAikaPlus').addEventListener('click', function () {
    const s = verkkoIsanta.asetukset;
    s.aikaMs = isannointiRajaaAika(s.aikaMs + ISANNOINTI_AIKA_ASKEL_MS);
    verkkoIsantaAsetusMuuttui();
  });
  verkkoEl('verkkoLuoOdota').addEventListener('change', function () {
    verkkoIsanta.asetukset.odotaKaikkia = verkkoEl('verkkoLuoOdota').checked;
    verkkoIsantaAsetusMuuttui();
  });
  [].forEach.call(verkkoEl('verkkoLuoLuvat').querySelectorAll('input[data-lupa]'), function (n) {
    n.addEventListener('change', function () {
      verkkoIsanta.asetukset.sallitut[n.dataset.lupa] = n.checked;
      verkkoIsantaAsetusMuuttui();
    });
  });
  verkkoEl('verkkoIsantaJatka').addEventListener('click', verkkoIsantaJatka);
  isannointiVarmistaEnsin(verkkoEl('verkkoIsantaLopeta'), verkkoIsantaLopeta);
  /* Kierroksen lopetus päättää sen kaikilta, myös niiltä jotka vielä
   * miettivät — sama kahden napautuksen varmistus kuin pelin lopetuksessa. */
  isannointiVarmistaEnsin(verkkoEl('verkkoIsantaLopetaKierros'), verkkoIsantaLopetaKierros, 'isanta.varmistaKierros');
  /* Puhelin herää: kierros päätetään heti, ja näyttö pidetään taas päällä
   * (selain vapauttaa Wake Lockin aina kun sivu piiloutuu). */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible' || !verkkoIsanta.koodi) return;
    verkkoIsantaValveille();
    verkkoIsantaAjastaKysely(0);
  });
}

/* ⚠️ VAHTI, EI TARKISTIN (sama kuin isantaVahti). Kuollut nappi ei kaada
 * mitään eikä kirjoita konsoliin. */
function verkkoIsantaVahti() {
  const puuttuu = [];
  ['verkkoIsantaQr', 'verkkoLuo', 'verkkoLuoNimi', 'verkkoLuoKierroksia', 'verkkoLuoAikaMiinus',
   'verkkoLuoAika', 'verkkoLuoAikaPlus', 'verkkoLuoOdota', 'verkkoLuoTapa', 'verkkoLuoLuvat',
   'verkkoLuoNappi', 'verkkoLuoVirhe', 'verkkoLuoTakaisin', 'verkkoIsanta', 'verkkoIsantaKoodi',
   'verkkoIsantaOsoite', 'verkkoIsantaPelaajat', 'verkkoIsantaJatka', 'verkkoIsantaVirhe', 'verkkoIsantaLopetaKierros', 'verkkoIsantaNapit',
   'verkkoIsantaLopeta'].forEach(function (id) { if (!verkkoEl(id)) puuttuu.push('#' + id); });
  ['isannointiUusi', 'isannointiLuo', 'isannointiJatka', 'isannointiAloitaKierros', 'isannointiPitaaPaattaa',
   'isannointiPaataKierros', 'isannointiPaataPeli', 'isannointiUudelleen', 'isannointiPoista',
   'verkkoOtaPelaaja', 'verkkoUnohda', 'verkkoLiityNakyma', 'verkkoPeite', 'verkkoAjastaKysely',
   'api', 'palvelinAika', 'virheTeksti', 'norsuQrSvg', 'isannointiPiirraQr', 'isannointiKirjoitaOsoite', 'isannointiVarmistaEnsin', 'valikkoAlkuun', 'kierrosJaa', 'kierrosTarkista', 'kierrosPisteet'].forEach(function (f) {
    if (typeof window[f] !== 'function') puuttuu.push(f + '()');
  });
  if (puuttuu.length) {
    console.error('Pizza Party pelaava isäntä ' + new Date().toLocaleTimeString() + ': PUUTTUU → ' + puuttuu.join(', '));
  }
  return puuttuu;
}

function verkkoIsantaAlusta() {
  if (!verkkoTilaan()) return;
  verkkoIsantaKytke();
  verkkoIsantaVahti();
  if (verkkopeli.koodi) verkkoIsantaJatkaIstuntoa();
  /* Alkuvalikon «Luo peli» → `?liity&luo`: lomake suoraan. */
  else if (new URLSearchParams(location.search).has('luo')) verkkoIsantaLomake();
}

/* ⚠️ Rekisteröidään pelaaja.js:n jälkeen (skriptijärjestys): verkkoAlusta
 * on palauttanut pelaajan tunnuksen kun tämä käynnistyy. */
document.addEventListener('DOMContentLoaded', verkkoIsantaAlusta);
