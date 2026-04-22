/**
 * Medical Agent - Safety analysis and nutritional guidance
 *
 * Specialized in identifying drug-nutrient interactions, contraindications,
 * and condition-specific dietary modifications.
 */

import { AGENT_SYSTEM_PROMPTS } from "./prompts";
import type { MedicalAgentRequest, MedicalAgentResponse, SafetyAlert, NutrientWarning, DietaryModification } from "@aivo/shared-types";
import type { AgentInvocationResult } from "./types";

/**
 * Invoke the Medical Agent to analyze nutrition safety
 */
export async function invokeMedicalAgent(request: MedicalAgentRequest): Promise<AgentInvocationResult> {
  const startTime = Date.now();

  try {
    // Build the prompt with user context
    const prompt = buildMedicalPrompt(request);

    // Call OpenAI API
    const response = await callOpenAI(prompt, request.context);

    // Parse the JSON response
    const analysis = parseMedicalResponse(response);

    // Validate critical warnings
    const warnings = validateCriticalAlerts(analysis);

    // Calculate confidence based on available data
    const confidence = calculateConfidence(request.context);

    return {
      agentType: "medical",
      success: true,
      content: formatAnalysisAsText(analysis),
      confidence,
      warnings,
      metadata: { analysis },
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      agentType: "medical",
      success: false,
      content: "Unable to complete medical safety analysis. Please consult a healthcare provider.",
      confidence: 0,
      warnings: ["Medical analysis unavailable - please consult a healthcare provider"],
      metadata: { error: error instanceof Error ? error.message : String(error) },
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Build the system prompt with user context
 */
function buildMedicalPrompt(request: MedicalAgentRequest): string {
  const { query, context } = request;

  const medicalConditions = (context.medicalConditions || []).join(", ") || "none";
  const medications = (context.medications || []).map(m => m.name || String(m)).join(", ") || "none";
  const allergies = (context.allergies || []).join(", ") || "none";
  const intolerances = (context.intolerances || []).join(", ") || "none";

  const prompt = AGENT_SYSTEM_PROMPTS.medical;

  return `${prompt}

USER QUERY: ${query}

ADDITIONAL CONTEXT:
- Medical Conditions: ${medicalConditions}
- Current Medications: ${medications}
- Allergies: ${allergies}
- Food Intolerances: ${intolerances}

Please analyze the nutritional and medication safety aspects. Respond ONLY with valid JSON.`;
}

/**
 * Call OpenAI API with the prompt
 */
async function callOpenAI(prompt: string, context: MedicalAgentRequest["context"]): Promise<MedicalAgentResponse> {
  const { openai } = await import("../../utils/openai");

  const result = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: "Analyze the medical nutrition safety aspects based on my conditions and medications." },
    ],
    temperature: 0.3, // Lower temperature for medical safety - more conservative
    max_tokens: 2000,
    response_format: { type: "json_object" },
  });

  const content = result.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  return JSON.parse(content) as MedicalAgentResponse;
}

/**
 * Parse medical agent response into structured format
 */
function parseMedicalResponse(data: unknown): MedicalAgentResponse {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid medical analysis response");
  }

  const resp = data as Record<string, unknown>;

  // Parse safety alerts
  const safetyAlerts: SafetyAlert[] = Array.isArray(resp.safetyAlerts)
    ? resp.safetyAlerts.map((alert: Record<string, unknown>) => ({
        severity: String(alert.severity || "warning") as SafetyAlert["severity"],
        category: String(alert.category || "general") as SafetyAlert["category"],
        title: String(alert.title || ""),
        description: String(alert.description || ""),
        affectedMedications: Array.isArray(alert.affectedMedications)
          ? alert.affectedMedications.map(String)
          : undefined,
        affectedConditions: Array.isArray(alert.affectedConditions)
          ? alert.affectedConditions.map(String)
          : undefined,
        recommendation: typeof alert.recommendation === "string" ? alert.recommendation : undefined,
      }))
    : [];

  // Parse nutrient warnings
  const nutrientWarnings: NutrientWarning[] = Array.isArray(resp.nutrientWarnings)
    ? resp.nutrientWarnings.map((warn: Record<string, unknown>) => ({
        nutrient: String(warn.nutrient || ""),
        currentLevel: String(warn.currentLevel || ""),
        concern: String(warn.concern || ""),
        foodsToLimit: Array.isArray(warn.foodsToLimit) ? warn.foodsToLimit.map(String) : undefined,
        targetRange: typeof w.targetRange === "string" ? w.targetRange : undefined,
      }))
    : [];

  // Parse dietary modifications
  const dietaryModifications: DietaryModification[] = Array.isArray(resp.dietaryModifications)
    ? resp.dietaryModifications.map((mod: Record<string, unknown>) => ({
        condition: String(mod.condition || ""),
        modification: String(mod.modification || ""),
        rationale: typeof mod.rationale === "string" ? mod.rationale : undefined,
        foodsToEmphasize: Array.isArray(mod.foodsToEmphasize) ? mod.foodsToEmphasize.map(String) : undefined,
        foodsToAvoid: Array.isArray(mod.foodsToAvoid) ? mod.foodsToAvoid.map(String) : undefined,
      }))
    : [];

  return {
    safetyAlerts,
    nutrientWarnings,
    dietaryModifications,
    consultationNeeded: Boolean(resp.consultationNeeded),
    consultationReason: typeof resp.consultationReason === "string" ? resp.consultationReason : undefined,
    generalGuidance: typeof resp.generalGuidance === "string" ? resp.generalGuidance : undefined,
    confidence: typeof resp.confidence === "number" ? resp.confidence : 0.5,
  };
}

/**
 * Validate that critical alerts are present for high-risk items
 */
function validateCriticalAlerts(analysis: MedicalAgentResponse): string[] {
  const warnings: string[] = [];

  // Check for CRITICAL alerts
  const hasCritical = analysis.safetyAlerts.some(
    alert => alert.severity === "critical"
  );

  if (hasCritical) {
    warnings.push("⚠️ CRITICAL: Contains important safety warnings. Review carefully.");
  }

  // Check for drug interactions with high-risk medications
  const highRiskMeds = ["warfarin", "insulin", "digoxin", "lithium", "methotrexate"];
  for (const alert of analysis.safetyAlerts) {
    if (alert.category === "drug_interaction" && alert.affectedMedications) {
      for (const med of alert.affectedMedications) {
        if (highRiskMeds.some(hr => med.toLowerCase().includes(hr))) {
          warnings.push(`⚠️ CRITICAL: Potential interaction with ${med}. Consult your doctor or pharmacist.`);
        }
      }
    }
  }

  // Check if professional consultation is recommended
  if (analysis.consultationNeeded) {
    warnings.push(`ℹ️ Medical consultation recommended: ${analysis.consultationReason || "Review needed"}`);
  }

  return warnings;
}

/**
 * Calculate confidence based on available medical information
 */
function calculateConfidence(
  context: MedicalAgentRequest["context"]
): number {
  let score = 0.3; // Base score

  if (context.medicalConditions && context.medicalConditions.length > 0) {
    score += 0.25;
  }

  if (context.medications && context.medications.length > 0) {
    score += 0.25;
  }

  if (context.allergies && context.allergies.length > 0) {
    score += 0.2;
  }

  // Cap at 0.95 - always some uncertainty in medical analysis
  return Math.min(score, 0.95);
}

/**
 * Format medical analysis as readable text
 */
function formatAnalysisAsText(analysis: MedicalAgentResponse): string {
  let text = "# Medical Nutrition Safety Analysis\n\n";

  if (analysis.safetyAlerts.length > 0) {
    text += "## ⚠️ Safety Alerts\n\n";
    for (const alert of analysis.safetyAlerts) {
      const severityIcon = alert.severity === "critical" ? "🔴" : alert.severity === "warning" ? "🟡" : "🔵";
      text += `### ${severityIcon} ${alert.severity.toUpperCase()}: ${alert.title}\n`;
      text += `${alert.description}\n`;
      if (alert.affectedMedications?.length) {
        text += `**Medications:** ${alert.affectedMedications.join(", ")}\n`;
      }
      if (alert.affectedConditions?.length) {
        text += `**Conditions:** ${alert.affectedConditions.join(", ")}\n`;
      }
      if (alert.recommendation) {
        text += `**Recommendation:** ${alert.recommendation}\n`;
      }
      text += "\n";
    }
  }

  if (analysis.nutrientWarnings?.length > 0) {
    text += "## Nutrient Considerations\n\n";
    for (const warning of analysis.nutrientWarnings) {
      text += `### ${warning.nutrient}\n`;
      text += `${warning.concern}\n`;
      if (warning.foodsToLimit?.length) {
        text += `**Foods to limit:** ${warning.foodsToLimit.join(", ")}\n`;
      }
      if (warning.targetRange) {
        text += `**Target range:** ${warning.targetRange}\n`;
      }
      text += "\n";
    }
  }

  if (analysis.dietaryModifications?.length > 0) {
    text += "## Recommended Dietary Modifications\n\n";
    for (const mod of analysis.dietaryModifications) {
      text += `### For ${mod.condition}\n`;
      text += `${mod.modification}\n`;
      if (mod.rationale) {
        text += `*${mod.rationale}*\n`;
      }
      if (mod.foodsToEmphasize?.length) {
        text += `**Emphasize:** ${mod.foodsToEmphasize.join(", ")}\n`;
      }
      if (mod.foodsToAvoid?.length) {
        text += `**Avoid:** ${mod.foodsToAvoid.join(", ")}\n`;
      }
      text += "\n";
    }
  }

  if (analysis.generalGuidance) {
    text += `## Overall Guidance\n\n${analysis.generalGuidance}\n\n`;
  }

  if (analysis.consultationNeeded) {
    text += `## ⚕️ Medical Consultation Recommended\n\n${analysis.consultationReason || "Please consult your healthcare provider before making dietary changes."}\n`;
  }

  text += `\n---\n*Confidence: ${Math.round(analysis.confidence * 100)}%*\n`;
  text += `*This analysis is for informational purposes and does not replace professional medical advice.*`;

  return text;
}
