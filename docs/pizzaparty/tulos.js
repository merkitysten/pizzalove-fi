/* Pizza Love — TULOSRUUTU JA VOITTAJAN JUHLA kaikille pelimuodoille
 * (9.10.2026; syntyi Bassossa 6.–7.10.2026 Markon palautteesta).
 *
 * 🔵 Marko 9.10.2026: «pizza basso on nyt pidemmälle viety tyylien suhteen jos
 * ajatellaan voittoruutuja ja tulosruutuja jne. Eli ota siitä mallia, kun
 * yhtenäistät tyylejä.» Siksi tämä on yksi tiedosto: Party ja Basso antavat
 * rivit, piirto ja juhla ovat tässä. Kaksi kopiota olisi kaksi paikkaa, joihin
 * sama korjaus pitäisi muistaa tehdä.
 *
 * Tyylit: yhteinen.css. Merkintä sivulla: #tulosRuutu (#tulosPisteet,
 * #uudelleen, #asetuksiin) ja #juhla (#juhlaHahmo, #juhlaNimi, #juhlaPisteet,
 * #juhlaMuut). Kytkennät tekee peli.js:n kytke(): napautus kutsuu NIMELLÄ
 * tulosEteenpain() ja juhlaNapautus(), jotka kukin peli määrittelee. */

/* Pallin järjestys ruudulla vasemmalta: 2 · 1 · 3 · 4 (sijaindeksit). */
const PALLIN_JARJESTYS = [1, 0, 2, 3];

/* Sijat pisteiden mukaan; tasapisteet jakavat sijan (Marko 6.10.2026: «nyt
 * 2. ja 3. kilpailija on molemmat 0:ssa pisteessä, joten ne pitäisi olla
 * samalla sijalla»). `rivit` on jo järjestetty parhaasta alkaen. */
function tulosSijat(rivit) {
  let edellinen = null, sija = 0;
  rivit.forEach(function (r, n) {
    if (r.pisteet !== edellinen) { sija = n + 1; edellinen = r.pisteet; }
    r.sija = sija;
  });
  return rivit;
}

/* PALKINTOPALLI. rivi = { sija, vari, nimi (oma nimi tai ''), aria, syo,
 * voitti, ala (Node tai null) }. Askelman päällä hahmo, nimi sen YLÄPUOLELLA
 * (hahmo seisoo askelmalla, eikä nimi saa tulla niiden väliin — Markon
 * kysymys 7.10.2026). Askelman alla pelin oma sisältö (`ala`). */
function tulosPalli(rivit) {
  const palli = document.createElement('div');
  palli.className = 'palli';
  PALLIN_JARJESTYS.filter(function (n) { return n < rivit.length; }).forEach(function (n) {
    const r = rivit[n];
    const paikka = document.createElement('div');
    paikka.className = 'palli-paikka sija-' + Math.min(r.sija, 4) + (r.voitti ? ' voitti' : '');
    const yla = document.createElement('div');
    yla.className = 'palli-yla';
    const hahmo = document.createElement('div');
    hahmo.className = 'palli-hahmo';
    hahmo.innerHTML = (r.nimi ? '<small class="palli-nimi"></small>' : '') +
      (r.syo ? hahmoSyoKuva(r.vari) : hahmoKuva(r.vari));
    /* ⚠️ Nimi textContentilla: se on pelaajan syötettä (verkossa toisen laitteen). */
    if (r.nimi) hahmo.querySelector('.palli-nimi').textContent = r.nimi;
    hahmo.setAttribute('aria-label', r.aria + ': ' + r.sija + '.');
    yla.appendChild(hahmo);
    paikka.appendChild(yla);
    const askel = document.createElement('div');
    askel.className = 'palli-askel';
    askel.innerHTML = '<b>' + r.sija + '</b>';
    paikka.appendChild(askel);
    const ala = document.createElement('div');
    ala.className = 'palli-ala' + (r.voitti ? ' voitti' : '');
    if (r.ala) ala.appendChild(r.ala);
    paikka.appendChild(ala);
    palli.appendChild(paikka);
  });
  return palli;
}

/* VOITTAJAN JUHLA: koko ruutu voittajan värissä, oma hahmo pizza suussa,
 * nimi ja pisteet; muut alla pistejärjestyksessä (Marko 7.10.2026: «Voittaja
 * isoimpana ja tosiaan pizza suussa»). Kruunu ja heiluminen ovat poissa
 * («kruunu on mauton», «heiluu kummallisesti»).
 *   o = { voittajat: [{ vari, nimi }], pisteet, aria,
 *         muut: [{ vari, nimi, pisteet, aria }] }
 * Tasapelissä kärjessä olevat syövät rinnakkain; pinta on ensimmäisen värinen. */
function juhlaAvaa(o) {
  const el = document.getElementById('juhla');
  if (!el || !o.voittajat.length) return;
  const vari = o.voittajat[0].vari;
  el.style.setProperty('--pelaaja-vari', vari);
  el.style.setProperty('--pelaaja-teksti', hahmoTekstiVari(vari));
  const hahmot = document.getElementById('juhlaHahmo');
  hahmot.classList.toggle('monta', o.voittajat.length > 1);
  hahmot.innerHTML = o.voittajat.map(function (v) { return hahmoSyoKuva(v.vari); }).join('');
  document.getElementById('juhlaNimi').textContent = o.voittajat
    .map(function (v) { return v.nimi; }).filter(Boolean).join(' & ');
  document.getElementById('juhlaPisteet').textContent = o.pisteet;
  const muut = document.getElementById('juhlaMuut');
  muut.innerHTML = '';
  o.muut.forEach(function (r, n) {
    const li = document.createElement('li');
    li.style.animationDelay = (0.55 + n * 0.12).toFixed(2) + 's';
    li.innerHTML = hahmoKuva(r.vari) + '<span class="juhla-muu-nimi"></span><b></b>';
    li.querySelector('.juhla-muu-nimi').textContent = r.nimi;
    li.querySelector('b').textContent = r.pisteet;
    li.setAttribute('aria-label', r.aria + ': ' + r.pisteet);
    muut.appendChild(li);
  });
  el.setAttribute('aria-label', o.aria + ': ' + o.pisteet + ' · ' + t('tauko.jatka'));
  el.hidden = false;
  el.classList.remove('nakyy');
  void el.offsetWidth;
  el.classList.add('nakyy');
  juhlaHuuto();
  el.focus();
}
function juhlaKiinni() {
  const el = document.getElementById('juhla');
  if (el) { el.hidden = true; el.classList.remove('nakyy'); }
}
function juhlaAuki() {
  const el = document.getElementById('juhla');
  return !!el && !el.hidden;
}

/* Konfetti täytteiden väreillä, kun ihminen voitti. Kerran, kevyesti.
 * Liikettä vähentävä asetus → ei konfettia lainkaan. */
function juhlaKonfetti() {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ruutu = document.getElementById('tulosRuutu');
  const vanha = ruutu.querySelector('.konfetti');
  if (vanha) vanha.remove();
  const kerros = document.createElement('div');
  kerros.className = 'konfetti';
  kerros.setAttribute('aria-hidden', 'true');
  const varit = TAYTTEET.map(function (x) { return x.vari; });
  for (let i = 0; i < 46; i++) {
    const s = document.createElement('span');
    s.style.left = (Math.random() * 100).toFixed(1) + '%';
    s.style.background = varit[i % varit.length];
    s.style.animationDelay = (Math.random() * 0.9).toFixed(2) + 's';
    s.style.animationDuration = (2.2 + Math.random() * 1.4).toFixed(2) + 's';
    s.style.setProperty('--kierto', (Math.random() * 720 - 360).toFixed(0) + 'deg');
    s.style.setProperty('--sivu', (Math.random() * 120 - 60).toFixed(0) + 'px');
    kerros.appendChild(s);
  }
  ruutu.appendChild(kerros);
  setTimeout(function () { kerros.remove(); }, 4000);
}

/* Huuto syntetisoidaan: pelissä ei ole äänitiedostoja, eikä yhden huudon
 * takia kannata lisätä ladattavaa. Kolme nousevaa säveltä, lyhyt.
 * ⚠️ Selain sallii äänen vasta käyttäjän eleen jälkeen — tässä vaiheessa
 * pelaaja on jo napauttanut, joten konteksti saa käynnistyä. */
let juhlaAani = null;
function juhlaHuuto() {
  try {
    const Konteksti = window.AudioContext || window.webkitAudioContext;
    if (!Konteksti) return;
    if (!juhlaAani) juhlaAani = new Konteksti();
    if (juhlaAani.state === 'suspended') juhlaAani.resume();
    const nyt = juhlaAani.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach(function (hz, i) {
      const o = juhlaAani.createOscillator(), g = juhlaAani.createGain();
      o.type = 'triangle';
      o.frequency.value = hz;
      const alku = nyt + i * 0.11, loppu = alku + (i === 3 ? 0.42 : 0.14);
      g.gain.setValueAtTime(0.0001, alku);
      g.gain.exponentialRampToValueAtTime(0.22, alku + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, loppu);
      o.connect(g); g.connect(juhlaAani.destination);
      o.start(alku); o.stop(loppu + 0.02);
    });
  } catch (e) { /* ääni on lisä, ei ehto */ }
}
