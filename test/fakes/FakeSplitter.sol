pragma solidity ^0.4.18;

import "../../contracts/Splitter.sol";

contract FakeSplitter is Splitter {
    function isAddedToRecipients(address holder, address recipient) public view returns(bool) {
        return members[holder].addedRecipients[recipient];
    }

    function getMemberRecipientsLength(address holder) public view  returns(uint256) {
        return members[holder].splitRecipients.length;
    }
}