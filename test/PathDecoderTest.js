import test from "ava";
import * as Utils from "./helpers/Utils.js";
import PathDecoder from "../src/PathDecoder.js";

let encodedStyles;

test.before(t => {
  encodedStyles = Utils.signAndEncode({
    styles: {
      thumb: "150x150",
      large: "100x700"
    },
    callbackUrl: "http://lvh.me"
  });
});

test("splits an input path into pieces", t => {
  const path = `uploads/1499360605984/999/${encodedStyles}/t.jpeg`;
  const pathDecoder = new PathDecoder(path);

  t.is(pathDecoder.timestamp, "1499360605984");
  t.is(pathDecoder.uniqueId, "999");
  t.is(pathDecoder.fileName, "t.jpeg");
  t.is(pathDecoder.fileExtension, "jpeg");
});

test("creates a valid destination path", t => {
  const path = `uploads/1499360605984/999/${encodedStyles}/t.jpeg`;
  const pathDecoder = new PathDecoder(path);

  const expectedPath = `finished/1499360605984/999/original/t.jpeg`;
  t.is(pathDecoder.finishedPathForStyle("original"), expectedPath);
});

test("accepts a valid rotation angle", t => {
  const rotateConfig = Utils.signAndEncode({
    rotateOriginal: {
      backgroundColor: "blue",
      angle: 90
    },
    callbackUrl: "http://lvh.me"
  });

  const path = `uploads/1/2/${rotateConfig}/t.jpeg`;
  const pathDecoder = new PathDecoder(path);

  t.is(pathDecoder.config.rotateOriginal.angle, 90);
  t.is(pathDecoder.config.rotateOriginal.backgroundColor, "blue");
});

test("accepts a valid crop config", t => {
  const cropConfig = Utils.signAndEncode({
    cropOriginal: {
      width: 201,
      height: 6,
      x: 10,
      y: 12
    },
    callbackUrl: "http://lvh.me"
  });

  const path = `uploads/1/2/${cropConfig}/t.jpeg`;
  const pathDecoder = new PathDecoder(path);

  t.is(pathDecoder.config.cropOriginal.width, 201);
  t.is(pathDecoder.config.cropOriginal.height, 6);
  t.is(pathDecoder.config.cropOriginal.x, 10);
  t.is(pathDecoder.config.cropOriginal.y, 12);
});

test("decodes url escaped characters", t => {
  const path = `uploads/%41/%42/${encodedStyles}/t.jpeg`;
  const pathDecoder = new PathDecoder(path);

  t.is(pathDecoder.timestamp, "A");
  t.is(pathDecoder.uniqueId, "B");
});

test("decodes base64 encoded JSON", t => {
  const path = `uploads/1/2/${encodedStyles}/t.jpeg`;
  const pathDecoder = new PathDecoder(path);

  t.is(pathDecoder.config.styles.thumb, "150x150");
});

test("calculates the max height and width", t => {
  const path = `uploads/1/2/${encodedStyles}/t.jpeg`;
  const pathDecoder = new PathDecoder(path);

  t.is(pathDecoder.maxGeometry, "150x700");
});

test("throw an exception for an invalid path", async t => {
  const error = await t.throws(() => {
    const pathDecoder = new PathDecoder("invalid_path");
  });

  t.is(error.message, "Invalid S3 path");
});

test("throws an exception for an invalid size", async t => {
  const badSize = Utils.signAndEncode({
    styles: {
      thumb: "invalid"
    }
  });

  const path = `uploads/1499360605984/999/${badSize}/t.jpeg`;

  const error = await t.throws(() => {
    const pathDecoder = new PathDecoder(path);
  });

  t.is(error.message, "Invalid geometry in config: (thumb: invalid)");
});

test("throws an exception for an invalid signature", async t => {
  const badSignature = Utils.signAndEncode(
    {
      styles: {
        thumb: "150x150",
        large: "100x700"
      },
      callbackUrl: "http://lvh.me"
    },
    "BAD SIGNATURE!"
  );

  const path = `uploads/1499360605984/999/${badSignature}/t.jpeg`;

  const error = await t.throws(() => {
    const pathDecoder = new PathDecoder(path);
  });

  t.is(error.message, "Invalid signature");
});
