import test from "ava";
import ProcessUpload from "../src/ProcessUpload.js";
import * as TestHelpers from "./helpers/TestHelpers.js";
import AwsMocks from "./helpers/AwsMocks.js";
import sinon from "sinon";
import request from "request";

// Loads ENV vars from .env for testing only. On AWS Lambda ENV vars are set by claudia.js
import dotenv from "dotenv";
dotenv.config({ path: TestHelpers.fixturePath(".env.lambda-tester") });

let encodedStyles, validPath;

test.before((t) => {
  encodedStyles = TestHelpers.signAndEncode({
    styles: {
      thumb: "100x100",
      large: "500x700",
    },
    callbackUrl: "http://lvh.me",
  });

  validPath = `uploads/1/2/${encodedStyles}/t.jpg`;

  // Mute all outgoing requests
  sinon.stub(request, "post").yields(null, {}, {});
});

test("processes a valid jpg", (t) => {
  let awsMocks = new AwsMocks();

  awsMocks.getObject(null, {
    Body: TestHelpers.fixture("960x720.jpg"),
    ContentLength: 999,
    ContentType: "image/jpeg",
  });

  awsMocks.putObject(null, {});

  return ProcessUpload.fromPath(validPath, awsMocks.s3).then((results) => {
    t.is(
      results.finalMessage,
      "Successfully processed image. Created 2 styles."
    );

    t.is(results.sizes.thumb.height, 75);
    t.is(results.sizes.thumb.width, 100);
  });
});

test("processes a massive ~10MB jpg", (t) => {
  let awsMocks = new AwsMocks();

  awsMocks.getObject(null, {
    Body: TestHelpers.fixture("5472x3648.jpg"),
    ContentLength: 999,
  });

  awsMocks.putObject(null, {});

  return ProcessUpload.fromPath(validPath, awsMocks.s3).then((results) => {
    t.is(
      results.finalMessage,
      "Successfully processed image. Created 2 styles."
    );
  });
});

test("maintains a jpegs exif rotation as if the pixels were transposed", (t) => {
  let awsMocks = new AwsMocks();
  awsMocks.putObject(null, {});

  awsMocks.getObject(null, {
    Body: TestHelpers.fixture("exif_rotated_480x640.jpg"),
    ContentLength: 999,
  });

  const rotationStyles = TestHelpers.signAndEncode({
    styles: {
      thumb: "100x100",
    },
    callbackUrl: "http://lvh.me",
  });

  const rotationPath = `uploads/1/2/${rotationStyles}/t.jpg`;

  return ProcessUpload.fromPath(rotationPath, awsMocks.s3).then((results) => {
    t.is(results.sizes.original.width, 480);
    t.is(results.sizes.original.height, 640);

    t.is(results.sizes.thumb.width, 75);
    t.is(results.sizes.thumb.height, 100);
  });
});

test("pre rotates before processing an image", (t) => {
  let awsMocks = new AwsMocks();

  awsMocks.getObject(null, {
    Body: TestHelpers.fixture("960x720.jpg"),
    ContentLength: 999,
  });

  awsMocks.putObject(null, {});

  const rotationStyles = TestHelpers.signAndEncode({
    rotateOriginal: {
      angle: 90,
    },
    styles: {
      thumb: "100x100",
    },
    callbackUrl: "http://lvh.me",
  });

  const rotationPath = `uploads/1/2/${rotationStyles}/t.jpg`;

  return ProcessUpload.fromPath(rotationPath, awsMocks.s3).then((results) => {
    t.is(results.sizes.original.width, 720);
    t.is(results.sizes.original.height, 960);

    t.is(results.sizes.thumb.width, 75);
    t.is(results.sizes.thumb.height, 100);
  });
});

test("pre crops before processing an image", (t) => {
  let awsMocks = new AwsMocks();

  awsMocks.getObject(null, {
    Body: TestHelpers.fixture("960x720.jpg"),
    ContentLength: 999,
  });

  awsMocks.putObject(null, {});

  const cropStyles = TestHelpers.signAndEncode({
    cropOriginal: {
      width: 200,
      height: 200,
      x: 10,
      y: 10,
    },
    styles: {
      thumb: "100x100",
    },
    callbackUrl: "http:/lvh.me",
  });

  const cropPath = `uploads/1/2/${cropStyles}/t.jpg`;

  return ProcessUpload.fromPath(cropPath, awsMocks.s3).then((results) => {
    t.is(results.sizes.original.width, 200);
    t.is(results.sizes.original.height, 200);

    t.is(results.sizes.thumb.width, 100);
    t.is(results.sizes.thumb.height, 100);
  });
});

test("fails when s3 returns an error", (t) => {
  let awsMocks = new AwsMocks();

  awsMocks.getObject(new Error("mockS3Error"), {});

  return ProcessUpload.fromPath(validPath, awsMocks.s3).catch((results) => {
    t.regex(results.error.message, /Failed to fetch S3 Object*/);
  });
});

test("fails with an invalid s3 image", (t) => {
  let awsMocks = new AwsMocks();

  awsMocks.getObject(null, { ContentLength: 0 });

  return ProcessUpload.fromPath(validPath, awsMocks.s3).catch((results) => {
    t.is(results.error.message, "Image is empty");
  });
});

test("fails to identify empty image", async (t) => {
  let awsMocks = new AwsMocks();

  awsMocks.getObject(null, {
    Body: TestHelpers.fixture("empty-file.jpg"),
    ContentLength: 999,
  });

  return ProcessUpload.fromPath(validPath, awsMocks.s3).catch((results) => {
    t.is(results.error.message, "Image is empty");
  });
});
