const HtmlWebPackPlugin = require('html-webpack-plugin');
/*
* HtmlWebPackPlugin里面用的lodash的template来解析模板
* 所以可以这样在html里面引用其他共用文件
* 1. 先用html-loader加载出来html文件
* 2. 然后用lodash的template模板引擎来解析, 不然直接引用是无法解析里面引用的变量的
* 3. :)
* <%=  _.template(require('html-loader!@base/components/header.html').default)(env)  %>
* */
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const webpack = require('webpack');
const copyWebpackPlugin = require('copy-webpack-plugin');
const { VueLoaderPlugin } = require('vue-loader');

let path = require('path');
let fs = require('fs');


function resolve(dir) {
    return path.join(__dirname, dir)
}


let alias = {
    'vue$': 'vue/dist/vue.esm-bundler.js',//不加别名引入的时候会引入几个版本的包
};

let outDir = './dist';

module.exports = (env, argv) => {

    let isDev = false;
    if(env.WEBPACK_SERVE) {//dev
        isDev = true;
    }
    if(env.WEBPACK_BUILD) {//编译时删除dist的文件
        fs.rmSync(resolve(outDir), {recursive : true, force : true});
    }

    let entrys = {}, plugins = [];

    plugins.push(new HtmlWebPackPlugin({
        template: resolve(`demo/index.html`),
        filename: `demo.html`,
        minify: false,
        chunks: ['demo']
    }));

    //环境变量
    plugins.push(new webpack.DefinePlugin({
        /*
        * html模板读取方法<%= BASE_URL %>
        * js 运行时读取方法 直接写名字 如: console.log(env);
        * */
        BASE_URL: JSON.stringify("/"),
        env: JSON.stringify({
            mode: 'test'
        }),
        //vue3新增 https://cn.vuejs.org/api/compile-time-flags.html#configuration-guides
        __VUE_OPTIONS_API__: 'true',
        __VUE_PROD_DEVTOOLS__: `${isDev}`,
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: `${isDev}`
    }));

    //复制public内的文件到dist
    plugins.push(new copyWebpackPlugin({
        patterns: [
            {
                from: 'public/',
                to: resolve(outDir)
            }
        ]
    }));

    //抽取css到单独的文件
    plugins.push(new MiniCssExtractPlugin({
        filename: `${outDir}/style/[name].css`,
        ignoreOrder: true
    }));

    plugins.push(new VueLoaderPlugin());

    console.log('alias', alias);

    return {
        entry: {
            demo: resolve(`demo/main.js`),
            museui: resolve('src/index.js'),
        },
        plugins: plugins,
        output: {
            filename: isDev ? `${outDir}/js/[name][chunkhash:3].js` : `${outDir}/js/[name][chunkhash:3].js`,
            path: resolve(outDir),
            publicPath: '',
            library: 'museUI',
            libraryTarget: 'umd',
        },

        optimization: {
            runtimeChunk: 'single',
            minimize: !isDev, //true, //如果直接为true, 代码中的debugger断点就没用了
            minimizer: [
                // 在 webpack@5 中，你可以使用 `...` 语法来扩展现有的 minimizer（即 `terser-webpack-plugin`），将下一行取消注释
                `...`,
                new CssMinimizerPlugin(),//生产环境压缩css
            ],
            splitChunks: {
                cacheGroups: {

                    //打包公共模块
                    commons: {
                        chunks: 'initial', //initial表示提取入口文件的公共部分
                        minChunks: 2, //表示提取公共部分最少的文件数
                        minSize: 0, //表示提取公共部分最小的大小
                        name: 'commons' //提取出来的文件命名
                    },
                    lib: {
                        name: "lib",
                        test: /node_modules/,
                        chunks: "all",
                        priority: 10
                    }
                }
            }
        },
        resolve: {
            alias: alias,
        },

        module: {
            rules: [
                /*
                * 如果引入了html-loader HtmlWebPackPlugin就不会解析模板了
                * */
                /* {
                     test: /\.html$/i,
                     loader: "html-loader",
                     options: {
                         // Disables attributes processing
                         sources: false,
                     },
                 },*/
                {
                    test: /\.(png|svg|gif|jpe?g)$/,
                    type: 'asset/resource',
                    generator: {
                        filename: `${outDir}/img/[name][ext]`,
                    }
                },
                {
                    test: /\.js$/,
                    exclude: /node_modules/,
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                },
                {
                    test: /\.less$|\.css$/i,
                    //test: /\.less$/,
                    use: [
                        'vue-style-loader',
                        // compiles Less to CSS
                        {
                            loader: MiniCssExtractPlugin.loader,
                            options: {
                                esModule: false,
                            },
                        },
                        {
                            loader: 'css-loader'
                        },
                        'postcss-loader',
                        {
                            loader: 'less-loader',
                            options: {
                               // additionalData: '@import "/styles/var.less";',
                            }
                        },
                    ],
                },
                {
                    test: /\.vue$/,
                    loader: 'vue-loader'
                },
            ]
        },
        //mode: argv.mode,
        //devtool: isDev ? 'source-map' : 'hidden-source-map',
        devtool: isDev ? 'source-map' : false,
        devServer: {
            port: 6000,
            allowedHosts: 'all',
            hot: true,
            client: {
                overlay: false
            },
            proxy: {
                '/api/*': {
                    ws: true,
                    changeOrigin: true,
                    target: 'http://127.0.0.1:9990/'
                },
            }
        },
    };
}
