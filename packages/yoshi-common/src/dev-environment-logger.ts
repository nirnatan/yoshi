import chalk from 'chalk';
import { Urls } from 'react-dev-utils/WebpackDevServerUtils';
import { State } from './dev-environment';
import { getUrl, getDevServerUrl } from './utils/suricate';

const logSuricateUrls = (appName: string) => {
  console.log(`  ${chalk.bold('Public:')} ${chalk.magenta(getUrl(appName))}`);
  console.log();
  console.log(
    `Your bundles and other static assets are served from your ${chalk.bold(
      'dev-server',
    )}.`,
  );
  console.log();
  console.log(
    `  ${chalk.bold('Public:')} ${chalk.magenta(getDevServerUrl(appName))}`,
  );
};

const logLocalUrls = (serverUrls: Urls, devServerUrls: Urls) => {
  console.log(
    `  ${chalk.bold('Local:')}            ${serverUrls.localUrlForTerminal}`,
  );
  console.log(
    `  ${chalk.bold('On Your Network:')}  ${serverUrls.lanUrlForTerminal}`,
  );

  console.log();
  console.log(
    `Your bundles and other static assets are served from your ${chalk.bold(
      'dev-server',
    )}.`,
  );
  console.log();

  console.log(
    `  ${chalk.bold('Local:')}            ${devServerUrls.localUrlForTerminal}`,
  );
  console.log(
    `  ${chalk.bold('On Your Network:')}  ${devServerUrls.lanUrlForTerminal}`,
  );
};

const logStorybookUrls = () => {
  console.log(`
    I also ran story book you old fart!
  `);
};

export default ({
  state,
  appName,
  suricate,
  storybook,
}: {
  state: State;
  appName: string;
  suricate: boolean;
  storybook: boolean;
}) => {
  switch (state.status) {
    case 'compiling':
      console.log('Compiling...');
      break;

    case 'success':
      console.log(chalk.green('Compiled successfully!'));

      console.log();
      console.log(
        `Your server is starting and should be accessible from your browser.`,
      );
      console.log();

      if (suricate) {
        logSuricateUrls(appName);
      } else {
        logLocalUrls(state.serverUrls, state.devServerUrls);
      }

      if (storybook) {
        logStorybookUrls();
      }

      console.log();
      console.log('Note that the development build is not optimized.');
      console.log(
        `To create a production build, use ` +
          `${chalk.cyan('npm run build')}.`,
      );
      console.log();
      break;

    case 'errors':
      console.log(chalk.red('Failed to compile.\n'));
      console.log(state.errors.join('\n\n'));
      break;

    case 'warnings':
      console.log(chalk.yellow('Compiled with warnings.\n'));
      console.log(state.warnings.join('\n\n'));
      break;
  }
};
