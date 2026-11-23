/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  PELILAUTA ON KOSKETELTAVA, EI JULISTE                                ║
   ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Marko 23.11.2026: «Sen lisäksi pitäisi pystyä painamaan näitä pelilaudan
 * eri elementtejä, jolloin ruudulle tulisi ikkuna, jossa kerrotaan ko.
 * elementistä olennainen tieto. Esim. tavoitepizzat, pelilaudalla on
 * näkyvissä neljä pizzaa, joita pelaajat pyrkivät valmistamaan linjaston
 * täytteillä. Sitten siinä voisi olla pizzakortti, jota painamalla voi
 * selailla pizzakortteja. Tämä vain yhtenä esimerkkinä. Mutta pointtina,
 * että sen kuvan pitäisi olla vuorovaikutuksellinen eikä tuollainen
 * staattinen kuva. Muista, että meillä on digitaalinen maailma, joka ei
 * rajoitu analogisen maailman esteisiin.»
 *
 * ⚠️ LÄHIKUVA JA KOROSTUS TULEVAT SAMASTA GEOMETRIASTA. Ikkunassa näkyy
 * laudan kuva rajattuna siihen osaan josta puhutaan, ja sen päällä sama
 * varjo + ääriviiva kuin kartassa. Pelkkä rajaus ei riittäisi: varasto ja
 * pizzapaikat ulottuvat laudan laidasta laitaan, joten niiden neliörajaus on
 * lähes koko lauta — korostus kertoo silti tarkalleen mistä on kyse.
 * Rajaus ja polku lasketaan rakenna.py:ssä `LAUTA_ALUEET`-mitoista, eli
 * samasta kerran mitatusta lähteestä kuin laudan korostuskin. Toinen,
 * erikseen arvattu ruutu ajautuisi erilleen heti kun lauta piirretään
 * uusiksi.
 *
 * ⚠️ IKKUNA EI OLE UUSI SISÄLTÖ VAAN SAMA TIETO LÄHELTÄ. Tekstit tulevat
 * sivulta (`data-osat`), eli käännöstiedostoista kuten kaikki muukin. Mitään
 * ei kirjoiteta tänne suomeksi.
 *
 * ⚠️ ILMAN JAVASCRIPTIÄ KARTTA ON ENTISELLÄÄN. Kehote «napauta laudan osaa»
 * on sivulla `hidden`, ja vasta tämä skripti paljastaa sen: lupaus, jota ei
 * voi pitää, on pahempi kuin ei lupausta lainkaan.
 */
(function () {
  var kartta = document.querySelector('.lautakartta[data-osat]');
  if (!kartta || !window.HTMLDialogElement) return;
  var OSAT;
  try { OSAT = JSON.parse(kartta.dataset.osat); } catch (_) { return; }

  var KORTIT = kartta.dataset.kortit || '';
  var KORTTEJA = +kartta.dataset.kortteja || 0;
  var SELAA = kartta.dataset.selaa || '';
  var LAUTAKUVA = kartta.querySelector('.lautakartta__lauta img');
  /* Nappien tekstit tulevat sivulta käännettyinä, kuten kaikki muukin
     teksti: tässä tiedostossa ei lue yhtään suomenkielistä sanaa. */
  var T = kartta.dataset;

  var ohje = kartta.querySelector('.lautakartta__ohje');
  if (ohje) ohje.hidden = false;

  var dlg = null, otsikkoEl = null, tekstiEl = null, kuvaEl = null,
      selainEl = null, selainKuva = null, selainLuku = null, avaaja = null;
  var kortti = 1;

  function el(tagi, cls, teksti) {
    var e = document.createElement(tagi);
    if (cls) e.className = cls;
    if (teksti != null) e.textContent = teksti;
    return e;
  }

  function luo() {
    dlg = document.createElement('dialog');
    dlg.className = 'lautaikkuna';
    dlg.innerHTML =
      '<div class="lautaikkuna__ylaosa">' +
        '<h2 class="lautaikkuna__otsikko"></h2>' +
        '<button type="button" class="lautaikkuna__sulje" aria-label="' +
          (T.sulje || '×') + '">×</button>' +
      '</div>' +
      '<div class="lautaikkuna__sisus">' +
      '<div class="lautaikkuna__kuva"><img alt="" src="' +
        (LAUTAKUVA ? LAUTAKUVA.getAttribute('src') : '') + '">' +
        '<svg viewBox="0 0 900 900" aria-hidden="true" focusable="false">' +
          '<path class="lautaikkuna__varjo" fill-rule="evenodd"></path>' +
          '<path class="lautaikkuna__reuna"></path></svg></div>' +
      '<p class="lautaikkuna__teksti"></p>' +
      '<div class="lautaikkuna__selain" hidden>' +
        '<p class="lautaikkuna__selaa">' + SELAA + '</p>' +
        '<div class="lautaikkuna__kortti"><img alt=""></div>' +
        '<div class="lautaikkuna__ohjain">' +
          '<button type="button" class="lautaikkuna__nappi" data-suunta="-1" aria-label="' +
            (T.edellinen || '‹') + '">‹</button>' +
          '<span class="lautaikkuna__luku" aria-live="polite"></span>' +
          '<button type="button" class="lautaikkuna__nappi" data-suunta="1" aria-label="' +
            (T.seuraava || '›') + '">›</button>' +
        '</div>' +
      '</div>' +
      '</div>';
    document.body.appendChild(dlg);
    otsikkoEl = dlg.querySelector('.lautaikkuna__otsikko');
    tekstiEl = dlg.querySelector('.lautaikkuna__teksti');
    kuvaEl = dlg.querySelector('.lautaikkuna__kuva');
    selainEl = dlg.querySelector('.lautaikkuna__selain');
    selainKuva = selainEl.querySelector('img');
    selainLuku = selainEl.querySelector('.lautaikkuna__luku');
    dlg.querySelector('.lautaikkuna__sulje').onclick = function () { dlg.close(); };
    /* Taustaan napsautus sulkee — sama tapa kuin kielivalitsimessa. */
    dlg.addEventListener('mousedown', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('click', function (e) {
      var n = e.target.closest && e.target.closest('[data-suunta]');
      if (n) selaa(+n.dataset.suunta);
    });
    /* Fokus takaisin siihen nappiin josta ikkuna avattiin: ilman tätä
       näppäimistöllä liikkuva putoaa sivun alkuun. */
    dlg.addEventListener('close', function () { if (avaaja) avaaja.focus(); });
  }

  function numero(n) { return (n < 10 ? '0' : '') + n; }

  function selaa(suunta) {
    if (!KORTTEJA) return;
    kortti = ((kortti - 1 + suunta) % KORTTEJA + KORTTEJA) % KORTTEJA + 1;
    selainKuva.src = KORTIT + numero(kortti) + '.webp';
    selainLuku.textContent = kortti + ' / ' + KORTTEJA;
  }

  function avaa(osa, nappi) {
    var tieto = OSAT[osa];
    if (!tieto) return;
    if (!dlg) luo();
    avaaja = nappi || null;
    otsikkoEl.textContent = tieto.nimi || '';
    tekstiEl.textContent = tieto.teksti || '';
    tekstiEl.hidden = !tieto.teksti;
    /* Lähikuva: laudan kuva rajattuna alueen ympärysruutuun. Luvut ovat
       prosentteja, jotka rakenna.py laski mitatusta geometriasta. */
    var k = tieto.kuva;
    kuvaEl.hidden = !k;
    if (k) {
      /* Kuva ja korostus-SVG liikkuvat yhdessä: molemmat ovat 900 yksikköä
         leveitä ja saavat saman leveyden ja saman siirron, joten varjo osuu
         kuvaan riippumatta siitä, minkä kokoisena ikkuna näytetään. */
      [kuvaEl.querySelector('img'), kuvaEl.querySelector('svg')].forEach(function (o) {
        o.style.width = k.lev + '%';
        o.style.left = k.vas + '%';
        o.style.top = k.yla + '%';
      });
      kuvaEl.querySelector('.lautaikkuna__varjo')
            .setAttribute('d', 'M0 0H900V900H0Z' + k.polku);
      kuvaEl.querySelector('.lautaikkuna__reuna').setAttribute('d', k.polku);
    }
    /* Pizzakorttien selain on vain pizzakorttipaikoilla: siellä kortti on se
       asia josta puhutaan, muualla se olisi koriste. */
    var selain = osa === 'pizzat' && KORTTEJA > 0;
    selainEl.hidden = !selain;
    if (selain) { kortti = 1; selaa(0); }
    dlg.showModal();
  }

  kartta.addEventListener('click', function (e) {
    var k = e.target.closest && e.target.closest('[data-osa]');
    if (!k) return;
    avaa(k.dataset.osa, k.tagName === 'BUTTON' ? k : null);
  });
})();
