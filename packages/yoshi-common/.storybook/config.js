import { configure }  from 'yoshi-storybook-dependencies/node_modules/@storybook/react';

const loaders = require.context(PROJECT_ROOT, true, /\.stories\.ts|\.stories\.js$/);
configure(loaders, module);

