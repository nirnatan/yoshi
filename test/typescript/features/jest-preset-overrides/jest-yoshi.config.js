module.exports = {
  e2eOptions: {
    moduleNameMapper: {
      '^[./a-zA-Z0-9$_-]+\\.foo$': '<rootDir>/src/stub.tsx',
    },
  },
  specOptions: {
    globals: {
      foo: 'bar',
    },
    moduleNameMapper: {
      '^[./a-zA-Z0-9$_-]+\\.foo$': '<rootDir>/src/stub.tsx',
      '^(?!.+\\.st\\.css$)^.+\\.(?:sass|s?css|less)$': 'identity-obj-proxy',
    },
    testURL: 'http://localhost:3000/?query=param',
  },
  server: {
    command: 'node dist/server.js',
    port: 3100,
  },
};
