import path from 'path';
import execa from 'execa';
import chalk from 'chalk';

const storyBookConfigFolder = path.join(__dirname, '..', '.storybook');

interface StartOptions {
  port?: number;
}

const start = async ({ port = 9009 }: StartOptions) => {
  const storyBookYoshiDepsFolder = path.dirname(
    require.resolve('yoshi-storybook-dependencies/package.json'),
  );

  try {
    await execa(
      `${storyBookYoshiDepsFolder}/node_modules/.bin/start-storybook -p ${port} -c ${storyBookConfigFolder}`,
      {
        shell: true,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          PROJECT_ROOT: path.join(process.cwd(), 'src'),
        },
      },
    ).stderr?.on('error', console.error);
  } catch (e) {
    if (e.message.includes('command not found')) {
      console.log(
        chalk.yellow(
          `\nPlease install yoshi-storybook-dependencies in order to run storybook\n`,
        ),
      );
    }
  }
};

export default {
  start,
};
