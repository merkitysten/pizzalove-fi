#!/usr/bin/env python3
"""Pizza Love -pelit: party.html (Pizza Party) ja basso.html (Pizza Basso)
rakennetaan YHDESTÄ pohjasta: sivupohja.html.

🔵 Marko 9.10.2026: «Nämä pitäisi jotenkin yhtenäistää siellä koodissa — — että
peli on oikeasti yksi ja sama, jolloin tyylimuutokset menisivät kerralla
kaikkialle.» Mitattu ennen: sivuilla oli valikko, asetukset ja tulosruutu
kahteen kertaan, ja ne olivat vain 49–57 % samanlaisia.

Ajo:  python3 sivut.py           rakentaa molemmat sivut
      python3 sivut.py --tarkista  paluuarvo 1 jos sivu ei vastaa pohjaa
                                   (joku muokkasi valmista sivua ohi pohjan)

⚠️ ÄLÄ MUOKKAA party.html:ää EIKÄ basso.html:ää KÄSIN — muuta sivupohja.html
ja aja tämä. Pohjan merkinnät ovat omilla riveillään:

    <!--@party-->   vain Partyn sivulle …
    <!--@basso-->   … ja/tai vain Basson sivulle …
    <!--@/-->       loppu

Kaikki merkintöjen ulkopuolella on molemmilla sivuilla.
"""
import os, sys

JUURI = os.path.dirname(os.path.abspath(__file__))
POHJA = os.path.join(JUURI, 'sivupohja.html')
# ⚠️ `index.html` EI OLE TÄSSÄ: se on etuovi (pelin valinta), ei pelisivu.
# Marko 20.10.2026: «pitäisikö olla oma landingpage, josta sitten valitaan
# korttipeli vs. lautapeli ja edelleen näiden sisällä ne eri pelimuodot».
# Ennen Pizza Party OLI index.html, eli etuovi ja peli olivat sama sivu -
# siitä seurasi että «Liity peliin» oli pelikohtainen ja että Apinavaakaan
# mentiin Pizza Partyn sivun sisältä.
SIVUT = {'party': 'party.html', 'basso': 'basso.html'}


def rakenna(peli, rivit):
    ulos, tila = [], None          # tila: None = molemmat, muuten 'party' / 'basso'
    for n, r in enumerate(rivit, 1):
        s = r.strip()
        if s in ('<!--@party-->', '<!--@basso-->'):
            tila = s[5:-3]
            continue
        if s == '<!--@/-->':
            if tila is None:
                sys.exit('sivupohja.html:%d: <!--@/--> ilman alkua' % n)
            tila = None
            continue
        if s.startswith('<!--@'):
            sys.exit('sivupohja.html:%d: tuntematon merkintä %s' % (n, s))
        if tila is None or tila == peli:
            ulos.append(r)
    if tila is not None:
        sys.exit('sivupohja.html: merkintä <!--@%s--> jäi auki' % tila)
    return ''.join(ulos)


def main():
    rivit = open(POHJA, encoding='utf-8').readlines()
    tarkista = '--tarkista' in sys.argv
    virheita = 0
    for peli, nimi in SIVUT.items():
        sisalto = rakenna(peli, rivit)
        polku = os.path.join(JUURI, nimi)
        nyt = open(polku, encoding='utf-8').read() if os.path.exists(polku) else None
        if tarkista:
            if nyt != sisalto:
                print('✗ %s ei vastaa pohjaa — muokattu käsin? Muuta sivupohja.html ja aja python3 sivut.py' % nimi)
                virheita += 1
            else:
                print('✓ %s = pohja' % nimi)
        elif nyt != sisalto:
            open(polku, 'w', encoding='utf-8').write(sisalto)
            print('kirjoitettu %s' % nimi)
        else:
            print('ennallaan %s' % nimi)
    sys.exit(1 if virheita else 0)


if __name__ == '__main__':
    main()
