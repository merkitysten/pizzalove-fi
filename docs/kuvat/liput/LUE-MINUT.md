# Kielten liput (koteloarkki)

Lähde: flag-icons 7.2.3 (MIT, © Panayiotis Lipiridis), `flags/1x1/`. Lisenssi: LICENSE-flag-icons.txt.
Tiedostonimi on KIELEN koodi, ei maan: fi=Suomi, sv=Ruotsi, en=Iso-Britannia, de=Saksa, nl=Alankomaat,
fr=Ranska, es=Espanja, sk=Slovakia, pl=Puola, cs=Tšekki, da=Tanska, nb=Norja, is=Islanti, it=Italia,
pt=Portugali, ro=Romania, hu=Unkari, et=Viro, lv=Latvia, lt=Liettua, sl=Slovenia, hr=Kroatia, tr=Turkki.

Muutos: valkoinen (#fff) on sävytetty vaaleanharmaaksi #f1f0f0, jotta valkoreunainen lippu
(Suomi, Puola) erottuu valkoiselta paperilta. Sama ratkaisu on ohjeiden Adobe-lipuissa.
Päätös: Marko 16.11.2026 (lippu koteloarkin otsakeruudun oikeaan alakulmaan, lajittelun avuksi).
Adobe Stock -lippuja ei käytetä julkisessa repossa (lisenssi ei salli jakoa erillisinä tiedostoina).

## ⚠️ Lippu on kielen lippu, ei murteen — älä tee poikkeuksia

**Marko 16.11.2026:** «Ruotsi on ruotsi, vaikka se olisi suomenruotsi. Joku antaa siitä
sitten palautteen, jos se häiritsee. Muuten olemme kaikkien eri kielimurteiden kanssa
helisemässä.» Kysymys nousi mitatusta ristiriidasta: sivuston ruotsi on suomenruotsi
(`rakenna.py` `LOKAALIT['sv'] = 'sv_FI'`, ja sv-sivun `og:locale` on `sv_FI`), mutta
lippu on Ruotsin (`sv.svg` = flag-icons `se`).

**Päätös: lippu on kielen tavallisimman maan lippu, eikä kohdeyleisön maan.**
Tämä ei ole poikkeus vaan sääntö, ja `kaanna.py`:n `lippu()` toteuttaa jo sen.
Siksi myös en = Iso-Britannia (ei Yhdysvallat), es = Espanja (vaikka espanjan
puhujista enemmistö on Amerikoissa), de = Saksa, nl = Alankomaat, fr = Ranska.

⚠️ **Älä «korjaa» yksittäistä kieltä, vaikka se näyttäisi väärältä.** Jokainen
poikkeus avaa saman kysymyksen kaikille muille kielille, eikä sille löydy loppua.
Jos palautetta tulee, Marko päättää — ei agentti.

Uudet konekäännöskielet saavat lipun automaattisesti (`tyokalut/kaanna.py`, funktio `lippu`):
kielen tavallisimman maan lippu (langcodes: kielikoodista maa, esim. ja → JP, zh-Hans → CN).
Lippua ei tehdä, jos maa ei ole yksiselitteinen (es-419) tai valinta olisi poliittinen
(perinteinen kiina, zh-Hant). Silloin arkissa on pelkkä kielikoodi kehyksessä.
