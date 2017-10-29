import _ from "underscore";
import ProcessUploadAndCallback from "./ProcessUploadAndCallback";

// Entry point for AWS Lambda.
exports.handler = (event, context, callback) => {
  if (_.has(event, "Records") && event.Records.length > 0) {
    const s3Path = event.Records[0].s3.object.key;

    ProcessUploadAndCallback.fromPath(s3Path, event.testingOnlyS3)
      .then(results => {
        console.log(results.finalMessage);
        context.succeed(results.finalMessage);
      })
      .catch(error => {
        console.log(error);
        callback(error);
      });
  } else {
    callback(new Error(`Invalid AWS Lambda Event`));
  }
};
