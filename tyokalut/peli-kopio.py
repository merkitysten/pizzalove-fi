# -*- coding: utf-8 -*-
"""Peli tulee pizzapartysta — tämä kopioi sen tänne.

🔵 Marko 11.11.2026: «Tee pizzapartysta lähde ja kopiointi koneelliseksi.»

⚠️ MIKSI: `julkinen/play/` on ollut KÄSIN tehty kopio `../pizzaparty/`:sta, ja
📐 11.11.2026 mitattuna 17 tiedostoa 40:stä oli ajautunut erilleen — 12 niistä
MOLEMPIIN suuntiin. Se tarkoittaa, että kumpi tahansa suunta pelkkänä
kopiointina olisi pyyhkinyt toisen puolen työt pois ilman yhtäkään virhettä:
pizzalove.fi ei ollut koskaan saanut pizzapartyn 21.10. työtä (pakollinen
pelaajanimi), ja pizzaparty ei tiennyt tämän päivän kieliä eikä
asetusmuutosta.

SÄÄNNÖT
  · lähde on `../pizzaparty/`, kohde `julkinen/play/`
  · kopioidaan TASAN se joukko joka kohteessa jo on (40 tiedostoa + neljä
    kansiota). Uusi pelitiedosto on siis lisättävä kerran käsin — silloin
    sivustolle ei koskaan ilmesty mitään jota kukaan ei ole päättänyt
  · `?v=`-leimat ovat SIVUSTON omaa tietoa eivätkä tule lähteestä: ne
    lasketaan sisällön tiivisteestä kopioinnin jälkeen. Siksi vertailu
    normalisoi leimat — muuten joka ajo näyttäisi 23 valheellista eroa
  · ⛔ EI KIRJOITA, jos tiedosto on muuttunut MOLEMMISSA. Silloin kopiointi
    hävittäisi työtä, ja työkalu kertoo mitkä tiedostot on sulautettava
    lähteeseen ensin

KÄYTTÖ
  python3 tyokalut/peli-kopio.py            tilanne (ei kirjoita; rc 1 jos estettyjä)
  python3 tyokalut/peli-kopio.py --kopioi   kopioi sen mikä on turvallista
  python3 tyokalut/peli-kopio.py --kopioi --pakota   myös kaksisuuntaiset (hävittää työtä)
"""
import hashlib
import io
import os
import re
import shutil
import sys

TANNE = os.path.dirname(os.path.abspath(__file__))
JUURI = os.path.dirname(TANNE)
LAHDE = os.path.abspath(os.path.join(JUURI, '..', 'pizzaparty'))
KOHDE = os.path.join(JUURI, 'julkinen', 'play')
LEIMA = re.compile(r'\?v=[\w.-]+')
TEKSTI = ('.js', '.css', '.html', '.json', '.py', '.svg', '.txt', '.md')


def julkaistut():
    """Kohteessa jo olevat tiedostot, polkuina kohteen juuresta."""
    ulos = []
    for kansio, _, nimet in os.walk(KOHDE):
        for n in sorted(nimet):
            if n == '.DS_Store':
                continue
            ulos.append(os.path.relpath(os.path.join(kansio, n), KOHDE))
    return sorted(ulos)


def sisalto(polku):
    with open(polku, 'rb') as f:
        return f.read()


def vertailtava(polku):
    """Sisältö ilman `?v=`-leimoja. Binääri palautetaan sellaisenaan."""
    raaka = sisalto(polku)
    if not polku.endswith(TEKSTI):
        return raaka
    return LEIMA.sub('?v=X', raaka.decode('utf-8', 'replace')).encode('utf-8')


def git_vanha(repo, polku):
    """Tiedoston sisältö repon edellisessä commitissa, tai None."""
    import subprocess
    try:
        return subprocess.run(['git', '-C', repo, 'show', 'HEAD:' + polku],
                              capture_output=True, check=True).stdout
    except Exception:
        return None


def tila():
    """Luokittelee jokaisen julkaistun tiedoston."""
    ulos = {'sama': [], 'puuttuu': [], 'lahde': [], 'kohde': [], 'molemmat': []}
    for suht in julkaistut():
        a = os.path.join(KOHDE, suht)
        b = os.path.join(LAHDE, suht)
        if not os.path.exists(b):
            ulos['puuttuu'].append(suht)
            continue
        va, vb = vertailtava(a), vertailtava(b)
        if va == vb:
            ulos['sama'].append(suht)
            continue
        # Kumpi on liikkunut? Vertailukohtana kummankin repon HEAD.
        pa = git_vanha(JUURI, os.path.join('julkinen', 'play', suht))
        pb = git_vanha(LAHDE, suht)
        kohde_muuttui = pa is not None and LEIMA.sub(
            '?v=X', pa.decode('utf-8', 'replace')).encode('utf-8') != va
        lahde_muuttui = pb is not None and LEIMA.sub(
            '?v=X', pb.decode('utf-8', 'replace')).encode('utf-8') != vb
        # HEADiin committoitu ero on se joka ratkaisee: kumpi sisältää toisen?
        if pa is not None and pb is not None and pa == pb:
            ulos['lahde' if not kohde_muuttui else 'molemmat'].append(suht)
        else:
            ulos['molemmat'].append(suht)
    return ulos


def leimaa():
    """`?v=` jokaiselle HTML:n viittaamalle js/css-tiedostolle sisällöstä."""
    muutettu = 0
    for suht in julkaistut():
        if not suht.endswith('.html'):
            continue
        p = os.path.join(KOHDE, suht)
        teksti = io.open(p, encoding='utf-8').read()
        kansio = os.path.dirname(os.path.join(KOHDE, suht))
        uusi = re.sub(r'(?:src|href)="([\w./-]+\.(?:js|css))(?:\?v=[\w.-]+)?"',
                      lambda m: korvaa_apu(m, kansio), teksti)
        if uusi != teksti:
            io.open(p, 'w', encoding='utf-8').write(uusi)
            muutettu += 1
    return muutettu


def korvaa_apu(m, kansio):
    nimi = m.group(1)
    kohde = os.path.normpath(os.path.join(kansio, nimi))
    if not os.path.exists(kohde):
        return m.group(0)
    t = hashlib.sha256(sisalto(kohde)).hexdigest()[:8]
    alku = m.group(0).split('=')[0]
    return '%s="%s?v=%s"' % (alku, nimi, t)


def kokoero(suht):
    """Montako riviä on vain kohteessa ja montako vain lähteessä.

    ⚠️ Tämä on se luku jolla sulautuksen työmäärän näkee ennen kuin siihen
    ryhtyy — «molemmat muuttuneet» yksin ei kerro onko kyse yhdestä rivistä
    vai tuhannesta."""
    import difflib
    a = os.path.join(KOHDE, suht)
    b = os.path.join(LAHDE, suht)
    if not os.path.exists(b) or not suht.endswith(TEKSTI):
        return ''
    ra = vertailtava(a).decode('utf-8', 'replace').split('\n')
    rb = vertailtava(b).decode('utf-8', 'replace').split('\n')
    d = list(difflib.unified_diff(ra, rb, n=0))
    vain_k = sum(1 for x in d if x.startswith('-') and not x.startswith('---'))
    vain_l = sum(1 for x in d if x.startswith('+') and not x.startswith('+++'))
    return 'vain täällä %d riviä · vain lähteessä %d riviä' % (vain_k, vain_l)


def main():
    kopioi = '--kopioi' in sys.argv
    pakota = '--pakota' in sys.argv
    if not os.path.isdir(LAHDE):
        print('🔴 Lähdettä ei ole: %s' % LAHDE)
        return 2
    t = tila()
    print('Lähde: %s' % LAHDE)
    print('Kohde: %s' % KOHDE)
    print('  samat (leimat normalisoituna): %d' % len(t['sama']))
    for avain, otsikko in [('lahde', 'vain lähde edellä — kopioidaan'),
                           ('kohde', 'vain kohde edellä — EI kopioida'),
                           ('molemmat', 'MOLEMMAT muuttuneet — sulauta lähteeseen ensin'),
                           ('puuttuu', 'ei lähteessä — jätetään rauhaan')]:
        if t[avain]:
            print('  %s (%d):' % (otsikko, len(t[avain])))
            for f in t[avain]:
                print('      %-26s %s' % (f, kokoero(f)))
    estetty = t['molemmat'] + t['kohde']
    if kopioi:
        if estetty and not pakota:
            print('\n⛔ Ei kopioitu: %d tiedostoa menettäisi työtä. '
                  'Sulauta ne pizzapartyyn ensin.' % len(estetty))
            return 1
        vietavat = t['lahde'] + (estetty if pakota else [])
        for suht in vietavat:
            shutil.copy2(os.path.join(LAHDE, suht), os.path.join(KOHDE, suht))
        n = leimaa()
        if pakota and estetty:
            # ⚠️ Ohitus kirjataan nimeltä: «pakotettu» ilman listaa on sama kuin
            # vaiennettu hälytys — jälkikäteen ei näe mitä se kosketti.
            print('\n⚠️ PAKOTETTU %d tiedostoa (mahdollinen työn menetys):' % len(estetty))
            for f in estetty:
                print('      %s' % f)
        print('\nKopioitu %d tiedostoa · leimat laskettu %d sivulle' % (len(vietavat), n))
        return 0
    if estetty:
        print('\n⚠️ %d tiedostoa estäisi kopioinnin.' % len(estetty))
        return 1
    print('\nValmis kopioitavaksi.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
