/* Pizza Love — SIIRTYMÄ JA LATAUSKUVAKE (Marko 20.10.2026).
 *
 * 🔵 «Se voisi toki toimia siirtymänä esim. zoomautumalla tai jotenkin siten,
 * kun pelaaja on painanut jotain nappia. Myös sellainen latauskuvake olisi
 * hauska, jossa nuo sydämet kiertävät laatikkoa.»
 *
 * Rakastunut pizzalaatikko väistyi alkuvalikosta ajatuskuplan tieltä samana
 * päivänä; tämä on se paikka johon se palaa. Kaksi käyttöä, yksi komponentti:
 *
 *   siirtymaNayta()    sivu vaihtuu (location.assign) — peite jää päälle
 *                      kunnes uusi sivu korvaa sen. Kattaa latauksen valkoisen
 *                      välähdyksen.
 *   siirtymaValahda()  ruutu vaihtuu saman sivun sisällä — peite katoaa itse.
 *
 * ⚠️ PEITE EI SAA JÄÄDÄ NIELEMÄÄN NAPAUTUKSIA. Jokaisella tiellä ulos on
 * vahtikoira: `siirtymaValahda` poistaa itsensä ajastimella, ja `siirtymaNayta`
 * poistaa itsensä jos sivu EI vaihdukaan (esim. `location.assign` torjutaan tai
 * käyttäjä palaa takaisin selaimen napilla, jolloin sivu herää `pageshow`-
 * tapahtumalla välimuistista). Peite ilman vahtikoiraa on lukko.
 *
 * ⚠️ MARKUP TEHDÄÄN TÄSSÄ EIKÄ `sivupohja.html`:ssä: peite on sama kaikilla
 * sivuilla eikä sillä ole yhtään pelikohtaista osaa, joten yksi paikka riittää.
 * Kuvat haetaan vasta kun peite ensi kerran avataan — alkuvalikon lataus ei saa
 * maksaa tästä mitään.
 *
 * ⚠️ LAATIKKO ON OMA KUVANSA (`halaus-sydameton.webp`) EIKÄ `halaus.webp`.
 * 📐 Mitattu: alkuperäisessä sydämet on piirretty kuvaan kiinni, ja kun
 * kiertävä sydänkaari laitettiin sen ympärille, ruudulla oli KAKSI
 * sydänjoukkoa — kiertävät ja paikallaan olevat. Kehäsydämet poistettiin
 * siksi värin perusteella (vaaleanpunainen säteellä ≥ 120 ja sen ääriviiva
 * 11 px:n päähän), jolloin laatikon kulmat ja sen oma pieni rintasydän
 * säilyivät. Ympyrärajaus olisi leikannut kulmat: laatikko ja sydämet menevät
 * säteittäin päällekkäin.
 *
 * Riippuu: ei mistään. Ei kutsu pelin funktioita eikä lue sen tilaa.
 */

/* Kuinka kauan välähdys näkyy. 📐 Mitattu syy luvulle: zoomaus kestää 420 ms
 * (CSS), ja sen jälkeen jää 160 ms jona uusi ruutu on jo alla valmiina — ilman
 * sitä peite katoaisi täsmälleen samalla ruudunpiirrolla kuin zoom loppuu, ja
 * silmä näkee sen nykäyksenä. */
const SIIRTYMA_VALAHDYS_MS = 580;
/* Vahtikoira sivunvaihdolle: jos uusi sivu ei ole korvannut tätä tässä ajassa,
 * lataus ei lähtenyt liikkeelle ja peite on poistettava. */
const SIIRTYMA_VAHTI_MS = 8000;

let siirtymaKerros = null;
let siirtymaAjastin = null;

function siirtymaRakenna() {
  if (siirtymaKerros) return siirtymaKerros;
  const k = document.createElement('div');
  k.className = 'siirtyma';
  k.setAttribute('aria-hidden', 'true');
  /* Kaari on laatikon ALLA DOMissa mutta sen ympärillä ruudulla: sydämet
     kiertävät laatikkoa, eivät peitä sitä. */
  k.innerHTML =
    '<div class="siirtyma-kehys">' +
      '<img class="siirtyma-kaari" src="kuvat/sydankaari.webp?v=20261020g" alt="">' +
      '<img class="siirtyma-boksi" src="kuvat/halaus-sydameton.webp?v=20261020h" alt="">' +
    '</div>';
  document.body.appendChild(k);
  siirtymaKerros = k;
  return k;
}

/* Kuinka kauan haivytys kestaa (CSS .22s) + pieni vara. */
const SIIRTYMA_HAIVYTYS_MS = 300;

function siirtymaPois() {
  if (siirtymaAjastin) { clearTimeout(siirtymaAjastin); siirtymaAjastin = null; }
  if (!siirtymaKerros) return;
  const k = siirtymaKerros;
  k.classList.remove('siirtyma--nakyy');
  k.classList.add('siirtyma--pois');
  /* ⚠️ MOLEMMAT LUOKAT POIS HAIVYTYKSEN JALKEEN. 📐 Mitattu: pelkka
     `--pois` jatti kerroksen tilaan `visibility: visible; opacity: 0` —
     napautukset menivat jo lapi (`pointer-events: none`), mutta nakyva
     kerros nollaopasiteetilla on silti kerros. Perustila on luokaton. */
  setTimeout(function () {
    if (!k.classList.contains('siirtyma--nakyy')) k.classList.remove('siirtyma--pois');
  }, SIIRTYMA_HAIVYTYS_MS);
}

/* Sivunvaihdon peite: jää päälle, koska uusi sivu korvaa sen. */
function siirtymaNayta() {
  const k = siirtymaRakenna();
  k.classList.remove('siirtyma--pois');
  /* Pakotettu asettelu ennen luokan lisäystä, jotta animaatio lähtee alusta
     myös silloin kun peite näytetään toista kertaa samalla sivulla. */
  void k.offsetWidth;
  k.classList.add('siirtyma--nakyy');
  if (siirtymaAjastin) clearTimeout(siirtymaAjastin);
  siirtymaAjastin = setTimeout(siirtymaPois, SIIRTYMA_VAHTI_MS);
}

/* Ruudunvaihto saman sivun sisällä: peite katoaa itse. */
function siirtymaValahda() {
  siirtymaNayta();
  if (siirtymaAjastin) clearTimeout(siirtymaAjastin);
  siirtymaAjastin = setTimeout(siirtymaPois, SIIRTYMA_VALAHDYS_MS);
}

/* Selaimen takaisin-nappi herättää sivun välimuistista ilman uutta latausta,
 * jolloin peite olisi yhä päällä ja söisi napautukset. */
window.addEventListener('pageshow', function (e) { if (e.persisted) siirtymaPois(); });
