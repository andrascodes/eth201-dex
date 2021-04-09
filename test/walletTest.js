const truffleAssert = require("truffle-assertions");

const DEX = artifacts.require("DEX");
const Token = artifacts.require("Token");

const LINK = web3.utils.fromUtf8("LINK");

contract("DEX-Wallet", accounts => {
    it("should only be possible for owner to add tokens", async () => {
        
        const dex = await DEX.deployed();
        const link = await Token.deployed();

        await truffleAssert.passes(
            dex.addToken(LINK, link.address, { from: accounts[0] })
        );
        await truffleAssert.reverts(
            dex.addToken(LINK, link.address, { from: accounts[1] })
        );
    });
    
    it("should handle deposits correctly", async () => {
        const dex = await DEX.deployed();
        const link = await Token.deployed();
        const deposit = 100;
        await link.approve(dex.address, 500);
        await dex.deposit(deposit, LINK);
        
        const balance = await dex.balances(accounts[0], LINK);
        assert.equal(balance.toNumber(), deposit);
    });
    
    it("should handle withdrawals correctly", async () => {
            const dex = await DEX.deployed();
            const link = await Token.deployed();
            
            await truffleAssert.reverts(
                dex.withdraw(500, LINK)
            );
            await truffleAssert.passes(
                dex.withdraw(100, LINK)
            );            
        });
    });