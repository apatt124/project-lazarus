# Memory Commands - Quick Reference Card

## 🧠 What Are Memory Commands?

Memory commands let you manage your medical facts and memories using natural language in the chat. Just tell the system what you want to change, and it will help you do it safely.

---

## 🗑️ Forget/Remove Commands

Use these to remove incorrect or outdated information.

### Examples:
```
"I was never prescribed Metformin"
"forget that I take aspirin"
"I don't have diabetes"
"remove that medication"
"delete the fact about my allergy"
"I never had high blood pressure"
"that's wrong about my condition"
```

### What Happens:
1. System searches for matching items
2. Shows you what it found
3. Asks for confirmation
4. Removes items after you confirm

---

## ✅ Confirmation Commands

Use these to confirm an action.

### Examples:
```
"yes"
"confirm"
"remove all"
"delete them"
"do it"
```

---

## ❌ Cancellation Commands

Use these to cancel an action.

### Examples:
```
"no"
"cancel"
"nevermind"
"don't do that"
"stop"
```

---

## 📋 Show/List Commands

Use these to view your information.

### Examples:
```
"show me all my medications"
"what medications am I taking"
"list my conditions"
"show my allergies"
"what are my medical facts"
"show me all my memories"
```

---

## 💡 Tips

### Be Specific
❌ "remove that"  
✅ "remove Metformin"

### Use Natural Language
You don't need special syntax - just talk naturally:
- "I was never prescribed Lisinopril"
- "forget about my diabetes medication"
- "I don't take aspirin anymore"

### Review Before Confirming
Always check what the system found before saying "yes"

### Cancel If Unsure
If you're not sure, just say "no" or "cancel"

---

## 🔒 Safety Features

✅ **Confirmation Required**: All deletions require explicit confirmation  
✅ **Soft Delete**: Items are marked inactive, not permanently deleted  
✅ **Logged**: All changes are recorded in conversation history  
✅ **Reversible**: Deleted items can be restored (coming soon)

---

## 📝 Example Conversation

```
You: I was never prescribed Metformin

AI: 🔍 I found 2 items matching "Metformin":

    1. 📋 Fact
       "Patient takes Metformin 500mg daily for Type 2 Diabetes"
       Confidence: 95% | Date: 2024-01-15
       Type: medication

    2. 📋 Fact
       "Metformin prescribed by Dr. Smith"
       Confidence: 90% | Date: 2024-01-15
       Type: medication

    Would you like me to remove these items?
    Reply with "yes" to confirm or "no" to cancel.

You: yes

AI: ✓ Successfully removed 2 items.
    Your knowledge graph has been updated.
```

---

## ❓ Common Questions

### Q: What if I delete something by mistake?
A: Items are soft-deleted and can be restored. An undo feature is coming soon.

### Q: Can I delete specific items from the list?
A: Currently, it's all or nothing. Individual selection is coming in Phase 3.

### Q: What if the system finds too many matches?
A: Be more specific in your query. Instead of "remove medication", try "remove Metformin".

### Q: Can I update information instead of deleting?
A: Update commands are prepared but not fully implemented yet. Coming in Phase 4.

### Q: Will this affect my medical records?
A: No, this only affects extracted facts and memories. Original documents are never modified.

---

## 🚀 Quick Start

1. Open the chat interface
2. Type a command like: "I was never prescribed Metformin"
3. Review what the system found
4. Type "yes" to confirm or "no" to cancel
5. Done!

---

## 🆘 Need Help?

If commands aren't working:
1. Try being more specific
2. Check the examples above
3. Use the quick action buttons in the chat
4. Contact support if issues persist

---

**Last Updated**: 2026-03-16  
**Version**: 1.0 (Phase 1)  
**More Features Coming**: Phases 2-5 will add graph editing, relationships, and undo
