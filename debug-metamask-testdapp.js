// Debug script for MetaMask test dApp
// Run this in the browser console on https://metamask.github.io/test-dapp/

console.log('=== Hero Wallet Debug Script ===');

// 1. Check if window.ethereum exists
console.log('1. Checking window.ethereum:');
if (window.ethereum) {
  console.log('✅ window.ethereum exists');
  console.log('   isMetaMask:', window.ethereum.isMetaMask);
  console.log('   isHeroWallet:', window.ethereum.isHeroWallet);
  console.log('   Provider type:', window.ethereum.constructor.name);
} else {
  console.log('❌ window.ethereum does not exist');
}

// 2. Check if window.herowallet exists
console.log('\n2. Checking window.herowallet:');
if (window.herowallet) {
  console.log('✅ window.herowallet exists');
  console.log('   isHeroWallet:', window.herowallet.isHeroWallet);
} else {
  console.log('❌ window.herowallet does not exist');
}

// 3. Test EIP-6963 provider detection
console.log('\n3. Testing EIP-6963 provider detection:');
let detectedProviders = [];

window.addEventListener('eip6963:announceProvider', (event) => {
  console.log('📢 EIP-6963 provider announced:', event.detail.info.name);
  detectedProviders.push(event.detail);
});

// Request providers
console.log('   Requesting EIP-6963 providers...');
window.dispatchEvent(new Event('eip6963:requestProvider'));

// Wait and show results
setTimeout(() => {
  console.log(`   Detected ${detectedProviders.length} provider(s):`);
  detectedProviders.forEach((p) => {
    console.log(`   - ${p.info.name} (${p.info.rdns})`);
  });
}, 500);

// 4. Test basic provider functionality
console.log('\n4. Testing provider functionality:');

async function testProvider() {
  const provider = window.ethereum || window.herowallet;

  if (!provider) {
    console.log('❌ No provider available for testing');
    return;
  }

  try {
    // Test eth_chainId
    console.log('   Testing eth_chainId...');
    const chainId = await provider.request({ method: 'eth_chainId' });
    console.log('   ✅ Chain ID:', chainId);

    // Test eth_accounts (without requesting)
    console.log('   Testing eth_accounts...');
    const accounts = await provider.request({ method: 'eth_accounts' });
    console.log('   📝 Current accounts:', accounts);

    if (accounts.length === 0) {
      console.log(
        '   💡 No accounts connected. Try calling eth_requestAccounts'
      );

      // Test eth_requestAccounts
      console.log('   Testing eth_requestAccounts...');
      const requestedAccounts = await provider.request({
        method: 'eth_requestAccounts',
      });
      console.log('   ✅ Requested accounts:', requestedAccounts);
    }
  } catch (error) {
    console.log('   ❌ Provider test failed:', error.message);
    console.log('   Error details:', error);
  }
}

setTimeout(testProvider, 1000);

// 5. Check for content script injection
console.log('\n5. Checking content script injection:');
console.log('   Look for Hero Wallet messages in console...');

// 6. Manual provider request test
console.log('\n6. Manual test functions available:');
console.log('   Run testHeroProvider() to test Hero Wallet specifically');
console.log('   Run connectHero() to attempt connection');

window.testHeroProvider = async function () {
  if (window.ethereum && window.ethereum.isHeroWallet) {
    console.log('Testing Hero Wallet provider...');
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      console.log('✅ Hero Wallet connected:', accounts);
      return accounts;
    } catch (error) {
      console.log('❌ Hero Wallet connection failed:', error);
      return null;
    }
  } else {
    console.log('❌ Hero Wallet not found as window.ethereum');
    return null;
  }
};

window.connectHero = async function () {
  // Try EIP-6963 first
  const heroProvider = detectedProviders.find(
    (p) => p.info.name === 'Hero Wallet'
  );
  if (heroProvider) {
    console.log('Connecting via EIP-6963...');
    try {
      const accounts = await heroProvider.provider.request({
        method: 'eth_requestAccounts',
      });
      console.log('✅ Connected via EIP-6963:', accounts);
      return accounts;
    } catch (error) {
      console.log('❌ EIP-6963 connection failed:', error);
    }
  }

  // Fallback to window.herowallet
  if (window.herowallet) {
    console.log('Connecting via window.herowallet...');
    try {
      const accounts = await window.herowallet.request({
        method: 'eth_requestAccounts',
      });
      console.log('✅ Connected via window.herowallet:', accounts);
      return accounts;
    } catch (error) {
      console.log('❌ window.herowallet connection failed:', error);
    }
  }

  console.log('❌ No Hero Wallet provider found');
  return null;
};

console.log('\n=== Debug script loaded ===');
console.log(
  '💡 If you see Hero Wallet content script messages above, the extension is loading.'
);
console.log('💡 If not, check that the extension is installed and enabled.');
