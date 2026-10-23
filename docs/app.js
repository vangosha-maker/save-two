'use strict';
const {Campaign,LEVELS,DIRS,wet,baseWet,atLever,gatePreview,rescued,personName,isRoof}=Rescue;
const campaign=new Campaign(),storageKey='save-two-v2';
let restored=false,storageAvailable=true;
try{const raw=localStorage.getItem(storageKey)||localStorage.getItem('save-two-v1');if(raw)restored=campaign.restore(raw);}catch{storageAvailable=false;}
const $=id=>document.getElementById(id);
const turnWord=n=>n%100>=11&&n%100<=14?'ходов':n%10===1?'ход':n%10>=2&&n%10<=4?'хода':'ходов';
const person=id=>'<span class="civilian '+(id==='A'?'blue':'purple')+'" aria-hidden="true"></span>';
const leverIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21h16M12 19V13l7-8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="19" cy="5" r="3" fill="currentColor"/><circle cx="12" cy="14" r="2" fill="currentColor"/></svg>';
function persist(){try{localStorage.setItem(storageKey,campaign.serialize());}catch{storageAvailable=false;}}
function selectLevel(id){if(campaign.select(id)){persist();render('Попытка этого уровня сохранена. Продолжайте или начните заново.');}}
function render(notice=''){
const game=campaign.game,s=game.state,l=LEVELS.find(l=>l.id===campaign.active),index=LEVELS.indexOf(l);
const twoRoofs=l.map.some(line=>line.includes('T')),roofNames=twoRoofs?'крыши S и T':'крыша S',onBridge=l.bridges?.includes(s.row*6+s.col)&&!s.broken.includes(s.row*6+s.col);
$('bridge-panel').hidden=!l.bridges;$('bridge-help').hidden=!l.bridges;$('evac-panel').hidden=!twoRoofs;
if(l.bridges){$('bridge-count').textContent='Мосты: целы '+(l.bridges.length-s.broken.length)+' / '+l.bridges.length;$('bridge-warning').textContent=onBridge&&s.status==='playing'?'Вы на мосту. Следующий успешный шаг разрушит его; переключение рычага — нет.':'Мост рушится после ухода. Паводок затапливает его по срокам строк.';}
if(twoRoofs)$('evac-status').textContent=['A','B'].map(id=>personName(id)+': '+(s.deliveries[id]?'доставлен на '+s.deliveries[id]:'ждёт доставки')).join(' · ');
$('task-copy').textContent='Коснитесь соседней клетки, чтобы шагнуть. Подберите двух жителей — фигурки в синем и сиреневом — и отнесите каждого '+(twoRoofs?'на любую из крыш S или T.':'на крышу S.');
$('roof-legend').textContent=twoRoofs?'S / T · безопасные крыши':'Крыша · всегда безопасна';
const nextIndex=l.flood.findIndex(n=>n>s.turn),nextTurn=l.flood[nextIndex],nextRow=nextIndex<0?-1:4-nextIndex;
const preview=gatePreview(s),canSwitch=!!l.gate&&atLever(s)&&s.status==='playing';
$('gate-panel').hidden=!l.gate;$('switch-gate').hidden=!l.gate;$('gate-help').hidden=!l.gate;
if(l.gate){
const mark=n=>n===0?'I':'II';
$('gate-status').textContent='Шлюз: вода в канале '+mark(1-s.phase);
$('gate-hint').textContent=canSwitch?'Вы у рычага. Переключение стоит 1 ход.':s.status==='playing'?'Для переключения встаньте на клетку с рычагом.':'Отмените ход или начните заново.';
$('switch-gate').disabled=!canSwitch;
$('switch-gate').innerHTML=leverIcon+'<span>Переключить шлюз · 1 ход</span>';
const changed=preview.filter(x=>x.before!==x.after&&l.map[x.row][x.col]!=='#');
$('gate-preview').textContent='После переключения и хода '+(s.turn+1)+': +≈ затопит '+changed.filter(x=>x.after).length+' кл. · −≈ осушит '+changed.filter(x=>!x.after).length+' кл.';
}
$('levels').replaceChildren();
LEVELS.forEach((level,i)=>{const b=document.createElement('button');b.type='button';b.dataset.level=level.id;b.ariaPressed=String(level.id===l.id);b.ariaLabel='Уровень '+(i+1)+': '+level.title+(campaign.games[level.id].state.status==='won'?', пройден':'');b.title=level.title;b.innerHTML='<span class="level-number">'+String(i+1).padStart(2,'0')+'</span><span class="level-name">'+level.title+'</span>'+(campaign.games[level.id].state.status==='won'?' ✓':'');b.addEventListener('click',()=>selectLevel(level.id));$('levels').append(b);});
$('level-title').textContent=l.title;
$('level-brief').textContent=l.brief;
$('tempo').textContent='Шагов между подъёмами воды: '+l.flood[0];
document.querySelector('.edition').textContent=String(index+1).padStart(2,'0')+' / '+String(LEVELS.length).padStart(2,'0');
$('flood-rules').textContent='После ходов '+l.flood.join(', ')+' затапливаются строки 5, 4, 3, 2. Здания не останавливают воду. Строка 1 и '+roofNames+' остаются сухими.';
$('turn').textContent=s.turn;$('saved').textContent=rescued(s);
$('carried').innerHTML=s.carried?person(s.carried)+'<span>Житель</span>':'Никого';
$('carried').ariaLabel=s.carried?personName(s.carried)+' с вами':'Никого';
$('forecast').innerHTML=nextTurn?'После хода <b>'+nextTurn+'</b> затопит строку <b>'+(nextRow+1)+'</b> · осталось шагов: <b>'+(nextTurn-s.turn)+'</b>':'Вода достигла предела. Строка 1 и '+roofNames+' безопасны.';
$('board').replaceChildren();$('row-times').replaceChildren();
l.map.forEach((line,row)=>{
const due=row===0?null:row===5?0:l.flood[4-row],label=document.createElement('div');
label.className='row-time'+(row===0?' permanent':due<=s.turn?' flooded':row===nextRow?' soon':'');
label.textContent=row===0?'∞':due<=s.turn?'≈':due;
label.title=label.ariaLabel='Строка '+(row+1)+': '+(row===0?'всегда сухо':due<=s.turn?'затоплена':'затопление после хода '+due)+([...line].some(isRoof)?', кроме крыши '+[...line].filter(isRoof).join(' и '):'');
$('row-times').append(label);
[...line].forEach((tile,col)=>{
const water=wet(row,col,s.turn,l.id,s.phase),player=s.row===row&&s.col===col;
const bridge=l.bridges?.includes(row*6+col),broken=s.broken?.includes(row*6+col);
const direction=Object.keys(DIRS).find(d=>s.row+DIRS[d][0]===row&&s.col+DIRS[d][1]===col);
const available=s.status==='playing'&&direction&&tile!=='#'&&!water&&!broken;
const cell=document.createElement('button');cell.type='button';cell.className='cell';cell.dataset.row=row;cell.dataset.col=col;
if(row===nextRow&&!isRoof(tile))cell.classList.add('next');
if(tile==='#'){cell.classList.add('wall');cell.innerHTML='<span class="building" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';}
if(water)cell.classList.add('water');
if(isRoof(tile)){cell.classList.add('roof');if(tile==='T')cell.classList.add('second-roof');cell.innerHTML='<span class="roof-lines" aria-hidden="true"></span><span class="roof-mark" aria-hidden="true">'+tile+'</span>';}
if(bridge){cell.classList.add(broken?'broken-bridge':'bridge');cell.innerHTML+='<span class="bridge-deck" aria-hidden="true"></span>';if(broken)cell.innerHTML+='<span class="bridge-cross" aria-hidden="true">×</span>';if(player&&!broken)cell.classList.add('bridge-departure');}
if('AB'.includes(tile)&&s.residents[tile]==='waiting')cell.innerHTML=person(tile);
if(player){cell.innerHTML+='<span class="pawn" aria-hidden="true"></span>';if(s.carried)cell.innerHTML+='<span class="carried-badge" aria-hidden="true">'+person(s.carried)+'</span>';if(water)cell.classList.add('danger');}
let gateDescription='';
if(l.gate){
const channel=l.gate.channels.findIndex(group=>group.includes(row*6+col)),lever=l.gate.lever[0]===row&&l.gate.lever[1]===col;
if(channel>=0){const mark=channel===0?'I':'II';cell.classList.add('channel');cell.innerHTML+='<span class="channel-label" aria-hidden="true">'+mark+'</span>';gateDescription+=', канал '+mark+(baseWet(row,col,s.turn,l.id)?', затоплен паводком':'');}
if(lever){cell.classList.add('lever');cell.innerHTML+='<span class="lever-icon" aria-hidden="true">'+leverIcon+'</span>';gateDescription+=', рычаг шлюза';}
const change=preview[row*6+col];
if(change.before!==change.after&&tile!=='#'&&s.status==='playing'){cell.classList.add(change.after?'will-flood':'will-drain');cell.innerHTML+='<span class="gate-change" aria-hidden="true">'+(change.after?'+≈':'−≈')+'</span>';gateDescription+=change.after?', после переключения и следующего хода: вода':', после переключения и следующего хода: сухо';}
}
if(available)cell.classList.add('available');
const description=broken?'разрушенный мост, прохода нет'+(water?', вода':''):water?'вода'+(bridge?', затопленный мост':''):bridge?'целый мост, рухнет после ухода':tile==='#'?'здание':isRoof(tile)?'безопасная крыша '+tile:'AB'.includes(tile)&&s.residents[tile]==='waiting'?personName(tile):'улица';
cell.ariaLabel='Строка '+(row+1)+', столбец '+(col+1)+': '+description+gateDescription+(player?', спасатель'+(s.carried?', несёт: '+personName(s.carried):''):'')+(available?', доступный шаг'+(onBridge?', мост под спасателем разрушится':''):'');
cell.tabIndex=available?0:-1;
cell.addEventListener('click',()=>{if(available)move(direction);else if(s.status==='playing')showNotice(broken?'Мост разрушен. Вернуться через него нельзя. Ход не потрачен.':tile==='#'?'Здесь здание. Выберите свободную соседнюю клетку.':water?'Здесь уже вода. Шаг не потрачен.':'Можно шагнуть только в соседнюю клетку по прямой.');});$('board').append(cell);
});});
$('undo').disabled=!game.history.length;
$('next-level').hidden=s.status!=='won'||index===LEVELS.length-1;
const message=$('message');message.className='message '+s.status;
if(s.status==='won')message.innerHTML='<div><b>'+(index===LEVELS.length-1&&campaign.complete?'Все вызовы позади!':'Оба дома. Вы успели!')+'</b><br>Два жителя в безопасности за '+s.turn+' '+turnWord(s.turn)+'. '+(index<LEVELS.length-1?'Можно перейти к следующему уровню.':'Вы прошли последний уровень. Любой вызов можно повторить.')+'</div>';
else if(s.status==='lost'){message.replaceChildren();const div=document.createElement('div'),title=document.createElement('b');title.textContent=s.reason.startsWith('Все соседние')?'Путь отрезан.':'Вода оказалась быстрее.';div.append(title,document.createElement('br'),s.reason+' Отмените ход и попробуйте другой путь.');message.append(div);}
else message.textContent=notice||(s.carried?'Житель с вами. '+(twoRoofs?'Дойдите до крыши S или T':'Вернитесь на крышу S')+' — доставка произойдёт автоматически.':rescued(s)?'Один житель в безопасности. Осталось забрать второго.':'Вы — оранжевая фигурка на S. Начните с подсвеченной соседней клетки.');
}
function showNotice(text){$('message').textContent=text;}
function move(direction){const before=campaign.game.state.broken?.length||0;if(campaign.game.move(direction)){persist();render((campaign.game.state.broken?.length||0)>before?'Мост позади разрушился. Назад через него не пройти.':'');}else if(campaign.game.state.status==='playing')showNotice('Туда пройти нельзя. Ход не потрачен.');}
$('undo').addEventListener('click',()=>{if(campaign.game.undo()){persist();render('Ход отменён. Вода и жители вернулись в прежнее состояние.');}});
$('restart').addEventListener('click',()=>{campaign.game.restart();persist();render('Новая попытка. Этот уровень начат заново.');});
$('switch-gate').addEventListener('click',()=>move('switch'));
$('next-level').addEventListener('click',()=>{const i=LEVELS.findIndex(l=>l.id===campaign.active);if(campaign.game.state.status==='won'&&i<LEVELS.length-1)selectLevel(LEVELS[i+1].id);});
document.addEventListener('keydown',e=>{
if(e.altKey||e.ctrlKey||e.metaKey||e.repeat||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
const directions={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',KeyW:'up',KeyS:'down',KeyA:'left',KeyD:'right'};
if(directions[e.code]){e.preventDefault();move(directions[e.code]);}
else if(e.code==='KeyZ'){e.preventDefault();$('undo').click();}
else if(e.code==='KeyR'){e.preventDefault();$('restart').click();}
else if(e.code==='KeyE'&&LEVELS.find(l=>l.id===campaign.active).gate){e.preventDefault();$('switch-gate').click();}
});
render(restored?'Попытки восстановлены. Продолжайте выбранный уровень.':storageAvailable?'':'Игра готова. Браузер не разрешает сохранять попытки между открытиями.');

