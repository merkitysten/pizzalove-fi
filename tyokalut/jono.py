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
syystä joka kerta ei onnistu kuudennellakaan. Viisi vuorokautta on «ennemmin tai
myöhemmin»; ikuinen uudelleenyritys olisi vain laskutettu toivo. Rivi JÄÄ jonoon
kun raja täyttyy, jotta se näkyy (`jono.py tila`) eikä katoa hiljaa.

📐 MITÄ YKSI YRITYS MAKSAA (Marko 22.11.2026: «voiko siis olla niin, että joku
kieli maksaakin n. 5 dollaria?»). Yksi yritys on 1–2 API-kutsua: `kaanna_kerran`
antaa mallin korjata kerran, jos tarkistus löytää virheitä. Hinnastosta
(claude-opus-5-5: 4 $ / 20 $ per Mtok) ja ASIAKASKAANNOS.md:n mitatusta koosta
(45 000 syöte- ja 8 000 tulostetokenia) yksi kutsu on noin 0,34 $, eli yritys
0,34–0,68 $ ja viisi yritystä 1,7–3,4 $. ⚠️ MUTTA ARVIO EI TUNNE
AJATTELUTOKENEITA, jotka opus-5-5 tuottaa oletuksena ja jotka hinnoitellaan
tulosteena — mitattu kutsu voi siis olla kaksi kertaa tuo. Siksi hintaa ei
jätetä yrityskaton varaan: todellinen kulu kirjataan jonon riville (`dollaria`)
API:n omista usage-luvuista, ja `KULUKATTO_DOLLARIA` pysäyttää kielen rahassa.
Ilmainen epäonnistuminen (päiväkatto) ei kuluta maksettua yritystä lainkaan.

⚠️ ARKKI ON ERI ASIA KUIN KÄÄNNÖS, eikä se ole jonossa. Puuttuva arkki näkyy
tiedostoista (`puuttuvat`), sen uusiminen ei maksa mitään, ja siksi sitä
yritetään joka ajossa ilman kattoa.

  python3 tyokalut/jono.py paivita <koodi> "<syy>" [kulukirja] [tulos]  pois : jonoon
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
# ⚠️ KATTO LASKEE VAIN MAKSETTUJA YRITYKSIÄ. 📐 Marko 22.11.2026: «voiko siis
# olla niin, että joku kieli maksaakin n. 5 dollaria?» Päiväkatto ei kuluta
# mitään (kaanna.py poistuu ennen ensimmäistä API-kutsua), joten ilmainen
# epäonnistuminen ei saa syödä maksetusta budjetista. Kuluiko rahaa, luetaan
# kulukirjasta (KAANNOS_KULUKIRJA) eikä arvata.
YRITYKSET_MAKS = 5
# Ja raja myös ilmaisille, jotta väärä tunniste tai rikkinäinen ohje ei jää
# yrittämään ikuisesti. 20 yötä, ja sitten rivi jää näkyviin.
YRITYKSET_KAIKKI_MAKS = 20
# ⚠️ RAHARAJA, koska Markon kysymys oli rahasta eikä yrityksistä: yksi kieli ei
# saa kuluttaa enempää. Yrityskatto ei yksin riitä rajaamaan hintaa, koska yhden
# yrityksen hinta ei ole vakio — se on 1–2 kutsua, ja ajattelutokenit vaihtelevat
# (mitattu kutsu voi olla 0,34 $ tai kaksi kertaa enemmän). Raja tarkistetaan
# ENNEN yritystä, joten viimeinen yritys voi ylittää sen: yläraja on siis
# KULUKATTO + yksi yritys. Tuntemattomalla mallilla hintaa ei lasketa, ja
# silloin rajaa pitää yrityskatto.
KULUKATTO_DOLLARIA = 2.00
# Hinnasto, $ / miljoona tokenia (Anthropicin oma hinnasto 22.11.2026).
# ⚠️ Nämä ovat kaanna.py:n MALLI-kohtaisia: jos malli vaihtuu, lisää rivi —
# tuntemattomalle mallille hintaa EI arvata, vaan se sanotaan tuntemattomaksi.
HINNASTO = {'claude-opus-5-5': (4.00, 20.00),
            'claude-opus-5': (5.00, 25.00),
            'claude-sonnet-5-5': (2.00, 10.00)}
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


# ------------------------------------------------------------------ laji
# 🔵 Marko 22.11.2026: «Eikai niitä eri tapoja epäonnistua voi olla määräänsä
# enempää?» Ei voi, ja kaanna.py kirjoittaa lajin ulos (KAANNOS_TULOS).
#   paatos   EI yritetä uudelleen koskaan — rivi ei jää jonoon lainkaan
#   katto    huomenna, ilmainen
#   asetus   ilmainen; korjaantuu kun me korjaamme
#   api      ohimenevä, kannattaa yrittää
#   katkesi  sama pyyntö katkeaa samaan kohtaan → EI toistoa samalla syyllä
#   hylatty  tarkistus hylkäsi; tunniste kertoo onko syy SAMA kuin viimeksi
# ⚠️ `odottaa_korjausta` pysäyttää vain YÖAJON, joka maksaa ilman toivoa uudesta
# tuloksesta. Markon käsiajo (Actions → Run workflow) ja asiakkaan «Pyydä»-nappi
# käynnistävät kielen suoraan eivätkä katso tätä lippua lainkaan — korjauksen
# jälkeen mitään ei tarvitse nollata käsin.
TOISTO_EI_AUTA = ('hylatty', 'katkesi')


def lue_tulos(polku):
    """kaanna.py:n kirjoittama {laji, viesti, tunniste} — tai tyhjä."""
    if not polku or not os.path.exists(polku):
        return {}
    try:
        d = json.load(open(polku, encoding='utf-8'))
    except (ValueError, OSError):
        print('⚠️  Tulostiedosto ei jäsenny: %s' % polku)
        return {}
    return d if isinstance(d, dict) else {}


# ------------------------------------------------------------------ kulut
def kulut(kulukirja):
    '''Mitä tämä ajo on maksanut: (kutsuja, dollaria, syote, tuloste).

    `dollaria` on None, jos jonkin kutsun mallia ei ole hinnastossa — hintaa ei
    arvata. ⚠️ Kolme tilaa: tiedostoa ei ole (= yhtään API-kutsua ei tehty, ja
    se on se tieto jota katto tarvitsee), tiedosto on ja rivejä on, tai rivi ei
    jäsenny (ohitetaan ääneen).'''
    if not kulukirja or not os.path.exists(kulukirja):
        return 0, 0.0, 0, 0
    kutsuja, dollaria, syote, tuloste, tuntematon = 0, 0.0, 0, 0, False
    for rivi in open(kulukirja, encoding='utf-8'):
        rivi = rivi.strip()
        if not rivi:
            continue
        try:
            d = json.loads(rivi)
        except ValueError:
            print('⚠️  kulukirjan rivi ei jäsenny: %s' % rivi[:60])
            continue
        kutsuja += 1
        syote += int(d.get('syote') or 0)
        tuloste += int(d.get('tuloste') or 0)
        hinta = HINNASTO.get(d.get('malli'))
        if hinta:
            dollaria += (int(d.get('syote') or 0) * hinta[0]
                         + int(d.get('tuloste') or 0) * hinta[1]) / 1e6
        else:
            tuntematon = True
    return kutsuja, (None if tuntematon else round(dollaria, 3)), syote, tuloste


# ------------------------------------------------------------------ jono
def paivita(koodi, syy='', juuri=TANNE, nyt=None, kulukirja=None, tulos=None):
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
    t = lue_tulos(tulos)
    laji = t.get('laji') or ''
    # ⚠️ PÄÄTÖS EI OLE EPÄONNISTUMINEN: tuntematon kielikoodi, liian pieni
    # puhujamäärä tai ihmisen tarkastama kieli ei muutu yöllä. Rivi ei jää
    # jonoon lainkaan — muuten se näyttäisi tilaukselta, joka on tulossa.
    if laji == 'paatos':
        if koodi in d:
            del d[koodi]
            kirjoita(d, juuri)
        return 'PÄÄTÖS: %s ei käänny automaattisesti — %s' % (koodi, t.get('viesti') or syy)
    rivi = d.get(koodi) or {}
    rivi['pyydetty'] = rivi.get('pyydetty') or (nyt or nyt_iso())
    rivi['viimeksi'] = nyt or nyt_iso()
    rivi['syy'] = (syy or '')[:200]
    # ⚠️ Ilman kulukirjan polkua oletus on MAKSOI. Väärä oletus toiseen suuntaan
    # tarkoittaisi rajattomasti maksettuja yrityksiä; tämä suunta vain pysähtyy
    # aikaisemmin, ja sen Marko näkee jonosta.
    kutsuja, dollaria, _, _ = kulut(kulukirja) if kulukirja else (1, None, 0, 0)
    # Sama hylkäys kahdesti = systemaattinen syy, ei huono tuuri. Silloin yöajo
    # lakkaa maksamasta siitä, ja rivi jää näkyviin odottamaan korjausta.
    if laji:
        rivi['laji'] = laji
    if laji in TOISTO_EI_AUTA:
        tunniste = t.get('tunniste') or laji
        if rivi.get('tunniste') == tunniste:
            rivi['odottaa_korjausta'] = True
        rivi['tunniste'] = tunniste
    if kutsuja:
        rivi['yritykset'] = int(rivi.get('yritykset') or 0) + 1
        if dollaria is not None:
            rivi['dollaria'] = round(float(rivi.get('dollaria') or 0) + dollaria, 3)
        rivi['kutsuja'] = int(rivi.get('kutsuja') or 0) + kutsuja
    else:
        rivi['ilmaisia'] = int(rivi.get('ilmaisia') or 0) + 1
    d[koodi] = rivi
    kirjoita(d, juuri)
    if rivi.get('odottaa_korjausta'):
        return ('ODOTTAA KORJAUSTA: %s hylättiin kahdesti samasta syystä (%s) — '
                'yöajo ei yritä uudelleen, käsiajo ja asiakkaan nappi yrittävät.'
                % (koodi, t.get('viesti') or rivi['syy'] or laji))
    if not kutsuja:
        return ('JONOON: %s (ilmainen yritys %d, laji %s) — %s'
                % (koodi, rivi['ilmaisia'], laji or 'tuntematon',
                   rivi['syy'] or 'syy ei tiedossa'))
    return ('JONOON: %s (maksettu yritys %d/%d, %d kutsua, %s) — %s'
            % (koodi, rivi['yritykset'], YRITYKSET_MAKS, kutsuja,
               ('%.2f $ yhteensä' % rivi['dollaria']) if rivi.get('dollaria') is not None
               else 'hinta tuntematon', rivi['syy'] or 'syy ei tiedossa'))


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
        if (int(rivi.get('yritykset') or 0) + int(rivi.get('ilmaisia') or 0)
                >= YRITYKSET_KAIKKI_MAKS):
            continue
        if float(rivi.get('dollaria') or 0) >= KULUKATTO_DOLLARIA:
            continue
        if rivi.get('odottaa_korjausta'):
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
        rivit.append('  %-8s %-9s maksettu %s/%s · ilmaisia %s · %s · pyydetty %s%s\n      %s'
                     % (koodi, r.get('laji') or '?', r.get('yritykset') or 0, YRITYKSET_MAKS,
                        r.get('ilmaisia') or 0,
                        ('%.2f $' % r['dollaria']) if r.get('dollaria') is not None else '– $',
                        (r.get('pyydetty') or '?')[:10],
                        ' · 🔴 ODOTTAA KORJAUSTA' if r.get('odottaa_korjausta') else '',
                        r.get('syy') or ''))
    print('Jono (%s): %d kieltä odottaa käännöstä · rajat: %d maksettua yritystä '
          'tai %.2f $ kieleltä' % (JONO_TIEDOSTO, len(d), YRITYKSET_MAKS, KULUKATTO_DOLLARIA))
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

    # 6. kulut(): kolme tilaa, ja hinta lasketaan eikä arvata.
    j = _hiekka()
    kk = os.path.join(j, 'kulu.jsonl')
    vaadi(kulut(kk) == (0, 0.0, 0, 0), 'puuttuva kulukirja ei tarkoittanut nollaa')
    with open(kk, 'w', encoding='utf-8') as f:
        for _ in range(2):
            f.write(json.dumps({'malli': 'claude-opus-5-5', 'syote': 45000,
                                'tuloste': 8000}) + '\n')
    kutsuja, dollaria, syote, _ = kulut(kk)
    vaadi((kutsuja, syote) == (2, 90000), 'kutsut tai tokenit laskettiin väärin')
    vaadi(dollaria == 0.68, 'hinta laskettiin väärin: %r (odotus 0.68)' % dollaria)
    open(kk, 'a', encoding='utf-8').write(json.dumps(
        {'malli': 'tuntematon-malli', 'syote': 10, 'tuloste': 10}) + '\n')
    vaadi(kulut(kk)[1] is None, 'tuntemattoman mallin hinta arvattiin')

    # 7. Ilmainen epäonnistuminen ei kuluta maksettua yritystä.
    # 📐 Tämä on se, mitä Marko kysyi: päiväkatto ei maksa mitään, joten se ei
    # saa viedä budjetista. Kulukirjaa EI ole = yhtään API-kutsua ei tehty.
    j = _hiekka()
    tyhja = os.path.join(j, 'ei-kutsuja.jsonl')
    paivita('hi', 'päiväkatto täynnä', j, '2026-11-20T10:00:00Z', kulukirja=tyhja)
    r = lue(j)['hi']
    vaadi(int(r.get('yritykset') or 0) == 0, 'ilmainen yritys kulutti maksetun')
    vaadi(r.get('ilmaisia') == 1, 'ilmaista yritystä ei kirjattu')
    vaadi(seuraava(j, '2026-11-21T10:00:00Z') == 'hi', 'ilmainen yritys esti uuden')
    maksoi = os.path.join(j, 'kulu.jsonl')
    open(maksoi, 'w', encoding='utf-8').write(json.dumps(
        {'malli': 'claude-opus-5-5', 'syote': 45000, 'tuloste': 8000}) + '\n')
    paivita('hi', 'käännös hylätty', j, '2026-11-22T10:00:00Z', kulukirja=maksoi)
    r = lue(j)['hi']
    vaadi(r.get('yritykset') == 1, 'maksettua yritystä ei kirjattu')
    vaadi(r.get('dollaria') == 0.34, 'kulu ei kertynyt riville: %r' % r.get('dollaria'))
    paivita('hi', 'käännös hylätty', j, '2026-11-23T10:00:00Z', kulukirja=maksoi)
    vaadi(lue(j)['hi'].get('dollaria') == 0.68, 'kulu ei summautunut')
    # Ilman kulukirjan polkua oletus on maksoi (varma suunta).
    paivita('hi', 'tuntematon', j, '2026-11-24T10:00:00Z')
    vaadi(lue(j)['hi'].get('yritykset') == 3, 'tuntematon kulu luettiin ilmaiseksi')

    # 8. Raharaja pysäyttää, vaikka yrityksiä olisi jäljellä.
    vaadi(KULUKATTO_DOLLARIA == 2.00, 'raharaja muuttui — päivitä tämä koe ja PAATOSLOKI')
    j = _hiekka()
    kallis = os.path.join(j, 'kallis.jsonl')
    # Yksi kutsu, jossa ajattelu nostaa tulosteen: 46 000 × 4 + 60 000 × 20.
    open(kallis, 'w', encoding='utf-8').write(json.dumps(
        {'malli': 'claude-opus-5-5', 'syote': 46000, 'tuloste': 60000}) + '\n')
    paivita('kal', 'käännös hylätty', j, '2026-11-20T10:00:00Z', kulukirja=kallis)
    vaadi(lue(j)['kal'].get('dollaria') == 1.384, 'kallis kutsu laskettiin väärin')
    vaadi(seuraava(j, '2026-11-25T10:00:00Z') == 'kal', 'raharaja pysäytti liian aikaisin')
    paivita('kal', 'käännös hylätty', j, '2026-11-26T10:00:00Z', kulukirja=kallis)
    vaadi(lue(j)['kal'].get('dollaria') == 2.768, 'kulu ei summautunut')
    vaadi(lue(j)['kal'].get('yritykset') == 2, 'yrityksiä pitäisi olla 2')
    vaadi(seuraava(j, '2026-12-01T10:00:00Z') is None,
          'raharaja ei pysäyttänyt, vaikka yrityksiä oli jäljellä')

    # 9. Ilmaisillakin on katto, jotta väärä tunniste ei yritä ikuisesti.
    vaadi(YRITYKSET_KAIKKI_MAKS == 20, 'kokonaiskatto muuttui — päivitä tämä koe')
    j = _hiekka()
    tyhja = os.path.join(j, 'ei-kutsuja.jsonl')
    for i in range(20):
        paivita('xx', 'API-virhe', j, '2026-11-%02dT10:00:00Z' % (i + 1), kulukirja=tyhja)
    vaadi(seuraava(j, '2026-12-20T10:00:00Z') is None, 'ilmaiset yritykset eivät pysähtyneet')

    # 10. Päätös ei jää jonoon: se ei ole epäonnistuminen vaan vastaus.
    j = _hiekka()
    tulos = os.path.join(j, 'tulos.json')
    json.dump({'laji': 'paatos', 'viesti': 'Kölsch (ksh): puhujia alle 50000'},
              open(tulos, 'w', encoding='utf-8'))
    v = paivita('ksh', '', j, '2026-11-20T10:00:00Z',
                kulukirja=os.path.join(j, 'ei.jsonl'), tulos=tulos)
    vaadi(v.startswith('PÄÄTÖS'), 'päätöstä ei tunnistettu: %s' % v)
    vaadi('ksh' not in lue(j), 'päätös jäi jonoon odottamaan ikuisesti')
    # Ja jos rivi oli jo jonossa, päätös poistaa sen.
    paivita('ksh', '', j, '2026-11-21T10:00:00Z', kulukirja=os.path.join(j, 'ei.jsonl'))
    vaadi('ksh' in lue(j), 'ilman lajia rivin pitäisi jäädä jonoon')
    paivita('ksh', '', j, '2026-11-22T10:00:00Z',
            kulukirja=os.path.join(j, 'ei.jsonl'), tulos=tulos)
    vaadi('ksh' not in lue(j), 'päätös ei poistanut vanhaa riviä')

    # 11. Samasta hylkäyssyystä ei makseta kahdesti.
    j = _hiekka()
    maksoi = os.path.join(j, 'kulu.jsonl')
    open(maksoi, 'w', encoding='utf-8').write(json.dumps(
        {'malli': 'claude-opus-5-5', 'syote': 45000, 'tuloste': 8000}) + '\n')
    t1 = os.path.join(j, 't1.json')
    json.dump({'laji': 'hylatty', 'viesti': 'ui: puuttuvat avaimet', 'tunniste': 'aaa111'},
              open(t1, 'w', encoding='utf-8'))
    t2 = os.path.join(j, 't2.json')
    json.dump({'laji': 'hylatty', 'viesti': 'korttipeli: luvut', 'tunniste': 'bbb222'},
              open(t2, 'w', encoding='utf-8'))
    paivita('xy', 'hylätty', j, '2026-11-20T10:00:00Z', kulukirja=maksoi, tulos=t1)
    vaadi(lue(j)['xy'].get('tunniste') == 'aaa111', 'hylkäyksen tunnistetta ei kirjattu')
    vaadi(not lue(j)['xy'].get('odottaa_korjausta'), 'yksi hylkäys riitti pysäyttämään')
    paivita('xy', 'hylätty', j, '2026-11-21T10:00:00Z', kulukirja=maksoi, tulos=t2)
    vaadi(not lue(j)['xy'].get('odottaa_korjausta'), 'ERI syy pysäytti yrittämisen')
    vaadi(seuraava(j, '2026-11-22T10:00:00Z') == 'xy', 'eri syyn jälkeen ei yritetty')
    paivita('xy', 'hylätty', j, '2026-11-22T10:00:00Z', kulukirja=maksoi, tulos=t2)
    vaadi(lue(j)['xy'].get('odottaa_korjausta'), 'sama syy kahdesti ei pysäyttänyt')
    vaadi(seuraava(j, '2026-11-25T10:00:00Z') is None, 'yöajo yritti silti uudelleen')
    # Katkennut vastaus: ei tunnistetta, laji itse kelpaa tunnisteeksi.
    j = _hiekka()
    tk = os.path.join(j, 'katkesi.json')
    json.dump({'laji': 'katkesi', 'viesti': 'Vastaus katkesi'}, open(tk, 'w', encoding='utf-8'))
    for pv in ('20', '21'):
        paivita('zz', 'katkesi', j, '2026-11-%sT10:00:00Z' % pv, kulukirja=maksoi, tulos=tk)
    vaadi(lue(j)['zz'].get('odottaa_korjausta'), 'katkennut vastaus yritti kolmannen kerran')

    # 12. Lajiluettelo on SULJETTU: jokainen kaanna.py:n oma SystemExit-viesti
    # luokittuu. 📐 Tämä on se koe, joka vastaa Markon kysymykseen «eikö niitä
    # tapoja voi olla määräänsä enempää» — jos joku lisää uuden ulospääsyn
    # lisäämättä lajia, tämä menee punaiseksi.
    import ast as _ast
    import importlib
    try:
        ka = importlib.import_module('kaanna')
    except Exception as _v:                        # ei saa kaataa muuta koetta
        print('ℹ️  kaanna.py:tä ei voitu ladata (%s) — lajikoe EI MITATTAVISSA' % _v)
        ka = None
    if ka:
        lahde = open(os.path.join(TANNE, 'tyokalut', 'kaanna.py'), encoding='utf-8').read()
        ohita = ('Käyttö:', 'Toistettavuu')
        viestit, luokittamatta = [], []
        for solmu in _ast.walk(_ast.parse(lahde)):
            if not (isinstance(solmu, _ast.Raise) and isinstance(solmu.exc, _ast.Call)
                    and getattr(solmu.exc.func, 'id', '') == 'SystemExit'):
                continue
            a = solmu.exc.args[0] if solmu.exc.args else None
            teksti = None
            if isinstance(a, _ast.Constant) and isinstance(a.value, str):
                teksti = a.value
            elif isinstance(a, _ast.BinOp) and isinstance(a.left, _ast.Constant):
                teksti = a.left.value          # 'teksti %s' % arvo
            elif isinstance(a, _ast.JoinedStr):
                teksti = ''.join(x.value for x in a.values if isinstance(x, _ast.Constant))
            if not teksti or teksti.startswith(ohita):
                continue
            viestit.append(teksti)
            if ka.laji_viestista(teksti) == 'tuntematon':
                luokittamatta.append(teksti[:50])
        vaadi(len(viestit) >= 8, 'ulospääsyjä löytyi vain %d — jäsennys ei toimi' % len(viestit))
        vaadi(not luokittamatta, 'kaanna.py:n ulospääsyä ei ole luokiteltu: %s' % luokittamatta)
        vaadi(ka.laji_viestista('ihan jotain muuta') == 'tuntematon',
              'luokittelija antaa lajin mille tahansa')
        vaadi(ka.hylkays_tunniste(['a', 'b']) == ka.hylkays_tunniste(['b', 'a']),
              'hylkäyksen tunniste riippuu virheiden järjestyksestä')
        vaadi(ka.hylkays_tunniste(['a']) != ka.hylkays_tunniste(['b']),
              'eri hylkäys antoi saman tunnisteen')

    # 13. Rikkinäinen jono ei kaada ajoa.
    j = _hiekka()
    open(os.path.join(j, JONO_TIEDOSTO), 'w').write('{ tämä ei ole jsonia')
    vaadi(lue(j) == {}, 'rikkinäinen jono kaatoi lukemisen')
    vaadi('JONOON' in paivita('fa', '', j), 'rikkinäisen jonon päälle ei voi kirjoittaa')

    for v in virheet:
        print('🔴 ' + v)
    print('Itsetesti: %s' % ('🔴 %d' % len(virheet) if virheet else 'OK (59 väitettä)'))
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
        ('kokonaiskatto pois', 'YRITYKSET_KAIKKI_MAKS', 10 ** 6),
        ('hinnasto tyhjä', 'HINNASTO', {}),
        ('raharaja pois', 'KULUKATTO_DOLLARIA', 10 ** 6),
        ('toisto auttaa aina', 'TOISTO_EI_AUTA', ()),
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

    # Ja funktiomutaatiot: tuomio joka ei koskaan hylkää mitään, ja kulumittaus
    # joka pitää jokaista yritystä maksettuna (eli ilmainen päiväkatto söisi
    # budjetin — juuri se, mitä Marko kysyi).
    for nimi, avain, korvike in (('kaikki PDF:t ehjiä', 'pdf_ehja', lambda polku: True),
                                 ('joka yritys näyttää maksetulta', 'kulut',
                                  lambda kk: (1, 0.34, 45000, 8000)),
                                 ('lajia ei lueta', 'lue_tulos', lambda polku: {})):
        vanha = getattr(mod, avain)
        setattr(mod, avain, korvike)
        try:
            tulos = itsetesti()
        finally:
            setattr(mod, avain, vanha)
        print('  mutaatio «%s»: %s' % (nimi, 'HUOMATTIIN' if tulos else '🔴 EI HUOMATTU'))
        if not tulos:
            huonot.append(nimi)
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
        print(paivita(sys.argv[2].strip().lower(),
                      sys.argv[3] if len(sys.argv) > 3 else '',
                      kulukirja=(sys.argv[4] if len(sys.argv) > 4
                                 else os.environ.get('KAANNOS_KULUKIRJA')),
                      tulos=(sys.argv[5] if len(sys.argv) > 5
                             else os.environ.get('KAANNOS_TULOS'))))
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
