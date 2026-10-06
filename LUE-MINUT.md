# pizzalove.fi

Pizza Love® -pelien omistajan sivusto: säännöt, ohjevideot ja Pizza Party -verkkopeli
neljällä kielellä (fi, sv, en, de). Staattinen sivusto, julkaistaan GitHub Pagesissa.
Taustalla: `../Hankehakemukset/pizzalove_fi_TOIMEKSIANTO.md`.

## Mikä on missä

| kansio / tiedosto | mitä |
|---|---|
| `sisalto/fi.json` … `de.json` | **kaikki sivujen tekstit**. Muokkaa näitä. |
| `julkinen/tyyli.css` | ulkoasu (värit ja täytekuosi samat kuin varainhankinnassa) |
| `julkinen/kuvat/`, `julkinen/pdf/` | kuvat ja ladattavat ohjeet |
| `julkinen/pizzaparty/` | **kopio** pelistä (`../pizzaparty/`). Älä muokkaa täällä. |
| `rakenna.py` | tekee sivut. Videot, kauppalinkit ja PDF:t on lueteltu tiedoston alussa. |
| `docs/` | valmis sivusto, jonka GitHub Pages julkaisee. **Älä muokkaa käsin.** |

## Muutoksen tekeminen

```bash
python3 rakenna.py      # tekee docs/-kansion uudelleen
git add -A && git commit -m "mitä muuttui" && git push
```

Pelin päivitys: tee muutos `../pizzaparty/`-repossa, kopioi tiedostot
`julkinen/pizzaparty/`-kansioon (ei `*.md`, `*.php`, `.htaccess`, `testit/`,
`laskinkoe.js`, `kellokoe.html`) ja aja `rakenna.py`.

## Uuden kielen lisääminen

1. Kopioi `sisalto/en.json` nimelle `sisalto/xx.json` ja käännä arvot (avaimia ei muuteta).
2. Lisää `xx` listaan `KIELET` tiedoston `rakenna.py` alussa.
3. Peli: lisää kielen lohko `../pizzaparty/kielet.js`:ään (ohje tiedoston alussa).
4. `python3 rakenna.py`. Kielivalikko päivittyy itsestään.

## Moninpeli

GitHub Pages ei aja PHP:tä. Moninpelin palvelin (`huone.php`) on
varainhankinta.merkitysten.fi/pizzaparty/ (Domainhotelli). Peli kutsuu sitä
osoitteesta, joka on `pizzaparty/yhteys.js`:n rivillä `HUONE_OSOITE`.
`huone.php` sallii kutsut pizzalove.fi:stä ja *.github.io:sta (CORS).
⚠️ Uusi `huone.php` on ladattava palvelimelle, ennen kuin moninpeli toimii pizzalove.fi:ssä.

## Käyttöönotto (kerran)

GitHub-tili: **merkitysten**. Repo: **merkitysten/pizzalove-fi** (julkinen).

1. GitHub Desktop → File → Add local repository → valitse tämä kansio →
   **Publish repository**. Poista rasti kohdasta *Keep this code private*.
2. github.com/merkitysten/pizzalove-fi → Settings → Pages → Source:
   *Deploy from a branch*, haara `main`, kansio `/docs` → Save.
3. Muutaman minuutin päästä testiosoite: **https://merkitysten.github.io/pizzalove-fi/**
   Testaa puhelimella: kielet, videot, PDF:t ja Pizza Party (myös moninpeli,
   kun uusi huone.php on palvelimella).
4. Profiilin Settings → Pages → **Verified domains** → lisää `pizzalove.fi`.
   GitHub antaa TXT-tietueen, joka lisätään Domainhotellin DNS:ään.
   (Estää ketään muuta ottamasta domainia käyttöön GitHubissa.)
5. **DNS-vaihto, kun testi on kunnossa:**
   - `rakenna.py`: `KAYTA_OMAA_DOMAINIA = True` → `python3 rakenna.py` → commit + push
   - Domainhotelli, pizzalove.fi: poista nykyinen ohjaus, lisää apexiin A-tietueet
     185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
     ja `www` → CNAME `merkitysten.github.io`
   - Repo → Settings → Pages: tarkista että Custom domain on `pizzalove.fi`
6. Kun varmenne on valmis (minuuteista tuntiin): **Enforce HTTPS** päälle.
   Tee vaihto hyvissä ajoin ennen 22.10.

## EU-tunnus

Avoin kysymys (ks. toimeksianto, luku 7). Paikka on valmiina: `rakenna.py`:n
alatunnisteessa on `<div class="eu-tunnus" id="eu-tunnus" hidden>`. Jos tunnus
tulee, lisää kuva `julkinen/kuvat/`-kansioon, kuva diviin ja poista `hidden`.

## Tarkistettavaa

- Saksankieliset tekstit (`sisalto/de.json`, pelin `kielet.js` de-lohko) ovat
  Clauden käännös 6.10.2026 ja odottavat natiivitarkistusta.
- Basso / Bruno: uusi nimi kaikessa, korttipelisivulla huomautus vanhasta nimestä.
