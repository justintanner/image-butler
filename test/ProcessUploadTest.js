import test from "ava";
import ProcessUpload from "../src/ProcessUpload.js";
import * as Utils from "./helpers/Utils.js";
import AwsMocks from "./helpers/AwsMocks.js";
import sinon from "sinon";
import aws from "aws-sdk";
import request from "request";

// Loads ENV vars from .env for testing only. On AWS Lambda ENV vars are set by claudia.js
import dotenv from "dotenv";
dotenv.config();

let encodedStyles, validPath, s3Spy, awsMocks;

test.before(t => {
  encodedStyles = Utils.signAndEncode({
    styles: {
      thumb: "100x100",
      large: "500x700"
    },
    callbackUrl: "http://lvh.me"
  });

  validPath = `uploads/1/2/${encodedStyles}/t.jpg`;

  // Mute all outgoing requests
  sinon.stub(request, "post").yields(null, {}, {});
});

test.beforeEach(t => {
  // Initializing before each test to reset all the aws mocks
  s3Spy = new aws.S3({ apiVersion: "2006-03-01" });
  awsMocks = new AwsMocks(s3Spy);
});

test("processes a valid jpg", t => {
  awsMocks.getObject(null, {
    Body: Utils.fixture("960x720.jpg"),
    ContentLength: 999,
    ContentType: "image/jpeg"
  });

  awsMocks.putObject(null, {});

  return ProcessUpload.fromPath(validPath, s3Spy).then(results => {
    t.is(
      results.finalMessage,
      "Successfully processed image. Created 2 styles."
    );

    t.is(results.sizes.thumb.height, 75);
    t.is(results.sizes.thumb.width, 100);
  });
});

test("processes a massive ~10MB jpg", t => {
  awsMocks.getObject(null, {
    Body: Utils.fixture("5472x3648.jpg"),
    ContentLength: 999
  });

  awsMocks.putObject(null, {});

  return ProcessUpload.fromPath(validPath, s3Spy).then(results => {
    t.is(
      results.finalMessage,
      "Successfully processed image. Created 2 styles."
    );
  });
});

test("pre rotates before processing an image", t => {
  awsMocks.getObject(null, {
    Body: Utils.fixture("960x720.jpg"),
    ContentLength: 999
  });

  awsMocks.putObject(null, {});

  const rotationStyles = Utils.signAndEncode({
    rotateOriginal: {
      angle: 90
    },
    styles: {
      thumb: "100x100"
    },
    callbackUrl: "http://lvh.me"
  });

  const rotationPath = `uploads/1/2/${rotationStyles}/t.jpg`;

  return ProcessUpload.fromPath(rotationPath, s3Spy).then(results => {
    t.is(results.sizes.original.width, 720);
    t.is(results.sizes.original.height, 960);

    t.is(results.sizes.thumb.width, 75);
    t.is(results.sizes.thumb.height, 100);
  });
});

test("pre crops before processing an image", t => {
  awsMocks.getObject(null, {
    Body: Utils.fixture("960x720.jpg"),
    ContentLength: 999
  });

  awsMocks.putObject(null, {});

  const cropStyles = Utils.signAndEncode({
    cropOriginal: {
      width: 200,
      height: 200,
      x: 10,
      y: 10
    },
    styles: {
      thumb: "100x100"
    },
    callbackUrl: "http:/lvh.me"
  });

  const cropPath = `uploads/1/2/${cropStyles}/t.jpg`;

  return ProcessUpload.fromPath(cropPath, s3Spy).then(results => {
    t.is(results.sizes.original.width, 200);
    t.is(results.sizes.original.height, 200);

    t.is(results.sizes.thumb.width, 100);
    t.is(results.sizes.thumb.height, 100);
  });
});

test("fails when s3 returns an error", async t => {
  awsMocks.getObject(new Error("mockS3Error"), null);

  const results = await t.throws(ProcessUpload.fromPath(validPath, s3Spy));

  t.regex(results.error.message, /Failed to fetch S3 Object*/);
});

test("fails with an invalid s3 image", async t => {
  awsMocks.getObject(null, { ContentLength: 0 });

  const results = await t.throws(ProcessUpload.fromPath(validPath, s3Spy));

  t.is(results.error.message, "Image is empty");
});

/*test("fails to identify empty image", async t => {
  awsMocks.getObject(null, {
    Body: Utils.fixture("empty-file.jpg"),
    ContentLength: 999
  });

  const results = await t.throws(ProcessUpload.fromPath(validPath, s3Spy));

  t.regex(results.error.message, /Failed to size original:.*!/);
});*/
