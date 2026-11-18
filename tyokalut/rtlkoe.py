# -*- coding: utf-8 -*-
"""Oikealta vasemmalle kirjoitettavat kielet: kääntyykö TEKSTI ja pysyykö ASETTELU.

🔵 Marko 18.11.2026: «Älä käännä koko asettelua, vain tekstin suunta.»

Tämä vartija mittaa molemmat puolet samasta sivusta oikeassa selaimessa:
teksti kääntyy (`direction: rtl`) ja asettelu EI käänny (navigaatio,
kielivalikko, pelilauta, animaatiolavat pysyvät paikallaan).

Taustamittaus 18.11.2026 (dir="rtl" koko sivulle, englannin tekstillä):
  · ohituslinkin `left:-9999px` venytti sivun 9 999 px leveäksi
  · `ul.lista` sai 22 px vasemmalle JA selaimen oman 40 px oikealle:
    rivit 283 → 243 px, korttipelin sivu +102 px
  · pelilauta ja rengasanimaatio eivät liikkuneet lainkaan (0 px)
  · valmisteluanimaatiossa pizza ja boksi vaihtoivat puolta (±138 px)
    ja kortissa 16 kaksi pelaajamerkkiä vaihtoi paikkaa (±72 px)

⚠️ TUNNISTEET JA NUMEROVÄLIT OVAT ERI ASIA — äläkä yhdistä niitä.
Mitattu ja tarkistettu W3C:n i18n-ohjeesta (strings-and-bidi):

  numeroväli    «2–4 pelaajaa» arabiassa näkyy muodossa «4–2», ja se on
                OIKEIN: *«a range such as 10-12 … would look like this in
                Arabic: 12-10»*. Hepreassa ja persiassa päinvastoin.
                ⛔ Älä eristä näitä — eristys RIKKOO arabian välin.
  tunniste      Tuotenimi, «#1», osoite, korttiväli «01–33» luetaan aina
                vasemmalta oikealle (W3C:n esimerkki on ISBN, joka
                *«has to be read LTR»*). Nämä ON eristettävä.

Koe mittaa vain tunnisteet, ja listaa ne perusluetteloa vasten
(`rtlkoe-tunnisteet.txt`): uusi rikkoutuva tunniste on punainen, jo tiedossa
oleva jono keltainen. Numerovälejä se EI mittaa, koska niiden oikea järjestys
riippuu kielestä eikä kirjoitusjärjestelmästä.

Käyttö:
    python3 tyokalut/rtlkoe.py              # docs/ (rakenna.py:n tulos)
    python3 tyokalut/rtlkoe.py --mutaatiot  # todistaa että koe osaa pettää
    python3 tyokalut/rtlkoe.py --tallenna   # tunnisteiden perusluettelo talteen
"""
import glob
import http.server
import json
import os
import re
import shutil
import socket
import socketserver
import subprocess
import sys
import tempfile
import threading
import time

TANNE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(TANNE, 'docs')
MITTAUS_JS = os.path.join(TANNE, 'tyokalut', 'rtlkoe.js')
PERUSLUETTELO = os.path.join(TANNE, 'tyokalut', 'rtlkoe-tunnisteet.txt')
CHROME = os.environ.get('CHROME', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
BUDJETTI = 20000          # ms, Chromen virtuaaliaika
# ⚠️ KAKSI LEVEYTTÄ: media queryt vaihtavat mitkä säännöt ovat voimassa, joten
# kapea yksin ei kata työpöytäasettelua.
LEVEYDET = (375, 1100)

# Sivut joilla on eniten mitattavaa: juokseva teksti, luettelot, pelilauta,
# animaatiolavat ja korttiruudukko.
SIVUT = ['fi/lautapeli.html', 'fi/apinakortit.html', 'fi/korttipeli.html',
         'en/lautapeli.html', 'en/card-game.html']


# ------------------------------------------------------------------ palvelin
class Hiljainen(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def vapaa_portti():
    s = socket.socket()
    s.bind(('127.0.0.1', 0))
    p = s.getsockname()[1]
    s.close()
    return p


class Palvelin(object):
    def __init__(self, juuri):
        self.juuri = juuri
        self.portti = vapaa_portti()

    def __enter__(self):
        juuri = self.juuri

        class K(Hiljainen):
            def __init__(self, *a, **kw):
                super().__init__(*a, directory=juuri, **kw)

        self.srv = socketserver.ThreadingTCPServer(('127.0.0.1', self.portti), K)
        self.srv.daemon_threads = True
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()
        return self

    def __exit__(self, *a):
        self.srv.shutdown()
        self.srv.server_close()

    def osoite(self, polku):
        return 'http://127.0.0.1:%d/%s' % (self.portti, polku)


# -------------------------------------------------------------------- chrome
def siivoa_profiilit():
    """Jokainen päätön käynnistys jättää ~18 Mt:n profiilin. Vanhat pois;
    tuore voi olla toisen istunnon käynnissä oleva ajo."""
    kansio = os.path.expanduser('~/Library/Caches/Google/Chrome-headless')
    raja = time.time() - 600
    for d in glob.glob(os.path.join(kansio, 'scoped_dir*')):
        try:
            if os.path.getmtime(d) < raja:
                shutil.rmtree(d, ignore_errors=True)
        except OSError:
            pass


def kaytto_html(sivu_url, leveys):
    with open(MITTAUS_JS, encoding='utf-8') as f:
        mittaus = f.read()
    return """<!doctype html><meta charset="utf-8"><title>rtlkoe</title>
<style>html,body{margin:0;padding:0}</style>
<iframe id="f" src="%s" width="%d" height="812" style="border:0"></iframe>
<pre id="rtlTulos">kesken</pre>
<script>
%s
</script>
<script>
var f = document.getElementById('f');
function kirjoita(o){ document.getElementById('rtlTulos').textContent = JSON.stringify(o); }
function aja(){
  try { kirjoita(window.rtlMittaa(f.contentDocument)); }
  catch (e) { kirjoita({ virhe: String(e && e.stack || e) }); }
}
f.addEventListener('load', function(){ setTimeout(aja, 800); });
setTimeout(function(){
  if (document.getElementById('rtlTulos').textContent === 'kesken') kirjoita({ virhe: 'iframe ei latautunut' });
}, 12000);
</script>
""" % (sivu_url, leveys, mittaus)


def mittaa(palvelin, sivu, leveys):
    """Yhden sivun mittaus. Kääre kirjoitetaan palvelimen juureen ja poistetaan."""
    kaare = '.rtlkoe-%d-%d.html' % (os.getpid(), leveys)
    polku = os.path.join(palvelin.juuri, kaare)
    with open(polku, 'w', encoding='utf-8') as f:
        f.write(kaytto_html(palvelin.osoite(sivu), leveys))
    try:
        siivoa_profiilit()
        komento = [CHROME, '--headless=new', '--disable-gpu', '--no-sandbox',
                   '--hide-scrollbars', '--incognito',
                   '--virtual-time-budget=%d' % BUDJETTI,
                   '--dump-dom', palvelin.osoite(kaare)]
        try:
            r = subprocess.run(komento, capture_output=True, text=True,
                               timeout=BUDJETTI / 1000 + 60)
        except subprocess.TimeoutExpired:
            return {'virhe': 'Chrome ei palannut ajoissa'}
        m = re.search(r'<pre id="rtlTulos"[^>]*>(.*?)</pre>', r.stdout, re.S)
        if not m:
            return {'virhe': 'tuomiota ei loytynyt DOMista'}
        teksti = m.group(1)
        for a, b in (('&quot;', '"'), ('&amp;', '&'), ('&lt;', '<'), ('&gt;', '>')):
            teksti = teksti.replace(a, b)
        try:
            return json.loads(teksti)
        except ValueError as e:
            return {'virhe': 'tuomio ei jasenny: %s' % e}
    finally:
        try:
            os.unlink(polku)
        except OSError:
            pass


# ------------------------------------------------------------------- tuomiot
def arvioi(sivu, t):
    """Palauttaa (virheet, huomiot, tunnistelista)."""
    virheet, huomiot = [], []
    if t.get('virhe'):
        return ['%s: EI MITATTAVISSA — %s' % (sivu, t['virhe'])], [], []
    if t['rtl']['vaakayli'] > 1:
        virheet.append('%s: sivu vuotaa vaakasuunnassa %d px' % (sivu, t['rtl']['vaakayli']))
    if t['ulkona']:
        virheet.append('%s: %d elementtia ruudun ulkopuolella (%s)'
                       % (sivu, t['ulkona'],
                          ' · '.join(n['n'] for n in t['ulkonaNaytteet'][:3])))
    if abs(t['korkeusKasvoi']) > 2:
        virheet.append('%s: sivun korkeus muuttui %+d px (asettelu eli)'
                       % (sivu, t['korkeusKasvoi']))
    if t['asetteluKaantyi']:
        virheet.append('%s: %d asettelulohkoa kaantyi — vain tekstin suunta saa muuttua (%s)'
                       % (sivu, t['asetteluKaantyi'],
                          ' · '.join(n['n'] for n in t['kaantyneetNaytteet'][:3])))
    if t['lavaSiirtyi']:
        virheet.append('%s: %d lavan osaa siirtyi (pelilauta/animaatio esittaa fyysista pelia) (%s)'
                       % (sivu, t['lavaSiirtyi'],
                          ' · '.join(n['n'] for n in t['lavaNaytteet'][:3])))
    if t['tekstiYhteensa'] and not t['tekstiRtl']:
        virheet.append('%s: yksikaan teksti ei kaantynyt — saanto ei ole voimassa' % sivu)
    elif t['tekstiYhteensa'] and t['tekstiRtl'] < t['tekstiYhteensa'] * 0.5:
        huomiot.append('%s: vain %d/%d tekstilohkoa kaantyi'
                       % (sivu, t['tekstiRtl'], t['tekstiYhteensa']))
    o = t.get('ohituslinkki') or {}
    if o.get('tila') == 'jaa piiloon':
        virheet.append('%s: ohituslinkki ei palaa nakyviin kohdistettaessa (y=%s)'
                       % (sivu, o.get('y')))
    elif o.get('tila') == 'ei mitattavissa':
        huomiot.append('%s: ohituslinkkia ei voitu mitata (dokumentilla ei fokusta)' % sivu)

    # --- koepalat: tunnisteet arabialaisen kantolauseen sisassa
    tunnisteet = []
    for x in t['tunnisteet']:
        if x['tapa'] == 'bdi' and not x['kesti']:
            virheet.append('%s: MITTAUS RIKKI — eristetty %r ei kestanyt (nakyi: %s)'
                           % (sivu, x['teksti'], x['nakyi']))
        if x['tapa'] != 'paljas':
            continue
        if x['eristettava'] and not x['kesti']:
            tunnisteet.append('%s\t%s' % (x['laji'], x['teksti']))
        if not x['eristettava'] and x['kesti']:
            huomiot.append('%s: verrokki %r EI kaantynyt arabiassa — tarkista saanto uudelleen'
                           % (sivu, x['teksti']))
    return virheet, huomiot, tunnisteet


def lue_perusluettelo():
    if not os.path.exists(PERUSLUETTELO):
        return None
    with open(PERUSLUETTELO, encoding='utf-8') as f:
        return set(r.rstrip('\n') for r in f if r.strip() and not r.startswith('#'))


def aja(juuri, sivut, hiljaa=False):
    """Palauttaa (virheet, huomiot, tunnisteet)."""
    virheet, huomiot, tunnisteet = [], [], []
    with Palvelin(juuri) as p:
        for sivu in sivut:
            if not os.path.exists(os.path.join(juuri, sivu)):
                continue
            for leveys in LEVEYDET:
                t = mittaa(p, sivu, leveys)
                nimi = '%s @%d' % (sivu, leveys)
                v, h, tu = arvioi(nimi, t)
                virheet += v
                huomiot += h
                tunnisteet += tu
                if not hiljaa:
                    if t.get('virhe'):
                        print('  %-30s EI MITATTAVISSA (%s)' % (nimi, t['virhe']))
                    else:
                        print('  %-30s teksti %d/%d · asettelu %d · lava %d · ulkona %d · korkeus %+d'
                              % (nimi, t['tekstiRtl'], t['tekstiYhteensa'], t['asetteluKaantyi'],
                                 t['lavaSiirtyi'], t['ulkona'], t['korkeusKasvoi']))
    return virheet, huomiot, tunnisteet


# ----------------------------------------------------------------- mutaatiot
# ⚠️ OHITUSLINKIN KORJAUS ON TÄSSÄ TIETOISESTI VARTIOIMATTA.
# `.ohita{left:-9999px}` venytti sivun 9 999 px leveäksi vain silloin kun koko
# dokumentin suunta kääntyi. Kun käännetään VAIN teksti, sillä ei ole vikatilaa
# — ja mutaatio joka ei voi kaataa koetta on tyhjä koe. Korjaus (pystysuora
# piilotus + `inset-inline-start`) on siis kestävyyttä, ei vartioitu lupaus.
MUTAATIOT = [
    ('luettelon sisennys takaisin fyysiseksi',
     'ul.lista,ol.lista{margin:0 0 12px;padding-inline-start:22px}',
     'ul.lista,ol.lista{margin:0 0 12px;padding-left:22px}'),
    ('asettelun palautussaanto pois',
     'html[data-suunta="rtl"][lang] :is(',
     'html[data-suunta="EI-KAYTOSSA"][lang] :is('),
    ('tekstin suunta pois',
     'html[data-suunta="rtl"] :is(p,ul,ol,li,dd,dt,blockquote,figcaption,summary,',
     'html[data-suunta="EI-KAYTOSSA"] :is(p,ul,ol,li,dd,dt,blockquote,figcaption,summary,'),
]


def mutaatiokoe():
    hiekka = tempfile.mkdtemp(prefix='rtlkoe-')
    try:
        kopio = os.path.join(hiekka, 'docs')
        shutil.copytree(DOCS, kopio)
        css = os.path.join(kopio, 'tyyli.css')
        alkup = open(css, encoding='utf-8').read()
        # ⚠️ Sivut valitaan SISÄLLÖN mukaan, ei listan järjestyksessä.
        # Mitattu: apinakorttisivulla on 0 proosaluetteloa, joten luettelovika
        # ei voinut näkyä siellä — koe oli vihreä koska mitattavaa ei ollut.
        sivut = [s for s in ('fi/korttipeli.html', 'fi/lautapeli.html')
                 if os.path.exists(os.path.join(kopio, s))]

        print('Perustila hiekkalaatikossa:')
        v, _, _ = aja(kopio, sivut)
        if v:
            print('🔴 Hiekkalaatikko on punainen jo ilman mutaatiota — koe on sokea:')
            for r in v:
                print('   ' + r)
            return 1

        huonot = 0
        for nimi, vanha, uusi in MUTAATIOT:
            if alkup.count(vanha) != 1:
                print('🔴 ANKKURI AJAUTUNUT: %r ei osu kertaalleen (%s)' % (vanha[:50], nimi))
                huonot += 1
                continue
            with open(css, 'w', encoding='utf-8') as f:
                f.write(alkup.replace(vanha, uusi, 1))
            v, _, _ = aja(kopio, sivut, hiljaa=True)
            with open(css, 'w', encoding='utf-8') as f:
                f.write(alkup)
            if v:
                print('  ✓ huomattiin: %-40s (%s)' % (nimi, v[0].split(': ', 1)[1][:60]))
            else:
                print('  🔴 EI HUOMATTU: %s' % nimi)
                huonot += 1
        if huonot:
            print('\n🔴 %d mutaatiota meni lapi — vartija ei vartioi niita.' % huonot)
            return 1
        print('\nJokainen mutaatio huomattiin: vartija osaa myos petta.')
        return 0
    finally:
        shutil.rmtree(hiekka, ignore_errors=True)


# ---------------------------------------------------------------------- main
def main():
    if not os.path.exists(CHROME):
        print('Chromea ei loydy: %s — EI MITATTAVISSA' % CHROME)
        return 1
    if '--mutaatiot' in sys.argv:
        return mutaatiokoe()
    if not os.path.isdir(DOCS):
        print('docs/ puuttuu — aja ensin python3 rakenna.py')
        return 1

    print('Tekstin suunta oikealta vasemmalle (%s px):'
          % ' ja '.join(str(x) for x in LEVEYDET))
    virheet, huomiot, tunnisteet = aja(DOCS, SIVUT)

    if '--tallenna' in sys.argv:
        with open(PERUSLUETTELO, 'w', encoding='utf-8') as f:
            f.write('# Tunnisteet jotka hajoavat RTL-tekstissa ilman eristysta.\n'
                    '# sivu<TAB>laji<TAB>merkkijono — tallennettu rtlkoe.py --tallenna\n')
            for r in sorted(set(tunnisteet)):
                f.write(r + '\n')
        print('\nPerusluettelo tallennettu: %d tunnistetta' % len(set(tunnisteet)))
        return 0

    peruste = lue_perusluettelo()
    nyt = set(tunnisteet)
    print('\nTunnisteet jotka hajoavat arabian seassa ilman <bdi>-eristysta: %d' % len(nyt))
    if peruste is None:
        print('  (ei perusluetteloa — aja --tallenna kun lista on hyvaksytty)')
        for r in sorted(nyt)[:10]:
            print('  · ' + r.replace('\t', '  '))
    else:
        uudet = nyt - peruste
        poistuneet = peruste - nyt
        for r in sorted(uudet):
            print('  🔴 UUSI: ' + r.replace('\t', '  '))
        for r in sorted(poistuneet):
            print('  ✓ korjattu: ' + r.replace('\t', '  '))
        if uudet:
            virheet.append('%d uutta eristamatonta tunnistetta' % len(uudet))

    print()
    for r in huomiot:
        print('🟡 ' + r)
    for r in virheet:
        print('🔴 ' + r)
    if virheet:
        return 1
    print('✓ Teksti kaantyy, asettelu ei.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
