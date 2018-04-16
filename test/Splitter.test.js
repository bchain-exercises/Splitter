const Splitter = artifacts.require('./fakes/FakeSplitter.sol');

var assertThrows = async (promise) => {
    try {
        await promise;
    } catch (error) {
        const invalidOpcode = error.message.search('invalid opcode') >= 0;
        const invalidJump = error.message.search('invalid JUMP') >= 0;
        const outOfGas = error.message.search('out of gas') >= 0;
        const revert = error.message.search('revert') >= 0;

        assert(
            invalidOpcode || invalidJump || outOfGas || revert,
            "Expected throw, got '" + error + "' instead",
        );
        
        return;
    }

    assert.fail('Expected throw not received');
};

contract('Splitter', ([owner, second, third, fourth, fifth]) => {
    let sut;

    before(() => {
        web3.eth.defaultAccount = owner;
    });

    beforeEach(async () => {
        sut = await Splitter.new();
    });

    describe('getContractBalance should', async () => {

        it('return 0 when the contract is created', async () => {
            const result = await sut.getContractBalance.call();

            assert.equal(0, result);
        });
    
        it('return the sent amount after a valid split is invoked', async () => {
            await sut.addSplitRecipient(second);
            await sut.split({ value: 42 });
            
            const result = await sut.getContractBalance.call();

            assert.equal(42, result);
        });
    
        it('return 0 after a split and withdraw are invoked with the whole balance and one split recipient', async () => {
            const splitWithdrawValue = 42;
    
            await sut.addSplitRecipient(second);
            await sut.split({ value: splitWithdrawValue });
            await sut.withdraw(splitWithdrawValue, { from: second });
    
            const result = await sut.getContractBalance.call();
    
            assert.equal(0, result);
        });
    
        it('return exact value after a split and withdraw are invoked with more than 1 split recipient', async () => {
            const splitValue = 42;
            const withdrawValue = Math.floor(splitValue / 2);
            const expectedBalance = Math.floor(splitValue / 2);
    
            await sut.addSplitRecipient(second);
            await sut.addSplitRecipient(third);
            await sut.split({ value: splitValue });
            await sut.withdraw(withdrawValue, { from: second });
    
            const result = await sut.getContractBalance.call();
    
            assert.equal(expectedBalance, result);
        });
    });

    describe('getMemberBalance should', async () => {
        it('return default value when no splits are performed benefitting the given address', async() => {
            const expectedValue = 0;

            const result = await sut.getMemberBalance.call(owner);

            assert.equal(result, expectedValue);
        });

        it('return exact balance when one split is performed benefitting the given address', async() => {
            const splitValue = 42;

            await sut.addSplitRecipient(second);
            await sut.split({ value: splitValue });

            const result = await sut.getMemberBalance.call(second);

            assert.equal(splitValue, result);
        });

        it('return exact balance when one or more splits are performed benefitting the given address', async() => {
            const splitValue = 42;
            const expectedResult = Math.floor(splitValue / 2);

            await sut.addSplitRecipient(second);
            await sut.addSplitRecipient(third);
            await sut.split({ value: splitValue });

            const result = await sut.getMemberBalance.call(second);

            assert.equal(result, expectedResult);
        });

        it('return exact balance of the sender when there is remainder left after a split', async() => {
            const splitValue = 43;
            const expectedResult = splitValue % 2;

            await sut.addSplitRecipient(owner, { from: third });
            await sut.addSplitRecipient(second, { from: third });
            await sut.split({ value: splitValue, from: third });

            const result = await sut.getMemberBalance.call(third);

            assert.equal(result, expectedResult);
        });

        it('return exact balance of the sender when there is no remainder left after a split', async() => {
            const splitValue = 42;
            const expectedResult = splitValue % 2;

            await sut.addSplitRecipient(owner, { from: third });
            await sut.addSplitRecipient(second, { from: third });
            await sut.split({ value: splitValue, from: third });

            const result = await sut.getMemberBalance.call(third);

            assert.equal(result, expectedResult);
        });

        it('emit LogWithdrawal event upon successful withdraw', async() => {
            
        });
    });

    describe('split should', async () => {
        it('throw when the sender does not have split recipients', async() => {
            const result = sut.split({ value: 42 });

            await assertThrows(result);
        });

        it('throw when the sender sends 0', async() => {
            await sut.addSplitRecipient(second);

            const result = sut.split({ value: 0 });

            await assertThrows(result);
        });

        it('throw when the amount sent is less than the split recipients count', async() => {
            await sut.addSplitRecipient(second);
            await sut.addSplitRecipient(third);
            await sut.addSplitRecipient(fourth);
            await sut.addSplitRecipient(fifth);

            const result = sut.split({ value: 3 });

            await assertThrows(result);
        });

        it('properly split the amount sent between the split recipients', async() => {
            const splitValue = 99;
            const expectedValue = Math.floor(splitValue / 3);

            await sut.addSplitRecipient(owner, { from: fourth });
            await sut.addSplitRecipient(second, { from: fourth });
            await sut.addSplitRecipient(third, { from: fourth });
            await sut.split({ from: fourth, value: splitValue });

            const firstBalance = await sut.getMemberBalance.call(owner);
            const secondBalance = await sut.getMemberBalance.call(second);
            const thirdBalance = await sut.getMemberBalance.call(third);

            assert.equal(expectedValue, firstBalance);
            assert.equal(expectedValue, secondBalance);
            assert.equal(expectedValue, thirdBalance);
        });

        it('should update the senders balance when there is a remainder left after the split', async() => {
            const splitValue = 100;
            const expectedValue = splitValue % 3;

            await sut.addSplitRecipient(owner, { from: fourth });
            await sut.addSplitRecipient(second, { from: fourth });
            await sut.addSplitRecipient(third, { from: fourth });
            await sut.split({ from: fourth, value: splitValue });

            const result = await sut.getMemberBalance.call(fourth);

            assert.equal(result, expectedValue);
        });

        it('emit LogSplit event upon successful withdraw', async() => {

        });
    });

    describe('addSplitRecipient should', async() => {
        it('throw when given invalid address', async() => {
            const result = sut.addSplitRecipient(0x00000000000000000000);

            assertThrows(result);
        });

        it('throw when the recipient is already added', async() => {
            await sut.addSplitRecipient(second);
            
            const result = sut.addSplitRecipient(second);

            assertThrows(result);
        });

        it('mark the added recipient in the senders recipients', async() => {
            await sut.addSplitRecipient(second);

            const result = await sut.isAddedToRecipients.call(owner, second);

            assert(result, 'Recipient not marked');
        });

        it('add the recipient to the senders recipients', async() => {
            const expectedLength = 1;
            await sut.addSplitRecipient(second);

            const result = await sut.getMemberRecipientsLength.call(owner);

            assert.equal(result, expectedLength);
        });

        it('emit LogNewSplitRecipient event upon successful withdraw', async() => {

        });
    });

    describe('withdraw should', async() => {
        it('throw if the requested withdraw amount is greater than the requesters balance in the contract', async() => {
            const splitAmount = 100;
            const withdrawAmount = 150;

            await sut.addSplitRecipient(second);
            await sut.split({ value: splitAmount });

            const result = sut.withdraw(withdrawAmount, { from: second });

            assertThrows(result);
        });

        it('update the withdrawers balance in the contract', async() => {
            const splitAmount = 100;
            const withdrawAmount = 90;

            const expectedValue = splitAmount - withdrawAmount;

            await sut.addSplitRecipient(second);
            await sut.split({ value: splitAmount });
            await sut.withdraw(withdrawAmount, { from: second });

            const result = await sut.getMemberBalance.call(second);

            assert.equal(result, expectedValue);
        });

        it('transfer the amount when valid withdraw is requested', async() => {
            // Refactor this --

            const splitAmount = 5;
            const withdrawAmount = splitAmount;

            await sut.addSplitRecipient(second);
            await sut.split({ value: splitAmount });

            const secondBalance = await web3.eth.getBalance(second);
            const gasEstimate = await sut.withdraw.estimateGas(withdrawAmount, { from: second });

            const transactionReceipt = await sut.withdraw(withdrawAmount, { from: second });
            const transactionHash = transactionReceipt.tx;
            const transaction = await web3.eth.getTransaction(transactionHash);
            const currentTransactionGasPrice = transaction.gasPrice;
            const transactionCost = currentTransactionGasPrice.mul(gasEstimate);

            const secondBalanceNew = await web3.eth.getBalance(second);
            const balanceDifference = secondBalance.sub(secondBalanceNew);

            assert.deepEqual(balanceDifference, transactionCost.sub(withdrawAmount));
        });

        it('emit LogWithdrawal event upon successful withdraw', async() => {

        });
    });
});