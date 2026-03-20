# Memory Editing UI/UX Mockups

## Overview
This document provides visual descriptions and ASCII mockups of the proposed UI changes for chat-based memory editing and knowledge graph integration.

---

## 1. Chat Interface with Memory Commands

### Current State
```
┌─────────────────────────────────────────────┐
│  💬 Chat                                    │
├─────────────────────────────────────────────┤
│                                             │
│  User: What medications am I taking?        │
│                                             │
│  AI: Based on your records, you're taking:  │
│      • Metformin 500mg daily                │
│      • Lisinopril 10mg daily                │
│                                             │
│  [Type a message...]                        │
└─────────────────────────────────────────────┘
```

### Proposed State with Command Detection
```
┌─────────────────────────────────────────────┐
│  💬 Chat                                    │
├─────────────────────────────────────────────┤
│                                             │
│  User: I was never prescribed Metformin     │
│                                             │
│  AI: 🔍 I found these facts about Metformin:│
│  ┌───────────────────────────────────────┐ │
│  │ ✓ Fact #1                             │ │
│  │   "Patient takes Metformin 500mg      │ │
│  │    daily for Type 2 Diabetes"         │ │
│  │   Confidence: 95% | Date: 2024-01-15  │ │
│  │   Source: Medical Record              │ │
│  │                                       │ │
│  │ ✓ Fact #2                             │ │
│  │   "Metformin prescribed by Dr. Smith" │ │
│  │   Confidence: 90% | Date: 2024-01-15  │ │
│  │   Source: Prescription Record         │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  Would you like me to remove these facts?   │
│  [Remove All] [Remove #1] [Remove #2] [Cancel]│
│                                             │
│  [Type a message...]                        │
└─────────────────────────────────────────────┘
```

### After Confirmation
```
┌─────────────────────────────────────────────┐
│  💬 Chat                                    │
├─────────────────────────────────────────────┤
│                                             │
│  User: Remove all                           │
│                                             │
│  AI: ✓ Successfully removed 2 facts about   │
│      Metformin.                             │
│                                             │
│      Your knowledge graph has been updated. │
│      [View Changes] [Undo]                  │
│                                             │
│  [Type a message...]                        │
└─────────────────────────────────────────────┘
```

---

## 2. Knowledge Graph with Integrated Chat

### Layout Option A: Side Panel
```
┌────────────────────────────────────────────────────────────┐
│  🕸️ Knowledge Graph                    [💬 Chat] [⚙️]      │
├────────────────────────────────────────┬───────────────────┤
│                                        │  💬 Graph Chat    │
│         ●─────●                        ├───────────────────┤
│        ╱│╲   ╱│╲                       │                   │
│       ● │ ● ● │ ●                      │  User: Show me    │
│      ╱  │  ╲│╱  │╲                     │  all medications  │
│     ●   ●   ●   ●  ●                   │                   │
│          ╲ ╱│╲ ╱                       │  AI: I found 3    │
│           ●  │  ●                      │  medications:     │
│              ●                         │  • Metformin      │
│                                        │  • Lisinopril     │
│  [Metformin] node selected             │  • Aspirin        │
│  Confidence: 95%                       │                   │
│  Type: Medication                      │  [Highlighted in  │
│  Connected to: Type 2 Diabetes         │   graph →]        │
│                                        │                   │
│  [Edit] [Delete] [Add Relationship]    │  [Type...]        │
└────────────────────────────────────────┴───────────────────┘
```

### Layout Option B: Overlay Chat
```
┌────────────────────────────────────────────────────────────┐
│  🕸️ Knowledge Graph                              [💬] [⚙️]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│         ●─────●                    ┌──────────────────┐   │
│        ╱│╲   ╱│╲                   │ 💬 Quick Chat    │   │
│       ● │ ● ● │ ●                  ├──────────────────┤   │
│      ╱  │  ╲│╱  │╲                 │ User: Delete     │   │
│     ●   ●   ●   ●  ●               │ Metformin        │   │
│          ╲ ╱│╲ ╱                   │                  │   │
│           ●  │  ●                  │ AI: Confirm?     │   │
│              ●                     │ [Yes] [No]       │   │
│                                    └──────────────────┘   │
│                                                            │
│  Timeline: [────●────●────●────●────] 2024                │
└────────────────────────────────────────────────────────────┘
```

---

## 3. Node Context Menu

### Right-Click Menu
```
┌────────────────────────────────────────┐
│         ●─────●                        │
│        ╱│╲   ╱│╲                       │
│       ● │ ● ● │ ●                      │
│      ╱  │  ╲│╱  │╲                     │
│     ●   ●   ●   ●  ●                   │
│          ╲ ╱│╲ ╱                       │
│           ●  │  ●                      │
│         [Metformin]                    │
│              │                         │
│         ┌────▼──────────────┐          │
│         │ ✏️  Edit Fact      │          │
│         │ 🎚️  Adjust Conf.  │          │
│         │ 📄  View Sources   │          │
│         │ 🔗  Add Relation   │          │
│         │ ───────────────   │          │
│         │ 🗑️  Delete        │          │
│         └───────────────────┘          │
└────────────────────────────────────────┘
```

---

## 4. Node Edit Modal

### Full Edit Interface
```
┌──────────────────────────────────────────────────────────┐
│  ✏️  Edit Fact: Metformin                      [×]       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Fact Type: [Medication ▼]                              │
│                                                          │
│  Content:                                                │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Patient takes Metformin 500mg daily for Type 2     │ │
│  │ Diabetes                                           │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Confidence: [────────●──] 95%                          │
│                                                          │
│  Fact Date: [2024-01-15] 📅                             │
│                                                          │
│  Sources (2):                                            │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 📄 Medical Record - Dr. Smith                      │ │
│  │    Uploaded: 2024-01-15                            │ │
│  │    Confidence: 95%                                 │ │
│  │                                                    │ │
│  │ 📄 Prescription Record                             │ │
│  │    Uploaded: 2024-01-15                            │ │
│  │    Confidence: 90%                                 │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Relationships (1):                                      │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Metformin → treats → Type 2 Diabetes (90%)         │ │
│  │ [Edit] [Delete]                                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  [Add Relationship]                                      │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ ⚠️  Changes will be reflected in your knowledge    │ │
│  │    graph and future AI responses.                  │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│              [Cancel]  [Save Changes]                    │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Relationship Editor

### Creating New Relationship
```
┌──────────────────────────────────────────────────────────┐
│  🔗 Create Relationship                          [×]     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  From:                                                   │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 💊 Metformin                                       │ │
│  │ Type: Medication                                   │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Relationship Type:                                      │
│  [treats ▼]                                             │
│   • treats                                               │
│   • causes                                               │
│   • diagnosed_with                                       │
│   • prescribed_for                                       │
│   • contraindicated_with                                 │
│                                                          │
│  To:                                                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 🏥 Type 2 Diabetes                                 │ │
│  │ Type: Medical Condition                            │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Confidence: [──────●────] 85%                          │
│                                                          │
│  Source: [User Stated ▼]                                │
│                                                          │
│  Notes (optional):                                       │
│  ┌────────────────────────────────────────────────────┐ │
│  │                                                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│              [Cancel]  [Create Relationship]             │
└──────────────────────────────────────────────────────────┘
```

---

## 6. Batch Operations Interface

### Bulk Delete Confirmation
```
┌──────────────────────────────────────────────────────────┐
│  🗑️  Batch Delete Confirmation                  [×]     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  You're about to delete 5 facts about "diabetes":       │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ ☑ Diagnosed with Type 2 Diabetes (95%)             │ │
│  │ ☑ Diabetes managed with Metformin (90%)            │ │
│  │ ☑ HbA1c level 7.2% (85%)                           │ │
│  │ ☑ Family history of diabetes (80%)                 │ │
│  │ ☑ Diabetes diagnosed in 2020 (95%)                 │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  This will also affect:                                  │
│  • 3 related medications                                 │
│  • 7 relationships in knowledge graph                    │
│  • 12 memories mentioning diabetes                       │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ ⚠️  This action can be undone within 30 days       │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  [Select All] [Deselect All]                            │
│                                                          │
│              [Cancel]  [Delete Selected (5)]             │
└──────────────────────────────────────────────────────────┘
```

---

## 7. Undo System

### Undo Notification
```
┌────────────────────────────────────────────────────────────┐
│  💬 Chat                                                   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  User: forget about Metformin                              │
│                                                            │
│  AI: ✓ Removed 2 facts about Metformin                    │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ↩️  Undo available for 30 days                       │ │
│  │ [Undo Now] [View Deleted Items]                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  [Type a message...]                                       │
└────────────────────────────────────────────────────────────┘
```

### Deleted Items Manager
```
┌──────────────────────────────────────────────────────────┐
│  🗑️  Deleted Items                               [×]     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [All ▼] [Facts] [Memories] [Relationships]             │
│  Search: [________________] 🔍                           │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 📋 Fact - Deleted 2 hours ago                      │ │
│  │ "Patient takes Metformin 500mg daily"              │ │
│  │ Deleted by: "forget about Metformin"               │ │
│  │ Expires: 29 days, 22 hours                         │ │
│  │ [Restore] [Delete Permanently]                     │ │
│  ├────────────────────────────────────────────────────┤ │
│  │ 🧠 Memory - Deleted 1 day ago                      │ │
│  │ "User prefers morning medication schedule"         │ │
│  │ Deleted by: Manual deletion                        │ │
│  │ Expires: 29 days                                   │ │
│  │ [Restore] [Delete Permanently]                     │ │
│  ├────────────────────────────────────────────────────┤ │
│  │ 🔗 Relationship - Deleted 3 days ago               │ │
│  │ "Aspirin → treats → Headache"                      │ │
│  │ Deleted by: Graph edit                             │ │
│  │ Expires: 27 days                                   │ │
│  │ [Restore] [Delete Permanently]                     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Showing 3 of 8 deleted items                            │
│                                                          │
│              [Close]  [Empty Trash]                      │
└──────────────────────────────────────────────────────────┘
```

---

## 8. Command Suggestions

### Smart Command Detection
```
┌────────────────────────────────────────────────────────────┐
│  💬 Chat                                                   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  User: I don't take that anymore                           │
│                                                            │
│  AI: I noticed you might want to update your medications.  │
│      Which medication would you like to remove?            │
│                                                            │
│      Quick actions:                                        │
│      [Remove Metformin] [Remove Lisinopril]               │
│      [Remove Aspirin] [Show All Medications]              │
│                                                            │
│  [Type a message...]                                       │
└────────────────────────────────────────────────────────────┘
```

---

## 9. Visual Feedback in Graph

### Node State Changes

#### Before Deletion
```
     ●─────●
    ╱│╲   ╱│╲
   ● │ ● ● │ ●
  ╱  │  ╲│╱  │╲
 ●   ●   ●   ●  ●
      ╲ ╱│╲ ╱
       ●  │  ●
          ●
   [Metformin] - Normal state
```

#### During Deletion (Animated)
```
     ●─────●
    ╱│╲   ╱│╲
   ● │ ● ● │ ●
  ╱  │  ╲│╱  │╲
 ●   ●   ◌   ●  ●  ← Fading out
      ╲ ╱│╲ ╱
       ●  │  ●
          ●
   [Metformin] - Opacity: 50%
```

#### After Deletion
```
     ●─────●
    ╱│╲   ╱│╲
   ● │ ● ● │ ●
  ╱  │  ╲│╱  │╲
 ●   ●       ●  ●  ← Node removed
      ╲ ╱│╲ ╱
       ●  │  ●
          ●
   Relationships reconnected
```

#### Confidence Update (Pulsing)
```
     ●─────●
    ╱│╲   ╱│╲
   ● │ ● ● │ ●
  ╱  │  ╲│╱  │╲
 ●   ●   ◉   ●  ●  ← Pulsing animation
      ╲ ╱│╲ ╱
       ●  │  ●
          ●
   [Metformin] - Confidence: 95% → 80%
   Color: Blue → Yellow
```

---

## 10. Mobile Responsive Design

### Mobile Graph with Chat
```
┌─────────────────────────┐
│ 🕸️ Knowledge Graph  [💬]│
├─────────────────────────┤
│                         │
│      ●─────●            │
│     ╱│╲   ╱│╲           │
│    ● │ ● ● │ ●          │
│   ╱  │  ╲│╱  │╲         │
│  ●   ●   ●   ●  ●       │
│       ╲ ╱│╲ ╱            │
│        ●  │  ●           │
│           ●              │
│                         │
│  [Metformin] selected   │
│  Tap to edit            │
│                         │
├─────────────────────────┤
│ 💬 Chat (collapsed)     │
│ "Show medications"      │
└─────────────────────────┘

Tap chat to expand:

┌─────────────────────────┐
│ 💬 Chat            [×]  │
├─────────────────────────┤
│ User: Show medications  │
│                         │
│ AI: Found 3:            │
│ • Metformin             │
│ • Lisinopril            │
│ • Aspirin               │
│                         │
│ [Type message...]       │
└─────────────────────────┘
```

---

## Color Coding System

### Confidence Levels
```
High (90-100%):   ● Green (#10b981)
Medium (70-89%):  ● Blue (#3b82f6)
Low (50-69%):     ● Yellow (#f59e0b)
Very Low (<50%):  ● Red (#ef4444)
```

### Node Types
```
Medication:       💊 Purple (#a855f7)
Condition:        🏥 Red (#ef4444)
Procedure:        🔬 Blue (#3b82f6)
Allergy:          ⚠️  Orange (#f97316)
Lifestyle:        🏃 Green (#10b981)
Family History:   👨‍👩‍👧‍👦 Teal (#14b8a6)
```

### Relationship Types
```
treats:           ──→ Solid green
causes:           ──→ Solid red
diagnosed_with:   ──→ Dashed blue
prescribed_for:   ──→ Solid purple
contraindicated:  ──→ Dashed red
```

---

## Accessibility Features

### Keyboard Shortcuts
```
Graph Navigation:
  Tab         - Cycle through nodes
  Enter       - Select/edit node
  Delete      - Delete selected node
  Ctrl+Z      - Undo last action
  Ctrl+F      - Search graph
  Escape      - Close modal/deselect

Chat:
  Ctrl+/      - Toggle chat panel
  Ctrl+K      - Focus chat input
  ↑/↓         - Navigate command history
```

### Screen Reader Support
```
Node announcement:
"Metformin, medication node, confidence 95%, 
 connected to Type 2 Diabetes, 2 sources available"

Action announcement:
"Fact deleted successfully, undo available"

Relationship announcement:
"Metformin treats Type 2 Diabetes, confidence 90%"
```

---

## Animation Timing

```
Node fade out:        300ms ease-out
Node pulse:           500ms ease-in-out (2 cycles)
Confidence change:    400ms ease-in-out
Relationship draw:    600ms ease-in-out
Modal open:           200ms ease-out
Modal close:          150ms ease-in
Chat panel slide:     250ms ease-out
Notification:         3000ms (auto-dismiss)
```

---

**Status**: Design Mockups  
**Created**: 2026-03-16  
**Purpose**: Visual guide for implementation  
**Next Steps**: Review with team, refine based on feedback
