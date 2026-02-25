const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

async function readDocx() {
    const filePath = path.join(__dirname, '../../samples_docs/民事起诉状-付永中.docx');
    console.log(`Reading: ${filePath}`);
    try {
        const result = await mammoth.extractRawText({ path: filePath });
        console.log("\n--- 内容预览 (前500字) ---");
        console.log(result.value.substring(0, 500));
        console.log("---------------------------\n");
        console.log("可以成功读取 docx 内容！");
    } catch (e) {
        console.error("读取失败:", e);
    }
}

readDocx();
