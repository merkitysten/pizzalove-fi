/* Mittausosa: ajetaan iframen sisällä olevaan sivuun.
   Palauttaa JSONin, jonka rtlkoe.py lukee. Ei muuta sivua pysyvästi. */
window.rtlMittaa = function (doc) {
  var juuri = doc.documentElement;
  var W = juuri.clientWidth;

  function nimi(el) {
    var s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    var l = (typeof el.className === 'string' ? el.className : '').trim();
    if (l) s += '.' + l.split(/\s+/).slice(0, 2).join('.');
    return s;
  }
  function solmut() { return doc.querySelectorAll('body *'); }

  /* ⚠️ VAAKAVIERITETTAVAN SAILION SISALLA «ruudun ulkopuolella» EI OLE VIKA.
     Videokarusellin (.videot, overflow-x:auto) kortit ovat tarkoituksella
     ruudun ulkopuolella — niihin vieritetaan. Mitattu 19.11.2026 ensimmaisella
     aidosti rtl-sivulla: kielimerkki siirtyi karusellin sisalla 96 px, koska
     kuvateksti on nyt rtl, ja vanha mittaus luki sen vuodoksi. Sivun oma
     vaakavuoto mitataan erikseen (`vaakayli`), ja se on se joka oikeasti haittaa. */
  function vierittyvaSisalla(el) {
    for (var n = el.parentElement; n && n !== doc.body; n = n.parentElement) {
      var o = doc.defaultView.getComputedStyle(n).overflowX;
      if (o === 'auto' || o === 'scroll') return 1;
    }
    return 0;
  }

  function kuva() {
    var ulos = [], k = solmut();
    for (var i = 0; i < k.length; i++) {
      var el = k[i], r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      var cs = doc.defaultView.getComputedStyle(el);
      ulos.push({ i: i, n: nimi(el), vierittyva: vierittyvaSisalla(el),
                  x: Math.round(r.left), y: Math.round(r.top + doc.defaultView.scrollY),
                  w: Math.round(r.width), h: Math.round(r.height),
                  d: cs.display, suunta: cs.direction, tasaus: cs.textAlign });
    }
    return ulos;
  }
  function sivuntila() {
    return { vaakayli: juuri.scrollWidth - W, korkeus: juuri.scrollHeight };
  }
  /* Asettelulohkon lasten näkyvä järjestys vasemmalta oikealle. */
  function jarjestykset() {
    var o = {}, k = solmut();
    for (var i = 0; i < k.length; i++) {
      var el = k[i], cs = doc.defaultView.getComputedStyle(el);
      if (!/flex|grid/.test(cs.display)) continue;
      var lapset = [];
      for (var j = 0; j < el.children.length; j++) {
        var r = el.children[j].getBoundingClientRect();
        if (r.width || r.height) lapset.push({ j: j, x: r.left });
      }
      if (lapset.length < 2) continue;
      lapset.sort(function (a, b) { return a.x - b.x; });
      o[i] = { n: nimi(el), jarjestys: lapset.map(function (p) { return p.j; }).join(',') };
    }
    return o;
  }
  /* Lavojen (pelilauta, animaatio) sisäiset paikat suhteessa omaan lohkoonsa. */
  var LAVAT = '.lautakartta,.ak-lava,[data-opas],.apinakortti__lava';
  function lavat() {
    var o = {};
    [].forEach.call(doc.querySelectorAll(LAVAT), function (juuriEl, li) {
      var jr = juuriEl.getBoundingClientRect();
      [].forEach.call(juuriEl.querySelectorAll('*'), function (el, i) {
        var r = el.getBoundingClientRect();
        if (!r.width && !r.height) return;
        o[li + ':' + i] = { n: nimi(el), x: Math.round(r.left - jr.left),
                            y: Math.round(r.top - jr.top), w: Math.round(r.width) };
      });
    });
    return o;
  }

  /* Luettelon sisennys: kun suunta on rtl, numeroiden ja pallojen tila on
     oltava OIKEALLA. Fyysinen `padding-left`/`margin-left` ei seuraa suuntaa,
     ja oire on hiljainen: laatikko siirtyy, mutta mikään ei ylivuoda eikä
     korkeus välttämättä muutu. Siksi tämä on oma mitta.
     ⚠️ Vain rtl-suuntaiset listat: ltr-lukitun listan (esim. .tiedot)
     sisennys KUULUU olla vasemmalla. */
  function sisennysVaarin() {
    var ulos = [], k = solmut();
    for (var i = 0; i < k.length; i++) {
      var el = k[i];
      if (!/^(ul|ol)$/i.test(el.tagName)) continue;
      var cs = doc.defaultView.getComputedStyle(el);
      if (cs.direction !== 'rtl') continue;
      var v = parseFloat(cs.paddingLeft) + parseFloat(cs.marginLeft);
      var o = parseFloat(cs.paddingRight) + parseFloat(cs.marginRight);
      if (v - o > 2) ulos.push({ n: nimi(el), vasen: Math.round(v), oikea: Math.round(o) });
    }
    return ulos;
  }

  /* --- TUNNISTEET -----------------------------------------------------------
     ⚠️ TÄTÄ EI VOI MITATA SIVUN OMALLA TEKSTILLÄ. Englanninkielisessä
     kappaleessa «Pizza Love®» ei hajoa, vaikka perussuunta olisi rtl: koko
     rivi on yhtä latinalaista jaksoa. Vika syntyy vasta arabian SEASSA.
     Siksi tähän tehdään koepala: sivuston omat tunnisteet arabialaisen
     kantolauseen sisään, ja luetaan merkkien todellinen järjestys.

     Verrokki «2–4» on mukana TAHALLAAN: sen KUULUU kääntyä arabiassa
     (W3C: «a range such as 10-12 … would look like this in Arabic: 12-10»),
     eikä sitä saa eristää. Jos koe ilmoittaisi siitä, koe olisi väärässä.

     Jokainen tunniste mitataan kahdesti: paljaana ja <bdi>-eristettynä.
     Jos eristetty versio ei kestä, mittaus itse on rikki eikä tulosta saa lukea. */
  var KANTO_A = '\u0647\u0630\u0647 ';                 // «tämä »
  var KANTO_B = ' \u0644\u0639\u0628\u0629 \u0645\u0645\u062a\u0639\u0629';  // « hauska peli»
  /* odotus = mita PALJAALLE merkkijonolle pitaa tapahtua arabian seassa. */
  var KOEPALAT = [
    { laji: 'tuotenimi',   teksti: 'Pizza Love\u00ae',          odotus: 'kaantyy' },
    { laji: 'pelimuoto',   teksti: '#1 Pizza',                  odotus: 'kaantyy' },
    { laji: 'korttivali',  teksti: '01\u201333',                odotus: 'kaantyy' },
    /* Osoite kestaa itsestaan: pisteet ja kauttaviivat sitovat sen yhteen. */
    { laji: 'osoite',      teksti: 'pizzalove.fi/ar/card-game', odotus: 'kestaa' },
    /* Numerovali SAA kaantya — sita ei eristeta. */
    { laji: 'numerovali',  teksti: '2\u20134',                  odotus: 'kaantyy' }
  ];
  function keraaMerkit(s, alku, loppu, merkit) {
    for (var i = alku; i < loppu; i++) {
      var r = doc.createRange();
      r.setStart(s, i); r.setEnd(s, i + 1);
      var b = r.getBoundingClientRect();
      var m = s.nodeValue[i];
      if (!b.width && m !== ' ') continue;
      if (/[\u2066-\u2069]/.test(m)) continue;
      merkit.push({ m: m, x: b.left, y: Math.round(b.top) });
    }
  }
  function jarjesta(merkit) {
    merkit.sort(function (a, b) { return a.y - b.y || a.x - b.x; });
    return merkit.map(function (k) { return k.m; }).join('');
  }
  function nakyvaJarjestys(el) {
    var kavelija = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT), s, merkit = [];
    while ((s = kavelija.nextNode())) keraaMerkit(s, 0, s.nodeValue.length, merkit);
    return jarjesta(merkit);
  }
  function tunnisteet() {
    var isanta = doc.querySelector('main') || doc.body;
    var laatikko = doc.createElement('div');
    laatikko.id = 'rtlkoe-koepala';
    isanta.appendChild(laatikko);
    var ulos = [];
    KOEPALAT.forEach(function (k) {
      ['paljas', 'bdi'].forEach(function (tapa) {
        var kpl = doc.createElement('p');
        kpl.innerHTML = KANTO_A + (tapa === 'bdi' ? '<bdi>' + k.teksti + '</bdi>' : k.teksti) + KANTO_B;
        laatikko.appendChild(kpl);
        var nakyi = nakyvaJarjestys(kpl);
        var kesti = nakyi.indexOf(k.teksti) >= 0;
        ulos.push({ laji: k.laji, teksti: k.teksti, tapa: tapa, kesti: kesti,
                    nakyi: nakyi, odotus: k.odotus });
        kpl.remove();
      });
    });
    laatikko.remove();
    return ulos;
  }

  /* --- LASKUT --------------------------------------------------------------
     ⚠️ LASKU EI OLE NUMEROVÄLI. «1–10» KUULUU kääntyä arabiassa (W3C), mutta
     «5 = 10 : 2» ei: käännettynä ruudulla lukee «2 : 10 = 5». Se ei ole
     asetteluvirhe vaan väärä väite — ja tämä on matikkapeli.

     📐 Mitattu 19.11.2026 JULKAISTULTA ar-sivulta ennen korjausta: 11 laskua,
     joista 3 meni ruudulla matemaattisesti väärin.

     ⚠️ Mitataan SISÄLLÖSTÄ eikä <bdi>-elementeistä. Jos eristys katoaa,
     bdi-elementtejä ei ole lainkaan, ja niiden laskeminen antaisi nollan —
     eli tyhjän läpimenon juuri siitä viasta jota vastaan mitta on.
     Tekstisolmu sen sijaan löytyy kummassakin tapauksessa. */
  var LASKU = /\d+(?:[.,]\d+)?[\u00b2\u00b3]?!?(?:\s[-+\u2013\u2212\u00d7x*\/:=\u00b7]\s\d+(?:[.,]\d+)?[\u00b2\u00b3]?!?)+/g;
  function ilmanValeja(x) { return x.replace(/\s/g, ''); }
  function laskut() {
    var kavelija = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT), s;
    var vaarin = [], maara = 0, piilossa = 0;
    while ((s = kavelija.nextNode())) {
      var vanhempi = s.parentElement;
      if (!vanhempi || /^(script|style)$/i.test(vanhempi.tagName)) continue;
      var r = vanhempi.getBoundingClientRect();
      if (!vanhempi.getClientRects().length) continue;   /* ei ladottu: ei mitattavissa */
      var m; LASKU.lastIndex = 0;
      while ((m = LASKU.exec(s.nodeValue))) {
        /* ⚠️ RUUDUNLUKIJALLE PIILOTETTU TEKSTI EI OLE LÖYDÖS. `.vain-ruudun-
           lukijalle` on leikattu 1x1 pikseliin: kukaan ei NÄE sitä, ja
           ruudunlukija lukee DOMin loogisen järjestyksen, joka on oikein.
           Lasketaan silti erikseen, jotta «0 väärin» ei synny vaikenemalla. */
        if (r.width <= 2 || r.height <= 2) { piilossa++; continue; }
        var nakyi = jarjesta((function () { var l = []; keraaMerkit(s, m.index, m.index + m[0].length, l); return l; })());
        if (!ilmanValeja(nakyi)) continue;
        maara++;
        if (ilmanValeja(nakyi) !== ilmanValeja(m[0]))
          vaarin.push({ lasku: m[0], nakyi: nakyi, n: nimi(vanhempi) });
      }
    }
    return { maara: maara, vaarin: vaarin, piilossa: piilossa };
  }

  /* --- KIRJASIN ------------------------------------------------------------
     Tuleeko arabia JULISTETUSTA perheesta vai laitteen varafontista?

     ⚠️ ALA MITTAA TATA LEVEYKSILLA. Ensimmainen versio vertasi perhetta
     olemattomaan perheeseen, ja se EI toiminut: perheen oma varaketju
     (Teksti -> Arial -> jarjestelma) ja oletusketju paatyvat eri fonttiin,
     joten leveydet erosivat vaikka kumpikaan ei ollut Tajawal. 📐 Mitattu
     19.11.2026: molemmat mutaatiot menivat lapi, eli koe oli tyhja.

     Suora signaali sen sijaan on yksikasitteinen: `document.fonts.load()`
     palauttaa ne @font-face-kasvot jotka TAYSMASIVAT naihin merkkeihin ja
     latautuivat. Tyhja = perheella ei ole arabiaa (tai tiedostoa ei saatu),
     eli glyfit tulevat laitteelta. Lataus on asynkroninen, joten sen tekee
     kutsuja ennen rtlMittaa:ta ja jattaa tuloksen tahan. */
  function kirjasin() {
    var perhe = (doc.defaultView.getComputedStyle(doc.body).fontFamily || '').split(',')[0];
    var kasvot = doc.__arabianKasvot;
    if (kasvot === undefined) return { tila: 'ei mitattavissa', syy: 'latausta ei odotettu' };
    return { tila: kasvot > 0 ? 'perheesta' : 'varafontista',
             perhe: perhe.replace(/["']/g, ''), kasvot: kasvot };
  }

  /* Ohituslinkki: piilotettu pystysuunnassa, joten sen ON palattava näkyviin
     kohdistettaessa. ⚠️ Kolme tilaa, ei kahta: jos dokumentilla ei ole
     järjestelmän fokusta, `:focus` ei ole voimassa eikä asiaa voi mitata —
     silloin on sanottava «ei mitattavissa» eikä «rikki». */
  function ohituslinkki() {
    var el = doc.querySelector('a.ohita');
    if (!el) return { tila: 'ei kohdetta' };
    try { doc.defaultView.focus(); } catch (e) { /* ei väliä */ }
    el.focus();
    if (!doc.hasFocus() || !el.matches(':focus')) return { tila: 'ei mitattavissa' };
    var r = el.getBoundingClientRect();
    var nakyy = r.top > -1 && r.bottom < juuri.clientHeight + 1;
    el.blur();
    return { tila: nakyy ? 'palaa nakyviin' : 'jaa piiloon', y: Math.round(r.top) };
  }

  /* ---- 1) LTR-lahtotila PAKOTETAAN.
     ⚠️ Ala oleta etta sivu alkaa ltr:na. Oikealta vasemmalle kirjoitettavan
     kielen sivu tulee palvelimelta JO rtl-tilassa, ja silloin «mittaa, kaanna,
     vertaa» vertaisi rtl:aa rtl:aan: nolla eroa joka nayttaa taysin samalta
     kuin lapimeno. Mitattu 19.11.2026 keinotekoisella ar-sivulla. */
  var oliSuunta = juuri.getAttribute('data-suunta');
  juuri.setAttribute('data-suunta', 'ltr');
  void doc.body.offsetHeight;
  var a = kuva(), ja = jarjestykset(), la = lavat(), sa = sivuntila();
  // ---- 2) RTL (vain tekstin suunta: attribuutti <html>:ään, kuten rakenna.py tekee)
  juuri.setAttribute('data-suunta', 'rtl');
  void doc.body.offsetHeight;
  var b = kuva(), jb = jarjestykset(), lb = lavat(), sb = sivuntila();
  var sisennys = sisennysVaarin(), tun = tunnisteet(), las = laskut();
  if (oliSuunta === null) juuri.removeAttribute('data-suunta');
  else juuri.setAttribute('data-suunta', oliSuunta);
  void doc.body.offsetHeight;

  // ---- vertailu
  var kartta = {}; b.forEach(function (e) { kartta[e.i] = e; });
  var ulkona = [], ennestaanUlkona = {};
  a.forEach(function (e) { if (e.x < -1 || e.x + e.w > W + 1) ennestaanUlkona[e.i] = 1; });
  b.forEach(function (e) {
    if (ennestaanUlkona[e.i] || e.vierittyva) return;
    if (e.x < -1 || e.x + e.w > W + 1) ulkona.push({ n: e.n, x: e.x, oikea: e.x + e.w });
  });

  var kaantyneet = [];
  Object.keys(ja).forEach(function (k) {
    if (jb[k] && jb[k].jarjestys !== ja[k].jarjestys)
      kaantyneet.push({ n: ja[k].n, ltr: ja[k].jarjestys, rtl: jb[k].jarjestys });
  });

  var lavaSiirtyi = [];
  Object.keys(la).forEach(function (k) {
    var e = la[k], u = lb[k];
    if (!u) { lavaSiirtyi.push({ n: e.n, syy: 'katosi' }); return; }
    if (Math.abs(u.x - e.x) > 2 || Math.abs(u.y - e.y) > 2)
      lavaSiirtyi.push({ n: e.n, dx: u.x - e.x, dy: u.y - e.y });
  });

  /* ⚠️ KESKITYS VOI KADOTA ILMAN ETTÄ YKSIKÄÄN LAATIKKO LIIKKUU. Mitattu
     18.11.2026: lohkon oma `text-align` (`right` tekstisäännössä, `start`
     asettelusäännössä) voittaa tarkkuudella komponentin `center`:in, ja
     laatikkokuva näyttää silti identtiseltä — vain teksti siirtyy laatikon
     sisällä. Siksi tasaus on oma mitta. `start`->`right` on odotettu eikä
     löydös; `center`/`justify` -> jotain muuta on. */
  var tasausMuuttui = [];
  a.forEach(function (e) {
    var u = kartta[e.i];
    if (!u || !/center|justify/.test(e.tasaus) || u.tasaus === e.tasaus) return;
    tasausMuuttui.push({ n: e.n, ltr: e.tasaus, rtl: u.tasaus });
  });

  var tekstiRtl = 0, tekstiYht = 0;
  b.forEach(function (e) {
    if (!/^p($|[#.])/.test(e.n) && !/^li($|[#.])/.test(e.n)) return;
    tekstiYht++;
    if (e.suunta === 'rtl') tekstiRtl++;
  });

  return {
    leveys: W, sivunSuunta: oliSuunta,
    ltr: sa, rtl: sb,
    korkeusKasvoi: sb.korkeus - sa.korkeus,
    ulkona: ulkona.length, ulkonaNaytteet: ulkona.slice(0, 8),
    asetteluKaantyi: kaantyneet.length, kaantyneetNaytteet: kaantyneet.slice(0, 8),
    lavaSiirtyi: lavaSiirtyi.length, lavaNaytteet: lavaSiirtyi.slice(0, 8),
    tasausMuuttui: tasausMuuttui.length, tasausNaytteet: tasausMuuttui.slice(0, 8),
    sisennysVaarin: sisennys.length, sisennysNaytteet: sisennys.slice(0, 8),
    tekstiRtl: tekstiRtl, tekstiYhteensa: tekstiYht,
    ohituslinkki: ohituslinkki(),
    kirjasin: kirjasin(),
    laskut: las,
    tunnisteet: tun
  };
};
