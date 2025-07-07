const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
});

function getSignedUrl(fileKey) {
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: fileKey,
    Expires: 60 * 60, // 1 hour
  };

  return s3.getSignedUrl("getObject", params);
}

module.exports = getSignedUrl;
