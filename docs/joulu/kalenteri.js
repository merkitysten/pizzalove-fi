/* Pizza Love -joulukalenteri: 24 luukkua pizzatehtaan seinässä.
 *
 * Pulmat tulevat `pulmat.json`:sta, jonka `tyokalut/joulukalenteri.py`
 * kirjoittaa. ⛔ Älä kirjoita pulmia tähän tiedostoon: ne on todennettu
 * generaattorissa (jokainen ratkaisu tarkistetaan eri koodilla kuin millä se
 * löydettiin), ja käsin lisätty pulma jäisi sen tarkistuksen ulkopuolelle.
 *
 * ⚠️ LUUKKUJEN PAIKAT OVAT ENSIMMÄINEN VEDOS. Ne on aseteltu silmällä niin,
 * että pyörä (oikea yläkulma) ja varastopylpyrät (alalaita, joissa on pelin
 * omat numerot 1–10) jäävät vapaaksi — kaksi numerojoukkoa päällekkäin olisi
 * sekava. Siirtäminen on yhden luvun muutos tässä taulukossa.
 */
(function () {
  'use strict';

  /* [x %, y %] laudan kuvasta. Kolme riviä yläosan tehdasmaisemaa. */
  var PAIKAT = [
    [4.5, 11], [13.2, 8.5], [22.6, 12], [31.8, 9],
    [41.2, 11.5], [50.4, 8.5], [59.8, 12], [69.0, 9.5],
    [4.0, 30], [13.0, 33], [22.4, 29], [31.6, 32.5],
    [41.0, 29.5], [50.2, 33], [59.6, 30], [68.8, 32.5],
    [4.5, 50], [13.2, 47], [22.6, 50.5], [31.8, 47.5],
    [41.2, 50], [50.4, 47], [59.8, 50.5], [69.0, 47.5]
  ];

  var AVAIN = 'pizzalove-joulu-2026';
  var tila = { data: null, auki: lueAuki() };

  function lueAuki() {
    try { return JSON.parse(localStorage.getItem(AVAIN)) || []; }
    catch (e) { return []; }          /* yksityinen selaus: ei ole vika */
  }
  function tallennaAuki() {
    try { localStorage.setItem(AVAIN, JSON.stringify(tila.auki)); } catch (e) {}
  }

  /* Luukku aukeaa omana päivänään joulukuussa. Esikatselu avaa kaikki —
   * ilman sitä sivua ei voi katsoa marraskuussa, eli juuri silloin kun se
   * tehdään. */
  function kaikkiAuki() {
    return /[?&]kaikki=1/.test(location.search);
  }
  function avautunut(paiva) {
    if (kaikkiAuki()) return true;
    var n = new Date();
    return n.getMonth() === 11 && n.getDate() >= paiva;
  }

  function sirut(arvot) {
    return '<div class="sirut">' + arvot.map(function (a) {
      var t = tila.data.taytteet[a];
      return '<span class="siru"><span class="pallo" style="background:' +
        t.vari + '"></span>' + t.nimi + ' ' + a + '</span>';
    }).join('') + '</div>';
  }

  function korosta(teksti) {
    return teksti.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  function pulmaHtml(p, i) {
    var osat = [];
    osat.push('<div class="laji">' +
      (p.laji === 'kortti' ? 'Korttipeli' : 'Lautapeli') +
      (p.tapa === 'basso' ? ' · Basson tapa' : '') + '</div>');
    osat.push('<p class="kysymys">' + korosta(p.kysymys) + '</p>');
    if (p.laji === 'kortti') {
      osat.push('<div class="otsake">Pizza</div>' + sirut(p.pizza));
      osat.push('<div class="otsake">Kätesi</div>' + sirut(p.kasi));
    } else {
      osat.push('<div class="otsake">Linjastolla nyt</div>' +
        (p.linjasto.length ? sirut(p.linjasto) : '<p class="kysymys">Linjasto on tyhjä.</p>'));
    }
    osat.push('<button class="nappi" data-ratkaisu="' + i + '">Näytä ratkaisu</button>');
    osat.push('<div class="ratkaisu" id="ratkaisu' + i + '" hidden>' +
      p.ratkaisu + '</div>');
    return osat.join('');
  }

  function avaa(luukku, nappi) {
    var sisus = document.getElementById('arkkiSisus');
    sisus.className = 'arkki__sisus';
    sisus.innerHTML = '<span class="paiva">' + luukku.paiva + '. luukku</span>' +
      luukku.pulmat.map(pulmaHtml).join('<div class="erotin"></div>');
    sisus.querySelectorAll('[data-ratkaisu]').forEach(function (b) {
      b.addEventListener('click', function () {
        var r = document.getElementById('ratkaisu' + b.dataset.ratkaisu);
        r.hidden = !r.hidden;
        b.textContent = r.hidden ? 'Näytä ratkaisu' : 'Piilota ratkaisu';
      });
    });
    document.getElementById('arkki').showModal();
    if (tila.auki.indexOf(luukku.paiva) < 0) {
      tila.auki.push(luukku.paiva);
      tallennaAuki();
      nappi.classList.add('luukku--auki');
      paivitaTila();
    }
  }

  /* ⚠️ «Avattu 2/24» LUKOSSA OLEVAN KALENTERIN YLLA ON VALHE: luvut ovat
     esikatselusta, eika yhtakaan luukkua voi juuri nyt avata. Tila kertoo
     ensin sen mika on totta tanaan. */
  function paivitaTila() {
    var tilarivi = document.getElementById('tila');
    var n = tila.auki.length;
    var mitaan = tila.data.luukut.some(function (l) { return avautunut(l.paiva); });
    if (!mitaan) {
      tilarivi.innerHTML = 'Ensimmäinen luukku avautuu 1. joulukuuta. ' +
        '<a href="?kaikki=1">Esikatsele kaikki</a>';
      return;
    }
    tilarivi.textContent = (kaikkiAuki() ? 'Esikatselu — kaikki luukut auki. ' : '') +
      (n ? 'Avattu ' + n + '/24 luukkua.' : 'Avaa päivän luukku.');
  }

  function piirra() {
    var lauta = document.getElementById('lauta');
    tila.data.luukut.forEach(function (luukku, i) {
      var p = PAIKAT[i];
      var nappi = document.createElement('button');
      nappi.className = 'luukku' + (luukku.pulmat.length > 1 ? ' luukku--tupla' : '');
      nappi.style.left = p[0] + '%';
      nappi.style.top = p[1] + '%';
      nappi.textContent = luukku.paiva;
      nappi.setAttribute('aria-label', luukku.paiva + '. luukku' +
        (luukku.pulmat.length > 1 ? ', kaksi pulmaa' : ''));
      if (!avautunut(luukku.paiva)) {
        nappi.classList.add('luukku--lukossa');
        nappi.disabled = true;
        nappi.title = luukku.paiva + '. joulukuuta';
      } else {
        if (tila.auki.indexOf(luukku.paiva) >= 0) nappi.classList.add('luukku--auki');
        nappi.addEventListener('click', function () { avaa(luukku, nappi); });
      }
      lauta.appendChild(nappi);
    });
    paivitaTila();
  }

  /* Pulmat tulevat `pulmat.js`:sta (window.PULMAT), eivat fetchilla:
     file://-osoitteessa fetch epaonnistuu, ja sivu on tarkoitus voida avata
     myos suoraan tiedostosta. */
  if (window.PULMAT) {
    tila.data = window.PULMAT;
    piirra();
  } else {
    document.getElementById('tila').textContent =
      'Pulmia ei löytynyt (pulmat.js puuttuu).';
  }
})();
