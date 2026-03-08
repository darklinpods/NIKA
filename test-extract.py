#!/usr/bin/env python3
import json
import requests
import sys

# 读取文件内容
with open('samples_docs/民事起诉状-交通事故.txt', 'r', encoding='utf-8') as f:
    text_content = f.read()

print('📄 读取民事起诉状文件完成')
print('=' * 80)
print(f'文件大小: {len(text_content)} 字符')
print(f'前200字: {text_content[:200]}...\n')

# 发送 API 请求
print('📤 正在调用 API 进行提取...')
print('=' * 80)

try:
    response = requests.post(
        'http://localhost:3001/api/complaints/extract',
        json={
            'text': text_content,
            'templateId': 'traffic'
        },
        timeout=60
    )
    
    print(f'✅ 响应状态码: {response.status_code}')
    
    if response.status_code == 200:
        data = response.json()
        
        if data.get('success') and data.get('data'):
            result = data['data']
            
            print('\n✅ 解析成功！\n')
            print('=' * 80)
            print('【原告信息】')
            print(f'  姓名: {result.get("plaintiffName", "(未提取)")}')
            print(f'  性别: {result.get("plaintiffGender", "(未提取)")}')
            print(f'  出生日期: {result.get("plaintiffBirth", "(未提取)")}')
            print(f'  身份证号: {result.get("plaintiffId", "(未提取)")}')
            print(f'  住所地: {result.get("plaintiffAddress", "(未提取)")}')
            print(f'  常居地: {result.get("plaintiffResidence", "(未提取)")}')
            
            print('\n【被告信息】')
            print(f'  姓名: {result.get("defendantName", "(未提取)")}')
            print(f'  性别: {result.get("defendantGender", "(未提取)")}')
            print(f'  出生日期: {result.get("defendantBirth", "(未提取)")}')
            print(f'  身份证号: {result.get("defendantId", "(未提取)")}')
            print(f'  住所地: {result.get("defendantAddress", "(未提取)")}')
            print(f'  常居地: {result.get("defendantResidence", "(未提取)")}')
            
            if result.get('defendant2Name'):
                print('\n【第二被告（单位）信息】')
                print(f'  单位名称: {result.get("defendant2Name")}')
                print(f'  住所地: {result.get("defendant2Address", "(未提取)")}')
                print(f'  统一信用代码: {result.get("defendant2Id", "(未提取)")}')
                print(f'  法定代表人: {result.get("defendant2Rep", "(未提取)")}')
                print(f'  职位: {result.get("defendant2Position", "(未提取)")}')
            
            print('\n【交通事故信息】')
            accident_facts = result.get('accidentFacts', '(未提取)')
            print(f'  事故事实: {accident_facts[:150]}...' if len(accident_facts) > 150 else f'  事故事实: {accident_facts}')
            
            liability = result.get('liabilityDetermination', '(未提取)')
            print(f'  责任认定: {liability[:150]}...' if len(liability) > 150 else f'  责任认定: {liability}')
            
            insurance = result.get('insuranceStatus', '(未提取)')
            print(f'  保险状态: {insurance[:150]}...' if len(insurance) > 150 else f'  保险状态: {insurance}')
            
            print('\n【索赔清单】')
            print(result.get('claimsList', '(未提取)'))
            
            print('\n【其他情况】')
            other = result.get('otherFacts', '(未提取)')
            print(other[:200] + '...' if len(other) > 200 else other)
            
            # 保存完整结果到 JSON 文件
            with open('parse-result.json', 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print('\n\n✓ 完整结果已保存到: parse-result.json')
            print('=' * 80)
        else:
            print(f'❌ 解析失败: {data.get("error")}')
            if data.get('details'):
                print(f'详情: {data.get("details")}')
    else:
        print(f'❌ API 返回错误状态码: {response.status_code}')
        print(f'响应: {response.text[:500]}')

except requests.exceptions.Timeout:
    print('❌ 请求超时，API 响应时间过长')
except requests.exceptions.ConnectionError:
    print('❌ 无法连接到服务器，确保 http://localhost:3001 正在运行')
except Exception as e:
    print(f'❌ 错误: {e}')

