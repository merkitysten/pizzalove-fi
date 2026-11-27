/* Kauppalinkit ja kampanjarivi — yksi paikka kaikille sivuille.
 *
 * 🔵 Marko 27.11.2026: «Sinne onlinepelin puolelle tarvitaan myös
 * ristiinmarkkinointia Black Friday -tarjouksiin ja myös kauppaan. Eli kun osa
 * facebookin ryhmistä ei halua markkinointia, niin jotta voimme tarjota
 * ilmaisen pelin sinne, joka sitten vie kauppaan kumminkin.»
 *
 * Mitä tämä tekee jokaiselle `a.alku-kauppa`-linkille:
 *   1. osoite sivun kielellä (fi/sv/en; muut kielet → en) ja seurantatunniste
 *      (utm_source=pizzalove.fi, utm_campaign=play, utm_content=<data-kauppa>)
 *      — WooCommercen tilauksen «Alkuperä» kertoo, että ostaja tuli pelistä
 *   2. osoite lasketaan uudelleen klikkaushetkellä, koska pelin sisällä kielen
 *      voi vaihtaa ilman sivun latausta (peli.js: KIELI = …; kaannaSivu())
 *   3. kampanjan aikana ETUOVEN linkin perään pieni rivi (`.kauppa-bf`, data-t), joka
 *      katoaa itsestään kun KAMPANJA.loppuu on ohi — sitä ei tarvitse
 *      muistaa poistaa käsin
 *
 * Linkin `data-kauppa` = paikka ja tuote: "etuovi" (kaupan etusivu),
 * "korttipeli", "lautapeli" (tuotesivu).
 * ⚠️ Osoitteet ovat samat kuin pizzalove-fi/rakenna.py:n KAUPPA_KIELI ja
 * KAUPPA_ETUSIVU. Jos ne muuttuvat (esim. /tuote → /shop joulun jälkeen),
 * muuta molemmat. */

const KAUPPA_OSOITTEET = {
  fi: { etuovi: 'https://merkitysten.fi/shop/',
        korttipeli: 'https://merkitysten.fi/tuote/pizza-love-korttipeli/',
        lautapeli: 'https://merkitysten.fi/tuote/pizza-love-lautapeli/' },
  sv: { etuovi: 'https://merkitysten.fi/sv/butik/',
        korttipeli: 'https://merkitysten.fi/sv/tuote/pizza-love-familjeutgava-kortspel/',
        lautapeli: 'https://merkitysten.fi/sv/tuote/pizza-love-bradspel/' },
  en: { etuovi: 'https://merkitysten.fi/en/shop/',
        korttipeli: 'https://merkitysten.fi/en/tuote/pizza-love-card-game/',
        lautapeli: 'https://merkitysten.fi/en/tuote/pizza-love-board-game/' }
};

/* Black Friday 2026: kuponki BLACKFRIDAY30 vanhenee 30.11.2026 (WooCommerce:
 * voimassa su 29.11. loppuun). Seuraava kampanja = uusi loppuhetki ja teksti
 * kielet.js:n avaimeen 'kauppa.bf'. Tyhjä `loppuu` = ei kampanjaa. */
const KAUPPA_KAMPANJA = { loppuu: '2026-11-30T00:00:00+02:00' };

function kauppaKampanjaNyt() {
  const loppuu = Date.parse(KAUPPA_KAMPANJA.loppuu || '');
  return !isNaN(loppuu) && Date.now() < loppuu;
}

function kauppaOsoite(paikka) {
  const kieli = (typeof KIELI === 'string' && KAUPPA_OSOITTEET[KIELI]) ? KIELI : 'en';
  const tuote = KAUPPA_OSOITTEET[kieli][paikka] ? paikka : 'etuovi';
  return KAUPPA_OSOITTEET[kieli][tuote] +
    '?utm_source=pizzalove.fi&utm_medium=referral&utm_campaign=play&utm_content=' +
    encodeURIComponent(paikka + '-' + (typeof KIELI === 'string' ? KIELI : 'fi'));
}

function kauppaPiirra() {
  const kampanja = kauppaKampanjaNyt();
  [].forEach.call(document.querySelectorAll('a[data-kauppa]'), function (a) {
    const paikka = a.getAttribute('data-kauppa');
    a.href = kauppaOsoite(paikka);
    if (!a.dataset.kauppaKuuntelee) {
      a.dataset.kauppaKuuntelee = '1';
      a.addEventListener('click', function () { a.href = kauppaOsoite(paikka); });
    }
    /* ⚠️ Kampanjarivi vain `.alku-kauppa`-napeille. Valikon «Kauppaan» kantaa
     * data-t:n ITSESSÄÄN, ja kaannaSivu() kirjoittaa sen textContentin yli —
     * lapsielementti katoaisi ensimmäisessä kielen vaihdossa. */
    if (!a.classList.contains('alku-kauppa')) return;
    /* ⚠️ Ja vain etuovella. Pelien aloitusvalikot on mitattu pystyruudulle
     * tarkasti (yhteinen.css: .alku-kauppa min-height 42/36 px matalilla
     * näytöillä), ja kampanjarivi rivittyy kapealla ruudulla toiseksi riviksi
     * (+19 px, mitattu 320 px:llä 27.11.2026). Etuovi on se osoite, jota
     * jaetaan (pizzalove.fi/play), ja siellä tilaa on. */
    const nayta = kampanja && paikka === 'etuovi';
    /* Etuovella ei ajeta kaannaSivu()-funktiota, joten teksti asetetaan tässä. */
    [].forEach.call(a.querySelectorAll('[data-t]'), function (n) { n.textContent = t(n.dataset.t); });
    let bf = a.querySelector('.kauppa-bf');
    if (nayta && !bf) {
      bf = document.createElement('small');
      bf.className = 'kauppa-bf';
      bf.setAttribute('data-t', 'kauppa.bf');
      a.appendChild(bf);
    }
    if (bf) {
      if (nayta) bf.textContent = t('kauppa.bf');
      else bf.remove();
    }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kauppaPiirra);
else kauppaPiirra();
