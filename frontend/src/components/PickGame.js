import React, { useState, useEffect, useCallback, useRef } from 'react';
import Web3 from 'web3';
import { useSpring, animated } from 'react-spring';
import { Howl } from 'howler';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, BarController } from 'chart.js';
import './PickGame.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend
);

// 사운드 효과 정의
const sounds = {
  click: new Howl({ src: ['/sounds/click.mp3'] }),
  win: new Howl({ src: ['/sounds/win.mp3'] }),
  newRound: new Howl({ src: ['/sounds/new-round.mp3'] }),
};

function PickGame({ account, contract }) {
  const displayAddress = account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Not connected';

  const [entryFee, setEntryFee] = useState('0');
  const [prizePool, setPrizePool] = useState('0');
  const [isRoundActive, setIsRoundActive] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [lastWinner, setLastWinner] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState('0');
  const [remainingGames, setRemainingGames] = useState(0);
  const [pickedNumbers, setPickedNumbers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [chartInstance, setChartInstance] = useState(null);
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [{
      label: 'Number of Picks',
      data: [],
      backgroundColor: 'rgba(75,192,192,0.6)',
    }]
  });
  const chartRef = useRef(null);
  const scrollPositionRef = useRef(0);
  const [isNumberSelected, setIsNumberSelected] = useState(false);

  const fetchGameInfo = useCallback(async () => {
    if (contract && account) {
      try {
        let web3;
        if (window.ethereum) {
          web3 = new Web3(window.ethereum);
          try {
            // 계정 접근 권한 요청
            await window.ethereum.request({ method: 'eth_requestAccounts' });
          } catch (error) {
            console.error("User denied account access");
            return;
          }
        } else if (window.web3) {
          web3 = new Web3(window.web3.currentProvider);
        } else {
          console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
          return;
        }

        const API_URL = process.env.REACT_APP_API_URL || '';
        const response = await fetch(`${API_URL}/api/gameInfo`, {
          credentials: 'include'
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Fetched game info:', data);
        
        const entryFeeInEther = Web3.utils.fromWei(data.entryFee, 'ether');
        setEntryFee(entryFeeInEther);
        setPrizePool(Web3.utils.fromWei(data.prizePool, 'ether'));
        setIsRoundActive(data.isRoundActive);
        setLastWinner(data.lastWinner);
        
        // 계정 잔액 가져오기
        const accountBalance = await web3.eth.getBalance(account);
        const balanceInEther = Web3.utils.fromWei(accountBalance, 'ether');
        setBalance(balanceInEther);
        console.log('Account balance:', balanceInEther);
        
        // remainingGames 계산
        const remaining = Math.floor(parseFloat(balanceInEther) / parseFloat(entryFeeInEther));
        setRemainingGames(remaining);

        console.log('Remaining games:', remaining);
        
        // 이미 선택된 번호들 가져오기
        const pickedNumbersArray = [];
        for (let i = 1; i <= 45; i++) {
          const isPicked = await contract.methods.pickedNumbers(i).call();
          if (isPicked) {
            pickedNumbersArray.push(i);
          }
        }
        setPickedNumbers(pickedNumbersArray);
      } catch (error) {
        console.error('Error fetching game info:', error);
      }
    } else {
      console.error('Contract or account not available');
    }
  }, [contract, account]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/leaderboard', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setLeaderboard(data);
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    }
  }, []);

  const fetchStatistics = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/statistics', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error("Failed to fetch statistics:", error);
    }
  }, []);

  useEffect(() => {
    fetchGameInfo();
    fetchLeaderboard();
    fetchStatistics();
  }, [fetchGameInfo, fetchLeaderboard, fetchStatistics]);

  const handleSelectNumber = (number) => {
    if (!pickedNumbers.includes(number)) {
      setSelectedNumber(number);
      setIsNumberSelected(true);
      sounds.click.play();
    }
  };

  const handleConfirmNumber = async () => {
    if (contract && selectedNumber && remainingGames > 0) {
      setIsLoading(true);
      try {
        const result = await contract.methods.pickNumber(selectedNumber).send({
          from: account,
          value: Web3.utils.toWei(entryFee, 'ether')
        });
        
        const events = result.events;
        if (events && events.NumberPicked) {
          const pickedNumber = events.NumberPicked.returnValues.number;
          // WinnerSelected 이벤트를 확인하여 당첨 여부 판단
          const isWinner = events.WinnerSelected && events.WinnerSelected.returnValues.winner === account;
          
          if (isWinner) {
            sounds.win.play();
          }
          
          if (isWinner) {
            alert(`Congratulations! You won with number ${pickedNumber}!`);
          } else {
            alert(`Sorry, your number ${pickedNumber} didn't win this time. Better luck next time!`);
          }
        }
        
        setSelectedNumber(null);
        setIsNumberSelected(false);
        fetchGameInfo();
      } catch (error) {
        console.error('Error picking number:', error);
        alert('Failed to pick number. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      alert('Insufficient balance or invalid selection');
    }
  };

  const handleStartNewRound = async () => {
    if (contract && account === lastWinner) {
      setIsLoading(true);
      try {
        const seed = Math.floor(Math.random() * 1000000);
        await contract.methods.startNewRound(seed).send({ from: account });
        sounds.newRound.play();
        alert('New round started successfully!');
        fetchGameInfo();
      } catch (error) {
        console.error('Error starting new round:', error);
        alert('Failed to start new round. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle('dark-mode');
  };

  // 카드 애니메이션
  const cardAnimation = useSpring({
    from: { transform: 'scale(0)' },
    to: { transform: 'scale(1)' },
  });

  useEffect(() => {
    setChartData({
      labels: Object.keys(statistics),
      datasets: [{
        label: 'Number of Picks',
        data: Object.values(statistics),
        backgroundColor: 'rgba(75,192,192,0.6)',
      }]
    });
  }, [statistics]);

  useEffect(() => {
    const ctx = document.getElementById('statisticsChart');
    if (ctx && JSON.stringify(chartData) !== JSON.stringify(chartRef.current)) {
      // 현재 스크롤 위치 저장
      scrollPositionRef.current = window.pageYOffset;

      if (chartInstance) {
        chartInstance.destroy();
      }

      const newChartInstance = new ChartJS(ctx, {
        type: 'bar',
        data: chartData,
        options: {
          responsive: true,
          maintainAspectRatio: false, // 차트 크기를 고정
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: 'Number Pick Statistics'
            }
          }
        }
      });
      setChartInstance(newChartInstance);
      chartRef.current = chartData;

      // 스크롤 위치 복원
      setTimeout(() => {
        window.scrollTo(0, scrollPositionRef.current);
      }, 0);
    }
  }, [chartData, chartInstance]);

  const renderCards = () => {
    const cards = [];
    for (let i = 1; i <= 45; i++) {
      cards.push(
        <div 
          key={i} 
          className={`card ${selectedNumber === i ? 'selected' : ''} ${pickedNumbers.includes(i) ? 'picked' : ''}`}
          onClick={() => handleSelectNumber(i)}
        >
          {i}
        </div>
      );
    }
    return cards;
  };

  useEffect(() => {
    const initSounds = () => {
      sounds.click = new Howl({ src: ['/sounds/click.mp3'] });
      sounds.win = new Howl({ src: ['/sounds/win.mp3'] });
      sounds.newRound = new Howl({ src: ['/sounds/new-round.mp3'] });
    };

    window.addEventListener('click', initSounds, { once: true });

    return () => {
      window.removeEventListener('click', initSounds);
    };
  }, []);

  return (
    <div className={`pick-game-container ${isDarkMode ? 'dark-mode' : ''}`}>
      <h1 className="game-logo">Pick Game</h1>
      <button onClick={toggleDarkMode}>
        {isDarkMode ? 'Light Mode' : 'Dark Mode'}
      </button>
      <div className="game-info">
        <h2>Pick Game</h2>
        <p><strong>Your Account:</strong> {displayAddress}</p>
        <p><strong>Your Balance:</strong> {parseFloat(balance).toFixed(4)} ETH</p>
        <p><strong>Entry Fee:</strong> {entryFee} ETH</p>
        <p><strong>Current Prize Pool:</strong> {prizePool} ETH</p>
        <p><strong>Round Active:</strong> {isRoundActive ? 'Yes' : 'No'}</p>
        <p><strong>Last Winner:</strong> {lastWinner ? `${lastWinner.slice(0, 6)}...${lastWinner.slice(-4)}` : 'None'}</p>
        <p><strong>Remaining Games:</strong> {remainingGames}</p>
      </div>
      <div className="game-board">
        <h3>Pick a Number</h3>
        <div className="card-container">
          {renderCards().map((card, index) => (
            <animated.div key={index} style={cardAnimation}>
              {card}
            </animated.div>
          ))}
        </div>
      </div>
      <div className="game-controls">
        <button 
          className="action-button select-button"
          onClick={() => setIsNumberSelected(false)}
          disabled={!isNumberSelected}
        >
          Change Selection
        </button>
        <button 
          className="action-button confirm-button"
          onClick={handleConfirmNumber} 
          disabled={!isNumberSelected || isLoading || remainingGames === 0 || !isRoundActive}
        >
          {isLoading ? 'Processing...' : 
           !isRoundActive ? 'Waiting for new round' :
           remainingGames === 0 ? 'Insufficient Balance' : 
           `Confirm and Pay ${entryFee} ETH`}
        </button>
        {account === lastWinner && !isRoundActive && (
          <button 
            className="action-button"
            onClick={handleStartNewRound} 
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Start New Round'}
          </button>
        )}
      </div>
      <div className="leaderboard">
        <h3>Leaderboard</h3>
        <ul>
          {leaderboard.map((player, index) => (
            <li key={index}>
              {player.address.slice(0, 6)}...{player.address.slice(-4)}: {player.wins} wins
            </li>
          ))}
        </ul>
      </div>
      <div className="statistics">
        <h3>Number Pick Statistics</h3>
        <div style={{ height: '300px', width: '100%' }}>
          <canvas id="statisticsChart" />
        </div>
      </div>
      {isLoading && <div className="loading">Transaction in progress...</div>}
    </div>
  );
}

export default PickGame;