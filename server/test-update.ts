
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Verification Test...");

    // 1. Create a Case
    const newCase = await prisma.case.create({
        data: {
            title: "Test Case for Update",
            description: "Testing update functionality",
            priority: "medium",
            status: "todo",
            tags: "[]",
            clientName: "Test Client",
            subTasks: {
                create: [{ title: "Initial Task", isCompleted: false }]
            }
        },
        include: { subTasks: true }
    });
    console.log("1. Created Case:", newCase.id, newCase.status);

    // 2. Update Status and Subtasks
    // We simulate what the frontend sends:
    // - Status change
    // - Subtask update (modify existing)
    // - Subtask add (new one with no ID or new ID)

    // For upsert to work with UUIDs, if we send a random ID it might fail if we expect it to exist?
    // My controller logic: 
    // upsert: where: { id: st.id || 'new-id' }
    // If st.id is 'new-id' (literal), it won't be found -> create.
    // If st.id is undefined -> 'new-id' -> create.
    // If st.id is valid UUID -> update.

    const subTaskId = newCase.subTasks[0].id;

    // Fake request body processing
    // Controller logic duplication for testing:
    // We are testing IF PRISMA handles the structure we designed in the controller.
    // Actually, I should test by calling the API using fetch? 
    // That tests the Controller + Prisma. Better.

    // Let's use fetch against localhost:3001
}

// Re-writing to use fetch
async function testApi() {
    const fetch = (await import('node-fetch')).default;
    const baseUrl = 'http://localhost:3001/api/cases';

    console.log("Starting API Verification...");

    // 1. Create
    const createRes = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: "API Test Case",
            description: "Testing API",
            priority: "medium",
            clientName: "API Tester"
        })
    });
    const created = await createRes.json() as any;
    console.log("Created:", created.id);

    // 2. Update Status and Add Subtask
    const updatePayload = {
        ...created,
        status: 'in-progress',
        priority: 'high',
        subTasks: [
            ...created.subTasks, // existing (empty?)
            { title: "New API Task", isCompleted: false } // New
        ]
    };

    const updateRes = await fetch(`${baseUrl}/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
    });
    const updated = await updateRes.json() as any;

    console.log("Updated Status:", updated.status);
    console.log("Updated Subtasks Count:", updated.subTasks.length);

    if (updated.status !== 'in-progress') throw new Error("Status update failed");
    if (updated.subTasks.length !== 1) throw new Error("Subtask add failed");

    // 3. Update Subtask Status
    const subTask = updated.subTasks[0];
    const updateSubTaskPayload = {
        ...updated,
        subTasks: [
            { ...subTask, isCompleted: true }
        ]
    };

    const updateRes2 = await fetch(`${baseUrl}/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateSubTaskPayload)
    });
    const updated2 = await updateRes2.json() as any;
    console.log("Subtask Completed:", updated2.subTasks[0].isCompleted);

    if (updated2.subTasks[0].isCompleted !== true) throw new Error("Subtask update failed");

    console.log("Verification Passed!");
}

testApi().catch(console.error);
