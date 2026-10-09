# Auta Bassoa -pulmapelin pulmat: arpoo tilanteita, laskee jokaiselle vaikeuden ja valitsee
# kuhunkin 12 tasoon viisi pulmaa helpoimmasta vaikeimpaan. Tulos: pulmadata.json, joka
# upotetaan apinavaaka.js:n PULMADATA-taulukkoon.
from itertools import combinations as C
import random, math, json
PIZZAT=[c for k in range(1,5) for c in C(range(1,11),k) if sum(c)<=10]
def siirrot(d,L):
    V=[x for x in range(1,11) if x not in L]; out=[]
    for k in range(1,len(V)+1):
        for S in C(V,k):
            for t in [0]+list(L):
                if sum(S)==d+t: out.append((frozenset(S),t))
    return out
def tapa(S,t): return (4 if len(S)>1 else 3) if t else (2 if len(S)>1 else 1)
def arvioi(d,L,piz):
    L=set(L); tarve=set().union(*map(set,piz)); puuttuu=tarve-L
    kaikki=siirrot(d,L)
    ok=lambda S,t: all(set(p)<=((L-{t})|S) for p in piz)
    key=lambda m:(len(m[0]-tarve)+(1 if m[1] else 0)+(2 if m[1] in tarve else 0), -len(m[0]&puuttuu), len(m[0]))
    jarj=sorted(kaikki,key=key)
    rat=[m for m in jarj if ok(*m)]
    if not rat: return None
    i=jarj.index(rat[0]); S,t=rat[0]
    oudot=len(S-tarve)+(1 if t else 0)
    D=math.log2(1+i)*2 + oudot*2 + (len(S)+(1 if t else 0))*0.5 + (1.5 if len(rat)==1 else 0)
    return dict(D=round(D,1),ansat=i,oudot=oudot,ratk=len(rat),helpoin=min(tapa(*m) for m in rat),puuttuu=len(puuttuu))
def arvo_pizzat(rnd,n,koot):
    piz=[]
    while len(piz)<n:
        p=rnd.choice([p for p in PIZZAT if len(p) in koot])
        if any(set(p)&set(q) for q in piz): continue
        piz.append(p)
    return piz
# perus = tason aihe (siirtotapa ym.), D = vaikeusikkuna
TASOT=[
 dict(n=1,koot=[1],lin=(0,2),perus=lambda a:a['helpoin']==1,D=(0,2)),
 dict(n=1,koot=[1],lin=(0,2),perus=lambda a:a['helpoin']==2,D=(0,5)),
 dict(n=1,koot=[2],lin=(1,3),perus=lambda a:a['puuttuu']==1 and a['helpoin']<=2,D=(1,5)),
 dict(n=1,koot=[1,2],lin=(1,3),perus=lambda a:a['helpoin']==3 and a['puuttuu']==1,D=(3,6)),
 dict(n=1,koot=[2],lin=(0,3),perus=lambda a:a['puuttuu']==2 and a['helpoin']==2,D=(3,7)),
 dict(n=1,koot=[3],lin=(1,4),perus=lambda a:a['helpoin']<=2,D=(5,9)),
 dict(n=1,koot=[1,2],lin=(1,4),perus=lambda a:a['helpoin']==4,D=(5,9)),
 dict(n=(2,3),koot=[1,2],lin=(0,3),perus=lambda a:a['oudot']>=1,D=(7,12)),
 dict(n=1,koot=[2,3],lin=(2,4),perus=lambda a:a['ansat']>=3 and a['ratk']<=2,D=(9,12.5)),
 dict(n=None,koot=[1,2,3,4],lin=(1,4),perus=lambda a:a['ratk']==1,D=(12.5,99)),
]
PER_TAYTE=6
def hae(T,ti,x,koot,kayta_D,tarve,nahty,kayta_perus=True):
    rnd=random.Random(900+ti*31+x*7+len(koot)*1000+kayta_D); out=[]; tr=0
    while len(out)<tarve and tr<120000:
        tr+=1
        n=T['n'] if isinstance(T['n'],int) else (rnd.choice(T['n']) if T['n'] else rnd.choice([1,2,2,3]))
        piz=arvo_pizzat(rnd,n,koot)
        if not any(x in p for p in piz) or sum(map(len,piz))>6: continue
        d=rnd.randint(1,10); L=sorted(rnd.sample(range(1,11),rnd.randint(*T['lin'])))
        if any(set(p)<=set(L) for p in piz): continue
        a=arvioi(d,L,piz)
        if not a or (kayta_perus and not T['perus'](a)): continue
        if kayta_D and not (T['D'][0]<=a['D']<=T['D'][1]): continue
        avain=(d,tuple(L),tuple(sorted(piz)))
        if avain in nahty: continue
        nahty.add(avain); out.append((a['D'],d,L,[list(p) for p in piz]))
    return out
data=[]
for ti,T in enumerate(TASOT):
    nahty=set(); val=[]; jousto={}
    for x in range(1,11):
        loydetyt=[]
        for koot,kD,kP in [(T['koot'],True,True),([1,2,3,4],True,True),([1,2,3,4],False,True),([1,2,3,4],True,False),([1,2,3,4],False,False)]:
            loydetyt+=hae(T,ti,x,koot,kD,PER_TAYTE-len(loydetyt),nahty,kP)
            if len(loydetyt)>=3: break
            jousto[x]=('koko' if kD else 'koko+D')+('' if kP else '+aihe')
        val+=loydetyt
    # Sydänpizza (summa 10) antaa lisäpalan, joten sen pulmat ovat tason vaikeimmasta neljänneksestä
    # ja niissä on enintään kaksi ratkaisua.
    sydan=lambda v:any(sum(p)==10 for p in v[3])
    tavalliset=sorted(v[0] for v in val if not sydan(v))
    kynnys=tavalliset[int(len(tavalliset)*0.75)] if tavalliset else 0
    def vahva(v):
        a=arvioi(v[1],v[2],v[3]); return a['D']>=kynnys and a['ratk']<=2
    poistetut=[v for v in val if sydan(v) and not vahva(v)]
    val=[v for v in val if not sydan(v) or vahva(v)]
    lisat=[]; rnd=random.Random(4242+ti); tr=0
    while len(lisat)<4 and tr<300000:
        tr+=1
        n=T['n'] if isinstance(T['n'],int) else (rnd.choice(T['n']) if T['n'] else rnd.choice([1,2,2,3]))
        piz=arvo_pizzat(rnd,n,T['koot'] if tr<150000 else [1,2,3,4])
        if not any(sum(p)==10 for p in piz) or sum(map(len,piz))>6: continue
        d=rnd.randint(1,10); L=sorted(rnd.sample(range(1,11),rnd.randint(*T['lin'])))
        if any(set(p)<=set(L) for p in piz): continue
        a=arvioi(d,L,piz)
        if not a or not T['perus'](a) or a['D']<kynnys or a['ratk']>2: continue
        avain=(d,tuple(L),tuple(sorted(piz)))
        if avain in nahty: continue
        nahty.add(avain); lisat.append((a['D'],d,L,[list(p) for p in piz]))
    val+=lisat
    # jos jokin täyte jäi kokonaan pois (esim. 10 on aina sydänpizzassa), palautetaan vaikein poistettu
    for x in range(1,11):
        if not any(x in p for v in val for p in v[3]):
            ehd=[v for v in poistetut if any(x in p for p in v[3])]
            if ehd: val.append(max(ehd,key=lambda v:v[0]))
    sydanD=[v[0] for v in val if sydan(v)]
    print('   sydänpulmia',len(sydanD),'kynnys',kynnys,'D',sorted(sydanD))
    val.sort(key=lambda v:v[0])
    data.append([dict(d=v[1],lin=v[2],pizzat=v[3],D=v[0]) for v in val])
    Ds=[v[0] for v in val]
    print('taso',ti+1,'pulmia',len(val),'D %.1f–%.1f keskim. %.1f'%(min(Ds),max(Ds),sum(Ds)/len(Ds)),'joustettu:',jousto)
import os
json.dump(data,open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'pulmadata.json'),'w'))
