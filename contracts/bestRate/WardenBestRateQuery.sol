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
            // console.log("route", routes[i]);
            bytes memory payload = abi.encodeWithSignature("getDestinationReturnAmount(uint256,address,address,uint256,uint256)", routes[i], src, dest, srcAmount, partnerIndex);
            (bool success, bytes memory data) = address(warden).staticcall(payload);

            // console.log("success");
            // console.log(success);
            // console.log(data.length);

            if (success) {
                uint256 _amountOut = abi.decode(data, (uint256));
                // console.log("_amountOut", _amountOut);
                if (_amountOut > amountOut) {
                    amountOut = _amountOut;
                    routeIndex = routes[i];
                }
            }
            // console.log("data");
            // console.log(data);
            // require(success, "abcd");
            // uint256 _amountOut = abi.decode(data, (uint256));
            // console.log("route", routes[i]);

            // uint256 _amountOut = warden.getDestinationReturnAmount(routes[i], src, dest, srcAmount, partnerIndex);
            // if (_amountOut > amountOut) {
            //     amountOut = _amountOut;
            //     routeIndex = routes[i];
            // }
        }
    }
}
