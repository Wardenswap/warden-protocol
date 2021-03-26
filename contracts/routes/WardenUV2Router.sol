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
    IERC20[] public correspondentTokens;

    IERC20 public constant etherERC20 = IERC20(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    uint256 public constant amountOutMin = 1;
    uint256 public constant deadline = 2 ** 256 - 1;

    uint256 public allRoutersLength;

    constructor(
        IUniswapV2Router[] memory _routers,
        IERC20[] memory _correspondentTokens
    ) public {
        // require(_routers.length >= 1, "WUV2R: Invalid lengths1");
        // require(correspondentTokens.length == routers.length - 1, "WUV2R: Invalid lengths2");
        require(_routers.length >= 1 && _correspondentTokens.length == _routers.length - 1, "WUV2R: Invalid lengths");
        routers = _routers;
        correspondentTokens = _correspondentTokens;

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
        require(_src != _dest, "WUV2R: Destination token can not be source token");
        require(_src != etherERC20 && _dest != etherERC20, "WUV2R: Ether exchange is not supported");

        // TOKEN (Pool1) => CTOKEN1 => TOKEN (Pool2)
        _src.safeTransferFrom(msg.sender, address(this), _srcAmount);
        _src.safeApprove(address(routers[0]), _srcAmount);

        uint256 srcAmount2;
        {
            address[] memory path = new address[](2);
            path[0] = address(_src);
            path[1] = address(correspondentTokens[0]);
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
            correspondentTokens[0].safeApprove(address(routers[1]), srcAmount2);
            address[] memory path = new address[](2);
            path[0] = address(correspondentTokens[0]);
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
        require(_src != _dest, "WUV2R: Destination token can not be source token");
        if (_src == etherERC20) { // ETH => TOKEN
            _destAmount = 0;
        } else if (_dest == etherERC20) { // TOKEN => ETH
            _destAmount = 0;
        } else { // TOKEN (Pool1) => CTOKEN1 => TOKEN (Pool2)
            uint256 srcAmount2;
            {
                address[] memory path = new address[](2);
                path[0] = address(_src);
                path[1] = address(correspondentTokens[0]);
                uint256[] memory amounts = routers[0].getAmountsOut(_srcAmount, path);
                srcAmount2 = amounts[amounts.length - 1];
            }
            address[] memory path = new address[](2);
            path[0] = address(correspondentTokens[0]);
            path[1] = address(_dest);
            uint256[] memory amounts = routers[1].getAmountsOut(srcAmount2, path);
            _destAmount = amounts[amounts.length - 1];
        }
    }
}
