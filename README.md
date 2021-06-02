
## use

直接使用，上传 dist 目录静态资源

```js
const webpackAliossUpload = require("ali-oss-upload");
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
