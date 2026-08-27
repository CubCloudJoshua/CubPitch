import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.setContent(`<style>@page{size:13.333in 7.5in;margin:0}body{margin:0}
.s{width:1920px;height:1080px;background:#080808;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;font-size:120px}</style>
<div class="s">CubPitch</div><div class="s" style="background:#F07D00">Slide 2</div>`);
const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true, scale: 1 });
console.log('OK pdf bytes:', pdf.length, 'chromium:', browser.version());
await browser.close();
