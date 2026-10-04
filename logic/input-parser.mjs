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
  {canonical:'DaVinci Resolve',aliases:['davinci','da vinci','davinci resolve','давінчі','да винчи','да вінчі'],category:'business'},
  {canonical:'Kaufland',aliases:['kaufland','кауфланд'],category:'groceries'},
  {canonical:'Netto',aliases:['netto','нетто'],category:'groceries'},
  {canonical:'Dino',aliases:['dino','дино'],category:'groceries'},
  {canonical:'Stokrotka',aliases:['stokrotka','стокротка'],category:'groceries'},
  {canonical:'Carrefour Express',aliases:['carrefour express','карфур експрес'],category:'groceries'},
  {canonical:'Silpo',aliases:['silpo','сільпо','сильпо'],category:'groceries'},
  {canonical:'ATB',aliases:['атб','atb'],category:'groceries'},
  {canonical:'Novus',aliases:['novus','новус'],category:'groceries'},
  {canonical:'Rossmann',aliases:['rossmann','росман'],category:'other'},
  {canonical:'Hebe',aliases:['hebe','хебе'],category:'other'},
  {canonical:'Pepco',aliases:['pepco','пепко'],category:'other'},
  {canonical:'Action',aliases:['action','екшн'],category:'other'},
  {canonical:'Zara',aliases:['zara','зара'],category:'other'},
  {canonical:'H&M',aliases:['h&m','hm','аш енд ем'],category:'other'},
  {canonical:'Reserved',aliases:['reserved','резервед'],category:'other'},
  {canonical:'Decathlon',aliases:['decathlon','декатлон'],category:'other'},
  {canonical:'Leroy Merlin',aliases:['leroy merlin','леруа мерлен','леруа'],category:'home'},
  {canonical:'Castorama',aliases:['castorama','касторама'],category:'home'},
  {canonical:'OBI',aliases:['obi','оби'],category:'home'},
  {canonical:'Jysk',aliases:['jysk','юск','юськ'],category:'home'},
  {canonical:'Media Markt',aliases:['media markt','mediamarkt','медіа маркт','медиа маркт'],category:'tech'},
  {canonical:'RTV Euro AGD',aliases:['rtv euro agd','euro rtv agd','euro agd'],category:'tech'},
  {canonical:'x-kom',aliases:['x-kom','xkom','ікском'],category:'tech'},
  {canonical:'Allegro',aliases:['allegro','алегро'],category:'other'},
  {canonical:'Rozetka',aliases:['rozetka','розетка'],category:'tech'},
  {canonical:'Amazon',aliases:['amazon','амазон'],category:'other'},
  {canonical:'AliExpress',aliases:['aliexpress','аліекспрес','алиэкспресс'],category:'other'},
  {canonical:'McDonald\'s',aliases:['mcdonalds','mcdonald\'s','макдональдс','макдак','макдоналдс'],category:'food'},
  {canonical:'KFC',aliases:['kfc','кфс','кфц'],category:'food'},
  {canonical:'Burger King',aliases:['burger king','бургер кінг','бургер кинг'],category:'food'},
  {canonical:'Starbucks',aliases:['starbucks','старбакс'],category:'food'},
  {canonical:'Costa Coffee',aliases:['costa coffee','коста кофе','коста'],category:'food'},
  {canonical:'Domino\'s',aliases:['dominos','domino\'s','доміно піца'],category:'food'},
  {canonical:'Glovo',aliases:['glovo','глово'],category:'food'},
  {canonical:'Wolt',aliases:['wolt','вольт'],category:'food'},
  {canonical:'Pyszne.pl',aliases:['pyszne','pyszne.pl','пишне'],category:'food'},
  {canonical:'Orlen',aliases:['orlen','орлен'],category:'transport'},
  {canonical:'Shell',aliases:['shell','шелл'],category:'transport'},
  {canonical:'BP',aliases:['bp station','бп'],category:'transport'},
  {canonical:'WOG',aliases:['wog','вог'],category:'transport'},
  {canonical:'OKKO',aliases:['okko','окко'],category:'transport'},
  {canonical:'FlixBus',aliases:['flixbus','фліксбас','флікс'],category:'transport'},
  {canonical:'Ryanair',aliases:['ryanair','райнейр'],category:'travel'},
  {canonical:'Wizz Air',aliases:['wizz air','wizzair','візз','віз ейр'],category:'travel'},
  {canonical:'LOT',aliases:['lot polish','pol lot','lot airlines'],category:'travel'},
  {canonical:'Google One',aliases:['google one','гугл ван'],category:'subscriptions'},
  {canonical:'iCloud',aliases:['icloud','айклауд'],category:'subscriptions'},
  {canonical:'YouTube Premium',aliases:['youtube premium','ютуб преміум','ютуб премиум'],category:'subscriptions'},
  {canonical:'ChatGPT',aliases:['chatgpt','чатгпт','чат гпт'],category:'subscriptions'},
  {canonical:'Claude',aliases:['claude ai','anthropic','клод'],category:'subscriptions'},
  {canonical:'Notion',aliases:['notion','ноушн'],category:'subscriptions'},
  {canonical:'Figma',aliases:['figma','фігма'],category:'subscriptions'},
  {canonical:'Canva',aliases:['canva','канва'],category:'subscriptions'},
  {canonical:'Dropbox',aliases:['dropbox','дропбокс'],category:'subscriptions'},
  {canonical:'Disney+',aliases:['disney','дісней'],category:'subscriptions'},
  {canonical:'HBO Max',aliases:['hbo','hbo max','хбо'],category:'subscriptions'},
  {canonical:'Kyivstar',aliases:['kyivstar','київстар','киевстар'],category:'home'},
  {canonical:'Vodafone',aliases:['vodafone','водафон'],category:'home'},
  {canonical:'Orange',aliases:['orange','оранж'],category:'home'},
  {canonical:'Play',aliases:['play polska','плей'],category:'home'},
  {canonical:'InPost',aliases:['inpost','інпост'],category:'business'},
  {canonical:'Nova Poshta',aliases:['нова пошта','новая почта','nova poshta'],category:'business'}
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
/* Розширений словник відповідностей слів → категорій (укр, рос, пол, англ). Слова порівнюються після foldText; дві й більше збігів у категорії дають перевагу. */
const EXTRA_WORDS={"groceries":"хліб хлеб булка булочка батон багет лаваш тісто мука борошно цукор сіль сахар соль олія масло оливкова соняшникова молоко молоко кефір йогурт сир сыр творог сметана вершки вершки яйця яйця яйцо масло вершкове маргарин ковбаса колбаса сосиски сардельки шинка бекон сало м'ясо мясо курка курица куряче індичка свинина яловичина телятина баранина фарш риба рыба лосось форель оселедець скумбрія тунець креветки краби морепродукти овочі овощи картопля картошка морква цибуля лук часник капуста буряк помідори томати огірки перець кабачок баклажан гриби грибы салат шпинат зелень петрушка кріп базилік фрукти фрукты яблука яблоки груші банани банан апельсини мандарини лимон лимони виноград полуниця малина чорниця кавун диня персики абрикоси сливи ківі авокадо манго ананас горіхи орехи мигдаль фундук арахіс насіння сухофрукти родзинки мед мёд варення джем шоколад цукерки конфеты печиво печенье вафлі торт тістечка морозиво мороженое чіпси снеки сухарики батончик макарони паста спагеті лапша рис гречка вівсянка пластівці каші крупа квасоля горох сочевиця консерви тушонка кукурудза оливки солоні соління кетчуп майонез гірчиця соус спеції приправи вода сік сок лимонад кола пепсі фанта спрайт пиво вино горілка віскі коньяк шампанське алкоголь сидр енергетик напої чай кава мелена зернова розчинна какао пакети памперси підгузки серветки туалетний папір рушники мило шампунь гель зубна паста зубна щітка дезодорант порошок пральний прання кондиціонер для білизни миючий засіб губки пакети для сміття фольга пергамент плівка smaczne chleb bulka maslo mleko ser jajka jaja miesо mieso kurczak szynka kielbasa parowki ryba warzywa owoce ziemniaki cebula marchew pomidory ogorki jablka banany pieczywo makaron ryz kasza platki cukier sol mąka maka olej woda sok piwo wino wodka napoje slodycze czekolada ciastka lody chipsy zakupy spozywcze bread butter milk cheese eggs chicken meat fish vegetables fruit potatoes onion rice pasta sugar salt flour oil juice beer wine vodka snacks chocolate cookies ice cream detergent shampoo toothpaste tissue toilet paper napkins","food":"ресторан кафе кав'ярня кофейня кава кофе капучино латте американо еспресо раф флет уайт чай матча лимонад смузі коктейль бар паб піца пицца бургер гамбургер чізбургер картопля фрі наггетси хот-дог шаурма шаверма кебаб донер суші ролли роли сашимі вок рамен пад тай локшина стейк гриль шашлик барбекю пельмені вареники борщ суп салат десерт чізкейк тірамісу круасан пончик макарон млинці сирники сніданок снідав обід обідав вечеря вечеряв ланч бранч перекус доставка glovo bolt food uber eats wolt pyszne delivery takeaway kfc mcdonalds макдональдс бургер кінг burger king subway сабвей starbucks старбакс costa coffee dominos папа джонс papa johns pizza hut sushi master еко pyszne.pl restauracja kawiarnia obiad sniadanie kolacja kawa herbata piwo pizza kebab sushi lody ciasto drink lunch dinner breakfast brunch coffee tea latte espresso cappuccino croissant sandwich sandwiches fastfood fast food street food foodcourt фудкорт комплексний обід бізнес-ланч чайові tip","transport":"таксі такси taxi uber bolt убер болт індрайв indrive fretnow метро метрополітен автобус маршрутка трамвай тролейбус електричка поїзд потяг поезд квиток квитки білет проїзд проїзний транспортна карта кошти на карту ukrzaliznytsia укрзалізниця pkp intercity polregio flixbus флікс блаблакар blablacar бензин дизель дизельне газ автогаз пальне заправка азс wog окко okko shell bp orlen circle k parking паркінг парковка штраф евакуатор мийка автомийка шиномонтаж шини гума колеса масло замінa то техогляд страховка осаго каско ремонт авто сто запчастини дорога платна дорога вінетка autostrada toll bilet komunikacja miejska mpk ztm zkm kolej pociag autobus tramwaj metro taksowka paliwo benzyna olej myjnia parking mandat holowanie opony przeglad ubezpieczenie oc ac samochod auto mechanik warsztat części rower велосипед самокат скутер електросамокат bird lime tier hulajnoga rower miejski veturilo nextbike fuel gas gasoline diesel car wash tire tyres repair mot insurance roadside train bus tram ticket pass scooter bike","tech":"техніка електроніка гаджет комп'ютер компьютер ноутбук лептоп macbook imac mac mini ipad iphone айфон айпад смартфон телефон samsung xiaomi google pixel планшет монітор екран клавіатура миша мишка тачпад навушники airpods аірподс колонка колонки bluetooth зарядка зарядний кабель usb type-c адаптер хаб повербанк акумулятор батарея флешка ssd hdd диск жорсткий карта пам'яті sd microsd камера фотоапарат об'єктив обєктив штатив gopro action дрон dji mavic mini освітлення світло софтбокс мікрофон rode shure відеокарта gpu процесор cpu оперативна пам'ять ram материнська плата блок живлення корпус кулер вентилятор роутер маршрутизатор wifi модем принтер сканер картридж тонер телевізор tv приставка playstation xbox nintendo switch джойстик геймпад консоль гра steam епік smart watch годинник apple watch фітнес браслет електронна книга kindle pocketbook смарт колонка alexa лампа розумна розетка датчик ремонт телефону заміна екрану сервіс електроніки media markt mediaexpert x-kom morele komputronik euro rtv agd allegro olx rozetka розетка comfy фокстрот foxtrot citrus цитрус moyo ebay aliexpress алі експрес amazon laptop komputer monitor klawiatura mysz sluchawki ladowarka kabel telefon aparat obiektyw statyw mikrofon dysk pendrive router drukarka telewizor konsola gadzet elektronika sprzet headphones charger cable camera lens tripod microphone drive printer console gadget device","home":"дім дом квартира оренда рента rent чинш czynsz комуналка комунальні комунальні послуги світло електрика електроенергія prad газ вода водопостачання тепло опалення інтернет інтернет provider ukrtelecom київстар kyivstar vodafone lifecell orange play plus t-mobile netia upc vectra підвал домофон консьєрж ремонт ремонту будівельні цемент плитка фарба шпалери ламінат двері вікна сантехніка змішувач унітаз ванна душ меблі мебель диван крісло стіл стілець шафа комод ліжко матрац подушка ковдра постіль штори килим світильник лампа люстра ikea jysk leroy merlin castorama obi bricoman epicentr епіцентр нова лінія nowa linia праска пилосос холодильник пральна машина посудомийка мікрохвильовка духовка плита чайник тостер блендер міксер мультиварка кавоварка посуд тарілки чашки склянки каструля сковорода ніж виделка ложка набір кухня рушник скатертина прибирання клінінг прибиральниця хімчистка прання ремонт побутової садівництво сад город насіння розсада горщик квіти рослини газонокосарка інструменти дриль шуруповерт молоток цвяхи шурупи замок ключі сигналізація охорона страхування житла mieszkanie wynajem czynsz media prad gaz woda ogrzewanie internet remont meble sofa lozko szafa stol krzeslo lampa dywan firany naczynia garnek patelnia sprzatanie pralnia ogrod narzedzia wiertarka zamek klucze ubezpieczenie mieszkania home house apartment flat utilities electricity heating water internet furniture sofa bed wardrobe table chair lamp carpet curtains dishes cleaning laundry garden tools drill lock keys","subscriptions":"підписка подписка subscription abonament щомісячно щомісяця ежемесячно monthly netflix spotify apple music youtube premium youtube music icloud google one google drive dropbox onedrive adobe creative cloud photoshop lightroom premiere after effects figma canva notion evernote todoist chatgpt openai claude anthropic midjourney copilot github gitlab jetbrains vpn nordvpn expressvpn surfshark protonmail proton lastpass 1password bitwarden zoom slack microsoft 365 office word excel disney hbo max amazon prime apple tv paramount hulu crunchyroll twitch patreon boosty onlyfans substack medium kindle unlimited audible storytel empik go legimi duolingo coursera udemy skillshare masterclass gym fitness абонемент спортзал басейн yoga lingvist playstation plus xbox game pass nintendo online ea play steam wallet tinder bumble premium відеоредактор davinci final cut apple developer google play app store покупка в додатку in-app mobilny abonament plan taryfa tariff телефон тариф мобільний зв'язок","business":"бізнес бизнес студія студия робота работа зарплата зарплата гонорар проєкт проект замовлення заказ клієнт клиент оплата за роботу аванс передоплата предоплата рахунок фактура invoice інвойс faktura договір контракт підряд фріланс freelance монтаж зйомка съемка зйомки фото відео фотосесія відеозйомка кліп реклама ролик озвучка дубляж субтитри кольорокорекція колорист саунд-дизайн музика трек мастеринг апаратура оренда обладнання оренда студії локація реквізит модель актор актори ведучий ведуча монтажер оператор режисер продюсер асистент агентство агенція менеджер бухгалтер юрист податки податок пдв vat zus podatek ryczalt єдиний податок фоп спільний рахунок комісія процент відсоток еквайринг платіж stripe paypal wise payoneer revolut business реклама facebook ads google ads tiktok ads instagram таргет сайт домен хостинг hosting domain wordpress shopify wix tilda логотип дизайн макет бренд брендинг візитки друк поліграфія банер флаєр афіша упаковка склад доставка клієнту кур'єр пошта nova poshta нова пошта inpost dpd dhl ups fedex ukrposhta wynagrodzenie pensja projekt zlecenie klient faktura umowa freelancing montaz nagrania zdjecia wideo reklama agencja ksiegowa podatek zus vat domena hosting logo wizytowki druk salary fee project order client invoice contract freelance editing shooting photo video ad agency accountant tax domain hosting logo design print","travel":"подорож путешествие travel trip відпустка отпуск urlop wakacje готель отель hotel хостел hostel апартаменти apartments airbnb booking agoda hotels.com оренда житла бронювання бронь квиток на літак авіаквиток авіа літак самолёт flight ryanair wizz air lot polish airlines easyjet lufthansa klm emirates turkish airlines аеропорт airport lotnisko багаж bagaż валіза чемодан visa віза страховка мандрівника travel insurance екскурсія экскурсия excursion тур tour путівка путевка туристичний резорт resort пляж море гори лижі ski skipass ski-pass підйомник інструктор оренда авто car rental rentalcars sixt hertz avis europcar трансфер transfer таксі аеропорт мотель кемпінг палатка намет спальник рюкзак карта метро city pass музей музей museum квиток в музей театр кіно концерт фестиваль parking валюта обмін currency exchange kantor roaming роумінг сувеніри сувенір сувеніри подарунки з поїздки citypass wycieczka bilet lotniczy hotel nocleg wynajem samochodu przewodnik muzeum","other":"інше разное other різне подарунок подарунки подарок prezent kwiaty квіти букет донат благодійність charity допомога zbiorka збір внесок пожертва church церква школа курси навчання урок репетитор лікар лікарня аптека ліки таблетки вітаміни стоматолог зуби окуліст масаж косметолог перукар barber барбер стрижка манікюр педикюр салон краси спа одяг взуття куртка штани джинси футболка сорочка сукня светр кросівки черевики сумка рюкзак годинник прикраси кільце сережки ланцюжок парфуми косметика помада крем зоопарк тварини корм ветеринар кіт собака хом'як акваріум книги книжки канцелярія іграшки дитячі садок підручники штраф податок податок позика кредит відсотки комісія банку банкомат зняття переказ lekarz apteka leki dentysta fryzjer paznokcie odziez buty kurtka torebka perfumy kosmetyki ksiazki zabawki prezent datek mandat kredyt prowizja przelew gift donation doctor pharmacy medicine dentist haircut clothes shoes jacket bag perfume cosmetics books toys fine tax loan bank fee transfer"};
const EXTRA_INDEX=Object.entries(EXTRA_WORDS).map(([id,list])=>[id,[...new Set(list.split(/\s+/).map(w=>foldText(w).trim()).filter(w=>w.length>=3))]]);
function extraCategory(x,categories){
  const words=new Set(x.split(/\s+/).filter(Boolean));let best=null,bestScore=0;
  for(const [id,list] of EXTRA_INDEX){
    if(!categories.some(c=>c.id===id))continue;
    let score=0;for(const w of list){if(words.has(w))score+=2;else if(w.length>=5&&x.includes(w))score+=1;}
    if(score>bestScore){bestScore=score;best=id;}
  }
  return bestScore>=1?best:null;
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
  const extra=extraCategory(x,categories);if(extra)return extra;
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

