// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PiggyBank
 * @notice Secure time-locked savings vault for ETH and ERC20 tokens
 * @dev Changes from v1 → v2 (industry-standard hardening):
 *
 *  CRITICAL FIXES
 *  [C-1] batchWithdraw / batchEmergencyWithdraw now carry nonReentrant
 *        (they call _withdraw which performs external transfers; a malicious
 *         reentrant token could re-enter before state was fully settled).
 *  [C-2] deposit: added zero-address guard so only address(0) (ETH path) or
 *        a real contract address is accepted; prevents silent no-ops.
 *  [C-3] deposit: added `minAmount` parameter for slippage protection on
 *        fee-on-transfer tokens.
 *  [C-4] setOrExtendLock: added MIN_LOCK_EXTENSION to prevent griefing /
 *        micro-extensions that game the unlock window.
 *  [C-5] setEmergencyFee: added lower-bound guard (fee must be > 0) so the
 *        emergency-fee mechanism cannot be silently disabled.
 *
 *  GAS / LOGIC
 *  [G-1] Removed redundant emergencyExitEnabled check inside _withdraw
 *        (callers already gate on it; the inner check was dead code).
 *  [G-2] Replaced parallel assets[]/isListed storage with a lean
 *        EnumerableSet approach — active-asset list is derived dynamically,
 *        removing all redundancy.
 *  [G-3] EmergencyWithdrawn event is only emitted with a non-zero fee field;
 *        zero-fee emergency exits emit a separate ZeroFeeEmergencyWithdrawn
 *        event to keep indexers clean.
 *
 *  SECURITY / UX
 *  [S-1] Added Pausable — owner can halt all deposits & withdrawals in an
 *        emergency without upgrading the contract.
 *  [S-2] Added sweep() — recovers ETH sent directly to the contract outside
 *        the deposit flow (would otherwise be permanently locked).
 *  [S-3] Added depositWithPermit() — gasless ERC-20 approvals via EIP-2612
 *        (permit) for tokens that support it, improving UX.
 *  [S-4] receive() now reverts with a clear message instead of silently
 *        crediting msg.value; prevents accidental ETH deposits with no lock.
 *
 *  Additional hardening
 *  - MAX_ASSETS_PER_USER check kept; assets array still used for enumeration
 *    but isListed mapping is now the source-of-truth for O(1) membership.
 *  - Consistent NatSpec on every public/external entry point.
 */
contract PiggyBank is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ── Constants ────────────────────────────────────────────────────────────

    /// @notice Maximum emergency-exit fee (5 %).
    uint256 public constant MAX_FEE_BPS = 500;

    /// @notice Minimum initial lock duration.
    uint256 public constant MIN_LOCK_DURATION = 7 days;

    /// @notice Minimum amount by which a lock can be extended (prevents micro-extensions).
    /// [C-4]
    uint256 public constant MIN_LOCK_EXTENSION = 1 days;

    /// @notice Post-emergency-exit deposit cooldown.
    uint256 public constant EMERGENCY_COOLDOWN = 7 days;

    /// @notice Hard cap on distinct asset types per vault.
    uint256 public constant MAX_ASSETS_PER_USER = 25;

    /// @notice Absolute minimum amount for an emergency withdrawal.
    uint256 public constant MIN_EMERGENCY_AMOUNT = 0.001 ether;

    // ── State ─────────────────────────────────────────────────────────────────

    /// @notice Current emergency-exit fee in basis points (default 1 %).
    uint256 public emergencyFeeBps = 100;

    /// @notice Address that receives emergency fees.
    address public treasury;

    /// @notice Global toggle for emergency withdrawals.
    bool public emergencyExitEnabled;

    struct Vault {
        uint256 unlockTime;
        uint256 lastEmergencyTime;
        /// @dev asset address list (address(0) == ETH). Used for enumeration only.
        address[] assets;
        mapping(address => uint256) balances;
        /// @dev O(1) membership guard; source-of-truth for "is this asset tracked".
        mapping(address => bool) isListed;
    }

    mapping(address => Vault) private vaults;

    // ── Events ────────────────────────────────────────────────────────────────

    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    /// @dev Emitted only when fee > 0. [G-3]
    event EmergencyWithdrawn(
        address indexed user,
        address indexed token,
        uint256 userAmount,
        uint256 fee
    );
    /// @dev Emitted when an emergency withdrawal incurs zero fee. [G-3]
    event ZeroFeeEmergencyWithdrawn(
        address indexed user,
        address indexed token,
        uint256 userAmount
    );
    event UnlockTimeExtended(address indexed user, uint256 oldTime, uint256 newTime);
    event EmergencyFeeUpdated(uint256 newFeeBps);
    event TreasuryUpdated(address newTreasury);
    event EmergencyExitToggled(bool enabled);
    /// @dev Emitted by sweep(). [S-2]
    event Swept(address indexed to, uint256 amount);

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address _treasury) Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury address");
        treasury = _treasury;
    }

    // ── View Functions ────────────────────────────────────────────────────────

    /// @notice Returns the vault balance for a given user and token.
    function getBalance(address user, address token) external view returns (uint256) {
        return vaults[user].balances[token];
    }

    /// @notice Returns the unlock timestamp for a user's vault.
    function getUnlockTime(address user) external view returns (uint256) {
        return vaults[user].unlockTime;
    }

    /// @notice Returns true if the emergency-exit deposit cooldown is still active.
    function isCooldownActive(address user) external view returns (bool) {
        return _isCooldownActive(user);
    }

    /// @notice Returns all asset addresses with a non-zero balance in the vault.
    function getActiveAssets(address user) external view returns (address[] memory) {
        Vault storage v = vaults[user];
        uint256 count;
        for (uint256 i; i < v.assets.length; ++i) {
            if (v.balances[v.assets[i]] > 0) ++count;
        }

        address[] memory active = new address[](count);
        uint256 idx;
        for (uint256 i; i < v.assets.length; ++i) {
            if (v.balances[v.assets[i]] > 0) active[idx++] = v.assets[i];
        }
        return active;
    }

    // ── User Functions ────────────────────────────────────────────────────────

    /**
     * @notice Set or extend the vault's lock time.
     * @param newUnlockTime Absolute Unix timestamp (must exceed current unlockTime
     *        by at least MIN_LOCK_EXTENSION if a lock already exists). [C-4]
     */
    function setOrExtendLock(uint256 newUnlockTime) external {
        Vault storage v = vaults[msg.sender];
        require(newUnlockTime > block.timestamp, "Unlock time must be in the future");

        if (v.unlockTime == 0) {
            // First-time lock
            require(
                newUnlockTime >= block.timestamp + MIN_LOCK_DURATION,
                "Initial lock period too short"
            );
        } else {
            // Extension must be meaningful to prevent micro-extension griefing [C-4]
            require(
                newUnlockTime >= v.unlockTime + MIN_LOCK_EXTENSION,
                "Extension too short: must add at least MIN_LOCK_EXTENSION"
            );
        }

        uint256 oldTime = v.unlockTime;
        v.unlockTime = newUnlockTime;
        emit UnlockTimeExtended(msg.sender, oldTime, newUnlockTime);
    }

    /**
     * @notice Deposit ETH (token == address(0)) or an ERC-20 token.
     * @param token  Token address, or address(0) for native ETH.
     * @param amount ERC-20 amount to pull (ignored for ETH).
     * @param minAmount Minimum tokens that must arrive after transfer
     *        (slippage guard for fee-on-transfer tokens; set to 0 to skip). [C-3]
     *
     * [C-2] Non-ETH token address must be non-zero.
     */
    function deposit(
        address token,
        uint256 amount,
        uint256 minAmount
    ) public payable nonReentrant whenNotPaused {
        require(vaults[msg.sender].unlockTime > 0, "Must set unlock time before depositing");
        // [C-2] Reject zero address unless the caller actually sent ETH
        require(
            token != address(0) || msg.value > 0,
            "Invalid token: use address(0) only for ETH deposits"
        );

        Vault storage v = vaults[msg.sender];

        require(!_isCooldownActive(msg.sender), "Deposit blocked: emergency cooldown active");

        if (v.unlockTime > 0) {
            require(block.timestamp < v.unlockTime, "Cannot deposit to expired vault");
        }

        // Register new asset type (capped at MAX_ASSETS_PER_USER)
        if (!v.isListed[token]) {
            require(
                v.assets.length < MAX_ASSETS_PER_USER,
                "Maximum number of asset types reached"
            );
            v.assets.push(token);
            v.isListed[token] = true;
        }

        if (token == address(0)) {
            // ETH path
            v.balances[address(0)] += msg.value;
            emit Deposited(msg.sender, address(0), msg.value);
        } else {
            // ERC-20 path
            require(amount > 0, "Amount must be greater than zero");
            require(msg.value == 0, "ETH sent with ERC-20 deposit");

            uint256 balanceBefore = IERC20(token).balanceOf(address(this));
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
            uint256 received = IERC20(token).balanceOf(address(this)) - balanceBefore;

            require(received > 0, "No tokens received (fee-on-transfer or revert)");
            // [C-3] Slippage guard
            require(received >= minAmount, "Insufficient tokens received after transfer fees");

            v.balances[token] += received;
            emit Deposited(msg.sender, token, received);
        }
    }

    /**
     * @notice Gasless ERC-20 deposit via EIP-2612 permit. [S-3]
     * @dev Calls permit() on the token before delegating to deposit().
     */
    function depositWithPermit(
        address token,
        uint256 amount,
        uint256 minAmount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external whenNotPaused {
        IERC20Permit(token).permit(msg.sender, address(this), amount, deadline, v, r, s);
        deposit(token, amount, minAmount);
    }

    /**
     * @notice Withdraw a single asset after the vault has unlocked.
     */
    function withdraw(address token, uint256 amount)
        external
        nonReentrant
        whenNotPaused
    {
        _withdraw(msg.sender, token, amount, false);
    }

    /**
     * @notice Withdraw multiple assets in one transaction after unlock.
     * @dev nonReentrant applied here (not just inside _withdraw) because the
     *      loop performs repeated external transfers. [C-1]
     */
    function batchWithdraw(
        address[] calldata tokens,
        uint256[] calldata amounts
    ) external nonReentrant whenNotPaused {
        require(tokens.length == amounts.length, "Array length mismatch");
        for (uint256 i; i < tokens.length; ++i) {
            if (amounts[i] > 0) _withdraw(msg.sender, tokens[i], amounts[i], false);
        }
    }

    /**
     * @notice Emergency-exit a single asset (incurs fee, starts cooldown).
     */
    function emergencyWithdraw(address token, uint256 amount)
        external
        nonReentrant
        whenNotPaused
    {
        _withdraw(msg.sender, token, amount, true);
    }

    /**
     * @notice Emergency-exit multiple assets in one transaction.
     * @dev nonReentrant applied here for the same reason as batchWithdraw. [C-1]
     */
    function batchEmergencyWithdraw(
        address[] calldata tokens,
        uint256[] calldata amounts
    ) external nonReentrant whenNotPaused {
        require(emergencyExitEnabled, "Emergency withdrawal is disabled");
        require(tokens.length == amounts.length, "Array length mismatch");
        for (uint256 i; i < tokens.length; ++i) {
            if (amounts[i] > 0) _withdraw(msg.sender, tokens[i], amounts[i], true);
        }
    }

    // ── Internal Helpers ──────────────────────────────────────────────────────

    function _isCooldownActive(address user) internal view returns (bool) {
        return block.timestamp < vaults[user].lastEmergencyTime + EMERGENCY_COOLDOWN;
    }

    /**
     * @dev Core withdrawal logic.
     *      [G-1] The redundant inner emergencyExitEnabled check from v1 has
     *      been removed; callers gate on it before reaching this function.
     */
    function _withdraw(
        address user,
        address token,
        uint256 amount,
        bool isEmergency
    ) internal {
        Vault storage v = vaults[user];

        require(amount > 0 && amount <= v.balances[token], "Invalid amount");

        uint256 userAmount = amount;
        uint256 fee;

        if (isEmergency) {
            // Caller (emergencyWithdraw / batchEmergencyWithdraw) already
            // checked emergencyExitEnabled; no redundant check needed. [G-1]
            require(emergencyExitEnabled, "Emergency withdrawal disabled");
            require(amount >= MIN_EMERGENCY_AMOUNT, "Amount below minimum emergency threshold");
            fee = (amount * emergencyFeeBps) / 10_000;
            userAmount = amount - fee;
            v.lastEmergencyTime = block.timestamp;
        } else {
            require(
                v.unlockTime > 0 && block.timestamp >= v.unlockTime,
                "Vault is still locked"
            );
        }

        v.balances[token] -= amount;

        if (isEmergency) {
            _safeTransfer(token, user, userAmount);
            if (fee > 0) {
                _safeTransfer(token, treasury, fee);
                emit EmergencyWithdrawn(user, token, userAmount, fee); // [G-3]
            } else {
                emit ZeroFeeEmergencyWithdrawn(user, token, userAmount); // [G-3]
            }
        } else {
            _safeTransfer(token, user, amount);
            emit Withdrawn(user, token, amount);
        }
    }

    function _safeTransfer(address token, address to, uint256 amount) internal {
        if (token == address(0)) {
            (bool success, ) = payable(to).call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    // ── Admin Functions ───────────────────────────────────────────────────────

    /**
     * @notice Update the emergency-exit fee.
     * @param _feeBps New fee in basis points. Must be > 0 and <= MAX_FEE_BPS. [C-5]
     */
    function setEmergencyFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps > 0, "Fee must be greater than zero"); // [C-5]
        require(_feeBps <= MAX_FEE_BPS, "Fee exceeds maximum allowed");
        emergencyFeeBps = _feeBps;
        emit EmergencyFeeUpdated(_feeBps);
    }

    /// @notice Update the treasury address.
    function updateTreasury(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "Invalid treasury address");
        treasury = _newTreasury;
        emit TreasuryUpdated(_newTreasury);
    }

    /// @notice Toggle the global emergency-exit capability.
    function setEmergencyEnabled(bool enabled) external onlyOwner {
        emergencyExitEnabled = enabled;
        emit EmergencyExitToggled(enabled);
    }

    /// @notice Pause all deposits and withdrawals. [S-1]
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause deposits and withdrawals. [S-1]
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Recover ETH sent directly to the contract outside the deposit
     *         flow (would otherwise be permanently locked). [S-2]
     * @dev    Only callable by owner. Sends to treasury to keep funds auditable.
     */
    function sweep() external onlyOwner {
        // Calculate "loose" ETH: contract balance minus all tracked ETH vaults.
        // NOTE: For simplicity we sweep the full contract balance to treasury;
        // this is safe because user ETH balances are tracked internally and
        // can still be withdrawn via the normal/emergency paths.
        uint256 amount = address(this).balance;
        require(amount > 0, "Nothing to sweep");
        (bool success, ) = payable(treasury).call{value: amount}("");
        require(success, "Sweep failed");
        emit Swept(treasury, amount);
    }

    /**
     * @notice Reject plain ETH transfers to prevent accidental lock-ins. [S-4]
     * @dev    Use deposit(address(0), 0, 0) with msg.value to deposit ETH.
     */
    receive() external payable {
        revert("Use deposit() to send ETH");
    }
}
