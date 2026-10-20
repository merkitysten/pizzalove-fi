# jsQR — ulkopuolinen kirjasto (ei meidän koodiamme)

**Mitä:** QR-koodin purku kuvapikseleistä. `jsQR(data, width, height)` → teksti.
**Versio:** 1.4.0 · **Lisenssi:** Apache License 2.0 (`LICENSE` tässä kansiossa)
**Lähde:** https://github.com/cozmo/jsQR · haettu unpkg.com:ista 20.10.2026
**Koko:** 256 885 tavua (251 kt), 10 101 riviä, gzip 56 kt. Paketissa EI ole
pienennettyä versiota — tämä on ainoa `dist`-tiedosto.

## Miksi tämä on repossa eikä CDN:ssä

⚠️ **CDN-linkki olisi tietovuoto.** Silloin pelaajan IP-osoite ja selain menisivät
kolmannelle osapuolelle jokaisella sivulatauksella — myös kun kukaan ei skannaa.
Se rikkoisi `huone.php`:n lupauksen («EI KERÄÄ MITÄÄN — ei evästeitä, ei lokia»,
Markon päätös MULTIPLAYER.md 8.11) äänettömästi. Omasta palvelimesta tarjoiltuna
se ei kosketa sitä lainkaan.

## Miksi B eikä oma purku (Marko 20.10.2026)

📐 Mitattu Markon iPhonella (iOS 18.7 / Safari 26.6.1): `BarcodeDetector` **EI**,
`getUserMedia` KYLLÄ, `input capture` KYLLÄ. Selaimen oma lukija ei siis ole
vaihtoehto iPhonella, eikä se ole vanhan laitteen ongelma vaan Applen valinta.
Oman purun puuttuva osa on **kuva → matriisi** (kynnystys, paikannuskuviot,
perspektiivi), ja meidän tapauksessamme luetaan TOISEN PUHELIMEN NÄYTÖLTÄ —
heijastus ja moiré. Sen laatu olisi mitattavissa vain Markon testikierroksilla.

## Mitä tarkastus löysi (20.10.2026)

Haettu omaan hakemistoonsa ja mitattu ennen kopiointia:

| etsitty | osumia |
|---|---|
| `fetch` · `XMLHttpRequest` · `WebSocket` · `sendBeacon` · `import(` · `EventSource` | **0** |
| `localStorage` · `sessionStorage` · `indexedDB` · `document.cookie` · `caches` | **0** |
| `eval(` · `new Function` · `innerHTML` | **0** |
| `document.` · `window.` · `navigator.` | **0** |
| `window.location` · `location.href` | **0** |

`location` esiintyy 21 kertaa, mutta se on paikallinen muuttuja (QR-koodin
sijainti kuvassa, `locator_1.locate`), ei selaimen osoite.

Julkinen rajapinta on **yksi puhdas funktio**: `jsQR(data, width, height, opts)`
ottaa raakapikselit ja palauttaa tekstin. Ei verkkoa, ei tallennusta, ei DOMia.

## Säännöt tälle kansiolle

- ⛔ **Älä muokkaa `jsQR.js`:ää.** Apache-2.0 sallii muokkauksen, mutta silloin
  muutos on merkittävä — ja muokattua kopiota ei voi enää verrata ylävirtaan.
  Jos jotain tarvitsee säätää, tee se kutsuvassa koodissa (`qrluku.js`).
- ⛔ Älä vaihda CDN-linkkiin. Ks. yllä.
- ⚠️ `LICENSE` on pidettävä mukana (Apache-2.0 ehto).
- Ladataan VASTA kun pelaaja painaa «Skannaa koodi» (`qrluku.js`), joten se ei
  maksa mitään niille jotka eivät skannaa.
