const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('🎨 艺术风格迁移画廊 - 后端API测试套件');
console.log('='.repeat(60));
console.log('');

const results = {
    total: 0,
    passed: 0,
    failed: 0
};

function test(name, fn) {
    results.total++;
    try {
        fn();
        console.log(`✅ ${name}`);
        results.passed++;
    } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   错误: ${error.message}`);
        results.failed++;
    }
}

function assertTrue(value, message) {
    if (!value) {
        throw new Error(message || `期望值为真，实际为 ${value}`);
    }
}

function assertFalse(value, message) {
    if (value) {
        throw new Error(message || `期望值为假，实际为 ${value}`);
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `期望 ${expected}，实际 ${actual}`);
    }
}

function assertApproxEqual(actual, expected, tolerance, message) {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(message || `期望接近 ${expected}，实际 ${actual}，容差 ${tolerance}`);
    }
}

function assertInRange(value, min, max, message) {
    if (value < min || value > max) {
        throw new Error(message || `期望在 [${min}, ${max}] 范围内，实际 ${value}`);
    }
}

function assertType(value, type, message) {
    if (typeof value !== type) {
        throw new Error(message || `期望类型为 ${type}，实际为 ${typeof value}`);
    }
}

function assertArray(arr, message) {
    if (!Array.isArray(arr)) {
        throw new Error(message || '期望为数组');
    }
}

console.log('📁 1. 文件系统和数据存储测试');
console.log('-'.repeat(60));

test('画廊JSON文件存在或可创建', () => {
    const galleryFile = 'gallery.json';
    if (!fs.existsSync(galleryFile)) {
        fs.writeFileSync(galleryFile, '[]');
    }
    assertTrue(fs.existsSync(galleryFile));
});

test('画廊文件包含有效JSON数组', () => {
    const galleryFile = 'gallery.json';
    const data = JSON.parse(fs.readFileSync(galleryFile, 'utf8'));
    assertArray(data);
});

test('可以写入和读取画廊数据', () => {
    const testFile = 'test_gallery.json';
    const testData = [{
        id: 1234567890,
        filename: 'test.png',
        styleName: '测试风格',
        likes: 5,
        comments: [{ author: '测试用户', content: '测试评论' }]
    }];
    
    fs.writeFileSync(testFile, JSON.stringify(testData));
    const readData = JSON.parse(fs.readFileSync(testFile, 'utf8'));
    
    assertEqual(readData.length, 1);
    assertEqual(readData[0].id, 1234567890);
    assertEqual(readData[0].styleName, '测试风格');
    
    fs.unlinkSync(testFile);
});

test('上传目录存在或可创建', () => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
    }
    assertTrue(fs.existsSync(uploadDir));
    assertTrue(fs.statSync(uploadDir).isDirectory());
});

console.log('');
console.log('🎨 2. 图像处理算法测试');
console.log('-'.repeat(60));

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Math.round(value)));
}

function applyVintageEffect(r, g, b, intensity) {
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const sepiaR = r * 0.393 + g * 0.769 + b * 0.189;
    const sepiaG = r * 0.349 + g * 0.686 + b * 0.168;
    const sepiaB = r * 0.272 + g * 0.534 + b * 0.131;
    
    return {
        r: clamp(r * (1 - intensity) + sepiaR * intensity, 0, 255),
        g: clamp(g * (1 - intensity) + sepiaG * intensity, 0, 255),
        b: clamp(b * (1 - intensity) + sepiaB * intensity, 0, 255)
    };
}

function applyOilEffect(r, g, b, intensity) {
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const saturation = 1 + 0.3 * intensity;
    
    return {
        r: clamp(gray + (r - gray) * saturation, 0, 255),
        g: clamp(gray + (g - gray) * saturation, 0, 255),
        b: clamp(gray + (b - gray) * saturation, 0, 255)
    };
}

test('复古滤镜 - 强度0输出等于输入', () => {
    const result = applyVintageEffect(100, 150, 200, 0);
    assertEqual(result.r, 100);
    assertEqual(result.g, 150);
    assertEqual(result.b, 200);
});

test('复古滤镜 - 强度1产生棕褐色调', () => {
    const result = applyVintageEffect(100, 150, 200, 1);
    assertTrue(result.r > result.g, '红色通道应该最大');
    assertTrue(result.g > result.b, '绿色通道应大于蓝色');
});

test('油画滤镜 - 增加饱和度', () => {
    const original = { r: 100, g: 100, b: 100 };
    const result = applyOilEffect(original.r, original.g, original.b, 1);
    
    const originalRange = Math.max(...Object.values(original)) - Math.min(...Object.values(original));
    const resultRange = Math.max(...Object.values(result)) - Math.min(...Object.values(result));
    
    assertTrue(resultRange >= originalRange, '饱和度应增加');
});

test('所有滤镜输出在有效RGB范围', () => {
    const testCases = [
        { r: 0, g: 0, b: 0 },
        { r: 255, g: 255, b: 255 },
        { r: 128, g: 128, b: 128 },
        { r: 255, g: 0, b: 0 },
        { r: 0, g: 255, b: 0 },
        { r: 0, g: 0, b: 255 },
    ];
    
    for (const color of testCases) {
        const vintage = applyVintageEffect(color.r, color.g, color.b, 0.5);
        const oil = applyOilEffect(color.r, color.g, color.b, 0.5);
        
        assertInRange(vintage.r, 0, 255, '复古滤镜R值超出范围');
        assertInRange(vintage.g, 0, 255, '复古滤镜G值超出范围');
        assertInRange(vintage.b, 0, 255, '复古滤镜B值超出范围');
        
        assertInRange(oil.r, 0, 255, '油画滤镜R值超出范围');
        assertInRange(oil.g, 0, 255, '油画滤镜G值超出范围');
        assertInRange(oil.b, 0, 255, '油画滤镜B值超出范围');
    }
});

test('滤镜输出为整数', () => {
    const result = applyVintageEffect(123, 145, 167, 0.5);
    assertTrue(Number.isInteger(result.r), 'R值应为整数');
    assertTrue(Number.isInteger(result.g), 'G值应为整数');
    assertTrue(Number.isInteger(result.b), 'B值应为整数');
});

console.log('');
console.log('📐 3. 图像尺寸适配测试');
console.log('-'.repeat(60));

function calculateResizeDimensions(width, height, maxSize) {
    if (width > height && width > maxSize) {
        height = (height * maxSize) / width;
        width = maxSize;
    } else if (height > maxSize) {
        width = (width * maxSize) / height;
        height = maxSize;
    }
    return { width, height };
}

test('大尺寸图片正确缩放 - 横版', () => {
    const result = calculateResizeDimensions(1920, 1080, 800);
    assertEqual(result.width, 800);
    assertApproxEqual(result.height, 450, 1);
});

test('大尺寸图片正确缩放 - 竖版', () => {
    const result = calculateResizeDimensions(1080, 1920, 800);
    assertEqual(result.height, 800);
    assertApproxEqual(result.width, 450, 1);
});

test('小尺寸图片不缩放', () => {
    const result = calculateResizeDimensions(400, 300, 800);
    assertEqual(result.width, 400);
    assertEqual(result.height, 300);
});

test('正方形图片等比缩放', () => {
    const result = calculateResizeDimensions(1000, 1000, 500);
    assertEqual(result.width, 500);
    assertEqual(result.height, 500);
});

test('保持宽高比', () => {
    const testCases = [
        { w: 16, h: 9, max: 800 },
        { w: 4, h: 3, max: 800 },
        { w: 3, h: 4, max: 800 },
        { w: 1, h: 1, max: 800 },
    ];
    
    for (const tc of testCases) {
        const originalRatio = tc.w / tc.h;
        const result = calculateResizeDimensions(tc.w * 100, tc.h * 100, tc.max);
        const resultRatio = result.width / result.height;
        assertApproxEqual(resultRatio, originalRatio, 0.01, `宽高比不匹配: ${tc.w}:${tc.h}`);
    }
});

test('边界情况 - 极小尺寸', () => {
    const result = calculateResizeDimensions(1, 1, 800);
    assertEqual(result.width, 1);
    assertEqual(result.height, 1);
});

test('边界情况 - 等于maxSize', () => {
    const result = calculateResizeDimensions(800, 600, 800);
    assertEqual(result.width, 800);
    assertEqual(result.height, 600);
});

console.log('');
console.log('⚡ 4. 参数边界验证测试');
console.log('-'.repeat(60));

function sanitizeIntensity(intensity) {
    if (typeof intensity !== 'number' || isNaN(intensity)) {
        return 0.5;
    }
    return Math.max(0, Math.min(1, intensity));
}

test('强度参数边界 - 正常值范围', () => {
    assertEqual(sanitizeIntensity(0), 0);
    assertEqual(sanitizeIntensity(0.5), 0.5);
    assertEqual(sanitizeIntensity(1), 1);
});

test('强度参数边界 - 负值处理', () => {
    assertEqual(sanitizeIntensity(-0.1), 0);
    assertEqual(sanitizeIntensity(-100), 0);
});

test('强度参数边界 - 超出最大值处理', () => {
    assertEqual(sanitizeIntensity(1.1), 1);
    assertEqual(sanitizeIntensity(100), 1);
});

test('强度参数边界 - 非法类型处理', () => {
    assertEqual(sanitizeIntensity(null), 0.5);
    assertEqual(sanitizeIntensity(undefined), 0.5);
    assertEqual(sanitizeIntensity('0.5'), 0.5);
    assertEqual(sanitizeIntensity({}), 0.5);
});

test('强度参数边界 - NaN处理', () => {
    assertEqual(sanitizeIntensity(NaN), 0.5);
});

console.log('');
console.log('❤️ 5. 点赞和评论功能测试');
console.log('-'.repeat(60));

function likeArtwork(artwork, userId) {
    if (!artwork.likedBy) {
        artwork.likedBy = [];
        artwork.likes = 0;
    }
    
    const index = artwork.likedBy.indexOf(userId);
    if (index === -1) {
        artwork.likedBy.push(userId);
        artwork.likes++;
        return { liked: true, likes: artwork.likes };
    } else {
        artwork.likedBy.splice(index, 1);
        artwork.likes--;
        return { liked: false, likes: artwork.likes };
    }
}

function addComment(artwork, author, content) {
    if (!content || typeof content !== 'string' || content.trim() === '') {
        throw new Error('评论内容不能为空');
    }
    
    if (!artwork.comments) {
        artwork.comments = [];
    }
    
    const comment = {
        id: Date.now(),
        author: author || '匿名用户',
        content: content.trim(),
        createdAt: new Date().toISOString()
    };
    
    artwork.comments.push(comment);
    return comment;
}

test('点赞功能 - 首次点赞', () => {
    const artwork = { id: 1, likes: 0, likedBy: [] };
    const result = likeArtwork(artwork, 'user1');
    
    assertTrue(result.liked);
    assertEqual(result.likes, 1);
    assertEqual(artwork.likedBy.length, 1);
    assertTrue(artwork.likedBy.includes('user1'));
});

test('点赞功能 - 取消点赞', () => {
    const artwork = { id: 1, likes: 1, likedBy: ['user1'] };
    const result = likeArtwork(artwork, 'user1');
    
    assertFalse(result.liked);
    assertEqual(result.likes, 0);
    assertFalse(artwork.likedBy.includes('user1'));
});

test('点赞功能 - 多用户独立点赞', () => {
    const artwork = { id: 1, likes: 0, likedBy: [] };
    
    likeArtwork(artwork, 'user1');
    likeArtwork(artwork, 'user2');
    likeArtwork(artwork, 'user3');
    
    assertEqual(artwork.likes, 3);
    assertEqual(artwork.likedBy.length, 3);
});

test('点赞功能 - 懒初始化字段', () => {
    const artwork = { id: 1 };
    const result = likeArtwork(artwork, 'user1');
    
    assertTrue(result.liked);
    assertEqual(result.likes, 1);
    assertArray(artwork.likedBy);
});

test('评论功能 - 添加有效评论', () => {
    const artwork = { id: 1, comments: [] };
    const comment = addComment(artwork, '测试用户', '这是一条测试评论');
    
    assertEqual(artwork.comments.length, 1);
    assertEqual(comment.author, '测试用户');
    assertEqual(comment.content, '这是一条测试评论');
    assertTrue(comment.id > 0);
    assertTrue(comment.createdAt.length > 0);
});

test('评论功能 - 匿名用户评论', () => {
    const artwork = { id: 1, comments: [] };
    const comment = addComment(artwork, '', '匿名评论');
    
    assertEqual(comment.author, '匿名用户');
});

test('评论功能 - 空内容拒绝', () => {
    const artwork = { id: 1, comments: [] };
    
    assert.throws(() => {
        addComment(artwork, '用户', '');
    }, Error, '评论内容不能为空');
    
    assert.throws(() => {
        addComment(artwork, '用户', '   ');
    }, Error, '评论内容不能为空');
});

test('评论功能 - null内容拒绝', () => {
    const artwork = { id: 1, comments: [] };
    
    assert.throws(() => {
        addComment(artwork, '用户', null);
    }, Error, '评论内容不能为空');
});

console.log('');
console.log('🔄 6. 错误处理和降级测试');
console.log('-'.repeat(60));

class StyleModelSimulator {
    constructor(shouldFail = false) {
        this.shouldFail = shouldFail;
        this.isLoaded = false;
    }
    
    async load() {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (this.shouldFail) {
                    reject(new Error('Network error: failed to load model'));
                } else {
                    this.isLoaded = true;
                    resolve();
                }
            }, 10);
        });
    }
    
    process(imageData) {
        if (!this.isLoaded) {
            throw new Error('Model not loaded');
        }
        return imageData;
    }
}

async function runAsyncTests() {
    console.log('🔄 开始异步测试...');
    
    // 模型加载 - 成功加载
    results.total++;
    try {
        const model = new StyleModelSimulator(false);
        await model.load();
        assertTrue(model.isLoaded);
        console.log(`✅ 模型加载 - 成功加载`);
        results.passed++;
    } catch (error) {
        console.log(`❌ 模型加载 - 成功加载`);
        console.log(`   错误: ${error.message}`);
        results.failed++;
    }
    
    // 模型加载 - 失败抛出错误
    results.total++;
    try {
        const model = new StyleModelSimulator(true);
        try {
            await model.load();
            throw new Error('应该抛出错误');
        } catch (error) {
            assertTrue(error.message.includes('Network error'));
        }
        console.log(`✅ 模型加载 - 失败抛出错误`);
        results.passed++;
    } catch (error) {
        console.log(`❌ 模型加载 - 失败抛出错误`);
        console.log(`   错误: ${error.message}`);
        results.failed++;
    }
}

test('降级处理 - 模型未加载时使用Canvas处理', () => {
    const model = new StyleModelSimulator(false);
    let processed = false;
    let usedFallback = false;
    
    try {
        const result = model.process({ test: true });
        processed = true;
    } catch (error) {
        usedFallback = true;
        const result = applyVintageEffect(100, 100, 100, 0.5);
        processed = result !== null;
    }
    
    assertTrue(usedFallback, '应该使用降级处理');
    assertTrue(processed, '降级处理应该完成');
});

test('降级处理 - 所有边界情况都能处理', () => {
    const edgeCases = [
        { r: 0, g: 0, b: 0 },
        { r: 255, g: 255, b: 255 },
        { r: -10, g: 300, b: 128 },
    ];
    
    for (const color of edgeCases) {
        const result = applyVintageEffect(color.r, color.g, color.b, 0.5);
        assertInRange(result.r, 0, 255);
        assertInRange(result.g, 0, 255);
        assertInRange(result.b, 0, 255);
    }
});

console.log('');
console.log('📊 7. 性能测试');
console.log('-'.repeat(60));

test('图像处理性能 - 1000次处理在合理时间内', () => {
    const iterations = 1000;
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
        applyVintageEffect(
            Math.floor(Math.random() * 256),
            Math.floor(Math.random() * 256),
            Math.floor(Math.random() * 256),
            Math.random()
        );
    }
    
    const duration = Date.now() - startTime;
    console.log(`   耗时: ${duration}ms (${iterations}次)`);
    assertTrue(duration < 1000, `性能不达标: ${duration}ms > 1000ms`);
});

test('点赞操作性能', () => {
    const iterations = 10000;
    const artwork = { id: 1, likes: 0, likedBy: [] };
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
        likeArtwork(artwork, `user${i % 100}`);
    }
    
    const duration = Date.now() - startTime;
    console.log(`   耗时: ${duration}ms (${iterations}次)`);
    assertTrue(duration < 500, `性能不达标: ${duration}ms > 500ms`);
});

async function runAllTests() {
    await runAsyncTests();
    
    console.log('');
    console.log('='.repeat(60));
    console.log('📋 测试结果汇总');
    console.log('='.repeat(60));
    console.log(`总测试数: ${results.total}`);
    console.log(`✅ 通过: ${results.passed}`);
    console.log(`❌ 失败: ${results.failed}`);
    console.log(`📈 通过率: ${((results.passed / results.total) * 100).toFixed(1)}%`);
    console.log('');

    if (results.failed === 0) {
        console.log('🎉 所有测试通过！');
    } else {
        console.log(`⚠️ 有 ${results.failed} 个测试失败需要修复`);
        process.exit(1);
    }
}

runAllTests();
