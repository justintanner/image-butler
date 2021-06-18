import test from "ava";
import * as TestHelpers from "./helpers/TestHelpers.js";
import AwsMocks from "./helpers/AwsMocks.js";
import CreateStyle from "../src/CreateStyle.js";

// Loads ENV lets from .env for testing only. On AWS Lambda ENV lets are set by claudia.js
import dotenv from "dotenv";
dotenv.config({ path: TestHelpers.fixturePath(".env.lambda-tester") });

test("successfully creates a style from a jpg", (t) => {
  let awsMocks = new AwsMocks();
  awsMocks.putObject(null, {});

  return CreateStyle.from({
    image: TestHelpers.fixture("960x720.jpg"),
    style: "thumb",
    geometry: "100x100",
    maxGeometry: "1000x1000",
    destPath: "fake/s3/path/t.jpg",
    fileExtension: "jpeg",
    s3: awsMocks.s3,
  }).then((result) => {
    t.is(result.size.height, 75);
    t.is(result.size.width, 100);
  });
});

test("successfully creates a style from a png", (t) => {
  let awsMocks = new AwsMocks();
  awsMocks.putObject(null, {});

  return CreateStyle.from({
    image: TestHelpers.fixture("legends_of_animals.png"),
    style: "thumb",
    geometry: "200x200",
    destPath: "fake/s3/path/t.png",
    fileExtension: "png",
    s3: awsMocks.s3,
  }).then((result) => {
    t.is(result.size.height, 200);
    t.is(result.size.width, 150);
  });
});

test("successfully creates a style from a gif", (t) => {
  let awsMocks = new AwsMocks();
  awsMocks.putObject(null, {});

  return CreateStyle.from({
    image: TestHelpers.fixture("tugnet.gif"),
    style: "thumb",
    geometry: "300x300",
    destPath: "fake/s3/path/t.gif",
    fileExtension: "gif",
    s3: awsMocks.s3,
  }).then((result) => {
    t.is(result.size.height, 191);
    t.is(result.size.width, 300);
  });
});

test("fails when given invalid image data", (t) => {
  let awsMocks = new AwsMocks();
  awsMocks.putObject(null, {});

  return CreateStyle.from({
    image: TestHelpers.fixture("empty-file.jpg"),
    style: "thumb",
    geometry: "300x300",
    destPath: "fake/s3/path/t.gif",
    fileExtension: "gif",
    s3: awsMocks.s3,
  }).catch((error) => {
    t.is(
      error.message,
      "Failed to resize style thumb: Stream yields empty buffer"
    );
  });
});

test("fails to save to s3", (t) => {
  let awsMocks = new AwsMocks();
  awsMocks.putObject(new Error("Mocking an error"), {});

  return CreateStyle.from({
    image: TestHelpers.fixture("960x720.jpg"),
    style: "thumb",
    geometry: "300x300",
    destPath: "fake/s3/path/t.gif",
    fileExtension: "gif",
    s3: awsMocks.s3,
  }).catch((error) => {
    t.is(error.message, "Failed save style thumb: Mocking an error");
  });
});
