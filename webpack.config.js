const path = require('path');
const globby = require('globby');
const webpack = require('webpack');

module.exports = function(env) {
  const production = env === 'prod';

  return {
    mode: production ? 'production' : 'development',

    entry: path.resolve(__dirname, 'examples/example.js'),

    output: {
      path: path.resolve(__dirname, 'examples/dist'),
      filename: 'example.js',
    },

    module: {
      rules: [
        {
          test: /\.js$/,
          resolve: {
            extensions: [ '.js' ],
          },
          include: [
            path.resolve(__dirname, 'src'),
          ],
          exclude: /(node_modules|bower_components|build)/,
          use: {
            loader: 'babel-loader',
          },
        },
      ],
    },

    plugins: [
      new webpack.SourceMapDevToolPlugin({
        filename: 'maps/[file].map',
        test: /\.js$/,
      }),
    ],

    devServer: {
      port: 3000,
    },
  };
};

