// A wrapper for graphicsmagick to allow AWS lambda to use the packaged standalone gm.
function GmLoader(module) {
  if (process.env["LAMBDA_TASK_ROOT"] && !process.env["LAMBDA_TESTING"]) {
    return module.require("gm").subClass({
      appPath: process.env["LAMBDA_TASK_ROOT"] + "/graphicsmagick/bin/"
    });
  } else {
    return module.require("gm");
  }
}

export default GmLoader;
