#!/usr/bin/env python3
"""Lautapelin omat kortit verkkokokoon → julkinen/kuvat/lautapeli/.

Lähde on Markon toimittama kansio REPON ULKOPUOLELLA (804 × 804 px PNG,
pizzakortit ~590 kt/kpl eli 23 Mt, apinakortit ~78 kt/kpl eli 3,5 Mt).
Alkuperäisiä ei muuteta eikä kopioida repoon; täällä niistä tehdään
verkkokokoiset WebP-kopiot.

📐 MIKSI 320 px, mitattu 18.11.2026 sivuston omista käytöistä:
      190 px  .ak__yksikortti — yksi iso apinakortti (käyttää omaa
              apinavaaka/apinakortti.webp-kuvaa, 520 × 520)
      116 px  .ak__opaspizza — voittoanimaation pizzakortti
       92 px  .ak__paripizza
       60 px  valmisteluanimaation kortti
       46 px  .ak__vpakka / .ak__vboksi
  Sivuston oma sääntö (tyokalut/korttikuvat.py) on 2–3× näyttökoko, ja
  pelin oma apinakortti.webp noudattaa samaa: 520 px / 190 px = 2,7×.
  320 px antaa saman 2,7-kertaisen varan suurimpaan NÄISTÄ kuvista
  tehtyyn käyttöön (116 px) ja 7-kertaisen pienimpään.

  Vaihtoehdot mitattuna (43 pizzakorttia + 34 apinakorttia, -q 80):
      240 px → 0,75 Mt · 280 px → 0,92 Mt · 320 px → 1,1 Mt
      400 px → 1,5 Mt · 520 px → n. 2,4 Mt
  520 px kattaisi myös 190 px:n paikan, mutta maksaisi 1,3 Mt lisää 77
  tiedostossa. Jos oikeat kortit joskus halutaan siihen paikkaan isoina,
  nosta LEVEYS ja aja tämä uudelleen — se on yksi luku tässä tiedostossa.

⚠️ NUMEROINTI. Apinakorttien tiedostonimet ovat lähteessä 43–75, mutta
kortteihin on painettu 01–33. Tässä nimetään kohdenumeron mukaan
(apinakortti-43.png → apinakortti-01.webp), koska sivuston koko muu
koodi ja sisalto/apinakortit-*.json puhuvat korteista 01–33.
Todennettu 18.11.2026 katsomalla kaikki 33 korttia: jokaiseen on
painettu oma numeronsa kulmaan, ja tiedostonumero − 42 = painettu numero
poikkeuksetta. Lisäksi kuvasymbolit täsmäävät ohjeteksteihin (kortti 18
«+1», 19 «−1», 22 «3:lla jaolliset» → «3», 24 «pienet» → «<6»,
26 «kaikki» → «∞», 27 «peru apinakortin vaikutus» → yliviivattu apina).

⚠️ Pizzakorttien numerointi EI ole sama kuin korttipelissä. Lautapelin
pizzakortti-01 on korttipelin kuva pizza-13 (ks. julkinen/play/kortit.js,
ENSIMMAINEN_PIZZAKUVA). Todennettu 18.11.2026 kaikista 42 kortista:
lautapelin kortti NN:n täytteet ja arvo ovat täsmälleen ne, jotka
`pizzapakka()` antaa pakan NN:nnelle kortille.

Aja uudelleen vain jos kortit vaihtuvat tai LEVEYS muuttuu:

    python3 tyokalut/lautakortit.py

Vaatii `cwebp` (Homebrew: webp). Jos sitä ei ole, skripti kertoo sen eikä
kirjoita mitään — kuvat ovat repossa, joten sivua voi rakentaa ilman tätä.
"""
import os
import shutil
import subprocess
import sys

JUURI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LAHDE = os.path.join(os.path.dirname(JUURI), 'Lautapelin kortit')
KOHDE = os.path.join(JUURI, 'julkinen', 'kuvat', 'lautapeli')
LEVEYS = 320
LAATU = 80

PIZZOJA = 42
APINOITA = 33
APINA_SIIRTYMA = 42          # tiedosto 43 = kortti 01


def tee(sisaan, ulos):
    subprocess.run(['cwebp', '-quiet', '-q', str(LAATU),
                    '-resize', str(LEVEYS), '0', sisaan, '-o', ulos], check=True)
    return os.path.getsize(ulos)


def main():
    if not shutil.which('cwebp'):
        print('⚠️  cwebp puuttuu (brew install webp) – ei kirjoitettu mitään')
        return 1
    pk = os.path.join(LAHDE, 'Pizzakortit_lautapeli')
    ak = os.path.join(LAHDE, 'Apinakortit_lautapeli')
    for k in (pk, ak):
        if not os.path.isdir(k):
            print('⚠️  lähdekansio puuttuu: %s' % k)
            return 1
    os.makedirs(KOHDE, exist_ok=True)

    tyot = [(os.path.join(pk, 'pizzakortti-%02d.png' % n), 'pizzakortti-%02d.webp' % n)
            for n in range(1, PIZZOJA + 1)]
    tyot.append((os.path.join(pk, 'selkäpuoli_pizzakortti_lautapeli.png'),
                 'selkapuoli-pizzakortti.webp'))
    for n in range(1, APINOITA + 1):
        tyot.append((os.path.join(ak, 'apinakortti-%d.png' % (n + APINA_SIIRTYMA)),
                     'apinakortti-%02d.webp' % n))
    tyot.append((os.path.join(ak, 'selkäpuoli_apinakortti_lautapeli.png'),
                 'selkapuoli-apinakortti.webp'))

    puuttuu = [s for s, _ in tyot if not os.path.exists(s)]
    if puuttuu:
        print('⚠️  lähdetiedostoja puuttuu (%d kpl), ei kirjoitettu mitään:' % len(puuttuu))
        for s in puuttuu[:5]:
            print('    ', s)
        return 1

    yht = 0
    for sisaan, nimi in tyot:
        yht += tee(sisaan, os.path.join(KOHDE, nimi))
    print('%d kuvaa, %d px leveinä, %.2f Mt → %s'
          % (len(tyot), LEVEYS, yht / 1024 / 1024, KOHDE))
    return 0


if __name__ == '__main__':
    sys.exit(main())
