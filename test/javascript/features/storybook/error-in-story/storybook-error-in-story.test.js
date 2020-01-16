const Scripts = require('../../../../scripts');

const scripts = Scripts.setupProjectFromTemplate({
  templateDir: __dirname,
  projectType: Scripts.projectType.JS,
});

it('Should display informative error in story', async () => {
  await expect(scripts.dev()).rejects.toThrow(
    `> 8 | export const Basic = () => <Component />asd;;`,
  );
});
