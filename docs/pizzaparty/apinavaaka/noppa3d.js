/* Merkitysten-noppa kolmiulotteisena: 10-tahkoinen (viisikulmainen trapetsoedri).
 * Jokainen tahko on nopan oikea tahkokuva (noppa/1.svg … 10.svg), joka asetetaan
 * paikalleen CSS 3D -muunnoksella. Ei kirjastoja.
 *
 *   var n = Noppa3D(elementti, kuvakansio);
 *   n.odota();               // pyörii hitaasti ja kutsuu heittämään
 *   n.heita(7, valmis);      // pyörii, hidastuu ja pysähtyy tahko 7 edessä
 */
window.Noppa3D = function (juuri, kansio) {
  'use strict';
  var R = 32;                       // vyön säde px
  var Z0 = 0.098;                   // vyön korkeus suhteessa säteeseen (sovitettu tahkokuvan mittoihin)
  // Tahkokuvan (SVG viewBox 29.76 × 37.42) kärkipisteet: kärki, vasen ja oikea kulma.
  var KUVA = { w: 29.7638, h: 37.4173, karki: [14.76, 1.44], vasen: [0.9, 29.0], oikea: [28.6, 29.0] };
  // Lukujen paikat: ylemmät tahkot k = 0…4, alemmat k = 0…4.
  var YLA = [1, 3, 5, 7, 9], ALA = [10, 4, 8, 2, 6];

  // ---------------------------------------------------------- vektorit
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function mul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { var l = Math.sqrt(dot(a, a)); return mul(a, 1 / l); }
  // 3×3-matriisit rivi kerrallaan
  function mm(A, B) {
    var C = [];
    for (var i = 0; i < 3; i++) { C.push([]); for (var j = 0; j < 3; j++) C[i].push(A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j]); }
    return C;
  }
  function mv(A, v) { return [dot(A[0], v), dot(A[1], v), dot(A[2], v)]; }
  function kierto(akseli, k) {           // Rodrigues
    var a = norm(akseli), x = a[0], y = a[1], z = a[2], c = Math.cos(k), s = Math.sin(k), t = 1 - c;
    return [[t * x * x + c, t * x * y - s * z, t * x * z + s * y],
            [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
            [t * x * z - s * y, t * y * z + s * x, t * z * z + c]];
  }
  function css(M) {                      // matrix3d on sarakkeittain
    return 'matrix3d(' + [M[0][0], M[1][0], M[2][0], 0, M[0][1], M[1][1], M[2][1], 0,
      M[0][2], M[1][2], M[2][2], 0, 0, 0, 0, 1].map(function (x) { return x.toFixed(5); }).join(',') + ')';
  }

  // ---------------------------------------------------------- geometria
  // Koordinaatit CSS-suunnissa: x oikealle, y alas, z katsojaa kohti.
  function p(x, y, z) { return [x * R, -y * R, z * R]; }
  var rad = Math.PI / 180, U = [], L = [];
  for (var k = 0; k < 5; k++) {
    U.push(p(Math.cos(72 * k * rad), Z0, Math.sin(72 * k * rad)));
    L.push(p(Math.cos((72 * k + 36) * rad), -Z0, Math.sin((72 * k + 36) * rad)));
  }
  // napojen korkeus niin, että tahkot ovat tasoja
  var n0 = cross(sub(U[1], U[0]), sub(L[0], U[0]));
  var HN = dot(U[0], n0) / n0[1];
  var N = [0, HN, 0], S = [0, -HN, 0];

  var tahkot = [];   // { luku, kulmat: [kärki, vasen, oikea, alakulma] }
  for (k = 0; k < 5; k++) {
    tahkot.push({ luku: YLA[k], karki: N, a: U[k], b: U[(k + 1) % 5], pohja: L[k] });
    tahkot.push({ luku: ALA[k], karki: S, a: L[k], b: L[(k + 1) % 5], pohja: U[(k + 1) % 5] });
  }

  // ---------------------------------------------------------- DOM
  juuri.innerHTML = '';
  juuri.classList.add('n3d');
  var kappale = document.createElement('div');
  kappale.className = 'n3d__kappale';
  juuri.appendChild(kappale);
  // varjo pöydällä nopan alla
  var varjo = document.createElement('div');
  varjo.className = 'n3d__varjo';
  juuri.insertBefore(varjo, kappale);

  var VALO = norm([0, -0.375, 0.927]);   // valo edestä: lopputulostahko on kirkkain

  tahkot.forEach(function (f) {
    var keski = mul(add(add(f.karki, f.pohja), add(f.a, f.b)), 0.25);
    // vasen/oikea niin, että kuvan etupuoli osoittaa ulospäin
    var vas = f.a, oik = f.b;
    var eu = mul(sub(oik, vas), 1 / (KUVA.oikea[0] - KUVA.vasen[0]));
    var ev = mul(sub(f.karki, add(vas, mul(eu, KUVA.karki[0] - KUVA.vasen[0]))), 1 / (KUVA.karki[1] - KUVA.vasen[1]));
    if (dot(cross(eu, ev), keski) < 0) {
      vas = f.b; oik = f.a;
      eu = mul(sub(oik, vas), 1 / (KUVA.oikea[0] - KUVA.vasen[0]));
      ev = mul(sub(f.karki, add(vas, mul(eu, KUVA.karki[0] - KUVA.vasen[0]))), 1 / (KUVA.karki[1] - KUVA.vasen[1]));
    }
    var O = sub(sub(vas, mul(eu, KUVA.vasen[0])), mul(ev, KUVA.vasen[1]));
    var n = norm(cross(eu, ev));
    // tahkot hieman suuremmiksi, jotta pyöristetyt kulmat eivät jätä rakoja
    var S2 = 1.03, K = keski, TARKKUUS = 5;   // kuva piirretään 5× isompana, jotta reunat pysyvät terävinä
    eu = mul(eu, S2); ev = mul(ev, S2); O = add(K, mul(sub(O, K), S2));
    var img = document.createElement('img');
    img.src = kansio + f.luku + '.svg';
    img.alt = ''; img.draggable = false;
    img.className = 'n3d__tahko';
    img.style.width = KUVA.w * TARKKUUS + 'px'; img.style.height = KUVA.h * TARKKUUS + 'px';
    var eu2 = mul(eu, 1 / TARKKUUS), ev2 = mul(ev, 1 / TARKKUUS);
    img.style.transform = 'matrix3d(' + [eu2[0], eu2[1], eu2[2], 0, ev2[0], ev2[1], ev2[2], 0, n[0], n[1], n[2], 0, O[0], O[1], O[2], 1]
      .map(function (x) { return x.toFixed(4); }).join(',') + ')';
    kappale.appendChild(img);
    f.img = img; f.n = n;
    f.ylos = norm(mul(ev, -1));            // kuvan "ylös" kolmiulotteisena
  });

  // asento, jossa luku on edessä ja pystyssä
  function asento(luku) {
    var f = tahkot.filter(function (x) { return x.luku === luku; })[0];
    var n = f.n, y = norm(sub(f.ylos, mul(n, dot(f.ylos, n))));
    var o = mul(cross(y, n), -1);
    var Sr = [o, y, n];                    // lähde (rivit)
    var T = [[1, 0, 0], [0, -1, 0], [0, 0, 1]];  // kohde-oikea, -ylös, -normaali
    // R = T^T · S  (rivivektorimuodossa: R = sum_i t_i ⊗ s_i)
    var Rm = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (var i = 0; i < 3; i++) for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) Rm[r][c] += T[i][r] * Sr[i][c];
    // pieni kallistus, jotta naapuritahkot näkyvät ja noppa näyttää kappaleelta
    return mm(mm(kierto([1, 0, 0], 22 * rad), kierto([0, 1, 0], 0 * rad)), Rm);
  }

  var M = asento(1), anim = null;
  function aseta(Mx, nousu) {
    kappale.style.transform = 'translateY(' + (nousu || 0).toFixed(1) + 'px) ' + css(Mx);
    var k = Math.max(0.45, 1 + (nousu || 0) / 30);
    varjo.style.transform = 'translateX(-50%) scale(' + k.toFixed(3) + ')';
    varjo.style.opacity = (0.15 + 0.35 * k).toFixed(3);
    tahkot.forEach(function (f) {
      var nn = mv(Mx, f.n);
      var v = Math.max(0, dot(nn, VALO));
      f.img.style.filter = 'brightness(' + (0.52 + 0.5 * Math.pow(v, 1.5)).toFixed(3) + ')';
    });
  }
  function seis() { if (anim) cancelAnimationFrame(anim); anim = null; }

  function odota() {
    seis();
    var alku = performance.now(), M0 = asento(1);
    (function kehys(nyt) {
      var t = (nyt - alku) / 1000;
      var Mx = mm(kierto([0.25, 1, 0.1], t * 1.1), M0);
      M = Mx; aseta(Mx, Math.sin(t * 2.4) * 2);
      anim = requestAnimationFrame(kehys);
    })(alku);
  }

  function heita(luku, valmis, vahennaLiike) {
    seis();
    var loppu = asento(luku);
    if (vahennaLiike) { M = loppu; aseta(loppu); if (valmis) valmis(); return; }
    var a1 = norm([Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5]);
    var a2 = norm([Math.random() - 0.5, 1, Math.random() - 0.5]);
    var k1 = (3 + Math.random()) * 2 * Math.PI, k2 = (1 + Math.random()) * 2 * Math.PI;
    var kesto = 1300, alku = performance.now();
    (function kehys(nyt) {
      var x = Math.min(1, (nyt - alku) / kesto);
      var e = 1 - Math.pow(1 - x, 3);                   // hidastuu loppua kohti
      var Mx = mm(mm(kierto(a1, k1 * (1 - e)), kierto(a2, k2 * (1 - e))), loppu);
      var nousu = -Math.abs(Math.sin(x * Math.PI * 2.5)) * 14 * (1 - x);   // pomppii
      M = Mx; aseta(Mx, nousu);
      if (x < 1) anim = requestAnimationFrame(kehys);
      else { anim = null; if (valmis) valmis(); }
    })(alku);
  }

  aseta(M);
  return { odota: odota, heita: heita, seis: seis };
};
