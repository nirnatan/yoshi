const path = require('path');
const execa = require('execa');
const fs = require('fs-extra');
const {
  waitForPort,
  waitForStdout,
  terminateAsyncSafe,
  terminateAsync,
  tmpDirectory,
  replaceTemplates,
} = require('./utils');
const { ciEnv, localEnv } = require('../scripts/utils/constants');

const isPublish = !!process.env.WITH_PUBLISH;

const defaultOptions = {
  BROWSER: 'none',
};

const yoshiBin = require.resolve('../packages/yoshi/bin/yoshi-cli');

module.exports = class Scripts {
  constructor({ testDirectory }) {
    this.verbose = !!process.env.DEBUG;
    this.testDirectory = testDirectory;
    this.serverProcessPort = 3000;
    this.staticsServerPort = 3200;
    this.storybookPort = 9009;
    this.yoshiPublishDir = isPublish
      ? `${global.yoshiPublishDir}/node_modules`
      : path.join(__dirname, '../packages/yoshi-flow-legacy/node_modules');
  }

  static setupProjectFromTemplate({ templateDir, projectType }) {
    // The test will run in '.tmp' folder. For example: '.tmp/javascript/features/css-inclusion'
    const featureDir = path.join(
      tmpDirectory,
      templateDir.replace(__dirname, ''),
    );
    // Create a folder for the specific feature, if does not exist
    fs.ensureDirSync(featureDir);
    // Copy the base template
    fs.copySync(
      path.join(__dirname, 'fixtures', projectType, 'base-template'),
      featureDir,
    );
    // Copy the specific feature template, with override
    fs.copySync(templateDir, featureDir, {
      overwrite: true,
      filter: file => !file.includes('.test.js'),
    });

    //Process tsconfig template for dynamic content
    const tsConfigPath = path.join(featureDir, 'tsconfig.json');
    if (fs.pathExistsSync(tsConfigPath)) {
      const templateData = {
        rootPath: path.join(__dirname, '..'),
      };
      const fileContents = fs.readFileSync(tsConfigPath, 'utf-8');
      const transformedContents = replaceTemplates(fileContents, templateData);
      fs.outputFileSync(tsConfigPath, transformedContents);
    }

    // we have __node_modules__ in our feature templates, in order to mock some devendency data
    if (fs.pathExistsSync(path.join(featureDir, '__node_modules__'))) {
      fs.moveSync(
        path.join(featureDir, '__node_modules__'),
        path.join(featureDir, 'node_modules'),
      );
    }

    return new Scripts({ testDirectory: featureDir });
  }

  async dev(callback = () => {}) {
    console.log('I started running! ');
    let startProcessOutput;
    const startProcess = execa(
      'node',
      [yoshiBin, 'start', '--server', './dist/server.js'],
      {
        cwd: this.testDirectory,
        env: {
          PORT: this.serverProcessPort,
          NODE_PATH: this.yoshiPublishDir,
          ...defaultOptions,
          ...localEnv,
        },
      },
    );

    startProcess.stdout.on('data', buffer => {
      startProcessOutput += buffer.toString();
      if (this.verbose) {
        console.log(buffer.toString());
      }
    });

    startProcess.stderr.on('data', buffer => {
      startProcessOutput += buffer.toString();
      if (this.verbose) {
        console.log(buffer.toString());
      }
    });

    console.log('We have a process');

    // `startProcess` will never resolve but if it fails this
    // promise will reject immediately
    try {
      await Promise.race([
        waitForStdout(startProcess, 'Compiled with warnings', {
          throttle: true,
        }).then(() => {
          // console.log(data);
          throw new Error(
            `Yoshi start was compiled with warnings \n \n ${startProcessOutput}`,
          );
        }),
        waitForStdout(startProcess, 'Failed to compile', {
          throttle: true,
        }).then(() => {
          throw new Error(
            `Yoshi start failed to compile: \n \n ${startProcessOutput}`,
          );
        }),
        Promise.all([
          waitForPort(this.serverProcessPort, { timeout: 60 * 1000 }),
          waitForPort(this.staticsServerPort, { timeout: 60 * 1000 }),
          waitForStdout(startProcess, 'Compiled successfully!'),
        ]),
        startProcess,
      ]);

      console.log(startProcessOutput);
      await callback();
    } catch (e) {
      if (this.verbose) {
        console.log('--------------- Yoshi Start Output ---------------');
        console.log(startProcessOutput);
        console.log(
          '--------------- End of Yoshi Start Output ---------------',
        );
      }
      throw e;
    } finally {
      await terminateAsyncSafe(startProcess.pid);
    }
  }

  async analyze(callback = () => {}) {
    let buildProcessOutput;
    const buildProcess = execa('node', [yoshiBin, 'build', '--analyze'], {
      cwd: this.testDirectory,
      env: {
        ...defaultOptions,
        ...localEnv,
      },
    });

    buildProcess.stdout.on('data', buffer => {
      buildProcessOutput += buffer.toString();
      if (this.verbose) {
        console.log(buffer.toString());
      }
    });

    buildProcess.stderr.on('data', buffer => {
      buildProcessOutput += buffer.toString();
      if (this.verbose) {
        console.log(buffer.toString());
      }
    });

    try {
      await callback();
    } catch (e) {
      console.log('--------------- Yoshi Build Output ---------------');
      console.log(buildProcessOutput);
      console.log('--------------- End of Yoshi Build Output ---------------');
      throw e;
    } finally {
      terminateAsync(buildProcess.pid);
    }
  }

  async build(env = {}, args = []) {
    let buildResult;

    try {
      buildResult = await execa('node', [yoshiBin, 'build', ...args], {
        cwd: this.testDirectory,
        env: {
          ...defaultOptions,
          ...env,
        },
        all: true,
      });
    } catch (e) {
      throw new Error(e.all);
    }

    if (this.verbose) {
      console.log(buildResult.all);
    }

    if (buildResult.stdout.includes('Compiled with warnings')) {
      throw new Error(
        `Yoshi build was compiled with warnings: \n ${buildResult.stdout}`,
      );
    }

    return buildResult;
  }

  async test(mode) {
    const env = mode === 'prod' ? ciEnv : localEnv;
    let res;
    try {
      res = await execa('node', [yoshiBin, 'test'], {
        cwd: this.testDirectory,
        all: true,
        env: {
          NODE_PATH: this.yoshiPublishDir,
          ...defaultOptions,
          ...env,
        },
      });
    } catch (e) {
      throw new Error(e.all);
    }
    return res;
  }

  async prod(callback = () => {}, args = []) {
    let buildResult;
    try {
      buildResult = await this.build(ciEnv, args);
    } catch (e) {
      throw new Error(e);
    }

    const staticsServerProcess = execa(
      'npx',
      ['serve', '-p', this.staticsServerPort, '-s', 'dist/statics/'],
      {
        cwd: this.testDirectory,
      },
    );

    const appServerProcess = execa('node', ['./dist/server.js'], {
      cwd: this.testDirectory,
      stdio: !this.verbose ? 'pipe' : 'inherit',
      env: {
        NODE_PATH: this.yoshiPublishDir,
        PORT: this.serverProcessPort,
      },
    });

    await Promise.all([
      waitForPort(this.staticsServerPort),
      waitForPort(this.serverProcessPort),
    ]);

    try {
      await callback(buildResult);
    } catch (e) {
      console.log('--------------- Yoshi Build Output ---------------');
      console.log(buildResult.all);
      console.log('--------------- End of Yoshi Build Output ---------------');
      throw e;
    } finally {
      await Promise.all([
        terminateAsyncSafe(staticsServerProcess.pid),
        terminateAsyncSafe(appServerProcess.pid),
      ]);
    }
  }
};

module.exports.projectType = {
  TS: 'typescript',
  JS: 'javascript',
};
