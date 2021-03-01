//SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import "../interfaces/IWardenTradingRoute.sol";
import "../interfaces/IUniswapV2Router.sol";
import "../helper/ERC20Interface.sol";

contract SushiswapV2TradingRoute is IWardenTradingRoute, ReentrancyGuard {
    IUniswapV2Router public constant router = IUniswapV2Router(0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F);
    ERC20 public constant etherERC20 = ERC20(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    ERC20 public constant wETH = ERC20(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
    uint256 public constant amountOutMin = 1;
    uint256 public constant deadline = 2 ** 256 - 1;

    function trade(
        ERC20 _src,
        ERC20 _dest,
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
            _src.transferFrom(msg.sender, address(this), _srcAmount);
            _src.approve(address(router), _srcAmount);
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
            _src.transferFrom(msg.sender, address(this), _srcAmount);
            _src.approve(address(router), _srcAmount);
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
        ERC20 _src,
        ERC20 _dest,
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
