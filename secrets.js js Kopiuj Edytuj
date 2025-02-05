/***************************************************
 * secrets.js
 ***************************************************/
const fs = require('fs');
const { Keypair } = require('@solana/web3.js');

function loadKeypair() {
  // Ustaw ścieżkę do klucza w zmiennej środowiskowej lub w configu
  const KEYPAIR_PATH = process.env.SOLANA_KEYPAIR || '/home/solana/.config/solana/id.json';
  const secretKeyString = fs.readFileSync(KEYPAIR_PATH, 'utf8');
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  return Keypair.fromSecretKey(secretKey);
}

module.exports = { loadKeypair };
