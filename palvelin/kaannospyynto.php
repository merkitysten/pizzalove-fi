<?php
/* Pizza Love: puuttuvan kielen pyyntö → GitHubin konekäännösajo.
 *
 * 🔵 Marko 16.11.2026: «Puuttuva kieli = toimeksianto, ei tilasto. … Yksi nappi,
 * ei sähköpostikenttää. … Mitään ei talleteta: ei tietokantaa, ei lokia, ei IP:tä,
 * ei evästettä. Yksi pieni skripti Domainhotellin palvelimelle riittää.»
 * + «tämän kaiken pitää tapahtua automaattisesti ilman minulta vaadittavia toimintoja».
 *
 * Mitä tekee: pizzalove.fi:n sivu (julkinen/sivu.js) lähettää POST {"kieli": "ja"}.
 *  1. Tarkistaa kielikoodin muodon ja että pyyntö tulee pizzalove.fi:stä.
 *  2. Jos sivu pizzalove.fi/<kieli>/card-game.html on jo olemassa → «valmis».
 *  3. Muuten käynnistää GitHub Actions -ajon «Konekäännös» (workflow_dispatch),
 *     joka tekee käännöksen, kielen sivun ja arkin ja julkaisee ne.
 *     (Kielen hyväksyntä, puhujamäärä ja päiväkatto tarkistetaan ajossa: kaanna.py.)
 *  4. Lähettää lyhyen ilmoituksen (kielikoodi), jos asetuksissa on osoite.
 * Ei tallenna mitään. (Huom: palvelimen oma pääsyloki on webhotellin asia.)
 *
 * Asetukset: <kotikansio>/pizzalove-kaannos/config.php (EI sivuston kansioon, koska
 * nginx tarjoilee sivuston kansiosta tiedostoja ohi .htaccessin). Ks. LUE-MINUT.md.
 * ⚠️ Palvelin on PHP 7.3: ei nuolifunktioita, ei tyypitettyjä ominaisuuksia.
 */

$SALLITUT = array('https://pizzalove.fi', 'https://www.pizzalove.fi');
$alkupera = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if (in_array($alkupera, $SALLITUT, true)) {
    header('Access-Control-Allow-Origin: ' . $alkupera);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function vastaa($koodi, $data) {
    http_response_code($koodi);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function asetukset() {
    $polku = dirname($_SERVER['DOCUMENT_ROOT']) . '/pizzalove-kaannos/config.php';
    if (!is_readable($polku)) return null;
    $cfg = require $polku;
    return empty($cfg['github_token']) ? null : $cfg;
}

/* Mitkä kielet ovat juuri nyt työn alla?
 * 🔵 Marko 16.11.2026: «jotta painaja ja myös muut tietävät, että tämä kieli
 * on jo työnalla.»
 * ⚠️ Tätä EI talleteta tänne: tieto on GitHubin ajoissa valmiina, ja
 * alkuperäinen päätös «ei tietokantaa, ei lokia, ei evästettä» pitää. Kieli
 * luetaan ajon nimestä «Konekäännös <kieli>» (run-name konekaannos.yml:ssä).
 */
function tyon_alla($token) {
    $kielet = array();
    $ch = curl_init('https://api.github.com/repos/merkitysten/pizzalove-fi'
                    . '/actions/workflows/konekaannos.yml/runs?per_page=20');
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8,
        CURLOPT_HTTPHEADER => array(
            'Accept: application/vnd.github+json',
            'Authorization: Bearer ' . $token,
            'X-GitHub-Api-Version: 2022-11-28',
            'User-Agent: pizzalove-kaannospyynto')));
    $vastaus = curl_exec($ch);
    $tila = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($tila !== 200) return $kielet;
    $data = json_decode($vastaus, true);
    if (!is_array($data) || !isset($data['workflow_runs'])) return $kielet;
    $kesken = array('queued', 'in_progress', 'waiting', 'requested', 'pending');
    foreach ($data['workflow_runs'] as $ajo) {
        if (!isset($ajo['status']) || !in_array($ajo['status'], $kesken, true)) continue;
        $osat = explode(' ', trim(isset($ajo['display_title']) ? $ajo['display_title'] : ''));
        $k = strtolower(end($osat));
        // Vanhat ajot ovat nimeltään pelkkä «Konekäännös»: ne eivät läpäise tätä.
        if (preg_match('/^[a-z]{2,3}(-[a-z0-9]{2,8}){0,2}$/', $k)) $kielet[] = $k;
    }
    return array_values(array_unique($kielet));
}

function sivu_olemassa($url) {
    $ch = curl_init($url);
    curl_setopt_array($ch, array(CURLOPT_NOBODY => true, CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 8,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (Merkitysten kaannospyynto)'));
    curl_exec($ch);
    $tila = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return $tila === 200;
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if (!in_array($alkupera, $SALLITUT, true)) vastaa(403, array('virhe' => 'alkuperä'));

/* GET = lista työn alla olevista kielistä (sivu merkitsee ne «Tekeillä»).
 * Lyhyt välimuisti, jottei jokainen valitsimen avaus kysy GitHubilta. */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $cfg = asetukset();
    header('Cache-Control: public, max-age=30');
    vastaa(200, array('tekeilla' => $cfg ? tyon_alla($cfg['github_token']) : array()));
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') vastaa(405, array('virhe' => 'vain POST tai GET'));

$syote = json_decode(file_get_contents('php://input'), true);
$kieli = (is_array($syote) && isset($syote['kieli'])) ? strtolower(trim((string)$syote['kieli'])) : '';
if (!preg_match('/^[a-z]{2,3}(-[a-z0-9]{2,8}){0,2}$/', $kieli)) vastaa(400, array('virhe' => 'kielikoodi'));

$IHMISEN = array('fi', 'sv', 'en', 'de', 'nl', 'fr', 'es', 'sk');
if (in_array($kieli, $IHMISEN, true)) vastaa(200, array('tila' => 'valmis', 'sivu' => 'https://pizzalove.fi/' . $kieli . '/'));

$sivu = 'https://pizzalove.fi/' . $kieli . '/card-game.html';
if (sivu_olemassa($sivu)) vastaa(200, array('tila' => 'valmis', 'sivu' => $sivu));

$cfg = asetukset();
if (!$cfg) vastaa(500, array('virhe' => 'asetukset puuttuvat'));

/* Jo työn alla: ei käynnistetä toista ajoa samalle kielelle. */
if (in_array($kieli, tyon_alla($cfg['github_token']), true)) {
    vastaa(200, array('tila' => 'tekeillä', 'sivu' => $sivu));
}

$ch = curl_init('https://api.github.com/repos/merkitysten/pizzalove-fi/actions/workflows/konekaannos.yml/dispatches');
curl_setopt_array($ch, array(
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_HTTPHEADER => array(
        'Accept: application/vnd.github+json',
        'Authorization: Bearer ' . $cfg['github_token'],
        'X-GitHub-Api-Version: 2022-11-28',
        'User-Agent: pizzalove-kaannospyynto',
        'Content-Type: application/json'),
    CURLOPT_POSTFIELDS => json_encode(array('ref' => 'main', 'inputs' => array('kieli' => $kieli)))));
curl_exec($ch);
$tila = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
if ($tila !== 204) vastaa(502, array('virhe' => 'käännöksen käynnistys epäonnistui (' . $tila . ')'));

if (!empty($cfg['ilmoitus'])) {
    @mail($cfg['ilmoitus'], 'Pizza Love: kielipyyntö ' . $kieli,
        "Sivustolla pyydettiin korttipelin sääntöjä kielellä «" . $kieli . "».\n" .
        "Konekäännös, sivu ja arkki tehdään automaattisesti (yleensä noin 3 min):\n" .
        "https://github.com/merkitysten/pizzalove-fi/actions\n" .
        "Valmis sivu: " . $sivu . "\n",
        'Content-Type: text/plain; charset=utf-8');
}
vastaa(200, array('tila' => 'aloitettu', 'sivu' => $sivu));
