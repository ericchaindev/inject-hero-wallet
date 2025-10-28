import * as bip39 from 'bip39';

const YOUR_MNEMONIC =
  'great orchard youth occur banana swap soap floor video debris snap shoe';

console.log('🔬 Testing your exact mnemonic from Trust Wallet');
console.log('================================================\n');

// پاکسازی
const cleaned = YOUR_MNEMONIC.trim().toLowerCase().replace(/\s+/g, ' ');
const words = cleaned.split(' ');
const wordlist = bip39.wordlists.english;

console.log('📝 Raw input:', YOUR_MNEMONIC);
console.log('📝 Cleaned:', cleaned);
console.log('📊 Word count:', words.length);
console.log('\n🔍 Checking each word:\n');

// بررسی هر کلمه
const invalidWords = [];
words.forEach((word, index) => {
  const isValid = wordlist.includes(word);
  const status = isValid ? '✓' : '✗';
  console.log(
    `  ${status} Word ${String(index + 1).padStart(2, ' ')}: "${word}"`
  );

  if (!isValid) {
    // پیدا کردن نزدیک‌ترین کلمه
    let closest =
      wordlist.find((w) => w.startsWith(word.charAt(0))) || 'unknown';
    invalidWords.push({
      index: index + 1,
      wrong: word,
      suggestion: closest,
    });
  }
});

console.log('\n🔐 Checksum validation:\n');

// بررسی checksum
const isValidChecksum = bip39.validateMnemonic(cleaned);
console.log(`  Checksum: ${isValidChecksum ? '✓ VALID' : '✗ INVALID'}`);

console.log('\n================================================');
console.log('📊 FINAL RESULT:\n');

if (invalidWords.length > 0) {
  console.log('❌ INVALID MNEMONIC - Invalid words found:');
  invalidWords.forEach((inv) => {
    console.log(
      `   • Word ${inv.index}: "${inv.wrong}" is not in BIP39 wordlist`
    );
    console.log(`     Suggestion: "${inv.suggestion}"`);
  });
} else if (!isValidChecksum) {
  console.log('⚠️  CHECKSUM FAILED - All words are valid but in wrong order');
  console.log('   • Double-check the order from Trust Wallet');
  console.log('   • Make sure you copied the mnemonic correctly');
} else {
  console.log('✅ VALID MNEMONIC - Everything is correct!');
  console.log('   • You can use this mnemonic to restore your wallet');
}

console.log('\n================================================\n');
