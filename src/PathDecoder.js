import _ from "underscore";
import crypto from "crypto";

class PathDecoder {
  /**
   * Decodes S3 paths with encoded config data.
   *
   * @param path AWS S3 path of an uploaded image
   *
   */
  constructor(path) {
    this._path = decodeURIComponent(path);

    this._splitPath();
    this._decodeBase64();
    this._verifySignature();
    this._validateConfig();
    this._calculateMaxGeometry();
  }

  finishedPathForStyle(style) {
    return `${this.finishedPathPrefix()}/${style}/${this._fileName}`;
  }

  finishedPathPrefix() {
    return `finished/${this._timestamp}/${this._uniqueId}`;
  }

  _splitPath() {
    const pathPieces = this._path.split("/");

    if (pathPieces.length !== 5) {
      throw new Error("Invalid S3 path");
    }

    this._timestamp = pathPieces[1];
    this._uniqueId = pathPieces[2];
    this._base64Payload = pathPieces[3];
    this._fileName = pathPieces[4];
    this._fileExtension = this._fileName.split(".")[1];
  }

  _decodeBase64() {
    let jsonString;

    try {
      jsonString = new Buffer(this._base64Payload, "base64").toString();
    } catch (err) {
      throw new Error("Failed to base64 element of S3 path");
    }

    try {
      this._config = JSON.parse(jsonString);
    } catch (err) {
      throw new Error("Failed parse base64 encoded JSON");
    }
  }

  _verifySignature() {
    const configSignature = this._config.signature;

    const configWithoutSignature = this._config;
    delete configWithoutSignature.signature;

    const json = JSON.stringify(configWithoutSignature);

    const hmac = crypto.createHmac("sha256", process.env.SECRET);
    const computedSignature = hmac.update(json).digest("hex");

    if (configSignature !== computedSignature) {
      throw new Error("Invalid signature");
    }
  }

  _validateConfig() {
    const config = this._config;

    if (_.has(config, "styles")) {
      _.each(_.keys(config.styles), name => {
        let geometry = config.styles[name];

        if (!PathDecoder.validImageMagickGeometry(geometry)) {
          throw new Error(`Invalid geometry in config: (${name}: ${geometry})`);
        }
      });
    }

    if (_.has(config, "rotateOriginal")) {
      if (!_.isNumber(config.rotateOriginal.angle)) {
        throw new Error(
          `Invalid rotation angle in config: ${config.rotateOriginal.angle}`
        );
      }
    }

    if (_.has(config, "cropOriginal")) {
      if (
        !PathDecoder.validCropConfig(
          config.cropOriginal.width,
          config.cropOriginal.height,
          config.cropOriginal.x,
          config.cropOriginal.y
        )
      ) {
        throw new Error(`Invalid crop dimensions.`);
      }
    }

    if (!_.has(config, "callbackUrl")) {
      throw new Error(`Missing callbackUrl.`);
    }
  }

  _calculateMaxGeometry() {
    if (
      _.has(this._config, "styles") &&
      _.keys(this._config.styles).length > 0
    ) {
      let maxWidth = 0;
      let maxHeight = 0;

      _.each(_.values(this._config.styles), geometry => {
        const dimensions = geometry.split("x");
        const width = parseInt(dimensions[0]);
        const height = parseInt(dimensions[1]);

        if (width > maxWidth) {
          maxWidth = width;
        }

        if (height > maxHeight) {
          maxHeight = height;
        }
      });

      this._maxGeometry = `${maxWidth}x${maxHeight}`;
    }
  }

  static validCropConfig(width, height, x, y) {
    return width >= 0 && height >= 0 && x >= 0 && y >= 0;
  }

  static validImageMagickGeometry(geometry) {
    return /\d+x\d*[\>\<\#\@\%^!]?/.test(geometry);
  }

  get path() {
    return this._path;
  }
  get timestamp() {
    return this._timestamp;
  }
  get uniqueId() {
    return this._uniqueId;
  }
  get fileName() {
    return this._fileName;
  }
  get fileExtension() {
    return this._fileExtension;
  }
  get config() {
    return this._config;
  }
  get maxGeometry() {
    return this._maxGeometry;
  }
}

export default PathDecoder;
