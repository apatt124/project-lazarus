#!/usr/bin/env node

/**
 * Test script for memory command parser
 * Run with: node scripts/test-command-parser.mjs
 */

// Simple test implementation (since we can't import TS directly)
const testCases = [
  // Forget commands
  { input: "forget that I take Metformin", expected: "forget" },
  { input: "I was never prescribed Lisinopril", expected: "forget" },
  { input: "I don't take aspirin", expected: "forget" },
  { input: "remove that medication", expected: "forget" },
  { input: "delete the fact about diabetes", expected: "forget" },
  
  // Confirmation commands
  { input: "yes", expected: "confirm" },
  { input: "confirm", expected: "confirm" },
  { input: "remove all", expected: "confirm" },
  
  // Cancellation commands
  { input: "no", expected: "cancel" },
  { input: "cancel", expected: "cancel" },
  { input: "nevermind", expected: "cancel" },
  
  // Show commands
  { input: "show me all medications", expected: "show" },
  { input: "what medications am I taking", expected: "show" },
  { input: "list my conditions", expected: "show" },
  
  // Non-commands
  { input: "What is diabetes?", expected: null },
  { input: "Tell me about my health", expected: null },
];

console.log('🧪 Memory Command Parser Test Suite\n');
console.log('=' .repeat(60));

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  console.log(`\nTest ${index + 1}: "${test.input}"`);
  console.log(`Expected: ${test.expected || 'null (not a command)'}`);
  console.log(`Status: ⏳ (Manual verification needed)`);
  
  // In a real test, we would:
  // const result = parseMemoryCommand(test.input);
  // const actual = result?.type || null;
  // if (actual === test.expected) { passed++; } else { failed++; }
});

console.log('\n' + '='.repeat(60));
console.log('\n📝 To run actual tests:');
console.log('1. Build the TypeScript files: npm run build');
console.log('2. Test in the browser console or create a Jest test');
console.log('\n💡 Test the parser by trying these commands in the chat:');
console.log('   - "I was never prescribed Metformin"');
console.log('   - "forget that I take aspirin"');
console.log('   - "show me all my medications"');
console.log('   - "yes" (after a forget command)');
console.log('   - "no" (to cancel)');
