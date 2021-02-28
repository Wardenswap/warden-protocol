//SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

/**
 * @title ERC20
 * @dev The ERC20 interface has an standard functions and event
 * for erc20 compatible token on Ethereum blockchain.
 */
interface ERC20 {
    function totalSupply() external view returns (uint supply);
    function balanceOf(address _owner) external view returns (uint balance);
    function transfer(address _to, uint _value) external; // Some ERC20 doesn't have return
    function transferFrom(address _from, address _to, uint _value) external; // Some ERC20 doesn't have return
    function approve(address _spender, uint _value) external; // Some ERC20 doesn't have return
    function allowance(address _owner, address _spender) external view returns (uint remaining);
    function decimals() external view returns(uint digits);
    event Approval(address indexed _owner, address indexed _spender, uint _value);
}