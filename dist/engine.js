(function(root){'use strict';
const LEVELS=[
  {
    "id": "courtyard",
    "title": "Первый вызов",
    "map": [
      "......",
      "..S#..",
      ".#..B.",
      "A#....",
      "......",
      "~~~~~~"
    ],
    "flood": [
      4,
      8,
      12,
      16
    ],
    "brief": "Два жителя, одна крыша. Каждый шаг имеет значение."
  },
  {
    "id": "divider",
    "title": "Через квартал",
    "map": [
      "......",
      ".S#...",
      "..#.B.",
      "..#...",
      "A.....",
      "~~~~~~"
    ],
    "flood": [
      6,
      12,
      18,
      24
    ],
    "brief": "Длинный квартал разделяет улицы. Продумайте обе поездки."
  },
  {
    "id": "labyrinth",
    "title": "Узкие проходы",
    "map": [
      "......",
      "..#S#.",
      "..#.#B",
      "A.#...",
      "......",
      "~~~~~~"
    ],
    "flood": [
      7,
      14,
      21,
      28
    ],
    "brief": "Больше обходов, меньше запаса. Найдите путь домой до подъёма воды."
  },
  {
    "id": "old-quarter",
    "title": "Старый район",
    "map": [
      "..##..",
      "..#S..",
      "A.#..B",
      "......",
      "......",
      "~~~~~~"
    ],
    "flood": [
      6,
      12,
      18,
      24
    ],
    "brief": "Ещё один квартал и две просьбы о помощи."
  },
  {
    "id": "evening-call",
    "title": "Вечерний вызов",
    "map": [
      "......",
      "..##.S",
      ".AB...",
      "......",
      "......",
      "~~~~~~"
    ],
    "flood": [
      5,
      10,
      15,
      20
    ],
    "brief": "Новая операция. Доставьте обоих жителей на крышу."
  }
,{
  "id": "sluice-yard",
  "title": "У шлюза",
  "map": [
    "......",
    ".####.",
    "A.S.B.",
    ".####.",
    "......",
    "~~~~~~"
  ],
  "flood": [
    4,
    8,
    12,
    16
  ],
  "brief": "Два канала и один рычаг. Сухой канал можно пройти; заполненный — нельзя.",
  "gate": {
    "lever": [
      2,
      2
    ],
    "channels": [
      [
        13
      ],
      [
        15
      ]
    ],
    "initial": 0
  }
},
{
  "id": "canal-crossing",
  "title": "Канальный квартал",
  "map": [
    ".##.S.",
    "......",
    "#B....",
    "A....#",
    "..#..#",
    "~~~~~~"
  ],
  "flood": [
    8,
    16,
    24,
    32
  ],
  "brief": "Две просьбы о помощи и шлюз посреди квартала. Спланируйте оба рейса.",
  "gate": {
    "lever": [
      3,
      3
    ],
    "channels": [
      [
        8,
        14
      ],
      [
        20
      ]
    ],
    "initial": 0
  }
},
{
  "id": "timber-lane",
  "title": "Дощатый переход",
  "map": [
    "S..B..",
    ".###..",
    ".A....",
    "......",
    "......",
    "~~~~~~"
  ],
  "flood": [
    3,
    6,
    9,
    12
  ],
  "bridges": [
    6
  ],
  "brief": "Мост выдержит один проход. После ухода с него назад уже не вернуться."
},
{
  "map": [
    "..S...",
    "#...#.",
    ".A.#..",
    "....B.",
    ".#...#",
    "~~~~~~"
  ],
  "flood": [
    6,
    12,
    18,
    24
  ],
  "bridges": [
    1,
    8
  ],
  "id": "return-bank",
  "title": "Дальний берег",
  "brief": "Две поездки по кварталу. Каждый мост исчезнет после вашего ухода."
},
{
  "map": [
    ".S...#",
    "...#.#",
    "..#B..",
    ".T....",
    "..A.#.",
    "~~~~~~"
  ],
  "flood": [
    6,
    12,
    18,
    24
  ],
  "bridges": [
    7,
    2
  ],
  "gate": {
    "lever": [
      2,
      5
    ],
    "channels": [
      [
        13
      ],
      [
        10
      ]
    ],
    "initial": 0
  },
  "id": "last-harbor",
  "title": "Последняя переправа",
  "brief": "Финальная операция. Два жителя, две безопасные крыши, мосты и шлюз."
}
];
const DIRS={up:[-1,0],down:[1,0],left:[0,-1],right:[0,1]};
const clone=x=>JSON.parse(JSON.stringify(x));
const levelById=id=>LEVELS.find(l=>l.id===id);
const positions=l=>Object.fromEntries(['S','A','B'].map(id=>{const row=l.map.findIndex(line=>line.includes(id));return [id,[row,l.map[row].indexOf(id)]];}));
const isRoof=tile=>tile==='S'||tile==='T';
function initial(id=LEVELS[0].id){const l=levelById(id);if(!l)throw new Error('Unknown level');const [row,col]=positions(l).S;return {level:id,row,col,turn:0,carried:null,residents:{A:'waiting',B:'waiting'},status:'playing',reason:'',...(l.gate?{phase:l.gate.initial}: {}),...(l.bridges?{broken:[],deliveries:{A:null,B:null}}:{})};}
function baseWet(row,col,turn,id=LEVELS[0].id){const l=levelById(id);if(isRoof(l.map[row][col])||row===0)return false;return row===5||turn>=l.flood[4-row];}
function wet(row,col,turn,id=LEVELS[0].id,phase){const l=levelById(id);if(isRoof(l.map[row][col]))return false;return baseWet(row,col,turn,id)||!!(l.gate&&l.gate.channels[1-(phase??l.gate.initial)].includes(row*6+col));}
function atLever(s){const g=levelById(s.level).gate;return !!g&&s.row===g.lever[0]&&s.col===g.lever[1];}
function gatePreview(s){const l=levelById(s.level);if(!l.gate)return [];return l.map.flatMap((line,row)=>[...line].map((tile,col)=>({row,col,before:wet(row,col,s.turn,l.id,s.phase),after:wet(row,col,s.turn+1,l.id,1-s.phase)})));}
function rescued(s){return Object.values(s.residents).filter(v=>v==='safe').length;}
const personName=id=>id==='A'?'Житель в синем':'Житель в сиреневом';
function step(state,direction){
if(state.status!=='playing')return null;
const l=levelById(state.level||LEVELS[0].id),s=clone(state);
if(direction==='switch'){if(!atLever(state))return null;s.phase=1-s.phase;}
else{if(!Object.hasOwn(DIRS,direction))return null;const d=DIRS[direction],row=state.row+d[0],col=state.col+d[1];
if(row<0||row>5||col<0||col>5||l.map[row][col]==='#'||s.broken?.includes(row*6+col)||wet(row,col,state.turn,l.id,s.phase))return null;
const departed=state.row*6+state.col;if(l.bridges?.includes(departed)&&!s.broken.includes(departed))s.broken.push(departed);s.row=row;s.col=col;}
s.turn++;const {row,col}=s,tile=l.map[row][col];
if('AB'.includes(tile)&&s.residents[tile]==='waiting'&&!s.carried){s.carried=tile;s.residents[tile]='carried';}
if(isRoof(tile)&&s.carried){if(s.deliveries)s.deliveries[s.carried]=tile;s.residents[s.carried]='safe';s.carried=null;}
if(wet(row,col,s.turn,l.id,s.phase)){s.status='lost';s.reason=`После хода ${s.turn} вода накрыла спасателя${s.carried?' и жителя':''} в строке ${row+1}.`;}
else for(const id of ['A','B']){const [r,c]=positions(l)[id];if(s.residents[id]==='waiting'&&wet(r,c,s.turn,l.id,s.phase)){s.status='lost';s.reason=`После хода ${s.turn} ${l.gate?'вода накрыла клетку жителя в строке':'затопило строку'} ${r+1}. ${personName(id)} ещё ждал помощи.`;break;}}
if(s.status==='playing'&&rescued(s)===2)s.status='won';
if(s.status==='playing'&&l.bridges&&!atLever(s)&&!Object.values(DIRS).some(([dr,dc])=>{const r=row+dr,c=col+dc;return r>=0&&r<6&&c>=0&&c<6&&l.map[r][c]!=='#'&&!s.broken.includes(r*6+c)&&!wet(r,c,s.turn,l.id,s.phase);})){s.status='lost';s.reason='Все соседние пути отрезаны водой, зданиями или разрушенными мостами.';}
return s;
}
class Game{
constructor(id=LEVELS[0].id){if(!levelById(id))throw new Error('Unknown level');this.level=id;this.restart();}
restart(){this.state=initial(this.level);this.history=[];this.moves=[];}
move(d){const next=step(this.state,d);if(!next)return false;this.history.push(clone(this.state));this.moves.push(d);this.state=next;return true;}
undo(){if(!this.history.length)return false;this.state=this.history.pop();this.moves.pop();return true;}
serialize(){return JSON.stringify({version:2,level:this.level,moves:this.moves});}
restore(raw){try{const d=JSON.parse(raw);if(!d||!Array.isArray(d.moves)||d.moves.length>1000)return false;if(d.version===1){if(this.level!==LEVELS[0].id)return false;}else if(d.version!==2||d.level!==this.level)return false;const c=new Game(this.level);for(const m of d.moves)if(!c.move(m))return false;this.state=c.state;this.history=c.history;this.moves=c.moves;return true;}catch{return false;}}
}
class Campaign{
constructor(){this.active=LEVELS[0].id;this.games=Object.fromEntries(LEVELS.map(l=>[l.id,new Game(l.id)]));}
get game(){return this.games[this.active];}
get complete(){return LEVELS.every(l=>this.games[l.id].state.status==='won');}
select(id){if(!levelById(id))return false;this.active=id;return true;}
serialize(){return JSON.stringify({version:5,active:this.active,games:Object.fromEntries(LEVELS.map(l=>[l.id,JSON.parse(this.games[l.id].serialize())]))});}
restore(raw){try{const d=JSON.parse(raw),c=new Campaign();if(d.version===1){if(!c.game.restore(raw))return false;}else{const count={2:3,3:5,4:7,5:10}[d.version];if(!count||!LEVELS.slice(0,count).some(l=>l.id===d.active)||!d.games)return false;for(const [i,l] of LEVELS.entries()){if(i>=count&&!Object.hasOwn(d.games,l.id))continue;if(!c.games[l.id].restore(JSON.stringify(d.games[l.id])))return false;}c.active=d.active;}this.active=c.active;this.games=c.games;return true;}catch{return false;}}
}
const api={LEVELS,MAP:LEVELS[0].map,DIRS,Game,Campaign,levelById,positions,initial,wet,baseWet,atLever,gatePreview,rescued,step,personName,isRoof};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Rescue=api;
})(typeof globalThis!=='undefined'?globalThis:this);

