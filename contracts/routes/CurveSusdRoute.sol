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

    // def exchange_underlying(i: int128, j: int128, dx: uint256, min_dy: uint256):
    function exchange_underlying(int128 i, int128 j, uint256 dx, uint256 min_dy) external;
}

contract CurveSusdTradingRoute is IWardenTradingRoute, WhitelistedRole, ReentrancyGuard {
    using SafeERC20 for IERC20;

    ICurve public constant susdPool = ICurve(0xA5407eAE9Ba41422680e2e00537571bcC53efBfD);
    IERC20 public constant dai = IERC20(0x6B175474E89094C44Da98b954EedeAC495271d0F);
    IERC20 public constant usdc = IERC20(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
    IERC20 public constant usdt = IERC20(0xdAC17F958D2ee523a2206206994597C13D831ec7);
    IERC20 public constant susd = IERC20(0x57Ab1ec28D129707052df4dF418D58a2D46d5f51);

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
        i = _src == dai ? 0 : i;
        i = _src == usdc ? 1 : i;
        i = _src == usdt ? 2 : i;
        i = _src == susd ? 3 : i;

        j = _dest == dai ? 0 : j;
        j = _dest == usdc ? 1 : j;
        j = _dest == usdt ? 2 : j;
        j = _dest == susd ? 3 : j;
        require(i != -1 && j != -1, "tokens're not supported!");

        uint256 balanceBefore = _dest.balanceOf(address(this));
        _src.safeTransferFrom(msg.sender, address(this), _srcAmount);
        _src.safeApprove(address(susdPool), _srcAmount);
        susdPool.exchange_underlying(i, j, _srcAmount, 0);
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
        i = _src == dai ? 0 : i;
        i = _src == usdc ? 1 : i;
        i = _src == usdt ? 2 : i;
        i = _src == susd ? 3 : i;

        j = _dest == dai ? 0 : j;
        j = _dest == usdc ? 1 : j;
        j = _dest == usdt ? 2 : j;
        j = _dest == susd ? 3 : j;
        require(i != -1 && j != -1, "tokens're not supported!");

        return susdPool.get_dy_underlying(i, j, _srcAmount);
    }
}
