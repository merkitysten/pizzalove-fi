# -*- coding: utf-8 -*-
"""Korttipelin saannot koteloon taiteltavana A4-arkkina, kieli kerrallaan.

🔵 Marko 15.11.2026 (toimeksianto): «Tee korttipelin säännöistä uusi
tulostusmuoto: koteloon taiteltava A4-arkki, suomi ensin. Tämä on eri asia
kuin nykyinen korttisaannot.py:n tuottama 3-sivuinen A4-PDF — se jää verkkoon
jaettavaksi, tämä menee laatikkoon.»

🔵 Marko 15.11.2026 (myöhemmin): «Eikös se verkon pdf:kin pitäisi olla tämä
sama kuin koteloarkkikin, jotta asiakas voisi sen halutessaan tulostaa
itselleen.» -> Koteloarkki korvaa vanhan 3-sivuisen verkko-PDF:n. Tulos
kirjoitetaan julkinen/pdf/:iin verkko-PDF:n nimellä (ks. verkkopolku).

MITAT JA TAITTO (Markon toimeksianto)
  * A4 210 x 297, kaksipuoleinen, TASAN 2 sivua. Kolmas sivu on virhe.
  * Ensin pituussuunnassa haitariksi neljaan (297 -> 74,25), sitten kerran
    poikki (210 -> 105). Taiteltu koko 105 x 74,25 mm, mahtuu koteloon
    120 x 90 x 22 mm (A5 ja A6 eivat mahdu).
  * Ruudukko 2 x 4 ruutua per puoli, 16 ruutua.
  * Tiheys painetun arkin mukaan: leipatekstin korkeus 2,479 mm = 7,0 pt.
    Laskettu tila: yksi kieli 103 782 mm2, A4 kaksipuoleisena 124 740 mm2.

KUMPI RUUTU ON KANSI — PAATELTY TAITOSTA, EI ARVATTU
  Haitarissa ylin kaista R1 jaa paalle etupuoli ylospain ja alin R4
  etupuoli alaspain. Poikkitaitossa (oikea puolisko alle) ulkopinnoiksi
  jaavat R1:n vasen ja oikea ruutu. Siis: ETUPUOLEN ylarivi = kansi (1) ja
  takakansi (2), molemmat oikein pain. Lukujarjestys: avattu arkki nayttaa
  ensin etupuolen (ruudut 3–8), sitten kaannetaan (ruudut 9–16).
  Kaksipuolinen tulostus pitkan reunan yli: takapuolen rivit ovat samoilla
  korkeuksilla, sarakkeet peilikuvana — taitosviivat osuvat kohdalleen.

LAHDE: sisalto/{kieli}.json (korttipeli) — sama yksi lahde kuin sivulla ja
korttisaannot.py:n verkko-PDF:ssa. Ei painettua arkkia eika verkko-PDF:aa.
Arkin omat sanat (iskulause, kaavion nimet, vaihtoesimerkki, osoite) tulevat
korttisaannot.KIELET:sta, jotta ne eivat ajaudu erilleen.

TAITTO SELAIMESSA: sisalto on jono atomeja (otsikko, kappale, luettelon kohta,
kuva). Sivun oma skripti pakkaa ne ruutuihin 3..16 jarjestyksessa: atomi joka
ei mahdu, siirtyy seuraavaan ruutuun, ja otsikko (luokka `pida`) seuraa
sisaltoaan. Jos jokin ei mahdu tai ruudut loppuvat, sivulle kirjoitetaan
`YLIVUOTO`, ja koe loytaa sen valmiista PDF:sta.

TAITOSVIIVAT: oletuksena pois (Marko 15.11.2026: «Ota pois ne taittoviivat
tulostettavasta sääntölapusta»). `--luonnos` näyttää ne arviointia varten.

AJO: python3 koteloarkki.py [fi] [--luonnos]
  Macilla Chrome kuten muut generaattorit, muualla Playwright.
"""

import html
import json
import os
import re
import subprocess
import pathlib
import sys
import tempfile

import korttisaannot as ks
import rakenna as rk      # tunnisteiden eristys ja tekstisuunta: yksi lähde sivuston kanssa

TANNE = os.path.dirname(os.path.abspath(__file__))
SIVUJA = 2
# PDF-sivun koko (Marko 15.11.2026: «tulostin ei pysty sitä tulostamaan
# kuitenkaan paperin reunasta reunaan. Se käytännössä skaalaa tulostettavan
# alan 93 %. Pystytkö säätämään sen arkin koon siten, että tulostimen ei
# tarvitse skaalata kuvaa ollenkaan?»). Sivu = 93 % A4:stä (195 x 276 mm),
# eli juuri se ala, johon Markon tulostin A4:n mahtui: tulostin tulostaa sen
# 100 %:na keskelle A4-paperia, eikä mikään pienene. Taitokset tehdään
# paperiin kuten ennenkin; pystytaite osuu keskelle, koska sivu on keskellä.
ARKKI_L, ARKKI_K = 195.0, 276.0     # mm
REUNA = 2.0                         # mm sivun reunasta (tulostimen oma marginaali on jo sivun ulkopuolella)
PALSTAVALI = 9.0                    # mm
PALSTA_L = (ARKKI_L - 2 * REUNA - PALSTAVALI) / 2
LEIPA_PT = 7.0          # painetun arkin leipateksti 2,479 mm
# Kaikki korttisaannot.KIELET:n kielet, myös konekäännökset (sisalto/konekaannos/).
KIELET = {k: {'ylivuoto': 'YLIVUOTO'} for k in ks.KIELET}
# Markon suomen arkkiin 15.11.2026 tekemät karsinnat koskevat kaikkia kieliä.
# Ne tehdään RAKENTEELLISESTI (sama kohta jokaisen kielen sisällössä), ei
# kielikohtaisilla merkkijonoilla:
#  1. Perusteiden otsikko ja ingressi pois («Onko tuo Näin pizza tehdään oikea
#     otsikko? Pitäisikö sekin ottaa kylmästi pois» / «mikä on se sääntö, joka
#     pitää opetella ensin?»).
#  2. Kolme tapaa -ingressi tavallisella painolla, virkkeet omille riveilleen.
#  3. Tavan 2 kappale, jossa on <b>#1 Pizza Party…</b> («Kokeile tätä myös …»),
#     pois: pelirivi kertoo saman («#1 Pizza Party (lisähaaste)»).
#  4. Vaihtoesimerkin toinen virke omalle rivilleen («"Nyt B" alkamaan uudelta
#     riviltä»). Kolmas virke poistettiin 15.11. lähteestä (korttisaannot.KIELET).
#  5. Basson alun <p class="pieni"> … Pizza Bruno pois («vie pelaajan fokusta
#     pois»); asia kerrotaan lopun Bruno vai Basso? -kohdassa.


# Viirien alkuperäinen kirjasin VAG Rounded (Marko toi tiedoston 15.11.2026).
# Maksullinen kirjasin: EI repoon (sivusto on julkinen), vaan reposta
# erilliseen kansioon «Fontit vain tälle koneelle». fsType 14 sallii PDF-
# upotuksen. Jos tiedostoa ei ole, viirit tehdään Nunito Blackilla ja ajo varoittaa.
VAG = os.environ.get('VAG_FONTTI') or os.path.normpath(os.path.join(TANNE, '..', 'Fontit vain tälle koneelle', 'VAGRoundedBT.ttf'))
# GitHub Actionsissa VAG tulee salaisuudesta VAG_FONTTI_B64 (osajoukko, ei repossa).


def viirikirjasin():
    if os.path.exists(VAG):
        # ⚠️ Arabia myös VAG-perheelle. Pelimuotojen viirit (#1 PIZZAPARTY) ovat
        # aina latinaa, mutta perhe asetetaan koko lohkolle: ilman tätä mikä
        # tahansa arabialainen merkki VAG-lohkossa putoaisi laitteen fonttiin.
        return ('@font-face { font-family: VAG; font-weight: 400; src: url("%s"); }'
                '@font-face { font-family: VAG; font-weight: 400;'
                ' src: url(julkinen/fontit/tajawal-700-arabic.woff2); unicode-range: %s; }'
                % (pathlib.Path(VAG).as_uri(), ks.ARAB), '400 14pt/1 VAG')
    print('⚠️  VAG Rounded puuttuu (%s) — viirit Nunito Blackilla' % VAG)
    return '', '900 14pt/1 Viiri'


# 🔵 Marko 16.11.2026: «pitäisikö muuten painetussa pdf:ssä olla ko. maan lippu
# kuvana? Se voisi helpottaa minuakin ohjeiden sujauttelussa» + «Luonnollinen
# paikka lipulle voisi olla esim. tämän ruudun oikea alakulma.» -> Pyöreä lippu
# ja kielikoodi otsakeruudun oikeaan alakulmaan (näkyy taiteltuna päällimmäisenä).
# Liput: julkinen/kuvat/liput/<kielikoodi>.svg (flag-icons, MIT; ks. LUE-MINUT.md).
# Kieli ei ole maa: lippu kertoo kirjoitetun kieliversion maan, koodi kielen.
KOODI_NAKYY = {'nb': 'NO'}


def lippu(kieli):
    polku = os.path.join(TANNE, 'julkinen', 'kuvat', 'liput', kieli + '.svg')
    koodi = KOODI_NAKYY.get(kieli, kieli.upper())
    if not os.path.exists(polku):
        # Ei lippua (esim. perinteinen kiina, es-419): pelkkä kielikoodi
        return '<div class="lippu"><span class="vain-koodi">%s</span></div>' % koodi
    return ('<div class="lippu"><img src="julkinen/kuvat/liput/%s.svg" alt=""><span>%s</span></div>'
            % (kieli, koodi))


def osoite(k):
    '''Painettu osoite ja QR ilman .html-päätettä (Marko 15.11.2026: «Tuo on vähän
    ruma nettiosoite, erityisesti tuo html-loppu»). Sivusto palvelee
    /fi/korttipeli suoraan (tarkistettu selaimella 15.11.2026).'''
    return re.sub(r'\.html$', '', k['osoite'])


def e(s):
    return html.escape(str(s), quote=False)


def tekstisuunta(kieli):
    """Arkin tekstisuunta SAMASTA lähteestä kuin sivuston (rakenna.suunta_tiedoista):
    käännöksen `suunta`, muuten kirjoitusjärjestelmä. Ei omaa kielilistaa — se olisi
    toinen kopio, ja korjaus osuisi vain toiseen."""
    return rk.suunta_tiedoista(json.load(open(ks.lahdepolku(kieli), encoding='utf-8')))


def atomit_html(osa, pida_otsikot=True):
    """HTML-katkelma atomeiksi: luettelot kohdittain (ol jatkaa numerointia),
    otsikot merkitaan `pida`-luokalla (seuraavat sisaltoaan)."""
    ulos = []
    for m in re.finditer(r'<(h3|p|ul|ol)([^>]*)>(.*?)</\1>', osa, re.S):
        tagi, attr, sis = m.groups()
        if tagi in ('ul', 'ol'):
            kohdat = re.findall(r'<li>(.*?)</li>', sis, re.S)
            for n, li in enumerate(kohdat, 1):
                alku = ' start="%d"' % n if tagi == 'ol' else ''
                ulos.append('<%s class="lista"%s><li>%s</li></%s>' % (tagi, alku, li, tagi))
        elif tagi == 'h3':
            ulos.append('<h3 class="pida">%s</h3>' % sis)
        else:
            ulos.append('<p%s>%s</p>' % (attr, sis))
    return ulos


def lasku_pieni(lauseke):
    return ks.lasku(lauseke).replace('class="esimerkki lasku"', 'class="esimerkki lasku pieni-lasku"')


def sisalto(kieli):
    k = ks.KIELET[kieli]
    s = json.load(open(ks.lahdepolku(kieli), encoding='utf-8'))['korttipeli']
    a = []
    # --- perusteet (otsikko ja ingressi karsittu, ks. KIELET-kommentti kohta 1)
    a.append('<div class="korttirivi"><div><h3 class="palkki">%s</h3>'
             '<div class="vierekkain"><div class="rivi"><img src="julkinen/kuvat/tausta-pizza.webp"><img src="julkinen/kuvat/pizza-31.webp">'
             '<img src="paperi/kortit/pizza-22.webp"></div><p>%s</p></div></div></div>'
             % (e(s['pizzakortit_otsikko']), e(s['pizzakortit'])))
    a.append('<div class="korttirivi"><div><h3 class="palkki">%s</h3>'
             '<div class="vierekkain"><div class="rivi"><img src="julkinen/kuvat/tausta-tayte.webp"><img src="paperi/kortit/tayte-8.webp">'
             '<img src="julkinen/kuvat/tayte-x.webp"></div><p>%s</p></div></div></div>'
             % (e(s['taytekortit_otsikko']), e(s['taytekortit'])))
    a.append('<h3 class="palkki pida">%s</h3>' % e(s['perussaanto_otsikko']))
    a.append('<p>%s</p>' % e(s['perussaanto']))
    a.append('<h3 class="pida">%s</h3>' % e(s['arvo_otsikko']))
    a.append('<p>%s</p>' % s['arvo'])
    # --- kolme tapaa valmistaa pizza: etupuolen vasempaan palstaan väljästi
    # (Marko 15.11.2026: «Pizzojen tekeminen on paljon tärkeämpi info»)
    a.append('<h2 class="pida">%s</h2>' % e(s['portaat_otsikko']))
    # Marko 15.11.2026: «kaikki on nyt boldattu» -> tavallinen paino
    a.append('<p class="tapajohdanto">%s</p>' % e(s['portaat_ingressi']).replace('. ', '.<br>', 1))
    # Marko 15.11.2026: «Miltä se näyttää, jos tekstit toisi kuvien viereen
    # omaksi pikkusarakkeekseensa» -> esimerkit vasemmalle päällekkäin,
    # pelirivi ja teksti oikealle omaan sarakkeeseen; jokainen peli omalle rivilleen.
    for x in s['portaat']:
        a.append('<h3 class="palkki pida">%s</h3>' % e(x['otsikko']))
        pelit = ks.pelit_rivi(x['pelit']).replace(' · ', '<br>')
        a.append('<div class="tapa"><div class="laskut">%s</div><div class="tapateksti">'
                 '<p class="pelit">%s</p>%s</div></div>'
                 % (''.join(lasku_pieni(l) for l in x['esimerkit']), pelit,
                    ''.join(p for p in atomit_html(x['html']) if '<b>#1 Pizza Party' not in p)))
    # --- laskutoimitukset ja Bruno vai Basso
    # --- pelimuodot
    for m in s['muodot']:
        sanat = m['nimi'].split(' ', 1)
        # 🔵 Marko 15.11.2026: etupuolen oikeaan palstaan Pizza Party ja sen
        # alle Pizza Basso; Pizza Love takapuolelle kahdelle palstalle.
        # `uusi-palsta` aloittaa uuden palstan (Party ja Love).
        uusi = ' uusi-palsta' if m['numero'] in ('#1', '#3') else ''
        # Marko 15.11.2026: «Saatko muutettua viireissä olevat fontit alkuperäiseksi?»
        # -> kuten painetussa ohjeessa: versaalit, PIZZA ja nimi yhteen (#1 PIZZAPARTY)
        a.append('<h2 class="banneri pida%s"><span class="oranssi">%s %s</span>%s</h2>'
                 % (uusi, e(m['numero']), e(sanat[0]), e(sanat[1] if len(sanat) > 1 else '')))
        a.append('<p class="kuvaus pida">%s</p>' % e(m['kuvaus']))
        runko = re.sub(r'<p class="pieni">[^<]*Bruno[^<]*</p>', '', m['html'])
        koti = m.get('kotisaanto')
        siirretty = ''
        if koti and koti.get('siirra'):
            runko, siirretty = ks.irrota_luku(runko, koti['siirra'])
            siirretty = re.sub(r'^<h3>[^<]*</h3><p>[^<]*</p>', '', siirretty)
        osat = atomit_html(runko)
        if m['numero'] == '#3':
            # kaavio varaston selityksen jalkeen ja vaihtoesimerkki vaihtoluvun
            # loppuun, kuten verkko-PDF:ssa (korttisaannot.muoto)
            # varaston luku = ensimmäinen väliotsikko valmistelujen luettelon jälkeen
            # (sama sääntö kuin korttisaannot.muoto; ruotsissa otsikko «Lagret» ≠ kaavion «Lager»)
            ol = next(n for n, x in enumerate(osat) if x.startswith('<ol'))
            i = next(n for n in range(ol, len(osat)) if osat[n].startswith('<h3'))
            osat.insert(i + 2, ks.kaavio(k))
            # Marko 15.11.2026: «Siirrä aloittaminen oikean puolen palstaan» ->
            # kaavion jälkeinen ensimmäinen väliotsikko aloittaa oikean palstan
            m3 = next(n for n in range(i + 3, len(osat)) if osat[n].startswith('<h3'))
            osat[m3] = osat[m3].replace('class="pida"', 'class="pida uusi-palsta"', 1)
            j = next(n for n, x in enumerate(osat) if k['vaihto_luku'] in x)
            loppu = next((n for n in range(j + 1, len(osat)) if osat[n].startswith('<h3')), len(osat))
            # Marko 15.11.2026: vaihtoesimerkkikin kortit vasemmalle ja selitys oikealle
            # Virkejako on korttisaannot.py:ssä, jotta se on sama kuin käännöksen
            # tarkistuksessa (kaanna.py). 📐 Hindi kaatui tähän 16.11.2026, koska
            # tässä oli oma kopio, joka tunsi vain pisteen ja 。！？ — ei dandaa (।).
            virkkeet = ks.virkkeet(k['vaihto'])
            assert len(virkkeet) == 2, (
                'vaihtoesimerkki: odotettiin 2 virkettä, saatiin %d. Jos kieli ei '
                'käytä virkkeen lopetusmerkkiä lainkaan, sitä ei vielä tueta. %r'
                % (len(virkkeet), k['vaihto']))
            vesim = ks.vaihtoesimerkki(dict(k, vaihto=virkkeet[0] + '\n' + virkkeet[1])).replace('\n', '<br>').replace('</h3><div class="esimerkki vaihto"',
                                                  '</h3><div class="vierekkain"><div class="esimerkki vaihto"', 1)
            assert vesim.endswith('</p></div>')
            osat.insert(loppu, vesim[:-len('</div>')] + '</div></div>')
        a += osat
        if koti:
            a.append('<div class="koti"><h3>%s</h3>%s%s%s</div>'
                     % (e(koti['otsikko']), koti['html'], koti.get('siirra_alku', ''), siirretty))
    # Lisätiedot ohjeen loppuun koko sivun levyisen hiusviivan alle (Marko
    # 15.11.2026: «kaikki laskutoimitukset käyvät -laatikko voisi olla sellainen
    # next-level-tieto, jolle voisi tehdä oman paikkansa aivan ohjeen loppuun»;
    # «tuon bruno vai basso -faktan laittaa sinne toiselle sivulle alas»;
    # «Pizza Loven säännöt loppuu ja sitten on koko sivun leveydeltä hiusviiva.
    # Vasta tämän viivan jälkeen nämä meidän lisäinfot»). Lohko sijoitetaan
    # selaimessa Pizza Loven palstojen alle; vasemmalle laskutoimitukset,
    # oikealle Bruno vai Basso, alle ©.
    # Marko 15.11.2026: «Meillähän oli se miettivä basso-apina aikaisemmin,
    # jonka ajatuskuplassa oli ne laskumerkit» -> sama asettelu kuin verkko-
    # PDF:n alalaatikossa (korttisaannot, Marko 6.11.2026): Basso nojaa
    # viivaan, kupla oikealla, häntä kiemurtelee viivan alle; tekstit viereen.
    otsikko, teksti = ks.tieto_jaettu(s)
    lisat = ('<div class="lisat"><div class="alalaatikko">'
             '<div class="ajattelee"><div class="kupla"><img src="paperi/kortit/ajatuskupla.webp">'
             '<div class="merkit"><span>+</span><span>−</span><span>·</span><span>:</span>'
             '<span>x<sup>n</sup></span><span>√</span><span>log</span><span>n!</span></div></div>'
             '<img class="hanta" src="paperi/kortit/hanta.webp"><img class="basso" src="julkinen/kuvat/basso-pohtii.webp"></div>'
             '<div class="tekstit"><h3>%s</h3>%s<h3 class="bruno">%s</h3><p>%s</p></div></div>'
             '<p class="oikeudet">%s%s © Merkitysten Oy 2026</p></div>'
             % (e(s['laskut']['otsikko']), s['laskut'].get('paperi', s['laskut']['html']),
                otsikko, teksti,
                # Konekäännöksen merkintä (Marko 16.11.2026) omalle rivilleen
                ('<b>%s</b><br>' % e(k['konekaannos_merkinta'])) if k.get('konekaannos_merkinta') else '',
                e(k['oikeudet']).replace('. ', '.<br>', 1)))
    return s, k, a, lisat


def sivu_html(kieli, luonnos=True):
    s, k, atomit, lisat = sisalto(kieli)
    # ⚠️ Tunnisteet <bdi>:hin ENNEN kuin sisältö menee sivulle, samalla funktiolla
    # kuin verkkosivuilla (rakenna.eristatunnisteet). ⛔ EI koko dokumenttiin:
    # <title>-teksti ei voi kantaa <bdi>:tä — se näkyisi merkkeinä.
    lisat = rk.eristatunnisteet(lisat)
    # Marko 15.11.2026: ylärivillä pelaajat, ikä ja kesto, alarivillä korttimäärät.
    # sisalto/*.json:n järjestys kaikilla kielillä: pelaajat, ikä, pizzakortit,
    # täytekortit, kesto.
    t = s['tiedot']
    assert len(t) == 5, 'tiedot: odotettiin 5 kohtaa'
    tiedot = (''.join('<li>%s</li>' % e(x) for x in (t[0], t[1], t[4])) + '</ul><ul class="tiedot">'
              + ''.join('<li>%s</li>' % e(x) for x in (t[2], t[3])))
    # 🔵 Marko 15.11.2026: «Asemointi ei ole nyt hyvä. Esim. nämä kaksi menee
    # helposti samaan ruutuun. A4-lapun avaaminen kokonaan ei ole lukijalle
    # ongelma, joten voimme tehdä hyvin kompromisseja siihen kuinka hyvin
    # taitokset osuvat. Ohjeen pitää olla selkeä.»
    # -> Kumpikin puoli on yksi A4-sivu kahtena palstana (palstat = poikki-
    #    taitoksen puolikkaat). Kansi ja takakannen tiedot ovat YHDESSA
    #    otsakkeessa etupuolen vasemmassa ylakulmassa, joka jaa taiteltuna
    #    paallimmaiseksi. Haitaritaitokset saavat osua tekstiin.
    #    Lukujarjestys: etupuoli vasen, oikea; takapuoli vasen, oikea.
    otsake = ('<div class="otsake"><div class="kansi"><div class="viiri">%s</div><div><h1>%s</h1>'
              '<p class="ala">%s</p><ul class="tiedot">%s</ul></div></div>'
              '<div class="netti"><div id="qr"></div><div><p class="qr-teksti">%s</p>'
              '<p>%s <b>%s</b></p></div>%s</div></div>'
              % (ks.viiri(k['iskulause']), e(s['h1']), e(k['alaotsikko']), tiedot,
                 # Marko 15.11.2026: «tässä tuo otsikko saisi olla yhdellä rivillä»
                 # Kiinassa, japanissa ja koreassa ei välilyöntiä rivien väliin (Marko 16.11.2026)
                 k['qr_teksti'].replace('<br>', '' if re.search('[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]', k['qr_teksti']) else ' '),
                 e(k['videot']), osoite(k).replace('https://', ''),
                 lippu(kieli)))
    # «Aloita Pizza Partystä» pois otsakkeesta (Marko 15.11.2026: «Sehän lukee
    # myös pizza partyn alapuolella uudelleen eli ajattelisin, että se on turha»)
    atomit = [otsake] + atomit
    yla = (297 - ARKKI_K) / 2
    taitteet = ''.join('<i class="taite vaaka" style="top:%.2fmm"></i>' % (y - yla) for y in (74.25, 148.5, 222.75))
    # Palstojen tiheys (Marko 15.11.2026): etupuolen vasen palsta saa lisää
    # tilaa pystysuunnassa (ilmava), oikeaan mahtuvat Party ja Basso (tiivis),
    # takapuolen Pizza Love ilmavasti kahdelle palstalle.
    tiheys = (('ilmava', 'tiivis'), ('ilmava vapaa', 'ilmava vapaa'))
    ruudut = ['<section class="sivu"><div class="palsta vasen %s"><div class="sisus"></div></div>'
              '<div class="palsta oikea %s"><div class="sisus"></div></div>%s%s<i class="taite pysty"></i></section>'
              % (tiheys[n][0], tiheys[n][1], lisat if n == SIVUJA - 1 else '', taitteet)
              for n in range(SIVUJA)]
    return '''<!doctype html>
<html lang="{kieli}" data-suunta="{suunta}"><meta charset="utf-8"><title>{title}</title>
<style>
{kirjasimet}
  {viiri_face}
  @page {{ size: {arkki_l}mm {arkki_k}mm; margin: 0 }}
  * {{ box-sizing: border-box; margin: 0; padding: 0 }}
  html, body {{ background: #fff }}
  body {{ font-family: Teksti, Arial, sans-serif; color: {musta}; font-size: {pt}pt; line-height: 1.2;
          -webkit-print-color-adjust: exact; print-color-adjust: exact }}
  b {{ font-weight: 700 }}
  .sivu {{ position: relative; width: {arkki_l}mm; height: {arkki_k}mm; overflow: hidden }}
  .palsta {{ position: absolute; top: {reuna}mm; bottom: {reuna}mm }}
  .palsta.vasen {{ left: {reuna}mm; right: calc({puoli}mm + {puolivali}mm) }}
  .palsta.oikea {{ left: calc({puoli}mm + {puolivali}mm); right: {reuna}mm }}
  .palsta .sisus {{ position: absolute; inset: 0 }}
  .ilmava {{ line-height: 1.3 }}
  .ilmava h2 {{ margin-top: 4.6mm }}
  .ilmava h3 {{ margin-top: 2.6mm }}
  .ilmava .palkki {{ margin: 4.4mm 0 2mm }}
  .ilmava .pelit {{ margin-bottom: 1mm }}
  .ilmava p {{ margin-bottom: 1.1mm }}
  .ilmava .rivi img {{ width: 10mm }}
  .ilmava .pieni-lasku img {{ width: 8.4mm }}
  .ilmava .laskut {{ margin: 1.4mm 0 2.4mm; flex-direction: column; gap: 1.2mm }}
  .ilmava .banneri {{ margin-top: 0 }}
  .ilmava .koti {{ margin-top: 3mm; padding: 1.6mm 2mm .8mm }}
  .ilmava .kaavio svg {{ width: 70mm }}
  .ilmava .kaavio {{ margin-top: 4mm }}
  .ilmava .vaihtoesim .vaihto img {{ width: 9mm }}
  .ilmava ul.lista li, .ilmava ol.lista li {{ margin-bottom: .7mm }}
  /* takapuoli: Pizza Love väljästi, tilaa on */
  /* takapuoli: tekstin välykset samat kuin etupuolella (ilmava), vain kuvat isompina
     (Marko 15.11.2026: «Pidä tekstin välykset samana kuin on lapun ykköspuolella») */
  .vapaa .kaavio svg {{ width: 80mm }}
  .vapaa .vaihtoesim .vaihto img {{ width: 10.4mm }}
  .tiivis {{ line-height: 1.15 }}
  .tiivis h3 {{ margin: 1.4mm 0 .3mm }}
  .tiivis p {{ margin-bottom: .45mm }}
  .tiivis ul.lista li, .tiivis ol.lista li {{ margin-bottom: .35mm }}
  .tiivis .koti {{ margin-top: 2mm; padding: 1.2mm 1.6mm .5mm }}
  .tiivis .banneri {{ padding: 1.3mm 0 3mm; margin-bottom: 1.6mm }}
  .tiivis .banneri {{ margin-top: 0 }}
  .tiivis .banneri ~ .banneri {{ margin-top: 4mm }}
  .sivu + .sivu {{ break-before: page }}
  .sisus > :first-child {{ margin-top: 0 !important }}
  .taite {{ display: {luonnos_nako}; position: absolute; pointer-events: none }}
  .taite.vaaka {{ left: 0; right: 0; border-top: .2mm dashed #9BB8DD }}
  .taite.pysty {{ top: 0; bottom: 0; left: {puoli}mm; border-left: .2mm dashed #E3A0A0 }}

  h1 {{ font: 700 15pt/1 Otsikko, sans-serif; text-transform: uppercase; color: {oranssi}; margin-top: 1.6mm }}
  h2 {{ font: 700 11pt/1.05 Otsikko, sans-serif; text-transform: uppercase; color: {oranssi};
        margin: 3.6mm 0 1.2mm }}
  h3 {{ font: 700 7.8pt/1.1 Otsikko, sans-serif; text-transform: uppercase; letter-spacing: .015em;
        margin: 1.3mm 0 .4mm }}
  .palkki {{ background: {musta}; color: #fff; padding: .6mm 1.5mm .4mm; margin: 1.3mm 0 .6mm }}
  p {{ margin-bottom: .6mm }}
  .johdanto {{ font-weight: 700 }}
  .pieni {{ font-size: 6.4pt; opacity: .8 }}
  /* sisennys loogisena: oikealta vasemmalle kirjoitettavassa kielessä numerot ja pallot oikealle */
  ul.lista, ol.lista {{ margin: 0 0 .5mm; margin-inline-start: 3.4mm }}
  ul.lista li, ol.lista li {{ margin-bottom: .35mm }}
  ol.lista + ol.lista, ul.lista + ul.lista {{ margin-top: -.15mm }}

  .otsake {{ border: .35mm solid {musta}; padding: 3mm 3.4mm 2.6mm; margin-bottom: 2mm }}
  .kansi {{ display: flex; gap: 3.6mm; align-items: center }}
  .kansi .viiri {{ width: 24mm; flex: none }}
  .kansi .viiri svg {{ width: 100%; height: auto; display: block }}
  .kansi h1 {{ margin-top: 0 }}
  .kansi .ala {{ font-weight: 700; font-size: 8pt; margin: .8mm 0 1.2mm }}
  .tiedot {{ list-style: none; display: flex; flex-wrap: wrap; gap: 1mm }}
  .tiedot + .tiedot {{ margin-top: 1mm }}
  .tiedot li {{ background: {musta}; color: #fff; border-radius: .9mm; padding: .8mm 1.5mm .6mm;
                font: 700 6.4pt/1 Otsikko, sans-serif; text-transform: uppercase }}
  .netti {{ display: flex; gap: 3mm; align-items: center; margin-top: 3.4mm }}  /* harmaa viiva pois (Marko 15.11.2026) */
  .netti #qr svg {{ width: 17mm; height: auto; display: block }}
  .netti .lippu {{ margin-left: auto; align-self: flex-end; text-align: center; flex: none }}
  .netti .lippu img {{ width: 10mm; height: 10mm; border-radius: 50%; display: block; object-fit: cover }}
  /* 🔵 Marko 19.11.2026 (Kakkukirja): kielelle jolla ei ole yhtä maata ei tule
     lippua vaan PYÖREÄ kielikoodi. Sama halkaisija kuin lipulla, koska se on
     saman paikan asukki — pyöristetty suorakaide näytti virheeltä lipun paikalla. */
  .netti .lippu .vain-koodi {{ width: 10mm; height: 10mm; border-radius: 50%; display: flex;
     align-items: center; justify-content: center; background: {musta}; color: #fff;
     font: 700 8pt/1 Otsikko, sans-serif; letter-spacing: .04em; margin: 0 }}
  .netti .lippu span {{ display: block; font: 700 6.5pt/1 Otsikko, sans-serif; margin-top: .9mm; letter-spacing: .04em }}
  .netti p {{ margin: 0 0 .5mm }}
  .netti .qr-teksti {{ font: 700 7pt/1.15 Otsikko, sans-serif; text-transform: uppercase }}
  .netti .ingressi {{ font-weight: 700 }}
  .netti b {{ color: {musta}; white-space: nowrap }}  /* osoite ei saa katketa tavuviivasta (fr/sk) */  /* oranssi ei luettava valkoisella (Marko 15.11.2026) */
  .oikeudet {{ font-size: 5.8pt; opacity: .75; margin-top: 2mm; border-top: .25mm solid #ccc; padding-top: 1mm }}
  .rivi {{ display: flex; gap: 1mm; margin: .4mm 0 .8mm }}
  .rivi img, .esimerkki img {{ width: 8mm; height: auto; border: .15mm solid {viiva}; border-radius: 8% / 5.3% }}
  /* Marko 15.11.2026: kortit vasempaan laitaan ja tekstit samaan pystylinjaan
     (korttirivit ja kolme tapaa): kiinteä kuvasarake + tekstisarake */
  .vierekkain, .tapa {{ display: grid; grid-template-columns: 44mm 1fr; column-gap: 4mm; align-items: start }}
  .vierekkain .rivi {{ margin: 0 }}
  .vierekkain p {{ margin: 0 }}
  .pelit {{ font: 700 7pt/1.15 Otsikko, sans-serif; text-transform: uppercase; color: {oranssi}; margin-bottom: .6mm }}
  .laskut {{ display: flex; flex-wrap: wrap; gap: .5mm 3mm; margin: .2mm 0 .6mm }}
  .esimerkki {{ display: flex; align-items: center; gap: .7mm }}
  .esimerkki b {{ font: 900 9pt/1 Viiri, sans-serif }}
  .pieni-lasku img {{ width: 5.6mm }}
  .laskulaatikko {{ border: .25mm solid {musta}; padding: 1mm 1.6mm .4mm }}
  .laskulista {{ list-style: none; display: grid; grid-template-columns: repeat(4, auto); justify-content: start;
                 column-gap: 4mm; font-weight: 700; margin: .4mm 0 .6mm }}
  .tieto {{ display: flex; gap: 2mm; align-items: center; margin-top: 4mm }}
  .lisat {{ position: absolute; left: {reuna}mm; right: {reuna}mm; border-top: .2mm solid {musta}; padding-top: 3.7mm;
            line-height: 1.3 }}
  /* Basso nojaa alalaatikon alareunan viivaan (kuvan leikkaus 84,6 %:ssa korkeudesta).
     Marko 15.11.2026: «suurennat Bassoa vieläkin, mutta siten että se mahtuu
     kokonaan vasemmalle palstalle» -> 1,15 x verkko-PDF:n mitat; Basso ja kupla
     vasemmassa palstassa (84 mm), tekstit oikean palstan linjassa. */
  .alalaatikko {{ display: grid; grid-template-columns: {palsta_l}mm {palsta_l}mm; column-gap: {palstavali}mm;
                  align-items: center; padding-bottom: 2.6mm; border-bottom: .2mm solid {musta} }}
  .ajattelee {{ position: relative; width: 84mm; margin-left: 2mm; align-self: stretch; min-height: 40mm }}
  .ajattelee img {{ position: absolute; display: block }}
  .ajattelee img.basso {{ left: 0; width: 42.5mm; bottom: calc(-2.6mm - .2mm - 42.5mm * .1536) }}
  .ajattelee img.hanta {{ left: 39mm; width: 39mm; bottom: calc(-2.6mm - .2mm - 5.3mm);
      clip-path: polygon(0 0, 100% 0, 100% 100%, 60% 100%, 60% {hanta_raja}%, 0 {hanta_raja}%) }}
  .kupla {{ position: absolute; left: 33.4mm; bottom: 3.4mm; width: 50.6mm }}
  .kupla > img {{ position: static !important; width: 100% }}
  .merkit {{ position: absolute; left: 29%; right: 11.2%; top: 22%; bottom: 17%;
             display: grid; grid-template-columns: repeat(4, 1fr);
             align-content: space-evenly; align-items: center; justify-items: center;
             font: 900 17pt/1 Viiri, sans-serif; color: {musta} }}
  .merkit span:nth-child(n+5) {{ font: 700 13.8pt/1 Otsikko, sans-serif }}
  .merkit sup {{ font-size: .6em }}
  .tekstit {{ min-width: 0 }}
  .tekstit h3 {{ margin: 0 0 .6mm }}
  .tekstit {{ line-height: 1.4 }}
  .tekstit h3.bruno {{ margin-top: 4mm }}
  .tekstit .laskulista {{ column-gap: 6mm; row-gap: .8mm; margin: 1.2mm 0 1.4mm; font-size: 7.6pt }}
  .tekstit p {{ margin-bottom: .6mm }}
  /* Marko 15.11.2026: «Vaihda ®-rivi mustaksi» + kahdelle riville oikeaan palstaan */
  .lisat .oikeudet {{ border-top: 0; margin: 2.6mm 0 0 calc({palsta_l}mm + {palstavali}mm); padding-top: 0; opacity: 1; color: {musta} }}
  .tieto img {{ width: 11mm; flex: none }}
  .tieto p {{ margin: 0 }}
  .banneri {{ background: {musta}; color: #fff; text-align: center; padding: 1.3mm 0 3mm; margin: 4mm 0 1mm;
              font: {viiri_font}, sans-serif; text-transform: uppercase;
              clip-path: polygon(0 0, 100% 0, 100% 72%, 50% 100%, 0 72%) }}
  .banneri .oranssi {{ color: {oranssi} }}
  .kuvaus {{ font-weight: 700; margin-bottom: .4mm }}
  .koti {{ border: .25mm solid {musta}; padding: 1mm 1.6mm .3mm; margin-top: 1.4mm }}
  .koti h3 {{ margin-top: 0 }}
  .kaavio {{ margin: .8mm 0 }}
  .kaavio svg {{ width: 56mm; height: auto; display: block; margin: 0 auto }}
  .tapa {{ margin: 1.2mm 0 1.6mm }}
  .ilmava .tapa .laskut {{ gap: 1.8mm }}
  .tapa .laskut {{ flex: none; flex-direction: column; gap: 1.2mm; margin: 0 }}
  .tapateksti, .vierekkain p {{ min-width: 0; text-wrap: pretty; hyphens: manual }}
  .tapateksti .pelit {{ margin-bottom: 1mm }}
  .tapateksti p:last-child {{ margin-bottom: 0 }}
  .vaihtoesim h3 {{ margin-top: 3.2mm }}
  .vaihtoesim {{ padding-bottom: 1.3mm }}
  .vaihtoesim .vaihto {{ justify-content: flex-start; margin: 0 }}
  .vaihtoesim .vierekkain {{ margin: 1mm 0 0 }}
  .vaihtoesim .vaihto img {{ width: 7.4mm; border-color: {oranssi}; border-width: .35mm }}
  #lahde {{ position: absolute; left: -9999mm; width: {palsta_l}mm }}
  /* ---- oikealta vasemmalle kirjoitettavat kielet (Marko 18.11.2026) ----------
     «Älä käännä koko asettelua, vain tekstin suunta.» Sama sopimus kuin
     sivustolla (julkinen/tyyli.css, lohko data-suunta): ensin teksti rtl:ksi,
     sitten ne kohdat takaisin ltr:ksi joiden JÄRJESTYS on sisältöä eikä kieltä.
     Toinen sääntö voittaa TARKKUUDELLA ([lang]) eikä järjestyksellä.
     ⚠️ direction PERIYTYY, joten rtl:n saava ul vie mukanaan flex- ja
     grid-lastensa järjestyksen. Siksi .tiedot ja .laskulista ovat listassa.
     ⚠️ Laskulausekkeet on pakko lukita: UAX #9:n sääntö N1 kohtelee numeroita
     oikealta vasemmalle, joten «2 · 3 = 6» kääntyisi rtl-kappaleessa.
     ⛔ Numerovälejä EI eristetä (ks. rakenna.TUNNISTEET) — niiden kuuluu
     kääntyä arabiassa. */
  /* ⚠️ VAIN `direction`, EI `text-align`: oletus `start` seuraa suuntaa jo itse,
     ja kirjoitettu `text-align` kumoaisi keskityksen (.banneri on h2). */
  html[data-suunta="rtl"] :is(h1, h2, h3, p, li, ul, ol) {{ direction: rtl }}
  html[data-suunta="rtl"][lang] :is(.banneri, .banneri *, .pelit,
      .tiedot, .laskulista, .laskulista *, .laskut, .laskut *) {{ direction: ltr }}
  .ylivuoto {{ position: absolute; left: 4mm; top: 4mm; color: red; font: 700 14pt Otsikko, sans-serif }}
</style>
{ruudut}
<div id="lahde">{atomit}</div>
<script src="julkinen/play/qr.js"></script>
<script>
document.getElementById('qr').innerHTML = norsuQrSvg({osoite}, {{ reunus: 4 }});
function pakkaa() {{
  var lisat = document.querySelector('.lisat'), mm = 96 / 25.4, VALI = 10 * mm;
  var viimeiset = [].slice.call(document.querySelectorAll('.sivu:last-of-type .palsta'));
  if (lisat) viimeiset.forEach(function (p) {{
    p.style.bottom = ({reuna} * mm + lisat.getBoundingClientRect().height + VALI) + 'px';
  }});
  var lahde = document.getElementById('lahde');
  var atomit = [].slice.call(lahde.children);
  var ruudut = [].slice.call(document.querySelectorAll('.palsta .sisus'));
  var i = 0, virheet = [];
  function yli(p) {{ return p.scrollHeight > p.clientHeight + 0.5; }}
  for (var n = 0; n < atomit.length; n++) {{
    var a = atomit[n];
    if (i >= ruudut.length) {{ virheet.push('ruudut loppuivat'); break; }}
    var p = ruudut[i];
    // pelimuoto, joka aloittaa uuden palstan (Markon jako 15.11.2026)
    if (a.classList.contains('uusi-palsta') && p.children.length && i + 1 < ruudut.length) {{ i++; p = ruudut[i]; }}
    p.appendChild(a);
    if (!yli(p)) continue;
    p.removeChild(a);
    var siirto = [a];
    while (p.lastElementChild && p.lastElementChild.classList.contains('pida')) {{
      siirto.unshift(p.lastElementChild); p.removeChild(p.lastElementChild);
    }}
    i++;
    if (i >= ruudut.length) {{ virheet.push('ruudut loppuivat'); break; }}
    siirto.forEach(function (x) {{ ruudut[i].appendChild(x); }});
    if (yli(ruudut[i])) virheet.push('ei mahdu ruutuun: ' + a.textContent.slice(0, 40));
  }}
  // Viimeinen sivu tasataan kahdelle palstalle (Markon toive 15.11.2026:
  // Love "ilmavasti kahdelle palstalle", koko paperia ei tarvitse käyttää).
  function kork(p) {{
    var c = p.lastElementChild; if (!c) return 0;
    return c.getBoundingClientRect().bottom - p.getBoundingClientRect().top;
  }}
  var V = ruudut[ruudut.length - 2], O = ruudut[ruudut.length - 1];
  if (!virheet.length && i === ruudut.length - 1) {{
    while (V.children.length > 1) {{
      var ennen = Math.max(kork(V), kork(O));
      // siirretään kokonainen luku (väliotsikosta loppuun), ei puolikasta luetteloa
      var lapset = [].slice.call(V.children), alku = -1;
      for (var q = lapset.length - 1; q > 0; q--) if (lapset[q].tagName === 'H3') {{ alku = q; break; }}
      if (alku < 1 || lapset[alku].classList.contains('uusi-palsta')) break;
      var ryhma = lapset.slice(alku);
      ryhma.forEach(function (x) {{ V.removeChild(x); }});
      for (var k = ryhma.length - 1; k >= 0; k--) O.insertBefore(ryhma[k], O.firstChild);
      if (yli(O) || Math.max(kork(V), kork(O)) >= ennen) {{
        ryhma.forEach(function (x) {{ V.appendChild(x); }});
        break;
      }}
    }}
  }}
  if (lisat) {{
    // hiusviiva ja lisätiedot heti Pizza Loven palstojen alle
    var ala = Math.max(kork(V), kork(O)) + V.getBoundingClientRect().top - V.closest('.sivu').getBoundingClientRect().top;
    lisat.style.top = (ala + VALI) + 'px';
  }}
  if (virheet.length) {{
    var v = document.createElement('div'); v.className = 'ylivuoto';
    v.textContent = '{ylivuoto}: ' + virheet.join(' | ');
    document.querySelector('.sivu').appendChild(v);
  }}
  document.title = 'VALMIS palsta ' + (i + 1) + '/' + ruudut.length + (virheet.length ? ' {ylivuoto}' : '');
}}
(document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {{
  var kuvat = [].slice.call(document.images).map(function (im) {{
    return im.complete ? Promise.resolve() : new Promise(function (r) {{ im.onload = im.onerror = r; }});
  }});
  Promise.all(kuvat).then(pakkaa);
}});
</script>
</html>'''.format(
        kieli=kieli, title=e(s['h1']), kirjasimet=ks.KIRJASIMET,
        arkki_l=ARKKI_L, arkki_k=ARKKI_K, reuna=REUNA, puoli=ARKKI_L / 2, puolivali=PALSTAVALI / 2,
        palsta_l=PALSTA_L, palstavali=PALSTAVALI,
        viiri_face=viirikirjasin()[0], viiri_font=viirikirjasin()[1], musta=ks.MUSTA, oranssi=ks.ORANSSI,
        hanta_raja=round(100 * (39 * 374 / 1030 - 5.3) / (39 * 374 / 1030), 1), viiva=ks.VIIVA, pt=LEIPA_PT, luonnos_nako='block' if luonnos else 'none',
        ruudut=''.join(ruudut), atomit=rk.eristatunnisteet('\n'.join(atomit)), osoite=json.dumps(osoite(k)),
        suunta=tekstisuunta(kieli),
        ylivuoto=KIELET[kieli]['ylivuoto'])


def tulosta(html_polku, pdf_polku):
    """Macilla Chrome (virtuaaliaika antaa kirjasimille ja pakkaukselle aikaa),
    muualla Playwright, joka odottaa pakkauksen valmistumista."""
    if os.path.exists(ks.CHROME):
        subprocess.run([ks.CHROME, '--headless', '--disable-gpu', '--no-pdf-header-footer',
                        '--allow-file-access-from-files', '--virtual-time-budget=10000',
                        '--print-to-pdf=' + pdf_polku, 'file://' + html_polku], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        # ⚠️ JARJESTELMAN Chrome, ei erikseen ladattua Chromiumia — ja valinta
        # on `ks.avaa_selain`issa, EI tassa. 📐 Mitattu 19.11.2026: askel
        # «Fontit ja selain» kesti eri ajoissa 29 s … 2188 s, ja 2188 s:n
        # ajossa arkkien teko itse vei 49 s. ⚠️ Kun tama oli omana rivinaan,
        # kaksi muuta kaynnistysta jai muuntamatta ja viron ajo kaatui.
        b = ks.avaa_selain(p)
        sivu = b.new_page()
        sivu.goto('file://' + html_polku, wait_until='load')
        sivu.wait_for_function("document.title.indexOf('VALMIS') === 0", timeout=20000)
        print('Pakkaus:', sivu.title())
        sivu.pdf(path=pdf_polku, prefer_css_page_size=True, print_background=True)
        b.close()


def teksti(pdf):
    try:
        return subprocess.run(['pdftotext', pdf, '-'], capture_output=True, text=True).stdout
    except FileNotFoundError:
        ulos = subprocess.run(['osascript', '-l', 'JavaScript', '-e', ks.PDF_TEKSTI % pdf],
                              capture_output=True, text=True)
        return ulos.stderr if len(ulos.stderr) > len(ulos.stdout) else ulos.stdout


# Marko 15.11.2026: «Tulosteessa nuo pienet kortit on aika suttuisia.»
# PDF:ssä kortit ovat terävät (351 × 532 px, 900–1160 ppi), joten sumeus syntyy
# tulostuksessa: läpinäkyvät kulmat (smask) pakottavat tulostusketjun
# litistämään kuvat, ja tulostin skaalaa 1000 ppi:n kuvan itse alas. Siksi
# korttikuvat valmistellaan painoa varten: valkoiselle litistettyinä (ei
# läpinäkyvyyttä), valmiiksi n. 700 ppi:hin pienennettyinä (300 px, kortti
# on arkilla 7–11 mm) ja kevyesti terävöityinä, häviöttömänä PNG:nä.
# Basso, ajatuskupla ja häntä jäävät läpinäkyviksi, koska ne menevät viivan päälle.
PAINOKUVA = re.compile(r'(?:julkinen/kuvat|paperi/kortit)/(?:pizza|tayte|tausta)-[\w-]+\.webp')
PAINOKUVA_LEVEYS = 300


def painokuvat(sivu):
    try:
        from PIL import Image, ImageFilter
    except ImportError:
        print('⚠️  Pillow puuttuu — korttikuvat alkuperäisinä (läpinäkyvät kulmat)')
        return sivu, 0
    kansio = os.path.join(tempfile.gettempdir(), 'koteloarkki-painokuvat')
    os.makedirs(kansio, exist_ok=True)
    uudet = {}
    for polku in sorted(set(PAINOKUVA.findall(sivu))):
        lahde = os.path.join(TANNE, polku)
        kohde = os.path.join(kansio, polku.replace('/', '_').replace('.webp', '.png'))
        if not os.path.exists(kohde) or os.path.getmtime(kohde) < os.path.getmtime(lahde):
            im = Image.open(lahde).convert('RGBA')
            pohja = Image.new('RGBA', im.size, (255, 255, 255, 255))
            im = Image.alpha_composite(pohja, im).convert('RGB')
            korkeus = round(im.height * PAINOKUVA_LEVEYS / im.width)
            im = im.resize((PAINOKUVA_LEVEYS, korkeus), Image.LANCZOS)
            im = im.filter(ImageFilter.UnsharpMask(radius=1, percent=60, threshold=2))
            im.save(kohde, optimize=True)
        uudet[polku] = pathlib.Path(kohde).as_uri()
    return PAINOKUVA.sub(lambda m: uudet[m.group(0)], sivu), len(uudet)


# Pidemmät kielet (esim. ranska, espanja) eivät mahdu suomen väleillä. Silloin
# välejä tiivistetään porras kerrallaan, kunnes arkki on tasan 2 sivua ilman
# ylivuotoa. Kirjasinkoko (7 pt), sivukoko, palstat ja asettelu pysyvät samoina
# (Marko 15.11.2026: «Muista pitää taitto samana kuin tässä»). Suomi = 0/0.
# Kaksi erillistä porrasta: V = väljät palstat (etupuolen vasen ja takapuoli),
# O = etupuolen oikea (Party + Basso). Kumpaakin tiivistetään vain tarpeen mukaan.
_V1 = '''
  .ilmava { line-height: 1.24 } .ilmava h2 { margin-top: 3.8mm } .ilmava h3 { margin-top: 2.1mm }
  .ilmava .palkki { margin: 2.4mm 0 1.1mm } .ilmava p { margin-bottom: .9mm }
  .ilmava .pieni-lasku img { width: 7.6mm } .ilmava .tapa .laskut { gap: 1.4mm }
  .ilmava .kaavio { margin-top: 3mm }'''
_V2 = _V1 + '''
  .ilmava { line-height: 1.2 } .ilmava h3 { margin-top: 1.7mm } .ilmava .palkki { margin: 1.9mm 0 .9mm }
  .ilmava p { margin-bottom: .7mm } .ilmava .pieni-lasku img { width: 7mm } .ilmava .rivi img { width: 9mm }
  .ilmava ul.lista li, .ilmava ol.lista li { margin-bottom: .5mm } .vapaa .kaavio svg { width: 72mm }'''
_V3 = _V2 + '''
  .ilmava { line-height: 1.16 } .ilmava .pieni-lasku img { width: 6.4mm }
  .vapaa .kaavio svg { width: 64mm } .lisat { padding-top: 3mm }'''
_O1 = '''
  .tiivis { line-height: 1.12 } .tiivis h3 { margin: 1.2mm 0 .25mm }'''
_O2 = _O1 + '''
  .tiivis { line-height: 1.1 } .tiivis p { margin-bottom: .35mm }
  .tiivis ul.lista li, .tiivis ol.lista li { margin-bottom: .25mm }'''
_O3 = _O2 + '''
  .tiivis { line-height: 1.07 } .tiivis h3 { margin: 1mm 0 .2mm }'''
TIIVISTYS_V = ['', _V1, _V2, _V3]
TIIVISTYS_O = ['', _O1, _O2, _O3]
# kokeilujärjestys: pienin yhteistiivistys ensin, väljä puoli säästetään
PORTAAT = sorted(((v, o) for v in range(4) for o in range(4)), key=lambda p: (p[0] + p[1], p[0]))


# Rasteriviittaukset valmiista sivusta: <img src>, <image href> ja CSS url().
# ⚠️ Luetaan SIVUSTA eikä lähdepoluista, koska painokuvat() on jo vaihtanut
# korttikuvat väliaikaisiksi PNG-tiedostoiksi — lähdepolkuja ei enää ole.
RASTERI = re.compile(r'(?:src|(?:xlink:)?href)="([^"]+\.(?:webp|png|jpe?g))"'
                     r'|url\((["\']?)([^)"\']+\.(?:webp|png|jpe?g))\2\)', re.I)
# Nämä saa litistää valkoiselle: pizza-, tayte- ja tausta-alkuiset (sama
# rajaus kuin PAINOKUVA). Basso, ajatuskupla ja hanta EIVÄT ole mukana —
# ne menevät hiusviivan päälle, joten läpinäkyvyys on niillä sisältöä.
LITISTETTAVA = re.compile(r'(?:^|[/_])(?:pizza|tayte|tausta)-[\w-]+\.(?:webp|png|jpe?g)$', re.I)


def pakattu(kieli, sivun_html):
    """Sama arkki jälleenmyyjille: rasterikortit JPEGinä, muu ennallaan.

    Palauttaa 1 jos jokin koe kaatui — pakattukin käy samat kokeet kuin
    näyttöversio (QR, sisältö, sivumäärä) ja lisäksi kokokokeen."""
    tiedosto = ks.KIELET[kieli]['tiedosto']
    kohde = ks.pakattu_polku(tiedosto)
    osumat = [m.group(1) or m.group(3) for m in RASTERI.finditer(sivun_html)]
    valitut = sorted({u for u in osumat if LITISTETTAVA.search(u.rsplit('/', 1)[-1])})
    kuvat = ks.jpeg_kuvat(valitut, TANNE, PAINOKUVA_LEVEYS)
    if len(kuvat) != len(valitut):
        print('⚠️  pakkaus sai %d/%d kuvaa — koko jää suuremmaksi'
              % (len(kuvat), len(valitut)))
    sivu = os.path.join(TANNE, '.koteloarkki-%s-2mb.html' % kieli)
    teksti_html = sivun_html
    for polku, data in kuvat.items():
        teksti_html = teksti_html.replace(polku, data)
    with open(sivu, 'w', encoding='utf-8') as f:
        f.write(teksti_html)
    tulosta(sivu, kohde)
    os.unlink(sivu)
    n = ks.sivuja(kohde)
    print('%s  (%.0f kt, %d sivua, %d kuvaa JPEGinä)'
          % (kohde, os.path.getsize(kohde) / 1024, n, len(kuvat)))
    virhe = 0
    if ks.kokokoe(kohde) is False:
        virhe = 1
    if n != SIVUJA:
        print('🔴 PAKATUSSA SIVUJA %d, PITÄÄ OLLA TASAN %d.' % (n, SIVUJA))
        virhe = 1
    # Samat kokeet kuin näyttöversiolle: pakkaus ei saa viedä QR:ää eikä
    # tekstiä. 📐 Juuri nämä kaksi ghostscript rikkoi (QR sumeni, kirjasin
    # muuttui Type 3:ksi), joten ne ovat tämän muutoksen vartija.
    t = teksti(kohde)
    if len(t) < 2000:
        print('🔴 PAKATUSTA EI SAATU TEKSTIÄ: kirjasimet eivät säilyneet.')
        virhe = 1
    if ks.qr_lukukoe(kohde, osoite(ks.KIELET[kieli])) is False:
        virhe = 1
    return virhe


def verkkopolku(kieli):
    return os.path.join(TANNE, 'julkinen', 'pdf', ks.KIELET[kieli]['tiedosto'])


def tee(kieli, luonnos):
    # 🔵 Marko 15.11.2026: «Eikös se verkon pdf:kin pitäisi olla tämä sama kuin
    # koteloarkkikin, jotta asiakas voisi sen halutessaan tulostaa itselleen.»
    # -> Koteloarkki ON verkon sääntö-PDF: se kirjoitetaan julkinen/pdf/:iin
    # verkko-PDF:n vanhalla nimellä (korttisaannot.KIELET[..]['tiedosto']),
    # jotta sivuston linkit ja jo jaetut osoitteet toimivat. rakenna.py
    # kopioi sen docs/pdf/:iin. Vanha 3-sivuinen korttisaannot.py-asettelu
    # ei ole enää käytössä.
    kohde = verkkopolku(kieli)
    os.makedirs(os.path.dirname(kohde), exist_ok=True)
    sivu = os.path.join(TANNE, '.koteloarkki-%s.html' % kieli)
    for v, o in PORTAAT:
        lisa = TIIVISTYS_V[v] + TIIVISTYS_O[o]
        with open(sivu, 'w', encoding='utf-8') as f:
            html_, kuvia = painokuvat(sivu_html(kieli, luonnos).replace('</style>', lisa + '\n</style>', 1))
            f.write(html_)
        tulosta(sivu, kohde)
        if ks.sivuja(kohde) == SIVUJA and KIELET[kieli]['ylivuoto'] not in teksti(kohde):
            break
    print('Painokuvat: %d korttikuvaa litistetty valkoiselle, %d px, terävöity' % (kuvia, PAINOKUVA_LEVEYS))
    print('Välien tiivistys: väljät palstat %d/3, oikea palsta %d/3' % (v, o))
    os.unlink(sivu)
    # ⚠️ EI kuvien pakkausta (lautasaannot.pakkaa): mitattu 15.11.2026, se
    # pikselöi pienet korttikuvat (sama kuva kahdessa koossa). Painotiedosto
    # saa olla iso.
    n = ks.sivuja(kohde)
    print('%s  (%.0f kt, %d sivua)' % (kohde, os.path.getsize(kohde) / 1024, n))
    virhe = 0
    if n != SIVUJA:
        print('🔴 SIVUJA %d, PITÄÄ OLLA TASAN %d. Kolmas sivu on virhe, ei päätös.' % (n, SIVUJA))
        virhe = 1
    t = teksti(kohde)
    if KIELET[kieli]['ylivuoto'] in t:
        print('🔴 SISÄLTÖ EI MAHDU RUUTUIHIN:', re.search(r'%s[^\n]*' % KIELET[kieli]['ylivuoto'], t).group(0))
        virhe = 1
    # Sama otsikkolista kuin verkko-PDF:n kokeessa (korttisaannot.otsikot),
    # luettuna valmiista PDF:sta.
    # Tarkoituksella karsittu otsikko (perusteiden otsikko, ks. KIELET-kommentti) ohitetaan.
    lahde = json.load(open(ks.lahdepolku(kieli), encoding='utf-8'))['korttipeli']
    karsitut = {ks.norm(lahde['perusteet_otsikko'])}
    # ⚠️ OSUMASAANTO ON korttisaannot.osuu — EI omaa kopiota. Tassa oli oma
    # rivinsa, ja CI ajaa nimenomaan taman (ei korttisaannot.sisaltokoe:ta).
    # ⚠️ Se EI ollut arabian kaatumisen syy: molemmat kutsuivat ks.norm:ia,
    # joten NFKC oli voimassa kummassakin. Kahdennuksen hinta on tuleva —
    # jokainen uusi osumasaannon korjaus (kaannetty jarjestys, diagnostiikka)
    # olisi osunut vain toiseen.
    nt = ks.norm(t)
    puuttuu, kaannettyja = [], 0
    for o in ks.otsikot(ks.lahdepolku(kieli)):
        if ks.norm(o) in karsitut:
            continue
        loytyi, miten = ks.osuu(o, nt)
        if not loytyi:
            # Kiinassa ym. portaan numero («1.») irtoaa PDF:n tekstissä eri
            # kirjasimen takia: hyväksytään otsikko ilman numeroa.
            loytyi, miten = ks.osuu(re.sub(r'^\d+\.\s*', '', o), nt)
        if not loytyi:
            puuttuu.append(o)
        elif miten == 'kaannettyna':
            kaannettyja += 1
    if len(t) < 2000:
        print('Sisaltokoe: PDF:sta ei saatu tekstia — EI MITATTAVISSA')
    elif puuttuu:
        print('🔴 SISALTOKOE: arkilta puuttuu %d lukua:' % len(puuttuu))
        for o in puuttuu:
            print('   %s\n     %s' % (o, ks.miksi_ei_loytynyt(o, nt)))
        virhe = 1
    else:
        print('Sisaltokoe: kaikki luvut loytyvat arkilta — OK%s'
              % (' (%d vain kaannettyna: purkaja antaa visuaalisen jarjestyksen)'
                 % kaannettyja if kaannettyja else ''))
    # QR luetaan VALMIISTA PDF:stä ja osoitteen sivu tarkistetaan docs/:sta
    # (samat kokeet kuin vanhassa verkko-PDF:ssä)
    if ks.qr_lukukoe(kohde, osoite(ks.KIELET[kieli])) is False:
        virhe = 1
    if ks.osoitekoe(osoite(ks.KIELET[kieli])) is False:
        virhe = 1
    # Jälleenmyyjien 2 Mt -versio SAMASTA hyväksytystä sivusta (html_ on se
    # tiivistysporras joka mahtui kahdelle sivulle) — ei toisesta ajosta eikä
    # käsin tehdystä kopiosta.
    if pakattu(kieli, html_):
        virhe = 1
    return virhe


def main():
    luonnos = '--luonnos' in sys.argv
    pyydetyt = [a for a in sys.argv[1:] if not a.startswith('-')]
    for kieli in (pyydetyt or sorted(KIELET)):
        if kieli not in KIELET:
            raise SystemExit('Tuntematon kieli %r — tunnetut: %s' % (kieli, ', '.join(sorted(KIELET))))
        print('— %s —' % kieli)
        if tee(kieli, luonnos):
            return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
