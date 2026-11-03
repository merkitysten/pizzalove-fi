# -*- coding: utf-8 -*-
"""Korttipelin pulmat: kasi taytekortteja + poydalla oleva pizza.

⚠️ PULMA RAKENNETAAN PELIN OMISTA SAANNOISTA, EI KEKSITYISTA LUVUISTA:
  · pizza on aito pizzakortti = joukon 1…10 osajoukko, koko 1–4, summa <= 10
    (sama saanto kuin `julkinen/play/kortit.js`, jossa se on mitattu
    42 painetusta kortista)
  · pizzan arvo on taytteiden summa, poikkeuksetta
  · taytekortteja on 11 − arvo kappaletta, joten kadessa voi olla kaksi
    oliivia muttei kahta kalaa
  · ratkaisu saa kayttaa kaikkia laskutoimituksia ja yhdistaa niita

KAKSI TAPAA, JA NE OVAT ERI PULMA:
  helpompi  mika tahansa maara kortteja
  basso     yhta monta ERI tayteta kuin pizzassa on taytteita (kortteja saa
            olla enemman) — sivun nykyinen saanto, ei painetun arkin vanha

⚠️ VAIKEUS ON MALLI, EI MITTAUS. `pulmadata.py`:n D on viritetty sen oman
pelin tasoihin; tama on oma kaavansa eika sita ole koeteltu pelaajilla.
Jarjestys on siis malliin perustuva arvaus vaikeudesta — kaytettava siihen
mihin se riittaa (nouseva ramppi), ei siihen etta luku tarkoittaisi jotain.
"""

from fractions import Fraction as F
from functools import lru_cache
from itertools import combinations
import math
import random

TAYTTEET = {1: 'oliivi', 2: 'tomaatti', 3: 'ananas', 4: 'homejuusto',
            5: 'katkarapu', 6: 'munakoiso', 7: 'rucola', 8: 'herkkusieni',
            9: 'kinkku', 10: 'kala'}
# kpl = 11 − arvo (kortit.js), yhteensa 55 + 3 fantasiaa
KPL = {a: 11 - a for a in TAYTTEET}

PIZZAT = [list(c) for k in range(1, 5) for c in combinations(range(1, 11), k)
          if sum(c) <= 10]


def lausekkeet(kortit):
    """Kaikki arvot jotka naista korteista saa — ja PARAS lauseke kullekin.

    Palauttaa {arvo: (hinta, lauseke)}. Jokainen kortti kaytetaan tasan
    kerran, joten kutsuja valitsee ensin osajoukon.

    ⚠️ «Paras» ei ole «ensimmainen loydetty». 📐 Mitattu: ensimmainen versio
    painoi luukun ratkaisuksi `5 − (4 − 8)`, jossa valitulos on −4. Sama kasi
    ratkeaa muodossa `8 + 5 − 4`, jossa jokainen valitulos on positiivinen
    kokonaisluku. Lapsi laskee laskun jonka valituloksetkin ovat lukuja joita
    han tuntee, joten negatiivinen ja murtoluku maksavat.

    ⚠️ KUTSU TATA `kaikki_arvot`in KAUTTA — myos rekursiossa. Muisti joka on
    vain uloimmassa kutsussa ei muista mitaan: ajo aikakatkaistiin kahdesti
    ennen kuin rekursio ohjattiin muistin lapi."""
    if len(kortit) == 1:
        return {F(kortit[0]): (0, str(kortit[0]))}
    tulos = {}
    n = len(kortit)
    for maski in range(1, (1 << n) - 1):
        vasen = [kortit[i] for i in range(n) if maski >> i & 1]
        oikea = [kortit[i] for i in range(n) if not maski >> i & 1]
        for a, (ca, la) in kaikki_arvot(vasen).items():
            for b, (cb, lb) in kaikki_arvot(oikea).items():
                parit = [(a + b, '+'), (a - b, '−'), (a * b, '×')]
                if b:
                    parit.append((a / b, ':'))
                for arvo, merkki in parit:
                    hinta = ca + cb + 1 + sakko(arvo)
                    vanha = tulos.get(arvo)
                    if vanha is None or hinta < vanha[0]:
                        tulos[arvo] = (hinta, '(%s %s %s)' % (la, merkki, lb))
    return tulos


def sakko(arvo):
    """Mita valitulos maksaa: negatiivinen 10, murtoluku 5, muuten 0."""
    if arvo < 0:
        return 10
    if arvo.denominator != 1:
        return 5
    return 0


@lru_cache(maxsize=None)
def _muistettu(avain):
    return lausekkeet(list(avain))


def kaikki_arvot(kortit):
    """Sama kuin `lausekkeet`, mutta muistettu jarjestetyn monijoukon mukaan:
    kortit [3, 1] ja [1, 3] tuottavat saman, koska kaikki jaot kaydaan lapi."""
    return _muistettu(tuple(sorted(kortit)))


def siisti(lauseke):
    """Uloimmat sulut pois — `(8 + 5)` on luettavampi muodossa `8 + 5`."""
    if lauseke.startswith('(') and lauseke.endswith(')'):
        syvyys = 0
        for i, merkki in enumerate(lauseke):
            syvyys += (merkki == '(') - (merkki == ')')
            if syvyys == 0 and i < len(lauseke) - 1:
                return lauseke
        return lauseke[1:-1]
    return lauseke


def ratkaisut(kasi, arvo, tasan_eri):
    """Kaikki kattaukset jotka tuottavat pizzan arvon.

    Palauttaa listan (kortit, lauseke) — yksi lauseke korttijoukkoa kohden,
    koska pelaajalle kysymys on *mitka kortit*, ei *mika sulkumuoto*."""
    out = []
    nahty = set()
    for k in range(1, min(len(kasi), 4) + 1):
        for osa in combinations(sorted(kasi), k):
            if osa in nahty:
                continue
            nahty.add(osa)
            # ⚠️ TASAN, EI VAHINTAAN. Pelin oma tarkistus
            # (`kierrosTarkista`, kierros.js) vaatii etta ERI arvoja on tasan
            # yhta monta kuin pizzassa taytteita — ei vahintaan. Loysempi
            # saanto tuottaisi «ratkaisun» jonka peli itse hylkaa, ja
            # kalenteri kayttaa juuri sita tarkistusta.
            if tasan_eri and len(set(osa)) != tasan_eri:
                continue
            L = kaikki_arvot(osa)
            if F(arvo) in L:
                out.append((list(osa), siisti(L[F(arvo)][1])))
    # Ystavallisin ensin: pelkka yhteenlasku, sitten vahiten kortteja, sitten
    # yksinkertaisin merkki. ⚠️ Ilman tata luukun 12 ratkaisuksi painettiin
    # «1 × 9 = 9» vaikka sama kasi ratkesi yhteenlaskulla.
    out.sort(key=lambda r: (0 if sum(r[0]) == arvo else 1, len(r[0]),
                            r[1].count('×') + r[1].count(':') * 2,
                            r[1].count('−')))
    return out


def ratkaisuja_kaikki(kasi, arvo, tasan_eri):
    """Montako eri KORTTIJOUKKOA tuottaa pizzan arvon — koko katta kayttaen.

    ⚠️ ERI FUNKTIO KUIN `ratkaisut`, JA SYY ON MITATTU 3.11.2026. `ratkaisut`
    katkaisee haun neljaan korttiin (nopeus: sita kutsutaan kymmeniatuhansia
    kertoja hakuvaiheessa). Peli ei katkaise: `etsiRatkaisu` (ratkoja.js)
    sanoo sen itse — «koko kasi on kaytettavissa: yhden tayteen pizzan voi
    tehda viidella kortilla». Nelja kortin katto oli siis sama vika jonka
    peli oli jo korjannut, ja luku oli alakanttiin: luukun 18 helppo tapa
    36 vastaan **59**, luukun 24 Basson tapa 2 vastaan **8**.

    Sivu nayttaa taman luvun nimittajana («loysit 3/59 tapaa»), joten
    alakanttiin laskettu luku EI ole vain epatarkka — pelaaja voisi loytaa
    enemman tapoja kuin niita muka on. Siksi tama lasketaan vain niille
    28 pulmalle jotka kalenteriin paatyvat, ei hakuvaiheessa."""
    n = 0
    nahty = set()
    for k in range(1, len(kasi) + 1):
        for osa in combinations(sorted(kasi), k):
            if osa in nahty:
                continue
            nahty.add(osa)
            if tasan_eri and len(set(osa)) != tasan_eri:
                continue
            if F(arvo) in kaikki_arvot(osa):
                n += 1
    return n


def plus_riittaa(osa, arvo):
    return sum(osa) == arvo


def vaikeus(kasi, pizza, tapa, rat):
    """⚠️ MALLI (ks. tiedoston alku), ei mitattu vaikeus."""
    if not rat:
        return None
    vahintaan = min(len(o) for o, _ in rat)
    plussalla = [o for o, _ in rat if plus_riittaa(o, sum(pizza))]
    d = 1.5 * vahintaan
    if not plussalla:
        d += 3.0
    if all(':' in l or '×' in l for _, l in rat):
        d += 2.0
    # Mita vahemman ratkaisuja, sita enemman etsimista. Jatkuva termi eika
    # kynnys: kynnyksella «ratkaisuja == 1» pulma jossa on 2 ratkaisua ja
    # pulma jossa niita on 12 saivat saman luvun.
    d += max(0.0, 4.0 - math.log2(1 + len(rat)))
    if tapa == 'basso' and len(pizza) >= 2:
        d += 1.0 * (len(pizza) - 1)
    return round(d, 1)


def jaa_kasi(rnd, koko):
    """Kasi pakasta jossa korttia arvoa a on 11 − a kappaletta."""
    pakka = [a for a in TAYTTEET for _ in range(KPL[a])]
    rnd.shuffle(pakka)
    return sorted(pakka[:koko])


def arvo_pulma(rnd, tapa, kasikoko, pizzan_koko, vahintaan_kortteja=2):
    """⚠️ `vahintaan_kortteja=2` EI ole makuasia. Ilman sita kolme
    ensimmaista luukkua olivat «pizzan arvo on 10, kadessasi on kortti 10» —
    ei laskua lainkaan, vaan kortin etsiminen. Ja Basson tapa yhden tayteen
    pizzalle ei rajoita mitaan, joten se on eri pulma vain nimella."""
    if tapa == 'basso' and pizzan_koko < 2:
        return None
    pizza = rnd.choice([p for p in PIZZAT if len(p) == pizzan_koko])
    kasi = jaa_kasi(rnd, kasikoko)
    eri = len(pizza) if tapa == 'basso' else 0      # 0 = ei rajoitusta
    rat = ratkaisut(kasi, sum(pizza), eri)
    # ⚠️ YKSI KORTTI RIITTAA -> PULMA HYLATAAN, EI RATKAISUA. Ensimmainen
    # versio suodatti vain RATKAISUT, ja silloin kasi jossa on pizzan arvoinen
    # kortti tuotti teennaisen vastauksen: pizza 5, kadessa 5, «ratkaisu»
    # 1 × 5 = 5. Lapsi loytaa oikean vastauksen (pelkka 5) ja arkki vaittaa
    # sita vaaraksi. Nyt koko kasi hylataan.
    if any(len(o) < vahintaan_kortteja for o, _ in rat):
        return None
    if not rat:
        return None
    return dict(laji='kortti', tapa=tapa, pizza=pizza, kasi=kasi,
                arvo=sum(pizza), ratkaisuja=len(rat),
                kortit=rat[0][0], lauseke=rat[0][1],
                D=vaikeus(kasi, pizza, tapa, rat))


def taydenna_maarat(p):
    """Lisaa pulmaan ratkaisujen MAARAT molemmilla tavoilla.

    🔵 Marko 3.11.2026: «siellahan on useampikin muu ratkaisumahdollisuus.
    Minusta tahan pitaisi rohkaista.» Siksi sivu tarvitsee molemmat luvut:
    nimittajan laskuriin, ja tiedon siita onko Basson tapaa ylipaataan
    olemassa (📐 14 korttipulmaa 16:sta ratkeaa myos silla, kaksi ei).

    ⚠️ Kutsutaan vain valituille pulmille — tama on hidas (ks.
    `ratkaisuja_kaikki`)."""
    arvo = p['arvo']
    p['ratkaisujaHelppo'] = ratkaisuja_kaikki(p['kasi'], arvo, 0)
    p['ratkaisujaBasso'] = (0 if len(p['pizza']) < 2
                            else ratkaisuja_kaikki(p['kasi'], arvo, len(p['pizza'])))
    return p
