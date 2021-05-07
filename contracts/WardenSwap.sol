//SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

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

import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import "./Partnership.sol";

contract WardenTokenPriviledge is Partnership {
    uint256 public eligibleAmount = 10 ether; // 10 WAD
    IERC20 public wardenToken;

    event UpdateWardenToken(IERC20 indexed token);
    event UpdateEligibleAmount(uint256 amount);

    function updateWardenToken(
        IERC20  token
    )
        public
        onlyOwner
    {
        wardenToken = token;
        emit UpdateWardenToken(token);
    }

    function updateEligibleAmount(
        uint256  amount
    )
        public
        onlyOwner
    {
        eligibleAmount = amount;
        emit UpdateEligibleAmount(amount);
    }

    function isEligibleForFreeTrade(address user)
        public
        view
        returns (bool)
    {
        if (address(wardenToken) == 0x0000000000000000000000000000000000000000) {
            return false;
        }
        return wardenToken.balanceOf(user) >= eligibleAmount;
    }
}

contract WardenSwap is WardenTokenPriviledge, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

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
    * @dev makes a trade between Ether to token by tradingRouteIndex
    * @param tradingRouteIndex index of trading route
    * @param srcAmount amount of source tokens
    * @param dest Destination token
    * @return amount of actual destination tokens
    */
    function _tradeEtherToToken(
        uint256 tradingRouteIndex,
        uint256 srcAmount,
        IERC20 dest
    )
        private
        returns(uint256)
    {
        // Load trading route
        IWardenTradingRoute tradingRoute = tradingRoutes[tradingRouteIndex].route;
        // Trade to route
        uint256 destAmount = tradingRoute.trade.value(srcAmount)(
            ETHER_ERC20,
            dest,
            srcAmount
        );
        return destAmount;
    }

    // Receive ETH in case of trade Token -> ETH, will get ETH back from trading route
    function () external payable {}

    /**
    * @notice use token address 0xeee...eee for ether
    * @dev makes a trade between token to Ether by tradingRouteIndex
    * @param tradingRouteIndex index of trading route
    * @param src Source token
    * @param srcAmount amount of source tokens
    * @return amount of actual destination tokens
    */
    function _tradeTokenToEther(
        uint256 tradingRouteIndex,
        IERC20 src,
        uint256 srcAmount
    )
        private
        returns(uint256)
    {
        // Load trading route
        IWardenTradingRoute tradingRoute = tradingRoutes[tradingRouteIndex].route;
        // Approve to TradingRoute
        src.safeApprove(address(tradingRoute), srcAmount);
        // Trande to route
        uint256 destAmount = tradingRoute.trade(
            src,
            ETHER_ERC20,
            srcAmount
        );
        return destAmount;
    }

    /**
    * @dev makes a trade between token to token by tradingRouteIndex
    * @param tradingRouteIndex index of trading route
    * @param src Source token
    * @param srcAmount amount of source tokens
    * @param dest Destination token
    * @return amount of actual destination tokens
    */
    function _tradeTokenToToken(
        uint256 tradingRouteIndex,
        IERC20 src,
        uint256 srcAmount,
        IERC20 dest
    )
        private
        returns(uint256)
    {
        // Load trading route
        IWardenTradingRoute tradingRoute = tradingRoutes[tradingRouteIndex].route;
        // Approve to TradingRoute
        src.safeApprove(address(tradingRoute), srcAmount);
        // Trande to route
        uint256 destAmount = tradingRoute.trade(
            src,
            dest,
            srcAmount
        );
        return destAmount;
    }

    /**
    * @notice use token address 0xeee...eee for ether
    * @dev makes a trade between src and dest token by tradingRouteIndex
    * Ex1: trade 0.5 ETH -> DAI
    * 0, "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", "500000000000000000", "0xd3c64BbA75859Eb808ACE6F2A6048ecdb2d70817", "21003850000000000000"
    * Ex2: trade 30 DAI -> ETH
    * 0, "0xd3c64BbA75859Eb808ACE6F2A6048ecdb2d70817", "30000000000000000000", "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", "740825000000000000"
    * @param _tradingRouteIndex index of trading route
    * @param _src Source token
    * @param _srcAmount amount of source tokens
    * @param _dest Destination token
    * @return amount of actual destination tokens
    */
    function _trade(
        uint256             _tradingRouteIndex,
        IERC20              _src,
        uint256             _srcAmount,
        IERC20              _dest
    )
        private
        onlyTradingRouteEnabled(_tradingRouteIndex)
        returns(uint256)
    {
        // Destination amount
        uint256 destAmount;
        // Record src/dest asset for later consistency check.
        uint256 srcAmountBefore;
        uint256 destAmountBefore;

        if (ETHER_ERC20 == _src) { // Source
            srcAmountBefore = address(this).balance;
        } else {
            srcAmountBefore = _src.balanceOf(address(this));
        }
        if (ETHER_ERC20 == _dest) { // Dest
            destAmountBefore = address(this).balance;
        } else {
            destAmountBefore = _dest.balanceOf(address(this));
        }
        if (ETHER_ERC20 == _src) { // Trade ETH -> Token
            destAmount = _tradeEtherToToken(_tradingRouteIndex, _srcAmount, _dest);
        } else if (ETHER_ERC20 == _dest) { // Trade Token -> ETH
            destAmount = _tradeTokenToEther(_tradingRouteIndex, _src, _srcAmount);
        } else { // Trade Token -> Token
            destAmount = _tradeTokenToToken(_tradingRouteIndex, _src, _srcAmount, _dest);
        }

        // Recheck if src/dest amount correct
        if (ETHER_ERC20 == _src) { // Source
            require(address(this).balance == srcAmountBefore.sub(_srcAmount), "source amount mismatch after trade");
        } else {
            require(_src.balanceOf(address(this)) == srcAmountBefore.sub(_srcAmount), "source amount mismatch after trade");
        }
        if (ETHER_ERC20 == _dest) { // Dest
            require(address(this).balance == destAmountBefore.add(destAmount), "destination amount mismatch after trade");
        } else {
            require(_dest.balanceOf(address(this)) == destAmountBefore.add(destAmount), "destination amount mismatch after trade");
        }
        return destAmount;
    }

    /**
    * @notice use token address 0xeee...eee for ether
    * @dev makes a trade between src and dest token by tradingRouteIndex
    * Ex1: trade 0.5 ETH -> DAI
    * 0, "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", "500000000000000000", "0xd3c64BbA75859Eb808ACE6F2A6048ecdb2d70817", "21003850000000000000"
    * Ex2: trade 30 DAI -> ETH
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
        IERC20    src,
        uint256   srcAmount,
        IERC20    dest,
        uint256   minDestAmount,
        uint256   partnerIndex
    )
        external
        payable
        nonReentrant
        returns(uint256)
    {
        uint256 destAmount;
        // Prepare source's asset
        if (ETHER_ERC20 != src) {
            src.safeTransferFrom(msg.sender, address(this), srcAmount); // Transfer token to this address
        }
        // Trade to route
        destAmount = _trade(tradingRouteIndex, src, srcAmount, dest);
        if (!isEligibleForFreeTrade(msg.sender)) {
            destAmount = _collectFee(partnerIndex, destAmount, dest);
        }

        // Throw exception if destination amount doesn't meet user requirement.
        require(destAmount >= minDestAmount, "destination amount is too low.");
        if (ETHER_ERC20 == dest) {
            (bool success, ) = msg.sender.call.value(destAmount)(""); // Send back ether to sender
            require(success, "Transfer ether back to caller failed.");
        } else { // Send back token to sender
            dest.safeTransfer(msg.sender, destAmount);
        }

        emit Trade(address(src), srcAmount, address(dest), destAmount, msg.sender);
        return destAmount;
    }

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
        IERC20    src,
        uint256   totalSrcAmount,
        uint256[] calldata srcAmounts,
        IERC20    dest,
        uint256   minDestAmount,
        uint256   partnerIndex
    )
        external
        payable
        nonReentrant
        returns(uint256)
    {
        require(routes.length > 0, "routes can not be empty");
        require(routes.length == srcAmounts.length, "routes and srcAmounts lengths mismatch");
        uint256 destAmount = 0;
        // Prepare source's asset
        if (ETHER_ERC20 != src) {
            src.safeTransferFrom(msg.sender, address(this), totalSrcAmount); // Transfer token to this address
        }
        // Trade with routes
        for (uint i = 0; i < routes.length; i++) {
            uint256 tradingRouteIndex = routes[i];
            uint256 amount = srcAmounts[i];
            destAmount = destAmount.add(_trade(tradingRouteIndex, src, amount, dest));
        }

        // Collect fee
        if (!isEligibleForFreeTrade(msg.sender)) {
            destAmount = _collectFee(partnerIndex, destAmount, dest);
        }

        // Throw exception if destination amount doesn't meet user requirement.
        require(destAmount >= minDestAmount, "destination amount is too low.");
        if (ETHER_ERC20 == dest) {
            (bool success, ) = msg.sender.call.value(destAmount)(""); // Send back ether to sender
            require(success, "Transfer ether back to caller failed.");
        } else { // Send back token to sender
            dest.safeTransfer(msg.sender, destAmount);
        }

        emit Trade(address(src), totalSrcAmount, address(dest), destAmount, msg.sender);
        return destAmount;
    }

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
        IERC20  src,
        IERC20  dest,
        uint256 srcAmount,
        uint256 partnerIndex
    )
        external
        view
        returns(uint256)
    {
        // Load trading route
        IWardenTradingRoute tradingRoute = tradingRoutes[tradingRouteIndex].route;
        uint256 destAmount = tradingRoute.getDestinationReturnAmount(src, dest, srcAmount);
        return _amountWithFee(destAmount, partnerIndex);
    }

    function getDestinationReturnAmountForSplitTrades(
        uint256[] calldata routes,
        IERC20    src,
        uint256[] calldata srcAmounts,
        IERC20    dest,
        uint256   partnerIndex
    )
        external
        view
        returns(uint256)
    {
        require(routes.length > 0, "routes can not be empty");
        require(routes.length == srcAmounts.length, "routes and srcAmounts lengths mismatch");
        uint256 destAmount = 0;
        
        for (uint i = 0; i < routes.length; i++) {
            uint256 tradingRouteIndex = routes[i];
            uint256 amount = srcAmounts[i];
            // Load trading route
            IWardenTradingRoute tradingRoute = tradingRoutes[tradingRouteIndex].route;
            destAmount = destAmount.add(tradingRoute.getDestinationReturnAmount(src, dest, amount));
        }
        return _amountWithFee(destAmount, partnerIndex);
    }

    // In case of expected and unexpected event that have some token amounts remain in this contract, owner can call to collect them.
    function collectRemainingToken(
        IERC20  token,
        uint256 amount
    )
      public
      onlyOwner
    {
        token.safeTransfer(msg.sender, amount);
    }

    // In case of expected and unexpected event that have some ether amounts remain in this contract, owner can call to collect them.
    function collectRemainingEther(
        uint256 amount
    )
      public
      onlyOwner
    {
        (bool success, ) = msg.sender.call.value(amount)(""); // Send back ether to sender
        require(success, "Transfer ether back to caller failed.");
    }
}
