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
/* ⚠️ LAJI ON OMA TASONSA, EI NELJÄS RIVI LISTASSA (Marko 14.10.2026: «pitää
   olla erikseen valinta korttipelin ja lautapelin välillä»).

   Korttipelin muodot ovat saman pakan eri säännöstöjä; lautapeli on eri peli
   eri välineillä. Tasalistassa ne näyttäisivät vertailukelpoisilta, ja
   valinta «Pizza Basso vai Apinavaaka» on kysymys jota kukaan ei esitä.

   ⚠️ LAUTAPELIN PELIMUODOT EIVÄT OLE TÄÄLLÄ. Apinavaaan kolme muotoa
   (Apinavaaka tutuksi · Nälkäiset apinat · Auta Bassoa) valitaan sen omasta
   valikosta, koska ne eivät ole sivuja vaan saman sivun tiloja. Tämä
   valitsin vaihtaa PELIN (sivunvaihto), ei muotoa. */
/* ⚠️ LAJIN NIMI ON SUOMEA EIKÄ TUOTENIMI, JOTEN SE KÄÄNTYY (14.10.2026).
   «Pizza Party» ei käänny, «Korttipeli» kääntyy — siksi laji kantaa
   käännösavainta ja peli merkkijonoa. */
const LAJIT = [
  { avain: 'kortti', ta: 'peli.kortti' },
  { avain: 'lauta',  ta: 'peli.lauta' },
];
const PELIT = [
  { avain: 'party',      sivu: './',              nimi: 'Pizza Party',  laji: 'kortti' },
  { avain: 'basso',      sivu: 'basso.html',      nimi: 'Pizza Basso',  laji: 'kortti' },
  { avain: 'apinavaaka', sivu: 'apinavaaka.html', nimi: 'Apinavaaka',   laji: 'lauta'  },
];

function peliNyt() {
  return document.documentElement.dataset.peli || 'party';
}

function peliMuista(avain) {
  const peli = PELIT.filter(function (p) { return p.avain === avain; })[0];
  try {
    localStorage.setItem(PELIVALINTA_AVAIN, avain);
    /* ⚠️ LAJIKOHTAINEN MUISTI ON ERI ASIA KUIN VIIMEKSI PELATTU. «Korttipeli»
       vie siihen korttipeliin jota pelasit — ilman tätä se veisi aina
       Pizza Partyyn, ja Basson pelaaja menettäisi valintansa joka kerta. */
    if (peli) localStorage.setItem(PELIVALINTA_AVAIN + '-' + peli.laji, avain);
  } catch (e) { /* yksityinen selaus */ }
}

function lajiNyt() {
  const peli = PELIT.filter(function (p) { return p.avain === peliNyt(); })[0];
  return peli ? peli.laji : LAJIT[0].avain;
}

function lajiAvain(laji) {
  const l = LAJIT.filter(function (x) { return x.avain === laji; })[0];
  return l ? l.ta : 'peli.valitse';
}

function lajinPeli(laji) {
  const pelit = PELIT.filter(function (p) { return p.laji === laji; });
  let muistettu = null;
  try { muistettu = localStorage.getItem(PELIVALINTA_AVAIN + '-' + laji); } catch (e) { /* yksityinen selaus */ }
  const osuma = pelit.filter(function (p) { return p.avain === muistettu; })[0];
  return (osuma || pelit[0]).avain;
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
/* PÄÄVALIKKO = korttipelin aloitusruutu (`index.html`), jossa valitaan peli,
 * kieli ja pelitapa. Marko 14.10.2026: «Miten pääsen takaisin siihen
 * päävalikkoon?» — lautapelistä ei ollut ulospääsyä muuta kuin selaimen
 * takaisin-napilla.
 *
 * ⚠️ TÄMÄ VIE SAMAAN PAIKKAAN KUIN KYTKIMEN «Korttipeli», eikä sitä väitetä
 * muuksi: korttipeli avautuu aloitusruutuunsa. Ero on nimessä, ja nimi on
 * tässä koko asia — kytkin lupaa pelin vaihdon, tämä lupaa ulospääsyn. */
function paavalikkoon() {
  const kieli = new URLSearchParams(location.search).get('kieli');
  location.assign('./' + (kieli ? '?kieli=' + encodeURIComponent(kieli) : ''));
}

function sivustonOsoite() {
  if (/(^|\.)merkitysten\.fi$/.test(location.hostname)) return '/';
  return '../' + (typeof KIELI === 'string' ? KIELI : 'fi') + '/';
}

/* ⚠️ KAKSI ASKELTA, EI YHTÄ LISTAA (Marko 14.10.2026: «Se korttipelin tai
   lautapelin valinta pitäisi muuttaa niitä alempia valintoja ja siis
   käytännössä koko ruutua. Eikä niin, että kokoajan on kaikki ruudulla.»
   Ja samana iltana lautapelin puolelta: «ei tarvita valikkoon korttipelin
   pelimuotoja»).

   Askel 1 on LAJI, askel 2 on sen lajin pelit. Ruudulla on vain valitun
   lajin pelit — ja jos lajissa on yksi peli, toista riviä ei ole lainkaan:
   yhden napin valintalista ei ole valinta.

   📐 Ennen tätä molempien lajien kaikki pelit olivat yhtä aikaa ruudulla
   kahtena otsikoituna ryhmänä, ja lautapelin valikossa puolet näkyvästä
   oli korttipelin sivuja. */
function valitsinNappi(teksti, valittu, f) {
  const nappi = document.createElement('button');
  nappi.type = 'button';
  nappi.className = 'pelivalinta-nappi' + (valittu ? ' valittu' : '');
  nappi.setAttribute('role', 'radio');
  nappi.setAttribute('aria-checked', valittu ? 'true' : 'false');
  nappi.textContent = teksti;
  nappi.onclick = f;
  return nappi;
}

function valitsinRyhma(nimi) {
  const ryhma = document.createElement('div');
  ryhma.className = 'pelivalinta-ryhma';
  ryhma.setAttribute('role', 'radiogroup');
  ryhma.setAttribute('aria-label', nimi);
  return ryhma;
}

/* 🔵 LAJI ON LIUKUKYTKIN (Marko 14.10.2026: «se valinta pitäisi ensin tehdä
   korttipelin ja lautapelin välillä. Esim. liukukytkin. Siitä riippuu sitten
   mitä muuta ruudulla näkyy.»).

   Kytkin on kaksi painiketta ja niiden alla liukuva nappula (`--i` kertoo
   kummalla puolella se on). ⚠️ Nappulaa ei piirretä napin omaksi taustaksi:
   silloin siirtymä olisi välähdys eikä liuku, eikä kytkin eroaisi
   painikeparista mitenkään. */
function lajikytkin(laji) {
  const kytkin = document.createElement('div');
  kytkin.className = 'pelivalinta-kytkin';
  kytkin.setAttribute('role', 'radiogroup');
  kytkin.setAttribute('aria-label', t('peli.valitse'));
  const nakyvat = LAJIT.filter(function (l) {
    return PELIT.filter(function (p) { return p.laji === l.avain; }).length > 0;
  });
  kytkin.style.setProperty('--n', nakyvat.length);
  const liuku = document.createElement('span');
  liuku.className = 'pelivalinta-liuku';
  liuku.setAttribute('aria-hidden', 'true');
  kytkin.appendChild(liuku);
  nakyvat.forEach(function (l, i) {
    const valittu = l.avain === laji;
    if (valittu) kytkin.style.setProperty('--i', i);
    const nappi = document.createElement('button');
    nappi.type = 'button';
    nappi.className = 'pelivalinta-kytkin-nappi' + (valittu ? ' valittu' : '');
    nappi.setAttribute('role', 'radio');
    nappi.setAttribute('aria-checked', valittu ? 'true' : 'false');
    nappi.textContent = t(l.ta);
    nappi.onclick = function () { peliVaihda(lajinPeli(l.avain)); };
    kytkin.appendChild(nappi);
  });
  return kytkin;
}

function pelivalintaPiirra() {
  const nyt = peliNyt();
  const laji = lajiNyt();
  const lajinPelit = PELIT.filter(function (p) { return p.laji === laji; });

  [].forEach.call(document.querySelectorAll('.pelivalinta'), function (paikka) {
    paikka.innerHTML = '';
    paikka.setAttribute('aria-label', t('peli.valitse'));

    paikka.appendChild(lajikytkin(laji));

    if (lajinPelit.length > 1) {
      const pelirivi = valitsinRyhma(t(lajiAvain(laji)));
      pelirivi.className += ' pelivalinta-ryhma--pelit';
      lajinPelit.forEach(function (p) {
        pelirivi.appendChild(valitsinNappi(p.nimi, p.avain === nyt, function () { peliVaihda(p.avain); }));
      });
      paikka.appendChild(pelirivi);
    }
  });

  /* Asetuksissa: sama kaksi askelta, pelit asetussivujen valintalistana. */
  const lista = document.getElementById('pelivalintaLista');
  if (lista) {
    lista.innerHTML = '';
    lista.appendChild(lajikytkin(laji));
    if (lajinPelit.length > 1) {
      lajinPelit.forEach(function (p) {
        const nappi = document.createElement('button');
        nappi.className = 'as-valinta' + (p.avain === nyt ? ' valittu' : '');
        nappi.innerHTML = '<b></b>';
        nappi.querySelector('b').textContent = p.nimi;
        nappi.onclick = function () { peliVaihda(p.avain); };
        lista.appendChild(nappi);
      });
    }
  }
  const nimi = PELIT.filter(function (p) { return p.avain === nyt; })[0].nimi;
  const arvo = document.getElementById('arvoPeli');
  if (arvo) arvo.textContent = nimi;
  /* Aloitusruudun alasivuilla palkissa näkyy pelin nimi viirin tilalla. */
  [].forEach.call(document.querySelectorAll('.alku-pelinimi'), function (b) { b.textContent = nimi; });
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
