const { getNamedAccounts, ethers, network } = require("hardhat");
const { networkConfig } = require("../helper-hardhat-config");

const AMOUNT = ethers.utils.parseEther("0.02");

const getWeth = async () => {
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  const contractAddress = networkConfig[chainId].wethToken;

  const iWeth = await ethers.getContractAt("IWeth", contractAddress, deployer);

  const tx = await iWeth.deposit({ value: AMOUNT });
  await tx.wait(1);

  const wethWalance = await iWeth.balanceOf(deployer);
  console.log(`Got Weth Balance Of: ${wethWalance.toString()}`);
};

module.exports = { getWeth, AMOUNT };
