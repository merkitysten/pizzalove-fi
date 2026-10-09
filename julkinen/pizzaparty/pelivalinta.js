/* Pizza Love — PELIN VALINTA kaikille pelimuodoille (9.10.2026).
 *
 * 🔵 Marko 9.10.2026: «Sekä pizza party että pizza basso pitäisi löytyä
 * samasta paikasta, että käyttäjä voisi vaihtaa peliä lennosta. Eli että
 * meillä olisi pizza loven digiversio, jossa eri pelimuotoja voisi kokeilla.»
 * Ja samana päivänä: valinta **aloitusvalikossa ja asetuksissa**.
 *
 * ⚠️ VAIHTO ON SIVUNVAIHTO, EI TILAN VAIHTO. Basso korvaa peli.js:n funktioita
 * samoilla nimillä (basso.js), joten pelit eivät voi olla samalla sivulla —
 * ja valikko.js:n periaate on jo: sivunvaihto purkaa jokaisen ajastimen ja
 * kyselyn, tilan vaihto vaatisi että jokainen purettaisiin käsin. Kieli,
 * laskutoimitukset (pizzapeli-asetukset) ja hahmo (hahmot.js) kulkevat mukana.
 *
 * Sivu kertoo pelinsä <html data-peli="…">-attribuutissa. Viimeksi valittu
 * peli muistetaan, ja index.html:n alussa oleva rivi avaa sen (`./`).
 *
 * Merkintä: .pelivalinta (valikossa, painikerivi) ja #pelivalintaLista
 * (asetusten «Peli»-sivulla, valintalista); valikkorivin arvo #arvoPeli. */

const PELIVALINTA_AVAIN = 'pizzapeli-peli';
/* Nimet ovat tuotenimiä eivätkä käänny. Uusi pelimuoto = uusi rivi tähän. */
const PELIT = [
  { avain: 'party', sivu: './', nimi: 'Pizza Party' },
  { avain: 'basso', sivu: 'basso.html', nimi: 'Pizza Basso' },
];

function peliNyt() {
  return document.documentElement.dataset.peli || 'party';
}

function peliMuista(avain) {
  try { localStorage.setItem(PELIVALINTA_AVAIN, avain); } catch (e) { /* yksityinen selaus */ }
}

/* Kielivalinta kulkee osoitteessa vain jos se tuli osoitteessa; muuten se on
 * yhteisissä asetuksissa ja seuraa mukana itsestään. */
function peliVaihda(avain) {
  const peli = PELIT.filter(function (p) { return p.avain === avain; })[0];
  if (!peli || avain === peliNyt()) return;
  peliMuista(avain);
  const kieli = new URLSearchParams(location.search).get('kieli');
  location.assign(peli.sivu + (kieli ? '?kieli=' + encodeURIComponent(kieli) : ''));
}

/* Paluu sivustolle. pizzalove.fi:ssä (ja github.io-testiosoitteessa) peli on
 * kansiossa, ja sivut ovat kielikansioissa: ../fi/, ../sv/ … Varainhankinta-
 * sivustolla paluu vie sen etusivulle. (Siirretty valikko.js:stä, jotta
 * Bassokin osaa sen.) */
function sivustonOsoite() {
  if (/(^|\.)merkitysten\.fi$/.test(location.hostname)) return '/';
  return '../' + (typeof KIELI === 'string' ? KIELI : 'fi') + '/';
}

function pelivalintaPiirra() {
  const nyt = peliNyt();
  /* Valikossa: painikerivi, valittu korostettuna. */
  [].forEach.call(document.querySelectorAll('.pelivalinta'), function (rivi) {
    rivi.innerHTML = '';
    rivi.setAttribute('role', 'radiogroup');
    rivi.setAttribute('aria-label', t('peli.valitse'));
    PELIT.forEach(function (p) {
      const nappi = document.createElement('button');
      nappi.type = 'button';
      nappi.className = 'pelivalinta-nappi' + (p.avain === nyt ? ' valittu' : '');
      nappi.setAttribute('role', 'radio');
      nappi.setAttribute('aria-checked', p.avain === nyt ? 'true' : 'false');
      nappi.textContent = p.nimi;
      nappi.onclick = function () { peliVaihda(p.avain); };
      rivi.appendChild(nappi);
    });
  });
  /* Asetuksissa: sama valintalista kuin muilla asetussivuilla. */
  const lista = document.getElementById('pelivalintaLista');
  if (lista) {
    lista.innerHTML = '';
    PELIT.forEach(function (p) {
      const nappi = document.createElement('button');
      nappi.className = 'as-valinta' + (p.avain === nyt ? ' valittu' : '');
      nappi.innerHTML = '<b></b>';
      nappi.querySelector('b').textContent = p.nimi;
      nappi.onclick = function () { peliVaihda(p.avain); };
      lista.appendChild(nappi);
    });
  }
  const arvo = document.getElementById('arvoPeli');
  if (arvo) arvo.textContent = PELIT.filter(function (p) { return p.avain === nyt; })[0].nimi;
  [].forEach.call(document.querySelectorAll('[data-sivustolle]'), function (a) {
    a.href = sivustonOsoite();
  });
}

document.addEventListener('DOMContentLoaded', function () {
  peliMuista(peliNyt());
  pelivalintaPiirra();
});
