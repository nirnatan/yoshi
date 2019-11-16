const path = require('path');
const { matchCSS } = require('../../utils');
const Scripts = require('../../scripts');

const scripts = new Scripts({
  testDirectory: path.join(__dirname),
  silent: true,
});

it.each(['serve', 'start'])('css inclusion %s', async command => {
  await scripts[command](async () => {
    await page.goto('http://localhost:3000');

    const className = await page.$eval('#css-inclusion', elm =>
      elm.getAttribute('class'),
    );

    await matchCSS('app', page, [
      new RegExp(`.${className}{background:#ccc;color:#000;*}`),
    ]);
  });
});