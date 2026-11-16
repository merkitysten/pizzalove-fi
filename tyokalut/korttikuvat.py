#!/usr/bin/env python3
"""Sääntösivujen pienet korttikuvat → julkinen/kuvat/kortti/.

Lähde on PELIN kuvakansio `julkinen/play/kuvat/` (sinne ne tulevat
pizzapartysta, ks. LUE-MINUT.md). Täällä niistä tehdään pienennetyt
kopiot, koska sääntösivun pizzakeittiö näyttää kortin enintään 104
CSS-pikselin levyisenä.

📐 Mitattu 16.11.2026 miksi 240 px eikä alkuperäinen 351 px:
  · puhelin 375 px, kortti 18vw = 67,5 CSS px → 3× näytöllä 203 laitepikseliä
  · työpöytä, kortti clamp-katossa 104 CSS px → 2× näytöllä 208 laitepikseliä
  240 px kattaa molemmat. Painettu kortti on 351 px eli 47 kt; 240 px on 17 kt.
  Esimerkkilohkon kolme korttia: 133 kt → 45 kt, eli sivu KEVENEE 88 kt.

Aja uudelleen vain jos pelin korttikuvat vaihtuvat:

    python3 tyokalut/korttikuvat.py

Vaatii `cwebp` (Homebrew: webp). Jos sitä ei ole, skripti kertoo sen eikä
kirjoita mitään — kuvat ovat repossa, joten sivua voi rakentaa ilman tätä.
"""
import os
import shutil
import subprocess
import sys

JUURI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LAHDE = os.path.join(JUURI, 'julkinen', 'play', 'kuvat')
KOHDE = os.path.join(JUURI, 'julkinen', 'kuvat', 'kortti')
LEVEYS = 240
LAATU = 80

# 📐 Mitattu 16.11.2026 pikseleittäin (dwebp -pam): pelin kuvassa 439×620 itse
# kortti on kohdassa (56,56) kokoa 321×504, eli ympärillä on 56 px läpinäkyvää.
# Sääntösivun oma kuva 351×532 on SAMA kortti samassa koossa, marginaali 16 px.
# Siksi tästä rajataan 16 px:n marginaaliin, jotta uusi kortti on täsmälleen
# samankokoinen kuin sivulla jo olevat (muuten kortti kutistuisi 9 %).
RAJAUS = (40, 40, 351, 532)   # x, y, leveys, korkeus pelin kuvassa

# Täytekortit 1–10 ja fantasiatäyte X: pizzakeittiön valitsin näyttää kaikki,
# ja «Näin pizza tehdään» -osion käännettävä täytekortti selaa saman sarjan.
# `tausta-tayte` on täytekortin SELKÄPUOLI. Pizzakeittiössä se on valitsimen
# «ei korttia» -vaihtoehto: lukija saa ottaa toisen kortin pois ja tehdä pizzan
# yhdellä kortilla. Juuri siinä helpompi tapa ja Basso-apinan tapa eroavat.
# Osiossa «Näin pizza tehdään» selkäpuolet ovat korttien lepotila.
#
# 📐 Viisi pizzakorttia, valittu 16.11.2026 pakan omasta säännöstä (ks.
# julkinen/play/kortit.js; sama sääntö ajettuna Pythonilla antaa 42 korttia ja
# pizza-31 = täytteet 2+3, arvo 5 — sama kortti kuin sivun esimerkissä).
# Sarja näyttää juuri sen minkä viereinen kappale väittää:
#   pizza-31  kaksi täytettä, arvo 5    (sivun oma esimerkkipizza, ensimmäisenä)
#   pizza-48  kolme täytettä, arvo 8
#   pizza-54  neljä täytettä, arvo 10   (pakan AINOA nelitäytteinen, sydän)
#   pizza-13  yksi täyte, arvo 1        (pienin)
#   pizza-22  yksi täyte, arvo 10       (sydänpizzassa voi olla yksi täyte)
# Koko 42 kortin pakka olisi 670 kt kuvia reposta; viisi riittää väitteen
# näyttämiseen. Ne latautuvat vasta painalluksesta, ks. julkinen/sivu.js.
KORTIT = (['tayte-%d' % n for n in range(1, 11)] + ['tayte-x', 'tausta-tayte'] +
          ['pizza-%d' % n for n in (13, 31, 48, 54, 22)] + ['tausta-pizza'])


def main():
    if not shutil.which('cwebp'):
        print('⚠️  cwebp puuttuu (brew install webp) – ei kirjoitettu mitään')
        return 1
    os.makedirs(KOHDE, exist_ok=True)
    yht = 0
    for nimi in KORTIT:
        sisaan = os.path.join(LAHDE, nimi + '.webp')
        if not os.path.exists(sisaan):
            print('⚠️  %s puuttuu' % sisaan)
            continue
        ulos = os.path.join(KOHDE, nimi + '.webp')
        subprocess.run(['cwebp', '-quiet', '-q', str(LAATU),
                        '-crop'] + [str(n) for n in RAJAUS] +
                       ['-resize', str(LEVEYS), '0', sisaan, '-o', ulos], check=True)
        yht += os.path.getsize(ulos)
    print('%d korttia, %d kt → %s' % (len(KORTIT), yht // 1024, KOHDE))
    return 0


if __name__ == '__main__':
    sys.exit(main())
