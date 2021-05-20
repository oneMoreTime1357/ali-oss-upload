const webpackAliossUpload = require("../index");
const globby = require("globby");
const fs = require("fs-extra");
const path = require("path");

describe("webpackAliossUpload", () => {
  const context = path.resolve(__dirname);
  process.chdir(context);

  it("should normalize url", () => {
    const wpa = createWpaInstance();
    const re = wpa.normalize("http://a.com//b///c");
    expect(re).toBe("http://a.com/b/c");
  });

  it("test generateToUploadManifest empty", () => {
    const wpa = createWpaInstance();
    wpa.generateToUploadManifest().then((data) => {
      expect(data).toEqual({});
    });
  });

  it("test get upload files", async () => {
    const wpa = createWpaInstance({
      from: ["./_dist/**", "!./_dist/**/*.html"],
    });
    const { from } = wpa.config;
    const files = await wpa.getFiles(from);
    expect(files.length).toBe(2);

    wpa.generateToUploadManifest(files).then((data) => {
      expect(Object.keys(data).length).toEqual(2);
    });
  });

  it("test get manifestjson file", async (done) => {
    const wpa = createWpaInstance();
    try {
      const res = await wpa.getUploadedManifest();
      done();
    } catch (error) {
      done(error);
    }
  });

  it("test upload file manifest", async (done) => {
    const succFn = jest.fn();
    const failFn = jest.fn();

    const wpa = createWpaInstance({
      from: ["./_dist/**", "!./_dist/**/*.html"],
      successcb: succFn,
      failcb: failFn,
      verbose: false,
    });
    const { from } = wpa.config;
    const files = await wpa.getFiles(from);
    // console.log(files, 78);

    expect(files.length).toBe(2);

    try {
      const uploadFile = await wpa.handleUploadFile(files);
      console.log(uploadFile, 44);
      // expect(succFn).toHaveBeenCalled();
      expect(succFn.mock.calls.length).toBe(1);
      done();
      //   // expect(uploadFile.length).toBe(2)
    } catch (error) {
      done(error);
    }
  });

  it("test upload file manifest", async (done) => {
    const succFn = jest.fn();

    const wpa = createWpaInstance({
      from: ["./_dist/**", "!./_dist/**/*.html"],
      successcb: succFn,
      verbose: false,
      isIncrement: false,
    });
    const { from } = wpa.config;
    const files = await wpa.getFiles(from);
    // console.log(files, 78);

    expect(files.length).toBe(2);

    try {
      await wpa.handleUploadFile(files);

      expect(succFn.mock.calls.length).toBe(1);
      done();
      //   // expect(uploadFile.length).toBe(2)
    } catch (error) {
      done(error);
    }
  });
});

function createWpaInstance(params = {}, test = true) {
  const oss = {};
  let config = {
    from: "./_dist/**",
    dist: "/temp",
    region: "your region",
    accessKeyId: "your key",
    accessKeySecret: "your secret",
    bucket: "your bucket",
    test,
  };

  return new webpackAliossUpload(Object.assign(config, oss, params));
}
