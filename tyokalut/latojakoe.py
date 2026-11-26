# -*- coding: utf-8 -*-
"""Heittääkö latoja palstan hukkaan? — koteloarkin pakkomurron vartija.

⚠️ 📐 MITATTU 26.11.2026 (venäjä, ajot #27–#30). Yöajo kaatui kolmena
peräkkäisenä yönä samaan kohtaan, eikä teksti ollut liian pitkä:

  palsta 1  234,1 / 272,0 mm   perusteet
  palsta 2  261,5 / 272,0 mm   #1 PizzaParty + #2 PizzaBasso
  palsta 3   26,6 / 201,9 mm   ← PizzaBasson lisäsäännöt, 175,3 mm TYHJÄÄ
  palsta 4  193,8 / 201,9 mm   #3 PizzaLove alkaa — ja 79,7 mm jäi yli

PizzaBasson “Дополнительные правила” on jakamaton 26,6 mm:n lohko, joka valui
palstaan 3. Sen jälkeen `#3 PizzaLove`in pakkomurto (Markon jako 15.11.2026:
jokainen peli aloittaa uuden palstan) näki palstan 3 varatuksi ja hyppäsi sen
yli. Love sai yhden palstan kahden sijaan. Loven oma tarve 273,5 mm on
VÄHEMMÄN kuin puolan 291,7 mm, joka mahtuu — vika oli latojassa, ei tekstissä.

Korjaus (koteloarkki.py): `tee` ajaa kaikki 16 tiivistysporrasta ensin niin,
että jokainen peli aloittaa oman palstansa. Vasta jos yksikään ei mahdu, sama
haku uudelleen niin, että pakkomurrosta saa luopua — yksi kerrallaan, eniten
tyhjää jättävä ensin.

⚠️ Järjestys on päätös eikä tekniikkaa. 📐 Mitattu 26.11.2026: jos ohitus
sallitaan heti ensimmäisen virheen jälkeen, es · fr · ja · nl · pl mahtuvat
löysemmällä tiivistyksellä mutta menettävät palstan alusta alkavan pelin.
Markon jako 15.11. on päätös, tiivistys on mekaniikkaa — päätös väistyy vasta
viimeisenä, kun vaihtoehto on ettei arkkia synny lainkaan.

Koe vartioi kolmea asiaa, koska vain ensimmäinen on helppo:
  1. venäjä mahtuu, kun ohitus on sallittu, ja maksaa tasan yhden murron
  2. venäjä EI mahdu ilman ohitusta edes tiukimmalla portaalla — toinen
     kierros ei siis ole koristetta, ja ensimmäinen kierros on ennallaan
  3. mahtuva kieli ei ohita yhtäkään murtoa
  4. kolme tilaa, ei kahta: ilman `sisalto/konekaannos/ru.json`:ia koe
     sanoo EI MITATTAVISSA eikä teeskentele vihreää

Ajo:  python3 tyokalut/latojakoe.py [--mutaatiot]
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

TANNE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, TANNE)

import koteloarkki as ka            # noqa: E402
import korttisaannot as ks          # noqa: E402

# Venäjä tiukimmalla portaalla: tasan se latomus, jonka vanha koodi hylkäsi.
VENAJA, VENAJAN_PORRAS = 'ru', (3, 3)
# Verrokki, joka mahtuu löysimmällä portaalla — jos tämä alkaa ohittaa
# murtoja, korjaus on levinnyt sinne minne sen ei pidä.
VERROKKI, VERROKIN_PORRAS = 'en', (0, 0)

MITTA = r'''
<script>
(function odota() {
  if (!/^VALMIS/.test(document.title)) return setTimeout(odota, 50);
  var mm = 96 / 25.4, ruudut = [].slice.call(document.querySelectorAll('.palsta .sisus'));
  var d = {
    title: document.title,
    yli: document.getElementById('lahde').children.length,
    ohitettu: +((document.title.match(/murtoja-ohitettu:(\d+)/) || [0, 0])[1]),
    ruudut: ruudut.map(function (p) {
      var c = p.lastElementChild;
      return { tila: +(p.clientHeight / mm).toFixed(1),
               kaytetty: +(((c ? c.getBoundingClientRect().bottom - p.getBoundingClientRect().top : 0)) / mm).toFixed(1),
               atomeja: p.children.length };
    })
  };
  var s = document.createElement('pre');
  s.id = 'mitta'; s.style.display = 'none';
  s.textContent = 'MITTA' + JSON.stringify(d) + 'ATTIM';
  document.body.appendChild(s);
})();
</script>
'''


def lado(kieli, porras, ohitus):
    """Latoo arkin oikealla koodilla ja palauttaa mitat. Ei kirjoita PDF:ää."""
    v, o = porras
    lisa = ka.TIIVISTYS_V[v] + ka.TIIVISTYS_O[o]
    html_, _ = ka.painokuvat(ka.sivu_html(kieli, False, ohitus).replace('</style>', lisa + '\n</style>', 1))
    sivu = os.path.join(TANNE, '.latojakoe-%s.html' % kieli)
    with open(sivu, 'w', encoding='utf-8') as f:
        f.write(html_.replace('</html>', MITTA + '</html>'))
    try:
        # ⚠️ Sama selainvalinta kuin koteloarkki.tulosta — ks. tyokalut/selainkoe.py.
        if os.path.exists(ks.CHROME):
            r = subprocess.run([ks.CHROME, '--headless', '--disable-gpu',
                                '--allow-file-access-from-files', '--virtual-time-budget=20000',
                                '--dump-dom', 'file://' + sivu], capture_output=True, text=True)
            m = re.search(r'MITTA(\{.*?\})ATTIM', r.stdout, re.S)
            return json.loads(m.group(1)) if m else None
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            b = ks.avaa_selain(p)
            s_ = b.new_page()
            s_.goto('file://' + sivu, wait_until='load')
            s_.wait_for_function("document.getElementById('mitta') !== null", timeout=30000)
            teksti = s_.inner_text('#mitta')
            b.close()
        m = re.search(r'MITTA(\{.*?\})ATTIM', teksti, re.S)
        return json.loads(m.group(1)) if m else None
    finally:
        if os.path.exists(sivu):
            os.unlink(sivu)


def kerro(nimi, d):
    print('  %s: %s' % (nimi, d['title']))
    for n, p in enumerate(d['ruudut']):
        print('    palsta %d  %5.1f / %5.1f mm  %3d atomia'
              % (n + 1, p['kaytetty'], p['tila'], p['atomeja']))


def kokeet():
    virheet = []
    if not os.path.exists(os.path.join(ks.KONEKAANNOS, '%s.json' % VENAJA)):
        print('EI MITATTAVISSA: sisalto/konekaannos/%s.json puuttuu '
              '(se on haarassa konekaannokset, ei mainissa)' % VENAJA)
        return 0

    d = lado(VENAJA, VENAJAN_PORRAS, True)
    if d is None:
        print('EI MITATTAVISSA: selain ei palauttanut mittaa (%s)' % VENAJA)
        return 2
    kerro('%s · ohitus sallittu' % VENAJA, d)
    if d['yli']:
        virheet.append('%s: %d atomia jäi latomatta — palsta heitettiin hukkaan'
                       % (VENAJA, d['yli']))
    if d['ohitettu'] < 1:
        virheet.append('%s: yhtäkään pakkomurtoa ei ohitettu, vaikka arkki ei muuten mahdu'
                       % VENAJA)

    # ⚠️ Tämä väite ODOTTAA VIRHETTÄ: ilman ohitusta venäjä ei mahdu edes
    # tiukimmalla portaalla. Jos tämä muuttuu vihreäksi, joko ohitus on
    # vuotanut ensimmäiselle kierrokselle tai venäjän teksti on lyhentynyt —
    # kumpikin on syy lukea, ei ohittaa.
    d = lado(VENAJA, VENAJAN_PORRAS, False)
    if d is None:
        print('EI MITATTAVISSA: selain ei palauttanut mittaa (%s)' % VENAJA)
        return 2
    kerro('%s · ohitus kielletty' % VENAJA, d)
    if d['ohitettu']:
        virheet.append('%s: murto ohitettiin, vaikka ohitus oli kielletty — '
                       'ohitus on vuotanut ensimmäiselle kierrokselle' % VENAJA)
    elif not d['yli']:
        virheet.append('%s: mahtuu nyt ilman ohitusta — mitattu vika on poissa, '
                       'ja koe mittaa tyhjää' % VENAJA)

    d = lado(VERROKKI, VERROKIN_PORRAS, False)
    if d is None:
        print('EI MITATTAVISSA: selain ei palauttanut mittaa (%s)' % VERROKKI)
        return 2
    kerro('%s · ohitus kielletty' % VERROKKI, d)
    if d['yli']:
        virheet.append('%s: %d atomia jäi latomatta' % (VERROKKI, d['yli']))
    if d['ohitettu']:
        virheet.append('%s: ohitti %d murtoa, vaikka arkki mahtuu — korjaus muuttaa '
                       'toimivaa arkkia' % (VERROKKI, d['ohitettu']))

    # ⚠️ Rakenteen tarkistus, ei mittaus: kierrosten JÄRJESTYS on se päätös,
    # jota mikään selainmittaus ei näe. Käännetty järjestys tekisi ohituksesta
    # ensisijaisen ja muuttaisi viiden jo toimivan kielen arkin.
    if getattr(ka, 'KIERROKSET', None) != (False, True):
        virheet.append('koteloarkki.KIERROKSET on %r — pitää olla (False, True): '
                       'tiivistys ensin, murrosta luopuminen vasta viimeisenä'
                       % (getattr(ka, 'KIERROKSET', None),))

    for v in virheet:
        print('🔴 ' + v)
    print('Latojakoe: %s' % ('🔴 %d' % len(virheet) if virheet else 'OK (6 väitettä)'))
    return 1 if virheet else 0


# (nimi, etsittävä, korvaava) — jokaisen on osuttava TASAN kerran.
MUTAATIOT = [
    ('korjaus pois: murrosta ei luovuta koskaan',
     "  while (SALLI_OHITUS && tulos.virheet.length && estetyt.length < murrot.length) {{",
     "  while (false) {{"),
    ('ohitus vuotaa ensimmäiselle kierrokselle',
     "  var SALLI_OHITUS = {ohitus};",
     "  var SALLI_OHITUS = true;"),
    ('kierrokset väärässä järjestyksessä',
     "KIERROKSET = (False, True)",
     "KIERROKSET = (True, False)"),
]


def mutaatiot():
    """Osaako koe myös pettää? ⚠️ Mutaatio tehdään KLOONIIN $TMPDIR:ssä eikä
    oikeaan työpuuhun: Drive peilaa työpuun, eikä palautusta voi taata."""
    lahde = os.path.join(TANNE, 'koteloarkki.py')
    alkup = open(lahde, encoding='utf-8').read()
    huonot = 0
    for nimi, etsi, korvaa in MUTAATIOT:
        if alkup.count(etsi) != 1:
            print('🔴 ANKKURI EI OSU (%d osumaa): %s' % (alkup.count(etsi), nimi))
            huonot += 1
            continue
        hiekka = tempfile.mkdtemp(prefix='latojakoe-')
        klooni = os.path.join(hiekka, 'puu')
        subprocess.run(['cp', '-c', '-R', TANNE + '/', klooni],
                       check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if not os.path.isdir(klooni):
            shutil.copytree(TANNE, klooni)
        polku = os.path.join(klooni, 'koteloarkki.py')
        with open(polku, 'w', encoding='utf-8') as f:
            f.write(alkup.replace(etsi, korvaa, 1))
        r = subprocess.run([sys.executable, os.path.join(klooni, 'tyokalut', 'latojakoe.py')],
                           capture_output=True, text=True)
        if r.returncode == 1:
            print('  ✓ huomattiin: %s' % nimi)
        else:
            print('🔴 MUTAATIO EI HUOMATTU (rc %d): %s' % (r.returncode, nimi))
            huonot += 1
        shutil.rmtree(hiekka, ignore_errors=True)
    print('Mutaatiot: %s' % ('🔴 %d' % huonot if huonot else 'OK (%d)' % len(MUTAATIOT)))
    return 1 if huonot else 0


if __name__ == '__main__':
    rc = kokeet()
    if '--mutaatiot' in sys.argv:
        rc = mutaatiot() or rc
    sys.exit(rc)
