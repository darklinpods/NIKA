import fetch from 'node-fetch';

async function testChat() {
    console.log("Starting Case Copilot AI Chat test...");

    // 1. 获取现有案件列表，找一个有证据的 (比如 陶雪珍)
    const casesRes = await fetch('http://localhost:3001/api/cases');
    const cases: any = await casesRes.json();
    const targetCase = cases.find((c: any) => c.title.includes('陶雪珍') || c.clientName === '陶雪珍');

    if (!targetCase) {
        console.error("Target case '陶雪珍' not found. Please run smart-import test first.");
        return;
    }

    const caseId = targetCase.id;
    console.log(`Testing with Case: ${targetCase.title} (ID: ${caseId})`);

    // 2. 发送第一条消息
    console.log("\n--- Sending User Message: '请根据证据梳理本案的关键时间轴' ---");
    const chatRes = await fetch(`http://localhost:3001/api/cases/${caseId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            content: "请根据证据梳理本案的关键时间轴",
            lang: "zh"
        })
    });

    const chatData: any = await chatRes.json();
    if (chatData.success) {
        console.log("AI Response Received:");
        console.log(chatData.aiMessage.content);
    } else {
        console.error("Chat Failed:", chatData.error);
        return;
    }

    // 3. 验证历史记录持久化
    console.log("\n--- Verifying Chat History Persistence ---");
    const historyRes = await fetch(`http://localhost:3001/api/cases/${caseId}/chat`);
    const historyData: any = await historyRes.json();

    if (historyData.success && historyData.data.length >= 2) {
        console.log(`Success! Found ${historyData.data.length} messages in history.`);
    } else {
        console.error("History persistence failed or history is empty.");
    }
}

testChat();
