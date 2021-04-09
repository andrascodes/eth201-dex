const truffleAssert = require("truffle-assertions");

const DEX = artifacts.require("DEX");
const Token = artifacts.require("Token");

const LINK = web3.utils.fromUtf8("LINK");
const ETH = web3.utils.fromUtf8("ETH");
const BUY = 0;
const SELL = 1;

contract("DEX", (accounts) => {
  it("should revert if the side parameter doesn't exist", async () => {
    const dex = await DEX.deployed();
    await truffleAssert.reverts(dex.createLimitOrder(LINK, 3, 20, 10));
  });

  it("should revert if the limit order is for a token that doesn't exist", async () => {
    const dex = await DEX.deployed();
    await truffleAssert.reverts(dex.createLimitOrder(LINK, BUY, 20, 10));
  });

  it("should revert if ETH balance is too low when creating a BUY limit order", async () => {
    const dex = await DEX.deployed();
    const link = await Token.deployed();
    await link.approve(dex.address, 500);
    await dex.addToken(LINK, link.address, { from: accounts[0] });

    const linkAmount = 20;
    const ethPricePerToken = 10;
    await truffleAssert.reverts(
      dex.createLimitOrder(LINK, BUY, linkAmount, ethPricePerToken)
    );
    await dex.depositEth({ value: linkAmount * ethPricePerToken });
    await truffleAssert.passes(
      dex.createLimitOrder(LINK, BUY, linkAmount, ethPricePerToken)
    );
  });

  it("should revert if token balance is too low when creating a SELL limit order", async () => {
    const dex = await DEX.deployed();
    const link = await Token.deployed();
    await link.approve(dex.address, 500);
    await dex.addToken(LINK, link.address, { from: accounts[0] });

    const linkAmount = 20;
    const ethPrice = 10;
    await truffleAssert.reverts(
      dex.createLimitOrder(LINK, SELL, linkAmount, ethPrice)
    );
    await dex.deposit(linkAmount, LINK);
    await truffleAssert.passes(
      dex.createLimitOrder(LINK, SELL, linkAmount, ethPrice)
    );
  });

  it(`The Buy order book should be ordered on price from highest to lowest starting at index 0`, async () => {
    const dex = await DEX.deployed();
    const link = await Token.deployed();
    await link.approve(dex.address, 500);
    await dex.addToken(LINK, link.address, { from: accounts[0] });

    await dex.depositEth({ value: 3000 });
    await dex.createLimitOrder(LINK, BUY, 20, 30);
    await dex.createLimitOrder(LINK, BUY, 20, 15);
    await dex.createLimitOrder(LINK, BUY, 20, 20);

    const orderBook = await dex.getOrderBook(LINK, BUY);
    console.log(orderBook);
    assert(orderBook.length > 0, "orderBook items are missing");
    for (let i = 0; i < orderBook.length - 1; i++) {
      assert(
        orderBook[i].price >= orderBook[i + 1].price,
        "orderBook is not ordered"
      );
    }
  });

  it(`The Sell order book should be ordered on price from lowest to highest starting at index 0`, async () => {
    const dex = await DEX.deployed();
    const link = await Token.deployed();
    await link.approve(dex.address, 500);
    await dex.addToken(LINK, link.address, { from: accounts[0] });

    await dex.depositEth({ value: 3000 });
    await dex.deposit(60, LINK);
    await dex.createLimitOrder(LINK, SELL, 20, 30);
    await dex.createLimitOrder(LINK, SELL, 20, 15);
    await dex.createLimitOrder(LINK, SELL, 20, 20);

    const orderBook = await dex.getOrderBook(LINK, SELL);
    console.log(orderBook);
    assert(orderBook.length > 0, "orderBook items are missing");
    for (let i = 0; i < orderBook.length - 1; i++) {
      assert(
        orderBook[i].price <= orderBook[i + 1].price,
        "orderBook is not ordered"
      );
    }
  });
});