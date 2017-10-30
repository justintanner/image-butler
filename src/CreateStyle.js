import GmLoader from "./GmLoader";
const gm = GmLoader(module);

class CreateStyle {
  /**
   * Creates a single style (resized thumbnail) and saves the result to s3.
   *
   * @param options Options for resizing and saving image
   * @param options.image Original image data
   * @param options.style Name of Image style
   * @param options.geometry String representing the geometry of the image (eg 300x400)
   * @param options.destPath Destination path on s3 to save the image
   * @param options.fileExtension File extension of the image (used to determine what type of image to save)
   * @param options.s3 Already initialized s3 instance

   * @return A promise that resolves when the image has been saved to s3
   */
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
