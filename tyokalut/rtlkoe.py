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

Koe vaatii tunnisteista **nollan eristämätöntä** valmiissa sivuissa ja arkissa.
Numerovälejä se EI mittaa, koska niiden oikea järjestys riippuu kielestä eikä
kirjoitusjärjestelmästä.

Mitattavat puolet (jokaisella oma mutaationsa):
  teksti        kääntyikö `direction: rtl`
  asettelu      kääntyikö jonkin flex-/grid-lohkon lasten järjestys
  lava          siirtyikö pelilaudan tai animaation osa
  tasaus        katosiko keskitys (`center` -> jotain muuta)
  sisennys      jäikö rtl-luettelon sisennys vasemmalle (fyysinen padding)
  ulkona        valuiko jokin ruudun ulkopuolelle
  korkeus       muuttuiko sivun korkeus (asettelu eli)
  tunnisteet    arabialaisen kantolauseen koepala + staattinen haku

Kohteet: `docs/`:n kielisivut JA painettu sääntöarkki (`koteloarkki.py`), joka
rakentaa oman HTML:nsä eikä kulje `rakenna.py`:n kehyksen läpi.

Käyttö:
    python3 tyokalut/rtlkoe.py              # docs/ + koteloarkki
    python3 tyokalut/rtlkoe.py --mutaatiot  # todistaa että koe osaa pettää
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
f.addEventListener('load', function(){
  /* ⚠️ Arabian kirjasin ladataan vasta kun sen merkkeja piirretaan. Pyydetaan
     se ETUKATEEN, muuten kirjasinmittaus lukee varafonttia. */
  var d = f.contentDocument, AR = '\u0647\u0630\u0647 \u0644\u0639\u0628\u0629';
  var perhe = d.defaultView.getComputedStyle(d.body).fontFamily.split(',')[0];
  function merkitse(n){ d.__arabianKasvot = n; }
  var odota = d.fonts ? d.fonts.load('48px ' + perhe, AR)
                         .then(function(k){ merkitse(k.length); }, function(){ merkitse(0); })
                      : Promise.resolve(merkitse(0));
  odota.then(function(){ setTimeout(aja, 800); });
});
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
    if t.get('sisennysVaarin'):
        virheet.append('%s: %d luettelon sisennys jai vasemmalle (%s)'
                       % (sivu, t['sisennysVaarin'],
                          ' · '.join('%s %d/%d' % (n['n'], n['vasen'], n['oikea'])
                                     for n in t['sisennysNaytteet'][:3])))
    if t.get('tasausMuuttui'):
        virheet.append('%s: %d lohkon keskitys katosi (%s)'
                       % (sivu, t['tasausMuuttui'],
                          ' · '.join('%s %s->%s' % (n['n'], n['ltr'], n['rtl'])
                                     for n in t['tasausNaytteet'][:3])))
    if t['tekstiYhteensa'] and not t['tekstiRtl']:
        virheet.append('%s: yksikaan teksti ei kaantynyt — saanto ei ole voimassa' % sivu)
    elif t['tekstiYhteensa'] and t['tekstiRtl'] < t['tekstiYhteensa'] * 0.5:
        huomiot.append('%s: vain %d/%d tekstilohkoa kaantyi'
                       % (sivu, t['tekstiRtl'], t['tekstiYhteensa']))
    k = t.get('kirjasin') or {}
    if k.get('tila') == 'varafontista':
        virheet.append('%s: arabia tulee laitteen varafontista eika perheesta %r '
                       '(0 arabialaista kasvoa) — painojalki ei ole toistettavissa'
                       % (sivu, k.get('perhe')))
    elif k.get('tila') == 'ei mitattavissa':
        huomiot.append('%s: kirjasinta ei voitu mitata (%s)' % (sivu, k.get('syy', '-')))
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
        if x['odotus'] == 'kaantyy' and x['kesti']:
            huomiot.append('%s: %r EI kaantynyt arabiassa — tarkista saanto uudelleen'
                           % (sivu, x['teksti']))
        if x['odotus'] == 'kestaa' and not x['kesti']:
            huomiot.append('%s: %r kaantyi, vaikka sen piti kestaa itsestaan'
                           % (sivu, x['teksti']))
    return virheet, huomiot, tunnisteet


def tunnisteet_htmlssa(juuri):
    """Tunnisteet valmiissa sivuissa, jotka EIVAT ole <bdi>:n sisalla.

    ⚠️ Kuviot luetaan rakenna.py:sta — yksi lahde. Oma kopio ajautuisi erilleen
    juuri siita mita se vartioi."""
    sys.path.insert(0, TANNE)
    import rakenna
    bdi = re.compile(r'<bdi>.*?</bdi>', re.S)
    ulos = []
    # ⚠️ VAIN KIELISIVUT (kaksikirjaiminen kansio). `play/`, `joulu/` ja
    # `varainhankinta/` eivat ole kehys():n tekemia eivatka saa data-suunta-lippua,
    # joten niiden skannaus tuottaisi vain vaaria halytyksia.
    kansiot = [d for d in sorted(os.listdir(juuri))
               if len(d) == 2 and os.path.isdir(os.path.join(juuri, d))]
    for f in sorted(sum([glob.glob(os.path.join(juuri, d, '*.html')) for d in kansiot], [])):
        s = open(f, encoding='utf-8').read()
        runko = s.split('</head>', 1)[-1]          # <title> ei voi sisaltaa markupia
        puhdas = rakenna._EI_TEKSTIA.sub(' ', bdi.sub(' ', runko))
        for kuvio in rakenna.TUNNISTEET:
            for m in kuvio.finditer(puhdas):
                ulos.append((os.path.relpath(f, juuri), m.group(0)))
    return ulos


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
                        print('  %-30s teksti %d/%d · asettelu %d · lava %d · tasaus %d'
                              ' · sisennys %d · ulkona %d · korkeus %+d · arabia %s'
                              % (nimi, t['tekstiRtl'], t['tekstiYhteensa'], t['asetteluKaantyi'],
                                 t['lavaSiirtyi'], t.get('tasausMuuttui', 0),
                                 t.get('sisennysVaarin', 0), t['ulkona'], t['korkeusKasvoi'],
                                 (t.get('kirjasin') or {}).get('tila', '?')))
    paljaat = tunnisteet_htmlssa(juuri)
    if paljaat:
        nayte = ' · '.join('%s: %s' % x for x in paljaat[:4])
        virheet.append('%d eristamatonta tunnistetta valmiissa sivuissa (%s)'
                       % (len(paljaat), nayte))
    elif not hiljaa:
        print('  eristamattomia tunnisteita valmiissa sivuissa: 0')
    return virheet, huomiot, tunnisteet


# ------------------------------------------------------------- koteloarkki
# 🔵 Marko 18.11.2026: «Tee se koteloarkkiin myös.»
# Painettu sääntöarkki (koteloarkki.py) rakentaa OMAN HTML:nsä eikä kulje
# rakenna.py:n kehyksen läpi, joten se tarvitsee saman kahden säännön
# sopimuksen erikseen. Mitataan samalla mittausosalla (rtlkoe.js) kuin sivut:
# arkki ON oikea selainsivu, vain sen paperi on A4.
#
# ⚠️ ARKIN SISÄLTÖ PAKATAAN RUUTUIHIN JAVASCRIPTILLÄ, joten mittaus on
# odotettava: sivun oma skripti kirjoittaa `document.title`en «VALMIS», ja
# vasta sen jälkeen laatikot ovat paikoillaan.
# ⚠️ Mittaus tehdään yhdellä kielellä (fi): arkin rakenne ja CSS ovat samat
# kaikille kielille, ja jokainen kieli maksaisi oman Chrome-ajonsa.
ARKKI_KIELI = 'fi'
ARKKI_PROBE = """
<script src="tyokalut/rtlkoe.js"></script>
<script>
(function odota(n) {
  function kirjoita(o) {
    var pre = document.createElement('pre');
    pre.id = 'rtlTulos'; pre.textContent = JSON.stringify(o);
    document.body.appendChild(pre);
  }
  if (/^VALMIS/.test(document.title)) {
    /* sama lataus kuin sivujen kaareessa: ilman sita kirjasinmittaus on sokea */
    var AR = '\u0647\u0630\u0647 \u0644\u0639\u0628\u0629';
    var perhe = (getComputedStyle(document.body).fontFamily || '').split(',')[0];
    var merkitse = function (n) { document.__arabianKasvot = n; };
    document.fonts.load('48px ' + perhe, AR)
      .then(function (k) { merkitse(k.length); }, function () { merkitse(0); })
      .then(function () {
        try { kirjoita(window.rtlMittaa(document)); }
        catch (e) { kirjoita({ virhe: String(e && e.stack || e) }); }
      });
    return;
  }
  if (n > 400) { kirjoita({ virhe: 'pakkaus ei valmistunut: ' + document.title }); return; }
  setTimeout(function () { odota(n + 1); }, 30);
})(0);
</script>
"""


def arkki_html(kieli=ARKKI_KIELI):
    sys.path.insert(0, TANNE)
    import koteloarkki
    return koteloarkki.sivu_html(kieli, luonnos=False)


def arkki_tunnisteet(html):
    """Eristamattomat tunnisteet arkin rungossa.

    ⚠️ <title> rajataan pois TARKOITUKSELLA: sen teksti ei voi kantaa <bdi>:ta
    (markup nakyisi merkkeina). Sama rajaus kuin sivuilla."""
    sys.path.insert(0, TANNE)
    import rakenna
    runko = html.split('</title>', 1)[-1]
    bdi = re.compile(r'<bdi>.*?</bdi>', re.S)
    puhdas = rakenna._EI_TEKSTIA.sub(' ', bdi.sub(' ', runko))
    return [m.group(0) for kuvio in rakenna.TUNNISTEET for m in kuvio.finditer(puhdas)]


def arkki_mittaa(html):
    """Arkki selaimessa: file://, koska kuvat ja kirjasimet ovat omilla
    suhteellisilla poluillaan tyopuussa (kuten koteloarkki.tulosta tekee)."""
    polku = os.path.join(TANNE, '.rtlkoe-arkki-%d.html' % os.getpid())
    with open(polku, 'w', encoding='utf-8') as f:
        f.write(html.replace('</html>', ARKKI_PROBE + '</html>'))
    try:
        siivoa_profiilit()
        komento = [CHROME, '--headless=new', '--disable-gpu', '--no-sandbox',
                   '--hide-scrollbars', '--allow-file-access-from-files',
                   '--virtual-time-budget=%d' % BUDJETTI,
                   '--dump-dom', 'file://' + polku]
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


def arkkikoe(html=None, hiljaa=False):
    """Painettu arkki: tunnisteet eristetty JA teksti kaantyy asettelun pysyen."""
    virheet, huomiot = [], []
    if html is None:
        html = arkki_html()
    nimi = 'koteloarkki/%s' % ARKKI_KIELI
    paljaat = arkki_tunnisteet(html)
    if paljaat:
        virheet.append('%s: %d eristamatonta tunnistetta (%s)'
                       % (nimi, len(paljaat), ' · '.join(paljaat[:4])))
    elif not hiljaa:
        print('  %-30s eristamattomia tunnisteita: 0' % nimi)
    tagi = re.search(r'<html[^>]*>', html)
    if not tagi or 'data-suunta=' not in tagi.group(0):
        virheet.append('%s: <html>:lta puuttuu data-suunta — saanto ei voi astua voimaan' % nimi)
    t = arkki_mittaa(html)
    v, h, _ = arvioi(nimi, t)
    virheet += v
    huomiot += h
    if not hiljaa:
        if t.get('virhe'):
            print('  %-30s EI MITATTAVISSA (%s)' % (nimi, t['virhe']))
        else:
            print('  %-30s teksti %d/%d · asettelu %d · tasaus %d · sisennys %d · korkeus %+d'
                  ' · arabia %s'
                  % (nimi, t['tekstiRtl'], t['tekstiYhteensa'], t['asetteluKaantyi'],
                     t.get('tasausMuuttui', 0), t.get('sisennysVaarin', 0), t['korkeusKasvoi'],
                     (t.get('kirjasin') or {}).get('tila', '?')))
    return virheet, huomiot


# ----------------------------------------------------------------- mutaatiot
# ⚠️ OHITUSLINKIN KORJAUS ON TÄSSÄ TIETOISESTI VARTIOIMATTA.
# `.ohita{left:-9999px}` venytti sivun 9 999 px leveäksi vain silloin kun koko
# dokumentin suunta kääntyi. Kun käännetään VAIN teksti, sillä ei ole vikatilaa
# — ja mutaatio joka ei voi kaataa koetta on tyhjä koe. Korjaus (pystysuora
# piilotus + `inset-inline-start`) on siis kestävyyttä, ei vartioitu lupaus.
# (nimi, tiedostokuvio, vanha, uusi[, odotettu osumamaara])
# ⚠️ Osumamaara on OLETUKSENA 1, jotta ajautunut ankkuri huomataan. Jos mutaatio
# tarkoituksella vie monta kohtaa (esim. kaikki kirjasimen painot), maara
# kirjoitetaan nakyviin — silloin sekin on vartioitu luku eika sattuma.
MUTAATIOT = [
    ('luettelon sisennys takaisin fyysiseksi', 'tyyli.css',
     'ul.lista,ol.lista{margin:0 0 12px;padding-inline-start:22px}',
     'ul.lista,ol.lista{margin:0 0 12px;padding-left:22px}'),
    ('asettelun palautussaanto pois', 'tyyli.css',
     'html[data-suunta="rtl"][lang] :is(',
     'html[data-suunta="EI-KAYTOSSA"][lang] :is('),
    ('tekstin suunta pois', 'tyyli.css',
     'html[data-suunta="rtl"] :is(p,ul,ol,li,dd,dt,blockquote,figcaption,summary,',
     'html[data-suunta="EI-KAYTOSSA"] :is(p,ul,ol,li,dd,dt,blockquote,figcaption,summary,'),
    # Kirjoitettu text-align kumoaa komponentin keskityksen, eikä yksikään
    # laatikko liiku: vain teksti siirtyy laatikon sisällä (mitattu 18.11.2026).
    ('tekstin tasaus kirjoitettuna', 'tyyli.css',
     '  direction:rtl}', '  direction:rtl;text-align:right}'),
    # ⚠️ KAIKKI arabian kasvot kerralla. 📐 Mitattu 19.11.2026: kun mutaatio
    # rikkoi vain painon 400, selain valitsi saman perheen painon 700 ja arabia
    # tuli yha Tajawalista — mutaatio meni lapi eli koe oli tyhja.
    # 4 = neljä painoa (400/600/700/800); yksi paino yksin ei riita, koska
    # selain valitsee silloin saman perheen toisen arabialaisen kasvon.
    ('arabian kirjasin pois', 'tyyli.css', 'fontit/tajawal-', 'fontit/ei-ole-tata-', 4),
    ('tunnisteiden eristys pois', '*/*.html', '<bdi>', ''),
]


# Arkin mutaatiot tehdaan VALMIISEEN HTML:aan eika koteloarkki.py:hyn: arkki
# syntyy yhdella funktiokutsulla, joten hiekkalaatikkoa ei tarvita — eika
# tyopuun tiedostoihin kosketa lainkaan (Drive peilaa ne).
# ⚠️ Ankkurit ovat SITA TEKSTIA JOKA ON TULOSTEESSA (CSS:n {{ on jo purettu).
ARKKI_MUTAATIOT = [
    # Staattinen puoli
    ('arkin tunnisteiden eristys pois', '<bdi>', ''),
    ('arkin data-suunta pois', 'data-suunta="', 'data-eisuuntaa="'),
    # Selainpuoli
    ('arkin tekstisaanto pois',
     'html[data-suunta="rtl"] :is(h1, h2, h3, p, li, ul, ol)',
     'html[data-suunta="EI-KAYTOSSA"] :is(h1, h2, h3, p, li, ul, ol)'),
    ('arkin asettelun lukitus pois',
     'html[data-suunta="rtl"][lang] :is(.banneri',
     'html[data-suunta="EI-KAYTOSSA"][lang] :is(.banneri'),
    ('arkin arabian kirjasin pois', 'julkinen/fontit/tajawal-', 'julkinen/fontit/ei-ole-'),
    ('arkin tekstin tasaus kirjoitettuna',
     ':is(h1, h2, h3, p, li, ul, ol) { direction: rtl }',
     ':is(h1, h2, h3, p, li, ul, ol) { direction: rtl; text-align: start }'),
    ('arkin luettelon sisennys fyysiseksi',
     'margin: 0 0 .5mm; margin-inline-start: 3.4mm',
     'margin: 0 0 .5mm 3.4mm'),
]


def arkkimutaatiot():
    """Palauttaa huomaamattomien mutaatioiden maaran."""
    print('Koteloarkin mutaatiot:')
    alkup = arkki_html()
    v, _ = arkkikoe(alkup, hiljaa=True)
    if v:
        print('🔴 Arkki on punainen jo ilman mutaatiota — koe on sokea:')
        for r in v:
            print('   ' + r)
        return 1
    huonot = 0
    for nimi, vanha, uusi in ARKKI_MUTAATIOT:
        osumia = alkup.count(vanha)
        if not osumia:
            print('🔴 ANKKURI AJAUTUNUT: %r ei osu arkkiin (%s)' % (vanha[:50], nimi))
            huonot += 1
            continue
        v, _ = arkkikoe(alkup.replace(vanha, uusi), hiljaa=True)
        if v:
            print('  ✓ huomattiin: %-38s (%s)' % (nimi, v[0].split(': ', 1)[1][:58]))
        else:
            print('  🔴 EI HUOMATTU: %s' % nimi)
            huonot += 1
    return huonot


def eristyskoe():
    """`eristatunnisteet` ilman selainta: osuuko se oikeaan ja VAIN oikeaan."""
    sys.path.insert(0, TANNE)
    import rakenna
    vaatimukset = [
        ('Pelaa #1 Pizza Party nyt', '<bdi>#1 Pizza Party</bdi>'),
        ('Pelaa #1 Pizza Partyssa',  '<bdi>#1 Pizza Partyssa</bdi>'),
        ('Peli Pizza Love\u00ae on', '<bdi>Pizza Love\u00ae</bdi>'),
        ('Kortit 01\u201333 ovat',   '<bdi>01\u201333</bdi>'),
    ]
    kielletyt = [
        ('2\u20134 pelaajaa', '<bdi>'),          # numerovali saa kaantya
        ('10\u201320 min', '<bdi>'),
        ('nuoli &#8249; tassa', '<bdi>'),       # HTML-entiteetti
        ('<a title="#1 Pizza Party">x</a>', '<bdi>'),   # attribuutti
        ('<script>var a="Pizza Love\u00ae";</script>', '<bdi>'),
    ]
    virheet = []
    for syote, odotettu in vaatimukset:
        if odotettu not in rakenna.eristatunnisteet(syote):
            virheet.append('ei eristanyt: %r' % syote)
    for syote, kielletty in kielletyt:
        if kielletty in rakenna.eristatunnisteet(syote):
            virheet.append('eristi liikaa: %r -> %r' % (syote, rakenna.eristatunnisteet(syote)))
    return virheet


def mutaatiokoe():
    hiekka = tempfile.mkdtemp(prefix='rtlkoe-')
    try:
        kopio = os.path.join(hiekka, 'docs')
        shutil.copytree(DOCS, kopio)

        def kohteet(kuvio):
            return sorted(glob.glob(os.path.join(kopio, kuvio)))

        def lue(kuvio):
            return {f: open(f, encoding='utf-8').read() for f in kohteet(kuvio)}

        def kirjoita(tila):
            for f, teksti in tila.items():
                with open(f, 'w', encoding='utf-8') as fh:
                    fh.write(teksti)
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
        for rivi in MUTAATIOT:
            nimi, kuvio, vanha, uusi = rivi[:4]
            odotettu = rivi[4] if len(rivi) > 4 else 1
            alkup = lue(kuvio)
            osumia = sum(t.count(vanha) for t in alkup.values())
            # Yhden tiedoston ankkurin on osuttava odotetun monta kertaa; monen
            # tiedoston kuviossa riittaa etta osumia on (muuten mutaatio ei tee mitaan).
            if (osumia != odotettu) if '*' not in kuvio else (osumia == 0):
                print('🔴 ANKKURI AJAUTUNUT: %r osui %d kertaa (%s)'
                      % (vanha[:50], osumia, nimi))
                huonot += 1
                continue
            kirjoita({f: t.replace(vanha, uusi) for f, t in alkup.items()})
            v, _, _ = aja(kopio, sivut, hiljaa=True)
            kirjoita(alkup)
            if v:
                print('  ✓ huomattiin: %-40s (%s)' % (nimi, v[0].split(': ', 1)[1][:60]))
            else:
                print('  🔴 EI HUOMATTU: %s' % nimi)
                huonot += 1
        huonot += arkkimutaatiot()
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

    v = eristyskoe()
    if v:
        for r in v:
            print('🔴 eristatunnisteet: ' + r)
        return 1
    print('eristatunnisteet: osuu oikeaan ja vain oikeaan')
    print('Tekstin suunta oikealta vasemmalle (%s px):'
          % ' ja '.join(str(x) for x in LEVEYDET))
    virheet, huomiot, tunnisteet = aja(DOCS, SIVUT)
    print('Painettu kotelon saantoarkki:')
    v, h = arkkikoe()
    virheet += v
    huomiot += h

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
