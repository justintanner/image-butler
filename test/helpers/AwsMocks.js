import sinon from "sinon";
import fs from "fs";
import path from "path";

class AwsMocks {
  constructor(s3Instance) {
    this._s3Instance = s3Instance;
    this._sandbox = sinon.sandbox.create();
    this._putCount = 0;
  }

  getObject(error, data) {
    this._sandbox
      .stub(this._s3Instance, "getObject")
      .callsFake((params, callback) => {
        callback(error, data);
      });
  }

  putObject(error, data) {
    this._sandbox
      .stub(this._s3Instance, "putObject")
      .callsFake((params, callback) => {
        this._putCount++;
        callback(error, data);
      });
  }

  restore() {
    this._sandbox.restore();
  }

  putObjectCount() {
    return this._putCount;
  }
}

export default AwsMocks;
