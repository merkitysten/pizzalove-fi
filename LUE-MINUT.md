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

## Moninpeli

GitHub Pages ei aja PHP:tä. Moninpelin palvelin (`huone.php`) on
varainhankinta.merkitysten.fi/pizzaparty/ (Domainhotelli). Peli kutsuu sitä
osoitteesta, joka on `pizzaparty/yhteys.js`:n rivillä `HUONE_OSOITE`.
`huone.php` sallii kutsut pizzalove.fi:stä ja *.github.io:sta (CORS).
⚠️ Uusi `huone.php` on ladattava palvelimelle, ennen kuin moninpeli toimii pizzalove.fi:ssä.

## Käyttöönotto (kerran)

1. GitHubissa uusi **julkinen** repo, esim. `pizzalove-fi`. Työnnä tämä kansio sinne.
2. Repo → Settings → Pages → Source: *Deploy from a branch*, haara `main`, kansio `/docs`.
3. Testaa osoitteessa `https://<käyttäjänimi>.github.io/pizzalove-fi/` …
   ⚠️ alikansiossa juurisivun kieliohjaus toimii, mutta oikea testi on vasta pizzalove.fi.
4. Settings → Pages → Custom domain: `pizzalove.fi` (tiedosto `docs/CNAME` on jo valmiina).
   Tilin asetuksista: Pages → **Verified domains** → lisää pizzalove.fi (estää domainin kaappauksen).
5. Domainhotellin DNS (pizzalove.fi): apex → A-tietueet 185.199.108.153, 185.199.109.153,
   185.199.110.153, 185.199.111.153 · `www` → CNAME `<käyttäjänimi>.github.io`.
   Poista vanha ohjaus merkitysten.fi/pizzalove vasta tässä vaiheessa.
6. Kun sertifikaatti on valmis: Enforce HTTPS päälle. Tee tämä hyvissä ajoin ennen messuja.

## EU-tunnus

Avoin kysymys (ks. toimeksianto, luku 7). Paikka on valmiina: `rakenna.py`:n
alatunnisteessa on `<div class="eu-tunnus" id="eu-tunnus" hidden>`. Jos tunnus
tulee, lisää kuva `julkinen/kuvat/`-kansioon, kuva diviin ja poista `hidden`.

## Tarkistettavaa

- Saksankieliset tekstit (`sisalto/de.json`, pelin `kielet.js` de-lohko) ovat
  Clauden käännös 6.10.2026 ja odottavat natiivitarkistusta.
- Basso / Bruno: uusi nimi kaikessa, korttipelisivulla huomautus vanhasta nimestä.
