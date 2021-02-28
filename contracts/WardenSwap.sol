//SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "./helper/ERC20Interface.sol";
import "./interfaces/IWardenTradingRoute.sol";
import "./interfaces/IWardenSwap.sol";

contract RoutingManagement is Ownable {
    /**
    * @dev Struct of trading route
    * @param name Name of trading route.
    * @param enable The flag of trading route to check is trading route enable.
    * @param route The address of trading route.
    */
    struct Route {
      string name;
      bool enable;
      IWardenTradingRoute route;
    }

    event AddedTradingRoute(
        address indexed addedBy,
        string name,
        IWardenTradingRoute indexed routingAddress,
        uint256 indexed index
    );

    event EnabledTradingRoute(
        address indexed enabledBy,
        string name,
        IWardenTradingRoute routingAddress,
        uint256 indexed index
    );

    event DisabledTradingRoute(
        address indexed disabledBy,
        string name,
        IWardenTradingRoute indexed routingAddress,
        uint256 indexed index
    );

    Route[] public tradingRoutes; // list of trading routes

    modifier onlyTradingRouteEnabled(uint _index) {
        require(tradingRoutes[_index].enable == true, "This trading route is disabled");
        _;
    }

    modifier onlyTradingRouteDisabled(uint _index) {
        require(tradingRoutes[_index].enable == false, "This trading route is enabled");
        _;
    }

    /**
    * @dev Function for adding new trading route
    * @param _name Name of trading route.
    * @param _routingAddress The address of trading route.
    * @return length of trading routes.
    */
    function addTradingRoute(
        string memory _name,
        IWardenTradingRoute _routingAddress
    )
      public
      onlyOwner
    {
        tradingRoutes.push(Route({
            name: _name,
            enable: true,
            route: _routingAddress
        }));
        emit AddedTradingRoute(msg.sender, _name, _routingAddress, tradingRoutes.length - 1);
    }

    /**
    * @dev Function for disable trading route by index
    * @param _index The uint256 of trading route index.
    * @return length of trading routes.
    */
    function disableTradingRoute(
        uint256 _index
    )
        public
        onlyOwner
        onlyTradingRouteEnabled(_index)
    {
        tradingRoutes[_index].enable = false;
        emit DisabledTradingRoute(msg.sender, tradingRoutes[_index].name, tradingRoutes[_index].route, _index);
    }

    /**
    * @dev Function for enale trading route by index
    * @param _index The uint256 of trading route index.
    * @return length of trading routes.
    */
    function enableTradingRoute(
        uint256 _index
    )
        public
        onlyOwner
        onlyTradingRouteDisabled(_index)
    {
        tradingRoutes[_index].enable = true;
        emit EnabledTradingRoute(msg.sender, tradingRoutes[_index].name, tradingRoutes[_index].route, _index);
    }

    /**
    * @dev Function for get amount of trading route
    * @return Amount of trading routes.
    */
    function allRoutesLength() public view returns (uint256) {
        return tradingRoutes.length;
    }

    /**
    * @dev Function for get enable status of trading route
    * @param _index The uint256 of trading route index.
    * @return enable status of trading route.
    */
    function isTradingRouteEnabled(uint256 _index) public view returns (bool) {
        return tradingRoutes[_index].enable;
    }
}

/*
* Fee collection by partner reference
*/
contract Partnership is RoutingManagement {
    using SafeMath for uint256;

    struct Partner {
      address wallet;       // To receive fee on the Warden Swap network
      uint16 fee;           // fee in bps
      bytes16 name;         // Partner reference
    }

    mapping(uint256 => Partner) public partners;

    constructor() public {
        Partner memory partner = Partner(msg.sender, 0, "WARDEN");
        partners[0] = partner;
    }

    function updatePartner(uint256 index, address wallet, uint16 fee, bytes16 name)
        external
        onlyOwner
    {
        Partner memory partner = Partner(wallet, fee, name);
        partners[index] = partner;
    }

    function amountWithFee(uint256 amount, uint256 partnerIndex)
        internal
        view
        returns(uint256 remainingAmount)
    {
        Partner storage partner = partners[partnerIndex];
        if (partner.fee == 0) {
            return amount;
        }
        uint256 fee = amount.mul(partner.fee).div(10000);
        return amount.sub(fee);
    }

    function collectFee(uint256 partnerIndex, uint256 amount, ERC20 token)
        internal
        returns(uint256 remainingAmount)
    {
        Partner storage partner = partners[partnerIndex];
        if (partner.fee == 0) {
            return amount;
        }
        uint256 fee = amount.mul(partner.fee).div(10000);
        require(fee < amount, "fee exceeds return amount!");
        token.transfer(partner.wallet, fee);
        return amount.sub(fee);
    }
}

contract WardenSwap is IWardenSwap, Partnership, ReentrancyGuard {
    event Trade(
        address indexed srcAsset, // Source
        uint256         srcAmount,
        address indexed destAsset, // Destination
        uint256         destAmount,
        address indexed trader, // User
        uint256         fee // System fee
    );

    using SafeMath for uint256;
    ERC20 public etherERC20 = ERC20(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

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
        ERC20 dest
    )
        private
        returns(uint256)
    {
        // Load trading route
        IWardenTradingRoute tradingRoute = tradingRoutes[tradingRouteIndex].route;
        // Trade to route
        uint256 destAmount = tradingRoute.trade.value(srcAmount)(
            etherERC20,
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
        ERC20 src,
        uint256 srcAmount
    )
        private
        returns(uint256)
    {
        // Load trading route
        IWardenTradingRoute tradingRoute = tradingRoutes[tradingRouteIndex].route;
        // Approve to TradingRoute
        src.approve(address(tradingRoute), srcAmount);
        // Trande to route
        uint256 destAmount = tradingRoute.trade(
            src,
            etherERC20,
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
        ERC20 src,
        uint256 srcAmount,
        ERC20 dest
    )
        private
        returns(uint256)
    {
        // Load trading route
        IWardenTradingRoute tradingRoute = tradingRoutes[tradingRouteIndex].route;
        // Approve to TradingRoute
        src.approve(address(tradingRoute), srcAmount);
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
        ERC20               _src,
        uint256             _srcAmount,
        ERC20               _dest
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

        if (etherERC20 == _src) { // Source
            srcAmountBefore = address(this).balance;
        } else {
            srcAmountBefore = _src.balanceOf(address(this));
        }
        if (etherERC20 == _dest) { // Dest
            destAmountBefore = address(this).balance;
        } else {
            destAmountBefore = _dest.balanceOf(address(this));
        }
        if (etherERC20 == _src) { // Trade ETH -> Token
            destAmount = _tradeEtherToToken(_tradingRouteIndex, _srcAmount, _dest);
        } else if (etherERC20 == _dest) { // Trade Token -> ETH
            destAmount = _tradeTokenToEther(_tradingRouteIndex, _src, _srcAmount);
        } else { // Trade Token -> Token
            destAmount = _tradeTokenToToken(_tradingRouteIndex, _src, _srcAmount, _dest);
        }

        // Recheck if src/dest amount correct
        if (etherERC20 == _src) { // Source
            require(address(this).balance == srcAmountBefore.sub(_srcAmount), "source amount mismatch after trade");
        } else {
            require(_src.balanceOf(address(this)) == srcAmountBefore.sub(_srcAmount), "source amount mismatch after trade");
        }
        if (etherERC20 == _dest) { // Dest
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
        ERC20     src,
        uint256   srcAmount,
        ERC20     dest,
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
        if (etherERC20 != src) {
            src.transferFrom(msg.sender, address(this), srcAmount); // Transfer token to this address
        }
        // Trade to route
        destAmount = _trade(tradingRouteIndex, src, srcAmount, dest);
        // Throw exception if destination amount doesn't meet user requirement.
        require(destAmount >= minDestAmount, "destination amount is too low.");
        if (etherERC20 == dest) {
            (bool success, ) = msg.sender.call.value(destAmount)(""); // Send back ether to sender
            require(success, "Transfer ether back to caller failed.");
        } else { // Send back token to sender
            // Some ERC20 Smart contract not return Bool, so we can't use require(dest.transfer(x, y)); here
            dest.transfer(msg.sender, destAmount);
        }

        // Collect fee
        uint256 remainingAmount = collectFee(partnerIndex, destAmount, dest);

        emit Trade(address(src), srcAmount, address(dest), remainingAmount, msg.sender, 0);
        return remainingAmount;
    }

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
        nonReentrant
        returns(uint256)
    {
        require(routes.length > 0, "routes can not be empty");
        require(routes.length == srcTokens.length && routes.length == destTokens.length, "Parameter value lengths mismatch");

        uint256 remainingAmount;
        {
          uint256 destAmount;
          if (etherERC20 != srcTokens[0]) {
              srcTokens[0].transferFrom(msg.sender, address(this), srcAmount); // Transfer token to This address
          }
          uint256 pathSrcAmount = srcAmount;
          for (uint i = 0; i < routes.length; i++) {
              uint256 tradingRouteIndex = routes[i];
              ERC20 pathSrc = srcTokens[i];
              ERC20 pathDest = destTokens[i];
              destAmount = _trade(tradingRouteIndex, pathSrc, pathSrcAmount, pathDest);
              pathSrcAmount = destAmount;
          }
          // Throw exception if destination amount doesn't meet user requirement.
          require(destAmount >= minDestAmount, "destination amount is too low.");
          if (etherERC20 == destTokens[destTokens.length - 1]) { // Trade Any -> ETH
              // Send back ether to sender
              (bool success,) = msg.sender.call.value(destAmount)("");
              require(success, "Transfer ether back to caller failed.");
          } else { // Trade Any -> Token
              // Send back token to sender
              // Some ERC20 Smart contract not return Bool, so we can't use require(dest.transfer(x, y)) here
              destTokens[destTokens.length - 1].transfer(msg.sender, destAmount);
          }

          // Collect fee
          remainingAmount = collectFee(partnerIndex, destAmount, destTokens[destTokens.length - 1]);
        }

        emit Trade(address(srcTokens[0]), srcAmount, address(destTokens[destTokens.length - 1]), remainingAmount, msg.sender, 0);
        return remainingAmount;
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
        ERC20     src,
        uint256[] calldata srcAmounts,
        ERC20     dest,
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
        uint256 srcAmount = srcAmounts[0];
        uint256 destAmount = 0;
        // Prepare source's asset
        if (etherERC20 != src) {
            src.transferFrom(msg.sender, address(this), srcAmount); // Transfer token to this address
        }
        // Trade with routes
        for (uint i = 0; i < routes.length; i++) {
            uint256 tradingRouteIndex = routes[i];
            uint256 amount = srcAmounts[i];
            destAmount = destAmount.add(_trade(tradingRouteIndex, src, amount, dest));
        }
        // Throw exception if destination amount doesn't meet user requirement.
        require(destAmount >= minDestAmount, "destination amount is too low.");
        if (etherERC20 == dest) {
            (bool success, ) = msg.sender.call.value(destAmount)(""); // Send back ether to sender
            require(success, "Transfer ether back to caller failed.");
        } else { // Send back token to sender
            // Some ERC20 Smart contract not return Bool, so we can't use require(dest.transfer(x, y)); here
            dest.transfer(msg.sender, destAmount);
        }

        // Collect fee
        uint256 remainingAmount = collectFee(partnerIndex, destAmount, dest);

        emit Trade(address(src), srcAmount, address(dest), remainingAmount, msg.sender, 0);
        return remainingAmount;
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
        ERC20   src,
        ERC20   dest,
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
        return amountWithFee(destAmount, partnerIndex);
    }

    function getDestinationReturnAmountForSplitTrades(
        uint256[] calldata routes,
        ERC20     src,
        uint256[] calldata srcAmounts,
        ERC20     dest,
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
        return amountWithFee(destAmount, partnerIndex);
    }

    function getDestinationReturnAmountForTradeRoutes(
        ERC20     src,
        uint256   srcAmount,
        ERC20     dest,
        address[] calldata _tradingPaths,
        uint256   partnerIndex
    )
        external
        view
        returns(uint256)
    {
        src;
        dest;
        uint256 destAmount;
        uint256 pathSrcAmount = srcAmount;
        for (uint i = 0; i < _tradingPaths.length; i += 3) {
            uint256 tradingRouteIndex = uint256(_tradingPaths[i]);
            ERC20 pathSrc = ERC20(_tradingPaths[i+1]);
            ERC20 pathDest = ERC20(_tradingPaths[i+2]);

            // Load trading route
            IWardenTradingRoute tradingRoute = tradingRoutes[tradingRouteIndex].route;
            destAmount = tradingRoute.getDestinationReturnAmount(pathSrc, pathDest, pathSrcAmount);
            pathSrcAmount = destAmount;
        }
        return amountWithFee(destAmount, partnerIndex);
    }

    // In case of expected and unexpected event that have some token amounts remain in this contract, owner can call to collect them.
    function collectRemainingToken(
        ERC20 token,
        uint256 amount
    )
      public
      onlyOwner
    {
        token.transfer(msg.sender, amount);
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
