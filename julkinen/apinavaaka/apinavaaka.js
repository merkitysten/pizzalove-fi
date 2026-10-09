/* Apinavaaka – pikkupeli pizzalove.fi:hin (ja Learn with Bassoon).
 *
 * Opettaa kaksi asiaa, jotka lautapelissä koetaan vaikeiksi:
 *   1) Torni = luku. Samanväriset nappulat liikkuvat aina yhtenä tornina.
 *   2) Apinavaaka on apuväline: kun tornit ovat yhtä korkeat, siirto täsmää.
 *
 * Periaate (Marko 6.10.2026): mahtuu yhdelle puhelimen ruudulle, mahdollisimman vähän
 * tekstiä, ohjeet Basso-napin takana.
 *
 * Käyttö:  <div class="apinavaaka" data-kieli="fi"></div>
 *          <script src="apinavaaka/noppa3d.js"></script>
 *          <script src="apinavaaka/apinavaaka.js"></script>
 * Kuvat: apinavaaka/*.webp (Markon apinavaaka.psd), noppa/*.svg (Merkitysten-nopan tahkot).
 */
(function () {
  'use strict';
  var KANSIO = document.currentScript ? document.currentScript.src.replace(/[^/]*$/, '') : '../apinavaaka/';

  // ---------------------------------------------------------------- kuvan geometria
  // PSD:n pikseleitä; ylhäältä leikattu 250 px, alhaalta rajattu ruokalapun alle.
  var W = 3210, H = 2422;
  var OSAT = {
    vartalo: [255, 0, 2926, 2422],
    vasen:   [0, 1585, 1256, 564],
    oikea:   [1911, 1601, 1299, 513],
    saihkeet:[1162, 22, 1131, 681],
    lamppu:  [1475, 210, 403, 672],
    kieli:   [1443, 1720, 253, 441]
  };
  var NIVEL_V = [1240, 1790], NIVEL_O = [1925, 1775];   // olkapäät
  var SYMB_V = [508, 1655],  SYMB_O = [2700, 1668];     // symbaalien keskikohta
  // Kieli on vaa'an kieli: osoittaa ruokalapun merkkiin < = >. Kääntöpiste suussa.
  var KIELI_NIVEL = [1580, 1740], KIELI_KULMA = { '<': 15, '=': -5, '>': -24 };
  var MAKSIMIKULMA = 9;

  var VARIT = ['#090A0D', '#E62448', '#FFDF00', '#1072B9', '#EF7925',
               '#824292', '#16A74F', '#7F3B1E', '#E473AA', '#6AC0B2'];

  // ---------------------------------------------------------------- tekstit (lyhyet!)
  var T = {
    fi: {
      heita: 'Heitä noppaa!', seuraavaVuoro: 'Seuraava vuoro', taiHeita: 'Valmista lisää tai heitä noppaa.', eiRiita: 'Täytteet eivät riitä pizzoihin.', lisapala: 'Sydänpizza! Valitse lisäpala.',
      valmista: "Valmista pizza!", eiPizzaa: "Ei pizzaa vielä. Heitä uudelleen!", apinat: "Nälkäiset apinat", uusiPeli: "Uusi peli", harjoittele: "Harjoittele", tasot: ["AARGH! Tyhjä maha.", "Öö… Mitä sitten syödään?", "Nam. Muutama pala olisi vielä maistunut.", "Se on siinä – apinan lempipizza!"], palaa: "palaa", boksi: "Yhteinen boksi", infoA: "<h3>Nälkäiset apinat</h3><p>Pelatkaa yhdessä. Kun pizzan täyte on linjastolla, napauta pizzaa. Pala menee yhteiseen boksiin.</p><p>Jos vuorolla ei synny pizzaa, nälkäiset apinat syövät palat ja peli päättyy. Täyttäkää boksi kymmenellä palalla!</p>",
      vihjeet: { A: 'Etsi yhtä korkea torni.', B: 'Kokoa pienemmistä torneista.',
        C: 'Nosta linjaston torni punnusten päälle.', X: 'Tee tornit yhtä korkeiksi.', H: 'Hävikki! Vie linjastolta varastoon.' },
      vainYksi: 'Vain yksi torni linjastolta.',
      vie: 'Vie linjastolle', vieV: 'Vie varastoon',
      hyva: 'Hienoa!', party: 'Pizzapartyt!',
      varasto: 'Varasto', linjasto: 'Linjasto', noppa: 'Noppa', ohjeet: 'Ohjeet', sulje: 'Sulje',
      alusta: 'Aloita alusta', vapaa: 'Vapaa peli',
      info: '<h2>Apinavaaka</h2><ol><li>Heitä noppaa. Punnukset tulevat apinan vasempaan käteen.</li>' +
        '<li>Napauta torneja. Tee tornit yhtä korkeiksi.</li><li>Kun lamppu syttyy, vie tornit linjastolle.</li></ol>' +
        '<p>Torni liikkuu aina kokonaisena. Tornin korkeus on täytteen luku.</p>' +
        '<dl class="av__tavat"><dt>A</dt><dd>Perussiirto <b>3 = 3</b></dd><dt>B</dt><dd>Summasiirto <b>1 + 2 = 3</b></dd>' +
        '<dt>C</dt><dd>Erotussiirto <b>5 − 2 = 3</b></dd></dl>' +
        '<p><b>Hävikki:</b> nopan luku on suurempi kuin varasto. Tornit viedään linjastolta varastoon.</p>' +
        '<p><b>Pizzapartyt:</b> linjasto on täynnä!</p>',
      taytteet: ['Oliivi', 'Tomaatti', 'Ananas', 'Homejuusto', 'Katkarapu', 'Munakoiso', 'Rucola', 'Herkkusieni', 'Kinkku', 'Kala']
    },
    sv: {
      heita: 'Kasta tärningen!', seuraavaVuoro: 'Nästa tur', taiHeita: 'Gör fler eller kasta tärningen.', eiRiita: 'Fyllningarna räcker inte till pizzorna.', lisapala: 'Hjärtpizza! Välj en extrabit.',
      valmista: "Gör pizzan!", eiPizzaa: "Ingen pizza än. Kasta igen!", apinat: "Hungriga apor", uusiPeli: "Nytt spel", harjoittele: "Träna", tasot: ["AARGH! Tom mage.", "Öö… Vad äter vi nu?", "Mums. Några bitar till hade suttit fint.", "Det är klart – apans favoritpizza!"], palaa: "bitar", boksi: "Gemensam box", infoA: "<h3>Hungriga apor</h3><p>Spela tillsammans. När pizzans fyllning finns på linjen, tryck på pizzan. Biten hamnar i den gemensamma boxen.</p><p>Om det inte blir någon pizza på en tur äter de hungriga aporna upp bitarna och spelet tar slut. Fyll boxen med tio bitar!</p>",
      vihjeet: { A: 'Hitta ett lika högt torn.', B: 'Bygg av mindre torn.',
        C: 'Lyft ett torn från linjen ovanpå vikterna.', X: 'Gör tornen lika höga.', H: 'Svinn! Flytta från linjen till lagret.' },
      vainYksi: 'Bara ett torn från linjen.',
      vie: 'Flytta till linjen', vieV: 'Flytta till lagret',
      hyva: 'Bra!', party: 'Pizzaparty!',
      varasto: 'Lager', linjasto: 'Linje', noppa: 'Tärning', ohjeet: 'Instruktioner', sulje: 'Stäng',
      alusta: 'Börja om', vapaa: 'Fritt spel',
      info: '<h2>Apavågen</h2><ol><li>Kasta tärningen. Vikterna hamnar i apans vänstra hand.</li>' +
        '<li>Tryck på tornen. Gör tornen lika höga.</li><li>När lampan tänds, flytta tornen till linjen.</li></ol>' +
        '<p>Ett torn flyttas alltid helt. Tornets höjd är fyllningens tal.</p>' +
        '<dl class="av__tavat"><dt>A</dt><dd>Basflytt <b>3 = 3</b></dd><dt>B</dt><dd>Summaflytt <b>1 + 2 = 3</b></dd>' +
        '<dt>C</dt><dd>Skillnadsflytt <b>5 − 2 = 3</b></dd></dl>' +
        '<p><b>Svinn:</b> tärningen visar mer än lagret. Torn flyttas från linjen till lagret.</p>' +
        '<p><b>Pizzaparty:</b> linjen är full!</p>',
      taytteet: ['Oliv', 'Tomat', 'Ananas', 'Ädelost', 'Räka', 'Aubergine', 'Ruccola', 'Champinjon', 'Skinka', 'Fisk']
    },
    en: {
      heita: 'Roll the dice!', seuraavaVuoro: 'Next turn', taiHeita: 'Make more or roll the dice.', eiRiita: 'Not enough toppings for the pizzas.', lisapala: 'Heart pizza! Choose an extra slice.',
      valmista: "Make the pizza!", eiPizzaa: "No pizza yet. Roll again!", apinat: "Hungry monkeys", uusiPeli: "New game", harjoittele: "Practise", tasot: ["AARGH! Empty stomach.", "Uhh… What do we eat now?", "Yum. A few more slices would have been nice.", "That’s it – the monkey’s favourite pizza!"], palaa: "slices", boksi: "Shared box", infoA: "<h3>Hungry monkeys</h3><p>Play together. When a pizza’s topping is on the line, tap the pizza. The slice goes into the shared box.</p><p>If no pizza is made on a turn, the hungry monkeys eat the slices and the game ends. Fill the box with ten slices!</p>",
      vihjeet: { A: 'Find a tower just as high.', B: 'Build it from smaller towers.',
        C: 'Lift a tower from the line onto the weights.', X: 'Make the towers equally high.', H: 'Food waste! Move from the line to the storage.' },
      vainYksi: 'Only one tower from the line.',
      vie: 'Move to the line', vieV: 'Move to the storage',
      hyva: 'Well done!', party: 'Pizza party!',
      varasto: 'Storage', linjasto: 'Line', noppa: 'Dice', ohjeet: 'Instructions', sulje: 'Close',
      alusta: 'Start over', vapaa: 'Free play',
      info: '<h2>Monkey scales</h2><ol><li>Roll the dice. The weights go to the monkey\'s left hand.</li>' +
        '<li>Tap the towers. Make the towers equally high.</li><li>When the lamp lights up, move the towers to the line.</li></ol>' +
        '<p>A tower always moves as a whole. Its height is the topping\'s number.</p>' +
        '<dl class="av__tavat"><dt>A</dt><dd>Basic move <b>3 = 3</b></dd><dt>B</dt><dd>Sum move <b>1 + 2 = 3</b></dd>' +
        '<dt>C</dt><dd>Difference move <b>5 − 2 = 3</b></dd></dl>' +
        '<p><b>Food waste:</b> the dice shows more than the storage. Towers go from the line to the storage.</p>' +
        '<p><b>Pizza party:</b> the line is full!</p>',
      taytteet: ['Olive', 'Tomato', 'Pineapple', 'Blue cheese', 'Shrimp', 'Aubergine', 'Rocket', 'Mushroom', 'Ham', 'Fish']
    },
    de: {
      heita: 'Würfle!', seuraavaVuoro: 'Nächster Zug', taiHeita: 'Mach mehr oder würfle.', eiRiita: 'Die Zutaten reichen nicht für die Pizzen.', lisapala: 'Herzpizza! Wähle ein Extrastück.',
      valmista: "Back die Pizza!", eiPizzaa: "Noch keine Pizza. Würfle noch einmal!", apinat: "Hungrige Affen", uusiPeli: "Neues Spiel", harjoittele: "Üben", tasot: ["AARGH! Leerer Bauch.", "Äh… Was essen wir jetzt?", "Mmh. Ein paar Stücke mehr wären lecker gewesen.", "Geschafft – die Lieblingspizza des Affen!"], palaa: "Stücke", boksi: "Gemeinsame Box", infoA: "<h3>Hungrige Affen</h3><p>Spielt zusammen. Wenn die Zutat einer Pizza auf der Linie liegt, tippt auf die Pizza. Das Stück kommt in die gemeinsame Box.</p><p>Wenn in einem Zug keine Pizza entsteht, essen die hungrigen Affen die Stücke und das Spiel ist vorbei. Füllt die Box mit zehn Stücken!</p>",
      vihjeet: { A: 'Finde einen gleich hohen Turm.', B: 'Bau ihn aus kleineren Türmen.',
        C: 'Heb einen Turm von der Linie auf die Gewichte.', X: 'Mach die Türme gleich hoch.', H: 'Verschwendung! Von der Linie ins Lager.' },
      vainYksi: 'Nur ein Turm von der Linie.',
      vie: 'Auf die Linie', vieV: 'Ins Lager',
      hyva: 'Super!', party: 'Pizzaparty!',
      varasto: 'Lager', linjasto: 'Linie', noppa: 'Würfel', ohjeet: 'Anleitung', sulje: 'Schließen',
      alusta: 'Von vorn', vapaa: 'Freies Spiel',
      info: '<h2>Affenwaage</h2><ol><li>Würfle. Die Gewichte kommen in die linke Hand des Affen.</li>' +
        '<li>Tippe auf die Türme. Mach die Türme gleich hoch.</li><li>Wenn die Lampe leuchtet, bring die Türme auf die Linie.</li></ol>' +
        '<p>Ein Turm bewegt sich immer ganz. Seine Höhe ist die Zahl der Zutat.</p>' +
        '<dl class="av__tavat"><dt>A</dt><dd>Grundzug <b>3 = 3</b></dd><dt>B</dt><dd>Summenzug <b>1 + 2 = 3</b></dd>' +
        '<dt>C</dt><dd>Differenzzug <b>5 − 2 = 3</b></dd></dl>' +
        '<p><b>Verschwendung:</b> der Würfel zeigt mehr als das Lager. Türme gehen von der Linie ins Lager.</p>' +
        '<p><b>Pizzaparty:</b> die Linie ist voll!</p>',
      taytteet: ['Olive', 'Tomate', 'Ananas', 'Blauschimmelkäse', 'Garnele', 'Aubergine', 'Rucola', 'Champignon', 'Schinken', 'Fisch']
    }
  };


  // ---------------------------------------------------------------- vinkit valikossa (pelimuodon mukaan)
  var TAVAT_DL = {
    fi: ['Perussiirto', 'Summasiirto', 'Erotussiirto'], sv: ['Basflytt', 'Summaflytt', 'Skillnadsflytt'],
    en: ['Basic move', 'Sum move', 'Difference move'], de: ['Grundzug', 'Summenzug', 'Differenzzug']
  };
  var VINKIT = {
    fi: { valikko: 'Valikko', muodot: 'Pelimuodot', kieli: 'Kieli',
      nimet: { harjoitus: 'Harjoittele', vapaa: 'Vapaa peli', apinat: 'Nälkäiset apinat', pulmat: 'Auta Bassoa' },
      harjoitus: ['Tee tornit yhtä korkeiksi.', 'Lamppu syttyy, kun siirto on oikein.', 'Torni liikkuu aina kokonaisena.'],
      vapaa: ['Siirto onnistuu aina – etsi se!', 'Liian iso noppa? Vie torneja takaisin varastoon.'],
      apinat: ['Tuo pizzan täyte kulhoon.', 'Napauta pizzaa – se paistuu uunissa.', 'Jos pizzaa ei synny, apinat syövät palat!'],
      pulmat: ['Valmista pizza yhdellä siirrolla.', 'Pizzan kaikki täytteet pitää saada linjastolle.', 'Jumissa? Lamppu kertoo siirtotavan.'] },
    sv: { valikko: 'Meny', muodot: 'Spellägen', kieli: 'Språk',
      nimet: { harjoitus: 'Träna', vapaa: 'Fritt spel', apinat: 'Hungriga apor', pulmat: 'Hjälp Basso' },
      harjoitus: ['Gör tornen lika höga.', 'Lampan tänds när flytten är rätt.', 'Ett torn flyttas alltid helt.'],
      vapaa: ['Det finns alltid en flytt – hitta den!', 'För högt tal? Flytta torn tillbaka till lagret.'],
      apinat: ['För pizzans fyllning till skålen.', 'Tryck på pizzan – den gräddas i ugnen.', 'Blir det ingen pizza äter aporna bitarna!'],
      pulmat: ['Gör pizzan med en flytt.', 'Alla pizzans fyllningar ska till linjen.', 'Fast? Lampan berättar vilken flytt.'] },
    en: { valikko: 'Menu', muodot: 'Game modes', kieli: 'Language',
      nimet: { harjoitus: 'Practise', vapaa: 'Free play', apinat: 'Hungry monkeys', pulmat: 'Help Basso' },
      harjoitus: ['Make the towers equally high.', 'The lamp lights up when the move is right.', 'A tower always moves as a whole.'],
      vapaa: ['There is always a move – find it!', 'Dice too high? Move towers back to the storage.'],
      apinat: ['Bring the pizza’s topping into its bowl.', 'Tap the pizza – it bakes in the oven.', 'No pizza? The monkeys eat the slices!'],
      pulmat: ['Make the pizza with one move.', 'All of the pizza’s toppings must reach the line.', 'Stuck? The lamp tells you the type of move.'] },
    de: { valikko: 'Menü', muodot: 'Spielarten', kieli: 'Sprache',
      nimet: { harjoitus: 'Üben', vapaa: 'Freies Spiel', apinat: 'Hungrige Affen', pulmat: 'Hilf Basso' },
      harjoitus: ['Mach die Türme gleich hoch.', 'Die Lampe leuchtet, wenn der Zug stimmt.', 'Ein Turm bewegt sich immer ganz.'],
      vapaa: ['Es gibt immer einen Zug – finde ihn!', 'Würfel zu hoch? Bring Türme zurück ins Lager.'],
      apinat: ['Bring die Zutat der Pizza in ihre Schüssel.', 'Tippe auf die Pizza – sie backt im Ofen.', 'Keine Pizza? Die Affen essen die Stücke!'],
      pulmat: ['Back die Pizza mit einem Zug.', 'Alle Zutaten der Pizza müssen auf die Linie.', 'Steckst du fest? Die Lampe verrät die Zugart.'] }
  };
  var KIELET = [['fi', 'Suomi'], ['sv', 'Svenska'], ['en', 'English'], ['de', 'Deutsch']];


  // ---------------------------------------------------------------- opastettu harjoitus (tutoriaali)
  // Kuusi vaihetta: jokaisesta siirtotavasta ensin ohjattu kierros, heti perään oma harjoitus.
  // Vaiheet ovat kiinteitä, jotta tekstit voivat puhua juuri näistä täytteistä.
  var OPAS_VAIHEET = [
    { tapa: 'A', ohjattu: true,  noppa: 3, linjasto: [],        kortit: [3, 1, 5, 9], pizza: 3 },
    { tapa: 'A', ohjattu: false, noppa: 7, linjasto: [],        kortit: [7, 1, 5, 9], ratkaisu: { oikea: [7], vasen: [] } },
    { tapa: 'B', ohjattu: true,  noppa: 3, linjasto: [],        kortit: [1, 5, 9, 4], pizza: 1 },
    { tapa: 'B', ohjattu: false, noppa: 7, linjasto: [2],       kortit: [4, 8, 9, 5], ratkaisu: { oikea: [3, 4], vasen: [] } },   // 1 + 6 tasapainottaa, mutta ei tuo pizzaa
    { tapa: 'C', ohjattu: true,  noppa: 3, linjasto: [2],       kortit: [5, 9, 4, 8], pizza: 5 },
    { tapa: 'C', ohjattu: false, noppa: 2, linjasto: [1, 2, 6], kortit: [3, 9, 5, 10], ratkaisu: { oikea: [3], vasen: [1] } }   // 8 − 6 ja 4 − 2 tasapainottavat, mutta eivät tuo pizzaa
  ];
  var OPAS = {
    fi: {
      aloita: 'Aloita', harjoitus: 'Harjoitus', apinoihin: 'Pelaa Nälkäisiä apinoita', uudelleen: 'Harjoittele uudelleen',
      tavat: {
        A: ['Perussiirto', '”Yhtä suuri kuin”', 'Tuo yksi täyte, joka vastaa nopan lukua.'],
        B: ['Summasiirto', '”Lisätään pieniä täytteitä”', 'Kokoa nopan luku pienemmillä täytteillä.'],
        C: ['Erotussiirto', '”Vähennetään täytteitä”', 'Tuo liikaa täytteitä ja vie erotus linjastolta pois.']
      },
      teeItse: { A: 'Tee itse perussiirto.', B: 'Tee itse summasiirto.', C: 'Tee itse erotussiirto.' },
      loppu: ['Hienoa!', 'Osaat nyt kaikki kolme siirtoa.'],
      nopasta: 'Nopasta tuli {d}. Apina pitää {d} punnusta.',
      A: { kysy: 'Mikä varaston täyte tuo tasapainon?', ok: 'Jes! Nyt tornit ovat yhtä korkeat. 3 = 3.', pizza: 'Nyt ananaspizzan voi valmistaa!' },
      B: { kysy: 'Nyt emme tarvitse ananasta. Kokoa 3 pienemmistä täytteistä.', puuttuu: 'Vielä puuttuu {p}. Mitä lisäät?',
        ok: 'Totta! 1 + 2 = 3.', pizza: 'Nyt oliivipizzan voi valmistaa!' },
      C: { kysy: 'Tuo katkarapu (5).', liikaa: 'Oho, liian painava! Mikä linjaston täyte tuo tasapainon?',
        ok: 'Aivan! 3 + 2 = 5. Tomaatti palaa varastoon ja katkarapu menee linjastolle.', pizza: 'Linjasto kasvoi 5 − 2 = 3. Nyt katkarapupizzan voi valmistaa!' },
      katso: 'Katso, mitä täytettä pizzat tarvitsevat.', eiPizzaa: 'Tasapaino, mutta yksikään pizza ei tarvitse tätä täytettä. Katso pizzoja!', vie: 'Vie', itseOk: 'Tasapaino!', pizzaItse: 'Valmista pizza!', vihje: 'Katso hohtavia täytteitä.',
      vaara: { A: 'Tasapaino, mutta perussiirto tehdään yhdellä täytteellä.', B: 'Tasapaino, mutta summasiirrossa käytetään useaa pientä täytettä.',
        C: 'Tasapaino, mutta erotussiirrossa yksi täyte lähtee linjastolta.' }
    },
    sv: {
      aloita: 'Börja', harjoitus: 'Övning', apinoihin: 'Spela Hungriga apor', uudelleen: 'Träna igen',
      tavat: {
        A: ['Basflytt', '”Lika med”', 'Hämta en fyllning som motsvarar tärningens tal.'],
        B: ['Summaflytt', '”Lägg till små fyllningar”', 'Bygg tärningens tal med mindre fyllningar.'],
        C: ['Skillnadsflytt', '”Minska fyllningar”', 'Hämta för mycket fyllning och ta bort skillnaden från linjen.']
      },
      teeItse: { A: 'Gör själv en basflytt.', B: 'Gör själv en summaflytt.', C: 'Gör själv en skillnadsflytt.' },
      loppu: ['Bra!', 'Nu kan du alla tre flyttar.'],
      nopasta: 'Tärningen visar {d}. Apan håller {d} vikter.',
      A: { kysy: 'Vilken fyllning i lagret ger balans?', ok: 'Ja! Nu är tornen lika höga. 3 = 3.', pizza: 'Nu kan ananaspizzan göras!' },
      B: { kysy: 'Nu behöver vi inte ananasen. Bygg 3 av mindre fyllningar.', puuttuu: 'Det fattas {p}. Vad lägger du till?',
        ok: 'Rätt! 1 + 2 = 3.', pizza: 'Nu kan olivpizzan göras!' },
      C: { kysy: 'Hämta räkan (5).', liikaa: 'Oj, för tungt! Vilken fyllning på linjen ger balans?',
        ok: 'Precis! 3 + 2 = 5. Tomaten går tillbaka till lagret och räkan till linjen.', pizza: 'Linjen växte 5 − 2 = 3. Nu kan räkpizzan göras!' },
      katso: 'Titta vilken fyllning pizzorna behöver.', eiPizzaa: 'Balans, men ingen pizza behöver den här fyllningen. Titta på pizzorna!', vie: 'Flytta', itseOk: 'Balans!', pizzaItse: 'Gör pizzan!', vihje: 'Titta på de lysande fyllningarna.',
      vaara: { A: 'Balans, men en basflytt görs med en fyllning.', B: 'Balans, men i en summaflytt används flera små fyllningar.',
        C: 'Balans, men i en skillnadsflytt lämnar en fyllning linjen.' }
    },
    en: {
      aloita: 'Start', harjoitus: 'Practice', apinoihin: 'Play Hungry monkeys', uudelleen: 'Practise again',
      tavat: {
        A: ['Basic move', '“Equal to”', 'Bring one topping that matches the dice number.'],
        B: ['Sum move', '“Adding small toppings”', 'Build the dice number with smaller toppings.'],
        C: ['Difference move', '“Removing toppings”', 'Bring too much topping and take the difference off the line.']
      },
      teeItse: { A: 'Make a basic move yourself.', B: 'Make a sum move yourself.', C: 'Make a difference move yourself.' },
      loppu: ['Well done!', 'Now you know all three moves.'],
      nopasta: 'The dice shows {d}. The monkey holds {d} weights.',
      A: { kysy: 'Which topping in the storage brings balance?', ok: 'Yes! The towers are equally high. 3 = 3.', pizza: 'Now the pineapple pizza can be made!' },
      B: { kysy: 'We don’t need the pineapple now. Build 3 from smaller toppings.', puuttuu: '{p} still missing. What do you add?',
        ok: 'Right! 1 + 2 = 3.', pizza: 'Now the olive pizza can be made!' },
      C: { kysy: 'Bring the shrimp (5).', liikaa: 'Oops, too heavy! Which topping on the line brings balance?',
        ok: 'Exactly! 3 + 2 = 5. The tomato goes back to the storage and the shrimp to the line.', pizza: 'The line grew by 5 − 2 = 3. Now the shrimp pizza can be made!' },
      katso: 'Look at which topping the pizzas need.', eiPizzaa: 'Balanced, but no pizza needs this topping. Look at the pizzas!', vie: 'Move', itseOk: 'Balanced!', pizzaItse: 'Make the pizza!', vihje: 'Look at the glowing toppings.',
      vaara: { A: 'Balanced, but a basic move uses one topping.', B: 'Balanced, but a sum move uses several small toppings.',
        C: 'Balanced, but in a difference move one topping leaves the line.' }
    },
    de: {
      aloita: 'Los', harjoitus: 'Übung', apinoihin: 'Hungrige Affen spielen', uudelleen: 'Noch einmal üben',
      tavat: {
        A: ['Grundzug', '„Gleich groß wie“', 'Bring eine Zutat, die der Würfelzahl entspricht.'],
        B: ['Summenzug', '„Kleine Zutaten addieren“', 'Bilde die Würfelzahl mit kleineren Zutaten.'],
        C: ['Differenzzug', '„Zutaten abziehen“', 'Bring zu viel Zutat und nimm den Unterschied von der Linie.']
      },
      teeItse: { A: 'Mach selbst einen Grundzug.', B: 'Mach selbst einen Summenzug.', C: 'Mach selbst einen Differenzzug.' },
      loppu: ['Super!', 'Jetzt kannst du alle drei Züge.'],
      nopasta: 'Der Würfel zeigt {d}. Der Affe hält {d} Gewichte.',
      A: { kysy: 'Welche Zutat im Lager bringt das Gleichgewicht?', ok: 'Ja! Die Türme sind gleich hoch. 3 = 3.', pizza: 'Jetzt kann die Ananaspizza gebacken werden!' },
      B: { kysy: 'Die Ananas brauchen wir jetzt nicht. Bilde 3 aus kleineren Zutaten.', puuttuu: 'Es fehlt noch {p}. Was legst du dazu?',
        ok: 'Richtig! 1 + 2 = 3.', pizza: 'Jetzt kann die Olivenpizza gebacken werden!' },
      C: { kysy: 'Bring die Garnele (5).', liikaa: 'Hoppla, zu schwer! Welche Zutat auf der Linie bringt das Gleichgewicht?',
        ok: 'Genau! 3 + 2 = 5. Die Tomate geht zurück ins Lager, die Garnele auf die Linie.', pizza: 'Die Linie ist um 5 − 2 = 3 gewachsen. Jetzt kann die Garnelenpizza gebacken werden!' },
      katso: 'Schau, welche Zutat die Pizzen brauchen.', eiPizzaa: 'Gleichgewicht, aber keine Pizza braucht diese Zutat. Schau auf die Pizzen!', vie: 'Los', itseOk: 'Gleichgewicht!', pizzaItse: 'Back die Pizza!', vihje: 'Schau auf die leuchtenden Zutaten.',
      vaara: { A: 'Gleichgewicht, aber ein Grundzug braucht eine Zutat.', B: 'Gleichgewicht, aber ein Summenzug braucht mehrere kleine Zutaten.',
        C: 'Gleichgewicht, aber beim Differenzzug verlässt eine Zutat die Linie.' }
    }
  };

  // ---------------------------------------------------------------- harjoitustehtävät
  // linjasto = täytteet, jotka ovat alussa linjastolla. Tämän jälkeen vapaa peli,
  // jossa varasto ja linjasto jatkuvat kierroksesta toiseen. Siirto onnistuu aina
  // (tarkistettu kaikille 1024 jaolle ja nopan luvuille 1–10) tai syntyy hävikkiä.
  var TEHTAVAT = [
    { tapa: 'A', noppa: 3, linjasto: [] },
    { tapa: 'A', noppa: 7, linjasto: [2, 5] },
    { tapa: 'B', noppa: 3, linjasto: [3] },
    { tapa: 'B', noppa: 6, linjasto: [6, 5, 9] },
    { tapa: 'C', noppa: 3, linjasto: [1, 2, 3] },
    { tapa: 'C', noppa: 2, linjasto: [1, 2, 4, 6] }
  ];

  // ---------------------------------------------------------------- apurit
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function pros(x, koko) { return (x / koko * 100) + '%'; }
  function summa(a) { return a.reduce(function (s, x) { return s + x; }, 0); }
  function kierra(p, nivel, kulma) {
    var r = kulma * Math.PI / 180, dx = p[0] - nivel[0], dy = p[1] - nivel[1];
    return [nivel[0] + dx * Math.cos(r) - dy * Math.sin(r), nivel[1] + dx * Math.sin(r) + dy * Math.cos(r)];
  }

  var PULMA = {
    fi: { boksiTaynna: 'Boksi on täynnä!', vihjeellaEi: 'Pizza valmis – vihjeellä ei tule palaa.', lukossa: 'Täytä edellisen tason boksi', nimi: 'Auta Bassoa', taso: 'Taso', aloita: 'Aloita', seuraava: 'Seuraava taso', alusta: 'Aloita alusta',
      intro: 'Basso tarvitsee apua! Valmista pizza yhdellä siirrolla.',
      kuvaus: ['Perussiirto', 'Summasiirto', 'Kahden täytteen pizza', 'Erotussiirto', 'Kaksi täytettä kerralla', 'Isot pizzat', 'Summa ja erotus yhdessä', 'Monta pizzaa yhdellä siirrolla', 'Varo ansaa!', 'Mestaritaso'],
      kysy: 'Tuo pizzan täytteet linjastolle yhdellä siirrolla.', kysyMonta: 'Yhden pizzan voi valmistaa. Minkä?', kysyKaikki: 'Valmista kaikki pizzat yhdellä siirrolla.', eiKaikki: 'Tasapaino, mutta kaikki pizzat eivät valmistu.', pizzat: 'Valmista pizzat!', valitse: 'Valitse taso', vihjeNappi: 'Vihje',
      eiPizza: 'Tasapaino, mutta pizza ei valmistu. Katso pizzaa!', ok: 'Tasapaino!', pizza: 'Valmista pizza!', hyva: 'Hienoa!',
      vinkki: ['Vihje: perussiirto.', 'Vihje: summasiirto.', 'Vihje: erotussiirto.', 'Vihje: summa ja erotus yhdessä.'],
      hohto: 'Katso hohtavia täytteitä.', tasoValmis: 'Taso {n} valmis!', loppu: ['Mestaripizzaiolo!', 'Ratkaisit kaikki pulmat.'] },
    sv: { boksiTaynna: 'Boxen är full!', vihjeellaEi: 'Pizzan är klar – med tips blir det ingen bit.', lukossa: 'Fyll förra nivåns box', nimi: 'Hjälp Basso', taso: 'Nivå', aloita: 'Börja', seuraava: 'Nästa nivå', alusta: 'Börja om',
      intro: 'Basso behöver hjälp! Gör pizzan med en flytt.',
      kuvaus: ['Basflytt', 'Summaflytt', 'Pizza med två fyllningar', 'Skillnadsflytt', 'Två fyllningar på en gång', 'Stora pizzor', 'Summa och skillnad tillsammans', 'Många pizzor med en flytt', 'Akta fällan!', 'Mästarnivå'],
      kysy: 'För pizzans fyllningar till linjen med en flytt.', kysyMonta: 'En pizza kan göras. Vilken?', kysyKaikki: 'Gör alla pizzor med en flytt.', eiKaikki: 'Balans, men alla pizzor blir inte klara.', pizzat: 'Gör pizzorna!', valitse: 'Välj nivå', vihjeNappi: 'Tips',
      eiPizza: 'Balans, men pizzan blir inte klar. Titta på pizzan!', ok: 'Balans!', pizza: 'Gör pizzan!', hyva: 'Bra!',
      vinkki: ['Tips: basflytt.', 'Tips: summaflytt.', 'Tips: skillnadsflytt.', 'Tips: summa och skillnad tillsammans.'],
      hohto: 'Titta på de lysande fyllningarna.', tasoValmis: 'Nivå {n} klar!', loppu: ['Mästarpizzaiolo!', 'Du löste alla gåtor.'] },
    en: { boksiTaynna: 'The box is full!', vihjeellaEi: 'Pizza done – no slice when you use a hint.', lukossa: 'Fill the previous level’s box', nimi: 'Help Basso', taso: 'Level', aloita: 'Start', seuraava: 'Next level', alusta: 'Start over',
      intro: 'Basso needs help! Make the pizza with one move.',
      kuvaus: ['Basic move', 'Sum move', 'Two-topping pizza', 'Difference move', 'Two toppings at once', 'Big pizzas', 'Sum and difference together', 'Many pizzas with one move', 'Watch out for the trap!', 'Master level'],
      kysy: 'Bring the pizza’s toppings to the line with one move.', kysyMonta: 'One pizza can be made. Which one?', kysyKaikki: 'Make all the pizzas with one move.', eiKaikki: 'Balanced, but not every pizza is ready.', pizzat: 'Make the pizzas!', valitse: 'Choose a level', vihjeNappi: 'Hint',
      eiPizza: 'Balanced, but the pizza isn’t ready. Look at the pizza!', ok: 'Balanced!', pizza: 'Make the pizza!', hyva: 'Well done!',
      vinkki: ['Hint: basic move.', 'Hint: sum move.', 'Hint: difference move.', 'Hint: sum and difference together.'],
      hohto: 'Look at the glowing toppings.', tasoValmis: 'Level {n} done!', loppu: ['Master pizzaiolo!', 'You solved every puzzle.'] },
    de: { boksiTaynna: 'Die Box ist voll!', vihjeellaEi: 'Pizza fertig – mit Tipp gibt es kein Stück.', lukossa: 'Füll die Box der vorigen Stufe', nimi: 'Hilf Basso', taso: 'Stufe', aloita: 'Los', seuraava: 'Nächste Stufe', alusta: 'Von vorn',
      intro: 'Basso braucht Hilfe! Back die Pizza mit einem Zug.',
      kuvaus: ['Grundzug', 'Summenzug', 'Pizza mit zwei Zutaten', 'Differenzzug', 'Zwei Zutaten auf einmal', 'Große Pizzen', 'Summe und Differenz zusammen', 'Viele Pizzen mit einem Zug', 'Vorsicht, Falle!', 'Meisterstufe'],
      kysy: 'Bring die Zutaten der Pizza mit einem Zug auf die Linie.', kysyMonta: 'Eine Pizza kann gebacken werden. Welche?', kysyKaikki: 'Back alle Pizzen mit einem Zug.', eiKaikki: 'Gleichgewicht, aber nicht alle Pizzen werden fertig.', pizzat: 'Back die Pizzen!', valitse: 'Stufe wählen', vihjeNappi: 'Tipp',
      eiPizza: 'Gleichgewicht, aber die Pizza wird nicht fertig. Schau auf die Pizza!', ok: 'Gleichgewicht!', pizza: 'Back die Pizza!', hyva: 'Super!',
      vinkki: ['Tipp: Grundzug.', 'Tipp: Summenzug.', 'Tipp: Differenzzug.', 'Tipp: Summe und Differenz zusammen.'],
      hohto: 'Schau auf die leuchtenden Zutaten.', tasoValmis: 'Stufe {n} geschafft!', loppu: ['Meister-Pizzaiolo!', 'Du hast alle Rätsel gelöst.'] }
  };

  // ---------------------------------------------------------------- Auta Bassoa: pulmat
  // Pelin kaikki 42 pizzaa: 1–4 eri täytettä, täytteiden summa enintään 10.
  var PIZZAT = (function () {
    var out = [];
    (function k(alku, valitut, sm) {
      if (valitut.length) out.push(valitut.slice());
      if (valitut.length === 4) return;
      for (var x = alku; x <= 10 && sm + x <= 10; x++) { valitut.push(x); k(x + 1, valitut, sm + x); valitut.pop(); }
    })(1, [], 0);
    return out;
  })();
  // Kaikki sallitut siirrot: varastosta oikeaan käteen joukko S, linjastolta vasempaan korkeintaan yksi t,
  // ja noppa + t = summa(S). Palauttaa siirrot, joiden jälkeen pizza on kokonaan linjastolla.
  function pulmaRatkaisut(d, lin, pizza) {
    var vars = [], n, out = [];
    for (n = 1; n <= 10; n++) if (lin.indexOf(n) < 0) vars.push(n);
    for (var m = 1; m < (1 << vars.length); m++) {
      var S = [], sm = 0;
      for (var i = 0; i < vars.length; i++) if (m & (1 << i)) { S.push(vars[i]); sm += vars[i]; }
      if (sm > d + 10) continue;
      [0].concat(lin).forEach(function (t) {
        if (sm !== d + t) return;
        var uusi = lin.filter(function (x) { return x !== t; }).concat(S);
        if (pizza.every(function (x) { return uusi.indexOf(x) >= 0; })) out.push({ oikea: S, vasen: t ? [t] : [] });
      });
    }
    return out;
  }
  // siirron tapa: 1 perus, 2 summa, 3 erotus, 4 yhdistelmä
  function siirronTapa(r) { return r.vasen.length ? (r.oikea.length > 1 ? 4 : 3) : (r.oikea.length > 1 ? 2 : 1); }
  // Tasot: 10 tasoa, jokaisella oma pulmavarasto (tyokalut/pulmadata.py), järjestetty vaikeuden mukaan.
  // Vaikeus = houkuttelevat väärät siirrot ennen oikeaa, "oudot" osat (täyte jota mikään pizza ei tarvitse,
  // vähennys linjastolta), siirrettävien tornien määrä ja onko ratkaisuja vain yksi. Jokaisessa varastossa
  // on pizzoja kaikilla kymmenellä täytteellä, jotta tason boksin voi täyttää.
  var PULMADATA = [
    [{ d: 1, lin: [2, 10], pizzat: [[1]] }, { d: 1, lin: [2, 9], pizzat: [[1]] }, { d: 1, lin: [8, 9], pizzat: [[1]] }, { d: 1, lin: [5, 6], pizzat: [[1]] }, { d: 2, lin: [7, 9], pizzat: [[2]] }, { d: 2, lin: [1, 10], pizzat: [[2]] }, { d: 2, lin: [4, 7], pizzat: [[2]] }, { d: 2, lin: [9, 10], pizzat: [[2]] }, { d: 3, lin: [6, 7], pizzat: [[3]] }, { d: 3, lin: [1, 7], pizzat: [[3]] }, { d: 3, lin: [7, 10], pizzat: [[3]] }, { d: 3, lin: [10], pizzat: [[3]] }, { d: 4, lin: [2, 9], pizzat: [[4]] }, { d: 4, lin: [5, 7], pizzat: [[4]] }, { d: 4, lin: [8, 10], pizzat: [[4]] }, { d: 5, lin: [4], pizzat: [[5]] }, { d: 5, lin: [7, 9], pizzat: [[5]] }, { d: 6, lin: [5, 8], pizzat: [[6]] }, { d: 6, lin: [3, 5], pizzat: [[6]] }, { d: 6, lin: [4, 10], pizzat: [[6]] }, { d: 6, lin: [9], pizzat: [[6]] }, { d: 6, lin: [1, 10], pizzat: [[6]] }, { d: 7, lin: [1, 10], pizzat: [[7]] }, { d: 7, lin: [3], pizzat: [[7]] }, { d: 7, lin: [5], pizzat: [[7]] }, { d: 7, lin: [5, 8], pizzat: [[7]] }, { d: 7, lin: [10], pizzat: [[7]] }, { d: 8, lin: [5], pizzat: [[8]] }, { d: 8, lin: [6], pizzat: [[8]] }, { d: 8, lin: [10], pizzat: [[8]] }, { d: 8, lin: [2, 6], pizzat: [[8]] }, { d: 8, lin: [3], pizzat: [[8]] }, { d: 9, lin: [2, 4], pizzat: [[9]] }, { d: 9, lin: [3, 8], pizzat: [[9]] }, { d: 9, lin: [7], pizzat: [[9]] }, { d: 10, lin: [5, 8], pizzat: [[10]] }, { d: 10, lin: [2, 6], pizzat: [[10]] }, { d: 10, lin: [6], pizzat: [[10]] }, { d: 10, lin: [4], pizzat: [[10]] }, { d: 1, lin: [3, 4], pizzat: [[1]] }, { d: 1, lin: [], pizzat: [[1]] }, { d: 2, lin: [1], pizzat: [[2]] }, { d: 2, lin: [], pizzat: [[2]] }, { d: 3, lin: [4], pizzat: [[3]] }, { d: 3, lin: [], pizzat: [[3]] }, { d: 4, lin: [], pizzat: [[4]] }, { d: 4, lin: [1, 6], pizzat: [[4]] }, { d: 4, lin: [2], pizzat: [[4]] }, { d: 5, lin: [], pizzat: [[5]] }, { d: 5, lin: [1, 2], pizzat: [[5]] }, { d: 5, lin: [2, 6], pizzat: [[5]] }, { d: 5, lin: [1], pizzat: [[5]] }, { d: 6, lin: [], pizzat: [[6]] }, { d: 7, lin: [], pizzat: [[7]] }, { d: 8, lin: [], pizzat: [[8]] }, { d: 9, lin: [2], pizzat: [[9]] }, { d: 9, lin: [1], pizzat: [[9]] }, { d: 9, lin: [], pizzat: [[9]] }, { d: 10, lin: [2], pizzat: [[10]] }, { d: 10, lin: [], pizzat: [[10]] }],
    [{ d: 10, lin: [6], pizzat: [[10]] }, { d: 10, lin: [8, 9], pizzat: [[10]] }, { d: 6, lin: [9], pizzat: [[1]] }, { d: 6, lin: [], pizzat: [[1]] }, { d: 7, lin: [7, 10], pizzat: [[1]] }, { d: 4, lin: [2, 6], pizzat: [[1]] }, { d: 9, lin: [6, 8], pizzat: [[2]] }, { d: 10, lin: [], pizzat: [[2]] }, { d: 3, lin: [7, 9], pizzat: [[2]] }, { d: 7, lin: [10], pizzat: [[2]] }, { d: 10, lin: [4, 10], pizzat: [[2]] }, { d: 6, lin: [], pizzat: [[2]] }, { d: 8, lin: [4, 7], pizzat: [[3]] }, { d: 5, lin: [10], pizzat: [[3]] }, { d: 8, lin: [4, 10], pizzat: [[3]] }, { d: 10, lin: [8], pizzat: [[3]] }, { d: 10, lin: [2, 6], pizzat: [[3]] }, { d: 10, lin: [], pizzat: [[4]] }, { d: 6, lin: [1, 8], pizzat: [[4]] }, { d: 5, lin: [6], pizzat: [[4]] }, { d: 10, lin: [7], pizzat: [[4]] }, { d: 9, lin: [], pizzat: [[4]] }, { d: 8, lin: [], pizzat: [[5]] }, { d: 7, lin: [6, 10], pizzat: [[5]] }, { d: 8, lin: [2], pizzat: [[5]] }, { d: 6, lin: [10], pizzat: [[5]] }, { d: 9, lin: [2, 7], pizzat: [[5]] }, { d: 8, lin: [3, 4], pizzat: [[6]] }, { d: 9, lin: [5], pizzat: [[6]] }, { d: 9, lin: [7, 9], pizzat: [[6]] }, { d: 7, lin: [7], pizzat: [[6]] }, { d: 10, lin: [4], pizzat: [[7]] }, { d: 10, lin: [], pizzat: [[7]] }, { d: 10, lin: [5, 9], pizzat: [[7]] }, { d: 8, lin: [8, 9], pizzat: [[7]] }, { d: 9, lin: [6, 10], pizzat: [[7]] }, { d: 9, lin: [6, 10], pizzat: [[8]] }, { d: 9, lin: [6], pizzat: [[8]] }, { d: 9, lin: [2, 7], pizzat: [[8]] }, { d: 10, lin: [1], pizzat: [[8]] }, { d: 9, lin: [10], pizzat: [[8]] }, { d: 10, lin: [3], pizzat: [[9]] }, { d: 10, lin: [3, 5], pizzat: [[9]] }, { d: 10, lin: [6, 8], pizzat: [[9]] }, { d: 10, lin: [7], pizzat: [[9]] }, { d: 10, lin: [2, 5], pizzat: [[9]] }, { d: 9, lin: [1, 9], pizzat: [[10]] }, { d: 3, lin: [], pizzat: [[1]] }, { d: 4, lin: [], pizzat: [[1]] }, { d: 4, lin: [], pizzat: [[3]] }, { d: 5, lin: [], pizzat: [[4]] }, { d: 7, lin: [], pizzat: [[5]] }, { d: 7, lin: [], pizzat: [[6]] }, { d: 8, lin: [], pizzat: [[6]] }, { d: 8, lin: [], pizzat: [[7]] }, { d: 9, lin: [], pizzat: [[8]] }, { d: 10, lin: [], pizzat: [[9]] }, { d: 8, lin: [2], pizzat: [[10]] }, { d: 1, lin: [3, 9], pizzat: [[10]] }, { d: 9, lin: [1, 2], pizzat: [[10]] }],
    [{ d: 8, lin: [1, 2, 5], pizzat: [[2, 8]] }, { d: 10, lin: [2], pizzat: [[10]] }, { d: 10, lin: [1], pizzat: [[10]] }, { d: 10, lin: [1, 2, 4], pizzat: [[10]] }, { d: 10, lin: [1, 4], pizzat: [[10]] }, { d: 10, lin: [1, 2, 3], pizzat: [[10]] }, { d: 10, lin: [2, 3], pizzat: [[10]] }, { d: 4, lin: [2, 10], pizzat: [[1, 2]] }, { d: 8, lin: [4, 5, 6], pizzat: [[1, 5]] }, { d: 9, lin: [5, 6, 9], pizzat: [[1, 6]] }, { d: 10, lin: [2, 3, 5], pizzat: [[1, 2]] }, { d: 9, lin: [5, 9, 10], pizzat: [[1, 9]] }, { d: 7, lin: [5, 8], pizzat: [[1, 5]] }, { d: 10, lin: [5, 7, 10], pizzat: [[2, 5]] }, { d: 9, lin: [3, 4, 6], pizzat: [[2, 4]] }, { d: 8, lin: [8, 9, 10], pizzat: [[2, 8]] }, { d: 9, lin: [1, 9, 10], pizzat: [[1, 2]] }, { d: 10, lin: [1, 4], pizzat: [[2, 4]] }, { d: 7, lin: [3, 4], pizzat: [[3, 6]] }, { d: 4, lin: [2, 7, 9], pizzat: [[2, 3]] }, { d: 7, lin: [1, 8], pizzat: [[1, 3]] }, { d: 5, lin: [2, 3, 8], pizzat: [[3, 4]] }, { d: 8, lin: [3, 9], pizzat: [[1, 3]] }, { d: 9, lin: [2, 3], pizzat: [[3, 4]] }, { d: 7, lin: [4, 9], pizzat: [[4, 5]] }, { d: 6, lin: [4, 8], pizzat: [[4, 5]] }, { d: 7, lin: [1, 6, 10], pizzat: [[4, 6]] }, { d: 3, lin: [4, 7], pizzat: [[1, 4]] }, { d: 5, lin: [4, 5], pizzat: [[2, 4]] }, { d: 7, lin: [2, 7], pizzat: [[2, 4]] }, { d: 5, lin: [5, 6, 7], pizzat: [[3, 5]] }, { d: 9, lin: [5, 10], pizzat: [[3, 5]] }, { d: 9, lin: [1, 3, 6], pizzat: [[3, 5]] }, { d: 6, lin: [5, 7, 9], pizzat: [[2, 5]] }, { d: 5, lin: [5, 7, 8], pizzat: [[3, 5]] }, { d: 10, lin: [1, 5, 8], pizzat: [[4, 5]] }, { d: 7, lin: [2, 7, 8], pizzat: [[2, 6]] }, { d: 7, lin: [4, 9], pizzat: [[4, 6]] }, { d: 7, lin: [2, 6, 7], pizzat: [[4, 6]] }, { d: 8, lin: [1, 7], pizzat: [[1, 6]] }, { d: 9, lin: [6], pizzat: [[4, 6]] }, { d: 10, lin: [2, 6], pizzat: [[1, 6]] }, { d: 3, lin: [4, 6, 7], pizzat: [[1, 7]] }, { d: 8, lin: [7, 9], pizzat: [[2, 7]] }, { d: 6, lin: [4, 7], pizzat: [[1, 7]] }, { d: 9, lin: [7], pizzat: [[3, 7]] }, { d: 10, lin: [1, 3], pizzat: [[1, 8]] }, { d: 7, lin: [3, 6, 8], pizzat: [[2, 8]] }, { d: 6, lin: [8, 10], pizzat: [[2, 8]] }, { d: 9, lin: [2, 3, 6], pizzat: [[2, 8]] }, { d: 4, lin: [2, 4, 8], pizzat: [[1, 8]] }, { d: 8, lin: [3, 5, 9], pizzat: [[1, 9]] }, { d: 7, lin: [3, 4, 9], pizzat: [[1, 9]] }, { d: 3, lin: [7, 9], pizzat: [[1, 9]] }, { d: 6, lin: [9], pizzat: [[1, 9]] }, { d: 8, lin: [6, 9, 10], pizzat: [[1, 9]] }, { d: 7, lin: [2], pizzat: [[1, 2]] }, { d: 5, lin: [7], pizzat: [[2, 7]] }, { d: 4, lin: [7], pizzat: [[3, 7]] }, { d: 3, lin: [9], pizzat: [[1, 9]] }],
    [{ d: 5, lin: [1, 2, 10], pizzat: [[1, 7]] }, { d: 3, lin: [1, 5, 10], pizzat: [[1, 8]] }, { d: 1, lin: [1, 3, 5], pizzat: [[2]] }, { d: 1, lin: [2, 3, 8], pizzat: [[2, 4]] }, { d: 1, lin: [1, 8], pizzat: [[2]] }, { d: 2, lin: [3, 4, 9], pizzat: [[3, 6]] }, { d: 1, lin: [3, 10], pizzat: [[4]] }, { d: 2, lin: [2, 3], pizzat: [[4]] }, { d: 1, lin: [3, 9], pizzat: [[4]] }, { d: 1, lin: [1, 3, 5], pizzat: [[4]] }, { d: 4, lin: [1, 4, 7], pizzat: [[4, 5]] }, { d: 3, lin: [1, 2, 10], pizzat: [[5]] }, { d: 1, lin: [1, 4, 10], pizzat: [[5]] }, { d: 3, lin: [1, 3, 5], pizzat: [[4, 5]] }, { d: 4, lin: [2, 3, 8], pizzat: [[6]] }, { d: 4, lin: [2, 9, 10], pizzat: [[6]] }, { d: 4, lin: [2, 4, 7], pizzat: [[6]] }, { d: 2, lin: [1, 6, 7], pizzat: [[3, 7]] }, { d: 2, lin: [5, 6], pizzat: [[7]] }, { d: 2, lin: [2, 5, 6], pizzat: [[2, 7]] }, { d: 6, lin: [2, 5, 6], pizzat: [[8]] }, { d: 5, lin: [3, 6, 10], pizzat: [[8]] }, { d: 6, lin: [2, 3], pizzat: [[8]] }, { d: 6, lin: [2, 3, 6], pizzat: [[8]] }, { d: 8, lin: [1, 5], pizzat: [[9]] }, { d: 3, lin: [2, 6, 10], pizzat: [[9]] }, { d: 8, lin: [1, 10], pizzat: [[9]] }, { d: 6, lin: [3, 5, 10], pizzat: [[9]] }, { d: 8, lin: [2, 3, 4], pizzat: [[10]] }, { d: 7, lin: [3, 6], pizzat: [[10]] }, { d: 7, lin: [2, 3, 8], pizzat: [[10]] }, { d: 6, lin: [1, 3], pizzat: [[1, 9]] }, { d: 5, lin: [1, 3], pizzat: [[1, 8]] }, { d: 3, lin: [1, 3, 4], pizzat: [[1, 6]] }, { d: 4, lin: [1, 2], pizzat: [[1, 6]] }, { d: 1, lin: [2, 5, 7], pizzat: [[2, 8]] }, { d: 1, lin: [1], pizzat: [[2]] }, { d: 3, lin: [2, 3], pizzat: [[2, 6]] }, { d: 1, lin: [2, 7], pizzat: [[3, 7]] }, { d: 3, lin: [1, 3, 4], pizzat: [[3, 7]] }, { d: 1, lin: [1, 3], pizzat: [[2, 3]] }, { d: 1, lin: [2, 5, 6], pizzat: [[3, 6]] }, { d: 1, lin: [1, 2, 4], pizzat: [[1, 3]] }, { d: 5, lin: [1, 2, 4], pizzat: [[4, 6]] }, { d: 2, lin: [3], pizzat: [[5]] }, { d: 1, lin: [1, 4], pizzat: [[5]] }, { d: 2, lin: [1, 2, 5], pizzat: [[3, 5]] }, { d: 3, lin: [2, 3], pizzat: [[6]] }, { d: 2, lin: [4], pizzat: [[6]] }, { d: 1, lin: [2, 5], pizzat: [[2, 6]] }, { d: 1, lin: [2, 6, 8], pizzat: [[7]] }, { d: 6, lin: [1, 3, 4], pizzat: [[3, 7]] }, { d: 2, lin: [5], pizzat: [[7]] }, { d: 6, lin: [1, 2, 3], pizzat: [[1, 8]] }, { d: 2, lin: [2, 3, 6], pizzat: [[8]] }, { d: 5, lin: [1, 4], pizzat: [[9]] }, { d: 8, lin: [1], pizzat: [[9]] }, { d: 1, lin: [9], pizzat: [[10]] }, { d: 2, lin: [5, 8], pizzat: [[10]] }, { d: 2, lin: [2, 3, 8], pizzat: [[10]] }],
    [{ d: 10, lin: [6, 7, 9], pizzat: [[2, 8]] }, { d: 9, lin: [4, 5, 9], pizzat: [[1, 8]] }, { d: 9, lin: [3, 9, 10], pizzat: [[1, 8]] }, { d: 9, lin: [6], pizzat: [[1, 8]] }, { d: 9, lin: [2, 5, 10], pizzat: [[1, 8]] }, { d: 10, lin: [2, 10], pizzat: [[1, 9]] }, { d: 10, lin: [7], pizzat: [[1, 9]] }, { d: 10, lin: [10], pizzat: [[1, 9]] }, { d: 9, lin: [], pizzat: [[1, 8]] }, { d: 10, lin: [], pizzat: [[1, 9]] }, { d: 10, lin: [2, 4], pizzat: [[1, 9]] }, { d: 10, lin: [4], pizzat: [[1, 9]] }, { d: 6, lin: [4, 9], pizzat: [[10]] }, { d: 9, lin: [1, 5, 6], pizzat: [[10]] }, { d: 10, lin: [2, 4, 8], pizzat: [[1, 3]] }, { d: 9, lin: [4], pizzat: [[1, 5]] }, { d: 10, lin: [4, 10], pizzat: [[1, 3]] }, { d: 8, lin: [4], pizzat: [[1, 5]] }, { d: 10, lin: [1, 10], pizzat: [[2, 3]] }, { d: 10, lin: [6], pizzat: [[2, 5]] }, { d: 6, lin: [7, 8], pizzat: [[2, 3]] }, { d: 9, lin: [8], pizzat: [[3, 4]] }, { d: 8, lin: [9], pizzat: [[3, 4]] }, { d: 10, lin: [5], pizzat: [[1, 3]] }, { d: 6, lin: [8], pizzat: [[1, 3]] }, { d: 8, lin: [5, 7], pizzat: [[3, 4]] }, { d: 9, lin: [6, 8, 9], pizzat: [[2, 4]] }, { d: 8, lin: [5], pizzat: [[1, 4]] }, { d: 7, lin: [3, 9], pizzat: [[2, 4]] }, { d: 9, lin: [1, 7], pizzat: [[2, 4]] }, { d: 10, lin: [6], pizzat: [[4, 5]] }, { d: 10, lin: [6, 7], pizzat: [[3, 5]] }, { d: 10, lin: [6, 8, 10], pizzat: [[1, 5]] }, { d: 10, lin: [3], pizzat: [[1, 5]] }, { d: 10, lin: [1], pizzat: [[2, 5]] }, { d: 9, lin: [3, 7], pizzat: [[2, 6]] }, { d: 9, lin: [5], pizzat: [[1, 6]] }, { d: 10, lin: [8], pizzat: [[3, 6]] }, { d: 10, lin: [5], pizzat: [[1, 6]] }, { d: 10, lin: [9, 10], pizzat: [[1, 7]] }, { d: 10, lin: [5], pizzat: [[2, 7]] }, { d: 10, lin: [3, 5, 10], pizzat: [[1, 7]] }, { d: 10, lin: [8], pizzat: [[2, 7]] }, { d: 1, lin: [3, 9], pizzat: [[10]] }, { d: 3, lin: [3, 7], pizzat: [[10]] }, { d: 7, lin: [], pizzat: [[1, 2]] }, { d: 9, lin: [], pizzat: [[1, 2]] }, { d: 9, lin: [], pizzat: [[2, 4]] }, { d: 6, lin: [], pizzat: [[1, 2]] }, { d: 9, lin: [], pizzat: [[2, 6]] }, { d: 10, lin: [], pizzat: [[2, 5]] }, { d: 6, lin: [], pizzat: [[2, 3]] }, { d: 8, lin: [], pizzat: [[1, 4]] }, { d: 8, lin: [], pizzat: [[2, 5]] }, { d: 10, lin: [], pizzat: [[3, 6]] }, { d: 9, lin: [], pizzat: [[1, 6]] }, { d: 10, lin: [], pizzat: [[2, 7]] }, { d: 10, lin: [], pizzat: [[1, 7]] }, { d: 9, lin: [9], pizzat: [[10]] }, { d: 4, lin: [2, 4, 7], pizzat: [[10]] }],
    [{ d: 10, lin: [4, 7], pizzat: [[10]] }, { d: 10, lin: [2, 5, 9], pizzat: [[10]] }, { d: 10, lin: [1, 5, 8, 9], pizzat: [[10]] }, { d: 10, lin: [2, 3, 7, 9], pizzat: [[10]] }, { d: 10, lin: [8], pizzat: [[10]] }, { d: 10, lin: [1, 2, 3, 5], pizzat: [[10]] }, { d: 10, lin: [3], pizzat: [[1, 3, 5]] }, { d: 10, lin: [2], pizzat: [[1, 2, 4]] }, { d: 9, lin: [4], pizzat: [[1, 3, 4]] }, { d: 10, lin: [1], pizzat: [[1, 2, 3]] }, { d: 6, lin: [6], pizzat: [[1, 2, 6]] }, { d: 7, lin: [7], pizzat: [[1, 2, 7]] }, { d: 9, lin: [1], pizzat: [[1, 2, 4]] }, { d: 6, lin: [4], pizzat: [[2, 3, 4]] }, { d: 8, lin: [5], pizzat: [[1, 3, 5]] }, { d: 8, lin: [6], pizzat: [[1, 3, 6]] }, { d: 7, lin: [3], pizzat: [[2, 3, 4]] }, { d: 6, lin: [4], pizzat: [[1, 3, 4]] }, { d: 9, lin: [1], pizzat: [[1, 3, 4]] }, { d: 8, lin: [5], pizzat: [[1, 4, 5]] }, { d: 8, lin: [4], pizzat: [[1, 4, 5]] }, { d: 6, lin: [5], pizzat: [[2, 3, 5]] }, { d: 9, lin: [2], pizzat: [[1, 2, 5]] }, { d: 6, lin: [5], pizzat: [[1, 2, 5]] }, { d: 10, lin: [2], pizzat: [[1, 2, 5]] }, { d: 10, lin: [2], pizzat: [[1, 2, 6]] }, { d: 9, lin: [3], pizzat: [[1, 3, 6]] }, { d: 8, lin: [2, 6, 7, 8], pizzat: [[1, 3, 6]] }, { d: 7, lin: [6], pizzat: [[1, 2, 6]] }, { d: 9, lin: [6], pizzat: [[1, 3, 6]] }, { d: 6, lin: [7], pizzat: [[1, 2, 7]] }, { d: 7, lin: [3, 7], pizzat: [[1, 2, 7]] }, { d: 6, lin: [5, 7, 8, 9], pizzat: [[1, 2, 7]] }, { d: 9, lin: [7], pizzat: [[1, 2, 7]] }, { d: 10, lin: [2, 4, 7, 10], pizzat: [[2, 3, 4]] }, { d: 10, lin: [2, 3, 7, 10], pizzat: [[2, 3, 5]] }, { d: 10, lin: [3, 6, 9, 10], pizzat: [[1, 3, 6]] }, { d: 10, lin: [5, 6, 8, 10], pizzat: [[2, 8]] }, { d: 8, lin: [6, 8], pizzat: [[2, 8]] }, { d: 8, lin: [5, 7, 8, 10], pizzat: [[1, 8]] }, { d: 10, lin: [8, 9, 10], pizzat: [[1, 9]] }, { d: 9, lin: [1, 5, 6, 7], pizzat: [[1, 2, 6]] }, { d: 9, lin: [1, 5, 8, 10], pizzat: [[1, 4, 5]] }, { d: 8, lin: [2, 7, 9], pizzat: [[1, 2, 7]] }, { d: 7, lin: [3, 5, 6], pizzat: [[2, 3, 5]] }, { d: 10, lin: [3, 5, 9], pizzat: [[1, 3, 5]] }, { d: 9, lin: [1, 5, 6, 8], pizzat: [[1, 3, 6]] }, { d: 10, lin: [3, 5, 6, 8], pizzat: [[2, 3, 5]] }, { d: 10, lin: [1, 7, 8, 9], pizzat: [[1, 2, 7]] }, { d: 10, lin: [4, 8, 9], pizzat: [[2, 8]] }, { d: 10, lin: [3, 8, 9], pizzat: [[2, 8]] }, { d: 10, lin: [6, 8], pizzat: [[2, 8]] }, { d: 10, lin: [4, 8, 9], pizzat: [[1, 9]] }, { d: 6, lin: [5, 7, 9, 10], pizzat: [[1, 9]] }, { d: 6, lin: [5, 7, 9], pizzat: [[1, 9]] }, { d: 10, lin: [2, 4, 9], pizzat: [[1, 9]] }, { d: 10, lin: [9], pizzat: [[1, 9]] }, { d: 10, lin: [6, 7, 8, 9], pizzat: [[1, 3, 6]] }, { d: 10, lin: [7, 9, 10], pizzat: [[1, 2, 7]] }, { d: 9, lin: [1, 5], pizzat: [[1, 4, 5]] }],
    [{ d: 2, lin: [2, 4, 8], pizzat: [[1, 9]] }, { d: 4, lin: [6], pizzat: [[2, 8]] }, { d: 9, lin: [1], pizzat: [[2, 8]] }, { d: 2, lin: [2, 7], pizzat: [[4, 5]] }, { d: 4, lin: [3, 4, 5, 6], pizzat: [[1, 9]] }, { d: 4, lin: [1, 4, 7, 8], pizzat: [[1, 5]] }, { d: 1, lin: [1, 7, 8], pizzat: [[1, 3]] }, { d: 8, lin: [1, 8], pizzat: [[4]] }, { d: 7, lin: [2, 7], pizzat: [[5]] }, { d: 3, lin: [3, 9, 10], pizzat: [[8]] }, { d: 4, lin: [4, 7, 8, 9], pizzat: [[10]] }, { d: 4, lin: [4, 9], pizzat: [[10]] }, { d: 4, lin: [3, 4], pizzat: [[4, 5]] }, { d: 5, lin: [1, 5], pizzat: [[7]] }, { d: 2, lin: [2, 7], pizzat: [[2, 8]] }, { d: 2, lin: [1, 2, 5, 9], pizzat: [[2, 8]] }, { d: 3, lin: [2, 4, 6], pizzat: [[1, 4]] }, { d: 8, lin: [1, 5, 10], pizzat: [[1, 9]] }, { d: 1, lin: [6, 7, 9], pizzat: [[2, 7]] }, { d: 1, lin: [4, 6, 10], pizzat: [[2, 4]] }, { d: 2, lin: [1, 5, 8], pizzat: [[1, 3]] }, { d: 1, lin: [6], pizzat: [[4]] }, { d: 9, lin: [3, 5], pizzat: [[4, 5]] }, { d: 3, lin: [2, 5, 6], pizzat: [[1, 5]] }, { d: 9, lin: [1, 3, 10], pizzat: [[3, 6]] }, { d: 2, lin: [4, 5, 7], pizzat: [[1, 7]] }, { d: 3, lin: [2, 6, 8], pizzat: [[2, 7]] }, { d: 4, lin: [2, 6, 8, 10], pizzat: [[7]] }, { d: 6, lin: [2, 9], pizzat: [[7]] }, { d: 5, lin: [6], pizzat: [[8]] }, { d: 2, lin: [10], pizzat: [[9]] }, { d: 8, lin: [4], pizzat: [[9]] }, { d: 4, lin: [2, 3, 6, 10], pizzat: [[9]] }, { d: 5, lin: [7], pizzat: [[9]] }, { d: 8, lin: [5, 7, 9], pizzat: [[10]] }, { d: 4, lin: [2, 5, 7, 9], pizzat: [[10]] }, { d: 2, lin: [6, 7, 8, 10], pizzat: [[1, 5]] }, { d: 6, lin: [4, 5], pizzat: [[1, 7]] }, { d: 2, lin: [6, 7, 8, 10], pizzat: [[2, 5]] }, { d: 8, lin: [6, 10], pizzat: [[2, 4]] }, { d: 7, lin: [4, 5, 10], pizzat: [[3, 7]] }, { d: 6, lin: [1, 6, 8], pizzat: [[3, 7]] }, { d: 3, lin: [10], pizzat: [[3, 4]] }, { d: 2, lin: [5, 8], pizzat: [[2, 4]] }, { d: 8, lin: [6], pizzat: [[2, 4]] }, { d: 3, lin: [7, 9, 10], pizzat: [[3, 5]] }, { d: 1, lin: [6, 8, 10], pizzat: [[1, 5]] }, { d: 10, lin: [4, 7, 8], pizzat: [[2, 6]] }, { d: 2, lin: [10], pizzat: [[1, 6]] }, { d: 7, lin: [6, 8], pizzat: [[1, 7]] }, { d: 7, lin: [4, 7], pizzat: [[2, 8]] }, { d: 4, lin: [7, 9], pizzat: [[2, 8]] }, { d: 2, lin: [3, 4, 10], pizzat: [[3, 7]] }, { d: 6, lin: [1, 5], pizzat: [[3, 5]] }, { d: 7, lin: [1, 4, 5], pizzat: [[4, 6]] }, { d: 3, lin: [4], pizzat: [[6]] }, { d: 2, lin: [1, 3, 9], pizzat: [[6]] }, { d: 4, lin: [1, 7], pizzat: [[9]] }, { d: 7, lin: [4], pizzat: [[10]] }, { d: 3, lin: [9], pizzat: [[10]] }],
    [{ d: 2, lin: [7], pizzat: [[4], [2, 3]] }, { d: 5, lin: [1, 6, 7], pizzat: [[5], [4, 6], [1, 3]] }, { d: 6, lin: [6, 7], pizzat: [[8], [3, 7]] }, { d: 3, lin: [7, 9], pizzat: [[6], [1, 9], [3]] }, { d: 10, lin: [3, 6, 8], pizzat: [[1, 8], [2], [10]] }, { d: 2, lin: [10], pizzat: [[2, 3], [1, 6]] }, { d: 9, lin: [5, 6, 9], pizzat: [[4, 5], [1]] }, { d: 6, lin: [1, 5, 10], pizzat: [[1, 7], [3]] }, { d: 9, lin: [2, 6, 8], pizzat: [[7], [4, 5], [1, 6]] }, { d: 10, lin: [9], pizzat: [[3, 6], [8], [2]] }, { d: 10, lin: [9], pizzat: [[2, 6], [8], [3]] }, { d: 8, lin: [4, 8, 10], pizzat: [[9], [2, 4]] }, { d: 10, lin: [1, 7, 8], pizzat: [[5], [1, 4]] }, { d: 7, lin: [6, 8], pizzat: [[2, 5], [1, 7]] }, { d: 5, lin: [3, 6, 7], pizzat: [[3, 5], [1, 2], [4, 6]] }, { d: 4, lin: [5, 10], pizzat: [[1, 6], [3, 4]] }, { d: 6, lin: [9], pizzat: [[3, 6], [2, 4]] }, { d: 9, lin: [4, 5, 9], pizzat: [[2, 7], [1, 8]] }, { d: 8, lin: [10], pizzat: [[9], [1]] }, { d: 6, lin: [4, 8, 9], pizzat: [[2, 8], [4, 6]] }, { d: 10, lin: [1, 4, 10], pizzat: [[5], [8]] }, { d: 5, lin: [1, 5, 8], pizzat: [[1, 4], [3, 5]] }, { d: 4, lin: [8, 10], pizzat: [[6], [7]] }, { d: 6, lin: [1, 3, 8], pizzat: [[7], [1, 5]] }, { d: 8, lin: [8, 9], pizzat: [[1, 2], [3, 4], [7]] }, { d: 9, lin: [9], pizzat: [[1], [2, 8], [3, 4]] }, { d: 3, lin: [3, 9, 10], pizzat: [[6], [1], [3, 4]] }, { d: 2, lin: [7, 9], pizzat: [[3, 7], [1], [2]] }, { d: 10, lin: [3, 8], pizzat: [[10], [2, 5]] }, { d: 6, lin: [10], pizzat: [[4], [1, 6]] }, { d: 5, lin: [9, 10], pizzat: [[1], [2], [3]] }, { d: 5, lin: [8, 9, 10], pizzat: [[3], [4, 5]] }, { d: 9, lin: [4], pizzat: [[2], [5]] }, { d: 9, lin: [1, 2, 7], pizzat: [[2, 5], [1, 8]] }, { d: 8, lin: [2, 4], pizzat: [[1], [2, 8]] }, { d: 9, lin: [4], pizzat: [[3], [9]] }, { d: 9, lin: [4, 6], pizzat: [[1, 6], [10]] }, { d: 5, lin: [6, 8, 9], pizzat: [[10], [2]] }, { d: 6, lin: [5, 8, 9], pizzat: [[2, 8], [10]] }, { d: 9, lin: [7, 10], pizzat: [[2, 8], [3]] }, { d: 5, lin: [3, 8, 10], pizzat: [[2, 7], [1, 3]] }, { d: 6, lin: [2, 8], pizzat: [[1, 2], [3, 6]] }, { d: 7, lin: [2, 5, 7], pizzat: [[1, 3], [4, 5]] }, { d: 5, lin: [4, 7, 10], pizzat: [[2, 4], [3, 6]] }, { d: 5, lin: [1, 7, 10], pizzat: [[3, 6], [1, 2]] }, { d: 5, lin: [3, 9], pizzat: [[2, 7], [1, 3]] }, { d: 6, lin: [10], pizzat: [[7], [1, 5]] }, { d: 10, lin: [1, 3, 10], pizzat: [[6], [2, 8]] }, { d: 7, lin: [6, 7, 9], pizzat: [[10], [2], [3, 6]] }, { d: 10, lin: [1, 4, 5], pizzat: [[1, 7], [2]] }, { d: 10, lin: [6, 8], pizzat: [[3, 6], [1, 5]] }, { d: 8, lin: [6], pizzat: [[2], [1, 8]] }, { d: 8, lin: [4, 5], pizzat: [[2, 4], [1, 7]] }, { d: 9, lin: [3, 10], pizzat: [[3, 4], [1, 8]] }, { d: 6, lin: [8], pizzat: [[4], [6], [1]] }, { d: 9, lin: [3], pizzat: [[5], [2, 4]] }, { d: 7, lin: [3, 8, 9], pizzat: [[1, 6], [5]] }, { d: 7, lin: [2, 7, 10], pizzat: [[1, 3], [8]] }, { d: 10, lin: [4, 8], pizzat: [[9], [1, 5]] }, { d: 9, lin: [6], pizzat: [[1, 9], [3]] }],
    [{ d: 3, lin: [4, 9], pizzat: [[10]] }, { d: 5, lin: [1, 6, 8], pizzat: [[10]] }, { d: 7, lin: [2, 6], pizzat: [[10]] }, { d: 6, lin: [1, 7], pizzat: [[10]] }, { d: 7, lin: [2, 5, 6], pizzat: [[10]] }, { d: 9, lin: [1, 3, 8], pizzat: [[2, 5]] }, { d: 9, lin: [4, 5], pizzat: [[1, 3, 4]] }, { d: 10, lin: [3, 4, 6, 7], pizzat: [[1, 2, 6]] }, { d: 7, lin: [5, 9], pizzat: [[4, 6]] }, { d: 9, lin: [4, 6], pizzat: [[1, 2, 6]] }, { d: 8, lin: [4, 5], pizzat: [[2, 7]] }, { d: 9, lin: [3, 6], pizzat: [[2, 8]] }, { d: 9, lin: [4, 5], pizzat: [[2, 8]] }, { d: 7, lin: [2, 5, 10], pizzat: [[1, 9]] }, { d: 6, lin: [3, 7, 10], pizzat: [[1, 9]] }, { d: 6, lin: [5, 8, 10], pizzat: [[1, 2, 6]] }, { d: 7, lin: [5, 8, 10], pizzat: [[1, 3, 6]] }, { d: 10, lin: [3, 4, 9], pizzat: [[1, 2, 6]] }, { d: 5, lin: [6, 7, 9], pizzat: [[1, 2, 5]] }, { d: 8, lin: [6, 8], pizzat: [[1, 2, 4]] }, { d: 8, lin: [6, 8, 10], pizzat: [[1, 2, 4]] }, { d: 6, lin: [6, 10], pizzat: [[1, 2, 4]] }, { d: 10, lin: [3, 4, 8], pizzat: [[1, 2, 6]] }, { d: 7, lin: [3, 7, 9, 10], pizzat: [[1, 2, 6]] }, { d: 6, lin: [5, 8, 10], pizzat: [[1, 2, 7]] }, { d: 9, lin: [4, 9], pizzat: [[1, 2, 5]] }, { d: 7, lin: [1, 6], pizzat: [[2, 4]] }, { d: 7, lin: [1, 6, 9], pizzat: [[1, 4, 5]] }, { d: 9, lin: [2, 3, 6], pizzat: [[1, 3, 5]] }, { d: 10, lin: [1, 5], pizzat: [[1, 2, 7]] }, { d: 8, lin: [3, 9], pizzat: [[2, 7]] }, { d: 3, lin: [4, 8, 9], pizzat: [[2, 7]] }, { d: 6, lin: [2, 9], pizzat: [[1, 8]] }, { d: 5, lin: [3, 6, 7], pizzat: [[1, 8]] }, { d: 3, lin: [5, 10], pizzat: [[1, 8]] }, { d: 4, lin: [2, 5, 10], pizzat: [[1, 9]] }, { d: 7, lin: [2, 8], pizzat: [[1, 9]] }, { d: 6, lin: [2, 3, 10], pizzat: [[1, 9]] }, { d: 8, lin: [6, 9], pizzat: [[1, 2, 3]] }, { d: 9, lin: [4, 10], pizzat: [[1, 3, 6]] }, { d: 7, lin: [8, 10], pizzat: [[1, 4, 5]] }, { d: 5, lin: [6, 8], pizzat: [[1, 3, 4]] }, { d: 5, lin: [2, 4, 9, 10], pizzat: [[1, 3, 6]] }, { d: 7, lin: [5, 8], pizzat: [[2, 3, 4]] }, { d: 6, lin: [4, 8, 9], pizzat: [[1, 2, 6]] }, { d: 7, lin: [2, 5, 7, 10], pizzat: [[1, 3, 6]] }, { d: 8, lin: [4, 8], pizzat: [[1, 3, 6]] }, { d: 5, lin: [6, 7, 9], pizzat: [[2, 3, 4]] }, { d: 6, lin: [7, 8], pizzat: [[1, 3, 6]] }, { d: 8, lin: [3, 6], pizzat: [[1, 2, 4]] }, { d: 7, lin: [2, 7, 8, 9], pizzat: [[1, 4, 5]] }, { d: 7, lin: [3, 7], pizzat: [[1, 2, 5]] }, { d: 5, lin: [2, 7, 8, 9], pizzat: [[1, 3, 6]] }, { d: 6, lin: [3, 5, 10], pizzat: [[1, 2, 7]] }, { d: 5, lin: [4, 8], pizzat: [[1, 8]] }, { d: 8, lin: [1, 2, 10], pizzat: [[1, 9]] }, { d: 2, lin: [6, 7, 8, 9], pizzat: [[1, 2, 6]] }, { d: 10, lin: [3, 5, 7, 10], pizzat: [[1, 3, 4]] }, { d: 8, lin: [5, 6], pizzat: [[1, 2, 5]] }, { d: 6, lin: [3, 7], pizzat: [[10]] }],
    [{ d: 10, lin: [1, 7, 9, 10], pizzat: [[1, 3, 5], [2, 6]] }, { d: 5, lin: [10], pizzat: [[2, 3], [1, 4]] }, { d: 10, lin: [4, 6, 7, 10], pizzat: [[2, 4], [1, 3, 5]] }, { d: 7, lin: [5, 7, 9, 10], pizzat: [[1, 2, 5], [3, 6]] }, { d: 9, lin: [9], pizzat: [[1, 3, 6]] }, { d: 8, lin: [3, 4, 9, 10], pizzat: [[1, 2, 3], [7]] }, { d: 7, lin: [7], pizzat: [[1, 2, 3]] }, { d: 7, lin: [10], pizzat: [[4], [1, 9]] }, { d: 9, lin: [1, 8, 10], pizzat: [[2, 4], [1, 7]] }, { d: 9, lin: [5, 9, 10], pizzat: [[4], [6], [2]] }, { d: 8, lin: [5], pizzat: [[1, 6], [4]] }, { d: 9, lin: [3, 5], pizzat: [[1, 7], [2]] }, { d: 7, lin: [10], pizzat: [[1, 2], [9]] }, { d: 7, lin: [10], pizzat: [[1, 9], [2]] }, { d: 10, lin: [8], pizzat: [[10], [1, 3]] }, { d: 5, lin: [3, 4, 8], pizzat: [[10]] }, { d: 6, lin: [7, 8, 10], pizzat: [[1, 2, 6], [3, 7]] }, { d: 6, lin: [8, 10], pizzat: [[4], [1, 2, 3]] }, { d: 10, lin: [4, 8, 10], pizzat: [[2, 5], [3, 7]] }, { d: 10, lin: [4, 7, 8], pizzat: [[1], [2, 3], [4, 5]] }, { d: 7, lin: [8, 10], pizzat: [[1, 2, 5], [6]] }, { d: 1, lin: [10], pizzat: [[1, 5]] }, { d: 4, lin: [4, 9, 10], pizzat: [[3, 4], [7]] }, { d: 9, lin: [4, 5, 6, 8], pizzat: [[1, 4, 5], [2, 8]] }, { d: 10, lin: [7], pizzat: [[6], [1, 8]] }, { d: 6, lin: [2, 10], pizzat: [[2, 4], [8]] }, { d: 10, lin: [2, 8, 9], pizzat: [[1, 9], [2, 3, 4]] }, { d: 4, lin: [1, 3, 6, 10], pizzat: [[3, 7]] }, { d: 9, lin: [10], pizzat: [[1, 7], [4, 5]] }, { d: 9, lin: [4, 9], pizzat: [[1, 5], [2, 7]] }, { d: 10, lin: [4, 8, 9], pizzat: [[3], [1, 2, 5]] }, { d: 9, lin: [7, 8], pizzat: [[1, 2, 4], [6]] }, { d: 8, lin: [5, 10], pizzat: [[1, 3], [2, 8]] }, { d: 10, lin: [6, 8, 10], pizzat: [[2, 3], [1, 9]] }, { d: 9, lin: [6, 10], pizzat: [[1, 9], [3, 4]] }, { d: 9, lin: [7, 8, 9], pizzat: [[3, 4], [1, 9], [6]] }, { d: 9, lin: [2, 3, 10], pizzat: [[9], [1]] }, { d: 8, lin: [4, 7, 8, 10], pizzat: [[3, 4], [1, 7]] }, { d: 6, lin: [2, 3, 7, 10], pizzat: [[2, 4], [3, 6]] }, { d: 10, lin: [4, 10], pizzat: [[1, 9], [2, 3, 4]] }, { d: 10, lin: [4, 9], pizzat: [[2, 3, 4], [1, 8]] }, { d: 8, lin: [10], pizzat: [[1, 4], [2, 5]] }, { d: 8, lin: [3, 7, 10], pizzat: [[1, 5], [4, 6]] }, { d: 9, lin: [10], pizzat: [[1, 7], [3, 6]] }, { d: 9, lin: [5, 10], pizzat: [[3, 7], [1, 2, 5]] }, { d: 8, lin: [10], pizzat: [[3], [1, 2, 7]] }, { d: 10, lin: [9], pizzat: [[1, 2, 5], [4]] }, { d: 9, lin: [10], pizzat: [[4, 6], [3], [1]] }, { d: 9, lin: [7], pizzat: [[1, 2, 3, 4]] }, { d: 10, lin: [8], pizzat: [[1, 6], [2, 5]] }, { d: 9, lin: [1, 3, 6, 9], pizzat: [[1, 5], [2, 6]] }, { d: 7, lin: [2, 6, 7, 8], pizzat: [[2, 3, 5]] }, { d: 4, lin: [7, 8], pizzat: [[2], [1, 8]] }, { d: 8, lin: [2, 7, 9], pizzat: [[1, 7], [8]] }, { d: 9, lin: [2, 6, 7, 9], pizzat: [[4, 6], [10]] }, { d: 10, lin: [3, 7, 8, 9], pizzat: [[6], [1, 3, 5]] }, { d: 9, lin: [6, 9], pizzat: [[4, 6], [10]] }, { d: 9, lin: [4, 7], pizzat: [[2, 4], [10]] }, { d: 10, lin: [4, 6], pizzat: [[3, 4], [10]] }, { d: 8, lin: [5, 7, 8], pizzat: [[6], [1, 3, 5]] }]
  ];
  function luoPulmat(tasoNro) {
    return PULMADATA[tasoNro].map(function (q) {
      var kohde = [].concat.apply([], q.pizzat).sort(function (a, b) { return a - b; });
      var rat = pulmaRatkaisut(q.d, q.lin, kohde);
      return { d: q.d, lin: q.lin, pizzat: q.pizzat, kohde: kohde, rat: rat, kaikki: q.pizzat.length > 1,
        helpoin: Math.min.apply(null, rat.map(siirronTapa)) };
    });
  }

  // ---------------------------------------------------------------- komponentti
  function Apinavaaka(juuri) {
    var urlKieli = (location.search.match(/[?&]kieli=([a-z]{2})/) || [])[1];
    var kieli = (T[urlKieli] && urlKieli) || juuri.getAttribute('data-kieli') || (document.documentElement.lang || 'fi').slice(0, 2);
    var t = T[kieli] || T.en;
    var vahennaLiike = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var tila = { nro: 0, paikka: {}, lahde: {}, oikea: [], vasen: [] };

    juuri.innerHTML = '';
    juuri.classList.add('av');
    if (juuri.hasAttribute('data-koko')) juuri.classList.add('av--koko');   // oma sivu: koko ruutu ilman korttikehystä

    // --- yläpalkki: Basso (ohjeet) · edistyminen · noppa
    var ylapalkki = el('div', 'av__ylapalkki');
    var infoNappi = el('button', 'av__info');
    infoNappi.type = 'button';
    infoNappi.setAttribute('aria-label', (VINKIT[kieli] || VINKIT.en).valikko);
    // Markon miettivä apina: kasvot ympyrässä, tukka ja kyynärpää tulevat ympyrän yli
    infoNappi.innerHTML = '<img src="' + KANSIO + 'basso-nappi.webp" alt=""><span class="av__info-merkki" aria-hidden="true"><i></i><i></i><i></i></span>';
    var pisteet = el('div', 'av__pisteet');
    var boksiEl = el('div', 'av__boksi');          // Nälkäiset apinat: yhteinen boksi (10 palaa)
    boksiEl.setAttribute('role', 'img');
    var noppaEl = el('button', 'av__noppa');
    noppaEl.type = 'button';
    noppaEl.innerHTML = '<span class="av__d10"></span>';
    var noppa3d = window.Noppa3D(noppaEl.querySelector('.av__d10'), KANSIO + 'noppa/');
    var vihjeNappi = el('button', 'av__vihjenappi');   // pulmapeli: valinnainen vihje (siirtotapa)
    vihjeNappi.type = 'button';
    vihjeNappi.innerHTML = '<img src="' + KANSIO + 'lamppu.webp" alt="">';
    ylapalkki.appendChild(infoNappi); ylapalkki.appendChild(pisteet); ylapalkki.appendChild(vihjeNappi); ylapalkki.appendChild(boksiEl);
    juuri.appendChild(ylapalkki);
    var noppaRivi = el('div', 'av__nopparivi');      // päätoiminto alhaalla keskellä kuin kameran laukaisin: noppa tai Vie
    noppaRivi.appendChild(noppaEl);
    var vieSlot = el('div', 'av__vie-paikka');
    noppaRivi.appendChild(vieSlot);

    // --- näyttämö
    var nayttamo = el('div', 'av__nayttamo');
    nayttamo.style.aspectRatio = W + ' / ' + H;
    function kuva(nimi, tiedosto) {
      var o = OSAT[nimi], i = el('img', 'av__' + nimi);
      i.src = KANSIO + (tiedosto || nimi) + '.webp';
      i.alt = ''; i.draggable = false;
      i.style.left = pros(o[0], W); i.style.top = pros(o[1], H); i.style.width = pros(o[2], W);
      return i;
    }
    var kasiV = kuva('vasen'), kasiO = kuva('oikea');
    [[kasiV, NIVEL_V, 'vasen'], [kasiO, NIVEL_O, 'oikea']].forEach(function (k) {
      var o = OSAT[k[2]];
      k[0].style.transformOrigin = pros(k[1][0] - o[0], o[2]) + ' ' + pros(k[1][1] - o[1], o[3]);
    });
    var lamppuPaalla = kuva('lamppu');
    lamppuPaalla.classList.add('av__lamppu--paalla');
    nayttamo.appendChild(kasiV); nayttamo.appendChild(kasiO);
    nayttamo.appendChild(kuva('vartalo'));
    var kieliEl = kuva('kieli');
    kieliEl.style.transformOrigin = pros(KIELI_NIVEL[0] - OSAT.kieli[0], OSAT.kieli[2]) + ' ' + pros(KIELI_NIVEL[1] - OSAT.kieli[1], OSAT.kieli[3]);
    nayttamo.appendChild(kieliEl);
    nayttamo.appendChild(kuva('saihkeet')); nayttamo.appendChild(kuva('lamppu', 'lamppu-pois')); nayttamo.appendChild(lamppuPaalla);
    var pinoV = el('div', 'av__pino'), pinoO = el('div', 'av__pino');
    var lukuV = el('span', 'av__luku'), lukuO = el('span', 'av__luku');
    [pinoV, pinoO, lukuV, lukuO].forEach(function (x) { nayttamo.appendChild(x); });
    var juhla = el('div', 'av__juhla');
    nayttamo.appendChild(juhla);
    var loppuEl = el('div', 'av__loppu');
    nayttamo.appendChild(loppuEl);
    juuri.appendChild(nayttamo);
    juuri.appendChild(noppaRivi);

    // --- viestirivi (teksti tai nappi)
    var rivi = el('div', 'av__rivi');
    rivi.setAttribute('aria-live', 'polite');
    juuri.appendChild(rivi);

    // --- pizzakortit (Nälkäiset apinat)
    // pizzat kulkevat liukuhihnalla linjaston (kulhojen) alla kohti uunia (liukuhihna ja uuni.psd)
    var kortitEl = el('div', 'av__kortit');
    var tuotanto = el('div', 'av__tuotanto');
    tuotanto.appendChild(kortitEl);
    // hihna ja uuni samassa kehyksessä, jolloin uunin korkeus on aina suhteessa hihnaan
    var hihnaRivi = el('div', 'av__hihnarivi');
    hihnaRivi.innerHTML = '<img class="av__hihna" src="' + KANSIO + 'hihna.webp" alt="">';
    var uuniEl = el('img', 'av__uuni'); uuniEl.src = KANSIO + 'uuni.webp'; uuniEl.alt = '';
    hihnaRivi.appendChild(uuniEl);
    tuotanto.appendChild(hihnaRivi);

    // --- hyllyt
    var hyllyt = el('div', 'av__hyllyt');
    var varastoEl = el('div', 'av__hylly'), linjastoEl = el('div', 'av__hylly av__hylly--linjasto');
    hyllyt.appendChild(linjastoEl); hyllyt.appendChild(varastoEl);   // linjasto pizzojen lähellä, varasto alimpana peukalon alla
    juuri.appendChild(hyllyt);
    // pystynäytössä järjestys: apina linjaston päällä, hyllyt, viesti ja alimpana päätoiminto peukalon alla
    juuri.appendChild(rivi);
    juuri.appendChild(noppaRivi);

    // --- opastuksen väliruutu (siirtotavan esittely / harjoituksen aloitus / loppu)
    var ot = OPAS[kieli] || OPAS.en;
    var opasRuutu = el('div', 'av__opasruutu');
    opasRuutu.hidden = true;
    juuri.appendChild(opasRuutu);

    // --- ohjeikkuna
    var ikkuna = el('div', 'av__ikkuna');
    ikkuna.hidden = true;
    ikkuna.setAttribute('role', 'dialog');
    ikkuna.setAttribute('aria-modal', 'true');
    var vk = VINKIT[kieli] || VINKIT.en, tavat = TAVAT_DL[kieli] || TAVAT_DL.en;
    ikkuna.innerHTML = '<div class="av__ikkuna-sisus"><img class="av__ikkuna-basso" src="' + KANSIO + 'basso.webp" alt="">' +
      '<div class="av__vinkit"></div><h3 class="av__muodot-otsikko">' + vk.muodot + '</h3><div class="av__ikkuna-napit"></div>' +
      '<h3 class="av__muodot-otsikko">' + vk.kieli + '</h3><div class="av__kielet">' + KIELET.map(function (k) {
        return '<button type="button" data-k="' + k[0] + '"' + (k[0] === kieli ? ' class="nyt"' : '') + '>' + k[1] + '</button>'; }).join('') + '</div>' +
      '<button type="button" class="av__sulje" aria-label="' + t.sulje + '">×</button></div>';
    juuri.appendChild(ikkuna);
    var ikkunaNapit = ikkuna.querySelector('.av__ikkuna-napit'), vinkitEl = ikkuna.querySelector('.av__vinkit');
    function nykyMuoto() { return tila.muoto === 'apinat' ? 'apinat' : tila.muoto === 'pulmat' ? 'pulmat' : tila.muoto === 'opas' ? 'harjoitus' : 'vapaa'; }
    function taytaVinkit() {
      var m = nykyMuoto(), h = '<h2>' + vk.nimet[m] + '</h2><ul>';
      vk[m].forEach(function (x) { h += '<li>' + x + '</li>'; });
      h += '</ul>';
      vinkitEl.innerHTML = h;
      Array.prototype.forEach.call(ikkunaNapit.children, function (b) { b.classList.toggle('av__muoto--nyt', b.getAttribute('data-muoto') === m); });
    }
    function nappi(kohde, teksti, luokka, f) {
      var x = el('button', 'nappi' + (luokka ? ' ' + luokka : ''), teksti);
      x.type = 'button'; x.addEventListener('click', f); kohde.appendChild(x);
      return x;
    }
    Array.prototype.forEach.call(ikkuna.querySelectorAll('.av__kielet button'), function (b) {
      b.addEventListener('click', function () {
        // kieli vaihtuu sivun uudelleenlatauksella; pelimuoto säilyy
        var q = new URLSearchParams(location.search);
        q.set('kieli', b.getAttribute('data-k')); q.set('tila', tila.muoto === 'apinat' || tila.muoto === 'pulmat' ? tila.muoto : 'harjoitus');
        location.search = q.toString();
      });
    });
    function avaa() { taytaVinkit(); ikkuna.hidden = false; ikkuna.querySelector('.av__sulje').focus(); }
    function sulje() { ikkuna.hidden = true; infoNappi.focus(); }
    infoNappi.addEventListener('click', avaa);
    ikkuna.querySelector('.av__sulje').addEventListener('click', sulje);
    ikkuna.addEventListener('click', function (e) { if (e.target === ikkuna) sulje(); });
    ikkuna.addEventListener('keydown', function (e) { if (e.key === 'Escape') sulje(); });
    nappi(ikkunaNapit, vk.nimet.harjoitus, 'nappi--toinen', function () { sulje(); aloitaOpas(0); }).setAttribute('data-muoto', 'harjoitus');
    nappi(ikkunaNapit, vk.nimet.vapaa, 'nappi--toinen', function () { sulje(); tila.muoto = 'harjoitus'; aloitaVapaa(); }).setAttribute('data-muoto', 'vapaa');
    nappi(ikkunaNapit, vk.nimet.apinat, 'nappi--toinen', function () { sulje(); aloitaApinat(); }).setAttribute('data-muoto', 'apinat');
    nappi(ikkunaNapit, vk.nimet.pulmat, 'nappi--toinen', function () { sulje(); aloitaPulmat(); }).setAttribute('data-muoto', 'pulmat');

    // --- täytteen tarra: värillinen ympyrä, valkoinen reuna ja Markon täytekuva (tayte/1–10.webp)
    function tarra(luku) {
      var x = el('span', 'av__tarra');
      x.style.background = VARIT[luku - 1];
      x.innerHTML = '<img src="' + KANSIO + 'tayte/' + luku + '.webp" alt="">';
      return x;
    }
    // --- tornin piirto
    function torni(luku, punnus, ilmanTarraa) {
      var d = el('span', 'av__torni');
      for (var i = 0; i < luku; i++) {
        var p = el('i');
        if (punnus) { p.className = 'av__punnus'; p.textContent = i + 1; p.style.setProperty('--i', i); }
        else p.style.background = VARIT[luku - 1];
        d.appendChild(p);
      }
      if (!punnus && !ilmanTarraa) d.appendChild(tarra(luku));   // tornin päällä täytteen tarra kuten oikeissa nappuloissa
      return d;
    }

    // --- noppa
    var pyorii = false;
    // Nälkäiset apinat: kun vuorolla on jo tehty pizza, noppa odottaa – sen heitto aloittaa seuraavan vuoron
    function voiJatkaa() {
      return tila.muoto === 'apinat' && tila.vaihe === 'pizza' && tila.vuoronPizzat > 0 && !tila.valitsee && !tila.paistuu && !tila.loppu;
    }
    function heita() {
      if (!pyorii && voiJatkaa()) { tila.vaihe = 'odota'; tila.ensimmainen = false; uusiKierros(); }
      if (pyorii || tila.heitetty || !tila.tehtava) return;
      pyorii = true;
      noppaEl.classList.remove('av__noppa--odottaa');
      rivi.textContent = '';
      noppa3d.heita(tila.tehtava.noppa, function () {
        pyorii = false; tila.heitetty = true; tila.uusiHeitto = true; tila.heittoAika = Date.now();
        piirra();
        if (tila.muoto === 'opas') ajastaVihje();
        if (tila.muoto === 'apinat' && !tila.ensimmainen && !pizzaMahdollinen()) {
          tila.eiRiita = true; tila.vaihe = 'odota';
          setTimeout(function () { piirra(); setTimeout(lopeta, 2400); }, 1000);
        }
      }, vahennaLiike);
    }
    noppaEl.addEventListener('click', heita);

    // Voiko millään sallitulla siirrolla saada jonkin pelilaudan pizzan täytteen linjastolle?
    function pizzaMahdollinen() {
      var d = tila.tehtava.noppa, lin = [], vars = [], i, n;
      for (n = 1; n <= 10; n++) (tila.paikka[n] === 'linjasto' ? lin : vars).push(n);
      var lahde = tila.havikki ? lin : vars, muu = [0].concat(tila.havikki ? vars : lin);
      for (var m = 1; m < (1 << lahde.length); m++) {
        var S = [], sm = 0;
        for (i = 0; i < lahde.length; i++) if (m & (1 << i)) { S.push(lahde[i]); sm += lahde[i]; }
        for (var k = 0; k < muu.length; k++) {
          var t = muu[k];
          if (sm !== d + t) continue;
          var uusi = tila.havikki ? lin.filter(function (x) { return S.indexOf(x) < 0; }).concat(t ? [t] : [])
                                  : lin.filter(function (x) { return x !== t; }).concat(S);
          if ((tila.laudalla || []).some(function (x) { return uusi.indexOf(x) >= 0; })) return true;
        }
      }
      return false;
    }

    // --- kierrokset
    function nollaa() {
      tila.eiRiita = false;
      tila.oikea = []; tila.vasen = []; tila.lahde = {}; tila.valmis = false; tila.siirretty = false;
      tila.viesti = ''; tila.heitetty = false; tila.vuoronPizzat = 0; tila.vaihe = 'heitto';
      noppa3d.odota(); noppaEl.classList.add('av__noppa--odottaa');
    }
    function aloita(teht) {
      tila.tehtava = teht; tila.havikki = false; tila.paikka = {};
      for (var i = 1; i <= 10; i++) tila.paikka[i] = teht.linjasto.indexOf(i) >= 0 ? 'linjasto' : 'varasto';
      nollaa(); piirra();
    }
    function varastonSumma() {
      var x = 0; for (var i = 1; i <= 10; i++) if (tila.paikka[i] === 'varasto') x += i; return x;
    }
    function uusiKierros() {
      var d = 1 + Math.floor(Math.random() * 10);
      tila.havikki = d > varastonSumma();
      tila.tehtava = { tapa: tila.havikki ? 'H' : 'X', noppa: d };
      nollaa(); piirra();
    }
    function aloitaVapaa() {
      opasRuutu.hidden = true; clearTimeout(vihjeAjastin);
      tila.nro = TEHTAVAT.length; tila.paikka = {};
      for (var i = 1; i <= 10; i++) tila.paikka[i] = 'varasto';
      uusiKierros();
    }

    // --- Nälkäiset apinat: yhteistyöpeli yhden täytteen pizzoilla (10 korttia, 4 pelilaudalla)
    function sekoita(a) {
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; }
      return a;
    }
    function aloitaApinat() {
      opasRuutu.hidden = true; clearTimeout(vihjeAjastin);
      tila.muoto = 'apinat'; tila.nro = TEHTAVAT.length; tila.paikka = {};
      for (var i = 1; i <= 10; i++) tila.paikka[i] = 'varasto';
      tila.pakka = sekoita([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      tila.laudalla = tila.pakka.splice(0, 4);
      tila.boksi = []; tila.ensimmainen = true; tila.loppu = false; tila.valitsee = false;
      loppuEl.classList.remove('on');
      uusiKierros();
    }
    // ---- Auta Bassoa: pulmat (pizza valmiiksi yhdellä siirrolla)
    var pt = PULMA[kieli] || PULMA.en, pulmaVarasto = {}, pulmaAjastin = null;
    vihjeNappi.setAttribute('aria-label', pt.vihjeNappi);
    vihjeNappi.addEventListener('click', function () {
      if (tila.muoto !== 'pulmat' || !tila.heitetty || tila.siirretty) return;
      tila.pVinkki = !tila.pVinkki;
      if (tila.pVinkki) tila.pVihjeKaytetty = true;   // vihjeellä ratkaistu pizza ei anna palaa
      piirra();
    });
    // seuraava taso aukeaa, kun edellisen tason boksi on täynnä (tallentuu selaimeen)
    function lueAvattu() {
      try { return Math.min(PULMADATA.length - 1, Math.max(0, parseInt(localStorage.getItem('apinavaaka-pulmat-avattu'), 10) || 0)); } catch (e) { return 0; }
    }
    function avaaTaso(n) { try { if (n > lueAvattu()) localStorage.setItem('apinavaaka-pulmat-avattu', String(Math.min(n, PULMADATA.length - 1))); } catch (e) {} }
    function lueTaso() {
      try { return Math.min(lueAvattu(), Math.max(0, parseInt(localStorage.getItem('apinavaaka-pulmataso'), 10) || 0)); } catch (e) { return 0; }
    }
    function tallennaTaso(n) { try { localStorage.setItem('apinavaaka-pulmataso', String(n)); } catch (e) {} }
    function tasonPulmat(n) {
      // helpoimmat (eniten ratkaisuja) ensin
      return pulmaVarasto[n] || (pulmaVarasto[n] = luoPulmat(n));
    }
    function pulma() { return tasonPulmat(tila.pTaso)[tila.pNro]; }
    function aloitaPulmat(taso, hiljaa) {
      clearTimeout(vihjeAjastin); clearTimeout(pulmaAjastin);
      tila.muoto = 'pulmat'; tila.pTaso = taso == null ? lueTaso() : Math.min(taso, lueAvattu());
      tila.boksi = []; tila.pelatut = []; tila.loppu = false; tila.valitsee = false;
      tila.pNro = valitsePulma();
      loppuEl.classList.remove('on');
      asetaPulma();
      if (hiljaa) { opasRuutu.hidden = true; return heitaPulma(); }
      // tason voi valita itse: kaikki tasot ovat auki
      var valinta = '<p class="av__tasot-otsikko">' + pt.valitse + '</p><div class="av__tasot">';
      var avattu = lueAvattu();
      for (var i = 0; i < PULMADATA.length; i++) valinta += '<button type="button" data-taso="' + i + '"' + (i === tila.pTaso ? ' class="nyt"' : '') +
        (i > avattu ? ' disabled title="' + pt.lukossa + '"' : '') + '>' + (i + 1) + '</button>';
      valinta += '</div>';
      naytaRuutu('<small>' + pt.nimi + '</small><h2>' + pt.taso + ' ' + (tila.pTaso + 1) + ' / ' + PULMADATA.length + '</h2>' +
        '<p class="av__lainaus">' + pt.kuvaus[tila.pTaso] + '</p>' + (tila.pTaso === 0 ? '<p>' + pt.intro + '</p>' : '') + valinta,
        pt.aloita, function () { opasRuutu.hidden = true; heitaPulma(); });
      Array.prototype.forEach.call(opasRuutu.querySelectorAll('.av__tasot button'), function (b) {
        b.addEventListener('click', function () { var n = +b.getAttribute('data-taso'); tallennaTaso(n); aloitaPulmat(n); });
      });
    }
    // noppa pyörähtää ja lukittuu pulman lukuun: uusi erä alkaa
    function heitaPulma() {
      if (tila.muoto !== 'pulmat' || tila.heitetty || pyorii) return;
      pyorii = true;
      noppaEl.classList.remove('av__noppa--odottaa');
      var teht = tila.tehtava;
      noppa3d.heita(teht.noppa, function () {
        pyorii = false;
        if (tila.muoto !== 'pulmat') return;
        if (tila.tehtava !== teht) return heitaPulma();   // pulma vaihtui kesken pyörimisen
        tila.heitetty = true; tila.uusiHeitto = true; tila.heittoAika = Date.now();
        piirra();
        ajastaPulmaVihje();
      }, vahennaLiike);
    }
    function asetaPulma() {
      var p = pulma();
      tila.paikka = {};
      for (var i = 1; i <= 10; i++) tila.paikka[i] = p.lin.indexOf(i) >= 0 ? 'linjasto' : 'varasto';
      tila.pizzat = p.pizzat.map(function (x) { return x.slice(); });
      tila.laudalla = []; tila.pakka = [];
      tila.tehtava = { tapa: 'P', noppa: p.d }; tila.havikki = false;
      nollaa(); tila.vihje = null; tila.pVinkki = false; tila.pVihjeKaytetty = false;
      piirra();
    }
    function pizzaValmiina(pz) { return pz.every(function (x) { return tila.paikka[x] === 'linjasto'; }); }
    // valmistuisiko vaa'alla olevalla siirrolla jokin pizza?
    function pulmaSyntyy() {
      var kaikki = tila.muoto === 'pulmat' && pulma().kaikki;
      return (tila.pizzat || [])[kaikki ? 'every' : 'some'](function (pz) {
        return pz.every(function (x) { return tila.paikka[x] === 'linjasto' || tila.oikea.indexOf(x) >= 0; });
      });
    }
    // vihjeet: ensin siirtotapa sanana, sitten yhden ratkaisun täytteet hohtavat
    // pulmapelissä ei automaattisia vihjeitä: siirtotavan saa halutessaan lamppunapista
    function ajastaPulmaVihje() { clearTimeout(pulmaAjastin); }
    function pulmaToiminta() { if (tila.muoto === 'pulmat') { tila.vihje = null; ajastaPulmaVihje(); } }
    function pulmaVie() {
      clearTimeout(pulmaAjastin); tila.vihje = null;
      tila.vaihe = 'pizza';
      piirra();
    }
    // Pizzan valmistus: ensin täytteet kulkevat kipoista pizzan kautta varastoon, sitten pizza liukuu uuniin.
    function paista(korttiEl, valmis, tops) {
      if (!korttiEl || vahennaLiike || !korttiEl.animate) return valmis();
      tila.paistuu = true;
      kuljeta(tops || [], korttiEl, function () {
        var a = korttiEl.getBoundingClientRect(), u = uuniEl.getBoundingClientRect(), kz = mittakaava(korttiEl);
        var dx = ((u.left + u.width * 0.3) - (a.left + a.width / 2)) / kz, dy = ((u.top + u.height * 0.82) - (a.top + a.height / 2)) / kz;
        korttiEl.classList.add('av__kortti--paistuu');
        uuniEl.classList.add('av__uuni--paistaa');
        korttiEl.animate([{ transform: 'none', opacity: 1 },
          { transform: 'translate(' + dx * 0.85 + 'px,' + dy * 0.85 + 'px) scale(.6)', opacity: 1, offset: 0.75 },
          { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.25)', opacity: 0 }],
          { duration: 700, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'forwards' }).onfinish = function () {
          tila.paistuu = false;
          setTimeout(function () { uuniEl.classList.remove('av__uuni--paistaa'); }, 500);
          valmis();
        };
      });
    }
    // näytön pikseleiden ja elementin omien CSS-pikseleiden suhde (peli voi olla pienennetty zoomilla)
    function mittakaava(x) { var r = x.getBoundingClientRect(); return (x.offsetWidth && r.width) ? r.width / x.offsetWidth : 1; }
    function kuljeta(tops, korttiEl, valmis) {
      var k = korttiEl.getBoundingClientRect(), kx = k.left + k.width / 2, ky = k.top + k.height / 2;
      var kesken = tops.length + 1;
      function yksiValmis() { if (--kesken === 0) valmis(); }
      tops.forEach(function (n, j) {
        var x = linjastoEl.querySelector('.av__hylly-torni[data-n="' + n + '"]');
        var kohde = varastoEl.querySelectorAll('.av__paikka')[n - 1];
        if (!x || !kohde) return yksiValmis();
        var a = x.getBoundingClientRect(), b = kohde.getBoundingClientRect(), kz = mittakaava(x);
        var nimi = kohde.querySelector('small'), alaraja = nimi ? nimi.getBoundingClientRect().top - 2 : b.bottom;
        var ax = a.left + a.width / 2;
        var t1 = 'translate(' + (kx - ax) / kz + 'px,' + (ky - (a.top + a.height / 2)) / kz + 'px) scale(.85)';
        var t2 = 'translate(' + ((b.left + b.width / 2) - ax) / kz + 'px,' + (alaraja - a.bottom) / kz + 'px)';
        x.style.zIndex = 30;
        x.animate([{ transform: 'none' }, { transform: t1, offset: 0.42 }, { transform: t1, offset: 0.58 }, { transform: t2 }],
          { duration: 1200, delay: j * 160, easing: 'ease-in-out', fill: 'forwards' }).onfinish = yksiValmis;
      });
      yksiValmis();
    }
    function valmistaPulma(i, korttiEl) {
      var pz = tila.pizzat[i];
      if (tila.vaihe !== 'pizza' || !pz || !pizzaValmiina(pz) || tila.paistuu) return;
      paista(korttiEl, function () {
        pz.forEach(function (x) { tila.paikka[x] = 'varasto'; });   // käytetyt täytteet palaavat varastoon
        tila.pizzat.splice(i, 1);
        // kuten oikeassa pelissä: pizzasta saa sen täytteiden palat, mutta boksissa jo olevaa palaa ei uudestaan
        if (!tila.pVihjeKaytetty) {
          tila.uusiPala = pz.filter(function (x) { return tila.boksi.indexOf(x) < 0; });
          tila.uusiPala.forEach(function (x) { tila.boksi.push(x); });
          // sydänpizza (täytteet yhteensä 10): lisäksi yksi vapaavalintainen pala
          if (summa(pz) === 10 && tila.boksi.length < 10) { tila.valitsee = true; return piirra(); }
        }
        jatkaPulma();
      }, pz);
    }
    function jatkaPulma() {
      if (tila.pizzat.some(pizzaValmiina)) return piirra();   // loputkin pizzat odottavat valmistamista
      tila.vaihe = 'odota';
      piirra();
      setTimeout(seuraavaPulma, tila.boksi.length >= 10 ? 900 : 1300);
    }
    // seuraava pulma: mieluiten sellainen, josta saa puuttuvia paloja; vaikeus kasvaa boksin täyttyessä
    function valitsePulma() {
      var pool = tasonPulmat(tila.pTaso), tavoite = Math.min(1, tila.boksi.length / 9), paras = -1, parasArvo = -1e9;
      if (tila.pelatut.length >= pool.length) tila.pelatut = [];
      pool.forEach(function (p, i) {
        if (tila.pelatut.indexOf(i) >= 0) return;
        var uudet = p.kohde.filter(function (x) { return tila.boksi.indexOf(x) < 0; }).length;
        var arvo = (uudet ? 100 + uudet * 3 : 0) - Math.abs(i / Math.max(1, pool.length - 1) - tavoite) * 20 + Math.random() * 4;
        if (arvo > parasArvo) { parasArvo = arvo; paras = i; }
      });
      tila.pelatut.push(paras);
      return paras;
    }
    function pulmaPizzanNapautus(pz, k) {
      if (tila.vaihe !== 'heitto' || tila.siirretty) return;
      if (tila.valmis) return tonaise(k);
      var x = pz.filter(function (n) { return tila.paikka[n] === 'varasto'; })[0];
      if (x) return napauta(x, 'varasto');
      tonaise(k);
    }
    function seuraavaPulma() {
      if (tila.muoto !== 'pulmat') return;
      if (tila.boksi.length < 10) { tila.pNro = valitsePulma(); asetaPulma(); return heitaPulma(); }
      var seur = tila.pTaso + 1, laatikko = '<img class="av__laatikko" src="' + KANSIO + 'laatikko.webp" alt="">';
      if (seur < PULMADATA.length) {
        avaaTaso(seur); tallennaTaso(seur);
        naytaRuutu(laatikko + '<h2>' + pt.tasoValmis.replace('{n}', tila.pTaso + 1) + '</h2><p>' + pt.boksiTaynna + '</p><p>' + pt.taso + ' ' + (seur + 1) + ': ' + pt.kuvaus[seur] + '</p>',
          pt.seuraava, function () { aloitaPulmat(seur, true); });
      } else {
        tallennaTaso(0);
        naytaRuutu(laatikko + '<h2>' + pt.loppu[0] + '</h2><p>' + pt.loppu[1] + '</p>',
          vk.nimet.apinat, function () { opasRuutu.hidden = true; aloitaApinat(); }, [pt.alusta, function () { aloitaPulmat(0); }]);
      }
    }
    function pizzaKuva(tops) {
      return '<span class="av__kortti-pizza' + (tops.length > 1 ? ' av__kortti-pizza--monta' : '') + '">' + tops.map(function (n) {
        return '<i style="background:' + VARIT[n - 1] + '"><img src="' + KANSIO + 'tayte/' + n + '.webp" alt=""></i>';
      }).join('') + '</span>' + (summa(tops) === 10 ? '<span class="av__sydan"><img src="' + KANSIO + 'sydan.webp" alt=""></span>' : '');
    }
    // ---- opastettu harjoitus
    var vihjeAjastin = null, PINO_MAX = 12;   // korkein pino täysikokoisena; korkeammat pienennetään
    function vaihe() { return OPAS_VAIHEET[tila.oVaihe]; }
    function aloitaOpas(nro) {
      tila.muoto = 'opas'; tila.oVaihe = nro; tila.boksi = []; tila.loppu = false; tila.valitsee = false;
      loppuEl.classList.remove('on');
      var v = vaihe();
      // esittely ennen ohjattua kierrosta, harjoituskortti ennen omaa vuoroa
      var tapaNro = { A: 1, B: 2, C: 3 }[v.tapa], tt = ot.tavat[v.tapa];
      if (v.ohjattu) naytaRuutu('<small>' + tapaNro + ' / 3</small><h2>' + tt[0] + '</h2><p class="av__lainaus">' + tt[1] + '</p><p>' + tt[2] + '</p>', ot.aloita, function () { kaynnistaVaihe(); });
      else naytaRuutu('<small>' + tt[0] + '</small><h2>' + ot.harjoitus + ' ' + tapaNro + '</h2><p>' + ot.teeItse[v.tapa] + '</p>', ot.aloita, function () { kaynnistaVaihe(); });
      // lauta valmiiksi taustalle
      asetaVaihe();
    }
    function asetaVaihe() {
      var v = vaihe();
      tila.paikka = {};
      for (var i = 1; i <= 10; i++) tila.paikka[i] = v.linjasto.indexOf(i) >= 0 ? 'linjasto' : 'varasto';
      tila.laudalla = v.kortit.slice(); tila.pakka = [];
      tila.tehtava = { tapa: v.tapa, noppa: v.noppa }; tila.havikki = false;
      nollaa(); tila.vihje = null; piirra();
    }
    function kaynnistaVaihe() { opasRuutu.hidden = true; ajastaVihje(); }
    function naytaRuutu(html, napinTeksti, f, toinen) {
      opasRuutu.innerHTML = '<div class="av__opaskortti">' + html + '<div class="av__opasnapit"></div></div>';
      var np = opasRuutu.querySelector('.av__opasnapit');
      nappi(np, napinTeksti, 'av__vie', f);
      if (toinen) nappi(np, toinen[0], 'nappi--toinen', toinen[1]);
      opasRuutu.hidden = false;
    }
    // ohjatussa vaiheessa sallitut tornit päätellään tilanteesta
    function sallitut() {
      if (tila.muoto !== 'opas') return null;
      var v = vaihe();
      if (!v || !v.ohjattu || !tila.heitetty || tila.siirretty) return null;
      if (v.tapa === 'A') return tila.oikea.length ? { varasto: [], linjasto: [] } : { varasto: [3], linjasto: [] };
      if (v.tapa === 'B') {
        if (!tila.oikea.length) return { varasto: [1, 2], linjasto: [] };
        if (tila.oikea.length === 1) return { varasto: [3 - tila.oikea[0]], linjasto: [] };
        return { varasto: [], linjasto: [] };
      }
      if (!tila.oikea.length) return { varasto: [5], linjasto: [] };
      if (!tila.vasen.length) return { varasto: [], linjasto: [2] };
      return { varasto: [], linjasto: [] };
    }
    // syntyykö siirron jälkeen jokin hihnan pizza? (omassa harjoituksessa siirron pitää tähdätä pizzaan)
    function pizzaSyntyy() {
      return (tila.laudalla || []).some(function (n) {
        return (tila.paikka[n] === 'linjasto' && tila.vasen.indexOf(n) < 0) || tila.oikea.indexOf(n) >= 0;
      });
    }
    function oikeaTapa() {
      var v = vaihe();
      if (v.tapa === 'A') return tila.oikea.length === 1 && !tila.vasen.length;
      // yhdistelmäsiirto (esim. 7 + 2 = 4 + 5) on yhtä aikaa summa- ja erotussiirto: kelpaa kummankin harjoitukseen
      if (v.tapa === 'B') return tila.oikea.length >= 2;
      return tila.vasen.length >= 1;
    }
    // omalla vuorolla: jos 6 sekuntiin ei tapahdu mitään, oikeat tornit alkavat hohtaa
    function ajastaVihje() {
      clearTimeout(vihjeAjastin);
      if (tila.muoto !== 'opas' || vaihe().ohjattu) return;
      tila.vihje = null;
      vihjeAjastin = setTimeout(function () {
        if (tila.muoto !== 'opas' || !opasRuutu.hidden) return;
        if (!tila.heitetty) { tonaise(noppaEl); return ajastaVihje(); }
        if (tila.siirretty) return;
        var rk = vaihe().ratkaisu;
        tila.vihje = rk.oikea.concat(rk.vasen).filter(function (n) { return tila.oikea.indexOf(n) < 0 && tila.vasen.indexOf(n) < 0; });
        piirra();
      }, 6000);
    }
    function opasVie() {
      var v = vaihe();
      tila.vihje = null; clearTimeout(vihjeAjastin);
      tila.vaihe = 'pizza';
      if (!valmistettavat().length) return opasValmis();
      piirra();
    }
    function opasPizza() {
      if (vaihe().ohjattu || !valmistettavat().length) return opasValmis();
      piirra();
    }
    function opasValmis() {
      tila.vaihe = 'odota'; clearTimeout(vihjeAjastin);
      piirra();
      setTimeout(function () {
        if (tila.oVaihe < OPAS_VAIHEET.length - 1) return aloitaOpas(tila.oVaihe + 1);
        tila.oVaihe = OPAS_VAIHEET.length;
        naytaRuutu('<img class="av__laatikko" src="' + KANSIO + 'laatikko.webp" alt=""><h2>' + ot.loppu[0] + '</h2><p>' + ot.loppu[1] + '</p>',
          ot.apinoihin, function () { opasRuutu.hidden = true; aloitaApinat(); }, [ot.uudelleen, function () { aloitaOpas(0); }]);
      }, 1100);
    }

    function valmistettavat() {
      return (tila.laudalla || []).filter(function (n) { return tila.paikka[n] === 'linjasto'; });
    }
    function valmista(n, korttiEl) {
      if (tila.vaihe !== 'pizza' || tila.paikka[n] !== 'linjasto' || tila.paistuu) return;
      // pizza liukuu hihnaa pitkin uuniin, ja vasta sitten pala menee boksiin
      if (korttiEl && !vahennaLiike && korttiEl.animate) return paista(korttiEl, function () { valmista(n); }, [n]);
      tila.paikka[n] = 'varasto';                       // käytetty täyte takaisin varastoon
      if (tila.boksi.indexOf(n) < 0) { tila.boksi.push(n); tila.uusiPala = n; }   // sama pala vain kerran
      var i = tila.laudalla.indexOf(n);
      if (tila.pakka.length) { tila.laudalla[i] = tila.pakka.shift(); tila.uusiKortti = tila.laudalla[i]; } else tila.laudalla.splice(i, 1);
      tila.vuoronPizzat++;
      // sydänpizza (täytteet yhteensä 10): yksi vapaavalintainen lisäpala
      if (tila.muoto === 'opas') return opasPizza();
      if (n === 10 && tila.boksi.length < 10) { tila.valitsee = true; return piirra(); }
      jatkaPizzat();
    }
    function valitseLisapala(k) {
      if (!tila.valitsee || tila.boksi.indexOf(k) >= 0) return;
      tila.boksi.push(k); tila.uusiPala = k; tila.valitsee = false;
      if (tila.muoto === 'pulmat') return jatkaPulma();
      jatkaPizzat();
    }
    function jatkaPizzat() {
      if (tila.boksi.length === 10) { piirra(); return setTimeout(function () { lopeta(); }, 700); }
      if (!valmistettavat().length) return vuoroLoppuu();
      piirra();
    }
    function vuoroLoppuu() {
      tila.vaihe = 'odota';
      piirra();
      if (tila.vuoronPizzat === 0 && !tila.ensimmainen) return setTimeout(lopeta, 900);
      var eiPizzaa = tila.vuoronPizzat === 0;
      tila.ensimmainen = false;
      if (eiPizzaa) { rivi.textContent = t.eiPizzaa; rivi.className = 'av__rivi av__rivi--havikki'; }
      setTimeout(uusiKierros, eiPizzaa ? 1600 : 900);
    }
    function lopeta() {
      tila.loppu = true; tila.vaihe = 'loppu';
      var n = tila.boksi.length, taso = n >= 10 ? 3 : n >= 7 ? 2 : n >= 4 ? 1 : 0;
      loppuEl.innerHTML = '<img class="av__laatikko" src="' + KANSIO + 'laatikko.webp" alt=""><b>' + n + ' / 10</b><span>' + t.tasot[taso] + '</span>';
      nappi(loppuEl, t.uusiPeli, 'av__vie', aloitaApinat);
      loppuEl.classList.toggle('voitto', n >= 10);
      loppuEl.classList.add('on');
      piirra();
    }

    // --- siirrot
    function napauta(n, mista) {
      if (tila.eiRiita) return;
      if (tila.valmis || tila.siirretty || !tila.heitetty) { if (!tila.heitetty) tonaise(noppaEl); return; }
      if (tila.muoto === 'opas') {
        var sal = sallitut();
        if (sal && sal[mista].indexOf(n) < 0) return;      // ohjatussa vaiheessa vain hohtava torni käy
        ajastaVihje();
      }
      pulmaToiminta();
      var oikealle = mista === (tila.havikki ? 'linjasto' : 'varasto');
      if (!oikealle && tila.vasen.length) { tila.viesti = tila.havikki ? '' : t.vainYksi; piirra(); return; }
      tila.lahde[n] = mista;
      if (oikealle) { tila.paikka[n] = 'oikea'; tila.oikea.push(n); }
      else { tila.paikka[n] = 'vasen'; tila.vasen.push(n); }
      tila.viesti = '';
      piirra();
    }
    // Pizzan napautus: tuo pizzan täytteen varastosta apinan käteen (tai palauttaa sen kädestä).
    // Se on vain yksi tapa valita täyte – tasapainon keksiminen jää pelaajalle.
    function pizzanNapautus(n, k) {
      if (tila.vaihe !== 'heitto' || tila.eiRiita) return;
      if (!tila.heitetty) return tonaise(noppaEl);
      if (tila.siirretty) return;
      if (tila.paikka[n] === 'varasto' && !tila.havikki && !tila.valmis) return napauta(n, 'varasto');
      if (tila.paikka[n] === 'oikea' && !tila.valmis) return palauta(n);
      tonaise(k);
    }
    function palauta(n) {
      if (tila.siirretty) return;
      if (tila.muoto === 'opas') { if (vaihe().ohjattu) return; ajastaVihje(); }
      pulmaToiminta();
      if (tila.paikka[n] === 'oikea') tila.oikea.splice(tila.oikea.indexOf(n), 1);
      else tila.vasen = [];
      tila.paikka[n] = tila.lahde[n];
      tila.viesti = '';
      piirra();
    }
    function vieSiirto() {
      tila.oikea.concat(tila.vasen).forEach(function (n) {
        tila.paikka[n] = tila.lahde[n] === 'varasto' ? 'linjasto' : 'varasto';
      });
      tila.siirretty = true;
      if (tila.muoto === 'opas') return opasVie();
      if (tila.muoto === 'pulmat') return pulmaVie();
      if (tila.muoto === 'apinat') {
        tila.vaihe = 'pizza';
        if (!valmistettavat().length) return vuoroLoppuu();
        return piirra();
      }
      var vapaa = tila.nro >= TEHTAVAT.length;
      var party = varastonSumma() === 0;
      if (party) { juhla.textContent = t.party; juhla.classList.add('on'); }
      piirra();
      // seuraava kierros alkaa itsestään
      setTimeout(function () {
        juhla.classList.remove('on');
        if (!vapaa) {
          tila.nro++;
          if (tila.nro < TEHTAVAT.length) aloita(TEHTAVAT[tila.nro]); else aloitaVapaa();
        } else uusiKierros();
      }, party ? 2200 : 1300);
    }
    // pilkkoo viestin lauseiksi: jokainen asia omalle rivilleen (yhtälöt pysyvät lauseen mukana)
    function lauseet(x) {
      return String(x).split(/(?<=[.!?])\s+(?=[A-ZÅÄÖÜ„”“"])/);
    }
    function tonaise(x) {
      x.classList.remove('av--tonaisu'); void x.offsetWidth; x.classList.add('av--tonaisu');
    }

    // --- siirtymäanimaatio (FLIP): torni liukuu vanhasta paikastaan uuteen, oli se sitten
    // hylly, apinan käsi tai toinen hylly. Näin nähdään, minne kukin torni menee.
    function paikat() {
      var m = {};
      Array.prototype.forEach.call(juuri.querySelectorAll('[data-n]'), function (x) {
        var r = x.getBoundingClientRect();
        if (r.width) m[x.getAttribute('data-n')] = r;
      });
      return m;
    }
    function liu(ennen) {
      if (vahennaLiike || !Element.prototype.animate) return;
      Array.prototype.forEach.call(juuri.querySelectorAll('[data-n]'), function (x) {
        var a = ennen[x.getAttribute('data-n')], b = x.getBoundingClientRect();
        if (!a || !b.width) return;
        // alareunan keskikohdasta toiseen, koko skaalautuu (hyllyn torni on pienempi kuin käden)
        var kz = mittakaava(x);
        var dx = ((a.left + a.width / 2) - (b.left + b.width / 2)) / kz, dy = (a.bottom - b.bottom) / kz;
        if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
        var s = a.height / b.height;
        x.classList.add('av__lentaa');
        var an = x.animate([
          { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')', transformOrigin: '50% 100%' },
          { transform: 'none', transformOrigin: '50% 100%' }
        ], { duration: 950, easing: 'cubic-bezier(.3,.7,.3,1)' });   // ei ylilyöntiä: torni pysähtyy suoraan paikalleen
        an.onfinish = function () { x.classList.remove('av__lentaa'); };
      });
    }
    function piirra() {
      var ennen = paikat();
      piirraNyt();
      liu(ennen);
      if (typeof sovitaPian === 'function') sovitaPian();   // korkeus voi muuttua (pelimuoto, tornit)
    }

    // --- piirto
    function piirraNyt() {
      var teht = tila.tehtava, noppa = teht.noppa, heitetty = tila.heitetty;
      var vasenSumma = noppa + summa(tila.vasen), oikeaSumma = summa(tila.oikea);
      var opas = tila.muoto === 'opas', pulmat = tila.muoto === 'pulmat';
      var tasapaino = !tila.siirretty && tila.oikea.length > 0 && vasenSumma === oikeaSumma;
      var eiPizzaa = opas && tasapaino && oikeaTapa() && !vaihe().ohjattu && !pizzaSyntyy();
      var pEiPizza = pulmat && tasapaino && !pulmaSyntyy();
      tila.valmis = tasapaino && (pulmat ? !pEiPizza : (!opas || (oikeaTapa() && !eiPizzaa)));
      var jatko = voiJatkaa();
      juuri.classList.toggle('av--noppapois', !jatko && heitetty && (tila.oikea.length > 0 || tila.vasen.length > 0 || tila.siirretty));
      if (jatko && !noppaEl.classList.contains('av__noppa--odottaa')) { noppa3d.odota(); noppaEl.classList.add('av__noppa--odottaa'); }
      juuri.classList.toggle('av--havikki', heitetty && tila.havikki);

      // edistyminen: kuusi pistettä, vapaassa pelissä piilossa
      var p = '';
      if (tila.nro < TEHTAVAT.length) {
        for (var i = 0; i < TEHTAVAT.length; i++) {
          p += '<i class="' + (i < tila.nro || (i === tila.nro && tila.siirretty) ? 'tehty' : i === tila.nro ? 'nyt' : '') + '"></i>';
        }
      }
      var apinat = tila.muoto === 'apinat', tuot = apinat || opas || pulmat;
      juuri.classList.toggle('av--apinat', tuot);
      juuri.classList.toggle('av--opas', opas);
      juuri.classList.toggle('av--pulmat', pulmat);
      if (pulmat) {
        p = '';
        p = '<b class="av__tasonro">' + pt.taso + ' ' + (tila.pTaso + 1) + '</b>';   // taso yläreunassa; edistyminen näkyy boksissa
      }
      if (opas) {
        p = '';
        for (var oi = 0; oi < OPAS_VAIHEET.length; oi++)
          p += '<i class="' + (oi < tila.oVaihe ? 'tehty' : oi === tila.oVaihe ? 'nyt' : '') + '"></i>';
      }
      if (tuot) {
        // boksi pizzana: 10 siivua, täytetty siivu täytteen värinen
        var sv = '<svg viewBox="-50 -50 100 100" aria-hidden="true"><circle r="47" class="av__boksi-pohja"/>';
        for (var j = 0; j < 10; j++) {
          var a0 = (j * 36 - 90) * Math.PI / 180, a1 = ((j + 1) * 36 - 90) * Math.PI / 180, n0 = j + 1;
          var tay = tila.boksi.indexOf(n0) >= 0;
          sv += '<path class="' + (tay ? 'tay' : '') + (tila.uusiPala === n0 || (tila.uusiPala && tila.uusiPala.indexOf && tila.uusiPala.indexOf(n0) >= 0) ? ' uusi' : '') + '" d="M0 0L' + (44 * Math.cos(a0)).toFixed(2) + ' ' + (44 * Math.sin(a0)).toFixed(2) +
            'A44 44 0 0 1 ' + (44 * Math.cos(a1)).toFixed(2) + ' ' + (44 * Math.sin(a1)).toFixed(2) + 'Z" style="fill:' + (tay ? VARIT[j] : 'transparent') + '"/>';
        }
        sv += '</svg>';
        tila.uusiPala = null;
        boksiEl.innerHTML = sv;
        boksiEl.setAttribute('aria-label', t.boksi + ': ' + tila.boksi.length + '/10');
      }
      pisteet.innerHTML = apinat ? '' : p;

      // pizzakortit
      kortitEl.innerHTML = '';
      kortitEl.classList.toggle('av__kortit--valinta', !!((apinat || pulmat) && tila.valitsee));
      if ((apinat || pulmat) && tila.valitsee) {
        for (var q = 1; q <= 10; q++) if (tila.boksi.indexOf(q) < 0) (function (q) {
          var v = el('button', 'av__valinta');
          v.type = 'button';
          v.setAttribute('aria-label', t.taytteet[q - 1] + ' ' + q);
          v.appendChild(tarra(q));
          v.addEventListener('click', function () { valitseLisapala(q); });
          kortitEl.appendChild(v);
        })(q);
      } else if (pulmat) {
        tila.pizzat.forEach(function (pz, i) {
          var ok = tila.vaihe === 'pizza' && pizzaValmiina(pz);
          var k = el('button', 'av__kortti' + (ok ? ' av__kortti--ok' : '') + (pEiPizza ? ' av__kortti--katso' : ''));
          k.type = 'button';
          k.setAttribute('aria-label', pz.map(function (n) { return t.taytteet[n - 1]; }).join(', '));
          k.innerHTML = pizzaKuva(pz);
          k.addEventListener('click', function () { if (ok) valmistaPulma(i, k); else pulmaPizzanNapautus(pz, k); });
          kortitEl.appendChild(k);
        });
      } else if (tuot) {
        tila.laudalla.forEach(function (n) {
          var ok = tila.vaihe === 'pizza' && tila.paikka[n] === 'linjasto' && (!opas || !vaihe().ohjattu || n === vaihe().pizza);
          var k = el('button', 'av__kortti' + (ok ? ' av__kortti--ok' : '') + (tila.uusiKortti === n ? ' av__kortti--uusi' : '') + (eiPizzaa ? ' av__kortti--katso' : ''));
          k.type = 'button';
          k.setAttribute('aria-label', t.taytteet[n - 1] + ' ' + n);
          k.innerHTML = '<span class="av__kortti-pizza"><i style="background:' + VARIT[n - 1] + '"><img src="' + KANSIO + 'tayte/' + n + '.webp" alt=""></i></span>' +
            (n === 10 ? '<span class="av__sydan"><img src="' + KANSIO + 'sydan.webp" alt=""></span>' : '');   // sydänpizza
          k.addEventListener('click', function () { if (ok) valmista(n, k); else pizzanNapautus(n, k); });
          // pizza on täytteen kolmas "kahva" (torni, kippo, pizza): ohjeen tai vihjeen täyte hohtaa myös pizzassa
          if (opas && tila.heitetty && !tila.siirretty && tila.paikka[n] === 'varasto') {
            var salP = sallitut();
            if ((salP && salP.varasto.indexOf(n) >= 0) || (!salP && tila.vihje && tila.vihje.indexOf(n) >= 0)) k.classList.add('av__paikka--vihje');
          }
          kortitEl.appendChild(k);
        });
        tila.uusiKortti = null;
      }
      noppaEl.disabled = heitetty && !jatko;
      noppaEl.setAttribute('aria-label', heitetty && !jatko ? t.noppa + ': ' + noppa : t.heita);

      // vaaka
      var kulma = 0;
      if (!tila.siirretty && heitetty) {          // punnukset painavat heti heiton jälkeen
        kulma = Math.max(-MAKSIMIKULMA, Math.min(MAKSIMIKULMA, (oikeaSumma - vasenSumma) * 2.2));
      }
      var muunnos = 'rotate(' + kulma + 'deg)';
      kasiV.style.transform = muunnos; kasiO.style.transform = muunnos;
      var pV = kierra(SYMB_V, NIVEL_V, kulma), pO = kierra(SYMB_O, NIVEL_O, kulma);
      [[pinoV, pV, 0], [pinoO, pO, 0], [lukuV, pV, 330], [lukuO, pO, 330]].forEach(function (x) {
        x[0].style.left = pros(x[1][0], W); x[0].style.top = pros(x[1][1] + x[2], H);
      });

      // pinot
      pinoV.innerHTML = ''; pinoO.innerHTML = '';
      if (!tila.siirretty && heitetty) {
        var punn = el('span', 'av__pino-osa av__pino-osa--punnus' + (tila.uusiHeitto ? ' av__uusi' : ''));
        tila.uusiHeitto = false;
        punn.appendChild(torni(noppa, true));
        pinoV.appendChild(punn);
      }
      function pinoNappi(n, kohde) {
        var b = el('button', 'av__pino-osa');
        b.type = 'button'; b.setAttribute('data-n', n);
        b.appendChild(torni(n, false, true));          // vaa'alla pelkkä torni: korkeudet näkyvät suoraan
        b.setAttribute('aria-label', t.taytteet[n - 1] + ' ' + n);
        b.addEventListener('click', function () { palauta(n); });
        kohde.appendChild(b);
      }
      if (!tila.siirretty) {                      // siirron jälkeen tornit ovat jo hyllyillä
        tila.vasen.forEach(function (n) { pinoNappi(n, pinoV); });
        tila.oikea.forEach(function (n) { pinoNappi(n, pinoO); });
      }
      var pinoMax = Math.max(heitetty && !tila.siirretty ? noppa + summa(tila.vasen) : 0, tila.siirretty ? 0 : summa(tila.oikea));
      var perusPala = parseFloat(nayttamo.style.getPropertyValue('--pala')) || 8;
      [pinoV, pinoO].forEach(function (x) {
        if (pinoMax > PINO_MAX) x.style.setProperty('--pala', (perusPala * PINO_MAX / pinoMax).toFixed(2) + 'px');
        else x.style.removeProperty('--pala');
      });

      // luvut symbaalien alla ja ruokalapun merkki
      var nayta = heitetty && !tila.siirretty;
      lukuV.textContent = nayta ? [noppa].concat(tila.vasen).join(' + ') : '';
      lukuO.textContent = nayta && tila.oikea.length ? tila.oikea.join(' + ') : '';
      lukuV.hidden = !lukuV.textContent; lukuO.hidden = !lukuO.textContent;
      var m = !nayta ? '' : vasenSumma === oikeaSumma ? '=' : vasenSumma < oikeaSumma ? '<' : '>';
      kieliEl.style.transform = 'rotate(' + (m ? KIELI_KULMA[m] : 0) + 'deg)';
      juuri.classList.toggle('av--valo', tila.valmis || tila.siirretty);

      // viestirivi: joko lyhyt teksti tai yksi nappi
      rivi.innerHTML = '';
      vieSlot.innerHTML = '';
      rivi.className = 'av__rivi';
      var ov = opas && vaihe(), oteksti = ov ? (ot[ov.tapa] || {}) : null;
      if (pulmat) {
        // oletus: pelaaja osaa pelata, joten ruudulla ei ole ohjeita – vain palaute ja pyydetty vihje
        if (tila.valitsee) { rivi.textContent = t.lisapala; rivi.classList.add('av__rivi--ok'); }
        else if (tila.vaihe === 'odota') { rivi.textContent = tila.pVihjeKaytetty ? pt.vihjeellaEi : pt.hyva; rivi.classList.add('av__rivi--ok'); }
        else if (tila.valmis) nappi(vieSlot, tila.vasen.length ? ot.vie : t.vie, 'av__vie', vieSiirto);
        else if (tila.vaihe === 'heitto' && pEiPizza) lauseet(pulma().kaikki ? pt.eiKaikki : pt.eiPizza).forEach(function (x) { rivi.appendChild(el('span', 'av__lause', x)); });
        else if (tila.vaihe === 'heitto' && tila.pVinkki) rivi.textContent = pt.vinkki[pulma().helpoin - 1];
      } else if (opas && !ov) {
        rivi.textContent = '';
      } else if (opas && tila.vaihe === 'pizza') {
        lauseet(ov.ohjattu ? oteksti.pizza : ot.pizzaItse).forEach(function (x) { rivi.appendChild(el('span', 'av__lause', x)); });
        rivi.classList.add('av__rivi--ok');
      } else if (opas && tila.vaihe === 'odota') {
        rivi.textContent = t.hyva; rivi.classList.add('av__rivi--ok');
      } else if (opas && !heitetty) {
        rivi.textContent = t.heita;
      } else if (opas && tila.valmis) {
        lauseet(ov.ohjattu ? oteksti.ok : ot.itseOk).forEach(function (x) { rivi.appendChild(el('span', 'av__rivi-teksti', x)); });
        nappi(vieSlot, ov.tapa === 'C' ? ot.vie : t.vie, 'av__vie', vieSiirto);   // erotussiirrossa tornit menevät kahteen suuntaan
        rivi.classList.add('av__rivi--ok');
      } else if (opas) {
        var viesti, alku = '';
        if (!tila.oikea.length && !tila.vasen.length) alku = ot.nopasta.replace(/\{d\}/g, noppa);
        if (eiPizzaa) viesti = ot.eiPizzaa;
        else if (tasapaino) viesti = ot.vaara[ov.tapa];
        else if (!ov.ohjattu) viesti = tila.vihje && tila.vihje.length ? ot.vihje : ot.teeItse[ov.tapa] + ' ' + ot.katso;
        else if (ov.tapa === 'B' && tila.oikea.length === 1) viesti = oteksti.puuttuu.replace('{p}', noppa - oikeaSumma);
        else if (ov.tapa === 'C' && tila.oikea.length) viesti = oteksti.liikaa;
        else viesti = oteksti.kysy;
        if (alku) rivi.appendChild(el('span', 'av__rivi-alku', alku));
        lauseet(viesti).forEach(function (x) { rivi.appendChild(el('span', 'av__lause', x)); });
      } else if (apinat && tila.valitsee) {
        rivi.textContent = t.lisapala; rivi.classList.add('av__rivi--ok');
      } else if (apinat && tila.vaihe === 'pizza') {
        // pizzan saa jättää odottamaan, kun vuorolla on jo tehty vähintään yksi
        rivi.textContent = tila.vuoronPizzat > 0 ? t.taiHeita : t.valmista; rivi.classList.add('av__rivi--ok');
      } else if (apinat && tila.eiRiita) {
        rivi.textContent = t.eiRiita; rivi.classList.add('av__rivi--havikki');
      } else if (apinat && (tila.vaihe === 'odota' || tila.vaihe === 'loppu')) {
        rivi.textContent = tila.vaihe === 'odota' && tila.vuoronPizzat ? t.hyva : '';
        if (tila.vuoronPizzat) rivi.classList.add('av__rivi--ok');
      } else if (tila.valmis) {
        rivi.textContent = ot.itseOk; rivi.classList.add('av__rivi--ok');
        nappi(vieSlot, (tila.havikki ? t.vieV : t.vie), 'av__vie' + (tila.havikki ? ' av__vie--varasto' : ''), vieSiirto);
      } else if (tila.siirretty) {
        rivi.textContent = t.hyva; rivi.classList.add('av__rivi--ok');
      } else if (!heitetty) {
        rivi.textContent = t.heita;
      } else {
        rivi.textContent = tila.viesti || t.vihjeet[teht.tapa];
        if (tila.havikki) rivi.classList.add('av__rivi--havikki');
      }

      // hyllyt
      [['varasto', varastoEl, t.varasto], ['linjasto', linjastoEl, t.linjasto]].forEach(function (h) {
        var nimi = h[0], kohde = h[1], hs = 0;
        for (var q = 1; q <= 10; q++) if (tila.paikka[q] === nimi) hs += q;
        kohde.innerHTML = '<span class="av__hylly-nimi">' + h[2] + ' <b>' + hs + '</b></span>';
        var paikat = el('div', 'av__paikat');
        for (var n = 1; n <= 10; n++) {
          var paikka = el('div', 'av__paikka');
          var kulho = null;
          if (nimi === 'linjasto') {
            // linjasto = täytekulhot (Markon säiliö.psd: tausta + etuala): torni seisoo kulhon sisällä
            kulho = el('div', 'av__kulho');
            kulho.innerHTML = '<img class="av__kulho-takana" src="' + KANSIO + 'kulho/tausta.webp" alt="">';
            paikka.appendChild(kulho);
          }
          if (kulho && tila.paikka[n] === 'varasto') {
            // tyhjän kulhon napautus hakee täytteen varastosta apinan käteen
            (function (n) { paikka.addEventListener('click', function () { napauta(n, 'varasto'); }); })(n);
            paikka.classList.add('av__paikka--kulho');
            if (opas || pulmat) {
              var salK = sallitut();
              var hintti = !salK && !tila.siirretty && tila.vihje;
              if ((salK && salK.varasto.indexOf(n) >= 0) || (hintti && tila.vihje.indexOf(n) >= 0)) paikka.classList.add('av__paikka--vihje');
              else if (salK || hintti) paikka.classList.add('av__paikka--hamara');   // muut kulhot himmenevät kuten varaston täytteet
            }
          } else if (kulho && (tila.paikka[n] === 'oikea' || tila.paikka[n] === 'vasen') && !tila.siirretty) {
            // täyte on apinan kädessä: kulhon napautus vie siirron linjastolle (kun tasapaino), muuten palauttaa täytteen
            (function (n) { paikka.addEventListener('click', function () { if (tila.valmis) vieSiirto(); else palauta(n); }); })(n);
            paikka.classList.add('av__paikka--kulho');
            if (tila.valmis && tila.lahde[n] === 'varasto') paikka.classList.add('av__paikka--vihje');   // kulho kutsuu täytettä kotiin
          }
          if (tila.paikka[n] === nimi) {
            var b = el('button', 'av__hylly-torni');
            b.type = 'button'; b.setAttribute('data-n', n);
            b.appendChild(torni(n));
            b.setAttribute('aria-label', t.taytteet[n - 1] + ' ' + n);
            b.title = t.taytteet[n - 1];
            // koko sarake on kosketusalue, ei vain pieni torni (napin klikkaus kuplii sarakkeeseen)
            (function (n, nimi) { paikka.addEventListener('click', function () { napauta(n, nimi); }); })(n, nimi);
            paikka.classList.add('av__paikka--torni');
            if (opas || pulmat) {
              var sal = sallitut();
              if (sal) {
                if (sal[nimi].indexOf(n) >= 0) paikka.classList.add('av__paikka--vihje');
                else if (nimi === 'varasto') paikka.classList.add('av__paikka--himmea');   // linjaston täytteet pysyvät näkyvissä
              } else if (!tila.siirretty && tila.vihje && tila.vihje.length && tila.vaihe !== 'pizza') {
                // oman vuoron vihje: oikeat hohtavat, muut himmenevät (mutta ovat yhä napautettavia)
                paikka.classList.add(tila.vihje.indexOf(n) >= 0 ? 'av__paikka--vihje' : 'av__paikka--hamara');
              }
            }
            if (tila.siirretty || tila.loppu) b.disabled = true;
            (kulho || paikka).appendChild(b);
          } else paikka.classList.add('av__paikka--tyhja');
          if (kulho) {
            var etu = el('img', 'av__kulho-edessa'); etu.src = KANSIO + 'kulho/' + n + '.webp'; etu.alt = '';
            kulho.appendChild(etu);
          } else paikka.appendChild(el('small', null, String(n)));
          paikat.appendChild(paikka);
        }
        kohde.appendChild(paikat);
        if (nimi === 'linjasto') kohde.appendChild(tuotanto);   // hihna ja uuni kuuluvat linjastoon
      });
    }

    function mitoita() {
      var u = nayttamo.clientWidth / W;
      nayttamo.style.setProperty('--pala', Math.max(6, Math.round(88 * u)) + 'px');
      nayttamo.style.setProperty('--leveys', Math.round(400 * u) + 'px');
    }
    if (window.ResizeObserver) new ResizeObserver(mitoita).observe(nayttamo);
    window.addEventListener('resize', mitoita);
    mitoita();

    // Omalla sivulla (data-koko) peli kutistetaan mahtumaan näkyvään alueeseen, kun selaimen
    // osoite- ja välilehtipalkit vievät tilaa (erityisesti puhelin poikittain).
    var sovitusAjastin = null;
    // alareunan turva-alue (esim. Safarin kelluva työkalupalkki tai kotipalkki) mitataan apuelementillä
    var alaMitta = el('div');
    alaMitta.style.cssText = 'position:fixed;left:0;bottom:0;width:0;visibility:hidden;pointer-events:none;height:env(safe-area-inset-bottom,0px)';
    document.body.appendChild(alaMitta);
    function sovita() {
      if (!juuri.classList.contains('av--koko')) return;
      juuri.style.zoom = ''; juuri.style.width = '';
      var vv = window.visualViewport, kork = (vv ? vv.height : window.innerHeight) - alaMitta.offsetHeight;
      var yla = juuri.getBoundingClientRect().top + (window.scrollY || 0);
      var ala = Math.max(0, document.documentElement.scrollHeight - (juuri.getBoundingClientRect().bottom + (window.scrollY || 0)));   // sivun alamarginaali
      var tarve = juuri.offsetHeight, tila_ = kork - Math.max(0, yla) - ala - 2;
      var z = Math.min(1, tila_ / tarve);
      if (z >= 0.995) return;
      // Peli pienennetään kokonaisena, jotta koko pelilauta mahtuu ruudulle ilman vieritystä.
      // Pystyssä leveys lukitaan ensin, muuten leveyteen sidottu näyttämö kasvaisi takaisin.
      if (window.innerWidth <= window.innerHeight) juuri.style.width = juuri.offsetWidth + 'px';
      juuri.style.zoom = Math.max(0.5, z).toFixed(3);
    }
    function sovitaPian() { clearTimeout(sovitusAjastin); sovitusAjastin = setTimeout(sovita, 120); }
    window.addEventListener('resize', sovitaPian);
    window.addEventListener('orientationchange', sovitaPian);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', sovitaPian);
    setTimeout(sovita, 300);
    if (vahennaLiike) juuri.classList.add('av--ei-liiketta');
    var alkuTila = juuri.getAttribute('data-tila');
    if (alkuTila === 'apinat') aloitaApinat(); else if (alkuTila === 'pulmat') aloitaPulmat(); else aloitaOpas(0);
  }

  function kaynnista() {
    Array.prototype.forEach.call(document.querySelectorAll('.apinavaaka'), function (j) {
      if (!j.__av) { j.__av = true; Apinavaaka(j); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kaynnista);
  else kaynnista();
})();
