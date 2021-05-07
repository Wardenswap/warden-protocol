//SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/roles/WhitelistedRole.sol";
import "../interfaces/IWardenTradingRoute.sol";
import "../interfaces/IUniswapV2Router.sol";

contract UniswapV2Route is IWardenTradingRoute, WhitelistedRole, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IUniswapV2Router public router;
    IERC20 public constant ETHER_ERC20 = IERC20(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    IERC20 public wETH;
    uint256 public constant AMOUNT_OUT_MIN = 1;
    uint256 public constant DEADLINE = 2 ** 256 - 1;

    constructor(
        IUniswapV2Router _router,
        IERC20 _wETH
    ) public {
        router = _router;
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
        if (_src == ETHER_ERC20 && msg.value > 0) { // ETH => TOKEN
            require(msg.value == _srcAmount, "source amount mismatch");
            address[] memory path = new address[](2);
            path[0] = address(wETH);
            path[1] = address(_dest);
            uint256[] memory amounts = router.swapExactETHForTokens.value(msg.value)(
                AMOUNT_OUT_MIN,
                path,
                msg.sender,
                DEADLINE
            );
            _destAmount = amounts[amounts.length - 1];
        } else if (_dest == ETHER_ERC20) { // TOKEN => ETH
            _src.safeTransferFrom(msg.sender, address(this), _srcAmount);
            _src.safeApprove(address(router), _srcAmount);
            address[] memory path = new address[](2);
            path[0] = address(_src);
            path[1] = address(wETH);
            uint256[] memory amounts = router.swapExactTokensForETH(
                _srcAmount,
                AMOUNT_OUT_MIN,
                path,
                msg.sender,
                DEADLINE
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
                AMOUNT_OUT_MIN,
                path,
                msg.sender,
                DEADLINE
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
        if (_src == ETHER_ERC20) { // ETH => TOKEN
            path[0] = address(wETH);
            path[1] = address(_dest);
        } else if (_dest == ETHER_ERC20) { // TOKEN => ETH
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
