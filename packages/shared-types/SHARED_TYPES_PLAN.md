# Shared Types Enhancement Plan

## Additions needed:

### 1. Body Heatmap Constants
- MUSCLE_POSITIONS (normalized 0-100 coordinates)
- BODY_OUTLINE_FRONT / BACK SVG paths
- Color scale functions

### 2. Posture Analysis Constants
- ISSUE_LABELS with descriptions
- SEVERITY_COLORS
- SEVERITY_BG styles (platform-agnostic description)

### 3. Health Score Constants
- BMI categories
- Body fat categories by gender
- Score thresholds

### 4. Utility Types
- ApiResponse
- PaginatedResponse
- Result type

### 5. Platform Adapters
- Interface for heatmap renderer
- Interface for card renderer
