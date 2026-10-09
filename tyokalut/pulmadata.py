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
TASOT=[
 dict(n=1,koot=[1],lin=(0,2),ehto=lambda a,p:a['helpoin']==1 and a['D']<=2),
 dict(n=1,koot=[1],lin=(0,2),ehto=lambda a,p:a['helpoin']==2 and a['D']<=4),
 dict(n=1,koot=[2],lin=(1,3),ehto=lambda a,p:a['puuttuu']==1 and a['helpoin']<=2 and 1<=a['D']<=5),
 dict(n=1,koot=[1,2],lin=(1,3),ehto=lambda a,p:a['helpoin']==3 and a['puuttuu']==1 and 3<=a['D']<=6),
 dict(n=1,koot=[2],lin=(0,3),ehto=lambda a,p:a['puuttuu']==2 and a['helpoin']==2 and 3<=a['D']<=7),
 dict(n=1,koot=[3],lin=(1,4),ehto=lambda a,p:a['helpoin']<=2 and 5<=a['D']<=9),
 dict(n=1,koot=[1,2],lin=(1,4),ehto=lambda a,p:a['helpoin']==4 and 5<=a['D']<=8),
 dict(n=2,koot=[1,2],lin=(0,3),ehto=lambda a,p:a['oudot']>=1 and 7<=a['D']<=10),
 dict(n=1,koot=[2,3],lin=(2,4),ehto=lambda a,p:a['ansat']>=3 and a['ratk']<=2 and 9<=a['D']<=12),
 dict(n=3,koot=[1,2],lin=(0,3),ehto=lambda a,p:a['oudot']>=1 and 10<=a['D']<=13),
 dict(n=None,koot=[1,2,3,4],lin=(1,4),ehto=lambda a,p:a['ratk']==1 and 12.5<=a['D']<15),
 dict(n=None,koot=[1,2,3],lin=(1,4),ehto=lambda a,p:a['ratk']==1 and a['D']>=15),
]
data=[]
for ti,T in enumerate(TASOT):
    rnd=random.Random(500+ti); ehd=[]; nahty=set(); tr=0
    while len(ehd)<60 and tr<400000:
        tr+=1
        n=T['n'] or rnd.choice([1,2,2,3])
        piz=arvo_pizzat(rnd,n,T['koot'])
        if sum(map(len,piz))>6: continue
        d=rnd.randint(1,10); L=sorted(rnd.sample(range(1,11),rnd.randint(*T['lin'])))
        if any(set(p)<=set(L) for p in piz): continue
        a=arvioi(d,L,piz)
        if not a or not T['ehto'](a,piz): continue
        avain=(d,tuple(L),tuple(sorted(piz)))
        if avain in nahty: continue
        nahty.add(avain); ehd.append((a['D'],d,L,[list(p) for p in piz],a))
    ehd.sort(key=lambda x:x[0])
    # viisi pulmaa tasaisesti vaikeusjakaumasta, helpoimmasta vaikeimpaan
    val=[ehd[round(k*(len(ehd)-1)/4)] for k in range(5)] if len(ehd)>=5 else ehd
    data.append([dict(d=v[1],lin=v[2],pizzat=v[3],D=v[0]) for v in val])
    Ds=[v[0] for v in val]
    print('taso',ti+1,'ehdokkaita',len(ehd),'D',Ds,'keskim.',round(sum(Ds)/len(Ds),1))
    for v in val[-1:]: print('    vaikein: noppa',v[1],'lin',v[2],'pizzat',v[3],'ratk',v[4]['ratk'],'ansat',v[4]['ansat'])
import os
json.dump(data,open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'pulmadata.json'),'w'))
