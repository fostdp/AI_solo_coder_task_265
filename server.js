const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use('/styles', express.static('styles'));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const styleStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const styleDir = 'styles';
    if (!fs.existsSync(styleDir)) {
      fs.mkdirSync(styleDir);
    }
    cb(null, styleDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = 'style-' + Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Images Only!');
    }
  }
});

const styleUpload = multer({ 
  storage: styleStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Images Only!');
    }
  }
});

const galleryFile = 'gallery.json';
const stylesFile = 'styles.json';

const readGallery = () => {
  if (!fs.existsSync(galleryFile)) {
    return [];
  }
  try {
    const data = fs.readFileSync(galleryFile, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};

const writeGallery = (data) => {
  fs.writeFileSync(galleryFile, JSON.stringify(data, null, 2));
};

const readStyles = () => {
  if (!fs.existsSync(stylesFile)) {
    return [];
  }
  try {
    const data = fs.readFileSync(stylesFile, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};

const writeStyles = (data) => {
  fs.writeFileSync(stylesFile, JSON.stringify(data, null, 2));
};

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ 
    success: true, 
    filename: req.file.filename,
    path: `/uploads/${req.file.filename}`
  });
});

app.post('/api/upload-style', styleUpload.single('style'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No style file uploaded' });
    }
    
    const { styleName } = req.body;
    const styles = readStyles();
    const style = {
      id: Date.now(),
      name: styleName || `自定义风格 ${styles.length + 1}`,
      filename: req.file.filename,
      path: `/styles/${req.file.filename}`,
      isCustom: true,
      createdAt: new Date().toISOString()
    };
    styles.push(style);
    writeStyles(styles);
    
    res.json({ success: true, style });
  } catch (error) {
    console.error('Style upload error:', error);
    res.status(500).json({ error: 'Failed to upload style' });
  }
});

app.get('/api/styles', (req, res) => {
  const styles = readStyles();
  res.json({ styles });
});

app.delete('/api/styles/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    let styles = readStyles();
    const style = styles.find(s => s.id === id);
    
    if (style) {
      const filePath = path.join(__dirname, 'styles', style.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      styles = styles.filter(s => s.id !== id);
      writeStyles(styles);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete style' });
  }
});

app.post('/api/save-artwork', (req, res) => {
  try {
    const { imageData, styleName, intensity, isPublic = true } = req.body;
    if (!imageData) {
      return res.status(400).json({ error: 'No image data' });
    }

    const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
    const filename = 'artwork-' + Date.now() + '.png';
    const filePath = path.join('uploads', filename);
    
    if (!fs.existsSync('uploads')) {
      fs.mkdirSync('uploads');
    }
    
    fs.writeFileSync(filePath, base64Data, 'base64');

    const gallery = readGallery();
    const artwork = {
      id: Date.now(),
      filename: filename,
      path: `/uploads/${filename}`,
      styleName: styleName || 'Unknown',
      intensity: intensity || 50,
      isPublic: isPublic,
      likes: 0,
      likedBy: [],
      comments: [],
      createdAt: new Date().toISOString()
    };
    gallery.unshift(artwork);
    writeGallery(gallery);

    res.json({ success: true, artwork });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: 'Failed to save artwork' });
  }
});

app.post('/api/gallery/:id/like', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { userId = 'anonymous' } = req.body;
    const gallery = readGallery();
    const artwork = gallery.find(a => a.id === id);
    
    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }
    
    if (!artwork.likedBy) {
      artwork.likedBy = [];
      artwork.likes = 0;
    }
    
    const userIndex = artwork.likedBy.indexOf(userId);
    if (userIndex === -1) {
      artwork.likedBy.push(userId);
      artwork.likes++;
    } else {
      artwork.likedBy.splice(userIndex, 1);
      artwork.likes--;
    }
    
    writeGallery(gallery);
    res.json({ success: true, likes: artwork.likes, isLiked: userIndex === -1 });
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ error: 'Failed to like artwork' });
  }
});

app.post('/api/gallery/:id/comment', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { author, content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    
    const gallery = readGallery();
    const artwork = gallery.find(a => a.id === id);
    
    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }
    
    if (!artwork.comments) {
      artwork.comments = [];
    }
    
    const comment = {
      id: Date.now(),
      author: author || '匿名用户',
      content: content,
      createdAt: new Date().toISOString()
    };
    
    artwork.comments.push(comment);
    writeGallery(gallery);
    res.json({ success: true, comment });
  } catch (error) {
    console.error('Comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

app.delete('/api/gallery/:id/comment/:commentId', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const commentId = parseInt(req.params.commentId);
    
    const gallery = readGallery();
    const artwork = gallery.find(a => a.id === id);
    
    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }
    
    artwork.comments = artwork.comments.filter(c => c.id !== commentId);
    writeGallery(gallery);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

app.get('/api/gallery', (req, res) => {
  const gallery = readGallery();
  res.json({ gallery });
});

app.delete('/api/gallery/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    let gallery = readGallery();
    const artwork = gallery.find(a => a.id === id);
    
    if (artwork) {
      const filePath = path.join(__dirname, 'uploads', artwork.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      gallery = gallery.filter(a => a.id !== id);
      writeGallery(gallery);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete artwork' });
  }
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
