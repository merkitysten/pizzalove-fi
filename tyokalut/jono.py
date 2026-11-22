# -*- coding: utf-8 -*-
"""Tilaus ei katoa: kielijono ja arkin tuomio.

🔵 Marko 22.11.2026: «Kunhan systeemi alkaa toimia niin, että kun asiakas
tilaa jonkin kielen, niin se sinne tulee ennemmin tai myöhemmin, mutta tulee
kumminkin.»

📐 MIKSI TÄMÄ TARVITTIIN. Pyyntöä ei talleteta palvelimelle (Marko 16.11.2026:
«ei tietokantaa, ei lokia, ei IP:tä, ei evästettä»), joten ENNEN tätä kaatunut
ajo oli tilauksen loppu — lukija näki «valmistuu noin tunnissa», eikä kukaan
tiennyt ettei se valmistunut. Kolme mitattua tapaa menettää tilaus:

  16.11.  hindi: käännös onnistui, ajo kaatui arkkiin → käännös katosi
  19.11.  arabia: «kaikki»-ajo kuoli ensimmäiseen arkkiin → kuusi kieltä jäi
  22.11.  viro: arkki valmistui, QR-koe kaatui → sivua ei julkaistu lainkaan

Kaksi ensimmäistä on korjattu (käännös talteen heti, yksi kieli ei kaada
muita), kolmas 22.11. Jäljelle jäi se tapaus jota mikään ei korjaa: käännöstä
EI syntynyt (päiväkatto täynnä, tarkistus hylkäsi, API-virhe). Sitä varten on
tämä jono, ja se asuu haarassa `konekaannokset` — ei palvelimella, ei repon
main-haarassa: tilaus muistetaan siellä missä työ tehdään, eikä lukijasta
tallennu mitään. Tiedosto on `konekaannos-jono.json` repon JUURESSA eikä
`sisalto/konekaannos/`issa, koska siellä jokainen `*.json` on yksi kieli
(`ls sisalto/konekaannos/*.json` ajossa, `lue_konekaannokset` rakenna.py:ssä)
ja jono olisi näyttänyt kieleltä nimeltä «jono».

⚠️ YRITYKSET_MAKS on raja, ja se on tietoinen. Käännös joka hylätään samasta
syystä joka kerta ei onnistu kuudennellakaan, ja jokainen yritys maksaa noin
dollarin. Viisi vuorokautta on «ennemmin tai myöhemmin»; ikuinen uudelleenyritys
olisi vain laskutettu toivo. Rivi JÄÄ jonoon kun raja täyttyy, jotta se näkyy
(`jono.py tila`) eikä katoa hiljaa.

⚠️ ARKKI ON ERI ASIA KUIN KÄÄNNÖS, eikä se ole jonossa. Puuttuva arkki näkyy
tiedostoista (`puuttuvat`), sen uusiminen ei maksa mitään, ja siksi sitä
yritetään joka ajossa ilman kattoa.

  python3 tyokalut/jono.py paivita <koodi> "<syy>"     onnistui? pois : jonoon
  python3 tyokalut/jono.py seuraava                    vanhin kesken, 1 kpl
  python3 tyokalut/jono.py puuttuvat                   käännös on, arkki ei
  python3 tyokalut/jono.py arkki <koodi> <loki>        saako arkki lähteä?
  python3 tyokalut/jono.py tila                        ihmisen luettava
  python3 tyokalut/jono.py --itsetesti [--mutaatiot]
"""
import datetime
import json
import os
import sys

TANNE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

JONO_TIEDOSTO = 'konekaannos-jono.json'
YRITYKSET_MAKS = 5
# Sama kieli ei yritä kahdesti saman vuorokauden aikana, vaikka ajo
# käynnistettäisiin käsin kahdesti: yritys on API-kutsu eli rahaa.
ODOTUS_TUNNIT = 6
# Pienin uskottava PDF. 📐 Mitattu 22.11.2026 repon kaikista 24 PDF:stä:
# korttipelin sääntöarkit ovat 4,0–4,6 Mt ja pienin PDF ylipäätään 165 kt,
# joten tämä erottaa katkenneen kirjoituksen valmiista eikä hylkää yhtäkään
# oikeaa arkkia.
PIENIN_PDF = 100 * 1024


def nyt_iso():
    return datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def _aika(s):
    try:
        return datetime.datetime.strptime(s, '%Y-%m-%dT%H:%M:%SZ').replace(
            tzinfo=datetime.timezone.utc)
    except (ValueError, TypeError):
        return None


def lue(juuri=TANNE):
    polku = os.path.join(juuri, JONO_TIEDOSTO)
    if not os.path.exists(polku):
        return {}
    try:
        d = json.load(open(polku, encoding='utf-8'))
    except ValueError:
        # ⚠️ Rikkinäinen jono EI saa kaataa ajoa: käännös on tärkeämpi kuin
        # kirjanpito siitä. Mutta se sanotaan ääneen.
        print('⚠️  %s ei jäsenny — aloitetaan tyhjästä' % polku)
        return {}
    return d if isinstance(d, dict) else {}


def kirjoita(d, juuri=TANNE):
    polku = os.path.join(juuri, JONO_TIEDOSTO)
    with open(polku, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=1, sort_keys=True)
        f.write('\n')
    return polku


def kaannos_polku(koodi, juuri=TANNE):
    return os.path.join(juuri, 'sisalto', 'konekaannos', koodi + '.json')


def kaannos_on(koodi, juuri=TANNE):
    return os.path.exists(kaannos_polku(koodi, juuri))


def koodit(juuri=TANNE):
    kansio = os.path.join(juuri, 'sisalto', 'konekaannos')
    if not os.path.isdir(kansio):
        return []
    return sorted(n[:-5] for n in os.listdir(kansio) if n.endswith('.json'))


def arkkipolku(koodi, juuri=TANNE):
    """julkinen/pdf/<tiedosto> käännöksen oman kentän mukaan (sama lähde kuin
    konekaannokset-haara.sh:lla — nimeä ei arvata kahdessa paikassa)."""
    try:
        d = json.load(open(kaannos_polku(koodi, juuri), encoding='utf-8'))
        nimi = d['kielet']['tiedosto']
    except (OSError, ValueError, KeyError):
        return None
    return os.path.join(juuri, 'julkinen', 'pdf', nimi)


def pdf_ehja(polku):
    """Onko tiedosto kokonainen PDF? Kolme ehtoa, kaikki halpoja: alkutunniste,
    lopputunniste ja koko. ⚠️ Tämä EI sano että sisältö on oikein — sitä kysyy
    koteloarkki.py:n oma koe, ja sen tuomio luetaan lokista."""
    if not polku or not os.path.exists(polku):
        return False
    if os.path.getsize(polku) < PIENIN_PDF:
        return False
    with open(polku, 'rb') as f:
        if f.read(5) != b'%PDF-':
            return False
        f.seek(max(0, os.path.getsize(polku) - 2048))
        return b'%%EOF' in f.read()


# ------------------------------------------------------------------ jono
def paivita(koodi, syy='', juuri=TANNE, nyt=None):
    """Yksi kutsu, joka osaa molemmat suunnat: jos käännös on levyllä, tilaus
    on toimitettu ja rivi poistuu; jos ei, se jää jonoon ja yrityslaskuri
    kasvaa. ⚠️ Yksi kutsu eikä kaksi siksi, että työnkulun YAMLissa ehtoja on
    helppo kirjoittaa väärin, ja väärä ehto tarkoittaisi kadonnutta tilausta."""
    d = lue(juuri)
    if kaannos_on(koodi, juuri):
        if koodi in d:
            del d[koodi]
            kirjoita(d, juuri)
            return 'VALMIS: %s poistettu jonosta' % koodi
        return 'VALMIS: %s on käännetty, jonossa ei ollut mitään' % koodi
    rivi = d.get(koodi) or {}
    rivi['pyydetty'] = rivi.get('pyydetty') or (nyt or nyt_iso())
    rivi['yritykset'] = int(rivi.get('yritykset') or 0) + 1
    rivi['viimeksi'] = nyt or nyt_iso()
    rivi['syy'] = (syy or '')[:200]
    d[koodi] = rivi
    kirjoita(d, juuri)
    return 'JONOON: %s (yritys %d/%d) — %s' % (koodi, rivi['yritykset'],
                                               YRITYKSET_MAKS, rivi['syy'] or 'syy ei tiedossa')


def seuraava(juuri=TANNE, nyt=None):
    """Vanhin tilaus joka on vielä toimittamatta — tai None.

    Järjestys: vähiten yrityksiä ensin, sitten vanhin pyyntö. Näin yksi
    hankala kieli ei syö jokaista vuoroa."""
    hetki = _aika(nyt or nyt_iso())
    ehdokkaat = []
    for koodi, rivi in lue(juuri).items():
        if kaannos_on(koodi, juuri):
            continue
        if int(rivi.get('yritykset') or 0) >= YRITYKSET_MAKS:
            continue
        viime = _aika(rivi.get('viimeksi'))
        if viime and hetki and (hetki - viime).total_seconds() < ODOTUS_TUNNIT * 3600:
            continue
        ehdokkaat.append((int(rivi.get('yritykset') or 0),
                          rivi.get('pyydetty') or '', koodi))
    return sorted(ehdokkaat)[0][2] if ehdokkaat else None


def puuttuvat(juuri=TANNE):
    """Kielet joilla on käännös mutta ei arkkia. ⚠️ Aja VASTA kun haaran
    tiedostot on haettu (konekaannokset-haara.sh hae) — muuten jokainen arkki
    näyttää puuttuvalta ja ajo tekee kaikki uudelleen turhaan."""
    ulos = []
    for k in koodit(juuri):
        p = arkkipolku(k, juuri)
        if not p or not pdf_ehja(p):
            ulos.append(k)
    return ulos


# ------------------------------------------------------------------ arkki
def arkkituomio(koodi, loki=None, juuri=TANNE):
    """Saako epäonnistuneen ajon arkki lähteä julkaisuun? Kolme tilaa, ei kahta.

    🔴 lokissa    sisältö ei kelpaa  → PDF pois (18.11.2026: «puuttuva nappi on
                                       oikea signaali, väärä sisältö ei ole»)
    ei 🔴, ehjä   EI MITATTAVISSA    → PDF jää (viron tapaus 22.11.2026: arkki
                                       oli kunnossa, vain koe kaatui)
    ei 🔴, rikki  kirjoitus katkesi  → PDF pois

    ⚠️ Keskimmäinen on se jota varten tämä on kirjoitettu funktioksi eikä
    yhdeksi grepiksi työnkulkuun: «kaatui» ja «on väärä» ovat eri asia, ja jos
    ne niputetaan, viron kaltainen kunnossa oleva arkki jää julkaisematta."""
    teksti = ''
    if loki and os.path.exists(loki):
        teksti = open(loki, encoding='utf-8', errors='replace').read()
    punainen = any(r.lstrip().startswith('🔴') for r in teksti.splitlines())
    polku = arkkipolku(koodi, juuri)
    ehja = pdf_ehja(polku)
    if punainen:
        tuomio, kuvaus = 'hylatty', 'sisältö ei kelpaa (🔴 lokissa) — arkki EI lähde julkaisuun'
    elif ehja:
        return 'ehja', 'EI MITATTAVISSA: arkki on ehjä PDF — jää julkaisuun, koe kaatui'
    else:
        tuomio, kuvaus = 'rikki', 'PDF puuttuu tai on katkennut — arkki EI lähde julkaisuun'
    if polku and os.path.exists(polku):
        os.remove(polku)
        kuvaus += ' (poistettu: %s)' % os.path.basename(polku)
    return tuomio, kuvaus


def tila(juuri=TANNE):
    d = lue(juuri)
    rivit = []
    for koodi in sorted(d):
        r = d[koodi]
        rivit.append('  %-8s yritys %s/%s · pyydetty %s · %s'
                     % (koodi, r.get('yritykset'), YRITYKSET_MAKS,
                        (r.get('pyydetty') or '?')[:10], r.get('syy') or ''))
    print('Jono (%s): %d kieltä odottaa käännöstä' % (JONO_TIEDOSTO, len(d)))
    print('\n'.join(rivit) if rivit else '  (tyhjä)')
    p = puuttuvat(juuri)
    print('Käännös on, arkki puuttuu: %s' % (' '.join(p) if p else '(ei yhtään)'))
    s = seuraava(juuri)
    print('Seuraava käännös: %s' % (s or '(ei mitään kesken)'))
    return 0


# ------------------------------------------------------------------ itsetesti
def _hiekka():
    import tempfile
    juuri = tempfile.mkdtemp(prefix='jonokoe-')
    os.makedirs(os.path.join(juuri, 'sisalto', 'konekaannos'))
    os.makedirs(os.path.join(juuri, 'julkinen', 'pdf'))
    return juuri


def _kaannos(juuri, koodi, pdf_nimi):
    json.dump({'kieli': koodi, 'konekaannos': True,
               'kielet': {'tiedosto': pdf_nimi}},
              open(kaannos_polku(koodi, juuri), 'w', encoding='utf-8'))


def _pdf(juuri, nimi, tavuja=PIENIN_PDF + 10, loppu=b'%%EOF\n'):
    polku = os.path.join(juuri, 'julkinen', 'pdf', nimi)
    with open(polku, 'wb') as f:
        f.write(b'%PDF-1.7\n' + b'0' * tavuja + loppu)
    return polku


def itsetesti():
    virheet = []

    def vaadi(ehto, nimi):
        if not ehto:
            virheet.append(nimi)

    # 1. Epäonnistunut käännös jää jonoon, ja laskuri kasvaa.
    j = _hiekka()
    paivita('ja', 'päiväkatto täynnä', j, '2026-11-22T10:00:00Z')
    vaadi(lue(j).get('ja', {}).get('yritykset') == 1, 'ensimmäinen yritys ei kirjautunut')
    paivita('ja', 'API-virhe', j, '2026-11-23T10:00:00Z')
    vaadi(lue(j).get('ja', {}).get('yritykset') == 2, 'toinen yritys ei kasvattanut laskuria')
    vaadi(lue(j).get('ja', {}).get('pyydetty') == '2026-11-22T10:00:00Z',
          'alkuperäinen pyyntöaika ei säilynyt')

    # 2. Onnistunut käännös poistaa rivin (tilaus on toimitettu).
    _kaannos(j, 'ja', 'saannot-ja.pdf')
    paivita('ja', '', j, '2026-11-24T10:00:00Z')
    vaadi('ja' not in lue(j), 'valmis käännös jäi jonoon')

    # 3. seuraava(): odotusaika, kattoraja ja järjestys.
    # ⚠️ Yritysten LUKUMÄÄRÄ on tässä kirjoitettu numerona eikä luettu
    # YRITYKSET_MAKS:ista. 📐 Mitattu 22.11.2026: vakiosta luettuna mutaatio
    # «kattoraja pois» (10^6) meni läpi, koska koe teki silloin miljoona
    # yritystä ja odotti silti pysähtymistä — odotus luettiin samasta
    # arvosta jota mutatoitiin, eli koe oli sokea juuri sille.
    vaadi(YRITYKSET_MAKS == 5, 'kattoraja muuttui — päivitä tämä koe ja PAATOSLOKI')
    j = _hiekka()
    paivita('ko', '', j, '2026-11-20T10:00:00Z')
    vaadi(seuraava(j, '2026-11-20T12:00:00Z') is None, 'tuore yritys yritettiin heti uudelleen')
    vaadi(seuraava(j, '2026-11-21T10:00:00Z') == 'ko', 'vuorokauden päästä ei yritetty')
    for _ in range(3):                                  # yhteensä 4 yritystä
        paivita('ko', '', j, '2026-11-21T10:00:00Z')
    vaadi(seuraava(j, '2026-12-01T10:00:00Z') == 'ko', 'neljäs yritys estyi liian aikaisin')
    paivita('ko', '', j, '2026-11-21T10:00:00Z')         # viides = katto täynnä
    vaadi(seuraava(j, '2026-12-01T10:00:00Z') is None, 'kattoraja ei pysäyttänyt yrittämistä')
    vaadi('ko' in lue(j), 'kattorajan täyttänyt rivi katosi jonosta')
    j = _hiekka()
    paivita('vanha', '', j, '2026-11-01T10:00:00Z')
    paivita('uusi', '', j, '2026-11-02T10:00:00Z')
    vaadi(seuraava(j, '2026-12-01T10:00:00Z') == 'vanha', 'vanhin ei ollut ensin')

    # 4. puuttuvat(): arkki on olemassa / puuttuu / on katkennut.
    j = _hiekka()
    _kaannos(j, 'et', 'saannot-et.pdf')
    _kaannos(j, 'pl', 'saannot-pl.pdf')
    _pdf(j, 'saannot-et.pdf')
    vaadi(puuttuvat(j) == ['pl'], 'puuttuva arkki ei löytynyt: %r' % (puuttuvat(j),))
    _pdf(j, 'saannot-pl.pdf', tavuja=10)          # katkennut: liian pieni
    vaadi(puuttuvat(j) == ['pl'], 'katkennut arkki luettiin valmiiksi')

    # 5. arkkituomio(): kolme tilaa.
    j = _hiekka()
    _kaannos(j, 'tr', 'saannot-tr.pdf')
    _pdf(j, 'saannot-tr.pdf')
    loki = os.path.join(j, 'loki.txt')
    open(loki, 'w', encoding='utf-8').write('ℹ️ tehty\n🔴 Luku 3 puuttuu arkista\n')
    tuomio, _ = arkkituomio('tr', loki, j)
    vaadi(tuomio == 'hylatty', 'väärä sisältö pääsi julkaisuun')
    vaadi(not os.path.exists(os.path.join(j, 'julkinen', 'pdf', 'saannot-tr.pdf')),
          'hylätty arkki jäi levylle')
    _pdf(j, 'saannot-tr.pdf')
    open(loki, 'w', encoding='utf-8').write('Traceback: p.chromium.launch kaatui\n')
    tuomio, _ = arkkituomio('tr', loki, j)
    vaadi(tuomio == 'ehja', 'kunnossa oleva arkki jäi julkaisematta (viron tapaus)')
    vaadi(os.path.exists(os.path.join(j, 'julkinen', 'pdf', 'saannot-tr.pdf')),
          'ehjä arkki poistettiin')
    _pdf(j, 'saannot-tr.pdf', tavuja=10)
    tuomio, _ = arkkituomio('tr', loki, j)
    vaadi(tuomio == 'rikki', 'katkennut PDF pääsi julkaisuun')

    # 6. Rikkinäinen jono ei kaada ajoa.
    j = _hiekka()
    open(os.path.join(j, JONO_TIEDOSTO), 'w').write('{ tämä ei ole jsonia')
    vaadi(lue(j) == {}, 'rikkinäinen jono kaatoi lukemisen')
    vaadi('JONOON' in paivita('fa', '', j), 'rikkinäisen jonon päälle ei voi kirjoittaa')

    for v in virheet:
        print('🔴 ' + v)
    print('Itsetesti: %s' % ('🔴 %d' % len(virheet) if virheet else 'OK (21 väitettä)'))
    return 1 if virheet else 0


def mutaatiot():
    """Osaako koe myös pettää? Mutaatio tehdään TÄSSÄ PROSESSISSA moduulin
    omiin arvoihin — tiedostoa ei muuteta, koska projektin kansio on Driven
    peilaama eikä palautusta voi taata (11.11.2026)."""
    mod = sys.modules[__name__]
    huonot = []
    kokeet = [
        ('kattoraja pois', 'YRITYKSET_MAKS', 10 ** 6),
        ('odotusaika pois', 'ODOTUS_TUNNIT', 0),
        ('katkennut PDF kelpaa', 'PIENIN_PDF', 0),
    ]
    for nimi, avain, arvo in kokeet:
        vanha = getattr(mod, avain)
        setattr(mod, avain, arvo)
        try:
            tulos = itsetesti()
        finally:
            setattr(mod, avain, vanha)
        print('  mutaatio «%s»: %s' % (nimi, 'HUOMATTIIN' if tulos else '🔴 EI HUOMATTU'))
        if not tulos:
            huonot.append(nimi)

    # Ja funktiomutaatio: tuomio joka ei koskaan hylkää mitään.
    vanha = mod.pdf_ehja
    mod.pdf_ehja = lambda polku: True
    try:
        tulos = itsetesti()
    finally:
        mod.pdf_ehja = vanha
    print('  mutaatio «kaikki PDF:t ehjiä»: %s' % ('HUOMATTIIN' if tulos else '🔴 EI HUOMATTU'))
    if not tulos:
        huonot.append('kaikki PDF:t ehjiä')
    print('Mutaatiot: %s' % ('🔴 %d ei huomattu' % len(huonot) if huonot else 'kaikki huomattiin'))
    return 1 if huonot else 0


def main():
    if '--itsetesti' in sys.argv:
        tulos = itsetesti()
        if '--mutaatiot' in sys.argv:
            tulos |= mutaatiot()
        return tulos
    komento = sys.argv[1] if len(sys.argv) > 1 else 'tila'
    if komento == 'tila':
        return tila()
    if komento == 'paivita':
        if len(sys.argv) < 3:
            raise SystemExit('käyttö: jono.py paivita <koodi> "<syy>"')
        print(paivita(sys.argv[2].strip().lower(), sys.argv[3] if len(sys.argv) > 3 else ''))
        return 0
    if komento == 'seuraava':
        k = seuraava()
        if k:
            print(k)
        return 0
    if komento == 'puuttuvat':
        print('\n'.join(puuttuvat()))
        return 0
    if komento == 'arkki':
        if len(sys.argv) < 3:
            raise SystemExit('käyttö: jono.py arkki <koodi> [loki]')
        tuomio, kuvaus = arkkituomio(sys.argv[2].strip().lower(),
                                     sys.argv[3] if len(sys.argv) > 3 else None)
        print('%s: %s' % (sys.argv[2], kuvaus))
        return 0 if tuomio == 'ehja' else 0
    raise SystemExit('tuntematon komento: %s' % komento)


if __name__ == '__main__':
    sys.exit(main())
