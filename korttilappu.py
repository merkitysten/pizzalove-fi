# -*- coding: utf-8 -*-
"""A4-lappu apinakorttien selityksista laatikkoon — kieli kerrallaan.

🔵 Marko 30.10.2026: «Tee A4-kokoinen saksankielinen lappu apinakorttien
selityksista, jonka voin tulostaa saksalaisen verkkokauppa-asiakkaan
laatikkoon.»
🔵 Marko 30.10.2026: «Tee samanlainen myos suomeksi, jotta voin tarkastaa nuo
lisahuomiot.» — 12 HUOM!-riviä ja 23 Tarkennusta, ja ne ovat sivun omia
lisayksia painettuun ohjeeseen. Suomi on se kieli jolla ne voi tarkastaa.

⚠️ TIEDOSTO OLI NIMELTAAN `affenkarten.py` ja se oli nimi yhdelle kielelle.
Kun sama generaattori palvelee kahta, nimi joka lupaa yhden on vaara — ja
vaara nimi on tassa projektissa oma vikaluokkansa.

YKSI LAHDE. Tekstit luetaan `sisalto/apinakortit-de.json`:sta — samasta
tiedostosta jonka `rakenna.py` kayttaa sivulle. Kopio ajautuisi erilleen,
ja silloin laatikon lappu ja verkkosivu kertoisivat eri saannot samalle
pelaajalle. Logo luetaan `julkinen/play/pelivalinta.js`:n VIIRI_SVG:sta
samasta syysta (sama kuvio kuin `nappula-alusta.py`:ssa).

⚠️ YKSI SIVU ON VAATIMUS, EI TOIVE. Laatikkoon menee yksi arkki. Siksi
`--tarkista` laskee PDF:n sivut ja kaatuu jos niita on enemman kuin yksi:
33 korttia + johdanto on 5 548 merkkia saksaa, ja se mahtuu vain tiettyyn
pistekokoon asti. Jos tekstia lisataan, koe kertoo sen heti.

⚠️ VIIRIN ISKULAUSEEN KIRJASIN ON ANNETTAVA. Pelissa `.viiri-iskulause`
tulee CSS:sta; paperilla sita ei ole, ja Helvetica nayttaa vaaralta
(Marko huomasi saman alustassa 20.10.). Siksi se kirjoitetaan elementtiin.
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
# ⚠️ Nama EIVAT ole kaannoksia vaan lapun omia tekstejä: JSONissa on sivun
# tekstit, ei paperin. Kieli joka puuttuu tasta, puuttuu myos lapulta.
KIELET = {
    'de': {'tiedosto': 'affenkarten-a4.pdf',
           'alatunniste': 'Alle Karten auch online:',
           'qr_teksti': 'Alle Karten<br>online'},
    # 🔵 Marko 13.11.2026: «Tee myös apinakorteista ranskankielinen lappu.»
    'fr': {'tiedosto': 'cartes-singe-a4.pdf',
           'alatunniste': 'Toutes les cartes aussi en ligne :',
           'qr_teksti': 'Toutes les cartes<br>en ligne'},
    'fi': {'tiedosto': 'apinakortit-a4.pdf',
           'alatunniste': 'Kaikki kortit myös verkossa:',
           'qr_teksti': 'Kaikki kortit<br>verkossa'},
}
PELIVALINTA = os.path.join(TANNE, 'julkinen', 'play', 'pelivalinta.js')


ORANSSI = '#EE7203'
MUSTA = '#1A1A1A'

ISKULAUSE_KIRJASIN = "'DIN Alternate','DIN Condensed',Helvetica,Arial,sans-serif"
QR_MM = 24.0
# 🔵 Marko 30.10.2026: «Lisaa siihen se QR-koodi.» Syy on osoitteessa:
# saksankielinen sivu on suomenkielisen tiedostonimen takana
# (`/de/apinakortit.html`), ja laatikon lapulta se NAPYTELLAAN kasin.
QR_MODUULI_MIN_MM = 0.5
QRJS = os.path.join(TANNE, 'julkinen', 'play', 'qr.js')
JSQR = os.path.join(TANNE, 'julkinen', 'play', 'vendor', 'jsqr', 'jsQR.js')


def polut(kieli):
    k = KIELET[kieli]
    return (os.path.join(TANNE, 'sisalto', 'apinakortit-%s.json' % kieli),
            os.path.join(TANNE, 'julkinen', 'pdf', k['tiedosto']),
            os.path.join(TANNE, '.korttilappu-%s.html' % kieli),
            'https://pizzalove.fi/%s/apinakortit.html' % kieli)


def e(s):
    return html.escape(str(s), quote=False)


def viiri():
    """Pizza Love -viiri pelin omasta lahteesta — EI uutta piirrosta."""
    teksti = open(PELIVALINTA, encoding='utf-8').read()
    m = re.search(r'const VIIRI_SVG = "(.*?)";\n', teksti, re.S)
    if not m:
        raise SystemExit('VIIRI_SVG ei loytynyt %s:sta' % PELIVALINTA)
    svg = m.group(1).replace('\\"', '"')
    # Iskulauseen tyyli on pelissa CSS:ssa; paperilla se on kirjoitettava tahan.
    return svg.replace(
        '<text class="viiri-iskulause"',
        '<text font-family=%s font-size="5.1" font-weight="700" '
        'letter-spacing="0.1" fill="#fff"' % ('"%s"' % ISKULAUSE_KIRJASIN))


QR_AJURI = """ObjC.import('Foundation');
function lue(p) {
  return $.NSString.stringWithContentsOfFileEncodingError(
    $(p), $.NSUTF8StringEncoding, null).js;
}
eval(lue(%r));
console.log(norsuQrSvg(%r, { reunus: 4 }));
"""


def qr_svg(osoite):
    """QR repon omalla koodaajalla (`julkinen/play/qr.js`) — ei ulkopuolista
    palvelua. Valmis kuva olisi tiedosto jota kukaan ei ole mitannut.

    ⚠️ JXA:n console.log kirjoittaa STDERRIIN, ei stdoutiin."""
    ajuri = os.path.join(TANNE, '.qr-aja.js')
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


def qr_koko_koe():
    """Onko moduuli riittavan iso PAINETTAVAKSI?

    ⚠️ Oma kokeensa siksi, etta lukukoe EI nae painettavuutta: se lukee
    tiheasta rasterista, jossa aivan liian pieni moduuli on yha monta
    pikselia. Mitattu Essen-lapussa 21.10.2026: QR_MM 30 -> 5 ei muuttanut
    lukukoetta punaiseksi lainkaan. Datan selviaminen putkesta ja koodin
    skannattavuus ovat eri asia, ja jalkimmainen on LASKETTAVA."""
    moduuleja = 37.0          # versio 3 (29) + hiljainen reunus 2 x 4
    mm = QR_MM / moduuleja
    if mm < QR_MODUULI_MIN_MM:
        print('🔴 QR-KOKO: moduuli %.2f mm, vahimmais %.2f mm' % (mm, QR_MODUULI_MIN_MM))
        return False
    print('QR-koko: moduuli %.2f mm (vahimmais %.2f mm) — OK'
          % (mm, QR_MODUULI_MIN_MM))
    return True


def kortit(a):
    osat = []
    for k in a['kortit']:
        lisa = ''
        if k.get('huom'):
            lisa += ('<span class="huom"><b>%s</b> %s</span>'
                     % (e(a['huom']), e(k['huom'])))
        if k.get('tarkennus'):
            lisa += ('<span class="huom"><b>%s :</b> %s</span>'
                     % (e(a['tarkennus']), e(k['tarkennus'])))
        if k.get('virhe'):
            lisa += '<span class="huom">%s</span>' % e(k['virhe'])
        osat.append(
            '<li class="kortti"><span class="nro">%02d</span>'
            '<span class="teksti"><b>%s</b> %s%s</span></li>'
            % (k['n'], e(k['nimi']), e(k['ohje']), lisa))
    return ''.join(osat)


def sivu_html(kieli, lahde, osoite):
    k = KIELET[kieli]
    a = json.load(open(lahde, encoding='utf-8'))
    if len(a['kortit']) != 33:
        raise SystemExit('Odotettiin 33 korttia, loytyi %d' % len(a['kortit']))
    return '''<!doctype html>
<html lang="{kieli}"><meta charset="utf-8"><title>{h1} 01–33</title>
<style>
  @page {{ size: A4; margin: 0 }}
  * {{ box-sizing: border-box; margin: 0; padding: 0 }}
  html, body {{ width: 210mm; height: 297mm }}
  body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: {musta}; background: #fff; padding: 11mm 12mm 9mm;
          -webkit-print-color-adjust: exact; print-color-adjust: exact }}
  header {{ display: flex; align-items: flex-start; gap: 6mm;
            border-bottom: .5mm solid {oranssi}; padding-bottom: 3.4mm }}
  .otsikko {{ flex: 1 }}
  .qr {{ flex: none; width: {qrmm}mm; text-align: center }}
  .qr svg {{ width: 100%; height: auto; display: block }}
  .qr span {{ display: block; margin-top: 1mm; font-size: 5.8pt;
              line-height: 1.2; font-weight: 700; opacity: .75 }}
  .viiri {{ width: 20mm; flex: none }}
  .viiri svg {{ width: 100%; height: auto; display: block }}
  h1 {{ font-size: 19pt; line-height: 1; letter-spacing: -.01em }}
  .ala {{ font-size: 8.4pt; margin-top: 1.4mm; color: {oranssi};
          font-weight: 700 }}
  .johdanto {{ margin: 3.2mm 0 3mm; font-size: 7.4pt; line-height: 1.35;
               columns: 2; column-gap: 7mm }}
  .johdanto p {{ margin-bottom: 1.4mm; break-inside: avoid }}
  .johdanto b {{ color: {oranssi} }}
  ol {{ list-style: none; columns: 2; column-gap: 7mm }}
  .kortti {{ display: flex; gap: 1.8mm; break-inside: avoid;
             margin-bottom: 1.5mm; font-size: 7pt; line-height: 1.26 }}
  .nro {{ flex: none; width: 5.2mm; height: 5.2mm; border-radius: 50%;
          background: {oranssi}; color: #fff; font-size: 6pt;
          font-weight: 800; display: flex; align-items: center;
          justify-content: center; margin-top: .1mm }}
  .teksti b {{ font-weight: 700 }}
  .huom {{ display: block; font-size: 6.3pt; opacity: .72; margin-top: .2mm }}
  footer {{ margin-top: 3mm; padding-top: 2mm;
            border-top: .3mm solid #d8d8d8; display: flex;
            justify-content: space-between; font-size: 6.6pt; opacity: .8 }}
  footer b {{ color: {oranssi} }}
</style>
<header>
  <div class="viiri">{viiri}</div>
  <div class="otsikko">
    <h1>{h1} 01–33</h1>
    <div class="ala">{takaisin} · Pizza Love®</div>
  </div>
  <div class="qr">{qr}<span>{qr_teksti}</span></div>
</header>
<div class="johdanto">
  <p>{ingressi}</p>
  <p>{kaytto}</p>
  <p><b>{huom}</b> {yleista}</p>
</div>
<ol>{kortit}</ol>
<footer><span>{alatunniste} <b>{osoite}</b></span>
<span>Merkitysten Oy · Pizza Love®</span></footer>
</html>'''.format(musta=MUSTA, oranssi=ORANSSI, viiri=viiri(), h1=e(a['h1']),
                  takaisin=e(a['takaisin']), ingressi=e(a['ingressi']),
                  kaytto=e(a['kaytto']), huom=e(a['huom']),
                  yleista=e(a['yleista']), kortit=kortit(a),
                  osoite=osoite.replace('https://', ''),
                  qr=qr_svg(osoite), qrmm=QR_MM, kieli=kieli,
                  qr_teksti=k['qr_teksti'], alatunniste=e(k['alatunniste']))


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
    """Lukee QR:n VALMIISTA PDF:STA — ei siita SVG:sta jonka juuri kirjoitimme,
    koska silloin koe todistaisi vain oman itsensa.

    ⚠️ Koko sivu syotetaan lukijalle sellaisenaan: jsQR etsii kuvion mista
    tahansa, joten rajauskoordinaatteja ei tarvita eika niita voi saada
    vaariin. ⚠️ EI vartioi osoitteen ARVOA: se luetaan samasta vakiosta jolla
    se koodattiin, joten vakioon osuva mutaatio on sokea."""
    tyo = tempfile.mkdtemp(prefix='affen-qr-')
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
            [CHROME, '--headless', '--disable-gpu', '--allow-file-access-from-files',
             '--virtual-time-budget=6000', '--dump-dom', 'file://' + sivu],
            capture_output=True, text=True)
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


def sivuja(pdf):
    d = open(pdf, 'rb').read()
    return len(re.findall(rb'/Type\s*/Page[^s]', d))


def valimerkit(kieli, s):
    """Ranskassa sitova valilyonti ennen : ; ! ? (ATTENTION !, Précision :).
    Muissa kielissa kaksoispiste kiinni sanassa (Hinweis:, Tarkennus:)."""
    if kieli == 'fr':
        return re.sub(r' ([:;!?])', '\u00a0\\1', s)
    return s.replace(' :</b>', ':</b>')


def tee(kieli):
    lahde, kohde, sivu, osoite = polut(kieli)
    with open(sivu, 'w', encoding='utf-8') as f:
        f.write(valimerkit(kieli, sivu_html(kieli, lahde, osoite)))
    subprocess.run([CHROME, '--headless', '--disable-gpu',
                    '--no-pdf-header-footer', '--print-to-pdf=' + kohde,
                    'file://' + sivu], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.unlink(sivu)
    if not qr_koko_koe():
        return 1
    n = sivuja(kohde)
    print('%s  (%.0f kt, %d sivu%s)'
          % (kohde, os.path.getsize(kohde) / 1024, n, '' if n == 1 else 'a'))
    if n != 1:
        print('🔴 LAPPU EI MAHDU YHDELLE SIVULLE. Laatikkoon menee yksi arkki.')
        return 1
    if qr_lukukoe(kohde, osoite) is False:
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
