import Web3 from 'web3';
import PickABI from '../contracts/Pick.json';

const getWeb3 = () => {
  return new Promise((resolve, reject) => {
    // 기존 window.ethereum 체크 로직
    if (window.ethereum) {
      const web3 = new Web3(window.ethereum);
      resolve(web3);
    }
    // 폴백: 로컬 프로바이더 사용
    else {
      const provider = new Web3.providers.HttpProvider('http://127.0.0.1:8545');
      const web3 = new Web3(provider);
      resolve(web3);
    }
  });
};

const getContract = async () => {
  try {
    const web3 = await getWeb3();
    const networkId = await web3.eth.net.getId();
    console.log('Current network ID:', networkId);
    
    // 하드코딩된 주소 사용 (Sepolia 테스트넷용)
    const contractAddress = '0xec0b473c2bef9eef5227161b9e569b7c8f684dcb';
    console.log('Using contract address:', contractAddress);

    return new web3.eth.Contract(PickABI.abi, contractAddress);
  } catch (error) {
    console.error("Failed to load web3, accounts, or contract. Error: ", error);
    return null;
  }
};

const connectWallet = async () => {
  if (window.ethereum) {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      return true;
    } catch (error) {
      console.error("User denied account access");
      return false;
    }
  } else {
    console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
    return false;
  }
};

export { getWeb3, getContract, connectWallet };