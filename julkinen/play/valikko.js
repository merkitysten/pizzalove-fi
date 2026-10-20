/* Pizza Party — alkuvalikko ja paluu siihen
 *
 * Marko 11.9.2026: *"yksi linkki pizzaparty-peliin, josta voisi sitten
 * pelata yksinpeliä tai moninpeliä ja moninpelissä valita, että joko on
 * isäntä tai liittyy toisen peliin. Pelissä on myös monta sellaista
 * umpikujaa, ettei pääse pois."*
 *
 * ⚠️ VALIKKO VAIHTAA OSOITETTA, EI TILAA. Yhteispeli käynnistyy vain
 * osoitteessa `?liity` (pelaaja.js), ja paluu valikkoon on sivunvaihto
 * osoitteeseen `./`. Tilasta toiseen siirtyminen samalla sivulla vaatisi
 * että jokainen ajastin, kysely ja peite purettaisiin käsin — ja yksi
 * unohtunut olisi uusi umpikuja. Sivunvaihto purkaa kaiken.
 *
 * ⚠️ VALIKON ALLA PELI ON LEPOTILASSA (peli.js aloitaPeli): kortit
 * selkäpuoli ylöspäin, ei ajastimia. «Pelaa» vain sulkee valikon.
 *
 * Ladataan index.html:lle ja isanta.html:lle. Isolla näytöllä valikkoa ei
 * ole; sieltä käytetään vain valikkoAlkuun().
 */

/* ⚠️ `party.html` EIKÄ `./` (20.10.2026): `./` on nyt ETUOVI (pelin valinta).
 * «Alkuvalikkoon» Partyn sisältä tarkoittaa Partyn omaa aloitusruutua, ei
 * pelin valintaa - muuten pelistä poistuminen veisi väärään paikkaan. */
const VALIKKO_OSOITE = 'party.html';

/* Sivunvaihto siirtymän kanssa (siirtyma.js, Marko 20.10.2026): peite jää
 * päälle kunnes uusi sivu korvaa sen, eli lataus ei välähdä valkoisena.
 * ⚠️ `typeof`-vartiointi: navigointi ei saa jäädä tekemättä jos siirtymää ei
 * jostain syystä ole ladattu. */
function valikkoSiirry(osoite) {
  if (typeof siirtymaNayta === 'function') siirtymaNayta();
  location.assign(osoite);
}
/* 🔴 JOKAINEN NÄISTÄ OSOITTI ENNEN `./`:ään, JA SE JÄI LOOPPIIN (Marko
 * 20.10.2026: «Luo pelin jälkeen tulee valinta, jossa pitää valita peli —
 * — itseasiassa se jää looppiin jumiin eikä ikinä päästä oikeasti luomaan
 * peliä»). Kun `./` muuttui etuoveksi, «Luo peli» vei osoitteeseen
 * `./?liity&luo` eli ETUOVELLE - ja koska parametreja oli, muistava ohjaus
 * ei lauennut vaan näytti pelin valinnan. Valinta vei `party.html`:ään
 * ILMAN `?liity&luo`a, siis aloitusruutuun, josta «Luo peli» aloitti
 * kierroksen alusta.
 * ⚠️ Ja juuri siksi nämä käyttävät nyt `VALIKKO_OSOITE`-vakiota eivätkä
 * omia merkkijonojaan: neljä kopiota samasta osoitteesta tarkoitti että
 * yhden muuttaminen jätti kolme muuta osoittamaan vanhaan paikkaan. */

function valikkoAlkuun() { location.assign(VALIKKO_OSOITE); }

function valikkoEl(id) { return document.getElementById(id); }

function valikkoSivu(nimi) {
  valikkoEl('valikkoPaa').hidden = nimi !== 'paa';
  valikkoEl('valikkoMoninpeli').hidden = nimi !== 'moninpeli';
}

/* Kesken oleva yhteispeli tällä laitteella (pelaaja.js:n muisti). Peli voi
 * olla jo päättynyt palvelimella — silloin «Palaa peliin» näyttää sen, ja
 * sieltä pääsee takaisin. Muistia ei tulkita tässä toista kertaa. */
function valikkoKeskenOleva() {
  try {
    const m = JSON.parse(localStorage.getItem(VERKKO_AVAIN) || 'null');
    return (m && m.koodi && m.avain) ? m.koodi : null;
  } catch (e) { return null; }
}

function valikkoNayta() {
  const kesken = valikkoKeskenOleva();
  const palaa = valikkoEl('valikkoPalaa');
  palaa.hidden = !kesken;
  if (kesken) palaa.textContent = t('valikko.palaa', { koodi: kesken });
  valikkoSivu('paa');
  valikkoEl('valikkoPeite').hidden = false;
}

/* Paluu sivustolle: pelivalinta.js asettaa jokaisen [data-sivustolle]-linkin
 * osoitteen (sivustonOsoite), koska Bassokin tarvitsee sen. */

function valikkoKytke() {
  /* ⚠️ ENSIMMÄISELLÄ KERRALLA TARJOTAAN OPASTUSTA (Marko 20.10.2026). Opastus
     ei ole enää valikon rivi; se tarjoutuu tässä ja asuu sen jälkeen
     asetuksissa. `opetusTarjoa` kutsuu takaisinkutsun vain jos pelaaja ohittaa
     tai on jo opastettu - opastuksen valinnut käynnistää pelin sen kautta. */
  valikkoEl('alkuPelaa').addEventListener('click', function () {
    /* Välähdys peittää valikon ja pelin välisen vaihdon (siirtyma.js). Se on
       TARJOUKSEN JÄLKEEN eikä ennen: ensikertalaiselle avautuu opastuskortti,
       eikä sen eteen kuulu peitettä. */
    const jatka = function () {
      valikkoEl('valikkoPeite').hidden = true;
      if (typeof siirtymaValahda === 'function') siirtymaValahda();
    };
    if (typeof opetusTarjoa === 'function') opetusTarjoa(jatka); else jatka();
  });
  valikkoEl('alkuMoninpeli').addEventListener('click', function () { valikkoSivu('moninpeli'); });
  /* Oikotie suoraan koodinsyöttöön (Marko 20.10.2026). Sama osoite kuin
     «Omilla laitteilla» › «Liity peliin», jotta reittejä ei ole kahta. */
  valikkoEl('alkuLiity').addEventListener('click', function () { valikkoSiirry(VALIKKO_OSOITE + '?liity&uusi'); });
  valikkoEl('valikkoTakaisin').addEventListener('click', function () { valikkoSivu('paa'); });
  valikkoEl('valikkoPalaa').addEventListener('click', function () { location.assign(VALIKKO_OSOITE + '?liity'); });
  valikkoEl('valikkoLuo').addEventListener('click', function () { valikkoSiirry(VALIKKO_OSOITE + '?liity&luo'); });
  valikkoEl('valikkoLiity').addEventListener('click', function () { valikkoSiirry(VALIKKO_OSOITE + '?liity&uusi'); });
  valikkoEl('valikkoIsoNaytto').addEventListener('click', function () { valikkoSiirry('isanta.html'); });
  /* ⚠️ Esc valikon päällä ei saa päätyä peli.js:lle: se keskeyttäisi
   * lepotilassa odottavan pelin ja avaisi tulosruudun valikon alle.
   * Kaappausvaihe ajetaan ennen peli.js:n kuuntelijaa. */
  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || valikkoEl('valikkoPeite').hidden) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    /* Avoin kielilista (pelivalinta.js) sulkeutuu ensin: sen oma kuuntelija ei saa Esciä. */
    const kielet = document.querySelector('.alku-kielet details[open]');
    if (kielet) { kielet.open = false; return; }
    if (!valikkoEl('valikkoMoninpeli').hidden) valikkoSivu('paa');
  }, true);
}

/* ⚠️ VAHTI, EI TARKISTIN (sama kuin isantaVahti). */
function valikkoVahti() {
  const puuttuu = [];
  ['valikkoPeite', 'valikkoPaa', 'valikkoMoninpeli', 'valikkoPalaa', 'alkuPelaa', 'alkuMoninpeli', 'alkuLiity',
   'valikkoLuo', 'valikkoLiity', 'valikkoIsoNaytto', 'valikkoTakaisin', 'taukoValikkoon', 'tulosValikkoon']
    .forEach(function (id) { if (!valikkoEl(id)) puuttuu.push('#' + id); });
  ['t', 'verkkoTilaan'].forEach(function (f) { if (typeof window[f] !== 'function') puuttuu.push(f + '()'); });
  if (typeof VERKKO_AVAIN !== 'string') puuttuu.push('VERKKO_AVAIN');
  if (puuttuu.length) {
    console.error('Pizza Party valikko ' + new Date().toLocaleTimeString() + ': PUUTTUU → ' + puuttuu.join(', '));
  }
  return puuttuu;
}

function valikkoAlusta() {
  /* isanta.html: ei valikkoa, vain valikkoAlkuun(). */
  if (!valikkoEl('valikkoPeite')) return;
  valikkoVahti();
  /* Yksinpelin poistumistiet: tauko ja tulosruutu. */
  valikkoEl('taukoValikkoon').addEventListener('click', valikkoAlkuun);
  valikkoEl('tulosValikkoon').addEventListener('click', valikkoAlkuun);
  if (verkkoTilaan()) return;
  valikkoKytke();
  valikkoNayta();
}

/* ⚠️ Rekisteröidään peli.js:n JÄLKEEN: peli.js:n tarkistaKytkennat mittaa
 * latauksessa mikä peittää napit, ja näkyvä valikko olisi väärä hälytys. */
document.addEventListener('DOMContentLoaded', valikkoAlusta);
