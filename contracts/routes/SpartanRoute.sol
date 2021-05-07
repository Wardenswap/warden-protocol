//SPDX-License-Identifier: MIT
pragma solidity 0.5.17;
pragma experimental ABIEncoderV2;

import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/roles/WhitelistedRole.sol";
import "../interfaces/IWardenTradingRoute.sol";

interface ISpartanRouter {
    // function swap(uint256 inputAmount, address fromToken, address toToken) external payable returns (uint256 outputAmount, uint256 fee);
    function swapTo(
        uint256 inputAmount,
        address fromToken,
        address toToken,
        address member
    ) external payable returns (uint256 outputAmount, uint256 fee);
}

interface ISpartanUtils {
    struct PoolDataStruct {
        address tokenAddress;
        address poolAddress;
        uint genesis;
        uint baseAmount;
        uint tokenAmount;
        uint baseAmountPooled;
        uint tokenAmountPooled;
        uint fees;
        uint volume;
        uint txCount;
        uint poolUnits;
    }

    function getPoolData(address token) external view returns(PoolDataStruct memory poolData);
    function calcSwapOutput(uint x, uint X, uint Y) external pure returns (uint output);
}

contract SpartanRoute is IWardenTradingRoute, WhitelistedRole, ReentrancyGuard {
    using SafeERC20 for IERC20;

    ISpartanRouter public constant ROUTER = ISpartanRouter(0x6239891FC4030dc050fB9F7083aa68a2E4Fe426D);
    ISpartanUtils public constant UTILS = ISpartanUtils(0xCaF0366aF95E8A03E269E52DdB3DbB8a00295F91);
    IERC20 public constant ETHER_ERC20 = IERC20(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    IERC20 public constant SPARTA = IERC20(0xE4Ae305ebE1AbE663f261Bc00534067C80ad677C);
    IERC20 public constant WBNB = IERC20(0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c);

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
        address adjustSrc = address(_src);
        address adjustDest = address(_dest);
        if (ETHER_ERC20 == _src) {
            adjustSrc = address(0x0000000000000000000000000000000000000000);
        } else {
            _src.safeTransferFrom(msg.sender, address(this), _srcAmount);
            _src.safeApprove(address(ROUTER), _srcAmount);
        }
        if (ETHER_ERC20 == _dest) {
            adjustDest = address(0x0000000000000000000000000000000000000000);
        }

        // swap(uint256 inputAmount, address fromToken, address toToken) public payable returns (uint256 outputAmount, uint256 fee);
        (_destAmount,) = ROUTER.swapTo.value(msg.value)(
            _srcAmount,
            adjustSrc,
            adjustDest,
            msg.sender
        );

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
        // SPARTA -> TOKEN
        if (_src == SPARTA) {
            if (ETHER_ERC20 == _dest) {
                _dest = WBNB;
            }
            ISpartanUtils.PoolDataStruct memory poolData = UTILS.getPoolData(address(_dest));
            uint256 X = poolData.baseAmount;
            uint256 Y = poolData.tokenAmount;
            uint256 y = UTILS.calcSwapOutput(_srcAmount, X, Y);
            return y;

        // TOKEN -> SPARTA
        } else if (_dest == SPARTA) {
            if (ETHER_ERC20 == _src) {
                _src = WBNB;
            }
            ISpartanUtils.PoolDataStruct memory poolData = UTILS.getPoolData(address(_src));
            uint256 X = poolData.tokenAmount;
            uint256 Y = poolData.baseAmount;
            uint256 y = UTILS.calcSwapOutput(_srcAmount, X, Y);
            return y;

        // TOKEN -> SPARTA -> TOKEN
        } else {
            if (ETHER_ERC20 == _src) {
                _src = WBNB;
            }
            if (ETHER_ERC20 == _dest) {
                _dest = WBNB;
            }
            ISpartanUtils.PoolDataStruct memory poolDataWBNB = UTILS.getPoolData(address(_src));
            ISpartanUtils.PoolDataStruct memory poolDataTKN1 = UTILS.getPoolData(address(_dest));
            uint256 X = poolDataWBNB.tokenAmount;
            uint256 Y = poolDataWBNB.baseAmount;
            uint256 B = poolDataTKN1.baseAmount;
            uint256 Z = poolDataTKN1.tokenAmount;
            uint256 y = UTILS.calcSwapOutput(_srcAmount, X, Y);
            uint256 z = UTILS.calcSwapOutput(y, B, Z);
            return z;
        }
    }
}
