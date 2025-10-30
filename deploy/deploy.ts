import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const cusdt = await deploy("cUSDT", {
    from: deployer,
    log: true,
  });

  const cipherStake = await deploy("CipherStake", {
    from: deployer,
    args: [cusdt.address],
    log: true,
  });

  console.log(`cUSDT contract: ${cusdt.address}`);
  console.log(`CipherStake contract: ${cipherStake.address}`);
};
export default func;
func.id = "deploy_cipherstake"; // id required to prevent reexecution
func.tags = ["CipherStake"];
