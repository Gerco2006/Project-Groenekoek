# TravNL Design Guidelines

## Design Approach
**Reference-Based Approach** drawing from modern transport and utility apps (NS Reisplanner, Citymapper, Google Maps transit) combined with the specified modern aesthetic featuring rounded corners, blur effects, and glassmorphic elements.

## Core Design Principles
1. **Information Clarity First**: Transit data must be instantly scannable with clear hierarchy
2. **Progressive Disclosure**: Expandable sections reveal details without overwhelming
3. **Modern Dutch Aesthetic**: Clean, functional design with contemporary blur effects and rounded elements
4. **Touch-Friendly**: Large tap targets for mobile-first journey planning

## Typography System
- **Primary Font**: Inter or SF Pro Display (via Google Fonts CDN)
- **Hierarchy**:
  - Hero/Page Titles: text-3xl md:text-4xl font-bold
  - Section Headers: text-xl md:text-2xl font-semibold
  - Station Names: text-lg font-semibold
  - Times/Details: text-base font-medium
  - Secondary Info: text-sm text-gray-600 dark:text-gray-400
  - Platform Numbers: text-lg font-bold (prominent display)

## Layout System
**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, and 12 (p-2, m-4, gap-6, py-8, mb-12)

**Container Strategy**:
- Main content: max-w-4xl mx-auto px-4
- Cards/Results: Full width within container with p-4 to p-6
- Compact mobile spacing, generous desktop breathing room

## Component Library

### Navigation
- Bottom tab bar for mobile (4 tabs: Planner, Departures, More)
- Top navigation for desktop with clear active states
- Icons from Heroicons (outline for inactive, solid for active)

### Journey Planner (Default View)
- Station search inputs with autocomplete dropdowns
- From/To inputs with swap button between them
- Date/time selector (default: now, with quick options)
- Search button: full-width on mobile, inline on desktop
- Results list with expandable cards showing trip options

### Trip Result Cards
- Compact collapsed state showing: departure time, arrival time, duration, transfers
- Color-coded train type indicators (left border accent)
- Expand reveals: detailed timeline, platform numbers, walking times, train details
- Each train segment clickable to view full journey details
- Timeline visualization with dots and connecting lines

### Departure Board View
- Station selector at top with current selection displayed prominently
- Live updating departure list (refresh indicator)
- Each departure row: time, destination, platform, train type badge, track changes
- Delay indicators in contrasting treatment
- Filter options: train type, direction

### Train Detail View
- Train number and type header with color-coded badge
- Route timeline showing all stops with arrival/departure times
- Current position indicator (if real-time data available)
- Crowding forecast indicators per section
- Facilities icons (accessible, quiet zone, wifi)

### Settings/More Page
- Large section cards with icons
- Dark/Light mode toggle switch (prominent placement)
- About section with project description
- GitHub contribution link with external icon
- Version information

## Visual Treatment

### Glassmorphic Elements
- Search bars: backdrop-blur-md with semi-transparent background
- Navigation bars: backdrop-blur-lg bg-white/80 dark:bg-gray-900/80
- Floating action buttons on images: backdrop-blur-md

### Rounded Corners
- Cards: rounded-xl (12px)
- Buttons: rounded-lg (8px)
- Inputs: rounded-lg (8px)
- Badges: rounded-full
- Modals/Overlays: rounded-2xl (16px)

### Shadows
- Cards: shadow-sm for default, shadow-md for elevated states
- Floating elements: shadow-lg
- Active/focused states: shadow-outline with brand accent

### Train Type Indicators
- Intercity: Yellow accent (left border-l-4, badges)
- Sprinter: Blue accent
- Non-NS: Green accent
- Visual distinction through color-coded left borders and pill badges

### Interactive States
- Expandable cards: Smooth height transitions (transition-all duration-300)
- Hover states: Slight scale or background change
- Loading states: Skeleton screens with pulse animation
- Pull-to-refresh on mobile departure boards

## Responsive Behavior
- **Mobile (base)**: Single column, bottom navigation, full-width cards
- **Tablet (md:)**: Wider containers, side-by-side for from/to inputs
- **Desktop (lg:)**: max-w-4xl centered layout, top navigation, multi-column for station search results

## Accessibility
- ARIA labels for all interactive elements
- Focus indicators on all inputs and buttons
- Sufficient color contrast for text (WCAG AA minimum)
- Keyboard navigation support for expandable sections
- Screen reader announcements for live departure updates

## Images
**Hero Section**: Not applicable for utility app - prioritize immediate functionality with search interface at top

**Supplemental Images**:
- About/More page: Hero image showing modern Dutch trains or stations (optional background with text overlay)
- Empty states: Friendly illustrations for "no results found" or "select a station"
- Train type badges: Small train icons next to type labels (use icon library)

## Performance Considerations
- Lazy load expanded trip details
- Virtualized lists for long departure boards
- Optimistic UI updates for instant feedback
- Cache recent searches and station names locally