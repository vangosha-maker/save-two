/* Independent finite-state BFS: no game-engine calls. Time is saturated only after the final flood, when transitions no longer depend on time. */
const solve=function oracle(map, dates, options={}) {
 const flat=map.join(''), start=flat.indexOf('S'), pa=flat.indexOf('A'),pb=flat.indexOf('B');
 const dirs=[['up',-1,0],['down',1,0],['left',0,-1],['right',0,1]];
 const wet=(p,t)=>p!==start && (Math.floor(p/6)===5||(Math.floor(p/6)>0&&t>=dates[4-Math.floor(p/6)]));
 const advance=(s,d)=>{const a=dirs.find(x=>x[0]===d);if(!a)return null;const r=Math.floor(s.p/6)+a[1],c=s.p%6+a[2],p=r*6+c;
 if(r<0||r>5||c<0||c>5||flat[p]==='#'||wet(p,s.t))return null;
 const n={p,t:s.t+1,a:s.a,b:s.b,first:s.first};
 if(n.a!==1&&n.b!==1){if(p===pa&&n.a===0){n.a=1;n.first||='A';}if(p===pb&&n.b===0){n.b=1;n.first||='B';}}
 if(p===start){if(n.a===1)n.a=2;if(n.b===1)n.b=2;}
 if(wet(p,n.t)||(n.a===0&&wet(pa,n.t))||(n.b===0&&wet(pb,n.t)))return null;
 return n;
 };
 let initial={p:start,t:0,a:0,b:0,first:''};for(const d of options.prefix||[]){initial=advance(initial,d);if(!initial)return {solved:false,invalidPrefix:true,visited:0};}
 const key=s=>[s.p,Math.min(s.t,dates.at(-1)),s.a,s.b,s.first].join(',');
 const q=[{s:initial,path:options.prefix||[]}],seen=new Set([key(initial)]);
 for(let i=0;i<q.length;i++){const {s,path}=q[i];if(s.a===2&&s.b===2)return {solved:true,length:s.t,path,visited:q.length,prefixState:initial};
 for(const [d] of dirs){const n=advance(s,d);if(!n||(options.firstPickup&&n.first&&n.first!==options.firstPickup))continue;const k=key(n);if(!seen.has(k)){seen.add(k);q.push({s:n,path:[...path,d]});}}
 }
 return {solved:false,visited:q.length,prefixState:initial};
};
module.exports=solve;

