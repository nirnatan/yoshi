import { DefinePlugin, Configuration } from 'webpack';
import { createBaseWebpackConfig } from '../webpack.config';

interface StorybookWebpackConfigOptions {
  projectRoot: string;
  /**
   * TODO - Types
   * @param middlewareOptions
   * @param options
   */
  reporter(middlewareOptions: any, options: any): void;
}

const createCustomStorybookWebpackConfig = ({
  projectRoot,
  reporter,
}: StorybookWebpackConfigOptions) => (config: Configuration) => {
  const yoshiWebpackConfig = createBaseWebpackConfig({
    configName: 'client',
    isDev: true,
    devServerUrl: '',
    target: 'web',
    useTypeScript: false,
    typeCheckTypeScript: false,
    name: 'storybook',
  });

  config.devServer = {
    colors: true,
    reporter,
  } as any;

  if (config.module && yoshiWebpackConfig.module) {
    config.module.rules = yoshiWebpackConfig.module.rules;
  }

  if (config.plugins && yoshiWebpackConfig.plugins) {
    config.plugins = config.plugins.concat(
      yoshiWebpackConfig.plugins,
      new DefinePlugin({
        PROJECT_ROOT: JSON.stringify(projectRoot),
      }),
    );
  }
  if (config.resolve && yoshiWebpackConfig.resolve) {
    config.resolve.extensions = yoshiWebpackConfig.resolve.extensions;
  }

  return config;
};

export default createCustomStorybookWebpackConfig;
