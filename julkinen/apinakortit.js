/* Apinakorttisivun animaatiot: jokaisen kortin «Näytä» avaa animaation sen
 * kortin sisään.
 *
 * ⚠️ RASKAS MODUULI LADATAAN VASTA ENSIMMÄISESTÄ PAINALLUKSESTA. Sivun tehtävä
 * on, että pelaaja löytää kortin säännön nopeasti kesken pelin — ja animaatiot
 * ovat noin 100 kt koodia sekä lauta-, boksi- ja noppakuvat. Jos ne ladattaisiin
 * joka avauksella, sivu hidastuisi juuri siinä käytössä jota varten se on.
 *
 * ⚠️ YKSI MODUULI, JOKA SIIRRETÄÄN. 33 erillistä lautaa yhdellä sivulla olisi
 * 33 kertaa kaikki kuvat. Kun toinen kortti avataan, sama näyttämö siirtyy
 * sinne ja edellinen sulkeutuu.
 *
 * ⚠️ Kortin teksti on jo sivulla, joten moduulille annetaan `korttipaikka:false`
 * ja `selite:false` — muuten sama sääntö luettaisiin ruudulla kahdesti.
 */
(function () {
  /* Sama kytkentä palvelee kahta sivua: apinakorttisivun 33 korttia ja
     lautapelisivun opasanimaatiot. Asetukset luetaan siltä elementiltä joka
     ne kantaa, ei korttiä listalta — muuten lautapelisivu tarvitsisi oman
     kopionsa tästä tiedostosta. */
  var juuri = document.querySelector('[data-kansio]');
  if (!juuri || !window.Promise) return;
  var lista = document.querySelector('.apinakortit');
  var A = juuri.dataset;            // kansio, lauta, nayta, piilota, otsakkeet
  var lupaus = null, lava = null, moduuli = null, auki = null;

  function aineisto(tagi, polku, attrit) {
    return new Promise(function (ok, ei) {
      var el = document.createElement(tagi);
      el.onload = function () { ok(); };
      el.onerror = function () { ei(new Error(polku)); };
      for (var k in attrit) el.setAttribute(k, attrit[k]);
      el.setAttribute(tagi === 'link' ? 'href' : 'src', polku);
      document.head.appendChild(el);
    });
  }
  function tyyli(p) { return aineisto('link', p, { rel: 'stylesheet' }); }
  function alueet() {
    try { return A.alueet ? JSON.parse(A.alueet) : null; } catch (_) { return null; }
  }
  function skripti(p) { return aineisto('script', p, {}); }

  /* Latausjärjestys on sääntö, ei tyylikysymys: `apinakortti.js` kutsuu
     `Noppa3D`:tä ja apinavaaan omaa tornipiirtoa, joten ne ovat ensin. */
  function lataa() {
    if (lupaus) return lupaus;
    /* ⚠️ Polut tulevat sivulta LEIMATTUINA (`data-css`, `data-js`). Skripti ei
       voi laskea tiivistettä itse, ja ilman leimaa selain tarjoili vanhaa
       `apinavaaka.js`:ää välimuistista — moduuli kaatui «torni is not a
       function». Viimeinen js on `apinakortti.js`, joka tarvitsee edelliset. */
    var css = (A.css || '').split(',').filter(Boolean);
    var js = (A.js || '').split(',').filter(Boolean);
    lupaus = Promise.all(css.map(tyyli).concat(js.slice(0, -1).map(skripti)))
      .then(function () { return skripti(js[js.length - 1]); })
      .then(function () {
        lava = document.createElement('div');
        lava.className = 'ak-lava';
        var sisus = document.createElement('div');
        lava.appendChild(sisus);
        moduuli = window.Apinakortti(sisus, {
          kansio: A.kansio, lautakuva: A.lauta, pelaajia: 3,
          korttipaikka: false, selite: false,
          /* Otsakkeet sivun omalla kielellä: moduulissa ne olisivat suomeksi. */
          otsakkeet: { linjasto: A.linjasto || '', varasto: A.varasto || '' }
        });
      });
    return lupaus;
  }

  function sulje() {
    if (auki === null) return;
    var kortti = document.getElementById('k' + ('0' + auki).slice(-2));
    var nappi = kortti && kortti.querySelector('.apinakortti__nayta');
    if (kortti) kortti.classList.remove('apinakortti--auki');
    if (nappi) { nappi.setAttribute('aria-expanded', 'false'); nappi.textContent = A.nayta; }
    if (lava && lava.parentNode) lava.parentNode.removeChild(lava);
    auki = null;
    if (moduuli) moduuli.alkuun();
  }

  if (lista) lista.addEventListener('click', function (e) {
    var nappi = e.target.closest ? e.target.closest('.apinakortti__nayta') : null;
    if (!nappi) return;
    var n = +nappi.dataset.n;
    if (auki === n) { sulje(); return; }
    nappi.disabled = true;
    lataa().then(function () {
      nappi.disabled = false;
      sulje();
      var kortti = document.getElementById('k' + ('0' + n).slice(-2));
      if (!kortti) return;
      kortti.classList.add('apinakortti--auki');
      kortti.appendChild(lava);
      nappi.setAttribute('aria-expanded', 'true');
      nappi.textContent = A.piilota;
      auki = n;
      moduuli.nayta(n);
    }).catch(function () {
      /* Lataus epäonnistui: nappi palaa käyttöön eikä sivu jää jumiin.
         Sääntö on luettavissa ilman animaatiota, joten mitään ei menetetä. */
      nappi.disabled = false;
      lupaus = null;
    });
  });

  /* Lautapelisivun opasanimaatiot: oma moduuli-instanssi per mountti, koska
     ne voivat olla auki yhtä aikaa eivätkä kilpaile samasta näyttämöstä
     kuten apinakortit. */
  [].forEach.call(document.querySelectorAll('[data-opas]'), function (mountti) {
    var nappi = mountti.querySelector('.apinakortti__nayta');
    if (!nappi) return;
    var oma = null;
    nappi.addEventListener('click', function () {
      if (oma) {
        var auki = mountti.classList.toggle('ak-opas--auki');
        nappi.setAttribute('aria-expanded', String(auki));
        nappi.textContent = auki ? A.piilota : A.nayta;
        if (auki) oma.opas(mountti.dataset.opas); else oma.alkuun();
        return;
      }
      nappi.disabled = true;
      lataa().then(function () {
        nappi.disabled = false;
        var lava = document.createElement('div');
        lava.className = 'ak-lava';
        var sisus = document.createElement('div');
        lava.appendChild(sisus);
        mountti.appendChild(lava);
        oma = window.Apinakortti(sisus, {
          kansio: A.kansio, lautakuva: A.lauta, pelaajia: 3,
          korttipaikka: false, selite: false,
          otsakkeet: { linjasto: A.linjasto || '', varasto: A.varasto || '' },
          /* Laudan alueiden mitat sivulta: moduuli ei saa pitää omaa kopiota. */
          alueet: alueet(),
          /* Lautapelin omat kortit, ei korttipelin pakan kuvia. */
          lautakortit: A.lautakortit || null
        });
        mountti.classList.add('ak-opas--auki');
        nappi.setAttribute('aria-expanded', 'true');
        nappi.textContent = A.piilota;
        oma.opas(mountti.dataset.opas);
      }).catch(function () { nappi.disabled = false; lupaus = null; });
    });
  });
})();
