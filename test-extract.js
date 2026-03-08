const fs = require('fs');
const path = require('path');

// 读取文件
const filePath = path.resolve(__dirname, 'samples_docs/民事起诉状-交通事故.txt');
const fileContent = fs.readFileSync(filePath, 'utf-8');

console.log('📄 正在解析民事起诉状文件...\n');
console.log('='.repeat(80));
console.log('输入文件内容（前200字）:');
console.log(fileContent.substring(0, 200) + '...\n');
console.log('='.repeat(80));

// 构建请求体 - 正确转义 JSON
const requestBody = {
  text: fileContent,
  templateId: 'traffic'
};

const data = JSON.stringify(requestBody);

console.log('\n📤 发送请求到 localhost:3001/api/complaints/extract');
console.log('请求体大小:', Buffer.byteLength(data), 'bytes\n');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/complaints/extract',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const http = require('http');

const req = http.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('\n📤 API 响应状态码:', res.statusCode);
    console.log('='.repeat(80));
    
    if (!responseData) {
      console.log('❌ 服务器返回了空响应');
      process.exit(1);
    }
    
    try {
      const parsed = JSON.parse(responseData);
      
      if (parsed.success && parsed.data) {
        console.log('\n✅ 解析成功！\n');
        console.log('🔍 提取到的案卷要素:\n');
        
        const data = parsed.data;
        
        // 分类展示结果
        console.log('【原告信息】');
        console.log('  姓名:', data.plaintiffName || '(未提取)');
        console.log('  性别:', data.plaintiffGender || '(未提取)');
        console.log('  出生日期:', data.plaintiffBirth || '(未提取)');
        console.log('  身份证号:', data.plaintiffId || '(未提取)');
        console.log('  住所地:', data.plaintiffAddress || '(未提取)');
        
        console.log('\n【被告信息】');
        console.log('  姓名:', data.defendantName || '(未提取)');
        console.log('  性别:', data.defendantGender || '(未提取)');
        console.log('  身份证号:', data.defendantId || '(未提取)');
        console.log('  住所地:', data.defendantAddress || '(未提取)');
        
        if (data.defendant2Name) {
          console.log('\n【第二被告（单位）信息】');
          console.log('  单位名称:', data.defendant2Name);
          console.log('  住所地:', data.defendant2Address || '(未提取)');
          console.log('  统一社会信用代码:', data.defendant2Id || '(未提取)');
          console.log('  法定代表人:', data.defendant2Rep || '(未提取)');
        }
        
        console.log('\n【交通事故信息】');
        console.log('  事故事实摘要:', (data.accidentFacts || '(未提取)').substring(0, 100) + '...');
        console.log('  责任认定:', (data.liabilityDetermination || '(未提取)').substring(0, 100) + '...');
        console.log('  保险状态:', (data.insuranceStatus || '(未提取)').substring(0, 100) + '...');
        
        console.log('\n【索赔清单】');
        console.log(data.claimsList || '(未提取)');
        
        console.log('\n【其他情况】');
        console.log((data.otherFacts || '(未提取)').substring(0, 200) + '...');
        
        // 完整结果写入文件
        const outputPath = path.resolve(__dirname, 'extract-result.json');
        fs.writeFileSync(outputPath, JSON.stringify(parsed.data, null, 2), 'utf-8');
        console.log('\n\n✓ 完整结果已保存到: extract-result.json');
        console.log('\n' + '='.repeat(80));
      } else {
        console.log('\n❌ 解析失败！');
        console.log('错误信息:', parsed.error);
        console.log('详情:', parsed.details);
      }
    } catch (e) {
      console.log('\n❌ 响应解析失败！');
      console.log('错误:', e.message);
      console.log('原始响应（前500字）:', responseData.substring(0, 500));
    }
  });
});

req.on('error', (error) => {
  console.error('❌ 请求失败:', error.message);
  process.exit(1);
});

// 发送请求
req.write(data);
req.end();
