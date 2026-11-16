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
| `julkinen/pizzaparty/` | **vain ohjaus** vanhasta osoitteesta `/play/`:hin (Marko 20.10.2026). Viisi sivua, ei peliä. Älä kopioi tänne mitään. |
| `rakenna.py` | tekee sivut. Videot, kauppalinkit ja PDF:t on lueteltu tiedoston alussa. |
| `korttisaannot.py` | korttipelin säännöt A4-PDF:nä kielikohtaisesti (`julkinen/pdf/`) |
| `tyokalut/joulukalenteri.py` | joulukalenterin 24 luukkua ja 28 pulmaa → `julkinen/joulu/pulmat.json` |
| `julkinen/joulu/` | joulukalenterisivu (pelilauta taustana, luukut sen päällä) |
| `docs/` | valmis sivusto, jonka GitHub Pages julkaisee. **Älä muokkaa käsin.** |
| `julkinen/play/` | peli. **Lähde on `../pizzaparty/`** — älä muokkaa täällä, ks. alla. |

## Muutoksen tekeminen

```bash
python3 rakenna.py      # tekee docs/-kansion uudelleen
git add -A && git commit -m "mitä muuttui" && git push
```

Pelin päivitys: tee muutos `../pizzaparty/`-repossa, aja
`python3 tyokalut/peli-kopio.py --kopioi` ja sitten `rakenna.py`.

⚠️ **Tässä luki 13.11.2026 asti, että tiedostot kopioidaan käsin
`julkinen/pizzaparty/`-kansioon.** Se on vanhentunut kahdesti: peli siirtyi
`/play/`:hin 20.10., ja kopiointi koneellistui 11.11. Vanhassa kansiossa on
enää viisi ohjaussivua, joten ohjeen seuraaminen olisi kirjoittanut pelin
ohjausten päälle — ja uusi koodi ei olisi näkynyt missään.

## Uuden kielen lisääminen

1. Kopioi `sisalto/en.json` nimelle `sisalto/xx.json` ja käännä arvot (avaimia ei muuteta).
2. Lisää `xx` listaan `KIELET` tiedoston `rakenna.py` alussa.
3. **Lippu:** kopioi flag-icons 7.2.3:n `flags/1x1/<maa>.svg` nimelle
   `julkinen/kuvat/liput/xx.svg` ja sävytä valkoinen (`#fff` → `#f1f0f0`), kuten
   `julkinen/kuvat/liput/LUE-MINUT.md` kertoo. Maa on **kielen tavallisimman maan**,
   ei kohdeyleisön — äläkä tee murteelle poikkeusta (Marko 16.11.2026).
4. Peli: lisää kielen lohko `../pizzaparty/kielet.js`:ään (ohje tiedoston alussa).
5. `python3 rakenna.py`. Kielivalikko päivittyy itsestään.

⚠️ **Askel 3 koskee vain käsin lisättyä kieltä.** Konekäännöskieli saa lipun
itsestään: `.github/workflows/konekaannos.yml` noutaa flag-iconsin (`npm pack`),
antaa sen `LIPUT_LAHDE`-muuttujassa `tyokalut/kaanna.py`:lle, jonka `lippu()`
kirjoittaa `julkinen/kuvat/liput/<koodi>.svg`:n, ja `konekaannokset-haara.sh`
committoi sen samaan ajoon. Markolta ei vaadita mitään.

📐 Jos lippua ei ole, se **näkyy puutteena eikä arvauksena**: valikossa on tyhjä
20 px:n paikka ja pelkkä kielen nimi, koteloarkissa pelkkä kielikoodi.

### Kielihakemisto (kielivalikon «Ei kieltäsi? Pyydä se»)

Valikon viimeinen rivi avaa hakemiston, jossa ovat kaikki kielet, joille
`tyokalut/kaanna.py` suostuisi tekemään konekäännöksen. Lista on
`julkinen/kielet.json`, ja sen tekee

```
python3 tyokalut/kielihakemisto.py      # vaatii langcodes + language_data
```

⚠️ **Älä korjaa `julkinen/kielet.json`:ia käsin.** Se ei ole kielilista vaan
`kaanna.py`:n oman säännön (`PUHUJIA_VAHINTAAN`, `OIKEALTA_VASEMMALLE`) tulos
tiedostona. Jos sääntö muuttuu, aja työkalu uudelleen. Tiedosto on CLDR-dataa
kielistä, ei sivuston omista kielistä, **eikä siis vanhene uuden kielen myötä** —
sivuston omat kielet hakemisto lukee sivun kielivalikosta ajon aikana.

Hakemistoa ei ladata sivun mukana, vaan vasta kun lukija avaa valitsimen
(21,6 kt, pakattuna 8,5 kt). Lippu on lippuemoji maakoodista — sama maa, josta
`lippu()` poimii koteloarkin lipun. Sivustolla jo oleva kieli näkyy omalla
SVG-lipullaan ja ✓:lla, eikä sitä voi pyytää uudelleen.

📐 Bannerin ja hakemiston ehdotuksen näkee millä tahansa selaimella lisäämällä
osoitteeseen `?pyynto=xx` (esim. `pizzalove.fi/fi/?pyynto=ko`). Ilman sitä
banneri näkyy vain, jos selaimen oma kieli puuttuu sivustolta.

## Peli tulee pizzapartysta (11.11.2026)

`julkinen/play/` on **kopio** `../pizzaparty/`:sta, ja kopiointi tehdään
työkalulla eikä käsin:

```
python3 tyokalut/peli-kopio.py            # tilanne, ei kirjoita mitään
python3 tyokalut/peli-kopio.py --kopioi   # kopioi sen mikä on turvallista
```

⚠️ **Tee pelimuutokset pizzapartyssa.** Täällä tehty muutos katoaa seuraavassa
kopioinnissa — tai estää sen.

📐 **Miksi työkalu eikä `cp`:** 11.11.2026 mitattuna 18 tiedostoa oli
ajautunut erilleen, ja useimmat MOLEMPIIN suuntiin. Kumpi tahansa suunta
pelkkänä kopiointina olisi pyyhkinyt toisen puolen työn ilman yhtäkään
virhettä. Työkalu kieltäytyy sellaisesta tiedostosta ja kertoo nimeltä, mitkä
on sulautettava pizzapartyyn ensin — ja montako riviä kummallakin puolella on.

`?v=`-leimat ovat sivuston omaa tietoa eivätkä tule lähteestä: työkalu laskee
ne **sisällön tiivisteestä** kopioinnin jälkeen. Leimaa ei siis enää nosteta
käsin, eikä «leima jäi nostamatta» ole enää mahdollinen vika.

### Ajautuma sulautettiin 13.11.2026 — `--pakota` ei pitäisi enää tarvita

Kahden kuukauden ajautuma purettiin kolmisuuntaisena sulautuksena pizzapartyyn
(`ea3ddf7`): jokaiselle 19 tiedostolle etsittiin yhteinen pohja vertaamalla
repojen historioita leimat normalisoituna, ja `git merge-file` teki työn.
📐 Konflikteja 10, joista 9 oli pelkkiä `?v=`-leimoja; aito oli yksi.

Sen jälkeen seitsemän tiedostoa kopioitiin `--pakota`lla, koska niissä oli
rivejä vain täällä. **Jokainen tarkistettiin rivi riviltä, ja kaikki seitsemän
olivat korvattuja eivätkä kadotettuja** — vanha nimentarkistus, jonka tilalle
tuli jaettu sääntö (`hahmot.js`), ja vanha nopan kuva, jonka tilalle tuli
oikea 3D-noppa.

### Työkalu muistaa, mitä viimeksi tuotiin (13.11.2026)

`tyokalut/peli-kopio-tila.json` on kirjanpito: jokaisen tiedoston tiiviste
sellaisena kuin se viimeksi kopioitiin. **Ilman sitä työkalu kysyi väärää
kysymystä** — se vertasi repojen HEADeja toisiinsa, mutta erilliset repot
eroavat aina, eikä erosta näe onko lähde EDELLÄ vai ovatko molemmat
liikkuneet. 📐 13.11. tämä esti kopioinnin tiedostosta, jota ei ollut täällä
koskaan muokattu.

Kirjanpidolla kysymys on oikea ja sillä on kolme vastausta:
kohde ennallaan → **kopioidaan** · vain täällä muokattu → **ei kopioida**
(muutos katoaisi) · molemmat liikkuneet → **sulauta lähteeseen ensin**.
Todennettu mutaatiolla kaikissa kolmessa suunnassa.

⚠️ **Jos työkalu estää kopioinnin uudelleen, se ei ole historiaa vaan uusi
ajautuma:** joku on muokannut `julkinen/play/`:ta. Sulauta pizzapartyyn äläkä
pakota. `--pakota` on tarkoitettu tilanteeseen, jossa sulautus on JO tehty ja
jäljellä olevat erot on luettu — se kirjoittaa pakotetut tiedostot nimeltä
ulos juuri siksi, ettei ohitus jää hiljaiseksi.

📐 Ja sulautus löysi aukon, jota kumpikaan puoli ei olisi nähnyt yksin:
`huone.nimiPakollinen` puuttui kaikista neljästä uudesta kielestä, koska
pakollinen nimi syntyi 21.10. ja kielet 11.11. Hollantilainen lapsi olisi
nähnyt tyhjällä nimellä avaimen eikä ohjetta. **Kun lähteitä on kaksi, puute
ei synny kummassakaan vaan niiden väliin.**

## Moninpeli

GitHub Pages ei aja PHP:tä. Moninpelin palvelin (`huone.php`) on
varainhankinta.merkitysten.fi/pizzaparty/ (Domainhotelli). Peli kutsuu sitä
osoitteesta, joka on `pizzaparty/yhteys.js`:n rivillä `HUONE_OSOITE`.
`huone.php` sallii kutsut pizzalove.fi:stä ja *.github.io:sta (CORS).
⚠️ Uusi `huone.php` on ladattava palvelimelle, ennen kuin moninpeli toimii pizzalove.fi:ssä.
Lähde on **`../pizzaparty/huone.php`** — vienti SSH:lla (`../SSH-VIENTI-OHJE.md`).

⚠️ **`huone.php`:tä EI ole tässä reposssa (poistettu 11.11.2026).** Täällä oli
kopio, joka oli ajautunut 53 riviä oikeasta jälkeen. Se ei tehnyt mitään —
Pages ei aja PHP:tä, joten se vain tarjoiltiin raakana lähdekoodina — mutta
se riitti pettämään: muutos todennettiin paikallisesti sitä vasten ja
näytti vihreältä, vaikka tuotannon palvelin ajaa toista tiedostoa.
Sama ratkaisu kuin `basso-huone.php`:lla, jota täällä ei ole koskaan ollut.
Moninpelin paikallinen testaus tehdään **pizzaparty-kansiosta**, jossa
oikea `huone.php` on oman `party.html`:nsä vieressä.

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

### ⏳ Kesken: `pelilauta.webp` on kahdessa paikassa (16.11.2026)

Sama kuva on nyt `julkinen/kuvat/pelilauta.webp` (lautapelisivun «laudan
kartta») ja `../pizzaparty/apinavaaka/pelilauta.webp` (apinakorttien
animaatio). 📐 Todennettu `shasum`illa: **tavulleen sama tiedosto**.

Jälkimmäinen on päätetty lähde — pizzaparty on pelin aineiston koti, ja
`tyokalut/peli-kopio.py` vie sen `julkinen/play/`:hin. **Toinen puoli on
tekemättä:** lautapelisivun kartta siirtyy samaan tiedostoon ja
`julkinen/kuvat/`-kopio poistuu, jolloin julkaistuja kopioita on yksi.

⚠️ Tehdään apinakorttien vaiheen 2 yhteydessä yhtenä muutoksena, jottei
sivusto ole välillä rikki. Jos luet tätä ja kuvia on yhä kaksi, siirto on
yhä tekemättä — ja syy miksi sitä ei jätetä on se, että kaksi kopiota
ajautuu erilleen eikä mikään hälytä.
