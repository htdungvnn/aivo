import { eq, and, gte, lt, asc, desc } from "drizzle-orm";
import { workouts, bodyMetrics, badges, achievements as achievementsTable, gamificationProfiles } from "@aivo/db";
/**
 * Default email configuration
 */
export const defaultEmailConfig = {
    fromEmail: "reports@aivo.app",
    fromName: "AIVO Fitness Reports",
    replyToEmail: "support@aivo.app",
    reportSubject: (name, month) => `Your ${month} Fitness Report, ${name}!`,
    baseUrl: process.env.APP_URL || "https://aivo.app",
};
/**
 * HTML Email Template for Monthly Report
 */
export function generateEmailHTML(data, config) {
    const { stats, weightChange, bodyFatChange, recentBadges, recentAchievements, month, year, name, gamificationLevel, exportLink } = data;
    // Format change values
    const weightChangeStr = weightChange
        ? `${weightChange.change >= 0 ? '+' : ''}${weightChange.change.toFixed(1)} kg`
        : 'N/A';
    const bodyFatChangeStr = bodyFatChange
        ? `${bodyFatChange.change >= 0 ? '+' : ''}${bodyFatChange.change.toFixed(1)}%`
        : 'N/A';
    // Build workout type breakdown
    const workoutTypesHtml = Object.entries(stats.workoutsByType)
        .map(([type, count]) => `<li>${type}: ${count} workout${count !== 1 ? 's' : ''}</li>`)
        .join('');
    // Build badges HTML
    const badgesHtml = recentBadges.length > 0
        ? recentBadges.map(badge => `
        <div style="background: #f0f9ff; padding: 10px; margin: 5px 0; border-radius: 8px;">
          <strong>${badge.name}</strong> (${badge.tier})<br>
          <span style="color: #64748b; font-size: 14px;">${badge.description}</span>
        </div>
      `).join('')
        : '<p style="color: #64748b;">No new badges this month. Keep pushing!</p>';
    // Build achievements HTML
    const achievementsHtml = recentAchievements.length > 0
        ? recentAchievements.map(ach => `
        <div style="background: #f0f9ff; padding: 10px; margin: 5px 0; border-radius: 8px;">
          <strong>${ach.type.replace(/_/g, ' ')}</strong>: ${ach.progress.toFixed(1)}% complete<br>
          <span style="color: #64748b; font-size: 14px;">Reward: ${ach.reward} XP</span>
        </div>
      `).join('')
        : '<p style="color: #64748b;">No achievements completed this month.</p>';
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.reportSubject(name, month)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc; }
    .container { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
    .logo { font-size: 28px; font-weight: 700; color: #6366f1; letter-spacing: -0.5px; }
    .month-badge { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 8px 20px; border-radius: 20px; font-weight: 600; margin: 10px 0; }
    .section { margin: 25px 0; }
    .section-title { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
    .stat-card { background: #f1f5f9; padding: 15px; border-radius: 10px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: 700; color: #6366f1; }
    .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .highlight { color: #10b981; font-weight: 600; }
    .neutral { color: #64748b; }
    .negative { color: #ef4444; font-weight: 600; }
    .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4); }
    .footer { text-align: center; color: #94a3b8; font-size: 13px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    .badge-item, .achievement-item { margin-bottom: 10px; }
    ul { margin: 0; padding-left: 20px; }
    li { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">AIVO</div>
      <div class="month-badge">${month} ${year}</div>
      <h1 style="margin: 10px 0 0; color: #1e293b;">Monthly Fitness Report</h1>
      <p style="color: #64748b; margin-top: 5px;">Great progress, ${name}!</p>
    </div>

    <div class="section">
      <div class="section-title">📊 This Month's Highlights</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${stats.workoutsCompleted}</div>
          <div class="stat-label">Workouts</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.totalWorkoutMinutes}</div>
          <div class="stat-label">Minutes</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.totalCaloriesBurned.toLocaleString()}</div>
          <div class="stat-label">Calories Burned</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.streakCurrent}</div>
          <div class="stat-label">Current Streak</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">📈 Body Metrics Changes</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value ${weightChange?.change && weightChange.change < 0 ? 'highlight' : weightChange?.change && weightChange.change > 0 ? 'negative' : 'neutral'}">
            ${weightChangeStr}
          </div>
          <div class="stat-label">Weight Change</div>
        </div>
        <div class="stat-card">
          <div class="stat-value ${bodyFatChange?.change && bodyFatChange.change < 0 ? 'highlight' : bodyFatChange?.change && bodyFatChange.change > 0 ? 'negative' : 'neutral'}">
            ${bodyFatChangeStr}
          </div>
          <div class="stat-label">Body Fat Change</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">💪 Workout Breakdown</div>
      <ul style="columns: 2; -webkit-columns: 2; -moz-columns: 2;">
        ${workoutTypesHtml || '<li>No workouts this month</li>'}
      </ul>
    </div>

    <div class="section">
      <div class="section-title">🏆 Badges Earned</div>
      ${badgesHtml}
    </div>

    <div class="section">
      <div class="section-title">🎯 Achievements Progress</div>
      ${achievementsHtml}
    </div>

    <div class="section">
      <div class="section-title">📊 Gamification Stats</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${stats.pointsEarned}</div>
          <div class="stat-label">Points Earned</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${gamificationLevel}</div>
          <div class="stat-label">Current Level</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.streakLongest}</div>
          <div class="stat-label">Longest Streak</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.badgesEarned}</div>
          <div class="stat-label">New Badges</div>
        </div>
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${exportLink}" class="btn">📥 Download Full Data Export</a>
      <p style="color: #64748b; font-size: 13px; margin-top: 10px;">Get all your data in Excel format</p>
    </div>

    <div class="footer">
      <p>You're receiving this email because you opted in to monthly fitness reports.</p>
      <p>© ${year} AIVO Fitness. All rights reserved.</p>
      <p style="margin-top: 10px;">
        <a href="#" style="color: #6366f1;">Manage Preferences</a> |
        <a href="#" style="color: #6366f1;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
/**
 * Calculate monthly statistics from user data
 */
export async function calculateMonthlyStats(drizzle, userId, year, month) {
    // Start and end timestamps for the month (in milliseconds)
    const startDate = Date.UTC(year, month - 1, 1);
    const endDate = Date.UTC(year, month, 1); // First day of next month
    // Fetch all data for the month in parallel
    const [dataWorkouts, dataBadges, dataAchievements, dataGamificationProfile,] = await Promise.all([
        // Workouts for the month
        drizzle.query.workouts.findMany({
            where: and(eq(workouts.userId, userId), gte(workouts.createdAt, startDate), lt(workouts.createdAt, endDate)),
            orderBy: asc(workouts.createdAt),
        }),
        // Badges earned this month
        drizzle.query.badges.findMany({
            where: and(eq(badges.userId, userId), gte(badges.earnedAt, startDate), lt(badges.earnedAt, endDate)),
        }),
        // Achievements completed this month
        drizzle.query.achievements.findMany({
            where: and(eq(achievementsTable.userId, userId), gte(achievementsTable.completedAt, startDate), lt(achievementsTable.completedAt, endDate)),
        }),
        // Gamification profile
        drizzle.query.gamificationProfiles.findFirst({
            where: eq(gamificationProfiles.userId, userId),
        }),
    ]);
    // Calculate stats
    const workoutsByType = {};
    let totalMinutes = 0;
    let totalCalories = 0;
    dataWorkouts.forEach((w) => {
        const type = w.type || 'unknown';
        workoutsByType[type] = (workoutsByType[type] || 0) + 1;
        totalMinutes += w.duration || 0;
        totalCalories += w.caloriesBurned || 0;
    });
    return {
        workoutsCompleted: dataWorkouts.length,
        totalWorkoutMinutes: totalMinutes,
        totalCaloriesBurned: totalCalories,
        workoutsByType,
        streakCurrent: dataGamificationProfile?.streakCurrent || 0,
        streakLongest: dataGamificationProfile?.streakLongest || 0,
        pointsEarned: 0, // TODO: Calculate from pointTransactions
        badgesEarned: dataBadges.length,
        achievementsCompleted: dataAchievements.filter(a => a.completed).length,
    };
}
/**
 * Generate and send a monthly report email
 */
export async function sendMonthlyReport(drizzle, user, year, month, config = defaultEmailConfig) {
    try {
        // Check if user has opted in for reports (TODO: add user preference field)
        // For now, assume all users receive reports
        // Date range for the month
        const startDate = Date.UTC(year, month - 1, 1);
        const endDate = Date.UTC(year, month, 1);
        // Calculate stats
        const stats = await calculateMonthlyStats(drizzle, user.id, year, month);
        // Get weight and body fat changes
        const [bodyMetricsStart, bodyMetricsEnd] = await Promise.all([
            drizzle.query.bodyMetrics.findFirst({
                where: and(eq(bodyMetrics.userId, user.id), lt(bodyMetrics.timestamp, startDate)),
                orderBy: desc(bodyMetrics.timestamp),
            }),
            drizzle.query.bodyMetrics.findFirst({
                where: and(eq(bodyMetrics.userId, user.id), lt(bodyMetrics.timestamp, endDate)),
                orderBy: desc(bodyMetrics.timestamp),
            }),
        ]);
        const weightChange = bodyMetricsStart?.weight && bodyMetricsEnd?.weight
            ? {
                startWeight: bodyMetricsStart.weight,
                endWeight: bodyMetricsEnd.weight,
                change: bodyMetricsEnd.weight - bodyMetricsStart.weight,
            }
            : undefined;
        const bodyFatChange = bodyMetricsStart?.bodyFatPercentage && bodyMetricsEnd?.bodyFatPercentage
            ? {
                startValue: bodyMetricsStart.bodyFatPercentage,
                endValue: bodyMetricsEnd.bodyFatPercentage,
                change: bodyMetricsEnd.bodyFatPercentage - bodyMetricsStart.bodyFatPercentage,
            }
            : undefined;
        // Get recent badges and achievements
        const [dataBadges, dataAchievements] = await Promise.all([
            drizzle.query.badges.findMany({
                where: and(eq(badges.userId, user.id), gte(badges.earnedAt, startDate), lt(badges.earnedAt, endDate)),
                orderBy: desc(badges.earnedAt),
                limit: 5,
            }),
            drizzle.query.achievements.findMany({
                where: and(eq(achievementsTable.userId, user.id), gte(achievementsTable.completedAt, startDate), lt(achievementsTable.completedAt, endDate)),
                orderBy: desc(achievementsTable.completedAt),
                limit: 5,
            }),
        ]);
        // Generate export link (JWT-protected)
        const exportLink = `${config.baseUrl}/api/export?month=${year}-${month.toString().padStart(2, '0')}`;
        // Build report data
        const reportData = {
            userId: user.id,
            email: user.email,
            name: user.name,
            month: new Date(year, month - 1).toLocaleString('default', { month: 'long' }),
            year,
            stats,
            weightChange,
            bodyFatChange,
            recentBadges: dataBadges,
            recentAchievements: dataAchievements
                .filter(a => a.completed !== null && a.completed !== undefined && a.completed === 1)
                .map(a => ({
                id: a.id,
                userId: a.userId,
                type: a.type || 'strength',
                progress: a.progress || 0,
                target: a.target || 0,
                reward: a.reward || 0,
                completed: true,
                completedAt: a.completedAt ? new Date(a.completedAt * 1000) : undefined,
                claimed: !!a.claimed,
            })),
            gamificationLevel: 1, // TODO: fetch from gamificationProfiles
            exportLink,
        };
        // Generate HTML
        const html = generateEmailHTML(reportData, config);
        // Send email via Resend
        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) {
            throw new Error("RESEND_API_KEY not configured");
        }
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: `${config.fromName} <${config.fromEmail}>`,
                to: user.email,
                subject: config.reportSubject(user.name, `${month} ${year}`),
                html,
                reply_to: config.replyToEmail,
            }),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to send email: ${error}`);
        }
        return { success: true };
    }
    catch (error) {
        console.error(`Failed to send monthly report to ${user.email}:`, error); // eslint-disable-line no-console
        return { success: false, error: String(error) };
    }
}
