// const puppeteer = require('puppeteer');
const puppeteer = require('puppeteer-core');

async function pageLoadTime(url, eventName, tag, options) {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    // headless: false,
    // slowMo: 250 // slow down by 250ms
  });
  const page = await browser.newPage();

  // await page.setCacheEnabled(false); // disable cache

  // await page.setOfflineMode(true); // offline mode

  if (options && options.network) {
    // Connect to Chrome DevTools
    const client = await page.target().createCDPSession();
    // await client.send('Network.enable');

    let config = null;
    if (options.network === 'fast3g') {
      config = {
        'offline': false,
        'downloadThroughput': 1.5 * 1024 * 1024 / 8, // bytes/s (1.5 Mbps) 
        'uploadThroughput': 1.5 * 1024 * 1024 / 8, // bytes/s (1.5 Mbps)
        'latency': 600 // ms
      };
    } else if (options.network === 'slow3g') {
      config = {
        'offline': false,
        'downloadThroughput': 410 * 1024 / 8, // bytes/s (410 Kbps) 
        'uploadThroughput': 410 * 1024 / 8, // bytes/s (410 Kbps)
        'latency': 2000 // ms
      };
    }

    if (config) {
      await client.send('Network.emulateNetworkConditions', config);
    }
  }
  
  if (options && options.mobile) {
    await page.setViewport({
      width: 414,
      height: 736,
      isMobile: true,
    });
  }

  if (options && options.version) {
    console.log(`Browser: ${await browser.version()}\n`);
  }

  if (options && options.log) {
    page.on('console', msg => console.log('[PAGE LOG]', msg.text()));
  }

  const tstart = Date.now();
  try {
    await page.goto(url, { waitUntil: eventName });
  } catch(e) {
    console.log(`[${e.name}] ${e.message}`);
  }
  const tstop = Date.now();

  if (options && options.screenshot) {
    await page.screenshot({ path: `screenshots/demo-${tag}.png` });
  }

  await browser.close();

  return Math.round((tstop - tstart) / 10) / 100;
}

async function avgPageLoadTime(url, eventName, tag, options) {
  const timeList = [];
  for (let i = 0; i < 7; i++) {
    const t = await pageLoadTime(url, eventName, tag, {
      ...options,
      screenshot: (i === 1),
      log: (i === 1),
      version: (i === 1),
    });
    timeList.push(t);    
  }
  timeList.sort(function(a, b) {
    return (a - b);
  });
  return timeList[3];
}

(async () => {
  const url = 'https://demo.baadal.app/';
  console.log(`URL: ${url}\n`);

  // const t = await pageLoadTime(url, 'load', '01', { version: true, screenshot: true });
  // console.log(`pageLoad: ${t} sec\n`);

  {
    const t1 = await avgPageLoadTime(url, 'domcontentloaded', '01');
    console.log(`domLoad: ${t1} sec\n`);
    const t2 = await avgPageLoadTime(url, 'load', '02');
    console.log(`pageLoad: ${t2} sec\n`);  
  }

  {
    const t1 = await avgPageLoadTime(url, 'domcontentloaded', '01', { network: 'fast3g' });
    console.log(`domLoad: ${t1} sec\n`);
    const t2 = await avgPageLoadTime(url, 'load', '02', { network: 'fast3g' });
    console.log(`pageLoad: ${t2} sec\n`);  
  }
})();
