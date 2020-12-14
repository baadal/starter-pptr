const puppeteer = require('puppeteer');

async function pageLoadTime(url, eventName, tag, options) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({
    width: 414,
    height: 736,
    isMobile: true,
  });

  const tstart = Date.now();
  await page.goto(url, { waitUntil: eventName });
  const tstop = Date.now();

  if (options.screenshot) {
    await page.screenshot({ path: `screenshots/demo-${tag}.png` });
  }

  await browser.close();

  return Math.round((tstop - tstart) / 10) / 100;
}

async function avgPageLoadTime(url, eventName, tag) {
  const timeList = [];
  for (let i = 0; i < 7; i++) {
    const t = await pageLoadTime(url, eventName, tag, {
      screenshot: (i === 0)
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
  console.log('URL:', url);
  const t1 = await avgPageLoadTime(url, 'domcontentloaded', '01');
  console.log(`domLoad: ${t1} sec`);
  const t2 = await avgPageLoadTime(url, 'load', '02');
  console.log(`pageLoad: ${t2} sec`);
})();
