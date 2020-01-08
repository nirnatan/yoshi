const Scripts = require('../../../scripts');

const scripts = Scripts.setupProjectFromTemplate({
  templateDir: __dirname,
});

describe.each(['prod', 'dev'])('storybook [%s]', mode => {
  it('integration', async () => {
    await scripts[mode](async () => {
      await page.goto('http://localhost:9009');
      const result = await page.$eval('#component', elm => elm.textContent);

      expect(result).toBe('Component In Storybook');
    });
  });
});
