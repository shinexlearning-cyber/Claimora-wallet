import { Wallet, BrowserProvider, JsonRpcProvider, formatEther, parseEther } from 'https://esm.sh/ethers@6.13.4';
import { createAppKit } from 'https://esm.sh/@reown/appkit@1.7.1';
import { EthersAdapter } from 'https://esm.sh/@reown/appkit-adapter-ethers@1.7.1';
import { sepolia } from 'https://esm.sh/@reown/appkit@1.7.1/networks';

const $=id=>document.getElementById(id);
const RPC='https://ethereum-sepolia-rpc.publicnode.com';
const config=window.CLAIMORA_CONFIG||{};
const ADMIN=(config.adminWallets||[]).map(x=>x.toLowerCase());
let activeAddress=null, activeSigner=null, internalWallet=null, walletKind=null, appKit=null, encryptedWallet=null;
const STORAGE='claimora_encrypted_wallet_v1';
const toast=(m,t='')=>{const e=document.createElement('div');e.className='toast '+t;e.textContent=m;$('toastRoot').append(e);setTimeout(()=>e.remove(),3600)};
function short(a){return a?a.slice(0,7)+'…'+a.slice(-5):''}
function modal(title,html,actions=[]){$('modalTitle').textContent=title;$('modalBody').innerHTML=html;$('modalActions').innerHTML='';actions.forEach(a=>{const b=document.createElement('button');b.className='btn '+(a.primary?'primary':'secondary');b.textContent=a.label;b.onclick=a.onClick;$('modalActions').append(b)});$('modalBackdrop').classList.remove('hidden')}
function close(){ $('modalBackdrop').classList.add('hidden');$('modalBody').innerHTML='';$('modalActions').innerHTML=''}
$('modalClose').onclick=close;$('modalBackdrop').addEventListener('click',e=>{if(e.target===$('modalBackdrop'))close()});
function setWallet(address,signer,kind){
 activeAddress=address;activeSigner=signer;walletKind=kind;
 $('walletAddressLabel').textContent=short(address);$('copyAddressBtn').disabled=false;
 $('sendBtn').disabled=false;$('receiveBtn').disabled=false;$('networkBadge').textContent='Sepolia testnet';
 $('walletTypeLabel').textContent=kind==='internal'?'Claimora wallet':'External wallet';
 $('sessionArea').classList.remove('hidden');$('sessionTitle').textContent=kind==='internal'?'Claimora wallet unlocked':'External wallet connected';
 $('sessionHint').textContent=short(address);$('welcomeTitle').textContent='Your wallet';
 refresh();
}
function clearWallet(){activeAddress=null;activeSigner=null;internalWallet=null;walletKind=null;$('walletAddressLabel').textContent='No wallet connected';$('balanceValue').textContent='— ETH';$('balanceSub').textContent='Create a Claimora wallet or connect an existing wallet.';$('assetBalance').textContent='—';$('networkBadge').textContent='Not connected';$('sendBtn').disabled=true;$('receiveBtn').disabled=true;$('copyAddressBtn').disabled=true;$('sessionArea').classList.add('hidden');$('walletTypeLabel').textContent='Choose how to start';$('welcomeTitle').textContent='Welcome to Claimora'}
async function refresh(){if(!activeAddress)return;try{const p=new JsonRpcProvider(RPC);const n=await p.getBalance(activeAddress);const v=Number(formatEther(n));$('balanceValue').textContent=v.toFixed(6)+' ETH';$('assetBalance').textContent=v.toFixed(6)+' ETH';$('balanceSub').textContent='Sepolia test ETH · '+short(activeAddress)}catch(e){toast('Could not retrieve balance. Try refreshing.','error')}}
$('refreshBtn').onclick=refresh;
$('copyAddressBtn').onclick=async()=>{if(!activeAddress)return;try{await navigator.clipboard.writeText(activeAddress);toast('Wallet address copied','success')}catch{toast('Clipboard permission unavailable','error')}};
$('createWalletBtn').onclick=()=>{
 if(localStorage.getItem(STORAGE)){modal('Unlock your Claimora wallet',`<p>Your encrypted wallet already exists in this browser. Enter its password to unlock it.</p><label>Password</label><input id="unlockPassword" type="password" autocomplete="current-password">`,[{label:'Cancel',onClick:close},{label:'Unlock',primary:true,onClick:unlockLocal}]);return}
 modal('Create Claimora wallet',`<div class="warning-box"><b>Important: recovery phrase</b><p>A new wallet will be generated in this browser. Your recovery phrase is the only way to restore it. Anyone who gets it can control the funds. Claimora cannot recover it for you.</p></div><label>Create a strong wallet password</label><input id="newPassword" type="password" minlength="10" autocomplete="new-password" placeholder="At least 10 characters"><label>Confirm password</label><input id="confirmPassword" type="password" minlength="10" autocomplete="new-password" placeholder="Repeat password"><p>Wallet keys are encrypted in this browser and are not uploaded to Claimora's server.</p>`,[{label:'Cancel',onClick:close},{label:'Generate wallet',primary:true,onClick:createLocal}]);
};
async function createLocal(){
 const p=$('newPassword').value,c=$('confirmPassword').value;if(p.length<10)return toast('Use a password of at least 10 characters.','error');if(p!==c)return toast('Passwords do not match.','error');
 try{const w=Wallet.createRandom();const json=await w.encrypt(p);localStorage.setItem(STORAGE,json);encryptedWallet=json;internalWallet=w.connect(new JsonRpcProvider(RPC));
 const phrase=w.mnemonic.phrase;
 modal('Back up your recovery phrase',`<div class="warning-box"><b>Never share these words.</b><p>Write them down offline and keep them private. Claimora support will never ask for them.</p></div><div class="phrase" id="recoveryPhrase">${phrase}</div><label><input id="phraseConfirmed" type="checkbox" style="width:auto;margin-right:8px">I have safely written down my recovery phrase.</label>`,[{label:'I saved it — continue',primary:true,onClick:()=>{if(!$('phraseConfirmed').checked)return toast('Please confirm your backup first.','error');const address=w.address;close();setWallet(address,internalWallet,'internal');toast('Claimora wallet created on this device','success')}}]);
 }catch(e){toast('Could not create wallet: '+e.message,'error')}
}
async function unlockLocal(){const p=$('unlockPassword').value;try{const json=localStorage.getItem(STORAGE);const w=await Wallet.fromEncryptedJson(json,p);internalWallet=w.connect(new JsonRpcProvider(RPC));close();setWallet(w.address,internalWallet,'internal');toast('Wallet unlocked','success')}catch{toast('Incorrect password or damaged wallet backup.','error')}}
$('connectWalletBtn').onclick=async()=>{
 try{
  if(!config.reownProjectId||config.reownProjectId==='YOUR_REOWN_PROJECT_ID'){
   if(!window.ethereum)throw new Error('No browser wallet detected. Install MetaMask, or configure a Reown Project ID for WalletConnect.');
   const p=new BrowserProvider(window.ethereum);await p.send('eth_requestAccounts',[]);const s=await p.getSigner();setWallet(await s.getAddress(),s,'external');return;
  }
  if(!appKit){appKit=createAppKit({adapters:[new EthersAdapter()],networks:[sepolia],defaultNetwork:sepolia,projectId:config.reownProjectId,metadata:{name:'Claimora',description:'Crypto wallet',url:location.origin,icons:[]},features:{analytics:false},themeMode:'dark',themeVariables:{'--w3m-accent':'#f5b915'}});appKit.subscribeAccount(async a=>{if(a?.isConnected&&a.address){try{const wp=appKit.getWalletProvider();const p=new BrowserProvider(wp);const s=await p.getSigner();setWallet(a.address,s,'external')}catch(e){toast(e.message,'error')}}});}
  appKit.open();
 }catch(e){toast(e.message||'Wallet connection failed','error')}
};
$('disconnectBtn').onclick=()=>{clearWallet();toast('Wallet disconnected')};
$('receiveBtn').onclick=()=>{
 if(!activeAddress)return;
 modal('Receive crypto',`<p>Send only Sepolia test ETH to this address. Do not send mainnet assets.</p><img class="qr" alt="Wallet address QR code" src="https://quickchart.io/qr?size=220&text=${encodeURIComponent(activeAddress)}"><div class="address-box">${activeAddress}</div>`,[{label:'Copy address',primary:true,onClick:async()=>{await navigator.clipboard.writeText(activeAddress);toast('Address copied','success')}}]);
};
$('sendBtn').onclick=()=>{
 if(!activeAddress)return;
 modal('Send Sepolia ETH',`<label>Recipient address</label><input id="recipient" placeholder="0x…"><label>Amount (ETH)</label><input id="sendAmount" inputmode="decimal" placeholder="0.01"><p>Confirm the recipient, amount and network in your wallet before approving. Gas fees apply.</p>`,[{label:'Cancel',onClick:close},{label:'Continue',primary:true,onClick:sendEth}]);
};
async function sendEth(){const to=$('recipient').value.trim(),amount=$('sendAmount').value.trim();if(!/^0x[a-fA-F0-9]{40}$/.test(to))return toast('Enter a valid Ethereum address.','error');if(!amount||!Number.isFinite(Number(amount))||Number(amount)<=0)return toast('Enter a valid amount.','error');try{let signer=activeSigner;if(!signer)throw Error('Unlock or connect your wallet again.');const net=await signer.provider.getNetwork();if(Number(net.chainId)!==11155111)throw Error('Switch to Ethereum Sepolia testnet first.');const tx=await signer.sendTransaction({to,value:parseEther(amount)});modal('Transaction submitted',`<p>Your wallet submitted this transaction. Wait for network confirmation.</p><div class="address-box">${tx.hash}</div><p><a href="https://sepolia.etherscan.io/tx/${tx.hash}" target="_blank" rel="noopener" style="color:#f5b915">View on Sepolia Etherscan ↗</a></p>`,[{label:'Close',primary:true,onClick:close}]);await tx.wait();toast('Transaction confirmed on Sepolia','success');refresh()}catch(e){toast(e.shortMessage||e.message||'Transaction failed','error')}}
$('swapBtn').onclick=()=>modal('Swap',`<p>Token swapping is not enabled in this first release. No swap provider or smart contract has been connected, so this button will not pretend to execute a trade.</p><p>We can add audited swap routing after the core wallet has been reviewed.</p>`,[{label:'Close',primary:true,onClick:close}]);
$('notificationBtn').onclick=()=>modal('Notifications',`<p>No notifications yet.</p>`,[{label:'Close',primary:true,onClick:close}]);
$('signInBtn').onclick=()=>toast('Wallet connection is separate from a Claimora profile. Profile registration will be added with a persistent production database.');
$('logoutBtn').onclick=()=>{clearWallet();toast('Wallet locked on this screen')};
$('adminLink').onclick=()=>location.href='/admin.html';
window.ethereum?.on?.('accountsChanged',async accounts=>{if(walletKind==='external'){if(accounts?.length){const p=new BrowserProvider(window.ethereum),s=await p.getSigner();setWallet(accounts[0],s,'external')}else clearWallet()}});
window.ethereum?.on?.('chainChanged',()=>{if(activeAddress)refresh()});
if(localStorage.getItem(STORAGE)){$('walletTypeLabel').textContent='Encrypted Claimora wallet saved on this device';$('createWalletBtn').querySelector('b').textContent='Unlock Claimora wallet'}
