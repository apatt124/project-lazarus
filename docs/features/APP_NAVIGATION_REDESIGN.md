# App Navigation & Layout Redesign Proposal

## Current State Inventory

### Existing Features
1. **Chat Interface** - Main feature, AI medical assistant
2. **Document Upload** - Upload medical documents
3. **Knowledge Graph** - Visualize relationships between facts
4. **User Facts Panel** - View extracted medical facts
5. **Conversation History** - Pinned and historical chats
6. **Theme Selector** - Multiple color themes
7. **Memory Commands** - Natural language fact editing (Phase 1 implemented)

### Current Navigation Structure
```
Login Page
  └─> App Page (Single View)
       ├─ Sidebar (collapsible)
       │   ├─ New Chat
       │   ├─ Pinned Conversations
       │   ├─ History
       │   ├─ Theme Selector
       │   └─ Logout
       └─ Chat Interface (full screen)
           └─ Components accessed via ???
```

### Current Issues
1. **No clear navigation** to Knowledge Graph, Document Upload, or Facts Panel
2. **Single-view limitation** - Everything competes for the same space
3. **Mobile-unfriendly** - Sidebar takes full width, no bottom nav
4. **Feature discovery** - Users don't know about Knowledge Graph or other features
5. **Context switching** - Can't reference graph while chatting
6. **No visual hierarchy** - All features treated equally

---

## Proposed Solution: Mobile-First Bottom Navigation

### Design Philosophy
- **Mobile-first**: Bottom navigation for thumb-friendly access
- **Progressive disclosure**: Show what's needed, hide what's not
- **Context preservation**: Allow multi-view when screen permits
- **Clear hierarchy**: Chat is primary, others are secondary

### New Navigation Structure

```
┌─────────────────────────────────┐
│  Header (Logo, Settings, User)  │
├─────────────────────────────────┤
│                                 │
│     Main Content Area           │
│     (Changes based on nav)      │
│                                 │
│                                 │
├─────────────────────────────────┤
│  Bottom Navigation (Mobile)     │
│  [Chat] [Graph] [Docs] [Facts]  │
└─────────────────────────────────┘
```

### Navigation Items

#### 1. Chat (Primary)
- **Icon**: Message bubble
- **Purpose**: Main AI assistant interface
- **Features**:
  - Conversation history sidebar (slide-in)
  - Memory commands
  - Document analysis
  - Quick actions

#### 2. Knowledge Graph
- **Icon**: Network/nodes
- **Purpose**: Visualize medical relationships
- **Features**:
  - Interactive graph
  - Timeline slider
  - Filters and search
  - Node details panel
  - Layout options

#### 3. Documents
- **Icon**: Document/folder
- **Purpose**: Upload and manage medical documents
- **Features**:
  - Upload interface
  - Document list
  - Processing status
  - Document viewer

#### 4. Facts
- **Icon**: List/database
- **Purpose**: View and manage extracted facts
- **Features**:
  - Searchable fact list
  - Fact categories
  - Edit/delete facts
  - Source documents

#### 5. Settings (Header)
- **Icon**: Gear/cog
- **Purpose**: App configuration
- **Features**:
  - Theme selector
  - Account settings
  - Privacy settings
  - About/help

---

## Detailed Component Layouts

### Mobile Layout (< 768px)

#### Bottom Navigation Bar
```
┌─────────────────────────────────┐
│ [💬 Chat] [🕸️ Graph] [📄 Docs] [📋 Facts] │
└─────────────────────────────────┘
```

- Fixed at bottom
- 4 main items
- Active state highlighted
- Badge for notifications
- Smooth transitions

#### Chat View (Mobile)
```
┌─────────────────────────────────┐
│ ☰ Project Lazarus        ⚙️ 👤 │ Header
├─────────────────────────────────┤
│                                 │
│   Chat Messages                 │
│   (Full height)                 │
│                                 │
│                                 │
├─────────────────────────────────┤
│ [Type message...]         [Send]│ Input
├─────────────────────────────────┤
│ [💬] [🕸️] [📄] [📋]              │ Nav
└─────────────────────────────────┘
```

#### Knowledge Graph View (Mobile)
```
┌─────────────────────────────────┐
│ ← Knowledge Graph        🔍 ⚙️  │ Header
├─────────────────────────────────┤
│                                 │
│   Graph Visualization           │
│   (Full screen)                 │
│   Pinch to zoom                 │
│                                 │
├─────────────────────────────────┤
│ [Filters] [Layout] [Timeline]   │ Controls
├─────────────────────────────────┤
│ [💬] [🕸️] [📄] [📋]              │ Nav
└─────────────────────────────────┘
```

### Tablet Layout (768px - 1024px)

#### Split View Option
```
┌─────────────────────────────────────────┐
│ ☰ Project Lazarus              ⚙️ 👤   │
├──────────────────┬──────────────────────┤
│                  │                      │
│   Chat           │   Knowledge Graph    │
│   (60%)          │   (40%)              │
│                  │                      │
│                  │                      │
├──────────────────┴──────────────────────┤
│ [💬 Chat] [🕸️ Graph] [📄 Docs] [📋 Facts] │
└─────────────────────────────────────────┘
```

### Desktop Layout (> 1024px)

#### Sidebar + Main Content
```
┌──────┬──────────────────────────────────┐
│      │ Project Lazarus          ⚙️ 👤   │
│ Nav  ├──────────────────────────────────┤
│ Bar  │                                  │
│      │   Main Content Area              │
│ 💬   │   (Changes based on selection)   │
│ 🕸️   │                                  │
│ 📄   │                                  │
│ 📋   │                                  │
│      │                                  │
│ ⚙️   │                                  │
└──────┴──────────────────────────────────┘
```

- Persistent left sidebar
- Larger content area
- Optional right panel for details
- Keyboard shortcuts

---

## Feature-Specific Improvements

### 1. Chat Interface

#### Mobile Enhancements
- **Swipe gestures**: Swipe right to open conversation history
- **Quick actions**: Long-press message for options
- **Voice input**: Microphone button for voice-to-text
- **Attachment button**: Quick access to upload documents
- **Memory commands**: Visual feedback for "forget", "show", etc.

#### Desktop Enhancements
- **Split view**: Chat + Graph side-by-side
- **Keyboard shortcuts**: Cmd+K for new chat, Cmd+/ for search
- **Rich formatting**: Better markdown rendering
- **Code blocks**: Syntax highlighting for medical codes

### 2. Knowledge Graph

#### Mobile Enhancements
- **Touch gestures**: Pinch to zoom, two-finger pan
- **Bottom sheet**: Node details slide up from bottom
- **Simplified controls**: Collapsible filter panel
- **Quick filters**: Chips for common filters (medications, conditions)
- **Orientation support**: Landscape mode for better viewing

#### Desktop Enhancements
- **Sidebar filters**: Persistent filter panel
- **Right panel**: Node details without covering graph
- **Minimap**: Overview of full graph
- **Export options**: Save as image, PDF

### 3. Documents

#### Mobile Enhancements
- **Camera integration**: Take photos of documents
- **Drag & drop**: Easy file upload
- **Processing status**: Real-time progress indicators
- **Thumbnail view**: Grid of uploaded documents
- **Quick actions**: Swipe to delete, share

#### Desktop Enhancements
- **Bulk upload**: Multiple files at once
- **Document viewer**: Preview before processing
- **Folder organization**: Group related documents
- **Search**: Find documents by content

### 4. Facts Panel

#### Mobile Enhancements
- **Card view**: Swipeable fact cards
- **Quick filters**: Filter by type, date, source
- **Search**: Full-text search across facts
- **Inline editing**: Tap to edit fact
- **Source links**: Jump to source document

#### Desktop Enhancements
- **Table view**: Sortable columns
- **Bulk actions**: Select multiple facts
- **Advanced filters**: Complex queries
- **Export**: CSV, JSON export

---

## Implementation Priority

### Phase 1: Core Navigation (Week 1)
1. Create bottom navigation component
2. Implement route-based navigation
3. Add mobile-responsive header
4. Update sidebar for desktop

### Phase 2: Mobile Optimization (Week 2)
1. Touch gestures for graph
2. Swipe navigation for chat history
3. Bottom sheets for details
4. Mobile-optimized forms

### Phase 3: Desktop Enhancements (Week 3)
1. Split-view layouts
2. Keyboard shortcuts
3. Persistent sidebars
4. Advanced features

### Phase 4: Polish & Testing (Week 4)
1. Animations and transitions
2. Loading states
3. Error handling
4. Cross-device testing

---

## Technical Implementation

### New Components Needed

```typescript
// Navigation
- BottomNavigation.tsx
- TopHeader.tsx
- NavigationProvider.tsx (context for current view)

// Layouts
- MobileLayout.tsx
- TabletLayout.tsx
- DesktopLayout.tsx
- ResponsiveLayout.tsx (wrapper)

// Views
- ChatView.tsx (refactor existing)
- GraphView.tsx (wrap KnowledgeGraph)
- DocumentsView.tsx (new)
- FactsView.tsx (wrap UserFactsPanel)
- SettingsView.tsx (new)

// Shared
- BottomSheet.tsx (mobile modals)
- SplitView.tsx (tablet/desktop)
- QuickActions.tsx (floating action button)
```

### Routing Structure

```typescript
/app
  /chat (default)
  /graph
  /documents
  /facts
  /settings
```

### State Management

```typescript
// Navigation context
interface NavigationContext {
  currentView: 'chat' | 'graph' | 'documents' | 'facts';
  setView: (view: string) => void;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}
```

---

## Design System Updates

### Colors & Spacing
- **Touch targets**: Minimum 44x44px for mobile
- **Spacing**: 8px grid system
- **Typography**: Responsive font sizes
- **Shadows**: Elevation system for depth

### Animations
- **Page transitions**: Slide in/out (300ms)
- **Bottom nav**: Scale on tap (150ms)
- **Modals**: Slide up from bottom (250ms)
- **Loading**: Skeleton screens

### Accessibility
- **ARIA labels**: All interactive elements
- **Keyboard navigation**: Tab order, focus states
- **Screen readers**: Semantic HTML
- **Color contrast**: WCAG AA compliance

---

## User Flow Examples

### Scenario 1: Upload Document → View Facts → Explore Graph
```
1. User taps [📄 Docs] in bottom nav
2. Taps "Upload" button
3. Selects document from camera/files
4. Sees processing progress
5. Notification: "5 facts extracted"
6. Taps notification → navigates to [📋 Facts]
7. Reviews extracted facts
8. Taps "View in Graph" on a fact
9. Navigates to [🕸️ Graph] with fact highlighted
```

### Scenario 2: Chat → Reference Graph → Continue Chat
```
1. User asks question in [💬 Chat]
2. AI mentions a relationship
3. User taps [🕸️ Graph] to visualize
4. Explores connections
5. Taps [💬 Chat] to return
6. Chat history preserved
7. Continues conversation with context
```

---

## Success Metrics

### User Engagement
- Time spent in each view
- Navigation patterns
- Feature discovery rate
- Return user rate

### Performance
- Page load time < 1s
- Navigation transition < 300ms
- Touch response < 100ms
- Graph render time < 2s

### Usability
- Task completion rate
- Error rate
- User satisfaction score
- Mobile vs desktop usage

---

## Next Steps

1. **Review & Approve**: Stakeholder review of proposal
2. **Design Mockups**: Create high-fidelity designs
3. **Prototype**: Build interactive prototype
4. **User Testing**: Test with target users
5. **Implementation**: Follow phased approach
6. **Launch**: Gradual rollout with feature flags

---

**Created**: March 17, 2026  
**Status**: Proposal - Awaiting Review  
**Priority**: HIGH - Improves core UX  
**Effort**: 4 weeks (phased implementation)
