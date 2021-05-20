- 集团[@xes/ms-webpack-alioss-upload](https://npm.xesv5.com/#/detial?name=%40xes%2Fms-webpack-alioss-upload)地址
- 集团 gitlab [ms-webpack-alioss-upload](https://git.100tal.com/jituan_kaifangpingtai_mofaxiao_ms/ms-webpack-alioss-upload-)地址

## install

安装前需要在项目中.npmrc 文件中添加如下代码

```shell
@xes:registry=http://npm.100tal.com
```

连接集团 vpn 安装

```shell
yarn add @xes/ms-webpack-alioss-upload -D
```

## use

直接使用，上传 dist 目录静态资源

```js
const webpackAliossUpload = require("@xes/ms-webpack-alioss-upload");
new webpackAliossUpload({
  from: ["./dist/**", "!./dist/**/*.html"],
  dist: `buket/cactory/dist`, // 上传buket的
  // buildRoot: 'dist', // 构建目录，如果已传setOssPath，可忽略
  region: "xxx",
  accessKeyId: "xxxxxxxx",
  accessKeySecret: "xxxxxxxxx",
  bucket: "xxxxxxxx",
  setOssPath(filePath) {
    // filePath为当前文件路径。函数应该返回路径+文件名。如果返回/new/path/to/file.js，则最终上传路径为 path/in/alioss/new/path/to/file.js
    // some operations to filePath
    const index = filePath.lastIndexOf("dist");
    const Path = filePath.substring(index + 4, filePath.length);
    return Path.replace(/\\/g, "/");
  },
}).apply();
```

## webpack

作为 webpack 插件使用，目前只支持 webpack >=4

```js
const webpackAliossUpload = require("@xes/ms-webpack-alioss-upload");

module.exports = {
  plugin: [
    new webpackAliossUpload({
      from: ["./dist/**", "!./dist/**/*.html"],
      dist: `buket/cactory/dist`, // 上传buket的
      // buildRoot: 'dist', // 构建目录，如果已传setOssPath，可忽略
      region: "xxx",
      accessKeyId: "xxxxxxxx",
      accessKeySecret: "xxxxxxxxx",
      bucket: "xxxxxxxx",
      setOssPath(filePath) {
        // filePath为当前文件路径。函数应该返回路径+文件名。如果返回/new/path/to/file.js，则最终上传路径为 path/in/alioss/new/path/to/file.js
        // some operations to filePath
        const index = filePath.lastIndexOf("dist");
        const Path = filePath.substring(index + 4, filePath.length);
        return Path.replace(/\\/g, "/");
      },
    }),
  ],
};
```

## changelog

- v1.0.0 静态资源上传
- v1.1.0 静态资源增量上传
