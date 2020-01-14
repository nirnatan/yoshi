import chalk from 'chalk';
import { Urls } from 'react-dev-utils/WebpackDevServerUtils';
import { State, ProcessState, ProcessType } from './dev-environment';
import { getUrl, getDevServerUrl } from './utils/suricate';

const logSuricateUrls = (type: ProcessType, appName: string) => {
  switch (type) {
    case 'Server':
      console.log(
        `  ${chalk.bold('Public:')} ${chalk.magenta(getUrl(appName))}`,
      );
      break;
    case 'DevServer':
      console.log(
        `  ${chalk.bold('Public:')} ${chalk.magenta(getDevServerUrl(appName))}`,
      );
      break;
  }
};

const logMessageByProcessType: { [type in ProcessType]: string } = {
  Server: `Your server is starting and should be accessible from your browser.`,
  Storybook: 'Storybook is starting and should be accessible from your browser',
  DevServer: `Your bundles and other static assets are served from your ${chalk.bold(
    'dev-server',
  )}.`,
};

const logUrls = ({
  processType,
  urls,
  suricate,
  appName,
}: {
  processType: ProcessType;
  urls?: Urls;
  suricate: boolean;
  appName: string;
}) => {
  console.log();
  console.log(logMessageByProcessType[processType]);
  console.log();

  if (suricate && processType !== 'Storybook') {
    logSuricateUrls(processType, appName);
  } else {
    console.log(
      `  ${chalk.bold('Local:')}            ${urls?.localUrlForTerminal}`,
    );
    console.log(
      `  ${chalk.bold('On Your Network:')}  ${urls?.lanUrlForTerminal}`,
    );
  }

  console.log();
};

const getProcessName = (type: ProcessType) =>
  chalk.greenBright(`[${type.toUpperCase()}]`);

const logProcessState = (
  {
    processType,
    suricate,
    appName,
  }: { processType: ProcessType; suricate: boolean; appName: string },
  state: ProcessState,
) => {
  switch (state.status) {
    case 'compiling':
      console.log(`${getProcessName(processType)}:`, 'Compiling...');
      break;

    case 'success':
      console.log(
        `${getProcessName(processType)}:`,
        chalk.green('Compiled successfully!'),
      );
      logUrls({ processType, suricate, appName, urls: state.urls });
      break;
  }
};

const hasErrorsOrWarnings = (state: State): boolean => {
  return Object.keys(state).some(stateName => {
    const processState = state[stateName as ProcessType];
    return ['errors', 'warnings'].includes(processState?.status as string);
  });
};

const logStateErrorsOrWarnings = (state: State) => {
  const { Server, Storybook } = state;
  if (Server && Server.status === 'errors') {
    console.log(chalk.red('Failed to compile.\n'));
    console.log(Server.errors?.join('\n\n'));
    return;
  }

  if (Storybook && Storybook.status === 'errors') {
    console.log(chalk.red('Failed to compile.\n'));
    console.log(Storybook.errors?.join('\n\n'));
    return;
  }

  if (Server && Server.status === 'warnings') {
    console.log(chalk.red('Compiled with warnings.\n'));
    console.log(Server.warnings?.join('\n\n'));
    return;
  }

  if (Storybook && Storybook.status === 'warnings') {
    console.log(chalk.red('Compiled with warnings.\n'));
    console.log(Storybook.warnings?.join('\n\n'));
    return;
  }
};

export default ({
  state,
  appName,
  suricate,
}: {
  state: State;
  appName: string;
  suricate: boolean;
}) => {
  if (hasErrorsOrWarnings(state)) {
    return logStateErrorsOrWarnings(state);
  }
  for (const processTypeKey in state) {
    const processType = processTypeKey as ProcessType;
    const processState = state[processType];
    processState &&
      logProcessState({ processType, suricate, appName }, processState);
  }

  console.log();
  console.log('Note that the development build is not optimized.');
  console.log(
    `To create a production build, use ${chalk.cyan('npm run build')}.`,
  );
  console.log();
};
