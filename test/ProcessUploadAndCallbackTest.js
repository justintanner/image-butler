import test from "ava";
import ProcessUploadAndCallback from "../src/ProcessUploadAndCallback.js";
import * as TestHelpers from "./helpers/TestHelpers.js";
import AwsMocks from "./helpers/AwsMocks.js";
import sinon from "sinon";
import request from "request";

// Loads ENV vars from .env for testing only. On AWS Lambda ENV vars are set by claudia.js
import dotenv from "dotenv";
dotenv.config({ path: TestHelpers.fixturePath(".env.lambda-tester") });

let encodedPayload, validKey;

test.before(t => {
  encodedPayload = TestHelpers.signAndEncode({
    styles: {
      thumb: "100x100",
      large: "500x700"
    },
    callbackData: { anything: "goes" },
    callbackUrl: "http://lvh.me.org/null"
  });

  validKey = `uploads/1/2/${encodedPayload}/t.jpg`;
});

test.serial("processes a valid jpg and calls back", t => {
  let requestSpy = sinon.spy(request, "post");
  let awsMocks = new AwsMocks();

  awsMocks.getObject(null, {
    Body: TestHelpers.fixture("960x720.jpg"),
    ContentLength: 592,
    ContentType: "image/jpeg"
  });

  awsMocks.putObject(null, {});

  return ProcessUploadAndCallback.fromPath(
    validKey,
    awsMocks.s3
  ).catch(results => {
    // This should not be catch, this should be a then!
    t.is(
      results.finalMessage,
      "Successfully processed image. Created 2 styles."
    );

    const expectedPostData = {
      url: "http://lvh.me.org/null",
      json: {
        fileName: "t.jpg",
        fileSize: 592,
        contentType: "image/jpeg",
        uniqueId: "2",
        finishedPathPrefix: `finished/1/2`,
        originalKey: validKey,
        sizes: {
          original: { width: 960, height: 720 },
          thumb: { width: 100, height: 75 },
          large: { width: 500, height: 375 }
        },
        anything: "goes"
      }
    };

    const actualPostData = requestSpy.args[0][0];
    t.is(actualPostData.url, expectedPostData.url);
    t.deepEqual(actualPostData.json, expectedPostData.json);
  });
});

test.serial("calls back with an error when an image could not be found", t => {
  /* This mock is leaking into the test about without .serial */
  let awsMocks = new AwsMocks();
  awsMocks.getObject(new Error("Faking a failed retrieval"), {});

  return ProcessUploadAndCallback.fromPath(
    validKey,
    awsMocks.s3
  ).catch(results => {
    t.true(results.error.message.startsWith("Failed to fetch S3 Object."));
  });
});
