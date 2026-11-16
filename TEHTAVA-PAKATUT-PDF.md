# Tehtävä (Claude Code): pakattu sääntö-PDF samasta lähteestä

Päätös: Marko 16.11.2026, `Verkkosivut/PAATOSLOKI.md` («Philibert: ei erillistä …»). Lue myös `CLAUDE.md`.

## Vaatimus
Jokaisesta sääntö-PDF:stä syntyy samassa ajossa kaksi tiedostoa:
1. näyttölaatuinen (nykyinen, nimi ennallaan)
2. pakattu markkinapaikoille: **alle 2 000 000 tavua** (Philibertin raja on 2 MB, ylitys kaatuu HTTP 500:aan)

Jos pakattu ylittää rajan, ajo kaatuu 🔴-viestillä samalla tavalla kuin `koteloarkki.py`:n `SIVUJA`-tarkistus. Kone kertoo ylityksen heti, ei Philibertin lomake myöhemmin.

## Koskee
- korttipelin arkit: `koteloarkki.py`, myös konekäännökset (`.github/workflows/konekaannos.yml` → haara `konekaannokset`)
- lautapelin säännöt: `lautasaannot.py`. Suomenkieliset ovat nyt 2,5–3,1 MB.
- muut julkiset PDF:t (Topping Ten, apinakortit), jos niitä tarjotaan jälleenmyyjille. Kysy Markolta, jos epäselvää.

## Havainnot 16.11. (Cowork, kokeilu ghostscriptillä)
- `gs -dPDFSETTINGS=/ebook` pienensi korttipelin arkin 4,1 → 0,2 MB (fi) ja 4,7 → 0,7 MB (ja).
- ⚠️ **QR sumeni**: kokonaispakkaus rasteroi QR:n ja pienensi sen tarkkuutta. QR:n pitää pysyä terävänä (esim. vektorina tai kuvana, jota ei pienennetä), ja `korttisaannot.qr_lukukoe` + `sisaltokoe` ajetaan myös pakatulle versiolle.
- ⚠️ Lautapelin `pizza-love-lautapeli-peruspeli.pdf` kasvoi samalla asetuksella 3,1 → 3,3 MB. Se tarvitsee eri keinon (kuvien pienennys lähteessä tai muu asetus).
- gs muutti fontit Type 3:ksi. Tarkista, että teksti on yhä haettavissa ja kopioitavissa (sisaltokoe).

## Sijainti ja nimet
Ehdotus: `julkinen/pdf/2mb/<sama nimi>.pdf`. Toteuttaja päättää lopullisen sijainnin, mutta tiedostot tulevat generaattorista eivätkä ole käsin tehtyjä kopioita. Kun pakatut syntyvät, poista `Claude/Myynti/Philibert/saannot_2MB/` -tiedostot (Markon lupa tarvitaan) ja korvaa ne viittauksella generoituihin. Sivustolla (rakenna.py) näkyy edelleen vain näyttölaatuinen.

## Valmis kun
- Kaikki pakatut alittavat 2 MB, ja QR- ja sisältökokeet menevät läpi molemmille versioille.
- Rajan ylitys kaatuu ajon (testattu tahallisella ylityksellä).
- Konekäännösajo tuottaa pakatun automaattisesti ilman Markon toimia.
- Päätöslokiin on kirjattu, mitä tehtiin.
