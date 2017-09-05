/**
 * The interface that contracts accepting ERC20 tokens should implement
 * Copied from
 * https://ethereum.org/token
*/

pragma solidity 0.4.15;

contract ERC20RecipientInterface { 
    function receiveApproval(address _from, uint256 _value, address _token, bytes _extraData) returns (bool);
}
