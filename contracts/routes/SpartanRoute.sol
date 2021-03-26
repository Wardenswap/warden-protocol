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

    ISpartanRouter public constant router = ISpartanRouter(0x6239891FC4030dc050fB9F7083aa68a2E4Fe426D);
    ISpartanUtils public constant utils = ISpartanUtils(0xCaF0366aF95E8A03E269E52DdB3DbB8a00295F91);
    IERC20 public constant etherERC20 = IERC20(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    IERC20 public constant sparta = IERC20(0xE4Ae305ebE1AbE663f261Bc00534067C80ad677C);
    IERC20 public constant wbnb = IERC20(0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c);

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
        if (etherERC20 == _src) {
            adjustSrc = address(0x0000000000000000000000000000000000000000);
        } else {
            _src.safeTransferFrom(msg.sender, address(this), _srcAmount);
            _src.safeApprove(address(router), _srcAmount);
        }
        if (etherERC20 == _dest) {
            adjustDest = address(0x0000000000000000000000000000000000000000);
        }

        // swap(uint256 inputAmount, address fromToken, address toToken) public payable returns (uint256 outputAmount, uint256 fee);
        (_destAmount,) = router.swapTo.value(msg.value)(
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
        if (_src == sparta) {
            if (etherERC20 == _dest) {
                _dest = wbnb;
            }
            ISpartanUtils.PoolDataStruct memory poolData = utils.getPoolData(address(_dest));
            uint256 X = poolData.baseAmount;
            uint256 Y = poolData.tokenAmount;
            uint256 y = utils.calcSwapOutput(_srcAmount, X, Y);
            return y;

        // TOKEN -> SPARTA
        } else if (_dest == sparta) {
            if (etherERC20 == _src) {
                _src = wbnb;
            }
            ISpartanUtils.PoolDataStruct memory poolData = utils.getPoolData(address(_src));
            uint256 X = poolData.tokenAmount;
            uint256 Y = poolData.baseAmount;
            uint256 y = utils.calcSwapOutput(_srcAmount, X, Y);
            return y;

        // TOKEN -> SPARTA -> TOKEN
        } else {
            if (etherERC20 == _src) {
                _src = wbnb;
            }
            if (etherERC20 == _dest) {
                _dest = wbnb;
            }
            ISpartanUtils.PoolDataStruct memory poolDataWBNB = utils.getPoolData(address(_src));
            ISpartanUtils.PoolDataStruct memory poolDataTKN1 = utils.getPoolData(address(_dest));
            uint256 X = poolDataWBNB.tokenAmount;
            uint256 Y = poolDataWBNB.baseAmount;
            uint256 B = poolDataTKN1.baseAmount;
            uint256 Z = poolDataTKN1.tokenAmount;
            uint256 y = utils.calcSwapOutput(_srcAmount, X, Y);
            uint256 z = utils.calcSwapOutput(y, B, Z);
            return z;
        }
    }
}
