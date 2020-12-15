// const puppeteer = require('puppeteer');
const puppeteer = require('puppeteer-core');
const chalk = require('chalk');

async function pageLoadTime(url, eventName, tag, options) {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    // headless: false,
    // slowMo: 250 // slow down by 250ms
  });
  const page = await browser.newPage();

  // await page.setCacheEnabled(false); // disable cache

  if (options && options.offline) {
    await page.setOfflineMode(true);
  }

  if (options && options.jsDisabled) {
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.resourceType() === 'script') {
        request.abort();
      } else {
        request.continue();
      }
    });  
  }

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
    if (!e.message.includes('ERR_INTERNET_DISCONNECTED')) {
      console.log(`[${e.name}] ${e.message}`);
    }
  }
  const tstop = Date.now();

  if (options && options.screenshot && tag) {
    await page.screenshot({ path: `screenshots/demo-${tag}.png` });
  }

  if (options && options.metrics) {
    const performanceTiming = JSON.parse(
      await page.evaluate(() => JSON.stringify(window.performance.timing))
    );
    const firstPaint = JSON.parse(
      await page.evaluate(() => JSON.stringify(performance.getEntriesByName('first-paint')))
    );
    const firstContentfulPaint = JSON.parse(
      await page.evaluate(() => JSON.stringify(performance.getEntriesByName('first-contentful-paint')))
    );

    const {
      navigationStart,
      fetchStart,
      domainLookupStart,
      domainLookupEnd,
      connectStart,
      secureConnectionStart,
      connectEnd,
      requestStart,
      responseStart,
      responseEnd,
      domLoading,
      domInteractive,
      domContentLoadedEventStart,
      domComplete,
      loadEventEnd,
    } = performanceTiming;

    const dnsLookup = domainLookupEnd - domainLookupStart;
    const tcpConnSetup = secureConnectionStart - connectStart;
    const sslConnSetup = connectEnd - secureConnectionStart;
    const connSetup = requestStart - fetchStart;
    console.log('--------------------------------------------------');
    console.log('Connection setup time:', connSetup, 'ms');
    console.log('   DNS lookup:', dnsLookup, 'ms');
    console.log('   TCP connection:', tcpConnSetup, 'ms');
    console.log('   SSL handshake:', sslConnSetup, 'ms');
    console.log();

    const ttfb = responseStart - requestStart;
    const ttt = responseEnd - responseStart;
    const reqResponse = responseEnd - requestStart;
    console.log('Request response time:', reqResponse, 'ms');
    console.log('   Time to first byte:', ttfb, 'ms');
    console.log('   Transfer time:', ttt, 'ms');
    console.log();

    const render = domComplete - domLoading;
    const interactive = domInteractive - domLoading;
    const domContentLoaded = domContentLoadedEventStart - domInteractive;
    const complete = domComplete - domContentLoadedEventStart;
    const load = loadEventEnd - domComplete;
    console.log('Render time:', render, 'ms');
    console.log('   interactive (doc loaded & parsed):', interactive, 'ms');
    console.log('   DOMContentLoaded (DOM ready):', domContentLoaded, 'ms');
    console.log('   complete (doc sub-resources loaded):', complete, 'ms');
    console.log('   load (page loaded):', load, 'ms');
    console.log();
    
    const pageLoad = loadEventEnd - navigationStart;
    console.log('Page load time:', chalk.redBright.bold(`${pageLoad} ms`));
    console.log('   Connection setup time:', connSetup, 'ms');
    console.log('   Request response time:', reqResponse, 'ms');
    console.log('   Render time:', render, 'ms');
    console.log();

    const tti = domInteractive - requestStart;
    const loadComplete = loadEventEnd - requestStart
    console.log('--------------------------------------------------');
    console.log('   Time to first byte (TTFB):', ttfb, 'ms', `[${connSetup + ttfb} ms]`);
    console.log('   Time to interactive (TTI):', chalk.greenBright.bold(`${tti} ms`), `[${connSetup + tti} ms]`);
    console.log('    Time to first paint (FP) ======>', `[${Math.round(firstPaint[0].startTime)} ms]`);
    console.log('First Contentful Paint (FCP) ======>', `[${Math.round(firstContentfulPaint[0].startTime)} ms]`);
    console.log('          Page load complete:', loadComplete, 'ms', `[${connSetup + loadComplete} ms]`);    
    console.log('--------------------------------------------------');
    console.log();

    // console.log('performanceTiming', performanceTiming);
  }

  await browser.close();

  return Math.round((tstop - tstart) / 10) / 100;
}

async function avgPageLoadTime(url, eventName, tag, options) {
  const timeList = [];
  for (let i = 0; i < 5; i++) {
    const t = await pageLoadTime(url, eventName, tag, {
      ...options,
      screenshot: (i === 1),
      log: (i === 1),
    });
    timeList.push(t);    
  }
  timeList.sort(function(a, b) {
    return (a - b);
  });
  return timeList[2];
}

(async () => {
  const url = 'https://demo.baadal.app/';
  console.log(`URL: ${url}\n`);

  // Performance metrics
  await pageLoadTime(url, 'load', null, {
    metrics: true,
    version: true,
  });
  
  // Offline mode
  await pageLoadTime(url, 'load', '00', {
    screenshot: true,
    offline: true,
  });

  const t = await pageLoadTime(url, 'load', '01', {
    screenshot: true,
    jsDisabled: true,
  });
  console.log(`pageLoad (JS disabled): ${t} sec\n`);

  {
    const t1 = await avgPageLoadTime(url, 'domcontentloaded', '02');
    console.log(`domLoad: ${t1} sec\n`);
    const t2 = await avgPageLoadTime(url, 'load', '03');
    console.log(`pageLoad: ${t2} sec\n`);  
  }

  {
    const t1 = await avgPageLoadTime(url, 'domcontentloaded', '04', { network: 'fast3g' });
    console.log(`domLoad: ${t1} sec\n`);
    const t2 = await avgPageLoadTime(url, 'load', '05', { network: 'fast3g' });
    console.log(`pageLoad: ${t2} sec\n`);  
  }
})();
