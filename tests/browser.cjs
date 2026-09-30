const assert = require('node:assert/strict');
const {chromium}=require(require.resolve('playwright',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.cwd()]}));
(async()=>{
 process.env.MIND_SITE_SCREENSHOT_DIR ||= require('node:os').tmpdir();
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1050}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.__spoken=[];
  class FakeRecognition {
   start(){window.__recognition=this;setTimeout(()=>this.onstart?.(),5);}
   abort(){this.onend?.();}
  }
  window.SpeechRecognition=FakeRecognition;
  window.__say=text=>{const r=window.__recognition;const result=[{transcript:text}];result.isFinal=true;r.onresult?.({resultIndex:0,results:[result]});};
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[],cancel:()=>{},resume:()=>{},speak:u=>{window.__spoken.push(u.text);setTimeout(()=>u.onend?.(),5);}}});
 });
 await page.goto('http://127.0.0.1:4173');
 await page.screenshot({path:process.env.MIND_SITE_SCREENSHOT_DIR+'/mindsite-desktop.png',fullPage:true});
 await page.getByRole('button',{name:/Begin a guided session/}).click();
 assert.equal(await page.locator('#beginButton').isDisabled(),true);
 await page.locator('#comfortCheck').check();assert.equal(await page.locator('#beginButton').isDisabled(),true);
 await page.locator('#checkVoice').click();await page.waitForTimeout(450);
 await page.evaluate(()=>__say('unrelated phrase'));assert.equal(await page.locator('#beginButton').isDisabled(),true);
 const phrase=await page.evaluate(()=>__spoken.at(-1).match(/ready (\w+)/)[0]);
 await page.evaluate(t=>__say(t),phrase);await page.locator('#beginButton').click();await page.waitForTimeout(450);
 async function command(t){await page.locator('#commandInput').fill(t);await page.locator('#commandForm button').click();await page.waitForTimeout(450);}
 async function state(){return page.evaluate(()=>JSON.parse(localStorage.getItem('mindsite-v3-sessions'))[0]);}
 await command('I am ready');assert.equal((await state()).phase,'settle');
 await command('ready');assert.equal((await state()).phase,'baseline');
 await command('next');assert.equal((await state()).phase,'familiar');
 await command('next');assert.equal((await state()).phase,'familiar');
 await command('start practice');assert.equal((await state()).phase,'explore');
 assert.notEqual(await page.locator('#target').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(246, 245, 239)');
 await command('I am noticing red');assert.equal((await state()).trials.length,0);
 await command('my answer is blue or red');assert.equal((await state()).phase,'explore');
 await command('my answer is blue');assert.equal((await state()).phase,'confirm');
 await command('no I said red');assert.equal((await state()).pending,'red');
 await command('yes');assert.equal((await state()).trials.length,1);
 const color=await page.locator('#target').evaluate(e=>e.style.background);
 await command('stay with this');assert.equal(await page.locator('#target').evaluate(e=>e.style.background),color);
 await command('next');await command('pause');assert.equal((await state()).phase,'paused');
 await command('resume');assert.equal((await state()).phase,'explore');
 await page.evaluate(()=>__recognition.onerror({error:'network'}));await page.waitForTimeout(450);assert.equal((await state()).phase,'paused');
 assert.equal(await page.locator('#reconnectButton').isVisible(),true);
 await page.locator('#reconnectButton').click();await page.waitForTimeout(450);await command('resume');
 await command('pass');assert.equal((await state()).trials[1].status,'passed');
 await command('end session');assert.equal((await state()).status,'complete');
 await command('start reflection');await command('felt relaxed today');await command('save reflection');assert.ok((await state()).notes.some(n=>n.text==='felt relaxed today'));
 await command('start measurement');assert.equal((await state()).mode,'measurement');
 await command('ready');await command('my answer is red');await command('yes');
 assert.equal(await page.locator('#sessionPrompt').textContent(),'Response recorded. Say next when ready.');
 await page.reload();await page.locator('[data-resume]').first().click();await page.locator('#inputMode').selectOption('touch');await page.locator('#comfortCheck').check();await page.locator('#beginButton').click();await page.waitForTimeout(100);
 await command('resume');assert.equal((await state()).phase,'feedback');await command('next');assert.equal((await state()).current.number,2);
 await command('end session');await command('end session');
 await page.goto('http://127.0.0.1:4173/#practice');await page.locator('[data-start="compare"]').click();await page.locator('#inputMode').selectOption('touch');await page.locator('#comfortCheck').check();await page.locator('#beginButton').click();await page.waitForTimeout(100);
 await command('ready');await command('my answer is same');assert.equal((await state()).phase,'explore');
 await command('second');await command('my answer is different');await command('yes');assert.equal((await state()).trials.length,1);
 await page.screenshot({path:process.env.MIND_SITE_SCREENSHOT_DIR+'/mindsite-session.png',fullPage:true});
 await command('end session');await command('end session');
 await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4173/#home');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:process.env.MIND_SITE_SCREENSHOT_DIR+'/mindsite-mobile.png',fullPage:true});
 for(const route of ['program','practice','journal','about']){await page.goto('http://127.0.0.1:4173/#'+route);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' overflow');}
 assert.deepEqual(errors,[]);console.log('PASS: voice readiness gate, guided stages, intent confirmation, target persistence, mic failure pause, recovery, measurement sealing, comparisons, history, mobile routes.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
