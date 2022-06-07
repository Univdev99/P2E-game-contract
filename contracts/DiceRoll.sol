// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.14;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title DiceRoll Contract
 */
contract DiceRoll is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using ECDSA for bytes32;

    // address private admin;
    // balance of tokens held in escrow
    uint256 public contractBalance;
    // this is the erc20 GameToken contract address
    uint256 public maxSupply = 100000000000000000000; // <-- temporaily set manually for flexibility while in pre-alpha development
    uint256 public unit = 1000000000000000000; // <-- temporaily set manually for flexibility while in pre-alpha development
    uint256 public gameId;

    address private signer;

    // game data tracking
    struct Game {
        uint256 balance;
        bool start;
    }
    // map game to balances
    mapping(uint256 => mapping(address => Game)) public games;
    // mapping(uint256 => Game) public games;
    // set-up event for emitting once character minted to read out values
    event NewGame(uint256 id, uint256 balance, address indexed player);
    event JoinGame(uint256 id, uint256 balance, address indexed player);
    event Claim(uint256 id, address winner, uint256 amount);
    event Withdrawn(address receiver, uint256 amount, uint256 balance);

    // // only admin account can unlock escrow
    // modifier onlyAdmin() {
    //     require(msg.sender == admin, "Only admin can unlock escrow.");
    //     _;
    // }

    /**
     * @dev Constructor Function
     * @param _signer signer account
    */
    constructor(
        address _signer
    ) {
        // admin = msg.sender;
        gameId = 0;
        signer = _signer;
    }

    // retrieve current state of game funds in escrow
    function gameState(uint256 _gameId, address _player)
        external
        view
        returns (
            uint256,
            bool
        )
    {
        return (
            games[_gameId][_player].balance,
            games[_gameId][_player].start
        );
    }

    // user hosts a game
    // staked tokens get moved to the escrow (this contract)
    function createGame(uint256 money) external payable nonReentrant {
        require(msg.value >= money, "DiceRoll.createGame: Insufficient funds");
        // return change if any
        if (msg.value > money) {
            (bool sent, ) = payable(msg.sender).call{value: msg.value - money}("");
            require(sent, "DiceRoll.createGame: Change transfer failed");
        }

        // full escrow balance
        contractBalance += money;

        // iterate game identifier
        gameId++;

        // init game data
        games[gameId][msg.sender].balance = money;
        games[gameId][msg.sender].start = true;

        emit NewGame(gameId, money, msg.sender);
    }

    function joinGame(uint256 money, uint256 _gameId) external payable nonReentrant {
        require(_gameId > 0, "DiceRoll.joinGame: Game Id is not correct");
        require(msg.value >= money, "DiceRoll.joinGame: Insufficient funds");
        // return change if any
        if (msg.value > money) {
            (bool sent, ) = payable(msg.sender).call{value: msg.value - money}("");
            require(sent, "DiceRoll.joinGame: Change transfer failed");
        }

        // full escrow balance
        contractBalance += money;

        // init game data
        games[_gameId][msg.sender].balance = money;
        games[_gameId][msg.sender].start = true;

        emit JoinGame(gameId, money, msg.sender);
    }

    function claim(
        address _winnerAddress,
        address _loserAddress,
        uint256 _gameId,
        bytes memory _signature
    ) external nonReentrant {
        require(_winnerAddress == msg.sender, "DiceRoll.claim: caller should be winner");
        require(
            keccak256(abi.encodePacked(_winnerAddress, _loserAddress, _gameId)).toEthSignedMessageHash().recover(_signature) == signer,
            "DiceRoll.claim: Invalid signature"
        );
        uint256 gameAmount = games[_gameId][_winnerAddress].balance + games[_gameId][_loserAddress].balance;
        uint256 claimAmount = gameAmount.mul(9400).div(10000);
        (bool winnerSent, ) = payable(msg.sender).call{value: claimAmount}("");
        require(winnerSent, "DiceRoll.claim: winner claim failed");

        emit Claim(_gameId, msg.sender, claimAmount);
    }

    function withdrawTo(address _receiver, uint256 _amount) external onlyOwner {
        require(_receiver != address(0) && _receiver != address(this), "DiceRoll.withdrawTo: Invalid recipient address");
        require(_amount > 0 && _amount <= address(this).balance, "DiceRoll.withdrawTo: Invalid withdrawn amount");
        (bool sent, ) = payable(_receiver).call{value: _amount}("");
        require(sent, "DiceRoll.withdrawTo: Transfer failed");
        emit Withdrawn(_receiver, _amount, address(this).balance);
    }

    function setSignerAddress(address _signer) external onlyOwner {
        require(_signer != address(0x0), "DiceRoll.setSignerAddress; Invalid address");
        signer = _signer;
    }

    function getSignerAddress() external view returns(address) {
        return signer;
    }
}
