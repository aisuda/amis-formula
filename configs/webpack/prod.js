// production config
const { merge } = require("webpack-merge");
const { resolve } = require("path");
const nodeExternals = require("webpack-node-externals");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const commonConfig = require("./common");

module.exports = merge(commonConfig, {
  mode: "production",
  entry: {
    index: ["./index.ts"],
    // editor: ['./editor.tsx'],
    // style: ['./style.scss']
  },
  output: {
    filename: "[name].js",
    path: resolve(__dirname, "../../dist"),
    publicPath: "/",
    libraryTarget: "commonjs",
  },
  devtool: "hidden-source-map",
  module: {
    rules: [
      {
        test: /\.scss$/i,
        use: [
          MiniCssExtractPlugin.loader,

          // Creates `style` nodes from JS strings
          // 'style-loader',
          // Translates CSS into CommonJS
          "css-loader",
          // Compiles Sass to CSS
          "sass-loader",
        ],
      },
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader,

          // Creates `style` nodes from JS strings
          // 'style-loader',
          // Translates CSS into CommonJS
          "css-loader",
        ],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: "[name].css",
      chunkFilename: "[id].css",
    }),

    {
      apply(compiler) {
        compiler.hooks.shouldEmit.tap(
          "Remove styles from output",
          (compilation) => {
            delete compilation.assets["style.min.js"];
            delete compilation.assets["editor.min.js.map"];
            delete compilation.assets["index.min.js.map"];
            delete compilation.assets["style.min.js.map"];
            delete compilation.assets["style.css.map"];
            return true;
          }
        );
      },
    },
  ],
  externals: [
    nodeExternals({
      importType: "commonjs",
    }),
  ],
});
