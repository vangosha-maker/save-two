// Independent exhaustive model. No engine imports. Gate phase is part of every state.
module.exports=function solve(map,dates,options={}){
 const flat=map.join(''),start=flat.indexOf('S'),res=[flat.indexOf('A'),flat.indexOf('B')],g=options.gate;
 const dirs=[['up',-6],['down',6],['left',-1],['right',1]];
 const flooded=(p,t,phase)=>p!==start&&((p>=30)||(p>=6&&t>=dates[4-Math.floor(p/6)])||(g&&g.channels[1-phase].includes(p)));
 const next=(s,action)=>{
  let p=s.p,phase=s.phase,sw=s.sw;
  if(action==='switch'){
   if(!g||options.noSwitch||p!==g.lever[0]*6+g.lever[1]||options.maxSwitches!==undefined&&sw>=options.maxSwitches)return null;
   if(!sw&&options.firstSwitchBeforePickup&&s.first)return null;
   if(!sw&&options.firstSwitchAfterDelivery&&s.a!==2&&s.b!==2)return null;
   phase=1-phase;sw++;
  }else{
   const d=dirs.find(x=>x[0]===action);if(!d)return null;p+=d[1];
   if(p<0||p>=36||Math.abs(p%6-s.p%6)+Math.abs(Math.floor(p/6)-Math.floor(s.p/6))!==1||flat[p]==='#'||flooded(p,s.t,phase))return null;
  }
  const n={p,t:s.t+1,phase,sw,a:s.a,b:s.b,first:s.first};
  if(n.a!==1&&n.b!==1){if(p===res[0]&&n.a===0){n.a=1;n.first||='A';}if(p===res[1]&&n.b===0){n.b=1;n.first||='B';}}
  if(p===start){if(n.a===1)n.a=2;if(n.b===1)n.b=2;}
  if(flooded(p,n.t,phase)||n.a===0&&flooded(res[0],n.t,phase)||n.b===0&&flooded(res[1],n.t,phase))return null;
  if(options.firstPickup&&n.first&&options.firstPickup!==n.first)return null;
  return n;
 };
 let initial={p:start,t:0,phase:g?.initial||0,sw:0,a:0,b:0,first:''};
 for(const d of options.prefix||[]){initial=next(initial,d);if(!initial)return {solved:false,invalidPrefix:true,visited:0};}
 const key=s=>[s.p,Math.min(s.t,dates.at(-1)),s.phase,options.maxSwitches===undefined?Math.min(s.sw,1):s.sw,s.a,s.b,s.first].join(',');
 const q=[{s:initial,path:options.prefix||[]}],seen=new Set([key(initial)]);
 for(let i=0;i<q.length;i++){
  const {s,path}=q[i];if(s.a===2&&s.b===2)return {solved:true,path,length:s.t,switches:s.sw,visited:q.length,prefixState:initial};
  for(const action of [...dirs.map(x=>x[0]),'switch']){const n=next(s,action);if(!n)continue;const k=key(n);if(seen.has(k))continue;seen.add(k);q.push({s:n,path:[...path,action]});}
 }
 return {solved:false,visited:q.length,prefixState:initial};
};
