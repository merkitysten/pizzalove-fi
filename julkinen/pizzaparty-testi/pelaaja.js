/* Pizza Party — pelaaja omalla laitteellaan (yhteispeli, Kahoot-malli)
 *
 * Aktivoituu vain osoitteessa `?liity` (pelaa.html ohjaa tänne). Ilman sitä
 * tämä tiedosto ei tee mitään, ja yksinpeli toimii kuten ennenkin.
 *
 * ⚠️ SAMA PELINÄKYMÄ KUIN YKSINPELISSÄ. Tämä tiedosto ei piirrä kortteja,
 * laskumerkkejä, sulkeita eikä raahausta — peli.js tekee sen. Erillinen
 * käyttöliittymä olisi toinen paikka jokaiselle korjaukselle, ja se on tämän
 * projektin toistuvin vikaluokka. peli.js:ssä on `tila.verkko`-ehdolla
 * kiinnityskohdat: kaannaKortit, tarkistaLasku, enOsaa, saakoPitaaTauon,
 * lopetaKesken ja laatikkoRivi.
 *
 * ⚠️ KORTIT PALJASTETAAN PALVELIMEN KELLON HETKELLÄ T0 (MULTIPLAYER.md 8.2),
 * ja myöhästyminen ILMOITETAAN palvelimelle (8.12). Taustalle jäänyt selain
 * kuristaa ajastimet; laite tietää oman myöhästymisensä, ja jos se ylittää
 * rajan, kierros ei laske. Pisteet laskee isäntä saapumisajasta (8.3).
 *
 * ⚠️ KOODI JA NIMI TARKISTETAAN PALVELIMELLA, EI TÄÄLLÄ. Kaksi toteutusta
 * samasta säännöstä ajautuisi erilleen.
 *
 * ⚠️ AVAIN LOCALSTORAGEEN EIKÄ SESSIONSTORAGEEN. Puhelin voi hävittää lukitun
 * välilehden, ja uudelleen liittyminen samalla nimellä torjuttaisiin
 * (`nimiVarattu`). Avain on voimassa vain tämän pelin ajan ja poistetaan kun
 * peli päättyy.
 *
 * ⚠️ PELAAVA ISÄNTÄ ON TÄMÄN PÄÄLLÄ, EI RINNALLA (pelaavaisanta.js). Isäntä
 * liittyy omaan peliinsä tavallisena pelaajana ja pelaa tämän tiedoston
 * polulla; `verkkopeli.isanta` kertoo kaksi kohtaa joissa isäntä lisää
 * omansa: napit odotusnäkymään ja pelin unohtaminen.
 *
 * ⚠️ NIMET ALKAVAT `verkko`-ETULIITTEELLÄ: tämä ladataan samalle sivulle kuin
 * peli.js, ja samanniminen ylätason funktio korvaisi toisen hiljaa.
 */

const VERKKO_AVAIN = 'pizzaparty-pelaaja';
const VERKKO_KYSELY_MS = 1000;
/* Kierroksen aikana harvemmin: laite tietää T0:n jälkeen mitä tehdä, ja
 * kysely tarvitaan vain siihen että isännän varhainen lopetus huomataan. */
const VERKKO_KYSELY_KIERROKSELLA_MS = 2000;
/* Kortit tulevat palvelimelta 1,5 s ennen T0:aa (huone.php
 * KORTIT_ENNAKKO_MS). Kysely tihenee siksi aikaa, jotta ne ehtivät. */
const VERKKO_KYSELY_LAHTO_MS = 300;
/* Paljastuksen viimeiset millisekunnit odotetaan tiukassa silmukassa: se
 * osuu ~0,1 ms:n tarkkuudella, setTimeout ei (mitattu, 8.12). */
const VERKKO_HERATYS_MS = 40;
/* Jo alkaneeseen kierrokseen ei tulla mukaan tätä myöhemmin: paljastus
 * olisi myöhässä, eikä kierros laskisi joka tapauksessa. */
const VERKKO_MYOHASTYNYT_LIITTYMINEN_MS = 1000;

const verkkopeli = {
  koodi: null, avain: null, id: null, nimi: null,
  n: 0,               // viimeisin kierros jonka tämä laite otti vastaan
  paljastettu: false,
  myohassa: 0,
  lahetetty: false,   // vastattu, ohitettu, myöhästytty tai aika loppui
  naytetty: null,     // mikä tila on jo piirretty peitteeseen
  kysely: null,
  kyselyKesken: false,
  virheita: 0,        // peräkkäiset epäonnistuneet kyselyt
  tilanne: '',        // viimeksi näytetty odotusteksti (palautetaan yhteyden palattua)
  kierrosTeksti: '',  // «Kierros 3 / 10» — ylapalkkiin ja odotusnäkymään
  laskuri: null,
  kello: null,
  /* Pelaava isäntä: { paivita(), unohda() } kun TÄMÄ laite isännöi, muuten
   * null. Asettaa pelaavaisanta.js. */
  isanta: null,
};

function verkkoTilaan() { return new URLSearchParams(location.search).has('liity'); }
function verkkoEl(id) { return document.getElementById(id); }

function verkkoLisaa(vanhempi, luokka, teksti) {
  const el = document.createElement('div');
  el.className = luokka;
  el.textContent = teksti;
  vanhempi.appendChild(el);
  return el;
}

/* ---------- muisti ---------- */
function verkkoTallenna() {
  try {
    localStorage.setItem(VERKKO_AVAIN, JSON.stringify({
      koodi: verkkopeli.koodi, avain: verkkopeli.avain, id: verkkopeli.id, nimi: verkkopeli.nimi,
    }));
  } catch (e) { /* yksityinen selaus: uudelleenlataus vaatii uuden liittymisen */ }
}

function verkkoUnohda() {
  if (verkkopeli.isanta) verkkopeli.isanta.unohda();
  clearTimeout(verkkopeli.kysely);
  verkkopeli.koodi = null;
  verkkopeli.avain = null;
  verkkopeli.id = null;
  verkkopeli.n = 0;
  verkkopeli.naytetty = null;
  verkkopeli.virheita = 0;
  verkkopeli.kierrosTeksti = '';
  verkkoEl('verkkoPalkki').hidden = true;
  try { localStorage.removeItem(VERKKO_AVAIN); } catch (e) { /* ei muistia */ }
}

/* ---------- peite: liity / odota ---------- */
function verkkoPeite(osa) {
  verkkoEl('verkkoPeite').hidden = osa === null;
  verkkoEl('verkkoLiity').hidden = osa !== 'liity';
  verkkoEl('verkkoLuo').hidden = osa !== 'luo';
  verkkoEl('verkkoOdota').hidden = osa !== 'odota';
}

function verkkoLiityNakyma(virhe) {
  verkkoLopetaPaikallisesti();
  const el = verkkoEl('verkkoVirhe');
  el.textContent = virhe || '';
  el.hidden = !virhe;
  verkkoPeite('liity');
}

function verkkoOdotaNakyma(tilanne) {
  verkkopeli.tilanne = tilanne || '';
  verkkoEl('verkkoNimiNakyy').textContent = verkkopeli.nimi || '';
  verkkoEl('verkkoKierrosRivi').textContent = verkkopeli.kierrosTeksti;
  verkkoEl('verkkoTilanne').textContent = verkkopeli.tilanne;
  verkkoEl('verkkoTulos').textContent = '';
  verkkoEl('verkkoUusi').hidden = true;
  /* Pelaajan poistumistie jokaisessa odotusnäkymässä. Isäntä ei «poistu»:
   * ilman isäntää peli jäisi kaikilta jumiin, joten hänellä on Lopeta peli. */
  const poistu = verkkoEl('verkkoPoistu');
  poistu.hidden = !!verkkopeli.isanta;
  poistu.textContent = t(verkkopeli.koodi ? 'verkko.poistu' : 'valikko.alkuun');
  const taulu = verkkoEl('verkkoTaulu');
  taulu.textContent = '';
  taulu.hidden = true;
  verkkoEl('verkkoPeite').querySelector('.verkko-laatikko').classList.remove('nayta-taulu');
  verkkoPeite('odota');
  if (verkkopeli.isanta) verkkopeli.isanta.paivita();
}

/* Oma sija: 1 + montako on ohittanut. Tasapisteet jakavat sijan. */
function verkkoSija(pelaajat, id) {
  const oma = kierrosJarjestys(pelaajat, KIELI).filter(function (p) { return p.id === id; })[0];
  return oma || null;
}

/* ⚠️ TULOSTAULU KAIKILLE PELAAJILLE ERIEN VÄLISSÄ (Marko 11.9.2026). Sama
 * järjestys kuin isännän näytöllä (kierros.js). Oma rivi korostetaan ja
 * vieritetään näkyviin: 30 pelaajan luokassa oma nimi voi olla lopussa.
 * Nimet textContentilla — ne ovat pelaajien kirjoittamia. */
function verkkoPistetaulu(pelaajat) {
  const lista = verkkoEl('verkkoTaulu');
  lista.textContent = '';
  let oma = null;
  kierrosJarjestys(pelaajat, KIELI).forEach(function (p) {
    const li = document.createElement('li');
    if (p.id === verkkopeli.id) { li.className = 'oma'; oma = li; }
    [['verkko-taulu-sija', p.sija + '.'], ['verkko-taulu-nimi', p.nimi],
     ['verkko-taulu-pisteet', String(p.pisteet)]].forEach(function (osa) {
      const el = document.createElement('span');
      el.className = osa[0];
      el.textContent = osa[1];
      li.appendChild(el);
    });
    lista.appendChild(li);
  });
  lista.hidden = false;
  verkkoEl('verkkoPeite').querySelector('.verkko-laatikko').classList.add('nayta-taulu');
  if (oma) lista.scrollTop = Math.max(0, oma.offsetTop - lista.clientHeight / 2);
}

function verkkoSyy(syy) {
  if (syy === 'eiVastannut') return t('verkko.eiVastannut');
  if (syy === 'myohassa') return t('verkko.myohassa');
  if (syy === 'ohitti') return t('verkko.ohitti');
  return t('verkko.eiOsunut');
}

function verkkoTulosNakyma(s) {
  verkkoLopetaPaikallisesti();
  verkkoOdotaNakyma('');
  const alue = verkkoEl('verkkoTulos');
  const rivi = s.tulos && s.tulos.rivit.filter(function (r) { return r.id === verkkopeli.id; })[0];
  if (rivi) {
    verkkoLisaa(alue, 'verkko-merkki ' + (rivi.oikein ? 'oikein' : 'vaarin'), rivi.oikein ? '✓' : '✗');
    if (rivi.oikein) verkkoLisaa(alue, 'verkko-iso', '+' + rivi.pisteet);
    else verkkoLisaa(alue, 'verkko-selite', verkkoSyy(rivi.syy));
  }
  /* Sija ja kokonaispisteet näkyvät korostetulla omalla rivillä — erillinen
   * «1. / 3 · 986 pistettä» toistaisi saman. */
  verkkoPistetaulu(s.pelaajat);
}

function verkkoLoppuNakyma(s) {
  verkkoLopetaPaikallisesti();
  verkkoOdotaNakyma(t('verkko.lopputulos'));
  const alue = verkkoEl('verkkoTulos');
  const sija = verkkoSija(s.pelaajat, verkkopeli.id);
  if (sija) verkkoLisaa(alue, 'verkko-iso', sija.sija + '.');
  verkkoPistetaulu(s.pelaajat);
}

function verkkoPaattynyt() {
  verkkoLopetaPaikallisesti();
  verkkoUnohda();
  verkkoOdotaNakyma(t('verkko.paattyi'));
  verkkoEl('verkkoUusi').hidden = false;
}

/* ⚠️ POISTUVA PELAAJA POISTETAAN PALVELIMELTA (Marko 11.9.2026). Muuten hän
 * jäisi huoneeseen: «kaikki vastasivat» ei täyttyisi, ja Odota kaikkia
 * -kierros odottaisi häntä. Laite unohtaa pelin ENSIN, jotta matkalla
 * oleva kysely ei tulkitse poistoa katoamiseksi (sama kuvio kuin isännän
 * lopetuksessa, MULTIPLAYER.md 9.3). Enintään 3 s odotus: jumittunut verkko
 * ei saa pitää pelaajaa pelissä jota hän yrittää jättää. */
async function verkkoPoistu() {
  if (verkkopeli.koodi) {
    const tunnus = { koodi: verkkopeli.koodi, avain: verkkopeli.avain };
    verkkoLopetaPaikallisesti();
    verkkoUnohda();
    const odotus = new Promise(function (r) { setTimeout(r, 3000); });
    await Promise.race([api('poistu', tunnus).catch(function () { /* huone vanhenee itsestään */ }), odotus]);
  }
  valikkoAlkuun();
}

/* ---------- kierros ---------- */

/* Pysäyttää kaiken tämän laitteen kierroksesta: kello, lähtölaskenta,
 * pelin ajastimet — ja lukitsee kortit. */
function verkkoLopetaPaikallisesti() {
  clearInterval(verkkopeli.kello);
  clearTimeout(verkkopeli.laskuri);
  verkkoEl('verkkoKello').hidden = true;
  verkkoEl('verkkoLaskuri').hidden = true;
  pysaytaKaikkiAjastimet();
  tila.lukossa = true;
  if (tila.pizza) piirraKaikki();
}

/* Palvelimen kierros peli.js:n tilaksi. Kortit selkäpuoli ylöspäin
 * (lepo), kunnes ne paljastetaan T0:ssa. Apinaa ei ole: taso on
 * harjoittelu, jolla ei ole kerrointa. */
function verkkoValmistele(k, asetukset) {
  pysaytaKaikkiAjastimet();
  tila.verkko.kierros = k;
  tila.taso = TASOT[0];
  tila.apinanTapa = !!asetukset.vaikea;
  tila.sallitut = Object.assign({}, asetukset.sallitut);
  tila.moninpeli = false;
  tila.pelaajia = 1;
  tila.pelaajiaKaynnissa = 1;
  document.getElementById('peliRuutu').classList.remove('moninpeli');
  /* `i` on kortin paikka palvelimen jaossa: vastaus kertoo sen, ja isäntä
   * tarkistaa että kortti on jaettu ja käytetty vain kerran. */
  tila.kasi = k.kortit.map(function (c, i) {
    return { laji: 'tayte', id: 'v' + k.n + '-' + i, i: i,
      arvo: c.fantasia ? null : c.arvo, fantasia: c.fantasia, kuva: c.kuva };
  });
  tila.apinanKasi = [];
  tila.taytteet = [];
  tila.pizzat = [];
  tila.poistetut = [];
  const p = { laji: 'pizza', arvo: k.pizza.arvo, tayteMaara: k.pizza.tayteMaara,
    kuva: k.pizza.kuva, sydan: k.pizza.sydan, pisteet: k.pizza.sydan ? 2 : 1 };
  tila.poydassa = [p];
  tila.pizza = p;
  nollaaValinta();
  tila.vaihe = 'lepo';
  tila.kaannetty = { pizza: false, kasi: false };
  tila.ohitettu = false;
  tila.uudet = [];
  tila.ajat = [];
  tila.vuorossa = null;
  tila.lukitut = [];
  tila.tauko = null;
  tila.kaynnissa = true;
  tila.lukossa = false;
  naytaRuutu('peliRuutu');
  piirraKaikki();
  piirraPisteet();
}

/* Herätään monta kertaa matkalla ja tarkistetaan joka kerta uudelleen —
 * laskenta kellosta, ei tikeistä. ⚠️ Taustalla oleva välilehti myöhästyy
 * silti (mitattu 487–779 ms, 8.12); siksi myöhästyminen mitataan ja
 * ilmoitetaan eikä piiloteta. */
function verkkoAjastaPaljastus(k) {
  clearTimeout(verkkopeli.laskuri);
  const laskuri = verkkoEl('verkkoLaskuri');
  const tarkista = function () {
    if (verkkopeli.n !== k.n || verkkopeli.paljastettu) return;
    const jaljella = k.t0 - palvelinAika();
    if (jaljella <= VERKKO_HERATYS_MS) {
      while (palvelinAika() < k.t0) { /* tiukka odotus */ }
      verkkoPaljasta(k);
      return;
    }
    laskuri.textContent = String(Math.ceil(jaljella / 1000));
    laskuri.hidden = false;
    verkkopeli.laskuri = setTimeout(tarkista, Math.max(0, Math.min(250, jaljella - VERKKO_HERATYS_MS)));
  };
  tarkista();
}

function verkkoPaljasta(k) {
  if (verkkopeli.n !== k.n || verkkopeli.paljastettu) return;
  verkkopeli.myohassa = Math.max(0, Math.round(palvelinAika() - k.t0));
  verkkopeli.paljastettu = true;
  verkkoEl('verkkoLaskuri').hidden = true;
  verkkoPeite(null);
  kaannaKortit('molemmat', true);
  verkkoKello(k);
}

function verkkoKello(k) {
  clearInterval(verkkopeli.kello);
  const kello = verkkoEl('verkkoKello');
  if (k.loppuu === null) { kello.hidden = true; return; }
  kello.hidden = false;
  const kesto = k.loppuu - k.t0;
  const paivita = function () {
    const jaljella = k.loppuu - palvelinAika();
    verkkoEl('verkkoKelloPalkki').style.transform =
      'scaleX(' + Math.max(0, Math.min(1, jaljella / kesto)).toFixed(4) + ')';
    if (jaljella < -k.armoMs && !verkkopeli.lahetetty) verkkoAikaLoppui();
  };
  paivita();
  verkkopeli.kello = setInterval(paivita, 200);
}

function verkkoAikaLoppui() {
  verkkopeli.lahetetty = true;
  verkkoLopetaPaikallisesti();
  verkkoOdotaNakyma(t('verkko.aikaLoppui'));
}

function verkkoKierros(s) {
  const k = s.kierros;
  if (k.n === verkkopeli.n) return;
  if (!k.kortit) return;     // kortit ovat vielä palvelimella (ennakkoikkuna)
  verkkopeli.n = k.n;
  verkkopeli.naytetty = null;
  verkkopeli.paljastettu = false;
  verkkopeli.myohassa = 0;
  verkkopeli.lahetetty = !!(s.oma && s.oma.vastattu);
  if (verkkopeli.lahetetty) {
    verkkoLopetaPaikallisesti();
    verkkoOdotaNakyma(t('verkko.vastattu'));
    return;
  }
  if (palvelinAika() > k.t0 + VERKKO_MYOHASTYNYT_LIITTYMINEN_MS) {
    verkkopeli.lahetetty = true;
    verkkoLopetaPaikallisesti();
    verkkoOdotaNakyma(t('verkko.seuraava'));
    return;
  }
  verkkoValmistele(k, s.asetukset);
  verkkoPeite(null);
  verkkoAjastaPaljastus(k);
}

/* ---------- vastaus: kutsutaan peli.js:stä ---------- */

/* peli.js:n tarkistaLasku on jo todennut laskun oikeaksi. Sama vastaus
 * tarkistetaan vielä kierros.js:llä — sillä säännöllä jolla isäntä sen
 * tarkistaa. Jos ne ovat eri mieltä, se sanotaan ääneen: silloin kaksi
 * sääntöä on ajautunut erilleen. Vastaus lähtee silti; isäntä ratkaisee. */
function verkkoVastaa() {
  const k = tila.verkko.kierros;
  const vastaus = {
    kortit: tila.valitut.map(function (c) { return { i: c.i, arvo: c.arvo }; }),
    merkit: tila.merkit.slice(),
    ryhmat: tila.ryhmat.map(function (r) { return { alku: r.alku, loppu: r.loppu }; }),
  };
  const tarkistus = kierrosTarkista(k, vastaus, tila.sallitut, tila.apinanTapa);
  if (!tarkistus.oikein) {
    console.error('Pizza Party ' + new Date().toLocaleTimeString() +
      ': PELI HYVAKSYI, KIERROS.JS HYLKASI (' + tarkistus.syy + ')', vastaus);
  }
  verkkoLaheta(vastaus);
  return true;
}

function verkkoOhita() {
  tila.ohitettu = true;
  piirraPizza();
  verkkoLaheta(null);
}

async function verkkoLaheta(vastaus) {
  const k = tila.verkko && tila.verkko.kierros;
  if (verkkopeli.lahetetty || !k) return;
  verkkopeli.lahetetty = true;
  tila.lukossa = true;
  piirraKaikki();
  valahda(vastaus ? 'oma' : 'ei-kukaan',
    '<span class="valahdys-merkki">' + (vastaus ? '✓' : '⊘') + '</span>');
  const runko = { koodi: verkkopeli.koodi, avain: verkkopeli.avain, n: k.n,
    vastaus: vastaus, myohassa: verkkopeli.myohassa };
  let tilanne = t('verkko.vastattu');
  /* Yksi uusinta yhteyskatkoksessa. Jos ensimmäinen ehti perille ja vain
   * vastaus katosi, uusinta saa `joVastattu` — ja se on onnistuminen. */
  for (let yritys = 0; yritys < 2; yritys++) {
    try {
      await api('vastaa', runko);
      break;
    } catch (e) {
      if (e.virhe === 'joVastattu') break;
      if (e.virhe === 'aikaLoppui' || e.virhe === 'vaaraKierros') { tilanne = t('verkko.aikaLoppui'); break; }
      if (e.virhe === 'eiHuonetta' || e.virhe === 'eiOikeutta') { verkkoPaattynyt(); return; }
      if (yritys === 1) { tilanne = virheTeksti(e); break; }
      await new Promise(function (r) { setTimeout(r, 400); });
    }
  }
  verkkoLopetaPaikallisesti();
  /* Välähdys näkyy ensin. Jos isäntä ehti jo pisteyttää, tulosta ei
   * kirjoiteta tämän päälle. */
  setTimeout(function () {
    if (verkkopeli.n === k.n && verkkoEl('verkkoPeite').hidden) verkkoOdotaNakyma(tilanne);
  }, 700);
}

/* ---------- kysely ---------- */
function verkkoKyselyvali(s) {
  if (!s || s.vaihe !== 'kierros' || !s.kierros) return VERKKO_KYSELY_MS;
  const k = s.kierros;
  if (!k.kortit || verkkopeli.n !== k.n) return VERKKO_KYSELY_LAHTO_MS;
  if (verkkopeli.paljastettu && !verkkopeli.lahetetty) return VERKKO_KYSELY_KIERROKSELLA_MS;
  return VERKKO_KYSELY_MS;
}

function verkkoAjastaKysely(ms) {
  clearTimeout(verkkopeli.kysely);
  verkkopeli.kysely = setTimeout(verkkoKysy, ms);
}

/* Kierros ja omat pisteet ruudun yläreunaan (Marko 12.9.2026: *"pisteet ja
 * tuo erän eteneminen voisi näkyä ruudun yläreunassa"*). Sama teksti menee
 * odotusnäkymään, jotta erän numero näkyy myös tulosten aikana. */
function verkkoPalkki(s) {
  const k = s.kierros ? s.kierros.n : (s.tulos ? s.tulos.n : 0);
  verkkopeli.kierrosTeksti = k ? t('isanta.kierrosNro', { n: k, kaikki: s.asetukset.kierroksia }) : '';
  verkkoEl('verkkoPalkkiKierros').textContent = verkkopeli.kierrosTeksti;
  verkkoEl('verkkoPalkkiPisteet').textContent = s.oma ? String(s.oma.pisteet) : '';
  verkkoEl('verkkoPalkki').hidden = false;
  if (!verkkoEl('verkkoOdota').hidden) verkkoEl('verkkoKierrosRivi').textContent = verkkopeli.kierrosTeksti;
}

async function verkkoKysy() {
  if (!verkkopeli.koodi || verkkopeli.kyselyKesken) return;
  verkkopeli.kyselyKesken = true;
  /* ⚠️ Vastaus voi koskea peliä josta laite on jo lähtenyt (sama kuvio
   * kuin isännän kysy(), MULTIPLAYER.md 9.3). */
  const koodi = verkkopeli.koodi;
  let seuraava = VERKKO_KYSELY_MS;
  try {
    const j = await api('tila', { koodi: koodi, avain: verkkopeli.avain });
    if (verkkopeli.koodi !== koodi) return;
    /* Yhteys palasi: ilmoitus pois ja odotusteksti takaisin. */
    if (verkkopeli.virheita >= YHTEYS_VIRHERAJA && !verkkoEl('verkkoOdota').hidden) {
      verkkoEl('verkkoTilanne').textContent = verkkopeli.tilanne;
    }
    verkkopeli.virheita = 0;
    verkkoKasitteleTila(j.tila);
    seuraava = verkkoKyselyvali(j.tila);
  } catch (e) {
    if (verkkopeli.koodi !== koodi) return;
    if (e.virhe === 'eiHuonetta' || e.virhe === 'eiOikeutta') { verkkoPaattynyt(); return; }
    verkkopeli.virheita++;
    if (verkkopeli.virheita >= YHTEYS_VIRHERAJA && !verkkoEl('verkkoOdota').hidden) {
      verkkoEl('verkkoTilanne').textContent = virheTeksti(e);
    }
  } finally {
    verkkopeli.kyselyKesken = false;
    if (verkkopeli.koodi === koodi) verkkoAjastaKysely(seuraava);
  }
}

function verkkoKasitteleTila(s) {
  verkkoPalkki(s);
  if (s.oma) {
    verkkopeli.nimi = s.oma.nimi;
    if (tila.omatPisteet !== s.oma.pisteet) {
      tila.omatPisteet = s.oma.pisteet;
      if (tila.pizza) piirraPisteet();
    }
  }
  if (s.vaihe === 'kierros' && s.kierros) { verkkoKierros(s); return; }
  /* Peite piirretään vain kun näytettävä muuttui: kerran sekunnissa
   * uudelleen rakennettu tulos nykisi. */
  const avain = s.vaihe + ':' + (s.tulos ? s.tulos.n : '') + ':' +
    (s.oma ? s.oma.pisteet : '') + ':' + s.pelaajat.length;
  if (avain === verkkopeli.naytetty) return;
  verkkopeli.naytetty = avain;
  if (s.vaihe === 'aula') {
    verkkopeli.n = 0;
    verkkoLopetaPaikallisesti();
    verkkoOdotaNakyma(t('verkko.odota'));
  } else if (s.vaihe === 'tulos') {
    verkkoTulosNakyma(s);
  } else if (s.vaihe === 'loppu') {
    verkkoLoppuNakyma(s);
  }
}

/* ---------- liittyminen ja käynnistys ---------- */

/* Liittymisen vastaus tämän laitteen pelaajaksi. Yksi paikka: myös
 * pelaava isäntä liittyy omaan peliinsä tätä kautta. */
function verkkoOtaPelaaja(koodi, j) {
  verkkopeli.koodi = koodi;
  verkkopeli.avain = j.pelaajaAvain;
  verkkopeli.id = j.pelaajaId;
  verkkopeli.nimi = j.nimi;
  verkkopeli.n = 0;
  verkkopeli.naytetty = null;
  verkkoTallenna();
  verkkoOdotaNakyma(t('verkko.odota'));
  verkkoKasitteleTila(j.tila);
  verkkoAjastaKysely(0);
}

async function verkkoLiity(e) {
  e.preventDefault();
  const nappi = verkkoEl('verkkoLiityNappi');
  nappi.disabled = true;
  verkkoEl('verkkoVirhe').hidden = true;
  const koodi = verkkoEl('verkkoKoodi').value.trim();
  try {
    verkkoOtaPelaaja(koodi, await api('liity', { koodi: koodi, nimi: verkkoEl('verkkoNimi').value }));
  } catch (err) {
    const el = verkkoEl('verkkoVirhe');
    el.textContent = virheTeksti(err);
    el.hidden = false;
  } finally {
    nappi.disabled = false;
  }
}

/* ⚠️ OSOITTEEN KOODI VOITTAA MUISTISSA OLEVAN PELIN (mitattu 11.9.2026).
 * Puhelin joka oli liittynyt peliin 3741 avasi QR-linkin `?koodi=6728` —
 * ja päätyi vanhan pelin «Peli alkaa pian» -ruutuun; uusi koodi jäi
 * piilotettuun kenttään. Vanha peli elää palvelimella kolme tuntia jos
 * isäntä ei lopettanut sitä, joten luokassa tämä olisi tavallista.
 * Muistia EI tyhjennetä: jos pelaaja ei liitykään uuteen, `?liity` ilman
 * koodia palaa yhä vanhaan. Sama koodi osoitteessa jatkaa (uudelleenlataus). */
function verkkoJatka(osoitteenKoodi, eiJatkoa) {
  let tallessa = null;
  try { tallessa = JSON.parse(localStorage.getItem(VERKKO_AVAIN) || 'null'); } catch (e) { tallessa = null; }
  if (!tallessa || !tallessa.koodi || !tallessa.avain) return false;
  if (osoitteenKoodi && osoitteenKoodi !== tallessa.koodi) return false;
  /* Alkuvalikon «Liity peliin» ja «Luo peli» (`?liity&uusi`, `?liity&luo`):
   * käyttäjä valitsi uuden pelin. Kesken oleva jää muistiin — valikko
   * tarjoaa sen erikseen («Palaa peliin»). */
  if (eiJatkoa) return false;
  verkkopeli.koodi = tallessa.koodi;
  verkkopeli.avain = tallessa.avain;
  verkkopeli.id = tallessa.id;
  verkkopeli.nimi = tallessa.nimi;
  verkkoOdotaNakyma(t('verkko.odota'));
  verkkoAjastaKysely(0);
  return true;
}

function verkkoAlusta() {
  if (!verkkoTilaan()) return;
  document.body.classList.add('verkkopeli');
  tila.verkko = { kierros: null };
  pysaytaKaikkiAjastimet();
  verkkoEl('verkkoLiity').addEventListener('submit', verkkoLiity);
  verkkoEl('verkkoUusi').addEventListener('click', function () { verkkoLiityNakyma(''); });
  verkkoEl('verkkoPoistu').addEventListener('click', verkkoPoistu);
  verkkoEl('verkkoLiityTakaisin').addEventListener('click', valikkoAlkuun);
  /* Puhelin herää: tila heti eikä vasta seuraavalla tikillä. */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && verkkopeli.koodi) verkkoAjastaKysely(0);
  });
  const haku = new URLSearchParams(location.search);
  const koodi = haku.get('koodi');
  if (koodi) verkkoEl('verkkoKoodi').value = koodi;
  if (!verkkoJatka(koodi, haku.has('uusi') || haku.has('luo'))) verkkoLiityNakyma('');
}

/* ⚠️ Rekisteröidään peli.js:n jälkeen (skriptijärjestys), joten peli.js:n
 * kytke() on jo ajettu kun tämä käynnistyy. */
document.addEventListener('DOMContentLoaded', verkkoAlusta);
