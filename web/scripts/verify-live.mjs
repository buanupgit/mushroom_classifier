import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const base=process.env.TEST_BASE_URL;
if(!base)throw new Error('Set TEST_BASE_URL to the deployed HTTPS URL.');
const expected=JSON.parse(await readFile('../docs/real-image-report.json','utf8'));
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[],requests=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',r=>requests.push({method:r.method(),url:r.url()}));
 await page.goto(base);
 await page.getByRole('status').filter({hasText:'Ready'}).waitFor({timeout:120000});
 const metaResponse=await page.request.get(`${base}/models/manifest.json`);
 const meta=await metaResponse.json();
 const modelResponse=await page.request.get(`${base}${meta.url}`);
 if(!modelResponse.ok())throw new Error('Deployed model is unavailable');
 const rows=[];
 for(const item of expected.comparisons){
  await page.getByLabel('Upload mushroom image').setInputFiles(`tests/fixtures/real/${item.file}`);
  await page.getByRole('button',{name:'Classify photograph'}).click();
  await page.getByTestId('raw-score').waitFor({state:'attached'});
  const score=Number(await page.getByTestId('raw-score').textContent());
  const error=Math.abs(score-item.tensorflow);
  if(error>1e-4||(score>0.5)!==(item.tensorflow>0.5))throw new Error(`Prediction mismatch: ${item.file}`);
  rows.push({file:item.file,tensorflow:item.tensorflow,browser:score,absoluteError:error,timing:await page.locator('.timing').innerText()});
 }
 await page.locator('h1').click();await page.screenshot({path:'../docs/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'../docs/mobile.png',fullPage:true});
 const external=requests.filter(r=>!r.url.startsWith(base)&&!r.url.startsWith('blob:')&&!r.url.startsWith('data:'));
 if(errors.length||external.length||requests.some(r=>r.method!=='GET'))throw new Error(JSON.stringify({errors,external,nonGet:requests.filter(r=>r.method!=='GET')}));
 const report={url:base,verifiedAt:new Date().toISOString(),modelVersion:meta.version,modelBytes:meta.bytes,cacheControl:modelResponse.headers()['cache-control'],manifestCacheControl:metaResponse.headers()['cache-control'],comparisons:rows,browserErrors:errors,externalRequests:external,allRequestsGet:true};
 await writeFile('../docs/live-report.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
