// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Pick is Ownable, ReentrancyGuard {
    uint256 public constant MAX_NUMBER = 45;
    uint256 public entryFee;
    uint256 public serviceFeePercentage;
    uint256 public currentPrizePool;
    uint256 public winningNumber;
    bool public isRoundActive;
    mapping(uint256 => bool) public pickedNumbers;
    address public lastWinner;

    event NumberPicked(address indexed player, uint256 number);
    event WinnerSelected(address indexed winner, uint256 amount);
    event NewRoundStarted(uint256 newWinningNumber);

    constructor(uint256 _entryFee, uint256 _serviceFeePercentage) Ownable(msg.sender) {
        entryFee = _entryFee;
        serviceFeePercentage = _serviceFeePercentage;
        isRoundActive = true;
        winningNumber = generateRandomNumber(block.timestamp);
    }

    function pickNumber(uint256 _number) external payable nonReentrant {
        require(isRoundActive, "Round is not active");
        require(msg.value == entryFee, "Incorrect entry fee");
        require(_number > 0 && _number <= MAX_NUMBER, "Invalid number");
        require(!pickedNumbers[_number], "Number already picked");

        pickedNumbers[_number] = true;
        uint256 serviceFee = (entryFee * serviceFeePercentage) / 100;
        currentPrizePool += (entryFee - serviceFee);

        emit NumberPicked(msg.sender, _number);

        if (_number == winningNumber) {
            endRound(msg.sender);
        }
    }

    function endRound(address _winner) private {
        isRoundActive = false;
        lastWinner = _winner;
        uint256 prizeAmount = currentPrizePool;
        currentPrizePool = 0;

        (bool success, ) = _winner.call{value: prizeAmount}("");
        require(success, "Failed to send prize");

        emit WinnerSelected(_winner, prizeAmount);
    }

    function startNewRound(uint256 _seed) external {
        require(!isRoundActive, "Current round is still active");
        require(msg.sender == lastWinner, "Only last winner can start new round");

        for (uint256 i = 1; i <= MAX_NUMBER; i++) {
            pickedNumbers[i] = false;
        }

        winningNumber = generateRandomNumber(_seed);
        isRoundActive = true;

        emit NewRoundStarted(winningNumber);
    }

    function generateRandomNumber(uint256 _seed) private view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, _seed))) % MAX_NUMBER + 1;
    }

    function setEntryFee(uint256 _newFee) external onlyOwner {
        entryFee = _newFee;
    }

    function setServiceFeePercentage(uint256 _newPercentage) external onlyOwner {
        require(_newPercentage <= 100, "Invalid percentage");
        serviceFeePercentage = _newPercentage;
    }

    function withdrawServiceFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > currentPrizePool, "No fees to withdraw");
        uint256 fees = balance - currentPrizePool;
        (bool success, ) = owner().call{value: fees}("");
        require(success, "Failed to withdraw fees");
    }
}