<?php
// Kopioi tämä nimellä config.php kansioon <kotikansio>/pizzalove-kaannos/
// (EI sivuston kansioon). Älä koskaan vie tätä tiedostoa repoon tunnisteen kanssa.
return array(
    // GitHubin fine-grained token «pizzalove-kaannos-palvelin»: vain repo
    // merkitysten/pizzalove-fi, oikeus Actions: Read and write. Vanhenee 16.11.2027.
    'github_token' => 'LIITA_TAHAN_github_pat_...',
    // Sähköpostiosoite, johon tulee ilmoitus uudesta kielipyynnöstä
    // (tyhjä = ei ilmoitusta). Kirjoita oma osoitteesi.
    'ilmoitus' => '',
);
