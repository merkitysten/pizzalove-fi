// ===== PIZZA PARTY: KOPIO NORSUSTA =====
//
// ⚠️ TÄMÄN OTSIKON ALLA OLEVA ON MUUTTAMATON KOPIO tiedostosta
// norsu-site/js/qr.js (commit 2dc209a, 4.9.2026). Pizza Party ja Norsu
// ladataan eri palvelimille, joten tiedostoa ei voi jakaa — mutta kaksi
// kopiota ajautuu erilleen ellei sitä mitata. Vertailu:
//
//   diff <(tail -n +14 pizzaparty/qr.js) norsu-site/js/qr.js
//
// Pizza Partyssa kuvio on liittymislinkki (`pelaa.html?koodi=1234`),
// tuotannossa 70 tavua → versio 5. Alla mainittu raja 6 on 106 tavua.
// Luettavuus mitataan selaimen omalla lukijalla: testit/qrkoe.html.
//
// ===== NORSU QR =====
//
// Vain se mitä kättely tarvitsee: TAVUTILA, virheenkorjaustaso M,
// versiot 1-6 (21x21 - 41x41). Norsussa ei ole ulkoisia kirjastoja,
// joten tämä on kirjoitettu itse — ja siksi se on rajattu tarkoituksella.
//
// ⚠️ VERSIORAJA 6 ON VALINTA, EI PUUTE. Versiosta 7 alkaen QR vaatii
// erillisen versiotietolohkon (18 bittiä, oma BCH-koodinsa) jota tämä ei
// osaa. Kättelyosoite on ~53 tavua ja mahtuu versioon 4 (62 tavua), joten
// rajaa ei voi saavuttaa vahingossa — ja jos se saavutetaan, funktio
// heittää sen sijaan että piirtäisi kuvion jota mikään ei lue.
//
// Skanneria EI ole eikä tarvita: iPhonen ja Androidin oma kamera lukee
// QR:n natiivisti ja tarjoaa linkin avaamista. Ks. memory/kattely.md.

// --- GF(256), primitiivipolynomi 0x11D (QR:n oma) ---
var QR_EXP = new Uint8Array(512);
var QR_LOG = new Uint8Array(256);
(function () {
  var x = 1;
  for (var i = 0; i < 255; i++) {
    QR_EXP[i] = x;
    QR_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11D;
  }
  for (var j = 255; j < 512; j++) QR_EXP[j] = QR_EXP[j - 255];
})();

function qrKerro(a, b) {
  if (a === 0 || b === 0) return 0;
  return QR_EXP[QR_LOG[a] + QR_LOG[b]];
}

// Reed-Solomon-generaattoripolynomi asteelle n.
function qrGeneraattori(n) {
  var g = [1];
  for (var i = 0; i < n; i++) {
    var uusi = new Array(g.length + 1).fill(0);
    for (var j = 0; j < g.length; j++) {
      uusi[j] ^= qrKerro(g[j], 1);
      uusi[j + 1] ^= qrKerro(g[j], QR_EXP[i]);
    }
    g = uusi;
  }
  return g;
}

// Lohkon virheenkorjaussanat.
function qrEcSanat(data, ecMaara) {
  var g = qrGeneraattori(ecMaara);
  var jaannos = new Array(data.length + ecMaara).fill(0);
  for (var i = 0; i < data.length; i++) jaannos[i] = data[i];
  for (var k = 0; k < data.length; k++) {
    var kerroin = jaannos[k];
    if (kerroin === 0) continue;
    for (var j = 0; j < g.length; j++) {
      jaannos[k + j] ^= qrKerro(g[j], kerroin);
    }
  }
  return jaannos.slice(data.length);
}

// --- Versiotaulukko, taso M ---
// [kokonaissanat, ec/lohko, lohkoja1, data/lohko1, lohkoja2, data/lohko2]
var QR_M = {
  1: [26, 10, 1, 16, 0, 0],
  2: [44, 16, 1, 28, 0, 0],
  3: [70, 26, 1, 44, 0, 0],
  4: [100, 18, 2, 32, 0, 0],
  5: [134, 24, 2, 43, 0, 0],
  6: [172, 16, 4, 27, 0, 0]
};

// Kohdistuskuvioiden keskipisteet. Versiolla 1 ei ole yhtään.
var QR_KOHDISTUS = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34] };

function qrDataSanat(v) {
  var t = QR_M[v];
  return t[2] * t[3] + t[4] * t[5];
}

// --- Teksti tavuiksi (UTF-8) ---
function qrTavut(teksti) {
  var ulos = [];
  for (var i = 0; i < teksti.length; i++) {
    var c = teksti.charCodeAt(i);
    if (c < 0x80) { ulos.push(c); }
    else if (c < 0x800) {
      ulos.push(0xC0 | (c >> 6), 0x80 | (c & 63));
    } else if (c >= 0xD800 && c <= 0xDBFF && i + 1 < teksti.length) {
      var lo = teksti.charCodeAt(i + 1);
      var p = 0x10000 + ((c - 0xD800) << 10) + (lo - 0xDC00);
      i++;
      ulos.push(0xF0 | (p >> 18), 0x80 | ((p >> 12) & 63),
                0x80 | ((p >> 6) & 63), 0x80 | (p & 63));
    } else {
      ulos.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
  }
  return ulos;
}

// --- Bittijono ---
function qrBitit() {
  return { b: [], lisaa: function (arvo, pituus) {
    for (var i = pituus - 1; i >= 0; i--) this.b.push((arvo >> i) & 1);
  } };
}

// --- Koodisanat: tila, pituus, data, täyte, lohkot, lomitus ---
function qrKoodisanat(teksti) {
  var tavut = qrTavut(teksti);
  var v = 0;
  for (var k = 1; k <= 6; k++) {
    // 4 bittiä tila + 8 bittiä pituus + data
    if (4 + 8 + tavut.length * 8 <= qrDataSanat(k) * 8) { v = k; break; }
  }
  if (!v) {
    throw new Error('QR: teksti ei mahdu versioon 6 (' + tavut.length + ' tavua, katto '
                    + (qrDataSanat(6) - 2) + ').');
  }

  var bitit = qrBitit();
  bitit.lisaa(0x4, 4);                 // tavutila
  bitit.lisaa(tavut.length, 8);        // pituus (versiot 1-9: 8 bittiä)
  for (var i = 0; i < tavut.length; i++) bitit.lisaa(tavut[i], 8);

  var kapasiteetti = qrDataSanat(v) * 8;
  var lopetin = Math.min(4, kapasiteetti - bitit.b.length);
  bitit.lisaa(0, lopetin);
  while (bitit.b.length % 8 !== 0) bitit.b.push(0);

  var sanat = [];
  for (var j = 0; j < bitit.b.length; j += 8) {
    var t = 0;
    for (var m = 0; m < 8; m++) t = (t << 1) | bitit.b[j + m];
    sanat.push(t);
  }
  var taytteet = [0xEC, 0x11], p = 0;
  while (sanat.length < qrDataSanat(v)) sanat.push(taytteet[p++ % 2]);

  // Lohkoihin
  var tt = QR_M[v], ecMaara = tt[1];
  var lohkot = [], ecLohkot = [], sij = 0;
  var ryhmat = [[tt[2], tt[3]], [tt[4], tt[5]]];
  for (var r = 0; r < 2; r++) {
    for (var b = 0; b < ryhmat[r][0]; b++) {
      var pala = sanat.slice(sij, sij + ryhmat[r][1]);
      sij += ryhmat[r][1];
      lohkot.push(pala);
      ecLohkot.push(qrEcSanat(pala, ecMaara));
    }
  }

  // Lomitus: sarake kerrallaan, ensin data, sitten ec
  var ulos = [], pisin = 0, e;
  for (e = 0; e < lohkot.length; e++) pisin = Math.max(pisin, lohkot[e].length);
  for (var c = 0; c < pisin; c++) {
    for (e = 0; e < lohkot.length; e++) {
      if (c < lohkot[e].length) ulos.push(lohkot[e][c]);
    }
  }
  for (var c2 = 0; c2 < ecMaara; c2++) {
    for (e = 0; e < ecLohkot.length; e++) ulos.push(ecLohkot[e][c2]);
  }
  return { versio: v, sanat: ulos };
}

// --- Matriisi ---
function qrTyhja(koko) {
  var m = [];
  for (var i = 0; i < koko; i++) m.push(new Int8Array(koko).fill(-1));
  return m;
}

function qrEtsinta(m, r, c) {
  for (var i = -1; i <= 7; i++) {
    for (var j = -1; j <= 7; j++) {
      var y = r + i, x = c + j;
      if (y < 0 || x < 0 || y >= m.length || x >= m.length) continue;
      var reuna = (i === -1 || i === 7 || j === -1 || j === 7);
      var kehys = (i === 0 || i === 6 || j === 0 || j === 6);
      var ydin = (i >= 2 && i <= 4 && j >= 2 && j <= 4);
      m[y][x] = reuna ? 0 : (kehys || ydin) ? 1 : 0;
    }
  }
}

function qrRunko(versio) {
  var koko = 21 + 4 * (versio - 1);
  var m = qrTyhja(koko);

  qrEtsinta(m, 0, 0);
  qrEtsinta(m, 0, koko - 7);
  qrEtsinta(m, koko - 7, 0);

  // Ajastinviivat
  for (var i = 8; i < koko - 8; i++) {
    var v = (i % 2 === 0) ? 1 : 0;
    if (m[6][i] === -1) m[6][i] = v;
    if (m[i][6] === -1) m[i][6] = v;
  }

  // Kohdistuskuviot — ei etsintäkuvioiden päälle
  var k = QR_KOHDISTUS[versio];
  for (var a = 0; a < k.length; a++) {
    for (var b = 0; b < k.length; b++) {
      var r = k[a], c = k[b];
      if ((r === 6 && c === 6) || (r === 6 && c === koko - 7) || (r === koko - 7 && c === 6)) continue;
      for (var dy = -2; dy <= 2; dy++) {
        for (var dx = -2; dx <= 2; dx++) {
          var reuna = (Math.abs(dy) === 2 || Math.abs(dx) === 2);
          m[r + dy][c + dx] = (reuna || (dy === 0 && dx === 0)) ? 1 : 0;
        }
      }
    }
  }

  // Tumma moduuli
  m[koko - 8][8] = 1;

  // Muototiedon paikat varataan (arvo asetetaan vasta maskin valinnan jälkeen)
  for (var f = 0; f <= 8; f++) {
    if (m[8][f] === -1) m[8][f] = 2;
    if (m[f][8] === -1) m[f][8] = 2;
  }
  for (var g = 0; g < 8; g++) {
    if (m[8][koko - 1 - g] === -1) m[8][koko - 1 - g] = 2;
    if (m[koko - 1 - g][8] === -1) m[koko - 1 - g][8] = 2;
  }
  return m;
}

// Data siksakkina oikeasta alakulmasta, ohittaen toimintomoduulit.
function qrSijoita(m, sanat) {
  var koko = m.length, suunta = -1, rivi = koko - 1, bitti = 0;
  var kaikki = [];
  for (var i = 0; i < sanat.length; i++) {
    for (var j = 7; j >= 0; j--) kaikki.push((sanat[i] >> j) & 1);
  }
  for (var sar = koko - 1; sar > 0; sar -= 2) {
    if (sar === 6) sar--;   // ajastinsarake ohitetaan kokonaan
    while (true) {
      for (var d = 0; d < 2; d++) {
        var x = sar - d;
        if (m[rivi][x] === -1) {
          m[rivi][x] = (bitti < kaikki.length) ? kaikki[bitti] : 0;
          bitti++;
        }
      }
      rivi += suunta;
      if (rivi < 0 || rivi >= koko) { rivi -= suunta; suunta = -suunta; break; }
    }
  }
}

var QR_MASKIT = [
  function (r, c) { return (r + c) % 2 === 0; },
  function (r) { return r % 2 === 0; },
  function (r, c) { return c % 3 === 0; },
  function (r, c) { return (r + c) % 3 === 0; },
  function (r, c) { return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; },
  function (r, c) { return ((r * c) % 2) + ((r * c) % 3) === 0; },
  function (r, c) { return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0; },
  function (r, c) { return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0; }
];

function qrSakko(m) {
  var koko = m.length, sakko = 0, r, c, i;

  // 1: viisi tai useampi samaa peräkkäin
  for (r = 0; r < koko; r++) {
    for (var suunta = 0; suunta < 2; suunta++) {
      var edell = -1, putki = 0;
      for (c = 0; c < koko; c++) {
        var arvo = suunta === 0 ? m[r][c] : m[c][r];
        if (arvo === edell) { putki++; }
        else { if (putki >= 5) sakko += 3 + (putki - 5); edell = arvo; putki = 1; }
      }
      if (putki >= 5) sakko += 3 + (putki - 5);
    }
  }

  // 2: 2x2 samaa
  for (r = 0; r < koko - 1; r++) {
    for (c = 0; c < koko - 1; c++) {
      var a = m[r][c];
      if (a === m[r][c + 1] && a === m[r + 1][c] && a === m[r + 1][c + 1]) sakko += 3;
    }
  }

  // 3: etsintäkuvion kaltainen jakso
  var kuvio1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  var kuvio2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  for (r = 0; r < koko; r++) {
    for (c = 0; c + 11 <= koko; c++) {
      var vaaka, pysty;
      for (var kk = 0; kk < 2; kk++) {
        var kuv = kk === 0 ? kuvio1 : kuvio2;
        vaaka = true; pysty = true;
        for (i = 0; i < 11; i++) {
          if (m[r][c + i] !== kuv[i]) vaaka = false;
          if (m[c + i][r] !== kuv[i]) pysty = false;
        }
        if (vaaka) sakko += 40;
        if (pysty) sakko += 40;
      }
    }
  }

  // 4: tummien osuus
  var tummia = 0;
  for (r = 0; r < koko; r++) for (c = 0; c < koko; c++) if (m[r][c] === 1) tummia++;
  var osuus = (tummia * 100) / (koko * koko);
  sakko += Math.floor(Math.abs(osuus - 50) / 5) * 10;
  return sakko;
}

// Muototieto: taso M (00) + maski, BCH(15,5), XOR 0x5412.
function qrMuototieto(maski) {
  var data = (0x00 << 3) | maski;
  var v = data << 10;
  for (var i = 4; i >= 0; i--) {
    if ((v >> (i + 10)) & 1) v ^= 0x537 << i;
  }
  return ((data << 10) | v) ^ 0x5412;
}

// ⚠️ RIVI JA SARAKE MENEVAT TASSA HELPOSTI VAARINPAIN, ja se maksoi
// ensimmaisen ajon: kaikki kuusi tapausta epaonnistuivat identtisesti
// (`luettu: null`), koska muototieto oli transponoitu. Muototieto kertoo
// lukijalle TASON ja MASKIN — vaarassa paikassa mikaan ei lukeudu, vaikka
// data olisi taydellinen. Oire ei siis osoita dataan vaan tanne.
//
// Ensimmainen kopio: sarake 8 ylhaalta (bitit 0-5), sitten rivi 8.
// Toinen kopio: rivi 8 oikealta (bitit 0-7), sitten sarake 8 alhaalta.
function qrAsetaMuoto(m, maski) {
  var koko = m.length, bitit = qrMuototieto(maski), i;
  for (i = 0; i <= 5; i++) m[i][8] = (bitit >> i) & 1;
  m[7][8] = (bitit >> 6) & 1;
  m[8][8] = (bitit >> 7) & 1;
  m[8][7] = (bitit >> 8) & 1;
  for (i = 9; i <= 14; i++) m[8][14 - i] = (bitit >> i) & 1;

  for (i = 0; i <= 7; i++) m[8][koko - 1 - i] = (bitit >> i) & 1;
  for (i = 8; i <= 14; i++) m[koko - 15 + i][8] = (bitit >> i) & 1;
  m[koko - 8][8] = 1;   // tumma moduuli — ei osa muototietoa
}

/**
 * Teksti -> QR-matriisi. Palauttaa { koko, moduulit } jossa moduulit on
 * taulukko riveistä (1 = tumma).
 */
function norsuQrMatriisi(teksti) {
  var k = qrKoodisanat(teksti);
  var runko = qrRunko(k.versio);

  // Varatut paikat (2) pois ennen datan sijoitusta, mutta muistiin.
  var koko = runko.length, r, c;
  var varattu = [];
  for (r = 0; r < koko; r++) {
    varattu.push(new Int8Array(koko));
    for (c = 0; c < koko; c++) {
      varattu[r][c] = (runko[r][c] === -1) ? 0 : 1;
      if (runko[r][c] === 2) runko[r][c] = 0;
    }
  }

  var pohja = [];
  for (r = 0; r < koko; r++) pohja.push(Int8Array.from(runko[r]));
  // qrSijoita tarvitsee -1:t; palautetaan ne datapaikkoihin
  for (r = 0; r < koko; r++) for (c = 0; c < koko; c++) if (!varattu[r][c]) pohja[r][c] = -1;
  qrSijoita(pohja, k.sanat);

  var paras = null, parasSakko = Infinity;
  for (var maski = 0; maski < 8; maski++) {
    var yritys = [];
    for (r = 0; r < koko; r++) {
      yritys.push(Int8Array.from(pohja[r]));
      for (c = 0; c < koko; c++) {
        if (!varattu[r][c] && QR_MASKIT[maski](r, c)) yritys[r][c] ^= 1;
      }
    }
    qrAsetaMuoto(yritys, maski);
    var s = qrSakko(yritys);
    if (s < parasSakko) { parasSakko = s; paras = yritys; }
  }
  return { koko: koko, versio: k.versio, moduulit: paras };
}

/**
 * Teksti -> SVG-merkkijono. Hiljainen reunus on OSA standardia (4 moduulia)
 * eikä koristelua: ilman sitä moni lukija ei löydä kuviota lainkaan.
 */
function norsuQrSvg(teksti, asetukset) {
  var a = asetukset || {};
  var reunus = (a.reunus === undefined) ? 4 : a.reunus;
  var tumma = a.tumma || '#000000';
  var vaalea = a.vaalea || '#ffffff';
  var q = norsuQrMatriisi(teksti);
  var kok = q.koko + reunus * 2;

  var polku = '';
  for (var r = 0; r < q.koko; r++) {
    for (var c = 0; c < q.koko; c++) {
      if (q.moduulit[r][c] === 1) {
        polku += 'M' + (c + reunus) + ' ' + (r + reunus) + 'h1v1h-1z';
      }
    }
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + kok + ' ' + kok + '"'
       + ' shape-rendering="crispEdges" role="img" aria-label="' + (a.kuvaus || 'QR-koodi') + '">'
       + '<rect width="' + kok + '" height="' + kok + '" fill="' + vaalea + '"/>'
       + '<path fill="' + tumma + '" d="' + polku + '"/></svg>';
}
