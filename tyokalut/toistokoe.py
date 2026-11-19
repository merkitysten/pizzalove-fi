# -*- coding: utf-8 -*-
"""Konekäännöksen TOISTETTAVUUS: mikä kohta vaihtelee ajosta toiseen?

🔵 Marko 19.11.2026: *«jotta meillä pysyy käännökset mahd. oikeina, niin se
kontrolli syntyy siitä, että käännöstä verrataan samaan aikaan useampaan eri
kieleen vai olenko väärässä?»* — Kolme kieltä (fi/en/sv) menee mallille
SYÖTTEENÄ, mutta tarkistus (`kaanna.tarkista`) vertaa vain englantiin ja vain
RAKENNETTA: avaimet, luvut, HTML. Merkitystä ei tarkista mikään.

Tämä työkalu ei kysy *onko käännös oikein* — siihen tarvittaisiin ihminen, joka
osaa kielen. Se kysyy halvemman ja mitattavan kysymyksen:

    ⚠️ MIKÄ KOHTA EI OLE SAMA, KUN SAMA KÄÄNNÖS TEHDÄÄN UUDELLEEN?

Kohta joka toistuu sanasta sanaan on mallille yksikäsitteinen: lähde sanoo sen
niin selvästi, ettei muuta tulkintaa ole. Kohta joka vaihtelee on kohta, jossa
malli VALITSEE — ja valinta voi mennä väärin ilman että yksikään rakennetarkistus
huomaa. Sama menetelmä kuin Norsun puolella: *«viisi kertaa sama jäsennys
tarkoittaa rakennetta, vaihteleva tarkoittaa arvausta»*.

⚠️ VAKAUS EI OLE OIKEELLISUUS. Malli voi toistaa saman virheen joka kerta, ja
silloin tämä mittari on vihreä. Se kertoo MISSÄ ihmisen kannattaa katsoa, ei
sitä onko teksti oikein. Se on tämän työkalun raja, ja se on sanottava ääneen.

Luokat (vain kaksi niistä on objektiivisia, loput järjestetään):
  sama        merkki merkiltä sama (välilyöntien normalisoinnin jälkeen)
  rakenne     luvut tai HTML-tagit eroavat — EI SAA ESIINTYÄ: kaanna.tarkista
              hylkää sellaisen, joten osuma tarkoittaa että korjauskierros
              paikkasi sen toisessa ajossa ja jotain jäi silti erilleen
  ero         sama rakenne, eri teksti — järjestetään samankaltaisuuden mukaan,
              epävakain ensin. ⛔ EI kynnystä «tämä on liikaa»: sellaista lukua
              ei voi johtaa mistään, ja keksitty kynnys olisi mielipide
              mittauksen asussa.

Ajo:
    python3 tyokalut/toistokoe.py a.json b.json [c.json ...]
    python3 tyokalut/toistokoe.py --itsetesti [--mutaatiot]

Käännösten tuottaminen (maksaa, vaatii API-tunnukset → ajetaan GitHub
Actionsissa): python3 tyokalut/kaanna.py --toisto <kieli>
"""
import difflib
import json
import os
import re
import sys

TANNE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(TANNE, 'tyokalut'))

# Kentät joita ei käännetä (kaanna.EI_KAANNETA) jätetään pois: ne ovat
# määritelmän mukaan samat joka ajossa, ja ne nostaisivat vakausluvun
# keinotekoisesti. ⚠️ Luetaan kaanna.py:stä, ei kirjoiteta tähän uudelleen.
try:
    import kaanna
    EI_KAANNETA = set(kaanna.EI_KAANNETA)
    LUVUT = kaanna.luvut
    TAGIT = kaanna.tagit
except Exception:                                    # langcodes puuttuu: omat vastineet
    EI_KAANNETA = {'avain', 'numero', 'nimi', 'esimerkit'}

    def LUVUT(s):
        return sorted(re.findall(r'\d+', re.sub(r'<[^>]+>', '', s)))

    def TAGIT(s):
        return sorted(re.findall(r'<\s*(/?[a-z0-9]+)((?:\s+class="[^"]*")?)', s))

# Vertailtavat lohkot. 'kielet':n 'tiedosto' ja 'osoite' asetetaan koodissa
# (kaanna.tallenna), joten ne eivät ole käännöksen vaihtelua.
LOHKOT = ('korttipeli', 'kielet', 'ui')
OHITA = {'kielet.tiedosto', 'kielet.osoite'}


def tyhja(s):
    return re.sub(r'\s+', ' ', s).strip()


def kentat(x, polku='', ulos=None):
    """Kaikki käännettävät merkkijonokentät {polku: teksti}."""
    ulos = {} if ulos is None else ulos
    if isinstance(x, dict):
        for a, v in x.items():
            if a in EI_KAANNETA:
                continue
            kentat(v, '%s.%s' % (polku, a) if polku else a, ulos)
    elif isinstance(x, (list, tuple)):
        for i, v in enumerate(x):
            kentat(v, '%s[%d]' % (polku, i), ulos)
    elif isinstance(x, str) and polku not in OHITA:
        ulos[polku] = x
    return ulos


def luokka(a, b):
    """'sama' · 'rakenne' · 'ero'."""
    if tyhja(a) == tyhja(b):
        return 'sama'
    if LUVUT(a) != LUVUT(b) or TAGIT(a) != TAGIT(b):
        return 'rakenne'
    return 'ero'


def samankaltaisuus(a, b):
    """0–1 merkkitasolla. Merkkitaso tarkoituksella: se toimii myös kielissä
    joissa sanoja ei eroteta välilyönnillä (kiina, japani, thai)."""
    return difflib.SequenceMatcher(None, tyhja(a), tyhja(b)).ratio()


def vertaile(kaannokset):
    """kaannokset = [dict, dict, ...] samasta kielestä. Palauttaa raportin."""
    joukot = [kentat({k: d.get(k) for k in LOHKOT if k in d}) for d in kaannokset]
    yhteiset = set(joukot[0])
    for j in joukot[1:]:
        yhteiset &= set(j)
    puuttuvat = sorted(set(joukot[0]) ^ set(joukot[-1]))

    rivit = []
    for polku in sorted(yhteiset):
        tekstit = [j[polku] for j in joukot]
        # Monella ajolla: pahin pari ratkaisee (yksikin eriävä ajo on vaihtelua).
        pahin, pahinL, pahinS = (tekstit[0], tekstit[0]), 'sama', 1.0
        for i in range(len(tekstit)):
            for j in range(i + 1, len(tekstit)):
                l = luokka(tekstit[i], tekstit[j])
                s = samankaltaisuus(tekstit[i], tekstit[j])
                if (l != 'sama' and pahinL == 'sama') or s < pahinS:
                    pahin, pahinL, pahinS = (tekstit[i], tekstit[j]), l, s
        rivit.append({'polku': polku, 'luokka': pahinL, 'samankaltaisuus': pahinS,
                      'a': pahin[0], 'b': pahin[1]})
    return {'rivit': rivit, 'puuttuvat': puuttuvat}


def tuomio(raportti, naytteita=10, tuloste=True):
    rivit = raportti['rivit']
    if not rivit:
        if tuloste:
            print('🔴 EI MITATTAVISSA: yhteisiä kenttiä ei ole')
        return 1
    maarat = {'sama': 0, 'rakenne': 0, 'ero': 0}
    for r in rivit:
        maarat[r['luokka']] += 1
    vakaus = 100.0 * maarat['sama'] / len(rivit)
    if tuloste:
        print('Kenttiä: %d' % len(rivit))
        print('  sama merkki merkiltä : %4d  (%.1f %% — vakaus)' % (maarat['sama'], vakaus))
        print('  eri teksti           : %4d' % maarat['ero'])
        print('  rakenne eroaa        : %4d%s' % (maarat['rakenne'],
                                                  '  🔴' if maarat['rakenne'] else ''))
        if raportti['puuttuvat']:
            print('  🔴 kenttiä vain toisessa ajossa: %s' % ' · '.join(raportti['puuttuvat'][:5]))
        # ⚠️ Rakenne-ero ensin, vasta sitten samankaltaisuus. 📐 Mitattu
        # 19.11.2026: yhden luvun muutos antaa samankaltaisuuden 0,99, joten
        # pelkka jarjestaminen hautasi objektiivisen vian listan hantaan.
        epavakaat = sorted([r for r in rivit if r['luokka'] != 'sama'],
                           key=lambda r: (r['luokka'] != 'rakenne', r['samankaltaisuus']))
        if epavakaat:
            print('\nEpävakaimmat kohdat (ihmisen katsottavaksi, epävakain ensin):')
            for r in epavakaat[:naytteita]:
                merkki = '🔴' if r['luokka'] == 'rakenne' else '  '
                print('%s %-38s samankaltaisuus %.2f' % (merkki, r['polku'][:38],
                                                         r['samankaltaisuus']))
                print('     A: %s' % tyhja(r['a'])[:110])
                print('     B: %s' % tyhja(r['b'])[:110])
        print('\n⚠️ Vakaus ei ole oikeellisuus: toistuva virhe näkyy tässä vihreänä.')
    # Paluuarvo: rakenne-ero tai puuttuva kenttä on vika, pelkkä sanavalinta ei.
    return 1 if (maarat['rakenne'] or raportti['puuttuvat']) else 0


# ------------------------------------------------------------------ itsetesti
def _lahde():
    for nimi in ('pl.json', 'ja.json'):
        p = os.path.join(TANNE, 'sisalto', 'konekaannos', nimi)
        if os.path.exists(p):
            return json.load(open(p, encoding='utf-8'))
    return None


def _muuta(d, polku, f):
    """Muuttaa yhden kentän kopiossa. Polku kuten kentat():n avaimet."""
    d = json.loads(json.dumps(d))
    osat = re.findall(r'[^.\[\]]+', polku)
    kohde = d
    for o in osat[:-1]:
        kohde = kohde[int(o)] if o.isdigit() else kohde[o]
    avain = int(osat[-1]) if osat[-1].isdigit() else osat[-1]
    kohde[avain] = f(kohde[avain])
    return d


def itsetesti(mutaatiot=False):
    """⚠️ Koe tehdään OIKEALLA käännöksellä ja sen muunnelmilla: keksitty
    aineisto todistaisi vain itsensä."""
    lahde = _lahde()
    if lahde is None:
        print('EI MITATTAVISSA: sisalto/konekaannos/ on tyhjä')
        return 1
    kaikki = kentat({k: lahde.get(k) for k in LOHKOT if k in lahde})
    print('Itsetesti: %d käännettävää kenttää lähteessä' % len(kaikki))
    virheet = []

    # 1) sama vastaan sama → vakaus 100 %
    r = vertaile([lahde, json.loads(json.dumps(lahde))])
    maarat = {}
    for x in r['rivit']:
        maarat[x['luokka']] = maarat.get(x['luokka'], 0) + 1
    if maarat.get('sama') != len(r['rivit']):
        virheet.append('identtiset ajot eivät antaneet 100 %% vakautta: %s' % maarat)

    # 2) pelkkä välilyöntiero ei ole vaihtelua
    polku = sorted(kaikki)[0]
    r = vertaile([lahde, _muuta(lahde, polku, lambda s: '  ' + s.replace(' ', '  ') + ' ')])
    if next(x['luokka'] for x in r['rivit'] if x['polku'] == polku) != 'sama':
        virheet.append('välilyöntiero luettiin vaihteluksi')

    if mutaatiot:
        # 3) sanavalinnan muutos → 'ero', ei 'rakenne'
        # ⚠️ Kenttä ilman HTML:ää. Ensimmäinen versio otti pisimmän kentän, ja
        # se oli HTML:ää: korvattava «sana» osui tagin sisään ja rikkoi sen,
        # jolloin koe sanoi tyokalun luokittelevan sanavalinnan rakenne-eroksi.
        # Vika oli kokeessa, ei mitattavassa.
        pitka = max((p for p in kaikki if '<' not in kaikki[p] and len(kaikki[p].split()) > 2),
                    key=lambda p: len(kaikki[p]))
        r = vertaile([lahde, _muuta(lahde, pitka, lambda s: s.replace(s.split()[1], 'XYZZY', 1))])
        osuma = next(x for x in r['rivit'] if x['polku'] == pitka)
        if osuma['luokka'] != 'ero':
            virheet.append('sanavalinnan muutos luokittui %r' % osuma['luokka'])

        # 4) luvun muutos → 'rakenne'
        numerollinen = next((p for p in sorted(kaikki) if LUVUT(kaikki[p])), None)
        if numerollinen:
            r = vertaile([lahde, _muuta(lahde, numerollinen,
                                        lambda s: re.sub(r'\d+', '99', s, count=1))])
            if next(x['luokka'] for x in r['rivit'] if x['polku'] == numerollinen) != 'rakenne':
                virheet.append('luvun muutos ei luokittunut rakenne-eroksi')
        else:
            virheet.append('EI MITATTAVISSA: lähteessä ei ole numerollista kenttää')

        # 5) tagin poisto → 'rakenne'
        tagillinen = next((p for p in sorted(kaikki) if '<b>' in kaikki[p]), None)
        if tagillinen:
            r = vertaile([lahde, _muuta(lahde, tagillinen,
                                        lambda s: s.replace('<b>', '', 1).replace('</b>', '', 1))])
            if next(x['luokka'] for x in r['rivit'] if x['polku'] == tagillinen) != 'rakenne':
                virheet.append('tagin poisto ei luokittunut rakenne-eroksi')
        else:
            virheet.append('EI MITATTAVISSA: lähteessä ei ole <b>-kenttää')

        # 6) pudonnut kenttä → 'puuttuvat'
        # ⚠️ Lohko valitaan SIITÄ MITÄ LÄHTEESSÄ ON: vanhemmista
        # konekäännöksistä puuttuu 'ui' (se lisätään --taydenna-ajossa), ja
        # kiinteä lohkonimi kaataisi kokeen aineiston mukana.
        vajaa = json.loads(json.dumps(lahde))
        lohko = next((k for k in LOHKOT
                      if isinstance(vajaa.get(k), dict)
                      and any(isinstance(v, str) for v in vajaa[k].values())), None)
        if lohko is None:
            virheet.append('EI MITATTAVISSA: lähteessä ei ole lohkoa josta pudottaa kenttä')
        else:
            avain = sorted(a for a, v in vajaa[lohko].items() if isinstance(v, str))[0]
            del vajaa[lohko][avain]
            if '%s.%s' % (lohko, avain) not in vertaile([lahde, vajaa])['puuttuvat']:
                virheet.append('pudonnut kenttä ei näkynyt puuttuvissa')

        # 7) järjestys ei saa vaikuttaa
        r1 = vertaile([lahde, _muuta(lahde, pitka, lambda s: s + ' ZZZ')])
        r2 = vertaile([_muuta(lahde, pitka, lambda s: s + ' ZZZ'), lahde])
        if [x['luokka'] for x in r1['rivit']] != [x['luokka'] for x in r2['rivit']]:
            virheet.append('vertailu ei ole symmetrinen')

    for v in virheet:
        print('🔴 ' + v)
    print('Itsetesti: %s' % ('🔴 %d virhettä' % len(virheet) if virheet else 'OK'))
    return 1 if virheet else 0


def main():
    if '--itsetesti' in sys.argv:
        return itsetesti('--mutaatiot' in sys.argv)
    polut = [a for a in sys.argv[1:] if not a.startswith('--')]
    if len(polut) < 2:
        print(__doc__.strip().splitlines()[-4])
        print('Käyttö: toistokoe.py a.json b.json [c.json ...]')
        return 1
    kaannokset = [json.load(open(p, encoding='utf-8')) for p in polut]
    kielet = {d.get('kieli') for d in kaannokset if d.get('kieli')}
    if len(kielet) > 1:
        print('🔴 Eri kieliä (%s) — toistettavuutta mitataan SAMASTA kielestä' % ', '.join(kielet))
        return 1
    print('Toistettavuus: %s, %d ajoa' % (kielet.pop() if kielet else '?', len(kaannokset)))
    return tuomio(vertaile(kaannokset))


if __name__ == '__main__':
    sys.exit(main())
