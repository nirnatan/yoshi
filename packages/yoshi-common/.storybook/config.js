import { configure }  from 'yoshi-storybook-dependencies';

const loaders = require.context(PROJECT_ROOT, true, /\.stories\.(ts|tsx|js)$/);
configure(loaders, module);

