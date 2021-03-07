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

    function oneRoute(
        IERC20  src,
        IERC20  dest,
        uint256 srcAmount,
        uint256[] calldata routes
    )
    external
    view
    returns (uint256 routeIndex, uint256 amountOut) {
        for (uint256 i = 0; i < routes.length; i++) {
            // fail-safe getting rate
            // uint256 _amountOut = warden.getDestinationReturnAmount(routes[i], src, dest, srcAmount, partnerIndex);
            bytes memory payload = abi.encodeWithSignature("getDestinationReturnAmount(uint256,address,address,uint256,uint256)", routes[i], src, dest, srcAmount, partnerIndex);
            (bool success, bytes memory data) = address(warden).staticcall(payload);
            if (success) {
                uint256 _amountOut = abi.decode(data, (uint256));
                if (_amountOut > amountOut) {
                    amountOut = _amountOut;
                    routeIndex = routes[i];
                }
            }
        }
    }
}
