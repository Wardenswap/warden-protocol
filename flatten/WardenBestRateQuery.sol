// SPDX-License-Identifier: MIT

// ((/*,                                                                    ,*((/,.
// &&@@&&%#/*.                                                        .*(#&&@@@@%. 
// &&@@@@@@@&%(.                                                    ,#%&@@@@@@@@%. 
// &&@@@@@@@@@&&(,                                                ,#&@@@@@@@@@@@%. 
// &&@@@@@@@@@@@&&/.                                            .(&&@@@@@@@@@@@@%. 
// %&@@@@@@@@@@@@@&(,                                          *#&@@@@@@@@@@@@@@%. 
// #&@@@@@@@@@@@@@@&#*                                       .*#@@@@@@@@@@@@@@@&#. 
// #&@@@@@@@@@@@@@@@@#.                                      ,%&@@@@@@@@@@@@@@@&#. 
// #&@@@@@@@@@@@@@@@@%(,                                    ,(&@@@@@@@@@@@@@@@@&#. 
// #&@@@@@@@@@@@@@@@@&&/                                   .(%&@@@@@@@@@@@@@@@@&#. 
// #%@@@@@@@@@@@@@@@@@@(.               ,(/,.              .#&@@@@@@@@@@@@@@@@@&#. 
// (%@@@@@@@@@@@@@@@@@@#*.            ./%&&&/.            .*%@@@@@@@@@@@@@@@@@@%(. 
// (%@@@@@@@@@@@@@@@@@@#*.           *#&@@@@&%*.          .*%@@@@@@@@@@@@@@@@@@%(. 
// (%@@@@@@@@@@@@@@@@@@#/.         ./#@@@@@@@@%(.         ./%@@@@@@@@@@@@@@@@@@%(. 
// (%@@@@@@@@@@@@@@@@@@#/.        ./&@@@@@@@@@@&(*        ,/%@@@@@@@@@@@@@@@@@@%(. 
// (%@@@@@@@@@@@@@@@@@@%/.       ,#&@@@@@@@@@@@@&#,.      ,/%@@@@@@@@@@@@@@@@@@%(. 
// /%@@@@@@@@@@@@@@@@@@#/.      *(&@@@@@@@@@@@@@@&&*      ./%@@@@@@@@@@@@@@@@@&%(. 
// /%@@@@@@@@@@@@@@@@@@#/.     .(&@@@@@@@@@@@@@@@@@#*.    ,/%@@@@@@@@@@@@@@@@@&#/. 
// ,#@@@@@@@@@@@@@@@@@@#/.    ./%@@@@@@@@@@@@@@@@@@&#,    ,/%@@@@@@@@@@@@@@@@@&(,  
//  /%&@@@@@@@@@@@@@@@@#/.    *#&@@@@@@@@@@@@@@@@@@@&*    ,/%@@@@@@@@@@@@@@@@&%*   
//  .*#&@@@@@@@@@@@@@@@#/.    /&&@@@@@@@@@@@@@@@@@@@&/.   ,/%@@@@@@@@@@@@@@@@#*.   
//    ,(&@@@@@@@@@@@@@@#/.    /@@@@@@@@@@@@@@@@@@@@@&(,   ,/%@@@@@@@@@@@@@@%(,     
//     .*(&&@@@@@@@@@@@#/.    /&&@@@@@@@@@@@@@@@@@@@&/,   ,/%@@@@@@@@@@@&%/,       
//        ./%&@@@@@@@@@#/.    *#&@@@@@@@@@@@@@@@@@@@%*    ,/%@@@@@@@@@&%*          
//           ,/#%&&@@@@#/.     ,#&@@@@@@@@@@@@@@@@@#/.    ,/%@@@@&&%(/,            
//               ./#&@@%/.      ,/&@@@@@@@@@@@@@@%(,      ,/%@@%#*.                
//                   .,,,         ,/%&@@@@@@@@&%(*        .,,,.                    
//                                   ,/%&@@@%(*.                                   
//  .,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,**((/*,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
//                                                                                                                                                                                                                                                                                                            
//                                                                                             

// Sources flattened with hardhat v2.0.11 https://hardhat.org

// File @openzeppelin/contracts/token/ERC20/IERC20.sol@v2.5.0

pragma solidity ^0.5.0;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP. Does not include
 * the optional functions; to access them see {ERC20Detailed}.
 */
interface IERC20 {
    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `recipient`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);
}


// File @openzeppelin/contracts/math/Math.sol@v2.5.0

pragma solidity ^0.5.0;

/**
 * @dev Standard math utilities missing in the Solidity language.
 */
library Math {
    /**
     * @dev Returns the largest of two numbers.
     */
    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a >= b ? a : b;
    }

    /**
     * @dev Returns the smallest of two numbers.
     */
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    /**
     * @dev Returns the average of two numbers. The result is rounded towards
     * zero.
     */
    function average(uint256 a, uint256 b) internal pure returns (uint256) {
        // (a + b) / 2 can overflow, so we distribute
        return (a / 2) + (b / 2) + ((a % 2 + b % 2) / 2);
    }
}


// File @openzeppelin/contracts/math/SafeMath.sol@v2.5.0

pragma solidity ^0.5.0;

/**
 * @dev Wrappers over Solidity's arithmetic operations with added overflow
 * checks.
 *
 * Arithmetic operations in Solidity wrap on overflow. This can easily result
 * in bugs, because programmers usually assume that an overflow raises an
 * error, which is the standard behavior in high level programming languages.
 * `SafeMath` restores this intuition by reverting the transaction when an
 * operation overflows.
 *
 * Using this library instead of the unchecked operations eliminates an entire
 * class of bugs, so it's recommended to use it always.
 */
library SafeMath {
    /**
     * @dev Returns the addition of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `+` operator.
     *
     * Requirements:
     * - Addition cannot overflow.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");

        return c;
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting on
     * overflow (when the result is negative).
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     * - Subtraction cannot overflow.
     */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        return sub(a, b, "SafeMath: subtraction overflow");
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting with custom message on
     * overflow (when the result is negative).
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     * - Subtraction cannot overflow.
     *
     * _Available since v2.4.0._
     */
    function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b <= a, errorMessage);
        uint256 c = a - b;

        return c;
    }

    /**
     * @dev Returns the multiplication of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `*` operator.
     *
     * Requirements:
     * - Multiplication cannot overflow.
     */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
        // benefit is lost if 'b' is also tested.
        // See: https://github.com/OpenZeppelin/openzeppelin-contracts/pull/522
        if (a == 0) {
            return 0;
        }

        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");

        return c;
    }

    /**
     * @dev Returns the integer division of two unsigned integers. Reverts on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return div(a, b, "SafeMath: division by zero");
    }

    /**
     * @dev Returns the integer division of two unsigned integers. Reverts with custom message on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     *
     * _Available since v2.4.0._
     */
    function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        // Solidity only automatically asserts when dividing by 0
        require(b > 0, errorMessage);
        uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold

        return c;
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * Reverts when dividing by zero.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     */
    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        return mod(a, b, "SafeMath: modulo by zero");
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * Reverts with custom message when dividing by zero.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     *
     * _Available since v2.4.0._
     */
    function mod(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b != 0, errorMessage);
        return a % b;
    }
}


// File contracts/bestRate/WardenBestRateQuery.sol

pragma solidity 0.5.17;



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

    uint256 public constant partnerIndex = 0;

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
    returns (
        uint256 amountOut
    ) {
        // fail-safe getting rate, equal to
        // uint256 _amountOut = warden.getDestinationReturnAmount(routes[i], src, dest, srcAmount, partnerIndex);
        bytes memory payload = abi.encodeWithSelector(warden.getDestinationReturnAmount.selector, route, src, dest, srcAmount, partnerIndex);
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
    returns (
        uint256 amountOut
    ) {
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
