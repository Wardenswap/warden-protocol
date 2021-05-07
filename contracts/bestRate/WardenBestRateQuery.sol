//SPDX-License-Identifier: MIT
pragma solidity 0.5.17;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

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
    using SafeMath for uint256;

    uint256 public constant PARTNER_INDEX = 0;

    IWarden public warden;

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
    returns (uint256) // amountOut 
    {
        // fail-safe getting rate, equal to
        // uint256 _amountOut = warden.getDestinationReturnAmount(routes[i], src, dest, srcAmount, PARTNER_INDEX);
        bytes memory payload = abi.encodeWithSelector(warden.getDestinationReturnAmount.selector, route, src, dest, srcAmount, PARTNER_INDEX);
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
                routeIndex = route;
            }
        }
    }

    function _getRateTwoRoutes(
        IERC20  src,
        IERC20  dest,
        uint256 srcAmount,
        uint256 route1,
        uint256 route2,
        uint256 percent1
    )
    private
    view
    returns (uint256) // amountOut
    {
        uint256 amountIn1 = srcAmount.mul(percent1).div(100);
        uint256 amountIn2 = srcAmount.sub(amountIn1);
        uint256 _amountOut1 = _getRate(src, dest, amountIn1, route1);
        uint256 _amountOut2 = _getRate(src, dest, amountIn2, route2);
        return _amountOut1 + _amountOut2;
    }

    function splitTwoRoutes(
        IERC20  src,
        IERC20  dest,
        uint256 srcAmount,
        uint256[] calldata routes,
        uint256 percentStep
    )
    external
    view
    returns (
        uint256[2] memory routeIndexs,
        uint256[2] memory volumns, // Percent
        uint256 amountOut
    ) {
        require(percentStep != 0 && percentStep < 100 && 100 % percentStep == 0, "This percent step is not allowed");
        for (uint256 currentStep = 0; currentStep <= 50; currentStep += percentStep) {
            for (uint256 i = 0; i < routes.length; i++) {
                for (uint256 j = 0; j < routes.length; j++) {
                    if (i == j) {
                        continue;
                    }

                    uint256 _amountOut = _getRateTwoRoutes(
                        src,
                        dest,
                        srcAmount,
                        routes[i],
                        routes[j],
                        currentStep
                    );

                    if (_amountOut > amountOut) {
                        amountOut = _amountOut;
                        routeIndexs = [routes[i], routes[j]];
                        volumns = [currentStep, 100 - currentStep];
                    }
                }
            }
        }
    }
}
