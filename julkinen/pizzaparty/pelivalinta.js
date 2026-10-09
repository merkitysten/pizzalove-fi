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
 * (asetusten «Peli»-sivulla, valintalista); valikkorivin arvo #arvoPeli.
 * Lisäksi aloitusruudun palkin kielivalinta (.alku-kielet), koska sekin on molempien
 * pelien yhteinen. */

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

/* KIELIVALINTA ALOITUSRUUDUN PALKISSA, kuten pizzalove.fi:ssä (Marko 9.10.2026: «Olisiko
 * sen paikka kumminkin siellä oranssissa palkissa yläkulmassa? käy katsomassa
 * pizzalove.fi -sivuston toteutus»): maapallo, kielen nimi ja nuoli; avautuu listaksi.
 * Valkoinen oranssin päällä (yhteinen.css).
 * ⚠️ VAIHTO ON SIVUNVAIHTO ?kieli=-parametrilla, ei tilan vaihto: kielet.js tallentaa sen
 * yhteisiin asetuksiin, ja sama polku toimii molemmissa peleissä. Pelin oma vaihto
 * (⚙ › Kieli) kutsuu kummankin pelin omia piirtofunktioita; aloitusruudussa peli on
 * lepotilassa, joten uudelleenlataus ei hukkaa mitään. */
const KIELIVALINTA_PALLO = '<svg class="kielet-pallo" viewBox="0 0 24 24" aria-hidden="true">' +
  '<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.7 3.9 5.9 3.9 9.5s-1.3 6.8-3.9 ' +
  '9.5c-2.6-2.7-3.9-5.9-3.9-9.5S9.4 5.2 12 2.5z"/></svg>';
const KIELIVALINTA_NUOLI = '<svg class="kielet-nuoli" viewBox="0 0 12 12" aria-hidden="true">' +
  '<path d="M2.5 4.5 6 8l3.5-3.5"/></svg>';

function kielivalintaVaihda(k) {
  if (k === KIELI) return;
  const haku = new URLSearchParams(location.search);
  haku.set('kieli', k);
  location.replace(location.pathname + '?' + haku.toString().replace(/=(?=&|$)/g, ''));
}

function kielivalintaPiirra() {
  [].forEach.call(document.querySelectorAll('.alku-kielet'), function (paikka) {
    const d = document.createElement('details');
    d.className = 'kielet';
    const yhteenveto = document.createElement('summary');
    yhteenveto.setAttribute('aria-label', t('as.kieli') + ': ' + kielenNimi(KIELI));
    yhteenveto.innerHTML = KIELIVALINTA_PALLO + '<span></span>' + KIELIVALINTA_NUOLI;
    yhteenveto.querySelector('span').textContent = kielenNimi(KIELI);
    const lista = document.createElement('ul');
    lista.className = 'kielet-lista';
    valmiitKielet().forEach(function (k) {
      const li = document.createElement('li');
      const nappi = document.createElement('button');
      nappi.type = 'button';
      nappi.lang = k;
      nappi.textContent = kielenNimi(k);
      if (k === KIELI) nappi.setAttribute('aria-current', 'true');
      nappi.onclick = function () { d.open = false; kielivalintaVaihda(k); };
      li.appendChild(nappi);
      lista.appendChild(li);
    });
    d.appendChild(yhteenveto);
    d.appendChild(lista);
    paikka.innerHTML = '';
    paikka.appendChild(d);
  });
}

/* Avoin lista sulkeutuu napautuksesta muualle ja Escistä, kuten sivustolla (sivu.js). */
document.addEventListener('click', function (e) {
  [].forEach.call(document.querySelectorAll('.alku-kielet details[open]'), function (d) {
    if (!d.contains(e.target)) d.open = false;
  });
});
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  [].forEach.call(document.querySelectorAll('.alku-kielet details[open]'), function (d) { d.open = false; });
});

document.addEventListener('DOMContentLoaded', function () {
  peliMuista(peliNyt());
  pelivalintaPiirra();
  kielivalintaPiirra();
});
