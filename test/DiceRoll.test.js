require('dotenv').config();

const DiceRoll = artifacts.require("DiceRoll");
const { BN, soliditySha3 } = require("web3-utils");

contract("DiceRoll", (accounts) => {
    let diceRoll_contract;

    before(async () => {
        await DiceRoll.new(
            process.env.signer,
            { from: accounts[0] }
        ).then((instance) => {
            diceRoll_contract = instance;
        });
    });
    describe("Claim", () => {
        it("Claiming prize works well", async () => {
            const price = new BN('100000000000000000');

            const creatorBalanceBeforeGame = new BN(await web3.eth.getBalance(accounts[5]));
            const joinerBalanceBeforeGame = new BN(await web3.eth.getBalance(accounts[6]));
            const contractBalanceBeforeCreate = new BN(await web3.eth.getBalance(diceRoll_contract.address));

            const diceRoll_result = await diceRoll_contract.createGame(price, {from: accounts[5], gas: 3000000, value: price});

            const creatorBalanceAfterCreate = new BN(await web3.eth.getBalance(accounts[5]));
            const creatorLostBalance = creatorBalanceBeforeGame.sub(creatorBalanceAfterCreate);
            const contractBalanceAfterCreate = new BN(await web3.eth.getBalance(diceRoll_contract.address));
            const contractGainedBalanceAfterCreate = contractBalanceAfterCreate.sub(contractBalanceBeforeCreate);

            // assert.equal(creatorLostBalance.toString(), new BN('100000000000000000').toString());
            assert.equal(contractGainedBalanceAfterCreate.toString(), new BN('100000000000000000').toString());
            const gameId = diceRoll_result.logs[0].args[0];


            await diceRoll_contract.joinGame(price, gameId, {from: accounts[6], gas: 3000000, value: price});
            const joinerBalanceAfterJoin = new BN(await web3.eth.getBalance(accounts[6]));
            const joinerLostBalance = joinerBalanceBeforeGame.sub(joinerBalanceAfterJoin);
            const contractBalanceAfterJoin = new BN(await web3.eth.getBalance(diceRoll_contract.address));
            const contractGainedBalanceAfterJoin = contractBalanceAfterJoin.sub(contractBalanceAfterCreate)

            // assert.equal(joinerLostBalance.toString(), new BN('100000000000000000').toString());
            assert.equal(contractGainedBalanceAfterJoin.toString(), new BN('100000000000000000').toString());
            assert.equal(contractBalanceAfterJoin.toString(), new BN('200000000000000000').toString());
            assert.equal(gameId.toString(), new BN('1').toString());

            const sha = soliditySha3(
                accounts[5],
                accounts[6],
                gameId
            );
            const sig = await web3.eth.accounts.sign(sha, process.env.signerPrivatekey);
            await diceRoll_contract.claim(accounts[5], accounts[6], gameId, sig.signature, {from: accounts[5]});
            
            const creatorBalanceAfterClaim = new BN(await web3.eth.getBalance(accounts[5]));
            const creatorGainedBalance = creatorBalanceAfterClaim.sub(creatorBalanceAfterCreate);

            const contractBalanceAfterClaim = new BN(await web3.eth.getBalance(diceRoll_contract.address));
            const contractClaimedBalance = contractBalanceAfterJoin.sub(contractBalanceAfterClaim);

            const claimAmount = new BN('200000000000000000').mul(new BN('9400')).div(new BN('10000'));
            const feeAmount = new BN('200000000000000000').mul(new BN('600')).div(new BN('10000'));
            assert.equal(contractClaimedBalance.toString(), claimAmount.toString());
            assert.equal(contractBalanceAfterClaim.toString(), feeAmount.toString());
        });

        it("Fails with invalid signature", async () => {
            const price = new BN('100000000000000000');

            const diceRoll_result = await diceRoll_contract.createGame(price, {from: accounts[5], gas: 3000000, value: price});

            const gameId = diceRoll_result.logs[0].args[0];

            await diceRoll_contract.joinGame(price, gameId, {from: accounts[6], gas: 3000000, value: price});

            const sha = soliditySha3(
                accounts[6],
                accounts[5],
                gameId
            );
            const sig = await web3.eth.accounts.sign(sha, process.env.signerPrivatekey);

            try {
                await diceRoll_contract.claim(accounts[5], accounts[6], gameId, sig.signature, {from: accounts[5]});
            } catch (error) {
                thrownError = error;
            }

            assert.include(
                thrownError.message,
                'DiceRoll.claim: Invalid signature',
            )
        });
    });
});
