# Kielipyynnön palvelinskripti (Domainhotelli)

pizzalove.fi on GitHub Pages (ei PHP:tä). Puuttuvan kielen «Yes, please» -nappi
(`julkinen/sivu.js`) lähettää pyynnön tähän skriptiin, joka käynnistää GitHubin
konekäännösajon. Skripti ei tallenna mitään. Päätökset: `../Verkkosivut/PAATOSLOKI.md` 16.11.2026.

## Asennus (kerran)

| Tiedosto | Paikka palvelimella | Huom. |
|---|---|---|
| `kaannospyynto.php` | `<kotikansio>/varainhankinta.merkitysten.fi/kaannos/pyynto.php` | osoite `https://varainhankinta.merkitysten.fi/kaannos/pyynto.php` (rakenna.py: `PYYNTO_OSOITE`) |
| `config.esimerkki.php` → `config.php` | `<kotikansio>/pizzalove-kaannos/config.php` | EI sivuston kansioon. Sisältää GitHub-tunnisteen. |

Oikeudet: tiedostot 644, kansiot 755.

## Toiminta

1. Kielikoodin muoto ja alkuperä (vain pizzalove.fi).
2. Jos `pizzalove.fi/<koodi>/card-game.html` on jo olemassa → `{"tila":"valmis"}`.
3. Muuten `workflow_dispatch` → `.github/workflows/konekaannos.yml` → `{"tila":"aloitettu"}`.
4. Ilmoitus sähköpostiin, jos `config.php`:ssä on osoite.

Kielen hyväksyntä (oikealta vasemmalle kirjoitettavat torjutaan, vähintään 50 000
puhujaa) ja päiväkatto (10 uutta käännöstä / 24 h) tarkistetaan ajossa (`tyokalut/kaanna.py`).
