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

const VALIKKO_OSOITE = './';

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

/* Paluu sivustolle. pizzalove.fi:ssä (ja github.io-testiosoitteessa) peli on
 * kansiossa /pizzaparty/, ja sivut ovat kielikansioissa: ../fi/, ../sv/ …
 * Varainhankintasivustolla paluu vie sen etusivulle. */
function sivustonOsoite() {
  if (/(^|\.)merkitysten\.fi$/.test(location.hostname)) return '/';
  return '../' + (typeof KIELI === 'string' ? KIELI : 'fi') + '/';
}

function valikkoKytke() {
  ['valikkoSivustolle', 'asSivustolle'].forEach(function (id) {
    const a = valikkoEl(id);
    if (a) a.href = sivustonOsoite();
  });
  valikkoEl('valikkoPelaa').addEventListener('click', function () { valikkoEl('valikkoPeite').hidden = true; });
  valikkoEl('valikkoMoninpeliin').addEventListener('click', function () { valikkoSivu('moninpeli'); });
  valikkoEl('valikkoTakaisin').addEventListener('click', function () { valikkoSivu('paa'); });
  valikkoEl('valikkoPalaa').addEventListener('click', function () { location.assign('./?liity'); });
  valikkoEl('valikkoLuo').addEventListener('click', function () { location.assign('./?liity&luo'); });
  valikkoEl('valikkoLiity').addEventListener('click', function () { location.assign('./?liity&uusi'); });
  valikkoEl('valikkoIsoNaytto').addEventListener('click', function () { location.assign('isanta.html'); });
  /* ⚠️ Esc valikon päällä ei saa päätyä peli.js:lle: se keskeyttäisi
   * lepotilassa odottavan pelin ja avaisi tulosruudun valikon alle.
   * Kaappausvaihe ajetaan ennen peli.js:n kuuntelijaa. */
  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || valikkoEl('valikkoPeite').hidden) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!valikkoEl('valikkoMoninpeli').hidden) valikkoSivu('paa');
  }, true);
}

/* ⚠️ VAHTI, EI TARKISTIN (sama kuin isantaVahti). */
function valikkoVahti() {
  const puuttuu = [];
  ['valikkoPeite', 'valikkoPaa', 'valikkoMoninpeli', 'valikkoPalaa', 'valikkoPelaa', 'valikkoMoninpeliin',
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
