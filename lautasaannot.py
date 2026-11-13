# -*- coding: utf-8 -*-
"""Lautapelin saannot ja aloitusopas PDF:na, kieli kerrallaan (nyt: ranska).

🔵 Marko 13.11.2026: «Tee lautapeliin ranskankieliset ohjeet. — — Pidä
mielessä brändin ulkoasu. Käytä lähteenä alkuperäisiä suomen- ja
englanninkielisiä tiedostoja. Tee huolella ja muista kaikki pohdintamme
korttipelin sääntöjä tehdessämme.» Valinta: säännöt + aloitusopas;
Philibertin liitteeksi (alle 2 Mt) ja pizzalove.fi/fr:n lautapelisivulle.

TEKEE KAKSI PDF:AA (julkinen/pdf/):
  regles  A4, koko peli: osat, valmistelut, vuoro, siirrot A–C kuvin,
          lasten apinavaaka, pizzan valmistus, erityistilanteet,
          valinnaiset saannot, Nälkäiset apinat, Salatut pizzat ja
          apinakortit 01–33.
  guide   210 x 210 mm aloitusopas (painetun pikaohjeen ranskankielinen
          sisar). Kuvasarake on PAINETUSTA pikaohjeesta (paperi/lauta/
          guide-kuvat.webp, rajattu tiedostosta «Pizza Love lautapeli
          pikaohje_printti.pdf» 300 dpi:lla); sen kolmikieliset leimat
          peitetaan uusilla ranskankielisilla samoille paikoille.

⚠️ LAHTEET JA NIIDEN JARJESTYS (Lauta- ja korttipelin ohjeet/CLAUDE.md):
  1. painettu pitka ohje on TERMINOLOGIAN auktoriteetti, mutta
  2. pikaohjeen hyvaksytyt poikkeamat voittavat sen: nappula/taeyte/torni
     -kehykset, «Pinoa», apinavaaka EI pelivalmisteluissa vaan lapsille
     omana laatikkonaan, «Niitä ei ole pakko käyttää» lihavoituna,
     kirjainviittaus kerran per osio (aloitusopas).
  3. Markon apinakorttipaatokset 25.10.2026 (Verkkosivut/
     APINAKORTIT_TARKENNUKSET.md) ja niista «Ilman siirtoa ei valmisteta
     pizzaa» — Marko: «se vois lukee säännöissä».
  4. Sanasto on sivuston ranskan sanasto (sisalto/fr.json,
     apinakortit-fr.json): réserve, chaîne, pion, ingrédient, tour, part,
     boîte, balance des singes, poids, carte singe, pizza cœur.
Korttipelin saannoista periytyvat: lyhyet ja yksinkertaiset tekstit, ei
omia perusteluja eika rajoituksia joita Marko ei ole sanonut, yksi
esimerkki per asia, musta/oranssi/valkoinen, oranssilla aina valkoinen
teksti, pyoristetyt suorakaiteet (ei kapseleita), ©-rivi yhdella rivilla.

SISALTO: sisalto/lautasaannot-fr.json (arkin oma teksti) ja
sisalto/apinakortit-fr.json (sama lahde kuin sivulla ja laatikon lapulla —
kopio ajautuisi erilleen).

AJO: python3 lautasaannot.py [fr]
  Macilla kaytetaan Chromea kuten korttisaannot.py; muualla Playwrightin
  Chromiumia. QR piirretaan sivulla repon omalla qr.js:lla, joten sama
  HTML toimii molemmissa.

⚠️ KOKO: Philibert ottaa liitteeksi enintaan 2 Mt. Chromen PDF upottaa
kuvat raskaina, joten valmis tiedosto pakataan (pymupdf, jos saatavilla)
ja koko tarkistetaan. Rajan ylitys kaataa ajon.
"""

import html
import json
import os
import re
import shutil
import subprocess
import sys

TANNE = os.path.dirname(os.path.abspath(__file__))
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
PELIVALINTA = os.path.join(TANNE, 'julkinen', 'play', 'pelivalinta.js')

ORANSSI = '#EE7203'
MUSTA = '#1A1A1A'
LEIMA = '#F36717'      # painetun pikaohjeen leimojen vari (mitattu 300 dpi:sta)
OTSAKE_TAUSTA = '#110E0F'  # painetun pikaohjeen otsakepalkki (logo on rajattu siita)
VIIVA = '#7A7A7A'
ISKULAUSE_KIRJASIN = "Otsikko,'DIN Condensed',sans-serif"
QR_MM = 22.0
SIVU_KATTO = 5
KOKO_KATTO = 2 * 1000 * 1000   # Philibertin liiteraja

KIELET = {
    'fr': {
        'lahde': 'lautasaannot-fr.json',
        'kortit': 'apinakortit-fr.json',
        'regles': 'pizza-love-jeu-de-plateau-regles-fr.pdf',
        'guide': 'pizza-love-jeu-de-plateau-guide-fr.pdf',
        'lippu': ('#002654', '#FFFFFF', '#CE1126'),
    },
}


def e(s):
    return html.escape(str(s), quote=False)


KAAVA = re.compile(r'\(?\d+\)?(?: [=+−<>–-] \(?\d+\)?)+')


def kaavat(s):
    """«3 = (2 + 7) − 6» ei katkea rivilta toiselle (mitattu 13.11.2026:
    «3 +» / «2 = 5»). Vain tekstisolmuihin, ei tageihin."""
    return re.sub(r'>([^<]+)<', lambda m: '>' + KAAVA.sub(
        lambda k: '<span class="kaava">%s</span>' % k.group(0), m.group(1)) + '<', s)


def ranska(s):
    """Ranskan valimerkit: sitova valilyonti ennen : ; ! ? » ja jalkeen «.
    Vain tekstiin, ei tageihin (tageissa ei ole valilyontia ennen naita)."""
    s = re.sub(r' ([:;!?»])', ' \\1', s)
    return s.replace('« ', '« ')


def viiri(iskulause):
    """Pizza Love -viiri pelin omasta lahteesta — EI uutta piirrosta."""
    teksti = open(PELIVALINTA, encoding='utf-8').read()
    m = re.search(r'const VIIRI_SVG = "(.*?)";\n', teksti, re.S)
    if not m:
        raise SystemExit('VIIRI_SVG ei loytynyt %s:sta' % PELIVALINTA)
    svg = m.group(1).replace('\\"', '"').replace(
        '<text class="viiri-iskulause"',
        '<text font-family="%s" font-size="5.6" font-weight="700" '
        'letter-spacing="0.1" fill="#fff"' % ISKULAUSE_KIRJASIN)
    return re.sub(r'(<text[^>]*>)[^<]*(</text>)',
                  lambda t: t.group(1) + e(iskulause) + t.group(2), svg)


LATIN = ('U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, '
         'U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, '
         'U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD')
LATIN_EXT = ('U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, '
             'U+02DD-02FF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, '
             'U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF')
DDIN = ('U+0000-00FF, U+0152-0153, U+0160-0161, U+0178, U+017D-017E, '
        'U+2000-206F, U+20AC, U+2122')
# Samat OFL-kirjasimet kuin korttisaannot.py:ssa (perustelu siella).
KIRJASIMET = '''
  @font-face {{ font-family: Otsikko; font-weight: 700;
    src: url(paperi/fontit/barlow-condensed-700-ext.woff2); unicode-range: {ext} }}
  @font-face {{ font-family: Otsikko; font-weight: 700;
    src: url(julkinen/play/fontit/d-din-condensed-700.woff2); unicode-range: {ddin} }}
  @font-face {{ font-family: Viiri; font-weight: 900;
    src: url(paperi/fontit/nunito-900-latin-ext.woff2); unicode-range: {ext} }}
  @font-face {{ font-family: Viiri; font-weight: 900;
    src: url(paperi/fontit/nunito-900-latin.woff2); unicode-range: {latin} }}
  @font-face {{ font-family: Teksti; font-weight: 400;
    src: url(paperi/fontit/source-sans-3-400-latin-ext.woff2); unicode-range: {ext} }}
  @font-face {{ font-family: Teksti; font-weight: 400;
    src: url(paperi/fontit/source-sans-3-400-latin.woff2); unicode-range: {latin} }}
  @font-face {{ font-family: Teksti; font-weight: 700;
    src: url(paperi/fontit/source-sans-3-700-latin-ext.woff2); unicode-range: {ext} }}
  @font-face {{ font-family: Teksti; font-weight: 700;
    src: url(paperi/fontit/source-sans-3-700-latin.woff2); unicode-range: {latin} }}
'''.format(ext=LATIN_EXT, latin=LATIN, ddin=DDIN)

# QR piirretaan sivulla repon omalla koodaajalla (julkinen/play/qr.js).
QR_SKRIPTI = '''<script src="julkinen/play/qr.js"></script>
<script>document.getElementById('qr').innerHTML = norsuQrSvg(%s, { reunus: 4 });</script>'''


def lista(kohdat, tagi='ul'):
    return '<%s class="lista">%s</%s>' % (
        tagi, ''.join('<li>%s</li>' % x for x in kohdat), tagi)


def pala(n):
    return '<img class="pala" src="julkinen/play/kuvat/pala/%d.webp" alt="%d">' % (n, n)


def palalasku(lasku):
    """«1 + 9 = 10» paloiksi: luvut palakuvina, merkit mustina."""
    osat = []
    for o in lasku.split():
        osat.append(pala(int(o)) if o.isdigit() else '<b>%s</b>' % {'-': '−'}.get(o, o))
    return '<div class="palat">%s</div>' % ''.join(osat)


def kuva(nimi, luokka=''):
    return '<img class="%s" src="paperi/lauta/%s.webp" alt="">' % (luokka, nimi)


def leima(teksti, luokka):
    return '<div class="leima %s"><span>%s</span></div>' % (luokka, teksti)


def kortit_html(a):
    """Apinakortit 01–33 samasta lahteesta kuin sivu ja laatikon lappu."""
    if len(a['kortit']) != 33:
        raise SystemExit('Odotettiin 33 apinakorttia, loytyi %d' % len(a['kortit']))
    osat = []
    for k in a['kortit']:
        lisa = ''
        if k.get('huom'):
            lisa += '<span class="huom"><b>%s</b> %s</span>' % (e(a['huom']), e(k['huom']))
        if k.get('tarkennus'):
            lisa += '<span class="huom"><b>%s :</b> %s</span>' % (e(a['tarkennus']), e(k['tarkennus']))
        if k.get('virhe'):
            lisa += '<span class="huom">%s</span>' % e(k['virhe'])
        osat.append('<li class="apinakortti"><span class="nro">%02d</span>'
                    '<span class="teksti"><b>%s</b> %s%s</span></li>'
                    % (k['n'], e(k['nimi']), e(k['ohje']), lisa))
    return ''.join(osat)


YHTEINEN_CSS = '''
{kirjasimet}
  * {{ box-sizing: border-box; margin: 0; padding: 0 }}
  body {{ font-family: Teksti, 'Helvetica Neue', Arial, sans-serif; color: {musta};
          background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact }}
  b {{ font-weight: 700 }}
  img {{ display: block }}
  .kaava {{ white-space: nowrap }}
  .leima {{ position: absolute; border-radius: 50%; background: {leima}; color: #fff;
            display: flex; align-items: center; justify-content: center; text-align: center;
            font: 700 9pt/1.18 Otsikko, sans-serif; letter-spacing: .02em }}
'''


def regles_html(kieli, s, a):
    k = KIELET[kieli]
    taytteet = ''.join(
        '<figure>%s<figcaption>%s</figcaption></figure>' % (pala(i + 1), e(n))
        for i, n in enumerate(s['taytteet']))
    vaiheet = ''.join('<li><span class="nro">%d</span>%s</li>' % (i + 1, e(v))
                      for i, v in enumerate(s['vaiheet']))
    tavat = []
    for t in s['tavat']:
        kuvat = ''.join('<figure>%s<figcaption>%s</figcaption></figure>'
                        % (kuva(n, 'kuva'), e(c)) for n, c in zip(t['kuvat'], t['kuvateksti']))
        tavat.append('<div class="tapa"><h3 class="palkki">%s) %s</h3><p>%s</p>%s</div>'
                     % (t['kirjain'], e(t['otsikko']), e(t['html']), kuvat))
    esim = ('<div class="esim-pizzat"><div class="palat">%s</div><div class="palat">%s<b>+</b>%s<b>+</b>%s</div></div>'
            % (pala(9), pala(1), pala(3), pala(5)))
    hoyry = ''.join('<div class="hoyry-esim">%s<p>%s</p></div>'
                    % (palalasku(x['lasku']), e(x['teksti'])) for x in s['hoyry_esimerkit'])
    pisteet = ''.join('<tr><th>%s</th><td>%s</td></tr>' % (e(p), e(t))
                      for p, t in s['apinat']['pisteet'])

    def muoto(m, kuvaosa=''):
        """Kolme palstaa: kolme ensimmaista osaa rinnakkain; neljas osa
        (Salatut pizzat: Variante) ensimmaisen palstan alle ja lisaosa
        (Nalkaiset apinat: pisteet) viimeisen palstan loppuun — sinne minne
        se sisallossa kuuluu, ei uudelle riville."""
        sanat = m['nimi'].split(' ', 1)
        osa = ['<h3 class="palkki">%s</h3>%s' % (e(o['otsikko']), o['html'])
               for o in m['osat']]
        sarakkeet = osa[:3]
        for x in osa[3:]:
            sarakkeet[0] += '<div class="m-lisa">%s</div>' % x
        sarakkeet[-1] += kuvaosa
        palstat = ''.join('<div class="m-osa">%s</div>' % x for x in sarakkeet)
        return ('<section class="muoto kehys"><div class="muoto-yla">'
                '<h2 class="banneri"><span class="oranssi">%s</span> %s</h2>'
                '<p class="kuvaus">%s</p></div><p class="m-ingressi">%s</p>'
                '<div class="m-palstat">%s</div></section>'
                % (e(sanat[0]), e(sanat[1] if len(sanat) > 1 else ''), e(m['kuvaus']),
                   e(m['ingressi']), palstat))

    apinat_lisa = ('<div class="pisteet"><table>%s</table><p class="pieni">%s</p>%s</div>'
                   % (pisteet, e(s['apinat']['huom']), kuva('singe-mange', 'apina-syo')))

    runko = '''<!doctype html>
<html lang="{kieli}"><meta charset="utf-8"><title>{title}</title>
<style>
{yhteinen}
  @page {{ size: A4; margin: 6mm 7mm 5mm }}
  body {{ font-size: 8.7pt; line-height: 1.36 }}
  .kehys {{ border: .35mm solid {musta} }}
  section {{ margin-top: 2.6mm; padding: 3mm 5mm 2.4mm; position: relative }}
  .uusi-sivu {{ break-before: page; margin-top: 0 }}
  .viiri svg, .qr svg {{ width: 100%; height: auto; display: block }}
  header {{ display: flex; align-items: flex-start; gap: 4.5mm; padding: 0 3.5mm 3mm 3mm }}
  .viiri {{ width: 31mm; flex: none }}
  .otsikko {{ flex: 1; padding-top: 3.2mm }}
  h1 {{ font: 700 22pt/1 Otsikko, sans-serif; text-transform: uppercase; color: {oranssi} }}
  .ala {{ font-weight: 700; font-size: 9.4pt; margin-top: 1.2mm }}
  .ingressi {{ font-size: 9pt; margin-top: 1.4mm }}
  .tiedot {{ list-style: none; display: flex; flex-wrap: wrap; gap: 1.8mm; margin-top: 2.2mm }}
  .tiedot li {{ background: {musta}; color: #fff; border-radius: 1.2mm; padding: 1.3mm 3mm 1.1mm;
                font: 700 9pt/1 Otsikko, sans-serif; text-transform: uppercase; letter-spacing: .02em }}
  .qr {{ flex: none; width: {qrmm}mm; text-align: center; padding-top: 3.2mm }}
  .qr span {{ display: block; margin-top: .8mm; font: 700 7pt/1.15 Otsikko, sans-serif;
              text-transform: uppercase; letter-spacing: .02em }}
  h2 {{ font: 700 17pt/1 Otsikko, sans-serif; text-transform: uppercase; color: {oranssi};
        margin-bottom: 2mm; break-after: avoid }}
  h3 {{ font: 700 10pt/1.1 Otsikko, sans-serif; text-transform: uppercase; letter-spacing: .015em;
        margin: 2.6mm 0 .9mm; break-after: avoid }}
  .palkki {{ background: {musta}; color: #fff; margin: 0 0 1.6mm; padding: 1.1mm 2.2mm .8mm }}
  p {{ margin-bottom: 1.3mm }}
  ul.lista, ol.lista {{ margin: 0 0 1.2mm 4.2mm }}
  ul.lista li, ol.lista li {{ margin-bottom: .6mm }}
  .pieni {{ font-size: 7.6pt; opacity: .8 }}
  .ruudukko {{ display: grid; column-gap: 6mm }}
  .r2 {{ grid-template-columns: 1fr 1fr }}
  .r3 {{ grid-template-columns: 1fr 1fr 1fr }}
  .ruudukko > div > h3:first-child, .ruudukko > div > .palkki:first-child {{ margin-top: 0 }}

  /* sivu 1 */
  .tarina {{ display: flex; gap: 5mm; align-items: center }}
  .tarina > div {{ flex: 1 }}
  .tarina img {{ width: 31mm; flex: none }}
  .tarina h3 {{ margin-top: 0 }}
  .tarina .tavoite {{ border-top: .35mm solid {musta}; margin-top: 1.8mm; padding-top: 1.6mm }}
  .materiel .sisalto {{ font-weight: 700; margin-bottom: 2.4mm }}
  .materiel .ruudukko {{ grid-template-columns: 1fr 1fr 1fr }}
  .plateau {{ width: 100%; border: .2mm solid {viiva}; margin-bottom: 2.4mm }}
  .osa h3 {{ margin-top: 0 }}
  .osa {{ margin-bottom: 2mm }}
  .osa-kuva {{ width: 100%; margin-bottom: 1mm }}
  .pieni-kuva {{ width: 19mm; float: right; margin: 0 0 .5mm 2mm }}
  .kuvapaikka {{ position: relative; margin: 0 0 1mm }}
  .kuvapaikka .osa-kuva {{ width: 78%; margin-top: 3mm }}
  .leima.torni {{ width: 21mm; height: 21mm; right: 0; top: -1mm }}
  .taytteet {{ display: grid; grid-template-columns: repeat(10, 1fr); gap: 1.5mm; margin-top: 1.4mm;
               border-top: .35mm solid {musta}; padding-top: 2mm }}
  .taytteet h3 {{ grid-column: 1 / -1; margin: 0 }}
  .taytteet figure {{ text-align: center }}
  .taytteet .pala {{ width: 7.6mm; margin: 0 auto .5mm }}
  .taytteet figcaption {{ font: 700 8pt/1.05 Otsikko, sans-serif; text-transform: uppercase }}

  /* sivu 2 */
  .vaiheet {{ list-style: none; display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin: 1mm 0 2mm }}
  .vaiheet li {{ background: {musta}; color: #fff; border-radius: 1.2mm; padding: 2mm 3mm;
                 display: flex; align-items: center; gap: 2.4mm;
                 font: 700 10.5pt/1.1 Otsikko, sans-serif; text-transform: uppercase }}
  .vaiheet .nro {{ flex: none; width: 7mm; height: 7mm; border-radius: 50%; background: {oranssi};
                   color: #fff; display: flex; align-items: center; justify-content: center;
                   font: 900 12pt/1 Viiri, sans-serif }}
  .tapa figure {{ margin-bottom: 1.6mm; break-inside: avoid }}
  .tapa .kuva {{ width: 100%; border-radius: 1mm }}
  figcaption {{ font-size: 7.8pt; line-height: 1.25; margin-top: .6mm; font-weight: 700 }}
  .tapa h3.palkki {{ min-height: 9.4mm; display: flex; align-items: center }}
  .huomiot {{ margin-top: 1mm }}
  .vinkki {{ background: {musta}; color: #fff; border-radius: 1.2mm; padding: 2mm 3mm; margin-top: 2mm }}
  .vinkki h3 {{ color: {oranssi}; margin: 0 0 .6mm }}
  .vinkki p {{ margin: 0 }}
  .vaaka {{ border: .45mm dashed {musta}; display: grid; grid-template-columns: 70mm 1fr; column-gap: 6mm;
            align-items: start }}
  .vaaka img.skeema {{ width: 100% }}
  .vaaka h2, .vaaka h2 + p {{ padding-right: 22mm }}
  .leima.lapset {{ width: 22mm; height: 22mm; right: 4mm; top: -4mm }}

  /* sivu 3 */
  .esim-pizzat {{ display: flex; gap: 6mm; margin: 1mm 0 1.6mm }}
  .palat {{ display: flex; align-items: center; gap: 1mm }}
  .palat .pala {{ width: 8mm }}
  .palat b {{ font: 900 13pt/1 Viiri, sans-serif }}
  .sydan {{ display: flex; gap: 2.4mm; align-items: center; margin-top: 1.6mm }}
  .sydan img {{ width: 9mm; flex: none }}
  .sydan p {{ margin: 0 }}
  .apina {{ display: flex; gap: 4mm; align-items: center }}
  .apina img {{ width: 20mm; flex: none; border-radius: 1.4mm }}
  .apina p {{ margin: 0 }}
  .koti {{ display: grid; grid-template-columns: 28mm 1fr 1.25fr; column-gap: 5mm; align-items: start }}
  .koti > img {{ width: 100%; align-self: center; grid-column: 1; grid-row: 1 / span 2 }}
  .koti h2 {{ grid-column: 2 / -1; grid-row: 1 }}
  .koti > div {{ grid-row: 2 }}
  .koti > div:nth-of-type(1) {{ grid-column: 2 }}
  .koti > div:nth-of-type(2) {{ grid-column: 3 }}
  .hoyry-esim {{ display: flex; align-items: center; gap: 3mm; margin-top: 1mm }}
  .hoyry-esim p {{ margin: 0; font-size: 8.2pt }}

  /* sivu 4 */
  .johdanto {{ font-size: 9.6pt; margin-bottom: 0 }}
  .muoto {{ break-inside: avoid; padding-top: 0 }}
  .muoto-yla {{ display: flex; align-items: center; gap: 6mm; margin-bottom: 2.4mm }}
  .banneri {{ flex: 0 0 62mm; background: {musta}; color: #fff; text-align: center;
              padding: 1.8mm 0 4mm; margin: 0; font: 900 14pt/1 Viiri, sans-serif; text-transform: uppercase;
              clip-path: polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%) }}
  .banneri .oranssi {{ color: {oranssi} }}
  .muoto .kuvaus {{ flex: 1; font-weight: 700; margin: 0 }}
  .m-ingressi {{ font-size: 9.4pt }}
  .m-palstat {{ display: grid; grid-template-columns: 1fr 1fr 1fr; column-gap: 6mm }}
  .m-osa {{ margin-bottom: 1.6mm }}
  .m-lisa {{ margin-top: 3mm }}
  .pisteet table {{ border-collapse: collapse; width: 100%; font-size: 8.4pt; margin-bottom: 1.6mm }}
  .pisteet th {{ text-align: left; white-space: nowrap; padding: .9mm 2mm .9mm 0; vertical-align: top;
                 font: 700 9pt/1.2 Otsikko, sans-serif; text-transform: uppercase; color: {oranssi} }}
  .pisteet td {{ padding: .9mm 0; vertical-align: top }}
  .pisteet tr + tr {{ border-top: .2mm solid #d6d6d6 }}
  .apina-syo {{ width: 26mm; margin: 1mm auto 0 }}

  /* sivu 5: apinakortit */
  .kortit-otsake {{ display: flex; gap: 5mm; align-items: center }}
  .kortit-otsake img {{ width: 22mm; border-radius: 1.4mm; flex: none }}
  .kortit-otsake p {{ margin: 0 0 .8mm }}
  ol.kortit {{ list-style: none; columns: 3; column-gap: 5mm; margin-top: 2.6mm }}
  .apinakortti {{ display: flex; gap: 1.6mm; break-inside: avoid; margin-bottom: 1.4mm;
                  font-size: 7.4pt; line-height: 1.26 }}
  .apinakortti .nro {{ flex: none; width: 5mm; height: 5mm; border-radius: 50%; background: {oranssi};
                       color: #fff; font: 900 6.4pt/1 Viiri, sans-serif; display: flex;
                       align-items: center; justify-content: center }}
  .apinakortti .huom {{ display: block; font-size: 6.8pt; opacity: .78; margin-top: .2mm }}

  footer {{ margin-top: 2.6mm; padding-top: 1.4mm; border-top: .35mm solid {musta}; font-size: 7pt;
            display: flex; flex-direction: column; gap: .6mm }}
  footer .oikeudet {{ white-space: nowrap }}
  footer b {{ color: {oranssi} }}
</style>

<header class="kehys">
  <div class="viiri">{viiri}</div>
  <div class="otsikko">
    <h1>{h1}</h1>
    <div class="ala">{alaotsikko}</div>
    <p class="ingressi">{ingressi}</p>
    <ul class="tiedot">{tiedot}</ul>
  </div>
  <div class="qr"><div id="qr"></div><span>{qr_teksti}</span></div>
</header>

<section class="kehys tarina">
  <div><h3>{tarina_otsikko}</h3><p>{tarina}</p></div>
  {kuva_singe}
</section>

<section class="kehys materiel">
  <h2>{osat_otsikko}</h2>
  <p class="sisalto">{sisalto}</p>
  <div class="ruudukko">
    <div>{kuva_plateau}{osat_a}</div>
    <div>{osat_b}</div>
    <div>{osat_c}</div>
  </div>
  <div class="taytteet"><h3>{taytteet_otsikko}</h3>{taytteet}</div>
</section>

<section class="kehys">
  <div class="ruudukko r2">
    <div><h2>{ennen_otsikko}</h2>{ennen}<p class="pieni">{ennen_video}</p></div>
    <div><h2>{valmistelut_otsikko}</h2>{valmistelut}</div>
  </div>
</section>

<section class="kehys uusi-sivu">
  <h2>{vuoro_otsikko}</h2>
  <p>{vuoro}</p>
  <ol class="vaiheet">{vaiheet}</ol>
  <p class="pieni">{perusmuoto}</p>
</section>

<section class="kehys">
  <h2>{siirto_otsikko}</h2>
  <p>{siirto}</p>
  <div class="ruudukko r3">
    <div>{tapa_a}<div class="huomiot"><h3>{huomautukset_otsikko}</h3>{huomautukset}</div></div>
    <div>{tapa_b}<div class="vinkki"><h3>{vinkki_otsikko}</h3><p>{vinkki}</p></div>
      <h3>{ei_siirtoa_otsikko}</h3><p>{ei_siirtoa}</p></div>
    <div>{tapa_c}</div>
  </div>
</section>

<section class="vaaka">
  {leima_lapset}
  <div><img class="skeema" src="paperi/lauta/balance-schema.webp" alt=""></div>
  <div><h2>{vaaka_otsikko}</h2><p>{vaaka}</p><p><b>{vaaka_valmistelu}</b></p>{vaaka_vaiheet}</div>
</section>

<section class="kehys uusi-sivu">
  <h2>{pizza_otsikko}</h2>
  <div class="ruudukko r3">
    <div><p>{pizza}</p>{pizza_vaiheet}</div>
    <div>{pizza_saannot}
      <div class="sydan"><img src="julkinen/play/apinavaaka/sydan.webp" alt=""><div>
        <h3 style="margin-top:0">{sydan_otsikko}</h3><p>{sydan}</p></div></div></div>
    <div><h3 style="margin-top:0">{esimerkki_otsikko}</h3><p>{esimerkki}</p>{esim}
      <p class="pieni">{ei_pizzaa}</p></div>
  </div>
</section>

<section class="kehys apina">
  <img src="julkinen/play/apinavaaka/apinakortti.webp" alt="">
  <div><h2>{apina_otsikko}</h2><p>{apina}</p></div>
</section>

<section class="kehys">
  <h2>{erityis_otsikko}</h2>
  <p>{erityis}</p>
  <div class="ruudukko r2">
    <div><h3>{havikki_otsikko}</h3><p>{havikki}</p>{havikki_lista}</div>
    <div><h3>{juhla_otsikko}</h3><p>{juhla}</p></div>
  </div>
</section>

<section class="kehys koti">
  {kuva_amour}
  <h2>{valinnaiset_otsikko}</h2>
  <div><h3 style="margin-top:0">{kaikille_otsikko}</h3><p>{kaikille}</p></div>
  <div><h3 style="margin-top:0">{hoyry_otsikko}</h3><p>{hoyry}</p>{hoyry_esim}</div>
</section>

<section class="kehys uusi-sivu">
  <h2>{muodot_otsikko}</h2>
  <p class="johdanto">{muodot_ingressi}</p>
</section>
{apinat}
{salatut}

<section class="kehys uusi-sivu">
  <div class="kortit-otsake">
    <img src="julkinen/play/apinavaaka/apinakortti.webp" alt="">
    <div><h2>{kortit_otsikko}</h2><p>{kortit_ingressi}</p><p>{kortit_kaytto}</p>
      <p><b>{kortit_huom}</b> {kortit_yleista}</p></div>
  </div>
  <ol class="kortit">{kortit}</ol>
</section>

<footer>
  <span>{videot} <b>{nakyva}</b></span>
  <span class="oikeudet">{oikeudet} © Merkitysten Oy 2026</span>
</footer>
{qr_skripti}
</html>'''
    return runko.format(
        kieli=kieli, title=e(s['title']), musta=MUSTA, oranssi=ORANSSI, viiva=VIIVA,
        qrmm=QR_MM,
        yhteinen=YHTEINEN_CSS.format(kirjasimet=KIRJASIMET, musta=MUSTA, leima=LEIMA),
        viiri=viiri(s['iskulause']), h1=e(s['h1']), alaotsikko=e(s['alaotsikko']),
        ingressi=e(s['ingressi']),
        tiedot=''.join('<li>%s</li>' % e(x) for x in s['tiedot']),
        qr_teksti=s['qr_teksti'],
        tarina_otsikko=e(s['tarina_otsikko']), tarina=e(s['tarina']),
        kuva_singe=kuva('singe-pense', 'tarina-kuva'),
        osat_otsikko=e(s['osat_otsikko']), sisalto=e(s['sisalto']),
        kuva_plateau=kuva('plateau', 'plateau'),
        osat_a=osat_html([s['osat'][2]], s), osat_b=osat_html([s['osat'][1]], s),
        osat_c=osat_html([s['osat'][0]] + s['osat'][3:], s),
        taytteet_otsikko=e(s['taytteet_otsikko']), taytteet=taytteet,
        ennen_otsikko=e(s['ennen_otsikko']), ennen=lista(s['ennen']),
        ennen_video=e(s['ennen_video']),
        valmistelut_otsikko=e(s['valmistelut_otsikko']), valmistelut=lista(s['valmistelut']),
        vuoro_otsikko=e(s['vuoro_otsikko']), vuoro=e(s['vuoro']), vaiheet=vaiheet,
        perusmuoto=e(s['perusmuoto']),
        siirto_otsikko=e(s['siirto_otsikko']), siirto=s['siirto'],
        tapa_a=tavat[0], tapa_b=tavat[1], tapa_c=tavat[2],
        huomautukset_otsikko=e(s['huomautukset_otsikko']), huomautukset=lista(s['huomautukset']),
        vinkki_otsikko=e(s['vinkki_otsikko']), vinkki=e(s['vinkki']),
        ei_siirtoa_otsikko=e(s['ei_siirtoa_otsikko']), ei_siirtoa=e(s['ei_siirtoa']),
        leima_lapset=leima(s['leima_lapsille'], 'lapset'),
        vaaka_otsikko=e(s['vaaka_otsikko']), vaaka=e(s['vaaka']),
        vaaka_valmistelu=e(s['vaaka_valmistelu']), vaaka_vaiheet=lista(s['vaaka_vaiheet'], 'ol'),
        pizza_otsikko=e(s['pizza_otsikko']), pizza=e(s['pizza']),
        pizza_vaiheet=lista(s['pizza_vaiheet'], 'ol'), pizza_saannot=lista(s['pizza_saannot']),
        sydan_otsikko=e(s['sydan_otsikko']), sydan=e(s['sydan']),
        esimerkki_otsikko=e(s['esimerkki_otsikko']), esimerkki=e(s['esimerkki']), esim=esim,
        ei_pizzaa=e(s['ei_pizzaa']),
        apina_otsikko=e(s['apina_otsikko']), apina=e(s['apina']),
        erityis_otsikko=e(s['erityis_otsikko']), erityis=e(s['erityis']),
        havikki_otsikko=e(s['havikki_otsikko']), havikki=e(s['havikki']),
        havikki_lista=lista(s['havikki_lista']),
        juhla_otsikko=e(s['juhla_otsikko']), juhla=e(s['juhla']),
        kuva_amour=kuva('boite-amour'),
        valinnaiset_otsikko=e(s['valinnaiset_otsikko']),
        kaikille_otsikko=e(s['kaikille_otsikko']), kaikille=e(s['kaikille']),
        hoyry_otsikko=e(s['hoyry_otsikko']), hoyry=e(s['hoyry']), hoyry_esim=hoyry,
        muodot_otsikko=e(s['muodot_otsikko']), muodot_ingressi=e(s['muodot_ingressi']),
        apinat=muoto(s['apinat'], apinat_lisa), salatut=muoto(s['salatut']),
        kortit_otsikko=e(s['kortit_otsikko']), kortit_ingressi=e(a['ingressi']),
        kortit_kaytto=e(a['kaytto']), kortit_huom=e(a['huom']), kortit_yleista=e(a['yleista']),
        kortit=kortit_html(a),
        videot=e(s['videot']), nakyva=s['osoite'].replace('https://', ''),
        oikeudet=e(s['oikeudet']),
        qr_skripti=QR_SKRIPTI % json.dumps(s['osoite']))


def osat_html(osat, s):
    h = ''
    for o in osat:
        img = ''
        if o['kuva'] == 'tours':
            img = ('<div class="kuvapaikka">%s%s</div>'
                   % (kuva('tours', 'osa-kuva'), leima(s['leima_torni'], 'torni')))
        elif o['kuva']:
            img = kuva(o['kuva'], 'pieni-kuva')
        h += '<div class="osa">%s<h3>%s</h3><p>%s</p></div>' % (img, e(o['otsikko']), o['html'])
    return h


def guide_html(kieli, s):
    """Aloitusopas painetun pikaohjeen taitolla: musta otsakepalkki, vasemmalla
    painetun ohjeen kuvasarake A–I, oikealla teksti; vaiheet 1–3 mustassa
    paneelissa oranssein otsikoin. Leimat samoille paikoille kuin painetussa
    (keskipisteet ja halkaisijat mitattu 300 dpi:n rasterista)."""
    k = KIELET[kieli]
    g = s['guide']
    px = 25.4 / 300  # mm / pikseli (300 dpi)
    # leimat kuvasarakkeen koordinaateissa (sarake rajattu y = 170 px alkaen)
    leimat = [(s['leima_torni'], 1075.5, 388.5 - 170, 373), (s['leima_lapsille'], 1090.5, 2138.5 - 170, 309)]
    leimat_html = ''.join(
        '<div class="leima" style="left:%.2fmm;top:%.2fmm;width:%.2fmm;height:%.2fmm"><span>%s</span></div>'
        % ((x - (d + 8) / 2) * px, (y - (d + 8) / 2) * px, (d + 8) * px, (d + 8) * px, t)
        for t, x, y, d in leimat)
    vaiheet = ''.join('<h3>%s</h3>%s' % (e(v['otsikko']), lista(v['kohdat'])) for v in g['vaiheet'])
    sin, val, pun = k['lippu']
    lippu = ('<svg viewBox="0 0 30 30"><clipPath id="ympyra"><circle cx="15" cy="15" r="15"/></clipPath>'
             '<g clip-path="url(#ympyra)"><rect width="10" height="30" fill="%s"/>'
             '<rect x="10" width="10" height="30" fill="%s"/><rect x="20" width="10" height="30" fill="%s"/>'
             '</g></svg>' % (sin, val, pun))
    return '''<!doctype html>
<html lang="{kieli}"><meta charset="utf-8"><title>{title}</title>
<style>
{yhteinen}
  @page {{ size: 210mm 210mm; margin: 0 }}
  html, body {{ width: 210mm; height: 210mm; overflow: hidden }}
  body {{ position: relative; font-size: 8.7pt; line-height: 1.3 }}
  .otsake {{ position: absolute; left: 0; top: 0; width: 210mm; height: {otsake_mm:.2f}mm;
             background: {otsake_tausta}; display: flex; align-items: center; padding: 0 6.1mm }}
  .lisez {{ font: 700 19pt/1 Otsikko, sans-serif; color: {leima}; letter-spacing: .01em }}
  .nimi {{ margin-left: auto; display: flex; align-items: center; gap: 2.6mm;
           font: 700 15pt/1 Otsikko, sans-serif; color: #fff; letter-spacing: .01em }}
  .nimi svg {{ width: 6mm; height: 6mm; display: block }}
  .logo {{ height: 6.8mm; margin-left: 12mm }}
  .kuvat {{ position: absolute; left: 0; top: {otsake_mm:.2f}mm; width: {sarake_mm:.2f}mm }}
  .kuvat > img {{ width: 100% }}
  .leima {{ font-size: 11.5pt; line-height: 1.12 }}
  .teksti {{ position: absolute; left: 108.5mm; right: 6mm; top: 19mm; bottom: 6mm;
             display: flex; flex-direction: column }}
  h3 {{ font: 700 12.4pt/1 Otsikko, sans-serif; text-transform: uppercase; margin: 0 0 1.3mm;
        letter-spacing: .01em }}
  .teksti > h3 + ul + h3 {{ margin-top: 3mm }}
  ul.lista {{ list-style: none; margin: 0 }}
  ul.lista li {{ position: relative; padding-left: 3mm; margin-bottom: .55mm }}
  ul.lista li::before {{ content: ''; position: absolute; left: .4mm; top: 1.45mm; width: 1.3mm;
                         height: 1.3mm; border-radius: 50%; background: {leima} }}
  .paneeli {{ margin-top: auto; background: {otsake_tausta}; color: #fff; border-radius: 2mm;
              padding: 3.4mm 4mm 2.6mm }}
  .paneeli h3 {{ color: {leima}; margin-top: 2.6mm }}
  .paneeli h3:first-child {{ margin-top: 0 }}
  .paneeli ul.lista li::before {{ background: #fff }}
</style>
<div class="otsake"><span class="lisez">{lisez}</span>
  <span class="nimi">{lippu}{nimi}</span><img class="logo" src="paperi/lauta/logo-pizzalove.webp" alt="Pizza Love"></div>
<div class="kuvat"><img src="paperi/lauta/guide-kuvat.webp" alt="">{leimat}</div>
<div class="teksti">
  <h3>{voitto_otsikko}</h3>{voitto}
  <h3>{valmistelut_otsikko}</h3>{valmistelut}
  <div class="paneeli">{vaiheet}</div>
</div>
</html>'''.format(
        kieli=kieli, title=e(s['title']),
        yhteinen=YHTEINEN_CSS.format(kirjasimet=KIRJASIMET, musta=MUSTA, leima=LEIMA),
        otsake_mm=170 * px, sarake_mm=1270 * px, otsake_tausta=OTSAKE_TAUSTA, leima=LEIMA,
        lisez=e(g['lisez']), nimi=e(g['nimi']), lippu=lippu, leimat=leimat_html,
        voitto_otsikko=e(g['voitto_otsikko']), voitto=lista(g['voitto']),
        valmistelut_otsikko=e(g['valmistelut_otsikko']), valmistelut=lista(g['valmistelut']),
        vaiheet=vaiheet)


def tulosta(html_polku, pdf_polku):
    """Macilla Chrome kuten muut generaattorit, muualla Playwright."""
    if os.path.exists(CHROME):
        subprocess.run([CHROME, '--headless', '--disable-gpu', '--no-pdf-header-footer',
                        '--allow-file-access-from-files', '--print-to-pdf=' + pdf_polku,
                        'file://' + html_polku], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--allow-file-access-from-files'])
        sivu = b.new_page()
        sivu.goto('file://' + html_polku, wait_until='load')
        sivu.evaluate('document.fonts.ready')
        sivu.pdf(path=pdf_polku, prefer_css_page_size=True, print_background=True)
        b.close()


def pakkaa(pdf):
    """Kuvat JPEGiksi kohtuulliseen tarkkuuteen (Philibertin 2 Mt raja).
    Ilman pymupdf:aa tiedosto jaa ennalleen ja kokokoe kertoo tuloksen."""
    try:
        import pymupdf
    except ImportError:
        return
    d = pymupdf.open(pdf)
    d.rewrite_images(dpi_threshold=320, dpi_target=260, quality=84, lossy=True,
                     lossless=True, bitonal=False, color=True, gray=True)
    tmp = pdf + '.tmp'
    d.save(tmp, garbage=4, deflate=True)
    d.close()
    os.replace(tmp, pdf)


def teksti(pdf):
    try:
        return subprocess.run(['pdftotext', pdf, '-'], capture_output=True, text=True).stdout
    except FileNotFoundError:
        import pymupdf
        return ''.join(p.get_text() for p in pymupdf.open(pdf))


def norm(s):
    s = re.sub(r'<[^>]+>', '', s).replace(' ', ' ')
    for a, b in {'ﬀ': 'ff', 'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬃ': 'ffi', 'ﬄ': 'ffl'}.items():
        s = s.replace(a, b)
    return re.sub(r'\s+', '', html.unescape(s)).lower()


def sisaltokoe(pdf, s, a):
    """Jokainen otsikko ja apinakortti on oltava VALMIISSA PDF:ssa (luettu
    lahteesta, ei kasin kirjoitetusta listasta)."""
    t = norm(teksti(pdf))
    otsikot = [s[x] for x in s if x.endswith('_otsikko')]
    otsikot += [o['otsikko'] for o in s['osat']] + [x['otsikko'] for x in s['tavat']]
    for m in ('apinat', 'salatut'):
        otsikot += [s[m]['nimi']] + [o['otsikko'] for o in s[m]['osat']]
    otsikot += [k['nimi'] for k in a['kortit']]
    puuttuu = [o for o in otsikot if norm(o) not in t]
    if puuttuu:
        print('🔴 PUUTTUU PDF:STA:', puuttuu)
        return False
    print('Sisaltokoe: %d otsikkoa ja korttia loytyi — OK' % len(otsikot))
    return True


def sivuja(pdf):
    return len(re.findall(rb'/Type\s*/Page[^s]', open(pdf, 'rb').read()))


def tee(kieli):
    k = KIELET[kieli]
    s = json.load(open(os.path.join(TANNE, 'sisalto', k['lahde']), encoding='utf-8'))
    a = json.load(open(os.path.join(TANNE, 'sisalto', k['kortit']), encoding='utf-8'))
    korjaa = ranska if kieli == 'fr' else (lambda x: x)
    virhe = 0
    for laji, tee_html in (('regles', lambda: regles_html(kieli, s, a)),
                           ('guide', lambda: guide_html(kieli, s))):
        sivu = os.path.join(TANNE, '.lautasaannot-%s-%s.html' % (kieli, laji))
        kohde = os.path.join(TANNE, 'julkinen', 'pdf', k[laji])
        with open(sivu, 'w', encoding='utf-8') as f:
            f.write(kaavat(korjaa(tee_html())))
        tulosta(sivu, kohde)
        os.unlink(sivu)
        pakkaa(kohde)
        n, koko = sivuja(kohde), os.path.getsize(kohde)
        print('%s  (%.0f kt, %d sivua)' % (kohde, koko / 1024, n))
        if koko > KOKO_KATTO:
            print('🔴 YLI 2 Mt: Philibert ei ota liitetta vastaan.')
            virhe = 1
        if laji == 'regles':
            if n > SIVU_KATTO:
                print('🔴 SAANNOT KASVOIVAT: %d sivua, katto %d.' % (n, SIVU_KATTO))
                virhe = 1
            if sisaltokoe(kohde, s, a) is False:
                virhe = 1
        elif n != 1:
            print('🔴 ALOITUSOPAS EI MAHDU YHDELLE SIVULLE (%d).' % n)
            virhe = 1
    return virhe


def main():
    pyydetyt = [x for x in sys.argv[1:] if not x.startswith('-')]
    for kieli in (pyydetyt or sorted(KIELET)):
        if kieli not in KIELET:
            raise SystemExit('Tuntematon kieli %r — tunnetut: %s' % (kieli, ', '.join(sorted(KIELET))))
        print('— %s —' % kieli)
        if tee(kieli):
            return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
