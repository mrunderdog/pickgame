const express = require('express');
const cors = require('cors');
const { Web3 } = require('web3');  // 수정된 부분
const PickABI = require('../frontend/src/contracts/Pick.json');  // 경로 수정

const app = express();
app.use(cors({
  origin: '*',  // 모든 출처 허용 (개발 중에만 사용, 프로덕션에서는 구체적인 도메인 지정 필요)
  credentials: true
}));
app.use(express.json());

const web3 = new Web3(new Web3.providers.HttpProvider('https://rpc.sepolia.org'));
const contractAddress = '0xec0b473c2bef9eef5227161b9e569b7c8f684dcb';  // 새로운 컨트랙트 주소
const contract = new web3.eth.Contract(PickABI.abi, contractAddress);

// BigInt를 문자열로 변환하는 함수
const bigIntToString = (obj) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    acc[key] = typeof value === 'bigint' ? value.toString() : value;
    return acc;
  }, {});
};

// 리더보드 데이터 (실제로는 데이터베이스에서 가져와야 함)
const leaderboard = [
  { address: '0x1234...5678', wins: 5 },
  { address: '0xabcd...efgh', wins: 3 },
  // ... 더 많은 데이터 ...
];

// 통계 데이터 (실제로는 데이터베이스에서 가져와야 함)
const statistics = {
  1: 10, 2: 15, 3: 8, // ... 1부터 45까지의 데이터
};

app.get('/api/gameInfo', async (req, res) => {
  try {
    const entryFee = await contract.methods.entryFee().call();
    const prizePool = await contract.methods.currentPrizePool().call();
    const isRoundActive = await contract.methods.isRoundActive().call();
    const lastWinner = await contract.methods.lastWinner().call();

    const gameInfo = bigIntToString({ entryFee, prizePool, isRoundActive, lastWinner });
    console.log('Game Info:', gameInfo);

    res.json(gameInfo);
  } catch (error) {
    console.error('Error fetching game info:', error);
    res.status(500).json({ error: 'Failed to fetch game info' });
  }
});

app.get('/api/leaderboard', (req, res) => {
  // 임시 데이터
  const leaderboard = [
    { address: '0x1234...5678', wins: 5 },
    { address: '0xabcd...efgh', wins: 3 },
  ];
  res.json(leaderboard);
});

app.get('/api/statistics', (req, res) => {
  // 임시 데이터
  const statistics = {
    '1': 10,
    '2': 15,
    '3': 8,
    // ... 다른 번호들
  };
  res.json(statistics);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});