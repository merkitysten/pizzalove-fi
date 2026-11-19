# -*- coding: utf-8 -*-
"""Löytyykö luku arkilta, vaikka PDF-purkaja antaisi tekstin toisin?

⚠️ TÄMÄ SÄÄNTÖ ON RIKKOUTUNUT TUOTANNOSSA KAHDESTI, eikä kumpaakaan kertaa
voinut toistaa siinä koneessa jossa korjaus tehtiin:

  19.11.2026  ligatuurit        «الﻼعب» purkautui merkillä U+FEFC kahden
                                kirjaimen sijaan → 9 lukua «puuttui»
  19.11.2026  ligatuurin osat   «القاعدة الأساسية» (ل+أ) oli PDF:ssä muodossa
                                «القاعدة األساسية» (أ+ل) → 3 lukua «puuttui»

Syy on sama molemmilla kerroilla: **macOS purkaa PDF:n Quartzilla, CI käyttää
pdftotext:iä, eivätkä ne anna samaa tekstiä.** Koe läpäisi paikallisesti ja
kaatui siellä missä sitä ei voinut tutkia.

Siksi tämän kokeen aineisto EI ole paikallisesti tuotettua: koepalat on
**kopioitu CI:n omasta tulosteesta** (GitHub Actionsin huomautukset). Ne ovat
se mitä pdftotext oikeasti antoi, eivätkä sitä mitä tällä koneella syntyy.

Ajo:  python3 tyokalut/osumakoe.py [--mutaatiot]
"""
import os
import sys

TANNE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, TANNE)

import korttisaannot as ks                                       # noqa: E402

# ⚠️ SANATARKASTI CI:n huomautuksesta 19.11.2026 (ajo «Konekäännös kaikki»,
# commit 94bdb54). Älä «siisti» näitä merkkijonoja: niiden koko arvo on siinä,
# että ne ovat purkajan omaa tulostetta eivätkä meidän kirjoittamiamme.
CI_KATKELMA = 'القاعدةاألساسيةpizzapartyباألدواريمكنكمأ'

# (otsikko lähteestä, pitääkö löytyä CI_KATKELMAsta)
KOEPALAT = [
    ('القاعدة الأساسية', True),          # lam + alef-hamza
    ('Pizza Party بالأدوار', True),      # sama pari latinan jäljessä
    ('ثلاث طرق لتحضير البيتزا', False),  # ei ole tässä katkelmassa lainkaan
    ('tätä lukua ei ole', False),        # verrokki: koe ei saa löytää mitä ei ole
]


def koe(mutaatiot=False):
    teksti = ks.norm(CI_KATKELMA)
    virheet = []
    for otsikko, pitaa in KOEPALAT:
        loytyi, _ = ks.osuu(otsikko, teksti)
        if loytyi != pitaa:
            virheet.append('%r: %s, pitäisi olla %s'
                           % (otsikko[:28], 'löytyi' if loytyi else 'ei löytynyt',
                              'löytyy' if pitaa else 'ei löydy'))

    # Ligatuurimerkki (U+FEFC) vastaan kaksi kirjainta: ensimmäinen tuotantovika.
    if not ks.osuu('لاعب', ks.norm('ﻼعب'))[0]:
        virheet.append('ligatuurimerkki U+FEFC ei vastaa kahta kirjainta')

    # ⛔ Määräistä artikkelia EI saa kääntää: «ال» on alef+lam, ei ligatuuri.
    # Jos korjaus vaihtaisi myös tämän suunnan, jokainen määräinen sana muuttuisi.
    if ks.norm('القلم') != 'القلم':
        virheet.append('määräinen artikkeli «ال» muuttui — vaihto tehdään väärään suuntaan')

    if mutaatiot:
        # Kokeen on osattava myös pettää: rikotaan sääntö ja vaaditaan punainen.
        alkup = ks.LAM_ALEF
        try:
            import re
            ks.LAM_ALEF = re.compile('EI-OSU-MIHINKAAN')
            if ks.osuu('القاعدة الأساسية', ks.norm(CI_KATKELMA))[0]:
                virheet.append('MUTAATIO EI HUOMATTU: osuma löytyi ilman järjestyskorjausta')
        finally:
            ks.LAM_ALEF = alkup

    for v in virheet:
        print('🔴 ' + v)
    print('Osumakoe: %s' % ('🔴 %d virhettä' % len(virheet) if virheet else
                            'OK (%d koepalaa CI:n tulosteesta)' % len(KOEPALAT)))
    return 1 if virheet else 0


if __name__ == '__main__':
    sys.exit(koe('--mutaatiot' in sys.argv))
