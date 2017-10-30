import crypto from "crypto";
import fs from "fs";
import appRoot from "app-root-path";

const secureHex = crypto.randomBytes(64).toString("hex");

// Securely create a .env file with default values and a randomly generated hex string
fs.readFile(appRoot + "/.env.template", "UTF-8", (error, data) => {
  if (error) {
    console.log(`ERROR: Could not find .env.template. ${error.message}`);
  } else {
    const config = data.replace(/<<<.*>>>/, secureHex);
    fs.writeFile(appRoot + "/.env", config, error => {
      if (error) {
        console.log(`ERROR: Could not write to file .env ${error.message}`);
      } else {
        console.log(`Successfully created config file ".env"`);
      }
    });
  }
});
