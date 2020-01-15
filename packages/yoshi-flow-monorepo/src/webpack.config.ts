import path from 'path';
// eslint-disable-next-line import/no-extraneous-dependencies
import webpack from 'webpack';
import {
  validateServerEntry,
  createServerEntries,
} from 'yoshi-common/webpack-utils';
// @ts-ignore
import { StatsWriterPlugin } from 'webpack-stats-plugin';
import { createBaseWebpackConfig } from 'yoshi-common/webpack.config';
import { defaultEntry } from 'yoshi-helpers/constants';
import { Config } from 'yoshi-config/build/config';
import {
  isTypescriptProject,
  isSingleEntry,
  inTeamCity,
  isProduction,
} from 'yoshi-helpers/queries';
import { STATICS_DIR, SERVER_ENTRY } from 'yoshi-config/paths';
import ManifestPlugin from 'yoshi-common/build/manifest-webpack-plugin';
import { isObject } from 'lodash';
import { PackageGraphNode } from './load-package-graph';

const useTypeScript = isTypescriptProject();

const defaultSplitChunksConfig = {
  chunks: 'all',
  name: 'commons',
  minChunks: 2,
};

const createDefaultOptions = (pkg: PackageGraphNode) => {
  const separateCss =
    pkg.config.separateCss === 'prod'
      ? inTeamCity() || isProduction()
      : pkg.config.separateCss;

  return {
    name: pkg.config.name as string,
    useTypeScript,
    typeCheckTypeScript: false, // useTypeScript,
    useAngular: pkg.config.isAngularProject,
    devServerUrl: pkg.config.servers.cdn.url,
    cssModules: pkg.config.cssModules,
    separateCss,
  };
};

export function createClientWebpackConfig(
  rootConfig: Config,
  pkg: PackageGraphNode,
  {
    isDev,
    isHot,
    isAnalyze,
    forceEmitSourceMaps,
  }: {
    isDev?: boolean;
    isHot?: boolean;
    isAnalyze?: boolean;
    forceEmitSourceMaps?: boolean;
  } = {},
): webpack.Configuration {
  const entry = pkg.config.entry || defaultEntry;

  const defaultOptions = createDefaultOptions(pkg);

  const customThunderboltApp = pkg.name === 'thunderbolt-app';
  const customSiteAssetsModule = pkg.name === 'thunderbolt-becky';
  const customThunderboltElementsModule = pkg.name === 'thunderbolt-elements';

  const clientConfig = createBaseWebpackConfig({
    cwd: pkg.location,
    configName: 'client',
    target: 'web',
    isDev,
    isHot,
    isAnalyze,
    forceEmitSourceMaps,
    exportAsLibraryName: pkg.config.exports,
    enhancedTpaStyle: pkg.config.enhancedTpaStyle,
    tpaStyle: pkg.config.tpaStyle,
    createEjsTemplates: pkg.config.experimentalBuildHtml,
    ...(customSiteAssetsModule
      ? {
          configName: 'site-assets',
          target: 'node',
          useNodeExternals: false,
        }
      : {}),
    ...defaultOptions,
  });

  if (customSiteAssetsModule) {
    // Apply manifest since standard `node` webpack configs don't
    clientConfig.plugins!.push(
      new ManifestPlugin({ fileName: 'manifest', isDev: isDev as boolean }),
    );
    clientConfig.output!.path = path.join(pkg.location, STATICS_DIR);
    clientConfig.output!.filename = isDev
      ? '[name].bundle.js'
      : '[name].[contenthash:8].bundle.min.js';
    clientConfig.output!.chunkFilename = isDev
      ? '[name].chunk.js'
      : '[name].[contenthash:8].chunk.min.js';
  }

  if (customThunderboltElementsModule) {
    clientConfig.optimization!.runtimeChunk = false;
  }

  clientConfig.entry = isSingleEntry(entry) ? { app: entry as string } : entry;
  clientConfig.resolve!.alias = pkg.config.resolveAlias;
  clientConfig.externals = pkg.config.externals;

  const useSplitChunks = pkg.config.splitChunks;

  // Write stats file to `dist/statics` during start and build instead of only during build and into
  // `target`
  //
  // In a following major version we will only generate stats into `dist/statics`
  if (customThunderboltApp) {
    clientConfig.plugins!.push(
      new StatsWriterPlugin({
        filename: `stats${isDev ? '' : '.min'}.json`,
        stats: {
          all: true,
          maxModules: Infinity,
        },
      }),
    );
  }

  if (useSplitChunks) {
    const splitChunksConfig = isObject(useSplitChunks)
      ? useSplitChunks
      : defaultSplitChunksConfig;

    clientConfig!.optimization!.splitChunks = splitChunksConfig as webpack.Options.SplitChunksOptions;
  }

  return clientConfig;
}

export function createServerWebpackConfig(
  rootConfig: Config,
  libs: Array<PackageGraphNode>,
  pkg: PackageGraphNode,
  { isDev, isHot }: { isDev?: boolean; isHot?: boolean } = {},
): webpack.Configuration {
  const defaultOptions = createDefaultOptions(pkg);

  const customThunderboltElements = pkg.name === 'thunderbolt-elements';

  const serverConfig = createBaseWebpackConfig({
    cwd: pkg.location,
    configName: 'server',
    target: 'node',
    isDev,
    isHot,
    useNodeExternals: !customThunderboltElements,
    nodeExternalsWhitelist: libs.map(pkg => new RegExp(pkg.name)),
    useAssetRelocator: pkg.config.experimentalUseAssetRelocator,
    ...defaultOptions,
  });

  if (customThunderboltElements) {
    serverConfig.output!.path = path.join(pkg.location, STATICS_DIR);
    serverConfig.plugins!.push(
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 1,
      }),
    );
  }

  serverConfig.entry = async () => {
    const serverEntry = validateServerEntry({
      cwd: pkg.location,
      extensions: serverConfig.resolve!.extensions as Array<string>,
      yoshiServer: pkg.config.yoshiServer,
    });

    let entryConfig = pkg.config.yoshiServer
      ? createServerEntries(serverConfig.context as string, pkg.location)
      : {};

    if (serverEntry) {
      entryConfig = { ...entryConfig, [SERVER_ENTRY]: serverEntry };
    }

    return entryConfig;
  };

  return serverConfig;
}

export function createWebWorkerWebpackConfig(
  rootConfig: Config,
  pkg: PackageGraphNode,
  { isDev, isHot }: { isDev?: boolean; isHot?: boolean } = {},
): webpack.Configuration {
  const defaultOptions = createDefaultOptions(pkg);

  const workerConfig = createBaseWebpackConfig({
    cwd: pkg.location,
    configName: 'web-worker',
    target: 'webworker',
    isDev,
    isHot,
    ...defaultOptions,
  });

  workerConfig.output!.library = '[name]';
  workerConfig.output!.libraryTarget = 'umd';
  workerConfig.output!.globalObject = 'self';

  workerConfig.entry = pkg.config.webWorkerEntry;

  workerConfig.externals = pkg.config.webWorkerExternals;

  return workerConfig;
}
