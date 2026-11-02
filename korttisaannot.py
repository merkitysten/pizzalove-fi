# -*- coding: utf-8 -*-
"""Korttipelin saannot A4-PDF:na, kieli kerrallaan — tulostettavaksi ja
verkkosivuilta jaettavaksi.

🔵 Marko 30.10.2026: «Tee korttipelin ohjeista saksan kielinen versio, joka
voidaan tulostaa ja jakaa pdf:na verkkosivuilla.»

⚠️ LAHDE ON VERKKOSIVUN SISALTO, EI PAINETTU ARKKI. Painettu
`pizza-love-korttipeli-saannot.pdf` (FI · SV · EN) on VANHEMPI kuin sivu, ja
ero on kaksi mitattua saantoa:

  1. apinan nimi on nyt Basso, painetussa Bruno (ja «#2 Pizza Bruno»)
  2. Bassön tapa on muuttunut: sivu sanoo «so viele VERSCHIEDENE Belage, wie
     die Pizza Belage hat. Es durfen mehr Karten sein», painettu arkki sanoo
     «yhta monta taytekorttia kuin pizzassa on taytteita»

Jos tama PDF kaannettaisiin painetusta arkista, se levittaisi kumotun
saannon uudella kielella. Siksi teksti luetaan `sisalto/{kieli}.json`:sta —
samasta tiedostosta josta `rakenna.py` tekee sivun. Kuvat ovat sivun omia
(`julkinen/kuvat/`), eika niita piirreta uudelleen.

⚠️ KAKSI SIVUA ON TAVOITE, EI VAATIMUS: yksi arkki kaksipuolisena. Saksaa on
7 716 merkkia, joten raja on `SIVU_KATTO` ja koe kertoo heti jos teksti
kasvaa yli. Kolmas sivu ei ole vika — se on paatos, ja se tehdaan aanen.

⚠️ SISALTOKOE LUKEE VALMIIN PDF:N TEKSTIN, ei generoitua HTML:aa. Palstat ja
sivunvaihdot voivat PUDOTTAA sisaltoa ilman etta mikaan kaatuu, ja silloin
puuttuva luku nayttaa taitolta. Normalisointi poistaa valilyonnit ja purkaa
ligatuurit, koska poiminta antaa `ﬀ` ja «T aas» (mitattu 30.10.2026
apinakorttilapussa — kaksi vaaraa halytysta samana paivana).
"""

import html
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

TANNE = os.path.dirname(os.path.abspath(__file__))
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

ORANSSI = '#EE7203'
MUSTA = '#1A1A1A'
ISKULAUSE_KIRJASIN = "'DIN Alternate','DIN Condensed',Helvetica,Arial,sans-serif"
PELIVALINTA = os.path.join(TANNE, 'julkinen', 'play', 'pelivalinta.js')
QRJS = os.path.join(TANNE, 'julkinen', 'play', 'qr.js')
JSQR = os.path.join(TANNE, 'julkinen', 'play', 'vendor', 'jsqr', 'jsQR.js')
QR_MM = 22.0
QR_MODUULI_MIN_MM = 0.5
SIVU_KATTO = 2

# 🔵 Marko 30.10.2026: «Englanninkielinen ohje on tarkistettu natiivin
# puhujan toimesta.» Siksi `en` on mukana: se on ainoa kieli jonka sanamuodosta
# on ihmisen tarkastus, ja saksa on kaannos. Rinnakkain tulostettuna ero on
# luettavissa.
# ⚠️ Nama EIVAT ole kaannoksia vaan ARKIN omia tekstejä. JSONissa on sivun
# tekstit; paperilla on omat (mista kortit saa, kuka on kustantaja, QR:n
# saate). Kieli joka puuttuu tasta, puuttuu myos arkilta.
KIELET = {
    'de': {
        'tiedosto': 'pizza-love-kartenspiel-regeln-de.pdf',
        'alaotsikko': 'Die Regeln aller drei Spielvarianten',
        'qr_teksti': 'Regeln und<br>Videos online',
        'osoite': 'https://pizzalove.fi/de/korttipeli.html',
        'videot': 'Erklärvideos zu jeder Spielvariante findest du online.',
        'oikeudet': ('Merkitysten® ist eine eingetragene Marke der '
                     'Merkitysten Oy. Alle Rechte vorbehalten.'),
    },
    'en': {
        'tiedosto': 'pizza-love-card-game-rules-en.pdf',
        'alaotsikko': 'The rules of all three game modes',
        'qr_teksti': 'Rules and<br>videos online',
        'osoite': 'https://pizzalove.fi/en/korttipeli.html',
        'videot': 'Watch the how-to videos for every game mode online.',
        'oikeudet': ('Merkitysten® is a registered trademark of '
                     'Merkitysten Oy. All rights reserved.'),
    },
}


def polut(kieli):
    k = KIELET[kieli]
    return (os.path.join(TANNE, 'sisalto', kieli + '.json'),
            os.path.join(TANNE, 'julkinen', 'pdf', k['tiedosto']),
            os.path.join(TANNE, '.korttisaannot-%s.html' % kieli))


def e(s):
    return html.escape(str(s), quote=False)


def viiri():
    """Pizza Love -viiri pelin omasta lahteesta — EI uutta piirrosta.
    Iskulauseen kirjasin on annettava: pelissa se tulee CSS:sta, paperilla
    sita ei ole (sama korjaus kuin `korttilappu.py`:ssa ja alustassa)."""
    teksti = open(PELIVALINTA, encoding='utf-8').read()
    m = re.search(r'const VIIRI_SVG = "(.*?)";\n', teksti, re.S)
    if not m:
        raise SystemExit('VIIRI_SVG ei loytynyt %s:sta' % PELIVALINTA)
    return m.group(1).replace('\\"', '"').replace(
        '<text class="viiri-iskulause"',
        '<text font-family="%s" font-size="5.1" font-weight="700" '
        'letter-spacing="0.1" fill="#fff"' % ISKULAUSE_KIRJASIN)


QR_AJURI = """ObjC.import('Foundation');
function lue(p) {
  return $.NSString.stringWithContentsOfFileEncodingError(
    $(p), $.NSUTF8StringEncoding, null).js;
}
eval(lue(%r));
console.log(norsuQrSvg(%r, { reunus: 4 }));
"""


def qr_svg(osoite):
    """QR repon omalla koodaajalla. ⚠️ JXA:n console.log menee STDERRIIN."""
    ajuri = os.path.join(TANNE, '.qr-aja-saannot.js')
    with open(ajuri, 'w') as f:
        f.write(QR_AJURI % (QRJS, osoite))
    ulos = subprocess.run(['osascript', '-l', 'JavaScript', ajuri],
                          capture_output=True, text=True)
    os.unlink(ajuri)
    for virta in (ulos.stdout, ulos.stderr):
        if virta.strip().startswith('<svg'):
            return virta.strip()
    raise SystemExit('QR-koodaus epaonnistui: %s'
                     % (ulos.stderr or ulos.stdout)[:300])


def qr_koko_koe(svg):
    """Onko moduuli riittavan iso PAINETTAVAKSI?

    ⚠️ Lukukoe EI nae painettavuutta: tiheasta rasterista luetaan vaikka
    moduuli olisi 0,14 mm (mitattu Essen-lapussa: QR_MM 30 -> 5 ei muuttanut
    lukukoetta punaiseksi). Moduulien maara LUETAAN valmiista SVG:sta, ei
    oleteta versiosta — pitempi osoite kasvattaa koodia."""
    m = re.search(r'viewBox="0 0 (\d+) (\d+)"', svg)
    if not m:
        print('🔴 QR-KOKO: viewBox ei loytynyt — EI MITATTAVISSA')
        return False
    moduuleja = float(m.group(1))
    mm = QR_MM / moduuleja
    if mm < QR_MODUULI_MIN_MM:
        print('🔴 QR-KOKO: moduuli %.2f mm (%d moduulia), vahimmais %.2f mm'
              % (mm, moduuleja, QR_MODUULI_MIN_MM))
        return False
    print('QR-koko: moduuli %.2f mm, %d moduulia (vahimmais %.2f mm) — OK'
          % (mm, moduuleja, QR_MODUULI_MIN_MM))
    return True


def muoto(m):
    return ('<section class="muoto">'
            '<h2><span class="numero">%s</span>%s'
            '<span class="kuvaus">%s</span></h2>'
            '<div class="palstat">%s</div></section>'
            % (e(m['numero']), e(m['nimi']), e(m['kuvaus']), m['html']))


def sivu_html(kieli, lahde):
    k = KIELET[kieli]
    s = json.load(open(lahde, encoding='utf-8'))['korttipeli']
    qr = qr_svg(k['osoite'])
    tiedot = ''.join('<li>%s</li>' % e(x) for x in s['tiedot'])
    runko = '''<!doctype html>
<html lang="{kieli}"><meta charset="utf-8"><title>{title}</title>
<style>
  @page {{ size: A4; margin: 0 }}
  * {{ box-sizing: border-box; margin: 0; padding: 0 }}
  body {{ width: 210mm; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: {musta}; background: #fff; padding: 8mm 10mm 5mm;
          font-size: 8.2pt; line-height: 1.33;
          -webkit-print-color-adjust: exact; print-color-adjust: exact }}
  header {{ display: flex; align-items: flex-start; gap: 5mm;
            border-bottom: .5mm solid {oranssi}; padding-bottom: 3mm }}
  .viiri {{ width: 19mm; flex: none }}
  .viiri svg, .qr svg {{ width: 100%; height: auto; display: block }}
  .otsikko {{ flex: 1 }}
  h1 {{ font-size: 18pt; line-height: 1.02; letter-spacing: -.01em }}
  .ala {{ font-size: 8.6pt; font-weight: 700; color: {oranssi};
          margin-top: 1.2mm }}
  .qr {{ flex: none; width: {qrmm}mm; text-align: center }}
  .qr span {{ display: block; margin-top: .8mm; font-size: 5.6pt;
              line-height: 1.2; font-weight: 700; opacity: .75 }}
  .tiedot {{ list-style: none; display: flex; flex-wrap: wrap; gap: 1.6mm;
             margin: 2.2mm 0 1.6mm }}
  .tiedot li {{ border: .25mm solid #cfcfcf; border-radius: 1.4mm;
                padding: .5mm 2mm; font-size: 7.2pt; font-weight: 700 }}
  .ingressi {{ font-size: 9pt; margin-bottom: 2mm }}
  h2 {{ font-size: 11pt; margin: 3mm 0 1.6mm; padding-bottom: 1mm;
        border-bottom: .3mm solid #ddd; break-after: avoid }}
  .muoto h2 {{ border: 0; background: {oranssi}; color: #fff;
               padding: 1.2mm 2.4mm; border-radius: 1.4mm; margin-bottom: 2mm }}
  .numero {{ font-weight: 800; margin-right: 1.8mm; opacity: .75 }}
  .kuvaus {{ display: block; font-size: 7pt; font-weight: 400; opacity: .9 }}
  h3 {{ font-size: 8.4pt; color: {oranssi}; margin: 2mm 0 .6mm;
        break-after: avoid }}
  p {{ margin-bottom: 1.2mm }}
  .palstat {{ columns: 2; column-gap: 7mm }}
  .palstat > *, .laatikko, .kortti {{ break-inside: avoid }}
  ul.lista, ol.lista {{ margin: 0 0 1.2mm 4.2mm }}
  ul.lista li, ol.lista li {{ margin-bottom: .6mm }}
  .pieni {{ font-size: 6.8pt; opacity: .72 }}
  .kortti {{ display: flex; gap: 2.4mm; align-items: flex-start;
             margin-bottom: 1.6mm }}
  .kortti img {{ width: 14mm; height: auto; flex: none; border-radius: 1mm }}
  .laatikko {{ border: .25mm solid #e2e2e2; border-radius: 1.6mm;
               padding: 2.2mm 2.6mm; background: #fcfbfa;
               margin-bottom: 1.8mm }}
  .esimerkki {{ display: flex; align-items: center; gap: 1.6mm;
                margin: 1.4mm 0 }}
  .esimerkki img {{ width: 13mm; height: auto; border-radius: 1mm }}
  .esimerkki b {{ font-size: 11pt; color: {oranssi} }}
  .huomio {{ display: flex; gap: 2.4mm; align-items: center;
             border-left: .8mm solid {oranssi}; padding: 1.4mm 0 1.4mm 2.2mm }}
  .huomio img {{ width: 10mm; height: auto; flex: none }}
  footer {{ margin-top: 2.6mm; padding-top: 1.4mm;
            border-top: .3mm solid #d8d8d8; font-size: 6.6pt; opacity: .82;
            display: flex; justify-content: space-between; gap: 4mm }}
  footer b {{ color: {oranssi} }}
</style>
<header>
  <div class="viiri">{viiri}</div>
  <div class="otsikko">
    <h1>{h1}</h1>
    <div class="ala">{alaotsikko}</div>
  </div>
  <div class="qr">{qr}<span>{qr_teksti}</span></div>
</header>

<p class="ingressi">{ingressi}</p>
<ul class="tiedot">{tiedot}</ul>

<h2>{perusteet_otsikko}</h2>
<div class="palstat">
  <p>{perusteet_ingressi}</p>
  <div class="kortti"><img src="julkinen/kuvat/tausta-pizza.webp">
    <div><h3 style="margin-top:0">{pizzakortit_otsikko}</h3><p>{pizzakortit}</p></div></div>
  <div class="kortti"><img src="julkinen/kuvat/tausta-tayte.webp">
    <div><h3 style="margin-top:0">{taytekortit_otsikko}</h3><p>{taytekortit}</p></div></div>
  <div class="laatikko">
    <h3 style="margin-top:0">{perussaanto_otsikko}</h3><p>{perussaanto}</p>
    <h3>{arvo_otsikko}</h3><p>{arvo}</p>
    <h3>{esimerkki_otsikko}</h3>
    <div class="esimerkki" role="img" aria-label="{esimerkki_alt}">
      <img src="julkinen/kuvat/pizza-31.webp"><b>=</b>
      <img src="julkinen/kuvat/tayte-10.webp"><b>:</b>
      <img src="julkinen/kuvat/tayte-2.webp"></div>
    <p>{esimerkki}</p>
  </div>
  <h3>{tavat_otsikko}</h3>
  <div class="laatikko"><h3 style="margin-top:0">{helpompi_otsikko}</h3>
    <p>{helpompi}</p></div>
  <div class="laatikko"><h3 style="margin-top:0">{basso_tapa_otsikko}</h3>
    <p>{basso_tapa}</p></div>
  <div class="huomio"><img src="julkinen/kuvat/basso-miettii.webp">
    <p>{huomio_bruno}</p></div>
</div>

{muodot}

<footer>
  <span>{videot} <b>{nakyva}</b></span>
  <span>{oikeudet} © Merkitysten Oy 2026</span>
</footer>
</html>'''
    return runko.format(
        kieli=kieli, musta=MUSTA, oranssi=ORANSSI, viiri=viiri(), qr=qr,
        qrmm=QR_MM, qr_teksti=k['qr_teksti'], title=e(s['title']),
        h1=e(s['h1']), alaotsikko=e(k['alaotsikko']), ingressi=e(s['ingressi']),
        tiedot=tiedot, perusteet_otsikko=e(s['perusteet_otsikko']),
        perusteet_ingressi=e(s['perusteet_ingressi']),
        pizzakortit_otsikko=e(s['pizzakortit_otsikko']),
        pizzakortit=e(s['pizzakortit']),
        taytekortit_otsikko=e(s['taytekortit_otsikko']),
        taytekortit=e(s['taytekortit']),
        perussaanto_otsikko=e(s['perussaanto_otsikko']),
        perussaanto=e(s['perussaanto']), arvo_otsikko=e(s['arvo_otsikko']),
        arvo=s['arvo'], esimerkki_otsikko=e(s['esimerkki_otsikko']),
        esimerkki_alt=e(s['esimerkki_alt']), esimerkki=e(s['esimerkki']),
        tavat_otsikko=e(s['tavat_otsikko']),
        helpompi_otsikko=e(s['helpompi_otsikko']), helpompi=e(s['helpompi']),
        basso_tapa_otsikko=e(s['basso_tapa_otsikko']),
        basso_tapa=s['basso_tapa'], huomio_bruno=s['huomio_bruno'],
        muodot=''.join(muoto(m) for m in s['muodot']),
        videot=e(k['videot']), nakyva=k['osoite'].replace('https://', ''),
        oikeudet=e(k['oikeudet']))


def otsikot(lahde):
    """Jokainen luku jonka ON oltava arkilla — luettu LAHTEESTA eika kasin
    kirjoitetusta listasta, joka vanhenisi juuri siita luvusta jota varten
    koe on."""
    s = json.load(open(lahde, encoding='utf-8'))['korttipeli']
    nimet = [s[a] for a in s if a.endswith('_otsikko') and a not in
             ('videot_otsikko', 'pelaa_otsikko', 'ristiin_otsikko',
              'lataa_otsikko', 'muodot_otsikko')]
    for m in s['muodot']:
        nimet.append(m['nimi'])
        nimet += re.findall(r'<h3>(.*?)</h3>', m['html'])
    return nimet


PDF_TEKSTI = """ObjC.import('Quartz');
var d = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath($(%r)));
var o = [];
for (var i = 0; i < d.pageCount; i++) {
  o.push(ObjC.unwrap(d.pageAtIndex(i).string));
}
console.log(o.join('\\n'));
"""

LIGATUURIT = {'ﬀ': 'ff', 'ﬁ': 'fi', 'ﬂ': 'fl',
              'ﬃ': 'ffi', 'ﬄ': 'ffl'}


def norm(s):
    for a, b in LIGATUURIT.items():
        s = s.replace(a, b)
    return re.sub(r'\s+', '', re.sub('<[^>]+>', '', s)).lower()


def sisaltokoe(pdf, lahde):
    """Onko jokainen luku VALMIILLA arkilla? Palstat ja sivunvaihdot voivat
    pudottaa sisaltoa hiljaa."""
    ajuri = os.path.join(TANNE, '.pdfteksti.js')
    with open(ajuri, 'w') as f:
        f.write(PDF_TEKSTI % pdf)
    ulos = subprocess.run(['osascript', '-l', 'JavaScript', ajuri],
                          capture_output=True, text=True)
    os.unlink(ajuri)
    teksti = norm(ulos.stderr if len(ulos.stderr) > len(ulos.stdout)
                  else ulos.stdout)
    if len(teksti) < 2000:
        print('Sisaltokoe: PDF:sta ei saatu tekstia — EI MITATTAVISSA')
        return None
    puuttuu = [o for o in otsikot(lahde) if norm(o) not in teksti]
    if puuttuu:
        print('🔴 SISALTOKOE: arkilta puuttuu %d lukua: %s'
              % (len(puuttuu), ' · '.join(puuttuu)))
        return False
    print('Sisaltokoe: kaikki %d lukua loytyvat arkilta — OK'
          % len(otsikot(lahde)))
    return True


SIVU_AJURI = """ObjC.import('Quartz'); ObjC.import('AppKit');
var doc = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath($(%r)));
var k = doc.pageAtIndex(0).thumbnailOfSizeForBox($.NSMakeSize(1654, 2339), 0);
var rep = $.NSBitmapImageRep.imageRepWithData(k.TIFFRepresentation);
rep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $())
   .writeToFileAtomically($(%r), true);
console.log('ok');
"""

LUKU_SIVU = """<!doctype html><meta charset="utf-8"><body>
<script src="jsQR.js"></script>
<script>
const img = new Image();
img.onload = () => {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height);
  const r = jsQR(d.data, c.width, c.height);
  document.title = 'TULOS ' + JSON.stringify({teksti: r ? r.data : null});
};
img.onerror = () => { document.title = 'TULOS {"teksti":"KUVA EI LATAUTUNUT"}'; };
img.src = 'sivu.png';
</script>"""


def qr_lukukoe(pdf, osoite):
    """Lukee QR:n VALMIISTA PDF:STA — ei siita SVG:sta jonka juuri
    kirjoitimme, koska silloin koe todistaisi vain oman itsensa.
    ⚠️ EI vartioi osoitteen ARVOA: se luetaan samasta vakiosta jolla se
    koodattiin, joten vakioon osuva mutaatio on sokea."""
    tyo = tempfile.mkdtemp(prefix='saannot-qr-')
    try:
        png = os.path.join(tyo, 'sivu.png')
        ajuri = os.path.join(tyo, 'sivu.js')
        with open(ajuri, 'w') as f:
            f.write(SIVU_AJURI % (pdf, png))
        subprocess.run(['osascript', '-l', 'JavaScript', ajuri],
                       capture_output=True, text=True)
        if not os.path.exists(png):
            print('QR-lukukoe: sivua ei saatu kuvaksi — EI MITATTAVISSA')
            return None
        shutil.copy(JSQR, os.path.join(tyo, 'jsQR.js'))
        sivu = os.path.join(tyo, 'lue.html')
        with open(sivu, 'w') as f:
            f.write(LUKU_SIVU)
        ulos = subprocess.run(
            [CHROME, '--headless', '--disable-gpu',
             '--allow-file-access-from-files', '--virtual-time-budget=6000',
             '--dump-dom', 'file://' + sivu], capture_output=True, text=True)
        osuma = re.search(r'TULOS (\{.*?\})', ulos.stdout)
        if not osuma:
            print('QR-lukukoe: lukijalta ei tullut tulosta — EI MITATTAVISSA')
            return None
        luettu = json.loads(osuma.group(1))['teksti']
        if luettu == osoite:
            print('QR-lukukoe: arkilta luettu %s — OK' % luettu)
            return True
        print('🔴 QR-LUKUKOE: luettiin %r, odotettiin %r' % (luettu, osoite))
        return False
    finally:
        shutil.rmtree(tyo, ignore_errors=True)


def osoitekoe(osoite):
    """Osoittaako QR sivuun jonka me julkaisemme?

    ⚠️ Lukukoe EI vartioi osoitteen ARVOA: se vertaa samaan vakioon jolla
    koodattiin, joten vakioon osuva mutaatio on sille nakymaton (mitattu
    30.10.2026: `/de/VAARA.html` meni lapi vihreana). Tama koe lukee
    VALMIISTA sivustosta, eli eri lahteesta kuin koodaus.

    ⚠️ `docs/` syntyy `rakenna.py`:lla. Jos sita ei ole ajettu, kyse ei ole
    rikkinaisesta osoitteesta vaan mittaamattomasta — ja ne eivat saa nayttaa
    samalta."""
    polku = os.path.join(TANNE, 'docs', osoite.replace('https://pizzalove.fi/', ''))
    if not os.path.isdir(os.path.join(TANNE, 'docs')):
        print('Osoitekoe: docs/ puuttuu (aja rakenna.py) — EI MITATTAVISSA')
        return None
    if not os.path.exists(polku):
        print('🔴 OSOITEKOE: QR osoittaa sivuun jota ei ole: %s' % osoite)
        return False
    print('Osoitekoe: %s on julkaistu — OK' % osoite.replace('https://', ''))
    return True


def sivuja(pdf):
    return len(re.findall(rb'/Type\s*/Page[^s]', open(pdf, 'rb').read()))


def tee(kieli):
    lahde, kohde, sivu = polut(kieli)
    with open(sivu, 'w', encoding='utf-8') as f:
        f.write(sivu_html(kieli, lahde))
    # ⚠️ Sivu tarjoillaan REPON JUURESTA, koska kuvapolut (`julkinen/kuvat/`)
    # ratkeavat sivuun nahden — sama ansa kuin `norsulaattakoe`ssa.
    subprocess.run([CHROME, '--headless', '--disable-gpu',
                    '--no-pdf-header-footer', '--print-to-pdf=' + kohde,
                    'file://' + sivu], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.unlink(sivu)
    if not qr_koko_koe(qr_svg(KIELET[kieli]['osoite'])):
        return 1
    n = sivuja(kohde)
    print('%s  (%.0f kt, %d sivu%s)'
          % (kohde, os.path.getsize(kohde) / 1024, n, '' if n == 1 else 'a'))
    if n > SIVU_KATTO:
        print('🔴 ARKKI KASVOI: %d sivua, katto %d. Yksi arkki '
              'kaksipuolisena on tavoite — nosta kattoa tietoisesti.'
              % (n, SIVU_KATTO))
        return 1
    if sisaltokoe(kohde, lahde) is False:
        return 1
    if qr_lukukoe(kohde, KIELET[kieli]['osoite']) is False:
        return 1
    if osoitekoe(KIELET[kieli]['osoite']) is False:
        return 1
    return 0


def main():
    pyydetyt = [a for a in sys.argv[1:] if not a.startswith('-')]
    for kieli in (pyydetyt or sorted(KIELET)):
        if kieli not in KIELET:
            raise SystemExit('Tuntematon kieli %r — tunnetut: %s'
                             % (kieli, ', '.join(sorted(KIELET))))
        print('— %s —' % kieli)
        if tee(kieli):
            return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
