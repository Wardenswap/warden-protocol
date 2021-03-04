//SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "../interfaces/IWardenTradingRoute.sol";
import "../interfaces/IUniswapV2Router.sol";

contract UniswapV2TradingRoute is IWardenTradingRoute, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IUniswapV2Router public constant router = IUniswapV2Router(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
    IERC20 public constant etherERC20 = IERC20(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    IERC20 public constant wETH = IERC20(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
    uint256 public constant amountOutMin = 1;
    uint256 public constant deadline = 2 ** 256 - 1;

    function trade(
        IERC20 _src,
        IERC20 _dest,
        uint256 _srcAmount
    )
        public
        payable
        nonReentrant
        returns(uint256 _destAmount)
    {
        require(_src != _dest, "destination token can not be source token");
        if (_src == etherERC20 && msg.value > 0) { // ETH => TOKEN
            require(msg.value == _srcAmount, "source amount mismatch");
            address[] memory path = new address[](2);
            path[0] = address(wETH);
            path[1] = address(_dest);
            uint256[] memory amounts = router.swapExactETHForTokens.value(msg.value)(
                amountOutMin,
                path,
                msg.sender,
                deadline
            );
            _destAmount = amounts[amounts.length - 1];
        } else if (_dest == etherERC20) { // TOKEN => ETH
            _src.safeTransferFrom(msg.sender, address(this), _srcAmount);
            _src.safeApprove(address(router), _srcAmount);
            address[] memory path = new address[](2);
            path[0] = address(_src);
            path[1] = address(wETH);
            uint256[] memory amounts = router.swapExactTokensForETH(
                _srcAmount,
                amountOutMin,
                path,
                msg.sender,
                deadline
            );
            _destAmount = amounts[amounts.length - 1];
        } else { // TOKEN => TOKEN
            _src.safeTransferFrom(msg.sender, address(this), _srcAmount);
            _src.safeApprove(address(router), _srcAmount);
            address[] memory path = new address[](2);
            path[0] = address(_src);
            path[1] = address(_dest);
            uint256[] memory amounts = router.swapExactTokensForTokens(
                _srcAmount,
                amountOutMin,
                path,
                msg.sender,
                deadline
            );
            _destAmount = amounts[amounts.length - 1];
        }
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
        address[] memory path = new address[](2);
        if (_src == etherERC20) { // ETH => TOKEN
            path[0] = address(wETH);
            path[1] = address(_dest);
        } else if (_dest == etherERC20) { // TOKEN => ETH
            path[0] = address(_src);
            path[1] = address(wETH);
        } else { // TOKEN => TOKEN
            path[0] = address(_src);
            path[1] = address(_dest);
        }
        uint256[] memory amounts = router.getAmountsOut(_srcAmount, path);
        _destAmount = amounts[amounts.length - 1];
    }
}
