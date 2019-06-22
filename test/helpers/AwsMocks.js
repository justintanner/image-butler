import sinon from "sinon";
import fs from "fs";
import path from "path";
import aws from "aws-sdk";

class AwsMocks {
  constructor() {
    this.s3 = new aws.S3({ apiVersion: "2006-03-01" });
    this.getObjectStub = sinon.stub(this.s3, "getObject");
    this.putObjectStub = sinon.stub(this.s3, "putObject");
    this.putCount = 0;
  }

  getObject(error, data) {
    this.getObjectStub.callsFake((params, callback) => {
      callback(error, data);
    });
  }

  putObject(error, data) {
    var that = this;

    this.putObjectStub.callsFake((params, callback) => {
      that.putCount++;
      callback(error, data);
    });
  }

  reset() {
    this.putCount = 0;
  }
}

export default AwsMocks;
