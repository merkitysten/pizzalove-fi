# -*- coding: utf-8 -*-
"""Aukeaako selain — ja aukeaako se YHDESTÄ paikasta?

⚠️ 📐 MITATTU 22.11.2026 (viron ajo, Konekäännös #25). Kaksi erikseen oikeaa
muutosta tuottivat vian, jota kumpikaan puoli ei raportoinut:

  19.11.  arkin teko käyttämään ajurikuvan omaa Chromea (`channel='chrome'`)
  19.11.  työnkulku lakkasi lataamasta Playwrightin Chromiumia (se oli turha)

Muunsin YHDEN käynnistyksen kolmesta. Viron ajossa QR-lukukoe kaatui
`p.chromium.launch()`:iin — ladattua Chromiumia ei enää ollut. Ja koska
kaatunut arkki punaa koko työn, `julkaise`-työ OHITETTIIN (`needs: kaanna`):
**käännös oli valmis ja talletettu haaraan, mutta sivua ei julkaistu.**
Markolle se näytti siltä kuin viro ei olisi kääntynyt lainkaan.

Tämä koe kysyy kaksi eri asiaa, ja ne ovat eri kysymys:

  staattinen   onko selaimen valinta yhdessä paikassa (`ks.avaa_selain`)?
  savu         aukeaako se selain TÄSSÄ ympäristössä — nyt eikä 17 s
               myöhemmin ensimmäisen arkin sisällä

⚠️ Staattinen osa ei korvaa savua: `avaa_selain` voi olla ainoa käynnistys ja
silti kaatua, jos kumpaakaan selainta ei ole asennettu. Savu ei korvaa
staattista: selain voi aueta täällä ja neljäs `launch`-rivi silti ohittaa
valinnan jossain muualla.

Ajo:  python3 tyokalut/selainkoe.py [--vain-staattinen]
"""
import ast
import glob
import os
import sys

TANNE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, TANNE)

# Ainoa paikka jossa selain saadaan avata.
LAHDE = ('korttisaannot.py', 'avaa_selain')


def kaynnistykset(polku):
    """(rivi, ymparoiva funktio) jokaiselle `*.chromium.launch(...)` -kutsulle."""
    with open(polku, encoding='utf-8') as f:
        puu = ast.parse(f.read())
    ulos = []

    def kavele(solmu, funktio):
        for lapsi in ast.iter_child_nodes(solmu):
            nimi = funktio
            if isinstance(lapsi, (ast.FunctionDef, ast.AsyncFunctionDef)):
                nimi = lapsi.name
            if isinstance(lapsi, ast.Call):
                k = lapsi.func
                if (isinstance(k, ast.Attribute) and k.attr == 'launch'
                        and isinstance(k.value, ast.Attribute)
                        and k.value.attr == 'chromium'):
                    ulos.append((lapsi.lineno, nimi))
            kavele(lapsi, nimi)

    kavele(puu, None)
    return ulos


def staattinen():
    """⚠️ Luetaan JÄSENTIMELLÄ eikä grepillä: `avaa_selain`in oma selittävä
    kommentti sisältää merkkijonon `p.chromium.launch()`, ja kuviohaku
    hälyttäisi siitä. Tarkistin joka hälyttää selityksestä opettaa ohittamaan
    hälytykset."""
    virheet = []
    tiedostot = sorted(glob.glob(os.path.join(TANNE, '*.py'))
                       + glob.glob(os.path.join(TANNE, 'tyokalut', '*.py')))
    yhteensa = 0
    for f in tiedostot:
        suht = os.path.relpath(f, TANNE)
        for rivi, funktio in kaynnistykset(f):
            yhteensa += 1
            if (suht, funktio) != LAHDE:
                virheet.append('%s:%d (%s) avaa selaimen ohi %s:%s:n'
                               % (suht, rivi, funktio or 'ylätaso',
                                  LAHDE[0], LAHDE[1]))
    # ⚠️ Nolla EI ole läpimeno: jos kutsuja ei löydy lainkaan, jäsennys on
    # rikki tai funktio on nimetty uudelleen — eikä koe silloin mittaa mitään.
    if not yhteensa:
        virheet.append('yhtään selaimen käynnistystä ei löytynyt — koe on tyhjä')
    return virheet, yhteensa


def savu():
    """⚠️ Kolme tilaa, ei kahta. Markon koneella Playwrightia EI ole (siellä
    ajetaan Chromea suoraan), joten «ei auennut» ja «ei mitattavissa» on
    pidettävä erillään — muuten koe on punainen paikallisesti aina, ja
    punaisen ohittamisesta tulee tapa."""
    import korttisaannot as ks
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return None
    p = sync_playwright().start()
    try:
        b = ks.avaa_selain(p)
        versio = b.version
        b.close()
    finally:
        p.stop()
    return versio


def itsetesti():
    """Osaako koe myös pettää? Mutantti kirjoitetaan $TMPDIR:iin EIKÄ repoon
    (Drive peilaa työpuun, eikä palautusta voi taata)."""
    import tempfile
    virheet = []
    hiekka = tempfile.mkdtemp(prefix='selainkoe-')
    mutantti = os.path.join(hiekka, 'uusi_tyokalu.py')
    with open(mutantti, 'w', encoding='utf-8') as f:
        f.write('def tee(p):\n    b = p.chromium.launch(args=[])\n    return b\n')
    loydot = kaynnistykset(mutantti)
    if loydot != [(2, 'tee')]:
        virheet.append('MUTAATIO EI HUOMATTU: %r' % (loydot,))
    # Ja verrokki: tiedosto ilman käynnistystä ei saa antaa osumaa.
    puhdas = os.path.join(hiekka, 'puhdas.py')
    with open(puhdas, 'w', encoding='utf-8') as f:
        f.write('# p.chromium.launch() vain kommentissa\nX = 1\n')
    if kaynnistykset(puhdas):
        virheet.append('VÄÄRÄ HÄLYTYS: kommentista tuli osuma')
    # Oikea lähde on löydyttävä nimeltä — muuten vertailu on tyhjä.
    oikea = kaynnistykset(os.path.join(TANNE, LAHDE[0]))
    if not [f for _, f in oikea if f == LAHDE[1]]:
        virheet.append('lähdettä %s:%s ei löytynyt' % LAHDE)
    for v in virheet:
        print('🔴 ' + v)
    print('Itsetesti: %s' % ('🔴 %d' % len(virheet) if virheet else 'OK (3 väitettä)'))
    return 1 if virheet else 0


def main():
    if '--itsetesti' in sys.argv:
        return itsetesti()
    virheet, maara = staattinen()
    for v in virheet:
        print('🔴 ' + v)
    print('Selaimen käynnistyksiä: %d · kaikki %s:%s:ssa: %s'
          % (maara, LAHDE[0], LAHDE[1], 'ei' if virheet else 'kyllä'))
    if '--vain-staattinen' not in sys.argv:
        try:
            versio = savu()
        except Exception as e:
            print('🔴 selain ei auennut: %s' % e)
            virheet.append('savu')
        else:
            if versio is None:
                print('Savu: EI MITATTAVISSA (Playwrightia ei ole asennettu)')
                if '--vaadi-savu' in sys.argv:      # CI vaatii oikean mittauksen
                    print('🔴 savua vaadittiin, mutta sitä ei voinut mitata')
                    virheet.append('savu puuttuu')
            else:
                print('Selain aukesi: %s' % versio)
    return 1 if virheet else 0


if __name__ == '__main__':
    sys.exit(main())
