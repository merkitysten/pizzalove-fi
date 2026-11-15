# -*- coding: utf-8 -*-
"""Korttipelin saannot koteloon taiteltavana A4-arkkina, kieli kerrallaan.

🔵 Marko 15.11.2026 (toimeksianto): «Tee korttipelin säännöistä uusi
tulostusmuoto: koteloon taiteltava A4-arkki, suomi ensin. Tämä on eri asia
kuin nykyinen korttisaannot.py:n tuottama 3-sivuinen A4-PDF — se jää verkkoon
jaettavaksi, tämä menee laatikkoon.»

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

LUONNOS (oletus): taitosviivat ja ruutujen numerot nakyvat (Marko: «jotta
voin tulostaa, taitella ja arvioida lukujärjestyksen»). `--puhdas` piilottaa.

AJO: python3 koteloarkki.py [fi] [--puhdas]
  Macilla Chrome kuten muut generaattorit, muualla Playwright.
"""

import html
import json
import os
import re
import subprocess
import sys

import korttisaannot as ks

TANNE = os.path.dirname(os.path.abspath(__file__))
SIVUJA = 2
LEIPA_PT = 7.0          # painetun arkin leipateksti 2,479 mm
KIELET = {
    'fi': {'tiedosto': 'pizza-love-korttipeli-koteloarkki-fi.pdf',
           'ylivuoto': 'YLIVUOTO',
           # Marko 15.11.2026: «mieti mitä tällä palstalla voidaan vielä ottaa
           # pois, jotta selkeytetään». Vain koteloarkista; verkko-PDF ennallaan.
           'pois': ['>Näin pizza tehdään<', 'Kaikki kolme peliä perustuvat samaan sääntöön. Opettele tämä ensin.',
                    'Arvon on aina täsmättävä. ',
                    '<p>Kokeile tätä myös <b>#1 Pizza Partyssä</b>: peli muuttuu hauskemmaksi, '
                    'vaikkakin vähän vaikeammaksi.</p>']},
}


def e(s):
    return html.escape(str(s), quote=False)


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
    s = json.load(open(os.path.join(TANNE, 'sisalto', kieli + '.json'), encoding='utf-8'))['korttipeli']
    a = []
    # --- perusteet
    a.append('<h2 class="pida">%s</h2>' % e(s['perusteet_otsikko']))
    a.append('<p class="johdanto">%s</p>' % e(s['perusteet_ingressi']))
    a.append('<div class="korttirivi"><div><h3 class="palkki">%s</h3>'
             '<div class="rivi"><img src="julkinen/kuvat/tausta-pizza.webp"><img src="julkinen/kuvat/pizza-31.webp">'
             '<img src="paperi/kortit/pizza-22.webp"></div><p>%s</p></div></div>'
             % (e(s['pizzakortit_otsikko']), e(s['pizzakortit'])))
    a.append('<div class="korttirivi"><div><h3 class="palkki">%s</h3>'
             '<div class="rivi"><img src="julkinen/kuvat/tausta-tayte.webp"><img src="paperi/kortit/tayte-8.webp">'
             '<img src="julkinen/kuvat/tayte-x.webp"></div><p>%s</p></div></div>'
             % (e(s['taytekortit_otsikko']), e(s['taytekortit'])))
    a.append('<h3 class="palkki pida">%s</h3>' % e(s['perussaanto_otsikko']))
    a.append('<p>%s</p>' % e(s['perussaanto']))
    a.append('<h3 class="pida">%s</h3>' % e(s['arvo_otsikko']))
    a.append('<p>%s</p>' % s['arvo'])
    # --- kolme tapaa valmistaa pizza: etupuolen vasempaan palstaan väljästi
    # (Marko 15.11.2026: «Pizzojen tekeminen on paljon tärkeämpi info»)
    a.append('<h2 class="pida">%s</h2>' % e(s['portaat_otsikko']))
    a.append('<p class="johdanto">%s</p>' % e(s['portaat_ingressi']))
    for x in s['portaat']:
        a.append('<h3 class="palkki pida">%s</h3>' % e(x['otsikko']))
        a.append('<p class="pelit pida">%s</p>' % ks.pelit_rivi(x['pelit']))
        a += atomit_html(x['html'])
        a.append('<div class="laskut">%s</div>' % ''.join(lasku_pieni(l) for l in x['esimerkit']))
    # --- laskutoimitukset ja Bruno vai Basso
    # --- pelimuodot
    for m in s['muodot']:
        sanat = m['nimi'].split(' ', 1)
        # 🔵 Marko 15.11.2026: etupuolen oikeaan palstaan Pizza Party ja sen
        # alle Pizza Basso; Pizza Love takapuolelle kahdelle palstalle.
        # `uusi-palsta` aloittaa uuden palstan (Party ja Love).
        uusi = ' uusi-palsta' if m['numero'] in ('#1', '#3') else ''
        a.append('<h2 class="banneri pida%s"><span class="oranssi">%s %s</span> %s</h2>'
                 % (uusi, e(m['numero']), e(sanat[0]), e(sanat[1] if len(sanat) > 1 else '')))
        a.append('<p class="kuvaus pida">%s</p>' % e(m['kuvaus']))
        runko = m['html']
        koti = m.get('kotisaanto')
        siirretty = ''
        if koti and koti.get('siirra'):
            runko, siirretty = ks.irrota_luku(runko, koti['siirra'])
            siirretty = re.sub(r'^<h3>[^<]*</h3><p>[^<]*</p>', '', siirretty)
        osat = atomit_html(runko)
        if m['numero'] == '#3':
            # kaavio varaston selityksen jalkeen ja vaihtoesimerkki vaihtoluvun
            # loppuun, kuten verkko-PDF:ssa (korttisaannot.muoto)
            i = next(n for n, x in enumerate(osat) if x.startswith('<h3') and k['kaavio'][3] in x)
            osat.insert(i + 2, ks.kaavio(k))
            j = next(n for n, x in enumerate(osat) if k['vaihto_luku'] in x)
            loppu = next((n for n in range(j + 1, len(osat)) if osat[n].startswith('<h3')), len(osat))
            osat.insert(loppu, ks.vaihtoesimerkki(k))
        a += osat
        if koti:
            a.append('<div class="koti"><h3>%s</h3>%s%s%s</div>'
                     % (e(koti['otsikko']), koti['html'], koti.get('siirra_alku', ''), siirretty))
    # Lisätiedot ohjeen loppuun hiusviivan alle (Marko 15.11.2026: «kaikki
    # laskutoimitukset käyvät -laatikko voisi olla sellainen next-level-tieto,
    # jolle voisi tehdä oman paikkansa aivan ohjeen loppuun» ja «hiusviivan
    # poikittain, jolloin sen todella ymmärtää, että pelimuodon ohje päättyy»)
    a.append('<h3 class="pida lisatieto">%s</h3>' % e(s['laskut']['otsikko']))
    a.append('<div class="laskulaatikko">%s</div>' % s['laskut'].get('paperi', s['laskut']['html']))
    # Bruno vai Basso takapuolen loppuun (Marko 15.11.2026: «tuon bruno vai
    # basso -faktan laittaa sinne toiselle sivulle alas, jossa on paljon tilaa»)
    otsikko, teksti = ks.tieto_jaettu(s)
    a.append('<div class="tieto"><img src="julkinen/kuvat/basso-pohtii.webp"><p><b>%s</b> %s</p></div>'
             % (otsikko, teksti))
    # karsinnat (KIELET[kieli]['pois']); tyhjiksi jäävät kappaleet pois
    for pois in KIELET[kieli].get('pois', []):
        osumia = sum(pois in x for x in a)
        assert osumia == 1, 'karsittava teksti ei löydy yksikäsitteisesti: ' + pois
        a = [x.replace(pois, '><' if pois.startswith('>') else '') for x in a]
    a = [x for x in a if not re.fullmatch(r'<(p|h2|h3)[^>]*>\s*</\1>', x)]
    return s, k, a


def sivu_html(kieli, luonnos=True):
    s, k, atomit = sisalto(kieli)
    tiedot = ''.join('<li>%s</li>' % e(x) for x in s['tiedot'])
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
              '<p>%s <b>%s</b></p><p class="ingressi">%s</p></div></div></div>'
              % (ks.viiri(k['iskulause']), e(s['h1']), e(k['alaotsikko']), tiedot,
                 k['qr_teksti'], e(k['videot']), k['osoite'].replace('https://', ''),
                 e(ks.ingressi_ilman_toistoa(s, k))))
    atomit = [otsake] + atomit + ['<p class="oikeudet">%s © Merkitysten Oy 2026</p>' % e(k['oikeudet'])]
    taitteet = ''.join('<i class="taite vaaka" style="top:%smm"></i>' % y for y in ('74.25', '148.5', '222.75'))
    # Palstojen tiheys (Marko 15.11.2026): etupuolen vasen palsta saa lisää
    # tilaa pystysuunnassa (ilmava), oikeaan mahtuvat Party ja Basso (tiivis),
    # takapuolen Pizza Love ilmavasti kahdelle palstalle.
    tiheys = (('ilmava', 'tiivis'), ('ilmava vapaa', 'ilmava vapaa'))
    ruudut = ['<section class="sivu"><div class="palsta vasen %s"><div class="sisus"></div></div>'
              '<div class="palsta oikea %s"><div class="sisus"></div></div>%s<i class="taite pysty"></i></section>'
              % (tiheys[n][0], tiheys[n][1], taitteet)
              for n in range(SIVUJA)]
    return '''<!doctype html>
<html lang="{kieli}"><meta charset="utf-8"><title>{title}</title>
<style>
{kirjasimet}
  @page {{ size: 210mm 297mm; margin: 0 }}
  * {{ box-sizing: border-box; margin: 0; padding: 0 }}
  html, body {{ background: #fff }}
  body {{ font-family: Teksti, Arial, sans-serif; color: {musta}; font-size: {pt}pt; line-height: 1.2;
          -webkit-print-color-adjust: exact; print-color-adjust: exact }}
  b {{ font-weight: 700 }}
  .sivu {{ position: relative; width: 210mm; height: 297mm; overflow: hidden }}
  .palsta {{ position: absolute; top: 6mm; bottom: 6mm }}
  .palsta.vasen {{ left: 6mm; right: calc(105mm + 4.5mm) }}
  .palsta.oikea {{ left: calc(105mm + 4.5mm); right: 6mm }}
  .palsta .sisus {{ position: absolute; inset: 0 }}
  .ilmava {{ line-height: 1.3 }}
  .ilmava h2 {{ margin-top: 4.6mm }}
  .ilmava h3 {{ margin-top: 2.6mm }}
  .ilmava .palkki {{ margin: 3mm 0 1.3mm }}
  .ilmava .pelit {{ margin-bottom: 1mm }}
  .ilmava p {{ margin-bottom: 1.1mm }}
  .ilmava .rivi img {{ width: 9mm }}
  .ilmava .pieni-lasku img {{ width: 7.6mm }}
  .ilmava .laskut {{ margin: 1.4mm 0 2.4mm; flex-direction: column; gap: 1.2mm }}
  .ilmava .banneri {{ margin-top: 0 }}
  .ilmava .koti {{ margin-top: 3mm; padding: 1.6mm 2mm .8mm }}
  .ilmava .kaavio svg {{ width: 70mm }}
  .ilmava .vaihtoesim .vaihto img {{ width: 9mm }}
  .ilmava ul.lista li, .ilmava ol.lista li {{ margin-bottom: .7mm }}
  /* takapuoli: Pizza Love väljästi, tilaa on */
  .vapaa {{ line-height: 1.42 }}
  .vapaa h3 {{ margin-top: 4.2mm }}
  .vapaa p {{ margin-bottom: 1.6mm }}
  .vapaa .banneri {{ margin-bottom: 3mm }}
  .vapaa .kaavio svg {{ width: 80mm }}
  .vapaa .vaihtoesim .vaihto img {{ width: 11mm }}
  .vapaa .rivi img {{ width: 11mm }}
  .vapaa ul.lista li, .vapaa ol.lista li {{ margin-bottom: 1.1mm }}
  .tiivis {{ line-height: 1.2 }}
  .tiivis h3 {{ margin: 1.7mm 0 .4mm }}
  .tiivis p {{ margin-bottom: .6mm }}
  .tiivis ul.lista li, .tiivis ol.lista li {{ margin-bottom: .5mm }}
  .tiivis .koti {{ margin-top: 2mm; padding: 1.2mm 1.6mm .5mm }}
  .tiivis .banneri {{ padding: 1.3mm 0 3mm; margin-bottom: 1.6mm }}
  .tiivis .banneri {{ margin-top: 0 }}
  .tiivis .banneri ~ .banneri {{ margin-top: 5mm }}
  .sivu + .sivu {{ break-before: page }}
  .sisus > :first-child {{ margin-top: 0 !important }}
  .taite {{ display: {luonnos_nako}; position: absolute; pointer-events: none }}
  .taite.vaaka {{ left: 0; right: 0; border-top: .2mm dashed #9BB8DD }}
  .taite.pysty {{ top: 0; bottom: 0; left: 105mm; border-left: .2mm dashed #E3A0A0 }}

  h1 {{ font: 700 15pt/1 Otsikko, sans-serif; text-transform: uppercase; color: {oranssi}; margin-top: 1.6mm }}
  h2 {{ font: 700 11pt/1.05 Otsikko, sans-serif; text-transform: uppercase; color: {oranssi};
        margin: 3.6mm 0 1.2mm }}
  h3 {{ font: 700 7.8pt/1.1 Otsikko, sans-serif; text-transform: uppercase; letter-spacing: .015em;
        margin: 1.3mm 0 .4mm }}
  .palkki {{ background: {musta}; color: #fff; padding: .6mm 1.5mm .4mm; margin: 1.3mm 0 .6mm }}
  p {{ margin-bottom: .6mm }}
  .johdanto {{ font-weight: 700 }}
  .pieni {{ font-size: 6.4pt; opacity: .8 }}
  ul.lista, ol.lista {{ margin: 0 0 .5mm 3.4mm }}
  ul.lista li, ol.lista li {{ margin-bottom: .35mm }}
  ol.lista + ol.lista, ul.lista + ul.lista {{ margin-top: -.15mm }}

  .otsake {{ border: .35mm solid {musta}; padding: 3mm 3.4mm 2.6mm; margin-bottom: 2mm }}
  .kansi {{ display: flex; gap: 3.6mm; align-items: center }}
  .kansi .viiri {{ width: 24mm; flex: none }}
  .kansi .viiri svg {{ width: 100%; height: auto; display: block }}
  .kansi h1 {{ margin-top: 0 }}
  .kansi .ala {{ font-weight: 700; font-size: 8pt; margin: .8mm 0 1.2mm }}
  .tiedot {{ list-style: none; display: flex; flex-wrap: wrap; gap: 1mm }}
  .tiedot li {{ background: {musta}; color: #fff; border-radius: .9mm; padding: .8mm 1.5mm .6mm;
                font: 700 6.4pt/1 Otsikko, sans-serif; text-transform: uppercase }}
  .netti {{ display: flex; gap: 3mm; align-items: center; margin-top: 2.4mm; padding-top: 2.2mm;
            border-top: .25mm solid #ccc }}
  .netti #qr svg {{ width: 17mm; height: auto; display: block }}
  .netti p {{ margin: 0 0 .5mm }}
  .netti .qr-teksti {{ font: 700 7pt/1.15 Otsikko, sans-serif; text-transform: uppercase }}
  .netti .ingressi {{ font-weight: 700 }}
  .netti b {{ color: {oranssi} }}
  .oikeudet {{ font-size: 5.8pt; opacity: .75; margin-top: 2mm; border-top: .25mm solid #ccc; padding-top: 1mm }}
  .rivi {{ display: flex; gap: 1mm; margin: .4mm 0 .8mm }}
  .rivi img, .esimerkki img {{ width: 8mm; height: auto; border: .15mm solid {viiva}; border-radius: 8% / 5.3% }}
  .korttirivi .rivi {{ float: right; margin: 0 0 .4mm 2mm }}
  .korttirivi {{ overflow: hidden }}
  .pelit {{ font: 700 7pt/1.15 Otsikko, sans-serif; text-transform: uppercase; color: {oranssi}; margin-bottom: .6mm }}
  .laskut {{ display: flex; flex-wrap: wrap; gap: .5mm 3mm; margin: .2mm 0 .6mm }}
  .esimerkki {{ display: flex; align-items: center; gap: .7mm }}
  .esimerkki b {{ font: 900 9pt/1 Viiri, sans-serif }}
  .pieni-lasku img {{ width: 5.6mm }}
  .laskulaatikko {{ border: .25mm solid {musta}; padding: 1mm 1.6mm .4mm }}
  .laskulista {{ list-style: none; display: grid; grid-template-columns: repeat(4, auto); justify-content: start;
                 column-gap: 4mm; font-weight: 700; margin: .4mm 0 .6mm }}
  .tieto {{ display: flex; gap: 2mm; align-items: center; margin-top: 4mm }}
  .sisus h3.lisatieto {{ border-top: .2mm solid {musta}; padding-top: 4mm; margin-top: 6mm }}
  .tieto img {{ width: 11mm; flex: none }}
  .tieto p {{ margin: 0 }}
  .banneri {{ background: {musta}; color: #fff; text-align: center; padding: 1.3mm 0 3mm; margin: 4mm 0 1mm;
              font: 900 10.5pt/1 Viiri, sans-serif; text-transform: none;
              clip-path: polygon(0 0, 100% 0, 100% 72%, 50% 100%, 0 72%) }}
  .banneri .oranssi {{ color: {oranssi} }}
  .kuvaus {{ font-weight: 700; margin-bottom: .4mm }}
  .koti {{ border: .25mm solid {musta}; padding: 1mm 1.6mm .3mm; margin-top: 1.4mm }}
  .koti h3 {{ margin-top: 0 }}
  .kaavio {{ margin: .8mm 0 }}
  .kaavio svg {{ width: 56mm; height: auto; display: block; margin: 0 auto }}
  .vaihtoesim h3 {{ margin-top: 1.4mm }}
  .vaihtoesim .vaihto {{ justify-content: center; margin: .6mm 0 }}
  .vaihtoesim .vaihto img {{ width: 7.4mm; border-color: {oranssi}; border-width: .35mm }}
  #lahde {{ position: absolute; left: -9999mm; width: 94.5mm }}
  .ylivuoto {{ position: absolute; left: 4mm; top: 4mm; color: red; font: 700 14pt Otsikko, sans-serif }}
</style>
{ruudut}
<div id="lahde">{atomit}</div>
<script src="julkinen/play/qr.js"></script>
<script>
document.getElementById('qr').innerHTML = norsuQrSvg({osoite}, {{ reunus: 4 }});
function pakkaa() {{
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
        kieli=kieli, title=e(s['h1']), kirjasimet=ks.KIRJASIMET, musta=ks.MUSTA, oranssi=ks.ORANSSI,
        viiva=ks.VIIVA, pt=LEIPA_PT, luonnos_nako='block' if luonnos else 'none',
        ruudut=''.join(ruudut), atomit='\n'.join(atomit), osoite=json.dumps(k['osoite']),
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
        b = p.chromium.launch(args=['--allow-file-access-from-files'])
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


def tee(kieli, luonnos):
    # ⚠️ EI julkinen/:iin: rakenna.py kopioi sen verkkoon, ja arkki on
    # painettava luonnos, ei sivuston lataus. Painotiedosto tehdaan erikseen.
    kohde = os.path.join(TANNE, 'paperi', 'koteloarkki', KIELET[kieli]['tiedosto'])
    os.makedirs(os.path.dirname(kohde), exist_ok=True)
    sivu = os.path.join(TANNE, '.koteloarkki-%s.html' % kieli)
    with open(sivu, 'w', encoding='utf-8') as f:
        f.write(sivu_html(kieli, luonnos))
    tulosta(sivu, kohde)
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
    # Tarkoituksella karsitut otsikot (KIELET[kieli]['pois'], muoto '>otsikko<') ohitetaan.
    karsitut = {ks.norm(x.strip('><')) for x in KIELET[kieli].get('pois', []) if x.startswith('>')}
    puuttuu = [o for o in ks.otsikot(os.path.join(TANNE, 'sisalto', kieli + '.json'))
               if ks.norm(o) not in ks.norm(t) and ks.norm(o) not in karsitut]
    if len(t) < 2000:
        print('Sisaltokoe: PDF:sta ei saatu tekstia — EI MITATTAVISSA')
    elif puuttuu:
        print('🔴 SISALTOKOE: arkilta puuttuu: ' + ' · '.join(puuttuu))
        virhe = 1
    else:
        print('Sisaltokoe: kaikki luvut loytyvat arkilta — OK')
    return virhe


def main():
    luonnos = '--puhdas' not in sys.argv
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
