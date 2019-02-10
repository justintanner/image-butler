# image-butler [![Build Status](https://travis-ci.org/justintanner/image-butler.svg?branch=master)](https://travis-ci.org/justintanner/image-butler) [![Coverage Status](https://coveralls.io/repos/github/justintanner/image-butler/badge.svg?branch=master)](https://coveralls.io/github/justintanner/image-butler?branch=master)

Resize, crop and rotate images using AWS Lambda and S3.

![example image](https://i.imgur.com/P0gMceT.jpg)

### How it works
 
 1) User uploads an image directly to S3 with encoded configuration data
 2) `image-butler` resizes multiple thumbnails, crops or rotates the image
 3) `image-butler` posts back to your server with the newly processed image(s) 
 
### Requirements

* Node 6.10.2 (same version as AWS Lambda)
* Amazon Web Services

### Installation

```
git clone git@github.com:justintanner/image-butler.git
yarn 
```

### Configuration

Generate the config file with the command
```
npm run config 
```

Create an S3 bucket to temporarily store user uploads.

Edit the newly created `.env` file adding the region and name of your new s3 bucket, for example: 

```
IB_REGION=us-west-1
IB_BUCKET=my-temporary-upload-bucket
```

### Deploying to AWS Lambda

Once the settings in `.env` match your environment

```
npm run create
```

### Uploading with the Client ###

*Coming Soon*

### Protocol

*Coming Soon*

### Special Thanks

Inspired by [aws-lambda-image][1]

[1]: https://github.com/ysugimoto/aws-lambda-image 

