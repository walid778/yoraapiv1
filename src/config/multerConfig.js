const path = require('path');
const fs = require('fs');
const multer = require('multer');

// المجلد الأساسي للتخزين
const baseUploadPath = path.join(__dirname, '../../../apidata/uploads');

// دالة لتوليد المسار حسب نوع الملف
const getUploadPath = (type) => {
  const folderMap = {
    media: ['POSTS', 'Media'],
    postImage: ['POSTS', 'Images'],
    postVideo: ['POSTS', 'Videos'],
    avatar: ['USERS', 'Profile'],
    cover: ['USERS', 'Cover'],
    others: ['Others'],
  };

  const folders = folderMap[type] || folderMap['others'];
  const fullPath = path.join(baseUploadPath, ...folders);

  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }

  return fullPath;
};

// storage ديناميكي حسب نوع الملف
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // نقدر نحدد نوع الملف في body.type أو في fieldname
    let type = req.body.type || file.fieldname;
    cb(null, getUploadPath(type));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}_${Date.now()}${ext}`);
  }
});

// ملف واحد للتصدير
const upload = multer({ storage });

module.exports = { upload, getUploadPath };
