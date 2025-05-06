import { db } from "./index";
import * as schema from "@shared/schema";
import { v4 as uuidv4 } from "uuid";

async function seed() {
  try {
    console.log("Starting database seed...");

    // Define sample user data
    const sampleUsers = [
      {
        id: uuidv4(),
        company_name: "Acme Inc.",
        email: "john.doe@acme.com",
        created_at: new Date()
      }
    ];

    // Insert sample users
    console.log("Inserting sample users...");
    for (const user of sampleUsers) {
      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: (users, { and, eq }) => 
          and(
            eq(users.company_name, user.company_name),
            eq(users.email, user.email)
          )
      });

      if (!existingUser) {
        await db.insert(schema.users).values(user);
        console.log(`Created user: ${user.company_name} (${user.email})`);
      } else {
        console.log(`User already exists: ${user.company_name} (${user.email})`);
      }
    }

    // Define sample chats
    const sampleChats = [
      {
        id: uuidv4(),
        user_id: sampleUsers[0].id,
        title: "Marketing Campaign Process",
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
        updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        phase: 3,
        completed: 1
      },
      {
        id: uuidv4(),
        user_id: sampleUsers[0].id,
        title: "Customer Onboarding Flow",
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        updated_at: new Date(),
        phase: 3,
        completed: 0,
        workflow_json: {
          "title": "Customer Onboarding Flow",
          "start_event": "New customer signs up",
          "end_event": "Customer is fully onboarded and active",
          "steps": [
            {"id": "step1", "description": "Customer completes signup form", "actor": "person1", "system": "system1"},
            {"id": "step2", "description": "Verification email is sent", "actor": "person2", "system": "system1"},
            {"id": "step3", "description": "Customer verifies email", "actor": "person1"},
            {"id": "step4", "description": "Customer provides required documents", "actor": "person1"},
            {"id": "step5", "description": "Support team verifies documents", "actor": "person2", "system": "system2"},
            {"id": "step6", "description": "Account is activated", "actor": "person2", "system": "system1"},
            {"id": "step7", "description": "Welcome package is sent", "actor": "person3", "system": "system3"},
            {"id": "step8", "description": "Initial training session is scheduled", "actor": "person4", "system": "system4"},
            {"id": "step9", "description": "Training is completed", "actor": "person4", "system": "system4"}
          ],
          "people": [
            {"id": "person1", "name": "Customer", "type": "external"},
            {"id": "person2", "name": "Support Team", "type": "internal"},
            {"id": "person3", "name": "Fulfillment Team", "type": "internal"},
            {"id": "person4", "name": "Training Team", "type": "internal"}
          ],
          "systems": [
            {"id": "system1", "name": "Customer Portal", "type": "internal"},
            {"id": "system2", "name": "Document Verification System", "type": "internal"},
            {"id": "system3", "name": "Fulfillment System", "type": "internal"},
            {"id": "system4", "name": "Training Calendar", "type": "internal"}
          ],
          "pain_points": [
            "Document verification takes too long",
            "Customers often forget to complete all steps",
            "Support team is overwhelmed during busy periods",
            "Training scheduling has many conflicts",
            "No automated way to track customer progress through onboarding"
          ]
        }
      },
      {
        id: uuidv4(),
        user_id: sampleUsers[0].id,
        title: "Invoice Approval Process",
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        phase: 3,
        completed: 1
      }
    ];

    // Insert sample chats
    console.log("Inserting sample chats...");
    for (const chat of sampleChats) {
      // Check if a chat with this title already exists for the user
      const existingChat = await db.query.chats.findFirst({
        where: (chats, { and, eq }) => 
          and(
            eq(chats.user_id, chat.user_id),
            eq(chats.title, chat.title)
          )
      });

      if (!existingChat) {
        await db.insert(schema.chats).values(chat);
        console.log(`Created chat: ${chat.title}`);
      } else {
        console.log(`Chat already exists: ${chat.title}`);
      }
    }

    console.log("Seed completed successfully!");
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seed();
