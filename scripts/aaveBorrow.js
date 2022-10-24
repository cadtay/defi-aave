const { getNamedAccounts, ethers } = require("hardhat");
const { getWeth, AMOUNT } = require("../scripts/getWeth");
const { networkConfig } = require("../helper-hardhat-config");

const main = async () => {
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  const contractAddress = networkConfig[chainId].wethToken;

  await getWeth();

  // Lending pool provider address 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
  const lendingPool = await getLendingPool(deployer);

  console.log(`Lending Pool Address: ${lendingPool.address}`);

  const wethTokenAddress = contractAddress;

  await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer);
  console.log(`Depositing Amount ${AMOUNT}`);

  await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0);
  console.log("Deposited");

  let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(
    lendingPool,
    deployer
  );

  const daiPrice = await getDaiPrice();
  const ammountDaiToBorrow =
    availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber());
  console.log(`You can borrow ${ammountDaiToBorrow} DAI`);

  const ammountDaiToBorrowWei = ethers.utils.parseEther(
    ammountDaiToBorrow.toString()
  );

  const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  await borrowDai(
    daiTokenAddress,
    lendingPool,
    ammountDaiToBorrowWei,
    deployer
  );

  await getBorrowUserData(lendingPool, deployer);
  await repay(ammountDaiToBorrowWei, daiTokenAddress, lendingPool, deployer);
  await getBorrowUserData(lendingPool, deployer);
};

const repay = async (amount, daiAddress, lendingPool, account) => {
  await approveErc20(daiAddress, lendingPool.address, amount, account);
  const repayTx = await lendingPool.repay(daiAddress, amount, 1, account);
  await repayTx.wait(1);
  console.log("Repaid.....");
};

const borrowDai = async (
  daiAddress,
  lendingPool,
  ammountDaiToBorrowWei,
  account
) => {
  const borrowTx = await lendingPool.borrow(
    daiAddress,
    ammountDaiToBorrowWei,
    1,
    0,
    account
  );

  await borrowTx.wait(1);

  console.log(`You've Borrowed`);
};

const getDaiPrice = async () => {
  // 0x773616E4d11A78F511299002da57A0a94577F1f4 DAI/ETH Price feed
  const priceFeedAddress = "0x773616E4d11A78F511299002da57A0a94577F1f4";
  const daiEthPriceFeed = await ethers.getContractAt(
    "AggregatorV3Interface",
    priceFeedAddress
  );

  const { answer } = await daiEthPriceFeed.latestRoundData();
  console.log(`The DAI/ETH Price is: ${answer.toString()}`);

  return answer;
};

const getBorrowUserData = async (lendingPool, account) => {
  const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
    await lendingPool.getUserAccountData(account);

  console.log(`You have ${totalCollateralETH} worth of ETH deposited`);
  console.log(`You have ${totalDebtETH} worth of ETH borrowed`);
  console.log(`You can borrow ${availableBorrowsETH} worth of ETH`);
  return { availableBorrowsETH, totalDebtETH };
};

const approveErc20 = async (
  erc20Address,
  spenderAddress,
  amountToSpend,
  account
) => {
  const erc20Token = await ethers.getContractAt(
    "IERC20",
    erc20Address,
    account
  );

  const tx = await erc20Token.approve(spenderAddress, amountToSpend);
  await tx.wait(1);
  console.log("Approved.....");
};

const getLendingPool = async (account) => {
  const lendingPoolAddressProvider = await ethers.getContractAt(
    "ILendingPoolAddressesProvider",
    "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
    account
  );

  const lendingPoolAddress = await lendingPoolAddressProvider.getLendingPool();
  const lendingPool = await ethers.getContractAt(
    "ILendingPool",
    lendingPoolAddress,
    account
  );

  return lendingPool;
};

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
