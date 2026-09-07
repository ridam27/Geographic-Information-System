const mongoose = require("mongoose");

function uploadKmlToGridFS(fileName, kmlString) {
  return new Promise((resolve, reject) => {

    const db = mongoose.connection.db;

    const bucket = new mongoose.mongo.GridFSBucket(db, {
      bucketName: "kmlFiles"
    });

    const buffer = Buffer.from(kmlString, "utf8");

    const uploadStream = bucket.openUploadStream(fileName, {
      contentType: "application/vnd.google-earth.kml+xml"
    });

    uploadStream.end(buffer);

    uploadStream.on("finish", () => resolve(uploadStream.id));
    uploadStream.on("error", reject);

  });
}

module.exports = { uploadKmlToGridFS };