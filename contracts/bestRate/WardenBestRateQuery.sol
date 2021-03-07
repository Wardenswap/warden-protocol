//SPDX-License-Identifier: MIT
pragma solidity 0.5.17;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/Math.sol";
import "hardhat/console.sol";

interface IWarden {
    function getDestinationReturnAmount(
        uint256 tradingRouteIndex,
        IERC20  src,
        IERC20  dest,
        uint256 srcAmount,
        uint256 partnerIndex
    )
    external
    view
    returns(uint256);
}

contract WardenBestRateQuery {
    IWarden public warden;
    uint256 public constant partnerIndex = 0;

    constructor(IWarden _warden) public {
        warden = _warden;
    }

    function _getRate(
        IERC20  src,
        IERC20  dest,
        uint256 srcAmount,
        uint256 route
    )
    private
    view
    returns (
        uint256 amountOut
    ) {
        // fail-safe getting rate, equal to
        // uint256 _amountOut = warden.getDestinationReturnAmount(routes[i], src, dest, srcAmount, partnerIndex);
        bytes memory payload = abi.encodeWithSignature("getDestinationReturnAmount(uint256,address,address,uint256,uint256)", route, src, dest, srcAmount, partnerIndex);
        (bool success, bytes memory data) = address(warden).staticcall(payload);
        if (success) {
            return abi.decode(data, (uint256));
        } else {
            return 0;
        }
    }

    function oneRoute(
        IERC20  src,
        IERC20  dest,
        uint256 srcAmount,
        uint256[] calldata routes
    )
    external
    view
    returns (
        uint256 routeIndex,
        uint256 amountOut
    ) {
        for (uint256 i = 0; i < routes.length; i++) {
            uint256 route = routes[i];
            uint256 _amountOut = _getRate(src, dest, srcAmount, route);
            if (_amountOut > amountOut) {
                amountOut = _amountOut;
                routeIndex = routes[i];
            }
        }
    }
}
