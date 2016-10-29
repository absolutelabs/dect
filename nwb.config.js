// https://github.com/insin/nwb/blob/master/docs/Configuration.md#webpack-configuration
// http://stackoverflow.com/questions/32296967/webpack-dev-server-doesnt-generate-source-maps
// https://webpack.github.io/docs/configuration.html#devtool
// https://github.com/insin/nwb/blob/master/docs/Configuration.md#webpack-configuration
// https://webpack.github.io/docs/configuration.html#output-devtoollinetoline
module.exports = {
  type: 'web-module',
  babel: {
    plugins: ['transform-async-to-generator', 'transform-flow-strip-types'],
  },
  webpack: {
    extra: {
      devtool: '#source-map',
      output: {
        filename: 'index.js',
        sourceMapFilename: '[file].map'
      },
      // resolve: {
      //   modulesDirectories: ['node_modules', 'src/npm_modules', 'src'],
      // }
    }
  },
  npm: {
    global: '',
    jsNext: true,
    umd: false
  }
}
