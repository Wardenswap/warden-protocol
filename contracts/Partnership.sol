//SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./RoutingManagement.sol";

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
