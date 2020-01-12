import { configure }  from 'yoshi-storybook-dependencies/node_modules/@storybook/react';

console.log('path in config.js', process.env.PROJECT_ROOT)

const loaders = require.context(PROJECT_ROOT, true, /\.stories\.(ts|tsx|js)$/);
configure(loaders, module);

