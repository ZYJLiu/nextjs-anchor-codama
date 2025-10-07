const { execSync } = require('child_process');

try {
  execSync('solana config set -ud', { stdio: 'inherit' });
  console.log(); 

  const balanceOutput = execSync('solana balance', { encoding: 'utf-8' });
  const balance = parseFloat(balanceOutput.split(' ')[0]);

  if (balance < 5) {
    console.log(`Balance is ${balance} SOL, requesting airdrop...`);
    console.log(); 
    execSync('solana airdrop 5', { stdio: 'inherit' });
  } else {
    console.log(`Balance is ${balance} SOL`);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}