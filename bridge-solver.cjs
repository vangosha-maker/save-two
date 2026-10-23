// Independent finite-state search. Does not import the game engine.
module.exports=function solve(l,o={}){
 const cells=l.map.join(''),home=cells.indexOf('S'),people=[cells.indexOf('A'),cells.indexOf('B')],bridges=l.bridges||[],g=l.gate;
 const dirs=[['up',-6],['down',6],['left',-1],['right',1]],roof=p=>'ST'.includes(cells[p]);
 const wet=(p,t,f)=>!roof(p)&&(p>=30||(p>=6&&t>=l.flood[4-Math.floor(p/6)])||!!(g&&g.channels[1-f].includes(p)));
 const advance=(s,action)=>{
  let p=s.p,f=s.f,m=s.m,sw=s.sw;
  if(action==='switch'){
   if(!g||o.noSwitch||p!==g.lever[0]*6+g.lever[1]||o.maxSwitches!==undefined&&sw>=o.maxSwitches)return null;
   f=1-f;sw++;
  }else{
   const d=dirs.find(x=>x[0]===action);if(!d)return null;p+=d[1];
   if(p<0||p>35||Math.abs(p%6-s.p%6)+Math.abs(Math.floor(p/6)-Math.floor(s.p/6))!==1||cells[p]==='#'||wet(p,s.t,f))return null;
   const b=bridges.indexOf(p);if(b>=0&&(o.noBridges||(m&(1<<b))))return null;
   const departed=bridges.indexOf(s.p);if(departed>=0&&!o.unbreakable)m|=1<<departed;
  }
  const n={p,t:s.t+1,f,m,sw,a:s.a,b:s.b,first:s.first};
  if(n.a!==1&&n.b!==1){if(p===people[0]&&n.a===0){n.a=1;n.first||='A';}if(p===people[1]&&n.b===0){n.b=1;n.first||='B';}}
  if(roof(p)&&(n.a===1||n.b===1)){
   if(o.onlyRoof&&cells[p]!==o.onlyRoof)return null;
   if(n.a===1)n.a=cells[p]==='S'?2:3;if(n.b===1)n.b=cells[p]==='S'?2:3;
  }
  if(wet(p,n.t,f)||n.a===0&&wet(people[0],n.t,f)||n.b===0&&wet(people[1],n.t,f)||o.firstPickup&&n.first&&n.first!==o.firstPickup)return null;
  return n;
 };
 let initial={p:home,t:0,f:g?.initial||0,m:0,sw:0,a:0,b:0,first:''};
 for(const d of o.prefix||[]){initial=advance(initial,d);if(!initial)return {solved:false,invalidPrefix:true,visited:0};}
 const key=s=>[s.p,Math.min(s.t,l.flood.at(-1)),s.f,s.m,o.maxSwitches===undefined?Math.min(s.sw,1):s.sw,s.a,s.b,s.first].join(',');
 const q=[{s:initial,path:o.prefix||[]}],seen=new Set([key(initial)]);
 for(let i=0;i<q.length;i++){
  const {s,path}=q[i];if(s.a>=2&&s.b>=2)return {solved:true,length:s.t,path,visited:q.length,final:s,prefixState:initial};
  for(const action of [...dirs.map(x=>x[0]),'switch']){const n=advance(s,action);if(!n)continue;const k=key(n);if(seen.has(k))continue;seen.add(k);q.push({s:n,path:[...path,action]});}
 }
 return {solved:false,visited:q.length,prefixState:initial};
};
