/***************************************************
 * index.js
 ***************************************************/
const {
  Connection,
  PublicKey,
  Keypair,
} = require('@solana/web3.js');

const { loadKeypair } = require('./secrets');
const { SOURCE_WALLET, RAYDIUM_PROGRAM_IDS, RPC_URL, REQUESTS_PER_SECOND } = require('./config');
const { jupiterSwap } = require('./jupiterSwap');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');

// Minty popularnych tokenów
const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112'); 
const USDC_MINT = new PublicKey('Es9vMFrzaCERZymZ1ZfE4Ao5SFiiT7GBRBDu9GkzHC6M');
// ... Dodaj inne MINTy, jeśli chcesz sprzedawać np. do SOL

// ------------------------------------
// Ustawienia
// ------------------------------------
const signer = loadKeypair(); // Nasz keypair
const connection = new Connection(RPC_URL, 'confirmed');

// Prosty throttling  (10 RPS)
let lastRequestTime = 0;
const REQUEST_INTERVAL_MS = 1000 / REQUESTS_PER_SECOND;
async function throttle() {
  const now = Date.now();
  const diff = now - lastRequestTime;
  if (diff < REQUEST_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, REQUEST_INTERVAL_MS - diff));
  }
  lastRequestTime = Date.now();
}

// ------------------------------------
// Logi
// ------------------------------------
function logInfo(msg) {
  console.log(`[INFO]  ${new Date().toISOString()} - ${msg}`);
}
function logError(msg) {
  console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`);
}
function logDebug(msg) {
  console.debug(`[DEBUG] ${new Date().toISOString()} - ${msg}`);
}

// ------------------------------------
// Subskrypcja transakcji
// ------------------------------------
function startCopyTrader() {
  connection.onLogs(
    new PublicKey(SOURCE_WALLET),
    async (logInfoData) => {
      const { signature, logs } = logInfoData;
      logDebug(`Nowe logi. TX: ${signature}`);

      try {
        // Czy występuje któryś z programów Raydium/Serum itp. w logach
        const isSwap = RAYDIUM_PROGRAM_IDS.some((progId) =>
          logs.some((line) => line.includes(progId))
        );

        if (isSwap) {
          logInfo(`Wykryto SWAP (Raydium/Serum) w TX: ${signature}, kopiujemy przez Jupiter...`);

          // Pobierz szczegóły transakcji
          await throttle();
          const txDetails = await connection.getTransaction(signature, { commitment: 'confirmed' });
          if (!txDetails) {
            logError(`Nie udało się pobrać TX: ${signature}`);
            return;
          }
          
          // (Opcjonalnie) Z txDetails można spróbować ustalić, jaką parę swapowano i w jakiej kwocie.
          // Tu upraszczamy: swapujemy zawsze 0.1 SOL do USDC (przykładowo)
          const swapAmount = 0.1; // 0.1 SOL
          
          // Wykonujemy Jupiter Swap: SOL -> USDC
          await doCopySwapSOLtoUSDC(swapAmount);
        }

      } catch (err) {
        logError(`startCopyTrader - błąd: ${err.message}`);
      }
    },
    'confirmed'
  );
}

async function doCopySwapSOLtoUSDC(amountSol) {
  try {
    logInfo(`Rozpoczynam COPY-SWAP: ${amountSol} SOL -> USDC`);
    await throttle();
    // Wykorzystanie Jupiter
    const txid = await jupiterSwap({
      connection,
      signer,
      inputMint: SOL_MINT,
      outputMint: USDC_MINT,
      amount: amountSol,  // Jupiter przeliczy to na lamporty
      slippageBps: 50,    // 0.5% slippage
    });
    logInfo(`Swap zakończony! TX: ${txid}`);
  } catch (err) {
    logError(`doCopySwapSOLtoUSDC - błąd: ${err.message}`);
  }
}

// ------------------------------------
// Sprzedaż wszystkich tokenów do SOL
// ------------------------------------
async function sellAllTokens() {
  try {
    logInfo('Rozpoczynam sprzedaż wszystkich tokenów -> SOL');
    await throttle();
    const tokenAccounts = await connection.getTokenAccountsByOwner(signer.publicKey, {
      programId: TOKEN_PROGRAM_ID,
    });
    
    if (tokenAccounts.value.length === 0) {
      logInfo('Brak SPL tokenów, nie sprzedaję.');
      return;
    }

    // Przykładowa pętla
    for (const acc of tokenAccounts.value) {
      try {
        const tokenAccountPubkey = acc.pubkey;
        // Parsujemy, by znaleźć MINT
        const accountInfo = await connection.getParsedAccountInfo(tokenAccountPubkey);
        if (!accountInfo.value) {
          continue;
        }
        const parsed = accountInfo.value.data.parsed;
        const mintAddress = parsed.info.mint;
        const mintPubKey = new PublicKey(mintAddress);

        // Pobieramy balance
        const amountStr = parsed.info.tokenAmount.uiAmountString; // np. "123.45"
        const balance = parseFloat(amountStr);

        if (balance <= 0) {
          continue;
        }

        logInfo(`Mam ${balance} tokenów MINT=${mintAddress}. Sprzedaję do SOL...`);

        // Wywołujemy Jupiter (token -> SOL)
        // Dla uproszczenia – pomijamy sprawdzanie, czy Jupiter ma w ogóle trasę do SOL
        await throttle();
        const txid = await jupiterSwap({
          connection,
          signer,
          inputMint: mintPubKey,   // token, np. USDC
          outputMint: SOL_MINT,    // SOL
          amount: balance,         // Jupiter zrozumie to przez decimals
          slippageBps: 50,
        });

        logInfo(`Sprzedaż MINT=${mintAddress} -> SOL zakończona. TX: ${txid}`);

      } catch (innerErr) {
        logError(`sellAllTokens - błąd przy sprzedaży: ${innerErr.message}`);
      }
    }

    logInfo('Sprzedaż wszystkich tokenów zakończona.');
  } catch (err) {
    logError(`sellAllTokens - błąd: ${err.message}`);
  }
}

// ------------------------------------
// Uruchom bota
// ------------------------------------
(async () => {
  try {
    logInfo('=== Start Copy-Trading Bota (Jupiter) ===');
    startCopyTrader();

    // Możesz testowo po czasie wywołać:
    // setTimeout(sellAllTokens, 30000);

  } catch (err) {
    logError(`init - błąd: ${err.message}`);
    process.exit(1);
  }
})();
