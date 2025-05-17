const multer = require('multer');
const path = require('path');

// configure storage.
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },

    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage }).fields([
  { name: 'attachedSellerContract', maxCount: 1 },
  { name: 'attachedBuyerContract',  maxCount: 1 }
]);

module.exports = upload;