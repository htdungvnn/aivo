# Accessibility Guidelines

**Version**: 1.0.0  
**Last Updated**: 2025-04-27  
**Compliance**: WCAG 2.1 AA  
**Scope**: Web (Next.js) and Mobile (Expo)

---

## Table of Contents

1. [Principles](#principles)
2. [WCAG 2.1 AA Requirements](#wcag-21-aa-requirements)
3. [Component Accessibility](#component-accessibility)
4. [Testing Methodology](#testing-methodology)
5. [Mobile-Specific Guidelines](#mobile-specific-guidelines)
6. [Common Issues & Solutions](#common-issues--solutions)

---

## Principles

AIVO is committed to accessibility. All features must be usable by people with disabilities. This means:

- **Perceivable**: Information and UI components must be presentable in ways users can perceive
- **Operable**: UI components and navigation must be operable
- **Understandable**: Information and UI operation must be understandable
- **Robust**: Content must be robust enough to work with current and future tools

### Our Goals

- Meet WCAG 2.1 AA standards (minimum)
- Support screen readers (VoiceOver, TalkBack)
- Enable full keyboard navigation (web)
- Ensure sufficient color contrast (4.5:1 for normal text, 3:1 for large)
- Provide text alternatives for non-text content
- Support users with motion sensitivity

---

## WCAG 2.1 AA Requirements

### 1. Perceivable

#### 1.1 Text Alternatives

**1.1.1 Non-text Content** (Level A)
- All non-text content (icons, images) must have text alternative
- Decorative images: empty `alt=""` or `aria-hidden="true"`
- Informative images: descriptive `alt` text

```typescript
// Good
<img src="workout-icon.svg" alt="Workout" />

// Decorative (no alt needed if purely decorative)
<img src="divider.svg" alt="" />

// Complex diagram - use long description
<Figure>
  <img src="body-chart.png" alt="Body measurement chart showing..." />
  <figcaption>Detailed description in text below</figcaption>
</Figure>
```

**1.1.2 Captions (Prerecorded)** - Not applicable (no video content yet)

#### 1.2 Time-based Media

**1.2.1 Audio-only and Video-only** - Not applicable (no auto-playing media)

#### 1.3 Adaptable

**1.3.1 Info and Relationships** (Level A)
- Use semantic HTML (`<header>`, `<nav>`, `<main>`, `<section>`)
- Proper heading hierarchy (`<h1>` → `<h2>` → `<h3>`)
- Form inputs must have associated `<label>` elements

```typescript
// Good
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// Bad - no label
<input type="email" placeholder="Email" />
```

**1.3.2 Meaningful Sequence** (Level A)
- Content should make sense when read in DOM order
- Use flex/grid `order` property carefully (don't disrupt reading order)
- Screen readers follow DOM order, not visual order

**1.3.3 Sensory Characteristics** (Level A)
- Don't rely on shape, color, size, or visual location alone
- Provide text alternatives:

```typescript
// Bad
<Button className="bg-red-500">Click the red button</Button>

// Good
<Button variant="destructive">Delete account</Button>
```

**1.3.4 Orientation** (Level AA)
- Content should not be locked to landscape/portrait
- Mobile: Support both orientations (unless technical limitation)
- Don't force rotation; adapt layout

**1.3.5 Identify Input Purpose** (Level AA)
- Use appropriate `input` types:
  - `type="email"` for email
  - `type="tel"` for phone
  - `type="number"` for numbers
- Use `autocomplete` attributes:
  - `autocomplete="email"`
  - `autocomplete="current-password"`

```typescript
<input
  type="email"
  autoComplete="email"
  aria-label="Email address"
/>
```

#### 1.4 Distinguishable

**1.4.1 Use of Color** (Level A)
- Don't use color alone to convey information
- Always pair color with text, icons, or patterns:

```typescript
// Bad - color only
<Text className={status === 'success' ? 'text-green-500' : 'text-red-500'}>
  {status}
</Text>

// Good - color + text
<Badge variant={status === 'success' ? 'success' : 'error'}>
  {status === 'success' ? 'Completed' : 'Failed'}
</Badge>
```

**1.4.2 Audio Control** (Level A) - N/A (no auto-playing audio)

**1.4.3 Contrast (Minimum)** (Level AA)
- **Normal text**: 4.5:1 minimum
- **Large text (18pt+ bold or 24pt+)**: 3:1 minimum
- **UI components** (buttons, inputs): 3:1 minimum

**Validation**: All AIVO colors have been tested and meet these ratios.

**1.4.4 Resize Text** (Level AA)
- Text must be resizable up to 200% without loss of content or functionality
- Use relative units (`rem`, `em`) not fixed `px` for font sizes
- Avoid fixed heights on containers that might clip text

```typescript
// Good - relative units
.text-base { font-size: 1rem; }  // Scales with browser settings

// Bad - fixed pixels
.text-base { font-size: 16px; }  // Won't scale
```

**1.4.5 Images of Text** (Level AA)
- Avoid using images of text
- Use real text with CSS styling instead
- Exceptions: Logos, decorative text

**1.4.6 Contrast (Enhanced)** (Level AAA) - Optional, not required

**1.4.7 Low or No Background Audio** (Level AAA) - Not applicable

**1.4.8 Visual Presentation** (Level AAA) - Not required for AA

**1.4.9 Images of Text (No Exception)** (Level AAA) - Not required for AA

**1.4.10 Reflow** (Level AA)
- Content must reflow without horizontal scrolling at 400% zoom
- Use responsive design, flexible layouts
- Test by zooming browser to 400% - should not require horizontal scroll

**1.4.11 Non-text Contrast** (Level AA)
- Non-text elements (icons, borders) must have 3:1 contrast against background
- Icons should be visible against their background

**1.4.12 Text Spacing** (Level AA)
- Users can adjust text spacing without clipping or overlapping
- Avoid fixed heights on text containers
- Support line height 1.5x, paragraph spacing 2x

---

### 2. Operable

#### 2.1 Keyboard Accessible

**2.1.1 Keyboard** (Level A)
- All functionality must be available via keyboard
- No keyboard traps (user can navigate away from any component)

**Testing**:
1. Unplug mouse
2. Use `Tab` to navigate through all interactive elements
3. Use `Enter`/`Space` to activate buttons
4. Use arrow keys for menus/dropdowns
5. `Escape` should close modals/menus

**2.1.2 No Keyboard Trap** (Level A)
- Focus must be movable away from all components
- Modals must trap focus (see Modal section)
- When modal closes, focus returns to trigger element

**2.1.3 Keyboard (No Exception)** (Level AAA) - Not required for AA

#### 2.2 Enough Time

**2.2.1 Timing Adjustable** (Level A)
- If time limits exist, provide options to:
  - Turn off the limit
  - Adjust the limit
  - Request more time before expiry
- Exceptions: Real-time events, auctions (justify if used)

**2.2.2 Pause, Stop, Hide** (Level A)
- Auto-playing content (carousels, animations) must have pause/stop controls
- We don't use auto-playing content, so this is satisfied

**2.2.3 No Timing** (Level AAA) - Optional

#### 2.3 Seizures and Physical Reactions

**2.3.1 Three Flashes or Below Threshold** (Level A)
- Content must not flash more than 3 times per second
- Avoid rapid color changes, strobe effects
- Our UI has no flashing content ✅

**2.3.2 Three Flashes** (Level AAA) - Already covered by 2.3.1

#### 2.4 Navigable

**2.4.1 Bypass Blocks** (Level A)
- Provide "Skip to main content" link (web only)
- Landmarks (`<nav>`, `<main>`, `<footer>`) for screen reader navigation

```html
<!-- Web: Skip link (visually hidden but accessible) -->
<a href="#main" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
<main id="main">...</main>
```

**2.4.2 Page Titled** (Level A)
- Each page must have a descriptive `<title>` (web)
- Mobile: Screen reader announcements

```typescript
// Next.js - app/page.tsx
export const metadata = {
  title: 'Workouts - AIVO',
};
```

**2.4.3 Focus Order** (Level A)
- Focus order must be logical and intuitive
- Follow DOM order, don't use `tabindex` to reorder (except `-1` for hiding)
- Modal: Focus moves to modal when opened, trapped inside, returns to trigger on close

**2.4.4 Link Purpose (In Context)** (Level A)
- Link text should describe destination
- Avoid "click here", "read more"
- Use descriptive link text:

```typescript
// Bad
<Link href="/workouts">Click here</Link>

// Good
<Link href="/workouts">View workouts</Link>
```

**2.4.5 Multiple Ways** (Level AA)
- Provide multiple ways to find pages (search, navigation, sitemap)
- We have navigation + search ✅

**2.4.6 Headings and Labels** (Level AA)
- Headings should describe topic/purpose
- Form fields should have clear labels
- Avoid duplicate headings in same context

**2.4.7 Focus Visible** (Level AA)
- Focus indicator must be visible
- Use `focus:ring` with sufficient contrast

```typescript
// Web - focus ring
<button className="focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
  Button
</button>

// Mobile - show focus state
<TouchableOpacity
  accessibilityState={{ focused: isFocused }}
/>
```

**2.4.8 Location** (Level AAA) - Not required for AA

**2.4.9 Link Purpose (Link Only)** (Level AAA) - Not required for AA

**2.4.10 Section Headings** (Level AAA) - Not required for AA

#### 2.5 Input Modalities

**2.5.1 Pointer Gestures** (Level A)
- All functionality available via single pointer (no multi-touch gestures required)
- If multi-touch needed, provide single-touch alternative

**2.5.2 Pointer Cancellation** (Level A)
- Actions triggered on `down` event must be reversible (undo option)
- We use `onPress` (up event) which is naturally reversible ✅

**2.5.3 Label in Name** (Level A)
- Button text should match accessible name
- If using icon-only button, `aria-label` should match visible label text

```typescript
// Good - text matches
<Button aria-label="Close modal">
  <XIcon /> Close
</Button>

// Bad - mismatch
<Button aria-label="Close">
  <XIcon /> Cancel  // aria-label says "Close" but text says "Cancel"
</Button>
```

**2.5.4 Motion Actuation** (Level A)
- Don't use device motion (shake, tilt) as only input method
- Provide button/tap alternative

**2.5.5 Target Size (Enhanced)** (Level AAA) - Not required for AA, but we aim for 44×44 anyway

**2.5.6 Concurrent Input Mechanisms** (Level AAA) - Not required for AA

---

### 3. Understandable

#### 3.1 Readable

**3.1.1 Language of Page** (Level A)
- Set `lang` attribute on `<html>` element

```html
<html lang="en">
```

**3.1.2 Language of Parts** (Level A)
- Use `lang` attribute for content in different language
- We're single-language (English) for now ✅

**3.1.3 Unusual Words** (Level AAA) - Not required for AA

**3.1.4 Abbreviations** (Level AAA) - Not required for AA

**3.1.5 Reading Level** (Level AAA) - Not required for AA

#### 3.2 Predictable

**3.2.1 On Focus** (Level A)
- Changing context on focus (new page, modal) is not allowed
- `onFocus` should not trigger navigation

**3.2.2 On Input** (Level A)
- Changing input shouldn't trigger navigation unless user action
- Auto-advance form fields is OK if user-initiated

**3.2.3 Consistent Navigation** (Level AA)
- Navigation should be in same order/location across pages
- We have consistent header/navigation ✅

**3.2.4 Consistent Identification** (Level AA)
- Components with same function should have same name/label
- "Save" button is always "Save", not sometimes "Submit"

**3.2.5 Change on Request** (Level AAA) - Not required for AA

#### 3.3 Input Assistance

**3.3.1 Error Identification** (Level A)
- Errors must be clearly identified and described to user
- Use `aria-describedby` to associate error with input

```typescript
<Input
  aria-invalid={!!error}
  aria-describedby={error ? 'email-error' : undefined}
/>
{error && <span id="email-error" role="alert">{error}</span>}
```

**3.3.2 Labels or Instructions** (Level A)
- Form fields must have labels
- Provide instructions for complex inputs

```typescript
<Input
  label="Password"
  helperText="At least 8 characters with a number"
  required
/>
```

**3.3.3 Error Suggestion** (Level AA)
- When error detected, provide specific suggestion to fix
- "Email must be valid format" not just "Invalid email"

**3.3.4 Error Prevention (Legal, Financial, Data)** (Level AA)
- For critical actions (delete account, purchase), require confirmation
- We use modals for destructive actions ✅

**3.3.5 Help** (Level AAA) - Not required for AA

**3.3.6 Error Prevention (All)** (Level AAA) - Not required for AA

---

### 4. Robust

#### 4.1 Compatible

**4.1.1 Parsing** (Level A)
- HTML must have no critical errors
- Use valid HTML (React helps, but check console for warnings)

**4.1.2 Name, Role, Value** (Level A)
- Custom components must have appropriate ARIA attributes
- `role`, `aria-label`, `aria-checked`, `aria-expanded`, etc.

```typescript
// Custom checkbox
<button
  role="checkbox"
  aria-checked={isChecked}
  onClick={toggle}
>
  {isChecked ? '☑' : '☐'} Accept terms
</button>
```

---

## Component Accessibility

### Button

- Use `<button>` element (not `<div>`)
- `type="button"` or `type="submit"`
- `disabled` attribute works natively
- For icon-only: `aria-label="Description"`

```typescript
<button
  type="button"
  onClick={handleClick}
  disabled={isDisabled}
  aria-label="Close modal"
>
  <XIcon />
</button>
```

### Link

- Use `<a>` element for navigation
- `href` required (not `onClick` only)
- `target="_blank"` with `rel="noopener noreferrer"`

```typescript
<Link href="/workouts" legacyBehavior>
  <a>View workouts</a>
</Link>

// External link
<a
  href="https://external.com"
  target="_blank"
  rel="noopener noreferrer"
>
  External site
</a>
```

### Input

- Associated `<label>` with `htmlFor`/`id`
- `aria-describedby` for helper/error text
- `aria-invalid="true"` on error
- `required` attribute for required fields
- `aria-required="true"` for screen readers (optional, `required` is sufficient)

```typescript
<>
  <label htmlFor="email">Email</label>
  <input
    id="email"
    type="email"
    required
    aria-describedby="email-helper email-error"
  />
  <span id="email-helper">We'll never share your email</span>
  {error && <span id="email-error" role="alert">{error}</span>}
</>
```

### Modal

**Critical**: Modal must trap focus and return focus on close.

**Requirements**:
1. `role="dialog"` or `role="alertdialog"`
2. `aria-modal="true"`
3. `aria-labelledby` pointing to title
4. `aria-describedby` pointing to description (optional)
5. Focus trap: All tab stops inside modal
6. On open: Move focus to first focusable element
7. On close: Return focus to trigger element
8. Close on `Escape` key
9. Backdrop should be non-interactive

```typescript
<Modal
  isOpen={isOpen}
  onClose={close}
  title="Confirm Delete"
>
  {/* Modal gets these automatically: */}
  <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <h2 id="modal-title">Confirm Delete</h2>
    <p id="modal-desc">Are you sure?</p>
    <button onClick={close}>Cancel</button>
    <button onClick={confirm}>Delete</button>
  </div>
</Modal>
```

### Card (Clickable)

If entire card is clickable:

```typescript
<button
  className="text-left w-full text-start"
  onClick={handleClick}
  aria-label="Workout: Upper Body, 5 exercises, 45 minutes"
>
  <Card content={...} />
</button>
```

Use `<button>` not `<div>` for keyboard accessibility.

### Badge (Status)

- Use semantic color (green=success, red=error)
- Don't rely on color alone - include text

```typescript
// Good
<Badge variant="success">Completed</Badge>

// Bad - color only (screen readers won't know status)
<div className="bg-green-500 text-white px-2 py-1 rounded" />
```

---

## Testing Methodology

### Automated Testing

#### Web (Axe)

```bash
# Install
npm install -D @axe-core/react @axe-core/cli

# Run in development
npx axe http://localhost:3000

# CI/CD integration
npx axe --exit
```

#### Mobile (React Native Accessibility Testing)

```bash
npm install -D @axe-core/react-native
```

Use in tests:

```typescript
import { checkForViolations } from '@axe-core/react-native';

it('should be accessible', async () => {
  const { toJSON } = render(<MyComponent />);
  const violations = await checkForViolations(toJSON());
  expect(violations).toHaveLength(0);
});
```

### Manual Testing

#### Screen Reader Testing

**iOS (VoiceOver)**:
1. Settings → Accessibility → VoiceOver → Turn On
2. Swipe right to move through elements
3. Double-tap to activate
4. Verify all elements are announced clearly

**Android (TalkBack)**:
1. Settings → Accessibility → TalkBack → Turn On
2. Swipe to navigate, double-tap to activate
3. Check "Explore by touch" is enabled

**Desktop (NVDA, JAWS, VoiceOver)**:
- NVDA (Windows): Free screen reader
- JAWS (Windows): Commercial
- VoiceOver (macOS): Built-in, enable with `Cmd+F5`

#### Keyboard Navigation (Web Only)

1. Tab through entire page
2. Ensure focus is visible at all times
3. Verify focus order is logical
4. `Escape` closes modals
5. `Enter`/`Space` activates buttons/links

#### Color Contrast Testing

- **Chrome DevTools**: Lighthouse → Accessibility
- **axe DevTools**: Browser extension
- **WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/

Test:
- All text (normal and large)
- UI components (buttons, inputs)
- Focus indicators

#### Reduced Motion

Test with `prefers-reduced-motion: reduce`:
1. Enable in OS settings (or browser dev tools)
2. Verify animations are disabled or greatly reduced
3. Content should not jump or flash

---

## Mobile-Specific Guidelines

### Touch Targets

- Minimum: 44×44 dp (density-independent pixels)
- Recommended: 48×48 dp
- Use `min-h-[44px] min-w-[44px]` or `padding` to achieve

```typescript
// Ensure minimum touch target
<TouchableOpacity className="min-h-[44px] min-w-[44px]">
  <Icon size={24} />
</TouchableOpacity>
```

### Focus Management (Mobile)

- Use `accessibilityRole` to announce element type
- `accessibilityLabel` for custom descriptions
- `accessibilityHint` for additional context

```typescript
<Button
  accessibilityLabel="Save workout"
  accessibilityHint="Double tap to save"
  accessibilityRole="button"
>
  Save
</Button>
```

### Screen Reader (Mobile)

- **VoiceOver** (iOS): Swipe to navigate, double-tap to select
- **TalkBack** (Android): Similar gestures

Test on real device (not just simulator):
- Turn on VoiceOver/TalkBack
- Navigate entire app without looking
- Verify all content is announced correctly

### Dynamic Font Sizes

Support system font size settings:
- Use `rem` units (NativeWind supports this)
- Don't hardcode heights that clip text
- Test with largest accessibility font size

```typescript
// NativeWind uses rem (root em)
// Scales with system font size setting
<Text className="text-base">This scales</Text>
```

### Haptic Feedback

Provide haptic feedback for important actions:

```typescript
import * as Haptics from 'expo-haptics';

const handlePress = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  // Action
};
```

---

## Common Issues & Solutions

### Issue: Low Contrast Text

**Problem**: Gray text on dark background doesn't meet 4.5:1 ratio

**Solution**:
- Use `text-gray-300` instead of `text-gray-500` on dark backgrounds
- Verify with contrast checker

### Issue: Missing Labels

**Problem**: Screen reader users can't identify form fields

**Solution**:
- Every `<input>` must have associated `<label>`
- For icon-only buttons, add `aria-label`

### Issue: Keyboard Trap (Web)

**Problem**: Focus stuck in modal or dropdown

**Solution**:
- Modal: Trap focus within, allow `Escape` to close
- Dropdown: Close on `Escape`, focus returns to trigger

### Issue: Focus Not Visible

**Problem**: Custom styled buttons lose default focus ring

**Solution**:
- Add custom focus style: `focus:ring-2 focus:ring-primary-500`
- Don't use `outline: none` without replacement

### Issue: Color Only Status

**Problem**: "Red" error message not announced to screen readers

**Solution**:
- Include text: "Error: Invalid email"
- Add `role="alert"` for auto-announcement

### Issue: Images Without Alt Text

**Problem**: Screen readers read filename or ignore image

**Solution**:
- Informative: `alt="User workout progress chart"`
- Decorative: `alt=""` (or `aria-hidden="true"`)

### Issue: Non-semantic HTML

**Problem**: Using `<div>` for everything

**Solution**:
- Use semantic elements: `<nav>`, `<main>`, `<header>`, `<footer>`
- Buttons: `<button>`, Links: `<a>`
- Form controls: `<input>`, `<select>`, `<textarea>`

---

## Accessibility Checklist

### Before Merging PR

- [ ] All images have appropriate `alt` text
- [ ] All form inputs have labels
- [ ] Color contrast meets WCAG AA (4.5:1 text, 3:1 UI)
- [ ] All interactive elements keyboard accessible (web)
- [ ] Focus is visible and logical
- [ ] Modal dialogs trap focus and close on Escape
- [ ] Screen reader tested (at least basic navigation)
- [ ] No color-only information
- [ ] Text resizes without breaking layout (200% test)
- [ ] Touch targets ≥44×44 (mobile)

### Component-specific

- **Button**: `<button>` element, not `<div>`
- **Link**: `<a>` with `href`, not `onClick` only
- **Input**: `<label>` with `htmlFor`/`id`
- **Modal**: `role="dialog"`, `aria-modal="true"`, focus trap
- **Card (clickable)**: `<button>` wrapping card
- **Icon-only**: `aria-label`

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/TR/WCAG21/)
- [WebAIM Accessibility Checklist](https://webaim.org/standards/wcag/checklist)
- [React Accessibility](https://reactjs.org/docs/accessibility.html)
- [Expo Accessibility](https://docs.expo.dev/guides/accessibility/)
- [A11Y Project](https://www.a11yproject.com/)
- [axe DevTools](https://www.deque.com/axe/devtools/)

---

**Questions?** Contact the design team or file an issue in GitHub.

**Need help testing?** Use automated tools first, then manual screen reader testing.

---

**Document Status**: Complete  
**Maintainer**: Technical-docs + Design Team  
**Review Cycle**: Quarterly
