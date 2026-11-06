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

⚠️ KOLME SIVUA ON KATTO (6.11.2026, aiemmin kaksi). Alkuperainen tavoite oli
kaksi sivua: yksi arkki kaksipuolisena. Saksaa on
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
ISKULAUSE_KIRJASIN = "Otsikko,'DIN Condensed',sans-serif"
PELIVALINTA = os.path.join(TANNE, 'julkinen', 'play', 'pelivalinta.js')
QRJS = os.path.join(TANNE, 'julkinen', 'play', 'qr.js')
JSQR = os.path.join(TANNE, 'julkinen', 'play', 'vendor', 'jsqr', 'jsQR.js')
QR_MM = 22.0
QR_MODUULI_MIN_MM = 0.5
VIIVA = '#7A7A7A'  # korttien hiusviiva
PALSTAVALI = 6   # mm; 186 mm / 3 palstaa -> palsta n. 58 mm (painettu n. 54 mm)
SIVU_KATTO = 3   # 🔵 Marko 6.11.2026: «Jos ohjeet menevät kolmelle A4-sivulle, niin se ei haittaa, kunhan ohjeet ovat selkeät ja helposti luettavat.»

# 🔵 Marko 30.10.2026: «Englanninkielinen ohje on tarkistettu natiivin
# puhujan toimesta.» Siksi `en` on mukana: se on ainoa kieli jonka sanamuodosta
# on ihmisen tarkastus, ja saksa on kaannos. Rinnakkain tulostettuna ero on
# luettavissa.
# ⚠️ Nama EIVAT ole kaannoksia vaan ARKIN omia tekstejä. JSONissa on sivun
# tekstit; paperilla on omat (mista kortit saa, kuka on kustantaja, QR:n
# saate). Kieli joka puuttuu tasta, puuttuu myos arkilta.
KIELET = {
    # 🔵 Marko 6.11.2026: «Voitko tehdä samanlaisen ohjeen myös suomeksi,
    # jolloin voin helpommin tarkistaa ohjeen rakenteen ja myös kielen.»
    # ⚠️ TARKISTUSVERSIO, EI JULKAISTA: kansio paperi/luonnokset (ei
    # julkinen/), eika sivu linkita siihen. Suomen julkinen lataus on yha
    # painettu FI·SV·EN-arkki (pizza-love-korttipeli-saannot.pdf), jota
    # tama EI saa korvata.
    'fi': {
        'tiedosto': 'pizza-love-korttipeli-saannot-fi-luonnos.pdf',
        'kansio': os.path.join('paperi', 'luonnokset'),
        'alaotsikko': 'Kolme peliä samalla pakalla',
        'iskulause': 'JOKAINEN PIZZA LASKETAAN',
        'bruno_huomio': '*Vuoden 2025 ohjeissa Pizza Bruno.',
        'hyva_tietaa': 'Hyvä tietää',
        'kaavio': ('Pelaaja A', 'Pelaaja B', 'Pizzapino', 'Varasto',
                   'Nostopakka', 'Vaihtopizza'),
        'vaihto_luku': 'Varastokorttien vaihtaminen',
        'vaihto_otsikko': 'Esimerkki vaihdosta',
        'vaihto': ('Pelaaja B vaihtaa nelosensa pelaaja A:n kutoseen ja '
                   'kakkoseen, koska 4 = 6 – 2. Nyt B voi valmistaa pizzansa. '
                   'Vaihto auttoi myös A:ta, mutta B:n kannatti tehdä se silti.'),
        'qr_teksti': 'Säännöt ja<br>videot netissä',
        'osoite': 'https://pizzalove.fi/fi/korttipeli.html',
        'videot': 'Lisätietoja ja videoita osoitteessa',
        'oikeudet': ('Pizza Love® ja Merkitysten® ovat Merkitysten Oy:n '
                     'rekisteröityjä tavaramerkkejä. Kaikki oikeudet pidätetään.'),
    },
    'de': {
        'tiedosto': 'pizza-love-kartenspiel-regeln-de.pdf',
        'alaotsikko': 'Drei Spiele mit einem Kartenstapel',
        'iskulause': 'JEDE PIZZA ZÄHLT',
        'bruno_huomio': '*In den Regeln von 2025: Pizza Bruno.',
        'hyva_tietaa': 'Gut zu wissen',
        'kaavio': ('Spieler A', 'Spieler B', 'Pizzastapel', 'Vorrat',
                   'Nachziehstapel', 'Tauschpizza'),
        'vaihto_luku': 'Vorratskarten tauschen',
        'vaihto_otsikko': 'Beispiel für einen Tausch',
        'vaihto': ('Spieler B tauscht seine 4 gegen die 6 und die 2 von '
                   'Spieler A, denn 4 = 6 – 2. Jetzt kann B seine Pizza '
                   'zubereiten. Der Tausch hat auch A geholfen, aber für B hat '
                   'er sich trotzdem gelohnt.'),
        'qr_teksti': 'Regeln und<br>Videos online',
        'osoite': 'https://pizzalove.fi/de/korttipeli.html',
        'videot': 'Mehr Infos und Videos unter',
        'oikeudet': ('Pizza Love® und Merkitysten® sind eingetragene Marken '
                     'der Merkitysten Oy. Alle Rechte vorbehalten.'),
    },
    'en': {
        'tiedosto': 'pizza-love-card-game-rules-en.pdf',
        'alaotsikko': 'Three games with one deck',
        'iskulause': 'EVERY PIZZA COUNTS',
        'bruno_huomio': '*In the 2025 rules: Pizza Bruno.',
        'hyva_tietaa': 'Good to know',
        'kaavio': ('Player A', 'Player B', 'Pizza pile', 'Storage',
                   'Draw pile', 'Exchange pizza'),
        'vaihto_luku': 'Exchanging storage cards',
        'vaihto_otsikko': 'Example of an exchange',
        'vaihto': ('Player B exchanges their 4 for player A’s 6 and 2, because '
                   '4 = 6 – 2. Now B can make their pizza. The exchange helped '
                   'A too, but it was still worth it for B.'),
        'qr_teksti': 'Rules and<br>videos online',
        'osoite': 'https://pizzalove.fi/en/korttipeli.html',
        'videot': 'More information and videos at',
        'oikeudet': ('Pizza Love® and Merkitysten® are registered trademarks '
                     'of Merkitysten Oy. All rights reserved.'),
    },
    # 🔵 Marko 6.11.2026: «Nyt tarvittaisiin slovakian kielinen versio
    # nettisivuista sekä ohjeesta.» Odottaa natiivitarkistusta.
    'sk': {
        'tiedosto': 'pizza-love-kartova-hra-pravidla-sk.pdf',
        'alaotsikko': 'Tri hry s jedným balíčkom',
        'iskulause': 'KAŽDÁ PIZZA SA POČÍTA',
        'bruno_huomio': '*V pravidlách z roku 2025: Pizza Bruno.',
        'hyva_tietaa': 'Dobré vedieť',
        'kaavio': ('Hráč A', 'Hráč B', 'Kôpka pízz', 'Sklad',
                   'Dobierací balíček', 'Výmenná pizza'),
        'vaihto_luku': 'Výmena kariet v sklade',
        'vaihto_otsikko': 'Príklad výmeny',
        'vaihto': ('Hráč B vymení svoju štvorku za šestku a dvojku hráča A, '
                   'pretože 4 = 6 – 2. Teraz môže B pripraviť svoju pizzu. '
                   'Výmena pomohla aj hráčovi A, ale hráčovi B sa aj tak oplatila.'),
        'qr_teksti': 'Pravidlá a<br>videá online',
        'osoite': 'https://pizzalove.fi/sk/korttipeli.html',
        'videot': 'Viac informácií a videá nájdete na',
        'oikeudet': ('Pizza Love® a Merkitysten® sú registrované ochranné '
                     'známky spoločnosti Merkitysten Oy. Všetky práva vyhradené.'),
    },
}


def polut(kieli):
    k = KIELET[kieli]
    return (os.path.join(TANNE, 'sisalto', kieli + '.json'),
            os.path.join(TANNE, k.get('kansio', os.path.join('julkinen', 'pdf')),
                         k['tiedosto']),
            os.path.join(TANNE, '.korttisaannot-%s.html' % kieli))


def e(s):
    return html.escape(str(s), quote=False)


def viiri(iskulause):
    """Pizza Love -viiri pelin omasta lahteesta — EI uutta piirrosta.
    Iskulause kielen omana kuten painetussa arkissa (JOKAINEN PIZZA
    LASKETAAN · VARJE PIZZA RÄKNAS · EVERY PIZZA COUNTS). Kirjasin on
    annettava: pelissa se tulee CSS:sta, paperilla sita ei ole."""
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


def kaavio(k):
    """Pizza Loven (#3) pelipoyta painetun arkin tapaan: kaksi pelaajaa
    vastakkain, kummallakin pizzapino ja 4 varastopaikkaa, keskella
    nostopakka ja vaihtopizza. 🔵 Marko 6.11.2026: «se kaaviokuva siitä
    pizza loven pelipöydästä puuttuu.»

    🔵 Marko 6.11.2026: varastossa NAKYVIA taytekortteja, eri maara
    kummallakin, ja niilla kerrotaan vaihtosaanto: B:n 4 = A:n 6 – 2.
    ⚠️ Pelaajilla on ERI pizzat pinon paalla (sama pizza kahdella ei ole
    pelissa mahdollinen). Pizzat on valittu niin, etta vaihto auttaa
    molempia: A:n pizza-16 = juusto (4), B:n pizza-34 = tomaatti (2) +
    munakoiso (6). Vaihtokortit on reunustettu oranssilla.
    Sanat ovat ARKIN omia (KIELET), koska sivulla kaaviota ei ole.
    Mitat millimetreina (viewBox = mm)."""
    pa, pb, pino, varasto, nosto, vaihto = (e(x) for x in k['kaavio'])
    L, K = 11, 16.7                     # kortti 351 x 532 px
    KANSIO = {'tausta-pizza': 'julkinen/kuvat', 'tausta-tayte': 'julkinen/kuvat',
              'tayte-2': 'julkinen/kuvat'}

    def kortti(x, y, kuva=None, vaihdossa=False):
        if not kuva:
            return ('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx=".88" '
                    'fill="none" stroke="%s" stroke-width=".2" '
                    'stroke-dasharray="1.4 1"/>' % (x, y, L, K, VIIVA))
        polku = '%s/%s.webp' % (KANSIO.get(kuva, 'paperi/kortit'), kuva)
        return ('<image href="%s" x="%.1f" y="%.1f" width="%.1f" height="%.1f"/>'
                '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx=".88" '
                'fill="none" stroke="%s" stroke-width="%s"/>'
                % (polku, x, y, L, K, x, y, L, K,
                   ORANSSI if vaihdossa else VIIVA, '.6' if vaihdossa else '.15'))

    def pakka(x, y, pohja, paallimmainen):
        """Pino: kaksi korttia kuvapuoli alaspain alla, paallimmainen paalla."""
        return (kortti(x + 1.2, y + 1.2, pohja) + kortti(x + .6, y + .6, pohja)
                + kortti(x, y, paallimmainen))

    def teksti(x, y, sana, ankkuri='middle'):
        return ('<text x="%.1f" y="%.1f" text-anchor="%s">%s</text>'
                % (x, y, ankkuri, sana))

    def rivit(x, cy, sana):
        """Nimi kortin viereen pystysuunnassa keskitettyna (cy = kortin
        keskikohta); pitka nimi kahdelle riville."""
        osat = sana.split(' ', 1) if len(sana) > 12 else [sana]
        eka = cy - (len(osat) - 1) * 3.6 / 2 + 1.2
        return ''.join(teksti(x, eka + i * 3.6, o, 'start')
                       for i, o in enumerate(osat))

    def laatta(y, sana):
        return ('<rect x="27" y="%.1f" width="34" height="5.6" rx="1" fill="#1A1A1A"/>'
                '<text x="44" y="%.1f" text-anchor="middle" fill="#fff">%s</text>'
                % (y, y + 4.1, sana))

    def keski(x0, maara):
        """Varastopaikkojen (L + 4 mm valein) keskikohta nimea varten."""
        return x0 + (maara * L + (maara - 1) * 4) / 2

    # 🔵 Marko 6.11.2026: ilmaa pelaajan nimen ja korttien valiin (ILMA)
    # seka pelaajien alueiden ja keskialueen valiin (VALI), jotta erottuu
    # mika on poydan keskella ja mika pelaajien omaa.
    ILMA, VALI = 2.2, 5.0
    A, KESKI, B = ILMA, ILMA + VALI, ILMA + 2 * VALI
    v = [laatta(0, pa)]
    # pelaaja A: pino vasemmalla, varasto oikealla (6 ja 2), nimet alla
    v.append('<g transform="translate(0 %.1f)">' % A)
    v.append(pakka(2, 8, 'tausta-pizza', 'pizza-16'))
    v.append(kortti(22, 8, 'tayte-6', True))
    v.append(kortti(37, 8, 'tayte-2', True))
    v += [kortti(52 + i * 15, 8) for i in range(2)]
    v.append(teksti(2 + L / 2, 30, pino))
    v.append(teksti(keski(22, 4), 30, varasto))
    v.append('</g>')
    # keskella nostopakka ja vaihtopizza, nimet kortin keskikohdalla
    v.append('<g transform="translate(0 %.1f)">' % KESKI)
    v.append(pakka(5, 34.5, 'tausta-tayte', 'tausta-tayte'))
    v.append(rivit(20, 34.5 + K / 2, nosto))
    v.append(kortti(48, 34.5, 'pizza-38'))
    v.append(rivit(62, 34.5 + K / 2, vaihto))
    v.append('</g>')
    # pelaaja B peilikuvana: varasto vasemmalla (4), pino oikealla, nimet ylla
    v.append('<g transform="translate(0 %.1f)">' % B)
    v.append(teksti(keski(3, 4), 59.5, varasto))
    v.append(teksti(74 + L / 2, 59.5, pino))
    v.append(kortti(3, 61.5, 'tayte-4', True))
    v += [kortti(18 + i * 15, 61.5) for i in range(3)]
    v.append(pakka(74, 61.5, 'tausta-pizza', 'pizza-34'))
    v.append('</g>')
    v.append(laatta(82.2 + B + ILMA, pb))
    korkeus = 88 + B + ILMA
    return ('<figure class="kaavio"><svg viewBox="0 0 88 %.1f" '
            'font-family="Otsikko, sans-serif" font-weight="700" '
            'font-size="3.4" letter-spacing=".08" style="text-transform:uppercase">'
            '%s</svg></figure>' % (korkeus, ''.join(v)))


def vaihtoesimerkki(k):
    '''🔵 Marko 6.11.2026: vaihto omana otsikoituna osionaan vaihtosaannon
    perassa, ei poytakuvan osana. Kuvateksti kertoo ensin OMAN hyodyn;
    se, etta vaihto auttaa myos vastustajaa, on taktinen huomio
    («kannatti silti»), ei vaihdon tarkoitus.'''
    return ('<div class="vaihtoesim"><h3>%s</h3>'
            '<div class="esimerkki vaihto" role="img" aria-label="4 = 6 – 2">'
            '<img src="paperi/kortit/tayte-4.webp"><b>=</b>'
            '<img src="paperi/kortit/tayte-6.webp"><b>–</b>'
            '<img src="julkinen/kuvat/tayte-2.webp"></div><p>%s</p></div>'
            % (e(k['vaihto_otsikko']), e(k['vaihto'])))


def kotisaanto(x, siirretty=''):
    """🔵 Marko 6.11.2026: kodit ovat laskeneet pisteiksi korttien arvoja –
    se on kotisaanto, ei virallinen saanto, joten se on oma laatikkonsa
    pelimuodon laatikon ALLA, ei sen sisalla (kuten «Bruno vai Basso?»).
    Kuvana rakastunut pizzalaatikko sydamineen.
    🔵 Marko 6.11.2026: myos «Valinnaiset saannot» tahan laatikkoon, jotta
    pelimuodon palstat lyhenevat. Sivulla ne pysyvat paikallaan; arkilla
    siirrettava luku nimetaan kentalla `siirra`.
    sisalto/xx.json → korttipeli.muodot[i].kotisaanto."""
    if not x:
        return ''
    # 🔵 Marko 6.11.2026: «kotisaannot» ja «valinnaiset saannot» tarkoittavat
    # melkein samaa, joten laatikolla on YKSI paaotsikko (Valinnaiset
    # saannot) ja alla kaksi vaihtoehtoryhmaa: pisteet | laskutoimitukset.
    osat = '<div>%s</div>' % x['html']
    if siirretty:
        # sivun oma otsikko ja johdanto korvautuvat arkin johdannolla
        siirretty = re.sub(r'^<h3>[^<]*</h3><p>[^<]*</p>', '', siirretty)
        osat += '<div>%s%s</div>' % (x.get('siirra_alku', ''), siirretty)
    return ('<div class="huomio tieto kehys koti">'
            '<img src="julkinen/play/kuvat/halaus.webp">'
            '<div class="koti-osat"><h3>%s</h3>%s</div></div>'
            % (e(x['otsikko']), osat))


def irrota_luku(html, otsikko):
    """Leikkaa <h3>otsikko</h3> ja sen sisallon seuraavaan <h3>:hon asti."""
    m = re.search(r'<h3>%s</h3>.*?(?=<h3>|$)' % re.escape(otsikko), html, re.S)
    if not m:
        raise SystemExit('Lukua %r ei loytynyt siirrettavaksi' % otsikko)
    return html[:m.start()] + html[m.end():], m.group(0)


def muoto(m, k):
    """Pelimuodon otsikko painetun arkin tapaan: musta viiri, jossa
    «#1 PIZZA» oranssina ja loppu valkoisena (PIZZAPARTY, PIZZABASSO).
    🔵 Marko 6.11.2026: viiri on KORKEINTAAN ensimmaisen palstan levyinen
    (koko leveydelta venytetty oli liian levea); kuvaus viirin viereen."""
    sanat = m['nimi'].split(' ', 1)
    loppu = sanat[1] if len(sanat) > 1 else ''
    runko = m['html']
    koti = m.get('kotisaanto')
    siirretty = ''
    if koti and koti.get('siirra'):
        runko, siirretty = irrota_luku(runko, koti['siirra'])
    if m['numero'] == '#3':
        # kaavio heti varaston selityksen jalkeen, kuten painetussa arkissa
        i = runko.find('</p>', runko.find('<h3>', runko.find('</ol>'))) + 4
        runko = runko[:i] + kaavio(k) + runko[i:]
        # esimerkki vaihtoluvun loppuun eli ennen seuraavaa otsikkoa
        # 🔵 Marko 6.11.2026: kolmas palsta alkaa vaihtoluvulla
        runko = runko.replace('<h3>%s</h3>' % k['vaihto_luku'],
                              '<h3 class="palstan-alku">%s</h3>' % k['vaihto_luku'])
        j = runko.index('<h3 class="palstan-alku">')
        j = runko.find('<h3>', j + 4)
        j = len(runko) if j < 0 else j
        runko = runko[:j] + vaihtoesimerkki(k) + runko[j:]
    # 🔵 Marko 6.11.2026: palstan alussa oleva «Vanhemmissa ohjeissa: Pizza
    # Bruno» rivitti otsikot eri tasoille. Arkilla se on pieni lisähuomio
    # otsikkorivin oikeassa reunassa, viitattuna tahdella viirista.
    tahti, huomio = '', ''
    pieni = re.match(r'<p class="pieni">[^<]*Bruno[^<]*</p>', runko)
    if pieni:
        runko = runko[pieni.end():]
        tahti = '<span class="tahti">*</span>'
        huomio = '<p class="lisahuomio">%s</p>' % e(k['bruno_huomio'])
    uusi = ' uusi-sivu' if m['numero'] == '#1' else ''
    return ('<section class="muoto kehys%s"><div class="muoto-yla">'
            '<h2 class="banneri"><span class="oranssi">%s %s</span>%s%s</h2>'
            '<p class="kuvaus">%s</p>%s</div>'
            '<div class="palstat">%s</div></section>%s'
            % (uusi, e(m['numero']), e(sanat[0]), e(loppu), tahti, e(m['kuvaus']),
               huomio, runko, kotisaanto(koti, siirretty)))


# ⚠️ KIRJASIMET OVAT REPOSSA (paperi/fontit, ei julkaista), EI KONEELLA. Painettu arkki on tehty
# InDesignilla (DIN Condensed, VAG Rounded, Adobe Clean); niita ei voi jakaa,
# joten tilalla ovat lahimmat OFL-vastineet. Koneen kirjasimiin ei nojata,
# koska slovakin č ľ ť ň puuttuvat sivuston omista osajoukoista (mitattu
# 6.11.2026: poppins-*.woff2 ja d-din-condensed-700.woff2) ja Chrome
# paikkaisi ne kirjain kerrallaan eri kirjasimella.
#  · otsikot: D-DIN Condensed (pelin oma) + Barlow Condensed niille
#    kirjaimille joita D-DIN-osajoukossa ei ole
#  · viirit: Nunito Black (VAG Roundedin tilalle)
#  · leipateksti: Source Sans 3 (Adobe Cleanin tilalle)
LATIN = ('U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, '
         'U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, '
         'U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD')
LATIN_EXT = ('U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, '
             'U+02DD-02FF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, '
             'U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF')
# D-DIN-osajoukossa on Latin-1 + š ž Œ Ÿ, ei muuta (luettu cmapista).
DDIN = ('U+0000-00FF, U+0152-0153, U+0160-0161, U+0178, U+017D-017E, '
        'U+2000-206F, U+20AC, U+2122')
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


def lasku(lauseke):
    """«5 = 4 + 1» korteiksi: ensimmainen luku on pizza (tomaatti-ananas,
    arvo 5), loput taytekortteja, merkit oransseina."""
    osat = lauseke.split()
    if osat[0] != '5':
        raise SystemExit('Esimerkkipizza on arvoltaan 5: %r' % lauseke)
    html = ['<img src="julkinen/kuvat/pizza-31.webp">']
    for o in osat[1:]:
        if o.isdigit():
            html.append('<img src="paperi/kortit/tayte-%s.webp">' % o)
        else:
            html.append('<b>%s</b>' % {'-': '–'}.get(o, o))
    return ('<div class="esimerkki lasku" role="img" aria-label="%s">%s</div>'
            % (e(lauseke), ''.join(html)))


def pelit_rivi(pelit):
    """Pelin nimi ei katkea kesken («#2 / PIZZA BASSO», mitattu saksassa
    6.11.2026): rivi saa katketa vain ennen sulkeita tai pisteen jalkeen."""
    osat = [e(o).replace(' ', '\u00a0').replace('\u00a0(', ' (')
            for o in pelit.split(' · ')]
    return ' · '.join(osat)


def porras(x):
    """🔵 Marko 6.11.2026: kolme selkeaa porrasta. 1) maaralla tai
    taytteilla ei valia, kunhan arvo tasmaa (myos yksi kortti kay),
    2) pizzan taytteiden maara ratkaisee eri taytteiden maaran, mutta
    taytteiden ei tarvitse olla pizzan omia, 3) Pizza Love: juuri oikeat
    taytteet. Teksti: sisalto/xx.json → korttipeli.portaat."""
    return ('<div class="porras"><h3 class="palkki">%s</h3>'
            '<p class="pelit">%s</p>%s%s</div>'
            % (e(x['otsikko']), pelit_rivi(x['pelit']), x['html'],
               ''.join(lasku(l) for l in x['esimerkit'])))


# 🔵 Marko 6.11.2026: «Hyvä tietää» kiteytetysti – Bruno 2025 painetuissa
# ohjeissa ja videoissa, ja Basson tapa puhuu taytteista eika taytekorteista.
# Teksti: sisalto/xx.json → korttipeli.tieto (arkin oma; sivun huomio_bruno
# ja basso_tapa ennallaan).


def ingressi_ilman_toistoa(s, k):
    """🔵 Marko 6.11.2026: otsikkoalueella oli turhaa toistoa kolmesta
    pelista. Alaotsikko kertoo «kolme pelia samalla pakalla», joten
    sivun ingressista jatetaan sama ensimmainen virke pois."""
    ekat = s['ingressi'].split('. ', 1)
    if len(ekat) == 2 and ekat[0].rstrip('.') == k['alaotsikko'].rstrip('.'):
        return ekat[1]
    return s['ingressi']


def tieto_jaettu(s):
    """«<b>Bruno vai Basso?</b> teksti» → (otsikko, teksti). 🔵 Marko
    6.11.2026: laskutoimitukset ja Bruno vai Basso samaan laatikkoon omiin
    palstoihinsa, kumpikin omalla otsikollaan; «Hyva tietaa» pois."""
    m = re.match(r'<b>([^<]*)</b>\s*(.*)$', s['tieto'], re.S)
    return (m.group(1), m.group(2)) if m else ('', s['tieto'])


def sivu_html(kieli, lahde):
    """🔵 Marko 6.11.2026: «Haluaisin vähän täsmentää sitä paperi pdf:ää,
    että se olisi enemmän Pizza Love brändin mukainen. Tässä alkuperäinen
    pdf, jossa näet miten musta, oranssi ja valkoinen toimii keskenään.»

    Painetun arkin kieli: ohuet mustat kehykset, oranssit tiivistetyt
    isot otsikot, mustat palkit valkoisella tekstillä, mustat pelimuotoviirit.
    ⚠️ Oranssilla pohjalla teksti on aina valkoinen; tassa arkissa oranssi
    on vain tekstin vari, ei pohja. Pyoristetyt suorakaiteet, ei kapseleita."""
    k = KIELET[kieli]
    s = json.load(open(lahde, encoding='utf-8'))['korttipeli']
    qr = qr_svg(k['osoite'])
    tiedot = ''.join('<li>%s</li>' % e(x) for x in s['tiedot'])
    runko = '''<!doctype html>
<html lang="{kieli}"><meta charset="utf-8"><title>{title}</title>
<style>
{kirjasimet}
  @page {{ size: A4; margin: 6mm 7mm 5mm }}
  * {{ box-sizing: border-box; margin: 0; padding: 0 }}
  body {{ font-family: Teksti, 'Helvetica Neue', Arial, sans-serif;
          color: {musta}; background: #fff;
          font-size: 9pt; line-height: 1.4;
          -webkit-print-color-adjust: exact; print-color-adjust: exact }}
  b {{ font-weight: 700 }}
  .kehys {{ border: .35mm solid {musta}; -webkit-box-decoration-break: clone;
            box-decoration-break: clone }}
  .viiri svg, .qr svg {{ width: 100%; height: auto; display: block }}

  header {{ display: flex; align-items: flex-start; gap: 4.5mm;
            padding: 0 3.5mm 3mm 3mm }}
  .viiri {{ width: 31mm; flex: none }}
  .otsikko {{ flex: 1; padding-top: 3.2mm }}
  h1 {{ font: 700 22pt/1 Otsikko, sans-serif; text-transform: uppercase;
        color: {oranssi}; letter-spacing: .005em }}
  .ala {{ font-weight: 700; font-size: 9.4pt; margin-top: 1.2mm }}
  .ingressi {{ font-size: 9pt; margin-top: 1.4mm }}
  .tiedot {{ list-style: none; display: flex; flex-wrap: wrap; gap: 1.8mm;
             margin-top: 2.2mm }}
  /* 🔵 Marko 6.11.2026: teksti keskelle ja väljemmin. Pehmusteet on
     mitattu versaalien mukaan (400 dpi), ei rivilaatikon. */
  .tiedot li {{ background: {musta}; color: #fff; border-radius: 1.2mm;
                padding: 1.3mm 3mm 1.1mm; font: 700 9pt/1 Otsikko, sans-serif;
                text-transform: uppercase; letter-spacing: .02em }}
  .qr {{ flex: none; width: {qrmm}mm; text-align: center; padding-top: 3.2mm }}
  .qr span {{ display: block; margin-top: .8mm; font: 700 7pt/1.15 Otsikko,
              sans-serif; text-transform: uppercase; letter-spacing: .02em }}

  .perusteet {{ margin-top: 3mm; padding: 3.4mm 5mm 2.4mm }}
  h2 {{ font: 700 17pt/1 Otsikko, sans-serif; text-transform: uppercase;
        color: {oranssi}; margin-bottom: 2mm; break-after: avoid }}
  h3 {{ font: 700 10pt/1.1 Otsikko, sans-serif; text-transform: uppercase;
        letter-spacing: .015em; margin: 3.4mm 0 1mm; break-after: avoid }}
  h3.osa {{ font-size: 13pt; color: {oranssi}; margin: 5mm 0 0 }}
  .palkki {{ background: {musta}; color: #fff; margin: 3mm 0 1.6mm;
             padding: 1.1mm 2.2mm .8mm }}
  p {{ margin-bottom: 1.5mm }}
  .palstat > h3:first-child, .palstat > p:first-child + h3 {{ margin-top: 0 }}
  .palstat {{ columns: 3; column-gap: {vali}mm }}
  /* 🔵 Marko 6.11.2026: palsta kapeaksi kuten painetussa arkissa (n. 54 mm),
     kolme rinnakkain. Perusteet kolmena kiinteana palstana: kortit ·
     perussaanto ja esimerkki · kaksi tapaa (CSS-palstat repisivat esimerkin). */
  .kaksi {{ display: grid; grid-template-columns: 1fr 1fr 1fr; column-gap: {vali}mm }}
  .kaksi h3.osa {{ margin-top: 0 }}
  /* perusteissa tekstipalsta (perussaanto + pizzan arvo) levein */
  .perusteet .kaksi {{ grid-template-columns: .88fr .88fr 1.24fr }}
  .kaksi > div > .palkki:first-child {{ margin-top: 0 }}
  .johdanto {{ font-size: 9.8pt; margin-bottom: 3mm }}
  .rivi {{ display: flex; gap: 2mm; margin: 0 0 2mm }}
  .rivi img {{ width: 13mm; height: auto; border: .15mm solid {viiva};
               border-radius: 8% / 5.3% }}
  .portaat {{ margin-top: 3mm; padding: 3.4mm 5mm 3mm }}
  .pelit {{ font: 700 9pt/1.2 Otsikko, sans-serif; text-transform: uppercase;
            letter-spacing: .02em; color: {oranssi}; margin-bottom: 1.6mm }}
  .lasku {{ gap: 1mm; margin: 2.4mm 0 0 }}
  .lasku img {{ flex: 0 1 9.2mm; min-width: 0; width: 9.2mm }}
  .lasku b {{ font-size: 12pt }}
  .uusi-sivu {{ break-before: page; margin-top: 0 }}
  .huomio.koti {{ break-before: avoid; break-inside: avoid; margin-top: 2.4mm;
                  padding: 2mm 5mm 2mm 4mm; gap: 4mm }}
  .huomio.koti img {{ width: 16mm; margin: 0; align-self: center }}
  .koti-osat {{ flex: 1; display: grid; grid-template-columns: 1fr 1fr; column-gap: {vali}mm }}
  .koti-osat h3 {{ grid-column: 1 / -1; margin: 0 0 .6mm }}
  /* 🔵 Marko 6.11.2026: vaihtoehdon nimi omalle rivilleen ja selitys
     kokonaan omalle rivilleen (ei katkea kahteen) */
  .koti-osat li > b:first-child {{ display: block }}
  .koti p {{ margin-bottom: .8mm }}
  .koti ul.lista {{ margin-bottom: 0; font-size: 8.8pt }}
  /* luettelon johdanto ei jaa eri palstaan kuin luettelo (pisteet, 6.11.2026) */
  .palstat p:has(+ ul.lista), .palstat p:has(+ ol.lista) {{ break-after: avoid }}
  .kotisaanto p {{ margin: 0 }}
  /* 🔵 Marko 6.11.2026: «kaikki laskutoimitukset kayvat» on tarkeampi kuin
     apinan nimi, joten se on oma laatikkonsa ensimmaisena Hyva tietaa
     -laatikon vieressa (Pizzan arvo -kappale pysyy lyhyena). */
  /* yksi alalaatikko: Basso-kuva (mietti laskutoimituksia, Marko) |
     laskutoimitukset | Bruno vai Basso */
  .huomio.alalaatikko {{ gap: {vali}mm; align-items: flex-start }}
  .alalaatikko .osa {{ flex: 1 }}
  /* 🔵 Marko 6.11.2026: Basson ajatuskuplassa laskutoimitusten symbolit –
     kuva kertoo saman kuin pitka teksti, joten paperin teksti on lyhyt
     (korttipeli.laskut.paperi). Kupla oikein pain (paperi/kortit, reunan
     irtoviiva poistettu), pikkupallot nousevat kohti Basson paata. */
  /* 🔵 Marko 6.11.2026: enemman tilaa reunojen ja tekstien valiin */
  .huomio.tieto.alalaatikko {{ padding: 3.2mm 6mm 2.6mm 3mm }}
  /* 🔵 Marko 6.11.2026 (oma luonnos): iso Basso vasemmalla, iso kupla
     oikealla, pikkupallot niiden valissa; hanta nousee laatikon alareunan
     takaa kuplan alle ja kiemurtelee laatikon alapuolelle. */
  .ajattelee {{ flex: none; position: relative; width: 74mm; align-self: stretch;
                min-height: 36mm }}
  .alalaatikko .ajattelee img.basso {{ position: absolute; left: 0;
      bottom: calc(-2.6mm - 37mm * .1536); width: 37mm; margin: 0 }}
  .alalaatikko .ajattelee img.hanta {{ position: absolute; left: 34mm;
      bottom: calc(-2.6mm - 4.6mm); width: 34mm; margin: 0;
      clip-path: polygon(0 0, 100% 0, 100% 100%, 60% 100%, 60% {hanta_raja}%, 0 {hanta_raja}%) }}
  .kupla {{ position: absolute; left: 29mm; bottom: 3mm; width: 44mm }}
  .alalaatikko .kupla > img {{ width: 100%; margin: 0; display: block }}
  /* symbolit kuplan sisapuolen keskelle: kuplan runko on kuvassa
     x 18,9–98,9 %, y 11–99,7 % → keskipiste (58,9 %, 55,3 %) */
  .merkit {{ position: absolute; left: 29%; right: 11.2%; top: 22%; bottom: 17%;
             display: grid; grid-template-columns: repeat(4, 1fr);
             align-content: space-evenly; align-items: center; justify-items: center;
             font: 900 15pt/1 Viiri, sans-serif; color: {musta} }}
  .merkit span:nth-child(n+5) {{ font: 700 12pt/1 Otsikko, sans-serif }}
  .merkit sup {{ font-size: .6em }}
  .alalaatikko h3 {{ margin: 0 0 .6mm }}
  .alalaatikko p {{ font-size: 8.6pt; margin: 0 }}
  .alalaatikko h3.bruno {{ margin-top: 1.8mm }}
  .alalaatikko .tekstit p {{ font-size: 8.6pt }}
  .alalaatikko .osa p {{ line-height: 1.32 }}
  .laskulista {{ list-style: none; display: grid; grid-template-columns: repeat(4, auto);
                 justify-content: start; column-gap: 7mm; row-gap: .2mm;
                 margin: .8mm 0; font-weight: 700; font-size: 8.2pt; line-height: 1.3 }}
  .alalaatikko p.konstit {{ font-size: 8.2pt }}
  .tieto {{ margin-top: 3mm; padding: 2.4mm 5mm 1.4mm 4mm; align-items: center }}
  .tieto h3 {{ margin: 0 0 .6mm }}
  .tieto p {{ font-size: 8.8pt }}
  .palstat > *, .kortti {{ break-inside: avoid }}
  /* 🔵 Marko 6.11.2026: palstat taittuvat tasapainoisesti – pitkat luettelot
     saavat jatkua seuraavaan palstaan, mutta ei kesken luettelokohdan;
     kappaleet pysyvat ehjina. */
  .palstat > ul.lista, .palstat > ol.lista {{ break-inside: auto }}
  .palstat li {{ break-inside: avoid }}
  .palstat > .laatikko {{ break-inside: auto }}
  .laatikko > p, .esimerkki {{ break-inside: avoid }}
  ul.lista, ol.lista {{ margin: 0 0 1.1mm 4.2mm }}
  ul.lista li, ol.lista li {{ margin-bottom: .5mm }}
  .pieni {{ font-size: 7.4pt; opacity: .75 }}
  .kortti {{ display: flex; gap: 2.6mm; align-items: flex-start;
             margin-bottom: 1.8mm }}
  .kortti img {{ width: 15mm; height: auto; flex: none }}
  /* 🔵 Marko 6.11.2026: korteilla on ohut hiusviiva, jotta kortin valkoinen
     reunus erottuu valkoisesta paperista (kuten painetussa arkissa).
     Kulmapyoristys on kortin oma: 28 px / 351 x 532 px. */
  .kortti img, .esimerkki img {{ border: .15mm solid {viiva};
                                 border-radius: 8% / 5.3% }}
  .kortti h3 {{ margin-top: 0 }}
  .laatikko {{ margin-bottom: 1.4mm }}
  .esimerkki {{ display: flex; align-items: center; gap: 1.6mm;
                margin: 2mm 0 }}
  .esimerkki img {{ width: 14mm; height: auto }}
  /* 🔵 Marko 6.11.2026: laskumerkit mustina – erottuvat valkoisella
     vahvemmin, myos mustavalkotulosteessa */
  .esimerkki b {{ font: 900 15pt/1 Viiri, sans-serif; color: {musta} }}
  .huomio {{ display: flex; gap: 2.4mm; align-items: center;
             border: .35mm solid {musta}; padding: 1.4mm 2.6mm 1.4mm 2.2mm }}
  .huomio img {{ width: 17mm; height: auto; flex: none; align-self: flex-end;
                 margin-bottom: calc(-1.4mm - 17mm * .1536) }}
  /* rajattu Basso: vartalon leikkaus huomion alareunaan, kyynärpää (15,36 % leveydestä)
     jää sen alapuolelle (Marko 3.11.2026) */
  .huomio p {{ margin: 0 }}

  .muoto {{ margin-top: 5mm; padding: 0 5mm 2.4mm }}
  /* pelimuoto alkaa ja loppuu samalla sivulla, jos se mahtuu sivulle:
     palstat eivat jatku siististi sivulta toiselle (mitattu 6.11.2026) */
  .muoto {{ break-inside: avoid }}
  .muoto-yla {{ display: flex; align-items: center; gap: {vali}mm; margin-bottom: 3mm;
                break-after: avoid }}
  .banneri {{ flex: 0 0 calc((100% - 2 * {vali}mm) / 3); background: {musta}; color: #fff;
              text-align: center; padding: 1.8mm 0 4mm;
              font: 900 14pt/1 Viiri, sans-serif; letter-spacing: .01em;
              clip-path: polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%) }}
  .banneri .oranssi {{ color: {oranssi} }}
  .banneri .tahti {{ font-size: .7em; vertical-align: .45em; margin-left: .3mm }}
  .lisahuomio {{ flex: none; align-self: flex-start; margin: 1.6mm 0 0;
                 font-size: 7.6pt; opacity: .75 }}
  .muoto .kuvaus {{ flex: 1; font-weight: 700; font-size: 9pt; margin: 0 }}
  .kaavio {{ break-inside: avoid; margin: 3mm 0 2mm }}
  .kaavio svg {{ width: 100%; height: auto; display: block }}
  .vaihtoesim {{ break-inside: avoid }}
  h3.palstan-alku {{ break-before: column; margin-top: 0 }}
  .vaihtoesim .vaihto {{ justify-content: center; margin: 1.6mm 0 1.4mm }}
  .vaihtoesim .vaihto img {{ width: 11mm; border-color: {oranssi}; border-width: .4mm }}

  footer {{ margin-top: 2.6mm; padding-top: 1.4mm;
            border-top: .35mm solid {musta}; font-size: 7pt;
            display: flex; flex-direction: column; gap: .6mm }}
  /* 🔵 Marko 6.11.2026: ©-teksti yhdella rivilla; Pizza Love® mukana */
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
  <div class="qr">{qr}<span>{qr_teksti}</span></div>
</header>

<section class="perusteet kehys">
<h2>{perusteet_otsikko}</h2>
<p class="johdanto">{perusteet_ingressi}</p>
<div class="kaksi">
 <div>
  <h3 class="palkki">{pizzakortit_otsikko}</h3>
  <div class="rivi"><img src="julkinen/kuvat/tausta-pizza.webp"><img
    src="julkinen/kuvat/pizza-31.webp"><img src="paperi/kortit/pizza-22.webp"></div>
  <p>{pizzakortit}</p>
 </div>
 <div>
  <h3 class="palkki">{taytekortit_otsikko}</h3>
  <div class="rivi"><img src="julkinen/kuvat/tausta-tayte.webp"><img
    src="paperi/kortit/tayte-8.webp"><img src="julkinen/kuvat/tayte-x.webp"></div>
  <p>{taytekortit}</p>
 </div>
 <div>
  <h3 class="palkki">{perussaanto_otsikko}</h3><p>{perussaanto}</p>
  <h3>{arvo_otsikko}</h3><p>{arvo}</p>
 </div>
</div>
</section>

<section class="portaat kehys">
<h2>{portaat_otsikko}</h2>
<p class="johdanto">{portaat_ingressi}</p>
<div class="kaksi">{portaat}</div>
</section>

<div class="huomio tieto kehys alalaatikko">
  <div class="ajattelee"><div class="kupla"><img src="paperi/kortit/ajatuskupla.webp">
      <div class="merkit" aria-label="+ − · : xⁿ √ log n!"><span>+</span><span>−</span><span>·</span><span>:</span><span>x<sup>n</sup></span><span>√</span><span>log</span><span>n!</span></div></div>
    <img class="hanta" src="paperi/kortit/hanta.webp"><img class="basso" src="julkinen/kuvat/basso-pohtii.webp"></div>
  <div class="osa tekstit"><h3>{laskut_otsikko}</h3>{laskut}
    <h3 class="bruno">{tieto_otsikko}</h3><p>{tieto}</p></div>
</div>

{muodot}

<footer>
  <span>{videot} <b>{nakyva}</b></span>
  <span class="oikeudet">{oikeudet} © Merkitysten Oy 2026</span>
</footer>
</html>'''
    return runko.format(
        kieli=kieli, vali=PALSTAVALI,
        hanta_raja=round(100 * (34 * 374 / 1030 - 4.6) / (34 * 374 / 1030), 1), viiva=VIIVA, musta=MUSTA, oranssi=ORANSSI, kirjasimet=KIRJASIMET,
        viiri=viiri(k['iskulause']), qr=qr,
        qrmm=QR_MM, qr_teksti=k['qr_teksti'], title=e(s['title']),
        h1=e(s['h1']), alaotsikko=e(k['alaotsikko']), ingressi=e(ingressi_ilman_toistoa(s, k)),
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
        tieto_otsikko=tieto_jaettu(s)[0], tieto=tieto_jaettu(s)[1],
        laskut_otsikko=e(s['laskut']['otsikko']),
        laskut=s['laskut'].get('paperi', s['laskut']['html']),
        portaat_otsikko=e(s['portaat_otsikko']),
        portaat_ingressi=e(s['portaat_ingressi']),
        portaat=''.join(porras(x) for x in s['portaat']),
        muodot=''.join(muoto(m, k) for m in s['muodot']),
        videot=e(k['videot']), nakyva=k['osoite'].replace('https://', ''),
        oikeudet=e(k['oikeudet']))


def otsikot(lahde):
    """Jokainen luku jonka ON oltava arkilla — luettu LAHTEESTA eika kasin
    kirjoitetusta listasta, joka vanhenisi juuri siita luvusta jota varten
    koe on."""
    s = json.load(open(lahde, encoding='utf-8'))['korttipeli']
    # Sivun «kaksi tapaa» + esimerkki korvautuvat arkilla kolmella portaalla
    # (Marko 6.11.2026), joten ne eivat ole arkilla.
    nimet = [s[a] for a in s if a.endswith('_otsikko') and a not in
             ('videot_otsikko', 'pelaa_otsikko', 'ristiin_otsikko',
              'lataa_otsikko', 'muodot_otsikko', 'tavat_otsikko',
              'helpompi_otsikko', 'basso_tapa_otsikko', 'esimerkki_otsikko')]
    nimet += [x['otsikko'] for x in s['portaat']]
    nimet.append(s['laskut']['otsikko'])
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
    os.makedirs(os.path.dirname(kohde), exist_ok=True)
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
