#!/usr/bin/env python3
from zipfile import ZipFile
import shutil
import os

# 模板文件路径
template_path = 'server/src/templates/docx/民事起诉状（机动车交通事故责任纠纷）.docx'

print("✅ 开始编辑Word模板...")

# 备份原文件
shutil.copy(template_path, template_path + '.bak')
print("✅ 已备份原文件到 .bak")

# 创建临时目录
temp_dir = '/tmp/docx_work'
if os.path.exists(temp_dir):
    shutil.rmtree(temp_dir)
os.makedirs(temp_dir)

# 解压docx文件
with ZipFile(template_path, 'r') as zip_ref:
    zip_ref.extractall(temp_dir)
print("✅ 已解压docx")

# 读取document.xml内容
doc_xml_path = f'{temp_dir}/word/document.xml'
with open(doc_xml_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 使用字符串替换方式添加占位符
import re

# 找到所有表格
tables = list(re.finditer(r'<w:tbl>.*?</w:tbl>', content, re.DOTALL))
print(f"找到 {len(tables)} 个表格")

new_content = content
table_count = 0

for match in tables:
    table_text = match.group(0)
    
    # 检查是否包含"原告"（不需要同时包含性别）
    if '原告' in table_text and len(table_text) < 50000:  # 第一个表格通常较小
        print(f"✅ 找到原告信息表")
        table_count += 1
        
        # 在表格最后一行（最后的</w:tr>）之后，在</w:tbl>之前插入新行
        last_tr_pos = table_text.rfind('</w:tr>')
        
        if last_tr_pos != -1:
            insert_pos = last_tr_pos + len('</w:tr>')
            
            # 新行XML
            new_row = '''
            <w:tr>
                <w:tc>
                    <w:p>
                        <w:r>
                            <w:t>{@_PLAINTIFF_ROWS_}</w:t>
                        </w:r>
                    </w:p>
                </w:tc>
            </w:tr>'''
            
            new_table = table_text[:insert_pos] + new_row + table_text[insert_pos:]
            new_content = new_content.replace(table_text, new_table)
            print("✅ 已在表格中添加占位符行")
            break

if table_count > 0:
    # 保存修改
    with open(doc_xml_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("✅ 已保存XML修改")
    
    # 重新打包docx
    os.remove(template_path)
    with ZipFile(template_path, 'w') as zipf:
        for root, dirs, files in os.walk(temp_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, temp_dir)
                zipf.write(file_path, arcname)
    
    print(f"✅ 已重新打包docx: {template_path}")
    
    # 清理
    shutil.rmtree(temp_dir)
    print("✅ 完成！模板已成功更新")
else:
    print("❌ 未找到原告信息表，操作已中止")
    shutil.rmtree(temp_dir)
    exit(1)
