import test from "ava";
import * as TestHelpers from "./helpers/TestHelpers.js";
import aws from "aws-sdk";
import AwsMocks from "./helpers/AwsMocks.js";
import CreateStyle from "../src/CreateStyle.js";

// Loads ENV vars from .env for testing only. On AWS Lambda ENV vars are set by claudia.js
import dotenv from "dotenv";
dotenv.config({ path: TestHelpers.fixturePath(".env.lambda-tester") });

let s3, awsMocks;

test.beforeEach(t => {
  s3 = new aws.S3({ apiVersion: "2006-03-01" });
  awsMocks = new AwsMocks(s3);
});

test("successfully creates a style from a jpg", t => {
  // ignore calls to AWS
  awsMocks.putObject(null, {});

  const image = TestHelpers.fixture("960x720.jpg");

  return CreateStyle.from({
    image: image,
    size: "thumb",
    geometry: "100x100",
    maxGeometry: "1000x1000",
    destPath: "fake/s3/path/t.jpg",
    fileExtension: "jpeg",
    s3: s3
  }).then(result => {
    t.is(result.size.height, 75);
    t.is(result.size.width, 100);
  });
});

test("successfully creates a style from a png", t => {
  // ignore calls to AWS
  awsMocks.putObject(null, {});

  const image = TestHelpers.fixture("legends_of_animals.png");

  return CreateStyle.from({
    image: image,
    size: "thumb",
    geometry: "200x200",
    destPath: "fake/s3/path/t.png",
    fileExtension: "png",
    s3: s3
  }).then(result => {
    t.is(result.size.height, 200);
    t.is(result.size.width, 150);
  });
});

test("successfully creates a style from a gif", t => {
  // ignore calls to AWS
  awsMocks.putObject(null, {});

  const image = TestHelpers.fixture("tugnet.gif");

  return CreateStyle.from({
    image: image,
    size: "thumb",
    geometry: "300x300",
    destPath: "fake/s3/path/t.gif",
    fileExtension: "gif",
    s3: s3
  }).then(result => {
    t.is(result.size.height, 191);
    t.is(result.size.width, 300);
  });
});
