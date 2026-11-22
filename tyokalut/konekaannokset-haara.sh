#!/usr/bin/env bash
# Konekäännösten oma haara `konekaannokset` (Marko 16.11.2026: ei Markon toimia,
# käännösajo ei kirjoita main-haaraan). Haarassa on vain konekäännösten tiedostot
# samoilla poluilla kuin repossa:
#   sisalto/konekaannos/<koodi>.json
#   julkinen/pdf/pizza-love-card-game-rules-<koodi>.pdf
#   julkinen/kuvat/liput/<koodi>.svg (jos lippu tehtiin)
#   konekaannos-jono.json           (tilaukset joita ei ole vielä toimitettu)
#
# ⚠️ Jono on repon JUURESSA eikä sisalto/konekaannos/issa, jossa jokainen
# *.json on yksi kieli — siellä se olisi näyttänyt kieleltä nimeltä «jono».
# Ks. tyokalut/jono.py.
#
#   hae                      kopioi haaran tiedostot työpuuhun (ennen kokoamista)
#   tallenna "<koodit>" <syy> kopioi koodien tiedostot haaraan, commit ja push
set -euo pipefail
HAARA=konekaannokset
KK="$(mktemp -d)/kk"

avaa() {
  # Aiemman vaiheen (hae) työpuu voi vielä varata haaran → vapautetaan ensin
  for vanha in $(git worktree list --porcelain | sed -n 's/^worktree //p' | tail -n +2); do
    git worktree remove --force "$vanha" 2>/dev/null || true
  done
  git worktree prune
  if git ls-remote --exit-code --heads origin "$HAARA" >/dev/null 2>&1; then
    git fetch -q origin "+refs/heads/$HAARA:refs/remotes/origin/$HAARA"
    git worktree add -q -B "$HAARA" "$KK" "origin/$HAARA"
  else
    git worktree add -q --orphan -b "$HAARA" "$KK"
  fi
}

case "${1:-}" in
  hae)
    if git ls-remote --exit-code --heads origin "$HAARA" >/dev/null 2>&1; then
      avaa
      mkdir -p sisalto/konekaannos julkinen/pdf julkinen/kuvat/liput
      cp -f "$KK"/sisalto/konekaannos/*.json sisalto/konekaannos/ 2>/dev/null || true
      cp -f "$KK"/julkinen/pdf/*.pdf julkinen/pdf/ 2>/dev/null || true
      cp -f "$KK"/julkinen/kuvat/liput/*.svg julkinen/kuvat/liput/ 2>/dev/null || true
      cp -f "$KK"/konekaannos-jono.json . 2>/dev/null || true
      echo "Konekäännökset haarasta: $(ls "$KK"/sisalto/konekaannos 2>/dev/null | tr '\n' ' ')"
      git worktree remove --force "$KK"
    else
      echo "Haaraa $HAARA ei vielä ole — käytetään main-haaran konekäännöksiä."
    fi
    ;;
  tallenna)
    KOODIT="$2"; SYY="${3:-}"
    avaa
    mkdir -p "$KK/sisalto/konekaannos" "$KK/julkinen/pdf" "$KK/julkinen/kuvat/liput"
    # Ensimmäisellä kerralla mukaan myös main-haarassa jo olevat konekäännökset
    for j in sisalto/konekaannos/*.json; do
      k=$(basename "$j" .json)
      KOODIT="$KOODIT $k"
    done
    # Tilausjono mukaan aina, myös kun yhtään arkkia ei syntynyt: se on se
    # tiedosto joka muistaa kääntämättä jääneen kielen seuraavaan ajoon.
    if [ -f konekaannos-jono.json ]; then cp -f konekaannos-jono.json "$KK/"; fi
    for k in $(echo $KOODIT | tr ' ' '\n' | sort -u); do
      cp -f "sisalto/konekaannos/$k.json" "$KK/sisalto/konekaannos/"
      pdf=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['kielet']['tiedosto'])" "sisalto/konekaannos/$k.json")
      [ -f "julkinen/pdf/$pdf" ] && cp -f "julkinen/pdf/$pdf" "$KK/julkinen/pdf/"
      [ -f "julkinen/kuvat/liput/$k.svg" ] && cp -f "julkinen/kuvat/liput/$k.svg" "$KK/julkinen/kuvat/liput/"
    done
    cd "$KK"
    git add -A
    if git diff --cached --quiet; then echo "Ei muutoksia."; cd - >/dev/null; git worktree remove --force "$KK"; exit 0; fi
    git -c user.name="pizzalove-konekaannos" -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
      commit -q -m "Konekäännös: $SYY (ei tarkastettu)"
    git push -q origin "$HAARA"
    echo "Tallennettu haaraan $HAARA: $(git log --oneline -1)"
    cd - >/dev/null
    git worktree remove --force "$KK"
    ;;
  *) echo "käyttö: $0 hae | tallenna \"<koodit>\" <syy>"; exit 2 ;;
esac
