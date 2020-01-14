import path from 'path';
import { EventEmitter } from 'events';
import execa from 'execa';
import chalk from 'chalk';
import waitPort from 'wait-port';

const storyBookConfigFolder = path.join(__dirname, '..', '.storybook');

interface StorybookProcessOptions {
  port: number;
  verbose: boolean;
}

export default class StorybookProcess extends EventEmitter {
  private verbose: boolean;
  port: number;

  constructor({ port, verbose }: StorybookProcessOptions) {
    super();
    this.port = port;
    this.verbose = verbose;
  }

  static create({ port = 9009, verbose = false }: StorybookProcessOptions) {
    return new StorybookProcess({ port, verbose });
  }

  start = async () => {
    let storyBookYoshiDepsFolder;
    try {
      storyBookYoshiDepsFolder = path.dirname(
        require.resolve('yoshi-storybook-dependencies/package.json'),
      );
    } catch (e) {
      this.emit(
        'error',
        `Please install yoshi-storybook-dependencies in order to run storybook`,
      );
    }

    this.emit('compiling');

    const storybookCommand = `${storyBookYoshiDepsFolder}/node_modules/.bin/start-storybook -p ${this.port} -c ${storyBookConfigFolder} --ci`;

    // console.log('Running command with', storybookCommand);
    const storybookProcess = execa(storybookCommand, {
      shell: true,
      // Storybook uses npmlog which passes logs to stderr
      all: true,
      env: {
        PROJECT_ROOT: path.join(process.cwd(), 'src'),
      },
    });

    // eslint-disable-next-line no-unused-expressions
    storybookProcess.all?.on('data', this.onData);

    await waitPort({
      port: +this.port,
      output: 'silent',
      timeout: 20000,
    });
  };

  logVerbose = (str: string, isError?: boolean) => {
    if (str) {
      console.log();
      console.log(
        `${
          isError
            ? chalk.redBright('[Storybook ERROR]')
            : chalk.greenBright('[Storybook]')
        }: ${str}`,
      );
      console.log();
    }
  };

  onData = (buff: Buffer) => {
    const str = buff.toString();
    const isError = str.includes('ERROR');
    const isWarning = str.includes('WARNING');
    const isCompiled = str.includes('webpack built');
    this.verbose && this.logVerbose(str, isError);
    if (isCompiled) {
      this.emit('compiled');
    }
    if (isWarning) {
      this.emit('warning', str.slice(str.indexOf('WARNING')));
    }
    if (isError) {
      this.emit('error', str.slice(str.indexOf('ERROR')));
    }
  };
}
