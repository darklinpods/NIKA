#!/usr/bin/env python3
from zipfile import ZipFile
import re
import os
import shutil

template_path = 'server/src/templates/docx/民事起诉状（机动车交通事故责任纠纷）.docx.bak'

# 解压并读取
temp_dir = '/tmp/check_t'
if os.path.exists(temp_dir):
    shutil.rmtree(temp_dir)
os.makedirs(temp_dir)

with ZipFile(template_path, 'r') as zip_ref:
    zip_ref.extractall(temp_dir)

# 读取XML
with open(f'{temp_dir}/word/document.xml', 'r', encoding='utf-8') as f:
    content = f.read()

# 找所有表格
tables = list(re.finditer(r'<w:tbl>.*?</w:tbl>', content, re.DOTALL))
print(f"总共 {len(tables)} 个表格")

for idx, match in enumerate(tables):
    table_text = match.group(0)
    print(f"\n--- 表格 {idx+1} ---")
    print(f"大小: {len(table_text)} 字符")
    print(f"包含'原告': {'原告' in table_text}")
    print(f"包含'被告': {'被告' in table_text}")
    print(f"包含'plaintiffName': {'plaintiffName' in table_text}")
    
    # 打印前500个字符
    print(f"内容预览:\n{table_text[:500]}")

shutil.rmtree(temp_dir)
