# image-butler 

Process images using AWS Lambda freeing your server from running slow, memory intensive image manipulation commands.  

Creates thumbnails, crops and rotates all within an S3 bucket.

### Installation

```
git clone git@github.com:justintanner/image-butler.git

yarn 
```

### Configuration

Modify the file `.env` or set the following environment variables:

```
IB_REGION=us-west-1
IB_BUCKET=my_s3_bucket
```

### Protocol

** TODO: Add a description of the URL protocol **

### Special Thanks

Inspired by [aws-lambda-image][1]

[1]: https://github.com/ysugimoto/aws-lambda-image 

