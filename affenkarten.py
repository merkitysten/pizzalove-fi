# -*- coding: utf-8 -*-
"""A4-lappu saksalaisen asiakkaan laatikkoon: Affenkarten 01-33.

🔵 Marko 30.10.2026: «Tee A4-kokoinen saksankielinen lappu apinakorttien
selityksista, jonka voin tulostaa saksalaisen verkkokauppa-asiakkaan
laatikkoon.»

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
import subprocess
import sys

TANNE = os.path.dirname(os.path.abspath(__file__))
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
LAHDE = os.path.join(TANNE, 'sisalto', 'apinakortit-de.json')
PELIVALINTA = os.path.join(TANNE, 'julkinen', 'play', 'pelivalinta.js')
KOHDE = os.path.join(TANNE, 'julkinen', 'pdf', 'affenkarten-a4.pdf')
SIVU = os.path.join(TANNE, 'affenkarten-a4.html')

ORANSSI = '#EE7203'
MUSTA = '#1A1A1A'
OSOITE = 'pizzalove.fi/de/apinakortit.html'
ISKULAUSE_KIRJASIN = "'DIN Alternate','DIN Condensed',Helvetica,Arial,sans-serif"


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


def kortit(a):
    osat = []
    for k in a['kortit']:
        lisa = ''
        if k.get('huom'):
            lisa += ('<span class="huom"><b>%s</b> %s</span>'
                     % (e(a['huom']), e(k['huom'])))
        if k.get('tarkennus'):
            lisa += ('<span class="huom"><b>%s:</b> %s</span>'
                     % (e(a['tarkennus']), e(k['tarkennus'])))
        if k.get('virhe'):
            lisa += '<span class="huom">%s</span>' % e(k['virhe'])
        osat.append(
            '<li class="kortti"><span class="nro">%02d</span>'
            '<span class="teksti"><b>%s</b> %s%s</span></li>'
            % (k['n'], e(k['nimi']), e(k['ohje']), lisa))
    return ''.join(osat)


def sivu_html():
    a = json.load(open(LAHDE, encoding='utf-8'))
    if len(a['kortit']) != 33:
        raise SystemExit('Odotettiin 33 korttia, loytyi %d' % len(a['kortit']))
    return '''<!doctype html>
<html lang="de"><meta charset="utf-8"><title>Affenkarten 01–33</title>
<style>
  @page {{ size: A4; margin: 0 }}
  * {{ box-sizing: border-box; margin: 0; padding: 0 }}
  html, body {{ width: 210mm; height: 297mm }}
  body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: {musta}; background: #fff; padding: 11mm 12mm 9mm;
          -webkit-print-color-adjust: exact; print-color-adjust: exact }}
  header {{ display: flex; align-items: flex-start; gap: 6mm;
            border-bottom: .5mm solid {oranssi}; padding-bottom: 3.4mm }}
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
  <div>
    <h1>{h1} 01–33</h1>
    <div class="ala">{takaisin} · Pizza Love®</div>
  </div>
</header>
<div class="johdanto">
  <p>{ingressi}</p>
  <p>{kaytto}</p>
  <p><b>{huom}</b> {yleista}</p>
</div>
<ol>{kortit}</ol>
<footer><span>Alle Karten auch online: <b>{osoite}</b></span>
<span>Merkitysten Oy · Pizza Love®</span></footer>
</html>'''.format(musta=MUSTA, oranssi=ORANSSI, viiri=viiri(), h1=e(a['h1']),
                  takaisin=e(a['takaisin']), ingressi=e(a['ingressi']),
                  kaytto=e(a['kaytto']), huom=e(a['huom']),
                  yleista=e(a['yleista']), kortit=kortit(a), osoite=OSOITE)


def sivuja(pdf):
    d = open(pdf, 'rb').read()
    return len(re.findall(rb'/Type\s*/Page[^s]', d))


def main():
    with open(SIVU, 'w', encoding='utf-8') as f:
        f.write(sivu_html())
    subprocess.run([CHROME, '--headless', '--disable-gpu',
                    '--no-pdf-header-footer', '--print-to-pdf=' + KOHDE,
                    'file://' + SIVU], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    n = sivuja(KOHDE)
    print('%s  (%.0f kt, %d sivu%s)'
          % (KOHDE, os.path.getsize(KOHDE) / 1024, n, '' if n == 1 else 'a'))
    if n != 1:
        print('🔴 LAPPU EI MAHDU YHDELLE SIVULLE. Laatikkoon menee yksi arkki.')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
