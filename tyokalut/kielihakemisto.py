#!/usr/bin/env python3
"""Kielihakemisto kielivalitsimeen: julkinen/kielet.json.

🔵 Marko 16.11.2026: «Onko siellä joku hakemisto maittain ja liputtain? Ehkä
pitäisi olla. Tai siis pitäisikin.»

⚠️ TÄMÄ EI OLE UUSI KIELILISTA, vaan kaanna.py:n OMAN säännön tulos
kirjoitettuna tiedostoon. Sääntö luetaan kaanna.py:stä (PUHUJIA_VAHINTAAN,
OIKEALTA_VASEMMALLE), ei kirjoiteta tähän uudelleen. Jos sääntö muuttuu siellä,
aja tämä uudelleen — älä korjaa tulosta käsin.

Miksi tiedosto eikä laskenta rakennusaikana: rakenna.py ei saa vaatia
langcodes-kirjastoa (Markon koneella sitä ei ole, ja sivuston pitää rakentua
ilman sitä). Tiedosto on CLDR-dataa kielistä, ei sivuston omista kielistä,
joten se ei vanhene uuden kielen myötä.

Aja (vaatii langcodes + language_data):
    python3 tyokalut/kielihakemisto.py

Tulos: julkinen/kielet.json = [[koodi, oma nimi, engl. nimi, maa, rtl], ...]
Maa on kielen tavallisimman maan ISO-koodi — SAMA arvo, josta kaanna.py:n
lippu() poimii arkin lipun (langcodes maximize().territory). Tyhjä, jos alue ei
ole maa (es-419). Valitsin tekee siitä lippuemojin; sivustolla jo olevat kielet
saavat oman SVG-lippunsa suoraan kielivalikosta (ks. julkinen/sivu.js).
"""

import json
import os
import re
import sys

TANNE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(TANNE, 'tyokalut'))
sys.path.insert(0, TANNE)


def main():
    import langcodes
    from language_data.population_data import LANGUAGE_SPEAKING_POPULATION as PUHUJAT
    import kaanna  # sääntö luetaan täältä, ei kirjoiteta uudelleen

    rivit, ohi = [], 0
    for koodi in sorted(k for k in PUHUJAT if '-' not in k):
        if PUHUJAT[koodi] < kaanna.PUHUJIA_VAHINTAAN:
            continue
        try:
            k = langcodes.Language.get(koodi)
            nimi_en = k.display_name('en')
            if not k.is_valid() or nimi_en.startswith('Unknown'):
                raise ValueError('tuntematon')
            m = k.maximize()
        except Exception:
            ohi += 1
            continue
        alue = m.territory or ''
        if not re.fullmatch(r'[A-Z]{2}', alue) or alue == 'ZZ':
            # es-419 (ei maa) ja ZZ (tuntematon alue): ei maata, ei lippua —
            # kuten lippu():ssa. 📐 Mitattu 16.11.2026: ilman ZZ-poikkeusta
            # listalle tuli lippu 🇿🇿 ja teksti «tuntematon alue».
            alue = ''
        rivit.append([koodi, k.display_name(k.to_tag()), nimi_en, alue,
                      1 if m.script in kaanna.OIKEALTA_VASEMMALLE else 0])

    polku = os.path.join(TANNE, 'julkinen', 'kielet.json')
    with open(polku, 'w', encoding='utf-8') as f:
        json.dump(rivit, f, ensure_ascii=False, separators=(',', ':'))
        f.write('\n')
    print('%s: %d kieltä (ohi %d, oikealta vasemmalle %d, ilman maata %d), %d tavua'
          % (polku, len(rivit), ohi, sum(r[4] for r in rivit),
             len([r for r in rivit if not r[3]]), os.path.getsize(polku)))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
