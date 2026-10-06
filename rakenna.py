#!/usr/bin/env python3
"""pizzalove.fi — sivujen rakentaja.

Ajo:  python3 rakenna.py

Lukee tekstit kansiosta sisalto/ (yksi JSON per kieli), kopioi kansion
julkinen/ sisällön ja kirjoittaa valmiin sivuston kansioon docs/.
GitHub Pages julkaisee docs/-kansion sellaisenaan.

Ei riippuvuuksia: pelkkä Python 3.

⚠️ ÄLÄ MUOKKAA docs/-KANSION HTML-TIEDOSTOJA KÄSIN. Ne kirjoitetaan
uudelleen joka ajossa. Muuta tekstiä sisalto/*.json:ssa ja ulkoasua
julkinen/tyyli.css:ssä. Poikkeus: docs/pizzaparty/ (peli) ja docs/pdf/
eivät ole rakentajan tuotosta, vaan ne kopioidaan julkinen/-kansiosta.
"""
import json, os, shutil, html

JUURI = os.path.dirname(os.path.abspath(__file__))
SISALTO = os.path.join(JUURI, 'sisalto')
JULKINEN = os.path.join(JUURI, 'julkinen')
ULOS = os.path.join(JUURI, 'docs')

KIELET = ['fi', 'sv', 'en', 'de']      # järjestys kielivalikossa
OLETUSKIELI = 'en'                      # jos selaimen kieli ei ole mikään näistä
OSOITE = 'https://pizzalove.fi'
SAHKOPOSTI = 'info@merkitysten.fi'

# ⚠️ OMA DOMAIN PÄÄLLE VASTA DNS-VAIHDOSSA. Kun docs/CNAME on olemassa, GitHub
# ohjaa merkitysten.github.io/pizzalove-fi/ -testiosoitteen pizzalove.fi:hin,
# joka osoittaa vielä vanhaan paikkaan, eikä sivua voi testata. Vaihda True:ksi
# samana päivänä kun DNS vaihdetaan (ks. LUE-MINUT.md).
KAYTA_OMAA_DOMAINIA = False

KAUPPA = {
    'korttipeli': 'https://merkitysten.fi/tuote/pizza-love-korttipeli/',
    'lautapeli': 'https://merkitysten.fi/tuote/pizza-love-lautapeli/',
}

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

PDF = {
    'korttipeli': ('pdf/pizza-love-korttipeli-saannot.pdf', 'korttipeli'),
    # Pikaohje on WordPressissä, koska sitä päivitetään siellä (merkitysten.fi/pizzalove/lautapeli).
    'pikaohje': ('https://merkitysten.fi/wp-content/uploads/2026/09/Pizza-Love-lautapeli-pikaohje_printti.pdf', 'pikaohje'),
    'peruspeli': ('pdf/pizza-love-lautapeli-peruspeli.pdf', 'peruspeli'),
    'apinat': ('pdf/pizza-love-lautapeli-nalkaiset-apinat.pdf', 'apinat'),
    'salatut': ('pdf/pizza-love-lautapeli-salatut-pizzat.pdf', 'salatut'),
}


def lue(kieli):
    with open(os.path.join(SISALTO, kieli + '.json'), encoding='utf-8') as f:
        return json.load(f)


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
           ('../pizzaparty/?kieli=' + t['lang'], ui['nav_pelaa'], 'pelaa')]
    # Varainhankinta on vain suomeksi, joten välilehti näkyy vain kielillä joilla avain on.
    if ui.get('nav_varainhankinta') and t['etusivu'].get('varainhankinta'):
        nav.append((t['etusivu']['varainhankinta']['url'], ui['nav_varainhankinta'], 'varainhankinta'))
    navi = ''.join('<a href="%s"%s>%s</a>' % (h, ' aria-current="page"' if k == sivu else '', e(n))
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
    return {'etusivu': '', 'korttipeli': 'korttipeli.html', 'lautapeli': 'lautapeli.html'}[sivu]


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
                e(ui['alaosa_yritys']), KAUPPA['korttipeli'], e(ui['kauppaan']), varain,
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
<meta name="viewport" content="width=device-width, initial-scale=1">
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
<meta property="og:image" content="%s/kuvat/jako-1200x630.jpg">
<meta property="og:type" content="website">
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
''' % (lang, e(title), e(kuvaus), leima('tyyli.css'), OSOITE, lang, sivutiedosto(sivu), alt, e(title), e(kuvaus), OSOITE,
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

def varainhankinta_osio(s):
    v = s.get('varainhankinta')
    if not v:
        return ''
    return '''<section class="laatikko varain" style="margin-top:20px">
  <h2 style="margin-top:0">%s</h2>
  <p>%s</p>
  <div class="napit"><a class="nappi" href="%s">%s →</a></div>
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
    <div class="peli-kortti__kuva"><img src="../kuvat/lautapeli-kansi.webp" width="240" height="284" alt=""></div>
    <div class="peli-kortti__teksti">
      <p class="peli-kortti__nimi">%s</p>
      <p class="peli-kortti__tiedot">%s</p>
      <span class="peli-kortti__linkki">%s</span>
    </div>
  </a>
</div>

<a class="pelaa-banneri" href="../pizzaparty/?kieli=%s">
  <img src="../kuvat/basso-syo.webp" width="438" height="520" alt="">
  <div>
    <strong>%s</strong>
    <span>%s</span>
    <span class="nappi">%s →</span>
  </div>
</a>

%s
<h2>%s</h2>
<p>%s</p>
<div class="napit">
  <a class="nappi nappi--toinen" href="%s">%s – %s</a>
  <a class="nappi nappi--toinen" href="%s">%s – %s</a>
</div>
''' % (e(s['h1']), s['ingressi'], e(s['valitse']),
       e(t['ui']['nav_korttipeli']), e(s['korttipeli_tiedot']), e(s['avaa']),
       e(t['ui']['nav_lautapeli']), e(s['lautapeli_tiedot']), e(s['avaa']),
       lang, e(s['pelaa_otsikko']), e(s['pelaa_teksti']), e(s['pelaa_nappi']),
       varainhankinta_osio(s),
       e(s['kauppa_otsikko']), e(s['kauppa_teksti']),
       KAUPPA['korttipeli'], e(t['ui']['kauppaan']), e(t['ui']['nav_korttipeli']),
       KAUPPA['lautapeli'], e(t['ui']['kauppaan']), e(t['ui']['nav_lautapeli']))
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
  <div class="korttipari"><img src="../kuvat/tausta-pizza.webp" width="439" height="620" alt=""><div><h3 style="margin-top:0">%s</h3><p>%s</p></div></div>
  <div class="korttipari"><img src="../kuvat/tausta-tayte.webp" width="439" height="620" alt=""><div><h3 style="margin-top:0">%s</h3><p>%s</p></div></div>
</div>

<div class="laatikko">
  <h3 style="margin-top:0">%s</h3>
  <p>%s</p>
  <h3>%s</h3>
  <p>%s</p>
  <h3>%s</h3>
  <div class="esimerkki" role="img" aria-label="%s">
    <img src="../kuvat/pizza-31.webp" width="439" height="620" alt=""><b>=</b>
    <img src="../kuvat/tayte-2.webp" width="439" height="620" alt=""><b>+</b>
    <img src="../kuvat/tayte-3.webp" width="439" height="620" alt="">
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
    <a class="nappi" href="../pizzaparty/?kieli=%s">%s →</a>
  </div>
</div>

<h2 id="lataa">%s</h2>
<p>%s</p>
%s
<div class="napit"><a class="nappi nappi--toinen" href="%s">%s →</a></div>
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
       KAUPPA['korttipeli'], e(t['ui']['kauppaan']))
    return kehys(t, kaikki, 'korttipeli', s['title'], s['kuvaus'], runko)


def lautapeli(t, kaikki):
    s = t['lautapeli']
    lang = t['lang']
    tiedot = ''.join('<li>%s</li>' % e(x) for x in s['tiedot'])
    hyppy = ''.join('<a href="#%s">%s</a>' % (k, e(v)) for k, v in s['hyppy'].items())
    kok = videoruudukko([video(v, s['videot'][v], None, t) for v in LAUTA_VIDEOT_KOKOAMINEN], t, 'vaaka')
    vuoro = videoruudukko([video(LAUTA_VIDEO_VUORO[0], s['videot'][LAUTA_VIDEO_VUORO[0]], LAUTA_VIDEO_VUORO[1], t)], t, 'vaaka')
    valm = ''.join('<li>%s</li>' % e(x) for x in s['valmistelut'])
    vaiheet = ''.join('<li><h3>%s</h3>%s</li>' % (e(v['otsikko']), v['html']) for v in s['vaiheet'])
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

<h2 id="lataa">%s</h2>
<p>%s</p>
%s
<div class="napit"><a class="nappi nappi--toinen" href="%s">%s →</a></div>
''' % (e(s['h1']), e(s['ingressi']), tiedot, hyppy,
       e(s['kokoaminen_otsikko']), e(s['kokoaminen']), kok,
       e(s['peli_otsikko']), e(s['voittaminen_otsikko']), s['voittaminen'],
       e(s['valmistelut_otsikko']), valm,
       e(s['vuoro_otsikko']), vaiheet, vuoro,
       e(s['muodot_otsikko']), e(s['muodot_ingressi']), muodot,
       e(s['lataa_otsikko']), e(s['lataa_teksti']),
       lataukset(['pikaohje', 'peruspeli', 'apinat', 'salatut'], s['lataukset'], PDF),
       KAUPPA['lautapeli'], e(t['ui']['kauppaan']))
    return kehys(t, kaikki, 'lautapeli', s['title'], s['kuvaus'], runko)


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
''' % (json.dumps(KIELET), OLETUSKIELI, linkit)


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
        for nimi, f in (('index.html', etusivu), ('korttipeli.html', korttipeli), ('lautapeli.html', lautapeli)):
            with open(os.path.join(ULOS, k, nimi), 'w', encoding='utf-8') as out:
                out.write(f(t, kaikki))
    with open(os.path.join(ULOS, 'index.html'), 'w', encoding='utf-8') as out:
        out.write(juurisivu(kaikki))
    with open(os.path.join(ULOS, '404.html'), 'w', encoding='utf-8') as out:
        out.write(juurisivu(kaikki).replace("location.replace((valittu || '%s') + '/' + location.hash);" % OLETUSKIELI,
                                            "location.replace('/' + (valittu || '%s') + '/');" % OLETUSKIELI))
    if KAYTA_OMAA_DOMAINIA:
        with open(os.path.join(ULOS, 'CNAME'), 'w') as out:
            out.write('pizzalove.fi\n')
    with open(os.path.join(ULOS, '.nojekyll'), 'w') as out:
        out.write('')
    print('valmis:', ULOS)


if __name__ == '__main__':
    main()
