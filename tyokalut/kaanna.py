#!/usr/bin/env python3
"""Korttipelin säännöt asiakkaan pyytämälle kielelle (konekäännös).

🔵 Marko 16.11.2026: «Ei kai meillä ole tarvetta rajoittaa sitä
puoliautomaattiseksi? Mutta sellainen rajoitus pitää olla, ettei samalle
kielelle voi tehdä useampaa pyyntöä. Asiakkailla pitäisi olla mahdollisuus
ilmoittaa käännösvirheitä tai epäselvyyksistä.»

Käyttö (GitHub Actions, .github/workflows/konekaannos.yml):
    python3 tyokalut/kaanna.py pl        (mikä tahansa BCP 47 -koodi: zh-Hans, ja, pt-BR, es-419 …)
    python3 tyokalut/kaanna.py --taydenna
        täydentää aiemmat konekäännökset, joista puuttuu myöhemmin lisätty osa
        (sivun valikko ja napit «ui», tiedostokoon merkintä «koko»). Ei uusi
        käännös: ei kuluta päiväkattoa eikä riko «yksi pyyntö kieltä kohden» -sääntöä.
Paikallinen koe ilman API:a (valmis vastaus tiedostosta):
    python3 tyokalut/kaanna.py pl --vastaus vastaus.json

Lähteet: sisalto/{fi,en,sv}.json (korttipeli), korttisaannot.KIELET (arkin omat
tekstit) ja sisalto/SANASTO.md. Vertailukielet fi/en/sv ovat ihmisen
tarkastamia (SANASTO.md).
Tulos: sisalto/konekaannos/xx.json. koteloarkki.py tekee siitä PDF:n.

Tunnistautuminen: Workload Identity Federation (ei API-avainta). GitHubin
OIDC-tunnus vaihdetaan lyhytikäiseen Anthropic-tunnukseen ennen jokaista
kutsua. Tunnisteet: Verkkosivut/ASIAKASKAANNOS.md ja työnkulun env-kohta.

⚠️ YKSI PYYNTÖ KIELTÄ KOHDEN: jos sisalto/konekaannos/xx.json on jo olemassa,
käännöstä ei tehdä uudelleen (paitsi --uudelleen, vain Markon käsiajona).
"""

import datetime
import json
import os
import re
import sys
import urllib.request

TANNE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, TANNE)
import korttisaannot as ks  # noqa: E402

KONEKAANNOS = os.path.join(TANNE, 'sisalto', 'konekaannos')
MALLI = os.environ.get('KAANNOS_MALLI', 'claude-opus-5-5')
API = 'https://api.anthropic.com'
API_VERSIO = '2026-10-21'
# ⚠️ MAKS_TOKENIT KATTAA MYÖS AJATTELUN, EI VAIN JSONia. 📐 Mitattu 16.11.2026:
# hindin käännös katkesi 20 000 tokeniin (ajo 43904182452, «Vastaus katkesi
# (max_tokens)»), koska devanagari vie moninkertaisesti enemmän tokeneita kuin
# latinalainen kirjoitus — ja koska claude-opus-5-5 ajattelee oletuksena
# (adaptive), joten osa katosta meni ajatteluun. Mallin katto on 128 000.
# 64 000 on Anthropicin suositus suoratoistetulle pyynnölle, ja kysy() käyttää
# suoratoistoa (stream) 900 s:n aikarajalla, joten iso katto ei uhkaa aikarajaa.
# Katon nosto ei maksa mitään itsessään: tulostokeneista laskutetaan vain ne,
# jotka malli todella tuottaa.
MAKS_TOKENIT = 64000

# 🔵 Marko 16.11.2026: kielilistaa ei ole — mikä tahansa kieli kelpaa
# («Juuri näin»). Kiina, japani, korea, kreikka, kyrilliset jne. piirtyvät
# Noto-fonteilla (selaimen merkkikohtainen varafontti; koe 16.11. kiinalla).
# Tarkistus hylkää käännöksen, jos jokin ei täsmää, ja jokaisen uuden
# kirjoitusjärjestelmän ensimmäisen arkin Marko katsoo itse.
# ⚠️ Oikealta vasemmalle kirjoitettavat (arabia, heprea, persia, urdu …) vaativat
# peilatun asettelun, jota ei vielä ole: ne torjutaan selvällä viestillä.
PUHUJIA_VAHINTAAN = 50000
PAIVAKATTO = 10          # uusia konekäännöksiä enintään vuorokaudessa (kustannusten yläraja)
IHMISEN_TARKASTAMAT = ('fi', 'en', 'sv', 'de', 'nl', 'fr', 'es', 'sk')
OIKEALTA_VASEMMALLE = {'Arab', 'Hebr', 'Thaa', 'Syrc', 'Nkoo', 'Adlm', 'Mand', 'Samr', 'Rohg'}


def kieli(koodi):
    """BCP 47 -koodi (esim. pl, zh-Hans, pt-BR, es-419) -> (tiedostokoodi,
    standardoitu tagi, englanninkielinen nimi, oma nimi, kirjoitusjärjestelmä, alue)."""
    import langcodes
    try:
        k = langcodes.Language.get(koodi)
    except Exception:
        raise SystemExit('Virheellinen kielikoodi %r' % koodi)
    nimi_en = k.display_name('en')
    if not k.is_valid() or nimi_en.startswith('Unknown'):
        raise SystemExit('Tuntematon kieli %r' % koodi)
    # Väärinkäytön esto ilman talletusta: ISO 639-3:ssa on tuhansia koodeja, joten
    # satunnaisilla koodeilla voisi teettää satoja käännöksiä. Raja 50 000 puhujaa
    # päästää läpi esim. pohjoissaamen (53 000) ja fääriin (73 000).
    if k.speaking_population() < PUHUJIA_VAHINTAAN:
        raise SystemExit('%s (%s): puhujia alle %d — ei automaattista käännöstä.'
                         % (nimi_en, koodi, PUHUJIA_VAHINTAAN))
    m = k.maximize()
    tagi = k.to_tag()
    return tagi.lower(), tagi, nimi_en, k.display_name(tagi), m.script, m.territory


LAHDEKIELET = ('fi', 'en', 'sv')
# Arkin omat tekstit (korttisaannot.KIELET), jotka käännetään. 'tiedosto' ja
# 'osoite' asetetaan tässä, ei käännetä.
ARKIN_KENTAT = ('alaotsikko', 'iskulause', 'bruno_huomio', 'hyva_tietaa', 'kaavio',
                'vaihto_luku', 'vaihto_otsikko', 'vaihto', 'qr_teksti', 'videot', 'oikeudet')
# Kentät joita EI käännetä (pysyvät englannin arvoina)
EI_KAANNETA = ('avain', 'numero', 'nimi', 'esimerkit')
# Konekäännetyn kielen oma sivu pizzalove.fi/xx/card-game syntyy samassa ajossa
# (rakenna.py), ja QR osoittaa sinne (korttisaannot._lataa_konekaannokset).


# ---------------------------------------------------------------- lähteet
def _sivusto(k):
    return json.load(open(os.path.join(TANNE, 'sisalto', k + '.json'), encoding='utf-8'))


def ui_lahde(k):
    """Sivun valikko, napit ja alaosa (sisalto/xx.json «ui»), englannin avaimin.
    Marko 16.11.2026: «Napit ja välilehdet eivät kääntyneet.»"""
    en = _sivusto('en')['ui']
    s = _sivusto(k)['ui']
    return {a: s.get(a, en[a]) for a in en}


def lahteet():
    d = {}
    for k in LAHDEKIELET:
        s = _sivusto(k)
        d[k] = {'korttipeli': s['korttipeli'],
                'kielet': {a: ks.KIELET[k][a] for a in ARKIN_KENTAT},
                'ui': ui_lahde(k)}
    return d


KOKO_OHJE = ('"koko": {"mb": "<abbreviation for megabyte as written in %(k)s, e.g. MB, Mo, Mt>", '
             '"kb": "<abbreviation for kilobyte in %(k)s>", '
             '"desimaalierotin": "<decimal separator used in %(k)s: \".\" or \",\">"}')


def tarkista_koko(koko, virheet):
    if not isinstance(koko, dict):
        virheet.append('koko: pitää olla objekti {mb, kb, desimaalierotin}'); return
    for a in ('mb', 'kb'):
        if not isinstance(koko.get(a), str) or not 0 < len(koko[a].strip()) <= 6:
            virheet.append('koko.%s: lyhenne, 1–6 merkkiä' % a)
    if koko.get('desimaalierotin') not in ('.', ',', '٫'):
        virheet.append('koko.desimaalierotin: «.» tai «,»')


def ohje(koodi):
    _, _, en_nimi, oma, _, _ = kieli(koodi)
    sanasto = open(os.path.join(TANNE, 'sisalto', 'SANASTO.md'), encoding='utf-8').read()
    return f"""You translate the rules of the Pizza Love® card game (a family maths card game, ages 6+) into {en_nimi} ({oma}).

The source is given in three human-reviewed languages: Finnish (original), English and Swedish. Use all three to understand the meaning; translate the meaning, not word by word.

Output: ONE JSON object and nothing else, with exactly this shape:
{{"korttipeli": <same structure as the source "korttipeli">,
  "kielet": <same keys as the source "kielet">,
  "konekaannos_merkinta": "<in {en_nimi}: 'Machine translation – not yet reviewed by a native speaker.'>",
  "lataa_kielella": "<in {en_nimi}: the language name as used in 'All three game modes in {en_nimi}'>",
  "ilmoita_virhe": "<in {en_nimi}: 'Report a translation error' (a short link text)>",
  "ui": <same keys as the source "ui": the website menu, buttons and footer>,
  {KOKO_OHJE % {'k': en_nimi}}}}

Rules (all are checked automatically; a violation rejects the translation):
1. Keep every key, every list and every list length exactly as in the source. Do not add or remove keys.
2. Do not translate these keys' values; copy them from the English source unchanged: {', '.join(EI_KAANNETA)}.
3. HTML: keep every tag and attribute exactly (<p>, <ul class="lista">, <li>, <b>, <br>, <span class="pieni">, <h3>, <ol class="lista">, <sup> …). Same number of each tag, same classes, same order of blocks. Translate only the text between tags.
4. Numbers and formulas: copy every number, formula and symbol exactly (e.g. 5 = 10 : 2, 2², 3!, log₂ 8, √9, ·, –, −, non-breaking spaces). Every number in a source string must appear in the translated string.
5. Names are never translated: Pizza Love®, Pizza Party, Pizza Basso, Pizza Love, Basso, Bruno, Merkitysten, Merkitysten Oy, #1, #2, #3. Keep "<b>#1 Pizza Party" exactly where the source has it.
6. "kielet.vaihto" must be exactly two sentences, like the source.
7. "korttipeli.portaat_ingressi" must have the same sentence structure as the source (first sentence, then the rest).
8. Do not add explanations, reasons, examples or restrictions that are not in the source. Do not leave anything out. Short, simple sentences that a child and a parent understand.
9. Address the player the way published board-game rules in {en_nimi} normally do, and keep it consistent in the whole text. Use the plural/group form where the source addresses the whole group (agree, you can play …).
10. Use one term for one thing everywhere (see the glossary below). Choose natural {en_nimi} board-game terms for: pizza card, topping card, topping, heart pizza, fantasy topping, draw pile, pile, storage, storage slot, exchange pizza, exchange, round, turn, calculation, make a pizza, slap (Pizza Party).
11. "kielet.iskulause" is the slogan EVERY PIZZA COUNTS, in capital letters.
12. Where the English source names its own language ("in English", "(English)"), name {en_nimi} instead, in {en_nimi}.
13. "ui" are short website labels (menu tabs, buttons, footer). Keep them as short as the English ones. "ui.video_kieli" names the language a video is spoken in ("in Finnish", "in English"), in {en_nimi}.

Glossary of the existing translations (for reference and consistency):
{sanasto}
"""


def viesti(koodi):
    return ('Source (JSON, languages fi/en/sv):\n'
            + json.dumps(lahteet(), ensure_ascii=False, indent=1)
            + f'\n\nTranslate into {kieli(koodi)[2]}. Return only the JSON object.')


# ---------------------------------------------------------------- tunnistautuminen
def oidc_tunnus():
    """GitHubin OIDC-tunnus (audience https://api.anthropic.com). Haetaan joka
    kutsua varten uusi, koska tunnus vanhenee n. 5 minuutissa ja on kertakäyttöinen."""
    url = os.environ.get('ACTIONS_ID_TOKEN_REQUEST_URL')
    tok = os.environ.get('ACTIONS_ID_TOKEN_REQUEST_TOKEN')
    if not url or not tok:
        raise SystemExit('OIDC-tunnusta ei saatu: työnkulussa pitää olla permissions: id-token: write')
    pyynto = urllib.request.Request(url + '&audience=https://api.anthropic.com',
                                    headers={'Authorization': 'Bearer ' + tok})
    return json.load(urllib.request.urlopen(pyynto, timeout=30))['value']


def anthropic_tunnus():
    tarvittavat = ('ANTHROPIC_FEDERATION_RULE_ID', 'ANTHROPIC_ORGANIZATION_ID',
                   'ANTHROPIC_SERVICE_ACCOUNT_ID', 'ANTHROPIC_WORKSPACE_ID')
    puuttuu = [a for a in tarvittavat if not os.environ.get(a)]
    if puuttuu:
        raise SystemExit('Puuttuu: ' + ', '.join(puuttuu))
    runko = {'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
             'assertion': oidc_tunnus(),
             'federation_rule_id': os.environ['ANTHROPIC_FEDERATION_RULE_ID'],
             'organization_id': os.environ['ANTHROPIC_ORGANIZATION_ID'],
             'service_account_id': os.environ['ANTHROPIC_SERVICE_ACCOUNT_ID'],
             'workspace_id': os.environ['ANTHROPIC_WORKSPACE_ID']}
    pyynto = urllib.request.Request(API + '/v1/oauth/token', data=json.dumps(runko).encode(),
                                    headers={'content-type': 'application/json'})
    try:
        return json.load(urllib.request.urlopen(pyynto, timeout=60))['access_token']
    except urllib.error.HTTPError as v:
        raise SystemExit('Tunnuksen vaihto epäonnistui (%s): %s\n'
                         'Tarkista Consolesta: Workload identity → Authentication events.'
                         % (v.code, v.read().decode()[:500]))


# ---------------------------------------------------------------- API-kutsu
def kysy(viestit, jarjestelma):
    """Messages API suoratoistona (pitkä vastaus). Palauttaa tekstin."""
    # effort: claude-opus-5-5:n oletus on 'medium'. Merkitään se näkyviin, jottei
    # se muutu huomaamatta mallin vaihtuessa. 'thinking' jätetään pois tarkoilla:
    # opus-5-5 ajattelee ilman sitäkin, ja vanhemmalla mallilla (KAANNOS_MALLI)
    # nimenomainen thinking-kenttä kaataisi pyynnön.
    runko = {'model': MALLI, 'max_tokens': MAKS_TOKENIT, 'system': jarjestelma,
             'messages': viestit, 'stream': True,
             'output_config': {'effort': 'medium'}}
    pyynto = urllib.request.Request(
        API + '/v1/messages', data=json.dumps(runko).encode(),
        headers={'content-type': 'application/json', 'anthropic-version': API_VERSIO,
                 'authorization': 'Bearer ' + anthropic_tunnus()})
    osat, syy, kaytto = [], None, {}
    try:
        with urllib.request.urlopen(pyynto, timeout=900) as r:
            for rivi in r:
                rivi = rivi.decode('utf-8').strip()
                if not rivi.startswith('data:'):
                    continue
                t = json.loads(rivi[5:])
                if t['type'] == 'content_block_delta' and t['delta'].get('type') == 'text_delta':
                    osat.append(t['delta']['text'])
                elif t['type'] == 'message_delta':
                    syy = t['delta'].get('stop_reason')
                    kaytto.update(t.get('usage', {}))
                elif t['type'] == 'message_start':
                    kaytto.update(t['message'].get('usage', {}))
                elif t['type'] == 'error':
                    raise SystemExit('API-virhe: %s' % t)
    except urllib.error.HTTPError as v:
        raise SystemExit('API-virhe %s: %s' % (v.code, v.read().decode()[:800]))
    # 📐 Erittely lokiin, jotta kustannus voidaan MITATA eikä arvata (Marko
    # 16.11.2026: «voidaanko säästöjä hakea jotenkin muuten»). Kolme lukua
    # ratkaisevat, kannattaako mitään vaihtaa:
    #   ajattelu  — osa tulosteesta, hinnoiteltu kuin tuloste. Jos se on iso,
    #               output_config.effort = 'low' säästäisi; jos pieni, ei.
    #   välimuisti — luettu = 5 % syötteen hinnasta, kirjoitus kalliimpi kuin
    #               tavallinen syöte. Nollat kertovat, ettei välimuistista ole
    #               tässä hyötyä (pyynnöt tulevat päivien välein).
    yksityiskohdat = kaytto.get('output_tokens_details') or {}
    print('Malli %s, tokeneita: syöte %s, tuloste %s (ajattelu %s), '
          'välimuisti luettu %s / kirjoitettu %s, lopetus %s'
          % (MALLI, kaytto.get('input_tokens'), kaytto.get('output_tokens'),
             yksityiskohdat.get('thinking_tokens', '–'),
             kaytto.get('cache_read_input_tokens', 0),
             kaytto.get('cache_creation_input_tokens', 0), syy))
    if syy == 'max_tokens':
        # Ei yritetä uudelleen: sama pyyntö katkeaisi samaan kohtaan. Viesti
        # kertoo luvut, jotta syy näkyy lokista ilman API-kyselyä.
        raise SystemExit(
            'Vastaus katkesi: %s tulostokenia täytti katon MAKS_TOKENIT=%d '
            '(ajattelu mukaan luettuna). Nosta MAKS_TOKENIT:ia tyokalut/kaanna.py:ssä '
            '— mallin katto on 128000.' % (kaytto.get('output_tokens'), MAKS_TOKENIT))
    return ''.join(osat)


def json_vastauksesta(teksti):
    teksti = teksti.strip()
    m = re.search(r'```(?:json)?\s*(\{.*\})\s*```', teksti, re.S)
    if m:
        teksti = m.group(1)
    alku, loppu = teksti.find('{'), teksti.rfind('}')
    return json.loads(teksti[alku:loppu + 1])


# ---------------------------------------------------------------- tarkistus
def luvut(s):
    return sorted(re.findall(r'\d+', re.sub(r'<[^>]+>', '', s)))


# Virkkeen loppumerkit kirjoitusjärjestelmittäin.
# 📐 Mitattu 16.11.2026: hindin käännös hylättiin kahdesti, koska tarkistus
# tunsi vain pisteen ja CJK:n 。！？. Devanagari päättää virkkeen DANDAAN (।).
# Malli oli siis tehnyt työnsä oikein ja tarkistus oli väärässä — ja hylätty
# ajo maksoi noin dollarin. Lisätty danda ja kaksoisdanda (käytössä myös
# bengalissa, gurmukhissa, gujaratissa, orijassa), armenian ։, etiopian ።,
# khmerin ។, burman ။, tiibetin ། sekä urdun ۔ ؟ (oikealta vasemmalle
# kirjoitettavat torjutaan muualla, mutta merkki ei maksa mitään).
VIRKE_VALILYONNILLA = '.!?۔؟։።'   # välilyönti perässä (piste ja sen sukulaiset)
VIRKE_ILMAN = '。！？।॥។။།'          # ei välttämättä välilyöntiä perässä


def virkkeita(s):
    """Virkkeiden määrä, tai None jos kirjoitusjärjestelmässä ei ole virkkeen
    lopetusmerkkiä lainkaan.

    ⚠️ None EI ole virhe. Thain ja laon kaltaisissa kielissä virkkeet
    erotetaan välilyönnillä eikä välimerkillä, joten määrää ei voi tietää.
    Silloin käännöstä ei saa hylätä tämän perusteella: tarkistus on olemassa
    estämässä virkkeiden yhdistämistä, ei keksimässä sääntöä, jota kieli ei
    tunne. Vrt. hindi yllä — väärä tarkistus on kalliimpi kuin puuttuva."""
    s = s.strip()
    if not any(c in s for c in VIRKE_VALILYONNILLA + VIRKE_ILMAN):
        return None
    jako = r'(?<=[%s])\s+|(?<=[%s])\s*' % (re.escape(VIRKE_VALILYONNILLA), re.escape(VIRKE_ILMAN))
    return len([v for v in re.split(jako, s) if v.strip()])


def tagit(s):
    return sorted(re.findall(r'<\s*(/?[a-z0-9]+)((?:\s+class="[^"]*")?)', s))


def vertaa(lahde, kaannos, polku, virheet):
    if isinstance(lahde, dict):
        if not isinstance(kaannos, dict):
            virheet.append('%s: pitää olla objekti' % polku); return
        puuttuu = [a for a in lahde if a not in kaannos]
        yli = [a for a in kaannos if a not in lahde]
        if puuttuu:
            virheet.append('%s: puuttuvat avaimet %s' % (polku, puuttuu))
        if yli:
            virheet.append('%s: ylimääräiset avaimet %s' % (polku, yli))
        for a in lahde:
            if a in kaannos:
                if a in EI_KAANNETA and kaannos[a] != lahde[a]:
                    virheet.append('%s.%s: ei saa kääntää (pitää olla %r)' % (polku, a, lahde[a]))
                else:
                    vertaa(lahde[a], kaannos[a], '%s.%s' % (polku, a), virheet)
    elif isinstance(lahde, list):
        if not isinstance(kaannos, list) or len(kaannos) != len(lahde):
            virheet.append('%s: listan pituus pitää olla %d' % (polku, len(lahde))); return
        for i, (x, y) in enumerate(zip(lahde, kaannos)):
            vertaa(x, y, '%s[%d]' % (polku, i), virheet)
    elif isinstance(lahde, str):
        if not isinstance(kaannos, str) or not kaannos.strip():
            virheet.append('%s: tyhjä' % polku); return
        if polku == 'kielet.vaihto':
            # Luvut saa kirjoittaa sanoin («nelosensa»), mutta kaava säilyy.
            if not re.search(r'4\s*=\s*6\s*[–-]\s*2', kaannos):
                virheet.append('kielet.vaihto: kaava «4 = 6 – 2» puuttuu')
        elif luvut(kaannos) != luvut(lahde):
            virheet.append('%s: luvut %s, pitää olla %s' % (polku, luvut(kaannos), luvut(lahde)))
        if tagit(kaannos) != tagit(lahde):
            virheet.append('%s: HTML-tagit eroavat lähteestä' % polku)


def tarkista(tulos):
    """Vertaa englantiin (rakenne, luvut, HTML) ja arkin rakenteellisiin
    karsintoihin (koteloarkki.py: KIELET-kommentti)."""
    en = lahteet()['en']
    virheet = []
    for avain in ('korttipeli', 'kielet', 'konekaannos_merkinta', 'lataa_kielella', 'ilmoita_virhe',
                  'ui', 'koko'):
        if avain not in tulos:
            virheet.append('puuttuu %s' % avain)
    if virheet:
        return virheet
    vertaa(en['korttipeli'], tulos['korttipeli'], 'korttipeli', virheet)
    vertaa(en['kielet'], tulos['kielet'], 'kielet', virheet)
    vertaa(en['ui'], tulos['ui'], 'ui', virheet)
    tarkista_koko(tulos['koko'], virheet)
    k, kp = tulos['kielet'], tulos['korttipeli']
    maara = virkkeita(k['vaihto'])
    if maara is not None and maara != 2:
        virheet.append('kielet.vaihto: pitää olla tasan kaksi virkettä (nyt %d)' % maara)
    for nimi in ('Pizza Party', 'Pizza Basso', 'Pizza Love'):
        if nimi not in json.dumps(kp, ensure_ascii=False):
            virheet.append('nimi %r puuttuu' % nimi)
    if '<b>#1 Pizza Party' not in kp['portaat'][1]['html']:
        virheet.append('korttipeli.portaat[1].html: «<b>#1 Pizza Party» puuttuu')
    if k['iskulause'] != k['iskulause'].upper():
        virheet.append('kielet.iskulause: pitää olla isoin kirjaimin')
    return virheet


# ---------------------------------------------------------------- tallennus
def tallenna(koodi, tulos):
    _, tagi, en_nimi, oma, kirjoitus, alue = kieli(koodi)
    kp = tulos['korttipeli']
    kielet = dict(tulos['kielet'])
    kielet['tiedosto'] = 'pizza-love-card-game-rules-%s.pdf' % koodi
    kielet['osoite'] = 'https://pizzalove.fi/%s/card-game' % koodi   # oma sivu (rakenna.py)
    kielet['konekaannos_merkinta'] = tulos['konekaannos_merkinta']
    d = {'kieli': koodi, 'tagi': tagi, 'nimi': oma, 'nimi_en': en_nimi, 'kirjoitus': kirjoitus,
         'alue': alue, 'konekaannos': True,
         'tarkastettu': False, 'malli': MALLI,
         'luotu': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
         'lataa_kielella': tulos['lataa_kielella'], 'ilmoita_virhe': tulos['ilmoita_virhe'],
         'ui': tulos['ui'], 'koko': tulos['koko'],
         'kielet': kielet, 'korttipeli': kp}
    os.makedirs(KONEKAANNOS, exist_ok=True)
    polku = os.path.join(KONEKAANNOS, koodi + '.json')
    with open(polku, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=1)
        f.write('\n')
    return polku


def lippu(koodi, kirjoitus, alue):
    '''Kielen lippu koteloarkkiin (Marko 16.11.2026) flag-icons-kirjastosta (MIT):
    alueen (kielen tavallisimman maan) 1x1-lippu, valkoinen sävytettynä #f1f0f0.
    Ei lippua, jos alue ei ole maa (es-419) tai valinta olisi poliittinen
    (perinteinen kiina). Silloin arkissa on pelkkä kielikoodi.

    ⚠️ Lippu on KIELEN tavallisimman maan lippu, ei kohdeyleisön maan, eikä
    murteelle tehdä poikkeusta (Marko 16.11.2026: «Ruotsi on ruotsi, vaikka se
    olisi suomenruotsi. Muuten olemme kaikkien eri kielimurteiden kanssa
    helisemässä.»). Älä siis lisää tähän kielikohtaisia poikkeuksia; ks.
    julkinen/kuvat/liput/LUE-MINUT.md.'''
    kohde = os.path.join(TANNE, 'julkinen', 'kuvat', 'liput', koodi + '.svg')
    if os.path.exists(kohde):
        return
    lahde_kansio = os.environ.get('LIPUT_LAHDE', '')
    if kirjoitus == 'Hant' or not alue or not re.fullmatch(r'[A-Z]{2}', alue):
        print('Lippu: ei lippua (%s, alue %s) — arkissa pelkkä kielikoodi' % (koodi, alue))
        return
    lahde = os.path.join(lahde_kansio, alue.lower() + '.svg')
    if not os.path.exists(lahde):
        print('⚠️  Lippu: lähdettä ei löydy (%s) — arkissa pelkkä kielikoodi' % lahde)
        return
    s = open(lahde, encoding='utf-8').read()
    s = re.sub(r'#(?:fff|FFF|ffffff|FFFFFF)\b', '#f1f0f0', s)
    with open(kohde, 'w', encoding='utf-8') as f:
        f.write(s)
    print('Lippu: %s -> %s' % (alue, kohde))


def ulos(**arvot):
    '''GitHub Actionsin askeleen tulokset (koodi, uusi) seuraaville askelille.'''
    polku = os.environ.get('GITHUB_OUTPUT')
    if polku:
        with open(polku, 'a') as f:
            for a, b in arvot.items():
                f.write('%s=%s\n' % (a, b))


# ---------------------------------------------------------------- täydennys
TAYDENNETTAVAT = ('ui', 'koko')


def taydenna_lippu(d):
    """Puuttuva lippu vanhaan konekäännökseen (Marko 16.11.2026: «Tee sekin
    lisäys taydenna():an»).

    📐 Miksi tämä tarvittiin: lippu()-kutsu on vain varsinaisessa
    käännöspolussa, joten ennen lippu-ominaisuutta tehty käännös jäi ilman
    lippua EIKÄ täydennysajo korjannut sitä. Kieli olisi jäänyt valikkoon
    ilman lippua, kunnes se käännetään kokonaan uudelleen.

    Tämä ei ole API-kutsu vaan paikallinen tiedostokopio: ei päiväkattoa, ei
    rahaa, ja lippu() palaa heti jos lippu on jo olemassa. Siksi tämän voi
    ajaa joka kerta kaikille kielille.

    Palauttaa True vain, jos lippu SYNTYI nyt — silloin kieli on saatava
    ulos-listaan, jotta haara tallentaa tiedoston ja sivusto rakennetaan."""
    koodi = d['kieli']
    kohde = os.path.join(TANNE, 'julkinen', 'kuvat', 'liput', koodi + '.svg')
    if os.path.exists(kohde):
        return False
    kirjoitus, alue = d.get('kirjoitus'), d.get('alue')
    if not alue:
        # Ennen 16.11.2026 tallennetussa tiedostossa ei ole näitä kenttiä.
        # ⚠️ except Exception eikä except SystemExit: kieli() nostaa SystemExitin,
        # mutta myös ModuleNotFoundErrorin jos langcodes puuttuu. Mitattu
        # 16.11.2026: pelkkä SystemExit kaatoi koko --taydenna-ajon, eli yhden
        # kielen puute olisi estänyt kaikkien muiden täydennyksen. Lippu on
        # pieni lisä, joten se ei saa koskaan kaataa ajoa.
        try:
            _, _, _, _, kirjoitus, alue = kieli(koodi)
        except Exception as v:
            print('  ⚠️  %s: aluetta ei saatu (%s) — ei lippua' % (koodi, v))
            return False
    lippu(koodi, kirjoitus, alue)
    return os.path.exists(kohde)


def taydenna(vastaus_tiedosto=None):
    """Aiempien konekäännösten puuttuvat osat (ui, koko, lippu). Pieni kutsu
    kieltä kohden; virhe yhdessä kielessä ei estä muita (sivu käyttää silloin
    englantia). Lippu ei vaadi kutsua lainkaan, ks. taydenna_lippu()."""
    tiedostot = [os.path.join(KONEKAANNOS, n)
                 for n in sorted(os.listdir(KONEKAANNOS) if os.path.isdir(KONEKAANNOS) else [])
                 if n.endswith('.json')]
    tehty = []
    # ⚠️ LIPUT ENSIN, OMANA KIERROKSENAAN. 📐 Mitattu 16.11.2026: kun lippu haettiin
    # samassa silmukassa ui/koko-käännöksen kanssa, ensimmäisen kielen epäonnistunut
    # API-kutsu lopetti koko ajon — ja sen jälkeiset kielet jäivät ilman lippua,
    # vaikka lippu ei tarvitse API:a lainkaan. Omana kierroksena jokainen kieli saa
    # lippunsa riippumatta siitä, miten käännökset onnistuvat.
    for polku in tiedostot:
        if taydenna_lippu(json.load(open(polku, encoding='utf-8'))):
            tehty.append(os.path.basename(polku)[:-5])
    en_ui = lahteet()['en']['ui']
    for polku in tiedostot:
        d = json.load(open(polku, encoding='utf-8'))
        puuttuu = [a for a in TAYDENNETTAVAT if a not in d]
        if not puuttuu:
            continue
        koodi, en_nimi = d['kieli'], d.get('nimi_en', d['kieli'])
        print('Täydennetään %s: %s' % (koodi, ', '.join(puuttuu)))
        jarjestelma = (
            f"You translate short website labels for the Pizza Love® card game site into {en_nimi} ({d.get('nimi', '')}).\n"
            "Output ONE JSON object and nothing else: "
            '{"ui": <same keys as the source "ui">, ' + KOKO_OHJE % {'k': en_nimi} + '}\n'
            "Keep every key. Keep the labels as short as the English ones. Names are never translated: "
            "Pizza Love®, Merkitysten, Merkitysten Oy. \"ui.video_kieli\" names the language a video is "
            f"spoken in (\"in Finnish\", \"in English\"), in {en_nimi}. Use the same terms as the existing "
            f"{en_nimi} translation below.")
        konteksti = {'card game title': d['korttipeli'].get('h1'),
                     'rules in this language': d.get('lataa_kielella'),
                     'machine translation notice': d['kielet'].get('konekaannos_merkinta')}
        viestit = [{'role': 'user', 'content': 'Source "ui" (English, Finnish, Swedish):\n'
                    + json.dumps({k: ui_lahde(k) for k in ('en', 'fi', 'sv')}, ensure_ascii=False, indent=1)
                    + '\n\nExisting %s translation (for terms):\n' % en_nimi
                    + json.dumps(konteksti, ensure_ascii=False) + '\n\nReturn only the JSON object.'}]
        virheet = ['ei tehty']
        for yritys in (1, 2):
            try:
                vastaus = (open(vastaus_tiedosto, encoding='utf-8').read() if vastaus_tiedosto
                           else kysy(viestit, jarjestelma))
                tulos = json_vastauksesta(vastaus)
                virheet = []
                vertaa(en_ui, tulos.get('ui'), 'ui', virheet)
                tarkista_koko(tulos.get('koko'), virheet)
            except (ValueError, KeyError, TypeError) as v:
                vastaus, virheet = locals().get('vastaus', ''), ['vastaus ei ole kelvollista JSONia: %s' % v]
            print('  yritys %d: %d virhettä' % (yritys, len(virheet)))
            if not virheet or vastaus_tiedosto:
                break
            viestit += [{'role': 'assistant', 'content': vastaus},
                        {'role': 'user', 'content': 'The automatic check found these problems. Fix them '
                         'and return the complete corrected JSON object only:\n- ' + '\n- '.join(virheet)}]
        if virheet:
            print('  ⚠️  %s jäi täydentämättä (sivu käyttää englantia):\n  - %s' % (koodi, '\n  - '.join(virheet)))
            continue
        for a in puuttuu:
            d[a] = tulos[a]
        d['taydennetty'] = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        with open(polku, 'w', encoding='utf-8') as f:
            json.dump(d, f, ensure_ascii=False, indent=1)
            f.write('\n')
        tehty.append(koodi)
    # Sama kieli voi tulla listaan kahdesti (lippu + ui/koko) — haara ja
    # rakennus saavat sen kerran.
    tehty = sorted(set(tehty))
    print('Täydennetty: %s' % (' '.join(tehty) or '–'))
    ulos(taydennetty=' '.join(tehty))
    return 0


def main():
    if '--taydenna' in sys.argv:
        return taydenna(sys.argv[sys.argv.index('--vastaus') + 1] if '--vastaus' in sys.argv else None)
    argit = [a for i, a in enumerate(sys.argv[1:], 1)
             if not a.startswith('--') and sys.argv[i - 1] != '--vastaus']
    if len(argit) != 1:
        raise SystemExit('Käyttö: kaanna.py <kielikoodi> [--vastaus tiedosto] [--uudelleen]')
    koodi, tagi, en_nimi, oma, kirjoitus, alue = kieli(argit[0].strip())
    if koodi in IHMISEN_TARKASTAMAT:
        raise SystemExit('%s on jo ihmisen tarkastama kieli — konekäännöstä ei tehdä.' % koodi)
    if kirjoitus in OIKEALTA_VASEMMALLE:
        raise SystemExit('%s (%s) kirjoitetaan oikealta vasemmalle. Arkin peilattua asettelua ei '
                         'vielä ole — Marko tekee tämän kielen käsin.' % (en_nimi, tagi))
    print('Kieli: %s / %s (%s, kirjoitus %s, alue %s)' % (en_nimi, oma, tagi, kirjoitus, alue))
    polku = os.path.join(KONEKAANNOS, koodi + '.json')
    if os.path.exists(polku) and '--uudelleen' not in sys.argv:
        print('ON JO: %s on käännetty (%s). Uutta pyyntöä samalle kielelle ei tehdä.' % (koodi, polku))
        ulos(koodi=koodi, uusi=0)
        return 0
    if '--vastaus' not in sys.argv:
        raja = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)
        tanaan = 0
        for nimi in (os.listdir(KONEKAANNOS) if os.path.isdir(KONEKAANNOS) else []):
            try:
                luotu = json.load(open(os.path.join(KONEKAANNOS, nimi), encoding='utf-8')).get('luotu', '')
                if datetime.datetime.strptime(luotu, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=datetime.timezone.utc) > raja:
                    tanaan += 1
            except (ValueError, OSError):
                pass
        if tanaan >= PAIVAKATTO:
            raise SystemExit('Päiväkatto täynnä (%d uutta käännöstä 24 tunnissa) — yritä huomenna.' % tanaan)
    if '--vastaus' in sys.argv:
        tulos = json_vastauksesta(open(sys.argv[sys.argv.index('--vastaus') + 1], encoding='utf-8').read())
        virheet = tarkista(tulos)
    else:
        jarjestelma = ohje(koodi)
        viestit = [{'role': 'user', 'content': viesti(koodi)}]
        for yritys in (1, 2):
            vastaus = kysy(viestit, jarjestelma)
            try:
                tulos = json_vastauksesta(vastaus)
                virheet = tarkista(tulos)
            except (ValueError, KeyError, TypeError) as v:
                tulos, virheet = None, ['vastaus ei ole kelvollista JSONia: %s' % v]
            print('Yritys %d: %d virhettä' % (yritys, len(virheet)))
            if not virheet:
                break
            viestit += [{'role': 'assistant', 'content': vastaus},
                        {'role': 'user', 'content': 'The automatic check found these problems. '
                         'Fix them and return the complete corrected JSON object only:\n- '
                         + '\n- '.join(virheet[:60])}]
    if virheet:
        print('🔴 KÄÄNNÖS HYLÄTTY:\n- ' + '\n- '.join(virheet[:60]))
        return 1
    print('Tallennettu:', tallenna(koodi, tulos))
    lippu(koodi, kirjoitus, alue)
    ulos(koodi=koodi, uusi=1)
    return 0


if __name__ == '__main__':
    sys.exit(main())
