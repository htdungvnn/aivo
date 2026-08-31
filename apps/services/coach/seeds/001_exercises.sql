/**
 * Coach Service Idempotent Seeds
 * 
 * These seeds use INSERT OR IGNORE to ensure idempotency.
 * Safe to run multiple times.
 */

-- Seed initial exercise definitions
INSERT OR IGNORE INTO exercises (code, name_en, name_vi, description_en, description_vi, difficulty, goals, camera_orientation, range_of_motion_json, form_rules_json) VALUES
('squat', 'Squat', 'Ngồi xổm', 'A fundamental lower body exercise targeting quadriceps, hamstrings, and glutes.', 'Bài tập cơ bản cho phần thân dưới, targets cơ đùi trước, đùi sau và mông.', 'beginner', '["fat_loss", "muscle_gain", "general_fitness"]', 'front', '{"minAngle": 70, "maxAngle": 170, "requiredChange": 60, "measurementJoint": "left_knee"}', '["KNEE_COLLAPSE_INWARD", "SQUAT_NOT_DEEP_ENOUGH", "FORWARD_LEAN_TOO_MUCH", "ROUNDED_LOWER_BACK"]'),
('push_up', 'Push-up', 'Chống đẩy', 'A classic upper body exercise targeting chest, shoulders, and triceps.', 'Bài tập kinh điển cho phần thân trên, hoạt động ngực, vai và cơ tay sau.', 'intermediate', '["muscle_gain", "general_fitness"]', 'side', '{"minAngle": 80, "maxAngle": 180, "requiredChange": 60, "measurementJoint": "left_elbow"}', '["ELBOWS_FLARE_OUT", "SHOULDERS_NOT_STACKED", "HIP_SAGGING"]'),
('lunge', 'Lunge', 'Lunge', 'A unilateral leg exercise improving balance and targeting quads and glutes.', 'Bài tập một chân cải thiện thăng bằng và targets cơ đùi trước và mông.', 'intermediate', '["fat_loss", "muscle_gain", "general_fitness"]', 'front', '{"minAngle": 70, "maxAngle": 170, "requiredChange": 50, "measurementJoint": "front_knee"}', '["FRONT_KNEE_PAST_TOES", "TORSO_LEANING_FORWARD", "LUNGE_UNEVEN_DEPTH"]'),
('shoulder_press', 'Shoulder Press', 'Đẩy vai', 'An overhead pressing movement targeting deltoids and triceps.', 'Bài tập đẩy qua đầu targets cơ delta và cơ tay sau.', 'intermediate', '["muscle_gain", "general_fitness"]', 'front', '{"minAngle": 90, "maxAngle": 180, "requiredChange": 70, "measurementJoint": "left_elbow"}', '["ARCH_IN_LOWER_BACK", "PRESS_NOT_SYMMETRIC", "INCOMPLETE_LOCKOUT"]'),
('plank', 'Plank', 'Plank', 'A static core exercise building endurance and stability.', 'Bài tập tĩnh core xây dựng sức bền và ổn định.', 'beginner', '["general_fitness", "mobility"]', 'side', '{"minAngle": 150, "maxAngle": 180, "requiredChange": 5, "measurementJoint": "body_line"}', '["HIP_SAGGING", "HIP_PIKING_UP", "SHOULDERS_NOT_ALIGNED", "HEAD_DROPPING"]');
