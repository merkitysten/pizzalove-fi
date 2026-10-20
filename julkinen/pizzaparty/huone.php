<?php
/* ============================================================
 * PIZZA PARTY — YHTEISPELIN HUONE (Kahoot-malli)
 *
 * ⚠️ POSTILAATIKKO, EI PELIN TUOMARI. Tämä tiedosto ei tunne Pizza Loven
 * sääntöjä: isännän laite jakaa ratkeavan kierroksen ja tarkistaa
 * vastaukset (kierros.js). Palvelin säilöö, välittää ja LEIMAA
 * SAAPUMISAJAN. Ks. MULTIPLAYER.md 8.4.
 *
 * ⚠️ AIKA ON PALVELIMEN. Lähtöhetki T0 ja vastauksen saapuminen luetaan
 * tämän koneen kellosta, koska pelaajan laitteen kellon voi väärentää
 * (8.3). Kellonaika luetaan ensimmäisenä, ennen levyä: muuten jokainen
 * kirjoittava pyyntö näyttäisi itsensä myöhemmäksi kuin se oli.
 *
 * ⚠️ EI KERÄÄ MITÄÄN (kampanjan sääntö, MULTIPLAYER.md 6 ja 8.11).
 * Nimimerkki elää vain huonetiedostossa väliaikaishakemistossa — ei
 * sivuston kansiossa. Tiedosto vanhenee kolmessa tunnissa ja poistuu
 * vartin kuluttua pelin päättymisestä. Avaimista tallennetaan vain
 * tiiviste. Ei evästeitä, ei lokia.
 *
 * ⚠️ PHP 7.3 (mitattu palvelimelta). Ei nuolifunktioita, ei ??=, ei
 * str_contains, ei tyypitettyjä ominaisuuksia: yksikin kaataa koko
 * tiedoston jäsennyksen ja jokaisen käynnissä olevan pelin.
 *
 * ⚠️ JOKAINEN KIRJOITUS LUKON ALLA. Luokallinen pelaajia vastaa samaan
 * aikaan, ja lue–muokkaa–kirjoita ilman lukkoa hävittää vastauksia.
 * Norsun tools/lukko-testi.py mittasi saman kuvion: 2 jäsentä 3:sta
 * katosi aidossa kilpailutilanteessa.
 * ============================================================ */

$NYT = (int) round(microtime(true) * 1000);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');

/* CORS (6.10.2026): peli toimii myös osoitteessa pizzalove.fi (GitHub Pages),
 * joka kutsuu tätä tiedostoa toisesta osoitteesta. Selain sallii sen vain jos
 * tämä palvelin kertoo hyväksyvänsä kutsujan.
 * - Ei evästeitä eikä kirjautumista, joten salliminen ei avaa mitään uutta.
 * - *.github.io on testausta varten ennen kuin pizzalove.fi osoittaa sinne.
 * ⚠️ PHP 7.3: ei nuolifunktioita tms. */
$alkupera = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if ($alkupera === 'https://pizzalove.fi' || $alkupera === 'https://www.pizzalove.fi'
    || preg_match('#^https://[a-z0-9-]+\.github\.io$#', $alkupera)) {
    header('Access-Control-Allow-Origin: ' . $alkupera);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 86400');
}
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

define('LAHTOLASKENTA_MS', 3000);
/* Vastaus hyväksytään vielä tämän verran kierroksen päättymisen jälkeen:
 * juuri ennen loppua lähetetty vastaus on matkalla. Isäntä lukee tämän
 * palvelimelta (kierros.armoMs) eikä pidä omaa lukuaan. */
define('ARMO_MS', 500);
/* Pelaaja saa kortit vasta hetkeä ennen T0:aa. Laite tarvitsee ne
 * etukäteen paljastaakseen täsmälleen T0:ssa (8.2), mutta kolmen sekunnin
 * ennakko olisi kolmen sekunnin etumatka verkkoliikennettä lukevalle. */
define('KORTIT_ENNAKKO_MS', 1500);
define('PELAAJIA_ENINTAAN', 40);
define('HUONE_VANHENEE_MS', 3 * 3600 * 1000);
define('LOPPU_POISTUU_MS', 15 * 60 * 1000);
define('RUNKO_ENINTAAN', 8000);
define('NIMI_ENINTAAN', 16);
/* Sama luku kuin kierros.js:n KIERROS_KORTTEJA. Palvelin tarkistaa vain
 * muodon; säännöt tarkistaa isäntä. */
define('KORTTEJA_KIERROKSESSA', 5);

function ulos($data, $http) {
    global $NYT;
    if ($http !== 200) http_response_code($http);
    $data['t'] = $NYT;
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/* ⚠️ Virhe on KOODI + suomenkielinen varateksti. Selain näyttää
 * kielikerroksen tekstin koodin perusteella (kielet.js, `huone.<koodi>`),
 * jotta virheet kääntyvät muiden tekstien mukana. */
function hylkaa($koodi, $viesti, $http) {
    ulos(array('ok' => false, 'virhe' => $koodi, 'viesti' => $viesti), $http);
}

function onnistui($data) {
    $data['ok'] = true;
    ulos($data, 200);
}

function virhe($koodi, $viesti, $http) {
    return array('virhe' => array($koodi, $viesti, $http));
}

function huonePolku($koodi) {
    return sys_get_temp_dir() . '/pp-huone-' . $koodi . '.json';
}

function kelpaaKoodi($k) {
    return is_string($k) && preg_match('/^[0-9]{4}$/', $k) === 1;
}

function vanhentunut($huone) {
    global $NYT;
    if (!isset($huone['muokattu']) || $NYT - $huone['muokattu'] > HUONE_VANHENEE_MS) return true;
    if ($huone['vaihe'] === 'loppu' && $huone['loppui'] !== null && $NYT - $huone['loppui'] > LOPPU_POISTUU_MS) return true;
    return false;
}

function siivoaVanhat() {
    $tiedostot = glob(sys_get_temp_dir() . '/pp-huone-*.json');
    if (!is_array($tiedostot)) return;
    $raja = time() - (int) (HUONE_VANHENEE_MS / 1000);
    foreach ($tiedostot as $polku) {
        $mtime = @filemtime($polku);
        if ($mtime !== false && $mtime < $raja) @unlink($polku);
    }
}

/* Avaa huoneen lukittuna ja antaa sen $muutos-funktiolle. Funktio
 * palauttaa taulukon:
 *   'huone'  => muokattu huone, kirjoitetaan takaisin
 *   'vastaus'=> mitä selaimelle palautetaan
 *   'virhe'  => array(koodi, viesti, http) — hylätään, mitään ei kirjoiteta
 *   'poista' => true — tiedosto poistetaan
 * ⚠️ Lukko vapautetaan KAIKISSA haaroissa ennen hylkäystä: hylkaa()
 * lopettaa suorituksen, ja kiinni jäänyt lukko jäädyttäisi pelin. */
function kasitteleHuonetta($koodi, $muutos) {
    global $NYT;
    if (!kelpaaKoodi($koodi)) hylkaa('eiHuonetta', 'Peliä ei löydy. Tarkista koodi.', 404);
    $polku = huonePolku($koodi);
    if (!file_exists($polku)) hylkaa('eiHuonetta', 'Peliä ei löydy. Tarkista koodi.', 404);
    /* r+ eikä c+: jos tiedosto katosi välissä, EI luoda tyhjää tilalle. */
    $f = @fopen($polku, 'r+');
    if ($f === false) hylkaa('eiHuonetta', 'Peliä ei löydy. Tarkista koodi.', 404);
    if (!flock($f, LOCK_EX)) {
        fclose($f);
        hylkaa('tallennus', 'Pelin tilaa ei voitu lukita.', 500);
    }
    $huone = json_decode(stream_get_contents($f), true);
    if (!is_array($huone) || vanhentunut($huone)) {
        flock($f, LOCK_UN);
        fclose($f);
        @unlink($polku);
        hylkaa('eiHuonetta', 'Peliä ei löydy. Tarkista koodi.', 404);
    }
    $tulos = $muutos($huone);
    if (isset($tulos['virhe'])) {
        flock($f, LOCK_UN);
        fclose($f);
        hylkaa($tulos['virhe'][0], $tulos['virhe'][1], $tulos['virhe'][2]);
    }
    if (isset($tulos['huone'])) {
        $tulos['huone']['muokattu'] = $NYT;
        $json = json_encode($tulos['huone'], JSON_UNESCAPED_UNICODE);
        $ok = $json !== false && ftruncate($f, 0) && rewind($f) && fwrite($f, $json) === strlen($json);
        fflush($f);
        if (!$ok) {
            flock($f, LOCK_UN);
            fclose($f);
            hylkaa('tallennus', 'Pelin tilaa ei voitu tallentaa.', 500);
        }
    }
    flock($f, LOCK_UN);
    fclose($f);
    if (!empty($tulos['poista'])) @unlink($polku);
    return $tulos;
}

/* Kuka kysyy: isäntä, pelaaja (indeksi) vai ei kukaan. Avain on 24 heksaa. */
function rooli($huone, $avain) {
    if (!is_string($avain) || strlen($avain) !== 24) return array(null, null);
    $h = hash('sha256', $avain);
    if (hash_equals($huone['isantaTiiviste'], $h)) return array('isanta', null);
    foreach ($huone['pelaajat'] as $i => $p) {
        if (hash_equals($p['tiiviste'], $h)) return array('pelaaja', $i);
    }
    return array(null, null);
}

/* ⚠️ NIMI TARKISTETAAN LIITTYESSÄ, EI VASTATESSA (kellokokeen oppi,
 * MULTIPLAYER.md 8.14). Koesivu hylkäsi ä-kirjaimen vasta tulosta
 * lähettäessä eikä kertonut siitä. Tässä ä, ö ja välilyönnit kelpaavat:
 * lasten nimissä niitä on. */
function siistiNimi($nimi) {
    if (!is_string($nimi)) return null;
    $s = preg_replace('/\s+/u', ' ', $nimi);
    if ($s === null) return null;                       /* ei kelvollista UTF-8:aa */
    $s = trim($s);
    if (preg_match('/^[\p{L}\p{N}][\p{L}\p{N} ._\-]*$/u', $s) !== 1) return null;
    $pituus = preg_match_all('/./us', $s);
    if ($pituus < 1 || $pituus > NIMI_ENINTAAN) return null;
    return $s;
}

function vertailuNimi($s) {
    return function_exists('mb_strtolower') ? mb_strtolower($s, 'UTF-8') : strtolower($s);
}

function rajaa($x, $alin, $ylin, $oletus) {
    if (!is_int($x)) return $oletus;
    return max($alin, min($ylin, $x));
}

function totuus($x, $oletus) {
    return is_bool($x) ? $x : $oletus;
}

/* ⚠️ Oletukset tässä ovat VARA-arvoja rikkinäiselle syötteelle. Oikea
 * lähde on isännän asetuslomake (isanta.js). Palvelin rajaa, jotta
 * huoneeseen ei tallennu mahdotonta peliä. */
function siistiAsetukset($a) {
    $s = (isset($a['sallitut']) && is_array($a['sallitut'])) ? $a['sallitut'] : array();
    return array(
        'kierroksia'   => rajaa($a['kierroksia'] ?? null, 1, 30, 10),
        'aikaMs'       => rajaa($a['aikaMs'] ?? null, 5000, 60000, 15000),
        'odotaKaikkia' => totuus($a['odotaKaikkia'] ?? null, false),
        'vaikea'       => totuus($a['vaikea'] ?? null, false),
        'sallitut'     => array(
            'kerto'    => totuus($s['kerto'] ?? null, true),
            'jako'     => totuus($s['jako'] ?? null, true),
            'potenssi' => totuus($s['potenssi'] ?? null, false),
            'log'      => totuus($s['log'] ?? null, false),
            'sulut'    => totuus($s['sulut'] ?? null, true),
        ),
    );
}

/* Kuvapolut valkolistalla: ne päätyvät pelaajien laitteille img-lähteiksi. */
function siistiPizza($p) {
    if (!is_array($p)) return null;
    $arvo = $p['arvo'] ?? null;
    $maara = $p['tayteMaara'] ?? null;
    $kuva = $p['kuva'] ?? null;
    $sydan = $p['sydan'] ?? null;
    if (!is_int($arvo) || $arvo < 1 || $arvo > 10) return null;
    if (!is_int($maara) || $maara < 1 || $maara > 4) return null;
    if (!is_string($kuva) || preg_match('#^kuvat/pizza-[0-9]{2}\.webp$#', $kuva) !== 1) return null;
    if (!is_bool($sydan)) return null;
    return array('arvo' => $arvo, 'tayteMaara' => $maara, 'kuva' => $kuva, 'sydan' => $sydan);
}

function siistiKortit($lista) {
    if (!is_array($lista) || count($lista) !== KORTTEJA_KIERROKSESSA) return null;
    $ulos = array();
    foreach ($lista as $k) {
        if (!is_array($k)) return null;
        $fantasia = $k['fantasia'] ?? null;
        $arvo = $k['arvo'] ?? null;
        $kuva = $k['kuva'] ?? null;
        if (!is_bool($fantasia)) return null;
        if ($fantasia) {
            if ($arvo !== null) return null;
        } elseif (!is_int($arvo) || $arvo < 1 || $arvo > 10) {
            return null;
        }
        if (!is_string($kuva) || preg_match('#^kuvat/tayte-([0-9]{1,2}|x)\.webp$#', $kuva) !== 1) return null;
        $ulos[] = array('arvo' => $arvo, 'fantasia' => $fantasia, 'kuva' => $kuva);
    }
    return $ulos;
}

/* Vastaus: null = ohitus, false = kelpaamaton muoto. Talteen vain tunnetut
 * kentät, jotta huoneeseen ei tallennu mielivaltaista dataa. Merkkien
 * LUPIA ei tarkisteta tässä — se on isännän asia (kierros.js). */
function siistiVastaus($v) {
    if ($v === null) return null;
    if (!is_array($v)) return false;
    $kortit = $v['kortit'] ?? null;
    $merkit = $v['merkit'] ?? null;
    $ryhmat = $v['ryhmat'] ?? array();
    if (!is_array($kortit) || !is_array($merkit) || !is_array($ryhmat)) return false;
    if (count($kortit) < 1 || count($kortit) > KORTTEJA_KIERROKSESSA) return false;
    if (count($merkit) > KORTTEJA_KIERROKSESSA - 1 || count($ryhmat) > KORTTEJA_KIERROKSESSA) return false;
    $tunnetut = array('+', '−', '×', '÷', '^', 'log');
    $ok = array('kortit' => array(), 'merkit' => array(), 'ryhmat' => array());
    foreach ($kortit as $k) {
        if (!is_array($k) || !is_int($k['i'] ?? null) || !is_int($k['arvo'] ?? null)) return false;
        $ok['kortit'][] = array('i' => $k['i'], 'arvo' => $k['arvo']);
    }
    foreach ($merkit as $m) {
        if (!is_string($m) || !in_array($m, $tunnetut, true)) return false;
        $ok['merkit'][] = $m;
    }
    foreach ($ryhmat as $g) {
        if (!is_array($g) || !is_int($g['alku'] ?? null) || !is_int($g['loppu'] ?? null)) return false;
        $ok['ryhmat'][] = array('alku' => $g['alku'], 'loppu' => $g['loppu']);
    }
    return $ok;
}

/* ⚠️ MITÄ KUKIN SAA NÄHDÄ. Pelaaja ei näe muiden vastauksia eikä
 * esimerkkiratkaisua, eikä kortteja ennen ennakkoikkunaa. Isäntä näkee
 * kaiken, koska se tarkistaa. */
function julkinenTila($huone, $rooli, $indeksi) {
    global $NYT;
    $pelaajat = array();
    foreach ($huone['pelaajat'] as $p) {
        $pelaajat[] = array('id' => $p['id'], 'nimi' => $p['nimi'], 'pisteet' => $p['pisteet'],
            'vari' => $p['vari'] ?? null);
    }
    $kierros = null;
    if ($huone['kierros'] !== null) {
        $k = $huone['kierros'];
        $kierros = array('n' => $k['n'], 't0' => $k['t0'], 'loppuu' => $k['loppuu'], 'armoMs' => ARMO_MS,
            'harjoitus' => !empty($k['harjoitus']));
        if ($rooli === 'isanta' || $NYT >= $k['t0'] - KORTIT_ENNAKKO_MS) {
            $kierros['pizza'] = $k['pizza'];
            $kierros['kortit'] = $k['kortit'];
        }
        if ($rooli === 'isanta') $kierros['esimerkki'] = $k['esimerkki'];
    }
    $tila = array(
        'vaihe'      => $huone['vaihe'],
        'koodi'      => $huone['koodi'],
        'asetukset'  => $huone['asetukset'],
        'pelaajat'   => $pelaajat,
        'kierros'    => $kierros,
        'vastanneet' => array_keys($huone['vastaukset']),
        'tulos'      => $huone['tulos'],
    );
    if ($rooli === 'isanta') {
        $tila['vastaukset'] = (object) $huone['vastaukset'];
    }
    if ($rooli === 'pelaaja') {
        $p = $huone['pelaajat'][$indeksi];
        $tila['oma'] = array(
            'id' => $p['id'], 'nimi' => $p['nimi'], 'pisteet' => $p['pisteet'],
            'vari' => $p['vari'] ?? null,
            'vastattu' => isset($huone['vastaukset'][$p['id']]),
        );
    }
    return $tila;
}

/* Isännän toiminto: tarkistaa roolin ja liittää vastaukseen tuoreen tilan. */
function isannanToiminto($pyynto, $muutos) {
    $avain = $pyynto['avain'] ?? null;
    return kasitteleHuonetta($pyynto['koodi'] ?? null, function ($huone) use ($avain, $muutos) {
        $r = rooli($huone, $avain);
        if ($r[0] !== 'isanta') return virhe('eiOikeutta', 'Ei oikeutta.', 403);
        $tulos = $muutos($huone);
        if (isset($tulos['huone'])) {
            $tulos['vastaus'] = array('tila' => julkinenTila($tulos['huone'], 'isanta', null))
                + (isset($tulos['vastaus']) ? $tulos['vastaus'] : array());
        }
        return $tulos;
    });
}

/* ---------------- pyyntö ---------------- */

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    hylkaa('vainPost', 'Vain POST.', 405);
}
$raaka = file_get_contents('php://input');
if ($raaka === false || strlen($raaka) > RUNKO_ENINTAAN) {
    hylkaa('liianIso', 'Pyyntö on liian suuri.', 413);
}
$pyynto = json_decode($raaka, true);
if (!is_array($pyynto) || !isset($pyynto['toiminto']) || !is_string($pyynto['toiminto'])) {
    hylkaa('muoto', 'Pyyntö ei kelpaa.', 400);
}
$toiminto = $pyynto['toiminto'];

/* --- luo: isäntä perustaa pelin --- */
if ($toiminto === 'luo') {
    $asetukset = siistiAsetukset(is_array($pyynto['asetukset'] ?? null) ? $pyynto['asetukset'] : array());
    if (!is_writable(sys_get_temp_dir())) hylkaa('tallennus', 'Pelin tilaa ei voitu tallentaa.', 500);
    siivoaVanhat();
    $avain = bin2hex(random_bytes(12));
    $koodi = null;
    $f = false;
    for ($yritys = 0; $yritys < 40; $yritys++) {
        $ehdokas = sprintf('%04d', random_int(0, 9999));
        /* x = epäonnistuu jos tiedosto on jo olemassa. Kaksi samaan aikaan
         * luotua peliä ei voi saada samaa koodia. */
        $f = @fopen(huonePolku($ehdokas), 'x');
        if ($f !== false) {
            $koodi = $ehdokas;
            break;
        }
    }
    if ($koodi === null) hylkaa('eiKoodia', 'Vapaata pelikoodia ei löytynyt. Yritä hetken päästä.', 503);
    $huone = array(
        'versio' => 1, 'koodi' => $koodi, 'isantaTiiviste' => hash('sha256', $avain),
        'luotu' => $NYT, 'muokattu' => $NYT, 'vaihe' => 'aula', 'asetukset' => $asetukset,
        'pelaajat' => array(), 'seuraavaId' => 1, 'kierros' => null, 'vastaukset' => array(),
        'tulokset' => array(), 'tulos' => null, 'loppui' => null,
    );
    $json = json_encode($huone, JSON_UNESCAPED_UNICODE);
    $ok = flock($f, LOCK_EX) && fwrite($f, $json) === strlen($json);
    flock($f, LOCK_UN);
    fclose($f);
    if (!$ok) {
        @unlink(huonePolku($koodi));
        hylkaa('tallennus', 'Pelin tilaa ei voitu tallentaa.', 500);
    }
    onnistui(array('koodi' => $koodi, 'isantaAvain' => $avain, 'tila' => julkinenTila($huone, 'isanta', null)));
}

/* --- liity: pelaaja tulee peliin --- */
if ($toiminto === 'liity') {
    $nimi = siistiNimi($pyynto['nimi'] ?? null);
    if ($nimi === null) {
        hylkaa('nimiKelpaa', 'Nimessä saa olla kirjaimia, numeroita, välilyöntejä, pisteitä ja viivoja, enintään 16 merkkiä.', 400);
    }
    /* Hahmon vari (TAYTTEET 1-10). Vanha asiakas ei laheta tata lainkaan,
     * joten null on sallittu arvo eika virhe: silloin pelaaja nakyy kuten
     * ennenkin pelkalla nimella. */
    $vari = $pyynto['vari'] ?? null;
    if ($vari !== null) {
        if (!is_int($vari) || $vari < 1 || $vari > 10) {
            hylkaa('variKelpaa', 'Varia ei tunnistettu.', 400);
        }
    }
    $avain = bin2hex(random_bytes(12));
    $tulos = kasitteleHuonetta($pyynto['koodi'] ?? null, function ($huone) use ($nimi, $vari, $avain, $NYT) {
        if ($huone['vaihe'] === 'loppu') return virhe('paattynyt', 'Peli on jo päättynyt.', 409);
        if (count($huone['pelaajat']) >= PELAAJIA_ENINTAAN) return virhe('taynna', 'Peli on täynnä.', 409);
        $vertailu = vertailuNimi($nimi);
        foreach ($huone['pelaajat'] as $p) {
            if (vertailuNimi($p['nimi']) === $vertailu) return virhe('nimiVarattu', 'Nimi on jo käytössä tässä pelissä.', 409);
        }
        /* Vari on tunniste siina missa nimikin: kaksi samanvarista pelaajaa
         * ei erotu pistetaulussa. Torjutaan samalla tavalla kuin nimi. */
        if ($vari !== null) {
            foreach ($huone['pelaajat'] as $p) {
                if (($p['vari'] ?? null) === $vari) return virhe('variVarattu', 'Väri on jo käytössä tässä pelissä.', 409);
            }
        }
        $id = 'p' . $huone['seuraavaId'];
        $huone['seuraavaId']++;
        $huone['pelaajat'][] = array(
            'id' => $id, 'nimi' => $nimi, 'vari' => $vari, 'tiiviste' => hash('sha256', $avain),
            'pisteet' => 0, 'liittyi' => $NYT,
        );
        $indeksi = count($huone['pelaajat']) - 1;
        return array('huone' => $huone, 'vastaus' => array(
            'pelaajaId' => $id, 'pelaajaAvain' => $avain, 'nimi' => $nimi,
            'tila' => julkinenTila($huone, 'pelaaja', $indeksi),
        ));
    });
    onnistui($tulos['vastaus']);
}

/* --- tila: kysely (isäntä ja pelaajat) --- */
if ($toiminto === 'tila') {
    $avain = $pyynto['avain'] ?? null;
    $tulos = kasitteleHuonetta($pyynto['koodi'] ?? null, function ($huone) use ($avain) {
        $r = rooli($huone, $avain);
        if ($r[0] === null) return virhe('eiOikeutta', 'Ei oikeutta.', 403);
        return array('vastaus' => array('tila' => julkinenTila($huone, $r[0], $r[1])));
    });
    onnistui($tulos['vastaus']);
}

/* --- aloitaKierros: isäntä lähettää jaon, palvelin asettaa T0:n --- */
if ($toiminto === 'aloitaKierros') {
    $n = $pyynto['n'] ?? null;
    $pizza = siistiPizza($pyynto['pizza'] ?? null);
    $kortit = siistiKortit($pyynto['kortit'] ?? null);
    $esimerkki = $pyynto['esimerkki'] ?? '';
    /* Harjoituskierros (Marko 20.10.2026): pelkka merkki pelaajille, ei
       vaikuta pisteisiin. Pisteet laskee isannan laite, ja `uudelleen`
       nollaa ne - palvelin ei siis tieda harjoituksesta muuta. */
    $harjoitus = !empty($pyynto['harjoitus']);
    if (!is_int($n) || $pizza === null || $kortit === null || !is_string($esimerkki) || strlen($esimerkki) > 80) {
        hylkaa('muoto', 'Pyyntö ei kelpaa.', 400);
    }
    $tulos = isannanToiminto($pyynto, function ($huone) use ($n, $pizza, $kortit, $esimerkki, $harjoitus, $NYT) {
        $nykyinen = $huone['kierros'] === null ? 0 : $huone['kierros']['n'];
        /* Tuplapainallus: sama kierros on jo käynnissä → palautetaan se,
         * ei aloiteta uutta eikä nollata jo tulleita vastauksia. */
        if ($n === $nykyinen && $huone['vaihe'] === 'kierros') {
            return array('vastaus' => array('tila' => julkinenTila($huone, 'isanta', null)));
        }
        if ($huone['vaihe'] === 'loppu') return virhe('paattynyt', 'Peli on jo päättynyt.', 409);
        if ($huone['vaihe'] === 'kierros') return virhe('vaaraVaihe', 'Edellinen kierros on vielä kesken.', 409);
        if ($n !== $nykyinen + 1) return virhe('vaaraKierros', 'Kierros on jo vaihtunut.', 409);
        if ($n > $huone['asetukset']['kierroksia']) return virhe('kierroksetLoppu', 'Kaikki kierrokset on pelattu.', 409);
        $t0 = $NYT + LAHTOLASKENTA_MS;
        $huone['kierros'] = array(
            'n' => $n, 't0' => $t0,
            'loppuu' => $huone['asetukset']['odotaKaikkia'] ? null : $t0 + $huone['asetukset']['aikaMs'],
            'pizza' => $pizza, 'kortit' => $kortit, 'esimerkki' => $esimerkki,
            'harjoitus' => $harjoitus,
        );
        $huone['vastaukset'] = array();
        $huone['vaihe'] = 'kierros';
        $huone['tulos'] = null;
        return array('huone' => $huone);
    });
    onnistui($tulos['vastaus']);
}

/* --- vastaa: pelaaja lähettää lausekkeen, palvelin leimaa saapumisen --- */
if ($toiminto === 'vastaa') {
    $n = $pyynto['n'] ?? null;
    $myohassa = $pyynto['myohassa'] ?? 0;
    $vastaus = siistiVastaus(array_key_exists('vastaus', $pyynto) ? $pyynto['vastaus'] : false);
    if (!is_int($n) || $vastaus === false || !(is_int($myohassa) || is_float($myohassa))) {
        hylkaa('muoto', 'Pyyntö ei kelpaa.', 400);
    }
    $myohassa = (int) max(0, min(600000, round($myohassa)));
    $avain = $pyynto['avain'] ?? null;
    $tulos = kasitteleHuonetta($pyynto['koodi'] ?? null, function ($huone) use ($avain, $n, $vastaus, $myohassa, $NYT) {
        $r = rooli($huone, $avain);
        if ($r[0] !== 'pelaaja') return virhe('eiOikeutta', 'Ei oikeutta.', 403);
        $k = $huone['kierros'];
        if ($huone['vaihe'] !== 'kierros' || $k === null || $k['n'] !== $n) {
            return virhe('vaaraKierros', 'Kierros on jo vaihtunut.', 409);
        }
        if ($NYT < $k['t0']) return virhe('eiAlkanut', 'Kierros ei ole vielä alkanut.', 409);
        if ($k['loppuu'] !== null && $NYT > $k['loppuu'] + ARMO_MS) return virhe('aikaLoppui', 'Aika loppui.', 409);
        $id = $huone['pelaajat'][$r[1]]['id'];
        if (isset($huone['vastaukset'][$id])) return virhe('joVastattu', 'Olet jo vastannut tähän kierrokseen.', 409);
        $huone['vastaukset'][$id] = array('vastaus' => $vastaus, 'saapui' => $NYT, 'myohassa' => $myohassa);
        return array('huone' => $huone, 'vastaus' => array('saapui' => $NYT, 'aikaMs' => $NYT - $k['t0']));
    });
    onnistui($tulos['vastaus']);
}

/* --- pisteyta: isäntä lähettää tarkistetut tulokset --- */
if ($toiminto === 'pisteyta') {
    $n = $pyynto['n'] ?? null;
    $rivit = $pyynto['rivit'] ?? null;
    $nahdyt = $pyynto['nahdyt'] ?? null;
    if (!is_int($n) || !is_array($rivit) || count($rivit) > PELAAJIA_ENINTAAN
        || !is_array($nahdyt) || count($nahdyt) > PELAAJIA_ENINTAAN) {
        hylkaa('muoto', 'Pyyntö ei kelpaa.', 400);
    }
    $siistit = array();
    foreach ($rivit as $r) {
        if (!is_array($r)) hylkaa('muoto', 'Pyyntö ei kelpaa.', 400);
        $id = $r['id'] ?? null;
        $oikein = $r['oikein'] ?? null;
        $pisteet = $r['pisteet'] ?? null;
        $aika = $r['t'] ?? null;
        $syy = $r['syy'] ?? null;
        if (!is_string($id) || preg_match('/^p[0-9]{1,5}$/', $id) !== 1 || !is_bool($oikein)
            || !is_int($pisteet) || $pisteet < 0 || $pisteet > 1000
            || ($aika !== null && !is_int($aika))
            || ($syy !== null && (!is_string($syy) || preg_match('/^[a-zA-Z]{1,20}$/', $syy) !== 1))) {
            hylkaa('muoto', 'Pyyntö ei kelpaa.', 400);
        }
        $siistit[] = array('id' => $id, 'oikein' => $oikein, 'pisteet' => $pisteet, 't' => $aika, 'syy' => $syy);
    }
    $tulos = isannanToiminto($pyynto, function ($huone) use ($n, $siistit, $nahdyt) {
        $k = $huone['kierros'];
        if ($k === null || $k['n'] !== $n) return virhe('vaaraKierros', 'Kierros on jo vaihtunut.', 409);
        if ($huone['vaihe'] !== 'kierros' && $huone['vaihe'] !== 'tulos') {
            return virhe('vaaraVaihe', 'Kierrosta ei voi pisteyttää nyt.', 409);
        }
        /* ⚠️ VASTAUS EI SAA KADOTA ISÄNNÄN KAHDEN PYYNNÖN VÄLIIN. Isäntä lukee
         * tilan, tarkistaa ja lähettää pisteet — ja jos vastaus saapui siinä
         * välissä, se jäisi pisteyttämättä eikä kukaan huomaisi. Siksi
         * isäntä kertoo mitkä vastaukset se näki, ja jos palvelimella on
         * enemmän, pisteytys torjutaan ja isäntä lukee uudelleen. */
        foreach (array_keys($huone['vastaukset']) as $vastannut) {
            if (!in_array($vastannut, $nahdyt, true)) {
                return virhe('uusiaVastauksia', 'Uusia vastauksia tuli pisteytyksen aikana.', 409);
            }
        }
        /* ⚠️ Pelaaja voi POISTUA isännän lukemisen ja pisteytyksen välissä
         * (`poistu`). Hänen rivinsä pudotetaan hiljaa eikä koko pisteytystä
         * torjuta: muuten yksi lähtijä pysäyttäisi kierroksen kaikilta. */
        $idt = array();
        foreach ($huone['pelaajat'] as $p) $idt[$p['id']] = true;
        $siistit = array_values(array_filter($siistit, function ($r) use ($idt) {
            return isset($idt[$r['id']]);
        }));
        /* Korvaa saman kierroksen aiemman pisteytyksen: toisto on turvallinen. */
        $huone['tulokset']['k' . $n] = $siistit;
        foreach ($huone['pelaajat'] as $i => $p) {
            $summa = 0;
            foreach ($huone['tulokset'] as $kierroksenRivit) {
                foreach ($kierroksenRivit as $rivi) {
                    if ($rivi['id'] === $p['id']) $summa += $rivi['pisteet'];
                }
            }
            $huone['pelaajat'][$i]['pisteet'] = $summa;
        }
        $huone['tulos'] = array('n' => $n, 'rivit' => $siistit);
        $huone['vaihe'] = 'tulos';
        return array('huone' => $huone);
    });
    onnistui($tulos['vastaus']);
}

/* --- poistu: pelaaja lähtee pelistä — nimimerkki pois heti ---
 * Marko 11.9.2026: *"poista poistuva pelaaja"*. Kaksi syytä: lähtenyt
 * pelaaja esti «kaikki vastasivat» -säännön (Odota kaikkia -tilassa kierros
 * odotti häntä ikuisesti), ja kampanjan sääntö on olla säilyttämättä
 * nimimerkkiä turhaan (MULTIPLAYER.md 6). Myös pelaajan vastaus ja
 * tulosrivit poistetaan; muiden pisteet eivät muutu, koska ne lasketaan
 * heidän omista riveistään. Toisto antaa 403: avain ei enää kuulu kenellekään. */
if ($toiminto === 'poistu') {
    $avain = $pyynto['avain'] ?? null;
    $tulos = kasitteleHuonetta($pyynto['koodi'] ?? null, function ($huone) use ($avain) {
        $r = rooli($huone, $avain);
        if ($r[0] !== 'pelaaja') return virhe('eiOikeutta', 'Ei oikeutta.', 403);
        $id = $huone['pelaajat'][$r[1]]['id'];
        $muut = function ($rivit) use ($id) {
            return array_values(array_filter($rivit, function ($rivi) use ($id) {
                return $rivi['id'] !== $id;
            }));
        };
        array_splice($huone['pelaajat'], $r[1], 1);
        unset($huone['vastaukset'][$id]);
        foreach ($huone['tulokset'] as $k => $rivit) $huone['tulokset'][$k] = $muut($rivit);
        if ($huone['tulos'] !== null) $huone['tulos']['rivit'] = $muut($huone['tulos']['rivit']);
        return array('huone' => $huone, 'vastaus' => array('poistui' => true));
    });
    onnistui($tulos['vastaus']);
}

/* --- paata: lopputulos näkyviin; huone poistuu vartin päästä --- */
if ($toiminto === 'paata') {
    $tulos = isannanToiminto($pyynto, function ($huone) use ($NYT) {
        $huone['vaihe'] = 'loppu';
        $huone['loppui'] = $NYT;
        return array('huone' => $huone);
    });
    onnistui($tulos['vastaus']);
}

/* --- uudelleen: samat pelaajat ja koodi, pisteet nollaan --- */
if ($toiminto === 'uudelleen') {
    $tulos = isannanToiminto($pyynto, function ($huone) {
        $huone['vaihe'] = 'aula';
        $huone['kierros'] = null;
        $huone['vastaukset'] = array();
        $huone['tulokset'] = array();
        $huone['tulos'] = null;
        $huone['loppui'] = null;
        foreach ($huone['pelaajat'] as $i => $p) $huone['pelaajat'][$i]['pisteet'] = 0;
        return array('huone' => $huone);
    });
    onnistui($tulos['vastaus']);
}

/* --- poista: nimimerkit pois heti --- */
if ($toiminto === 'poista') {
    $tulos = isannanToiminto($pyynto, function ($huone) {
        return array('poista' => true, 'vastaus' => array('poistettu' => true));
    });
    onnistui($tulos['vastaus']);
}

hylkaa('tuntematon', 'Tuntematon toiminto.', 400);
