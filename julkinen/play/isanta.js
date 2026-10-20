/* Pizza Party — isännän näyttö (Kahoot-malli)
 *
 * Iso yhteinen ruutu: luo pelin, näyttää koodin ja liittyneet pelaajat,
 * jakaa kierrokset, laskee lähtöä, TARKISTAA VASTAUKSET ja näyttää pisteet.
 *
 * ⚠️ ISÄNTÄ ON TUOMARI, PALVELIN EI (MULTIPLAYER.md 8.4). Jako ja
 * tarkistus ovat kierros.js:ssä, ja niiden kokoaminen palvelinkutsuiksi
 * isannointi.js:ssä — sama koodi kuin pelaavalla isännällä puhelimessa.
 * Tämä tiedosto piirtää.
 *
 * ⚠️ AIKA LUETAAN PALVELIMEN KELLOSTA, EI TÄMÄN LAITTEEN (8.2). Kello ja
 * palvelinkutsut ovat yhteys.js:ssä — samat kuin pelaajan laitteella.
 *
 * ⚠️ PIIRTO LASKEE TILAN KELLOSTA JOKA KERTA, EI LASKE TIKKEJÄ. Selain voi
 * kuristaa ajastimia (8.12: pyydetty 100 ms laukesi 900 ms myöhässä),
 * joten «kymmenen tikkiä = sekunti» olisi väärin juuri silloin kun sillä
 * on väliä.
 *
 * ⚠️ NIMIMERKIT PIIRRETÄÄN AINA textContentilla. Ne ovat pelaajien
 * kirjoittamia, ja innerHTML niillä olisi skriptiaukko isolle ruudulle.
 */

const ISANTA_ISTUNTOAVAIN = 'pizzaparty-isanta-huone';
/* ⚠️ Sama avain kuin peli.js:n ASETUSAVAIN. Tästä luetaan VAIN kieli, jotta
 * isännän näyttö puhuu samaa kieltä kuin peli tällä laitteella. peli.js:ää
 * ei ladata tälle sivulle, joten vakiota ei voi jakaa. */
const PELIN_ASETUSAVAIN = 'pizzapeli-asetukset';
const KYSELYVALI_MS = 1000;
const PIIRTOVALI_MS = 100;
const NAKYMAT = ['nAsetukset', 'nAula', 'nKierros', 'nTulos', 'nLoppu'];

/* Isännän tila (isannointi.js) + tämän näytön omat kentät. */
const isanta = Object.assign(isannointiUusi(), {
  asetukset: isannointiOletukset(),   // lomakkeen arvot
  poytaPiirretty: null,
  kysely: null,
  piirto: null,
  kyselyKesken: false,
  kyselyVirheita: 0,       // peräkkäiset epäonnistuneet kyselyt
  aulaAvain: '',
});

function $(id) { return document.getElementById(id); }

function lisaa(vanhempi, tagi, luokka, teksti) {
  const el = document.createElement(tagi);
  if (luokka) el.className = luokka;
  el.textContent = teksti;
  vanhempi.appendChild(el);
  return el;
}

/* ---------- palvelin ja kello: yhteys.js ---------- */
function tunnus() { return isannointiTunnus(isanta); }

function naytaYhteysvirhe(teksti) {
  const el = $('yhteysVirhe');
  el.textContent = teksti;
  el.hidden = false;
}

function piilotaYhteysvirhe() { $('yhteysVirhe').hidden = true; }

/* ---------- asetukset ---------- */
function lataaAsetukset() {
  try {
    const g = JSON.parse(localStorage.getItem(PELIN_ASETUSAVAIN) || 'null');
    if (g && KIELET[g.kieli] && KIELET[g.kieli].valmis) KIELI = g.kieli;
  } catch (e) { /* ei tallennettua kieltä */ }
  isanta.asetukset = isannointiLataaAsetukset();
}

function merkitseValinta(ryhmaId, arvo) {
  [].forEach.call($(ryhmaId).querySelectorAll('button[data-arvo]'), function (b) {
    const valittu = b.dataset.arvo === arvo;
    b.classList.toggle('valittu', valittu);
    b.setAttribute('aria-pressed', valittu ? 'true' : 'false');
  });
}

function piirraAsetukset() {
  const s = isanta.asetukset;
  merkitseValinta('valKierroksia', String(s.kierroksia));
  merkitseValinta('valTapa', s.vaikea ? 'vaikea' : 'helppo');
  $('aikaArvo').textContent = t('aika.sekuntia', { n: s.aikaMs / 1000 });
  $('aikaMiinus').disabled = s.aikaMs <= ISANNOINTI_AIKA_ALIN_MS;
  $('aikaPlus').disabled = s.aikaMs >= ISANNOINTI_AIKA_YLIN_MS;
  $('odotaKaikkia').checked = s.odotaKaikkia;
  [].forEach.call($('luvat').querySelectorAll('input[data-lupa]'), function (n) {
    n.checked = !!s.sallitut[n.dataset.lupa];
  });
}

function asetusMuuttui() {
  isannointiTallennaAsetukset(isanta.asetukset);
  piirraAsetukset();
}

/* ---------- istunto ----------
 * sessionStorage eikä localStorage: isännän sivun uudelleenlataus jatkaa
 * samaa peliä, mutta uusi välilehti ei ota toisen isännän paikkaa. */
function tallennaIstunto() {
  try {
    sessionStorage.setItem(ISANTA_ISTUNTOAVAIN, JSON.stringify({
      koodi: isanta.koodi, avain: isanta.avain, kaytetyt: isanta.kaytetytPizzat,
    }));
  } catch (e) { /* ilman istuntomuistia uudelleenlataus vain aloittaa alusta */ }
}

function unohdaPeli() {
  lopetaKysely();
  lopetaPiirto();
  isannointiNollaa(isanta);
  try { sessionStorage.removeItem(ISANTA_ISTUNTOAVAIN); } catch (e) { /* ei istuntomuistia */ }
}

function peliKatosi() {
  unohdaPeli();
  naytaNakyma('nAsetukset');
  const el = $('asetusVirhe');
  el.textContent = t('isanta.peliPoistui');
  el.hidden = false;
}

function naytaNakyma(id) {
  NAKYMAT.forEach(function (n) { $(n).hidden = n !== id; });
}

/* ---------- kysely ---------- */
function aloitaKysely() {
  lopetaKysely();
  kysy();
  isanta.kysely = setInterval(kysy, KYSELYVALI_MS);
}

function lopetaKysely() {
  if (isanta.kysely) clearInterval(isanta.kysely);
  isanta.kysely = null;
}

async function kysy() {
  if (isanta.kyselyKesken || !isanta.koodi) return;
  isanta.kyselyKesken = true;
  /* ⚠️ KILPAILUTILANNE: vastaus voi koskea peliä jota tällä ruudulla ei enää
   * ole. Mitattu 11.9.2026: isäntä painoi Lopeta, kysely oli jo matkalla,
   * sai 404:n poistetusta huoneesta — ja asetusruudulle jäi punainen
   * «Peli on päättynyt tai vanhentunut». Isäntä, joka näkee virheen omasta
   * lopetuksestaan, oppii ohittamaan virheet. Siksi vastaus ohitetaan jos
   * peli vaihtui pyynnön aikana. */
  const koodi = isanta.koodi;
  try {
    const j = await api('tila', tunnus());
    if (isanta.koodi !== koodi) return;
    isanta.tila = j.tila;
    isanta.kyselyVirheita = 0;
    piilotaYhteysvirhe();
    if (!$('nAula').hidden) piirraAula();
  } catch (e) {
    if (isanta.koodi !== koodi) return;
    if (e.virhe === 'eiHuonetta' || e.virhe === 'eiOikeutta') return void peliKatosi();
    /* Yksi ohi mennyt kysely ei ole katkennut yhteys (YHTEYS_VIRHERAJA). */
    isanta.kyselyVirheita++;
    if (isanta.kyselyVirheita >= YHTEYS_VIRHERAJA) naytaYhteysvirhe(virheTeksti(e));
  } finally {
    isanta.kyselyKesken = false;
  }
}

/* ---------- 1 · luo ---------- */
async function luoPeli() {
  const nappi = $('luoPeli');
  nappi.disabled = true;
  $('asetusVirhe').hidden = true;
  try {
    await isannointiLuo(isanta, isanta.asetukset);
    tallennaIstunto();
    naytaAula();
    aloitaKysely();
  } catch (e) {
    const el = $('asetusVirhe');
    el.textContent = virheTeksti(e);
    el.hidden = false;
  } finally {
    nappi.disabled = false;
  }
}

/* ---------- 2 · aula ---------- */
function naytaAula() {
  isanta.aulaAvain = '';
  piirraAula();
  naytaNakyma('nAula');
}

function piirraAula() {
  const pelaajat = isanta.tila ? isanta.tila.pelaajat : [];
  $('koodi').textContent = isanta.koodi || '';
  isannointiKirjoitaOsoite($('osoite'));
  isannointiPiirraQr($('qr'), isanta.koodi);
  $('aulaMaara').textContent = t('isanta.pelaajia', { n: pelaajat.length });
  $('aloitaPeli').disabled = pelaajat.length === 0;
  /* Lista rakennetaan vain kun joukko muuttui: kerran sekunnissa
   * uusiksi piirretty lista nykisi silmissä. */
  const avain = pelaajat.map(function (p) { return p.id; }).join(',');
  if (avain === isanta.aulaAvain) return;
  isanta.aulaAvain = avain;
  const lista = $('aulaPelaajat');
  lista.textContent = '';
  pelaajat.forEach(function (p) { lisaa(lista, 'span', 'isanta-pelaaja', p.nimi); });
}

/* ---------- 3 · kierros ---------- */
async function aloitaSeuraavaKierros() {
  const napit = [$('aloitaPeli'), $('seuraava')];
  napit.forEach(function (b) { b.disabled = true; });
  try {
    await isannointiAloitaKierros(isanta);
    tallennaIstunto();
    piilotaYhteysvirhe();
    naytaKierros();
  } catch (e) {
    if (e.virhe === 'eiHuonetta') { peliKatosi(); return; }
    naytaYhteysvirhe(virheTeksti(e));
  } finally {
    napit.forEach(function (b) { b.disabled = false; });
    $('aloitaPeli').disabled = !(isanta.tila && isanta.tila.pelaajat.length);
  }
}

function naytaKierros() {
  const k = isanta.kierros;
  isanta.poytaPiirretty = null;
  $('poyta').hidden = true;
  $('lahtolaskenta').hidden = false;
  $('kierrosNro').textContent = t('isanta.kierrosNro', { n: k.n, kaikki: isanta.peli.kierroksia });
  $('kierrosKoodi').textContent = isanta.koodi;
  $('kello').hidden = k.loppuu === null;
  $('kelloPalkki').style.transform = 'scaleX(1)';
  naytaNakyma('nKierros');
  aloitaPiirto();
}

function aloitaPiirto() {
  lopetaPiirto();
  piirraKierros();
  isanta.piirto = setInterval(piirraKierros, PIIRTOVALI_MS);
}

function lopetaPiirto() {
  if (isanta.piirto) clearInterval(isanta.piirto);
  isanta.piirto = null;
}

function piirraPoyta(k) {
  const pizza = $('kPizza');
  const kuva = pizza.querySelector('img');
  kuva.src = k.pizza.kuva;
  kuva.alt = t('pizza.alt', { arvo: k.pizza.arvo, maara: k.pizza.tayteMaara });
  pizza.querySelector('.pizza-sydan').hidden = !k.pizza.sydan;
  const kortit = $('kKortit');
  kortit.textContent = '';
  k.kortit.forEach(function (c) {
    const el = document.createElement('div');
    el.className = 'tayte-kortti';
    const img = document.createElement('img');
    img.src = c.kuva;
    img.alt = c.fantasia ? t('fantasia.nimi') : t('tayte.alt', { nimi: t('tayte.' + c.arvo), arvo: c.arvo });
    el.appendChild(img);
    kortit.appendChild(el);
  });
}

function piirraKierros() {
  const k = isanta.kierros;
  if (!k) return;
  const nytP = palvelinAika();
  const s = isanta.tila;
  const pelaajia = s ? s.pelaajat.length : 0;
  $('vastanneet').textContent = t('isanta.vastanneet', { n: isannointiVastanneita(isanta), kaikki: pelaajia });

  if (nytP < k.t0) {
    $('lahtolaskenta').textContent = String(Math.ceil((k.t0 - nytP) / 1000));
    $('lahtolaskenta').hidden = false;
    $('poyta').hidden = true;
    $('aikaJaljella').textContent = '';
    return;
  }
  if (isanta.poytaPiirretty !== k.n) {
    piirraPoyta(k);
    isanta.poytaPiirretty = k.n;
  }
  $('lahtolaskenta').hidden = true;
  $('poyta').hidden = false;
  if (k.loppuu === null) {
    $('aikaJaljella').textContent = t('isanta.odotetaan');
  } else {
    const jaljella = Math.max(0, k.loppuu - nytP);
    $('kelloPalkki').style.transform = 'scaleX(' + (jaljella / isanta.peli.aikaMs).toFixed(4) + ')';
    $('aikaJaljella').textContent = t('aika.sekuntia', { n: Math.ceil(jaljella / 1000) });
  }
  if (isannointiPitaaPaattaa(isanta, nytP)) paataKierros();
}

async function paataKierros() {
  if (!isanta.kierros || isanta.paatetaan) return;
  $('lopetaKierros').disabled = true;
  try {
    const r = await isannointiPaataKierros(isanta);
    if (!r) return;
    piilotaYhteysvirhe();
    naytaTulos(r.kierros, r.rivit, r.vastaukset, r.tila);
  } catch (e) {
    if (e.virhe === 'eiHuonetta') { peliKatosi(); return; }
    naytaYhteysvirhe(virheTeksti(e));
  } finally {
    $('lopetaKierros').disabled = false;
  }
}

/* ---------- 4 · tulos ---------- */
function sekunnit(ms) {
  return (ms / 1000).toLocaleString(KIELI, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function syyTeksti(syy) {
  if (syy === 'eiVastannut') return t('isanta.eiVastannut');
  if (syy === 'myohassa') return t('isanta.myohassa');
  if (syy === 'ohitti') return t('isanta.ohitti');
  return t('isanta.vaarin');
}

/* Tasapisteet jakavat sijan: 1, 2, 2, 4. Sääntö on kierros.js:ssä, koska
 * pelaajan puhelin näyttää saman taulun. */
function piirraPistelista(ol, pelaajat, alkaen, enintaan) {
  ol.textContent = '';
  kierrosJarjestys(pelaajat, KIELI).slice(alkaen, alkaen + enintaan).forEach(function (p) {
    const li = document.createElement('li');
    lisaa(li, 'span', 'isanta-sija', p.sija + '.');
    lisaa(li, 'span', 'isanta-nimi', p.nimi);
    lisaa(li, 'span', 'isanta-pisteet', String(p.pisteet));
    ol.appendChild(li);
  });
}

function naytaTulos(k, rivit, vastaukset, tila) {
  lopetaPiirto();
  const nimet = {};
  tila.pelaajat.forEach(function (p) { nimet[p.id] = p.nimi; });
  $('tulosOtsikko').textContent = t('isanta.kierrosNro', { n: k.n, kaikki: isanta.peli.kierroksia });
  $('esimerkki').textContent = k.esimerkki
    ? t('isanta.esimerkki', { lauseke: k.esimerkki, arvo: k.pizza.arvo }) : '';

  const lista = $('kierrosRivit');
  lista.textContent = '';
  rivit.slice().sort(function (a, b) {
    if (b.pisteet !== a.pisteet) return b.pisteet - a.pisteet;
    return (a.t === null ? Infinity : a.t) - (b.t === null ? Infinity : b.t);
  }).forEach(function (r) {
    const li = document.createElement('li');
    li.className = r.oikein ? 'oikein' : 'vaarin';
    lisaa(li, 'span', 'isanta-nimi', nimet[r.id] || '?');
    lisaa(li, 'span', 'isanta-merkki', r.oikein ? '✓' : '✗');
    /* ⚠️ Lauseke näytetään vain OIKEASTA vastauksesta. Väärä lasku isolla
     * ruudulla koko luokan edessä nolaisi — se kertoisi kenen virhe oli. */
    const v = vastaukset[r.id];
    lisaa(li, 'span', 'isanta-lauseke', r.oikein && v ? kierrosLauseke(v.vastaus) : syyTeksti(r.syy));
    lisaa(li, 'span', 'isanta-vastausaika', r.t === null ? '' : t('isanta.vastausaika', { s: sekunnit(r.t) }));
    lisaa(li, 'span', 'isanta-pisteet', r.oikein ? '+' + r.pisteet : '');
    lista.appendChild(li);
  });

  piirraPistelista($('kokonaisRivit'), tila.pelaajat, 0, 10);
  $('seuraava').textContent = t(isannointiViimeinen(isanta) ? 'isanta.lopputulokseen' : 'isanta.seuraava');
  naytaNakyma('nTulos');
}

function seuraavaTaiLoppu() {
  if (isannointiViimeinen(isanta)) paataPeli();
  else aloitaSeuraavaKierros();
}

/* ---------- 5 · loppu ---------- */
async function paataPeli() {
  $('seuraava').disabled = true;
  try {
    naytaLoppu(await isannointiPaataPeli(isanta));
  } catch (e) {
    if (e.virhe === 'eiHuonetta') { peliKatosi(); return; }
    naytaYhteysvirhe(virheTeksti(e));
  } finally {
    $('seuraava').disabled = false;
  }
}

function naytaLoppu(tila) {
  lopetaPiirto();
  const podium = $('podium');
  podium.textContent = '';
  kierrosJarjestys(tila.pelaajat, KIELI).slice(0, 3).forEach(function (p, i) {
    const li = document.createElement('li');
    li.className = 'sija-' + (i + 1);
    lisaa(li, 'span', 'isanta-nimi', p.nimi);
    lisaa(li, 'span', 'isanta-pisteet', String(p.pisteet));
    podium.appendChild(li);
  });
  piirraPistelista($('loppuRivit'), tila.pelaajat, 3, 40);
  naytaNakyma('nLoppu');
}

async function pelaaUudelleen() {
  try {
    await isannointiUudelleen(isanta);
    tallennaIstunto();
    naytaAula();
  } catch (e) {
    if (e.virhe === 'eiHuonetta') { peliKatosi(); return; }
    naytaYhteysvirhe(virheTeksti(e));
  }
}

async function lopetaPeli() {
  /* ⚠️ KILPAILUTILANNE: peli unohdetaan ENNEN poistopyyntöä, jotta kysely
   * pysähtyy eikä matkalla oleva kysely tulkitse poistoa katoamiseksi
   * (ks. kysy()). Tunnus otetaan talteen ensin. */
  const poistettava = tunnus();
  unohdaPeli();
  $('asetusVirhe').hidden = true;
  naytaNakyma('nAsetukset');
  await isannointiPoista(poistettava);
}

/* ---------- käynnistys ---------- */
async function jatkaIstuntoa() {
  let tallessa = null;
  try { tallessa = JSON.parse(sessionStorage.getItem(ISANTA_ISTUNTOAVAIN) || 'null'); } catch (e) { tallessa = null; }
  if (!tallessa || !tallessa.koodi || !tallessa.avain) return false;
  let s;
  try {
    s = await isannointiJatka(isanta, tallessa.koodi, tallessa.avain, tallessa.kaytetyt);
  } catch (e) {
    if (e.virhe === 'eiHuonetta' || e.virhe === 'eiOikeutta') { unohdaPeli(); return false; }
    /* Yhteysvirhe: istunto jää talteen seuraavaa latausta varten. */
    naytaYhteysvirhe(virheTeksti(e));
    return false;
  }
  if (s.vaihe === 'kierros' && s.kierros) {
    naytaKierros();
  } else if (s.vaihe === 'tulos' && s.kierros && s.tulos) {
    naytaTulos(s.kierros, s.tulos.rivit, s.vastaukset || {}, s);
  } else if (s.vaihe === 'loppu') {
    naytaLoppu(s);
  } else {
    naytaAula();
  }
  aloitaKysely();
  return true;
}

function kytke() {
  [].forEach.call($('valKierroksia').querySelectorAll('button[data-arvo]'), function (b) {
    b.addEventListener('click', function () {
      isanta.asetukset.kierroksia = Number(b.dataset.arvo);
      asetusMuuttui();
    });
  });
  [].forEach.call($('valTapa').querySelectorAll('button[data-arvo]'), function (b) {
    b.addEventListener('click', function () {
      isanta.asetukset.vaikea = b.dataset.arvo === 'vaikea';
      asetusMuuttui();
    });
  });
  $('aikaMiinus').addEventListener('click', function () {
    isanta.asetukset.aikaMs = isannointiRajaaAika(isanta.asetukset.aikaMs - ISANNOINTI_AIKA_ASKEL_MS);
    asetusMuuttui();
  });
  $('aikaPlus').addEventListener('click', function () {
    isanta.asetukset.aikaMs = isannointiRajaaAika(isanta.asetukset.aikaMs + ISANNOINTI_AIKA_ASKEL_MS);
    asetusMuuttui();
  });
  $('odotaKaikkia').addEventListener('change', function () {
    isanta.asetukset.odotaKaikkia = $('odotaKaikkia').checked;
    asetusMuuttui();
  });
  [].forEach.call($('luvat').querySelectorAll('input[data-lupa]'), function (n) {
    n.addEventListener('change', function () {
      isanta.asetukset.sallitut[n.dataset.lupa] = n.checked;
      asetusMuuttui();
    });
  });
  $('luoPeli').addEventListener('click', luoPeli);
  $('aloitaPeli').addEventListener('click', aloitaSeuraavaKierros);
  $('lopetaKierros').addEventListener('click', paataKierros);
  $('seuraava').addEventListener('click', seuraavaTaiLoppu);
  $('uudelleen').addEventListener('click', pelaaUudelleen);
  [].forEach.call(document.querySelectorAll('.isanta-lopeta'), function (b) {
    isannointiVarmistaEnsin(b, lopetaPeli);
  });
  $('valikkoon').addEventListener('click', valikkoAlkuun);
}

/* ⚠️ VAHTI, EI TARKISTIN. Kuollut nappi ei kaada mitään eikä kirjoita
 * konsoliin (peli.js:n tarkistaKytkennat on syntynyt samasta viasta).
 * Tämä sanoo ääneen jos jokin tunniste tai riippuvuus puuttuu. */
function isantaVahti() {
  const puuttuu = [];
  NAKYMAT.concat([
    'valKierroksia', 'valTapa', 'aikaMiinus', 'aikaPlus', 'aikaArvo', 'odotaKaikkia', 'luvat',
    'luoPeli', 'asetusVirhe', 'osoite', 'qr', 'koodi', 'aulaMaara', 'aulaPelaajat', 'aloitaPeli',
    'kierrosNro', 'vastanneet', 'kierrosKoodi', 'lahtolaskenta', 'poyta', 'kPizza', 'kKortit',
    'kello', 'kelloPalkki', 'aikaJaljella', 'lopetaKierros', 'tulosOtsikko', 'esimerkki',
    'kierrosRivit', 'kokonaisRivit', 'seuraava', 'podium', 'loppuRivit', 'uudelleen',
    'lopetaPeli', 'valikkoon', 'yhteysVirhe',
  ]).forEach(function (id) { if (!$(id)) puuttuu.push('#' + id); });
  ['pizzapakka', 'taytepakka', 'sekoita', 'etsiRatkaisu', 'ratkaisuTekstina', 'laske', 'osuuko',
   'api', 'palvelinAika', 'virheTeksti', 'norsuQrSvg', 'isannointiPiirraQr', 'isannointiKirjoitaOsoite', 'isannointiVarmistaEnsin', 'valikkoAlkuun',
   'isannointiUusi', 'isannointiLuo', 'isannointiJatka', 'isannointiAloitaKierros', 'isannointiPitaaPaattaa',
   'isannointiPaataKierros', 'isannointiPaataPeli', 'isannointiUudelleen', 'isannointiPoista',
   'kierrosJaa', 'kierrosTarkista', 'kierrosPisteet', 'kierrosLauseke', 'kierrosJarjestys', 't', 'kaannaSivu'].forEach(function (f) {
    if (typeof window[f] !== 'function') puuttuu.push(f + '()');
  });
  /* Lopeta peli jokaisessa vaiheessa jossa peli on olemassa. */
  ['nAula', 'nKierros', 'nTulos', 'nLoppu'].forEach(function (n) {
    if ($(n) && !$(n).querySelector('.isanta-lopeta')) puuttuu.push('#' + n + ' .isanta-lopeta');
  });
  if (puuttuu.length) {
    console.error('Pizza Party isäntä ' + new Date().toLocaleTimeString() + ': PUUTTUU → ' + puuttuu.join(', '));
  }
  return puuttuu;
}

async function alusta() {
  lataaAsetukset();
  document.documentElement.lang = KIELI;
  kaannaSivu();
  piirraAsetukset();
  kytke();
  isantaVahti();
  if (!(await jatkaIstuntoa())) naytaNakyma('nAsetukset');
}

alusta();
