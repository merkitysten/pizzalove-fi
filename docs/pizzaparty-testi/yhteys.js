/* Pizza Party — yhteys palvelimeen (huone.php) ja palvelimen kello.
 *
 * ⚠️ YKSI LÄHDE ISÄNNÄLLE JA PELAAJALLE. Molemmat tarvitsevat saman kellon
 * ja saman virheenkäsittelyn; kahtena kopiona korjaus osuisi toiseen.
 * Ladataan isanta.html:ssä ja index.html:ssä ennen isanta.js / peli.js.
 *
 * KELLO: Cristianin menetelmä (MULTIPLAYER.md 8.2). Palvelin lukee kellonsa
 * pyynnön lähdön ja paluun välissä, joten virhe on enintään rtt/2 — ei
 * arvio vaan raja. Jokainen vastaus kantaa palvelimen ajan `t`, ja
 * poikkeamaa pidetään yllä jatkuvasti eikä kerran mitattuna (8.13):
 * viimeiset 12 näytettä, pienin rtt voittaa. Mitattu oikeilla laitteilla
 * ±7,7–12,5 ms.
 */

/* ⚠️ ABSOLUUTTINEN OSOITE (6.10.2026): peli julkaistaan myös pizzalove.fi:ssä
 * (GitHub Pages, ei PHP:tä). Moninpelin palvelin pysyy Domainhotellissa, ja
 * huone.php sallii kutsut pizzalove.fi:stä (CORS). Jos palvelin siirtyy,
 * vaihda vain tämä rivi. */
const HUONE_OSOITE = 'https://varainhankinta.merkitysten.fi/pizzaparty/huone.php';
/* ⚠️ YKSI OHI MENNYT KYSELY EI OLE KATKENNUT YHTEYS (Marko 12.9.2026:
 * *"Välillä tulee yhteys palvelimeen katkesi -herja, mutta se ei estä
 * pelaamista. Hämmentää toki."*). Kysely uusitaan sekunnin välein ja
 * korjaantuu itsestään, joten ilmoitus tulee vasta kun peräkkäisiä
 * epäonnistumisia on tämä määrä — ja se on poistettava heti kun yksi
 * kysely onnistuu. Molemmat puuttuivat: ilmoitus tuli ensimmäisestä
 * virheestä eikä kadonnut itsestään lainkaan. */
const YHTEYS_VIRHERAJA = 3;
const KELLONAYTTEITA = 12;
const YHTEYS = { naytteet: [] };

function nyt() { return performance.timeOrigin + performance.now(); }

function kirjaaKello(t1, t2, palvelimenT) {
  const n = YHTEYS.naytteet;
  n.push({ rtt: t2 - t1, poikkeama: palvelimenT - (t1 + t2) / 2 });
  if (n.length > KELLONAYTTEITA) n.shift();
}

function palvelinAika() {
  const n = YHTEYS.naytteet;
  if (!n.length) return nyt();
  let paras = n[0];
  for (let i = 1; i < n.length; i++) if (n[i].rtt < paras.rtt) paras = n[i];
  return nyt() + paras.poikkeama;
}

/* Palauttaa vastauksen tai heittää virheen, jolla on `virhe` (palvelimen
 * koodi), `viesti` (palvelimen varateksti) ja `status`. Yhteyskatkos
 * heittää `yhteys: true`. */
async function api(toiminto, data) {
  const runko = JSON.stringify(Object.assign({ toiminto: toiminto }, data || {}));
  const t1 = nyt();
  let vastaus;
  try {
    vastaus = await fetch(HUONE_OSOITE, {
      method: 'POST', cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }, body: runko,
    });
  } catch (e) {
    const v = new Error(t('yhteys.eiYhteytta'));
    v.yhteys = true;
    throw v;
  }
  const t2 = nyt();
  let j = null;
  try { j = await vastaus.json(); } catch (e) { j = null; }
  if (!j || typeof j !== 'object') {
    throw new Error(t('yhteys.palvelinVirhe', { koodi: vastaus.status }));
  }
  if (typeof j.t === 'number') kirjaaKello(t1, t2, j.t);
  if (!j.ok) {
    const v = new Error(j.viesti || j.virhe || ('HTTP ' + vastaus.status));
    v.virhe = j.virhe;
    v.viesti = j.viesti;
    v.status = vastaus.status;
    throw v;
  }
  return j;
}

/* Palvelimen virhekoodi kielikerroksen tekstiksi; puuttuva käännös →
 * palvelimen oma varateksti. */
function virheTeksti(e) {
  if (e && e.virhe) {
    const avain = 'huone.' + e.virhe;
    const s = t(avain);
    if (s !== avain) return s;
    if (e.viesti) return e.viesti;
  }
  return (e && e.message) ? e.message : String(e);
}
