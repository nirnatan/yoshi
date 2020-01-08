import webpack from 'webpack';
import createStore, { Store } from 'unistore';
import clearConsole from 'react-dev-utils/clearConsole';
import formatWebpackMessages from 'react-dev-utils/formatWebpackMessages';
import { prepareUrls, Urls } from 'react-dev-utils/WebpackDevServerUtils';
import yoshiStorybookUtils from './storybook';
import openBrowser from './open-browser';
import { PORT } from './utils/constants';
import ServerProcess from './server-process';
import { WebpackDevServer, host } from './webpack-dev-server';
import { addEntry, createCompiler } from './webpack-utils';
import { isTruthy } from './utils/helpers';
import {
  getUrl as getTunnelUrl,
  getDevServerSocketPath,
} from './utils/suricate';
import {
  default as devEnvironmentLogger,
  logStorybookUrls,
} from './dev-environment-logger';

const isInteractive = process.stdout.isTTY;

type WebpackStatus = {
  errors: Array<string>;
  warnings: Array<string>;
};

type StartUrl = string | Array<string> | null | undefined;

export type State =
  | {
      status: 'compiling';
    }
  | ({
      status: 'success';
      serverUrls: Urls;
      devServerUrls: Urls;
    } & WebpackStatus)
  | ({ status: 'errors' } & WebpackStatus)
  | ({ status: 'warnings' } & WebpackStatus);

type DevEnvironmentProps = {
  webpackDevServer: WebpackDevServer;
  serverProcess: ServerProcess;
  multiCompiler: webpack.MultiCompiler;
  appName: string;
  suricate: boolean;
  storybook?: boolean;
  startUrl?: StartUrl;
};

export default class DevEnvironment {
  private props: DevEnvironmentProps;
  public store: Store<State>;

  constructor(props: DevEnvironmentProps) {
    this.props = props;
    this.store = createStore<State>();

    const { multiCompiler, webpackDevServer } = props;

    this.props.multiCompiler.hooks.invalid.tap('recompile-log', () => {
      if (isInteractive) {
        clearConsole();
      }

      this.store.setState({
        status: 'compiling',
      });
    });

    multiCompiler.hooks.done.tap('finished-log', stats => {
      if (isInteractive) {
        clearConsole();
      }

      // @ts-ignore
      const messages = formatWebpackMessages(stats.toJson({}, true));
      const isSuccessful = !messages.errors.length && !messages.warnings.length;

      if (isSuccessful) {
        const serverUrls = prepareUrls('http', host, PORT);

        const devServerUrls = prepareUrls(
          webpackDevServer.https ? 'https' : 'http',
          host,
          webpackDevServer.port,
        );

        this.store.setState({
          status: 'success',
          serverUrls,
          devServerUrls,
          ...messages,
        } as State);
      } else if (messages.errors.length) {
        if (messages.errors.length > 1) {
          messages.errors.length = 1;
        }

        this.store.setState({
          status: 'errors',
          ...messages,
        });
      } else if (messages.warnings.length) {
        this.store.setState({
          status: 'warnings',
          ...messages,
        });
      }
    });
  }

  private async triggerBrowserRefresh(jsonStats: webpack.Stats.ToJsonOutput) {
    const { webpackDevServer } = this.props;

    await webpackDevServer.send('hash', jsonStats.hash);
    await webpackDevServer.send('ok', {});
  }

  private async showErrorsOnBrowser(jsonStats: webpack.Stats.ToJsonOutput) {
    const { webpackDevServer } = this.props;

    if (jsonStats.errors.length > 0) {
      await webpackDevServer.send('errors', jsonStats.errors);
    } else if (jsonStats.warnings.length > 0) {
      await webpackDevServer.send('warnings', jsonStats.warnings);
    }
  }

  startWebWorkerHotUpdate(compiler: webpack.Compiler) {
    compiler.watch({}, async (error, stats) => {
      // We save the result of this build to webpack-dev-server's internal state so the last
      // server build results are sent to the browser on every refresh
      //
      // https://github.com/webpack/webpack-dev-server/blob/master/lib/Server.js#L144
      // @ts-ignore
      this._stats = stats;

      const jsonStats = stats.toJson();

      if (!error && !stats.hasErrors()) {
        await this.triggerBrowserRefresh(jsonStats);
      } else {
        await this.showErrorsOnBrowser(jsonStats);
      }
    });
  }

  startServerHotUpdate(compiler: webpack.Compiler) {
    const { serverProcess } = this.props;

    compiler.watch({}, async (error, stats) => {
      // We save the result of this build to webpack-dev-server's internal state so the last
      // server build results are sent to the browser on every refresh
      //
      // https://github.com/webpack/webpack-dev-server/blob/master/lib/Server.js#L144
      // @ts-ignore
      this._stats = stats;
      const jsonStats = stats.toJson();

      // If the spawned server process has died, restart it
      if (
        serverProcess.child &&
        // @ts-ignore
        serverProcess.child.exitCode !== null
      ) {
        await serverProcess.restart();
        await this.triggerBrowserRefresh(jsonStats);
      }
      // If it's alive, send it a message to trigger HMR
      else {
        // If there are no errors and the server can be refreshed
        // then send it a signal and wait for a responsne
        if (serverProcess.child && !error && !stats.hasErrors()) {
          const { success } = (await serverProcess.send({})) as {
            success: boolean;
          };

          // HMR wasn't successful, restart the server process
          if (!success) {
            await serverProcess.restart();
          }

          await this.triggerBrowserRefresh(jsonStats);
        } else {
          await this.showErrorsOnBrowser(jsonStats);
        }
      }
    });
  }

  async start() {
    const {
      multiCompiler,
      webpackDevServer,
      serverProcess,
      suricate,
      appName,
      startUrl,
      storybook,
    } = this.props;

    const compilationPromise = new Promise(resolve => {
      multiCompiler.hooks.done.tap('done', resolve);
    });

    // Start Webpack compilation
    await webpackDevServer.listenPromise();
    await compilationPromise;

    // start app server
    await serverProcess.initialize();

    const actualStartUrl = suricate
      ? getTunnelUrl(appName)
      : startUrl || 'http://localhost:3000';

    openBrowser(actualStartUrl);

    if (storybook) {
      console.log();
      console.log('Starting storybook in watch mode');
      console.log();

      const storybookPort = 9009;

      await yoshiStorybookUtils.start({ port: storybookPort });

      const storybookUrls = prepareUrls('http', host, storybookPort);

      logStorybookUrls(storybookUrls);

      openBrowser(`http://localhost:${storybookPort}`);
    }
  }

  static async create({
    webpackConfigs,
    serverFilePath,
    https,
    webpackDevServerPort,
    enableClientHotUpdates,
    cwd = process.cwd(),
    createEjsTemplates = false,
    appName,
    startUrl,
    suricate = false,
    storybook = false,
  }: {
    webpackConfigs: [
      webpack.Configuration,
      webpack.Configuration,
      webpack.Configuration?,
    ];
    serverFilePath: string;
    https: boolean;
    webpackDevServerPort: number;
    enableClientHotUpdates: boolean;
    cwd?: string;
    createEjsTemplates?: boolean;
    appName: string;
    startUrl?: StartUrl;
    suricate?: boolean;
    storybook?: boolean;
  }): Promise<DevEnvironment> {
    const [clientConfig, serverConfig] = webpackConfigs;

    const publicPath = clientConfig.output!.publicPath!;

    const serverProcess = await ServerProcess.create({
      serverFilePath,
      cwd,
      suricate,
      appName,
    });

    // Add client hot entries
    if (enableClientHotUpdates) {
      if (!clientConfig.entry) {
        throw new Error('client webpack config was created without an entry');
      }

      const hmrSocketPath = suricate
        ? getDevServerSocketPath(appName)
        : publicPath;

      const hotEntries = [
        require.resolve('webpack/hot/dev-server'),
        // Adding the query param with the CDN URL allows HMR when working with a production site
        // because the bundle is requested from "parastorage" we need to specify to open the socket to localhost
        `${require.resolve('webpack-dev-server/client')}?${hmrSocketPath}`,
      ];

      // Add hot entries as a separate entry if using experimental build html
      if (createEjsTemplates) {
        clientConfig.entry = {
          // @ts-ignore
          ...clientConfig.entry,
          hot: hotEntries,
        };
      } else {
        clientConfig.entry = addEntry(clientConfig.entry, hotEntries);
      }
    }

    if (!serverConfig.entry) {
      throw new Error('server webpack config was created without an entry');
    }

    // Add server hot entry
    serverConfig.entry = addEntry(serverConfig.entry, [
      `${require.resolve('./utils/server-hot-client')}?${
        serverProcess.socketServer.hmrPort
      }`,
    ]);

    const multiCompiler = createCompiler(webpackConfigs.filter(isTruthy));

    const [
      clientCompiler,
      serverCompiler,
      webWorkerCompiler,
    ] = multiCompiler.compilers as [
      webpack.Compiler,
      webpack.Compiler,
      webpack.Compiler?,
    ];

    const webpackDevServer = new WebpackDevServer(clientCompiler, {
      publicPath,
      https,
      port: webpackDevServerPort,
      appName,
      suricate,
      cwd,
    });

    const devEnvironment = new DevEnvironment({
      webpackDevServer,
      serverProcess,
      multiCompiler,
      appName,
      suricate,
      startUrl,
      storybook,
    });

    devEnvironment.startServerHotUpdate(serverCompiler);

    if (webWorkerCompiler) {
      devEnvironment.startWebWorkerHotUpdate(webWorkerCompiler);
    }

    devEnvironment.store.subscribe(state =>
      devEnvironmentLogger({ state, appName, suricate }),
    );

    return devEnvironment;
  }
}
