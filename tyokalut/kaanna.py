#!/usr/bin/env python3
"""Korttipelin säännöt asiakkaan pyytämälle kielelle (konekäännös).

🔵 Marko 16.11.2026: «Ei kai meillä ole tarvetta rajoittaa sitä
puoliautomaattiseksi? Mutta sellainen rajoitus pitää olla, ettei samalle
kielelle voi tehdä useampaa pyyntöä. Asiakkailla pitäisi olla mahdollisuus
ilmoittaa käännösvirheitä tai epäselvyyksistä.»

Käyttö (GitHub Actions, .github/workflows/konekaannos.yml):
    python3 tyokalut/kaanna.py pl
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
MAKS_TOKENIT = 20000

# Sallitut kielet: latinalaiset aakkoset (VAG Rounded -viireissä on vain
# kääntämättömät nimet, ja leipäteksti on Source Sans 3 / Nunito, joissa
# nämä merkit ovat). Kreikka, kyrilliset, RTL ja CJK vasta testauksen jälkeen.
# koodi: (englanninkielinen nimi, kielen oma nimi)
KIELET = {
    'pl': ('Polish', 'polski'),
    'cs': ('Czech', 'čeština'),
    'da': ('Danish', 'dansk'),
    'nb': ('Norwegian Bokmål', 'norsk bokmål'),
    'is': ('Icelandic', 'íslenska'),
    'it': ('Italian', 'italiano'),
    'pt': ('Portuguese (Portugal)', 'português'),
    'ro': ('Romanian', 'română'),
    'hu': ('Hungarian', 'magyar'),
    'et': ('Estonian', 'eesti'),
    'lv': ('Latvian', 'latviešu'),
    'lt': ('Lithuanian', 'lietuvių'),
    'sl': ('Slovenian', 'slovenščina'),
    'hr': ('Croatian', 'hrvatski'),
    'tr': ('Turkish', 'Türkçe'),
}
LAHDEKIELET = ('fi', 'en', 'sv')
# Arkin omat tekstit (korttisaannot.KIELET), jotka käännetään. 'tiedosto' ja
# 'osoite' asetetaan tässä, ei käännetä.
ARKIN_KENTAT = ('alaotsikko', 'iskulause', 'bruno_huomio', 'hyva_tietaa', 'kaavio',
                'vaihto_luku', 'vaihto_otsikko', 'vaihto', 'qr_teksti', 'videot', 'oikeudet')
# Kentät joita EI käännetä (pysyvät englannin arvoina)
EI_KAANNETA = ('avain', 'numero', 'nimi', 'esimerkit')
# Konekäännetyillä kielillä ei vielä ole omaa sivua: QR ja osoite vievät
# englanninkieliselle sivulle (vaihe 2: oma sivu ja virheilmoitus).
OSOITE = 'https://pizzalove.fi/en/card-game'


# ---------------------------------------------------------------- lähteet
def lahteet():
    d = {}
    for k in LAHDEKIELET:
        s = json.load(open(os.path.join(TANNE, 'sisalto', k + '.json'), encoding='utf-8'))
        d[k] = {'korttipeli': s['korttipeli'],
                'kielet': {a: ks.KIELET[k][a] for a in ARKIN_KENTAT}}
    return d


def ohje(koodi):
    en_nimi, oma = KIELET[koodi]
    sanasto = open(os.path.join(TANNE, 'sisalto', 'SANASTO.md'), encoding='utf-8').read()
    return f"""You translate the rules of the Pizza Love® card game (a family maths card game, ages 6+) into {en_nimi} ({oma}).

The source is given in three human-reviewed languages: Finnish (original), English and Swedish. Use all three to understand the meaning; translate the meaning, not word by word.

Output: ONE JSON object and nothing else, with exactly this shape:
{{"korttipeli": <same structure as the source "korttipeli">,
  "kielet": <same keys as the source "kielet">,
  "konekaannos_merkinta": "<in {en_nimi}: 'Machine translation – not yet reviewed by a native speaker.'>",
  "lataa_kielella": "<in {en_nimi}: the language name as used in 'All three game modes in {en_nimi}'>"}}

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

Glossary of the existing translations (for reference and consistency):
{sanasto}
"""


def viesti(koodi):
    return ('Source (JSON, languages fi/en/sv):\n'
            + json.dumps(lahteet(), ensure_ascii=False, indent=1)
            + f'\n\nTranslate into {KIELET[koodi][0]}. Return only the JSON object.')


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
    runko = {'model': MALLI, 'max_tokens': MAKS_TOKENIT, 'system': jarjestelma,
             'messages': viestit, 'stream': True}
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
    print('Malli %s, tokeneita: syöte %s, tuloste %s, lopetus %s'
          % (MALLI, kaytto.get('input_tokens'), kaytto.get('output_tokens'), syy))
    if syy == 'max_tokens':
        raise SystemExit('Vastaus katkesi (max_tokens)')
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
    for avain in ('korttipeli', 'kielet', 'konekaannos_merkinta', 'lataa_kielella'):
        if avain not in tulos:
            virheet.append('puuttuu %s' % avain)
    if virheet:
        return virheet
    vertaa(en['korttipeli'], tulos['korttipeli'], 'korttipeli', virheet)
    vertaa(en['kielet'], tulos['kielet'], 'kielet', virheet)
    k, kp = tulos['kielet'], tulos['korttipeli']
    if len(re.split(r'(?<=[.!?])\s+', k['vaihto'].strip())) != 2:
        virheet.append('kielet.vaihto: pitää olla tasan kaksi virkettä')
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
    en_nimi, oma = KIELET[koodi]
    kp = tulos['korttipeli']
    kielet = dict(tulos['kielet'])
    kielet['tiedosto'] = 'pizza-love-card-game-rules-%s.pdf' % koodi
    kielet['osoite'] = OSOITE
    kielet['konekaannos_merkinta'] = tulos['konekaannos_merkinta']
    d = {'kieli': koodi, 'nimi': oma, 'nimi_en': en_nimi, 'konekaannos': True,
         'tarkastettu': False, 'malli': MALLI,
         'luotu': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
         'lataa_kielella': tulos['lataa_kielella'],
         'kielet': kielet, 'korttipeli': kp}
    os.makedirs(KONEKAANNOS, exist_ok=True)
    polku = os.path.join(KONEKAANNOS, koodi + '.json')
    with open(polku, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=1)
        f.write('\n')
    return polku


def main():
    argit = [a for i, a in enumerate(sys.argv[1:], 1)
             if not a.startswith('--') and sys.argv[i - 1] != '--vastaus']
    if len(argit) != 1:
        raise SystemExit('Käyttö: kaanna.py <kielikoodi> [--vastaus tiedosto] [--uudelleen]')
    koodi = argit[0].strip().lower()
    if koodi in ('fi', 'en', 'sv', 'de', 'nl', 'fr', 'es', 'sk'):
        raise SystemExit('%s on jo ihmisen tarkastama kieli — konekäännöstä ei tehdä.' % koodi)
    if koodi not in KIELET:
        raise SystemExit('Kieltä %r ei ole sallittujen listalla: %s' % (koodi, ', '.join(KIELET)))
    polku = os.path.join(KONEKAANNOS, koodi + '.json')
    if os.path.exists(polku) and '--uudelleen' not in sys.argv:
        print('ON JO: %s on käännetty (%s). Uutta pyyntöä samalle kielelle ei tehdä.' % (koodi, polku))
        return 0
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
    return 0


if __name__ == '__main__':
    sys.exit(main())
