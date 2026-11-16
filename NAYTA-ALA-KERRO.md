# Näytä, älä kerro — kartoitus pizzalove.fi:n sivuista

Marko 16.11.2026: *«Sen sijaan, että nettisivulla kerrotaan, niin pitäisikö näyttää?
Tehdään animaatiot kaikesta mistä se on vain mahdollista.»* Ja samana päivänä:
*«Silloin meillä olisi digitaalinen maailma, jossa on digitaalisen maailman
pelisäännöt ja reunaehdot. Lisäksi meillä olisi se fyysisen maailman paperipdf.
**Ei tehdä digitaalista alustaa fyysisen maailman ehdoilla.»***

Tämä tiedosto on **kartoitus, ei toteutus.** Se kertoo, mitkä kohdat kannattaa
näyttää, mitkä on jätettävä tekstiksi ja missä järjestyksessä työ voidaan jakaa
rinnakkaisiin istuntoihin ilman että kaksi istuntoa kirjoittaa samaan tiedostoon.

Löydettyjä kohtia **28**. Näistä **15 kannattaa näyttää**, **9 jää tekstiksi**,
**3 on jo varattu** toiselle istunnolle ja **1 on jo tehty**.

---

## 1. Lähtötilanne mitattuna

Mittaus 16.11.2026, `python3 -m http.server` → `docs/`, selainpaneeli 375 × 812
(puhelin pystyssä). «Ruutua» = sivun korkeus jaettuna 812:lla.

| sivu | korkeus | ruutua | sanaa (main) | videoita | sisältökuvia¹ | ensimmäinen varsinainen sääntö |
|---|---|---|---|---|---|---|
| `index.html` | 2 942 px | 3,6 | 149 | 0 | 6 | — (sivu on valikko) |
| `korttipeli.html` | 6 771 px | 8,3 | 1 198 | 7 | 9 | «Tavoite» 3 213 px |
| `lautapeli.html` | 5 356 px | 6,6 | 437 | 4 | 3 | «Vuoron kulku» 1 967 px |
| `apinakortit.html` | 9 384 px | 11,6 | 866 | 0 | **1** | kortti 01 913 px |
| `essen-2026.html` | 8 180 px | 10,1 | 479 | 0 | 15 | «Vuoro» 5 732 px |

¹ ilman 11 kielivalikon lippua ja ilman YouTuben esikatselukuvia.

Lisää mitattua:

- **Korttipelisivun 1 198 sanaa jakautuvat näin:** «Näin pizza tehdään» 281,
  «Kolme tapaa pelata» 835 (kolme haitaria, `#party` auki, `#basso` ja `#love` kiinni),
  loput 82.
- **Apinakorttisivulla on 866 sanaa korttitekstiä ja yksi kuva** — ja sekin on
  ylätunnisteen viiri. 33 korttia, ei yhtäkään kuvaa kortista tai laudasta.
- **Lautapelisivulla ei ole yhtään kuvaa pelilaudasta.** Kolme kuvaa ovat viiri,
  tuotepakkaus ja bannerin apina. Teksti nimeää varaston, linjaston, apinavaa'an,
  nopan ja boksin; mikään niistä ei näy sivulla.
- **Animaatiokieli on jo olemassa pelipuolella:** `julkinen/play/*.css` 45 kpl
  `@keyframes`. Sääntösivujen puolella niitä oli mitattaessa 6 (kaikki bannerin
  apinalle) ja on nyt 12: yhteinen kerros toi neljä perusliikettä (ks. alla).
- **Kuvapankki on jo repossa.** `julkinen/play/kuvat/`: pizzakortit 13–54 (42 kpl,
  yhteensä 1,6 Mt), täytekortit 1–10 ja fantasia X (500 kt), palat 1–10.
  `julkinen/play/apinavaaka/`: noppa 0–10 (SVG), täytetornit 1–10, kulhot 1–10,
  hihna, uuni, boksi, vaaka. **Nämä on jo julkaistu** (`docs/play/…`), joten
  sääntösivu voi viitata niihin suoraan: `../play/kuvat/pizza-31.webp`.
- **Painettu korttikuva painaa 36–48 kt** (351 px). Korttipelisivun omat
  tiedostot painoivat mitattaessa yhteensä 857 kt. Demoihin ei kuitenkaan käytetä
  näitä vaan pienennettyjä kopioita: `julkinen/kuvat/kortti/`, 240 px, **17 kt**
  kappale (ks. seuraava luku).
- **Sivu hakee 11 videon esikatselukuvan Googlelta** (`i.ytimg.com`, 7 korttipelissä
  ja 4 lautapelissä); varsinaista upotusta ei ladata ennen klikkausta.

### Yhteinen kerros on jo olemassa — lue se ennen kuin aloitat

Kartoituksen aikana (16.11.2026) toinen istunto sai valmiiksi yhteisen
animaatiokerroksen. Se **ei ole oma tiedostonsa**, vaan se asuu kahdessa jo
olemassa olevassa tiedostossa — tällä on suora vaikutus siihen, mitkä työt
voivat olla rinnakkain (luku 6):

- **`julkinen/tyyli.css`, lohko «LIIKEKIELI»** (n. 65 riviä tiedoston alussa):
  kestot `--liike-pika/nopea/perus/pitka/hidas` ja käyrät
  `--liike-saapuu/pomppu/lahtee`, sekä neljä perusliikettä
  (`kortti-poytaan`, `kortti-isku`, `kortti-syke`, `liike-esiin`).
  Lohko sanoo itse: *«Jos tarvitset liikkeen jota täällä ei ole, LISÄÄ SE TÄHÄN
  LOHKOON nimettynä»* — eli omia `@keyframes`-sääntöjä ei kirjoiteta muualle.
  Arvot eivät ole keksittyjä: ne ovat pelin omien 45 keyframe-säännön yleisimmät
  kestot ja käyrät, nyt nimettyinä.
- **Saavutettavuuden kytkin:** liikkuva lohko saa luokan `liike`, ja yksi sääntö
  `@media (prefers-reduced-motion:reduce)` pysäyttää kaiken sen sisällä. Reunaehto
  1 on siis hoidettu kerralla — mutta vain sillä ehdolla, että liike on **pelkkää
  koristetta** ja sisältö toimii ilman sitä.
- **`julkinen/sivu.js`** rakentaa demot. Ilman JavaScriptiä `.esimerkki` jää
  siksi mitä se oli: yksi `role="img"` ja koko lauseen `aria-label`. Reunaehto 4
  on siis hoidettu samalla kaavalla kuin bannerin apinassa.
- **`tyokalut/korttikuvat.py`** tekee pelin korttikuvista 240 px:n kopiot
  kansioon `julkinen/kuvat/kortti/`. Lähde on `julkinen/play/kuvat/`, joten
  lähteitä on yhä yksi. Mitattu: 351 px = 47 kt, 240 px = 17 kt, ja kolmen
  kortin esimerkkilohko **kevenee 88 kt**. Nyt kansiossa on pizza-31 ja
  täytteet 1–10 + x; **muita pizzakortteja tarvitseva demo laajentaa tätä
  skriptiä** eikä kopioi käsin.
- **Ensimmäinen demo, «pizzakeittiö»,** on `.esimerkki`-lohkon paikalla
  korttipelisivulla: lukija vaihtaa täytekortteja, vaihtaa laskutoimituksen
  (+ − × :) ja näkee heti, tuleeko pizzan arvo 5. Tämä kattaa kohdan **K2** ja
  suuren osan kohdasta **K3**.

### Kaksi asiaa, jotka briiffi oletti toisin

1. **Korttipelisivulla on vain yksi `.esimerkki`-ryhmä**, ei useita: pizza 31
   `=` täyte 10 `:` täyte 2. Kolmiportainen «Mitkä tahansa täytteet / Basso-apinan
   tapa / Oikeat täytteet» esimerkkiriveineen (`korttipeli.portaat`) on olemassa
   `sisalto/fi.json`:ssa, mutta **vain PDF:ää ja koteloarkkia varten**
   (`korttisaannot.py`, `koteloarkki.py`, `tyokalut/kaanna.py`) — `rakenna.py` ei
   käytä sitä. Sivulla sama asia kerrotaan kahtena laatikkona ilman esimerkkikuvia.
2. **Käännöskustannus ei ole 11 kieltä käsin, vaan 8.** Käsin tarkistettuja on 8
   (fi sv en de nl fr es sk). Konekäännöskieliä on nyt 2 (ja, pl), ja niiden
   putki kääntää vain `korttipeli`- ja `ui`-lohkot (`KONE_SIVU = 'card-game'`).
   Eli: **uusi avain `korttipeli`- tai `ui`-lohkossa maksaa 8 käännöstä ja leviää
   konekielille itsestään; uusi avain `lautapeli`-, `toppingten`- tai
   `apinakortit-*`-lohkossa maksaa 8 eikä leviä mihinkään.** ⚠ `korttipeli`-lohkon
   avainjoukko tarkistetaan englantia vasten (`tyokalut/kaanna.py`, `vertaa()`),
   joten uusi avain on lisättävä kaikkiin kahdeksaan ennen seuraavaa konekäännösajoa.

---

## 2. Kysymys, jota vasten jokainen kohta punnitaan

**Mitä ruutu voi tehdä, mitä paperi ei voi?** Kolme asiaa, ei enempää:

| | | |
|---|---|---|
| **A — aika** | Ruutu näyttää muutoksen: ennen → jälkeen. | Paperi joutuu piirtämään kaksi ruutua tai kirjoittamaan «sitten». |
| **K — kokeilu** | Lukija yrittää ja saa vastauksen: kelpaako tämä? | Paperi voi vain luetella esimerkkejä. Se ei osaa vastata. |
| **U — uudelleenjärjestely** | Sama paikka näyttää neljä tapausta tai korostaa osan kerrallaan. | Paperi tarvitsee neljä painettua kuvaa ja neljä kertaa tilaa. |

Jos ehdotus ei käytä yhtäkään näistä, se on **paperia joka vipattaa**, ja se
merkitään tässä tekstiksi.

Ja käänteinen koe, yhtä tärkeä: **jos demo tarvitsee sanoja tullakseen
ymmärretyksi, se ei vielä näytä mitään.** Silloin teksti on oikea muoto — tai
demo on suunniteltava uudelleen niin, että hylkäys näkyy eikä sitä tarvitse
sanoa. Tämä koe on myös halvin tapa pitää reunaehto 6 kurissa: demo joka ei
tarvitse omaa lausetta, maksaa nolla käännöstä.

---

## 3. Reunaehdot, jotka jokaisen ehdotuksen on kestettävä

1. **`prefers-reduced-motion: reduce`** — liike pois, sisältö jää. Ei lisäominaisuus,
   vaan osa jokaista kohtaa. Malli on olemassa: `julkinen/tyyli.css` rivit 219–222.
2. **Saavutettavuus.** `role="img"` + `aria-label` -ryhmät ovat ruudunlukijalle
   **yksi kuva** (`.esimerkki` korttipelisivulla). Vuorovaikutteinen versio ei ole
   enää yksi kuva: se tarvitsee oikean tekstivastineen ja näppäimistöllä
   käytettävät painikkeet. Jos tekstivastine on sama lause joka on jo sivulla,
   käännöskustannus on nolla — käytä sitä.
3. **Ei uusia ulkopuolisia kirjastoja.** Puhdas CSS ja JS.
4. **Sivu toimii ilman JavaScriptiä nyt.** Perusluettavuuden on säilyttävä: demon
   paikalla on ilman JS:ää kuva tai nykyinen teksti, kuten bannerin apinalla.
5. **Sivu on jo pitkä — animaatio ei saa pidentää sitä.** Demo korvaa kuvan tai
   mahtuu nykyisen tekstin viereen; se ei tule tekstin alle lisäksi. Kipeimmin
   tämä koskee apinakorttisivua (11,6 ruutua jo nyt).
6. **Teksti elää 10 kielitiedostossa** (8 käsin + 2 konekäännöstä, ks. luku 1).
   Uusi teksti on 8 käännöstä. Parasta tekstiä on se, jota ei kirjoiteta.
7. *(Lisäys tähän kartoitukseen.)* **`julkinen/play/` on peilikopio
   `../pizzaparty/`:sta — sitä ei saa muokata täällä.** Kuvia ja geometriaa saa
   käyttää, ja sivut tekevät niin jo (`lautapeli.html` lataa `apinavaaka.js`:n).
   Jos ehdotus vaatii muutoksen pelin koodiin, työ kuuluu pizzaparty-repoon ja on
   **sarjassa apinakorttianimaation kanssa.**

---

## 4. Kohdat sivuittain

Merkinnät: 🟢 näytä · ⚪ teksti on oikea muoto · 🔒 varattu toiselle istunnolle ·
✅ tehty jo. Ruutuetu: A = aika, K = kokeilu, U = uudelleenjärjestely.

Työmäärä:
**S** = yksi istunto, oma moduulitiedosto + yksi rivi `rakenna.py`:hyn, ei uutta tekstiä ·
**M** = yksi–kaksi istuntoa, oma tilakone tai kokeiltava vuorovaikutus ·
**L** = useampi istunto, monta tilaa, kaksi osapuolta tai uusi kuva-aineisto.

### 4.1 `korttipeli.html` — 1 198 sanaa, 8,3 ruutua

| # | Kohta | Mitä nyt kerrotaan sanoin | Mitä näytettäisiin | Mitä ruutu lisää paperiin | Kuvat | Työ | Riippuu |
|---|---|---|---|---|---|---|---|
| **K1** 🟢 | «Pizzakortit» ja «Täytekortit» | 41 sanaa: arvo on kulmissa, 10 sydänpizzaa, 3 fantasiatäytettä (X). Kuvina **korttien selkäpuolet** — juuri se puoli, jossa mitään kuvattua ei ole. | Kortti kuvapuoli ylöspäin; napautus nimeää osan kerrallaan: kulman luku, täytesymbolit, sydän, X. Sama paikka näyttää neljä korttityyppiä. | **U.** Paperi tarvitsee neljä painettua korttia; ruutu näyttää ne yhdessä paikassa ja osoittaa, mihin sana «kulmissa» viittaa. | Täytteet on jo pienennetty; **sydänpizza ja 4 täytteen pizza puuttuvat** → laajenna `tyokalut/korttikuvat.py` | S | kerros. Korvaa kaksi nykyistä kuvaa → **sivu ei pitene** |
| **K2** 🔒 | «Perussääntö» · «Pizzan arvo» · «Esimerkki» | 69 sanaa + yksi esimerkkirivi | **Tehty 16.11.2026: pizzakeittiö** — lukija vaihtaa täytekortit ja laskutoimituksen ja näkee, tuleeko 5. | **K.** | — | — | **Varattu: pizzan valmistuksen animaatio** |
| **K3** 🟢 | «Kaikki laskutoimitukset käyvät» | 29 sanaa ja kaksi esimerkkiä (5 = 2² + 1, 5 = 3! − 1). PDF:ssä on kahdeksan rivin lista (`laskut.paperi`); sivulla ei ole. | **Keittiö kattaa tästä jo neljä laskutapaa (+ − × :).** Jäljelle jää juuri se, mikä tämän otsikon alla on tärkeintä: potenssi, juuri, logaritmi ja kertoma. Eli joko keittiön merkkivalikoiman laajennus tai PDF:n kahdeksan rivin lista myös sivulle. | **K.** Paperi luettelee esimerkkejä; ruutu kertoo, kelpaako lukijan **oma** keksintö. Otsikon väite «kaikki käyvät» jää puolittain lunastamatta, jos ruutu tarjoaa vain neljä merkkiä. | On | S (keittiön jatko) · S (lista) | **Keittiö** — sama komponentti, sama istunto |
| **K4** 🟢 | «Basso-apinan tapa» | 64 sanaa — sivuston pisin yksittäinen sääntö. Teksti myöntää itse, että painetussa ohjeessa sääntö on toisin. | Sama tomaatti-ananaspizza ja kolme kättä: 10 : 2 (yksi laji) ei käy · 2 + 3 käy · 2 + 2 + 1 käy. Lukija valitsee kortit itse. | **K.** Sääntö on testi, ja ruutu osaa ajaa testin; teksti voi vain väittää. Kohta tiedetään jo vaikeaksi. | On | M | **Keittiö** — sama komponentti, lisäksi uusi tarkistus «montako eri täytettä» |
| **K5** 🟢 | «Valmistelut» × 3 pelimuotoa | 3 × n. 45 sanaa: sekoita, jaa 5 / 7 / 8 korttia, loput nostopakaksi, käännä ensimmäinen pizzakortti pinon viereen. | Yksi pöytäkuva per pelimuoto: pakka, nostopakka, käännetty pizza, käden korttimäärä. | **U.** Asetelma on paikkatietoa, ja paikkatieto luetaan kuvasta kerralla. ⚠ **Kuvana, ei liikkeenä:** jakamisen animointi olisi paperia joka vipattaa. | Koottavissa olemassa olevista korteista CSS:llä | S × 3 | **Ei mistään** — ei tarvitse kerrosta |
| **K6** 🟢 | «Nopein saa… jos moni lyö yhtä aikaa, pizzan saa se, jonka kortit ovat alimmaisina» | Yksi virke 120 sanan luettelon keskellä | Kaksi kättä lyö, kortit asettuvat päällekkäin, alimmainen korostuu voittajaksi. | **A.** Sääntö koskee kahden tapahtuman järjestystä, eikä järjestystä voi piirtää yhteen kuvaan. | On | S | kerros |
| **K7** 🟢 | «Jos pizzaa ei voi valmistaa» | 40 sanaa: käännä uusi pizza päälle; seuraava valmistaja saa kaikki näkyvät pizzat. | Pino kasvaa kortti kerrallaan; seuraava valmistaja korjaa koko pinon. | **A.** Kertyminen. Potin kasvu on syy pelata, ja tekstissä se on sivulause. | On | S | kerros. **Sama komponentti kuin Basson pinon kasvu** — tehdään kerran, käytetään kahdesti |
| **K8** ⚪ | Pizza Basso, vuoro A / B / C | 110 sanaa kolmena haarana | — | **Haarat ovat ehtoja, eivät liikettä** («jos et onnistu → nosta»). Päätöspuu luetaan listana nopeammin kuin katsotaan. Ainoa liikkuva osa (pino kasvaa) tulee K7:stä ilmaiseksi. | — | — | — |
| **K9** 🟢 | Pizza Love: «Varasto» + «Varaston täyttäminen» | 230 sanaa kolmessa otsikossa — **sivuston pisin yhtenäinen sääntöjakso**. Ydin: neljä paikkaa, vain päällimmäinen käytettävissä, pinoaminen suojaa kortin — «se on silloin lukossa myös sinulta». | Neljä varastopaikkaa; lukija laittaa kortin, pinoaa toisen päälle ja huomaa itse, ettei alla oleva ole enää käytettävissä. | **K + U.** Sääntö on ansa, josta tekstin on varoitettava; ruudulla ansaan voi astua turvallisesti. | On | L | kerros. Suurin yksittäinen työ tällä sivulla |
| **K10** 🟢 | Pizza Love: «Varastokorttien vaihtaminen» | «Antamistasi ja saamistasi korteista on saatava laskemalla sama luku» · «vaihtoon on pakko suostua» · «vain päällimmäisiä» | Kaksi varastoa vierekkäin; lukija ehdottaa vaihtoa ja näkee, meneekö arvo tasan. | **K.** Sama peruste kuin K3:ssa, ja lisäksi toinen pelaaja tulee näkyviin. | On | M | **K9 ehdottomasti** — sama komponentti |
| **K11** ⚪ | «Pisteet ja voittaminen» (kaikki kolme muotoa) | n. 130 sanaa | — | Pisteet ovat **lukusääntö** («pizza = montako täytettä»; «fantasiatäyte 20»; «100 pistettä»). Luku on jo kortissa, ja animaatio toistaisi sen hitaammin. Yksi merkitty esimerkkikortti riittää, ja sellainen on jo sivulla. | — | — | — |
| **K12** ⚪ | «Valinnaiset säännöt», «Rauhallisempi Pizza Party», «Lyhyempi peli», Bruno-huomio | n. 80 sanaa | — | Nämä ovat **sopimuksia pelaajien kesken** («sopikaa ennen peliä») ja nimihistoriaa. Niissä ei ole mitään näytettävää: niissä päätetään jotain. | — | — | — |
| **K13** ⚪ | «Sydänpizza» (Pizza Love) | 25 sanaa | — | Tapahtuu kerran pelissä, eikä siinä ole paikkaa jota ei ymmärrä. Jos K9 tehdään, pikku siirtymän voi lisätä siihen samaan — mutta ei omana työnään. | — | — | — |

### 4.2 `lautapeli.html` — 437 sanaa, 6,6 ruutua, **ei yhtään kuvaa laudasta**

| # | Kohta | Mitä nyt kerrotaan sanoin | Mitä näytettäisiin | Mitä ruutu lisää paperiin | Kuvat | Työ | Riippuu |
|---|---|---|---|---|---|---|---|
| **L1** ⚪ | «Ennen ensimmäistä peliä» | 25 sanaa + kolme ohjevideota | — | Pahvilaatikon taittaminen on **käsityötaito**: video näyttää sormet ja järjestyksen. CSS ei tee sitä paremmin, ja videot ovat jo olemassa. Teksti + video on tässä oikea muoto. | — | — | — |
| **L2** 🟢 | «Pelin voittaminen» | 22 sanaa, ja koko voittoehto on yhdessä sanassa: *10 **erilaista** palaa*. | Boksi täyttyy paloilla; sama pala toistamiseen ei kelpaa. | **A.** Paperilla «erilaista» on lihavoitu sana; ruudulla se on tapahtuma joka **ei tapahdu**. | On (`play/kuvat/pala/1–10`, `play/apinavaaka/boksi.webp`) | S | kerros. ⚠ Harkitse ensin linkkiä: pelin «Nälkäiset apinat» tekee tämän jo |
| **L3** 🟢 | «Pelivalmistelut» | Neljä riviä, 30 sanaa, joissa esiintyy neljä paikannimeä joita sivulla ei näy missään: varasto, linjasto, pakka, boksi. | Nimetty kuva laudasta: varasto, linjasto, apinavaaka, noppa, boksi. | **U.** **Sanasto saa paikan.** Tämä on sivun suurin yksittäinen puute. Lisäksi kuvana eikä liikkeenä: asetelma ei muutu. | **Ei ole.** Tarvitaan laudan kuva, piirros tai pelin oma lauta renderöitynä | M–L (kuvan hankkiminen ratkaisee) | **Ei mistään.** Kannattaa tehdä ensin: L4 ja L5 nojaavat samaan sanastoon |
| **L4** 🟢 | Vuoro, vaihe 1: «Nopan heitto ja nappuloiden siirto» | 70 sanaa: «noppa kertoo, montako nappulaa siirretään varaston ja linjaston **välillä**. Samanväriset nappulat liikkuvat aina yhtenä tornina.» | Noppa näyttää luvun, torni siirtyy alueelta toiselle, laskuri täsmää; lukija kokeilee siirron itse. | **A + K.** Lautapelin ydinsääntö on siirto kahden alueen välillä — se on liikettä määritelmän mukaan. Suurin hyöty koko lautapelisivulla. | On (`apinavaaka/noppa/0–10.svg`, `apinavaaka/tayte/1–10`, `hihna.webp`) | L omana toteutuksena · S–M, jos käytetään pelin omaa opastusta | kerros + L3:n sanasto. ⚠ Pelin koodilla tehtynä työ kuuluu `../pizzaparty`-repoon → **sarjaan apinakorttityön kanssa** |
| **L5** 🟢 | Vuoro, vaihe 2: «Pizzan valmistaminen» | 50 sanaa; tärkein kohta «samaa täytettä voi käyttää vain yhteen pizzaan» | Linjaston täytteet kuluvat pizzaan ja palaavat varastoon. | **A.** Täytteiden kierto näkyy; teksti kuvaa sen kolmena erillisenä lauseena. | On | S–M L4:n päälle | **L4 ehdottomasti** — sama lauta |
| **L6** 🔒 | Vuoro, vaihe 3: «Apinakortin nostaminen» | 25 sanaa + linkki apinakorttisivulle | — | — | — | — | **Varattu:** `pizzaparty/TEHTAVA-APINAKORTTIEN-ANIMAATIO.md` |
| **L7** ⚪ | «Kolme tapaa pelata» (lautapelin muodot) | 134 sanaa kolmena haitarina | — | Kuvaukset ovat **valintaa varten**, eivät pelaamista varten: lukija päättää, kumpi sopii nelivuotiaalle. Valinta tehdään lukemalla, ei katsomalla. | — | — | — |
| **L8** ✅ | Apinavaaka-banneri | — | Tehty 20.10.2026: kädet keinuvat, kieli heiluu, silmät seuraavat osoitinta, nappi sytyttää lampun. | — | — | — | **Malli muille:** kerrokset pelistä, ilman JS:ää staattinen kuva, `prefers-reduced-motion` hoidettu |

### 4.3 `apinakortit.html` — 866 sanaa, 11,6 ruutua, **yksi kuva**

| # | Kohta | Tila |
|---|---|---|
| **A1** 🔒 | 33 apinakorttia | **Varattu:** `pizzaparty/TEHTAVA-APINAKORTTIEN-ANIMAATIO.md` (Marko 16.11.2026, PAATOSLOKI rivi 809). Älä suunnittele uudelleen. |

Kaksi mitattua huomiota **sille** istunnolle, ei tähän työhön:

- Sivu on jo 9 384 px eli 11,6 ruutua, ja pelkkä numerorivi on 304 px. 33
  «Näytä»-nappia ja minilautaa kasvattavat sitä; reunaehto 5 koskee tätä sivua
  kipeimmin. Animaatio kannattaa avata **saman kortin sisään**, ei sen alle.
- Sivulla ei ole tällä hetkellä yhtäkään kuvaa (yksi `<img>` on ylätunnisteen
  viiri). Lähtötaso on siis «pelkkää tekstiä», eli hyöty on suuri ja vertailukohta
  helppo.

### 4.4 `index.html` — 149 sanaa, 3,6 ruutua

| # | Kohta | Mitä nyt kerrotaan sanoin | Mitä näytettäisiin | Mitä ruutu lisää paperiin | Kuvat | Työ | Riippuu |
|---|---|---|---|---|---|---|---|
| **E1** ⚪ | Koko etusivu: sankari, «Valitse pelisi», varainhankinta, Brand Edition, kauppa | 149 sanaa | — | Sivu on **valikko, ei ohje.** Siltä valitaan peli; sillä ei kerrota mitään, mitä pitäisi näyttää. Liike olisi tässä koristetta — juuri «paperia joka vipattaa». | — | — | — |
| **E2** 🟢 | Pelaa-banneri | Oranssi banneri, nappi vie peliin | Sama lampun syttyminen kuin lautapelisivulla (L8). | **A**, vähän: napin tulos näkyy ennen kuin se tapahtuu. Rehellisesti pieni hyöty — mutta työ on melkein nolla, koska koodi on jo olemassa. | On | S (pieni) | **Ei mistään.** ⚠ koskee `julkinen/sivu.js`:ää, joka on yhteinen tiedosto |

### 4.5 `essen-2026.html` — 479 sanaa, 10,1 ruutua

| # | Kohta | Mitä nyt kerrotaan sanoin | Mitä näytettäisiin | Mitä ruutu lisää paperiin | Kuvat | Työ | Riippuu |
|---|---|---|---|---|---|---|---|
| **S1** 🟢 | Topping Ten, «Vuoro» + sen huomautus | 3 askelta + 28 sanaa: «Heitolla 10 otat yhden kympin tai vaikka 1 + 2 + 3 + 4. Arvoa kertyy sitä enemmän, mitä…» | Luku 10 tiskillä; lukija poimii yhdistelmän ja näkee pizzansa lohkojen täyttyvän. | **K.** Pelin koko idea on, että sama luku saadaan monella tavalla ja valinta maksaa lohkoja. Yhdistelmien moninaisuus on juuri se, mitä paperi ei voi näyttää. | On (`apinavaaka/noppa/*.svg`, `play/kuvat/pala/*`, `kuvat/topping-ten-alusta.webp`) | M | kerros. **Matala prioriteetti**: 450 kpl:n messuerä, säännöt 5 732 px:n syvyydessä |
| **S2** 🟢 | «Vinkki» | 38 sanaa: «Pieniä täytteitä on vähän: ykkösiä yksi ja kakkosia kaksi.» | Tiski oikeilla määrillä: yksi ykkönen, kaksi kakkosta, kymmenen kymppiä. | **U.** Niukkuus on lukumäärä, ja lukumäärä nähdään yhdellä silmäyksellä. | On | S | **Ei mistään** (staattinen kuva riittää) |
| **S3** ⚪ | «Messutarjoukset», «Mitä tuomme mukanamme», «Kolme kantta», «Essenin erä» | 145 sanaa | — | Hintoja ja tuotteita. Hinta on jo päätetty kortin isoimmaksi asiaksi eikä alaviitteeksi (`rakenna.py`, `.tarjous__hinta`); liike veisi huomion siitä pois. | — | — | — |
| **S4** ⚪ | «Tavoite», «Jos et voi tai et halua ottaa», «Kuka aloittaa kierroksen», «Pelin loppu», «Pisteet», «Tasatilanne» | 95 sanaa kuutena laatikkona | — | Nämä ovat **ehtoja ja erotuomarin sääntöjä** («kolme ohivuoroa peräkkäin ja putoat»; «jos kaksi pizzaa on yhtä arvokas»). Ne luetaan riidan hetkellä, ja silloin lukija haluaa lauseen — ei esitystä, jota pitää odottaa. | — | — | — |

---

## 5. Mikä jätetään tekstiksi, ja miksi

Yhdeksän kohtaa jää tekstiksi. Perusteet ryhmittyvät neljäksi:

1. **Ehdot ja päätöspuut** (K8, S4). «Jos et onnistu, nosta kortti.» «Kolme
   ohivuoroa peräkkäin ja putoat.» Ehto on luettava kerralla ja usein kesken
   riidan. Animaatio näyttää yhden haaran kerrallaan ja vie aikaa, jota riitelijä
   ei anna.
2. **Lukusäännöt** (K11, osin S4). «Fantasiatäyte 20.» «100 pistettä voittaa.»
   Luku on jo kortissa ja laatikossa; esittäminen toistaisi sen hitaammin.
3. **Sopimukset ja valinnat** (K12, K13, L7). «Sopikaa ennen peliä.» «Kumpi
   pelimuoto sopii nelivuotiaalle?» Näissä ei tapahdu mitään — niissä päätetään.
4. **Kohdat, joissa jokin muu väline on jo parempi** (L1, E1, S3). Pahvilaatikon
   taittaminen on videon työtä, ja videot ovat jo olemassa. Etusivu on valikko.
   Hinta on luku, joka halutaan nähdä heti.

Ja yksi huomio, joka ei mahdu taulukkoon: **korttipelisivulla on jo seitsemän
videota ja lautapelisivulla neljä.** «Näyttämistä» on siis jo paljon. Ero
oman demon hyväksi on mitattavissa: demo ei lataa mitään Googlelta, ei vaadi
kieltä eikä äänen kuuntelemista, alkaa heti eikä vie lukijaa pois sivulta.
Se ei kuitenkaan korvaa videoita — ja L1 on esimerkki kohdasta, jossa video
voittaa demon selvästi.

---

## 6. Rinnakkaisuus: mitkä työt voi antaa eri istunnoille

### 6.1 Mitä tiedostoja mikin kohta koskee

⚠️ **Tämä on kartoituksen tärkein taulukko, ja se näyttää ikävän asian:**
yhteinen kerros ei ole oma tiedostonsa vaan asuu `julkinen/tyyli.css`:ssä ja
`julkinen/sivu.js`:ssä (luku 1). Kaikki demot koskevat siis **samaa kahta
tiedostoa**, vaikka ne olisivat eri sivuilla.

| kohdat | `rakenna.py` | `julkinen/tyyli.css` | `julkinen/sivu.js` | `korttikuvat.py` | `sisalto/*.json` | `../pizzaparty` |
|---|---|---|---|---|---|---|
| K1, K3, K4, K6, K7, K9, K10 | `korttipeli()` | **kyllä** | **kyllä** | K1 kyllä | ei, jos ei uutta tekstiä | ei |
| K5 | `korttipeli()` | kyllä (pelkkä asettelu) | ei | kyllä | ei | ei |
| L2, L4, L5 | `lautapeli()` | **kyllä** | **kyllä** | ei | ei | **L4 kyllä**, jos pelin koodilla |
| L3 | `lautapeli()` | kyllä (pelkkä asettelu) | ei | ei | ei (kuvateksti voi vaatia 8 käännöstä) | ei |
| E2 | `etusivu()` | ei | **kyllä** | ei | ei | ei |
| S1 | `essen2026()` | **kyllä** | **kyllä** | ei | ei | ei |
| S2 | `essen2026()` | kyllä (pelkkä asettelu) | ei | ei | ei | ei |
| K2, L6, A1 | varattu | varattu | varattu | varattu | varattu | L6/A1 kyllä |

### 6.2 Säännöt, jotka pitävät istunnot erillään

1. **Liikekieli on yhteinen, ja se on tarkoitettu uudelleenkäytettäväksi.**
   Älä kirjoita omia `@keyframes`-sääntöjä demosi kohdalle: käytä
   `--liike-*`-muuttujia ja neljää perusliikettä, ja jos tarvitset uuden, lisää
   se **LIIKEKIELI-lohkoon nimettynä**. Kolme eri tapaa pudottaa kortti pöytään
   on vika, jota kukaan ei huomaa katsomatta kaikkia kolmea vierekkäin.
2. **Mutta juuri siksi `tyyli.css` ja `sivu.js` ovat sarjassa.** Kaksi istuntoa
   ei voi kirjoittaa niihin yhtä aikaa samassa työpuussa. Vaihtoehdot:
   joko **yksi istunto kerrallaan** näihin tiedostoihin, tai jokainen istunto
   **omassa worktreessa ja omalla haarallaan**, jolloin muutokset sulautetaan
   lopuksi. Ryhmä 3 (K5, L3, S2) on ainoa, joka ei tarvitse `sivu.js`:ää
   lainkaan.
3. **`rakenna.py`: koske vain oman sivusi funktioon.** Funktiot ovat erillään
   (`etusivu()` 492, `korttipeli()` 547, `lautapeli()` 643, `apinakortit()` 715,
   `essen2026()` 753), joten rinnakkainen työ on turvallista, kunhan kukin pysyy
   omassaan.
4. **`julkinen/play/**` on peilikopio — älä muokkaa.** Kuvia saa käyttää.
5. **Korttikuvat tulevat `julkinen/kuvat/kortti/`-kansiosta, ja ne tehdään
   työkalulla.** Jos demosi tarvitsee kortin jota siellä ei ole, laajenna
   `tyokalut/korttikuvat.py`:tä (lähde `julkinen/play/kuvat/`) äläkä kopioi
   tiedostoja käsin. Vanhat täysikokoiset kopiot `julkinen/kuvat/`-juuressa
   (pizza-31, pizza-54, tayte-2, tayte-3, tayte-10, tayte-x) ovat sivun muiden
   kuvien käytössä; demoihin otetaan `kortti/`-kansion 240 px:n versiot.
6. **Aja `python3 rakenna.py` ja katso `git status` ennen committia.** Jos
   `docs/`:ssa on muutoksia joita et tehnyt, ne ovat toisen istunnon työtä — älä
   committoi niitä. (Mitattu 16.11.2026: pelkkä uudelleenrakennus ilman yhtäkään
   koodimuutosta muutti 23 sivua; ks. jaettu muistiinpano
   `liput-kielivalikkoon-valmis.md`.)
7. **Marko pushaa itse.** Claude tekee commitit valmiiksi.

### 6.3 Neljä ryhmää

| ryhmä | kohdat | järjestys ryhmän sisällä | voi alkaa | rinnakkaisuus |
|---|---|---|---|---|
| **1 — keittiön jatko** | K3 → K4 | peräkkäin | heti K2:n jälkeen | **sama istunto kuin K2**: sama komponentti |
| **2 — korttipelisivun muut** | K1 · K6 → K7 → K9 → K10 | peräkkäin | kun keittiö on committoitu | oma istunto, **oma worktree** |
| **3 — kuvat ilman `sivu.js`:ää** | L3 · K5 · S2 | vapaa | **heti** | **aidosti rinnakkain** — ei kosketa `sivu.js`:ää |
| **4 — lautapelisivu** | L2 · L4 → L5 | L4 ennen L5 | kun L3 on tehty | oma istunto, oma worktree |
| **5 — Essen** | S1 | — | viimeisenä | matala prioriteetti |

**Ryhmä 3 voi alkaa heti ja olla yhtä aikaa kaiken muun kanssa.** Ryhmät 1, 2, 4
ja 5 koskevat `sivu.js`:ää ja `tyyli.css`:ää, joten ne tarvitsevat joko oman
worktreen tai vuoron.

### 6.4 Mikä on pakko tehdä peräkkäin

- **Kaikki 🟢 paitsi ryhmä 3 ↔ yhteinen kerros.** Kerros on valmis 16.11.2026,
  mutta sen tiedostot ovat jaettuja (6.2 / 2).
- **K3 ja K4 ↔ K2 (keittiö).** Sama komponentti ja sama arvon laskenta — nämä
  kuuluvat samalle istunnolle, joka keittiön teki.
- **K4 ↔ K3.** Sama kelpaako-tarkistus.
- **K10 ↔ K9.** Sama varastokomponentti.
- **L4 ja L5 ↔ L3.** Sanasto on ensin saatava paikalleen, tai lukija näkee
  liikettä jonka osia hän ei osaa nimetä.
- **L5 ↔ L4.** Sama lauta.
- **K7 ↔ K8.** K8 ei ole työ, mutta se saa pinon kasvun K7:stä — K7 siis ensin.
- **Kaikki `../pizzaparty`-muutokset ↔ apinakorttianimaatio.** Yksi istunto
  kerrallaan siinä repossa. Koskee L4:ää, jos se tehdään pelin koodilla.
- **`docs/`-rakennus.** Kuka tahansa joka ajaa `rakenna.py`:n, näkee kaikkien
  muutokset. Ks. sääntö 6.2 / 6.

---

## 7. Järjestys, jos työ tehdään yksi istunto kerrallaan

1. **K3 ja K4** — keittiön jatko samalla istunnolla, joka sen teki: «kaikki
   laskutoimitukset» loppuun ja Basso-apinan tapa kokeiltavaksi. Komponentti on
   jo pystyssä, joten tämä on halvin seuraava askel ja se vie korttipelin
   vaikeimman säännön maaliin.
2. **L3** — laudan kuva ja sanasto. Suurin yksittäinen puute koko sivustolla,
   ei riipu mistään, ja se avaa koko lautapelisivun.
3. **K1** — kortin anatomia. Pieni työ, selvä voitto, korvaa kaksi kuvaa eikä
   pidennä sivua.
4. **K6 ja K7** — pino ja alimmaiset kortit. Yksi komponentti, kaksi sääntöä.
5. **L4 ja L5** — nopan heitto ja tornien siirto. Lautapelin ydin.
6. **K9 ja K10** — Pizza Loven varasto. Suurin työ, suurin tekstisäästö (230 sanaa).
7. **L2, K5, S2, E2** — pienet, milloin vain.
8. **S1** — Topping Ten, viimeisenä.

---

## 8. Avoimet kysymykset

1. **Markolle: korvataanko tekstiä vai lisätäänkö demo sen viereen?** Reunaehto 5
   sanoo, ettei sivu saa pidentyä. Se toteutuu vain, jos demo **korvaa** jotain.
   Esimerkiksi K4 voisi lyhentää 64 sanan säännön kahteen virkkeeseen ja jättää
   loput demon näytettäväksi — mutta silloin sama sääntö luetaan PDF:stä ja
   sivulta eri sanoin. Se ei ole virhe (Markon linjaus 16.11.: digitaalinen ja
   fyysinen ovat kaksi maailmaa), mutta se on päätös jota ei pidä tehdä vahingossa.
2. **Markolle: tehdäänkö lautapelistä oma demo, vai viedäänkö lukija peliin?**
   Pelin «Opi pelaamaan» (Apinavaaka) esittelee jo pizzakortit, varaston,
   linjaston, nopan, vaa'an ja vuoron kulun kahdeksalla kielellä. L4 voidaan
   tehdä kahdella tavalla: oma pieni lauta sääntösivulle (L, itsenäinen) tai
   linkki pelin opastukseen (S–M, mutta vaatii muutoksen pizzapartyyn ja vie
   lukijan pois sääntösivulta).
3. **Rinnakkaisuuden hinta on päätettävä kerran.** Yhteinen kerros asuu
   `tyyli.css`:ssä ja `sivu.js`:ssä, mikä on oikein yhtenäisyyden kannalta mutta
   tekee niistä sarjallisen pullonkaulan. Joko demot tehdään yksi istunto
   kerrallaan (hitaampi, ei sulautuksia) tai jokainen istunto saa oman
   worktreen ja haaran (rinnakkainen, mutta `tyyli.css` sulautetaan käsin).
   Ryhmä 3 kulkee kummassakin tapauksessa rinnalla.

---

*Mitattu ja kirjoitettu 16.11.2026. Mittaustapa: `python3 -m http.server`
`docs/`-kansioon, selainpaneeli 375 × 812, `document.documentElement.scrollHeight`
ja `getBoundingClientRect()`. Sanamäärät HTML:stä tagit poistettuna, vain
`<main>`-lohkosta.*
