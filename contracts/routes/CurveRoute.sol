//SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/roles/WhitelistedRole.sol";
import "../interfaces/IWardenTradingRoute.sol";

interface ICurve {
    // def get_dy(i: int128, j: int128, dx: uint256) -> uint256:
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256 dy);
    // def get_dy_underlying(i: int128, j: int128, dx: uint256) -> uint256:
    function get_dy_underlying(int128 i, int128 j, uint256 dx) external view returns (uint256 dy);

    // def exchange(i: int128, j: int128, dx: uint256, min_dy: uint256):
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external;
}

contract CurveRoute is IWardenTradingRoute, WhitelistedRole, ReentrancyGuard {
    using SafeERC20 for IERC20;

    ICurve public constant curvePool = ICurve(0x160CAed03795365F3A589f10C379FfA7d75d4E76);
    IERC20 public constant busd = IERC20(0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56); // 0
    IERC20 public constant usdc = IERC20(0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d); // 1
    IERC20 public constant usdt = IERC20(0x55d398326f99059fF775485246999027B3197955); // 2

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
        require(_src != _dest, "destination token can not be source token");
        int128 i = -1;
        int128 j = -1;
        i = _src == busd ? 0 : i;
        i = _src == usdc ? 1 : i;
        i = _src == usdt ? 2 : i;

        j = _dest == busd ? 0 : j;
        j = _dest == usdc ? 1 : j;
        j = _dest == usdt ? 2 : j;
        require(i != -1 && j != -1, "tokens're not supported!");

        uint256 balanceBefore = _dest.balanceOf(address(this));
        _src.safeTransferFrom(msg.sender, address(this), _srcAmount);
        _src.safeApprove(address(curvePool), _srcAmount);
        curvePool.exchange(i, j, _srcAmount, 0);
        uint256 balanceAfter = _dest.balanceOf(address(this));
        _destAmount = balanceAfter - balanceBefore;
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
        require(_src != _dest, "destination token can not be source token");
        int128 i = -1;
        int128 j = -1;
        i = _src == busd ? 0 : i;
        i = _src == usdc ? 1 : i;
        i = _src == usdt ? 2 : i;

        j = _dest == busd ? 0 : j;
        j = _dest == usdc ? 1 : j;
        j = _dest == usdt ? 2 : j;
        require(i != -1 && j != -1, "tokens're not supported!");

        return curvePool.get_dy_underlying(i, j, _srcAmount);
    }
}
