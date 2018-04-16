const SafeMath = artifacts.require("../node_modules/zeppelin-solidity/contracts/math/SafeMath.sol");
const Splitter = artifacts.require("../contracts/Splitter.sol");

module.exports = (deployer) => {
    deployer.deploy(SafeMath);
    deployer.link(SafeMath, Splitter);
    deployer.deploy(Splitter);
};