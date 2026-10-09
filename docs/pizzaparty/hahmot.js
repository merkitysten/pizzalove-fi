/* Pizza Love — HAHMO, VÄRI JA NIMI kaikille pelimuodoille (9.10.2026).
 *
 * 🔵 Marko 9.10.2026: «Sekä pizza party että pizza basso pitäisi löytyä
 * samasta paikasta, että käyttäjä voisi vaihtaa peliä lennosta.» Siksi hahmo
 * on PELAAJAN eikä pelimuodon: sama väri ja nimi Partyssa ja Bassossa.
 * Siirretty basso.js:stä, jossa se syntyi 6.–7.10.2026 (Markon päätökset
 * siellä: «kaikilla pelaajilla olisi sekä hahmo että väri», «mikä tahansa
 * väri 10 eri merkitysten väristä», «Pelaajat haluaisivat myös nimetä omat
 * hahmot»).
 *
 * Ladataan kortit.js:n JÄLKEEN (värit ovat sen TAYTTEET-taulukossa) ja ennen
 * pelin omaa koodia. Ei koske DOMiin latauksessa.
 *
 * ⚠️ Värit tallennetaan NUMEROINA 1–10, koska numero on Merkitysten
 * järjestelmässä värin nimi. Muistissa on AINA neljä eri väriä ja neljä nimeä
 * (tyhjä = ei nimeä): peli käyttää niistä niin monta kuin sillä on ihmisiä.
 * Ennen jokainen peli lyhensi listaa omaan ihmismääräänsä, jolloin toisen pelin
 * kolmannen pelaajan väri olisi kadonnut. */

const HAHMO_ASETUSAVAIN = 'pizzapeli-hahmot';
const HAHMOJA_ENINTAAN = 4;
const HAHMO_NIMI_ENINTAAN = 16;      // sama raja kuin verkkopelin nimessä
/* Apinat ja täydennys saavat erottuvat värit tässä järjestyksessä. Neljä
 * ensimmäistä ovat Partyn vanhat moninpelin värit. */
const HAHMO_APINAVARIT = [2, 4, 7, 6, 1, 10, 9, 8, 3, 5];

const hahmoAsetukset = { variNrot: [], nimet: [] };

function hahmoSiistiNimi(s) {
  return String(s || '').replace(/\s+/g, ' ').trim().slice(0, HAHMO_NIMI_ENINTAAN);
}

function hahmoVari(nro) {
  const x = TAYTTEET.filter(function (t) { return t.arvo === nro; })[0];
  return x ? x.vari : null;
}

/* Neljä eri väriä ja neljä nimeä aina. Puuttuvat apinoiden järjestyksestä. */
function hahmoTaydenna() {
  const a = hahmoAsetukset;
  a.variNrot = a.variNrot.filter(function (n, i, l) { return hahmoVari(n) && l.indexOf(n) === i; })
    .slice(0, HAHMOJA_ENINTAAN);
  HAHMO_APINAVARIT.forEach(function (n) {
    if (a.variNrot.length < HAHMOJA_ENINTAAN && a.variNrot.indexOf(n) < 0) a.variNrot.push(n);
  });
  a.nimet = a.nimet.slice(0, HAHMOJA_ENINTAAN).map(hahmoSiistiNimi);
  while (a.nimet.length < HAHMOJA_ENINTAAN) a.nimet.push('');
}

function hahmoLataa() {
  let a = null;
  try { a = JSON.parse(localStorage.getItem(HAHMO_ASETUSAVAIN) || 'null'); } catch (e) { a = null; }
  if (!a) {
    /* SIIRTYMÄ (9.10.2026): ennen hahmo tallentui Basson omiin asetuksiin.
     * Luetaan sieltä kerran, jotta jo valittu väri ja nimi säilyvät. */
    let b = null;
    try { b = JSON.parse(localStorage.getItem('pizzabasso-asetukset') || 'null'); } catch (e) { b = null; }
    a = {};
    if (b) {
      if (Array.isArray(b.variNrot)) a.variNrot = b.variNrot;
      else if (hahmoVari(b.variNro)) a.variNrot = [b.variNro];
      if (Array.isArray(b.nimet)) a.nimet = b.nimet;
    }
  }
  hahmoAsetukset.variNrot = Array.isArray(a.variNrot) ? a.variNrot.slice() : [];
  hahmoAsetukset.nimet = Array.isArray(a.nimet) ? a.nimet.slice() : [];
  hahmoTaydenna();
}

function hahmoTallenna() {
  try { localStorage.setItem(HAHMO_ASETUSAVAIN, JSON.stringify(hahmoAsetukset)); }
  catch (e) { /* yksityinen selaus: hahmo jää muistiin vain istunnoksi */ }
}

/* Värit pelaajajärjestyksessä. `lajit` = ['ihminen' | 'apina', …].
 * Ihmiset saavat omansa järjestyksessä, apinat muista. */
function hahmoVarit(lajit) {
  const omat = hahmoAsetukset.variNrot;
  const ihmisia = lajit.filter(function (l) { return l === 'ihminen'; }).length;
  const kaytossa = omat.slice(0, ihmisia);
  const muut = HAHMO_APINAVARIT.filter(function (n) { return kaytossa.indexOf(n) < 0; });
  let h = 0, a = 0;
  return lajit.map(function (l) {
    if (l === 'ihminen' && h < omat.length) return hahmoVari(omat[h++]);
    return hahmoVari(muut[(a++) % muut.length]);
  });
}

/* Valkoinen numero katoaa keltaiselle, turkoosille ja vaaleanpunaiselle.
 * Teksti valitaan taustan suhteellisesta luminanssista (WCAG-kaava). */
function hahmoTekstiVari(hex) {
  const c = [1, 3, 5].map(function (i) {
    const v = parseInt(hex.substr(i, 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  /* Kontrasti valkoiseen vs. mustaan (#1A1A1A, L ≈ 0,010): valitaan suurempi. */
  return (1.05 / (L + 0.05)) >= ((L + 0.05) / 0.06) ? '#fff' : '#1A1A1A';
}

/* Hahmo värillisellä pohjalla — sama kaikkialla: pelissä, pallilla, radalla,
 * asetuksissa ja juhlassa. */
function hahmoKuva(vari, luokka) {
  return '<span class="hahmo' + (luokka ? ' ' + luokka : '') + '" style="--pelaaja-vari:' + vari +
    '"><img src="kuvat/apina.webp?v=20260910a" alt=""></span>';
}

/* VOITTAJA: sama hahmo omalla värillään, mutta pizza suussa (Marko 7.10.2026:
 * «koska minä voitin, niin minulla on pizzaa suussa»). Kuva on pizzalove.fi:n
 * basso-syo.webp maskikehyksessä: ympyrä rajaa sivut ja alaosan, tukka nousee
 * yli (rajaus: yhteinen.css). */
function hahmoSyoKuva(vari, luokka) {
  return '<span class="hahmo syo' + (luokka ? ' ' + luokka : '') + '" style="--pelaaja-vari:' + vari +
    '"><span class="syo-kehys"><img src="kuvat/basso-syo.webp?v=20261006a" alt=""></span></span>';
}

/* ---------- asetussivu «Hahmo» (sama molemmissa peleissä) ----------
 * Sivulla: #hahmoVariKuka (kenen hahmo, kun ihmisiä on useampi), #hahmoNimiKentta
 * ja #hahmoVarit; valikkorivillä #arvoVari. `ihmisia` kertoo montako hahmoa
 * tässä pelissä näytetään. `muuttui` kutsutaan joka muutoksen jälkeen, jotta
 * peli voi piirtää pelaajarivin ja tulosruudun uusilla väreillä. */
let hahmoKuka = 0;

function hahmoPiirraArvo(ihmisia) {
  const v = document.getElementById('arvoVari');
  if (v) v.innerHTML = hahmoAsetukset.variNrot.slice(0, ihmisia).map(function (n) {
    return '<span class="hahmo-pallo" style="background:' + hahmoVari(n) + '"></span>';
  }).join('');
}

function hahmoPiirraAsetus(ihmisia, muuttui) {
  const a = hahmoAsetukset;
  if (hahmoKuka >= ihmisia) hahmoKuka = 0;
  /* Useampi ihminen: ensin kenen hahmo (hänen nykyisellä värillään). */
  const kuka = document.getElementById('hahmoVariKuka');
  if (kuka) {
    kuka.innerHTML = '';
    kuka.hidden = ihmisia < 2;
    a.variNrot.slice(0, ihmisia).forEach(function (n, h) {
      const nappi = document.createElement('button');
      nappi.className = 'hahmo-valinta' + (h === hahmoKuka ? ' valittu' : '');
      nappi.setAttribute('aria-label', t('pelaaja.nimi', { n: h + 1 }));
      nappi.setAttribute('aria-pressed', h === hahmoKuka ? 'true' : 'false');
      nappi.innerHTML = hahmoKuva(hahmoVari(n));
      nappi.onclick = function () { hahmoKuka = h; hahmoPiirraAsetus(ihmisia, muuttui); };
      kuka.appendChild(nappi);
    });
  }
  /* Nimi: kirjoitus tallentuu heti, eikä kenttää piirretä kesken kirjoittamisen. */
  const nimiKentta = document.getElementById('hahmoNimiKentta');
  if (nimiKentta) {
    nimiKentta.maxLength = HAHMO_NIMI_ENINTAAN;
    if (document.activeElement !== nimiKentta) nimiKentta.value = a.nimet[hahmoKuka] || '';
    nimiKentta.oninput = function () {
      a.nimet[hahmoKuka] = hahmoSiistiNimi(nimiKentta.value);
      hahmoTallenna();
      if (muuttui) muuttui();
    };
  }
  /* Värit: toisen pelaajan jo valitsema ei käy. Väri vaihtuu heti eikä aloita
   * uutta peliä: se ei muuta pelin kulkua. */
  const varit = document.getElementById('hahmoVarit');
  if (varit) {
    varit.innerHTML = '';
    TAYTTEET.forEach(function (x) {
      const n = x.arvo, valittu = n === a.variNrot[hahmoKuka];
      const toisen = !valittu && a.variNrot.slice(0, ihmisia).indexOf(n) >= 0;
      const nappi = document.createElement('button');
      nappi.className = 'hahmo-valinta' + (valittu ? ' valittu' : '');
      nappi.disabled = toisen;
      nappi.setAttribute('aria-label', t('basso.vari', { n: n }));
      nappi.setAttribute('aria-pressed', valittu ? 'true' : 'false');
      nappi.innerHTML = hahmoKuva(x.vari);
      nappi.onclick = function () {
        /* Väri jonka joku tämän pelin ulkopuolinen hahmo (esim. 4. pelaaja)
         * omistaa, vaihdetaan sen kanssa — muuten lista ei pysyisi erilaisena. */
        const vanha = a.variNrot[hahmoKuka], j = a.variNrot.indexOf(n);
        if (j >= 0) a.variNrot[j] = vanha;
        a.variNrot[hahmoKuka] = n;
        hahmoTallenna();
        hahmoPiirraAsetus(ihmisia, muuttui);
        if (muuttui) muuttui();
      };
      varit.appendChild(nappi);
    });
  }
  hahmoPiirraArvo(ihmisia);
}

hahmoLataa();
