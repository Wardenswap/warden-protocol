//SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

import "../helper/ERC20Interface.sol";
import "./IWardenTradingRoute.sol";

interface IWardenSwap {
  /**
  * @dev when new trade occure (and success), this event will be boardcast.
  * @param srcAsset Source token
  * @param srcAmount amount of source token
  * @param destAsset Destination token
  * @param destAmount amount of destination token
  * @param trader user address
  */
  event Trade(
    address indexed srcAsset, // Source
    uint256         srcAmount,
    address indexed destAsset, // Destination
    uint256         destAmount,
    address indexed trader // User
  );

  /**
  * @notice use token address 0xeee...eee for ether
  * @dev makes a trade between src and dest token by tradingRouteIndex
  * Ex1: trade 0.5 ETH -> EOS
  * 0, "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", "500000000000000000", "0xd3c64BbA75859Eb808ACE6F2A6048ecdb2d70817", "21003850000000000000"
  * Ex2: trade 30 EOS -> ETH
  * 0, "0xd3c64BbA75859Eb808ACE6F2A6048ecdb2d70817", "30000000000000000000", "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", "740825000000000000"
  * @param tradingRouteIndex index of trading route
  * @param src Source token
  * @param srcAmount amount of source tokens
  * @param dest Destination token
  * @param minDestAmount minimun destination amount
  * @param partnerIndex index of partnership for revenue sharing
  * @return amount of actual destination tokens
  */
  function trade(
      uint256   tradingRouteIndex,
      ERC20     src,
      uint256   srcAmount,
      ERC20     dest,
      uint256   minDestAmount,
      uint256   partnerIndex
    )
    external
    payable
    returns(uint256);
  
  /**
    * @notice use token address 0xeee...eee for ether
    * @dev makes a trade with multiple routes ex. UNI -> ETH -> DAI
    * Ex: trade 50 UNI -> ETH -> DAI
    * Step1: trade 50 UNI -> ETH
    * Step2: trade xx ETH -> DAI
    * srcAmount: 50 * 1e18
    * routes: [0, 1]
    * srcTokens: [0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984, 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE]
    * destTokens: [0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, 0x6B175474E89094C44Da98b954EedeAC495271d0F]
    * @param srcAmount amount of source tokens
    * @param minDestAmount minimun destination amount
    * @param routes Trading paths
    * @param srcTokens all source of token pairs
    * @param destTokens all destination of token pairs
    * @param partnerIndex index of partnership for revenue sharing
    * @return amount of actual destination tokens
    */
    function tradeRoutes(
      uint256   srcAmount,
      uint256   minDestAmount,
      uint256[] calldata routes,
      ERC20[]   calldata srcTokens,
      ERC20[]   calldata destTokens,
      uint256   partnerIndex
    )
    external
    payable
    returns(uint256);
  
  /**
    * @notice use token address 0xeee...eee for ether
    * @dev makes a trade with split volumes to multiple-routes ex. UNI -> ETH (5%, 15% and 80%)
    * @param routes Trading paths
    * @param src Source token
    * @param srcAmounts amount of source tokens
    * @param dest Destination token
    * @param minDestAmount minimun destination amount
    * @param partnerIndex index of partnership for revenue sharing
    * @return amount of actual destination tokens
    */
    function splitTrades(
      uint256[] calldata routes,
      ERC20     src,
      uint256[] calldata srcAmounts,
      ERC20     dest,
      uint256   minDestAmount,
      uint256   partnerIndex
    )
    external
    payable
    returns(uint256);
  
  /**
  * @notice use token address 0xeee...eee for ether
  * @dev get amount of destination token for given source token amount
  * @param tradingRouteIndex index of trading route
  * @param src Source token
  * @param dest Destination token
  * @param srcAmount amount of source tokens
  * @return amount of actual destination tokens
  */
  function getDestinationReturnAmount(
    uint256 tradingRouteIndex,
    ERC20   src,
    ERC20   dest,
    uint256 srcAmount,
    uint256 partnerIndex
  )
    external
    view
    returns(uint256);
  
  function getDestinationReturnAmountForSplitTrades(
    uint256[] calldata routes,
    ERC20     src,
    uint256[] calldata srcAmounts,
    ERC20     dest,
    uint256   partnerIndex
  )
    external
    view
    returns(uint256);
  
  function getDestinationReturnAmountForTradeRoutes(
    ERC20     src,
    uint256   srcAmount,
    ERC20     dest,
    address[] calldata _tradingPaths,
    uint256   partnerIndex
  )
    external
    view
    returns(uint256);
}
