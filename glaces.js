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
  cacao:{n:'Cacao en poudre 22 % MG',mg:22,es:99,cac:78},
  ecreme:{n:'Lait écrémé',mg:0.06,esdl:9.28,es:9.34},
  creme30:{n:'Crème 30 % MG',mg:30,esdl:6.44,es:36.44},
  creme40:{n:'Crème 40 % MG',mg:40,esdl:5.52,es:45.52},
  poudre26:{n:'Lait en poudre 26 % MG',mg:26,esdl:71,es:97},
  pamande:{n:"Pâte d'amande pure (non sucrée)",mg:54,es:94},
  pnoisette:{n:'Pâte de noisette pure (non sucrée)',mg:60,es:93},
  vanille:{n:'Vanille (gousse, ~4 g)',es:0}
};
const GL_BUT=['lait','ecreme','creme','creme30','creme40','beurre','poudre26'];   // sources de MG butyrique (laitière)
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
  const l=glLine('fruit',w,{n:glFruitName(f),es,fr:100,psx:es*GL_SUCRE_FRUIT*GL_PS_FRUIT});l.fk=fk;return l;
}
function glCouvLine(w,pate,cmg){
  const l=glLine('couv',w,{n:`Chocolat de couverture ${glP(pate)} %`,mg:cmg,su:100-pate,ps:100,cac:pate-cmg,es:100});l.pate=pate;l.cmg=cmg;return l;
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
  if(couvW)lines.push(glCouvLine(couvW,p.coPate,p.coMg));
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
// Chaque contrôle : ok = true (respecté), false (à revoir, avec un conseil), null (simple information)
function glChecks(type,p,r,tot){
  const pc=tot.pc,out=[],chk=(lbl,val,ok,ref,hint)=>out.push({lbl,val,ok,ref,hint:ok===false?hint:''});
  const rng=(lbl,v,lo,hi,ref,low,high,unit)=>chk(lbl,glP(v)+(unit===undefined?' %':unit),v>=lo&&v<=hi,ref,v<lo?low:high);
  const mgBut=r.lines.filter(l=>GL_BUT.includes(l.k)).reduce((a,l)=>a+l.mg,0)/r.P*100;
  const fl=r.lines.filter(l=>l.k==='fruit'),acide=fl.some(l=>GL_FRUITS[l.fk].t==='acide');
  const choco=pc.cac>0.5,estMax=choco?42:40;
  const H={
    estLo:"Trop d'eau : la glace sera dure, avec des cristaux de glace. Ajoutez des sucres, du lait en poudre ou de la matière grasse, ou réduisez le lait / l'eau.",
    estHi:'Trop de matières sèches : glace lourde, pâteuse ou sableuse, qui foisonne mal. Réduisez sucres ou poudre de lait, ou ajoutez du liquide.',
    tsLo:'Pas assez sucrée : la glace sera dure à la sortie du congélateur. Ajoutez du saccharose (ou un peu de dextrose).',
    tsHi:'Trop sucrée : la glace ramollira en vitrine. Remplacez une partie du saccharose par du glucose atomisé (pouvoir sucrant 47), ou réduisez les sucres.'};
  if(!p.custom&&type==='ci'){
    chk('MG totale',glP(pc.mg)+' %',Math.abs(pc.mg-p.mg)<0.15,'visé '+glP(p.mg)+' %');
    chk('ESDL',glP(pc.esdl)+' %',Math.abs(pc.esdl-p.esdl)<0.15,'visé '+glP(p.esdl)+' %');
  }
  if(type==='ci'){
    if(p.custom){
      rng('MG totale',pc.mg,5,12,'5 à 12 % (9 % est un bon choix)','Peu de matière grasse : glace moins onctueuse. Ajoutez de la crème ou du beurre.','Au-delà de 12 %, c’est excessif pour une glace artisanale (goût gras, dure au froid). Réduisez la crème ou le beurre.');
      rng('ESDL (extrait sec dégraissé du lait)',pc.esdl,7.5,11.5,'7,5 à 11,5 % — plus la MG est faible, plus l’ESDL doit être élevé','ESDL trop faible : la glace manque de corps et foisonne mal. Ajoutez du lait en poudre 0 %.','ESDL trop élevé : risque de cristallisation du lactose (glace sableuse). Réduisez le lait en poudre.');
      rng('Sucres',pc.su,14,22,'14 à 22 % selon le matériel (ch. VIII)','Pas assez de sucres : glace dure et cristallisée. Ajoutez du saccharose ou du glucose atomisé.','Trop de sucres : glace molle et collante. Réduisez les sucres.');
    }
    chk('MG butyrique (lait, crème, beurre)',glP(mgBut)+' %',null,'');
    chk('MG totale + ESDL',glP(pc.mg+pc.esdl),pc.mg+pc.esdl<=22,'≤ 22 conseillé (goût français)','Mix trop riche pour le goût français : baissez la MG ou l’ESDL.');
    rng('Extrait sec total',pc.es,31,estMax,`31 à ${estMax} % conseillé${choco?' (glace au chocolat : 42 maximum)':''}`,H.estLo,H.estHi);
    chk('Taux sucrant',fmt(Math.round(pc.ps)),pc.ps>=15&&pc.ps<=23,'± 17 (vanille) à ± 21 (chocolat, fruits)',pc.ps<15?H.tsLo:H.tsHi);
    if(p.custom){
      if(pc.stab>1)chk('Stabilisant',glP(pc.stab)+' %',false,'1 % maximum (législation)','Trop de stabilisant : texture gommeuse. 0,3 à 0,5 % suffisent.');
      else chk('Stabilisant',glP(pc.stab)+' %',null,pc.stab?'0,3 à 0,5 % conseillé':'sans stabilisant : à consommer rapidement (moins bonne tenue au stockage)');
      const sac=r.sacchTot/r.P*100,fr=fl.length;
      const okL=mgBut>=(fr?5:7)&&pc.es>=(fr?29:31)&&(sac>=14||pc.su>=14)&&(!fr||pc.fr>=(acide?10:15));
      chk('Appellation « crème glacée »',okL?'possible':'non',okL?true:null,fr?'minimum 5 % MG butyrique, 14 % de sucres, 15 % de fruits doux (10 % acides), 29 % EST':'minimum 7 % MG butyrique, 14 % de sucres, 31 % EST');
    }else{
      const fr=p.fruit?GL_FRUITS[p.fruit]:null;
      if(p.cat==='arome')chk('Législation « crème glacée » aux arômes',`MG but. ${glP(mgBut)} % · sacch. ${glP(r.sacchTot/r.P*100)} % · EST ${glP(pc.es)} %`,mgBut>=7&&pc.es>=31&&(r.sacchTot/r.P*100>=14||pc.su>=14),'minimum 7 % MG butyrique, 14 % saccharose, 31 % EST');
      if(p.cat==='fruit')chk('Législation « crème glacée » aux fruits',`MG but. ${glP(mgBut)} % · fruit ${glP(pc.fr)} % · EST ${glP(pc.es)} %`,mgBut>=5&&pc.es>=29&&pc.fr>=(fr&&fr.t==='acide'?10:15),'minimum 5 % MG butyrique, 14 % saccharose, 15 % de fruits doux (10 % acides), 29 % EST');
      if(p.cat==='standard')chk('Catégorie','glace standard aux œufs',null,"la MG de la couverture n'est pas butyrique : pas d'appellation « crème glacée » (ch. XI)");
    }
  }else{
    rng('Extrait sec total',pc.es,29,34,'29 à 34 % (sorbet au goût français)',H.estLo.replace(', du lait en poudre ou de la matière grasse',' ou du fruit').replace(" le lait / l'eau","l'eau"),H.estHi.replace(' ou poudre de lait','').replace('ajoutez du liquide',"ajoutez de l'eau"));
    chk('Taux sucrant',fmt(Math.round(pc.ps)),pc.ps>=26&&pc.ps<=33,'≈ 30',pc.ps<26?H.tsLo:H.tsHi);
    if(p.custom){
      rng('Sucres ajoutés',pc.su,20,30,'20 à 30 % (les essais du livre : 23 à 28 %)','Pas assez de sucres : sorbet dur et glacé. Ajoutez du saccharose ou du glucose atomisé.','Trop de sucres : sorbet mou et collant. Réduisez les sucres.');
      if(pc.mg>1)chk('Matière grasse',glP(pc.mg)+' %',false,'un sorbet ne contient normalement ni lait ni crème','Avec des produits laitiers, choisissez plutôt le type « crème glacée ».');
      if(pc.stab>1)chk('Stabilisant',glP(pc.stab)+' %',false,'1 % maximum (législation)','Trop de stabilisant : texture gommeuse. 0,4 % suffit.');
      if(fl.length){const mini=acide?15:35,ok=pc.fr>=mini&&pc.su>=18;chk(`Appellation « sorbet aux fruits ${acide?'acides':'doux'} »`,`fruit ${glP(pc.fr)} %`,ok?true:null,`minimum ${mini} % de fruits et 18 % de sucres`)}
      else chk('Fruit','aucun',null,'pas de fruit : sorbet aux vins, alcools ou arômes (25 % de saccharose minimum)');
    }else{
      const fr=GL_FRUITS[p.fruit],mini=fr.t==='acide'?15:35;
      chk(`Législation sorbet aux fruits ${fr.t}s`,`fruit ${glP(pc.fr)} % · saccharose ${glP(p.sacch)} %`,pc.fr>=mini&&(p.sacch>=18||pc.su>=18),`minimum ${mini} % de fruits ${fr.t}s et 18 % de sucres`);
    }
  }
  return out;
}

// ---- Procédé de fabrication (ch. VI, X et XIII) ----
function glProcede(type,p,r){
  const f=p.fruit?GL_FRUITS[p.fruit]:null,st=[],g=glG,has=k=>r.lines.some(l=>l.k===k);
  const fruitLs=r.lines.filter(l=>l.k==='fruit'),fruitL=fruitLs.find(l=>l.fk===p.fruit)||fruitLs[0];
  const fruitTxt=fruitLs.map(l=>`${g(l.w)} g de ${l.n.toLowerCase()}`).join(' et ');
  const premix=r.stabW*10;
  let mac='';
  if(f&&f.r&&fruitL){const su=Math.min(fruitL.w/f.r,Math.max(0,r.sacchTot-premix));if(su>1)mac=`<b>La veille (fruits « du marché »)</b> : mélanger les ${g(fruitL.w)} g de fruits (${f.n.toLowerCase()} : lavés, équeutés ou dénoyautés) avec ${g(su)} g de sucre <i>pris sur le saccharose de la recette</i> (proportion fruit:sucre ${f.r}:1). Couvrir et réserver 12 à 24 h à +4 °C : le jus et le goût du fruit passent dans le sirop par osmose (Arbuckle).`}
  if(mac)st.push(mac);
  st.push('Peser rigoureusement tous les ingrédients, le stabilisant avec une précision encore plus stricte.');
  if(r.stabW)st.push(`Prémélanger intimement les ${g(r.stabW)} g de stabilisant avec ${g(premix)} g de saccharose (10 fois son poids, prélevés sur le sucre de la recette).`);
  const sug=[has('glucose')&&'le glucose atomisé',has('inverti')&&'le sucre inverti',has('dextrose')&&'le dextrose'].filter(Boolean);
  const autres=r.lines.filter(l=>l.k==='autre').map(l=>l.n);
  if(type==='ci'){
    const liq=[has('lait')&&'le lait',has('ecreme')&&'le lait écrémé',has('eau')&&"l'eau"].filter(Boolean);
    st.push(`Verser ${liq.join(' et ')||'les liquides'} dans le pasteurisateur (ou une casserole)${has('poudre')||has('poudre26')?' et ajouter le lait en poudre en fouettant':''}.${p.vanille?' Ajouter la vanille (gousses fendues et grattées).':''}`);
    st.push(`À 25-30 °C : ajouter ${has('sacch')?'le saccharose restant':'les sucres'}${sug.length?', '+sug.join(', '):''}.`);
    const fats=[(has('creme')||has('creme30')||has('creme40'))&&'la crème',has('beurre')&&'le beurre',has('couv')&&'la couverture hachée',has('cacao')&&'le cacao en poudre',has('cafe')&&'le café soluble',has('pamande')&&"la pâte d'amande",has('pnoisette')&&'la pâte de noisette',...autres].filter(Boolean);
    if(fats.length)st.push(`À 35 °C : ajouter ${fats.join(', ')}.`);
    if(has('jaunes'))st.push("À 40 °C : ajouter les jaunes d'œufs.");
    if(r.stabW)st.push('À 45-55 °C (pas plus !) : ajouter en pluie le mélange stabilisant/sucre, sous forte agitation.');
    st.push('Pasteuriser : monter à +83/85 °C, puis refroidir le plus rapidement possible à +4/+2 °C. Homogénéiser si possible (mixeur plongeur à défaut).');
    st.push('Maturer 12 heures à +2/+4 °C (pas davantage) : les protéines se réhydratent et le stabilisant fait tout son effet.');
    if(fruitLs.length)st.push(`Juste avant de glacer : ajouter au mix ${fruitTxt}${mac?' (avec le sirop de macération)':''}, bien mixer et glacer sans attendre.`);
    st.push('Glacer en turbine : extraction vers −6/−10 °C ; un foisonnement de 50 à 75 % est satisfaisant pour une crème glacée artisanale.');
  }else{
    st.push(`Chauffer l'eau, y ajouter ${has('sacch')?'le saccharose restant':'les sucres'}${sug.length?', '+sug.join(', '):''}${autres.length?', '+autres.join(', '):''}.`);
    if(r.stabW)st.push('À 45/50 °C : incorporer en pluie le mélange stabilisant/sucre, avec une bonne agitation.');
    st.push('Monter le sirop à 83 °C puis le refroidir rapidement à +4 °C.');
    st.push('Maturer 4 heures au minimum pour que le stabilisant agisse parfaitement.');
    if(fruitLs.length)st.push(`Avant le glaçage : ajouter ${fruitTxt}${mac?' (avec le sirop de macération)':''} en mixant bien, puis tamiser.`);
    st.push('Glacer : pour un sorbet, viser un foisonnement modéré de 30 à 40 %.');
  }
  st.push('Placer les bacs couverts à −25 °C quelques heures (idéalement en cellule de surgélation rapide), puis conserver à −20/−22 °C.');
  return st;
}

// ============================================================================
// Mes recettes de glaces : composition libre, saisie en grammes
// ============================================================================
// Ligne enregistrée : {i:'lait'|'f:fraise'|'couv'|'autre'|…, w:grammes, (couv) pate, cmg, (autre) n, mg, esdl, su, es}
const GL_CAT=[
  ['Produits laitiers',['lait','ecreme','creme30','creme','creme40','beurre','poudre','poudre26']],
  ['Sucres',['sacch','glucose','inverti','dextrose']],
  ['Œufs et stabilisant',['jaunes','stab']],
  ['Fruits (purée ou jus, sans sucre ajouté)',Object.keys(GL_FRUITS).map(k=>'f:'+k)],
  ['Chocolat, fruits secs, arômes',['couv','cacao','pamande','pnoisette','cafe','vanille']],
  ['Autres',['eau','autre']]
];
const glIngName=i=>i.startsWith('f:')?glFruitName(GL_FRUITS[i.slice(2)]):i==='couv'?'Chocolat de couverture':i==='autre'?'Autre ingrédient (à décrire)…':(GL_ING[i]||{}).n||i;
function glCustomLine(l,w){
  if(l.i.startsWith('f:'))return glFruitLine(l.i.slice(2),w);
  if(l.i==='couv'){const pate=glN(l.pate)||66,cmg=glN(l.cmg)||40.6;return glCouvLine(w,pate,cmg)}
  if(l.i==='autre')return glLine('autre',w,{n:String(l.n||'').trim()||'Autre ingrédient',mg:glN(l.mg),esdl:glN(l.esdl),su:glN(l.su),ps:100,es:glN(l.es)});
  return glLine(l.i,w);
}
function glCalcCustom(P,rec){
  const src=(rec.lines||[]).filter(l=>glN(l.w)>0&&(l.i.startsWith('f:')||GL_ING[l.i]||l.i==='couv'||l.i==='autre'));
  const ref=src.reduce((a,l)=>a+glN(l.w),0);
  if(!ref)return{err:'Ajoutez des ingrédients avec leur poids en grammes.'};
  const k=P/ref,lines=src.map(l=>glCustomLine(l,glN(l.w)*k)),warn=[];
  src.forEach(l=>{if(l.i==='autre'&&glN(l.es)<glN(l.mg)+glN(l.esdl)+glN(l.su)-0.01)warn.push(`« ${String(l.n||'Autre ingrédient').trim()} » : son extrait sec (${glP(glN(l.es))} %) devrait être au moins égal à MG + ESDL + sucres (${glP(glN(l.mg)+glN(l.esdl)+glN(l.su))} %).`)});
  src.forEach(l=>{if(l.i==='couv'&&!(glN(l.pate)>glN(l.cmg)&&glN(l.pate)<=100))warn.push('Couverture : le % de pâte de cacao doit être supérieur au % de matière grasse (et au plus 100).')});
  if(rec.type==='so'&&!lines.some(l=>l.k==='eau'||l.k==='fruit'))warn.push("Un sorbet se fait avec de l'eau et/ou du fruit : ajoutez-en.");
  const sum=key=>lines.reduce((a,l)=>a+l[key],0),es=sum('es'),mg=sum('mg'),su=sum('su');
  const S=[];
  S.push(['Étape 1 — Mise à l’échelle',[Math.abs(k-1)<1e-9?`Recette saisie pour ${glG(ref)} g = poids voulu : coefficient ×1`:`Recette saisie pour ${glG(ref)} g, poids voulu ${glG(P)} g → coefficient ${glG(P)} ÷ ${glG(ref)} = <b>×${fmt(Math.round(k*10000)/10000)}</b> appliqué à chaque ingrédient`]]);
  S.push(['Étape 2 — Extrait sec apporté par chaque ingrédient',lines.map(l=>`${esc(l.n)} : ${glG(l.w)} g × ${glP(l.w?l.es/l.w*100:0)} % = <b>${glG(l.es)} g</b>`)]);
  S.push(['Étape 3 — Totaux',[
    `Extrait sec total = ${lines.filter(l=>l.es>0.0001).map(l=>glG(l.es)).join(' + ')} = <b>${glG(es)} g</b>, soit ${glG(es)} ÷ ${glG(P)} × 100 = <b>${glP(es/P*100)} %</b>`,
    mg>0.0001?`Matière grasse = ${lines.filter(l=>l.mg>0.0001).map(l=>glG(l.mg)).join(' + ')} = ${glG(mg)} g, soit <b>${glP(mg/P*100)} %</b>`:'Matière grasse : 0 g',
    `Sucres = ${lines.filter(l=>l.su>0.0001).map(l=>glG(l.su)).join(' + ')||'0'} = ${glG(su)} g, soit <b>${glP(su/P*100)} %</b>`,
    `Eau = ${glG(P)} − ${glG(es)} = ${glG(P-es)} g, soit ${glP((P-es)/P*100)} %`]]);
  const fr=lines.filter(l=>l.k==='fruit').sort((a,b)=>b.w-a.w)[0];
  const p={custom:true,fruit:fr?fr.fk:'',vanille:src.some(l=>l.i==='vanille')};
  return{lines,steps:S,warn,P,extra:[],sacchTot:lines.filter(l=>l.k==='sacch').reduce((a,l)=>a+l.w,0),stabW:sum('stab'),p,ref};
}

// Stockage des recettes personnelles : serveur (api.php, data/glaces.json) ou navigateur en secours
let glCustom=[],glLoaded=false;
const GL_LK='recettes-glaces-v1',glApi=(a,id)=>'api.php?action='+a+(id?'&id='+encodeURIComponent(id):'')+'&col=glaces';
const glLocal=()=>{try{return JSON.parse(localStorage.getItem(GL_LK)||'[]')}catch(e){return[]}};
const glSetLocal=a=>{try{localStorage.setItem(GL_LK,JSON.stringify(a))}catch(e){}};
async function glLoad(){
  try{if(store&&store.sync){const r=await fetch(glApi('list'),{cache:'no-store'});if(r.ok){const a=await r.json();glCustom=Array.isArray(a)?a:[];glLoaded=true;return}}}catch(e){}
  glCustom=glLocal();glLoaded=true;
}
async function glSave(rec){
  if(store&&store.sync){const r=await fetch(glApi('save',rec.id),{method:'POST',body:JSON.stringify(rec)});if(!r.ok)throw 0}
  else glSetLocal([...glLocal().filter(x=>x.id!==rec.id),rec]);
  glCustom=[...glCustom.filter(x=>x.id!==rec.id),rec];
}
async function glDel(id){
  if(store&&store.sync){const r=await fetch(glApi('delete',id),{method:'POST'});if(!r.ok)throw 0}
  else glSetLocal(glLocal().filter(x=>x.id!==id));
  glCustom=glCustom.filter(x=>x.id!==id);
}

// ============================================================================
// Vue
// ============================================================================
let glState=null;   // dernier choix, conservé en revenant sur la page
const GL_TYPE={ci:'Crème glacée',so:'Sorbet'};
// Recette sélectionnée : « b:fraise:so » (recette du livre) ou « c:<id> » (recette perso)
function glSel(){
  const v=glState.rid||'';
  if(v.startsWith('c:')){const rec=glCustom.find(x=>x.id===v.slice(2));if(rec)return{kind:'c',rec,type:rec.type==='so'?'so':'ci'}}
  const [,id,t]=v.split(':'),r=GL_RECETTES.find(x=>x.id===id&&x[t]);
  if(r)return{kind:'b',r,type:t};
  return{kind:'b',r:GL_RECETTES[0],type:'ci'};
}
const glPar=()=>{const s=glSel();return Object.assign({},s.r[s.type],glState.ov)};
const glTitle=(type,name,cat)=>(type==='ci'?(cat==='standard'?'Glace':'Crème glacée'):'Sorbet')+' '+name.replace(/ \(.*\)/,'').toLowerCase();

function glacesView(){
  const g=glState||(glState={rid:'b:vanille:ci',P:1000,ov:{},edit:null});
  if(g.edit)return glEditView();
  app.innerHTML=`<div class="row"><button id="bk">← Accueil</button><span style="flex:1"></span><button class="p" id="gnew">+ Nouvelle recette de glace</button><button id="gpr">🖨️ Imprimer</button></div>
  <h2 style="font-family:Lato,system-ui,sans-serif;margin:12px 0 4px">🍨 Glaces</h2>
  <p class="mu st">Choisissez une recette et le poids de mix voulu : la recette est équilibrée selon <i>La technologie des glaces</i> (B. Davenat) — table analytique et formules d'Arbuckle. Avec « Nouvelle recette », composez la vôtre et vérifiez qu'elle est cohérente.</p>
  <div class="gl-form">
    <div class="f"><label for="grc">Recette</label><select id="grc"></select></div>
    <div class="f"><label for="gp">Poids total du mix (g)</label><input id="gp" type="number" inputmode="decimal" min="100" step="50" value="${esc(g.P)}"></div>
  </div>
  <details class="gl-adv" id="gadv"${g.open?' open':''}><summary>⚙️ Réglages avancés du mix (en % du poids total)</summary><div id="gpar"></div></details>
  <div id="gres"></div>`;
  $('#bk').onclick=()=>{view={m:'list'};render()};
  $('#gpr').onclick=()=>window.print();
  $('#gnew').onclick=()=>glOpenEditor({id:uid(),n:'',e:'🍨',type:'ci',lines:[{i:'lait',w:''},{i:'creme',w:''},{i:'poudre',w:''},{i:'sacch',w:''},{i:'glucose',w:''},{i:'stab',w:''}]},true);
  $('#grc').onchange=e=>{g.rid=e.target.value;g.ov={};glForm();glRes()};
  $('#gp').oninput=e=>{g.P=e.target.value;glRes()};
  $('#gadv').ontoggle=e=>{g.open=e.target.open};
  glFillSelect();glForm();glRes();
  if(!glLoaded)glLoad().then(()=>{if(view.m==='glaces'&&!glState.edit&&$('#grc')){glFillSelect();glForm();glRes()}});
}
function glFillSelect(){
  const g=glState,opt=(v,l)=>`<option value="${esc(v)}"${v===g.rid?' selected':''}>${l}</option>`;
  const mine=[...glCustom].sort((a,b)=>String(a.n).localeCompare(String(b.n)));
  if(g.rid.startsWith('c:')&&!glCustom.some(x=>'c:'+x.id===g.rid)&&glLoaded)g.rid='b:vanille:ci';
  $('#grc').innerHTML=
    (mine.length?`<optgroup label="⭐ Mes recettes">${mine.map(x=>opt('c:'+x.id,`${esc(x.e||'🍨')} ${esc(x.n)} — ${GL_TYPE[x.type==='so'?'so':'ci'].toLowerCase()}`)).join('')}</optgroup>`:'')+
    ['ci','so'].map(t=>`<optgroup label="${t==='ci'?'🍦 Crèmes glacées':'🍧 Sorbets'}">${GL_RECETTES.filter(r=>r[t]).map(r=>opt(`b:${r.id}:${t}`,`${r.e} ${esc(r.n)}`)).join('')}</optgroup>`).join('');
  if(g.rid.startsWith('c:')&&!glLoaded)$('#grc').insertAdjacentHTML('afterbegin',`<option value="${esc(g.rid)}" selected>Chargement…</option>`);
}
function glForm(){
  const s=glSel(),adv=$('#gadv');
  adv.hidden=s.kind==='c';if(s.kind==='c')return;
  const g=glState,type=s.type,p=glPar();
  const keys=GL_PARAMS[type].filter(([k])=>k in p&&(k!=='fpct'||p.fruit)&&(!/^co/.test(k)||p.coSec)&&(k!=='caSec'||p.caSec)&&(k!=='cafe'||p.cafe));
  const bases=type==='ci'?`<div class="f"><label for="gbase">Base laitière</label><select id="gbase">${[['creme','Lait entier + crème 35 %'],['beurre','Lait entier + beurre'],['eau','Lait en poudre + eau + beurre']].map(([k,l])=>`<option value="${k}"${p.base===k?' selected':''}>${l}</option>`).join('')}</select></div>`:'';
  $('#gpar').innerHTML=`<div class="gl-pgrid">${keys.map(([k,l,mi,ma,st])=>`<div class="f"><label for="gk_${k}">${esc(l)}${/^coP|^coM/.test(k)?'':' (%)'}</label><input id="gk_${k}" data-gk="${k}" type="number" inputmode="decimal" min="${mi}" max="${ma}" step="${st}" value="${p[k]}"></div>`).join('')}${bases}</div>
  <div class="row"><button id="grs">Valeurs de la recette</button><span class="st">${p.src==='L'?'📖 Formule reprise du livre':'📐 Formule établie avec les règles du livre'} — ${esc(p.ref||'')}</span></div>`;
  $('#gpar').querySelectorAll('[data-gk]').forEach(i=>i.oninput=()=>{g.ov[i.dataset.gk]=glN(i.value);glRes()});
  const gb=$('#gbase');if(gb)gb.onchange=()=>{g.ov.base=gb.value;glRes()};
  $('#grs').onclick=()=>{g.ov={};glForm();glRes()};
}
function glRes(){
  const g=glState,s=glSel(),P=glN(g.P),box=$('#gres');
  if(g.rid.startsWith('c:')&&!glLoaded){box.innerHTML='<p class="mu">Chargement de vos recettes…</p>';return}
  if(!(P>=100&&P<=200000)){box.innerHTML='<p class="mu">Indiquez un poids total entre 100 g et 200 kg.</p>';return}
  let res,p,title,emo,head='';
  if(s.kind==='c'){
    res=glCalcCustom(P,s.rec);p=res.p;title=glTitle(s.type,s.rec.n||'sans nom')+' — '+glG(P)+' g de mix';emo=s.rec.e||'🍨';
    head=`<div class="row gl-acts"><span class="chip">⭐ Ma recette · ${GL_TYPE[s.type]}</span><span style="flex:1"></span><button id="ged">✏️ Modifier</button><button id="gdup">📋 Dupliquer</button><button class="d" id="gdel">Supprimer</button></div>`;
  }else{
    p=glPar();
    if(s.type==='ci'&&p.coSec>0&&!(p.coPate>p.coMg)){box.innerHTML='<p class="gl-err">Le % de pâte de cacao de la couverture doit être supérieur à son % de matière grasse.</p>';return}
    res=s.type==='ci'?glCalcCI(P,p):glCalcSO(P,p);title=glTitle(s.type,s.r.n,p.cat)+' — '+glG(P)+' g de mix';emo=s.r.e;
    head=`<div class="row gl-acts"><span class="chip">${GL_TYPE[s.type]}</span><span style="flex:1"></span><button id="gcp">📋 Copier dans mes recettes pour la modifier</button></div>`;
  }
  if(res.err){box.innerHTML=head+`<p class="gl-err">⚠️ ${esc(res.err)}</p>`;glResActs(s,res);return}
  box.innerHTML=head+glRender(s.type,p,res,title,emo,true);
  glResActs(s,res);
}
function glResActs(s,res){
  const g=glState,b=id=>document.getElementById(id);
  if(b('ged'))b('ged').onclick=()=>glOpenEditor(JSON.parse(JSON.stringify(s.rec)),false);
  if(b('gdup'))b('gdup').onclick=()=>glOpenEditor(Object.assign(JSON.parse(JSON.stringify(s.rec)),{id:uid(),n:s.rec.n+' (copie)'}),true);
  if(b('gdel'))b('gdel').onclick=()=>{b('gdel').outerHTML='<span class="row"><b style="color:#c0392b">Supprimer cette recette ?</b><button class="d" id="gdy">Oui</button><button id="gdn">Non</button></span>';
    b('gdy').onclick=async()=>{try{await glDel(s.rec.id)}catch(e){b('gdy').closest('.row').innerHTML='<b style="color:#c0392b">⚠️ Échec de la suppression</b>';return}g.rid='b:vanille:ci';glacesView()};
    b('gdn').onclick=()=>glRes()};
  if(b('gcp')&&res.lines)b('gcp').onclick=()=>{
    const r1=x=>Math.round(x*10)/10;
    const lines=res.lines.map(l=>l.k==='fruit'?{i:'f:'+l.fk,w:r1(l.w)}:l.k==='couv'?{i:'couv',w:r1(l.w),pate:l.pate,cmg:l.cmg}:{i:l.k,w:r1(l.w)});
    if(s.r[s.type].vanille)lines.push({i:'vanille',w:r1(res.P/1000*s.r[s.type].vanille)});
    glOpenEditor({id:uid(),n:s.r.n.replace(/ \(.*\)/,'')+' (ma version)',e:s.r.e,type:s.type,lines},true)};
}
// Rendu commun : recette pesée, contrôles, calcul, table analytique, fabrication
function glRender(type,p,res,title,emo,full){
  const P=res.P,tot=glTotals(res.lines,P),f=p.fruit?GL_FRUITS[p.fruit]:null,checks=glChecks(type,p,res,tot);
  const cols=[['mg','MG'],['esdl','ESDL'],['su','Sucres'],['jau','Jaunes'],['fr','Fruits'],['cac','Cacao sec'],['stab','Stab.'],['es','EST']].filter(([k])=>tot.t[k]>0.0001);
  const ingRows=[...res.lines].sort((a,b)=>b.w-a.w),bad=checks.filter(c=>c.ok===false);
  const verdict=p.custom?(bad.length?`<div class="gl-verdict ko"><b>⚠️ ${bad.length} point${bad.length>1?'s':''} à revoir</b><ul>${bad.map(c=>`<li><b>${esc(c.lbl)}</b> : ${esc(c.hint||c.ref)}</li>`).join('')}</ul></div>`:'<div class="gl-verdict ok"><b>✅ Recette cohérente</b> — tous les critères d’équilibre du livre sont respectés.</div>'):'';
  return `
  ${full?`<section class="gl-card"><h3>${emo} ${esc(title)}</h3>
    <table class="gl-ing"><tbody>${ingRows.map(l=>`<tr><td>${esc(l.n)}${l.note?`<div class="st">${esc(l.note)}</div>`:''}</td><td class="n"><b>${glG(l.w)} g</b></td><td class="n mu">${glP(l.w/P*100)} %</td></tr>`).join('')}
    ${res.extra.map(x=>`<tr><td>${esc(x.n)}<div class="st">${esc(x.note)}</div></td><td class="n"><b>${glG(x.w)} g</b></td><td></td></tr>`).join('')}</tbody>
    <tfoot><tr><td>Total</td><td class="n"><b>${glG(tot.t.w)} g</b></td><td class="n mu">100 %</td></tr></tfoot></table>
    ${f?`<p class="st">🍓 ${esc(f.n)} : ${esc(f.f)}, ≈ ${p.es||f.es} % d'extrait sec (fruit ${f.t}). ${esc(f.note)}</p>`:''}
  </section>`:''}
  ${res.warn.map(w=>`<p class="gl-warn">⚠️ ${esc(w)}</p>`).join('')}
  <section class="gl-card"><h3>${p.custom?'🔎 Cohérence de la recette':'✅ Caractéristiques obtenues'}</h3>${verdict}<table class="gl-chk"><tbody>${checks.map(c=>`<tr><td>${c.ok===null?'ℹ️':c.ok?'✅':'⚠️'}</td><td>${esc(c.lbl)}${c.ref?`<div class="st">${esc(c.ref)}</div>`:''}</td><td class="n gl-v"><b>${esc(c.val)}</b></td></tr>`).join('')}</tbody></table>
    <p class="st">Taux sucrant estimé : Σ (poids de chaque sucre × pouvoir sucrant) — saccharose 100, sucre inverti 127, dextrose 74, glucose atomisé 47, lactose 16 (50 % de l'ESDL), sucres des fruits ≈ 80 % de leur extrait sec × 130.</p></section>
  <section class="gl-card"><h3>🧮 Détail du calcul</h3>${res.steps.map(([t,ls])=>`<h4>${esc(t)}</h4><ul>${ls.map(x=>`<li>${x}</li>`).join('')}</ul>`).join('')}</section>
  <section class="gl-card"><h3>📊 Table analytique (en g)</h3><div class="gl-scroll"><table class="gl-at"><thead><tr><th>Ingrédient</th><th>Poids</th>${cols.map(c=>`<th>${c[1]}</th>`).join('')}</tr></thead>
    <tbody>${res.lines.map(l=>`<tr><td>${esc(l.n)}</td><td class="n">${glG(l.w)}</td>${cols.map(([k])=>`<td class="n">${l[k]>0.0001?glG(l[k]):''}</td>`).join('')}</tr>`).join('')}</tbody>
    <tfoot><tr><td>Totaux</td><td class="n">${glG(tot.t.w)}</td>${cols.map(([k])=>`<td class="n">${glG(tot.t[k])}</td>`).join('')}</tr>
    <tr><td>Pourcentages</td><td></td>${cols.map(([k])=>`<td class="n"><b>${glP(tot.pc[k])}</b></td>`).join('')}</tr></tfoot></table></div>
    <p class="st">EST = extrait sec total · ESDL = extrait sec dégraissé du lait · MG = matière grasse totale (lait, crème, beurre, jaunes à 33,5 %, cacao, fruits secs).</p></section>
  ${full?`<section class="gl-card"><h3>👩‍🍳 Fabrication</h3><ol class="gl-steps">${glProcede(type,p,res).map(s=>`<li>${s}</li>`).join('')}</ol></section>`:''}`;
}

// ---- Éditeur de recette personnelle ----
function glOpenEditor(rec,isNew){glState.edit=rec;glState.editNew=isNew;window.scrollTo(0,0);glEditView()}
function glEditView(){
  const g=glState,r=g.edit;
  app.innerHTML=`<div class="row"><button id="gx">← Annuler</button></div>
  <h2 style="font-family:Lato,system-ui,sans-serif;margin:12px 0 4px">${g.editNew?'Nouvelle recette de glace':'Modifier la recette'}</h2>
  <p class="mu st">Indiquez le parfum et les quantités de chaque ingrédient (sucres, matières grasses, lait, fruits…) en grammes, pour n'importe quel poids : l'extrait sec, la matière grasse, l'ESDL, les sucres et le taux sucrant sont calculés en direct pour vérifier que la recette est cohérente. Elle sera ensuite recalculée pour le poids de mix que vous voudrez.</p>
  <section class="gl-card">
    <div class="gl-eh"><div class="f"><label for="gen">Parfum / nom de la recette</label><input id="gen" value="${esc(r.n)}" placeholder="ex. Pistache, Caramel beurre salé…"></div>
    <div class="f"><label for="gee">Emoji</label><input id="gee" value="${esc(r.e||'')}" maxlength="4"></div>
    <div class="f"><label>Type</label><div class="row" id="get">${['ci','so'].map(t=>`<button data-t="${t}" class="${r.type===t?'p':''}">${t==='ci'?'🍦 Crème glacée':'🍧 Sorbet'}</button>`).join('')}</div></div></div>
  </section>
  <section class="gl-card"><h3>🧺 Ingrédients <span class="st" id="gew"></span></h3><div id="gel"></div><button id="gea">+ Ajouter un ingrédient</button></section>
  <div id="gean"></div>
  <div class="row" style="margin:14px 0 30px"><button class="p" id="ges">💾 Enregistrer</button><button id="gx2">Annuler</button><span class="st" id="gem"></span></div>`;
  const back=()=>{g.edit=null;glacesView()};
  $('#gx').onclick=back;$('#gx2').onclick=back;
  $('#gen').oninput=e=>{r.n=e.target.value;glEdAnalyse()};
  $('#gee').oninput=e=>{r.e=e.target.value};
  $('#get').querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{r.type=b.dataset.t;$('#get').querySelectorAll('[data-t]').forEach(x=>x.className=x===b?'p':'');glEdAnalyse()});
  $('#gea').onclick=()=>{r.lines.push({i:r.type==='so'?'eau':'lait',w:''});glEdRows();const q=$('#gel').querySelectorAll('[data-f=w]');q[q.length-1].focus()};
  const gel=$('#gel');
  gel.addEventListener('input',e=>{const t=e.target,row=t.closest('[data-ix]');if(!row||!t.dataset.f)return;r.lines[+row.dataset.ix][t.dataset.f]=t.value;glEdAnalyse()});
  gel.addEventListener('change',e=>{const t=e.target,row=t.closest('[data-ix]');if(!row||!t.matches('select'))return;const l=r.lines[+row.dataset.ix];l.i=t.value;
    if(l.i==='couv'){l.pate=l.pate||66;l.cmg=l.cmg||40.6}glEdRows()});
  gel.addEventListener('click',e=>{const b=e.target.closest('[data-del]');if(!b)return;r.lines.splice(+b.closest('[data-ix]').dataset.ix,1);glEdRows()});
  $('#ges').onclick=async()=>{
    const m=$('#gem');r.n=String(r.n||'').trim();
    if(!r.n){m.textContent='⚠️ Donnez un nom à la recette.';$('#gen').focus();return}
    if(!r.lines.some(l=>glN(l.w)>0)){m.textContent='⚠️ Ajoutez au moins un ingrédient avec son poids.';return}
    const rec={id:r.id,n:r.n,e:String(r.e||'').trim()||'🍨',type:r.type==='so'?'so':'ci',lines:r.lines.filter(l=>glN(l.w)>0).map(l=>{const o={i:l.i,w:glN(l.w)};if(l.i==='couv'){o.pate=glN(l.pate);o.cmg=glN(l.cmg)}if(l.i==='autre'){o.n=String(l.n||'').trim();['mg','esdl','su','es'].forEach(k=>o[k]=glN(l[k]))}return o})};
    m.textContent='Enregistrement…';
    try{await glSave(rec)}catch(e){m.textContent='⚠️ Échec de l’enregistrement (serveur injoignable ?)';return}
    g.edit=null;g.rid='c:'+rec.id;g.ov={};glacesView();
  };
  glEdRows();
}
function glEdRows(){
  const r=glState.edit;
  const sel=i=>`<select data-k="i" aria-label="Ingrédient">${GL_CAT.map(([lab,ks])=>`<optgroup label="${esc(lab)}">${ks.map(k=>`<option value="${esc(k)}"${k===i?' selected':''}>${esc(glIngName(k))}</option>`).join('')}</optgroup>`).join('')}</select>`;
  const num=(f,v,lab,ph)=>`<label class="gl-mini">${lab}<input data-f="${f}" type="number" inputmode="decimal" min="0" step="any" value="${esc(v??'')}" placeholder="${ph||''}"></label>`;
  $('#gel').innerHTML=r.lines.length?r.lines.map((l,ix)=>`<div class="gl-erow" data-ix="${ix}">
    <div class="gl-eline">${sel(l.i)}<input data-f="w" type="number" inputmode="decimal" min="0" step="any" value="${esc(l.w)}" placeholder="g" aria-label="Poids en grammes"><span class="mu">g</span><button data-del title="Retirer" aria-label="Retirer">✕</button></div>
    ${l.i==='couv'?`<div class="gl-sub">${num('pate',l.pate,'% pâte de cacao')}${num('cmg',l.cmg,'% matière grasse')}<span class="st">indiqués sur l'emballage ; sucre = 100 − % pâte</span></div>`:''}
    ${l.i==='autre'?`<div class="gl-sub"><label class="gl-mini gl-wide">Nom<input data-f="n" value="${esc(l.n||'')}" placeholder="ex. pâte de pistache"></label>${num('mg',l.mg,'% MG')}${num('esdl',l.esdl,'% ESDL')}${num('su',l.su,'% sucres')}${num('es',l.es,'% extrait sec')}<span class="st">valeurs pour 100 g (étiquette nutritionnelle) ; extrait sec = 100 − % d'eau</span></div>`:''}
  </div>`).join(''):'<p class="mu">Aucun ingrédient.</p>';
  glEdAnalyse();
}
function glEdAnalyse(){
  const r=glState.edit,box=$('#gean');if(!box)return;
  const ref=r.lines.reduce((a,l)=>a+glN(l.w),0);
  $('#gew').textContent=ref?`— total ${glG(ref)} g`:'';
  if(!ref){box.innerHTML='<p class="mu">Saisissez les poids pour voir l’analyse.</p>';return}
  const res=glCalcCustom(ref,r);
  if(res.err){box.innerHTML=`<p class="gl-err">⚠️ ${esc(res.err)}</p>`;return}
  box.innerHTML=glRender(r.type==='so'?'so':'ci',res.p,res,'',r.e,false);
}
