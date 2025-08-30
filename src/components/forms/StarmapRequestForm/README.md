# StarmapRequestForm Component

A modern, two-phase static data collection form for capturing Starmap request information. The form is Material UI-inspired, fully accessible, and responsive.

## Usage

```tsx
import { StarmapRequestForm } from '@/components/forms/StarmapRequestForm'
import type { StarmapRequestData } from '@/components/forms/StarmapRequestForm'

function MyPage() {
  const handleComplete = (data: StarmapRequestData) => {
    console.log('Form submitted:', data)
    // Handle the submission data
  }

  return (
    <StarmapRequestForm 
      onComplete={handleComplete}
      initialStep="requestor" // Optional: 'requestor' | 'group'
    />
  )
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onComplete` | `(data: StarmapRequestData) => void` | - | Callback fired when form is successfully submitted |
| `initialStep` | `'requestor' \| 'group'` | `'requestor'` | Initial step to display |

## Data Structure

The form collects data in two phases:

### Phase 1: Requestor Information
```typescript
interface RequestorInfo {
  fullName: string
  workEmail: string
  role?: string
  phone?: string
  preferredContact: 'email' | 'phone' | 'other'
  context: string
}
```

### Phase 2: Group Information
```typescript
interface GroupInfo {
  groupName: string
  groupType: 'team' | 'organization' | 'department' | 'school' | 'program' | 'club' | 'other'
  industry: IndustryType
  size: '1-10' | '11-50' | '51-200' | '201-1000' | '1000+' | 'not-sure'
  primaryStakeholders: string[]
  desiredOutcomes: string
  timelineTarget?: string
  constraints?: string
}
```

### Complete Submission
```typescript
interface StarmapRequestData {
  requestor: RequestorInfo
  group: GroupInfo
}
```

## Features

- **Two-phase flow**: Smooth animated transitions between steps
- **Progress indicator**: Visual progress with clickable steps
- **Validation**: Real-time field validation with accessible error messages
- **Responsive**: Works on all screen sizes (320px+)
- **Accessible**: WCAG 2.1 AA compliant with proper ARIA labels
- **Motion-aware**: Respects `prefers-reduced-motion` preference
- **Keyboard navigation**: Full keyboard support
- **Touch-friendly**: Minimum 44px touch targets

## Deep Linking

The form supports deep linking to step 2 via query parameter:
- `/portal/begin-discovery` - Start at step 1
- `/portal/begin-discovery?step=2` - Start at step 2 (if step 1 data exists)

## Validation Rules

### Requestor Information
- **Full Name**: Required, minimum 2 characters
- **Work Email**: Required, valid email format
- **Phone**: Optional, basic international format validation
- **Preferred Contact**: Required selection
- **Context**: Required, 50-600 characters

### Group Information
- **Group Name**: Required, minimum 2 characters
- **Group Type**: Required selection
- **Industry**: Required selection
- **Size**: Required selection
- **Stakeholders**: At least one required
- **Desired Outcomes**: Required, 50-1000 characters
- **Timeline**: Optional
- **Constraints**: Optional

## Styling

The component uses the project's existing design system:
- Dark theme with `--bg`, `--primary`, and `--text` CSS variables
- Tailwind CSS utility classes
- Custom animations from `animations.css`
- Material UI-inspired input and button styles

## Accessibility

- All form fields have explicit labels
- Error messages are announced via `aria-live`
- Focus indicators meet WCAG contrast requirements
- Progress indicator is keyboard navigable
- Form submission states are clearly communicated

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)
