'use strict';
// Run with: node --test ui-tests.cjs (requires Playwright and Chromium).
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');
const {LEVELS,DIRS,Campaign}=require('./dist/engine.js');
const routes=require('./test-fixtures/ui-routes.json');
const origin='http://127.0.0.1:4173';
const viewports=[{width:320,height:740},{width:390,height:844},
  {width:740,height:320},{width:844,height:390},{width:1280,height:900}];
let server,serverExit,browser;
const diagnostics=[];

before(async()=>{
  server=spawn(process.execPath,['server.cjs'],{cwd:__dirname,stdio:['ignore','pipe','pipe']});
  serverExit=once(server,'exit');
  let stderr='';server.stderr.on('data',d=>stderr+=d);
  await Promise.race([once(server.stdout,'data'),serverExit.then(()=>{throw Error(stderr)}),
    new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('Preview startup timed out')),5000);timer.unref();})]);
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true});
});
after(async()=>{
  try{if(browser)await browser.close();}
  finally{if(server&&server.exitCode===null&&server.signalCode===null)server.kill('SIGTERM');if(serverExit)await serverExit;}
});
async function session(viewport=viewports[1],hasTouch=true){
  const context=await browser.newContext({viewport,hasTouch,locale:'ru-RU',reducedMotion:'reduce'});
  const page=await context.newPage();page.setDefaultTimeout(5000);
  watch(page);
  await page.goto(origin,{waitUntil:'load'});
  return {context,page};
}
function watch(page){
  page.on('pageerror',e=>diagnostics.push(e.message));
  page.on('console',m=>{if(['error','warning'].includes(m.type()))diagnostics.push(m.text());});
  page.on('requestfailed',r=>diagnostics.push(r.url()+': '+r.failure()?.errorText));
}
const save=page=>page.evaluate(()=>localStorage.getItem('save-two-v2'));
async function act(page,direction){
  const turn=Number(await page.locator('#turn').innerText());
  if(direction==='switch')await page.locator('#switch-gate').tap();
  else{
    const {row,col}=await page.locator('.cell:has(.pawn)').evaluate(e=>({row:Number(e.dataset.row),col:Number(e.dataset.col)}));
    const [dr,dc]=DIRS[direction];
    await page.locator(`.cell[data-row="${row+dr}"][data-col="${col+dc}"]`).tap();
  }
  assert.equal(Number(await page.locator('#turn').innerText()),turn+1);
}
async function forecast(page,level){
  const turn=Number(await page.locator('#turn').innerText());
  const index=level.flood.findIndex(n=>n>turn),next=level.flood[index];
  const text=await page.locator('#forecast').innerText();
  if(next){
    assert.match(text,new RegExp('После хода '+next+' затопит строку '+(5-index)));
    assert.equal(await page.locator('.forecast.is-imminent').count(),next-turn===1?1:0);
    if(next-turn===1)assert.match(text,/на следующем ходу/);
    else assert.match(text,new RegExp('До подъёма воды: '+(next-turn)+' '));
  }else{assert.match(text,/Вода достигла предела/);assert.equal(await page.locator('.forecast.is-imminent').count(),0);}
}

test('HTTP resources match dist; docs mirror; HTML/JS/CSS types and no-store',async()=>{
  for(const [name,type] of [['index.html','text/html'],['app.js','text/javascript'],['engine.js','text/javascript'],['style.css','text/css']]){
    const response=await fetch(origin+'/'+name);
    assert.equal(response.status,200);assert(response.headers.get('content-type').startsWith(type));
    assert.equal(response.headers.get('cache-control'),'no-store');
    const disk=await fs.readFile(__dirname+'/dist/'+name);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),disk);
    assert.deepEqual(await fs.readFile(__dirname+'/docs/'+name),disk);
  }
});

test('All ten levels: no overlay while scrolling; touch/undo at five viewport sizes',async t=>{
  const {context,page}=await session();
  try{for(const viewport of viewports){
    await page.setViewportSize(viewport);
    for(const level of LEVELS)await t.test(`${viewport.width}x${viewport.height}: ${level.title}`,async()=>{
      await page.locator(`[data-level="${level.id}"]`).tap();
      assert.equal(await page.locator('.cell').count(),36);
      await forecast(page,level);
      const positions=await page.evaluate(()=>{
        const board=document.querySelector('#board').getBoundingClientRect();
        return [0,board.top+scrollY-12,board.top+scrollY+board.height/2,document.body.scrollHeight];
      });
      for(const y of positions){
        await page.evaluate(y=>scrollTo(0,y),y);
        const geometry=await page.evaluate(()=>{
          const board=document.querySelector('#board').getBoundingClientRect();
          const controls=document.querySelector('.actions').getBoundingClientRect();
          const cells=[...document.querySelectorAll('.cell')].filter(e=>{
            const r=e.getBoundingClientRect();return r.top+r.height/2>=0&&r.top+r.height/2<innerHeight;
          });
          return {overlap:controls.top<board.bottom&&controls.bottom>board.top,
            overflow:document.documentElement.scrollWidth>innerWidth,
            blocked:cells.filter(e=>{const r=e.getBoundingClientRect();return !e.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2));}).length};
        });
        assert.deepEqual(geometry,{overlap:false,overflow:false,blocked:0});
      }
      const original=await save(page);
      await page.locator('.cell.wall').first().tap();assert.equal(await save(page),original);
      await act(page,routes[level.id][0]);await page.locator('#undo').tap();
      assert.equal(await page.locator('#turn').innerText(),'0');
      assert.equal(await page.locator('.cell.broken-bridge').count(),0);
      for(const id of ['undo','restart']){
        const box=await page.locator('#'+id).boundingBox();assert(box.width>=44&&box.height>=44);
      }
    });
  }}finally{await context.close();}
});

test('Touch victories on all ten levels; rotate, reload, undo/re-win, isolated restart',async t=>{
  const {context,page}=await session();
  try{
    for(const level of LEVELS)await t.test(level.title,async()=>{
      await page.setViewportSize(viewports[1]);await page.locator(`[data-level="${level.id}"]`).tap();
      const route=routes[level.id];
      for(let i=0;i<route.length;i++){
        await act(page,route[i]);await forecast(page,level);
        if(i===Math.floor(route.length/2)){
          const before=await save(page);await page.setViewportSize(viewports[3]);
          await page.reload({waitUntil:'load'});assert.equal(await save(page),before);
          await page.setViewportSize(viewports[0]);
        }
      }
      assert(await page.locator('#message.won').isVisible());assert.equal(await page.locator('#saved').innerText(),'2');
      const won=await save(page);await page.reload({waitUntil:'load'});assert.equal(await save(page),won);
      await page.locator('#undo').tap();assert(await page.locator('#message.playing').isVisible());
      await act(page,route.at(-1));assert.equal(await save(page),won);
    });
    assert.match(await page.locator('#message').innerText(),/Все вызовы позади/);
    await page.reload({waitUntil:'load'});assert.equal(await page.locator('#levels [aria-label*="пройден"]').count(),10);
    const won=JSON.parse(await save(page));await page.locator('#restart').tap();
    const restarted=JSON.parse(await save(page));
    for(const level of LEVELS.slice(0,9))assert.deepEqual(restarted.games[level.id],won.games[level.id]);
    assert.equal(await page.locator('#turn').innerText(),'0');assert.equal(await page.locator('.broken-bridge').count(),0);
    const trap=require('./bridge-evidence.json').ten.trap.prefix;
    for(const action of trap)await act(page,action);
    assert(await page.locator('#message.lost').isVisible());
    const lost=await save(page);await page.reload({waitUntil:'load'});assert.equal(await save(page),lost);
    await page.locator('#undo').tap();await act(page,'left');assert(await page.locator('#message.won').isVisible());
  }finally{await context.close();}
});

test('Forecast threshold resets on undo/restart; keyboard and mouse on desktop',async()=>{
  const {context,page}=await session(viewports[4],false);
  try{
    for(const key of ['ArrowLeft','ArrowLeft','ArrowDown'])await page.keyboard.press(key);
    assert.match(await page.locator('#forecast').innerText(),/на следующем ходу/);
    await page.keyboard.press('KeyZ');assert.equal(await page.locator('.is-imminent').count(),0);
    await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');
    assert.match(await page.locator('#forecast').innerText(),/После хода 8 затопит строку 4/);
    await page.locator('#restart').click();assert.match(await page.locator('#forecast').innerText(),/До подъёма воды: 4 хода/);
    assert.equal(await page.locator('#forecast').getAttribute('aria-live'),'polite');
  }finally{await context.close();}
});

test('Touch swipes scroll the map without making a move in either orientation',async()=>{
  const {context,page}=await session();
  const cdp=await context.newCDPSession(page);
  try{
    await page.locator('#levels button').last().tap();
    for(const viewport of viewports.slice(0,4)){
      await page.setViewportSize(viewport);
      await page.locator('#board').evaluate(e=>scrollTo(0,e.getBoundingClientRect().top+scrollY-40));
      const before=await save(page),scroll=await page.evaluate(()=>scrollY);
      const point=await page.locator('#board').evaluate(e=>{
        const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:Math.min(innerHeight-30,r.bottom-10)};
      });
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
      for(let step=1;step<=8;step++){
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x,y:point.y-step*20}]});
        await page.waitForTimeout(20);
      }
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await page.waitForFunction(y=>scrollY>y+20,scroll);
      assert.equal(await save(page),before);assert.equal(await page.locator('#turn').innerText(),'0');
    }
  }finally{await cdp.detach();await context.close();}
});

test('Browser migrates legacy save and keeps undo history',async()=>{
  const {context,page}=await session();
  try{
    await page.evaluate(()=>{localStorage.clear();localStorage.setItem('save-two-v1',JSON.stringify({version:1,moves:['left','left','down','down']}));});
    await page.reload({waitUntil:'load'});assert.equal(await page.locator('#turn').innerText(),'4');
    await page.locator('#undo').tap();assert.equal(await page.locator('#turn').innerText(),'3');
    const campaign=new Campaign();assert(campaign.restore(await save(page)));
    assert.equal(campaign.game.history.length,3);
  }finally{await context.close();}
});

test('Denied localStorage still permits touch play, forecast, undo and restart',async()=>{
  const context=await browser.newContext({viewport:viewports[0],hasTouch:true});
  try{
    await context.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage disabled','SecurityError');}}));
    const page=await context.newPage();watch(page);await page.goto(origin);
    assert.match(await page.locator('#message').innerText(),/не разрешает сохранять/);
    await act(page,'left');await forecast(page,LEVELS[0]);await page.locator('#undo').tap();
    assert.equal(await page.locator('#turn').innerText(),'0');await act(page,'left');
    await page.locator('#restart').tap();assert.equal(await page.locator('#turn').innerText(),'0');
  }finally{await context.close();}
});

test('No browser runtime errors, warnings or failed requests',()=>assert.deepEqual(diagnostics,[]));
