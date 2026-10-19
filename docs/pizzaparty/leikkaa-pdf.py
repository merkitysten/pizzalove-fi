#!/usr/bin/env python3
"""Painotiedoston palat irti stanssiviivaa pitkin — läpinäkyvinä PNG-kuvina.

    python3 leikkaa-pdf.py <tiedosto.pdf> <ulos-kansio> [--taso "Cutting line"]

⚠️ LEIKKAUSVIIVAA EI TARVITSE PIILOTTAA, KOSKA SE EI OLE KUVASSA.
Marko 19.10.2026: «sinun pitäisi tehdä rajausta cutting line -tason
avulla ja piilottaa se musta cutting line.» Mitattu PDF:stä, ja rakenne
on onnekkaampi kuin pyyntö olettaa:

    MC0  /OC «Graphics»      yksi upotettu kuva (/Im0 Do)
    MC1  /OC «Cutting line»  10 vektoripolkua, /Separation /Cut, 0.701 w
    MC2  /OC «Marks»         kohdistusmerkit

Kuvassa on siis pelkkä taide ja stanssiviiva on erillinen vektori. Kun
kuva otetaan suoraan PDF:stä ja polku muutetaan maskiksi, viivaa ei
synny mihinkään — sitä ei tarvitse etsiä eikä maalata pois. Siksi tämä
työkalu EI rasteroi PDF:ää: se purkaa kuvan sellaisenaan ja piirtää
maskin poluista.

⚠️ EI KIRJASTOJA. Tällä koneella ei ole Pillowta, ImageMagickia,
popplerta eikä PyMuPDFia (mitattu). Kaikki on zlibillä ja tavuilla:
Flate-purku, CMYK→RGB, polkujen latistus ja scanline-täyttö, PNG-kirjoitus.

🔴 KUVA ON CMYK, JA SUORA MUUNNOS RGB:HEN EI RIITÄ PELIKÄYTTÖÖNKÄÄN.
Tässä luki 19.10.2026 asti «värit ovat lähellä mutta eivät painotarkkoja —
pelikäyttöön se riittää». Se oli väärin, ja Marko huomasi sen pelistä:
«Nämä värit ei nyt ole oikeat näissä numeroissa.»

📐 Mitattu palojen numeromerkeistä, painettu vs. sovelluksen paletti:
    4  sininen  #1072B9 -> #66A6FC   ero 120
    7  vihreä   #16A74F -> #3AFE24   ero 103
    6  violetti #824292 -> #926BFA   ero 112
   10  turkoosi #6AC0B2 -> #88FBA8   ero  66
Virhe on systemaattinen VAALEAAN ja kylläiseen suuntaan, eli juuri se mitä
profiiliton `cmyk_rgb` tekee. Värihallittu renderi samasta PDF:stä antaa
oikeat värit.

SIKSI `--render <png>`: pikselit luetaan ColorSyncin läpi renderöidystä
sivukuvasta (`qlmanage -t -s 3000 -o <kansio> <pdf>`), ja leikkausviivan
VEKTORIPOLKU on yhä maski. Geometria tulee siis samasta lähteestä kuin
ennen; vain värit ovat oikein.
"""
import re, sys, zlib, struct, os, math



def sivun_laatikko(d):
    """Sivun MediaBox pisteina.

    ⚠️ SITA EI LOYDY RAAOISTA TAVUISTA. Tassa PDF:ssa sivuhakemisto on
    OBJEKTIVIRRASSA (ObjStm), eli zlib-pakattuna - `re.search` koko
    tiedostosta antoi 0 osumaa vaikka laatikko on olemassa
    (0 0 717.968 264.425). Siksi jokainen purettavissa oleva virta
    katsotaan lapi."""
    kuvio = rb'/MediaBox\s*\[\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)'
    m = re.search(kuvio, d)
    if m:
        return [float(v) for v in m.groups()]
    for s in re.finditer(rb'stream\r?\n', d):
        alku = s.end(); loppu = d.find(b'endstream', alku)
        if loppu < 0 or loppu - alku > 4_000_000:
            continue
        try:
            raaka = zlib.decompress(d[alku:loppu])
        except Exception:
            continue
        m = re.search(kuvio, raaka)
        if m:
            return [float(v) for v in m.groups()]
    raise SystemExit('MediaBoxia ei löytynyt — renderin kartoitus ei onnistu.')


def lue_png(polku):
    """PNG sisaan. ⚠️ EI OMAA TOTEUTUSTA: sama purku on jo
    `poista-tausta.py`:ssa, ja kaksi PNG-lukijaa ajautuisi erilleen
    juuri suodatinriveissa joita kukaan ei lue uudelleen. Tiedostonimessa
    on valiviiva, joten se ladataan importlibilla eika `import`illa."""
    import importlib.util
    polku_moduuli = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'poista-tausta.py')
    spec = importlib.util.spec_from_file_location('poista_tausta', polku_moduuli)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.lue_png(polku)


# ---------------------------------------------------------------- PDF

def lue_pdf(polku):
    return open(polku, 'rb').read()


def striimit(d):
    """Kaikki purettavat striimit: (alku, purettu). Iso kuva mukana."""
    for m in re.finditer(rb'stream\r?\n', d):
        a = m.end()
        e = d.find(b'endstream', a)
        if e < 0:
            continue
        try:
            yield a, zlib.decompress(d[a:e])
        except Exception:
            continue


def sisaltostriimi(d):
    """Sivun sisältö: se striimi jossa on eniten piirto-operaattoreita."""
    paras = None
    for a, t in striimit(d):
        if len(t) > 400000:
            continue
        p = t.count(b' m\n') + t.count(b' l\n') + t.count(b' re\n') + t.count(b'/OC ')
        if p > 20 and (paras is None or len(t) > len(paras)):
            paras = t
    return paras


def tasokartta(d):
    """/MCx -> tason nimi. Nimet ovat /Properties-sanakirjassa ja OCG:issä."""
    kartta = {}
    for a, t in striimit(d):
        if b'/Type/OCG' not in t and b'/Type /OCG' not in t:
            continue
        nimet = re.findall(rb'/Name\s*\(((?:[^()\\]|\\.)*)\)', t)
        jarj = [n.decode('latin-1') for n in nimet]
        # /Properties<</MC0 n 0 R/MC1 ...>> antaa järjestyksen
        m = re.search(rb'/Properties\s*<<([^>]*)>>', t)
        if m:
            parit = re.findall(rb'/(MC\d+)\s+(\d+)\s+0\s+R', m.group(1))
            for i, (avain, _) in enumerate(parit):
                if i < len(jarj):
                    kartta[avain.decode()] = jarj[i]
        elif jarj:
            for i, n in enumerate(jarj):
                kartta['MC%d' % i] = n
    return kartta


def kuvaobjekti(d):
    """Ensimmäinen /Subtype/Image: (leveys, korkeus, varit, purettu data)."""
    for m in re.finditer(rb'/Subtype\s*/Image', d):
        alku = d.rfind(b'obj', 0, m.start())
        loppu = d.find(b'stream', m.start())
        sanakirja = d[alku:loppu]
        lev = int(re.search(rb'/Width\s+(\d+)', sanakirja).group(1))
        kork = int(re.search(rb'/Height\s+(\d+)', sanakirja).group(1))
        vari = re.search(rb'/ColorSpace\s*/(\w+)', sanakirja)
        vari = vari.group(1).decode() if vari else 'DeviceRGB'
        if b'/FlateDecode' not in sanakirja:
            raise SystemExit('Kuva ei ole FlateDecode (%s) — tämä työkalu ei pura sitä.' % sanakirja[:120])
        a = d.find(b'\n', loppu) + 1
        e = d.find(b'endstream', a)
        return lev, kork, vari, zlib.decompress(d[a:e])
    raise SystemExit('PDF:ssä ei ole upotettua kuvaa.')


def kuvan_sijainti(sisalto):
    """`a 0 0 d e f cm ... /Im0 Do` -> (a, d, e, f) eli kuvan paikka pisteinä."""
    m = re.search(rb'([\d.\-]+)\s+0\s+0\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+cm\s*\n\s*/Im\d+\s+Do', sisalto)
    if not m:
        raise SystemExit('Kuvan sijoitusta (cm ... Do) ei löytynyt.')
    return tuple(float(x) for x in m.groups())


# ---------------------------------------------------------------- polut

def latista(p0, p1, p2, p3, jako=16):
    """Kuutiollinen Bézier pisteiksi. 16 askelta riittää: pisin kaari on
    noin 90 pt eli 375 px, jolloin virhe on alle puoli pikseliä."""
    ulos = []
    for i in range(1, jako + 1):
        t = i / jako
        u = 1 - t
        x = u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0]
        y = u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1]
        ulos.append((x, y))
    return ulos


def polut(lohko):
    """`q 1 0 0 1 tx ty cm … h S Q` -> lista polygoneja PDF-pisteinä."""
    tulos = []
    for m in re.finditer(rb'q\s+1\s+0\s+0\s+1\s+([\d.\-]+)\s+([\d.\-]+)\s+cm(.*?)Q', lohko, re.S):
        tx, ty = float(m.group(1)), float(m.group(2))
        koodi = m.group(3)
        piste = (0.0, 0.0)
        alku = None
        pisteet = []
        for op in re.finditer(rb'([\d.\-\s]+?)\s*(m|l|c|v|y)\b', koodi):
            luvut = [float(x) for x in op.group(1).split()]
            k = op.group(2)
            if k == b'm' and len(luvut) >= 2:
                piste = (luvut[-2], luvut[-1]); alku = piste
                pisteet.append(piste)
            elif k == b'l' and len(luvut) >= 2:
                piste = (luvut[-2], luvut[-1]); pisteet.append(piste)
            elif k == b'c' and len(luvut) >= 6:
                a = luvut[-6:]
                pisteet += latista(piste, (a[0], a[1]), (a[2], a[3]), (a[4], a[5]))
                piste = (a[4], a[5])
            elif k == b'v' and len(luvut) >= 4:
                a = luvut[-4:]
                pisteet += latista(piste, piste, (a[0], a[1]), (a[2], a[3]))
                piste = (a[2], a[3])
            elif k == b'y' and len(luvut) >= 4:
                a = luvut[-4:]
                pisteet += latista(piste, (a[0], a[1]), (a[2], a[3]), (a[2], a[3]))
                piste = (a[2], a[3])
        if len(pisteet) > 2:
            if alku and pisteet[-1] != alku:
                pisteet.append(alku)
            tulos.append([(x + tx, y + ty) for (x, y) in pisteet])
    return tulos


# ---------------------------------------------------------------- kuva

def cmyk_rgb(c, m, y, k):
    return (255 - min(255, c + k), 255 - min(255, m + k), 255 - min(255, y + k))


def maski(polygoni, x0, y0, lev, kork, nayte=3):
    """Scanline-täyttö ylinäytteistettynä: reuna pehmenee eikä sahaa.
    nayte=3 tarkoittaa 9 näytettä per pikseli."""
    maski = bytearray(lev * kork)
    reunat = []
    for i in range(len(polygoni) - 1):
        (ax, ay), (bx, by) = polygoni[i], polygoni[i + 1]
        if ay != by:
            reunat.append((ax - x0, ay - y0, bx - x0, by - y0))
    for py in range(kork * nayte):
        sy = (py + 0.5) / nayte
        leikkaukset = []
        for (ax, ay, bx, by) in reunat:
            if (ay <= sy < by) or (by <= sy < ay):
                leikkaukset.append(ax + (sy - ay) * (bx - ax) / (by - ay))
        if not leikkaukset:
            continue
        leikkaukset.sort()
        rivi = py // nayte
        for i in range(0, len(leikkaukset) - 1, 2):
            xa, xb = leikkaukset[i], leikkaukset[i + 1]
            for px in range(int(xa * nayte), int(xb * nayte) + 1):
                sx = (px + 0.5) / nayte
                if xa <= sx <= xb:
                    sarake = px // nayte
                    if 0 <= sarake < lev:
                        j = rivi * lev + sarake
                        if maski[j] < 255 - 28:
                            maski[j] += 28          # 9 näytettä * 28 ≈ 252
    return maski


def kirjoita_png(polku, lev, kork, rgba):
    def pala(tyyppi, data):
        return (struct.pack('>I', len(data)) + tyyppi + data +
                struct.pack('>I', zlib.crc32(tyyppi + data) & 0xffffffff))
    raaka = bytearray()
    for y in range(kork):
        raaka.append(0)
        raaka += rgba[y * lev * 4:(y + 1) * lev * 4]
    with open(polku, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(pala(b'IHDR', struct.pack('>IIBBBBB', lev, kork, 8, 6, 0, 0, 0)))
        f.write(pala(b'IDAT', zlib.compress(bytes(raaka), 9)))
        f.write(pala(b'IEND', b''))


# ---------------------------------------------------------------- ajo

def main():
    if len(sys.argv) < 3:
        print(__doc__); raise SystemExit(2)
    pdf, ulos = sys.argv[1], sys.argv[2]
    tason_nimi = 'Cutting line'
    if '--taso' in sys.argv:
        tason_nimi = sys.argv[sys.argv.index('--taso') + 1]
    render = sys.argv[sys.argv.index('--render') + 1] if '--render' in sys.argv else None
    os.makedirs(ulos, exist_ok=True)

    d = lue_pdf(pdf)
    sisalto = sisaltostriimi(d)
    if sisalto is None:
        raise SystemExit('Sivun sisältöstriimiä ei löytynyt.')
    kartta = tasokartta(d)
    print('tasot:', kartta or '(ei nimiä)')

    mc = None
    for avain, nimi in kartta.items():
        if nimi.lower() == tason_nimi.lower():
            mc = avain
    if mc is None:
        raise SystemExit('Tasoa %r ei löytynyt. Löytyneet: %s' % (tason_nimi, list(kartta.values())))

    m = re.search(rb'/OC\s*/' + mc.encode() + rb'\s*BDC(.*?)EMC', sisalto, re.S)
    if not m:
        raise SystemExit('Tason %s sisältöä ei löytynyt.' % mc)
    lista = polut(m.group(1))
    print('polkuja tasolla %s (%s): %d' % (mc, tason_nimi, len(lista)))

    if render:
        # ⚠️ RENDERI KATTAA SIVUN, EI UPOTETTUA KUVAA, joten pt -> px
        # lasketaan MediaBoxista eikä `cm`-matriisista. Väärä kartta ei
        # kaadu vaan leikkaa palat vinoon - siksi molemmat luvut tulostetaan.
        lev, kork, kanavia, data = lue_png(render)
        mx0, my0, mx1, my1 = sivun_laatikko(d)
        sivuW, sivuH = mx1 - mx0, my1 - my0
        print('renderi: %d x %d, %d kanavaa · sivu %.1f x %.1f pt' % (lev, kork, kanavia, sivuW, sivuH))

        def pdf_px(x, y):
            return ((x - mx0) / sivuW * lev, (1 - (y - my0) / sivuH) * kork)
    else:
        lev, kork, vari, data = kuvaobjekti(d)
        print('kuva: %d x %d %s, %d tavua' % (lev, kork, vari, len(data)))
        kanavia = 4 if vari == 'DeviceCMYK' else 3
        if len(data) != lev * kork * kanavia:
            raise SystemExit('Kuvan koko ei täsmää (%d != %d) — ennustin käytössä?'
                             % (len(data), lev * kork * kanavia))

        kx, ky, ex, ey = kuvan_sijainti(sisalto)
        print('kuvan sijainti: %.2f x %.2f pt @ (%.2f, %.2f)' % (kx, ky, ex, ey))

        def pdf_px(x, y):
            return ((x - ex) / kx * lev, (1 - (y - ey) / ky) * kork)

    # vasemmalta oikealle, jotta numerointi vastaa painotiedoston järjestystä
    lista.sort(key=lambda p: min(x for x, _ in p))
    for i, polku in enumerate(lista, 1):
        pikseleina = [pdf_px(x, y) for (x, y) in polku]
        xs = [p[0] for p in pikseleina]; ys = [p[1] for p in pikseleina]
        x0, x1 = int(math.floor(min(xs))), int(math.ceil(max(xs)))
        y0, y1 = int(math.floor(min(ys))), int(math.ceil(max(ys)))
        w, h = x1 - x0, y1 - y0
        a = maski(pikseleina, x0, y0, w, h)
        rgba = bytearray(w * h * 4)
        for y in range(h):
            for x in range(w):
                lahde = ((y0 + y) * lev + (x0 + x)) * kanavia
                j = (y * w + x) * 4
                if kanavia == 4 and not render:
                    r, g, b = cmyk_rgb(data[lahde], data[lahde+1], data[lahde+2], data[lahde+3])
                else:
                    r, g, b = data[lahde], data[lahde+1], data[lahde+2]
                rgba[j] = r; rgba[j+1] = g; rgba[j+2] = b
                rgba[j+3] = min(255, a[y * w + x])
        # ⚠️ PAINOARKILLA PALAT OVAT LOMITTAIN, JOKA TOINEN YLOSALAISIN.
        # Se on materiaalin saastoa eika suunta jossa palaa katsotaan.
        # Suunta paatellaan MASKISTA eika jarjestysnumerosta: lomitus voi
        # muuttua seuraavassa painotiedostossa, maski ei valehtele.
        # Kuori on leveä pää; jos leveä pää on alhaalla, pala käännetään.
        ylhaalla = sum(1 for x in range(w) if a[int(h * 0.12) * w + x] > 40)
        alhaalla = sum(1 for x in range(w) if a[int(h * 0.88) * w + x] > 40)
        if alhaalla > ylhaalla:
            kaannetty = bytearray(len(rgba))
            for y in range(h):
                for x in range(w):
                    lj = (y * w + x) * 4
                    kj = ((h - 1 - y) * w + (w - 1 - x)) * 4
                    kaannetty[kj:kj+4] = rgba[lj:lj+4]
            rgba = kaannetty
        nimi = os.path.join(ulos, 'pala-%d.png' % i)
        kirjoita_png(nimi, w, h, bytes(rgba))
        print('  %-14s %4d x %4d%s' % (os.path.basename(nimi), w, h,
                                       '  (kaannetty)' if alhaalla > ylhaalla else ''))


if __name__ == '__main__':
    main()
