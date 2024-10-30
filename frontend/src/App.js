import React, { useEffect, useState } from 'react';
import ConnectWallet from './components/ConnectWallet';
import PickGame from './components/PickGame';
import { getContract, connectWallet } from './utils/web3';

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const contractInstance = await getContract();
        setContract(contractInstance);
      } catch (error) {
        console.error("Failed to initialize the app: ", error);
      }
    };

    init();
  }, []);

  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
          } else {
            setAccount(null);
          }
        } catch (error) {
          console.error("An error occurred while checking the connection:", error);
        }
      }
    };

    checkConnection();
    // 주기적으로 연결 상태 확인
    const intervalId = setInterval(checkConnection, 5000);

    return () => clearInterval(intervalId);
  }, []);

  const handleConnect = async () => {
    const connected = await connectWallet();
    if (connected) {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      setAccount(accounts[0]);
    }
  };

  return (
    <div className="App">
      <h1>Pick Game</h1>
      {!account ? (
        <ConnectWallet onConnect={handleConnect} />
      ) : (
        <PickGame account={account} contract={contract} />
      )}
    </div>
  );
}

export default App;