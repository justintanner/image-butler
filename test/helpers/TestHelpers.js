import appRoot from "app-root-path";
import fs from "fs";
import crypto from "crypto";
import _ from "underscore";

import dotenv from "dotenv";
dotenv.config({ path: fixturePath(".env.lambda-tester") });

function signAndEncode(jsonObject, signatureOverride) {
  let json = JSON.stringify(jsonObject);

  if (_.isUndefined(signatureOverride)) {
    const hmac = crypto.createHmac("sha256", process.env.IB_SECRET);

    jsonObject.signature = hmac.update(json).digest("hex");
  } else {
    jsonObject.signature = signatureOverride;
  }

  json = JSON.stringify(jsonObject);

  const base64 = new Buffer(json).toString("base64");

  return encodeURIComponent(base64);
}

function fixture(filename) {
  return fs.readFileSync(fixturePath(filename));
}

function fixturePath(filename) {
  return appRoot + "/test/fixtures/" + filename;
}

function lambdaRecord(path, s3Spy) {
  return {
    Records: [{ s3: { object: { key: path } } }],
    testingOnlyS3: s3Spy,
  };
}

export { signAndEncode, fixture, fixturePath, lambdaRecord };
