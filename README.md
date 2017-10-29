# image-butler 

Process images using AWS Lambda instead of on the back-end. Creates thumbnails, crops and rotates within an AWS S3 bucket.

### Installation

```
git clone git@github.com:justintanner/image-butler.git

yarn 
```

### Configuration

Modify the file `.env` or set the following environment variables:

```
IMAGE_BUTLER_BUCKET=my_s3_bucket
```

### Protocol

** TODO: Add a description of the URL protocol **

### Special Thanks

Inspired by [aws-lambda-image][1]

[1]: https://github.com/ysugimoto/aws-lambda-image 

