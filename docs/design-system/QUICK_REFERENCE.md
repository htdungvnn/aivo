# Design System Quick Reference

Developer cheat sheet for common UI patterns using AIVO Design System.

---

## Table of Contents

- [Colors](#colors)
- [Typography](#typography)
- [Spacing](#spacing)
- [Components](#components)
- [Common Patterns](#common-patterns)
- [Responsive Classes](#responsive-classes)
- [Dark Mode](#dark-mode)

---

## Colors

### Semantic Tokens (use these!)

```typescript
// Backgrounds
bg-background      // Main background (white/dark)
bg-surface         // Card/surface background
bg-primary-500     // Primary brand color

// Text
text-primary       // Main heading/body text
text-secondary     // Secondary text, descriptions
text-tertiary      // Muted text, hints

// Borders
border-primary     // Default border
border-secondary   // Subtle border

// Status
bg-success-500     // Success, completed
bg-warning-500     // Warning, pending
bg-error-500       // Error, destructive
```

### Direct Color Values

```typescript
// Primary
bg-primary-500   // #3b82f6
bg-primary-600   // #2563eb (hover)

// Grays
bg-gray-800      // #1f2937 (dark card)
bg-gray-700      // #374151 (dark button)
text-gray-400    // #9ca3af (muted text)
border-gray-600  // #4b5563 (border)

// Semantic
bg-success-500   // #10b981
bg-warning-500   // #f59e0b
bg-error-500     // #ef4444
```

---

## Typography

```typescript
// Headlines
text-4xl font-bold              // H1, page title
text-2xl font-semibold          // H2, section header
text-xl font-semibold           // H3, subsection

// Body
text-base font-normal           // Body text (default)
text-sm font-normal             // Small text, helper

// Labels
text-sm font-medium             // Input labels, button text

// Code/data
font-mono text-sm               // Monospace for data
```

---

## Spacing

```typescript
// Common spacing values (4px base)
space-1   // 4px  - tiny
space-2   // 8px  - small
space-3   // 12px - uncommon
space-4   // 16px - ⭐ DEFAULT
space-5   // 20px
space-6   // 24px - large
space-8   // 32px
space-12  // 48px
space-16  // 64px

// Directional
p-4              // padding: 16px (all sides)
px-4 py-2        // padding-x: 16px, padding-y: 8px
mt-4 mb-2        // margin-top/bottom
gap-4            // grid/flex gap
```

---

## Components

### Button

```typescript
// Basic
<Button onPress={handleClick}>Submit</Button>

// Variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="destructive">Delete</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium (default)</Button>
<Button size="lg">Large</Button>

// States
<Button disabled>Disabled</Button>
<Button loading>Loading...</Button>

// With icon
<Button icon={<Icon />}>With Icon</Button>
```

**Common sizes**:
- `md` - Most buttons
- `lg` - Primary CTA, hero sections
- `sm` - Compact areas, tables

---

### Card

```typescript
// Basic card
<Card title="Workout" subtitle="Upper Body">
  <p>5 exercises • 45 min</p>
</Card>

// Variants
<Card variant="elevated">With shadow</Card>
<Card variant="outlined">Bordered</Card>
<Card variant="filled">Dark filled</Card>

// With actions
<Card
  title="Profile"
  actions={<Button size="sm">Edit</Button>}
>
  <UserInfo user={user} />
</Card>

// Interactive
<Card onClick={navigate}>
  <WorkoutPreview workout={workout} />
</Card>

// With footer
<Card
  title="Goals"
  footer={<Button fullWidth>Update</Button>}
>
  <GoalList goals={goals} />
</Card>
```

---

### Input

```typescript
// Basic
<Input
  label="Email"
  value={email}
  onChange={setEmail}
  type="email"
/>

// With validation
<Input
  label="Password"
  value={password}
  onChange={setPassword}
  type="password"
  error={errors.password}
  helperText="At least 8 characters"
/>

// With prefix/suffix
<Input
  label="Weight"
  value={weight}
  onChange={setWeight}
  type="number"
  prefix="target:"
  suffix="kg"
/>

// Required field
<Input
  label="Name"
  value={name}
  onChange={setName}
  required
/>

// Multiline
<Input
  label="Notes"
  value={notes}
  onChange={setNotes}
  multiline
  rows={4}
/>
```

---

### Badge

```typescript
// Status badges
<Badge variant="success">Completed</Badge>
<Badge variant="warning">In Progress</Badge>
<Badge variant="error">Failed</Badge>
<Badge variant="primary">Active</Badge>

// Sizes
<Badge size="sm">Small</Badge>
<Badge size="md">Medium</Badge>

// With dot indicator
<Badge variant="primary" dot>Live</Badge>
```

---

### Avatar

```typescript
// Basic
<Avatar src={user.avatarUrl} alt={user.name} />

// Sizes
<Avatar size="xs" />
<Avatar size="sm" />
<Avatar size="md" />  // default
<Avatar size="lg" />
<Avatar size="xl" />

// With status
<Avatar
  src={user.avatar}
  alt={user.name}
  size="md"
  status="online"
/>

// Fallback initials
<Avatar alt="John Doe" initials="JD" />
```

---

### Modal

```typescript
// Basic modal
<Modal
  isOpen={showModal}
  onClose={closeModal}
  title="Confirm"
>
  <p>Are you sure?</p>
  <Modal.Actions>
    <Button variant="secondary" onPress={closeModal}>Cancel</Button>
    <Button onPress={confirm}>Confirm</Button>
  </Modal.Actions>
</Modal>

// Sizes
<Modal size="sm">...</Modal>
<Modal size="md">...</Modal>  // default
<Modal size="lg">...</Modal>
```

---

## Common Patterns

### Form Layout

```typescript
<form className="space-y-4">
  <Input label="Email" ... />
  <Input label="Password" type="password" ... />
  <Input label="Confirm Password" type="password" ... />
  <Button fullWidth>Submit</Button>
</form>
```

### Card with Header Actions

```typescript
<Card
  title="Workouts"
  subtitle="This week"
  actions={<Button size="sm" variant="outline">Add</Button>}
>
  <WorkoutList workouts={workouts} />
</Card>
```

### List with Avatar

```typescript
<View className="flex-row items-center gap-3">
  <Avatar src={user.avatar} alt={user.name} size="md" />
  <View className="flex-1">
    <Text className="text-base font-medium">{user.name}</Text>
    <Text className="text-sm text-text-secondary">{user.email}</Text>
  </View>
  <ChevronRightIcon className="text-gray-500" />
</View>
```

### Empty State

```typescript
<View className="items-center justify-center p-12">
  <WorkoutIcon size={64} className="text-gray-600 mb-4" />
  <Text className="text-lg font-medium mb-2">No workouts</Text>
  <Text className="text-text-secondary text-center mb-4">
    Start your first workout!
  </Text>
  <Button onPress={createWorkout}>Create Workout</Button>
</View>
```

### Loading State

```typescript
<View className="items-center justify-center p-8">
  <ActivityIndicator size="large" color="#3b82f6" />
  <Text className="mt-2 text-text-secondary">Loading...</Text>
</View>
```

---

## Responsive Classes

```typescript
// Mobile-first approach

// Default = mobile
className="p-4"                    // 16px padding on mobile

// Tablet and up
className="md:p-6"                 // 24px padding on tablet+

// Grid responsive
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"

// Text responsive
className="text-base md:text-lg"

// Layout responsive
className="flex-col md:flex-row"
```

**Breakpoints**:
- `sm:` - 640px (mobile landscape)
- `md:` - 768px (tablet)
- `lg:` - 1024px (laptop)
- `xl:` - 1280px (desktop)
- `2xl:` - 1536px (large screens)

---

## Dark Mode

### Web (Tailwind)

```typescript
// Automatic dark mode via class
<html className="dark">
  <body className="bg-background text-text-primary dark:bg-gray-900 dark:text-white">
    Content
  </body>
</html>

// Or use semantic tokens (preferred)
<div className="bg-background text-text-primary">
  {/* Automatically adapts to theme */}
</div>
```

### Mobile (NativeWind)

```typescript
import { useColorScheme } from 'react-native';

const colorScheme = useColorScheme(); // 'light' | 'dark' | null

// Use conditional classes
<View className={`
  bg-background
  text-text-primary
  ${colorScheme === 'dark' ? 'dark' : ''}
`}>
  Content
</View>
```

---

## Z-Index Scale

```typescript
z-0   // 0  - default
z-10  // 10 - dropdowns, tooltips
z-20  // 20 - sticky headers
z-30  // 30 - modals (overlay)
z-40  // 40 - modals (content)
z-50  // 50 - popovers, menus
```

---

## Shadows

```typescript
shadow-sm    // Subtle shadow
shadow-md    // Medium (default for cards)
shadow-lg    // Large shadow
shadow-xl    // Extra large
```

---

## Component Checklist

When building UI, ensure:

- [ ] **Colors**: Use semantic tokens, not raw hex
- [ ] **Spacing**: Multiple of 4px (4, 8, 12, 16, 24, 32...)
- [ ] **Typography**: Use scale tokens (text-sm, text-base, etc.)
- [ ] **Border radius**: Use tokens (radius-sm, radius-md, radius-lg)
- [ ] **Dark mode**: Test in both light and dark
- [ ] **Accessibility**: Contrast ratio 4.5:1+, keyboard nav (web), screen reader
- [ ] **Touch targets**: 44×44px minimum (mobile)
- [ ] **Responsive**: Works on mobile, tablet, desktop

---

## Do's and Don'ts

### ✅ DO

- Use semantic color tokens (`text-primary`, not `text-white`)
- Follow 4px spacing grid
- Use `flex` and `grid` for layouts
- Test in dark mode
- Add accessibility props (`accessibilityLabel`, `aria-*`)
- Use component variants (don't inline styles)
- Keep components small and focused

### ❌ DON'T

- Use arbitrary values (`p-[17px]`)
- Hardcode colors (`#3b82f6` everywhere)
- Mix spacing units (px, rem, em)
- Forget mobile touch targets (<44px)
- Use `position: absolute` for layout
- Skip keyboard navigation (web)
- Ignore screen reader testing

---

## Need Help?

- **Figma**: [Design System File](https://figma.com/file/...)
- **Full Spec**: See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
- **Accessibility**: See `design-system/accessibility-guidelines.md`
- **Questions**: Contact design team on Slack

---

**Quick Reference v1.0**  
Updated: 2025-04-27
