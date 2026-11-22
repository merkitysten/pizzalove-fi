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
import copy, json, os, re, shutil, html

JUURI = os.path.dirname(os.path.abspath(__file__))
SISALTO = os.path.join(JUURI, 'sisalto')
JULKINEN = os.path.join(JUURI, 'julkinen')
ULOS = os.path.join(JUURI, 'docs')

KIELET = ['fi', 'sv', 'en', 'de', 'nl', 'fr', 'es', 'sk']      # järjestys kielivalikossa (NL/FR/ES lisätty 25.10.2026, SK 6.11.2026)
LOKAALIT = {'fi': 'fi_FI', 'sv': 'sv_FI', 'en': 'en_GB', 'de': 'de_DE', 'nl': 'nl_NL', 'fr': 'fr_FR', 'es': 'es_ES', 'sk': 'sk_SK'}
OLETUSKIELI = 'en'                      # jos selaimen kieli ei ole mikään näistä
OSOITE = 'https://pizzalove.fi'

# 🔵 Marko 16.11.2026: asiakkaan pyynnöstä tehdyt konekäännökset (tyokalut/kaanna.py,
# sisalto/konekaannos/xx.json). Jokainen saa oman korttipelisivun xx/card-game.html,
# joka syntyy samassa ajossa kuin käännös ja arkki, ilman Markon toimia. Sivun muut
# osat (valikko, muut sivut) ovat englanniksi. Täytetään main():ssa.
KONEKIELET = {}
KONEKAANNOS = os.path.join(SISALTO, 'konekaannos')
KONE_SIVU = 'card-game'
# Puuttuvan kielen nappi (sivu.js) lähettää pyynnön tähän. PHP-skripti
# käynnistää GitHubin konekäännösajon (palvelin/kaannospyynto.php). Ei talletusta.
PYYNTO_OSOITE = 'https://varainhankinta.merkitysten.fi/kaannos/pyynto.php'
# Oikealta vasemmalle kirjoitettavat kielet.
# ⚠️ TÄSSÄ OLI 18.11.2026 ASTI KIELIKOODILISTA, JOTA EI KÄYTETTY MISSÄÄN — neljäs
# kopio samasta tiedosta (kaanna.py, sivu.js, kielet.json). Suunta johdetaan nyt
# KIRJOITUSJÄRJESTELMÄSTÄ, jonka kaanna.py kirjaa käännökseen (`kirjoitus`), joten
# uusi kieli ei vaadi riviä mihinkään listaan.
# ⚠️ Kieli, ei kirjoitus, ratkaisee numerovälit (W3C: «this is a language-specific
# issue, rather than a script-specific issue») — se koskee SISÄLTÖÄ, ei tätä lippua.
OIKEALTA_VASEMMALLE_KIRJOITUKSET = {'Arab', 'Hebr', 'Thaa', 'Syrc', 'Nkoo',
                                    'Adlm', 'Mand', 'Samr', 'Rohg'}


def suunta_tiedoista(d):
    """'rtl' tai 'ltr' kaannoksen tiedoista (`suunta`, muuten `kirjoitus`).
    Myos koteloarkki.py kysyy taman tasta, jotta sivulla ja painetulla arkilla
    on yksi lahde — eika kahta listaa jotka ajautuvat erilleen."""
    d = d or {}
    if d.get('suunta') in ('rtl', 'ltr'):
        return d['suunta']
    return 'rtl' if d.get('kirjoitus') in OIKEALTA_VASEMMALLE_KIRJOITUKSET else 'ltr'


def suunta(lang):
    """'rtl' tai 'ltr'. Vain tekstin suunta — asettelua ei peilata (Marko 18.11.2026)."""
    return suunta_tiedoista(KONEKIELET.get(lang))


def lue_konekaannokset():
    out = {}
    if os.path.isdir(KONEKAANNOS):
        for nimi in sorted(os.listdir(KONEKAANNOS)):
            if nimi.endswith('.json'):
                with open(os.path.join(KONEKAANNOS, nimi), encoding='utf-8') as f:
                    d = json.load(f)
                if d.get('konekaannos') and d['kieli'] not in KIELET:
                    out[d['kieli']] = d
    return out
# Korttipelin sivun nimi kielen mukaan (Marko 15.11.2026: «voisko se olla vain
# korttipeli ja voiko se sivun nimi muuttua kielen mukaan?»). Painettu osoite
# ja QR ilman .html-päätettä, esim. pizzalove.fi/nl/kaartspel (GitHub Pages
# palvelee kaartspel.html:n). Sanat samat kuin saanto-PDF:ien nimissä.
# Vanha xx/korttipeli.html jää ohjaussivuksi, koska se on painetuissa QR-koodeissa.
KORTTIPELI_SIVU = {'fi': 'korttipeli', 'sv': 'kortspel', 'en': 'card-game', 'de': 'kartenspiel',
                   'nl': 'kaartspel', 'fr': 'jeu-de-cartes', 'es': 'juego-de-cartas', 'sk': 'kartova-hra'}
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
# DE/NL/FR/ES: ei omaa kauppaa → EN-tuotesivut.
for _k in ('de', 'nl', 'fr', 'es', 'sk'):
    KAUPPA_KIELI[_k] = KAUPPA_KIELI['en']
MIETTII_W, MIETTII_H = 520, 503  # julkinen/kuvat/basso-miettii.webp (huomio-laatikko käyttää 3.11.2026 alkaen basso-pohtii.webp 560×601)
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
                           (sivutiedosto(tuote, t['lang']), s['ristiin_saannot'])])

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

# ⚠️ KORTTIPELIN SAANTO-PDF ON KIELIKOHTAINEN, MUU EI. Marko 6.11.2026:
# «juu kaikille oma pdf». `korttisaannot.py` tekee jokaiselle kielelle
# A4-arkin SIVUN OMASTA SISALLOSTA. Painettu FI · SV · EN -arkki
# (pdf/pizza-love-korttipeli-saannot.pdf) jaa repoon arkistoksi, mutta
# mikaan sivu ei linkita siihen: se on vanhempi (apina on siina Bruno, ja
# Basson tapa on eri saanto). Sita kaytetaan vain varalla, jos kielen oma
# PDF puuttuu (varoitus tulostuu).
KORTTIPELI_PDF = {
    'fi': ('pdf/pizza-love-korttipeli-saannot-fi.pdf', 'korttipeli'),
    'sv': ('pdf/pizza-love-kortspel-regler-sv.pdf', 'korttipeli'),
    'en': ('pdf/pizza-love-card-game-rules-en.pdf', 'korttipeli'),
    'de': ('pdf/pizza-love-kartenspiel-regeln-de.pdf', 'korttipeli'),
    'nl': ('pdf/pizza-love-kaartspel-regels-nl.pdf', 'korttipeli'),
    'fr': ('pdf/pizza-love-jeu-de-cartes-regles-fr.pdf', 'korttipeli'),
    'es': ('pdf/pizza-love-juego-de-cartas-reglas-es.pdf', 'korttipeli'),
    'sk': ('pdf/pizza-love-kartova-hra-pravidla-sk.pdf', 'korttipeli'),
}

def korttipeli_pdf(lang):
    """Kielen oma saanto-PDF, jos `korttisaannot.py` on jo tehnyt sen;
    muuten painettu arkki ja varoitus (uusi kieli ennen ensimmaista ajoa)."""
    polku = KORTTIPELI_PDF.get(lang)
    if lang in KONEKIELET:
        polku = ('pdf/' + KONEKIELET[lang]['kielet']['tiedosto'], 'korttipeli')
    if polku and not os.path.exists(os.path.join(JULKINEN, polku[0])):
        # ⚠️ Arkin tekee 15.11.2026 alkaen koteloarkki.py (korttisaannot.py on sen
        # kirjasto, ei enää generaattori). Neuvo osoitti 19.11.2026 asti vanhaan.
        print('⚠️  %s puuttuu – aja: python3 koteloarkki.py %s' % (polku[0], lang))
        polku = None
    if lang in KONEKIELET:
        # ⚠️ EI VARASIJAISTA ARKKIA konekäännöskielelle. 📐 Mitattu 18.11.2026:
        # turkin arkki jäi syntymättä, ja nappi tarjosi hiljaa suomi–ruotsi–
        # englanti-arkkia. Turkkilaiselle lukijalle se on tiedosto jota hän ei
        # osaa lukea, ilman selitystä. None piilottaa napin ja koko
        # latauslohkon: puuttuva nappi on oikea signaali, väärä sisältö ei ole.
        # Selitystä ei lisätä, koska se olisi englanniksi turkinkielisellä
        # sivulla — sama vika toisessa muodossa.
        return polku
    return polku or PDF['korttipeli']


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
    # Lautapelin omankieliset ohjeet: `lautasaannot.py` (sisalto/lautasaannot-xx.json).
    'lauta_saannot_fr': ('pdf/pizza-love-jeu-de-plateau-regles-fr.pdf', 'lauta_saannot'),
    'lauta_opas_fr': ('pdf/pizza-love-jeu-de-plateau-guide-fr.pdf', 'lauta_opas'),
    'lauta_apinat_fr': ('pdf/pizza-love-jeu-de-plateau-singes-affames-fr.pdf', 'lauta_apinat'),
    'lauta_salatut_fr': ('pdf/pizza-love-jeu-de-plateau-pizzas-secretes-fr.pdf', 'lauta_salatut'),
}

# 🔵 Marko 13.11.2026: lautapelille ranskankieliset saannot ja aloitusopas.
# Kielella, jolla on omat ohjeet, ne ovat latauslistan karjessa; painetun
# laatikon FI · SV · EN -ohjeet jaavat niiden alle. Painetun pikaohjeen
# korvaa oman kielen aloitusopas.
LAUTA_OMAT = {
    'fr': ['lauta_saannot_fr', 'lauta_opas_fr', 'lauta_apinat_fr', 'lauta_salatut_fr'],
}


def lauta_lataukset(lang):
    omat = [a for a in LAUTA_OMAT.get(lang, [])
            if os.path.exists(os.path.join(JULKINEN, PDF[a][0]))]
    for a in LAUTA_OMAT.get(lang, []):
        if a not in omat:
            print('⚠️  %s puuttuu – aja: python3 lautasaannot.py %s' % (PDF[a][0], lang))
    vakio = ['peruspeli', 'apinat', 'salatut']
    return omat + (vakio if omat else ['pikaohje'] + vakio)


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


# Tiedostokoon yksikkö ja desimaalierotin kielen mukaan (Marko 16.11.2026: korean
# sivulla luki «PDF 4,5 Mt»; aiemmin kaikilla kielillä suomen Mt). Konekäännetyille
# kielille arvot tulevat käännöksestä (kaanna.py: «koko»).
KOKO = {'fi': ('Mt', 'kt', ','), 'fr': ('Mo', 'ko', ','), 'en': ('MB', 'kB', '.')}


def koko_mt(polku, lang='fi'):
    p = os.path.join(JULKINEN, polku)
    if not os.path.exists(p):
        return ''
    if lang in KONEKIELET and KONEKIELET[lang].get('koko'):
        k = KONEKIELET[lang]['koko']
        mb, kb, erotin = k['mb'], k['kb'], k['desimaalierotin']
    else:
        mb, kb, erotin = KOKO.get(lang, ('MB', 'kB', ','))
    mt = os.path.getsize(p) / 1e6
    return ('%.1f' % mt).replace('.', erotin) + ' ' + mb if mt >= 1 else '%d %s' % (mt * 1000, kb)


# ---------------------------------------------------------------- osat

# 🔵 Marko 16.11.2026: «Haluaisin tähän näkymään vielä ne eri maiden liput, jolloin
# navigointi on helpompaa. Ehkä lippu ennen kielen nimeä.» -> Pyöreä lippu nimen eteen
# kielivalikossa. SAMAT TIEDOSTOT kuin koteloarkissa ja konekäännöksessä:
# julkinen/kuvat/liput/<KIELIkoodi>.svg (flag-icons, MIT; ks. kansion LUE-MINUT.md).
# Lipun valinta on siis tehty jo kerran (kaanna.py:n lippu(): kielen tavallisimman
# maan lippu, en=GB, es=ES, fr=FR) — tässä ei tehdä toista karttaa.
# Lippu on koriste (alt=""): kieli ei ole maa, eikä ruudunlukija saa lukea maata
# kielen nimen tilalle. Jos lippua ei ole (kaanna.py ei tee sitä esim. es-419:lle
# eikä zh-Hantille), rivillä on tyhjä paikka ja pelkkä nimi — puute näkyy, ei arvausta.
#
# 📐 EI loading="lazy" (mitattu 16.11.2026). Liput ovat suljetun <details>-valikon
# sisällä, eli piilossa sivun latautuessa. Mitattuna selaimessa ne EIVÄT latautuneet
# lainkaan senkään jälkeen, kun valikko avattiin ja liput olivat näkyvissä 3,7 s
# (complete=false, naturalWidth=0 kaikilla kymmenellä). Lippu, joka ei näy, on pahempi
# kuin lippu, joka latautuu heti. Siksi eager + fetchpriority="low": liput eivät kilpaile
# sivun omien kuvien kanssa. Hinta mitattu: 10 lippua = 96 kB raakana, 19 kB pakattuna,
# josta Espanja yksin 17 kB (vaakuna). Sama välimuisti kaikilla sivuilla ja kielillä.
LIPUT = os.path.join(JULKINEN, 'kuvat', 'liput')


def valikkolippu(k, lisaluokka='', paikanpitaja=True, polku='../kuvat/liput/'):
    # polku: sivut ovat docs/<kieli>/, juurisivu docs/index.html — eri määrä ../:ia.
    luokka = 'kielet__lippu' + (' ' + lisaluokka if lisaluokka else '')
    if not os.path.exists(os.path.join(LIPUT, k + '.svg')):
        # Listassa tyhjä paikka pitää nimet samassa sarakkeessa ja näyttää puutteen.
        # Napissa ei ole saraketta, johon kohdistaa, joten tyhjä paikka olisi pelkkä
        # outo rako maapallon vieressä: siellä jää näkyviin maapallo ja nimi.
        return '<span class="%s kielet__lippu--puuttuu"></span>' % luokka if paikanpitaja else ''
    return ('<img class="%s" src="%s%s.svg" width="20" height="20"'
            ' alt="" fetchpriority="low" decoding="async">' % (luokka, polku, k))


def ylaosa(t, sivu, kaikki):
    ui = t['ui']
    nav = [('index.html', ui['nav_etusivu'], 'etusivu'),
           (sivutiedosto('korttipeli', t['lang']), ui['nav_korttipeli'], 'korttipeli'),
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
        '<li><a href="../%s/%s" hreflang="%s" lang="%s"%s>%s<span class="kielet__nimi">%s</span></a></li>' % (
            k, sivutiedosto(sivu if t['lang'] in KIELET else 'korttipeli', k), k, k,
            ' aria-current="true"' if k == t['lang'] else '', valikkolippu(k), e(kaikki[k]['nimi']))
        for k in KIELET)
    if KONEKIELET:
        # Konekäännökset: vain korttipelin säännöt (Marko 16.11.2026)
        kielet += '<li class="kielet__ryhma">%s</li>' % e(ui.get('konekaannos_ryhma', 'Machine translation · card game rules'))
        kielet += ''.join(
            '<li><a href="../%s/%s.html" hreflang="%s" lang="%s"%s>%s<span class="kielet__nimi">%s</span></a></li>' % (
                k, KONE_SIVU, k, k, ' aria-current="true"' if k == t['lang'] else '',
                valikkolippu(k), e(d['nimi']))
            for k, d in sorted(KONEKIELET.items(), key=lambda x: x[1]['nimi'].lower()))
    # Viimeinen rivi: puuttuvan kielen pyyntö (Marko 16.11.2026: «Onko se siellä
    # kielivalikossa? Minusta pitäisi olla»). Napin takana on valitsin, jonka
    # julkinen/sivu.js rakentaa — sama pyyntömekanismi kuin bannerissa, kaksi
    # sisäänkäyntiä. Tekstit tulevat tästä, jotta JS:ään ei tule käännöksiä.
    # Konekäännetyillä kielillä ui-avaimia ei vielä ole: silloin englanti, kuten
    # konekaannos_ryhma-rivillä yllä.
    # ⚠️ KAIKKI pyynnön tekstit kulkevat tätä kautta, myös bannerin, jonka
    # julkinen/sivu.js rakentaa. 📐 Marko 16.11.2026: hän näki suomenkielisen
    # otsikon ja englanninkielisen vahvistuksen samassa ikkunassa, koska
    # vahvistus oli kovakoodattuna JS:ään. Kieli ei saa vaihtua kesken lauseen.
    # %s tekstissä = kielen oma nimi; sivu.js korvaa sen.
    pyyntoteksti = [
        # ⚠️ Leima on pakollinen: sivu.js hakee tämän «force-cache»-tilassa, eli
        # selain käyttää välimuistiaan vaikka tiedosto olisi muuttunut. Ilman
        # leimaa kerran avattu hakemisto jäisi selaimeen ikuisesti vanhana.
        # Leiman kanssa osoite muuttuu heti kun sisältö muuttuu, jolloin
        # «force-cache» on nimenomaan oikea valinta: muuttumaton osoite saa
        # jäädä välimuistiin pysyvästi. leima() ei ole käytettävissä selaimessa,
        # joten se on annettava sivulta.
        ('hakemisto', '../' + leima('kielet.json')),
        ('haku', ui.get('pyynto_haku', 'Search for a language')),
        ('pyyda', ui.get('pyynto_pyyda', 'Request')),
        ('eituettu', ui.get('pyynto_ei_tuettu', 'Not supported yet')),
        ('tekeillalyhyt', ui.get('pyynto_tekeilla_lyhyt', 'In progress')),
        ('omat', ui.get('pyynto_omat', 'Choose which languages appear in your language menu.')),
        ('valikossa', ui.get('pyynto_valikossa', 'Show in the language menu')),
        ('otsikko', ui.get('pyynto_otsikko', 'All languages')),
        ('sulje', ui.get('pyynto_sulje', 'Close')),
        ('kysymys', ui.get('pyynto_kysymys', 'Want the Pizza Love card game rules in %s?'
                           ' We’ll make them now – machine-translated, free.')),
        ('kylla', ui.get('pyynto_kylla', 'Yes, please')),
        ('tekeilla', ui.get('pyynto_tekeilla', 'Thank you! The rules in %s will be ready in about'
                            ' three minutes, and will then appear in the language menu.')),
        ('valmis', ui.get('pyynto_valmis', 'Your language is ready!')),
        ('avaa', ui.get('pyynto_avaa_saannot', 'Open the rules in %s')),
        ('kone', ui.get('pyynto_konekaannos', '(machine translation – corrections welcome)')),
        ('eionnistunut', ui.get('pyynto_ei_onnistunut', 'That didn’t work.'
                                ' Try again later or write to info@merkitysten.fi.')),
    ]
    kielet += ('<li class="kielet__pyynto"><button type="button" class="kielet__pyynto-nappi"'
               ' data-valitsin%s>%s</button></li>') % (
        ''.join(' data-%s="%s"' % (a, e(v)) for a, v in pyyntoteksti),
        e(ui.get('pyynto_avaa', 'Ask for your language')))
    kielet = '''<details class="kielet">
      <summary aria-label="%s: %s">%s<span>%s</span><svg class="kielet__nuoli" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></summary>
      <ul class="kielet__lista">%s</ul>
    </details>''' % (e(ui['kielivalinta']), e(t['nimi']),
                      valikkolippu(t['lang'], 'kielet__lippu--nappi', paikanpitaja=False),
                      e(t['nimi']), kielet)
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


def sivutiedosto(sivu, lang):
    return {'etusivu': '', 'korttipeli': KORTTIPELI_SIVU.get(lang, KONE_SIVU) + '.html', 'lautapeli': 'lautapeli.html',
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



# ---------------------------------------------------------------- tunnisteet
# ⚠️ TUNNISTE JA NUMEROVÄLI OVAT ERI ASIA, JA LÄHDETEKSTISSÄ NE NÄYTTÄVÄT SAMALTA.
# Mitattu 18.11.2026 selaimessa, arabialaisen kantolauseen sisässä:
#
#   «#1 Pizza Party» paljaana        -> «Pizza Party 1#»     🔴 risuaita irtoaa
#   «<bdi>#1</bdi> Pizza Party»      -> «Pizza Party #1»      ehjä, mutta nimi kääntyi
#   «<bdi>#1 Pizza Party</bdi>»      -> «#1 Pizza Party»      ✓ kuten painettuna
#   «Pizza Love®» paljaana           -> «®Pizza Love»        🔴 ® hyppää eteen
#
# ⛔ ÄLÄ LISÄÄ TÄHÄN NUMEROVÄLEJÄ («2–4 pelaajaa», «10–20 min»). Niiden KUULUU
# kääntyä arabiassa — W3C (strings-and-bidi): «a range such as 10-12 … would
# look like this in Arabic: 12-10». Eristys rikkoisi ne. Hepreassa ja persiassa
# järjestys on päinvastainen, ja ratkaisija on KIELI eikä kirjoitusjärjestelmä.
# Siksi tässä on vain se mikä luetaan aina vasemmalta oikealle: tuotenimi,
# pelimuodon nimi ja nollalla alkava korttiväli (01–33, ei 10–20).
#
# Vartija: tyokalut/rtlkoe.py (osa «tunnisteet HTML:ssä»).
TUNNISTEET = (
    re.compile(r'Pizza Love\u00ae'),
    # Pelimuodon nimi kokonaisena, myös suomen taivutus («#1 Pizza Partyssä»).
    # ⚠️ `(?<![&\w])` on pakollinen: ilman sita kuvio osuu HTML-entiteetin
    # numeroon (`&#8249;` -> `&<bdi>#8249</bdi>;`) ja rikkoo sen aanettomasti.
    # Mitattu 18.11.2026 pelisivuilta: 60 osumaa, jokainen entiteetti.
    re.compile(r'(?<![&\w])#\d(?:\s+Pizza(?:\s+[A-Za-z\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u024f]+)?)?'),
    # Korttiväli: nollalla alkava on tunniste, «10–20 min» ei ole.
    re.compile(r'\b0\d\u2013\d\d\b'),
)
# ⚠️ LASKU EI OLE NUMEROVÄLI — JA ARABIASSA NE MENEVÄT ERI SUUNTIIN.
# Mitattu 19.11.2026 JULKAISTULTA ar-sivulta, selaimesta eikä lähdetekstistä:
#
#   «5 = 7 + 6 - 8»  ->  «8 - 6 + 7 = 5»   🔴 ruudulla lukee 9 = 5
#   «5 = 10 : 2»     ->  «2 : 10 = 5»      🔴 ruudulla lukee 0,2 = 5
#   «6 – 1»          ->  «1 – 6»           🔴 ruudulla lukee −5
#   «5 = 3! – 1»     ->  «1 – !3 = 5»      🔴 huutomerkki irtosi luvusta
#   «1–10» (väli)    ->  «10–1»             ✓ näin sen KUULUU mennä (W3C)
#
# Syy on UAX #9 sääntö N1: rtl-kappaleessa numerojakso ladotaan oikealta
# vasemmalle, vaikka kukin luku itse luetaan vasemmalta oikealle. Numeroväliin
# se on oikein, laskuun ei: lasku on SISÄLTÖÄ, ja käännettynä se on väite joka
# ei pidä paikkaansa. Pizza Lovessa lapsi lukee sen ääneen.
#
# ⚠️ Erottaja on mitattu tästä aineistosta eikä arvattu: laskun operaattorin
# ympärillä on VÄLILYÖNNIT («6 – 1»), numerovälin ajatusviivan ympärillä ei
# («1–10»). 22 kielitiedostoa, 325 osumaa, 0 väärää osumaa (ei päivämääriä,
# ei pelaajamääriä). Jos uusi kieli kirjoittaa laskun ilman välilyöntejä, se
# jää eristämättä — ja silloin se on tämän kuvion korjaus, ei poikkeus.
LASKU = re.compile(
    r'\d+(?:[.,]\d+)?[\u00b2\u00b3]?!?'
    r'(?:\s[-+\u2013\u2212\u00d7x*/:=\u00b7]\s\d+(?:[.,]\d+)?[\u00b2\u00b3]?!?)+')

# Tagit ja skriptit ohitetaan: <bdi> ei kuulu attribuuttiin eikä JavaScriptiin.
_EI_TEKSTIA = re.compile(r'(<script\b.*?</script>|<style\b.*?</style>|<[^>]*>)',
                         re.S | re.I)


def eristatunnisteet(html):
    """Kääri tunnisteet ja laskut <bdi>:hin, jotta ne pysyvät ehjinä RTL-tekstissä.

    Kaksi eri tarvetta, sama keino:
      tunniste  <bdi>            — suunta saa ratketa sisällöstä
      lasku     <bdi dir="ltr">  — suunta on PAKOTETTU, koska laskussa ei ole
                                   yhtään vahvaa kirjainta josta se ratkeaisi
                                   («1 = 1 — البيتزا» alkaa luvulla mutta
                                   jatkuu arabiaksi).
    Laskut ensin: tunnistekuviot eivät voi osua laskun sisään, mutta
    numerokuvio voisi osua lisättyyn markupiin."""
    osat = _EI_TEKSTIA.split(html)
    for i in range(0, len(osat), 2):          # parittomat ovat tageja/skriptejä
        teksti = osat[i]
        if not teksti:
            continue
        teksti = LASKU.sub(lambda m: '<bdi dir="ltr">%s</bdi>' % m.group(0), teksti)
        for kuvio in TUNNISTEET:
            teksti = kuvio.sub(lambda m: '<bdi>%s</bdi>' % m.group(0), teksti)
        osat[i] = teksti
    return ''.join(osat)

def kehys(t, kaikki, sivu, title, kuvaus, runko):
    lang = t['lang']
    alt = ''.join('<link rel="alternate" hreflang="%s" href="%s/%s/%s">' % (k, OSOITE, k, sivutiedosto(sivu, k))
                  for k in KIELET)
    alt += '<link rel="alternate" hreflang="x-default" href="%s/">' % OSOITE
    return '''<!doctype html>
<html lang="%s">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="only light">
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
%s<script src="../%s" defer></script>
</body>
</html>
''' % (lang + '" data-suunta="%s" data-kielet="%s" data-pyynto="%s'
               % (suunta(lang), ','.join(KIELET + sorted(KONEKIELET)), PYYNTO_OSOITE), e(title), e(kuvaus), leima('tyyli.css'), OSOITE, lang, sivutiedosto(sivu, lang), alt, e(title), e(kuvaus), OSOITE, lang, OSOITE, lang, sivutiedosto(sivu, lang), LOKAALIT.get(lang, lang.replace('-', '_')),
       eristatunnisteet(ylaosa(t, sivu, kaikki)), eristatunnisteet(runko),
       eristatunnisteet(alaosa(t)),
       # Pizzakeittiön aritmetiikka on PELIN oma (julkinen/play/laskin.js), ei
       # sivuston kopio — sama `laske()` ja `osuuko()` joilla peli tarkistaa
       # pelaajan laskun. Ladataan vain korttipelisivulla, jossa keittiö on,
       # ja ENNEN sivu.js:ää, koska defer-skriptit ajetaan tässä järjestyksessä.
       # Apinakorttisivun animaatiot: pelkkä pieni kytkentäskripti. Raskas
       # moduuli (noin 100 kt + kuvat) ladataan vasta ensimmäisestä «Näytä»-
       # painalluksesta, koska sivun tehtävä on löytää kortin sääntö nopeasti.
       ('<script src="../%s" defer></script>\n' % leima('play/laskin.js')) if sivu == 'korttipeli' else
       ('<script src="../%s" defer></script>\n' % leima('apinakortit.js')) if sivu in ('apinakortit', 'lautapeli') else '',
       leima('sivu.js'))


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


def lataukset(avaimet, nimet, polut, lang):
    rivit = []
    for a in avaimet:
        polku, _ = polut[a]
        if polku.startswith('http'):
            rivit.append('<li><a href="%s"><span>%s</span><small>PDF</small></a></li>' % (polku, e(nimet[a])))
        else:
            # ?v=-leima: muuttunut PDF haetaan heti, ei selaimen välimuistista (Marko 3.11.2026:
            # päivitetty sääntö-PDF ei näkynyt)
            # ⚠️ EI `download`-attribuuttia (Marko 16.11.2026: «tietokoneella
            # se lataa ne. Kätevämpää voisi olla, jos se avautuisi
            # selaimessa»). Puhelin avasi PDF:n selaimessa jo ennestään, koska
            # se ei noudata attribuuttia — eli sama linkki käyttäytyi eri
            # tavalla eri laitteilla. Uusi välilehti, jotta sivu ei katoa alta.
            rivit.append('<li><a href="../%s" target="_blank" rel="noopener">'
                         '<span>%s</span><small>PDF %s</small></a></li>' % (
                leima(polku), e(nimet[a]), koko_mt(polku, lang)))
    return '<ul class="lataukset">%s</ul>' % ''.join(rivit)


def hyppynapit(hyppy, avaimet, polut):
    """Sivun ylänapit. ⚠️ «Säännöt PDF:nä» vie SUORAAN tiedostoon, kun
    ladattavia on yksi — muuten se hyppäisi sivun alalaitaan, jossa on
    melkein samannäköinen nappi, ja sama asia vaatisi kaksi napautusta
    (Marko 16.11.2026: «Miksei se sääntö-pdf avaudu heti tästä napista»).

    📐 Mitattu 16.11.2026, ja siksi tämä ei ole poikkeus vaan sääntö:
    korttipelin `#lataa`-lohkossa on **1** PDF ja lautapelin **4**. Yhden
    kohdalla hyppy on pelkkää väliä; neljän kohdalla lohko on aito
    määränpää, koska siellä pitää valita. Ehto luetaan latauslistasta,
    joten uusi kieli tai uusi tiedosto siirtää napin oikein itsestään."""
    suora = polut[avaimet[0]][0] if len(avaimet) == 1 else None
    ulos = []
    for k, v in hyppy.items():
        # Ei ladattavaa -> ei nappia: muuten se veisi tyhjään lohkoon.
        if k == 'lataa' and not avaimet:
            continue
        if k == 'lataa' and suora and not suora.startswith('http'):
            ulos.append('<a href="../%s" target="_blank" rel="noopener">%s</a>'
                        % (leima(suora), e(v)))
        else:
            ulos.append('<a href="#%s">%s</a>' % (k, e(v)))
    return ''.join(ulos)


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


# ── Pizzakeittiö: sääntösivun esimerkki, jota lukija saa kokeilla ──────────
# Marko 16.11.2026: «Sen sijaan, että nettisivulla kerrotaan, niin pitäisikö
# näyttää?» ja «Ei tehdä digitaalista alustaa fyysisen maailman ehdoilla.»
# Nämä luvut menevät .esimerkki-lohkon data-attribuutteihin; keittiön rakentaa
# julkinen/sivu.js. Ilman JavaScriptiä lohko jää ennalleen (role="img").
#
# 📐 Arvo 5 ei ole arvaus: kuva pizza-31.webp on painettu kortti nro 31, ja
# julkinen/play/kortit.js:n mitattu sääntö on «pizzan arvo = täytteidensä
# summa, poikkeuksetta». Kortti 31 on tomaatti 2 + ananas 3 = 5, ja sivun oma
# otsikko sanoo saman: «Esimerkki: tomaatti-ananaspizza».
KEITTIO_ARVO = 5
# Lähtötilanne = sama lasku kuin painetussa säännössä ja sivun tekstissä.
KEITTIO_ALKU = '10/2'
# Näytös: KAKSI laskua sivun tekstin luettelosta, sitten vuoro on lukijalla.
# Marko 16.11.2026: «Voisimme jopa tehdä siitä animaatiosta osittain
# osallistavan, että pelaajan tulisi itse tehdä vaikka kahden esimerkin
# jälkeen itse se pizza.» Merkit ovat ASCIIna (+ - * /); sivu.js piirtää ne
# sivun omilla merkeillä (+ – × :), samoilla kuin leipäteksti.
KEITTIO_NAYTOS = ['4+1', '6-1']
# Pizzakortin täytteiden määrä. Tätä tarvitaan VAIN Basso-apinan tavassa:
# «Käytä yhtä monta eri täytettä kuin pizzassa on täytteitä.» Kortti 31 on
# tomaatti + ananas, siis kaksi.
KEITTIO_TAYTTEITA = 2
# Pizzan OMAT täytteet. Kolmas porras («Oikeat täytteet», #3 Pizza Love) on
# ainoa, joka tarvitsee tämän: siinä korttien on oltava juuri nämä. Kortti 31
# on kortit.js:n generoinnissa osajoukko (2, 3) = tomaatti + ananas, ja
# kortit.js:n mukaan täyte on 1:1 arvonsa kanssa, joten arvot riittävät.
KEITTIO_PIZZATAYTTEET = [2, 3]
# Harjoitusten lähtöasetelmat, sama muoto kuin KEITTIO_ALKU (tyhjä b = yksi kortti).
#
# 📐 Mitattu 16.11.2026, miksi juuri nämä: kahdella korttipaikalla Basson sääntö
# EI voi mennä rikki, jos kortteja on kaksi — arvon 5 voi tehdä 13 tavalla, ja
# kaikki 13 kelpaavat myös Bassossa, koska kaksi eri korttia on aina kaksi eri
# täytettä. Ero syntyy vasta YHDELLÄ kortilla: pelkkä 5 kelpaa helpommassa
# tavassa («myös yhdellä», sivun oma teksti) mutta ei Bassossa, jossa
# tomaatti-ananaspizza vaatii kaksi eri täytettä. Siksi Basson harjoitus
# ALKAA siitä tilasta, joka juuri meni helpommasta tavasta läpi.
#
# Kolmas porras alkaa laskusta 10 : 2 — tasan siitä, joka kelpasi kahdessa
# ensimmäisessä. Pizzan arvo osuu, eri täytteitä on kaksi kuten pizzassa,
# mutta ne eivät ole TÄMÄN pizzan täytteet. Sama kortti, kiristyvä vaatimus.
KEITTIO_HARJOITUS = ['1', '5', '10/2']
# Valitsimen täytekortit: pelin kaikki täytteet 1–10 ja fantasiatäyte (x).
KEITTIO_TAYTTEET = list(range(1, 11)) + ['x']
# Keittiön sanat: ilman niitä ei rakenneta puolikasta keittiötä vaan jätetään
# staattinen esimerkki ennalleen (sama periaate kuin puuttuvalla lipulla:
# puute näkyy puutteena eikä arvauksena). Konekäännöskieli perii nämä
# englannista, koska konekieli_sivu() yhdistää ui-lohkot.
KEITTIO_SANAT = ['keittio_otsikko', 'keittio_vaihda', 'keittio_merkki',
                 'keittio_valmis', 'keittio_ei', 'keittio_eikorttia',
                 'keittio_tee', 'keittio_maara', 'keittio_taytteet',
                 'keittio_hienoa', 'keittio_peli']


def keittio_data(t):
    """Pizzakeittiön data-attribuutit .esimerkki-lohkoon; sivu.js rakentaa
    keittiön näistä. Tyhjä merkkijono = keittiötä ei rakenneta."""
    ui = t['ui']
    if not all(ui.get(a) for a in KEITTIO_SANAT):
        return ''
    osat = [' data-pizza="%d" data-taytteita="%d" data-pizzataytteet="%s" data-alku="%s"'
            ' data-naytos="%s" data-taytteet="%s" data-harjoitus="%s"'
            ' data-kuvat="../kuvat/kortti/" data-pizzakuva="pizza-31"'
            ' data-peli="../play/party.html?kieli=%s"'
            % (KEITTIO_ARVO, KEITTIO_TAYTTEITA,
               ','.join(str(x) for x in KEITTIO_PIZZATAYTTEET), KEITTIO_ALKU,
               ','.join(KEITTIO_NAYTOS), ','.join(str(x) for x in KEITTIO_TAYTTEET),
               ','.join(KEITTIO_HARJOITUS), t['lang'])]
    for a in KEITTIO_SANAT:
        osat.append(' data-%s="%s"' % (a.replace('keittio_', 'sana-'), e(ui[a])))
    return ''.join(osat)


def porras_viittaus(s, numero):
    """Linkki siihen portaaseen (tai portaisiin), jota tämä pelimuoto käyttää.

    📐 Mitattu 16.11.2026, miksi tämä EIKÄ tekstin poisto. Pelimuotojen
    haitareissa on 24 virkettä, joissa puhutaan täytteistä tai valmistamisesta,
    mutta vain KAKSI niistä toistaa portaiden säännön: «Pizzat valmistetaan
    Basso-apinan tavalla» (#2) ja «Nyt täytteet ratkaisevat: pizzan voi
    valmistaa vain oikeilla täytteillä» (#3). Loput ovat kunkin pelin omaa
    mekaniikkaa — nostopakka, varasto, vaihdot, pisteet, vuoron kulku — eivätkä
    ne ole missään muualla. Ne kaksi virkettä ovat jo valmiiksi viittauksen
    muodossa, joten ne jätetään ennalleen ja niiden viereen tuodaan LINKKI.

    ⚠️ Ei uutta käännettävää tekstiä: linkin teksti on portaan oma otsikko ja
    pariksi osuminen luetaan portaan omasta `pelit`-kentästä. Sivu ja arkki
    lukevat siis yhä samaa dataa, eikä viittaus voi vanhentua."""
    osat = []
    for i, x in enumerate(s['portaat'], 1):
        for peli in x['pelit'].split(' \u00b7 '):
            if peli.startswith(numero + ' '):
                osat.append('<a href="#porras-%d">%s</a>' % (i, e(x['otsikko'])))
                break
    if not osat:
        return ''
    return '<p class="muoto__tapa">%s</p>' % ''.join(osat)


def portaat(t):
    """Kolme tapaa valmistaa pizza — SAMASTA datasta kuin painettu arkki.

    🔴 Sivulla luki 16.11.2026 asti «Kaksi tapaa valmistaa pizza», vaikka
    tapoja on kolme. Marko: «Oikeastihan niitä on sitä paitsi kolme, koska
    Pizza Lovessa pitää olla juuri oikeat täytteet.» Sivu käytti myös omia
    nimiään («Helpompi tapa») eikä kertonut mikä peli käyttää mitäkin.

    ⚠️ YKSI LÄHDE. `korttipeli.portaat` on sama avain, jonka koteloarkki.py
    lukee arkkiin (`porras()`, `pelit_rivi()`). Sivu ja arkki EIVÄT voi enää
    ajautua erilleen, koska kumpikin lukee tämän. Älä kirjoita sivulle omaa
    sanamuotoa tavoista: muuta dataa, niin molemmat muuttuvat.

    📐 Datassa on valmiina myös `esimerkit` ja `pelit`. Esimerkit piirretään
    tekstinä eikä kortteina: arkilla ne ovat kortteja, koska paperilla ei ole
    muuta keinoa, mutta ruudulla kortit ovat keittiössä, jota lukija voi
    koskea. Yhdeksän korttikuvaa pelkkiä esimerkkejä varten olisi ~170 kt
    siitä hyvästä, että sama asia näytetään kahdesti.

    Keittiö (sivu.js) asuu portaiden SISÄLLÄ ja siirtyy portaasta toiseen,
    joten harjoiteltavan tavan nimi on aina otsikkona sen yläpuolella.
    Marko: «Nämä pitäisi olla siinä kun niitä pizzoja valmistetaan
    interaktiivisesti.»"""
    s = t['korttipeli']
    osat = []
    for i, x in enumerate(s['portaat'], 1):
        osat.append(
            '<li class="porras" id="porras-%d">'
            '<h3>%s</h3><p class="porras__pelit">%s</p>%s%s</li>'
            % (i, e(x['otsikko']), e(x['pelit']), x['html'],
               ('<p class="porras__esimerkit">%s</p>'
                % ' <span>·</span> '.join('<b>%s</b>' % e(l) for l in x['esimerkit']))
               if x.get('esimerkit') else ''))
    return ('<h2 id="tavat">%s</h2>\n<p>%s</p>\n<ol class="portaat"%s>\n%s\n</ol>'
            % (e(s['portaat_otsikko']), e(s['portaat_ingressi']), keittio_data(t),
               '\n'.join(osat)))


# ── Käännettävät kortit «Näin pizza tehdään» -osiossa (16.11.2026) ────────
# Marko osiota katsoessaan: «Tässäkin voisi hyvin olla interaktiivisuutta, että
# painamalla pizzakorttia se kääntyy ja paljastaa pizzakortin. Painamalla
# uudelleen taas tulisi uusi pizzakortti näkyviin.»
#
# Kortti on kortti: kääntäminen on juuri se, mitä kortille pelissä tehdään.
# Siksi vuorovaikutus ei ole tässä koriste vaan sama asia kuin sääntö.
#
# ⚠️ Pakkaa EI kirjoiteta käsin. `pizzapakka()` on sama sääntö kuin
# julkinen/play/kortit.js:ssä, ja se tarkistaa itsensä. Käsin kirjoitettu
# lista ajautuisi erilleen pelistä hiljaa.
#
# Selitteet ovat pelkkiä numeroita («2 + 3 = 5»). Ne ovat kortin oma sisältö,
# eivät uutta tekstiä: ne eivät tarvitse käännöstä eivätkä vanhene millään
# kielellä. Kortin selkäpuoli saa nimekseen viereisen otsikon, joka on jo
# käännetty — näin osio ei tarvinnut yhtään uutta käännösavainta.

def pizzapakka():
    """Painetut 42 pizzakorttia järjestyksessä pizza-13 … pizza-54.

    Sama sääntö kuin julkinen/play/kortit.js: pizzakortteja ovat tasan ne
    joukon {1…10} osajoukot, joiden koko on 1–4 ja summa enintään 10."""
    def osajoukot(koko):
        tulos = []

        def kavele(alkaen, valitut):
            if len(valitut) == koko:
                tulos.append(list(valitut))
                return
            for v in range(alkaen, 11):
                if sum(valitut) + v > 10:
                    break
                valitut.append(v)
                kavele(v + 1, valitut)
                valitut.pop()
        kavele(1, [])
        return tulos
    pakka = []
    for koko in range(1, 5):
        for taytteet in osajoukot(koko):
            pakka.append((13 + len(pakka), taytteet))
    # Tarkistus, ei oletus: pakassa on 42 korttia ja sivun oma esimerkkikortti
    # pizza-31 on tomaatti 2 + ananas 3 = arvo 5.
    assert len(pakka) == 42, pakka
    assert dict(pakka)[31] == [2, 3], pakka
    return dict(pakka)


def kaanto_selite(taytteet):
    """Kortin sisältö numeroina: «2 + 3 = 5», yhdellä täytteellä pelkkä arvo."""
    if len(taytteet) == 1:
        return str(taytteet[0])
    return '%s = %d' % (' + '.join(str(x) for x in taytteet), sum(taytteet))


# Viisi korttia, jotka näyttävät juuri sen minkä viereinen kappale väittää:
# yhdestä neljään täytettä, ja sydänpizza sekä yhdellä että neljällä
# täytteellä. Koko 42 kortin pakka olisi 670 kt kuvia (mitattu 16.11.2026).
#
# Järjestys on harkittu, ei korttien numerojärjestys. Ensimmäinen painallus
# paljastaa sivun oman esimerkkipizzan (tomaatti-ananas, arvo 5), joka toistuu
# vähän alempana esimerkkilohkossa — ensimmäisen käännön pitää palkita, ja
# yhden oliivin kortti arvolla 1 ei palkitse. Sitten täytteitä tulee lisää
# kolmeen ja neljään, ja lopuksi kaksi yhden täytteen korttia kertovat ettei
# pizzassa tarvitse olla montaa täytettä — toinen niistä on sydänpizza.
KAANTO_PIZZAT = [31, 48, 54, 13, 22]
# Täytekortit 1–10 ja fantasiatäyte X, arvojärjestyksessä: kappale lupaa
# arvot 1–10 ja fantasiatäytteen, ja sarja näyttää ne kaikki.
KAANTO_TAYTTEET = [str(n) for n in range(1, 11)] + ['x']


def kaanto_pakat():
    """(pizzapakka, taytepakka) muodossa [[tiedosto, selite], …]."""
    kortit = pizzapakka()
    pizzat = [['kortti/pizza-%d.webp' % n, kaanto_selite(kortit[n])]
              for n in KAANTO_PIZZAT]
    taytteet = [['kortti/tayte-%s.webp' % n, n.upper()] for n in KAANTO_TAYTTEET]
    return pizzat, taytteet


def kaantokortti(tausta, nimi, pakka):
    """Kortin selkäpuoli. julkinen/sivu.js tekee tästä painikkeen; ilman
    JavaScriptiä jää täsmälleen se kuva joka sivulla on ennenkin ollut."""
    return ('<img class="kaanto__kuva" src="../kuvat/kortti/%s" width="240" height="364"'
            ' alt="" data-kaanto="%s" data-nimi="%s">'
            % (tausta, e(json.dumps(pakka, ensure_ascii=False)), e(nimi)))



def korttipeli(t, kaikki):
    s = t['korttipeli']
    lang = t['lang']
    tiedot = ''.join('<li>%s</li>' % e(x) for x in s['tiedot'])
    # ⚠️ YKSI LÄHDE POLULLE. `PDF['korttipeli']` on VANHA kolmikielinen arkki;
    # omankielinen tulee `korttipeli_pdf(lang)`:sta. Ensimmäinen versio luki
    # ylänapin suoraan `PDF`:stä, ja nappi osoitti kaikilla kielillä vanhaan
    # tiedostoon — alalista oli oikein, koska se sai korvatun sanakirjan.
    oma_arkki = korttipeli_pdf(lang)
    polut = dict(PDF, korttipeli=oma_arkki or PDF['korttipeli'])
    lataa_avaimet = ['korttipeli'] if oma_arkki else []
    kaanto_pizzat, kaanto_taytteet = kaanto_pakat()
    hyppy = hyppynapit(s['hyppy'], lataa_avaimet, polut)
    # Koko lohko yhtenä palana, jotta se voi myös puuttua: tyhjä «Säännöt
    # PDF:nä» -otsikko ilman tiedostoa olisi lupaus jota ei lunasteta.
    latauslohko = ('<h2 id="lataa">%s</h2>\n<p>%s</p>\n%s' % (
        e(s['lataa_otsikko']), e(s['lataa_teksti']),
        lataukset(lataa_avaimet, {'korttipeli': s['lataa_tiedosto']}, polut, lang))
    ) if lataa_avaimet else ''

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
  <div class="muoto__sisus">%s%s%s</div>
</details>''' % (m['avain'], ' open' if i == 0 else '', e(m['numero']), e(m['nimi']), e(m['kuvaus']),
                 porras_viittaus(s, m['numero']), vblock, m['html']))

    # ── «Näin pizza tehdään» ei enää lupaa yhtä sääntöä (16.11.2026) ────────
    # Marko osiota katsoessaan: «Pelit perustuvat samaan sääntöön? Eikö me tämä
    # juuri poistettu kirjallisista ohjeista.»
    #
    # `perusteet_ingressi` («Kaikki kolme peliä perustuvat samaan sääntöön.»)
    # oli sivun AINOA paikka, joka väitti niin — mitattu grepillä kaikista sivun
    # sääntö-virkkeistä: muut osumat ovat <h3>Perussääntö</h3> ja kielivalikon
    # data-attribuutit. Väite on myös saman päivän päätöksen vastainen: tapoja
    # on kolme, koska Pizza Lovessa pitää olla juuri oikeat täytteet.
    #
    # Avain JÄÄ sisältötiedostoihin: `korttisaannot.py` (A4-sääntöarkki) lukee
    # sen yhä, eikä se tiedosto ole tämän istunnon. Siksi tässä poistetaan vain
    # sivun kappale. ⚠️ Jos arkki joskus päivitetään kolmeen tapaan, poista
    # avain samalla kaikista sisalto/*.json-tiedostoista.
    runko = '''
<h1>%s</h1>
<p class="ingressi">%s</p>
<ul class="pelin-tiedot">%s</ul>
<nav class="hyppylinkit">%s</nav>

<h2 id="perusteet">%s</h2>
<div class="korttiparit">
  <div class="korttipari">%s<div><h3 style="margin-top:0">%s</h3><p>%s</p></div></div>
  <div class="korttipari">%s<div><h3 style="margin-top:0">%s</h3><p>%s</p></div></div>
</div>

<div class="laatikko">
  <h3 style="margin-top:0">%s</h3>
  <p>%s</p>
  <h3>%s</h3>
  <p>%s</p>
  <h3>%s</h3>
  <div class="esimerkki" role="img" aria-label="%s">
    <img src="../kuvat/kortti/pizza-31.webp" width="240" height="364" alt=""><b>=</b>
    <img src="../kuvat/kortti/tayte-10.webp" width="240" height="364" alt=""><b>:</b>
    <img src="../kuvat/kortti/tayte-2.webp" width="240" height="364" alt="">
  </div>
  <p>%s</p>
</div>

<div class="laatikko"><h3 style="margin-top:0">%s</h3><p>%s</p></div>

%s

<div class="huomio"><img src="../kuvat/basso-pohtii.webp" width="560" height="601" alt=""><p>%s</p></div>

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

%s
%s
''' % (e(s['h1']), e(s['ingressi']), tiedot, hyppy,
       e(s['perusteet_otsikko']),
       kaantokortti('tausta-pizza.webp', s['pizzakortit_otsikko'], kaanto_pizzat),
       e(s['pizzakortit_otsikko']), e(s['pizzakortit']),
       kaantokortti('tausta-tayte.webp', s['taytekortit_otsikko'], kaanto_taytteet),
       e(s['taytekortit_otsikko']), e(s['taytekortit']),
       e(s['perussaanto_otsikko']), e(s['perussaanto']), e(s['arvo_otsikko']), s['arvo'],
       e(s['esimerkki_otsikko']), e(s['esimerkki_alt']), e(s['esimerkki']),
       e(s['laskut']['otsikko']), s['laskut']['html'],
       portaat(t),
       s['huomio_bruno'],
       e(s['muodot_otsikko']), e(s['muodot_ingressi']), '\n'.join(muodot),
       e(s['pelaa_otsikko']), e(s['pelaa_teksti']), lang, e(t['ui']['nav_pelaa']),
       latauslohko,
       ristiinmyynti(t, 'lautapeli', 'korttipelisivu'))
    return kehys(t, kaikki, 'korttipeli', s['title'], s['kuvaus'], runko)


# ── Pelilaudan kartta: sanasto saa paikan (16.11.2026) ────────────────────
# Marko: «Sen sijaan, että nettisivulla kerrotaan, niin pitäisikö näyttää?»
#
# 📐 Mitattu 16.11.2026: lautapelisivulla ei ollut yhtään kuvaa laudasta.
# Kolme <img>-elementtiä olivat ylätunnisteen viiri, tuotepakkaus ja bannerin
# apina. Silti teksti nimeää varaston, linjaston, apinavaa'an ja
# pizzakorttipaikat — neljä paikkaa, joita lukija ei voinut nähdä mistään.
# Painettu pikaohje ratkaisee saman asian kirjaimilla A)–I) ja yhdeksällä
# erillisellä valokuvalla, koska paperilla ei ole muuta keinoa. Ruudulla osan
# voi osoittaa siitä kohdasta, jossa se oikeasti on.
#
# ⚠️ Nimet EIVÄT ole uutta tekstiä. Ne ovat pelin omat, kahdeksalla kielellä
# (play/apinavaaka/apinavaaka.js → OPAS[kieli].osat.*.nimi), ja ne täsmäävät
# painettuun ohjevihkoon siellä missä sellainen on: fi VARASTO / sv LAGER /
# en STORAGE, fi LINJASTO / sv LINJE / en LINE, fi APINAVAAKA / sv APVÅG /
# en MONKEY SCALES. Sanat on kopioitu `sisalto/<kieli>.json`:iin, koska sivun
# teksti kuuluu sinne; lähde on kirjattu tähän, jotta sitä ei arvata uudelleen.
#
# 📐 Merkkien paikat ovat prosentteja kuvasta `julkinen/kuvat/pelilauta.webp`
# (900 × 900, rajattu painotiedoston TrimBoxiin, Gameboard_pizzabox_16.6.2025):
#   varasto   numeroitu pylväs oikeassa reunassa, puoliväli
#   linjasto  täyteympyröiden rengas, ananas renkaan oikealla laidalla
#   vaaka     apinan vasen punnuslautanen
#   pizzat    vasemman ylänurkan katkoviivaruutu
# Järjestys on pelin kulku: täytteet lähtevät varastosta, siirtyvät
# linjastolle, vaaka punnitsee siirron, ja pizzakortit valmistetaan.
LAUTA_MERKIT = [('varasto', '93', '50'), ('linjasto', '76.5', '47'),
                ('vaaka', '38', '41'), ('pizzat', '19', '11')]

# ── Laudan alueet (Marko 16.11.2026) ──────────────────────────────────────
# Marko: «Kyllä se koko alue pitäisi korostua siinä pelilaudalla. Eli kun
# puhutaan varastosta, niin ne varastopaikat pitäisi korostua. Kun puhutaan
# linjastosta, niin linjaston pitäisi korostua.»
#
# Koordinaatisto on pelilauta.webp:n oma 900×900, joten muodot eivät riipu
# siitä, minkä kokoisena lauta näytetään.
#
# 📐 MITATTU KUVASTA, EI ARVATTU. Lauta piirrettiin selaimeen 100 pikselin
# ruudukon kanssa, ehdotetut muodot piirrettiin sen päälle ja niitä siirrettiin
# kunnes ne osuivat. Mitatut luvut, joista muodot on johdettu:
#   · varastotornien paikat ovat pystyrivissä, keskipisteet x≈839, ylin y≈57,
#     alin y≈819, ympyrän säde ≈35
#   · linjaston kymmenen täyteympyrän KESKIPISTEET ovat soikiolla
#     rx 240, ry 218 (keskipiste 438,430) ja ympyrän säde on 48 — rengas on
#     siis keskisoikio ± (48 + 6 px marginaali)
#   · apina punnuksineen ulottuu x 280…605, y 290…610; punnusvadit ovat
#     keskipisteissä (345,365) ja (540,365), säde ≈48 — soikio on leveämpi
#     kuin apina, koska ensimmäinen versio leikkasi vadit reunoiltaan pois
#   · neljä pizzakorttipaikkaa ovat katkoviivalaatikoita, mitatut nurkat
#     (95,24) (18,219) (22,530) (95,717), koko ≈ 140×146; alla olevissa
#     luvuissa on 8 px marginaali joka suuntaan
#
# ⚠️ Jos lauta piirretään uusiksi, nämä on mitattava uudelleen. Väärään
# kohtaan osuva korostus on pahempi kuin ei korostusta lainkaan.
LAUTA_ALUEET = {
    'varasto':  [('rect', 798, 16, 84, 846, 42)],
    'linjasto': [('rengas', 438, 430, 294, 285, 186, 164)],
    'vaaka':    [('soikio', 442, 445, 192, 172)],
    'pizzat':   [('rect', 87, 16, 155, 162, 10),
                 ('rect', 10, 211, 162, 160, 10),
                 ('rect', 14, 522, 154, 160, 10),
                 ('rect', 87, 709, 156, 163, 10)],
}


def _soikio(cx, cy, rx, ry):
    """Soikio kahtena puolikaarena — <ellipse> ei kelpaa, koska muodot
    yhdistetään yhdeksi poluksi (evenodd tekee reiän varjoon)."""
    return 'M%g %gA%g %g 0 1 0 %g %gA%g %g 0 1 0 %g %gZ' % (
        cx - rx, cy, rx, ry, cx + rx, cy, rx, ry, cx - rx, cy)


def _suorakulmio(x, y, w, h, r):
    return ('M%g %gH%gA%g %g 0 0 1 %g %gV%gA%g %g 0 0 1 %g %gH%gA%g %g 0 0 1 %g %gV%gA%g %g 0 0 1 %g %gZ'
            % (x + r, y, x + w - r, r, r, x + w, y + r, y + h - r, r, r, x + w - r, y + h,
               x + r, r, r, x, y + h - r, y + r, r, r, x + r, y))


def alue_polku(muodot):
    """Alueen muodot yhdeksi SVG-poluksi."""
    osat = []
    for m in muodot:
        if m[0] == 'rect':
            osat.append(_suorakulmio(*m[1:]))
        elif m[0] == 'soikio':
            osat.append(_soikio(*m[1:]))
        elif m[0] == 'rengas':
            cx, cy, rox, roy, rix, riy = m[1:]
            osat.append(_soikio(cx, cy, rox, roy))
            osat.append(_soikio(cx, cy, rix, riy))   # evenodd → keskus jää ulos
    return ''.join(osat)


def opasmountti(nimi, t):
    """Animaation kiinnityskohta lautapelisivulla. ⚠️ Nappi renderöidään vain
    jos käännös on olemassa — sama sääntö kuin apinakorttisivulla: puolikielinen
    sivu olisi huonompi kuin sivu ilman nappia, ja sääntö on luettavissa ilman
    animaatiotakin. Raskas moduuli ladataan vasta painalluksesta."""
    ui = t.get('ui', {})
    nayta = ui.get('apinakortti_nayta')
    if not (nayta and ui.get('apinakortti_piilota')):
        return ''
    lauta = t.get('lautapeli', {}).get('lauta', {})
    # ⚠️ Leimatut polut myös tänne: kytkentäskripti lataa moduulin ajossa eikä
    # voi laskea tiivistettä, ja ilman leimaa selain tarjoilee vanhaa.
    # ⚠️ ALUEIDEN MITAT TULEVAT SIVULTA, EI MODUULIN OMASTA KOPIOSTA.
    # `LAUTA_ALUEET` on mitattu laudan kuvasta kerran (ks. sen kommentti), ja
    # toinen kopio ajautuisi erilleen juuri silloin kun lauta piirretään
    # uusiksi — väärään kohtaan osuva korostus on pahempi kuin ei korostusta.
    import json as _json
    alueet = _json.dumps({k: v for k, v in LAUTA_ALUEET.items()},
                         separators=(',', ':')).replace('"', '&quot;')
    css = ','.join('../' + leima('play/apinavaaka/' + f)
                   for f in ('apinavaaka.css', 'apinakortti.css'))
    # kortit.js on play-juuressa (pelin oma pizzapakka), muut apinavaaka-kansiossa.
    js = ','.join(['../' + leima('play/apinavaaka/noppa3d.js'),
                   '../' + leima('play/apinavaaka/apinavaaka.js'),
                   '../' + leima('play/kortit.js'),
                   '../' + leima('play/apinavaaka/apinakortti.js')])
    return ('<div class="ak-opas" data-opas="%s"'
            ' data-kansio="../play/apinavaaka/" data-lauta="../kuvat/pelilauta.webp"'
            ' data-css="%s" data-js="%s" data-alueet="%s"'
            ' data-lautakortit="../kuvat/lautapeli/"'
            ' data-linjasto="%s" data-varasto="%s"'
            ' data-nayta="%s" data-piilota="%s">'
            '<button type="button" class="apinakortti__nayta" aria-expanded="false">%s</button>'
            '</div>'
            % (nimi, css, js, alueet, e(lauta.get('linjasto', '')), e(lauta.get('varasto', '')),
               e(nayta), e(ui.get('apinakortti_piilota')), e(nayta)))


def lautakartta(s):
    """Lauta kuvana ja osien nimet sen päällä. Nimet ovat oikeaa tekstiä
    eivätkä kuvaan poltettuja, joten ne kääntyvät ja ruudunlukija lukee ne.
    Kuva itse on koriste (alt=""): sen sisältö on juuri nämä nimet."""
    if not s.get('lauta'):
        return ''
    merkit = ''.join(
        '<span class="lautakartta__merkki" data-osa="%s" style="--x:%s%%;--y:%s%%" aria-hidden="true">%d</span>'
        % (osa, x, y, i + 1) for i, (osa, x, y) in enumerate(LAUTA_MERKIT))
    nimet = ''.join('<li data-osa="%s"><b>%d</b>%s</li>' % (osa, i + 1, e(s['lauta'][osa]))
                    for i, (osa, _, _) in enumerate(LAUTA_MERKIT))
    # Varjo on yksi polku: koko lauta + alueen muodot, fill-rule evenodd.
    # Alue jää siis reiäksi, ja reikiä voi olla monta (pizzakorttipaikkoja on
    # neljä) tai se voi olla rengas. Reuna piirtää saman muodon ääriviivana.
    alueet = ''.join(
        '<path class="lautakartta__varjo" data-alue="%s" fill-rule="evenodd" d="M0 0H900V900H0Z%s"/>'
        '<path class="lautakartta__reuna" data-alue="%s" d="%s"/>'
        % (osa, alue_polku(LAUTA_ALUEET[osa]), osa, alue_polku(LAUTA_ALUEET[osa]))
        for osa, _, _ in LAUTA_MERKIT if LAUTA_ALUEET.get(osa))
    return ('<figure class="lautakartta liike">\n'
            '  <div class="lautakartta__lauta">'
            '<img src="../kuvat/pelilauta.webp" width="900" height="900" alt="" loading="lazy">'
            '<svg class="lautakartta__alueet" viewBox="0 0 900 900" aria-hidden="true" focusable="false">%s</svg>'
            '%s</div>\n'
            '  <figcaption><ol class="lautakartta__nimet">%s</ol></figcaption>\n'
            '</figure>' % (alueet, merkit, nimet))


def lautapeli(t, kaikki):
    s = t['lautapeli']
    lang = t['lang']
    tiedot = ''.join('<li>%s</li>' % e(x) for x in s['tiedot'])
    hyppy = hyppynapit(s['hyppy'], lauta_lataukset(lang), PDF)
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
%s
<div class="laatikko">
  <h3 style="margin-top:0">%s</h3>
  <p>%s</p>
  %s
  <h3>%s</h3>
  <!-- ⚠️ KUVA ENNEN TEKSTEJÄ (Marko 22.11.2026: «Tässä pelin setupin
       laittamisessa taas ei pysy ollenkaan perässä että mikä ohje kuuluu
       mihinkin, kun ei tekstit ja kuva näy samaan aikaan. Kuva ensin ja
       vasta sitten tekstit.»). Animaatio aukesi listan ALLE, jolloin se
       työnsi ohjeet ruudun ulkopuolelle juuri kun niitä olisi pitänyt
       verrata animaatioon. -->
  %s
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
       e(s['peli_otsikko']), lautakartta(s),
       e(s['voittaminen_otsikko']), s['voittaminen'], opasmountti('voitto', t),
       e(s['valmistelut_otsikko']), opasmountti('valmistelut', t), valm,
       e(s['vuoro_otsikko']), vaiheet, vuoro,
       e(s['muodot_otsikko']), e(s['muodot_ingressi']), muodot,
       VAAKA_W, VAAKA_H, e(s['pelaa_otsikko']), e(s['pelaa_teksti']), lang, e(t['ui']['nav_pelaa']),
       e(s['lataa_otsikko']), e(s['lataa_teksti']),
       lataukset(lauta_lataukset(lang), dict(s['lataukset'], **{a: s['lataukset'][PDF[a][1]] for a in LAUTA_OMAT.get(lang, [])}), PDF, lang),
       ristiinmyynti(t, 'korttipeli', 'lautapelisivu'))
    return kehys(t, kaikki, 'lautapeli', s['title'], s['kuvaus'], runko)


def apinakortit(t, kaikki):
    """Apinakorttien selitykset 01–33 (Marko 20.10.2026: «josta pelaaja voisi ne nopeasti katsoa»).
    Numeroruudukko vie suoraan korttiin (#k01…#k33). Kentät: nimi, ohje, huom (painetun
    ohjeen HUOM!), tarkennus (Markon hyväksymä selvennys monitulkintaiseen korttiin),
    virhe (huomautus painetun ohjeen virheestä, esim. EN-kortin 30 numerointi).
    Tekstit: sisalto/apinakortit-xx.json."""
    a = t['apinakortit']
    # ⚠️ NAPIT RENDERÖIDÄÄN VAIN JOS KÄÄNNÖS ON. Ilman tätä saksalainen
    # lukija saisi suomenkielisen napin, ja puolikielinen sivu on huonompi
    # kuin sivu ilman nappia — sääntö on luettavissa ilman animaatiotakin.
    ui = t.get('ui', {})
    nayta, piilota = ui.get('apinakortti_nayta'), ui.get('apinakortti_piilota')
    if not (nayta and piilota):
        nayta = piilota = None
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
                # ⚠️ HUOM JA TARKENNUS i-YMPYRÄN TAAKSE (Marko 16.11.2026: «Nuo
        # tarkennus-tekstit pitäisi olla jossain piilossa i:n tai ?:n takana» ja
        # «pelkkä ympyrä, jossa on tuo i-kirjain — ilman tarkennussanaa»).
        # Kortissa 5 sääntö oli kolme riviä ja poikkeukset viisi: poikkeus sai
        # enemmän tilaa kuin itse sääntö. Sana elää `aria-label`issa.
        if lisa:
            lisa = ('<button type="button" class="apinakortti__i" aria-expanded="false" '
                    'aria-controls="lisa%02d" aria-label="%s">i</button>'
                    '<div class="apinakortti__lisa" id="lisa%02d" hidden>%s</div>'
                    % (k['n'], e(a['tarkennus']), k['n'], lisa))
        nappi = ('<button type="button" class="apinakortti__nayta" data-n="%d" '
                 'aria-expanded="false">%s</button>' % (k['n'], e(nayta))) if nayta else ''
        kortit.append('<article class="apinakortti" id="k%02d">\n  <span class="apinakortti__nro">%02d</span>\n'
                      '  <div class="apinakortti__sisalto"><h3>%s</h3><p>%s</p>%s%s</div>\n</article>'
                      % (k['n'], k['n'], e(k['nimi']), e(k['ohje']), lisa, nappi))
    runko = '''
<p class="murupolku"><a href="lautapeli.html">← %s</a></p>
<h1>%s</h1>
<p class="ingressi">%s</p>
<p class="pieni">%s</p>
%s
<nav class="korttinumerot" aria-label="%s">%s</nav>
<div class="apinakortit"%s>%s</div>
<p class="murupolku" style="margin-top:28px"><a href="lautapeli.html">← %s</a></p>
''' % (e(a['takaisin']), e(a['h1']), e(a['ingressi']), e(a['kaytto']),
       # Yleinen sääntö kaikille korteille (Marko 19.1.2026 pelaajalle): vuoro päättyy nostoon,
       # säästettävä kortti on nostajan.
       ('<p class="apinakortit__yleista">%s</p>' % e(a['yleista'])) if a.get('yleista') else '',
       e(a['hae']), numerot,
       # Polut ja napin tekstit kytkentäskriptille. Lauta on sivuston oma kuva
       # (`julkinen/kuvat/`), ei pelikansion kopio: yksi tiedosto riittää.
       # ⚠️ LEIMAT MYÖS DYNAAMISESTI LADATUILLE. Kytkentäskripti hakee moduulin
       # vasta napin painalluksesta, eikä se voi laskea tiivistettä — joten
       # leimatut polut annetaan sivulta. Ilman tätä selain tarjoili vanhaa
       # `apinavaaka.js`:ää välimuistista ja animaatio kaatui (mitattu 16.11.2026:
       # «torni is not a function»).
       ('' if not nayta else
        ' data-kansio="../play/apinavaaka/" data-lauta="../kuvat/pelilauta.webp"'
        ' data-css="%s" data-js="%s"'
        ' data-linjasto="%s" data-varasto="%s"'
        ' data-nayta="%s" data-piilota="%s"'
        % (','.join('../' + leima('play/apinavaaka/' + f)
                    for f in ('apinavaaka.css', 'apinakortti.css')),
           ','.join('../' + leima('play/apinavaaka/' + f)
                    for f in ('noppa3d.js', 'apinavaaka.js', 'apinakortti.js')),
           e(t.get('lautapeli', {}).get('lauta', {}).get('linjasto', '')),
           e(t.get('lautapeli', {}).get('lauta', {}).get('varasto', '')),
           e(nayta), e(piilota))),
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
       lataukset(['tt_vari', 'tt_viiva'], nimet, PDF, t['lang']),
       e(a['vuoro_otsikko']), vaiheet, e(a['vuoro_huom']), e(a['vuoro_raja']),
       saannot,
       e(a['muunnelmat_otsikko']), muunnelmat)
    return kehys(t, kaikki, 'essen', tt('title'), tt('kuvaus'),
                 qr_hyppy(t['lang']) + runko)



# ⚠️ ESSEN-LAPUN QR ON JO PAINETTU: se osoittaa
# https://pizzalove.fi/de/essen-2026.html (pizzaparty/essen-lappu.py). Pusseja
# jaettiin myos suomalaisissa lasten syntymapaivajuhlissa, ja Marko 7.11.2026:
# «olisi tärkeää, että juhlavieraat löytävät kotona heti oikeaan paikkaan.»
# Siksi QR:lla tuleva (ei tule pizzalove.fi:n sisalta, ei #-kohtaa):
#   1. siirretaan oman kielensa Essen-sivulle (valittu kieli > selaimen kieli;
#      muuten saksa pysyy), ja
#   2. sivu avautuu suoraan pussin peliin (#peli).
# Valikosta tai kielivalikosta tuleva nakee sivun alusta kuten ennenkin.
# Ehto on «ei pizzalove.fi:sta» eika «ei referreria», koska Androidin
# kamera/Lens voi antaa referreriksi android-app://-osoitteen.
# Laiskat kuvat ilman mittoja ovat #peli-kohdan ylapuolella ja venyttavat
# sivua latautuessaan, joten kohta asetetaan uudelleen kuvien latautuessa
# (enintaan 4 s), kunnes kavija itse vierittaa.
def qr_hyppy(lang):
    return '''<script>
(function () {
  var kielet = %s, nyt = '%s';
  var sisalta = /^https?:\\/\\/(www\\.)?pizzalove\\.fi\\//.test(document.referrer);
  if (!location.hash && !sisalta) {
    var valittu = null;
    try { valittu = localStorage.getItem('pizzalove-kieli'); } catch (e) {}
    if (kielet.indexOf(valittu) < 0) {
      valittu = null;
      var selain = navigator.languages || [navigator.language || ''];
      for (var i = 0; i < selain.length && !valittu; i++) {
        var k = String(selain[i]).slice(0, 2).toLowerCase();
        if (kielet.indexOf(k) >= 0) valittu = k;
      }
    }
    if (valittu && valittu !== nyt) {
      location.replace('../' + valittu + '/essen-2026.html#peli');
      return;
    }
    try { history.replaceState(null, '', '#peli'); } catch (e) {}
  }
  if (location.hash !== '#peli') return;
  var loppu = Date.now() + 4000, ohi = false;
  function kohdalle() {
    var el = document.getElementById('peli');
    if (!el || ohi || Date.now() > loppu) return;
    try { el.scrollIntoView({ behavior: 'instant', block: 'start' }); }
    catch (e) { el.scrollIntoView(true); }   // vanha Safari ei tunne 'instant'
  }
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) {
    addEventListener(ev, function () { ohi = true; }, { once: true, passive: true });
  });
  document.addEventListener('DOMContentLoaded', kohdalle);
  document.addEventListener('load', kohdalle, true);
  addEventListener('load', kohdalle);
})();
</script>
''' % (json.dumps(KIELET), lang)

def juurisivu(kaikki):
    """pizzalove.fi/ — ohjaa selaimen kielen mukaan. QR-koodit osoittavat tänne."""
    # 🔵 Marko 16.11.2026: «Lisää liput myös juurisivun kielilistaan.» Sama lippu
    # samasta kansiosta kuin ylävalikossa; juurisivu on docs/index.html, joten
    # polku on kuvat/liput/ ilman ../:ia. Tyyli on sivun omassa <style>-lohkossa,
    # koska juurisivu ei lataa tyyli.css:ää (se ohjaa eteenpäin heti).
    def rivi(k, nimi):
        return '<li><a href="%s/" hreflang="%s" lang="%s">%s<span>%s</span></a></li>' % (
            k, k, k, valikkolippu(k, paikanpitaja=False, polku='kuvat/liput/'), e(nimi))
    linkit = ''.join(rivi(k, kaikki[k]['nimi']) for k in KIELET)
    linkit += ''.join(rivi(k, d['nimi'])
                      for k, d in sorted(KONEKIELET.items(), key=lambda x: x[1]['nimi'].lower()))
    return '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="only light">
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
  // Selaimen kielestä sivuston koodi: zh-CN → zh-hans, zh-TW → zh-hant, pt-BR → pt-br, no/nn → nb
  function koodi(l) {
    l = String(l || '').toLowerCase(); var p = l.split('-');
    if (p[0] === 'zh') return /hant|-tw|-hk|-mo/.test(l) ? 'zh-hant' : 'zh-hans';
    if (p[0] === 'pt' && p[1] === 'br') return 'pt-br';
    if (p[0] === 'no' || p[0] === 'nn') return 'nb';
    return p[0];
  }
  try { valittu = localStorage.getItem('pizzalove-kieli'); } catch (e) {}
  if (kielet.indexOf(valittu) < 0) {
    valittu = null;
    var selain = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < selain.length && !valittu; i++) {
      var k = koodi(selain[i]);
      if (kielet.indexOf(k) >= 0) valittu = k;
    }
  }
  location.replace((valittu || '%s') + '/' + location.hash);
})();
</script>
<style>body{font-family:system-ui,sans-serif;background:#FAF6EE;color:#1A1A1A;display:grid;place-items:center;min-height:90vh;margin:0}
ul{list-style:none;padding:0;display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
a{display:flex;align-items:center;gap:9px;padding:12px 18px;border-radius:12px;background:#E96E2A;color:#1A1A1A;font-weight:700;text-decoration:none}
.kielet__lippu{width:20px;height:20px;flex:0 0 20px;border-radius:50%%;object-fit:cover;box-sizing:border-box;border:1px solid rgba(255,255,255,.75)}</style>
</head>
<body>
<main><p style="text-align:center;font-weight:700">Pizza Love®</p><ul>%s</ul></main>
</body>
</html>
''' % (OSOITE, OSOITE, json.dumps(KIELET + sorted(KONEKIELET)), OLETUSKIELI, linkit)


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
<meta name="color-scheme" content="only light">
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


def konekieli_sivu(k, d, kaikki):
    '''Konekäännetyn kielen korttipelisivu xx/card-game.html (Marko 16.11.2026).
    Sama sivupohja kuin englanniksi, mutta korttipelin sisältö konekäännöksestä.
    Muut sivut ovat englanniksi; valikko ja napit kohdekielellä. Ylhäällä merkintä «konekäännös, ei
    tarkastettu» ja linkki virheilmoitukseen (sähköposti: ei lomaketta, ei talletusta).'''
    from urllib.parse import quote
    t = copy.deepcopy(kaikki['en'])
    t['lang'], t['nimi'], t['korttipeli'] = k, d['nimi'], d['korttipeli']
    # Valikko, napit ja alaosa kohdekielellä, jos käännöksessä on «ui» (kaanna.py);
    # puuttuvat avaimet englanniksi. Linkit vievät silti englanninkielisille sivuille.
    t['ui'] = dict(t['ui'], **d.get('ui', {}))
    h = korttipeli(t, kaikki)
    for sivu in ('index.html', 'lautapeli.html', 'essen-2026.html', 'apinakortit.html'):
        h = h.replace('href="%s"' % sivu, 'href="../en/%s"' % sivu)
    h = h.replace('../play/?kieli=%s' % k, '../play/?kieli=en')
    aihe = quote('Pizza Love – käännösvirhe / translation error (%s)' % k)
    ilmoitus = ('<div class="konekaannos" lang="%s"><p><strong>%s</strong> '
                '<a href="mailto:%s?subject=%s">%s</a></p></div>'
                % (k, e(d['kielet']['konekaannos_merkinta']), SAHKOPOSTI, aihe,
                   e(d.get('ilmoita_virhe') or 'Report a translation error')))
    return h.replace('<main id="sisalto">', '<main id="sisalto">\n' + ilmoitus, 1)


def konekieli_ohjaus(k):
    '''xx/ → xx/card-game.html (konekäännetyllä kielellä on vain korttipelisivu).'''
    return ('<!doctype html><html lang="%s"><meta charset="utf-8"><title>Pizza Love</title>'
            '<meta http-equiv="refresh" content="0; url=%s.html">'
            '<script>location.replace(%s + location.search + location.hash);</script>'
            '<a href="%s.html">Pizza Love</a></html>\n' % (k, KONE_SIVU, json.dumps(KONE_SIVU + '.html'), KONE_SIVU))


def korttipeli_ohjaus(k):
    """Vanha osoite xx/korttipeli.html on painetuissa QR-koodeissa: ohjaa uuteen
    kielen mukaiseen nimeen (kysely ja #-osa säilyvät)."""
    uusi = KORTTIPELI_SIVU[k]
    return '''<!doctype html>
<html lang="%s"><meta charset="utf-8"><title>Pizza Love</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="%s/%s/%s.html">
<meta http-equiv="refresh" content="0; url=%s.html">
<script>location.replace(%s + location.search + location.hash);</script>
<a href="%s.html">Pizza Love</a>
</html>
''' % (k, OSOITE, k, uusi, uusi, json.dumps(uusi), uusi)


def main():
    KONEKIELET.update(lue_konekaannokset())
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
            sisalto = f(t, kaikki).replace('href="korttipeli.html"', 'href="%s"' % sivutiedosto('korttipeli', k))
            if nimi == 'korttipeli.html':
                nimi = sivutiedosto('korttipeli', k)
            with open(os.path.join(ULOS, k, nimi), 'w', encoding='utf-8') as out:
                out.write(sisalto)
        if sivutiedosto('korttipeli', k) != 'korttipeli.html':
            with open(os.path.join(ULOS, k, 'korttipeli.html'), 'w', encoding='utf-8') as out:
                out.write(korttipeli_ohjaus(k))
    for k, d in KONEKIELET.items():
        os.makedirs(os.path.join(ULOS, k), exist_ok=True)
        with open(os.path.join(ULOS, k, KONE_SIVU + '.html'), 'w', encoding='utf-8') as out:
            out.write(konekieli_sivu(k, d, kaikki))
        with open(os.path.join(ULOS, k, 'index.html'), 'w', encoding='utf-8') as out:
            out.write(konekieli_ohjaus(k))
    if KONEKIELET:
        print('konekäännökset:', ', '.join(sorted(KONEKIELET)))
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
