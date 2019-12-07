import _ from "underscore";

import GmLoader from "./GmLoader";
const gm = GmLoader(module);

import PathDecoder from "./PathDecoder";
import CreateStyle from "./CreateStyle";

class ProcessUpload {
  /**
   * Processes an image uploaded to S3.
   *
   * @param s3Path AWS S3 of an uploaded image
   * @param s3 Already initialized s3 object
   * @return A promise that resolves when the image has been fully processed
   *
   */
  static fromPath(s3Path, s3) {
    return ProcessUpload.decodePath({ s3: s3, s3Path: s3Path })
      .then(ProcessUpload.fetchOriginal)
      .then(ProcessUpload.rotateAndCropOriginal)
      .then(ProcessUpload.sizeOriginal)
      .then(ProcessUpload.copyOriginal)
      .then(ProcessUpload.createMiff)
      .then(ProcessUpload.createStyles)
      .then(ProcessUpload.createFinalMessage);
  }

  static decodePath(chain) {
    return new Promise((resolve, reject) => {
      console.log(`Processing S3 Path: ${chain.s3Path}`);

      try {
        const pathDecoder = new PathDecoder(chain.s3Path);

        resolve(_.extend(chain, { pathDecoder: pathDecoder }));
      } catch (error) {
        reject(ProcessUpload.errorWithChain(chain, error));
      }
    });
  }

  static fetchOriginal(chain) {
    return new Promise((resolve, reject) => {
      const params = {
        Bucket: process.env.IB_BUCKET,
        Key: chain.pathDecoder.path
      };

      chain.s3.getObject(params, (error, data) => {
        if (error) {
          reject(
            ProcessUpload.errorWithChain(
              chain,
              `Failed to fetch S3 Object. bucket: ${params.Bucket}, key: ${params.Key}, message: ${error.message}`
            )
          );
        } else if (data.ContentLength <= 0 || data.Body.length <= 0) {
          reject(ProcessUpload.errorWithChain(chain, "Image is empty"));
        } else {
          resolve(
            _.extend(chain, {
              image: data.Body,
              fileSize: data.ContentLength,
              contentType: data.ContentType
            })
          );
        }
      });
    });
  }

  static rotateAndCropOriginal(chain) {
    return new Promise((resolve, reject) => {
      let config = chain.pathDecoder.config;

      /* .autoOrient tells gm to transpose the pixels of an exif rotated jpeg */
      let image = gm(chain.image).autoOrient();

      if (_.has(config, "rotateOriginal")) {
        console.log("Rotating original image.");
        const backgroundColor =
          config.rotateOriginal.backgroundColor || "white";
        image = image.rotate(backgroundColor, config.rotateOriginal.angle);
      }

      if (_.has(config, "cropOriginal")) {
        console.log("Cropping original image.");
        image = image.crop(
          config.cropOriginal.width,
          config.cropOriginal.height,
          config.cropOriginal.x,
          config.cropOriginal.y
        );
      }

      image.toBuffer((error, buffer) => {
        if (error) {
          reject(
            ProcessUpload.errorWithChain(
              chain,
              `Failed to rotate/crop original: ${error.message}`
            )
          );
        } else {
          chain.image = buffer;

          resolve(chain);
        }
      });
    });
  }

  static sizeOriginal(chain) {
    return new Promise((resolve, reject) => {
      gm(chain.image).size((error, size) => {
        if (error) {
          reject(
            ProcessUpload.errorWithChain(
              chain,
              `Failed to size original: ${error.message}`
            )
          );
        } else {
          chain.sizes = { original: size };

          resolve(chain);
        }
      });
    });
  }

  static copyOriginal(chain) {
    return new Promise((resolve, reject) => {
      const params = {
        Bucket: process.env.IB_BUCKET,
        Key: chain.pathDecoder.finishedPathForStyle("original"),
        Body: chain.image
      };

      chain.s3.putObject(params, (awsError, data) => {
        if (awsError) {
          reject(
            ProcessUpload.errorWithChain(
              chain,
              `Failed to backup original: ${awsError.message}`
            )
          );
        } else {
          resolve(chain);
        }
      });
    });
  }

  // By pre-processing an image into im's internal format (miff) memory usage is reduced in the subsequent calls to im.
  static createMiff(chain) {
    return new Promise((resolve, reject) => {
      if (_.has(chain.pathDecoder.config, "styles")) {
        gm(chain.image)
          .autoOrient()
          .noProfile()
          .geometry(chain.pathDecoder.maxGeometry)
          .toBuffer("miff", function(error, miffImage) {
            if (error) {
              reject(new Error(`Failed to create miff: ${error.message}`));
            } else {
              resolve(Object.assign(chain, { image: miffImage }));
            }
          });
      } else {
        console.log("Warning: No styles detected.");
        resolve(chain);
      }
    });
  }

  static createStyles(chain) {
    return new Promise((resolve, reject) => {
      if (_.has(chain.pathDecoder.config, "styles")) {
        const styles = chain.pathDecoder.config.styles;

        const stylePromises = _.keys(styles).map(style => {
          const geometry = styles[style];
          return CreateStyle.from({
            image: chain.image,
            style: style,
            geometry: geometry,
            destPath: chain.pathDecoder.finishedPathForStyle(style),
            fileExtension: chain.pathDecoder.fileExtension,
            s3: chain.s3
          });
        });

        Promise.all(stylePromises)
          .then(results => {
            _.each(results, result => {
              chain.sizes[result.style] = result.size;
            });

            chain.styleCount = stylePromises.length;
            resolve(chain);
          })
          .catch(error => {
            reject(ProcessUpload.errorWithChain(chain, error));
          });
      } else {
        resolve(chain);
      }
    });
  }

  static createFinalMessage(chain) {
    return new Promise((resolve, reject) => {
      // Removing these objects from the chain because ava error messages are hard to read otherwise.
      delete chain.image;
      delete chain.s3;

      chain.finalMessage = `Successfully processed image. Created ${chain.styleCount} styles.`;
      resolve(chain);
    });
  }

  static errorWithChain(chain, error) {
    if (_.isString(error)) {
      return _.extend(chain, { error: new Error(error) });
    } else {
      return _.extend(chain, { error: error });
    }
  }
}

export default ProcessUpload;
