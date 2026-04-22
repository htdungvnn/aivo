/**
 * Seed Database with Mock Data for Admin Testing
 *
 * Usage:
 * 1. Start local D1 database: wrangler d1 migrations apply aivo-db --local
 * 2. Run: pnpm run seed:mock
 *
 * This will populate the database with comprehensive test data for an admin user.
 */

import { db } from "./src/index.ts";
import { mockData } from "./src/__tests__/mock-data.ts";

async function seedDatabase() {
  console.log("🌱 Starting database seeding...\n");

  try {
    // Insert admin user
    console.log("📝 Inserting admin user...");
    await db.insert(schema.users).values(mockData.users).run();
    console.log(`   ✅ Created user: ${mockData.users[0].email}`);

    // Insert session
    console.log("📝 Inserting OAuth session...");
    await db.insert(schema.sessions).values(mockData.sessions).run();
    console.log(`   ✅ Created session for provider: ${mockData.sessions[0].provider}`);

    // Insert gamification profile
    console.log("📝 Inserting gamification profile...");
    await db.insert(schema.gamificationProfiles).values(mockData.gamificationProfiles).run();
    console.log(`   ✅ Profile: Level ${mockData.gamificationProfiles[0].level}, ${mockData.gamificationProfiles[0].totalPoints} points`);

    // Insert body metrics (bulk)
    console.log(`📝 Inserting ${mockData.bodyMetrics.length} body metrics records...`);
    await db.insert(schema.bodyMetrics).values(mockData.bodyMetrics).run();
    console.log(`   ✅ Body metrics history populated (${mockData.bodyMetrics.length} days)`);

    // Insert body photos
    console.log(`📝 Inserting ${mockData.bodyPhotos.length} body photos...`);
    await db.insert(schema.bodyPhotos).values(mockData.bodyPhotos).run();
    console.log(`   ✅ Progress photos uploaded`);

    // Insert workout routine
    console.log("📝 Inserting workout routine...");
    await db.insert(schema.workoutRoutines).values(mockData.workoutRoutines).run();
    console.log(`   ✅ Routine: ${mockData.workoutRoutines[0].name}`);

    // Insert routine exercises
    console.log(`📝 Inserting ${mockData.routineExercises.length} routine exercises...`);
    await db.insert(schema.routineExercises).values(mockData.routineExercises).run();
    console.log(`   ✅ Planned exercises configured`);

    // Insert workouts
    console.log(`📝 Inserting ${mockData.workouts.length} completed workouts...`);
    await db.insert(schema.workouts).values(mockData.workouts).run();
    console.log(`   ✅ Workout history populated`);

    // Insert workout exercises
    console.log(`📝 Inserting ${mockData.workoutExercises.length} workout exercise entries...`);
    await db.insert(schema.workoutExercises).values(mockData.workoutExercises).run();
    console.log(`   ✅ Exercise logs populated`);

    // Insert body insights
    console.log(`📝 Inserting ${mockData.bodyInsights.length} body insights...`);
    await db.insert(schema.bodyInsights).values(mockData.bodyInsights).run();
    console.log(`   ✅ Recovery and soreness data populated`);

    // Insert user goals
    console.log(`📝 Inserting ${mockData.userGoals.length} user goals...`);
    await db.insert(schema.userGoals).values(mockData.userGoals).run();
    console.log(`   ✅ Fitness goals configured`);

    // Insert AI recommendations
    console.log(`📝 Inserting ${mockData.aiRecommendations.length} AI recommendations...`);
    await db.insert(schema.aiRecommendations).values(mockData.aiRecommendations).run();
    console.log(`   ✅ Recommendations ready`);

    // Insert conversations
    console.log(`📝 Inserting ${mockData.conversations.length} conversations...`);
    await db.insert(schema.conversations).values(mockData.conversations).run();
    console.log(`   ✅ Chat history populated`);

    // Insert memory nodes
    console.log(`📝 Inserting ${mockData.memoryNodes.length} memory nodes...`);
    await db.insert(schema.memoryNodes).values(mockData.memoryNodes).run();
    console.log(`   ✅ Memory nodes created`);

    // Insert memory edges
    console.log(`📝 Inserting ${mockData.memoryEdges.length} memory edges...`);
    await db.insert(schema.memoryEdges).values(mockData.memoryEdges).run();
    console.log(`   ✅ Memory relationships established`);

    // Insert badges
    console.log(`📝 Inserting ${mockData.badges.length} badges...`);
    await db.insert(schema.badges).values(mockData.badges).run();
    console.log(`   ✅ Badges earned`);

    // Insert sleep logs
    console.log(`📝 Inserting ${mockData.sleepLogs.length} sleep logs...`);
    await db.insert(schema.sleepLogs).values(mockData.sleepLogs).run();
    console.log(`   ✅ Sleep tracking data populated`);

    // Insert point transactions
    console.log(`📝 Inserting ${mockData.pointTransactions.length} point transactions...`);
    await db.insert(schema.pointTransactions).values(mockData.pointTransactions).run();
    console.log(`   ✅ Points history populated`);

    // Insert notifications
    console.log(`📝 Inserting ${mockData.notifications.length} notifications...`);
    await db.insert(schema.notifications).values(mockData.notifications).run();
    console.log(`   ✅ Notifications queued`);

    // Insert daily checkins
    console.log(`📝 Inserting ${mockData.dailyCheckins.length} daily checkins...`);
    await db.insert(schema.dailyCheckins).values(mockData.dailyCheckins).run();
    console.log(`   ✅ Streak tracking populated`);

    console.log("\n✅ Database seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   - User: ${mockData.users[0].email}`);
    console.log(`   - Workouts: ${mockData.workouts.length} completed`);
    console.log(`   - Memories: ${mockData.memoryNodes.length} stored`);
    console.log(`   - Conversations: ${mockData.conversations.length} messages`);
    console.log(`   - Gamification: Level ${mockData.gamificationProfiles[0].level}, ${mockData.gamificationProfiles[0].totalPoints} points`);
    console.log(`   - Streak: ${mockData.gamificationProfiles[0].streakCurrent} days current, ${mockData.gamificationProfiles[0].streakLongest} days best`);
    console.log("\n🔑 Use this data to test the admin UI/UX and API endpoints.");

  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().catch(console.error);
}

export { mockData, seedDatabase };
