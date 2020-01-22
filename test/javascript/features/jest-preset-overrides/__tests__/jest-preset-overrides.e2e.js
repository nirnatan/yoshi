const stubContent = require('../src/someModule.foo');

it('should use moduleNameMapper in e2eOptions', () => {
  expect(stubContent).toEqual('Stub module content');
});
