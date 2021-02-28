//SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import "../interfaces/IWardenTradingRoute.sol";
import "../helper/ERC20Interface.sol";

interface IUniswapV2Router {
    function getAmountsOut(
        uint amountIn,
        address[] calldata path
    )
    external
    view
    returns (uint[] memory amounts);

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    )
    external
    returns (uint[] memory amounts);

    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    )
    external
    payable
    returns (uint[] memory amounts);

    function swapExactTokensForETH(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    )
    external
    returns (uint[] memory amounts);
}

contract UniswapV2TokenEthTokenTradingRoute is IWardenTradingRoute, ReentrancyGuard {
    IUniswapV2Router public constant router = IUniswapV2Router(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
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
        require(_src != etherERC20 && _dest != etherERC20, "Ether exchange is not supported");

        // TOKEN => TOKEN
        _src.transferFrom(msg.sender, address(this), _srcAmount);
        _src.approve(address(router), _srcAmount);
        address[] memory path = new address[](3);
        path[0] = address(_src);
        path[1] = address(wETH);
        path[2] = address(_dest);
        uint256[] memory amounts = router.swapExactTokensForTokens(
            _srcAmount,
            amountOutMin,
            path,
            msg.sender,
            deadline
        );
        _destAmount = amounts[amounts.length - 1];

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
        address[] memory path = new address[](3);
        if (_src == etherERC20) { // ETH => TOKEN
            return 0;
        } else if (_dest == etherERC20) { // TOKEN => ETH
            return 0;
        } else { // TOKEN => TOKEN
            path[0] = address(_src);
            path[1] = address(wETH);
            path[2] = address(_dest);
        }
        uint256[] memory amounts = router.getAmountsOut(_srcAmount, path);
        _destAmount = amounts[amounts.length - 1];
    }
}
