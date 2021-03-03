//SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./RoutingManagement.sol";
import "hardhat/console.sol";


/*
* Fee collection by partner reference
*/
contract Partnership is RoutingManagement {
    using SafeMath for uint256;

    /**
    * @dev Platform Fee collection
    * @param partnerIndex Partner or Wallet provider that integrate to Warden
    * @param token Token address
    * @param wallet Partner or Wallet provider wallet
    * @param amount Fee amount
    */
    event CollectFee(
      uint256 indexed partnerIndex,
      ERC20   indexed token,
      address indexed wallet,
      uint256         amount
    );

    /**
    * @dev Updating partner info
    * @param index Partner index
    * @param wallet Partner wallet
    * @param fee Fee in bps
    * @param name partner name
    */
    event UpdatePartner(
      uint256 indexed index,
      address indexed wallet,
      uint16 fee,
      bytes16 name
    );

    struct Partner {
      address wallet;       // To receive fee on the Warden Swap network
      uint16 fee;           // fee in bps
      bytes16 name;         // Partner reference
    }

    ERC20 public constant etherERC20 = ERC20(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    mapping(uint256 => Partner) public partners;

    constructor() public {
        Partner memory partner = Partner(msg.sender, 10, "WARDEN"); // 0.1%
        partners[0] = partner;
        emit UpdatePartner(0, msg.sender, 10, "WARDEN");
    }

    function updatePartner(uint256 index, address wallet, uint16 fee, bytes16 name)
        external
        onlyOwner
    {
        require(fee <= 100, "fee: no more than 1%");
        Partner memory partner = Partner(wallet, fee, name);
        partners[index] = partner;
        emit UpdatePartner(index, wallet, fee, name);
    }

    function amountWithFee(uint256 amount, uint256 partnerIndex)
        internal
        view
        returns(uint256 remainingAmount)
    {
        Partner storage partner = partners[partnerIndex];
        if (partner.wallet == 0x0000000000000000000000000000000000000000) {
          partner = partners[0];
        }
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
        console.log("partnerIndex %s", partnerIndex);
        Partner storage partner = partners[partnerIndex];
        console.log("partner fee: %d", partner.fee);
        console.log("partner wallet: %s", partner.wallet);
        console.log("token", address(token));
        if (partner.wallet == 0x0000000000000000000000000000000000000000) {
          partner = partners[0];
        }
        if (partner.fee == 0) {
            return amount;
        }
        console.log("amount: %s", amount);
        uint256 fee = amount.mul(partner.fee).div(10000);
        console.log("fee: %s", fee);
        require(fee < amount, "fee exceeds return amount!");
        if (etherERC20 == token) {
            console.log("contract balance 1: %s", address(this).balance);
            (bool success, ) = partner.wallet.call.value(fee)(""); // Send back ether to sender
            require(success, "Transfer fee of ether failed.");
            console.log("contract balance 2: %s", address(this).balance);
        } else {
            console.log("contract balance 1: %s", token.balanceOf(address(this)));
            token.transfer(partner.wallet, fee);
            console.log("contract balance 2: %s", token.balanceOf(address(this)));
        }
        emit CollectFee(partnerIndex, token, partner.wallet, fee);

        return amount.sub(fee);
    }
}
