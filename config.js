/***************************************************
 * config.js
 ***************************************************/

// Portfel, którego transakcje kopiujemy
exports.SOURCE_WALLET = '4hfqqgqBrXeW67v7P79BRDYS3LmRuDNBBKqPycHBeqVs';

// Programy Raydium/Serum itp. – do wykrywania „czy to swap” w logach
exports.RAYDIUM_PROGRAM_IDS = [
  'amm2nQDp4c9bBSNTSeJgvDZoXQAJCUAwnkMdmgz7VRus',
  'EhhTKzsyKghC7AgbQqUfRhxMaiH3Cc9QvSG4pEyJRfb',
  '9xQeWvG816bUx9EPf7BcNsEcN2ppv1Y1nR3jZ2Y3fZbp',
];

// Można również dodać programy Orca, Crema itp., 
// bo Jupiter też potrafi je agregować. (Wtedy też je wychwycisz w logach)

// Endpoint (np. Helius, QuickNode, itp.)
// W przykładzie dajemy standardowy clusterApiUrl 'mainnet-beta' –
// ale warto wstawić swój szybki endpoint:
exports.RPC_URL = 'https://api.mainnet-beta.solana.com';

// Limit zapytań na sekundę
exports.REQUESTS_PER_SECOND = 10;
