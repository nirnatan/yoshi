const Scripts = require('../../../scripts');

const scripts = Scripts.setupProjectFromTemplate({
  templateDir: __dirname,
});

it('should support storybook in dev mode [tsx]', async () => {
  await scripts.dev(async () => {
    await page.goto(
      'http://localhost:9009/iframe.html?selectedKind=Components&selectedStory=Basic',
    );
    await page.waitForSelector('#component');
    const result = await page.$eval('#component', elm => elm.textContent);
    expect(result).toBe('Component In Storybook');
  });
});

it('should support storybook in dev mode [ts]', async () => {
  await scripts.dev(async () => {
    await page.goto(
      'http://localhost:9009/iframe.html?selectedKind=Text&selectedStory=Basic',
    );
    const result = await page.$eval('body', elm => elm.textContent);
    expect(result.includes('Hello plain text')).toBe(true);
  });
});
