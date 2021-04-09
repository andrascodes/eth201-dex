const Token = artifacts.require("Token");
const Wallet = artifacts.require("Wallet");

module.exports = function (deployer) {
  deployer.deploy(Token);
};
