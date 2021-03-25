//SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/roles/WhitelistedRole.sol";
import "../interfaces/IWardenTradingRoute.sol";
import "../interfaces/IUniswapV2Router.sol";


contract WardenUV2Router is IWardenTradingRoute, WhitelistedRole, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IUniswapV2Router[] public routers;
    IERC20 public constant etherERC20 = IERC20(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    IERC20 public wETH;
    uint256 public constant amountOutMin = 1;
    uint256 public constant deadline = 2 ** 256 - 1;

    uint256 public allRoutersLength;

    constructor(
        IUniswapV2Router[] memory _routers,
        IERC20 _wETH
    ) public {
        routers = _routers;
        wETH = _wETH;

        allRoutersLength = routers.length;
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
        _src.safeApprove(address(routers[0]), _srcAmount);

        uint256 srcAmount2;
        {
            address[] memory path = new address[](2);
            path[0] = address(_src);
            path[1] = address(wETH);
            uint256[] memory amounts = routers[0].swapExactTokensForTokens(
                _srcAmount,
                amountOutMin,
                path,
                address(this),
                deadline
            );
            srcAmount2 = amounts[amounts.length - 1];
        }
        {
            wETH.safeApprove(address(routers[1]), srcAmount2);
            address[] memory path = new address[](2);
            path[0] = address(wETH);
            path[1] = address(_dest);
            uint256[] memory amounts = routers[1].swapExactTokensForTokens(
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
                uint256[] memory amounts = routers[0].getAmountsOut(_srcAmount, path);
                srcAmount2 = amounts[amounts.length - 1];
            }
            address[] memory path = new address[](2);
            path[0] = address(wETH);
            path[1] = address(_dest);
            uint256[] memory amounts = routers[1].getAmountsOut(srcAmount2, path);
            _destAmount = amounts[amounts.length - 1];
        }
    }
}
