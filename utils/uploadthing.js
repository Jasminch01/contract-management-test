// utils/uploadthing.js
const { createUploadthing, type FileRouter } = require("uploadthing/express");

const f = createUploadthing();

exports.fileRouter = {
  contractUploader: f({
    pdf: { maxFileSize: "4MB" },
  }).onUploadComplete(async ({ metadata, file }) => {
    console.log("Contract file uploaded", file.url);
  }),

  sellerUploader: f({
    pdf: { maxFileSize: "4MB" },
  }).onUploadComplete(async ({ metadata, file }) => {
    console.log("Seller file uploaded", file.url);
  }),
};
