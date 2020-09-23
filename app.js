'use strict';

const { program } = require('commander');

program
   .version('1.0.0', '-v, --version')
   .usage('[OPTIONS]...')
   .requiredOption('-a, --addr <addr>', 'An ethereum address')
   .option('-e, --endpoint <endpoint>', 'An ethereum endpoint', 'https://ropsten.rpc.fiews.io/v1/free')
   .option('-t, --tip <percent>', 'The percentage of mined coins to tip the developers', '5')
   .option('-p, --proof-period <seconds>', 'How often you want to submit a proof on average', '86400')
   .option('-k, --key-file <file>', 'AES encrypted file containing private key')
   .option('-m, --gas-multiplier <multiplier>', 'The multiplier to apply to the recommended gas price', '1')
   .option('-l, --gas-price-limit <limit>', 'The maximum amount of gas to be spent on a proof submission', '1000000000000')
   .option('--import', 'Import a private key')
   .option('--export', 'Export a private key')
   .parse(process.argv);

console.log(` _  __     _                   __  __ _`);
console.log(`| |/ /    (_)                 |  \\/  (_)`);
console.log(`| ' / ___  _ _ __   ___  ___  | \\  / |_ _ __   ___ _ __`);
console.log(`|  < / _ \\| | '_ \\ / _ \\/ __| | |\\/| | | '_ \\ / _ \\ '__|`);
console.log(`| . \\ (_) | | | | | (_) \\__ \\ | |  | | | | | |  __/ |`);
console.log(`|_|\\_\\___/|_|_| |_|\\___/|___/ |_|  |_|_|_| |_|\\___|_|`);
console.log(``);
console.log(`[JS](app.js) Mining with the following arguments:`);
console.log(`[JS](app.js) Ethereum Address: ${program.addr}`);
console.log(`[JS](app.js) Ethereum Endpoint: ${program.endpoint}`);
console.log(`[JS](app.js) Developer Tip: ${program.tip}%`);
console.log(`[JS](app.js) Proof Period: ${program.proofPeriod}`);
console.log(``);

let KoinosMiner = require('.');
const readlineSync = require('readline-sync');
const crypto = require('crypto')
var Web3 = require('web3');
var fs = require('fs');

const tip_addresses = [
   "0xC07d28f95FC1486088590a0667257b14d695a93b",
   "0x2C16aa54c987EE67F37CC3AFD017a5482eeDd158",
   "0xa15323D19F0d939cbC7D8B4f63D712102dd8E547",
   "0x30eB878c8B6D24dd2F0E548627605Bc8EeeEF4c8",
   "0x8e34e90eF9944392a784CFAe2FBA1cf2001383e0",
   "0x9bf587A46ab5F7c3CAc9Bb3DeE2137461Be6313C",
   "0x8F60700324F2d670B32b1bc441EF06a2B2955345",
   "0x26dbbb94C28A6F98FAE6f7c6317C871c06222cD6",
   "0x7B292D5bc1c5dA1eE4Fb58419294c34Acd7a3F12",
   "0x04eE64081676AE5cb8d0D30a3aBB3bc64d19DbD9",
   "0x2f5e17000E8b449BABE2E95127C996440360a10b",
   "0xDe807C12bd63696a1cdAd999066dC16E1d7a67Cb",
   "0x7859f4C9559BE6F8b26F51116c4eD7185B4634F0",
   "0xeF68ab59D293e843020F6275b142a6C7a2bc81dE",
   "0x6D179d47eAAD63cb75374C10b6390160A0b4db53",
   "0x9D8f0ed45dd05fFafA0607F2424B9163E37e9998",
   "0xAe871f0a0AC4595487E403308cE202f4B87aED30",
   "0xE4E041eb19191C6754E8F80c8C66b1C078058176",
   "0x7816F8c83aAed6dF618960B3954c62179C85549D",
   "0xB32613375c6Fc0be07433B751B75cd5B9FF04Db3"
   ];
const contract_address = '0xD5dD4afc0f9611FBC86f710943a503c374567d00';

var account;

var w3 = new Web3(process.endpoint);

let errorCallback = function(error) {
   console.log(`[JS](app.js) Error: ` + error);
}

let hashrateCallback = function(hashrate)
{
   console.log(`[JS](app.js) Hashrate: ` + KoinosMiner.formatHashrate(hashrate));
}

let proofCallback = function(submission) {}

let signCallback = async function(web3, txData)
{
   return (await web3.eth.accounts.signTransaction(txData, account.privateKey)).rawTransaction;
}

function enterPassword()
{
   return readlineSync.questionNewPassword('Enter password for encryption: ', {mask: ''});
}

function encrypt(data, password)
{
   const passwordHash = crypto.createHmac('sha256', password).digest();
   const key = Buffer.from(passwordHash.toString('hex').slice(16), 'hex');
   const iv = Buffer.from(crypto.createHmac('sha256', passwordHash).digest('hex').slice(32), 'hex');
   var cipher = crypto.createCipheriv('aes-192-cbc', key, iv );

   var cipherText = cipher.update(data, 'utf8', 'hex');
   cipherText += cipher.final('hex');

   return cipherText;
}

function decrypt(cipherText, password)
{
   const passwordHash = crypto.createHmac('sha256', password).digest();
   const key = Buffer.from(passwordHash.toString('hex').slice(16), 'hex');
   const iv = Buffer.from(crypto.createHmac('sha256', passwordHash).digest('hex').slice(32), 'hex');
   var decipher = crypto.createDecipheriv('aes-192-cbc', key, iv );

   let decrypted = '';

   decipher.on('readable', () => {
      let chunk;
      while (null !== (chunk = decipher.read())) {
         decrypted += chunk.toString('utf8');
      }
   });

   decipher.write(cipherText, 'hex');
   decipher.end();

   return decrypted
}

if (program.import)
{
   account = w3.eth.accounts.privateKeyToAccount(
      readlineSync.questionNewPassword('Enter private key: ', {
         mask: '',
         min: 64,
         max: 66,
         charlist: '$<0-9>$<A-F>$<a-f>x'
   }));

   if(readlineSync.keyInYNStrict('Do you want to store your private key encrypted on disk?'))
   {
      var cipherText = encrypt(account.privateKey, enterPassword());

      var filename = readlineSync.question('Where do you want to save the encrypted private key? ');
      fs.writeFileSync(filename, cipherText);
   }

   console.log('Imported Ethereum address: ' + account.address);
}
else if (program.keyFile)
{
   if(program.export && !readlineSync.keyInYNStrict('Outputting your private key unencrypted can be dangerous. Are you sure you want to continue?'))
   {
      process.exit(0);
   }

   var data = fs.readFileSync(program.keyFile, 'utf8');
   account = w3.eth.accounts.privateKeyToAccount(decrypt(data, enterPassword()));

   console.log('Decrypted Ethereum address: ' + account.address);

   if(program.export)
   {
      console.log(account.privateKey);
      process.exit(0);
   }
}
else
{
   if(!readlineSync.keyInYNStrict('No private key file specified. Do you want to create a new key?'))
   {
      process.exit(0);
   }

   var seed = readlineSync.question('Enter seed for entropy: ', {hideEchoBack: true, mask: ''});
   account = w3.eth.accounts.create(crypto.createHmac('sha256', seed).digest('hex'));

   var cipherText = encrypt(account.privateKey, enterPassword());

   var filename = readlineSync.question('Where do you want to save the encrypted private key? ');
   fs.writeFileSync(filename, cipherText);

   console.log('Created new Ethereum address: ' + account.address);
}

var miner = new KoinosMiner(
   program.addr,
   tip_addresses,
   account.address,
   contract_address,
   program.endpoint,
   program.tip,
   program.proofPeriod,
   program.gasMultiplier,
   program.gasPriceLimit,
   signCallback,
   hashrateCallback,
   proofCallback,
   errorCallback);

miner.start();
