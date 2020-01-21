module.exports = {
  preset: 'jest-puppeteer',
  rootDir: './test',
  verbose: true,
  testResultsProcessor: 'jest-teamcity-reporter',
  testMatch: ['**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/projects/'],
  globalSetup: require.resolve('./test/globalSetup'),
  globalTeardown: require.resolve('./test/globalTeardown'),
  transformIgnorePatterns: ['/node_modules/'],
  setupFilesAfterEnv: [require.resolve('./jest-setup')],
};
