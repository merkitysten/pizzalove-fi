/* Pizza Love — QR-KOODIN LUKU KAMERALLA (Marko 20.10.2026)
 *
 * «QR-koodin luku pitäisi olla mahdollista myös pizza loven pelaamisessa
 * suoraan.» Tämä avaa kameran sivun sisään, etsii kuvasta QR-koodin ja
 * palauttaa siitä liittymiskoodin. Kaikki tapahtuu laitteella: kuva ei
 * lähde mihinkään, mitään ei tallenneta eikä valokuvaa synny.
 *
 * 📐 MIKSI KIRJASTO EIKÄ SELAIMEN OMA LUKIJA: mitattu Markon iPhonella
 * (iOS 18.7 / Safari 26.6.1) sivulla `kamerakoe.html`:
 *     BarcodeDetector EI · getUserMedia KYLLÄ · input capture KYLLÄ
 * Selaimen oma `BarcodeDetector` on Android Chromessa muttei Safarissa, eikä
 * se ole vanhan laitteen ongelma vaan Applen valinta. Purku tulee siis
 * `vendor/jsqr/`ista - ks. sen LUE-MINUT.md (lisenssi, tarkastus, säännöt).
 *
 * ⚠️ KIRJASTO LADATAAN VASTA NAPAUTUKSESTA. Se on 251 kt (56 kt siirrossa),
 * ja se olisi kohtuuton hinta jokaiselle joka ei skannaa mitään. Lataus
 * tehdään `<script>`-tagilla kun pelaaja painaa «Skannaa koodi», ja vain
 * kerran - toinen avaus käyttää jo ladattua.
 *
 * ⚠️ JA KAMERA SULJETAAN AINA. `getUserMedia`n virta jää päälle (ja vihreä
 * merkkivalo palamaan) jos radat jätetään pysäyttämättä - myös silloin kun
 * pelaaja sulkee näkymän kesken tai luku onnistuu.
 */

var qrLukuLadattu = false, qrLukuLataus = null;

/* Kirjasto muistiin kerran. Palauttaa lupauksen, jotta kaksi napautusta
   peräkkäin ei lataa sitä kahdesti. */
function qrLataaKirjasto() {
  if (qrLukuLadattu) return Promise.resolve(true);
  if (qrLukuLataus) return qrLukuLataus;
  qrLukuLataus = new Promise(function (ok, ei) {
    var s = document.createElement('script');
    s.src = 'vendor/jsqr/jsQR.js?v=20261020a';
    s.onload = function () { qrLukuLadattu = true; ok(true); };
    s.onerror = function () { qrLukuLataus = null; ei(new Error('lataus epäonnistui')); };
    document.head.appendChild(s);
  });
  return qrLukuLataus;
}

/* Mitä koodissa luki? Palauttaa { koodi, peli } tai null.
 *
 * 🔴 KAHDELLA PELILLÄ ON ERI LINKKI, ja se oli lähellä mennä ohi.
 * 📐 Mitattu linkkien rakentajista:
 *     Party  …/pelaa.html?koodi=1234   (isannointi.js)
 *     Basso  …/basso.html?liity=1234   (basso-verkko.js)
 * Ensimmäinen versio osasi vain `koodi=`, joten BASSON QR:ÄÄ EI OLISI LUETTU
 * LAINKAAN - skanneri olisi jäänyt tuijottamaan sitä ikuisesti. Marko
 * 20.10.2026: «liity peliin pitäisi olla globaali keino liittyä. Samoin kuin
 * puhelimen oman kameran käyttö.»
 *
 * ⚠️ EMME SIIRRY SKANNATTUUN OSOITTEESEEN. Koodi voi olla kenen tahansa
 * tekemä, ja osoitteeseen siirtyminen veisi pelaajan minne tahansa. Siksi
 * luetaan vain KOODI ja se kumman pelin linkki oli, ja siirrytään MEIDÄN
 * omalle sivullemme (pelivalinta.js).
 *
 * ⚠️ EI `new URL()`: se heittää jos teksti ei ole osoite, ja silloin paljas
 * nelinumeroinen koodi hylättäisiin. */
function qrPoimi(teksti) {
  if (typeof teksti !== 'string') return null;
  var m = /[?&]koodi=(\d{4})\b/.exec(teksti);
  if (m) return { koodi: m[1], peli: 'party' };
  m = /[?&]liity=(\d{4})\b/.exec(teksti);
  if (m) return { koodi: m[1], peli: 'basso' };
  m = /^\s*(\d{4})\s*$/.exec(teksti);
  return m ? { koodi: m[1], peli: null } : null;
}

/* Avaa skannerin. `valmis(koodi)` kutsutaan kun koodi on luettu; jos pelaaja
   sulkee näkymän tai kamera ei aukea, sitä ei kutsuta lainkaan. */
function qrAvaaSkanneri(valmis) {
  var peite = document.createElement('div');
  peite.className = 'qr-peite';
  peite.innerHTML =
    '<div class="qr-ikkuna">' +
      '<video class="qr-video" playsinline muted></video>' +
      '<div class="qr-kehys" aria-hidden="true"></div>' +
    '</div>' +
    '<p class="qr-ohje"></p>' +
    '<button type="button" class="qr-sulje toinen-nappi"></button>';
  peite.querySelector('.qr-ohje').textContent = t('qr.ohje');
  peite.querySelector('.qr-sulje').textContent = t('as.takaisin');
  document.body.appendChild(peite);

  var video = peite.querySelector('.qr-video');
  var ohje = peite.querySelector('.qr-ohje');
  var virta = null, kaynnissa = true, kehys = null;

  function sulje() {
    kaynnissa = false;
    if (kehys) cancelAnimationFrame(kehys);
    if (virta) virta.getTracks().forEach(function (r) { r.stop(); });   // ⚠️ aina
    if (peite.parentNode) peite.parentNode.removeChild(peite);
  }
  peite.querySelector('.qr-sulje').addEventListener('click', sulje);

  /* ⚠️ Canvas on pieni tarkoituksella: purku käy pikselit läpi, ja täysi
     1080p-ruutu tekisi siitä nykivän puhelimella. 480 px riittää hyvin
     näytöltä luettavaan koodiin. */
  var kangas = document.createElement('canvas');
  var piirto = kangas.getContext('2d', { willReadFrequently: true });
  var LEVEYS = 480;

  function silmukka() {
    if (!kaynnissa) return;
    if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth) {
      var k = LEVEYS / video.videoWidth;
      kangas.width = LEVEYS;
      kangas.height = Math.round(video.videoHeight * k);
      piirto.drawImage(video, 0, 0, kangas.width, kangas.height);
      var kuva = piirto.getImageData(0, 0, kangas.width, kangas.height);
      var osuma = window.jsQR ? jsQR(kuva.data, kuva.width, kuva.height,
        { inversionAttempts: 'dontInvert' }) : null;
      var luettu = osuma && qrPoimi(osuma.data);
      if (luettu) {
        sulje();
        /* ⚠️ TOISEN PELIN KOODI HOIDETAAN TÄÄLLÄ, EI KUTSUJASSA. Muuten sama
           päätös olisi molemmissa peleissä erikseen - ja «globaali keino
           liittyä» tarkoittaa juuri sitä ettei pelaajan tarvitse tietää
           kummasta pelistä on kyse. */
        if (luettu.peli && typeof peliNyt === 'function' && luettu.peli !== peliNyt() &&
            typeof pelivalintaLiittymisOsoite === 'function') {
          location.assign(pelivalintaLiittymisOsoite(luettu.peli, luettu.koodi));
          return;
        }
        valmis(luettu.koodi);
        return;
      }
    }
    kehys = requestAnimationFrame(silmukka);
  }

  qrLataaKirjasto().then(function () {
    return navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
  }).then(function (v) {
    if (!kaynnissa) { v.getTracks().forEach(function (r) { r.stop(); }); return; }
    virta = v; video.srcObject = v;
    return video.play();
  }).then(function () {
    if (kaynnissa) silmukka();
  }).catch(function (e) {
    /* ⚠️ Kameran kieltäminen EI ole virhe vaan vastaus: pelaaja sanoi ei.
       Koodikenttä on näkymän alla odottamassa, joten kerrotaan se eikä
       näytetä virheilmoitusta. */
    ohje.textContent = (e && e.name === 'NotAllowedError') ? t('qr.eiLupaa') : t('qr.eiKameraa');
    ohje.classList.add('qr-ohje--virhe');
  });
}

/* Onko luku mahdollista tällä laitteella? Nappi piilotetaan jos ei ole -
   nappi joka ei voi toimia on huonompi kuin ei nappia. */
function qrLukuMahdollista() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia &&
            window.isSecureContext);
}
