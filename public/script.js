class StyleTransfer {
    constructor() {
        this.originalCanvas = document.getElementById('originalCanvas');
        this.styledCanvas = document.getElementById('styledCanvas');
        this.originalCtx = this.originalCanvas.getContext('2d');
        this.styledCtx = this.styledCanvas.getContext('2d');
        this.currentStyle = 'oil';
        this.intensity = 50;
        this.originalImageData = null;
        this.customStyles = [];
        this.currentArtworkId = null;
        this.userId = 'user_' + Math.random().toString(36).substr(2, 9);
        this.isProcessing = false;
        this.isLiking = false;
        
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.maxImageSize = this.isMobile ? 500 : 800;
        this.maxFileSize = 5 * 1024 * 1024;
        
        this.printSizes = {
            'original': { width: null, height: null },
            '4R': { width: 1205, height: 797 },
            '5R': { width: 1500, height: 1050 },
            'A4': { width: 2480, height: 3508 },
            'A3': { width: 3508, height: 4961 },
            'A2': { width: 4961, height: 7016 }
        };
        
        this.builtinStyles = [
            { id: 'oil', name: '🎨 油画', isCustom: false },
            { id: 'watercolor', name: '💧 水彩', isCustom: false },
            { id: 'sketch', name: '✏️ 素描', isCustom: false },
            { id: 'pop', name: '🌟 波普艺术', isCustom: false },
            { id: 'vintage', name: '📜 复古', isCustom: false },
            { id: 'neon', name: '💡 霓虹', isCustom: false }
        ];
        
        this.init();
    }

    init() {
        this.setupUpload();
        this.setupControls();
        this.setupTabs();
        this.setupModal();
        this.setupStyleUpload();
        this.loadStyles();
        this.loadGallery();
        this.renderStyleGrid();
    }

    setupUpload() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        uploadArea.addEventListener('click', () => fileInput.click());

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                this.handleImage(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                this.handleImage(e.target.files[0]);
            }
        });
    }

    async compressImage(file, maxWidth, maxHeight, quality = 0.8) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height && width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    } else if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob((blob) => {
                        resolve({
                            blob: blob,
                            width: width,
                            height: height,
                            originalWidth: img.width,
                            originalHeight: img.height
                        });
                    }, 'image/jpeg', quality);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    async handleImage(file) {
        if (!file.type.startsWith('image/')) {
            alert('请上传图片文件');
            return;
        }
        
        if (file.size > this.maxFileSize) {
            alert(`图片大小超过限制 (${(this.maxFileSize / 1024 / 1024).toFixed(0)}MB)，正在自动压缩...`);
        }

        try {
            const compressed = await this.compressImage(file, this.maxImageSize, this.maxImageSize, 0.85);
            const img = new Image();
            
            img.onload = () => {
                this.originalCanvas.width = compressed.width;
                this.originalCanvas.height = compressed.height;
                this.styledCanvas.width = compressed.width;
                this.styledCanvas.height = compressed.height;
                this.originalWidth = compressed.originalWidth;
                this.originalHeight = compressed.originalHeight;

                this.originalCtx.drawImage(img, 0, 0, compressed.width, compressed.height);
                
                try {
                    this.originalImageData = this.originalCtx.getImageData(0, 0, compressed.width, compressed.height);
                    this.applyStyle();
                } catch (e) {
                    console.error('获取图像数据失败，可能是内存溢出:', e);
                    alert('图像处理出错，请尝试更小的图片');
                    return;
                }

                document.getElementById('uploadSection').style.display = 'none';
                document.getElementById('editorSection').style.display = 'block';
            };
            
            img.src = URL.createObjectURL(compressed.blob);
        } catch (error) {
            console.error('图片处理失败:', error);
            alert('图片处理失败，请重试');
        }
    }

    setupControls() {
        const intensitySlider = document.getElementById('intensitySlider');
        const intensityValue = document.getElementById('intensityValue');
        
        intensitySlider.addEventListener('input', (e) => {
            this.intensity = parseInt(e.target.value);
            intensityValue.textContent = this.intensity;
            this.applyStyle();
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            document.getElementById('uploadSection').style.display = 'block';
            document.getElementById('editorSection').style.display = 'none';
            document.getElementById('fileInput').value = '';
        });

        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadImage());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveArtwork());
    }

    renderStyleGrid() {
        const styleGrid = document.getElementById('styleGrid');
        const allStyles = [...this.builtinStyles, ...this.customStyles];
        
        styleGrid.innerHTML = allStyles.map(style => `
            <button class="style-btn ${this.currentStyle === style.id ? 'active' : ''}" 
                    data-style="${style.id}">
                ${style.name}
            </button>
        `).join('');

        styleGrid.querySelectorAll('.style-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentStyle = e.target.dataset.style;
                this.applyStyle();
            });
        });
    }

    applyStyle() {
        if (!this.originalImageData || this.isProcessing) return;
        
        this.isProcessing = true;
        
        try {
            const width = this.styledCanvas.width;
            const height = this.styledCanvas.height;
            const intensity = this.intensity / 100;
            
            if (this.isMobile) {
                this.applyStyleMobile(width, height, intensity);
            } else {
                this.applyStyleDesktop(width, height, intensity);
            }
        } catch (e) {
            console.error('风格迁移出错:', e);
            alert('风格处理出错，请重试');
        } finally {
            this.isProcessing = false;
        }
    }

    applyStyleDesktop(width, height, intensity) {
        const imageData = new ImageData(width, height);
        const srcData = this.originalImageData.data;
        const dstData = imageData.data;
        
        const customStyle = this.customStyles.find(s => s.id === this.currentStyle);
        
        if (customStyle) {
            this.applyCustomStyle(srcData, dstData, width, height, intensity, customStyle);
        } else {
            for (let i = 0; i < srcData.length; i += 4) {
                const result = this.applyStyleEffect(
                    srcData[i],
                    srcData[i + 1],
                    srcData[i + 2],
                    intensity
                );
                dstData[i] = result.r;
                dstData[i + 1] = result.g;
                dstData[i + 2] = result.b;
                dstData[i + 3] = srcData[i + 3];
            }
        }

        if (this.currentStyle === 'oil') {
            this.applyOilEffect(imageData, width, height, intensity);
        }

        this.styledCtx.putImageData(imageData, 0, 0);
    }

    applyStyleMobile(width, height, intensity) {
        const blockSize = 100;
        const totalPixels = width * height;
        const srcData = this.originalImageData.data;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        
        const customStyle = this.customStyles.find(s => s.id === this.currentStyle);
        
        for (let blockStart = 0; blockStart < totalPixels; blockStart += blockSize * width) {
            const blockEnd = Math.min(blockStart + blockSize * width, totalPixels);
            
            const blockHeight = Math.ceil((blockEnd - blockStart) / width);
            const imageData = new ImageData(width, blockHeight);
            const dstData = imageData.data;
            
            for (let i = 0, srcIdx = blockStart * 4; i < dstData.length; i += 4, srcIdx += 4) {
                if (srcIdx >= srcData.length) break;
                
                let result;
                if (customStyle) {
                    result = this.applyCustomStylePixel(
                        srcData[srcIdx],
                        srcData[srcIdx + 1],
                        srcData[srcIdx + 2],
                        intensity,
                        customStyle
                    );
                } else {
                    result = this.applyStyleEffect(
                        srcData[srcIdx],
                        srcData[srcIdx + 1],
                        srcData[srcIdx + 2],
                        intensity
                    );
                }
                
                dstData[i] = result.r;
                dstData[i + 1] = result.g;
                dstData[i + 2] = result.b;
                dstData[i + 3] = srcData[srcIdx + 3];
            }
            
            const y = Math.floor(blockStart / width);
            tempCtx.putImageData(imageData, 0, y);
        }
        
        this.styledCtx.drawImage(tempCanvas, 0, 0);
        
        if (this.currentStyle === 'oil' && !this.isMobile) {
            const imageData = this.styledCtx.getImageData(0, 0, width, height);
            this.applyOilEffect(imageData, width, height, intensity);
            this.styledCtx.putImageData(imageData, 0, 0);
        }
    }

    applyCustomStylePixel(r, g, b, intensity, customStyle) {
        const styleColors = customStyle.colorPalette || [
            { r: 100, g: 50, b: 150 },
            { r: 200, g: 100, b: 50 },
            { r: 50, g: 150, b: 200 }
        ];

        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        const colorIndex = Math.floor((gray / 255) * (styleColors.length - 1));
        const styleColor = styleColors[colorIndex];

        return {
            r: Math.min(255, Math.max(0, Math.round(r * (1 - intensity) + styleColor.r * intensity))),
            g: Math.min(255, Math.max(0, Math.round(g * (1 - intensity) + styleColor.g * intensity))),
            b: Math.min(255, Math.max(0, Math.round(b * (1 - intensity) + styleColor.b * intensity)))
        };
    }

    applyCustomStyle(srcData, dstData, width, height, intensity, customStyle) {
        const styleColors = customStyle.colorPalette || [
            { r: 100, g: 50, b: 150 },
            { r: 200, g: 100, b: 50 },
            { r: 50, g: 150, b: 200 }
        ];

        for (let i = 0; i < srcData.length; i += 4) {
            let r = srcData[i];
            let g = srcData[i + 1];
            let b = srcData[i + 2];

            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            const colorIndex = Math.floor((gray / 255) * (styleColors.length - 1));
            const styleColor = styleColors[colorIndex];

            r = Math.round(r * (1 - intensity) + styleColor.r * intensity);
            g = Math.round(g * (1 - intensity) + styleColor.g * intensity);
            b = Math.round(b * (1 - intensity) + styleColor.b * intensity);

            dstData[i] = Math.min(255, Math.max(0, r));
            dstData[i + 1] = Math.min(255, Math.max(0, g));
            dstData[i + 2] = Math.min(255, Math.max(0, b));
            dstData[i + 3] = srcData[i + 3];
        }
    }

    applyStyleEffect(r, g, b, intensity) {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;

        switch (this.currentStyle) {
            case 'oil':
                return this.oilPainting(r, g, b, intensity, gray);
            case 'watercolor':
                return this.watercolor(r, g, b, intensity, gray);
            case 'sketch':
                return this.sketch(r, g, b, intensity, gray);
            case 'pop':
                return this.popArt(r, g, b, intensity, gray);
            case 'vintage':
                return this.vintage(r, g, b, intensity, gray);
            case 'neon':
                return this.neon(r, g, b, intensity, gray);
            default:
                return { r, g, b };
        }
    }

    oilPainting(r, g, b, intensity, gray) {
        const noise = (Math.random() - 0.5) * 30 * intensity;
        r = Math.min(255, Math.max(0, r + noise));
        g = Math.min(255, Math.max(0, g + noise));
        b = Math.min(255, Math.max(0, b + noise));
        
        const saturation = 1 + 0.3 * intensity;
        const newR = gray + (r - gray) * saturation;
        const newG = gray + (g - gray) * saturation;
        const newB = gray + (b - gray) * saturation;
        
        return {
            r: Math.round(newR),
            g: Math.round(newG),
            b: Math.round(newB)
        };
    }

    watercolor(r, g, b, intensity, gray) {
        return {
            r: Math.round(r * (1 - intensity * 0.3) + 30 * intensity),
            g: Math.round(g * (1 - intensity * 0.2) + 70 * intensity),
            b: Math.round(b + 100 * intensity)
        };
    }

    sketch(r, g, b, intensity, gray) {
        const contrast = gray < 50 ? 0 : gray > 200 ? 255 : gray;
        
        return {
            r: Math.round(gray * (1 - intensity) + contrast * intensity),
            g: Math.round(gray * (1 - intensity) + contrast * intensity),
            b: Math.round(gray * (1 - intensity) + contrast * intensity)
        };
    }

    popArt(r, g, b, intensity, gray) {
        const levels = 4;
        const levelSize = 256 / levels;
        
        r = Math.floor(r / levelSize) * levelSize + levelSize / 2;
        g = Math.floor(g / levelSize) * levelSize + levelSize / 2;
        b = Math.floor(b / levelSize) * levelSize + levelSize / 2;
        
        r = Math.min(255, r + 50 * intensity);
        b = Math.min(255, b + 30 * intensity);
        
        return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
    }

    vintage(r, g, b, intensity, gray) {
        const sepiaR = r * 0.393 + g * 0.769 + b * 0.189;
        const sepiaG = r * 0.349 + g * 0.686 + b * 0.168;
        const sepiaB = r * 0.272 + g * 0.534 + b * 0.131;
        
        return {
            r: Math.round(r * (1 - intensity) + sepiaR * intensity),
            g: Math.round(g * (1 - intensity) + sepiaG * intensity),
            b: Math.round(b * (1 - intensity) + sepiaB * intensity)
        };
    }

    neon(r, g, b, intensity, gray) {
        const factor = 1.5;
        const boostR = Math.min(255, r * factor);
        const boostG = Math.min(255, g * factor);
        const boostB = Math.min(255, b * factor);
        
        const glow = Math.sin(Date.now() / 500) * 20 * intensity;
        
        return {
            r: Math.round(Math.min(255, boostR + glow)),
            g: Math.round(Math.min(255, boostG - glow)),
            b: Math.round(Math.min(255, boostB + glow * 0.5))
        };
    }

    applyOilEffect(imageData, width, height, intensity) {
        const data = imageData.data;
        const tempData = new Uint8ClampedArray(data);
        const kernelSize = Math.floor(3 * intensity) + 1;
        
        for (let y = kernelSize; y < height - kernelSize; y++) {
            for (let x = kernelSize; x < width - kernelSize; x++) {
                const idx = (y * width + x) * 4;
                let sumR = 0, sumG = 0, sumB = 0, count = 0;
                
                for (let ky = -kernelSize; ky <= kernelSize; ky++) {
                    for (let kx = -kernelSize; kx <= kernelSize; kx++) {
                        const kidx = ((y + ky) * width + (x + kx)) * 4;
                        sumR += tempData[kidx];
                        sumG += tempData[kidx + 1];
                        sumB += tempData[kidx + 2];
                        count++;
                    }
                }
                
                data[idx] = sumR / count;
                data[idx + 1] = sumG / count;
                data[idx + 2] = sumB / count;
            }
        }
    }

    async downloadImage() {
        const printSize = document.getElementById('printSize').value;
        const quality = parseFloat(document.getElementById('imageQuality').value);
        
        let width = this.styledCanvas.width;
        let height = this.styledCanvas.height;
        
        if (printSize !== 'original') {
            const size = this.printSizes[printSize];
            if (width > height) {
                width = size.width;
                height = size.height;
            } else {
                width = size.height;
                height = size.width;
            }
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const ctx = tempCanvas.getContext('2d');
        
        ctx.drawImage(this.styledCanvas, 0, 0, width, height);

        let mimeType = quality === 1 ? 'image/png' : 'image/jpeg';
        let extension = quality === 1 ? 'png' : 'jpg';
        
        const dataUrl = tempCanvas.toDataURL(mimeType, quality);
        const link = document.createElement('a');
        link.download = `artwork-${Date.now()}.${extension}`;
        link.href = dataUrl;
        link.click();
    }

    canvasToBase64(canvas, quality = 0.85) {
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            }, 'image/jpeg', quality);
        });
    }

    async saveArtwork() {
        let styleName;
        const customStyle = this.customStyles.find(s => s.id === this.currentStyle);
        if (customStyle) {
            styleName = customStyle.name;
        } else {
            const builtin = this.builtinStyles.find(s => s.id === this.currentStyle);
            styleName = builtin ? builtin.name : this.currentStyle;
        }

        try {
            const imageData = await this.canvasToBase64(this.styledCanvas, 0.85);
            
            const response = await fetch('/api/save-artwork', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageData: imageData,
                    styleName: styleName,
                    intensity: this.intensity
                })
            });

            const result = await response.json();
            if (result.success) {
                alert('作品已保存到画廊！');
                this.loadGallery();
            }
        } catch (error) {
            console.error('保存失败:', error);
            alert('保存失败，请重试');
        }
    }

    setupStyleUpload() {
        const uploadBtn = document.getElementById('uploadStyleBtn');
        const fileInput = document.getElementById('styleFileInput');
        
        uploadBtn.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                this.uploadStyle(e.target.files[0]);
            }
        });
    }

    async uploadStyle(file) {
        const formData = new FormData();
        formData.append('style', file);
        formData.append('styleName', prompt('请输入风格名称：', '我的自定义风格') || '自定义风格');

        try {
            const response = await fetch('/api/upload-style', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (result.success) {
                result.style.colorPalette = this.extractColorPalette(file);
                this.customStyles.push(result.style);
                this.renderStyleGrid();
                this.renderStyleLibrary();
                alert('风格上传成功！');
            }
        } catch (error) {
            console.error('上传失败:', error);
            alert('上传失败，请重试');
        }
    }

    extractColorPalette(file) {
        return [
            { r: Math.floor(Math.random() * 100) + 100, g: Math.floor(Math.random() * 100) + 50, b: Math.floor(Math.random() * 100) + 100 },
            { r: Math.floor(Math.random() * 100) + 150, g: Math.floor(Math.random() * 100) + 50, b: Math.floor(Math.random() * 50) },
            { r: Math.floor(Math.random() * 50), g: Math.floor(Math.random() * 100) + 100, b: Math.floor(Math.random() * 100) + 100 }
        ];
    }

    async loadStyles() {
        try {
            const response = await fetch('/api/styles');
            const result = await response.json();
            this.customStyles = result.styles.map(s => ({
                ...s,
                colorPalette: this.extractColorPalette(null)
            }));
            this.renderStyleGrid();
            this.renderStyleLibrary();
        } catch (error) {
            console.error('加载风格失败:', error);
        }
    }

    renderStyleLibrary() {
        const libraryGrid = document.getElementById('styleLibraryGrid');
        
        if (this.customStyles.length === 0) {
            libraryGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎨</div>
                    <p>还没有自定义风格，上传一张风格图片开始吧！</p>
                </div>
            `;
            return;
        }

        libraryGrid.innerHTML = this.customStyles.map(style => `
            <div class="style-card" data-id="${style.id}">
                <img src="${style.path}" alt="${style.name}">
                <div class="style-card-info">
                    <h4>${style.name}</h4>
                    <p>${new Date(style.createdAt).toLocaleDateString('zh-CN')}</p>
                </div>
                <div class="style-card-actions">
                    <button class="delete-btn" data-id="${style.id}">删除</button>
                </div>
            </div>
        `).join('');

        libraryGrid.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteStyle(e.target.dataset.id);
            });
        });
    }

    async deleteStyle(id) {
        if (!confirm('确定要删除这个风格吗？')) return;

        try {
            await fetch(`/api/styles/${id}`, { method: 'DELETE' });
            this.customStyles = this.customStyles.filter(s => s.id != id);
            if (this.currentStyle === id) {
                this.currentStyle = 'oil';
            }
            this.renderStyleGrid();
            this.renderStyleLibrary();
        } catch (error) {
            console.error('删除失败:', error);
            alert('删除失败，请重试');
        }
    }

    setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                
                e.target.classList.add('active');
                document.getElementById(e.target.dataset.tab).classList.add('active');
                
                if (e.target.dataset.tab === 'gallery') {
                    this.loadGallery();
                } else if (e.target.dataset.tab === 'community') {
                    this.loadCommunity();
                } else if (e.target.dataset.tab === 'styles') {
                    this.loadStyles();
                }
            });
        });
    }

    async loadGallery() {
        try {
            const response = await fetch('/api/gallery');
            const result = await response.json();
            const galleryGrid = document.getElementById('galleryGrid');
            
            if (result.gallery.length === 0) {
                galleryGrid.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🖼️</div>
                        <p>画廊为空，快去创作你的第一幅作品吧！</p>
                    </div>
                `;
                return;
            }

            galleryGrid.innerHTML = result.gallery.map(artwork => `
                <div class="artwork-card" data-id="${artwork.id}">
                    <img src="${artwork.path}" alt="${artwork.styleName}">
                    <div class="artwork-info">
                        <h4>${artwork.styleName}</h4>
                        <p>强度: ${artwork.intensity}%</p>
                        <p style="font-size: 0.85em; color: #adb5bd;">${new Date(artwork.createdAt).toLocaleString('zh-CN')}</p>
                    </div>
                    <div class="artwork-stats">
                        <span>❤️ ${artwork.likes || 0}</span>
                        <span>💬 ${(artwork.comments || []).length}</span>
                    </div>
                    <div class="artwork-actions">
                        <button class="delete-btn" data-id="${artwork.id}">删除</button>
                    </div>
                </div>
            `).join('');

            galleryGrid.querySelectorAll('.artwork-card img').forEach(img => {
                img.addEventListener('click', (e) => {
                    const card = e.target.closest('.artwork-card');
                    this.openModal(card.dataset.id);
                });
            });

            galleryGrid.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteArtwork(e.target.dataset.id);
                });
            });
        } catch (error) {
            console.error('加载画廊失败:', error);
        }
    }

    async loadCommunity() {
        try {
            const response = await fetch('/api/gallery');
            const result = await response.json();
            const communityGrid = document.getElementById('communityGrid');
            
            const publicArtworks = result.gallery.filter(a => a.isPublic !== false);
            
            if (publicArtworks.length === 0) {
                communityGrid.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🌍</div>
                        <p>社区还没有作品，成为第一个分享者吧！</p>
                    </div>
                `;
                return;
            }

            communityGrid.innerHTML = publicArtworks.map(artwork => `
                <div class="artwork-card" data-id="${artwork.id}">
                    <img src="${artwork.path}" alt="${artwork.styleName}">
                    <div class="artwork-info">
                        <h4>${artwork.styleName}</h4>
                        <p>强度: ${artwork.intensity}%</p>
                    </div>
                    <div class="artwork-stats">
                        <span>❤️ ${artwork.likes || 0}</span>
                        <span>💬 ${(artwork.comments || []).length}</span>
                    </div>
                </div>
            `).join('');

            communityGrid.querySelectorAll('.artwork-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    this.openModal(card.dataset.id);
                });
            });
        } catch (error) {
            console.error('加载社区失败:', error);
        }
    }

    async deleteArtwork(id) {
        if (!confirm('确定要删除这幅作品吗？')) return;

        try {
            await fetch(`/api/gallery/${id}`, { method: 'DELETE' });
            this.loadGallery();
        } catch (error) {
            console.error('删除失败:', error);
            alert('删除失败，请重试');
        }
    }

    setupModal() {
        const modal = document.getElementById('modal');
        const closeBtn = document.querySelector('.close');

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        document.getElementById('likeBtn').addEventListener('click', () => {
            this.toggleLike();
        });

        document.getElementById('addCommentBtn').addEventListener('click', () => {
            this.addComment();
        });

        document.getElementById('refreshGallery').addEventListener('click', () => {
            this.loadGallery();
        });

        document.getElementById('refreshCommunity').addEventListener('click', () => {
            this.loadCommunity();
        });
    }

    async openModal(id) {
        this.currentArtworkId = id;
        try {
            const response = await fetch('/api/gallery');
            const result = await response.json();
            const artwork = result.gallery.find(a => a.id == id);
            
            if (artwork) {
                document.getElementById('modalImage').src = artwork.path;
                document.getElementById('modalStyle').textContent = `风格: ${artwork.styleName}`;
                document.getElementById('modalDate').textContent = `创建时间: ${new Date(artwork.createdAt).toLocaleString('zh-CN')}`;
                document.getElementById('likeCount').textContent = artwork.likes || 0;
                
                this.renderComments(artwork.comments || []);
                document.getElementById('modal').style.display = 'block';
            }
        } catch (error) {
            console.error('加载作品详情失败:', error);
        }
    }

    renderComments(comments) {
        const commentsList = document.getElementById('commentsList');
        
        if (comments.length === 0) {
            commentsList.innerHTML = '<p style="color: #adb5bd; text-align: center;">暂无评论</p>';
            return;
        }

        commentsList.innerHTML = comments.map(comment => `
            <div class="comment-item">
                <div class="comment-header">
                    <span class="comment-author">${comment.author}</span>
                    <span class="comment-date">${new Date(comment.createdAt).toLocaleString('zh-CN')}</span>
                </div>
                <div class="comment-content">${comment.content}</div>
            </div>
        `).join('');
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    async toggleLike() {
        if (!this.currentArtworkId || this.isLiking) return;
        
        this.isLiking = true;
        const likeBtn = document.getElementById('likeBtn');
        likeBtn.disabled = true;
        likeBtn.style.opacity = '0.5';

        try {
            const response = await fetch(`/api/gallery/${this.currentArtworkId}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: this.userId })
            });

            const result = await response.json();
            if (result.success) {
                document.getElementById('likeCount').textContent = result.likes;
                this.loadGallery();
                this.loadCommunity();
            }
        } catch (error) {
            console.error('点赞失败:', error);
        } finally {
            setTimeout(() => {
                this.isLiking = false;
                likeBtn.disabled = false;
                likeBtn.style.opacity = '1';
            }, 500);
        }
    }

    async addComment() {
        if (!this.currentArtworkId) return;

        const author = document.getElementById('commentAuthor').value.trim() || '匿名用户';
        const content = document.getElementById('commentContent').value.trim();
        
        if (!content) {
            alert('请输入评论内容');
            return;
        }

        try {
            const response = await fetch(`/api/gallery/${this.currentArtworkId}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ author, content })
            });

            const result = await response.json();
            if (result.success) {
                document.getElementById('commentContent').value = '';
                this.openModal(this.currentArtworkId);
                this.loadGallery();
                this.loadCommunity();
            }
        } catch (error) {
            console.error('评论失败:', error);
            alert('评论失败，请重试');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new StyleTransfer();
});
