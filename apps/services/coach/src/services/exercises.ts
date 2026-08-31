/**
 * Coach Service - Exercises Service
 * Exercise definitions and metadata
 */

/**
 * Exercise definition for API responses
 */
export interface ExerciseDefinition {
  code: string;
  name: Record<string, string>;
  description: Record<string, string>;
  difficulty: string;
  goals: string[];
  cameraOrientation: string;
  sideDetection: string;
  phases: Array<{
    name: string;
    minDurationMs: number;
    maxDurationMs?: number;
  }>;
  rangeOfMotion: {
    minAngle: number;
    maxAngle: number;
    requiredChange: number;
    measurementJoint: string;
  };
  repCooldownMs: number;
  minTempoMs: number;
  maxTempoMs: number;
  formRules: string[];
  scoringWeights: {
    rangeOfMotion: number;
    tempo: number;
    stability: number;
    symmetry: number;
  };
  version: string;
  engineVersion: string;
}

/**
 * Get all exercise definitions
 */
export function getExerciseDefinitions(): ExerciseDefinition[] {
  return [
    getSquatDefinition(),
    getPushUpDefinition(),
    getLungeDefinition(),
    getShoulderPressDefinition(),
    getPlankDefinition(),
  ];
}

function getSquatDefinition(): ExerciseDefinition {
  return {
    code: 'squat',
    name: { en: 'Squat', vi: 'Ngồi xổm' },
    description: {
      en: 'A fundamental lower body exercise that targets the quadriceps, hamstrings, and glutes.',
      vi: 'Bài tập cơ bản cho phần thân dưới, targets cơ đùi trước, đùi sau và mông.',
    },
    difficulty: 'beginner',
    goals: ['fat_loss', 'muscle_gain', 'general_fitness'],
    cameraOrientation: 'front',
    sideDetection: 'both',
    phases: [
      { name: 'ready', minDurationMs: 0 },
      { name: 'descending', minDurationMs: 500 },
      { name: 'bottom', minDurationMs: 0 },
      { name: 'ascending', minDurationMs: 500 },
      { name: 'completed', minDurationMs: 0 },
    ],
    rangeOfMotion: {
      minAngle: 70,
      maxAngle: 170,
      requiredChange: 60,
      measurementJoint: 'left_knee',
    },
    repCooldownMs: 500,
    minTempoMs: 1500,
    maxTempoMs: 8000,
    formRules: [
      'KNEE_COLLAPSE_INWARD',
      'KNEE_TRACKING_OVER_TOES',
      'SQUAT_NOT_DEEP_ENOUGH',
      'FORWARD_LEAN_TOO_MUCH',
      'ROUNDED_LOWER_BACK',
    ],
    scoringWeights: {
      rangeOfMotion: 0.4,
      tempo: 0.2,
      stability: 0.2,
      symmetry: 0.2,
    },
    version: '1.0.0',
    engineVersion: '1.0.0',
  };
}

function getPushUpDefinition(): ExerciseDefinition {
  return {
    code: 'push_up',
    name: { en: 'Push-up', vi: 'Chống đẩy' },
    description: {
      en: 'A classic upper body exercise that works the chest, shoulders, and triceps.',
      vi: 'Bài tập kinh điển cho phần thân trên, hoạt động ngực, vai và cơ tay sau.',
    },
    difficulty: 'intermediate',
    goals: ['muscle_gain', 'general_fitness'],
    cameraOrientation: 'side',
    sideDetection: 'none',
    phases: [
      { name: 'ready', minDurationMs: 0 },
      { name: 'descending', minDurationMs: 500 },
      { name: 'bottom', minDurationMs: 0 },
      { name: 'ascending', minDurationMs: 500 },
      { name: 'completed', minDurationMs: 0 },
    ],
    rangeOfMotion: {
      minAngle: 80,
      maxAngle: 180,
      requiredChange: 60,
      measurementJoint: 'left_elbow',
    },
    repCooldownMs: 500,
    minTempoMs: 2000,
    maxTempoMs: 10000,
    formRules: [
      'ELBOWS_FLARE_OUT',
      'SHOULDERS_NOT_STACKED',
      'HIP_SAGGING',
      'INCOMPLETE_RANGE',
    ],
    scoringWeights: {
      rangeOfMotion: 0.4,
      tempo: 0.2,
      stability: 0.2,
      symmetry: 0.2,
    },
    version: '1.0.0',
    engineVersion: '1.0.0',
  };
}

function getLungeDefinition(): ExerciseDefinition {
  return {
    code: 'lunge',
    name: { en: 'Lunge', vi: 'Lunge' },
    description: {
      en: 'A unilateral leg exercise that improves balance and targets the quadriceps and glutes.',
      vi: 'Bài tập một chân cải thiện thăng bằng và targets cơ đùi trước và mông.',
    },
    difficulty: 'intermediate',
    goals: ['fat_loss', 'muscle_gain', 'general_fitness'],
    cameraOrientation: 'front',
    sideDetection: 'both',
    phases: [
      { name: 'ready', minDurationMs: 0 },
      { name: 'descending', minDurationMs: 500 },
      { name: 'bottom', minDurationMs: 0 },
      { name: 'ascending', minDurationMs: 500 },
      { name: 'completed', minDurationMs: 0 },
    ],
    rangeOfMotion: {
      minAngle: 70,
      maxAngle: 170,
      requiredChange: 50,
      measurementJoint: 'front_knee',
    },
    repCooldownMs: 800,
    minTempoMs: 2000,
    maxTempoMs: 10000,
    formRules: [
      'FRONT_KNEE_PAST_TOES',
      'TORSO_LEANING_FORWARD',
      'LUNGE_UNEVEN_DEPTH',
      'HIP_HINTS_NOT_LEVEL',
    ],
    scoringWeights: {
      rangeOfMotion: 0.35,
      tempo: 0.2,
      stability: 0.25,
      symmetry: 0.2,
    },
    version: '1.0.0',
    engineVersion: '1.0.0',
  };
}

function getShoulderPressDefinition(): ExerciseDefinition {
  return {
    code: 'shoulder_press',
    name: { en: 'Shoulder Press', vi: 'Đẩy vai' },
    description: {
      en: 'An overhead pressing movement that targets the deltoids and triceps.',
      vi: 'Bài tập đẩy qua đầu targets cơ delta và cơ tay sau.',
    },
    difficulty: 'intermediate',
    goals: ['muscle_gain', 'general_fitness'],
    cameraOrientation: 'front',
    sideDetection: 'both',
    phases: [
      { name: 'ready', minDurationMs: 0 },
      { name: 'ascending', minDurationMs: 500 },
      { name: 'completed', minDurationMs: 0 },
      { name: 'descending', minDurationMs: 500 },
    ],
    rangeOfMotion: {
      minAngle: 90,
      maxAngle: 180,
      requiredChange: 70,
      measurementJoint: 'left_elbow',
    },
    repCooldownMs: 500,
    minTempoMs: 1500,
    maxTempoMs: 8000,
    formRules: [
      'ARCH_IN_LOWER_BACK',
      'PRESS_NOT_SYMMETRIC',
      'INCOMPLETE_LOCKOUT',
    ],
    scoringWeights: {
      rangeOfMotion: 0.35,
      tempo: 0.2,
      stability: 0.25,
      symmetry: 0.2,
    },
    version: '1.0.0',
    engineVersion: '1.0.0',
  };
}

function getPlankDefinition(): ExerciseDefinition {
  return {
    code: 'plank',
    name: { en: 'Plank', vi: 'Plank' },
    description: {
      en: 'A static core exercise that builds endurance and stability.',
      vi: 'Bài tập tĩnh core xây dựng sức bền và ổn định.',
    },
    difficulty: 'beginner',
    goals: ['general_fitness', 'mobility'],
    cameraOrientation: 'side',
    sideDetection: 'none',
    phases: [
      { name: 'ready', minDurationMs: 0 },
      { name: 'holding', minDurationMs: 10000, maxDurationMs: 300000 },
    ],
    rangeOfMotion: {
      minAngle: 150,
      maxAngle: 180,
      requiredChange: 5,
      measurementJoint: 'body_line',
    },
    repCooldownMs: 0,
    minTempoMs: 10000,
    maxTempoMs: 300000,
    formRules: [
      'HIP_SAGGING',
      'HIP_PIKING_UP',
      'SHOULDERS_NOT_ALIGNED',
      'HEAD_DROPPING',
    ],
    scoringWeights: {
      rangeOfMotion: 0.2,
      tempo: 0.4,
      stability: 0.3,
      symmetry: 0.1,
    },
    version: '1.0.0',
    engineVersion: '1.0.0',
  };
}

/**
 * Get form rule definitions
 */
export interface FormRuleDefinition {
  code: string;
  severity: string;
  messages: Record<string, string>;
  priority: number;
  speakable: boolean;
  safetyRelated: boolean;
}

export function getFormRuleDefinitions(codes: string[]): FormRuleDefinition[] {
  const allRules: Record<string, FormRuleDefinition> = {
    KNEE_COLLAPSE_INWARD: {
      code: 'KNEE_COLLAPSE_INWARD',
      severity: 'warning',
      messages: {
        en: 'Keep your knees aligned with your toes.',
        vi: 'Giữ đầu gối thẳng hàng với ngón chân.',
      },
      priority: 75,
      speakable: true,
      safetyRelated: true,
    },
    KNEE_TRACKING_OVER_TOES: {
      code: 'KNEE_TRACKING_OVER_TOES',
      severity: 'hint',
      messages: {
        en: 'Keep your knees behind your toes.',
        vi: 'Giữ đầu gối phía sau ngón chân.',
      },
      priority: 50,
      speakable: true,
      safetyRelated: false,
    },
    SQUAT_NOT_DEEP_ENOUGH: {
      code: 'SQUAT_NOT_DEEP_ENOUGH',
      severity: 'hint',
      messages: {
        en: 'Lower your hips slightly more.',
        vi: 'Hạ thấp hông xuống một chút.',
      },
      priority: 60,
      speakable: true,
      safetyRelated: false,
    },
    FORWARD_LEAN_TOO_MUCH: {
      code: 'FORWARD_LEAN_TOO_MUCH',
      severity: 'warning',
      messages: {
        en: 'Keep your chest up and back straight.',
        vi: 'Giữ ngực hướng lên và lưng thẳng.',
      },
      priority: 70,
      speakable: true,
      safetyRelated: true,
    },
    ROUNDED_LOWER_BACK: {
      code: 'ROUNDED_LOWER_BACK',
      severity: 'critical',
      messages: {
        en: 'Keep your back neutral, do not round your lower back.',
        vi: 'Giữ lưng thẳng tự nhiên, không cong lưng dưới.',
      },
      priority: 90,
      speakable: true,
      safetyRelated: true,
    },
    ELBOWS_FLARE_OUT: {
      code: 'ELBOWS_FLARE_OUT',
      severity: 'hint',
      messages: {
        en: 'Tuck your elbows in slightly.',
        vi: 'Khuỷu tay hơi gập vào trong.',
      },
      priority: 50,
      speakable: true,
      safetyRelated: false,
    },
    SHOULDERS_NOT_STACKED: {
      code: 'SHOULDERS_NOT_STACKED',
      severity: 'warning',
      messages: {
        en: 'Keep your shoulders directly above your wrists.',
        vi: 'Giữ vai thẳng trên cổ tay.',
      },
      priority: 65,
      speakable: true,
      safetyRelated: false,
    },
    HIP_SAGGING: {
      code: 'HIP_SAGGING',
      severity: 'warning',
      messages: {
        en: 'Lift your hips, keep your body in a straight line.',
        vi: 'Nâng hông lên, giữ cơ thể thẳng hàng.',
      },
      priority: 70,
      speakable: true,
      safetyRelated: false,
    },
    HIP_PIKING_UP: {
      code: 'HIP_PIKING_UP',
      severity: 'warning',
      messages: {
        en: 'Lower your hips, do not pike up.',
        vi: 'Hạ hông xuống, không nhấc cao lên.',
      },
      priority: 70,
      speakable: true,
      safetyRelated: false,
    },
    FRONT_KNEE_PAST_TOES: {
      code: 'FRONT_KNEE_PAST_TOES',
      severity: 'hint',
      messages: {
        en: 'Do not let your front knee go past your toes.',
        vi: 'Đầu gối trước không vượt quá ngón chân.',
      },
      priority: 50,
      speakable: true,
      safetyRelated: false,
    },
    TORSO_LEANING_FORWARD: {
      code: 'TORSO_LEANING_FORWARD',
      severity: 'warning',
      messages: {
        en: 'Keep your torso more upright.',
        vi: 'Giữ thân mình thẳng đứng hơn.',
      },
      priority: 65,
      speakable: true,
      safetyRelated: false,
    },
    ARCH_IN_LOWER_BACK: {
      code: 'ARCH_IN_LOWER_BACK',
      severity: 'warning',
      messages: {
        en: 'Keep your lower back pressed into the floor.',
        vi: 'Giữ lưng dưới áp xuống sàn.',
      },
      priority: 70,
      speakable: true,
      safetyRelated: false,
    },
    PRESS_NOT_SYMMETRIC: {
      code: 'PRESS_NOT_SYMMETRIC',
      severity: 'hint',
      messages: {
        en: 'Try to press both arms evenly.',
        vi: 'Cố gắng đẩy hai tay đều nhau.',
      },
      priority: 50,
      speakable: true,
      safetyRelated: false,
    },
    INCOMPLETE_LOCKOUT: {
      code: 'INCOMPLETE_LOCKOUT',
      severity: 'hint',
      messages: {
        en: 'Fully lock out your arms at the top.',
        vi: 'Duỗi thẳng tay hoàn toàn ở trên.',
      },
      priority: 45,
      speakable: true,
      safetyRelated: false,
    },
    INCOMPLETE_RANGE: {
      code: 'INCOMPLETE_RANGE',
      severity: 'hint',
      messages: {
        en: 'Go through the full range of motion.',
        vi: 'Thực hiện đủ biên độ chuyển động.',
      },
      priority: 55,
      speakable: true,
      safetyRelated: false,
    },
  };

  return codes
    .filter(code => code && allRules[code])
    .map(code => allRules[code]!);
}
