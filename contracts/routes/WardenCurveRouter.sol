//SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/roles/WhitelistedRole.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../interfaces/IWardenTradingRoute.sol";

interface ICurve {
    // def get_dy(i: int128, j: int128, dx: uint256) -> uint256:
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256 dy);
    // def get_dy_underlying(i: int128, j: int128, dx: uint256) -> uint256:
    function get_dy_underlying(int128 i, int128 j, uint256 dx) external view returns (uint256 dy);

    // def exchange(i: int128, j: int128, dx: uint256, min_dy: uint256):
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external;
}

contract WardenCurveRouter is IWardenTradingRoute, WhitelistedRole, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    ICurve public constant CURVE_POOL = ICurve(0xb3F0C9ea1F05e312093Fdb031E789A756659B0AC);
    IERC20 public constant BUSD = IERC20(0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56); // 0
    IERC20 public constant USDT = IERC20(0x55d398326f99059fF775485246999027B3197955); // 1
    IERC20 public constant DAI = IERC20(0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3); // 2
    IERC20 public constant USDC = IERC20(0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d); // 3

    function trade(
        IERC20 _src,
        IERC20 _dest,
        uint256 _srcAmount
    )
        public
        payable
        onlyWhitelisted
        nonReentrant
        returns(uint256 _destAmount)
    {
        (int128 i, int128 j) = getTokenIndexes(_src, _dest);

        uint256 balanceBefore = _dest.balanceOf(address(this));
        _src.safeTransferFrom(msg.sender, address(this), _srcAmount);
        _src.safeApprove(address(CURVE_POOL), _srcAmount);
        CURVE_POOL.exchange(i, j, _srcAmount, 0);
        uint256 balanceAfter = _dest.balanceOf(address(this));
        _destAmount = balanceAfter.sub(balanceBefore);
        _dest.safeTransfer(msg.sender, _destAmount);
        emit Trade(_src, _srcAmount, _dest, _destAmount);
    }

    function getDestinationReturnAmount(
        IERC20 _src,
        IERC20 _dest,
        uint256 _srcAmount
    )
        public
        view
        returns(uint256 _destAmount)
    {
        (int128 i, int128 j) = getTokenIndexes(_src, _dest);

        return CURVE_POOL.get_dy_underlying(i, j, _srcAmount);
    }
    
    function getTokenIndexes(
        IERC20 _src,
        IERC20 _dest
    )
        public
        pure
        returns(int128 i, int128 j)
    {
        require(_src != _dest, "WardenCurveRouter: Destination token can not be source token");
        i = -1;
        j = -1;
        i = _src == BUSD ? 0 : i;
        i = _src == USDT ? 1 : i;
        i = _src == DAI ? 2 : i;
        i = _src == USDC ? 3 : i;

        j = _dest == BUSD ? 0 : j;
        j = _dest == USDT ? 1 : j;
        j = _dest == DAI ? 2 : j;
        j = _dest == USDC ? 3 : j;
        require(i != -1 && j != -1, "WardenCurveRouter: Tokens're not supported!");
    }
}
