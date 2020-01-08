import path from 'path';
import execa from 'execa';
import chalk from 'chalk';

const storyBookConfigFolder = path.join(__dirname, '..', '.storybook');

interface StartOptions {
  port?: number;
}

const start = async ({ port = 9009 }: StartOptions) => {
  return new Promise(async resolve => {
    try {
      const storyBookYoshiDepsFolder = path.dirname(
        require.resolve('yoshi-storybook-dependencies/package.json'),
      );
      await execa(
        `${storyBookYoshiDepsFolder}/node_modules/.bin/start-storybook -p ${port} -c ${storyBookConfigFolder} --ci`,
        {
          shell: true,
          stdout: 'pipe',
          stderr: 'pipe',
          env: {
            PROJECT_ROOT: path.join(process.cwd(), 'src'),
          },
        },
      ).stdout?.on('data', buff => {
        const resultString = buff.toString();
        if (resultString && resultString.includes('started')) {
          resolve(resultString);
        }
      });
    } catch (e) {
      if (e.message.includes('command not found')) {
        console.log(
          chalk.yellow(
            `\nPlease install yoshi-storybook-dependencies in order to run storybook\n`,
          ),
        );
      }
      resolve();
    }
  });
};

export default {
  start,
};
