#!/usr/bin/env node

/**
 * 日志查看工具
 * 使用: node view-logs.js [选项]
 * 
 * 选项:
 *   last [数字]     - 查看最后N条日志 (默认5)
 *   format          - 格式化查看所有日志
 *   stats           - 显示统计信息
 *   success         - 只显示成功的日志
 *   error           - 只显示失败的日志
 *   count           - 显示日志总数
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.resolve('./server/logs/extraction-log.jsonl');

/**
 * 读取所有日志
 */
function readLogs() {
    if (!fs.existsSync(LOG_FILE)) {
        console.log('❌ 日志文件不存在:', LOG_FILE);
        return [];
    }

    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line);
    
    return lines.map((line, index) => {
        try {
            return JSON.parse(line);
        } catch (e) {
            console.error(`⚠️  解析日志行${index + 1}失败`);
            return null;
        }
    }).filter(log => log !== null);
}

/**
 * 格式化输出单条日志
 */
function formatLog(log, index) {
    const time = new Date(log.timestamp).toLocaleString('zh-CN');
    const statusIcon = log.status === 'success' ? '✅' : '❌';
    
    console.log(`\n${index + 1}. ${statusIcon} ${time}`);
    console.log(`   模板类型: ${log.templateId || 'N/A'}`);
    console.log(`   状态: ${log.status}`);
    console.log(`   处理时间: ${log.processingTime}ms`);
    console.log(`   输入大小: ${log.inputLength} 字符`);
    console.log(`   提取字段: ${log.extractedFields} 个`);
    
    if (log.errorMessage) {
        console.log(`   错误: ${log.errorMessage}`);
    }
    
    console.log(`   截断预览: ${log.inputPreview.substring(0, 100)}...`);
}

/**
 * 显示统计信息
 */
function showStats(logs) {
    if (logs.length === 0) {
        console.log('📊 暂无日志数据');
        return;
    }

    const successLogs = logs.filter(l => l.status === 'success');
    const errorLogs = logs.filter(l => l.status === 'error');
    const avgTime = successLogs.length > 0
        ? (successLogs.reduce((sum, l) => sum + l.processingTime, 0) / successLogs.length).toFixed(2)
        : 0;

    console.log('\n📊 日志统计');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`总数:         ${logs.length}`);
    console.log(`✅ 成功:      ${successLogs.length} (${((successLogs.length / logs.length) * 100).toFixed(2)}%)`);
    console.log(`❌ 失败:      ${errorLogs.length} (${((errorLogs.length / logs.length) * 100).toFixed(2)}%)`);
    console.log(`⚡ 平均处理时间: ${avgTime}ms`);
    
    // 按模板统计
    const byTemplate = {};
    logs.forEach(log => {
        const tpl = log.templateId || 'unknown';
        if (!byTemplate[tpl]) byTemplate[tpl] = 0;
        byTemplate[tpl]++;
    });

    if (Object.keys(byTemplate).length > 0) {
        console.log('\n📝 按模板分类:');
        Object.entries(byTemplate).forEach(([tpl, count]) => {
            console.log(`   ${tpl}: ${count} 条`);
        });
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

/**
 * 主函数
 */
function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    const logs = readLogs();

    if (!command || command === 'help') {
        console.log(`
📋 日志查看工具

用法: node view-logs.js [命令]

命令:
  last [N]        查看最后N条日志 (默认5条)
  format          格式化查看所有日志
  stats           显示统计信息和汇总
  success         只显示成功的日志
  error           只显示失败的日志
  count           显示日志总数
  help            显示此帮助信息

示例:
  node view-logs.js               - 显示最后5条日志
  node view-logs.js last 20       - 显示最后20条日志
  node view-logs.js format        - 格式化查看所有日志
  node view-logs.js stats         - 显示统计信息
  node view-logs.js success       - 只显示成功的日志
        `);
        return;
    }

    switch (command) {
        case 'last': {
            const count = parseInt(args[1]) || 5;
            const recent = logs.slice(-count);
            console.log(`\n📝 最后 ${Math.min(count, recent.length)} 条日志:`);
            recent.forEach((log, i) => formatLog(log, logs.length - recent.length + i));
            break;
        }

        case 'format': {
            console.log('\n📝 所有日志 (共 ' + logs.length + ' 条):');
            logs.forEach((log, i) => formatLog(log, i));
            break;
        }

        case 'stats': {
            showStats(logs);
            break;
        }

        case 'success': {
            const successLogs = logs.filter(l => l.status === 'success');
            console.log(`\n✅ 成功的日志 (共 ${successLogs.length} 条):`);
            successLogs.forEach((log, i) => formatLog(log, i));
            break;
        }

        case 'error': {
            const errorLogs = logs.filter(l => l.status === 'error');
            console.log(`\n❌ 失败的日志 (共 ${errorLogs.length} 条):`);
            errorLogs.forEach((log, i) => {
                formatLog(log, i);
                if (log.errorMessage) {
                    console.log(`   详细错误: ${log.errorMessage}`);
                }
            });
            break;
        }

        case 'count': {
            console.log(`\n📊 日志总数: ${logs.length} 条`);
            const success = logs.filter(l => l.status === 'success').length;
            const error = logs.filter(l => l.status === 'error').length;
            console.log(`   ✅ 成功: ${success}`);
            console.log(`   ❌ 失败: ${error}`);
            break;
        }

        case 'json': {
            // 输出所有日志为格式化的JSON（用于导出）
            console.log(JSON.stringify(logs, null, 2));
            break;
        }

        default: {
            console.log(`未知命令: ${command}\n运行 "node view-logs.js help" 查看帮助`);
        }
    }
}

main();
