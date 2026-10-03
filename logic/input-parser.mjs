/* Deterministic input logic extracted from Voice Finance index.html,
 * pinned main commit 193dedf. No UI, browser storage, or rendering dependency.
 * categories/resolveCategory replace the sole former state.categories link.
 */
function normalizeWords(s){
  return String(s||'')
    .toLowerCase()
    .replace(/[’`]/g,"'")
    .replace(/[–—]/g,'-')
    .replace(/[.,!?;:()[\]{}]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}
function foldText(s){
  return normalizeWords(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/ł/g,'l').replace(/ż|ź/g,'z').replace(/ś/g,'s').replace(/ć/g,'c').replace(/ń/g,'n')
    .replace(/ą/g,'a').replace(/ę/g,'e').replace(/ó/g,'o')
    .replace(/[^\p{L}0-9'\s-]/gu,' ')
    .replace(/\s+/g,' ').trim();
}
const NUMBER_WORDS={
  нуль:0,ноль:0,один:1,одна:1,два:2,дві:2,три:3,чотири:4,пять:5,"п'ять":5,шість:6,сім:7,вісім:8,девять:9,"дев'ять":9,
  десять:10,одинадцять:11,дванадцять:12,тринадцять:13,чотирнадцять:14,пятнадцять:15,"п'ятнадцять":15,шістнадцять:16,
  сімнадцять:17,вісімнадцять:18,девятнадцять:19,"дев'ятнадцять":19,двадцять:20,тридцять:30,сорок:40,пятдесят:50,
  "п'ятдесят":50,шістдесят:60,сімдесят:70,вісімдесят:80,девяносто:90,"дев'яносто":90,сто:100,двісті:200,триста:300,
  чотириста:400,пятсот:500,"п'ятсот":500,шістсот:600,сімсот:700,вісімсот:800,девятсот:900,"дев'ятсот":900,
  zero:0,jeden:1,jedna:1,dwa:2,dwie:2,trzy:3,cztery:4,piec:5,szesc:6,siedem:7,osiem:8,dziewiec:9,dziesiec:10,
  jedenascie:11,dwanascie:12,trzynascie:13,czternascie:14,pietnascie:15,szesnascie:16,siedemnascie:17,osiemnascie:18,
  dziewietnascie:19,dwadziescia:20,trzydziesci:30,czterdziesci:40,piecdziesiat:50,szescdziesiat:60,siedemdziesiat:70,
  osiemdziesiat:80,dziewiecdziesiat:90,sto:100,dwiescie:200,trzysta:300,czterysta:400,piecset:500,szescset:600,
  siedemset:700,osiemset:800,dziewiecset:900,
  one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,
  fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,
  eighty:80,ninety:90,hundred:100
};
function wordsToNumber(s){
  const t=foldText(s).split(/\s+/);let total=0,current=0,seen=false;
  for(const w of t){
    if(['тисяча','тисячі','тисяч','тысяча','tysiac','tysiace','tysiecy','thousand'].includes(w)){total+=(current||1)*1000;current=0;seen=true;continue;}
    if(w==='hundred'){current=(current||1)*100;seen=true;continue;}
    if(Object.prototype.hasOwnProperty.call(NUMBER_WORDS,w)){current+=NUMBER_WORDS[w];seen=true;}
  }
  return seen?total+current:null;
}
function detectAmount(text){
  const raw=String(text||'').replace(/[−–—]/g,'-').replace(/(\d)\s+(\d{3})(?!\d)/g,'$1$2');
  const m=raw.match(/(?:^|\s)[+-]?(\d+(?:[.,]\d{1,2})?)(?=\s|$|zł|zl|pln|eur|euro|usd|gbp|злот|євро|евро|дол|фунт)/i)||raw.match(/(?:^|\s)[+-]?(\d+(?:[.,]\d{1,2})?)(?=\s)/);
  if(m)return Math.abs(parseFloat(m[1].replace(',','.')));
  const loose=raw.match(/[+-]?\s*(\d+(?:[.,]\d{1,2})?)/);if(loose)return Math.abs(parseFloat(loose[1].replace(',','.')));
  return wordsToNumber(raw);
}
function detectCurrency(t){
  const x=foldText(t);
  if(x.includes('євро')||x.includes('евро')||/(^|\s)(eur|euro)(\s|$)/.test(x))return'EUR';
  if(x.includes('долар')||x.includes('доллар')||/(^|\s)(usd|dollar|dollars)(\s|$)/.test(x))return'USD';
  if(x.includes('фунт')||/(^|\s)(gbp|pound|pounds)(\s|$)/.test(x))return'GBP';return'PLN';
}
function detectType(t){
  const raw=String(t||'');
  if(/^\s*\+/.test(raw))return'income';
  if(/^\s*[-−–—]/.test(raw))return'expense';
  const x=foldText(t);
  const incomeWords=['плюс','прихід','приход','дохід','доход','отримав','отримала','заробив','заробила','przychod','dochod','wplyw','zarobilem','zarobilam','otrzymalem','otrzymalam','income','received','earned','plus'];
  if(incomeWords.some(w=>x.split(/\s+/).includes(w)))return'income';
  if(x.includes('заплатив мені')||x.includes('заплатила мені')||x.includes('оплатив мені')||x.includes('paid me'))return'income';
  return'expense';
}
const MERCHANTS=[
  {canonical:'Biedronka',aliases:['biedronka','bedronka','bjedronka','biedronko','бєдронка','бедронка','бідронка','бьедронка'],category:'groceries'},
  {canonical:'Żabka',aliases:['zabka','żabka','жабка'],category:'groceries'},
  {canonical:'Lidl',aliases:['lidl','лідл'],category:'groceries'},
  {canonical:'Auchan',aliases:['auchan','ашан'],category:'groceries'},
  {canonical:'Carrefour',aliases:['carrefour','карфур'],category:'groceries'},
  {canonical:'Uber',aliases:['uber','убер'],category:'transport'},
  {canonical:'Bolt',aliases:['bolt','болт'],category:'transport'},
  {canonical:'Booking',aliases:['booking','booking.com','букинг','букінг'],category:'travel'},
  {canonical:'Airbnb',aliases:['airbnb','air bnb','еирбнб','ейрбнб'],category:'travel'},
  {canonical:'Netflix',aliases:['netflix','нетфликс','нетфлікс'],category:'subscriptions'},
  {canonical:'Spotify',aliases:['spotify','спотифай','спотіфай'],category:'subscriptions'},
  {canonical:'Adobe',aliases:['adobe','адобі','адоби'],category:'subscriptions'},
  {canonical:'OpenAI',aliases:['openai','open ai','опенай','оупен ай'],category:'subscriptions'},
  {canonical:'Apple',aliases:['apple','епл','эпл'],category:'tech'},
  {canonical:'IKEA',aliases:['ikea','икеа','ікеа'],category:'home'},
  {canonical:'DaVinci Resolve',aliases:['davinci','da vinci','davinci resolve','давінчі','да винчи','да вінчі'],category:'business'}
];
function editDistance(a,b){
  a=foldText(a);b=foldText(b);const m=a.length,n=b.length,dp=Array(n+1).fill(0);for(let j=0;j<=n;j++)dp[j]=j;
  for(let i=1;i<=m;i++){let prev=dp[0];dp[0]=i;for(let j=1;j<=n;j++){const tmp=dp[j];dp[j]=Math.min(dp[j]+1,dp[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=tmp;}}return dp[n];
}
function findMerchant(raw){
  const folded=foldText(raw);for(const m of MERCHANTS)for(const alias of m.aliases){const a=foldText(alias);if(folded.includes(a))return m;}
  const words=folded.split(/\s+/).filter(w=>w.length>=4);let best=null,bestScore=999;
  for(const m of MERCHANTS)for(const alias of m.aliases){const a=foldText(alias);if(a.includes(' '))continue;for(const w of words){const d=editDistance(w,a),mx=Math.max(w.length,a.length);if(mx>=6&&d<=Math.max(1,Math.floor(mx*.23))&&d<bestScore){best=m;bestScore=d;}}}return best;
}
function detectCategory(t, categories=[]){
  const merchant=findMerchant(t);if(merchant&&categories.some(c=>c.id===merchant.category))return merchant.category;
  const x=foldText(t);const rules=[
    ['groceries',/(продукт|харч|молок|хліб|хлеб|овоч|фрукт|мяс|риба|вода|напій|закуп|магазин|супермаркет|grocer|supermarket|sklep|spozyw|zakupy|jedzeni|warzyw|owoc|mleko|chleb)/],
    ['transport',/(uber|bolt|таксі|такси|taxi|транспорт|metro|метро|автобус|трамва|поїзд|поезд|квиток|білет|tramw|pociag|bilet|benzyn|бензин|дизел|палив|fuel|parking|парков|авто|машин|serwis.*auto)/],
    ['food',/(ресторан|кафе|кава|coffee|чай|pizza|піца|пицца|burger|бургер|food|їжа|обід|вечеря|снідан|доставка|sniad|obiad|kolac|restaur|kawiarn|lunch|dinner|breakfast|sushi|суші)/],
    ['tech',/(технік|електрон|гаджет|компют|ноутбук|лептоп|laptop|computer|телефон|смартфон|smartphone|камера|kamera|camera|lens|обєктив|monitor|монітор|клавіат|миша|мишк|mouse|навушник|наушник|headphone|headset|earbuds|airpods|słuchawk|sluchawk|колонк|speaker|зарядк|charger|кабел|cable|iphone|ipad|macbook|apple|samsung|xiaomi|телевізор|telewizor|tv|консол|playstation|xbox)/],
    ['subscriptions',/(підписк|subscription|abonament|щомісяч|monthly|netflix|spotify|adobe|openai|youtube premium|icloud|google one|patreon|canva|dropbox)/],
    ['home',/(дім|дом|квартир|ikea|мебл|ремонт|посуд|ламп|ліжк|кровать|стіл|стол|стілец|home|house|mieszk|mebl|remont|czynsz|оренд|rent|комунал|prad|газ|electric|прибиран|cleaning)/],
    ['travel',/(готел|hotel|hostel|flight|літак|самолет|авіа|booking|airbnb|подорож|travel|lotn|wakac|відпуст|urlop|валіз|багаж|visa|віза|тур|resort)/],
    ['business',/(бізнес|студі|робот|зарплат|гонорар|проєкт|проект|монтаж|з[йи]омк|фото|відео|shoot|editing|edit|montaz|nagran|client|клієнт|замовник|invoice|рахунок|фактур|davinci|реклам|marketing|офіс|office)/]
  ];
  for(const [id,re] of rules)if(re.test(x)&&categories.some(c=>c.id===id))return id;
  const custom=categories.find(c=>x.includes(foldText(c.name)));return custom?.id||(categories.some(c=>c.id==='other')?'other':categories[0]?.id);
}
function detectClient(raw,type){
  if(type!=='income')return'';const ps=[/(?:від|от|from|od)\s+([A-ZА-ЯІЇЄҐŁŚŻŹĆŃ][\p{L}\-']+)/u,/(?:клієнт|клиент|client)\s+([A-ZА-ЯІЇЄҐŁŚŻŹĆŃ]?[\p{L}\-']+)/iu,/^([A-ZА-ЯІЇЄҐŁŚŻŹĆŃ][\p{L}\-']+)\s+(?:заплатив|заплатила|paid|zapłacił|zaplacil)/u];
  for(const re of ps){const m=raw.match(re);if(m)return m[1];}return'';
}
function detectDebt(raw){
  const x=foldText(raw);let direction='';
  let clientMatch=raw.match(/(?:^|\s)(?:клієнт|клиент|client|klient)\s+([\p{L}'’\-]+)(?=\s|$)/iu);
  let owedMatch=raw.match(/(?:^|\s)(?:борг|долг|debt|dług|dlug)\s+(?!мені\b|мне\b|mnie\b)([\p{L}'’\-]+)(?=\s|$)/iu);
  if(clientMatch&&/(термінов|срочн|urgent)/.test(foldText(clientMatch[1])))clientMatch=null;if(owedMatch&&/(термінов|срочн|urgent)/.test(foldText(owedMatch[1])))owedMatch=null;
  if(clientMatch)direction='receivable';
  else if(owedMatch)direction='owed';
  else if(/(борг мені|мені вин(ен|на|ні)|вин(ен|на|ні) мені)/.test(x))direction='receivable';
  else if(/(я вин(ен|на)|мій борг|вин(ен|на) комусь)/.test(x))direction='owed';
  else if(/(?:^|\s)(клієнт|клиент|client|klient)(?:\s|$)/.test(x))direction='receivable';
  else if(/(?:^|\s)(борг|долг|debt|dług|dlug)(?:\s|$)/.test(x))direction='owed';
  if(!direction)return null;
  if(clientMatch)return{direction,person:clientMatch[1],urgent:/(термінов|срочн|urgent)/.test(x)};
  if(owedMatch)return{direction,person:owedMatch[1],urgent:/(термінов|срочн|urgent)/.test(x)};
  const patterns=direction==='owed'?[/(?:я\s+вин(?:ен|на)|мій\s+борг)\s+([\p{L}'-]+)/iu]:[/([\p{L}'-]+)\s+вин(?:ен|на|ні)\s+мені/iu,/мені\s+вин(?:ен|на|ні)\s+([\p{L}'-]+)/iu,/борг\s+мені\s+([\p{L}'-]+)/iu];
  let person='';for(const re of patterns){const m=raw.match(re);if(m){person=m[1];break;}}
  if(!person){const stop=new Set(['борг','долг','debt','dług','dlug','клієнт','клиент','client','klient','мені','мне','я','винен','винна','винні','терміново','срочно','urgent','pln','zł','zl','грн','uah','eur','usd','злотих','злоті','євро','доларів']);const words=raw.match(/[\p{L}'’\-]+/gu)||[],candidate=words.find(w=>!stop.has(foldText(w))&&/^[A-ZА-ЯІЇЄҐŁŚŻŹĆŃ]/u.test(w))||words.find(w=>!stop.has(foldText(w)));person=candidate||''}
  return{direction,person,urgent:/(термінов|срочн|urgent)/.test(x)};
}
function parseInput(text,{categories=[],resolveCategory}={}){
  const raw=String(text||'').trim(),debt=detectDebt(raw),merchant=findMerchant(raw),type=detectType(raw);
  if(debt)return{kind:'debt',...debt,amount:detectAmount(raw),currency:detectCurrency(raw),note:raw,transcript:raw};
  return{kind:'transaction',type,amount:detectAmount(raw),currency:detectCurrency(raw),category:resolveCategory?resolveCategory(raw):detectCategory(raw,categories),client:detectClient(raw,type),merchant:merchant?merchant.canonical:'',note:raw,transcript:raw};
}

export {normalizeWords,foldText,NUMBER_WORDS,wordsToNumber,detectAmount,detectCurrency,detectType,MERCHANTS,editDistance,findMerchant,detectCategory,detectClient,detectDebt,parseInput};
export const parseVoice=parseInput;
export function createInputParser({getCategories=()=>[],resolveCategory}={}){
  return {parse(text){return parseInput(text,{categories:getCategories(),resolveCategory})}};
}

