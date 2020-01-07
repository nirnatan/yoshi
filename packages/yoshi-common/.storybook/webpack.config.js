
const { createBaseWebpackConfig } = require('../webpack.config')
const webpack = require('webpack');

module.exports = async ({ config, mode }) => {
	const yoshiWebpackConfig = createBaseWebpackConfig({
		configName: 'client',
		isDev: true,
		target: 'web',
		useTypeScript: true,
		name: 'storybook',
	})

	config.module.rules = yoshiWebpackConfig.module.rules
	
    config.plugins = config.plugins.concat(
        yoshiWebpackConfig.plugins, 
		new webpack.DefinePlugin({PROJECT_ROOT: JSON.stringify(process.env.PROJECT_ROOT)})
		);

	config.resolve.extensions = yoshiWebpackConfig.resolve.extensions;
	return config;
}
