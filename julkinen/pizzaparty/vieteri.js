/* Pizza Love — VIETERILAATIKON HAAVE (Marko 19.10.2026)
 *
 * «Voisiko sille laatikolle laittaa ajatuskuplaa ja että se täyte, jota
 * laatikko haaveilee, vaihtuisi eri kerroilla?»
 *
 * Kuva ja liike ovat CSS:ssä (yhteinen.css, .vieteri); tämä tiedosto tekee
 * vain yhden asian: vaihtaa kuplan täytteen joka kierroksella.
 *
 * ⚠️ TÄYTTEET LUETAAN `TAYTTEET`-TAULUKOSTA (kortit.js), EI OMASTA
 * LISTASTA. Täytteen väri on pelin oma väri, ja toinen lista ajautuisi siitä
 * erilleen heti kun väriä säädetään yhdessä paikassa. Siksi tämä skripti on
 * ladattava kortit.js:n JÄLKEEN.
 *
 * ⚠️ VAIHTO TAPAHTUU `animationiteration`issa, EI AJASTIMELLA. Ajastin ja
 * animaatio ajautuisivat erilleen: piilossa oleva elementti ei animoi
 * lainkaan (`display:none`), mutta ajastin juoksisi silti - ja täyte
 * vaihtuisi kesken näkyvän kierroksen. Tapahtuma tulee täsmälleen silloin
 * kun kierros alkaa alusta, myös tauon jälkeen.
 *
 * ⚠️ JA VAIHTO ON TEHTÄVÄ SILLOIN KUN LAATIKKO ON PIILOSSA. `animationiteration`
 * laukeaa kierroksen vaihtuessa, ja silloin vieteri on ruudun yläpuolella -
 * eli vaihto ei näy välähdyksenä. Jos avainruutuja muuttaa niin ettei
 * kierroksen alku ole enää piilossa, tämä on tarkistettava. */

(function () {
  var jarjestys = null, kohta = 0;

  /* Satunnainen järjestys, jossa sama täyte ei tule kahdesti peräkkäin:
     arvonta yksitellen antaisi toistoja, ja toisto näyttäisi siltä kuin
     vaihto olisi rikki. Sekoitettu lista käydään läpi ja sekoitetaan uudelleen. */
  function seuraava() {
    if (!jarjestys || kohta >= jarjestys.length) {
      jarjestys = TAYTTEET.map(function (t, i) { return i; });
      for (var i = jarjestys.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var a = jarjestys[i]; jarjestys[i] = jarjestys[j]; jarjestys[j] = a;
      }
      kohta = 0;
    }
    return jarjestys[kohta++];
  }

  function aseta(el) {
    if (typeof TAYTTEET === 'undefined' || !TAYTTEET.length) return;
    var n = seuraava(), t = TAYTTEET[n];
    var kuva = el.querySelector('.vieteri__tayte img');
    var kehys = el.querySelector('.vieteri__tayte');
    if (!kuva || !kehys) return;
    kuva.src = 'apinavaaka/tayte/' + t.arvo + '.webp';   // ⚠️ `arvo`, ei indeksi
    kehys.style.background = t.vari;
  }

  function kaynnista() {
    [].forEach.call(document.querySelectorAll('.vieteri'), function (el) {
      aseta(el);
      /* Kuuntelija säiliöön: `.vieteri`lla on oma animaationsa (sivuttainen
         siirto), ja sen kierros on koko liikkeen kierros. */
      el.addEventListener('animationiteration', function (e) {
        if (e.target === el) aseta(el);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', kaynnista);
  } else {
    kaynnista();
  }
})();
