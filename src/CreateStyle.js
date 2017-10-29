import GmLoader from "./GmLoader";
const gm = GmLoader(module);

/**
 * Creates a single style (resized thumbnail) and saves the result to s3.
 */
class CreateStyle {
  static from(options) {
    return CreateStyle.resize(options)
      .then(CreateStyle.size)
      .then(CreateStyle.save);
  }

  static resize(chain) {
    return new Promise((resolve, reject) => {
      gm(chain.image)
        .geometry(chain.geometry)
        .quality(85)
        .interlace("Line")
        .toBuffer(chain.fileExtension, (error, image) => {
          if (error) {
            reject(
              new Error(
                `Failed to resize style ${chain.style}: ${error.message}`
              )
            );
          } else {
            resolve(Object.assign(chain, { resizedImage: image }));
          }
        });
    });
  }

  static size(chain) {
    return new Promise((resolve, reject) => {
      gm(chain.resizedImage).size(function(err, size) {
        if (err) {
          reject(
            new Error(`Failed get size info for ${chain.style}: ${err.message}`)
          );
        } else {
          resolve(Object.assign(chain, { size: size }));
        }
      });
    });
  }

  static save(chain) {
    return new Promise((resolve, reject) => {
      const params = {
        Bucket: process.env.BUCKET,
        Key: chain.destPath,
        Body: chain.resizedImage
      };

      chain.s3.putObject(params, (err, data) => {
        if (err) {
          reject(new Error(`Failed save style ${chain.style}: ${err.message}`));
        } else {
          resolve(chain);
        }
      });
    });
  }
}

export default CreateStyle;
