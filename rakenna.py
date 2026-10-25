#!/usr/bin/env python3
"""pizzalove.fi — sivujen rakentaja.

Ajo:  python3 rakenna.py

Lukee tekstit kansiosta sisalto/ (yksi JSON per kieli), kopioi kansion
julkinen/ sisällön ja kirjoittaa valmiin sivuston kansioon docs/.
GitHub Pages julkaisee docs/-kansion sellaisenaan.

Ei riippuvuuksia: pelkkä Python 3.

⚠️ ÄLÄ MUOKKAA docs/-KANSION HTML-TIEDOSTOJA KÄSIN. Ne kirjoitetaan
uudelleen joka ajossa. Muuta tekstiä sisalto/*.json:ssa ja ulkoasua
julkinen/tyyli.css:ssä. Poikkeus: docs/play/ (pelit) ja docs/pdf/
eivät ole rakentajan tuotosta, vaan ne kopioidaan julkinen/-kansiosta.
"""
import json, os, shutil, html

JUURI = os.path.dirname(os.path.abspath(__file__))
SISALTO = os.path.join(JUURI, 'sisalto')
JULKINEN = os.path.join(JUURI, 'julkinen')
ULOS = os.path.join(JUURI, 'docs')

KIELET = ['fi', 'sv', 'en', 'de']      # järjestys kielivalikossa
LOKAALIT = {'fi': 'fi_FI', 'sv': 'sv_FI', 'en': 'en_GB', 'de': 'de_DE'}
OLETUSKIELI = 'en'                      # jos selaimen kieli ei ole mikään näistä
OSOITE = 'https://pizzalove.fi'
SAHKOPOSTI = 'info@merkitysten.fi'

# ⚠️ OMA DOMAIN PÄÄLLE VASTA DNS-VAIHDOSSA. Kun docs/CNAME on olemassa, GitHub
# ohjaa merkitysten.github.io/pizzalove-fi/ -testiosoitteen pizzalove.fi:hin,
# joka osoittaa vielä vanhaan paikkaan, eikä sivua voi testata. Vaihda True:ksi
# samana päivänä kun DNS vaihdetaan (ks. LUE-MINUT.md).
KAYTA_OMAA_DOMAINIA = True

KAUPPA = {
    'korttipeli': 'https://merkitysten.fi/tuote/pizza-love-korttipeli/',
    'lautapeli': 'https://merkitysten.fi/tuote/pizza-love-lautapeli/',
    'molemmat': 'https://merkitysten.fi/tuote/pizza-love-bundle/',
}
# Kielikohtaiset tuotesivut merkitysten.fi:ssä (Polylang for WooCommerce, 17.10.2026).
# DE:llä ei ole omaa kauppaa, joten se käyttää EN-tuotesivuja.
KAUPPA_KIELI = {
    'fi': KAUPPA,
    'sv': {'korttipeli': 'https://merkitysten.fi/sv/tuote/pizza-love-familjeutgava-kortspel/',
           'lautapeli': 'https://merkitysten.fi/sv/tuote/pizza-love-bradspel/',
           'molemmat': 'https://merkitysten.fi/sv/tuote/pizza-love-paket/'},
    'en': {'korttipeli': 'https://merkitysten.fi/en/tuote/pizza-love-card-game/',
           'lautapeli': 'https://merkitysten.fi/en/tuote/pizza-love-board-game/',
           'molemmat': 'https://merkitysten.fi/en/tuote/pizza-love-both-games/'},
}
KAUPPA_KIELI['de'] = KAUPPA_KIELI['en']
MIETTII_W, MIETTII_H = 520, 503  # julkinen/kuvat/basso-miettii.webp
VAAKA_W, VAAKA_H = 720, 489  # julkinen/kuvat/apinavaaka.webp (koottu Apinavaa'an valikkoapinan kerroksista, Marko 20.10.2026)


def kauppa(t, tuote, paikka=None):
    """Tuotesivu merkitysten.fi:ssä sivun kielellä. `paikka` lisää seurantatunnisteen
    (18.10.2026): WooCommercen tilauksessa näkyy, mistä pizzalove.fi:n linkistä ostaja tuli."""
    osoite = KAUPPA_KIELI.get(t['lang'], KAUPPA)[tuote]
    if paikka:
        osoite += ('?utm_source=pizzalove.fi&utm_medium=referral&utm_campaign=pizzalove-%s&utm_content=%s'
                   % (t['lang'], paikka))
    return osoite


def kauppa_banneri(t, kuva, kuva_l, kuva_k, otsikko, teksti, napit, alalinkki=''):
    """Kauppaan ohjaava laatikko: kuva, otsikko, yksi lause, napit (18.10.2026)."""
    nappi_html = ''.join('<a class="nappi%s" href="%s">%s</a>' % ('' if i == 0 else ' nappi--toinen', e(h), e(x))
                         for i, (h, x) in enumerate(napit))
    return '''
<section class="kauppa-banneri">
  <img src="../kuvat/%s" width="%d" height="%d" alt="">
  <div>
    <h2>%s</h2>
    <p>%s</p>
    <div class="napit">%s</div>%s
  </div>
</section>''' % (kuva, kuva_l, kuva_k, e(otsikko), e(teksti), nappi_html, alalinkki)


def ristiinmyynti(t, tuote, paikka):
    """Pelisivun loppuun toinen peli: lukija omistaa jo tämän sivun pelin."""
    ui = t['ui']
    oma = 'korttipeli' if tuote == 'lautapeli' else 'lautapeli'
    s = t[oma]
    kuva = ('lautapeli-laatikko.webp', 793, 900) if tuote == 'lautapeli' else ('tuote-pakkaus.webp', 900, 686)
    return kauppa_banneri(t, kuva[0], kuva[1], kuva[2], s['ristiin_otsikko'], s['ristiin_teksti'],
                          [(kauppa(t, tuote, paikka), ui['kauppa_' + tuote]),
                           (tuote + '.html', s['ristiin_saannot'])])

# Videot: (YouTube-tunnus, puhutun/kirjoitetun tekstin kieli, muoto)
# muoto 'pysty' = Shorts (9:16), 'vaaka' = tavallinen video (16:9)
KORTTI_VIDEOT = {
    'party': [
        ('iRwzJghMnWc', 'en', 'pysty', 'party_en'),
        ('Ms9GfjYAtqw', 'fi', 'pysty', 'party_fi'),
        ('nUZuFesOXug', 'fi', 'pysty', 'party_helpompi'),
        ('paPftmu-tts', 'fi', 'pysty', 'party_helpottaminen'),
        ('xBuNRE8LZic', 'fi', 'pysty', 'party_ei_valmistu'),
        ('O9RfvRenvmo', 'fi', 'pysty', 'party_basso_tapa'),
    ],
    'basso': [
        ('O3jRcwemvrk', 'fi', 'vaaka', 'basso_fi'),
    ],
    'love': [],
}
LAUTA_VIDEOT_KOKOAMINEN = ['HE9301owOKI', 'RbLfhUyXHKw', 'Ya73FhJfj54']
LAUTA_VIDEO_VUORO = ('IN2LvbXo9eA', 'fi')

# ⚠️ PELIN NIMI ON YKSI VAKIO, KOSKA SE ON VIELA AUKI. Marko 20.10.2026:
# «Topping Ten on varmaan se paras tässä kohtaa. Jos keksitään parempi, niin
# muutetaan.» Nimi ei kaanny, joten se EI ole kielitiedostoissa — niissa se
# on paikanpitaja `{nimi}`, joka korvataan tasta. Vaihto on siis yksi rivi.
# 📐 Ja riski on mitattu: «Topping Ten» -nimista pelia ei ole, mutta «Top
# Ten» (Cocktail Games, Spiel des Jahres -ehdokas) on Essenissa tunnettu ja
# kuulostaa aaneen lahes samalta. Verkkohaku ei ole tavaramerkkihaku.
PELIN_NIMI = 'Topping Ten'

PDF = {
    'korttipeli': ('pdf/pizza-love-korttipeli-saannot.pdf', 'korttipeli'),
    # Pikaohje on WordPressissä, koska sitä päivitetään siellä (merkitysten.fi/pizzalove/lautapeli).
    'pikaohje': ('https://merkitysten.fi/wp-content/uploads/2026/09/Pizza-Love-lautapeli-pikaohje_printti.pdf', 'pikaohje'),
    'peruspeli': ('pdf/pizza-love-lautapeli-peruspeli.pdf', 'peruspeli'),
    'apinat': ('pdf/pizza-love-lautapeli-nalkaiset-apinat.pdf', 'apinat'),
    'salatut': ('pdf/pizza-love-lautapeli-salatut-pizzat.pdf', 'salatut'),
    # Alusta on generoitu `pizzaparty/nappula-alusta.py`:lla ja tulostettu
    # A4:ksi paattomalla Chromella. ⛔ Ala muokkaa naita kasin: aja generaattori.
    'tt_vari': ('pdf/topping-ten-alusta-vari.pdf', 'tt_vari'),
    'tt_viiva': ('pdf/topping-ten-alusta-viiva.pdf', 'tt_viiva'),
}


def lue(kieli):
    with open(os.path.join(SISALTO, kieli + '.json'), encoding='utf-8') as f:
        t = json.load(f)
    # Apinakorttien selitykset omassa tiedostossaan (Marko 20.10.2026). Lähde: painettu
    # pitkä ohje (FI/SV/EN), DE käännetty. Puuttuva kieli → suomi.
    polku = os.path.join(SISALTO, 'apinakortit-%s.json' % kieli)
    if not os.path.exists(polku):
        polku = os.path.join(SISALTO, 'apinakortit-fi.json')
    with open(polku, encoding='utf-8') as f:
        t['apinakortit'] = json.load(f)
    return t


def e(s):
    return html.escape(s, quote=True)


def koko_mt(polku):
    p = os.path.join(JULKINEN, polku)
    if not os.path.exists(p):
        return ''
    mt = os.path.getsize(p) / 1e6
    return ('%.1f Mt' % mt).replace('.', ',') if mt >= 1 else '%d kt' % (mt * 1000)


# ---------------------------------------------------------------- osat

def ylaosa(t, sivu, kaikki):
    ui = t['ui']
    nav = [('index.html', ui['nav_etusivu'], 'etusivu'),
           ('korttipeli.html', ui['nav_korttipeli'], 'korttipeli'),
           ('lautapeli.html', ui['nav_lautapeli'], 'lautapeli'),
           ('essen-2026.html', 'Essen 2026', 'essen'),
           ('../play/?kieli=' + t['lang'], ui['nav_pelaa'], 'pelaa')]
    # Varainhankinta on vain suomeksi, joten välilehti näkyy vain kielillä joilla avain on.
    if ui.get('nav_varainhankinta') and t['etusivu'].get('varainhankinta'):
        nav.append((t['etusivu']['varainhankinta']['url'], ui['nav_varainhankinta'], 'varainhankinta'))
    osio = 'lautapeli' if sivu == 'apinakortit' else sivu
    navi = ''.join('<a href="%s"%s>%s</a>' % (h, ' aria-current="page"' if k == osio else '', e(n))
                   for h, n, k in nav)
    # Kielivalinta: yksi nappi (maapallo + nykyinen kieli), joka avaa listan.
    # Uusi kieli = uusi rivi KIELET-listaan ja sisalto/xx.json. (Marko 6.10.2026)
    kielet = ''.join(
        '<li><a href="../%s/%s" hreflang="%s" lang="%s"%s>%s</a></li>' % (
            k, sivutiedosto(sivu), k, k,
            ' aria-current="true"' if k == t['lang'] else '', e(kaikki[k]['nimi']))
        for k in KIELET)
    kielet = '''<details class="kielet">
      <summary aria-label="%s: %s"><svg class="kielet__pallo" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M2.5 12h19M12 2.5c2.6 2.7 3.9 5.9 3.9 9.5s-1.3 6.8-3.9 9.5c-2.6-2.7-3.9-5.9-3.9-9.5S9.4 5.2 12 2.5z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg><span>%s</span><svg class="kielet__nuoli" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></summary>
      <ul class="kielet__lista">%s</ul>
    </details>''' % (e(ui['kielivalinta']), e(t['nimi']), e(t['nimi']), kielet)
    return '''<a class="ohita" href="#sisalto">%s</a>
<header class="ylaosa">
  <div class="palkki">
    <a class="palkki__logo" href="index.html" aria-label="Pizza Love®, %s">
      <img class="palkki__viiri" src="../kuvat/viiri.webp" width="340" height="322" alt="Pizza Love – every pizza counts">
    </a>
    <nav class="kielivalinta" aria-label="%s">%s</nav>
  </div>
  <nav class="sivurivi" aria-label="Pizza Love"><div class="sivurivi__sisus">%s</div></nav>
</header>''' % (e(ui['ohita']), e(ui['nav_etusivu']), e(ui['kielivalinta']), kielet, navi)


def sivutiedosto(sivu):
    return {'etusivu': '', 'korttipeli': 'korttipeli.html', 'lautapeli': 'lautapeli.html',
            'apinakortit': 'apinakortit.html', 'essen': 'essen-2026.html'}[sivu]


def alaosa(t):
    ui = t['ui']
    varain = ''
    if t['lang'] == 'fi':
        varain = '<a href="https://varainhankinta.merkitysten.fi/">%s</a>' % e(ui['alaosa_varainhankinta'])
    return '''<footer class="alaosa">
  <div class="alaosa__sisus">
    <p>%s</p>
    <p>%s <a href="mailto:%s">%s</a></p>
    <div class="alaosa__linkit">
      <a href="https://merkitysten.fi/">%s</a>
      <a href="%s">%s</a>
      %s
    </div>
    <!-- EU-TUNNUS: lisää tähän tarvittaessa, ks. LUE-MINUT.md -->
    <div class="eu-tunnus" id="eu-tunnus" hidden></div>
    <p class="alaosa__pieni">%s © Merkitysten Oy</p>
  </div>
</footer>''' % (e(ui['alaosa_teksti']), e(ui['alaosa_yhteys']), SAHKOPOSTI, SAHKOPOSTI,
                e(ui['alaosa_yritys']), e(kauppa(t, 'korttipeli', 'alaosa')), e(ui['kauppaan']), varain,
                e(ui['alaosa_tavaramerkki']))


def leima(nimi):
    """Tiedoston sisällöstä laskettu ?v=-leima: selain hakee uuden version heti
    kun tiedosto muuttuu, eikä näytä vanhaa välimuistista."""
    import hashlib
    with open(os.path.join(JULKINEN, nimi), 'rb') as f:
        return nimi + '?v=' + hashlib.sha1(f.read()).hexdigest()[:8]


def kehys(t, kaikki, sivu, title, kuvaus, runko):
    lang = t['lang']
    alt = ''.join('<link rel="alternate" hreflang="%s" href="%s/%s/%s">' % (k, OSOITE, k, sivutiedosto(sivu))
                  for k in KIELET)
    alt += '<link rel="alternate" hreflang="x-default" href="%s/">' % OSOITE
    return '''<!doctype html>
<html lang="%s">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>%s</title>
<meta name="description" content="%s">
<meta name="theme-color" content="#F47920">
<link rel="icon" href="../favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="../favicon-180.png">
<link rel="preload" href="../fontit/poppins-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="../fontit/poppins-800.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="../%s">
<link rel="canonical" href="%s/%s/%s">
%s
<meta property="og:title" content="%s">
<meta property="og:description" content="%s">
<meta property="og:image" content="%s/kuvat/jako-%s.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="%s/%s/%s">
<meta property="og:site_name" content="Pizza Love®">
<meta property="og:locale" content="%s">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
</head>
<body>
%s
<main id="sisalto">
%s
</main>
%s
<script src="../%s" defer></script>
</body>
</html>
''' % (lang, e(title), e(kuvaus), leima('tyyli.css'), OSOITE, lang, sivutiedosto(sivu), alt, e(title), e(kuvaus), OSOITE, lang, OSOITE, lang, sivutiedosto(sivu), LOKAALIT[lang],
       ylaosa(t, sivu, kaikki), runko, alaosa(t), leima('sivu.js'))


def video(tunnus, otsikko, kieli, t, muoto='vaaka'):
    merkki = ''
    if kieli and kieli != t['lang']:
        merkki = '<span class="kieli-merkki">%s</span>' % e(t['ui']['video_kieli'].get(kieli, kieli.upper()))
    return '''<figure class="video-kortti">
  <button class="video" type="button" data-id="%s" aria-label="%s: %s">
    <img src="https://i.ytimg.com/vi/%s/hqdefault.jpg" alt="" loading="lazy" width="480" height="360">
  </button>
  <figcaption>%s%s</figcaption>
</figure>''' % (tunnus, e(t['ui']['katso_video']), e(otsikko), tunnus, e(otsikko), merkki)


def videoruudukko(videot, t, muoto):
    if not videot:
        return ''
    luokka = 'videot' + (' videot--vaaka' if muoto == 'vaaka' else '')
    return '<div class="%s">%s</div>' % (luokka, ''.join(videot))


def lataukset(avaimet, nimet, polut):
    rivit = []
    for a in avaimet:
        polku, _ = polut[a]
        if polku.startswith('http'):
            rivit.append('<li><a href="%s"><span>%s</span><small>PDF</small></a></li>' % (polku, e(nimet[a])))
        else:
            rivit.append('<li><a href="../%s" download><span>%s</span><small>PDF %s</small></a></li>' % (
                polku, e(nimet[a]), koko_mt(polku)))
    return '<ul class="lataukset">%s</ul>' % ''.join(rivit)


# ---------------------------------------------------------------- sivut

def varainhankinta_osio(s, avain='varainhankinta'):
    v = s.get(avain)
    if not v:
        return ''
    return '''<section class="laatikko varain" style="margin-top:20px">
  <h2 style="margin-top:0">%s</h2>
  <p>%s</p>
  <div class="napit"><a class="nappi" href="%s">%s</a></div>
</section>''' % (e(v['otsikko']), e(v['teksti']), v['url'], e(v['nappi']))


def etusivu(t, kaikki):
    s = t['etusivu']
    lang = t['lang']
    runko = '''
<section class="sankari">
  <div>
    <h1>%s</h1>
    <p class="ingressi">%s</p>
  </div>
  <img class="sankari__basso" src="../kuvat/halaus.webp" width="420" height="420" alt="">
</section>

<h2 style="margin-top:36px">%s</h2>
<div class="pelit">
  <a class="peli-kortti" href="korttipeli.html">
    <div class="peli-kortti__kuva"><img src="../kuvat/tuote-pakkaus.webp" width="900" height="686" alt=""></div>
    <div class="peli-kortti__teksti">
      <p class="peli-kortti__nimi">%s</p>
      <p class="peli-kortti__tiedot">%s</p>
      <span class="peli-kortti__linkki">%s</span>
    </div>
  </a>
  <a class="peli-kortti" href="lautapeli.html">
    <div class="peli-kortti__kuva"><img src="../kuvat/lautapeli-laatikko.webp" width="793" height="900" alt=""></div>
    <div class="peli-kortti__teksti">
      <p class="peli-kortti__nimi">%s</p>
      <p class="peli-kortti__tiedot">%s</p>
      <span class="peli-kortti__linkki">%s</span>
    </div>
  </a>
</div>

<a class="pelaa-banneri" href="../play/?kieli=%s">
  <img src="../kuvat/basso-syo.webp" width="438" height="520" alt="">
  <div>
    <strong>%s</strong>
    <span>%s</span>
    <span class="nappi">%s</span>
  </div>
</a>

%s
%s
''' % (e(s['h1']), s['ingressi'], e(s['valitse']),
       e(t['ui']['nav_korttipeli']), e(s['korttipeli_tiedot']), e(s['avaa']),
       e(t['ui']['nav_lautapeli']), e(s['lautapeli_tiedot']), e(s['avaa']),
       lang, e(s['pelaa_otsikko']), e(s['pelaa_teksti']), e(s['pelaa_nappi']),
       varainhankinta_osio(s) + varainhankinta_osio(s, 'brandedition') + varainhankinta_osio(s, 'jalleenmyyjat'),
       kauppa_banneri(t, 'tuote-pakkaus.webp', 900, 686, s['kauppa_otsikko'], s['kauppa_teksti'],
                      [(kauppa(t, 'korttipeli', 'etusivu'), t['ui']['kauppa_korttipeli']),
                       (kauppa(t, 'lautapeli', 'etusivu'), t['ui']['kauppa_lautapeli']),
                       (kauppa(t, 'molemmat', 'etusivu'), t['ui']['kauppa_molemmat'])]))
    return kehys(t, kaikki, 'etusivu', s['title'], s['kuvaus'], runko)


def korttipeli(t, kaikki):
    s = t['korttipeli']
    lang = t['lang']
    tiedot = ''.join('<li>%s</li>' % e(x) for x in s['tiedot'])
    hyppy = ''.join('<a href="#%s">%s</a>' % (k, e(v)) for k, v in s['hyppy'].items())

    muodot = []
    for i, m in enumerate(s['muodot']):
        vids = KORTTI_VIDEOT.get(m['avain'], [])
        # oman kielen videot ensin, sitten englanti, sitten muut
        jarj = sorted(vids, key=lambda v: (v[1] != lang, v[1] != 'en'))
        osat = [video(v[0], s['videot'][v[3]], v[1], t) for v in jarj]
        muoto = jarj[0][2] if jarj else 'pysty'
        vblock = ''
        if osat:
            vblock = '<h3>%s</h3>%s' % (e(s['videot_otsikko']), videoruudukko(osat, t, muoto))
        muodot.append('''<details class="muoto" id="%s"%s>
  <summary><span class="muoto__numero">%s</span><span class="muoto__nimi">%s</span><span class="muoto__kuvaus">%s</span></summary>
  <div class="muoto__sisus">%s%s</div>
</details>''' % (m['avain'], ' open' if i == 0 else '', e(m['numero']), e(m['nimi']), e(m['kuvaus']), vblock, m['html']))

    runko = '''
<h1>%s</h1>
<p class="ingressi">%s</p>
<ul class="pelin-tiedot">%s</ul>
<nav class="hyppylinkit">%s</nav>

<h2 id="perusteet">%s</h2>
<p>%s</p>
<div class="korttiparit">
  <div class="korttipari"><img src="../kuvat/tausta-pizza.webp" width="351" height="532" alt=""><div><h3 style="margin-top:0">%s</h3><p>%s</p></div></div>
  <div class="korttipari"><img src="../kuvat/tausta-tayte.webp" width="351" height="532" alt=""><div><h3 style="margin-top:0">%s</h3><p>%s</p></div></div>
</div>

<div class="laatikko">
  <h3 style="margin-top:0">%s</h3>
  <p>%s</p>
  <h3>%s</h3>
  <p>%s</p>
  <h3>%s</h3>
  <div class="esimerkki" role="img" aria-label="%s">
    <img src="../kuvat/pizza-31.webp" width="351" height="532" alt=""><b>=</b>
    <img src="../kuvat/tayte-2.webp" width="351" height="532" alt=""><b>+</b>
    <img src="../kuvat/tayte-3.webp" width="351" height="532" alt="">
  </div>
  <p>%s</p>
</div>

<h3>%s</h3>
<div class="korttiparit">
  <div class="laatikko" style="margin:0"><h3 style="margin-top:0">%s</h3><p>%s</p></div>
  <div class="laatikko" style="margin:0"><h3 style="margin-top:0">%s</h3><p>%s</p></div>
</div>

<div class="huomio"><img src="../kuvat/basso-miettii.webp" width="520" height="503" alt=""><p>%s</p></div>

<h2 id="muodot">%s</h2>
<p>%s</p>
%s

<div class="pelaa-banneri" style="margin-top:28px">
  <img src="../kuvat/basso-syo.webp" width="438" height="520" alt="">
  <div>
    <strong>%s</strong>
    <span>%s</span>
    <a class="nappi" href="../play/?kieli=%s">%s</a>
  </div>
</div>

<h2 id="lataa">%s</h2>
<p>%s</p>
%s
%s
''' % (e(s['h1']), e(s['ingressi']), tiedot, hyppy,
       e(s['perusteet_otsikko']), e(s['perusteet_ingressi']),
       e(s['pizzakortit_otsikko']), e(s['pizzakortit']), e(s['taytekortit_otsikko']), e(s['taytekortit']),
       e(s['perussaanto_otsikko']), e(s['perussaanto']), e(s['arvo_otsikko']), s['arvo'],
       e(s['esimerkki_otsikko']), e(s['esimerkki_alt']), e(s['esimerkki']),
       e(s['tavat_otsikko']), e(s['helpompi_otsikko']), e(s['helpompi']), e(s['basso_tapa_otsikko']), s['basso_tapa'],
       s['huomio_bruno'],
       e(s['muodot_otsikko']), e(s['muodot_ingressi']), '\n'.join(muodot),
       e(s['pelaa_otsikko']), e(s['pelaa_teksti']), lang, e(t['ui']['nav_pelaa']),
       e(s['lataa_otsikko']), e(s['lataa_teksti']),
       lataukset(['korttipeli'], {'korttipeli': s['lataa_tiedosto']}, PDF),
       ristiinmyynti(t, 'lautapeli', 'korttipelisivu'))
    return kehys(t, kaikki, 'korttipeli', s['title'], s['kuvaus'], runko)


def lautapeli(t, kaikki):
    s = t['lautapeli']
    lang = t['lang']
    tiedot = ''.join('<li>%s</li>' % e(x) for x in s['tiedot'])
    hyppy = ''.join('<a href="#%s">%s</a>' % (k, e(v)) for k, v in s['hyppy'].items())
    hyppy += '<a href="apinakortit.html">%s</a>' % e(t['apinakortit']['linkki'])
    kok = videoruudukko([video(v, s['videot'][v], None, t) for v in LAUTA_VIDEOT_KOKOAMINEN], t, 'vaaka')
    vuoro = videoruudukko([video(LAUTA_VIDEO_VUORO[0], s['videot'][LAUTA_VIDEO_VUORO[0]], LAUTA_VIDEO_VUORO[1], t)], t, 'vaaka')
    valm = ''.join('<li>%s</li>' % e(x) for x in s['valmistelut'])
    vaiheet = ''.join('<li><h3>%s</h3>%s</li>' % (e(v['otsikko']), v['html']) for v in s['vaiheet'])
    # Apinakortin nostaminen on viimeinen vaihe: sen perään suora linkki korttien selityksiin.
    vaiheet = (vaiheet[:-len('</li>')] + '<p style="margin-top:10px"><a class="nappi nappi--toinen" '
               'href="apinakortit.html">%s</a></p></li>' % e(t['apinakortit']['linkki']))
    muodot = ''.join('''<details class="muoto">
  <summary><span class="muoto__nimi">%s</span><span class="muoto__kuvaus">%s</span></summary>
  <div class="muoto__sisus" style="padding-top:14px">%s</div>
</details>''' % (e(m['nimi']), e(m['kuvaus']), m['html']) for m in s['muodot'])

    runko = '''
<h1>%s</h1>
<p class="ingressi">%s</p>
<ul class="pelin-tiedot">%s</ul>
<nav class="hyppylinkit">%s</nav>

<h2 id="kokoaminen">%s</h2>
<p>%s</p>
%s

<h2 id="peli">%s</h2>
<div class="laatikko">
  <h3 style="margin-top:0">%s</h3>
  <p>%s</p>
  <h3>%s</h3>
  <ul class="lista">%s</ul>
</div>
<h3>%s</h3>
<ol class="vaiheet">%s</ol>
%s

<h2 id="muodot">%s</h2>
<p>%s</p>
%s

<div class="pelaa-banneri pelaa-banneri--vaaka">
  <div class="vaaka-apina" aria-hidden="true"><img src="../kuvat/apinavaaka.webp" width="%s" height="%s" alt=""></div>
  <div>
    <strong>%s</strong>
    <span>%s</span>
    <a class="nappi" data-syty href="../play/apinavaaka.html?kieli=%s">%s</a>
  </div>
</div>

<!-- Apinan kerrosten geometria yhdestä lähteestä (pelin apinavaaka.js); molemmat defer, joten tämä ajetaan ennen sivu.js:ää. -->
<script src="../play/apinavaaka/apinavaaka.js" defer></script>

<h2 id="lataa">%s</h2>
<p>%s</p>
%s
%s
''' % (e(s['h1']), e(s['ingressi']), tiedot, hyppy,
       e(s['kokoaminen_otsikko']), e(s['kokoaminen']), kok,
       e(s['peli_otsikko']), e(s['voittaminen_otsikko']), s['voittaminen'],
       e(s['valmistelut_otsikko']), valm,
       e(s['vuoro_otsikko']), vaiheet, vuoro,
       e(s['muodot_otsikko']), e(s['muodot_ingressi']), muodot,
       VAAKA_W, VAAKA_H, e(s['pelaa_otsikko']), e(s['pelaa_teksti']), lang, e(t['ui']['nav_pelaa']),
       e(s['lataa_otsikko']), e(s['lataa_teksti']),
       lataukset(['pikaohje', 'peruspeli', 'apinat', 'salatut'], s['lataukset'], PDF),
       ristiinmyynti(t, 'korttipeli', 'lautapelisivu'))
    return kehys(t, kaikki, 'lautapeli', s['title'], s['kuvaus'], runko)


def apinakortit(t, kaikki):
    """Apinakorttien selitykset 01–33 (Marko 20.10.2026: «josta pelaaja voisi ne nopeasti katsoa»).
    Numeroruudukko vie suoraan korttiin (#k01…#k33). Kentät: nimi, ohje, huom (painetun
    ohjeen HUOM!), tarkennus (Markon hyväksymä selvennys monitulkintaiseen korttiin),
    virhe (huomautus painetun ohjeen virheestä, esim. EN-kortin 30 numerointi).
    Tekstit: sisalto/apinakortit-xx.json."""
    a = t['apinakortit']
    numerot = ''.join('<a href="#k%02d">%02d</a>' % (k['n'], k['n']) for k in a['kortit'])
    kortit = []
    for k in a['kortit']:
        lisa = ''
        if k.get('huom'):
            lisa += '<p class="apinakortti__huom"><b>%s</b> %s</p>' % (e(a['huom']), e(k['huom']))
        if k.get('tarkennus'):
            lisa += '<p class="apinakortti__tarkennus"><b>%s:</b> %s</p>' % (e(a['tarkennus']), k['tarkennus'])
        if k.get('virhe'):
            lisa += '<p class="apinakortti__huom">%s</p>' % e(k['virhe'])
        kortit.append('<article class="apinakortti" id="k%02d">\n  <span class="apinakortti__nro">%02d</span>\n'
                      '  <div><h3>%s</h3><p>%s</p>%s</div>\n</article>'
                      % (k['n'], k['n'], e(k['nimi']), e(k['ohje']), lisa))
    runko = '''
<p class="murupolku"><a href="lautapeli.html">← %s</a></p>
<h1>%s</h1>
<p class="ingressi">%s</p>
<p class="pieni">%s</p>
%s
<nav class="korttinumerot" aria-label="%s">%s</nav>
<div class="apinakortit">%s</div>
<p class="murupolku" style="margin-top:28px"><a href="lautapeli.html">← %s</a></p>
''' % (e(a['takaisin']), e(a['h1']), e(a['ingressi']), e(a['kaytto']),
       # Yleinen sääntö kaikille korteille (Marko 19.1.2026 pelaajalle): vuoro päättyy nostoon,
       # säästettävä kortti on nostajan.
       ('<p class="apinakortit__yleista">%s</p>' % e(a['yleista'])) if a.get('yleista') else '',
       e(a['hae']), numerot,
       '\n'.join(kortit), e(a['takaisin']))
    return kehys(t, kaikki, 'apinakortit', a['title'], a['kuvaus'], runko)


def essen2026(t, kaikki):
    """Messusivu: tarjoukset ja tuotteet edella, peli ja saannot perassa.

    Marko 20.10.2026: «Essen sivu on nyt tunkkainen eikä yhtään innostava.
    Siellä pitäisi olla meidän hauskaa grafiikkaa ja raikkautta. Sääntöihin
    joku järkevä rakenne eikä tuollalailla kaikki samassa pötkössä.»

    Sivu EI johdata pelin nimella: iso otsikko lukisi lanseeraukseksi ja
    asettaisi odotuksen jota testaamaton kevyt peli ei taytä. Messuvieras
    etsii hintaa ja tuotetta; peli on pussin mukana tuleva bonus.

    ⚠️ Hinta on kortin isoin asia, ei alaviite — siksi `.tarjous__hinta` on
    oma elementtinsa eika osa lausetta.
    """
    a = t['toppingten']

    def tt(avain):
        return a[avain].replace('{nimi}', PELIN_NIMI)

    tarjoukset = []
    for hinta, nimi, lisa, tuote, kuva, saasto in a['tarjoukset']:
        linkki = kauppa(t, tuote, 'essen') if tuote else ''
        tagi = ('a href="%s"' % e(linkki)) if linkki else 'div'
        teksti = ('<span class="tarjous__hinta">%s</span>'
                  '<span class="tarjous__nimi">%s</span>%s%s%s'
                  % (e(hinta), e(nimi),
                     '<span class="tarjous__lisa">%s</span>' % e(lisa) if lisa else '',
                     '<span class="tarjous__saasto">%s</span>' % e(saasto) if saasto else '',
                     '<span class="tarjous__linkki">%s</span>' % e(t['ui']['kauppaan'])
                     if linkki else ''))
        # Linkiton kortti on pussi: oma leveä rivinsä, kuva vierellä eikä päällä.
        # Marko 20.10.2026: pussin kohdalla mehustetaan noppaa ja pinottavia
        # täytekolikoita, ja se vaatii tilaa jota 2-palstainen ruutu ei anna.
        tarjoukset.append(
            '<%s class="tarjous%s">'
            '<img class="tarjous__kuva" src="../kuvat/%s" alt="" loading="lazy">'
            '%s</%s>'
            % (tagi, '' if linkki else ' tarjous--nosto', e(kuva),
               teksti if linkki else '<div class="tarjous__teksti">%s</div>' % teksti,
               'a' if linkki else 'div'))

    tuotteet = ''.join(
        '<a class="peli-kortti" href="%s">'
        '<div class="peli-kortti__kuva"><img src="../kuvat/%s" alt="" loading="lazy"></div>'
        '<div class="peli-kortti__teksti"><p class="peli-kortti__nimi">%s</p>'
        '<p class="peli-kortti__tiedot">%s</p>'
        '<span class="peli-kortti__linkki">%s</span></div></a>'
        % (e(linkki), e(kuva), e(nimi), e(tiedot), e(a['avaa']))
        for nimi, tiedot, linkki, kuva in a['tuotteet'])

    editiot = ''.join(
        '<figure class="peli-kortti peli-kortti--kuvaton">'
        '<div class="peli-kortti__kuva"><img src="../kuvat/%s" alt="" '
        'loading="lazy"></div>'
        '<figcaption class="peli-kortti__teksti">'
        '<p class="peli-kortti__nimi">%s</p></figcaption></figure>'
        % (e(kuva), e(nimi)) for nimi, kuva in a['editiot'])

    vaiheet = ''.join(
        '<article class="vaihe vaihe--nro"><span class="vaihe__nro">%d</span>'
        '<p>%s</p></article>' % (i + 1, e(rivi))
        for i, rivi in enumerate(a['vuoro']))

    laatikko = lambda otsikko, teksti: (
        '<article class="vaihe"><h4>%s</h4><p>%s</p></article>'
        % (e(a[otsikko]), e(a[teksti])))
    # Markon saantomuutos 21.10.2026: tayttaminen PAATTAA pelin, arvo VOITTAA
    # sen. Siksi loppu, pisteet ja tasatilanne ovat kolme eri laatikkoa eivatka
    # yksi «voitto» — ne ovat kolme eri hetkea, ja niiden niputtaminen oli juuri
    # se mika teki vanhasta saannosta sekavan.
    saannot = (laatikko('tavoite_otsikko', 'tavoite')
               + laatikko('valmistelu_otsikko', 'valmistelu')
               + laatikko('ohi_otsikko', 'ohi')
               + laatikko('aloitus_otsikko', 'aloitus')
               + laatikko('voitto_otsikko', 'voitto')
               + laatikko('pisteet_otsikko', 'pisteet')
               + laatikko('tasapeli_otsikko', 'tasapeli')
               + laatikko('vinkki_otsikko', 'vinkki'))
    muunnelmat = ''.join('<article class="vaihe"><h4>%s</h4><p>%s</p></article>'
                         % (e(nimi), e(teksti)) for nimi, teksti in a['muunnelmat'])
    nimet = {'tt_vari': a['lataa_vari'], 'tt_viiva': a['lataa_viiva']}

    runko = '''
<section class="sankari">
  <div>
    <p class="merkki">%s</p>
    <h1>%s</h1>
    <p class="ingressi">%s</p>
  </div>
  <img class="sankari__basso" src="../kuvat/basso-syo.webp" width="438" height="520" alt="">
</section>

<h2>%s</h2>
<p>%s</p>
<div class="tarjoukset">%s</div>
<div class="kaupanpaalle">
  <img src="../kuvat/basso-nojaa.webp" alt="" loading="lazy">
  <div><strong>%s</strong><span>%s</span><span>%s</span></div>
</div>

<h2>%s</h2>
<div class="pelit">%s</div>

<h2>%s</h2>
<p>%s</p>
<div class="pelit pelit--kolme">%s</div>

<h2 id="peli">%s</h2>
<p class="ingressi">%s</p>
<p class="pieni">%s</p>

<section class="laatikko">
  <h3>%s</h3>
  <ul class="luettelo">%s</ul>
</section>

<h3>%s</h3>
<div class="alusta-lataus">
  <img src="../kuvat/topping-ten-alusta.webp" alt="" loading="lazy">
  <div><p>%s</p>%s</div>
</div>

<h3>%s</h3>
<div class="vaiheet">%s</div>
<p>%s</p>
<p class="pieni">%s</p>

<div class="vaiheet">%s</div>

<h3>%s</h3>
<div class="vaiheet">%s</div>
''' % (e(a['merkki']), e(a['sivu_h1']), e(a['sivu_ingressi']),
       e(a['tarjoukset_otsikko']), e(a['tarjoukset_ingressi']), ''.join(tarjoukset),
       e(a['kaupanpaalle']), e(a['kaupanpaalle_lisa']), e(a['tatuointi']),
       e(a['tuotteet_otsikko']), tuotteet,
       e(a['editiot_otsikko']), e(a['editiot_teksti']), editiot,
       e(tt('peli_otsikko')), e(tt('ingressi')), e(a['tiedot']),
       e(a['sisalto_otsikko']),
       ''.join('<li>%s</li>' % e(r) for r in a['sisalto']),
       e(a['lataa_otsikko']), e(a['lataa']),
       lataukset(['tt_vari', 'tt_viiva'], nimet, PDF),
       e(a['vuoro_otsikko']), vaiheet, e(a['vuoro_huom']), e(a['vuoro_raja']),
       saannot,
       e(a['muunnelmat_otsikko']), muunnelmat)
    return kehys(t, kaikki, 'essen', tt('title'), tt('kuvaus'), runko)


def juurisivu(kaikki):
    """pizzalove.fi/ — ohjaa selaimen kielen mukaan. QR-koodit osoittavat tänne."""
    linkit = ''.join('<li><a href="%s/" hreflang="%s" lang="%s">%s</a></li>' % (k, k, k, e(kaikki[k]['nimi']))
                     for k in KIELET)
    return '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pizza Love®</title>
<meta name="description" content="Pizza Love® – rules, videos and online game · säännöt, videot ja verkkopeli">
<link rel="icon" href="favicon-32.png" sizes="32x32">
<meta property="og:title" content="Pizza Love® – säännöt, videot ja verkkopeli">
<meta property="og:description" content="Pizza Love® -korttipelin ja -lautapelin säännöt, ohjevideot ja Pizza Party -verkkopeli. Suomeksi, ruotsiksi, englanniksi ja saksaksi.">
<meta property="og:image" content="%s/kuvat/jako-fi.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="%s/">
<meta property="og:site_name" content="Pizza Love®">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<script>
(function () {
  var kielet = %s, valittu = null;
  try { valittu = localStorage.getItem('pizzalove-kieli'); } catch (e) {}
  if (kielet.indexOf(valittu) < 0) {
    valittu = null;
    var selain = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < selain.length && !valittu; i++) {
      var k = String(selain[i]).slice(0, 2).toLowerCase();
      if (kielet.indexOf(k) >= 0) valittu = k;
    }
  }
  location.replace((valittu || '%s') + '/' + location.hash);
})();
</script>
<style>body{font-family:system-ui,sans-serif;background:#FAF6EE;color:#1A1A1A;display:grid;place-items:center;min-height:90vh;margin:0}
ul{list-style:none;padding:0;display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
a{display:block;padding:12px 18px;border-radius:12px;background:#E96E2A;color:#1A1A1A;font-weight:700;text-decoration:none}</style>
</head>
<body>
<main><p style="text-align:center;font-weight:700">Pizza Love®</p><ul>%s</ul></main>
</body>
</html>
''' % (OSOITE, OSOITE, json.dumps(KIELET), OLETUSKIELI, linkit)


def varainhankinta_ohjaus(kaikki):
    """pizzalove.fi/varainhankinta → varainhankinta.merkitysten.fi

    🔵 Marko 14.10.2026: «olisi kätevää, että se löytyisi myös sivulta
    pizzalove.fi/varainhankinta».

    ⚠️ TÄMÄ ON OHJAUS EIKÄ KOPIO, JA SYY ON RAKENTEELLINEN. pizzalove.fi on
    GitHub Pages — staattisia tiedostoja, ei PHP:tä. Varainhankinta on
    PHP-sovellus (ryhmät, tilaukset, admin, sähköpostit), joten sitä ei voi
    tarjoilla täältä. Osoite voi siis olla pizzalove.fi:n alla, mutta sisältö
    tulee toiselta palvelimelta ja osoiterivi vaihtuu.

    ⚠️ VALIKON VÄLILEHTI OSOITTAA EDELLEEN SUORAAN kohteeseen: tämä sivu on
    kirjoitettua ja jaettua osoitetta varten, eikä klikkaukseen kannata
    lisätä ylimääräistä hyppyä.

    ⚠️ Ohjaus tehdään sekä `meta refresh`illä että JS:llä, ja sivulla on
    näkyvä linkki: jos kumpikin estetään, käyttäjä ei saa tyhjää ruutua.
    `noindex` estää hakukonetta indeksoimasta välisivua. """
    kohde = 'https://varainhankinta.merkitysten.fi/'
    t = kaikki['fi']
    teksti = t['etusivu']['varainhankinta']
    return """<!doctype html>
<html lang="fi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=%s">
<link rel="canonical" href="%s">
<title>%s</title>
<style>body{font-family:system-ui,sans-serif;background:#FAF6EE;color:#1A1A1A;
  display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center}
a{color:#C2580C}</style>
</head>
<body>
<p>%s<br><a href="%s">%s</a></p>
<script>location.replace(%s);</script>
</body>
</html>
""" % (kohde, kohde, e(teksti.get('otsikko', 'Varainhankinta')),
       e(teksti.get('otsikko', 'Varainhankinta')), kohde, kohde,
       json.dumps(kohde))


def main():
    kaikki = {k: lue(k) for k in KIELET if os.path.exists(os.path.join(SISALTO, k + '.json'))}
    puuttuu = [k for k in KIELET if k not in kaikki]
    if puuttuu:
        print('⚠️  puuttuvat kielet:', ', '.join(puuttuu), '— käytetään suomea tilalla')
        for k in puuttuu:
            kaikki[k] = dict(kaikki['fi'], lang=k, nimi=k.upper(), lyhenne=k.upper())

    # docs/ tyhjennetään ja kirjoitetaan uudelleen
    if os.path.exists(ULOS):
        shutil.rmtree(ULOS)
    shutil.copytree(JULKINEN, ULOS)

    for k in KIELET:
        t = kaikki[k]
        os.makedirs(os.path.join(ULOS, k), exist_ok=True)
        for nimi, f in (('index.html', etusivu), ('korttipeli.html', korttipeli), ('lautapeli.html', lautapeli),
                        ('apinakortit.html', apinakortit),
                        ('essen-2026.html', essen2026)):
            with open(os.path.join(ULOS, k, nimi), 'w', encoding='utf-8') as out:
                out.write(f(t, kaikki))
    os.makedirs(os.path.join(ULOS, 'varainhankinta'), exist_ok=True)
    with open(os.path.join(ULOS, 'varainhankinta', 'index.html'), 'w', encoding='utf-8') as out:
        out.write(varainhankinta_ohjaus(kaikki))
    with open(os.path.join(ULOS, 'index.html'), 'w', encoding='utf-8') as out:
        out.write(juurisivu(kaikki))
    with open(os.path.join(ULOS, '404.html'), 'w', encoding='utf-8') as out:
        out.write(juurisivu(kaikki).replace("location.replace((valittu || '%s') + '/' + location.hash);" % OLETUSKIELI,
                                            "location.replace('/' + (valittu || '%s') + '/');" % OLETUSKIELI))
    if KAYTA_OMAA_DOMAINIA:
        with open(os.path.join(ULOS, 'CNAME'), 'w') as out:
            out.write('pizzalove.fi')  # sama muoto kuin GitHubin asetussivun luoma tiedosto
    with open(os.path.join(ULOS, '.nojekyll'), 'w') as out:
        out.write('')
    print('valmis:', ULOS)


if __name__ == '__main__':
    main()
