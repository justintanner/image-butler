import _ from "underscore";
import request from "request";
import aws from "aws-sdk";
import ProcessUpload from "./ProcessUpload";

/**
 * Wraps ProcessUpload.js and passes back both error and completion data to a callback url.
 */
class ProcessUploadAndCallback {
  static fromPath(s3Path, s3 = null) {
    if (s3 === undefined || s3 === null) {
      s3 = new aws.S3({ apiVersion: "2006-03-01" });
    }

    return ProcessUploadAndCallback.process({ s3: s3, s3Path: s3Path }).then(
      ProcessUploadAndCallback.callback
    );
  }

  static process(chain) {
    return new Promise((resolve, reject) => {
      ProcessUpload.fromPath(chain.s3Path, chain.s3)
        .then((results) => {
          resolve(results);
        })
        .catch((results) => {
          resolve(results);
        });
    });
  }

  static callback(chain) {
    return new Promise((resolve, reject) => {
      const json = { originalKey: chain.s3Path };

      if (_.has(chain, "pathDecoder")) {
        _.extend(json, {
          uniqueId: chain.pathDecoder.uniqueId,
          finishedPathPrefix: chain.pathDecoder.finishedPathPrefix(),
          fileName: chain.pathDecoder.fileName,
        });

        _.each(_.keys(chain.pathDecoder.config.callbackData), (key) => {
          json[key] = chain.pathDecoder.config.callbackData[key];
        });
      } else {
        // Something went wrong during the decoding of the path, which means we have no callbackUrl.
        reject(chain.error);
      }

      if (_.has(chain, "fileSize")) {
        _.extend(json, { fileSize: chain.fileSize });
      }

      if (_.has(chain, "contentType")) {
        _.extend(json, { contentType: chain.contentType });
      }

      if (_.has(chain, "sizes")) {
        _.extend(json, { sizes: chain.sizes });
      }

      if (_.has(chain, "error")) {
        _.extend(json, {
          errorMessage: chain.error.message,
        });
      }

      const postData = {
        url: chain.pathDecoder.config.callbackUrl,
        json: json,
      };

      request.post(postData, (error, response, body) => {
        if (error || !response) {
          reject(
            _.extend(chain, new Error(`Callback failed. ${error.message}`))
          );
        } else {
          console.log(`Callback to ${postData.url} was successful.`);

          if (_.has(chain, "error")) {
            reject(chain.error);
          } else {
            resolve(chain);
          }
        }
      });
    });
  }
}

export default ProcessUploadAndCallback;
