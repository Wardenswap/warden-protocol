//SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/roles/WhitelistedRole.sol";
import "../interfaces/IWardenTradingRoute.sol";
import "../interfaces/IUniswapV2Router.sol";


contract UniswapV2PoolEthPoolTradingRoute is IWardenTradingRoute, WhitelistedRole, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IUniswapV2Router public router1;
    IUniswapV2Router public router2;
    IERC20 public constant etherERC20 = IERC20(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    IERC20 public wETH;
    uint256 public constant amountOutMin = 1;
    uint256 public constant deadline = 2 ** 256 - 1;

    constructor(
        IUniswapV2Router _router1,
        IUniswapV2Router _router2,
        IERC20 _wETH
    ) public {
        router1 = _router1;
        router2 = _router2;
        wETH = _wETH;
    }
    
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
        require(_src != etherERC20 && _dest != etherERC20, "Ether exchange is not supported");

        // TOKEN (Pool1) => wETH => TOKEN (Pool2)
        _src.safeTransferFrom(msg.sender, address(this), _srcAmount);
        _src.safeApprove(address(router1), _srcAmount);

        uint256 srcAmount2;
        {
            address[] memory path = new address[](2);
            path[0] = address(_src);
            path[1] = address(wETH);
            uint256[] memory amounts = router1.swapExactTokensForTokens(
                _srcAmount,
                amountOutMin,
                path,
                address(this),
                deadline
            );
            srcAmount2 = amounts[amounts.length - 1];
        }
        {
            wETH.safeApprove(address(router2), srcAmount2);
            address[] memory path = new address[](2);
            path[0] = address(wETH);
            path[1] = address(_dest);
            uint256[] memory amounts = router2.swapExactTokensForTokens(
                srcAmount2,
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
        external
        view
        returns(uint256 _destAmount)
    {
        require(_src != _dest, "destination token can not be source token");
        if (_src == etherERC20) { // ETH => TOKEN
            _destAmount = 0;
        } else if (_dest == etherERC20) { // TOKEN => ETH
            _destAmount = 0;
        } else { // TOKEN (Pool1) => wETH => TOKEN (Pool2)
            uint256 srcAmount2;
            {
                address[] memory path = new address[](2);
                path[0] = address(_src);
                path[1] = address(wETH);
                uint256[] memory amounts = router1.getAmountsOut(_srcAmount, path);
                srcAmount2 = amounts[amounts.length - 1];
            }
            address[] memory path = new address[](2);
            path[0] = address(wETH);
            path[1] = address(_dest);
            uint256[] memory amounts = router2.getAmountsOut(srcAmount2, path);
            _destAmount = amounts[amounts.length - 1];
        }
    }
}
