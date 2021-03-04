//SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Warden Trading Route
 * @dev The Warden trading route interface has an standard functions and event
 * for other smart contract to implement to join Warden Swap as Market Maker.
 */
interface IWardenTradingRoute {
    /**
    * @dev when new trade occure (and success), this event will be boardcast.
    * @param _src Source token
    * @param _srcAmount amount of source tokens
    * @param _dest   Destination token
    * @return _destAmount: amount of actual destination tokens
    */
    event Trade(
        IERC20 indexed _src,
        uint256 _srcAmount,
        IERC20 indexed _dest,
        uint256 _destAmount
    );

    /**
    * @notice use token address 0xeee...eee for ether
    * @dev makes a trade between src and dest token
    * @param _src Source token
    * @param _dest   Destination token
    * @param _srcAmount amount of source tokens
    * @return _destAmount: amount of actual destination tokens
    */
    function trade(
        IERC20 _src,
        IERC20 _dest,
        uint256 _srcAmount
    )
        external
        payable
        returns(uint256 _destAmount);

    /**
    * @dev provide destinationm token amount for given source amount
    * @param _src Source token
    * @param _dest Destination token
    * @param _srcAmount Amount of source tokens
    * @return _destAmount: amount of expected destination tokens
    */
    function getDestinationReturnAmount(
        IERC20 _src,
        IERC20 _dest,
        uint256 _srcAmount
    )
        external
        view
        returns(uint256 _destAmount);

    /**
    * @dev provide source token amount for given destination amount
    * @param _src Source token
    * @param _dest Destination token
    * @param _destAmount Amount of destination tokens
    * @return _srcAmount: amount of expected source tokens
    */
    // function getSourceReturnAmount(
    //     IERC20 _src,
    //     IERC20 _dest,
    //     uint256 _destAmount
    // )
    //     external
    //     view
    //     returns(uint256 _srcAmount);
}