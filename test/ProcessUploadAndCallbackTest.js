import test from "ava";
import ProcessUploadAndCallback from "../src/ProcessUploadAndCallback.js";
import * as Utils from "./helpers/Utils.js";
import AwsMocks from "./helpers/AwsMocks.js";
import sinon from "sinon";
import aws from "aws-sdk";
import request from "request";

// Loads ENV vars from .env for testing only. On AWS Lambda ENV vars are set by claudia.js
import dotenv from "dotenv";
dotenv.config();

let encodedPayload, validKey, s3Spy, awsMocks, requestSpy, requestSandbox;

test.before(t => {
  s3Spy = new aws.S3({ apiVersion: "2006-03-01" });
  awsMocks = new AwsMocks(s3Spy);
  requestSandbox = sinon.sandbox.create();
  requestSpy = requestSandbox.spy(request, "post");

  encodedPayload = Utils.signAndEncode({
    styles: {
      thumb: "100x100",
      large: "500x700"
    },
    callbackData: { anything: "goes" },
    callbackUrl: "http://lvh.me.org/null"
  });

  validKey = `uploads/1/2/${encodedPayload}/t.jpg`;
});

test.beforeEach(t => {
  awsMocks.restore();
  requestSandbox.restore();
});

// Using .serial because the mocking needs to reset before each test.
test.serial.failing("processes a valid jpg and calls back", t => {
  awsMocks.getObject(null, {
    Body: Utils.fixture("960x720.jpg"),
    ContentLength: 592,
    ContentType: "image/jpeg"
  });

  awsMocks.putObject(null, {});

  return ProcessUploadAndCallback.fromPath(validKey, s3Spy).then(results => {
    t.is(
      results.finalMessage,
      "Successfully processed image. Created 2 styles."
    );

    const expectedPostData = {
      url: encodedPayload.callbackUrl,
      json: {
        fileName: "t.jpg",
        fileSize: 593,
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
    //t.is(actualPostData.url, expectedPostData.url);
    //t.deepEqual(actualPostData.json, expectedPostData.json);
  });
});

test.serial("calls back with an error when an image could not be found", t => {
  awsMocks.getObject(new Error("Faking a failed retrieval"), {});

  return ProcessUploadAndCallback.fromPath(validKey, s3Spy).catch(results => {
    t.true(results.error.message.startsWith("Failed to fetch S3 Object."));
  });
});
