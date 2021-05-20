const fs = require("fs");
const path = require("path");
const oss = require("ali-oss");
const globby = require("globby");
const slash = require("slash2");
const crypto = require("crypto");

class MSWebpackAliOssUpload {
  constructor(options) {
    const { region, accessKeyId, accessKeySecret, bucket, test } = options;

    this.config = Object.assign(
      {
        test: false,
        verbose: true,
        dist: "",
        buildRoot: ".",
        deleteOrigin: false,
        deleteEmptyDir: false,
        timeout: 30 * 1000,
        setOssPath: null,
        setHeaders: null,
        failcb: null,
        successcb: null,
        isIncrement: true,
      },
      options
    );

    this.configErrStr = this.checkOptions(options);

    this.client = test
      ? null
      : new oss({
          region,
          accessKeyId,
          accessKeySecret,
          bucket,
        });

    this.UPLOADED_MANIFEST_PATH = path.resolve(
      process.cwd(),
      "node_modules",
      "uploadedManifest.json"
    );
  }

  apply(compiler) {
    if (compiler) {
      this.doWithWebpack(compiler);
    } else {
      return this.doWidthoutWebpack();
    }
  }

  doWithWebpack(compiler) {
    compiler.hooks.afterEmit.tapPromise(
      "MSWebpackAliOssUpload",
      async (compilation) => {
        if (this.configErrStr) {
          compilation.errors.push(new Error(this.configErrStr));
          return Promise.resolve();
        }

        const outputPath = path.resolve(slash(compiler.options.output.path));
        const { from = outputPath + "/" + "**" } = this.config;
        const files = await this.getFiles(from);

        this.handleUploadFile(files);
      }
    );
  }

  async doWidthoutWebpack() {
    if (this.configErrStr) return Promise.reject(new Error(this.configErrStr));

    const { from } = this.config;
    const files = await this.getFiles(from);

    this.handleUploadFile(files);
  }

  async getFiles(from) {
    const files = await globby(from);
    return files;
  }

  async handleUploadFile(files) {
    console.log("files-->", files);
    const { isIncrement } = this.config;

    if (isIncrement) {
      return this.incrementUpload(files);
    } else {
      return await this.upload(files);
    }
  }

  async incrementUpload(files) {
    // 处理文件，筛出增量上传
    this.generateToUploadManifest(files).then(async (uploadManifest) => {
      files = await this.filterToUploadManifest(uploadManifest);
      if (files.length) {
        const fileUploaded = await this.upload(files);
        this.config.verbose && console.log(fileUploaded, "已上传文件");
        await this.updateUploadedManifest(fileUploaded);
        return Promise.resolve(fileUploaded);
      } else {
        return Promise.resolve("no files to be uploaded");
      }
    });
  }

  async upload(files, inWebpack, outputPath = "") {
    const {
      dist,
      buildRoot,
      setHeaders,
      deleteOrigin,
      deleteEmptyDir,
      setOssPath,
      timeout,
      verbose,
      test,
      failcb,
      successcb,
    } = this.config;

    files = files.map((file) => path.resolve(file));

    const splitToken = inWebpack
      ? "/" + outputPath.split("/").slice(-2).join("/") + "/"
      : "/" + path.resolve(buildRoot).split("/").slice(-2).join("/") + "/";

    let uploadedFiles = [];
    let filePath,
      i = 0,
      len = files.length;
    try {
      while (i++ < len) {
        filePath = files.shift();

        let ossFilePath = slash(
          path.join(
            dist,
            (setOssPath && setOssPath(filePath)) ||
              (splitToken && filePath.split(splitToken)[1]) ||
              ""
          )
        );
        console.log("ossFilePath->", ossFilePath);
        if (test) {
          console.log(filePath, "is ready to upload to " + ossFilePath);
          uploadedFiles.push(filePath);
          continue;
        }

        let result = await this.client.put(ossFilePath, filePath, {
          timeout,
          headers: (setHeaders && setHeaders(filePath)) || {},
        });
        result.url = this.normalize(result.url);
        uploadedFiles.push(filePath);
        verbose &&
          console.log(
            filePath,
            "\nupload to " + ossFilePath + " success,",
            "cdn url =>",
            result.url
          );

        if (deleteOrigin) {
          fs.unlinkSync(filePath);
          if (
            deleteEmptyDir &&
            files.every((f) => f.indexOf(path.dirname(filePath)) === -1)
          )
            this.deleteEmptyDir(filePath);
        }
      }
      successcb && successcb(uploadedFiles);
      return uploadedFiles;
    } catch (error) {
      console.log("oss client upload error", error);
      failcb && failcb(error);
      // 终止进程
      process.exit(1);
    }
  }

  normalize(url) {
    const tmpArr = url.split(/\/{2,}/);
    if (tmpArr.length > 2) {
      const [protocol, ...rest] = tmpArr;
      url = protocol + "//" + rest.join("/");
    }
    return url;
  }

  deleteEmptyDir(filePath) {
    let dirname = path.dirname(filePath);
    if (fs.existsSync(dirname) && fs.statSync(dirname).isDirectory()) {
      fs.readdir(dirname, (err, files) => {
        if (err) console.error(err);
        else {
          if (!files.length) {
            fs.rmdir(dirname, (err) => {
              if (err) {
                console.log(err.red);
              } else {
                this.config.verbose &&
                  console.log("empty directory deleted".green, dirname);
              }
            });
          }
        }
      });
    }
  }

  checkOptions(options = {}) {
    const { from, region, accessKeyId, accessKeySecret, bucket } = options;

    let errStr = "";

    if (!region) errStr += "\nregion not specified";
    if (!accessKeyId) errStr += "\naccessKeyId not specified";
    if (!accessKeySecret) errStr += "\naccessKeySecret not specified";
    if (!bucket) errStr += "\nbucket not specified";

    if (Array.isArray(from)) {
      if (from.some((g) => typeof g !== "string"))
        errStr += "\neach item in from should be a glob string";
    } else {
      let fromType = typeof from;
      if (["undefined", "string"].indexOf(fromType) === -1)
        errStr += "\nfrom should be string or array";
    }

    return errStr;
  }

  bufferToMD5(buffer) {
    const md5 = crypto.createHash("md5");
    md5.update(buffer);
    return md5.digest("base64");
  }

  generateToUploadManifest(filePaths = []) {
    return Promise.all(
      filePaths.map(
        (filePath) =>
          new Promise((resolve) => {
            fs.readFile(filePath, (err, content) => {
              if (err) {
                this.config.verbose && console.log(filePath + "读取失败");
                return;
              }
              const md5 = this.bufferToMD5(content);
              resolve({
                [md5]: filePath,
              });
            });
          })
      )
    ).then((manifestItems) =>
      manifestItems.length ? Object.assign(...manifestItems) : {}
    );
  }

  getUploadedManifest() {
    try {
      const uploadedManifestStr = fs.readFileSync(this.UPLOADED_MANIFEST_PATH);
      return JSON.parse(uploadedManifestStr);
    } catch (e) {
      this.config.verbose && console.log("未找到uploadedManifest.json");
      return {};
    }
  }

  filterToUploadManifest(toUploadManifest) {
    const uploadedManifest = this.getUploadedManifest();
    this.config.verbose &&
      console.log("save UPLOADED_MANIFEST_PATH", uploadedManifest);
    Object.keys(toUploadManifest)
      .filter((item) => uploadedManifest[item])
      .forEach((item) => {
        const lastTo = toUploadManifest[item].split("/").pop();
        const saveItem = uploadedManifest[item].split("/").pop();
        if (toUploadManifest[item] && lastTo == saveItem) {
          this.config.verbose &&
            console.log(toUploadManifest[item] + " 已上传过");
          delete toUploadManifest[item];
        }
      });
    this.config.verbose && console.log(toUploadManifest, "处理过的文件");
    return Object.values(toUploadManifest);
  }

  // 更新存储文件
  updateUploadedManifest(filePaths) {
    let manifest = {};
    try {
      const uploadedManifestStr = fs.readFileSync(this.UPLOADED_MANIFEST_PATH);
      manifest = JSON.parse(uploadedManifestStr);
    } catch (e) {}
    this.generateToUploadManifest(filePaths).then((uploadedManifest) => {
      manifest = Object.assign(manifest, uploadedManifest);
      fs.writeFileSync(this.UPLOADED_MANIFEST_PATH, JSON.stringify(manifest));
    });
  }
}

module.exports = MSWebpackAliOssUpload;
