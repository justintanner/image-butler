import test from "ava";
import LambdaTester from "lambda-tester";
import aws from "aws-sdk";
import request from "request";
import * as TestHelpers from "./helpers/TestHelpers";
import AwsMocks from "./helpers/AwsMocks";
import sinon from "sinon";

const handler = require("../src/index.js").handler;

let s3Spy, awsMocks;

test.before(t => {
  // Stubbing all http posts as valid.
  // Posts are tested in ProcessUploadAndCallbackTest.js
  sinon.stub(request, "post").yields(null, {}, {});
});

test.beforeEach(t => {
  s3Spy = new aws.S3({ apiVersion: "2006-03-01" });
  awsMocks = new AwsMocks(s3Spy);
});

test("successfully resizes an image", t => {
  awsMocks.getObject(null, {
    Body: TestHelpers.fixture("960x720.jpg"),
    ContentLength: 999,
    ContentType: "image/jpeg"
  });

  awsMocks.putObject(null, {});

  const encodedPayload = TestHelpers.signAndEncode({
    styles: {
      thumb: "100x100",
      large: "500x700"
    },
    callbackData: { anything: "goes" },
    callbackUrl: "http://lvh.me/null"
  });

  const validEvent = TestHelpers.lambdaRecord(
    `uploads/1/2/${encodedPayload}/t.jpg`,
    s3Spy
  );

  return LambdaTester(handler)
    .event(validEvent)
    .expectSucceed(result => {
      t.is(result, "Successfully processed image. Created 2 styles.");
    });
});

test("missing callback url", t => {
  const payload = TestHelpers.signAndEncode({
    styles: {
      thumb: "100x100",
      large: "500x700"
    },
    callbackData: { anything: "goes" }
  });

  const record = TestHelpers.lambdaRecord(
    `uploads/1/2/${payload}/t.jpg`,
    s3Spy
  );

  return LambdaTester(handler)
    .event(record)
    .expectError(error => {
      t.is(error.message, "Missing callbackUrl.");
    });
});

test("fails with a bad s3 path", t => {
  const recordWithBadPath = TestHelpers.lambdaRecord("bad s3 path", s3Spy);

  return LambdaTester(handler)
    .event(recordWithBadPath)
    .expectError(error => {
      t.is(error.message, "Invalid S3 path");
    });
});

test("fails with a bogus event", t => {
  const bogusEvent = { bogus: "event" };

  return LambdaTester(handler)
    .event(bogusEvent)
    .expectError(error => {
      t.is(error.message, "Invalid AWS Lambda Event");
    });
});
