// ============================================================================
// Glaces : calcul et équilibrage des mix de crèmes glacées et de sorbets
// Méthode et valeurs : B. Davenat, « La technologie des glaces » (docs/), ch. VII à XIII
// (table analytique, formules N°1 et N°2 d'Arbuckle, pouvoirs sucrants, extraits secs des fruits).
// ============================================================================

// ---- Matières premières (pourcentages pour 100 g) ----
// mg : matière grasse · esdl : extrait sec dégraissé du lait · es : extrait sec total
// su : compté dans la colonne « sucres » · ps : pouvoir sucrant relatif (saccharose = 100)
const GL_ING={
  lait:{n:'Lait entier 3,6 % MG',mg:3.6,esdl:8.4,es:12},
  poudre:{n:'Lait en poudre 0 % MG',esdl:97,es:97},
  creme:{n:'Crème 35 % MG',mg:35,esdl:5.98,es:40.98},
  beurre:{n:'Beurre laitier 82 % MG',mg:82,esdl:2,es:84},
  eau:{n:'Eau',es:0},
  sacch:{n:'Saccharose (sucre)',su:100,es:100,ps:100},
  glucose:{n:'Glucose atomisé 36-39 DE',su:100,es:95,ps:47},
  inverti:{n:'Sucre inverti',su:100,es:78,ps:127},
  dextrose:{n:'Dextrose',su:100,es:92,ps:74},
  jaunes:{n:"Jaunes d'œufs",mg:33.5,es:50,jau:100},
  stab:{n:'Stabilisant/émulsifiant',es:100,stab:100},
  cafe:{n:'Café soluble',es:97},
  cacao:{n:'Cacao en poudre 22 % MG',mg:22,es:99,cac:78}
};
const GL_PS_LACTOSE=16, GL_LACTOSE_ESDL=0.5;        // l'ESDL contient ± 50 % de lactose, pouvoir sucrant 16
const GL_PS_FRUIT=1.3, GL_SUCRE_FRUIT=0.8;           // sucres des fruits (fructose + glucose) ≈ 80 % de leur extrait sec
const GL_K=0.088;                                     // facteur constant de la formule N°1

// ---- Fruits : extrait sec (± 2 %), catégorie légale, proportion fruit:sucre pour la préparation « du marché » ----
const GL_FRUITS={
  fraise:{n:'Fraise',es:10,t:'doux',r:4,f:'purée',note:"N'utiliser que des fruits à chair rouge, très parfumée. Si fraises des bois : moitié-moitié avec des fraises courantes."},
  framboise:{n:'Framboise',es:13,t:'doux',r:2,f:'purée',note:'Retirer les akènes (tamiser) et ne jamais les mixer avec la purée : ils donnent amertume et mauvais goût.'},
  abricot:{n:'Abricot',es:13,t:'doux',r:3,f:'purée',note:'Fruits très mûrs, pas à chair cotonneuse. Ils peuvent être légèrement pochés avant emploi.'},
  peche:{n:'Pêche',es:8,t:'doux',r:4,f:'purée',note:'Fruits très mûrs (la pêche blanche est la meilleure). Infuser quelques peaux dans le sirop pour la couleur ; un peu de kirsch relève le goût.'},
  poire:{n:'Poire',es:12,t:'doux',r:4,f:'purée',note:'Chair fine et non granuleuse (Williams, Doyenné du comice). Un peu de citron évite le noircissement.'},
  ananas:{n:'Ananas',es:14,t:'doux',r:4,f:'purée ou jus',note:'Fruits très mûrs, retirer la partie ligneuse. Un peu de jus d’orange en relève le goût.'},
  mangue:{n:'Mangue',es:13,t:'doux',r:0,f:'purée',note:'Fruits mûrs mais pas excessivement (sinon goût de térébenthine).'},
  melon:{n:'Melon',es:9,t:'doux',r:4,f:'purée',note:'Fruits très mûrs et parfumés (Cantaloup, Cavaillon).'},
  cerise:{n:'Cerise',es:19,t:'doux',r:5,f:'purée',note:'Griotte de préférence ; relever avec une liqueur de cerise ou des noyaux concassés infusés dans le sirop.'},
  banane:{n:'Banane',es:22,t:'doux',r:0,f:'purée',note:'Fruits sains, bien mûrs, sans taches brunes. Mixer avec un peu de jus de citron pour éviter le noircissement ; un peu de rhum ambré en fin de glaçage si désiré.'},
  orange:{n:'Orange',es:11,t:'doux',r:0,f:'jus pressé',note:'Jus obtenu par pression uniquement. Infuser des zestes à chaud dans le sirop. Parfum fugitif : à consommer rapidement.'},
  mandarine:{n:'Mandarine',es:10,t:'doux',r:0,f:'jus pressé',note:'Véritable mandarine (pas de clémentine), jus obtenu par pression.'},
  cassis:{n:'Cassis',es:14,t:'acide',r:3,f:'jus',note:"N'utiliser que le jus."},
  passion:{n:'Fruit de la passion',es:13,t:'acide',r:4,f:'purée',note:'Très acide : excellent aussi en cocktail avec un autre fruit (abricot…).'},
  citron:{n:'Citron jaune',es:8,t:'acide',r:0,f:'jus pressé',note:'Jus frais pressé pour l’acidité ; zestes infusés à chaud dans le sirop pour le parfum. Le citron vert ne s’utilise qu’en mélange (25 à 50 %) avec le jaune.'}
};

// ---- Recettes ----
// ci : crème glacée · so : sorbet. Valeurs en % du poids du mix.
// src : d'où vient la formule (L = reprise telle quelle du livre, A = adaptée des règles du livre)
const GL_CI_FRUIT=(k,pct,extra)=>Object.assign({cat:'fruit',mg:9,esdl:9,jaunes:0,sacch:14,glucose:4,inverti:0,dextrose:0,stab:0.4,base:'creme',fruit:k,fpct:pct,src:'A',ref:'ch. X : sans jaunes, 9 % MG, 9 % ESDL, 20 à 30 % de fruit'},extra||{});
const GL_SO=(k,pct,sacch,glucose,extra)=>Object.assign({fruit:k,fpct:pct,sacch,glucose,inverti:0,stab:0.4,src:'A',ref:'ch. XIII : % de fruit conseillé, EST 29-34 %, taux sucrant ≈ 30'},extra||{});
const GL_RECETTES=[
  {id:'vanille',n:'Vanille',e:'🍦',ci:{cat:'arome',mg:9,esdl:9.5,jaunes:3,sacch:14,glucose:4,inverti:0,dextrose:0,stab:0.5,base:'creme',vanille:1.5,src:'L',ref:'ch. IX : crème glacée avec des œufs, « qualité supérieure »'}},
  {id:'cafe',n:'Café',e:'☕',ci:{cat:'arome',mg:9,esdl:9.5,jaunes:3,sacch:14,glucose:4,inverti:0,dextrose:0,stab:0.5,base:'creme',cafe:2.5,src:'A',ref:'base vanille du ch. IX, café soluble à 2,5 % (minimum légal de l’arôme café)'}},
  {id:'chocolat',n:'Chocolat (couverture 66 %)',e:'🍫',ci:{cat:'standard',mg:9,esdl:8.5,jaunes:3,sacch:15,glucose:0,inverti:4,dextrose:0,stab:0.4,base:'beurre',coSec:3.5,coPate:66,coMg:40.6,src:'L',ref:'ch. XI : glace standard aux œufs au chocolat, lait, beurre et couverture'}},
  {id:'cacao',n:'Chocolat (cacao en poudre)',e:'🍫',ci:{cat:'arome',mg:9,esdl:8.5,jaunes:0,sacch:15,glucose:0,inverti:4,dextrose:0,stab:0.4,base:'creme',caSec:3.5,src:'A',ref:'ch. XI : crème glacée sans œufs, 8 % MG butyrique + 1 % de beurre de cacao, 3,5 % de cacao sec'}},
  {id:'fraise',n:'Fraise',e:'🍓',ci:GL_CI_FRUIT('fraise',25,{esdl:9.5,stab:0.35,src:'L',ref:'ch. X : crème glacée aux fraises « du marché »'}),so:GL_SO('fraise',50,20,6,{src:'L',ref:'ch. XIII : essai N°6, « ce sera le bon »'})},
  {id:'banane',n:'Banane',e:'🍌',ci:GL_CI_FRUIT('banane',20,{sacch:12,es:25,src:'L',ref:'ch. X : crème glacée à la banane (purée à 25 % d’extrait sec)'}),so:GL_SO('banane',38,18,5)},
  {id:'framboise',n:'Framboise',e:'🫐',ci:GL_CI_FRUIT('framboise',25),so:GL_SO('framboise',40,22,6)},
  {id:'abricot',n:'Abricot',e:'🍑',ci:GL_CI_FRUIT('abricot',25),so:GL_SO('abricot',50,20,6)},
  {id:'peche',n:'Pêche',e:'🍑',ci:GL_CI_FRUIT('peche',25),so:GL_SO('peche',50,21,6)},
  {id:'mangue',n:'Mangue',e:'🥭',ci:GL_CI_FRUIT('mangue',25),so:GL_SO('mangue',50,20,6)},
  {id:'poire',n:'Poire',e:'🍐',so:GL_SO('poire',50,20,6)},
  {id:'ananas',n:'Ananas',e:'🍍',so:GL_SO('ananas',50,19,6)},
  {id:'melon',n:'Melon',e:'🍈',so:GL_SO('melon',65,21,5)},
  {id:'cerise',n:'Cerise',e:'🍒',so:GL_SO('cerise',50,18,6)},
  {id:'orange',n:'Orange',e:'🍊',so:GL_SO('orange',75,18,5)},
  {id:'mandarine',n:'Mandarine',e:'🍊',so:GL_SO('mandarine',75,18,5)},
  {id:'cassis',n:'Cassis',e:'🫐',so:GL_SO('cassis',32,23,5)},
  {id:'passion',n:'Fruit de la passion',e:'🥭',so:GL_SO('passion',32,23,5)},
  {id:'citron',n:'Citron',e:'🍋',so:GL_SO('citron',25,24,5)}
];

// ---- Réglages modifiables par l'utilisateur ----
const GL_PARAMS={
  ci:[['mg','MG totale',0,20,0.1],['esdl','ESDL',5,12,0.1],['jaunes',"Jaunes d'œufs",0,10,0.5],['sacch','Saccharose',0,25,0.5],['glucose','Glucose atomisé',0,10,0.5],['inverti','Sucre inverti',0,10,0.5],['dextrose','Dextrose',0,10,0.5],['stab','Stabilisant',0,1,0.05],['fpct','Fruit',0,40,1],['coSec','Cacao sec (couverture)',0,6,0.1],['coPate','Couverture : % pâte de cacao',30,100,1],['coMg','Couverture : % MG',20,60,0.1],['caSec','Cacao sec (cacao en poudre)',0,6,0.1],['cafe','Café soluble',0,5,0.1]],
  so:[['fpct','Fruit',10,90,1],['sacch','Saccharose',10,35,0.5],['glucose','Glucose atomisé',0,12,0.5],['inverti','Sucre inverti',0,8,0.5],['stab','Stabilisant',0,1,0.05]]
};

// ---- Outils ----
const glG=x=>{x=+x||0;const a=Math.abs(x);return a>=100?String(Math.round(x)):fmt(Math.round(x*10)/10)};   // grammes
const glP=x=>fmt(Math.round((+x||0)*100)/100);                                                                 // pourcentages
const glN=v=>{v=parseFloat(String(v).replace(',','.'));return isFinite(v)?v:0};

// Ligne de la table analytique : apports de chaque ingrédient
function glLine(k,w,ov){
  const d=Object.assign({},GL_ING[k]||{},ov||{});
  const c=x=>w*(x||0)/100;
  return{k,n:d.n,w,mg:c(d.mg),esdl:c(d.esdl),su:c(d.su),jau:c(d.jau),fr:c(d.fr),cac:c(d.cac),stab:c(d.stab),es:c(d.es),ps:c(d.su)*(d.ps||0)/100+c(d.psx),note:d.note||''};
}
function glTotals(lines,P){
  const t={w:0,mg:0,esdl:0,su:0,jau:0,fr:0,cac:0,stab:0,es:0,ps:0};
  lines.forEach(l=>Object.keys(t).forEach(k=>t[k]+=l[k]||0));
  t.ps+=t.esdl*GL_LACTOSE_ESDL*GL_PS_LACTOSE/100;   // lactose
  const pc={};Object.keys(t).forEach(k=>pc[k]=t[k]/P*100);
  return{t,pc};
}
// « Purée de fraise », « Purée d'abricot », « Jus d'orange (jus pressé) »
const glFruitName=f=>{const jus=f.f.startsWith('jus'),n=f.n.toLowerCase();return(jus?'Jus ':'Purée ')+(/^[aeiouyhéèê]/.test(n)?"d'":'de ')+n+(jus&&f.f!=='jus'?' ('+f.f+')':'')};
function glFruitLine(fk,w,esOv){
  const f=GL_FRUITS[fk],es=esOv||f.es;
  return glLine('fruit',w,{n:glFruitName(f),es,fr:100,psx:es*GL_SUCRE_FRUIT*GL_PS_FRUIT});
}

// ---- Crème glacée : méthode Arbuckle (formules N°1 et N°2), ch. IX à XI ----
function glCalcCI(P,p){
  const S=[],warn=[],pc=x=>P*x/100;
  const fr=p.fruit?GL_FRUITS[p.fruit]:null;
  // Étape 1 : ce qui est fixé directement par les pourcentages voulus
  const fruitW=fr?pc(p.fpct):0, jaunesW=pc(p.jaunes), mgJ=jaunesW*0.335;
  let couvW=0,couvMg=0,couvSu=0,cacW=0,cacMg=0;
  if(p.coSec>0){couvW=pc(p.coSec)/((p.coPate-p.coMg)/100);couvMg=couvW*p.coMg/100;couvSu=couvW*(100-p.coPate)/100}
  if(p.caSec>0){cacW=pc(p.caSec)/0.78;cacMg=cacW*0.22}
  const sacchTot=pc(p.sacch); let sacchW=sacchTot-couvSu;
  if(sacchW<0){warn.push('La couverture apporte déjà plus de sucre que le saccharose demandé : saccharose ajouté ramené à 0.');sacchW=0}
  const gluW=pc(p.glucose),invW=pc(p.inverti),dexW=pc(p.dextrose),stabW=pc(p.stab),cafeW=pc(p.cafe||0);
  const mgTot=pc(p.mg); let mgBut=mgTot-mgJ-couvMg-cacMg;
  const s1=[`MG totale : ${glP(p.mg)} % de ${glG(P)} g = <b>${glG(mgTot)} g</b>`];
  if(mgJ)s1.push(`Les jaunes (${glP(p.jaunes)} % = ${glG(jaunesW)} g) apportent 33,5 % de MG : ${glG(jaunesW)} × 0,335 = ${glG(mgJ)} g`);
  if(couvMg)s1.push(`Couverture ${glP(p.coPate)} % / ${glP(p.coMg)} % MG → cacao sec = ${glP(p.coPate)} − ${glP(p.coMg)} = ${glP(p.coPate-p.coMg)} %, sucre = 100 − ${glP(p.coPate)} = ${glP(100-p.coPate)} %.<br>Pour ${glP(p.coSec)} % de cacao sec : ${glG(pc(p.coSec))} ÷ ${glP((p.coPate-p.coMg)/100)} = <b>${glG(couvW)} g de couverture</b>, qui apportent ${glG(couvMg)} g de MG (beurre de cacao) et ${glG(couvSu)} g de sucre`);
  if(cacMg)s1.push(`Cacao en poudre (78 % de cacao sec, 22 % MG) : ${glG(pc(p.caSec))} ÷ 0,78 = <b>${glG(cacW)} g</b>, qui apportent ${glG(cacMg)} g de MG`);
  if(mgJ||couvMg||cacMg)s1.push(`MG butyrique (lait, crème, beurre) nécessaire : ${glG(mgTot)}${mgJ?' − '+glG(mgJ):''}${couvMg?' − '+glG(couvMg):''}${cacMg?' − '+glG(cacMg):''} = <b>${glG(mgBut)} g</b>`);
  if(mgBut<0){warn.push('Les autres ingrédients apportent déjà plus de matière grasse que la MG totale visée : aucune crème ni beurre ajouté, la MG obtenue sera plus élevée.');mgBut=0}
  if(couvSu)s1.push(`Saccharose à ajouter : ${glP(p.sacch)} % = ${glG(sacchTot)} g − ${glG(couvSu)} g apportés par la couverture = <b>${glG(sacchW)} g</b>`);
  else s1.push(`Saccharose : ${glP(p.sacch)} % = <b>${glG(sacchW)} g</b>`);
  [[gluW,'Glucose atomisé',p.glucose],[invW,'Sucre inverti',p.inverti],[dexW,'Dextrose',p.dextrose],[stabW,'Stabilisant/émulsifiant',p.stab],[fruitW,fr?glFruitName(fr):'',p.fpct],[cafeW,'Café soluble',p.cafe]].forEach(([w,n,x])=>{if(w)s1.push(`${n} : ${glP(x)} % = <b>${glG(w)} g</b>`)});
  if(jaunesW)s1.push(`Jaunes d'œufs : ${glP(p.jaunes)} % = <b>${glG(jaunesW)} g</b>`);
  S.push(['Étape 1 — Fixer les caractéristiques du mix',s1]);

  const fixed=stabW+sacchW+gluW+invW+dexW+jaunesW+fruitW+couvW+cacW+cafeW;
  const esdlNeed=pc(p.esdl);
  let poudreW=0,grasW=0,laitW=0,eauW=0;
  const base=p.base||'creme', gras=base==='eau'?'beurre':base, F=GL_ING[gras].mg/100;
  if(base==='eau'){
    // Lait en poudre 0 %, eau et beurre (ch. IX, 3e formule) : une seule source de MG
    grasW=mgBut/F;const esdlB=grasW*GL_ING.beurre.esdl/100;
    poudreW=Math.max(0,(esdlNeed-esdlB)/0.97);
    eauW=P-fixed-grasW-poudreW;
    S.push(['Étape 2 — Beurre',[`Beurre = MG butyrique ÷ 0,82 = ${glG(mgBut)} ÷ 0,82 = <b>${glG(grasW)} g</b>`,`Ce beurre apporte ${glG(grasW)} × 2 % = ${glG(esdlB)} g d'ESDL`]]);
    S.push(['Étape 3 — Lait en poudre 0 % MG',[`ESDL nécessaire : ${glP(p.esdl)} % = ${glG(esdlNeed)} g`,`(${glG(esdlNeed)} − ${glG(esdlB)}) ÷ 0,97 = <b>${glG(poudreW)} g de lait en poudre</b>`]]);
    S.push(["Étape 4 — Eau (le régulateur)",[`${glG(P)} − ${glG(fixed+grasW+poudreW)} (tous les autres ingrédients) = <b>${glG(eauW)} g d'eau</b>`]]);
    if(eauW<0)return{err:"Formule impossible : les ingrédients dépassent le poids total (il faudrait de l'eau en quantité négative). Diminuez les sucres, le fruit ou la MG."};
  }else{
    // Formule N°1 : lait en poudre
    const serum=P-(mgBut+fixed);
    poudreW=(esdlNeed-serum*GL_K)/(0.97-GL_K);
    S.push(['Étape 2 — Lait en poudre 0 % MG (formule N°1)',[
      `Sérum du mix (ESDL + eau) = poids total − (MG butyrique + tous les ingrédients fixés) = ${glG(P)} − (${glG(mgBut)} + ${glG(fixed)}) = <b>${glG(serum)} g</b>`,
      `Poudre = (ESDL nécessaire − sérum × 0,088) ÷ (0,97 − 0,088) = (${glG(esdlNeed)} − ${glG(serum)} × 0,088) ÷ 0,882 = (${glG(esdlNeed)} − ${glG(serum*GL_K)}) ÷ 0,882 = <b>${glG(poudreW)} g</b>`]]);
    if(poudreW<0){warn.push(`Le lait apporte à lui seul plus d'ESDL que les ${glP(p.esdl)} % visés : pas de lait en poudre, l'ESDL obtenu sera un peu plus élevé.`);poudreW=0}
    // Formule N°2 : crème ou beurre
    const L=P-fixed-poudreW;
    grasW=(mgBut-L*0.036)/(F-0.036);
    S.push([`Étape 3 — ${gras==='creme'?'Crème 35 %':'Beurre 82 %'} (formule N°2)`,[
      `Poids lait + ${gras==='creme'?'crème':'beurre'} = ${glG(P)} − ${glG(fixed+poudreW)} (ingrédients fixés + poudre) = <b>${glG(L)} g</b>`,
      `${gras==='creme'?'Crème':'Beurre'} = (MG butyrique − ${glG(L)} × 0,036) ÷ (${glP(F)} − 0,036) = (${glG(mgBut)} − ${glG(L*0.036)}) ÷ ${glP(F-0.036)} = <b>${glG(grasW)} g</b>`]]);
    if(grasW<0){warn.push(`Le lait apporte à lui seul plus de MG que les ${glG(mgBut)} g de MG butyrique visés : pas de ${gras==='creme'?'crème':'beurre'}, la MG obtenue sera plus élevée.`);grasW=0}
    laitW=L-grasW;
    S.push(['Étape 4 — Lait entier 3,6 %',[`${glG(L)} − ${glG(grasW)} = <b>${glG(laitW)} g de lait</b>${laitW>0?` (≈ ${fmt(Math.round(laitW/1.036)/1000)} L, 1 L = 1036 g)`:''}`]]);
    if(laitW<0)return{err:"Formule impossible : il faudrait une quantité de lait négative. Diminuez les sucres, le fruit, ou choisissez la base « poudre + eau + beurre »."};
  }
  // Table analytique
  const lines=[];
  if(stabW)lines.push(glLine('stab',stabW));
  if(sacchW)lines.push(glLine('sacch',sacchW));
  if(gluW)lines.push(glLine('glucose',gluW));
  if(invW)lines.push(glLine('inverti',invW));
  if(dexW)lines.push(glLine('dextrose',dexW));
  if(jaunesW)lines.push(glLine('jaunes',jaunesW,{note:`≈ ${Math.round(jaunesW/18)} jaunes de 18 g`}));
  if(poudreW)lines.push(glLine('poudre',poudreW));
  if(grasW)lines.push(glLine(gras,grasW));
  if(laitW)lines.push(glLine('lait',laitW,{note:`≈ ${fmt(Math.round(laitW/1.036)/1000)} L`}));
  if(eauW)lines.push(glLine('eau',eauW));
  if(couvW)lines.push(glLine('couv',couvW,{n:`Chocolat de couverture ${glP(p.coPate)} %`,mg:p.coMg,su:100-p.coPate,ps:100,cac:p.coPate-p.coMg,es:100}));
  if(cacW)lines.push(glLine('cacao',cacW));
  if(cafeW)lines.push(glLine('cafe',cafeW));
  if(fruitW)lines.push(glFruitLine(p.fruit,fruitW,p.es));
  return{lines,steps:S,warn,P,extra:p.vanille?[{n:'Vanille (gousse)',w:P/1000*p.vanille,note:`${glP(p.vanille)} g/kg de mix, soit ≈ ${fmt(Math.round(P/1000*p.vanille/4*10)/10)} gousse(s) de 4 g — légal : 1 g/kg minimum ; non compté dans les calculs`}]:[],sacchTot,stabW};
}

// ---- Sorbet : méthode par pourcentages, l'eau est le régulateur (ch. XIII) ----
function glCalcSO(P,p){
  const pc=x=>P*x/100,f=GL_FRUITS[p.fruit];
  const fruitW=pc(p.fpct),sacchW=pc(p.sacch),gluW=pc(p.glucose),invW=pc(p.inverti),stabW=pc(p.stab);
  const eauW=P-fruitW-sacchW-gluW-invW-stabW;
  const s1=[[fruitW,glFruitName(f),p.fpct],[sacchW,'Saccharose',p.sacch],[gluW,'Glucose atomisé',p.glucose],[invW,'Sucre inverti',p.inverti],[stabW,'Stabilisant',p.stab]].filter(x=>x[0]).map(([w,n,x])=>`${n} : ${glP(x)} % de ${glG(P)} g = <b>${glG(w)} g</b>`);
  const S=[['Étape 1 — Fixer le fruit, les sucres et le stabilisant',s1],["Étape 2 — L'eau, le régulateur",[`${glG(P)} − (${[fruitW,sacchW,gluW,invW,stabW].filter(Boolean).map(glG).join(' + ')}) = <b>${glG(eauW)} g d'eau</b>`]]];
  if(eauW<0)return{err:"Formule impossible : fruit + sucres dépassent le poids total. Diminuez le pourcentage de fruit ou de sucres."};
  const lines=[glFruitLine(p.fruit,fruitW),glLine('sacch',sacchW)];
  if(gluW)lines.push(glLine('glucose',gluW));
  if(invW)lines.push(glLine('inverti',invW));
  if(stabW)lines.push(glLine('stab',stabW));
  if(eauW)lines.push(glLine('eau',eauW));
  return{lines,steps:S,warn:[],P,extra:[],sacchTot:sacchW,stabW};
}

// ---- Contrôles : cibles du livre et législation française ----
function glChecks(type,p,r,tot){
  const pc=tot.pc,out=[],chk=(lbl,val,ok,ref)=>out.push({lbl,val,ok,ref});
  const fr=p.fruit?GL_FRUITS[p.fruit]:null;
  if(type==='ci'){
    chk('MG totale',glP(pc.mg)+' %',Math.abs(pc.mg-p.mg)<0.15,'visé '+glP(p.mg)+' %');
    chk('ESDL',glP(pc.esdl)+' %',Math.abs(pc.esdl-p.esdl)<0.15,'visé '+glP(p.esdl)+' %');
    const mgBut=r.lines.filter(l=>['lait','creme','beurre'].includes(l.k)).reduce((a,l)=>a+l.mg,0)/r.P*100;
    chk('MG butyrique (lait, crème, beurre)',glP(mgBut)+' %',null,'');
    chk('MG totale + ESDL',glP(pc.mg+pc.esdl),pc.mg+pc.esdl<=22,'≤ 22 conseillé (goût français)');
    const estMax=p.coSec||p.caSec?42:40;
    chk('Extrait sec total',glP(pc.es)+' %',pc.es>=31&&pc.es<=estMax,`31 à ${estMax} % conseillé${estMax===42?' (glace au chocolat : 42 maximum)':''}`);
    chk('Taux sucrant',fmt(Math.round(pc.ps)),pc.ps>=15&&pc.ps<=23,'± 17 (vanille) à ± 21 (chocolat, fruits)');
    if(p.cat==='arome')chk('Législation « crème glacée » aux arômes',`MG but. ${glP(mgBut)} % · sacch. ${glP(r.sacchTot/r.P*100)} % · EST ${glP(pc.es)} %`,mgBut>=7&&pc.es>=31&&(r.sacchTot/r.P*100>=14||pc.su>=14),'minimum 7 % MG butyrique, 14 % saccharose, 31 % EST');
    if(p.cat==='fruit')chk('Législation « crème glacée » aux fruits',`MG but. ${glP(mgBut)} % · fruit ${glP(pc.fr)} % · EST ${glP(pc.es)} %`,mgBut>=5&&pc.es>=29&&pc.fr>=(fr&&fr.t==='acide'?10:15),'minimum 5 % MG butyrique, 14 % saccharose, 15 % de fruits doux (10 % acides), 29 % EST');
    if(p.cat==='standard')chk('Catégorie','glace standard aux œufs',null,"la MG de la couverture n'est pas butyrique : pas d'appellation « crème glacée » (ch. XI)");
  }else{
    chk('Extrait sec total',glP(pc.es)+' %',pc.es>=29&&pc.es<=34,'29 à 34 % (sorbet au goût français)');
    chk('Taux sucrant',fmt(Math.round(pc.ps)),pc.ps>=26&&pc.ps<=33,'≈ 30');
    const mini=fr.t==='acide'?15:35;
    chk(`Législation sorbet aux fruits ${fr.t}s`,`fruit ${glP(pc.fr)} % · saccharose ${glP(p.sacch)} %`,pc.fr>=mini&&(p.sacch>=18||pc.su>=18),`minimum ${mini} % de fruits ${fr.t}s et 18 % de sucres`);
  }
  return out;
}

// ---- Procédé de fabrication (ch. VI, X et XIII) ----
function glProcede(type,p,r){
  const f=p.fruit?GL_FRUITS[p.fruit]:null,st=[],g=glG;
  const fruitL=r.lines.find(l=>l.k==='fruit');
  const premix=r.stabW*10;
  let mac='';
  if(f&&f.r&&fruitL){const su=Math.min(fruitL.w/f.r,Math.max(0,r.sacchTot-premix));if(su>1)mac=`<b>La veille (fruits « du marché »)</b> : mélanger les ${g(fruitL.w)} g de fruits (${f.n.toLowerCase()} : lavés, équeutés ou dénoyautés) avec ${g(su)} g de sucre <i>pris sur le saccharose de la recette</i> (proportion fruit:sucre ${f.r}:1). Couvrir et réserver 12 à 24 h à +4 °C : le jus et le goût du fruit passent dans le sirop par osmose (Arbuckle).`}
  if(mac)st.push(mac);
  st.push('Peser rigoureusement tous les ingrédients, le stabilisant avec une précision encore plus stricte.');
  if(r.stabW)st.push(`Prémélanger intimement les ${g(r.stabW)} g de stabilisant avec ${g(premix)} g de saccharose (10 fois son poids, prélevés sur le sucre de la recette).`);
  if(type==='ci'){
    const has=k=>r.lines.some(l=>l.k===k);
    st.push(`Verser ${has('lait')?'le lait':"l'eau"} dans le pasteurisateur (ou une casserole)${has('poudre')?' et ajouter le lait en poudre en fouettant':''}.${p.vanille?' Ajouter la vanille (gousses fendues et grattées).':''}`);
    st.push(`À 25-30 °C : ajouter le saccharose restant${has('glucose')?', le glucose atomisé':''}${has('inverti')?', le sucre inverti':''}${has('dextrose')?', le dextrose':''}.`);
    const fats=[has('creme')&&'la crème',has('beurre')&&'le beurre',has('couv')&&'la couverture hachée',has('cacao')&&'le cacao en poudre',has('cafe')&&'le café soluble'].filter(Boolean);
    if(fats.length)st.push(`À 35 °C : ajouter ${fats.join(', ')}.`);
    if(has('jaunes'))st.push("À 40 °C : ajouter les jaunes d'œufs.");
    if(r.stabW)st.push('À 45-55 °C (pas plus !) : ajouter en pluie le mélange stabilisant/sucre, sous forte agitation.');
    st.push('Pasteuriser : monter à +83/85 °C, puis refroidir le plus rapidement possible à +4/+2 °C. Homogénéiser si possible (mixeur plongeur à défaut).');
    st.push('Maturer 12 heures à +2/+4 °C (pas davantage) : les protéines se réhydratent et le stabilisant fait tout son effet.');
    if(fruitL)st.push(`Juste avant de glacer : ajouter au mix les ${g(fruitL.w)} g de ${fruitL.n.toLowerCase()}${mac?' (avec son sirop de macération)':''}, bien mixer et glacer sans attendre.`);
    st.push('Glacer en turbine : extraction vers −6/−10 °C ; un foisonnement de 50 à 75 % est satisfaisant pour une crème glacée artisanale.');
  }else{
    st.push("Chauffer l'eau, y ajouter le saccharose restant et le glucose atomisé"+(r.lines.some(l=>l.k==='inverti')?' et le sucre inverti':'')+'.');
    if(r.stabW)st.push('À 45/50 °C : incorporer en pluie le mélange stabilisant/sucre, avec une bonne agitation.');
    st.push('Monter le sirop à 83 °C puis le refroidir rapidement à +4 °C.');
    st.push('Maturer 4 heures au minimum pour que le stabilisant agisse parfaitement.');
    st.push(`Avant le glaçage : ajouter les ${g(fruitL.w)} g de ${fruitL.n.toLowerCase()}${mac?' (avec son sirop de macération)':''} en mixant bien, puis tamiser.`);
    st.push('Glacer : pour un sorbet, viser un foisonnement modéré de 30 à 40 %.');
  }
  st.push('Placer les bacs couverts à −25 °C quelques heures (idéalement en cellule de surgélation rapide), puis conserver à −20/−22 °C.');
  return st;
}

// ---- Vue ----
function glacesView(){
  const g=glState||(glState={rid:'vanille',type:'ci',P:1000,ov:{}});
  app.innerHTML=`<div class="row"><button id="bk">← Retour</button><span style="flex:1"></span><button id="gpr">🖨️ Imprimer</button></div>
  <h2 style="font-family:Lato,system-ui,sans-serif;margin:12px 0 4px">🍨 Glaces</h2>
  <p class="mu st">Choisissez une recette, le type et le poids de mix voulu : la recette est équilibrée selon <i>La technologie des glaces</i> (B. Davenat) — table analytique et formules d'Arbuckle.</p>
  <div class="gl-form">
    <div class="f"><label for="grc">Recette</label><select id="grc">${GL_RECETTES.map(r=>`<option value="${r.id}"${r.id===g.rid?' selected':''}>${r.e} ${esc(r.n)}${r.ci&&r.so?'':r.ci?' — crème glacée':' — sorbet'}</option>`).join('')}</select></div>
    <div class="f"><label>Type</label><div class="row" id="gty"></div></div>
    <div class="f"><label for="gp">Poids total du mix (g)</label><input id="gp" type="number" inputmode="decimal" min="100" step="50" value="${esc(g.P)}"></div>
  </div>
  <details class="gl-adv" id="gadv"${g.open?' open':''}><summary>⚙️ Réglages avancés du mix (en % du poids total)</summary><div id="gpar"></div></details>
  <div id="gres"></div>`;
  $('#bk').onclick=()=>{view={m:'list'};render()};
  $('#gpr').onclick=()=>window.print();
  $('#grc').onchange=e=>{g.rid=e.target.value;g.ov={};const r=glRec();if(!r[g.type])g.type=r.ci?'ci':'so';glForm();glRes()};
  $('#gp').oninput=e=>{g.P=e.target.value;glRes()};
  $('#gadv').ontoggle=e=>{g.open=e.target.open};
  glForm();glRes();
}
let glState=null;   // dernier choix, conservé en revenant sur la page
const glRec=()=>GL_RECETTES.find(r=>r.id===glState.rid)||GL_RECETTES[0];
const glPar=()=>{const g=glState,r=glRec();return Object.assign({},r[g.type],g.ov)};
function glForm(){
  const g=glState,r=glRec(),p=glPar();
  $('#gty').innerHTML=[['ci','🍦 Crème glacée'],['so','🍧 Sorbet']].map(([k,l])=>`<button data-gt="${k}" class="${g.type===k?'p':''}"${r[k]?'':' disabled title="Pas de version '+(k==='ci'?'crème glacée':'sorbet')+' pour cette recette"'}>${l}</button>`).join('');
  $('#gty').querySelectorAll('[data-gt]').forEach(b=>b.onclick=()=>{if(g.type===b.dataset.gt)return;g.type=b.dataset.gt;g.ov={};glForm();glRes()});
  const keys=GL_PARAMS[g.type].filter(([k])=>k in p&&(k!=='fpct'||p.fruit)&&(!/^co/.test(k)||p.coSec)&&(k!=='caSec'||p.caSec)&&(k!=='cafe'||p.cafe));
  const bases=g.type==='ci'?`<div class="f"><label for="gbase">Base laitière</label><select id="gbase">${[['creme','Lait entier + crème 35 %'],['beurre','Lait entier + beurre'],['eau','Lait en poudre + eau + beurre']].map(([k,l])=>`<option value="${k}"${p.base===k?' selected':''}>${l}</option>`).join('')}</select></div>`:'';
  $('#gpar').innerHTML=`<div class="gl-pgrid">${keys.map(([k,l,mi,ma,s])=>`<div class="f"><label for="gk_${k}">${esc(l)}${/^coP|^coM/.test(k)?'':' (%)'}</label><input id="gk_${k}" data-gk="${k}" type="number" inputmode="decimal" min="${mi}" max="${ma}" step="${s}" value="${p[k]}"></div>`).join('')}${bases}</div>
  <div class="row"><button id="grs">Valeurs de la recette</button><span class="st">${p.src==='L'?'📖 Formule reprise du livre':'📐 Formule établie avec les règles du livre'} — ${esc(p.ref||'')}</span></div>`;
  $('#gpar').querySelectorAll('[data-gk]').forEach(i=>i.oninput=()=>{g.ov[i.dataset.gk]=glN(i.value);glRes()});
  const gb=$('#gbase');if(gb)gb.onchange=()=>{g.ov.base=gb.value;glRes()};
  $('#grs').onclick=()=>{g.ov={};glForm();glRes()};
}
function glRes(){
  const g=glState,r=glRec(),p=glPar(),P=glN(g.P),box=$('#gres');
  if(!(P>=100&&P<=200000)){box.innerHTML='<p class="mu">Indiquez un poids total entre 100 g et 200 kg.</p>';return}
  if(g.type==='ci'&&p.coSec>0&&!(p.coPate>p.coMg)){box.innerHTML='<p class="gl-err">Le % de pâte de cacao de la couverture doit être supérieur à son % de matière grasse.</p>';return}
  const res=g.type==='ci'?glCalcCI(P,p):glCalcSO(P,p);
  if(res.err){box.innerHTML=`<p class="gl-err">⚠️ ${esc(res.err)}</p>`;return}
  const tot=glTotals(res.lines,P),f=p.fruit?GL_FRUITS[p.fruit]:null;
  const cols=[['mg','MG'],['esdl','ESDL'],['su','Sucres'],['jau','Jaunes'],['fr','Fruits'],['cac','Cacao sec'],['stab','Stab.'],['es','EST']].filter(([k])=>tot.t[k]>0.0001);
  const ingRows=[...res.lines].sort((a,b)=>b.w-a.w);
  box.innerHTML=`
  <section class="gl-card"><h3>${r.e} ${g.type==='ci'?(p.cat==='standard'?'Glace':'Crème glacée'):'Sorbet'} ${esc(r.n.replace(/ \(.*\)/,'').toLowerCase())} — ${glG(P)} g de mix</h3>
    <table class="gl-ing"><tbody>${ingRows.map(l=>`<tr><td>${esc(l.n)}${l.note?`<div class="st">${esc(l.note)}</div>`:''}</td><td class="n"><b>${glG(l.w)} g</b></td><td class="n mu">${glP(l.w/P*100)} %</td></tr>`).join('')}
    ${res.extra.map(x=>`<tr><td>${esc(x.n)}<div class="st">${esc(x.note)}</div></td><td class="n"><b>${glG(x.w)} g</b></td><td></td></tr>`).join('')}</tbody>
    <tfoot><tr><td>Total</td><td class="n"><b>${glG(tot.t.w)} g</b></td><td class="n mu">100 %</td></tr></tfoot></table>
    ${res.warn.map(w=>`<p class="gl-warn">⚠️ ${esc(w)}</p>`).join('')}
    ${f?`<p class="st">🍓 ${esc(f.n)} : ${esc(f.f)}, ≈ ${p.es||f.es} % d'extrait sec (fruit ${f.t}). ${esc(f.note)}</p>`:''}
  </section>
  <section class="gl-card"><h3>✅ Caractéristiques obtenues</h3><table class="gl-chk"><tbody>${glChecks(g.type,p,res,tot).map(c=>`<tr><td>${c.ok===null?'ℹ️':c.ok?'✅':'⚠️'}</td><td>${esc(c.lbl)}${c.ref?`<div class="st">${esc(c.ref)}</div>`:''}</td><td class="n gl-v"><b>${esc(c.val)}</b></td></tr>`).join('')}</tbody></table>
    <p class="st">Taux sucrant estimé : Σ (poids de chaque sucre × pouvoir sucrant) — saccharose 100, sucre inverti 127, dextrose 74, glucose atomisé 47, lactose 16 (50 % de l'ESDL), sucres des fruits ≈ 80 % de leur extrait sec × 130.</p></section>
  <section class="gl-card"><h3>🧮 Détail du calcul</h3>${res.steps.map(([t,ls])=>`<h4>${esc(t)}</h4><ul>${ls.map(x=>`<li>${x}</li>`).join('')}</ul>`).join('')}</section>
  <section class="gl-card"><h3>📊 Table analytique (en g)</h3><div class="gl-scroll"><table class="gl-at"><thead><tr><th>Ingrédient</th><th>Poids</th>${cols.map(c=>`<th>${c[1]}</th>`).join('')}</tr></thead>
    <tbody>${res.lines.map(l=>`<tr><td>${esc(l.n)}</td><td class="n">${glG(l.w)}</td>${cols.map(([k])=>`<td class="n">${l[k]>0.0001?glG(l[k]):''}</td>`).join('')}</tr>`).join('')}</tbody>
    <tfoot><tr><td>Totaux</td><td class="n">${glG(tot.t.w)}</td>${cols.map(([k])=>`<td class="n">${glG(tot.t[k])}</td>`).join('')}</tr>
    <tr><td>Pourcentages</td><td></td>${cols.map(([k])=>`<td class="n"><b>${glP(tot.pc[k])}</b></td>`).join('')}</tr></tfoot></table></div>
    <p class="st">EST = extrait sec total · ESDL = extrait sec dégraissé du lait · MG = matière grasse totale (lait, crème, beurre, jaunes à 33,5 %, cacao).</p></section>
  <section class="gl-card"><h3>👩‍🍳 Fabrication</h3><ol class="gl-steps">${glProcede(g.type,p,res).map(s=>`<li>${s}</li>`).join('')}</ol></section>`;
}
