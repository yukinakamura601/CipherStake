// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE, ebool, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";

/// @title CipherStake vault for cUSDT staking
/// @notice Players can stake and withdraw cUSDT while amounts remain confidential.
contract CipherStake is SepoliaConfig {
    IERC7984 public immutable stakingToken;

    mapping(address player => euint64 encryptedStake) private _stakes;
    euint64 private _totalStaked;

    event Staked(address indexed player, euint64 amount);
    event Unstaked(address indexed player, euint64 amount);

    constructor(IERC7984 tokenAddress) {
        stakingToken = tokenAddress;
    }

    /// @notice Returns the address of the staked token.
    function token() external view returns (address) {
        return address(stakingToken);
    }

    /// @notice Returns the encrypted stake of a player.
    /// @param player The address to query.
    function stakeOf(address player) external view returns (euint64) {
        return _stakes[player];
    }

    /// @notice Returns the encrypted total amount staked in the vault.
    function totalStaked() external view returns (euint64) {
        return _totalStaked;
    }

    /// @notice Reissues FHE permissions so the caller can decrypt their staked balance.
    function refreshMyStakeAccess() external {
        euint64 currentStake = _stakes[msg.sender];
        if (!FHE.isInitialized(currentStake)) {
            return;
        }
        FHE.allow(currentStake, msg.sender);
        FHE.allowThis(currentStake);
    }

    /// @notice Grants the caller permission to decrypt the total staked amount.
    function requestTotalAccess() external {
        euint64 currentTotal = _totalStaked;
        if (!FHE.isInitialized(currentTotal)) {
            return;
        }
        FHE.allow(currentTotal, msg.sender);
        FHE.allowThis(currentTotal);
    }

    /// @notice Stake cUSDT using an encrypted amount.
    /// @param encryptedAmount Ciphertext handle for the amount to stake.
    /// @param inputProof Proof associated with the encrypted input.
    function stake(externalEuint64 encryptedAmount, bytes calldata inputProof) external returns (euint64 stakedAmount) {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        FHE.allowThis(amount);
        FHE.allow(amount, address(stakingToken));
        euint64 transferred = stakingToken.confidentialTransferFrom(msg.sender, address(this), amount);

        euint64 updatedStake = FHE.add(_stakes[msg.sender], transferred);
        FHE.allowThis(updatedStake);
        FHE.allow(updatedStake, msg.sender);
        _stakes[msg.sender] = updatedStake;

        euint64 updatedTotal = FHE.add(_totalStaked, transferred);
        FHE.allowThis(updatedTotal);
        FHE.allow(updatedTotal, msg.sender);
        _totalStaked = updatedTotal;

        FHE.allowThis(transferred);
        FHE.allow(transferred, msg.sender);

        emit Staked(msg.sender, transferred);
        return transferred;
    }

    /// @notice Withdraw staked cUSDT using an encrypted amount.
    /// @param encryptedAmount Ciphertext handle for the desired withdrawal amount.
    /// @param inputProof Proof associated with the encrypted input.
    function unstake(externalEuint64 encryptedAmount, bytes calldata inputProof)
        external
        returns (euint64 withdrawnAmount)
    {
        euint64 requested = FHE.fromExternal(encryptedAmount, inputProof);
        euint64 currentStake = _stakes[msg.sender];

        ebool canWithdraw = FHE.ge(currentStake, requested);
        euint64 allowedAmount = FHE.select(canWithdraw, requested, FHE.asEuint64(0));

        FHE.allowThis(allowedAmount);
        FHE.allow(allowedAmount, msg.sender);
        FHE.allow(allowedAmount, address(stakingToken));

        euint64 transferred = stakingToken.confidentialTransfer(msg.sender, allowedAmount);

        euint64 updatedStake = FHE.sub(currentStake, transferred);
        FHE.allowThis(updatedStake);
        FHE.allow(updatedStake, msg.sender);
        _stakes[msg.sender] = updatedStake;

        euint64 updatedTotal = FHE.sub(_totalStaked, transferred);
        FHE.allowThis(updatedTotal);
        FHE.allow(updatedTotal, msg.sender);
        _totalStaked = updatedTotal;

        FHE.allowThis(transferred);
        FHE.allow(transferred, msg.sender);

        emit Unstaked(msg.sender, transferred);
        return transferred;
    }
}
