# -*- coding: utf-8 -*-
"""Joulukalenterin 24 luukkua: kortti- ja lautapelin pulmat nousevassa
vaikeusjarjestyksessa.

🔵 Marko 3.11.2026: «Mietitaan joulukalenteria, jossa olisi 24 luukkua.
Luukkujen takaa voisi tulla aina jokin pizza loveen liittyva matikkapulma.
— — Luukun avattuaan tulisi joko korttipelin tai lautapelin jokin tehtava
eteen ratkottavaksi. Jossain luukussa voisi olla esim. kaksikin pulmaa.»

LAHTEET — kumpikaan pulma ei ole keksitty tyhjasta:
  lauta    `tyokalut/pulmadata.json` — 527 jo generoitua ja vaikeusarvioitua
           apinavaaka-pulmaa, samat joita `apinavaaka.js` pelaa. Luukkuun ei
           siis kirjoiteta uutta pelia vaan valitaan olemassa olevasta.
  kortti   `tyokalut/korttipulma.py` — pizzakortti pelin omasta saannosta
           (osajoukko 1…10, koko 1–4, summa <= 10) ja kasi pakasta jossa
           korttia arvoa a on 11 − a kappaletta.

⚠️ KAKSI PULMAA LUUKUSSA PAKOTTAA ENEMMAN KUIN 24 PULMAA. Luukkuja on 24,
ja neljassa niista (6 · 12 · 18 · 24) on kaksi pulmaa, joten pulmia on 28.
24 pulmaa 24 luukkuun ja silti tuplia on mahdoton yhtalo.

⚠️ VAIKEUSJARJESTYS ON MALLIN MUKAINEN, EI MITATTU PELAAJILLA. Molempien
pulmalajien D on kaava. Ramppi on siis «mallin mukaan nouseva», ja se on eri
asia kuin «lapsesta nouseva». Jos jarjestys tuntuu vaaralta pelatessa, luku
on vaarassa — ei lapsi.

⚠️ `kysymys`-KENTTA EI OLE SIVUN TEKSTI (3.11.2026). Marko: «ei kerrota vaan
nayteta kuvin ja laitetaan joulukalenterin avaaja tekemaan ne laskutoimitukset».
Sivu piirtaa pulman OIKEILLA KORTEILLA ja tarkistaa vastauksen pelin omalla
`kierrosTarkista`lla; `kysymys` ja `ratkaisu` jaavat tiedostoon ihmisen
luettavaksi (tarkastuslista, «Nayta ratkaisu» -nappi).

⚠️ BASSON TAPA ON *TASAN* YHTA MONTA ERI TAYTETTA, EI VAHINTAAN. Saanto on
pelissa (`kierrosTarkista`), ja generaattori oli siita loysempi — peli olisi
hylannyt oman kalenterinsa ratkaisun. Loytyi vasta kun sivu alkoi kayttaa
pelin omaa tarkistusta.

⚠️ JOKAINEN RATKAISU TODENNETAAN ERI KOODILLA KUIN MILLA SE LOYDETTIIN:
korttipulman lauseke jasennetaan merkkijonosta ja lasketaan murtoluvuilla,
lautapulman siirto tarkistetaan saannoista. Haku joka tarkistaa itsensa
todistaisi vain oman itsensa.
"""

import hashlib
import io
import json
import os
import random
import re
import sys
from fractions import Fraction as F

TANNE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, TANNE)

import korttipulma as kp                                   # noqa: E402
from pulmadata import arvioi, siirrot                      # noqa: E402

LUUKKUJA = 24
TUPLAT = (6, 12, 18, 24)
PULMADATA = os.path.join(TANNE, 'pulmadata.json')
KOHDE = os.path.join(os.path.dirname(TANNE), 'sisalto', 'joulukalenteri-fi.json')
KORTIT_JS = os.path.join(os.path.dirname(TANNE), 'julkinen', 'play', 'kortit.js')
# ⚠️ Sama sisalto kahdessa paikassa ON kopio — ja siksi sen tekee generaattori
# eika ihminen. `sisalto/` on lahde, `julkinen/joulu/` on se jonka selain lukee.
# ⚠️ JA SIVULLE KIRJOITETAAN SKRIPTI, EI JSON: `fetch('pulmat.json')` ei toimi
# file://-osoitteesta, joten JSON-versiota katsoessa sivu olisi tyhja juuri
# silloin kun se avataan kaksoisnapsauttamalla.
SIVULLE = os.path.join(os.path.dirname(TANNE), 'julkinen', 'joulu', 'pulmat.js')

T = kp.TAYTTEET


def taytteet():
    """Nimi ja vari pelin omasta lahteesta (`kortit.js`), ei uutena listana.

    ⚠️ Vari on pelin vari. Toinen lista ajautuisi siita erilleen heti kun
    jotain sailetaan yhdessa paikassa — sama perustelu kuin `vieteri.js`:ssa."""
    teksti = open(KORTIT_JS, encoding='utf-8').read()
    rivit = re.findall(r"arvo:\s*(\d+),\s*nimi:\s*'([^']+)',\s*vari:\s*'(#[0-9A-Fa-f]+)'",
                       teksti)
    if len(rivit) != 10:
        raise SystemExit('kortit.js: odotettiin 10 taytetta, loytyi %d' % len(rivit))
    return {int(a): dict(nimi=n, vari=v) for a, n, v in rivit}


def nimi(arvo):
    return '%s (%d)' % (T[arvo].capitalize(), arvo)


def luettele(arvot):
    osat = [nimi(a) for a in arvot]
    if len(osat) == 1:
        return osat[0]
    return ', '.join(osat[:-1]) + ' ja ' + osat[-1]


# ---------------------------------------------------------------- lautapulma

def lautapulmat():
    """Kaikki 527 pulmaa yhtena listana, vaikeimmat viimeisena."""
    data = json.load(open(PULMADATA, encoding='utf-8'))
    kaikki = [p for taso in data for p in taso]
    kaikki.sort(key=lambda p: (p['D'], p['d'], tuple(p['lin'])))
    return kaikki


def lautaratkaisu(p):
    """Helpoin siirto: ensin ne joissa on vahiten ylimaarasta.

    Sama jarjestys kuin `arvioi`ssa, jotta «helpoin» tarkoittaa samaa kuin
    pelin omassa vaikeusarviossa."""
    d, L, piz = p['d'], set(p['lin']), [tuple(x) for x in p['pizzat']]
    tarve = set().union(*map(set, piz))
    puuttuu = tarve - L
    kaikki = siirrot(d, sorted(L))
    ok = lambda S, t: all(set(q) <= ((L - {t}) | S) for q in piz)
    avain = lambda m: (len(m[0] - tarve) + (1 if m[1] else 0)
                       + (2 if m[1] in tarve else 0),
                       -len(m[0] & puuttuu), len(m[0]))
    for S, t in sorted(kaikki, key=avain):
        if ok(S, t):
            return sorted(S), t
    return None, None


def lautaratkaisuja(p):
    """Montako LAILLISTA siirtoa tasaa vaa'an JA tekee pizzat.

    ⚠️ `siirrot` torjuu jo perussiirron yhdistamisen (nopan luvun kokoinen
    tayte tuodaan yksin), joten tama luku on sama jonka peli hyvaksyy.
    📐 Mitattu 3.11.2026: kolmessa lautapulmassa (8, 10, 24) on siirto joka
    tasaa ja tekee pizzat mutta jonka peli hylkaa — ilman tata rajausta luku
    olisi liian suuri ja sivu lupaisi ratkaisuja joita ei ole."""
    d, L, piz = p['d'], set(p['lin']), [set(x) for x in p['pizzat']]
    return sum(1 for S, t in siirrot(d, sorted(L))
               if all(q <= ((L - {t}) | S) for q in piz))


def lautateksti(p, S, t):
    """⚠️ Kaksi pizzaa erotellaan sanalla «ja» VASTA pizzojen valilla, ei
    taytteiden. Ensimmainen versio tuotti rivin «Oliivi (1) ja Ananas (3)
    (arvo 4) ja Homejuusto (4) ja Katkarapu (5) (arvo 9)», josta ei nay
    missa toinen pizza alkaa."""
    pizzat = ' · '.join('%s = %d' % (' + '.join(nimi(a) for a in x), sum(x))
                        for x in p['pizzat'])
    monta = len(p['pizzat']) > 1
    linja = ('Linjastolla on %s' % luettele(p['lin'])) if p['lin'] \
        else 'Linjasto on tyhjä'
    kysymys = ('Noppa näyttää **%d**. %s. Valmistettavana %s %s. '
               'Mitkä täytteet siirrät varastosta linjastolle — ja lähteekö '
               'jokin takaisin varastoon?'
               % (p['d'], linja, 'ovat pizzat' if monta else 'on pizza',
                  pizzat))
    if t:
        ratkaisu = ('Siirrä linjastolle %s. Palauta varastoon %s. '
                    'Vaaka tasaa: %d = noppa %d + palautettu %d.'
                    % (luettele(S), nimi(t), sum(S), p['d'], t))
    else:
        ratkaisu = ('Siirrä linjastolle %s. Vaaka tasaa: %d = noppa %d.'
                    % (luettele(S), sum(S), p['d']))
    return kysymys, ratkaisu


# ---------------------------------------------------------------- korttipulma

def korttiehdokkaat(maara, tapa):
    """Ehdokkaita koko vaikeusalueelta.

    ⚠️ Ensimmainen versio hylkasi kaiken missa oli yli kolme ratkaisua, ja se
    oli vaarin kahdesta syysta. 📐 Mitattu 300 arvonnasta: vain 11 lapaisi
    (3,7 %), joten ajo aikakatkaistiin. Ja monta ratkaisua on kalenterin
    alkupaassa HYVE eika vika — «loyda yksi tapa» on lapselle oikea tehtava.
    Nyt ratkaisujen maara on osa vaikeutta ja ramppi hoitaa valinnan."""
    rnd = random.Random(2412 + len(tapa))
    out = []
    nahty = set()
    while len(out) < maara * 25 and len(nahty) < 60000:
        kasikoko = 5 if tapa == 'helpompi' else 7
        p = kp.arvo_pulma(rnd, tapa, kasikoko, rnd.choice([1, 2, 2, 3, 3, 4]))
        if not p:
            continue
        avain = (tapa, tuple(p['pizza']), tuple(p['kasi']))
        if avain in nahty:
            continue
        nahty.add(avain)
        out.append(p)
    out.sort(key=lambda p: (p['D'], p['ratkaisuja']))
    return out


def monipuolista(ehdokkaat, montako):
    """Sama pizza enintaan kahdesti, sama ratkaisu kerran.

    ⚠️ Ilman tata kalenterissa oli pizza (1,2,3,4) nelja kertaa ja ratkaisu
    «2 + 8 = 10» kahdesti. Kalenteri jossa sama tehtava toistuu nelja kertaa
    ei ole 24 pulmaa vaan vahemman."""
    pizzoja, ratkaisuja, ulos = {}, set(), []
    for p in ehdokkaat:
        pz, rt = tuple(p['pizza']), (tuple(p['kortit']), p['lauseke'])
        if pizzoja.get(pz, 0) >= 2 or rt in ratkaisuja:
            continue
        pizzoja[pz] = pizzoja.get(pz, 0) + 1
        ratkaisuja.add(rt)
        ulos.append(p)
    if len(ulos) < montako:
        raise SystemExit('Monipuolisia ehdokkaita vain %d, tarvitaan %d'
                         % (len(ulos), montako))
    return ulos


def kortititeksti(p):
    tapa = ('Kortteja saa käyttää niin monta kuin haluat.'
            if p['tapa'] == 'helpompi'
            else 'Basson tapa: käytä yhtä montaa <b>eri</b> täytettä kuin '
                 'pizzassa on täytteitä (%d). Kortteja saa olla enemmän.'
                 % len(p['pizza']))
    kysymys = ('Pöydällä on pizza %s — arvo **%d**. Kädessäsi ovat %s. '
               'Millä korteilla valmistat pizzan? %s'
               % (' + '.join(nimi(a) for a in p['pizza']), p['arvo'],
                  luettele(p['kasi']), tapa))
    ratkaisu = ('%s = %d  (kortit %s)'
                % (p['lauseke'], p['arvo'],
                   ', '.join(str(k) for k in p['kortit'])))
    return kysymys, ratkaisu


# ---------------------------------------------------------------- kokoaminen

def valitse(lista, montako):
    """Tasavalein koko vaikeusalueelta — ei vain helpoimmasta paasta."""
    n = len(lista)
    return [lista[min(n - 1, round(i * (n - 1) / (montako - 1)))]
            for i in range(montako)]


def kokoa():
    paivat = list(range(1, LUUKKUJA + 1))
    laji = {p: ('kortti' if p % 2 else 'lauta') for p in paivat}
    lisa = {p: ('lauta' if laji[p] == 'kortti' else 'kortti') for p in TUPLAT}

    lautaa = sum(1 for p in paivat if laji[p] == 'lauta') + \
        sum(1 for p in TUPLAT if lisa[p] == 'lauta')
    korttia = sum(1 for p in paivat if laji[p] == 'kortti') + \
        sum(1 for p in TUPLAT if lisa[p] == 'kortti')

    # ⚠️ KAKSI TAPAA JAETAAN PUOLIKSI JA HELPOMPI ENSIN. Yhdesta pinosta
    # valittuna Basson tapaa tuli 1 kpl 16:sta: sen D on rakenteellisesti
    # korkeampi, joten ramppi tyonsi sen loppuun ja monipuolisuussaanto
    # karsi loput. Kalenteri opettaa nyt helpomman tavan ensin ja Basson
    # tavan joulua kohti — sama jarjestys kuin saannoissa.
    helppoja = korttia // 2
    bassoja = korttia - helppoja
    lauta = valitse(lautapulmat(), lautaa)
    kortti = (valitse(monipuolista(korttiehdokkaat(helppoja, 'helpompi'),
                                   helppoja), helppoja)
              + valitse(monipuolista(korttiehdokkaat(bassoja, 'basso'),
                                     bassoja), bassoja))
    # ⚠️ Lopuksi koko korttipino vaikeusjarjestykseen. Puolikkaat perakkain
    # antoivat luukulle 12 pulman D 11,9 ja luukulle 13 pulman D 4,0: ramppi
    # katkesi keskelta, vaikka kumpikin puolikas nousi omasta mielestaan.
    # Basson tapa painottuu silti loppuun, koska sen D on rakenteellisesti
    # korkeampi — se on seuraus, ei saanto.
    kortti.sort(key=lambda x: x['D'])
    pino = {'lauta': list(lauta), 'kortti': list(kortti)}

    def ota(tyyppi, paiva):
        """Vaikeus kasvaa paivan mukana: otetaan aina pinon helpoin jaljella."""
        return pino[tyyppi].pop(0)

    luukut = []
    for paiva in paivat:
        pulmat = [ota(laji[paiva], paiva)]
        if paiva in TUPLAT:
            pulmat.append(ota(lisa[paiva], paiva))
        rivit = []
        for p in pulmat:
            if p.get('laji') == 'kortti':
                kp.taydenna_maarat(p)        # hidas: vain valituille
                k, r = kortititeksti(p)
                rivit.append(dict(laji='kortti', tapa=p['tapa'],
                                  pizza=p['pizza'], kasi=p['kasi'],
                                  arvo=p['arvo'], kysymys=k, ratkaisu=r,
                                  kortit=p['kortit'], lauseke=p['lauseke'],
                                  ratkaisuja=p['ratkaisuja'],
                                  ratkaisujaHelppo=p['ratkaisujaHelppo'],
                                  ratkaisujaBasso=p['ratkaisujaBasso'],
                                  D=p['D']))
            else:
                S, t = lautaratkaisu(p)
                k, r = lautateksti(p, S, t)
                rivit.append(dict(laji='lauta', noppa=p['d'], linjasto=p['lin'],
                                  pizzat=p['pizzat'], siirto=S, takaisin=t,
                                  kysymys=k, ratkaisu=r,
                                  ratkaisuja=lautaratkaisuja(p), D=p['D']))
        luukut.append(dict(paiva=paiva, pulmat=rivit))
    return luukut


# ---------------------------------------------------------------- kokeet

def laske(lauseke):
    """Jasentaa JA laskee ratkaisun merkkijonosta — eri koodi kuin se joka
    lausekkeen loysi. Haku joka tarkistaa itsensa todistaa vain itsensa."""
    s = lauseke.replace('−', '-').replace('×', '*').replace(':', '/')
    s = re.sub(r'(\d+)', r'F(\1)', s)
    return eval(s, {'F': F})                     # vain omaa tuotostamme


def tarkista(luukut):
    virheet = []
    for L in luukut:
        for i, p in enumerate(L['pulmat']):
            tunnus = 'luukku %d pulma %d' % (L['paiva'], i + 1)
            if p['laji'] == 'kortti':
                if laske(p['lauseke']) != p['arvo']:
                    virheet.append('%s: lauseke ei anna pizzan arvoa' % tunnus)
                kaytetyt = list(p['kortit'])
                if sorted(int(x) for x in re.findall(r'\d+', p['lauseke'])) != sorted(kaytetyt):
                    virheet.append('%s: lauseke ja korttilista eivat tasmaa' % tunnus)
                kasi = list(p['kasi'])
                for k in kaytetyt:
                    if k not in kasi:
                        virheet.append('%s: kortti %d ei ole kadessa' % (tunnus, k))
                        break
                    kasi.remove(k)
                if p['tapa'] == 'basso' and len(set(kaytetyt)) != len(p['pizza']):
                    virheet.append('%s: Basson tapa vaatii TASAN %d eri tayteta '
                                   '(kierrosTarkista), ratkaisussa %d'
                                   % (tunnus, len(p['pizza']), len(set(kaytetyt))))
                if p['arvo'] != sum(p['pizza']):
                    virheet.append('%s: pizzan arvo ei ole taytteiden summa' % tunnus)
                if not 1 <= len(p['pizza']) <= 4 or sum(p['pizza']) > 10:
                    virheet.append('%s: pizza ei ole aito pizzakortti' % tunnus)
            else:
                S, t, d, lin = p['siirto'], p['takaisin'], p['noppa'], set(p['linjasto'])
                if S is None:
                    virheet.append('%s: ratkaisua ei loytynyt' % tunnus)
                    continue
                if sum(S) != d + (t or 0):
                    virheet.append('%s: vaaka ei tasaa (%d != %d + %s)'
                                   % (tunnus, sum(S), d, t))
                if set(S) & lin:
                    virheet.append('%s: siirretaan taytetta joka on jo linjastolla' % tunnus)
                # ⚠️ PERUSSIIRTOON EI SAA YHDISTAA MUITA SIIRTOJA (lautapelin
                # saanto, apinavaaka.js rivit 423 ja 830). Tama ehto puuttui
                # 3.11.2026 asti seka tasta etta sivun tarkistuksesta, ja
                # mitattuna se oli saavutettavissa kolmessa lautapulmassa.
                if d in set(S) and (len(S) > 1 or t):
                    virheet.append('%s: perussiirtoon on yhdistetty muita siirtoja' % tunnus)
                if t and t not in lin:
                    virheet.append('%s: palautetaan tayte jota ei ole linjastolla' % tunnus)
                uusi = (lin - {t}) | set(S)
                for pizza in p['pizzat']:
                    if not set(pizza) <= uusi:
                        virheet.append('%s: pizza %s ei synny siirron jalkeen'
                                       % (tunnus, pizza))
    return virheet


SIVU = os.path.join(os.path.dirname(TANNE), 'julkinen', 'joulu', 'index.html')


def leimaa_sivu():
    """Kirjoittaa `pulmat.js?v=` -leiman SISALLON TIIVISTEESTA.

    ⚠️ 📐 MITATTU 3.11.2026: selain tarjoili vanhaa `pulmat.js`:aa uuden
    `kalenteri.js`:n rinnalle, ja mutaatiokoe nayttti vihrealta vaikka
    mutaatio oli tiedostossa. Sivuston muu tapa on kasin nostettava `?v=`
    (ks. `julkinen/play/sivut.py` leimatarkistus), mutta tama tiedosto
    syntyy koneellisesti — joten leima lasketaan sisallosta eika jateta
    ihmisen muistin varaan. Kasin nostettava leima jonka sisalto syntyy
    koneellisesti on juuri se pari joka ajautuu erilleen."""
    tiiviste = hashlib.sha256(
        io.open(SIVULLE, 'rb').read()).hexdigest()[:10]
    teksti = io.open(SIVU, encoding='utf-8').read()
    uusi, n = re.subn(r'src="pulmat\.js(?:\?v=[\w.-]+)?"',
                      'src="pulmat.js?v=%s"' % tiiviste, teksti)
    if n != 1:
        raise SystemExit('index.html: pulmat.js -viittauksia %d, odotettiin 1' % n)
    if uusi != teksti:
        io.open(SIVU, 'w', encoding='utf-8').write(uusi)
        return '%s  (pulmat.js?v=%s)' % (SIVU, tiiviste)
    return 'leima ennallaan (pulmat.js?v=%s)' % tiiviste


def main():
    luukut = kokoa()
    tayte = taytteet()
    virheet = tarkista(luukut)
    for v in virheet:
        print('🔴 ' + v)
    pulmia = sum(len(L['pulmat']) for L in luukut)
    Ds = [p['D'] for L in luukut for p in L['pulmat']]
    lajit = [p['laji'] for L in luukut for p in L['pulmat']]
    print('%d luukkua · %d pulmaa (%d korttipeli, %d lautapeli) · D %.1f–%.1f'
          % (len(luukut), pulmia, lajit.count('kortti'), lajit.count('lauta'),
             min(Ds), max(Ds)))
    if virheet:
        print('🔴 %d VIRHETTA — ei kirjoiteta' % len(virheet))
        return 1
    print('Kaikki %d ratkaisua todennettu erillisella tarkistuksella — OK' % pulmia)
    sisalto = dict(taytteet=tayte, luukut=luukut)
    with open(KOHDE, 'w', encoding='utf-8') as f:
        json.dump(sisalto, f, ensure_ascii=False, indent=1)
    with open(SIVULLE, 'w', encoding='utf-8') as f:
        f.write('/* Generoitu: tyokalut/joulukalenteri.py. Ala muokkaa. */\n'
                'window.PULMAT = ')
        json.dump(sisalto, f, ensure_ascii=False, indent=1)
        f.write(';\n')
    print(KOHDE)
    print(SIVULLE)
    print(leimaa_sivu())
    return 0


if __name__ == '__main__':
    sys.exit(main())
