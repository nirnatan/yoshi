import { Configuration } from 'webpack';
import {
  validateServerEntry,
  createServerEntries,
} from 'yoshi-common/webpack-utils';
import { createBaseWebpackConfig } from 'yoshi-common/webpack.config';
import { Config } from 'yoshi-config/build/config';
import {
  isTypescriptProject,
  inTeamCity,
  isProduction,
} from 'yoshi-helpers/queries';
import { SERVER_ENTRY } from 'yoshi-config/paths';
import bmExternalModules from './bmExternalModules';

const useTypeScript = isTypescriptProject();

const createDefaultOptions = (config: Config) => {
  const separateCss =
    config.separateCss === 'prod'
      ? inTeamCity() || isProduction()
      : config.separateCss;

  return {
    name: config.name!,
    useTypeScript,
    typeCheckTypeScript: useTypeScript,
    useAngular: config.isAngularProject,
    devServerUrl: config.servers.cdn.url,
    separateCss,
  };
};

export function createClientWebpackConfig(
  config: Config,
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
): Configuration {
  const defaultOptions = createDefaultOptions(config);

  const clientConfig = createBaseWebpackConfig({
    configName: 'client',
    target: 'web',
    isDev,
    isHot,
    isAnalyze,
    forceEmitSourceMaps,
    cssModules: config.cssModules,
    ...defaultOptions,
  });

  clientConfig.externals = bmExternalModules;
  clientConfig.resolve!.alias = config.resolveAlias;

  return clientConfig;
}

export function createServerWebpackConfig(
  config: Config,
  { isDev, isHot }: { isDev?: boolean; isHot?: boolean } = {},
): Configuration {
  const defaultOptions = createDefaultOptions(config);

  const serverConfig = createBaseWebpackConfig({
    configName: 'server',
    target: 'node',
    isDev,
    isHot,
    ...defaultOptions,
  });

  serverConfig.entry = async () => {
    const serverEntry = validateServerEntry({
      extensions: serverConfig.resolve!.extensions as Array<string>,
      yoshiServer: config.yoshiServer,
    });

    let entryConfig = config.yoshiServer
      ? createServerEntries(serverConfig.context as string)
      : {};

    if (serverEntry) {
      entryConfig = { ...entryConfig, [SERVER_ENTRY]: serverEntry };
    }

    return entryConfig;
  };

  return serverConfig;
}
